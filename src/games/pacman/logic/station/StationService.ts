import { METAMORPHOSIS_ORDER, STATION } from '../../config/stationConfig';
import type { EventBus } from '../../engine/EventBus';
import type { PacmanEventMap } from '../../core/Events';
import type { GhostService } from '../actors/GhostService';
import type { GhostKind, GhostModel } from '../actors/GhostModel';
import type { PlayerService } from '../actors/PlayerService';
import type { LevelProgress } from '../level/LevelProgress';
import type { GridService } from '../maze/GridService';
import type { SpawnLocator } from '../maze/SpawnLocator';
import type { Point, Solid } from './stationBeam';
import { DIRECTION_ANGLE, beamTiles, inBeam } from './stationBeam';

export type StationPhase = 1 | 2 | 3;

export interface Cocoon {
	readonly kind: GhostKind;
	readonly x: number;
	readonly y: number;
	/** Seconds left before the hunter hatches, and the cocoon's full time. */
	readonly left: number;
	readonly total: number;
}

export interface BurningFlare {
	readonly x: number;
	readonly y: number;
	readonly left: number;
}

export interface SuperBeam {
	readonly tiles: readonly Point[];
	readonly left: number;
}

export interface Rewind {
	/** 0..1 through the pull back. */
	readonly progress: number;
	/** The trail being walked back, newest first. */
	readonly path: readonly Point[];
}

interface MutableCocoon {
	kind: GhostKind;
	x: number;
	y: number;
	left: number;
	total: number;
}

/** The hero's speed in tiles per second the station's speeds are shares of. */
function heroBase(player: PlayerService): number {
	return player.baseSpeed;
}

/**
 * The station's rules (DESIGN.md §7a): the hero's health and the rewind on a touch, the
 * flashlight's and the flares' scare (nothing is eaten, a fleeing creature cannot hurt), the
 * metamorphosis of the ghosts into hunters through their cocoons, the three phases, and the
 * super flare carried to the hatch. The ghosts walk by their own service; this one sets their
 * pace and their fear. The level's end (the hatch and the heart) is `BossRewardService`'s.
 */
export class StationService {
	private readonly ghosts: GhostService;
	private readonly player: PlayerService;
	private readonly progress: LevelProgress;
	private readonly locator: SpawnLocator;
	private readonly events: EventBus<PacmanEventMap>;
	private readonly solid: Solid;
	private readonly energizers: Point[] = [];
	private hpValue: number = STATION.hp;
	private caughtValue = false;
	/** The hero's recent tiles, newest last, with the time he reached each. */
	private trail: Array<{ x: number; y: number; t: number }> = [];
	private clock = 0;
	private rewindValue: { elapsed: number; path: Point[] } | null = null;
	private readonly scare = new Map<GhostKind, number>();
	private readonly hunterSet = new Set<GhostKind>();
	private cocoonList: MutableCocoon[] = [];
	private started = 0;
	private sinceLast = 0;
	private flareList: Array<{ x: number; y: number; left: number }> = [];
	private burst: Set<string> = new Set();
	private tokenValue: Point | null = null;
	private carriedValue = false;
	private superUsed = false;
	private beamValue: { tiles: Point[]; left: number } | null = null;

	constructor(
		grid: GridService,
		ghosts: GhostService,
		player: PlayerService,
		progress: LevelProgress,
		locator: SpawnLocator,
		events: EventBus<PacmanEventMap>
	) {
		this.ghosts = ghosts;
		this.player = player;
		this.progress = progress;
		this.locator = locator;
		this.events = events;
		this.solid = (x, y) => {
			if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) {
				return true;
			}
			const t = grid.tileAt(x, y);
			return t === 'WL' || t === 'ES';
		};
		for (let y = 0; y < grid.height; y += 1) {
			for (let x = 0; x < grid.width; x += 1) {
				if (grid.tileAt(x, y) === 'EU') {
					this.energizers.push({ x, y });
				}
			}
		}
		this.reset();
	}

	get hp(): number {
		return this.hpValue;
	}

	get hpMax(): number {
		return STATION.hp;
	}

	/** Power, blackout, nest: by the metamorphoses begun (the 2nd and the 4th turn it). */
	get phase(): StationPhase {
		return this.started >= 4 ? 3 : this.started >= 2 ? 2 : 1;
	}

	get hunters(): ReadonlySet<GhostKind> {
		return this.hunterSet;
	}

	get cocoons(): readonly Cocoon[] {
		return this.cocoonList;
	}

	get flares(): readonly BurningFlare[] {
		return this.flareList;
	}

	/** The super flare lying in the maze, or null. */
	get token(): Point | null {
		return this.tokenValue;
	}

	/** The hero carries the super flare (`F` spends it). */
	get carried(): boolean {
		return this.carriedValue;
	}

	get superBeam(): SuperBeam | null {
		return this.beamValue;
	}

	/** The rewind on screen, or null. Everything but the hero stands still meanwhile. */
	get rewind(): Rewind | null {
		const r = this.rewindValue;
		return r ? { progress: Math.min(1, r.elapsed / STATION.rewind.seconds), path: r.path } : null;
	}

	get rewinding(): boolean {
		return this.rewindValue !== null;
	}

	/** Seconds `kind` still flees (0: it hunts). */
	scaredFor(kind: GhostKind): number {
		return this.scare.get(kind) ?? 0;
	}

	/** True once, when the hero has lost his last HP. */
	consumeCaught(): boolean {
		const caught = this.caughtValue;
		this.caughtValue = false;
		return caught;
	}

	reset(): void {
		this.hpValue = STATION.hp;
		this.caughtValue = false;
		this.trail = [];
		this.clock = 0;
		this.rewindValue = null;
		this.scare.clear();
		this.hunterSet.clear();
		this.cocoonList = [];
		this.started = 0;
		this.sinceLast = 0;
		this.flareList = [];
		this.burst = new Set();
		this.tokenValue = null;
		this.carriedValue = false;
		this.superUsed = false;
		this.beamValue = null;
		this.ghosts.setFleeFactor(this.share(STATION.speed.flee));
		for (const kind of METAMORPHOSIS_ORDER) {
			this.ghosts.setKindSpeed(kind, this.share(STATION.speed.wraith));
		}
	}

	/** After a death-free level restart: the hero's state, the world's clock stays. */
	resetHero(): void {
		this.trail = [];
		this.rewindValue = null;
	}

	/**
	 * One step of the rules. During a rewind only the pull back moves. `fire`: the player
	 * pressed the slot's key this frame.
	 */
	update(dt: number, fire: boolean): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('StationService.update', 'invalid delta time', dt);
			return;
		}
		this.clock += dt;
		if (this.rewindValue) {
			this.stepRewind(dt);
			return;
		}
		this.recordTrail();
		this.updateMetamorphosis(dt);
		this.updateFlares(dt);
		this.updateSuperFlare(dt, fire);
		this.updateScare(dt);
	}

	/** A touch by `ghost` (the combat's contact): one HP, then the rewind, or caught at none. */
	hit(ghost: GhostModel): void {
		if (this.rewindValue || this.player.isInvulnerable || this.caughtValue) {
			return;
		}
		this.hpValue = Math.max(0, this.hpValue - 1);
		this.events.emit('audio:cue', { cue: 'death' });
		if (this.hpValue <= 0) {
			this.caughtValue = true;
			return;
		}
		this.scare.set(ghost.kind, STATION.flare.seconds * 0.6);
		this.startFleeing(ghost);
		// the hero is pulled back along his own trail, the newest tile first
		const since = this.clock - STATION.rewind.back;
		const path = this.trail
			.filter((p) => p.t >= since)
			.map((p) => ({ x: p.x, y: p.y }))
			.reverse();
		this.rewindValue = { elapsed: 0, path: path.length > 0 ? path : [this.player.tile] };
	}

	private share(ofHero: number): number {
		return (ofHero * heroBase(this.player)) / this.ghosts.baseSpeed;
	}

	private recordTrail(): void {
		const tile = this.player.tile;
		const last = this.trail[this.trail.length - 1];
		if (!last || last.x !== tile.x || last.y !== tile.y) {
			this.trail.push({ x: tile.x, y: tile.y, t: this.clock });
		}
		const since = this.clock - STATION.rewind.back - 1;
		while (this.trail.length > 2 && this.trail[0].t < since) {
			this.trail.shift();
		}
	}

	private stepRewind(dt: number): void {
		const r = this.rewindValue;
		if (!r) {
			return;
		}
		r.elapsed += dt;
		const k = Math.min(1, r.elapsed / STATION.rewind.seconds);
		const index = Math.min(r.path.length - 1, Math.floor(k * (r.path.length - 1) + 1e-6));
		const at = r.path[index];
		const now = this.player.tile;
		if (at && (at.x !== now.x || at.y !== now.y)) {
			this.player.placeAt(at);
		}
		if (k >= 1) {
			this.rewindValue = null;
			this.trail = [];
			this.player.grantInvulnerability(STATION.grace);
		}
	}

	private ghost(kind: GhostKind): GhostModel | undefined {
		return this.ghosts.list.find((g) => g.kind === kind);
	}

	private cocooned(kind: GhostKind): boolean {
		return this.cocoonList.some((c) => c.kind === kind);
	}

	private updateMetamorphosis(dt: number): void {
		this.sinceLast += dt;
		const shares = STATION.metamorphosis.shares;
		const next = METAMORPHOSIS_ORDER[this.started];
		if (next && this.started < shares.length) {
			const due =
				this.progress.collectionRatio >= (shares[this.started] ?? 1) ||
				this.sinceLast >= STATION.metamorphosis.maxGap;
			const ghost = this.ghost(next);
			if (due && ghost && (ghost.state === 'active' || ghost.state === 'frightened')) {
				const tile = ghost.tile;
				this.scare.delete(next);
				ghost.setState('active');
				const total = STATION.metamorphosis.cocoon;
				this.cocoonList.push({ kind: next, x: tile.x, y: tile.y, left: total, total });
				this.started += 1;
				this.sinceLast = 0;
				this.events.emit('audio:cue', { cue: 'power-end' });
			}
		}
		const hero = this.player.position;
		const angle = this.heroAngle();
		for (const c of this.cocoonList) {
			const lit = angle !== null && inBeam(hero, angle, { x: c.x + 0.5, y: c.y + 0.5 }, this.solid);
			c.left -= lit ? dt * (1 - STATION.metamorphosis.beamHold) : dt;
			this.ghosts.freeze(c.kind, Math.max(0.05, c.left));
		}
		const hatched = this.cocoonList.filter((c) => c.left <= 0);
		if (hatched.length > 0) {
			this.cocoonList = this.cocoonList.filter((c) => c.left > 0);
			for (const c of hatched) {
				this.hunterSet.add(c.kind);
			}
			this.updatePaces();
		}
	}

	private updatePaces(): void {
		const hunter = this.share(this.phase === 3 ? STATION.speed.nest : STATION.speed.hunter);
		for (const kind of METAMORPHOSIS_ORDER) {
			this.ghosts.setKindSpeed(
				kind,
				this.hunterSet.has(kind) ? hunter : this.share(STATION.speed.wraith)
			);
		}
	}

	private updateFlares(dt: number): void {
		for (const e of this.energizers) {
			const key = `${e.x},${e.y}`;
			if (!this.burst.has(key) && this.progress.isCollected(e.x, e.y)) {
				this.burst.add(key);
				this.flareList.push({ x: e.x + 0.5, y: e.y + 0.5, left: STATION.flare.seconds });
				for (const g of this.ghosts.list) {
					const p = g.position;
					if (Math.hypot(p.x - e.x - 0.5, p.y - e.y - 0.5) <= STATION.flare.radius) {
						this.frighten(g, STATION.flare.seconds);
					}
				}
			}
		}
		for (const f of this.flareList) {
			f.left -= dt;
		}
		this.flareList = this.flareList.filter((f) => f.left > 0);
	}

	private updateSuperFlare(dt: number, fire: boolean): void {
		if (this.phase === 3 && !this.tokenValue && !this.carriedValue && !this.superUsed) {
			const at = this.locator.findSafeTile(this.started * 7 + 3, [], {
				from: this.player.tile,
				min: STATION.superFlare.awayFromHero
			});
			if (at) {
				this.tokenValue = { x: at.x, y: at.y };
			}
		}
		const tile = this.player.tile;
		if (this.tokenValue && tile.x === this.tokenValue.x && tile.y === this.tokenValue.y) {
			this.tokenValue = null;
			this.carriedValue = true;
			this.events.emit('audio:cue', { cue: 'ability-take' });
		}
		if (fire && this.carriedValue && this.player.facing) {
			this.carriedValue = false;
			this.superUsed = true;
			const tiles = beamTiles(tile, this.player.facing, this.solid, STATION.superFlare.reach);
			this.beamValue = { tiles, left: STATION.superFlare.seconds };
			this.events.emit('audio:cue', { cue: 'ability-use' });
		}
		if (this.beamValue) {
			this.beamValue.left -= dt;
			if (this.beamValue.left <= 0) {
				this.beamValue = null;
			} else {
				const tiles = this.beamValue.tiles;
				for (const g of this.ghosts.list) {
					const t = g.tile;
					if (tiles.some((b) => b.x === t.x && b.y === t.y)) {
						this.frighten(g, 1);
					}
				}
			}
		}
	}

	private heroAngle(): number | null {
		const facing = this.player.facing;
		return facing ? DIRECTION_ANGLE[facing] : null;
	}

	/** The beam makes what it lights flee; a fleeing creature returns to the hunt when it ends. */
	private updateScare(dt: number): void {
		const hero = this.player.position;
		const angle = this.heroAngle();
		for (const g of this.ghosts.list) {
			if (this.cocooned(g.kind)) {
				continue;
			}
			if (angle !== null && (g.state === 'active' || g.state === 'frightened')) {
				if (inBeam(hero, angle, g.position, this.solid)) {
					this.frighten(g, STATION.beam.linger);
				}
			}
			const left = (this.scare.get(g.kind) ?? 0) - dt;
			if (left > 0) {
				this.scare.set(g.kind, left);
			} else if (this.scare.has(g.kind)) {
				this.scare.delete(g.kind);
				if (g.state === 'frightened') {
					g.setState('active');
				}
			}
		}
	}

	private frighten(g: GhostModel, seconds: number): void {
		if (this.cocooned(g.kind) || (g.state !== 'active' && g.state !== 'frightened')) {
			return;
		}
		this.scare.set(g.kind, Math.max(this.scare.get(g.kind) ?? 0, seconds));
		this.startFleeing(g);
	}

	private startFleeing(g: GhostModel): void {
		if (g.state === 'active') {
			g.setState('frightened');
			g.setForceReverse(true);
		}
	}
}
