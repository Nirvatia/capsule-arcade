// The station's escape (DESIGN.md §7a): when the alarm goes, more of them break out (1-4 besides
// the squad) from the containment's door and the vents, enraged. Each runs tile by tile on the
// shortest way: half at the hero, half at a point of his way ahead. They never step on a lit
// breakthrough lane, and one standing on it when it lights is thrown off and stunned. Pure logic.
import type { GhostTile } from '../actors/GhostModel';

export const RUSH_TUNE = {
	/** Seconds between two coming out. */
	every: 0.6,
	/** How far along his way the cutters aim, steps. */
	cut: 6
} as const;

export interface RushWorld {
	/** Where they may run (corridors; not the lair, not walls). */
	walkable(x: number, y: number): boolean;
}

export interface Runner {
	readonly id: number;
	/** The tile it stands on or leaves, and the one it goes to. */
	x: number;
	y: number;
	nx: number;
	ny: number;
	/** 0..1 of the way from (x,y) to (nx,ny). */
	t: number;
	stun: number;
}

const DIRS = [
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1]
] as const;
const key = (x: number, y: number): string => `${x},${y}`;

export class EscapeRush {
	readonly runners: Runner[] = [];
	private queue: Array<{ at: GhostTile; in: number }> = [];
	private nextId = 0;

	constructor(private readonly world: RushWorld) {}

	/** `count` come out of `doors` (in turn), one every RUSH_TUNE.every seconds. */
	start(count: number, doors: readonly GhostTile[]): void {
		this.clear();
		for (let i = 0; i < count; i += 1) {
			this.queue.push({ at: doors[i % doors.length], in: 0.3 + i * RUSH_TUNE.every });
		}
	}

	clear(): void {
		this.runners.length = 0;
		this.queue = [];
	}

	/** Where a runner is, in tiles (centre coordinates). */
	position(r: Runner): { x: number; y: number } {
		return { x: r.x + 0.5 + (r.nx - r.x) * r.t, y: r.y + 0.5 + (r.ny - r.y) * r.t };
	}

	/**
	 * Moves them `speed` tiles a second: even ones at the hero, odd ones at his way `cut` steps
	 * on. `lane` marks tiles none may step on; `soft` tiles they keep off while they have another
	 * way (the lure's closed ground: his way and round him), and cross when they have none, so one
	 * standing in a corridor on his way when it glows goes on and does not stand in his path.
	 */
	update(
		dt: number,
		hero: GhostTile,
		way: readonly GhostTile[],
		speed: number,
		lane: (x: number, y: number) => boolean,
		soft: (x: number, y: number) => boolean = () => false
	): void {
		for (const q of this.queue) q.in -= dt;
		while (this.queue.length && this.queue[0].in <= 0) {
			const { at } = this.queue.shift() as { at: GhostTile; in: number };
			this.runners.push({ id: this.nextId++, x: at.x, y: at.y, nx: at.x, ny: at.y, t: 0, stun: 0 });
		}
		for (const r of this.runners) {
			if (r.stun > 0) {
				r.stun = Math.max(0, r.stun - dt);
				continue;
			}
			let left = speed * dt;
			while (left > 0) {
				if (r.nx === r.x && r.ny === r.y) {
					const goal =
						r.id % 2 === 0 ? hero : (way[Math.min(way.length - 1, RUSH_TUNE.cut)] ?? hero);
					const next =
						this.firstStep({ x: r.x, y: r.y }, goal, (x, y) => lane(x, y) || soft(x, y)) ??
						this.firstStep({ x: r.x, y: r.y }, goal, lane);
					if (!next) break;
					r.nx = next.x;
					r.ny = next.y;
					r.t = 0;
				}
				const need = 1 - r.t;
				if (left < need) {
					r.t += left;
					left = 0;
				} else {
					left -= need;
					r.x = r.nx;
					r.y = r.ny;
					r.t = 0;
				}
			}
		}
	}

	/** The lane lights: whoever stands on it is thrown to the side and stunned. */
	knockOff(lane: (x: number, y: number) => boolean, stun: number): void {
		for (const r of this.runners) {
			const on = lane(r.x, r.y) || lane(r.nx, r.ny);
			if (!on) continue;
			const off = this.offLane({ x: r.x, y: r.y }, lane);
			if (off) {
				r.x = r.nx = off.x;
				r.y = r.ny = off.y;
			} else {
				r.nx = r.x;
				r.ny = r.y;
			}
			r.t = 0;
			r.stun = stun;
		}
	}

	private offLane(from: GhostTile, lane: (x: number, y: number) => boolean): GhostTile | null {
		const seen = new Set<string>([key(from.x, from.y)]);
		let frontier: GhostTile[] = [from];
		for (let d = 0; d < 6 && frontier.length; d += 1) {
			const next: GhostTile[] = [];
			for (const t of frontier) {
				for (const [dx, dy] of DIRS) {
					const x = t.x + dx;
					const y = t.y + dy;
					if (!this.world.walkable(x, y) || seen.has(key(x, y))) continue;
					if (!lane(x, y)) return { x, y };
					seen.add(key(x, y));
					next.push({ x, y });
				}
			}
			frontier = next;
		}
		return null;
	}

	private firstStep(
		from: GhostTile,
		goal: GhostTile,
		lane: (x: number, y: number) => boolean
	): GhostTile | null {
		if (from.x === goal.x && from.y === goal.y) return null;
		const prev = new Map<string, string | null>([[key(from.x, from.y), null]]);
		let frontier: GhostTile[] = [from];
		while (frontier.length) {
			const next: GhostTile[] = [];
			for (const t of frontier) {
				for (const [dx, dy] of DIRS) {
					const x = t.x + dx;
					const y = t.y + dy;
					if (!this.world.walkable(x, y) || lane(x, y) || prev.has(key(x, y))) continue;
					prev.set(key(x, y), key(t.x, t.y));
					if (x === goal.x && y === goal.y) {
						let at = key(x, y);
						while (prev.get(at) !== key(from.x, from.y)) at = prev.get(at) as string;
						const [sx, sy] = at.split(',').map(Number);
						return { x: sx, y: sy };
					}
					next.push({ x, y });
				}
			}
			frontier = next;
		}
		return null;
	}
}
