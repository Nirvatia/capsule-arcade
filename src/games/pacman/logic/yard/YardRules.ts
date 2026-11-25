// The demolition yard's rules (DESIGN.md §13, a prototype world): crates, bombs, blasts and the
// pickups the crates hold. Pure and tile based: the hero, the ghosts and the food stay with the
// game's own services; they ask `blocks` where they may walk and `burning` whether a tile kills.
import { seededRandom } from '../../render/common/random';

export const YARD_TUNE = {
	/** Seconds from a bomb laid to its blast. */
	fuse: 2.2,
	/** Seconds a blast's fire stays deadly. */
	burn: 0.5,
	/** Seconds a blast lives (its smoke, for the renderer). */
	life: 0.95,
	bombs: 1,
	range: 2,
	maxBombs: 3,
	maxRange: 5,
	/** A broken crate's chance to hold a pickup. */
	pickup: 0.3
} as const;

export type YardPickup = 'bomb' | 'flame';

export interface YardMaze {
	readonly width: number;
	readonly height: number;
	/** Where fire runs and things lie: corridors (not walls, not the lair, not outside). */
	open(x: number, y: number): boolean;
}

export interface YardBomb {
	readonly x: number;
	readonly y: number;
	/** Seconds left. */
	fuse: number;
	readonly range: number;
}

export interface YardArm {
	readonly dx: number;
	readonly dy: number;
	/** Tiles the fire runs from the bomb's tile. */
	readonly len: number;
	/** Stopped by a wall (else by its range or a crate). */
	readonly wall: boolean;
	/** It broke a crate at its end. */
	readonly crate: boolean;
}

export interface YardBlast {
	readonly x: number;
	readonly y: number;
	readonly arms: readonly YardArm[];
	/** Seconds since it went off. */
	age: number;
	/** Every tile its fire covers. */
	readonly cells: ReadonlySet<string>;
	/** Ghosts it caught, for the 200..1600 chain. */
	caught: number;
}

export interface YardBreak {
	readonly x: number;
	readonly y: number;
	/** The blast's centre that broke it (the planks fly away from it). */
	readonly fromX: number;
	readonly fromY: number;
}

const key = (x: number, y: number): string => `${x},${y}`;

const DIRS = [
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1]
] as const;

export class YardRules {
	readonly crates = new Set<string>();
	readonly bombs: YardBomb[] = [];
	readonly blasts: YardBlast[] = [];
	readonly pickups = new Map<string, YardPickup>();
	maxBombs: number = YARD_TUNE.bombs;
	range: number = YARD_TUNE.range;
	private readonly random: () => number;

	constructor(
		private readonly maze: YardMaze,
		crates: Iterable<readonly [number, number]>,
		seed = 1
	) {
		for (const [x, y] of crates) this.crates.add(key(x, y));
		// Park-Miller's first draws follow a small seed closely: scramble it, then warm up
		this.random = seededRandom((Math.imul(seed | 0, 0x9e3779b1) >>> 1) + 1);
		this.random();
		this.random();
	}

	/** A crate or a bomb stands there: nobody walks in (the hero may walk off his own bomb). */
	blocks(x: number, y: number): boolean {
		return this.crates.has(key(x, y)) || this.bombs.some((b) => b.x === x && b.y === y);
	}

	bombAt(x: number, y: number): YardBomb | undefined {
		return this.bombs.find((b) => b.x === x && b.y === y);
	}

	/** The fire still burns on the tile: the blast that holds it, if any. */
	burning(x: number, y: number): YardBlast | undefined {
		const k = key(x, y);
		return this.blasts.find((b) => b.age < YARD_TUNE.burn && b.cells.has(k));
	}

	/** Lays a bomb on the tile; false when he has none left or something lies there. */
	place(x: number, y: number): boolean {
		if (this.bombs.length >= this.maxBombs || !this.maze.open(x, y) || this.blocks(x, y)) {
			return false;
		}
		this.bombs.push({ x, y, fuse: YARD_TUNE.fuse, range: this.range });
		return true;
	}

	/** The hero steps on a tile: the pickup there, taken. */
	take(x: number, y: number): YardPickup | null {
		const k = key(x, y);
		const item = this.pickups.get(k) ?? null;
		if (!item) return null;
		this.pickups.delete(k);
		if (item === 'bomb') this.maxBombs = Math.min(YARD_TUNE.maxBombs, this.maxBombs + 1);
		else this.range = Math.min(YARD_TUNE.maxRange, this.range + 1);
		return item;
	}

	/** Burns the fuses and ages the fire; returns the crates broken this step. */
	update(dt: number): YardBreak[] {
		const broken: YardBreak[] = [];
		for (const blast of this.blasts) blast.age += dt;
		for (let i = this.blasts.length - 1; i >= 0; i -= 1) {
			if (this.blasts[i].age >= YARD_TUNE.life) this.blasts.splice(i, 1);
		}
		for (const bomb of this.bombs) bomb.fuse -= dt;
		// a blast that reaches a bomb sets it off at once: chains in one step
		for (;;) {
			const bomb = this.bombs.find((b) => b.fuse <= 0);
			if (!bomb) break;
			this.bombs.splice(this.bombs.indexOf(bomb), 1);
			this.explode(bomb, broken);
		}
		return broken;
	}

	/** Clears the bombs and the fire (a new life); the crates and pickups stay. */
	clearFire(): void {
		this.bombs.length = 0;
		this.blasts.length = 0;
	}

	private explode(bomb: YardBomb, broken: YardBreak[]): void {
		const cells = new Set<string>([key(bomb.x, bomb.y)]);
		const arms: YardArm[] = [];
		const hits: string[] = [];
		for (const [dx, dy] of DIRS) {
			let len = 0;
			let wall = false;
			let crate = false;
			for (let i = 1; i <= bomb.range; i += 1) {
				const x = bomb.x + dx * i;
				const y = bomb.y + dy * i;
				if (!this.maze.open(x, y)) {
					wall = true;
					break;
				}
				len = i;
				cells.add(key(x, y));
				const other = this.bombAt(x, y);
				if (other) other.fuse = 0;
				if (this.crates.has(key(x, y))) {
					crate = true;
					hits.push(key(x, y));
					break;
				}
			}
			arms.push({ dx, dy, len, wall, crate });
		}
		for (const k of hits) {
			this.crates.delete(k);
			const [x, y] = k.split(',').map(Number);
			broken.push({ x, y, fromX: bomb.x, fromY: bomb.y });
			if (this.random() < YARD_TUNE.pickup) {
				this.pickups.set(k, this.random() < 0.5 ? 'bomb' : 'flame');
			}
		}
		this.blasts.push({ x: bomb.x, y: bomb.y, arms, age: 0, cells, caught: 0 });
	}
}
