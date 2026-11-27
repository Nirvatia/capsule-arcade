// The night forest's rules (`DESIGN.md` §7b, "light against the dark"): the level plays by the
// classic rules of Pac-Man (the dots, the energizers, the ghosts' ways, the lives) with one more
// layer on top. The ghosts are the Taken: each stands under a shroud of the Dark Presence (`shield`)
// that makes it harmless to nobody but unkillable only in one sense: it cannot be hurt while
// shrouded, because light is what strips the shroud. In a lamp's pool, in the hero's torch, in a
// flare's glare the shroud burns away; a bare Taken is stunned (it flees, edible) for a few seconds
// and, eaten, is banished: the Presence in the lair loses a fifth of its power. At nothing left the
// Presence falls, the dawn comes (the reward, as at the hell's boss). The Presence fights back by
// putting out the lamps one by one; a lamp is lit again by walking over it. The torch has a battery
// that the dots (fireflies) refill; the fire key is a flash that strips every shroud close by.
//
// Pure rules over small ports, so the whole level tests without a session.
import type { GridMatrix } from '../../config/gridConfig';
import type { GhostKind, GhostState } from '../actors/GhostModel';
import { sees } from './lightRays';
import type { Solid } from './lightRays';
import { clearingOf, forestKind, placeLamps } from './nightwoodLamps';
import type { LampSpec } from './nightwoodLamps';

export const NIGHT_TUNE = {
	/** The Presence's power, and what one banished Taken takes off it. */
	presence: 100,
	banish: 20,
	/** Seconds of full light that strip a shroud; the shroud regrows in the dark at this rate per s. */
	burnTime: 1,
	regrow: 0.25,
	/** A shroud below this is gone: the Taken is bare and stunned for `stun` seconds. */
	bare: 0.06,
	stun: 4.5,
	/** The shroud that is left when a stun ends. */
	afterStun: 0.4,
	torch: {
		range: 7.5,
		spread: 0.5,
		halo: 1.7,
		/** The halo round the hero when the battery is dead. */
		haloDead: 1.1,
		drain: 0.04,
		perDot: 0.03,
		perFlare: 0.3,
		flashCost: 0.35
	},
	flash: { radius: 3.6, time: 0.6 },
	lamp: { out: [16, 9] as readonly [number, number], tell: 2, maxOut: 3, relight: 0.8 },
	flare: { life: 8, radius: 4.5 }
} as const;

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
const HEADING: Record<Direction, number> = {
	RIGHT: 0,
	DOWN: Math.PI / 2,
	LEFT: Math.PI,
	UP: -Math.PI / 2
};

export interface RunPlayer {
	readonly position: { readonly x: number; readonly y: number };
	readonly facing: Direction | null;
}
export interface RunGhost {
	readonly kind: GhostKind;
	readonly state: GhostState;
	readonly position: { readonly x: number; readonly y: number };
}
export interface RunGhosts {
	readonly list: readonly RunGhost[];
	setGhostState(kind: GhostKind, state: GhostState): void;
	banish(): void;
}
export interface RunProgress {
	readonly collectedDots: number;
	readonly remainingDots: number;
	isCollected(x: number, y: number): boolean;
	resetDots(): void;
}
/** What the rules want the sound to say; the session maps them to its cues. */
export type NightSound = 'lamp-out' | 'lamp-lit' | 'flash' | 'banish' | 'dawn' | 'flare';

export interface RunLamp extends LampSpec {
	on: boolean;
	/** Seconds of flicker left before it goes out, 0 when none. */
	tell: number;
	/** The relight's hold, s. */
	held: number;
}
export interface RunFlare {
	readonly x: number;
	readonly y: number;
	left: number;
}

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const angDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/** A small seeded generator: the Presence's choices repeat for a seed. */
function seeded(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export class NightwoodRun {
	readonly lamps: RunLamp[];
	readonly flares: RunFlare[] = [];
	/** The tile of the lair's clearing, where the Presence stands. */
	readonly clearing: { x: number; y: number };
	/** The torch's battery, 0..1; the dots fill it. */
	battery = 1;
	/** The Presence's power left. */
	presence: number = NIGHT_TUNE.presence;
	/** The flash's glare left, s (0 when none). */
	flash = 0;
	/** Where the torch points, radians. */
	heading = Math.PI;
	/** Set when the Presence has fallen: the dawn. */
	defeated = false;
	/** Tells the sound what happened. */
	sound: ((sound: NightSound) => void) | null = null;
	/** Whether an energizer's power is on (the classic fright): the shrouds are off while it lasts. */
	powered: () => boolean = () => false;

	private readonly shieldOf = new Map<GhostKind, number>();
	private readonly stunOf = new Map<GhostKind, number>();
	private readonly lastState = new Map<GhostKind, GhostState>();
	private readonly energizers: Array<{ x: number; y: number }> = [];
	private readonly flared = new Set<string>();
	private readonly solid: Solid;
	private readonly seed: number;
	private random: () => number;
	private outClock = 0;
	private collected = 0;
	private wasPowered = false;
	/** The Taken banished since the start (the HUD and the tests). */
	banished = 0;

	constructor(
		matrix: GridMatrix,
		private readonly ghosts: RunGhosts,
		private readonly player: RunPlayer,
		private readonly progress: RunProgress,
		seed = 1
	) {
		this.seed = seed;
		this.random = seeded(seed);
		this.clearing = clearingOf(matrix);
		this.lamps = placeLamps(matrix).map((l) => ({ ...l, on: true, tell: 0, held: 0 }));
		matrix.forEach((row, y) =>
			row.forEach((token, x) => {
				if (token === 'EU') {
					this.energizers.push({ x, y });
				}
			})
		);
		this.solid = (x, y) => {
			const kind = forestKind(matrix[y]?.[x]);
			return kind === 'wall' || kind === 'void' || kind === 'lair';
		};
		this.reset();
	}

	/** Whether light stops at the tile (the painter casts the same rays). */
	get blocks(): Solid {
		return this.solid;
	}

	reset(): void {
		this.battery = 1;
		this.presence = NIGHT_TUNE.presence;
		this.flash = 0;
		this.defeated = false;
		this.banished = 0;
		this.flares.length = 0;
		this.flared.clear();
		this.shieldOf.clear();
		this.stunOf.clear();
		this.lastState.clear();
		this.wasPowered = false;
		this.random = seeded(this.seed);
		this.outClock = this.nextOut();
		this.collected = this.progress.collectedDots;
		for (const l of this.lamps) {
			l.on = true;
			l.tell = 0;
			l.held = 0;
		}
	}

	/** After a death the Presence stays as it was, but the Taken are whole again. */
	onDeath(): void {
		this.shieldOf.clear();
		this.stunOf.clear();
		this.lastState.clear();
		this.flash = 0;
		this.flares.length = 0;
	}

	/** The Presence's strength as a fraction, 1 whole to 0 fallen. */
	get presenceRatio(): number {
		return clamp(this.presence / NIGHT_TUNE.presence);
	}

	/** The shroud of a Taken: 1 whole, 0 burnt away. */
	shield(kind: GhostKind): number {
		return this.shieldOf.get(kind) ?? 1;
	}

	/** Seconds the Taken stays bare and stunned. */
	stun(kind: GhostKind): number {
		return this.stunOf.get(kind) ?? 0;
	}

	/** How lit a point of the maze is, 0..1: the lamps, the flares, the torch, the hero's halo. */
	lightAt(x: number, y: number): number {
		let best = 0;
		for (const l of this.lamps) {
			if (!l.on) {
				continue;
			}
			const d = Math.hypot(x - l.x, y - l.y);
			const r = l.r * 0.85;
			if (d < r && sees(this.solid, l.x, l.y, x, y)) {
				best = Math.max(best, 1 - d / r);
			}
		}
		for (const f of this.flares) {
			const d = Math.hypot(x - (f.x + 0.5), y - (f.y + 0.5));
			if (d < NIGHT_TUNE.flare.radius && sees(this.solid, f.x + 0.5, f.y + 0.5, x, y)) {
				best = Math.max(best, clamp(1.2 * (1 - d / NIGHT_TUNE.flare.radius)));
			}
		}
		const p = this.player.position;
		const d = Math.hypot(x - p.x, y - p.y);
		const T = NIGHT_TUNE.torch;
		if (this.battery > 0 && d < T.range) {
			const a = Math.atan2(y - p.y, x - p.x);
			if (Math.abs(angDiff(a, this.heading)) < T.spread && sees(this.solid, p.x, p.y, x, y)) {
				best = Math.max(best, 1 - 0.7 * (d / T.range));
			}
		}
		const halo = this.battery > 0 ? T.halo : T.haloDead;
		if (d < halo && sees(this.solid, p.x, p.y, x, y)) {
			best = Math.max(best, 1 - d / halo);
		}
		return best;
	}

	update(dt: number, fire = false): void {
		if (!Number.isFinite(dt) || dt <= 0) {
			return;
		}
		if (this.player.facing) {
			this.heading = HEADING[this.player.facing];
		}
		if (this.defeated) {
			this.flash = Math.max(0, this.flash - dt);
			for (const l of this.lamps) {
				l.on = true;
				l.tell = 0;
			}
			return;
		}
		this.feed(dt);
		if (fire) {
			this.flashBurst();
		}
		this.flash = Math.max(0, this.flash - dt);
		this.tendLamps(dt);
		this.tendTaken(dt);
		if (this.progress.remainingDots <= 0) {
			// the forest glows again: the fireflies and the flares come back
			this.progress.resetDots();
			this.collected = this.progress.collectedDots;
			this.flared.clear();
		}
		if (this.presence <= 0) {
			this.defeated = true;
			this.ghosts.banish();
			this.sound?.('dawn');
		}
	}

	// -------------------------------------------------------------------------------- the pieces

	/** The battery drains and the dots refill it; a flare is lit where an energizer was taken. */
	private feed(dt: number): void {
		const T = NIGHT_TUNE.torch;
		this.battery = clamp(this.battery - T.drain * dt);
		const got = this.progress.collectedDots - this.collected;
		this.collected = this.progress.collectedDots;
		if (got > 0) {
			this.battery = clamp(this.battery + got * T.perDot);
		}
		for (const e of this.energizers) {
			const key = `${e.x},${e.y}`;
			const taken = this.progress.isCollected(e.x, e.y);
			if (taken && !this.flared.has(key)) {
				this.flared.add(key);
				this.flares.push({ x: e.x, y: e.y, left: NIGHT_TUNE.flare.life });
				this.battery = clamp(this.battery + T.perFlare);
				this.sound?.('flare');
			} else if (!taken) {
				this.flared.delete(key);
			}
		}
		for (let i = this.flares.length - 1; i >= 0; i -= 1) {
			this.flares[i].left -= dt;
			if (this.flares[i].left <= 0) {
				this.flares.splice(i, 1);
			}
		}
	}

	/** The fire key: a flash that strips every shroud within reach of the hero's eyes. */
	private flashBurst(): void {
		const T = NIGHT_TUNE;
		if (this.battery < T.torch.flashCost || this.flash > 0) {
			return;
		}
		this.battery = clamp(this.battery - T.torch.flashCost);
		this.flash = T.flash.time;
		this.sound?.('flash');
		const p = this.player.position;
		for (const g of this.ghosts.list) {
			if (g.state !== 'active') {
				continue;
			}
			const at = g.position;
			if (
				Math.hypot(at.x - p.x, at.y - p.y) <= T.flash.radius &&
				sees(this.solid, p.x, p.y, at.x, at.y)
			) {
				this.shieldOf.set(g.kind, 0);
			}
		}
	}

	private nextOut(): number {
		const [slow, fast] = NIGHT_TUNE.lamp.out;
		return slow + (fast - slow) * (1 - this.presenceRatio) + this.random() * 3;
	}

	/** The Presence puts the lamps out, one by one, after a flicker; the hero lights them again. */
	private tendLamps(dt: number): void {
		const L = NIGHT_TUNE.lamp;
		this.outClock -= dt;
		if (this.outClock <= 0) {
			this.outClock = this.nextOut();
			const out = this.lamps.filter((l) => !l.on || l.tell > 0).length;
			const lit = this.lamps.filter((l) => l.on && l.tell <= 0);
			if (out < L.maxOut && lit.length > 0) {
				lit[Math.floor(this.random() * lit.length) % lit.length].tell = L.tell;
			}
		}
		const p = this.player.position;
		for (const l of this.lamps) {
			if (l.tell > 0) {
				l.tell -= dt;
				if (l.tell <= 0) {
					l.tell = 0;
					l.on = false;
					l.held = 0;
					this.sound?.('lamp-out');
				}
			} else if (!l.on) {
				if (Math.hypot(p.x - l.x, p.y - l.y) <= 0.8) {
					l.held += dt;
					if (l.held >= L.relight) {
						l.on = true;
						l.held = 0;
						this.sound?.('lamp-lit');
					}
				} else {
					l.held = 0;
				}
			}
		}
	}

	/** The shrouds burn in the light and regrow in the dark; a bare Taken is stunned; one eaten is banished. */
	private tendTaken(dt: number): void {
		const T = NIGHT_TUNE;
		const powered = this.powered();
		if (this.wasPowered && !powered) {
			// the glare is over: the shrouds come back a little at a time
			for (const g of this.ghosts.list) {
				this.shieldOf.set(g.kind, T.afterStun);
			}
		}
		this.wasPowered = powered;
		for (const g of this.ghosts.list) {
			const was = this.lastState.get(g.kind);
			this.lastState.set(g.kind, g.state);
			if (was === 'frightened' && g.state === 'eyes') {
				this.banished += 1;
				this.presence = Math.max(0, this.presence - T.banish);
				this.shieldOf.set(g.kind, 1);
				this.stunOf.set(g.kind, 0);
				this.sound?.('banish');
				continue;
			}
			let shield = this.shieldOf.get(g.kind) ?? 1;
			if (g.state === 'lair' || g.state === 'exiting' || g.state === 'eyes') {
				this.shieldOf.set(g.kind, 1);
				this.stunOf.set(g.kind, 0);
				continue;
			}
			if (powered) {
				// the energizer's glare: the shrouds are off while its power lasts
				this.shieldOf.set(g.kind, 0);
				this.stunOf.set(g.kind, 0);
				continue;
			}
			let stun = this.stunOf.get(g.kind) ?? 0;
			if (g.state === 'frightened' && stun > 0) {
				stun -= dt;
				if (stun <= 0) {
					stun = 0;
					this.ghosts.setGhostState(g.kind, 'active');
					shield = T.afterStun;
				}
			} else if (g.state === 'active') {
				const light = this.lightAt(g.position.x, g.position.y);
				if (light > 0.2) {
					shield = Math.max(0, shield - ((0.3 + light) / T.burnTime) * dt);
				} else {
					shield = Math.min(1, shield + T.regrow * dt);
				}
				if (shield <= T.bare) {
					shield = 0;
					stun = T.stun;
					this.ghosts.setGhostState(g.kind, 'frightened');
				}
			}
			this.shieldOf.set(g.kind, shield);
			this.stunOf.set(g.kind, stun);
		}
	}
}
