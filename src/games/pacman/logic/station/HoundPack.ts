// The station's hounds (DESIGN.md §7a, the mini-swarm the owner picked over the fluid swarm): a
// pack of bright, seeker-like creatures that hunt the hero through the corridors. They choose
// their way tile by tile like the ghosts, but move like animals: they creep with pauses and sniff
// at junctions, freeze for a breath when they see the hero down a straight corridor and then
// dash, tire after it, round the corners instead of snapping, keep off each other's tiles so a
// pack spreads to cut the ways, and flee from fire. A bite costs the hero health.
import type { SwarmLight, SwarmMaze, SwarmPoint } from './SwarmField';

export type HoundMode = 'stalk' | 'sniff' | 'windup' | 'lunge' | 'recover' | 'flee';

/** How a hound picks its target: straight at the hero, ahead of him, or round to his side. */
export type HoundRole = 'chaser' | 'ambusher' | 'flanker';

export interface HoundTuning {
	/** The hero's speed, tiles per second; the hounds' speeds are shares of it. */
	readonly heroSpeed: number;
	readonly stalk: number;
	readonly lunge: number;
	readonly flee: number;
	readonly recover: number;
	/** How far down a straight corridor a hound sees the hero (tiles). */
	readonly sight: number;
	/** Seconds a hound holds still, seen and seeing, before it dashes. */
	readonly windup: number;
	/** Seconds a dash lasts, and the slow walk after it. */
	readonly dash: number;
	readonly tired: number;
	/** The chance a hound stops to sniff at a junction, and how long (seconds). */
	readonly sniffChance: number;
	readonly sniff: readonly [number, number];
	/** How close a hound must be to bite (tiles). */
	readonly bite: number;
	/** Seconds a hound keeps fleeing once out of the light. */
	readonly afterLight: number;
}

export interface Hound {
	readonly id: number;
	readonly role: HoundRole;
	/** Position, tile coordinates (centres at .5). */
	readonly x: number;
	readonly y: number;
	/** Where it faces, radians, smoothed (the body turns, it does not snap). */
	readonly heading: number;
	readonly mode: HoundMode;
	/** Tiles per second it moves now. */
	readonly speed: number;
	/** 0..1 through the breath before a dash (the body rises, the eye burns). */
	readonly windup: number;
}

interface MutableHound {
	id: number;
	role: HoundRole;
	x: number;
	y: number;
	heading: number;
	mode: HoundMode;
	speed: number;
	windup: number;
	from: SwarmPoint;
	to: SwarmPoint;
	timer: number;
	offset: SwarmPoint;
}

const DIRS: ReadonlyArray<SwarmPoint> = [
	{ x: 1, y: 0 },
	{ x: -1, y: 0 },
	{ x: 0, y: 1 },
	{ x: 0, y: -1 }
];

function rng(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function angleTo(a: number, b: number, k: number): number {
	let d = b - a;
	while (d > Math.PI) d -= Math.PI * 2;
	while (d < -Math.PI) d += Math.PI * 2;
	return a + d * k;
}

export class HoundPack {
	private readonly maze: SwarmMaze;
	private readonly random: () => number;
	private hounds: MutableHound[] = [];
	private nextId = 1;

	constructor(maze: SwarmMaze, seed = 1) {
		this.maze = maze;
		this.random = rng(seed);
	}

	get list(): readonly Hound[] {
		return this.hounds;
	}

	clear(): void {
		this.hounds = [];
	}

	/** A new hound on tile `at` (the nest, a vent), with the next role in turn unless given. */
	spawn(at: SwarmPoint, role?: HoundRole): Hound {
		const roles: HoundRole[] = ['chaser', 'ambusher', 'flanker'];
		const id = this.nextId++;
		const h: MutableHound = {
			id,
			role: role ?? roles[(id - 1) % roles.length],
			x: at.x + 0.5,
			y: at.y + 0.5,
			heading: this.random() * Math.PI * 2,
			mode: 'stalk',
			speed: 0,
			windup: 0,
			from: { x: at.x, y: at.y },
			to: { x: at.x, y: at.y },
			timer: 0,
			offset: { x: Math.round((this.random() - 0.5) * 6), y: Math.round((this.random() - 0.5) * 6) }
		};
		this.hounds.push(h);
		return h;
	}

	/**
	 * Moves the pack on by `dt` toward the hero (tile coordinates) and away from every light.
	 * Returns the hounds that bit him this step (each then flees for a while).
	 */
	update(
		dt: number,
		hero: SwarmPoint & { readonly facing: SwarmPoint | null },
		lights: readonly SwarmLight[],
		tuning: HoundTuning
	): Hound[] {
		const bites: Hound[] = [];
		if (!(dt > 0)) {
			return bites;
		}
		const heroTile = { x: Math.floor(hero.x), y: Math.floor(hero.y) };
		for (const h of this.hounds) {
			this.think(h, dt, hero, heroTile, lights, tuning);
			this.move(h, dt, heroTile, hero, lights, tuning);
			if (h.mode !== 'flee' && Math.hypot(h.x - hero.x, h.y - hero.y) < tuning.bite) {
				bites.push(h);
				h.mode = 'flee';
				h.timer = tuning.afterLight * 2;
				h.windup = 0;
			}
		}
		return bites;
	}

	private lit(
		x: number,
		y: number,
		lights: readonly SwarmLight[],
		margin: number
	): SwarmLight | null {
		for (const l of lights) {
			if (Math.hypot(l.x - x, l.y - y) < l.r + margin) {
				return l;
			}
		}
		return null;
	}

	private seesHero(h: MutableHound, heroTile: SwarmPoint, sight: number): boolean {
		const hx = Math.floor(h.x);
		const hy = Math.floor(h.y);
		if (hx !== heroTile.x && hy !== heroTile.y) {
			return false;
		}
		const d = Math.abs(hx - heroTile.x) + Math.abs(hy - heroTile.y);
		if (d > sight) {
			return false;
		}
		const sx = Math.sign(heroTile.x - hx);
		const sy = Math.sign(heroTile.y - hy);
		for (let i = 1; i < d; i += 1) {
			if (!this.maze.walkable(hx + sx * i, hy + sy * i)) {
				return false;
			}
		}
		return true;
	}

	/** The hound's state: fire beats everything, then the dash, the breath, the sniffing. */
	private think(
		h: MutableHound,
		dt: number,
		hero: SwarmPoint,
		heroTile: SwarmPoint,
		lights: readonly SwarmLight[],
		t: HoundTuning
	): void {
		h.timer -= dt;
		const fire = this.lit(h.x, h.y, lights, 0.4);
		if (fire) {
			if (h.mode !== 'flee') {
				// startled: it shies back the way it came at once, not after the next tile
				h.windup = 0;
				h.speed *= 0.3;
				const toward = Math.hypot(h.to.x + 0.5 - fire.x, h.to.y + 0.5 - fire.y);
				const away = Math.hypot(h.from.x + 0.5 - fire.x, h.from.y + 0.5 - fire.y);
				if (toward < away) {
					const back = h.from;
					h.from = h.to;
					h.to = back;
				}
			}
			h.mode = 'flee';
			h.timer = t.afterLight;
			return;
		}
		switch (h.mode) {
			case 'flee':
				if (h.timer <= 0) {
					h.mode = 'recover';
					h.timer = t.tired * 0.5;
				}
				break;
			case 'windup':
				h.windup = Math.min(1, h.windup + dt / t.windup);
				h.heading = angleTo(
					h.heading,
					Math.atan2(hero.y - h.y, hero.x - h.x),
					Math.min(1, dt * 12)
				);
				if (h.windup >= 1) {
					h.mode = 'lunge';
					h.timer = t.dash;
					h.windup = 0;
				}
				break;
			case 'lunge':
				if (h.timer <= 0) {
					h.mode = 'recover';
					h.timer = t.tired;
				}
				break;
			case 'recover':
			case 'sniff':
				if (h.timer <= 0) h.mode = 'stalk';
				break;
			default:
				if (this.seesHero(h, heroTile, t.sight)) {
					h.mode = 'windup';
					h.windup = 0;
				}
		}
	}

	private wantedSpeed(h: MutableHound, t: HoundTuning): number {
		switch (h.mode) {
			case 'lunge':
				return t.lunge * t.heroSpeed;
			case 'flee':
				return t.flee * t.heroSpeed;
			case 'recover':
				return t.recover * t.heroSpeed;
			case 'windup':
			case 'sniff':
				return 0;
			default:
				return t.stalk * t.heroSpeed;
		}
	}

	private move(
		h: MutableHound,
		dt: number,
		heroTile: SwarmPoint,
		hero: SwarmPoint & { readonly facing: SwarmPoint | null },
		lights: readonly SwarmLight[],
		t: HoundTuning
	): void {
		// speed eases in and out: a dash builds up, a stop is a stop of something heavy
		const want = this.wantedSpeed(h, t);
		const ease = want > h.speed ? (h.mode === 'lunge' ? 9 : 4) : 10;
		h.speed += (want - h.speed) * Math.min(1, dt * ease);
		let left = h.speed * dt;
		let guard = 0;
		while (left > 1e-6 && guard < 8) {
			guard += 1;
			const tx = h.to.x + 0.5;
			const ty = h.to.y + 0.5;
			const dx = tx - h.x;
			const dy = ty - h.y;
			const d = Math.hypot(dx, dy);
			if (d < 1e-4) {
				this.arrive(h, heroTile, hero, lights, t);
				if (h.to.x === h.from.x && h.to.y === h.from.y) {
					break;
				}
				continue;
			}
			const step = Math.min(left, d);
			h.x += (dx / d) * step;
			h.y += (dy / d) * step;
			left -= step;
			if (h.mode !== 'windup') {
				h.heading = angleTo(h.heading, Math.atan2(dy, dx), Math.min(1, dt * 10));
			}
		}
		if (h.speed < 0.05 && h.mode === 'sniff') {
			// sniffing: the head sweeps
			h.heading += Math.sin(h.timer * 9 + h.id) * dt * 2;
		}
	}

	/** On a tile's centre: through a vent, then the next tile to go to. */
	private arrive(
		h: MutableHound,
		heroTile: SwarmPoint,
		hero: SwarmPoint & { readonly facing: SwarmPoint | null },
		lights: readonly SwarmLight[],
		t: HoundTuning
	): void {
		const came = h.from;
		h.from = { x: h.to.x, y: h.to.y };
		const far = this.maze.teleport(h.from.x, h.from.y);
		if (
			far &&
			(came.x !== far.x || came.y !== far.y) &&
			Math.abs(came.x - h.from.x) + Math.abs(came.y - h.from.y) <= 1
		) {
			h.x = far.x + 0.5;
			h.y = far.y + 0.5;
			h.from = { x: far.x, y: far.y };
		}
		const exits = DIRS.map((d) => ({ x: h.from.x + d.x, y: h.from.y + d.y })).filter((p) =>
			this.maze.walkable(p.x, p.y)
		);
		if (exits.length === 0) {
			h.to = h.from;
			return;
		}
		// a junction: sometimes it stops to sniff (never while dashing or fleeing)
		if (exits.length >= 3 && h.mode === 'stalk' && this.random() < t.sniffChance) {
			h.mode = 'sniff';
			h.timer = t.sniff[0] + this.random() * (t.sniff[1] - t.sniff[0]);
		}
		const back = exits.filter((p) => p.x !== came.x || p.y !== came.y);
		const options = h.mode === 'flee' || back.length === 0 ? exits : back;
		let best = options[0];
		if (h.mode === 'flee') {
			const fire = this.lit(h.x, h.y, lights, 3) ?? { x: hero.x, y: hero.y, r: 0 };
			let far2 = -Infinity;
			for (const p of options) {
				const d = Math.hypot(p.x + 0.5 - fire.x, p.y + 0.5 - fire.y);
				if (d > far2) {
					far2 = d;
					best = p;
				}
			}
		} else {
			const dist = this.distances(this.target(h, heroTile, hero));
			let low = Infinity;
			for (const p of options) {
				const taken = this.hounds.some(
					(o) =>
						o !== h &&
						((o.to.x === p.x && o.to.y === p.y) || (o.from.x === p.x && o.from.y === p.y))
				);
				const lit = this.lit(p.x + 0.5, p.y + 0.5, lights, 0.2) ? 12 : 0;
				const d =
					(dist.get(p.y * this.maze.width + p.x) ?? 99) +
					(taken ? 3 : 0) +
					lit +
					this.random() * 0.4;
				if (d < low) {
					low = d;
					best = p;
				}
			}
		}
		h.to = best;
	}

	/** Where the hound heads: the hero, the tile ahead of him, or one round his side. */
	private target(
		h: MutableHound,
		heroTile: SwarmPoint,
		hero: { readonly facing: SwarmPoint | null }
	): SwarmPoint {
		if (h.mode === 'lunge' || h.role === 'chaser') {
			return heroTile;
		}
		const f = hero.facing ?? { x: 0, y: 0 };
		const want =
			h.role === 'ambusher'
				? { x: heroTile.x + f.x * 4, y: heroTile.y + f.y * 4 }
				: { x: heroTile.x + h.offset.x, y: heroTile.y + h.offset.y };
		return this.maze.walkable(want.x, want.y) ? want : heroTile;
	}

	/** Steps by path from `to` over the corridors (tunnels count). */
	private distances(to: SwarmPoint): Map<number, number> {
		const w = this.maze.width;
		const dist = new Map<number, number>([[to.y * w + to.x, 0]]);
		const queue = [to];
		for (let q = 0; q < queue.length; q += 1) {
			const a = queue[q];
			const da = dist.get(a.y * w + a.x) ?? 0;
			const next = DIRS.map((d) => ({ x: a.x + d.x, y: a.y + d.y }));
			const far = this.maze.teleport(a.x, a.y);
			if (far) next.push(far);
			for (const b of next) {
				const k = b.y * w + b.x;
				if (!dist.has(k) && this.maze.walkable(b.x, b.y)) {
					dist.set(k, da + 1);
					queue.push(b);
				}
			}
		}
		return dist;
	}
}
