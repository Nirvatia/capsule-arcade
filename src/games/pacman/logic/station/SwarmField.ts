// The station's swarm as the rules see it (DESIGN.md §7a): a density over the corridor tiles
// that pours out of its sources (the nest, open vents), spreads along the corridors, flows toward
// the hero, cannot enter light and is pushed out of it. The renderer draws it as living bugs.

export interface SwarmPoint {
	readonly x: number;
	readonly y: number;
}

/** A light the swarm will not enter: tile coordinates of its centre and its radius in tiles. */
export interface SwarmLight {
	readonly x: number;
	readonly y: number;
	readonly r: number;
}

/** The maze as the swarm walks it. */
export interface SwarmMaze {
	readonly width: number;
	readonly height: number;
	walkable(x: number, y: number): boolean;
	/** The other end of a tunnel or a vent, or null. */
	teleport(x: number, y: number): SwarmPoint | null;
}

export interface SwarmTuning {
	/** Density per second the sources pour out (shared among them). */
	readonly output: number;
	/** Share of a density difference levelled out per second between neighbours. */
	readonly spread: number;
	/** Share of a tile's density that moves one tile toward the hero per second. */
	readonly pull: number;
	/** Share of a lit tile's density pushed out of the light per second. */
	readonly push: number;
	/** Most density the whole station holds (the sources stop at it). */
	readonly maxMass: number;
}

/** The most density one tile holds (a corridor packed solid). */
export const SWARM_PACKED = 3;
const SUBSTEP = 1 / 30;
const LIT = 0.25;

export class SwarmField {
	private readonly maze: SwarmMaze;
	private readonly n: number;
	private readonly links: Int32Array[];
	private density: Float32Array;
	private next: Float32Array;
	/** The flow last step (tiles per second, x and y), for the bugs to run along. */
	readonly flowX: Float32Array;
	readonly flowY: Float32Array;
	private readonly lit: Float32Array;
	private readonly dist: Int32Array;
	private distFrom = -1;
	private carry = 0;
	/** Scratch: what a tile wants to send along each of its links (at most five). */
	private readonly wants = new Float32Array(5);

	constructor(maze: SwarmMaze) {
		this.maze = maze;
		this.n = maze.width * maze.height;
		this.density = new Float32Array(this.n);
		this.next = new Float32Array(this.n);
		this.flowX = new Float32Array(this.n);
		this.flowY = new Float32Array(this.n);
		this.lit = new Float32Array(this.n);
		this.dist = new Int32Array(this.n).fill(-1);
		this.links = [];
		for (let y = 0; y < maze.height; y += 1) {
			for (let x = 0; x < maze.width; x += 1) {
				const out: number[] = [];
				if (maze.walkable(x, y)) {
					for (const [dx, dy] of [
						[1, 0],
						[-1, 0],
						[0, 1],
						[0, -1]
					]) {
						if (maze.walkable(x + dx, y + dy)) {
							out.push((y + dy) * maze.width + x + dx);
						}
					}
					const far = maze.teleport(x, y);
					if (far && maze.walkable(far.x, far.y)) {
						out.push(far.y * maze.width + far.x);
					}
				}
				this.links.push(Int32Array.from(out));
			}
		}
	}

	get width(): number {
		return this.maze.width;
	}

	/** The density on tile (x, y); 0 off the corridors. */
	at(x: number, y: number): number {
		if (x < 0 || y < 0 || x >= this.maze.width || y >= this.maze.height) {
			return 0;
		}
		return this.density[y * this.maze.width + x];
	}

	/** All the swarm there is. */
	get mass(): number {
		let sum = 0;
		for (let i = 0; i < this.n; i += 1) {
			sum += this.density[i];
		}
		return sum;
	}

	/** Adds `amount` to tile (x, y) at once (a burst from the nest, tests). */
	add(x: number, y: number, amount: number): void {
		const i = y * this.maze.width + x;
		if (this.links[i]?.length) {
			this.density[i] = Math.min(SWARM_PACKED, this.density[i] + amount);
		}
	}

	clear(): void {
		this.density.fill(0);
		this.flowX.fill(0);
		this.flowY.fill(0);
	}

	/**
	 * Moves the swarm on by `dt`: the sources pour, the density spreads and flows toward the
	 * hero's tile (null: it only spreads), out of every light and never into one.
	 */
	step(
		dt: number,
		hero: SwarmPoint | null,
		lights: readonly SwarmLight[],
		sources: readonly SwarmPoint[],
		tuning: SwarmTuning
	): void {
		if (!(dt > 0)) {
			return;
		}
		this.mapLight(lights);
		if (hero) {
			this.mapDistance(hero);
		} else {
			this.distFrom = -1;
			this.dist.fill(-1);
		}
		this.carry += Math.min(dt, 0.25);
		while (this.carry >= SUBSTEP) {
			this.carry -= SUBSTEP;
			this.substep(SUBSTEP, hero !== null, sources, tuning);
		}
	}

	private mapLight(lights: readonly SwarmLight[]): void {
		const w = this.maze.width;
		this.lit.fill(0);
		for (const l of lights) {
			const r = Math.max(0.01, l.r);
			const x0 = Math.max(0, Math.floor(l.x - r));
			const x1 = Math.min(w - 1, Math.ceil(l.x + r));
			const y0 = Math.max(0, Math.floor(l.y - r));
			const y1 = Math.min(this.maze.height - 1, Math.ceil(l.y + r));
			for (let y = y0; y <= y1; y += 1) {
				for (let x = x0; x <= x1; x += 1) {
					const d = Math.hypot(x + 0.5 - l.x, y + 0.5 - l.y);
					const k = 1 - d / r;
					const i = y * w + x;
					if (k > this.lit[i]) {
						this.lit[i] = k;
					}
				}
			}
		}
	}

	/** Steps by path from the hero's tile to every corridor tile (tunnels and vents count). */
	private mapDistance(hero: SwarmPoint): void {
		const w = this.maze.width;
		const start = Math.floor(hero.y) * w + Math.floor(hero.x);
		if (start === this.distFrom) {
			return;
		}
		this.distFrom = start;
		this.dist.fill(-1);
		if (!this.links[start]) {
			return;
		}
		const queue = [start];
		this.dist[start] = 0;
		for (let q = 0; q < queue.length; q += 1) {
			const a = queue[q];
			for (const b of this.links[a]) {
				if (this.dist[b] < 0) {
					this.dist[b] = this.dist[a] + 1;
					queue.push(b);
				}
			}
		}
	}

	private substep(
		dt: number,
		chasing: boolean,
		sources: readonly SwarmPoint[],
		t: SwarmTuning
	): void {
		const w = this.maze.width;
		const d = this.density;
		const next = this.next;
		next.set(d);
		this.flowX.fill(0);
		this.flowY.fill(0);
		// the sources pour while the station holds less than its most
		if (sources.length > 0 && this.mass < t.maxMass) {
			const each = (t.output * dt) / sources.length;
			for (const s of sources) {
				const i = Math.floor(s.y) * w + Math.floor(s.x);
				if (this.links[i]?.length && this.lit[i] < LIT) {
					next[i] = Math.min(SWARM_PACKED, next[i] + each);
				}
			}
		}
		for (let a = 0; a < this.n; a += 1) {
			const links = this.links[a];
			const da = d[a];
			if (da <= 1e-5 || links.length === 0) {
				continue;
			}
			// every way out of the tile: levelling with a neighbour, toward the hero, out of light
			const wants = this.wants;
			wants.fill(0);
			let total = 0;
			for (let k = 0; k < links.length; k += 1) {
				const b = links[k];
				// never into the light, only out of it toward the dark
				if (this.lit[b] >= LIT && this.lit[b] >= this.lit[a]) {
					continue;
				}
				let f = Math.max(0, t.spread * (da - d[b]));
				if (chasing && this.dist[b] >= 0 && this.dist[b] < this.dist[a]) {
					f += t.pull * da;
				}
				if (this.lit[a] > 0) {
					f += t.push * this.lit[a] * da * (1 + Math.max(0, this.lit[a] - this.lit[b]));
				}
				if (d[b] >= SWARM_PACKED) {
					f = 0;
				}
				wants[k] = f * dt;
				total += wants[k];
			}
			if (total <= 0) {
				continue;
			}
			const scale = total > da ? da / total : 1;
			const ax = a % w;
			const ay = Math.floor(a / w);
			for (let k = 0; k < links.length; k += 1) {
				const move = wants[k] * scale;
				if (move <= 0) {
					continue;
				}
				const b = links[k];
				next[a] -= move;
				next[b] += move;
				const bx = b % w;
				const by = Math.floor(b / w);
				// a tunnel's far end is one step on, whichever way it lies on the map
				const sx = Math.abs(bx - ax) > 1 ? -Math.sign(bx - ax) : bx - ax;
				const sy = Math.abs(by - ay) > 1 ? -Math.sign(by - ay) : by - ay;
				this.flowX[a] += (sx * move) / dt;
				this.flowY[a] += (sy * move) / dt;
			}
		}
		for (let i = 0; i < this.n; i += 1) {
			next[i] = Math.min(SWARM_PACKED, Math.max(0, next[i]));
		}
		this.next = this.density;
		this.density = next;
	}
}
