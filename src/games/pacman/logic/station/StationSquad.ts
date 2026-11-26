// The station's squad (DESIGN.md §7a), its brain: the four ghosts hunting together. It reads the
// hero (the way he will take: toward the nearest food he has not eaten), gives each creature a
// role, and runs one of three tactics at a time, picked by what the situation offers, with a
// calm beat between (the classic scatter / chase) and a tell before each:
// - the fence, a quarantine ring (the owner, 2026-11-26: no beams through walls, nothing bound to
//   the maze's cuts): two fencers stand on a circle round a point ahead of him as its projectors;
//   where it crosses a corridor a seal grows in the corridor's throat and he cannot pass; one ring
//   in two has a thin seal he can push through; a hunter drives him; the fourth is a phantom;
// - the ambush: one hides as food on a tile he has already eaten, on his way; the others shut
//   every way out but the one that leads to it;
// - the vent: one hides in a vent shaft on his way (its eyes glow in the shaft) and comes out
//   as he passes; the others drive him there.
// The squad steers the hunting ghosts through `GhostService`'s `SquadGuide`; the hidden ones it
// hides, holds and lets out itself. Pure logic, tile based.
import type { GhostDirection, GhostKind, GhostModel, GhostTile } from '../actors/GhostModel';
import type { SquadGuide } from '../actors/GhostService';
import { shortestRoute } from '../actors/ghostRoutes';
import type { RouteWorld } from '../actors/ghostRoutes';
import { seededRandom } from '../../render/common/random';

export type SquadTactic = 'fence' | 'ambush' | 'vent';
export type SquadPhase = 'calm' | 'tell' | 'on';
export type SquadRole = 'free' | 'hunter' | 'cutter' | 'fencer' | 'phantom' | 'lurker' | 'venter';

export const SQUAD_TUNE = {
	/** Seconds of calm between tactics, from .. to. */
	calm: [3, 5],
	/** Seconds a tactic is told before it starts. */
	tell: 1.3,
	/** Seconds each tactic lasts at most. */
	length: { fence: 12, ambush: 13, vent: 12 },
	/** How far ahead the hero's way is read, steps. */
	foresee: 14,
	/** The fence: the ring's radius, tiles; the chance of a thin seal and the push that tears it,
	 *  s; the projectors' charge, s; how long a lit ring holds, s; the fencers' walk, s. */
	ring: 7.5,
	weak: 0.5,
	breach: 0.6,
	charge: 1.5,
	hold: 9,
	walk: 7,
	/** The ambush: how far along his way the lurker settles; its hold on him; harmless after. */
	settle: [3, 11],
	grab: 0.8,
	harmless: 1.4,
	fade: 0.5,
	/**
	 * The run's first lurker teaches: it folds into food slowly (s), settles at least this far
	 * along his way, and its tells start this much stronger, fading out over `lessons` ambushes.
	 */
	lessonFade: 1.5,
	lessonSettle: 5,
	lessons: 3,
	/** The lurker creeps a tile along the eaten corridors when he does not look, every so often. */
	creep: 2.2,
	/** The vent: the shaft's glow before it comes out; how near he must pass; its longest wait. */
	glow: 1.2,
	spring: 3,
	lurk: 8,
	/** The escape's train: its leader's speed against the hero's (the cars keep up). */
	chaseLead: 0.95,
	/** The escape in a rage: all hunt at this speed, half at him, half at his way ahead. */
	rage: 1.08,
	rageCut: 6,
	/** The escape's interception: the warning on the junction ahead, s; between two, s; how far ahead, steps. */
	warn: 1.5,
	interceptFirst: 1.2,
	interceptEvery: 3,
	interceptAt: [5, 18],
	/** The interceptor dashes down a side corridor. */
	dash: 1.25,
	/** How far a corridor is followed looking for the junctions round the hero. */
	reach: 10
} as const;

export interface SquadWorld extends RouteWorld {
	/** Food was here and is eaten: a lurker may sit here (the attentive player's tell). */
	eaten(x: number, y: number): boolean;
	/** Uneaten food lies here (where the hero is heading). */
	food(x: number, y: number): boolean;
	/** The tile held a power cell. */
	cell(x: number, y: number): boolean;
	/** A shaft one may hide in: a vent's mouth in the outer wall, or a side tunnel's. */
	vent(x: number, y: number): boolean;
	readonly width: number;
	readonly height: number;
}

/** What the squad needs of `GhostService`. */
export interface SquadGhosts {
	readonly list: readonly GhostModel[];
	freeze(kind: GhostKind, seconds: number): void;
}

/** A creature out of sight: as food on a tile (the lurker) or in a vent shaft (the venter). */
export interface Hidden {
	readonly kind: GhostKind;
	x: number;
	y: number;
	readonly as: 'food' | 'cell' | 'vent';
	state: 'fading' | 'hidden' | 'glow';
	time: number;
	/** How long it takes to fold out of sight, s. */
	readonly fade: number;
	/** The lesson: 1 on the run's first lurker, down to 0 over `SQUAD_TUNE.lessons` ambushes. */
	readonly lesson: number;
	/** The lurker's next creep, s. */
	creepIn: number;
}

/** A creature walking to where it will hide. */
export interface Going {
	readonly kind: GhostKind;
	/** The tile it walks to (the lurker's tile, a vent's mouth). */
	readonly to: GhostTile;
	/** Where it then lies hidden (the same tile, or the vent it comes out of). */
	readonly spot: GhostTile;
	readonly as: 'food' | 'cell' | 'vent';
	readonly fade: number;
	readonly lesson: number;
	time: number;
}

/** A seal of the quarantine ring: the throat tile it grows in and the way out across it. */
export interface RingSeal {
	readonly x: number;
	readonly y: number;
	readonly dx: number;
	readonly dy: number;
	/** The thin one: he can push through it. */
	readonly weak: boolean;
}

/** A projector of the ring: a fencer at its post on the rim (its angle from the centre). */
export interface RingPost {
	readonly kind: GhostKind;
	readonly x: number;
	readonly y: number;
	readonly a: number;
	/** 0 walking there, then charging to 1 (the tell). */
	charge: number;
}

/** The fence: a quarantine ring round a point (tiles, cell centres at x + 0.5). */
export interface QuarantineRing {
	readonly cx: number;
	readonly cy: number;
	readonly r: number;
	readonly posts: RingPost[];
	readonly seals: readonly RingSeal[];
	lit: boolean;
	/** How long he has pushed into the thin seal, s; torn once it reaches `SQUAD_TUNE.breach`. */
	push: number;
	broken: boolean;
}

export interface SquadEvents {
	/** A lurker bit: hold the hero this long. */
	grab: number;
}

const DIRS: Record<GhostDirection, readonly [number, number]> = {
	UP: [0, -1],
	DOWN: [0, 1],
	LEFT: [-1, 0],
	RIGHT: [1, 0]
};
const OPP: Record<GhostDirection, GhostDirection> = {
	UP: 'DOWN',
	DOWN: 'UP',
	LEFT: 'RIGHT',
	RIGHT: 'LEFT'
};
const k = (x: number, y: number): string => `${x},${y}`;

export class StationSquad implements SquadGuide {
	phase: SquadPhase = 'calm';
	tactic: SquadTactic | null = null;
	/** The tactic the tell announces. */
	next: SquadTactic | null = null;
	/** Seconds left of the phase. */
	left: number;
	readonly roles = new Map<GhostKind, SquadRole>();
	/** Where each driving role is heading (the debug view shows them; the ambush's open way too). */
	readonly targets = new Map<GhostKind, GhostTile>();
	readonly hiddenList: Hidden[] = [];
	/**
	 * On their way into hiding (the owner: no teleport): the lurker walks to its tile, the venter
	 * to the nearest vent's mouth; there they fold out of sight (`hiddenList`).
	 */
	readonly going: Going[] = [];
	ring: QuarantineRing | null = null;
	/** The way the hero is read to take, from his tile on. */
	foreseen: GhostTile[] = [];
	/** The ambush: the way out left open. */
	openWay: GhostTile | null = null;
	/** In the escape: one train hunting him, for good. */
	chasing = false;
	/** The escape: one cuts onto his route at a junction ahead, told by the junction blinking. */
	intercept: { kind: GhostKind; x: number; y: number; warn: number; age: number } | null = null;
	private interceptIn: number = SQUAD_TUNE.interceptEvery;
	private route: (() => readonly GhostTile[]) | null = null;
	/** The escape in a rage (no 'from behind', no interceptions): the lit lane they may not step on. */
	rage: { lane: (x: number, y: number) => boolean } | null = null;
	/** The escape's lure: while it glows, the enraged run to it instead of at him. */
	lure: GhostTile | null = null;
	leader: GhostKind | null = null;
	readonly trail: GhostTile[] = [];
	private last: SquadTactic | null = null;
	/** Lurkers laid so far this level (the first ones teach). */
	private ambushes = 0;
	private readonly harmlessFor = new Map<GhostKind, number>();
	/** Reached its post: it hunts on from there and is not sent back (else it rocks at the post). */
	private readonly reached = new Set<GhostKind>();
	private ghosts: readonly GhostModel[] = [];
	private hero: GhostTile = { x: 0, y: 0 };
	private heroFacing: GhostDirection | null = null;
	private ahead: ((x: number, y: number) => boolean) | null = null;
	private readonly random: () => number;

	constructor(
		private readonly world: SquadWorld,
		seed = 1
	) {
		this.random = seededRandom((Math.imul(seed | 0, 0x9e3779b1) >>> 1) + 1);
		this.random();
		this.left = this.calmTime();
	}

	// ------------------------------------------------------------- the game's calls

	/** Back to the calm (a new life): the hidden are let out, the ring goes dark. */
	reset(ghosts: SquadGhosts): void {
		this.end(ghosts, 0);
		this.chasing = false;
		this.ahead = null;
		this.rage = null;
		this.lure = null;
	}

	/**
	 * The escape: everything stops but one train after him. `ahead` marks the way still before
	 * him: the train never steps on it, so it comes from behind, never head on along his route.
	 */
	chase(
		ghosts: SquadGhosts,
		ahead: ((x: number, y: number) => boolean) | null = null,
		route: (() => readonly GhostTile[]) | null = null,
		rage: { lane: (x: number, y: number) => boolean } | null = null
	): void {
		this.end(ghosts, 0);
		this.ahead = ahead;
		this.route = route;
		this.rage = rage;
		this.intercept = null;
		this.interceptIn = SQUAD_TUNE.interceptFirst;
		this.chasing = true;
		this.leader = null;
		this.trail.length = 0;
	}

	/**
	 * A power cell: the ring goes dark (its tactic ends); a lurker or a venter stays hidden and its
	 * play goes on after the fright (the owner: the cell no longer shows the mimics).
	 */
	onPower(ghosts: SquadGhosts): void {
		if (this.chasing) return;
		if (this.tactic === 'fence' || this.next === 'fence') this.end(ghosts, 0);
	}

	/** A lit seal stands there: the hero cannot pass (the squad can); a torn one lets him. */
	blocks(x: number, y: number): boolean {
		const r = this.ring;
		if (!r || !r.lit) return false;
		return r.seals.some((s) => s.x === x && s.y === y && !(s.weak && r.broken));
	}

	/** A revealed lurker or venter cannot hurt yet; the hidden do not touch at all. */
	harmless(kind: GhostKind): boolean {
		return (this.harmlessFor.get(kind) ?? 0) > 0 || this.hidden(kind) !== undefined;
	}

	hidden(kind: GhostKind): Hidden | undefined {
		return this.hiddenList.find((h) => h.kind === kind);
	}

	role(kind: GhostKind): SquadRole {
		return this.roles.get(kind) ?? 'free';
	}

	update(
		dt: number,
		ghosts: SquadGhosts,
		hero: GhostTile,
		heroFacing: GhostDirection | null = null
	): SquadEvents {
		this.ghosts = ghosts.list;
		this.hero = hero;
		this.heroFacing = heroFacing;
		const events: SquadEvents = { grab: 0 };
		for (const [kind, s] of this.harmlessFor) {
			if (s - dt <= 0) this.harmlessFor.delete(kind);
			else this.harmlessFor.set(kind, s - dt);
		}
		this.foreseen = this.foresee();
		if (this.chasing) {
			// at the lure they stop and sniff at it (not back and forth round it) till it dies
			if (this.rage && this.lure) {
				for (const g of this.hunters()) {
					const d = Math.abs(g.tile.x - this.lure.x) + Math.abs(g.tile.y - this.lure.y);
					if (d <= 1) ghosts.freeze(g.kind, 0.25);
				}
			}
			this.followLeader();
			if (!this.rage) this.updateIntercept(dt);
			return events;
		}
		this.updateGoing(dt, ghosts);
		this.updateHidden(dt, ghosts, events);
		this.updateRing(dt, ghosts);
		this.left -= dt;
		if (this.phase === 'on' && this.tactic === 'ambush') this.herd();
		if (this.left > 0) return events;
		if (this.phase === 'calm') {
			const next = this.pick();
			if (!next) {
				this.left = 1;
				return events;
			}
			this.next = next;
			this.phase = 'tell';
			this.left = SQUAD_TUNE.tell;
			this.plan(next);
			// nothing to play it with after all: back to the calm
			if (this.roles.size === 0) this.end(ghosts, 0);
		} else if (this.phase === 'tell') {
			this.phase = 'on';
			this.tactic = this.next;
			this.left = SQUAD_TUNE.length[this.tactic as SquadTactic];
		} else {
			this.end(ghosts, 0.6);
		}
		return events;
	}

	// ------------------------------------------------------------- the guide

	direction(ghost: GhostModel): GhostDirection | null {
		if (this.hidden(ghost.kind)) return null;
		if (this.chasing) return this.chaseStep(ghost);
		if (this.phase === 'calm') return null;
		const role = this.role(ghost.kind);
		const target = this.targets.get(ghost.kind);
		switch (role) {
			case 'hunter':
				return this.stepTo(ghost, this.hero);
			case 'lurker':
			case 'venter': {
				// on its way to hide
				const w = this.going.find((g) => g.kind === ghost.kind);
				return w ? this.stepTo(ghost, w.to) : this.stepTo(ghost, this.hero);
			}
			case 'cutter':
			case 'phantom':
			case 'fencer':
				if (target && (target.x !== ghost.tile.x || target.y !== ghost.tile.y))
					return this.stepTo(ghost, target);
				if (role === 'fencer') return null;
				if (target) {
					this.targets.delete(ghost.kind);
					this.reached.add(ghost.kind);
				}
				return this.stepTo(ghost, this.hero);
			default:
				return null;
		}
	}

	speedFactor(ghost: GhostModel): number {
		if (this.chasing) {
			if (this.rage) return SQUAD_TUNE.rage;
			if (this.intercept?.kind === ghost.kind) return SQUAD_TUNE.dash;
			return ghost.kind === this.leader ? SQUAD_TUNE.chaseLead : SQUAD_TUNE.chaseLead * 1.08;
		}
		// the fencers hurry to their posts, a little (more read as too fast)
		if (this.role(ghost.kind) === 'fencer' && this.phase !== 'calm') return 1.05;
		// so do those going into hiding
		if (this.going.some((g) => g.kind === ghost.kind)) return 1.05;
		return 1;
	}

	// ------------------------------------------------------------- the hero, read

	/** His way: on along his heading to the next junction, then toward the nearest food. */
	private foresee(): GhostTile[] {
		const path: GhostTile[] = [this.hero];
		const seen = new Set<string>([k(this.hero.x, this.hero.y)]);
		let at = this.hero;
		let facing = this.heroFacing;
		// he does not turn back without a reason: the tile behind him is not his way
		if (facing) seen.add(k(at.x - DIRS[facing][0], at.y - DIRS[facing][1]));
		while (path.length < SQUAD_TUNE.foresee) {
			const ways = this.waysFrom(at).filter(
				(d) => !seen.has(k(at.x + DIRS[d][0], at.y + DIRS[d][1]))
			);
			if (ways.length === 0) break;
			let d: GhostDirection | null = null;
			// along a corridor he goes on; at a junction he turns toward the nearest food
			if (facing && ways.length === 1 && ways[0] === facing) d = facing;
			if (!d) {
				const route = shortestRoute(
					{
						walkable: (x, y) => this.world.walkable(x, y) && !seen.has(k(x, y)),
						teleport: () => undefined
					},
					{ tile: at, facing: null },
					(x, y) => this.world.food(x, y),
					30
				);
				d = route?.directions[0] ?? (facing && ways.includes(facing) ? facing : ways[0]);
			}
			const next = { x: at.x + DIRS[d][0], y: at.y + DIRS[d][1] };
			path.push(next);
			seen.add(k(next.x, next.y));
			facing = d;
			at = next;
		}
		return path;
	}

	private waysFrom(t: GhostTile): GhostDirection[] {
		return (Object.keys(DIRS) as GhostDirection[]).filter((d) =>
			this.world.walkable(t.x + DIRS[d][0], t.y + DIRS[d][1])
		);
	}

	// ------------------------------------------------------------- the director

	private calmTime(): number {
		const [a, b] = SQUAD_TUNE.calm;
		return a + (b - a) * this.random();
	}

	private hunters(): GhostModel[] {
		return this.ghosts.filter((g) => g.state === 'active' && !this.hidden(g.kind));
	}

	/** The tactic the situation offers best (none: a second more of calm). */
	private pick(): SquadTactic | null {
		const n = this.hunters().length;
		const scores: Array<[SquadTactic, number]> = [];
		if (n >= 3) scores.push(['fence', 1]);
		// the less food is left, the likelier the ambush (the last food is where they wait)
		if (n >= 2 && this.ambushSpot()) scores.push(['ambush', 1.2 + 1.6 * (1 - this.foodLeft())]);
		if (n >= 2 && this.ventSpot()) scores.push(['vent', 1.4]);
		const fresh = scores.filter(([t]) => t !== this.last);
		const pool = fresh.length ? fresh : scores;
		if (!pool.length) return null;
		let total = pool.reduce((s, [, v]) => s + v, 0) * this.random();
		for (const [t, v] of pool) {
			total -= v;
			if (total <= 0) return t;
		}
		return pool[pool.length - 1][0];
	}

	/** The roles and the targets of the tactic told now. */
	private plan(tactic: SquadTactic): void {
		this.roles.clear();
		this.targets.clear();
		this.reached.clear();
		const pool = this.hunters();
		const byDist = pool
			.map((g) => ({ g, d: this.distance(g.tile, this.hero) }))
			.sort((a, b) => a.d - b.d);
		if (tactic === 'fence') {
			const plan = this.ringPlan();
			if (!plan) return;
			// the nearest to each post projects from it, the nearest of the rest hunts, the last fades
			const taken = new Set<GhostKind>();
			const posts: RingPost[] = [];
			for (const spot of plan.spots) {
				let best: { g: GhostModel; d: number } | null = null;
				for (const g of pool) {
					if (taken.has(g.kind)) continue;
					const d = Math.abs(g.tile.x - spot.x) + Math.abs(g.tile.y - spot.y);
					if (!best || d < best.d) best = { g, d };
				}
				if (!best) continue;
				taken.add(best.g.kind);
				this.roles.set(best.g.kind, 'fencer');
				this.targets.set(best.g.kind, { x: spot.x, y: spot.y });
				posts.push({ kind: best.g.kind, x: spot.x, y: spot.y, a: spot.a, charge: 0 });
			}
			this.ring = { ...plan.ring, posts, lit: false, push: 0, broken: false };
			const rest = byDist.filter((e) => !taken.has(e.g.kind));
			if (rest[0]) this.roles.set(rest[0].g.kind, 'hunter');
			if (rest[1]) {
				this.roles.set(rest[1].g.kind, 'phantom');
				this.targets.set(rest[1].g.kind, this.foreseen[Math.min(this.foreseen.length - 1, 6)]);
			}
		} else if (tactic === 'ambush') {
			const spot = this.ambushSpot();
			if (!spot) return;
			// the one nearest the tile (not the hunter at him) walks there to hide; the rest herd
			const lurker = this.nearestTo(byDist, spot);
			const lurkers = [lurker];
			this.roles.set(lurker.kind, 'lurker');
			this.targets.set(lurker.kind, spot);
			this.going.push({
				kind: lurker.kind,
				to: spot,
				spot,
				as: this.world.cell(spot.x, spot.y) ? 'cell' : 'food',
				fade: this.ambushes === 0 ? SQUAD_TUNE.lessonFade : SQUAD_TUNE.fade,
				lesson: Math.max(0, 1 - this.ambushes / SQUAD_TUNE.lessons),
				time: 0
			});
			// the less food is left, the more lie among it (the owner): one, two, then three,
			// always one left to hunt
			const left = this.foodLeft();
			const more = Math.min(left > 0.5 ? 0 : left > 0.25 ? 1 : 2, byDist.length - 2);
			for (const at of this.lurkSpots(more, [spot])) {
				const rest = byDist.filter((e) => !lurkers.includes(e.g));
				const g = this.nearestTo(rest, at); // rest[0] stays the hunter
				if (lurkers.includes(g)) break;
				lurkers.push(g);
				this.roles.set(g.kind, 'lurker');
				this.targets.set(g.kind, at);
				this.going.push({
					kind: g.kind,
					to: at,
					spot: at,
					as: 'food',
					fade: SQUAD_TUNE.fade,
					lesson: 0,
					time: 0
				});
			}
			this.ambushes += 1;
			byDist
				.filter((e) => !lurkers.includes(e.g))
				.forEach((e, i) => this.roles.set(e.g.kind, i === 0 ? 'hunter' : 'cutter'));
			this.herd();
		} else {
			const spot = this.ventSpot();
			if (!spot) return;
			// the one nearest a vent walks into it; it comes out of the one by his way
			const { g: venter, mouth } = this.nearestVent(byDist);
			this.roles.set(venter.kind, 'venter');
			this.targets.set(venter.kind, mouth);
			this.going.push({
				kind: venter.kind,
				to: mouth,
				spot,
				as: 'vent',
				fade: SQUAD_TUNE.fade,
				lesson: 0,
				time: 0
			});
			byDist
				.filter((e) => e.g !== venter)
				.forEach((e, i) => this.roles.set(e.g.kind, i === 0 ? 'hunter' : 'cutter'));
			// the cutter takes the junction past the vent, so the way leads him by it
			const cut = this.foreseen[Math.min(this.foreseen.length - 1, 10)];
			for (const [kind, role] of this.roles) if (role === 'cutter') this.targets.set(kind, cut);
		}
	}

	/** Of those not at him (the nearest is the hunter), the one nearest `spot`. */
	/** The share of the station's food not eaten yet, 0..1. */
	foodLeft(): number {
		let food = 0;
		let eaten = 0;
		for (let y = 0; y < this.world.height; y += 1) {
			for (let x = 0; x < this.world.width; x += 1) {
				if (this.world.food(x, y)) food += 1;
				else if (this.world.eaten(x, y)) eaten += 1;
			}
		}
		return food + eaten > 0 ? food / (food + eaten) : 1;
	}

	/**
	 * Late lurkers' tiles: eaten tiles right beside food still lying there (they pass for the
	 * last food), not by him, apart from each other, nearest his way first.
	 */
	private lurkSpots(n: number, taken: GhostTile[]): GhostTile[] {
		if (n <= 0) return [];
		const near = this.foreseen.slice(0, SQUAD_TUNE.foresee);
		const out: GhostTile[] = [];
		const all: Array<{ t: GhostTile; score: number }> = [];
		for (let y = 0; y < this.world.height; y += 1) {
			for (let x = 0; x < this.world.width; x += 1) {
				if (!this.world.eaten(x, y) || this.world.vent(x, y) || this.world.cell(x, y)) continue;
				if (Math.abs(x - this.hero.x) + Math.abs(y - this.hero.y) < 4) continue;
				const byFood = Object.values(DIRS).some(([dx, dy]) => this.world.food(x + dx, y + dy));
				if (!byFood) continue;
				const way = near.reduce((m, t) => Math.min(m, Math.abs(t.x - x) + Math.abs(t.y - y)), 99);
				all.push({ t: { x, y }, score: way + this.random() * 2 });
			}
		}
		all.sort((a, b) => a.score - b.score);
		for (const { t } of all) {
			if (out.length >= n) break;
			const apart = [...taken, ...out].every((o) => Math.abs(o.x - t.x) + Math.abs(o.y - t.y) >= 4);
			if (apart) out.push(t);
		}
		return out;
	}

	private nearestTo(byDist: Array<{ g: GhostModel; d: number }>, spot: GhostTile): GhostModel {
		const pool = byDist.length > 1 ? byDist.slice(1) : byDist;
		let best = pool[0].g;
		let bd = Infinity;
		for (const { g } of pool) {
			const d = Math.abs(g.tile.x - spot.x) + Math.abs(g.tile.y - spot.y);
			if (d < bd) {
				bd = d;
				best = g;
			}
		}
		return best;
	}

	/** Of those not at him, the one nearest a vent's mouth, and that mouth. */
	private nearestVent(byDist: Array<{ g: GhostModel; d: number }>): {
		g: GhostModel;
		mouth: GhostTile;
	} {
		const pool = byDist.length > 1 ? byDist.slice(1) : byDist;
		let best = { g: pool[0].g, mouth: pool[0].g.tile as GhostTile, d: Infinity };
		for (let y = 0; y < this.world.height; y += 1) {
			for (let x = 0; x < this.world.width; x += 1) {
				if (!this.world.vent(x, y)) continue;
				const m = this.mouth({ x, y });
				for (const { g } of pool) {
					const d = Math.abs(g.tile.x - m.x) + Math.abs(g.tile.y - m.y);
					if (d < best.d) best = { g, mouth: m, d };
				}
			}
		}
		return { g: best.g, mouth: best.mouth };
	}

	/** Those walking to hide: there, they fold out of sight; too long on the way, they hunt on. */
	private updateGoing(dt: number, ghosts: SquadGhosts): void {
		for (const w of [...this.going]) {
			w.time += dt;
			const ghost = this.ghosts.find((g) => g.kind === w.kind);
			const drop = () => this.going.splice(this.going.indexOf(w), 1);
			if (!ghost || ghost.state !== 'active') {
				drop();
				continue;
			}
			if (ghost.tile.x === w.to.x && ghost.tile.y === w.to.y) {
				drop();
				this.targets.delete(w.kind);
				ghosts.freeze(w.kind, 1e6);
				this.hiddenList.push({
					kind: w.kind,
					x: w.spot.x,
					y: w.spot.y,
					as: w.as,
					state: 'fading',
					time: 0,
					fade: w.fade,
					lesson: w.lesson,
					creepIn: SQUAD_TUNE.creep
				});
			} else if (w.time > SQUAD_TUNE.walk) {
				drop();
				this.targets.delete(w.kind);
				this.roles.set(w.kind, 'hunter');
			}
		}
	}

	/** The tactic ends: the ring dark, the hidden out, roles off, calm. */
	private end(ghosts: SquadGhosts, harmless: number): void {
		this.going.length = 0;
		for (const h of [...this.hiddenList]) this.reveal(h, ghosts, harmless);
		for (const p of this.ring?.posts ?? []) ghosts.freeze(p.kind, 1e-6);
		this.ring = null;
		this.roles.clear();
		this.targets.clear();
		this.reached.clear();
		this.openWay = null;
		if (this.tactic) this.last = this.tactic;
		this.tactic = null;
		this.next = null;
		this.phase = 'calm';
		this.left = this.calmTime();
	}

	// ------------------------------------------------------------- the fence: the ring

	private open(x: number, y: number): boolean {
		return this.world.walkable(x, y) && !this.world.teleport(x, y);
	}

	/**
	 * The ring round a point two steps ahead of him: its seals (every step across the rim between
	 * two open tiles, moved into the nearest throat: a tile with walls on both sides across the
	 * way), one of them thin in one ring of two, and the two projectors' posts (the open tiles
	 * nearest the rim to his sides). Null when the maze gives it no seal or no post.
	 */
	ringPlan(): {
		ring: Pick<QuarantineRing, 'cx' | 'cy' | 'r' | 'seals'>;
		spots: Array<{ x: number; y: number; a: number }>;
	} | null {
		const at = this.foreseen[Math.min(2, this.foreseen.length - 1)] ?? this.hero;
		const cx = at.x + 0.5;
		const cy = at.y + 0.5;
		const r = SQUAD_TUNE.ring;
		const W = this.world.width;
		const H = this.world.height;
		const inside = (x: number, y: number) => Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r;
		const throat = (x: number, y: number, dx: number, dy: number) =>
			this.open(x, y) &&
			!this.world.walkable(x + dy, y + dx) &&
			!this.world.walkable(x - dy, y - dx);
		const found: Array<{ x: number; y: number; dx: number; dy: number }> = [];
		const taken = new Set<number>();
		for (let y = 0; y < H; y += 1) {
			for (let x = 0; x < W; x += 1) {
				if (!this.open(x, y) || !inside(x, y)) continue;
				for (const [dx, dy] of Object.values(DIRS)) {
					const bx = x + dx;
					const by = y + dy;
					if (!this.open(bx, by) || inside(bx, by)) continue;
					const line: Array<[number, number]> = [
						[bx, by],
						[x, y],
						[bx + dx, by + dy],
						[x - dx, y - dy],
						[bx + 2 * dx, by + 2 * dy],
						[x - 2 * dx, y - 2 * dy]
					];
					const [tx, ty] = line.find(([tx2, ty2]) => throat(tx2, ty2, dx, dy)) ?? [bx, by];
					if (taken.has(ty * W + tx)) continue;
					taken.add(ty * W + tx);
					found.push({ x: tx, y: ty, dx, dy });
				}
			}
		}
		if (found.length < 2) return null;
		const thin = this.random() < SQUAD_TUNE.weak ? Math.floor(this.random() * found.length) : -1;
		const seals: RingSeal[] = found.map((f, i) => ({ ...f, weak: i === thin }));
		// the posts: to his sides of the line from the centre to him
		const toHim = Math.atan2(this.hero.y + 0.5 - cy, this.hero.x + 0.5 - cx);
		const base =
			Number.isFinite(toHim) && (this.hero.x !== at.x || this.hero.y !== at.y) ? toHim : 0;
		const spots: Array<{ x: number; y: number; a: number }> = [];
		for (const want of [base + Math.PI / 2, base - Math.PI / 2]) {
			let best: { x: number; y: number; a: number; score: number } | null = null;
			for (let y = 0; y < H; y += 1) {
				for (let x = 0; x < W; x += 1) {
					if (!this.open(x, y) || spots.some((p) => p.x === x && p.y === y)) continue;
					const a = Math.atan2(y + 0.5 - cy, x + 0.5 - cx);
					const da = Math.abs(Math.atan2(Math.sin(a - want), Math.cos(a - want)));
					const score = Math.abs(Math.hypot(x + 0.5 - cx, y + 0.5 - cy) - r) * 2 + da * 3;
					if (!best || score < best.score) best = { x, y, a, score };
				}
			}
			if (best) spots.push({ x: best.x, y: best.y, a: best.a });
		}
		if (spots.length < 2) return null;
		return { ring: { cx, cy, r, seals }, spots };
	}

	private updateRing(dt: number, ghosts: SquadGhosts): void {
		const r = this.ring;
		if (this.phase !== 'on' || this.tactic !== 'fence' || !r) return;
		if (!r.lit) {
			for (const p of r.posts) {
				const g = this.ghosts.find((gg) => gg.kind === p.kind);
				if (!g || g.state !== 'active') continue;
				if (g.tile.x === p.x && g.tile.y === p.y) {
					if (p.charge === 0) ghosts.freeze(p.kind, 1e6);
					p.charge = Math.min(1, p.charge + dt / SQUAD_TUNE.charge);
				}
			}
			if (r.posts.length && r.posts.every((p) => p.charge >= 1)) {
				r.lit = true;
				// a lit ring holds for its own time from here
				this.left = Math.min(this.left, SQUAD_TUNE.hold);
			} else if (
				// the fencers did not get there in time: the fence is off
				SQUAD_TUNE.length.fence - this.left > SQUAD_TUNE.walk &&
				r.posts.some((p) => p.charge === 0)
			) {
				this.end(ghosts, 0);
			}
			return;
		}
		// the thin seal: he tears it by pushing into it
		const thin = r.seals.find((s) => s.weak);
		if (!thin || r.broken) return;
		const way = this.heroFacing ? DIRS[this.heroFacing] : null;
		const pushing = !!way && this.hero.x + way[0] === thin.x && this.hero.y + way[1] === thin.y;
		r.push = pushing ? r.push + dt : Math.max(0, r.push - dt * 2);
		if (r.push >= SQUAD_TUNE.breach) r.broken = true;
	}

	// ------------------------------------------------------------- the ambush

	/** An eaten tile along his way, some steps on: where a lurker passes for food. */
	private ambushSpot(): GhostTile | null {
		const [first, far] = SQUAD_TUNE.settle;
		// the first lurker settles farther on: he has time to see it fold
		const near = this.ambushes === 0 ? Math.max(first, SQUAD_TUNE.lessonSettle) : first;
		for (let i = near; i < Math.min(far, this.foreseen.length); i += 1) {
			const t = this.foreseen[i];
			if (this.world.eaten(t.x, t.y) && !this.world.vent(t.x, t.y)) return t;
		}
		// else an eaten tile at a junction near him
		const exits = this.exits(this.hero);
		for (const e of exits) if (this.world.eaten(e.x, e.y)) return e;
		return null;
	}

	/** The herders shut every way out of where he is but the one to the lurker. */
	private herd(): void {
		const lurk =
			this.hiddenList.find((h) => h.as !== 'vent') ?? this.going.find((g) => g.as !== 'vent')?.spot;
		if (!lurk) return;
		const exits = this.exits(this.hero);
		if (exits.length === 0) return;
		// the way out the lurker lies through (or nearest): left open
		let open = exits[0];
		let bestD = Infinity;
		for (const e of exits) {
			const d = this.distance(e, lurk);
			if (d < bestD) {
				bestD = d;
				open = e;
			}
		}
		this.openWay = open;
		const shut = exits.filter((e) => e !== open);
		const herders = [...this.roles]
			.filter(([kind, r]) => (r === 'hunter' || r === 'cutter') && !this.reached.has(kind))
			.map(([kind]) => kind);
		const free = new Set(shut.map((_, i) => i));
		for (const kind of herders) {
			const g = this.ghosts.find((gg) => gg.kind === kind);
			if (!g) continue;
			let best = -1;
			let bd = Infinity;
			for (const i of free) {
				const d = Math.abs(g.tile.x - shut[i].x) + Math.abs(g.tile.y - shut[i].y);
				if (d < bd) {
					bd = d;
					best = i;
				}
			}
			if (best >= 0) {
				free.delete(best);
				this.roles.set(kind, 'cutter');
				this.targets.set(kind, shut[best]);
			} else {
				this.roles.set(kind, 'hunter');
				this.targets.delete(kind);
			}
		}
	}

	/** The junctions round the hero: along each corridor leaving him, the first one met. */
	exits(hero: GhostTile): GhostTile[] {
		const out: GhostTile[] = [];
		const seen = new Set<string>();
		for (const d0 of Object.keys(DIRS) as GhostDirection[]) {
			let x = hero.x;
			let y = hero.y;
			let dir = d0;
			for (let i = 0; i < SQUAD_TUNE.reach; i += 1) {
				const [dx, dy] = DIRS[dir];
				if (!this.world.walkable(x + dx, y + dy)) break;
				x += dx;
				y += dy;
				if (this.world.teleport(x, y)) break;
				const ways = this.waysFrom({ x, y });
				if (ways.length >= 3) {
					if (!seen.has(k(x, y))) {
						seen.add(k(x, y));
						out.push({ x, y });
					}
					break;
				}
				const on = ways.find((w) => w !== OPP[dir]);
				if (!on) break;
				dir = on;
			}
		}
		return out;
	}

	// ------------------------------------------------------------- the vent

	/** The vent mouth nearest his way (within a few steps of it), where one waits in the shaft. */
	private ventSpot(): GhostTile | null {
		let best: GhostTile | null = null;
		let bestD = Infinity;
		for (let y = 0; y < this.world.height; y += 1) {
			for (let x = 0; x < this.world.width; x += 1) {
				if (!this.world.vent(x, y)) continue;
				for (let i = 3; i < this.foreseen.length; i += 1) {
					const t = this.foreseen[i];
					const d = Math.abs(t.x - x) + Math.abs(t.y - y);
					if (d <= 6 && d + i * 0.3 < bestD) {
						bestD = d + i * 0.3;
						best = { x, y };
					}
				}
			}
		}
		return best;
	}

	/** The tile in front of a vent's mouth (where the venter comes out). */
	private mouth(v: GhostTile): GhostTile {
		for (const [dx, dy] of Object.values(DIRS)) {
			const x = v.x + dx;
			const y = v.y + dy;
			if (this.world.walkable(x, y) && !this.world.teleport(x, y)) return { x, y };
		}
		return v;
	}

	// ------------------------------------------------------------- the hidden

	private updateHidden(dt: number, ghosts: SquadGhosts, events: SquadEvents): void {
		for (const h of [...this.hiddenList]) {
			h.time += dt;
			const ghost = this.ghosts.find((g) => g.kind === h.kind);
			if (!ghost) continue;
			if (h.state === 'fading' && h.time >= h.fade) {
				h.state = 'hidden';
				h.time = 0;
				ghost.teleportTo(h.as === 'vent' ? this.mouth({ x: h.x, y: h.y }) : { x: h.x, y: h.y });
			}
			if (h.state === 'fading') continue;
			if (h.as === 'vent') {
				const m = this.mouth({ x: h.x, y: h.y });
				const d = Math.abs(this.hero.x - m.x) + Math.abs(this.hero.y - m.y);
				if (h.state === 'hidden' && (d <= SQUAD_TUNE.spring || h.time >= SQUAD_TUNE.lurk)) {
					// its eyes light in the shaft: the tell, then out
					h.state = 'glow';
					h.time = 0;
				} else if (h.state === 'glow' && h.time >= SQUAD_TUNE.glow) {
					this.reveal(h, ghosts, 0);
					this.roles.set(h.kind, 'hunter');
				}
				continue;
			}
			// the lurker: a bite when he steps on it
			if (this.hero.x === h.x && this.hero.y === h.y) {
				this.reveal(h, ghosts, SQUAD_TUNE.harmless);
				this.roles.set(h.kind, 'hunter');
				events.grab = SQUAD_TUNE.grab;
				continue;
			}
			// it creeps along the eaten corridors to stay on his way, while he does not look at it
			h.creepIn -= dt;
			if (h.creepIn <= 0) {
				h.creepIn = SQUAD_TUNE.creep;
				if (!this.watched(h)) this.creep(h, ghost);
			}
		}
	}

	/** He looks along his heading at it, or is near: it keeps still. */
	private watched(h: Hidden): boolean {
		if (Math.abs(this.hero.x - h.x) + Math.abs(this.hero.y - h.y) <= 3) return true;
		const f = this.heroFacing;
		if (!f) return false;
		let x = this.hero.x;
		let y = this.hero.y;
		for (let i = 0; i < 30; i += 1) {
			x += DIRS[f][0];
			y += DIRS[f][1];
			if (!this.world.walkable(x, y)) return false;
			if (x === h.x && y === h.y) return true;
		}
		return false;
	}

	private creep(h: Hidden, ghost: GhostModel): void {
		const onWay = new Set(this.foreseen.slice(SQUAD_TUNE.settle[0]).map((t) => k(t.x, t.y)));
		if (onWay.has(k(h.x, h.y))) return;
		const route = shortestRoute(
			{
				walkable: (x, y) => this.world.walkable(x, y) && this.world.eaten(x, y),
				teleport: () => undefined
			},
			{ tile: { x: h.x, y: h.y }, facing: null },
			(x, y) => onWay.has(k(x, y)),
			12
		);
		const next = route?.tiles[0];
		if (!next || (next.x === this.hero.x && next.y === this.hero.y)) return;
		h.x = next.x;
		h.y = next.y;
		ghost.teleportTo(next);
	}

	private reveal(h: Hidden, ghosts: SquadGhosts, harmless: number): void {
		const i = this.hiddenList.indexOf(h);
		if (i >= 0) this.hiddenList.splice(i, 1);
		const ghost = this.ghosts.find((g) => g.kind === h.kind);
		if (ghost && h.as === 'vent' && h.state !== 'fading')
			ghost.teleportTo(this.mouth({ x: h.x, y: h.y }));
		ghosts.freeze(h.kind, 1e-6);
		if (harmless > 0) this.harmlessFor.set(h.kind, harmless);
	}

	// ------------------------------------------------------------- the escape's train

	private followLeader(): void {
		if (!this.leader || !this.ghosts.some((g) => g.kind === this.leader && g.state === 'active')) {
			const hunters = this.hunters();
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
		const lead = this.ghosts.find((g) => g.kind === this.leader);
		if (!lead) return;
		const head = this.trail[0];
		if (!head || head.x !== lead.tile.x || head.y !== lead.tile.y) {
			this.trail.unshift({ x: lead.tile.x, y: lead.tile.y });
			if (this.trail.length > 24) this.trail.length = 24;
		}
	}

	/**
	 * Now and then one leaves the train to cut onto his route at a junction ahead of him: the
	 * junction blinks first (the warning); fast, he is past before it gets there.
	 */
	private updateIntercept(dt: number): void {
		const route = this.route?.() ?? [];
		const ic = this.intercept;
		if (ic) {
			ic.age += dt;
			ic.warn = Math.max(0, ic.warn - dt);
			const onRoute = route.some((t) => t.x === ic.x && t.y === ic.y);
			if (!onRoute || ic.age > 8) {
				this.intercept = null;
				this.interceptIn = SQUAD_TUNE.interceptEvery;
			}
			return;
		}
		this.interceptIn -= dt;
		if (this.interceptIn > 0 || route.length === 0) return;
		this.interceptIn = 1;
		const [near, far] = SQUAD_TUNE.interceptAt;
		const cars = this.hunters().filter((g) => g.kind !== this.leader);
		for (let i = near; i < Math.min(far, route.length - 1); i += 1) {
			const t = route[i];
			if (this.waysFrom(t).length < 3) continue;
			for (const g of cars) {
				// it must get there no later than he does (sooner, it stands on his way: he sees it)
				const d = this.distance(g.tile, t);
				if (d <= (i + 1) * SQUAD_TUNE.dash) {
					this.intercept = { kind: g.kind, x: t.x, y: t.y, warn: SQUAD_TUNE.warn, age: 0 };
					return;
				}
			}
		}
	}

	private chaseStep(ghost: GhostModel): GhostDirection | null {
		if (this.rage && this.lure) return this.stepTo(ghost, this.lure);
		if (this.rage) {
			// in a rage: the even ones at him, the odd ones at his way ahead
			const order = this.hunters().sort((a, b) => a.kind.localeCompare(b.kind));
			const i = order.indexOf(ghost);
			const way = this.route?.() ?? [];
			const goal =
				i % 2 === 1 && way.length > 1
					? way[Math.min(way.length - 1, SQUAD_TUNE.rageCut)]
					: this.hero;
			return this.stepTo(ghost, goal);
		}
		const ic = this.intercept;
		if (ic && ic.kind === ghost.kind) {
			if (ghost.tile.x !== ic.x || ghost.tile.y !== ic.y) return this.stepTo(ghost, ic);
			return this.stepTo(ghost, this.hero);
		}
		if (ghost.kind === this.leader) return this.stepTo(ghost, this.hero);
		const lead = this.ghosts.find((g) => g.kind === this.leader);
		if (!lead) return null;
		const cars = this.hunters()
			.filter((g) => g.kind !== this.leader)
			.sort((a, b) => this.distance(a.tile, lead.tile) - this.distance(b.tile, lead.tile));
		const car = cars.indexOf(ghost) + 1;
		const at = this.trail[Math.min(this.trail.length - 1, car * 2)] ?? lead.tile;
		if (at.x === ghost.tile.x && at.y === ghost.tile.y) return this.stepTo(ghost, lead.tile);
		return this.stepTo(ghost, at);
	}

	// ------------------------------------------------------------- ways

	/** The world the squad plans in: in the chase, his way ahead is closed to it. */
	private ways(): RouteWorld {
		const lane = this.chasing ? this.rage?.lane : null;
		if (lane)
			return {
				walkable: (x, y) => this.world.walkable(x, y) && !lane(x, y),
				teleport: (x, y) => this.world.teleport(x, y)
			};
		const ahead = this.chasing ? this.ahead : null;
		if (!ahead) return this.world;
		return {
			walkable: (x, y) =>
				this.world.walkable(x, y) &&
				(!ahead(x, y) ||
					(x === this.hero.x && y === this.hero.y) ||
					(this.intercept !== null && x === this.intercept.x && y === this.intercept.y)),
			teleport: (x, y) => this.world.teleport(x, y)
		};
	}

	/** The first step toward `goal`, never turning back on its way (the classic ghosts' rule: a
	 *  turn back on the way read as twitchy); only a dead end turns it. */
	private stepTo(ghost: GhostModel, goal: GhostTile): GhostDirection | null {
		if (ghost.tile.x === goal.x && ghost.tile.y === goal.y) return null;
		const isGoal = (x: number, y: number) => x === goal.x && y === goal.y;
		const route =
			shortestRoute(this.ways(), { tile: ghost.tile, facing: ghost.facing }, isGoal, 80) ??
			shortestRoute(this.ways(), { tile: ghost.tile, facing: null }, isGoal, 80);
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
