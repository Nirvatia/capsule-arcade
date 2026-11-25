// The station's squad (DESIGN.md §7a): the four ghosts hunting together. A director gives them
// plays in turn with a calm beat between (the classic scatter / chase): the train, the pincer,
// the mimics; each play opens with a tell. The squad steers the hunting ghosts through
// `GhostService`'s `SquadGuide` (a step and a speed per ghost); the mimics it hides and shows
// itself. Pure logic, tile based.
import type { GhostDirection, GhostKind, GhostModel, GhostTile } from '../actors/GhostModel';
import type { SquadGuide } from '../actors/GhostService';
import { shortestRoute } from '../actors/ghostRoutes';
import type { RouteWorld } from '../actors/ghostRoutes';
import { seededRandom } from '../../render/common/random';

export type SquadPlay = 'calm' | 'train' | 'pincer' | 'mimic';
export type SquadPhase = 'calm' | 'tell' | 'on';

export const SQUAD_TUNE = {
	/** Seconds of calm between plays, from .. to. */
	calm: [4, 6.5],
	/** Seconds a play is told before it starts. */
	tell: 1.3,
	/** Seconds each play lasts. */
	length: { train: 9, pincer: 10, mimic: 12 },
	/** The hatch's charge (0..1) a play needs before the director uses it. */
	unlock: { train: 0, pincer: 0.25, mimic: 0.5 },
	/** The train: its leader's speed; its cars' gap in steps along the leader's trail. */
	trainLead: 0.92,
	trainGap: 2,
	/** The train in the escape: slower, so only a mistake lets it catch up. */
	chaseLead: 0.82,
	/** The pincer: seconds between re-plans of who takes which way out. */
	replan: 0.8,
	/** How far a corridor is followed looking for the junctions round the hero. */
	reach: 10,
	/** The mimics: how many, the fade, a revealed one's harmless seconds, the hold on the hero. */
	mimics: 2,
	fade: 0.5,
	harmless: 1.4,
	grab: 1,
	/** Route steps from the hero a mimic settles at, from .. to. */
	settle: [4, 12]
} as const;

export interface SquadWorld extends RouteWorld {
	/** Food was here and is eaten: a mimic may sit here (the attentive player's tell). */
	eaten(x: number, y: number): boolean;
	/** The tile held a power cell. */
	cell(x: number, y: number): boolean;
}

/** What the squad needs of `GhostService`. */
export interface SquadGhosts {
	readonly list: readonly GhostModel[];
	freeze(kind: GhostKind, seconds: number): void;
}

export interface Mimic {
	readonly kind: GhostKind;
	x: number;
	y: number;
	/** It poses as a power cell. */
	cell: boolean;
	/** Fading out where it was, then hidden as food. */
	state: 'fading' | 'hidden';
	time: number;
}

export interface Claim {
	readonly kind: GhostKind;
	readonly x: number;
	readonly y: number;
}

export interface SquadEvents {
	/** A mimic bit: hold the hero this long. */
	grab: number;
}

const DIRS: Record<GhostDirection, readonly [number, number]> = {
	UP: [0, -1],
	DOWN: [0, 1],
	LEFT: [-1, 0],
	RIGHT: [1, 0]
};

const k = (x: number, y: number): string => `${x},${y}`;

export class StationSquad implements SquadGuide {
	play: SquadPlay = 'calm';
	phase: SquadPhase = 'calm';
	/** Seconds left of the phase. */
	left: number;
	/** The play the tell announces (and the calm leads to). */
	next: SquadPlay = 'train';
	/** The train's leader and the tiles it went, newest first. */
	leader: GhostKind | null = null;
	readonly trail: GhostTile[] = [];
	/** The pincer: the junction each ghost takes (shown as the tell). */
	claims: Claim[] = [];
	readonly mimics: Mimic[] = [];
	/** In the escape: one train hunting him, for good. */
	chasing = false;
	private readonly harmlessFor = new Map<GhostKind, number>();
	private readonly reached = new Set<GhostKind>();
	private replanIn = 0;
	private ahead: ((x: number, y: number) => boolean) | null = null;
	private ghosts: readonly GhostModel[] = [];
	private hero: GhostTile = { x: 0, y: 0 };
	private readonly random: () => number;

	constructor(
		private readonly world: SquadWorld,
		seed = 1
	) {
		this.random = seededRandom((Math.imul(seed | 0, 0x9e3779b1) >>> 1) + 1);
		this.random();
		this.left = this.calmTime();
	}

	/** Back to the calm (a new life, a power cell): the hidden mimics are let out first. */
	reset(ghosts: SquadGhosts): void {
		this.revealAll(ghosts, 0);
		this.toCalm();
		this.chasing = false;
		this.ahead = null;
	}

	/**
	 * The escape: everything stops but one train after him. `ahead` marks the way still before
	 * him: the train never steps on it, so it comes from behind, never head on along his route.
	 */
	chase(ghosts: SquadGhosts, ahead: ((x: number, y: number) => boolean) | null = null): void {
		this.ahead = ahead;
		this.revealAll(ghosts, 0);
		this.play = 'train';
		this.phase = 'on';
		this.chasing = true;
		this.leader = null;
		this.trail.length = 0;
		this.claims = [];
	}

	/** A power cell: the play breaks and every mimic shows itself (frighten them after this). */
	onPower(ghosts: SquadGhosts): void {
		this.revealAll(ghosts, 0);
		if (!this.chasing) this.toCalm();
	}

	/** A revealed mimic cannot hurt yet. */
	harmless(kind: GhostKind): boolean {
		return (this.harmlessFor.get(kind) ?? 0) > 0 || this.mimics.some((m) => m.kind === kind);
	}

	/** Hidden or fading: not a ghost on screen. */
	hidden(kind: GhostKind): Mimic | undefined {
		return this.mimics.find((m) => m.kind === kind);
	}

	update(dt: number, ghosts: SquadGhosts, hero: GhostTile, charge: number): SquadEvents {
		this.ghosts = ghosts.list;
		this.hero = hero;
		const events: SquadEvents = { grab: 0 };
		for (const [kind, s] of this.harmlessFor) {
			if (s - dt <= 0) this.harmlessFor.delete(kind);
			else this.harmlessFor.set(kind, s - dt);
		}
		this.followLeader();
		this.updateMimics(dt, ghosts, events);
		if (this.chasing) return events;
		this.left -= dt;
		if (this.phase === 'on' && this.play === 'pincer') {
			this.replanIn -= dt;
			if (this.replanIn <= 0) this.planPincer();
		}
		if (this.left > 0) return events;
		if (this.phase === 'calm') {
			this.phase = 'tell';
			this.play = 'calm';
			this.next = this.pickNext(charge);
			this.left = SQUAD_TUNE.tell;
			if (this.next === 'train') this.pickLeader();
			if (this.next === 'pincer') this.planPincer();
		} else if (this.phase === 'tell') {
			this.phase = 'on';
			this.play = this.next;
			this.left = SQUAD_TUNE.length[this.next as 'train' | 'pincer' | 'mimic'];
			if (this.play === 'mimic') this.startMimics(ghosts);
		} else {
			if (this.play === 'mimic') this.revealAll(ghosts, 0.6);
			this.toCalm();
		}
		return events;
	}

	// ------------------------------------------------------------- the guide

	direction(ghost: GhostModel): GhostDirection | null {
		if (this.hidden(ghost.kind)) return null;
		const train = this.play === 'train' || (this.phase === 'tell' && this.next === 'train');
		if (train) {
			if (!this.leader || !this.ghosts.some((g) => g.kind === this.leader && g.state === 'active'))
				this.pickLeader();
			if (ghost.kind === this.leader) {
				return this.phase === 'on' ? this.stepTo(ghost, this.hero) : null;
			}
			const lead = this.ghosts.find((g) => g.kind === this.leader);
			if (!lead) return null;
			if (this.phase === 'tell') return this.stepTo(ghost, lead.tile);
			const car = this.carIndex(ghost);
			const at =
				this.trail[Math.min(this.trail.length - 1, car * SQUAD_TUNE.trainGap)] ?? lead.tile;
			if (at.x === ghost.tile.x && at.y === ghost.tile.y) {
				const ahead = this.trail[Math.max(0, car * SQUAD_TUNE.trainGap - 1)] ?? lead.tile;
				return this.stepTo(ghost, ahead);
			}
			return this.stepTo(ghost, at);
		}
		if (this.play === 'pincer' && this.phase === 'on') {
			const claim = this.claims.find((c) => c.kind === ghost.kind);
			if (claim && !this.reached.has(ghost.kind)) {
				if (claim.x === ghost.tile.x && claim.y === ghost.tile.y) this.reached.add(ghost.kind);
				else return this.stepTo(ghost, claim);
			}
			return this.stepTo(ghost, this.hero);
		}
		return null;
	}

	speedFactor(ghost: GhostModel): number {
		if (this.play !== 'train' || this.phase !== 'on') return 1;
		if (ghost.kind === this.leader)
			return this.chasing ? SQUAD_TUNE.chaseLead : SQUAD_TUNE.trainLead;
		// the cars keep up with the leader, a little faster while they close the gap
		return this.chasing ? SQUAD_TUNE.chaseLead * 1.08 : 1;
	}

	// ------------------------------------------------------------- the director

	private calmTime(): number {
		const [a, b] = SQUAD_TUNE.calm;
		return a + (b - a) * this.random();
	}

	private toCalm(): void {
		this.play = 'calm';
		this.phase = 'calm';
		this.left = this.calmTime();
		this.claims = [];
		this.reached.clear();
	}

	private pickNext(charge: number): SquadPlay {
		const open = (['train', 'pincer', 'mimic'] as const).filter(
			(p) => charge >= SQUAD_TUNE.unlock[p]
		);
		const fresh = open.filter((p) => p !== this.next);
		const pool = fresh.length > 0 ? fresh : open;
		return pool[Math.floor(this.random() * pool.length)] ?? 'train';
	}

	// ------------------------------------------------------------- the train

	private pickLeader(): void {
		const hunters = this.ghosts.filter((g) => g.state === 'active' && !this.hidden(g.kind));
		let best: GhostModel | null = null;
		let bestD = Infinity;
		for (const g of hunters) {
			const d = this.distance(g.tile, this.hero);
			if (d < bestD) {
				bestD = d;
				best = g;
			}
		}
		if (best && best.kind !== this.leader) {
			this.leader = best.kind;
			this.trail.length = 0;
		}
	}

	private followLeader(): void {
		const lead = this.leader ? this.ghosts.find((g) => g.kind === this.leader) : undefined;
		if (!lead) return;
		const head = this.trail[0];
		if (!head || head.x !== lead.tile.x || head.y !== lead.tile.y) {
			this.trail.unshift({ x: lead.tile.x, y: lead.tile.y });
			if (this.trail.length > 24) this.trail.length = 24;
		}
	}

	/** 1 for the car right behind the leader: the cars in the order of their distance to it. */
	private carIndex(ghost: GhostModel): number {
		const lead = this.ghosts.find((g) => g.kind === this.leader);
		if (!lead) return 1;
		const cars = this.ghosts
			.filter((g) => g.kind !== this.leader && g.state === 'active' && !this.hidden(g.kind))
			.map((g) => ({ g, d: Math.abs(g.tile.x - lead.tile.x) + Math.abs(g.tile.y - lead.tile.y) }))
			.sort((a, b) => a.d - b.d || a.g.kind.localeCompare(b.g.kind));
		return cars.findIndex((c) => c.g === ghost) + 1;
	}

	// ------------------------------------------------------------- the pincer

	/** The junctions round the hero: along each corridor leaving him, the first one met. */
	exits(hero: GhostTile): GhostTile[] {
		const out: GhostTile[] = [];
		const seen = new Set<string>();
		for (const d of Object.keys(DIRS) as GhostDirection[]) {
			let x = hero.x;
			let y = hero.y;
			let dir = d;
			for (let i = 0; i < SQUAD_TUNE.reach; i += 1) {
				const [dx, dy] = DIRS[dir];
				if (!this.world.walkable(x + dx, y + dy)) break;
				x += dx;
				y += dy;
				const t = this.world.teleport(x, y);
				if (t) break;
				const ways = (Object.keys(DIRS) as GhostDirection[]).filter((w) => {
					const [wx, wy] = DIRS[w];
					return this.world.walkable(x + wx, y + wy);
				});
				if (ways.length >= 3) {
					if (!seen.has(k(x, y))) {
						seen.add(k(x, y));
						out.push({ x, y });
					}
					break;
				}
				// follow the corridor round its bend
				const back: GhostDirection =
					dir === 'UP' ? 'DOWN' : dir === 'DOWN' ? 'UP' : dir === 'LEFT' ? 'RIGHT' : 'LEFT';
				const on = ways.find((w) => w !== back);
				if (!on) break;
				dir = on;
			}
		}
		return out;
	}

	private planPincer(): void {
		this.replanIn = SQUAD_TUNE.replan;
		const hunters = this.ghosts.filter((g) => g.state === 'active' && !this.hidden(g.kind));
		if (hunters.length === 0) {
			this.claims = [];
			return;
		}
		// the nearest one drives him; the others share out his ways out, the shortest in sum
		const byDistance = hunters
			.map((g) => ({ g, d: this.distance(g.tile, this.hero) }))
			.sort((a, b) => a.d - b.d);
		const driver = byDistance[0].g;
		const others = byDistance.slice(1).map((e) => e.g);
		const exits = this.exits(this.hero);
		const claims: Claim[] = [{ kind: driver.kind, x: this.hero.x, y: this.hero.y }];
		let best: Claim[] = [];
		let bestCost = Infinity;
		const permute = (i: number, used: Set<number>, acc: Claim[], cost: number) => {
			if (cost >= bestCost) return;
			if (i === others.length) {
				bestCost = cost;
				best = acc.slice();
				return;
			}
			const g = others[i];
			let placed = false;
			exits.forEach((e, j) => {
				if (used.has(j)) return;
				placed = true;
				used.add(j);
				acc.push({ kind: g.kind, x: e.x, y: e.y });
				permute(i + 1, used, acc, cost + this.distance(g.tile, e));
				acc.pop();
				used.delete(j);
			});
			if (!placed) {
				// more hunters than ways out: the spare one drives too
				acc.push({ kind: g.kind, x: this.hero.x, y: this.hero.y });
				permute(i + 1, used, acc, cost + this.distance(g.tile, this.hero));
				acc.pop();
			}
		};
		permute(0, new Set(), [], 0);
		this.claims = claims.concat(best);
		// a re-plan keeps who has reached its junction on the hunt
		for (const kind of [...this.reached]) {
			const c = this.claims.find((cl) => cl.kind === kind);
			if (!c) this.reached.delete(kind);
		}
	}

	// ------------------------------------------------------------- the mimics

	private startMimics(ghosts: SquadGhosts): void {
		const hunters = ghosts.list
			.filter((g) => g.state === 'active')
			.map((g) => ({ g, d: this.distance(g.tile, this.hero) }))
			.sort((a, b) => b.d - a.d)
			.slice(0, SQUAD_TUNE.mimics);
		const spots = this.mimicSpots();
		for (const { g } of hunters) {
			const spot = spots.shift();
			if (!spot) break;
			ghosts.freeze(g.kind, 1e6);
			this.mimics.push({
				kind: g.kind,
				x: spot.x,
				y: spot.y,
				cell: spot.cell,
				state: 'fading',
				time: 0
			});
		}
	}

	/** Eaten tiles some steps from the hero, apart from each other; an eaten cell first. */
	private mimicSpots(): Array<{ x: number; y: number; cell: boolean }> {
		const [near, far] = SQUAD_TUNE.settle;
		const found: Array<{ x: number; y: number; cell: boolean; d: number }> = [];
		const dist = new Map<string, number>([[k(this.hero.x, this.hero.y), 0]]);
		let frontier: GhostTile[] = [this.hero];
		for (let d = 1; d <= far && frontier.length; d += 1) {
			const next: GhostTile[] = [];
			for (const t of frontier) {
				for (const [dx, dy] of Object.values(DIRS)) {
					const x = t.x + dx;
					const y = t.y + dy;
					if (!this.world.walkable(x, y) || dist.has(k(x, y))) continue;
					dist.set(k(x, y), d);
					next.push({ x, y });
					if (d >= near && this.world.eaten(x, y))
						found.push({ x, y, cell: this.world.cell(x, y), d });
				}
			}
			frontier = next;
		}
		// shuffle, cells first, then keep them apart
		for (let i = found.length - 1; i > 0; i -= 1) {
			const j = Math.floor(this.random() * (i + 1));
			[found[i], found[j]] = [found[j], found[i]];
		}
		found.sort((a, b) => Number(b.cell) - Number(a.cell));
		const out: Array<{ x: number; y: number; cell: boolean }> = [];
		for (const f of found) {
			if (out.some((o) => Math.abs(o.x - f.x) + Math.abs(o.y - f.y) < 4)) continue;
			if (f.cell && out.some((o) => o.cell)) continue;
			out.push({ x: f.x, y: f.y, cell: f.cell });
		}
		return out;
	}

	private updateMimics(dt: number, ghosts: SquadGhosts, events: SquadEvents): void {
		for (const m of [...this.mimics]) {
			m.time += dt;
			const ghost = ghosts.list.find((g) => g.kind === m.kind);
			if (!ghost) continue;
			if (m.state === 'fading' && m.time >= SQUAD_TUNE.fade) {
				m.state = 'hidden';
				ghost.teleportTo({ x: m.x, y: m.y });
			}
			if (m.state === 'hidden' && this.hero.x === m.x && this.hero.y === m.y) {
				// the bite: it holds him, harmless itself for a moment, while the rest close in
				this.reveal(m, ghosts, SQUAD_TUNE.harmless);
				events.grab = SQUAD_TUNE.grab;
			}
		}
	}

	private reveal(m: Mimic, ghosts: SquadGhosts, harmless: number): void {
		const i = this.mimics.indexOf(m);
		if (i >= 0) this.mimics.splice(i, 1);
		ghosts.freeze(m.kind, 1e-6);
		if (harmless > 0) this.harmlessFor.set(m.kind, harmless);
	}

	private revealAll(ghosts: SquadGhosts, harmless: number): void {
		for (const m of [...this.mimics]) this.reveal(m, ghosts, harmless);
	}

	// ------------------------------------------------------------- ways

	/** The world the squad plans in: in the chase, his way ahead is closed to it. */
	private ways(): SquadWorld {
		const ahead = this.chasing ? this.ahead : null;
		if (!ahead) return this.world;
		return {
			...this.world,
			walkable: (x, y) =>
				this.world.walkable(x, y) && (!ahead(x, y) || (x === this.hero.x && y === this.hero.y))
		};
	}

	private stepTo(ghost: GhostModel, goal: GhostTile): GhostDirection | null {
		if (ghost.tile.x === goal.x && ghost.tile.y === goal.y) return null;
		const route = shortestRoute(
			this.ways(),
			{ tile: ghost.tile, facing: null },
			(x, y) => x === goal.x && y === goal.y,
			80
		);
		return route?.directions[0] ?? null;
	}

	private distance(a: GhostTile, b: GhostTile): number {
		if (a.x === b.x && a.y === b.y) return 0;
		const route = shortestRoute(
			this.world,
			{ tile: a, facing: null },
			(x, y) => x === b.x && y === b.y,
			80
		);
		return route ? route.directions.length : 999;
	}
}
