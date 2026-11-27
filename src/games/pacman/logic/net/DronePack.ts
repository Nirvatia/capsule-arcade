import { NET } from '../../config/netConfig';
import type { GridPoint } from '../maze/GridModel';
import type { GridService } from '../maze/GridService';
import type { ZoneRng } from '../zone/zoneRng';

export type DroneState = 'wait' | 'hunt' | 'fright' | 'dead';

export interface Drone {
	/** Centre, in tiles (3.5 is the middle of tile 3). */
	x: number;
	y: number;
	fx: number;
	fy: number;
	tx: number;
	ty: number;
	p: number;
	dx: number;
	dy: number;
	state: DroneState;
	timer: number;
	/** 0 chases, 1 ambushes, 2 flanks, 3 shies away when near. */
	role: number;
	home: GridPoint;
}

export interface DroneWorld {
	readonly hero: GridPoint;
	/** Two and four tiles ahead of the hero along his heading. */
	readonly ahead2: GridPoint;
	readonly ahead4: GridPoint;
	/** Speed factor (the surge at the last data). */
	readonly speedMul: number;
	/** Is a step shut by a door? */
	readonly shut: (ax: number, ay: number, bx: number, by: number) => boolean;
}

/**
 * The security drones: four, hunting like the four ghosts of Pac-Man (a chaser, an ambusher, a
 * flanker that aims past the hero from the chaser's side, a shy one that retreats to its corner when
 * near). They glide at a steady speed a little under the hero's, choose their way tile by tile on
 * distance maps that know the doors, flee when hacked and come back after being eaten.
 */
export class DronePack {
	readonly list: Drone[] = [];
	private heroMap: Int16Array;
	private aheadMap: Int16Array;
	private flankMap: Int16Array;
	private homeMaps: Int16Array[] = [];
	private refresh = 0;
	private clock = 0;
	/** Seconds the pack still flees. */
	fear = 0;

	constructor(
		private readonly grid: GridService,
		homes: readonly GridPoint[],
		private readonly rng: ZoneRng,
		count: number = NET.drone.count,
		/** How many are on the field at the start; the rest sleep at home until `callExtra`. */
		active: number = count
	) {
		const n = grid.width * grid.height;
		this.heroMap = new Int16Array(n);
		this.aheadMap = new Int16Array(n);
		this.flankMap = new Int16Array(n);
		for (let i = 0; i < count; i += 1) {
			const home = homes[i % Math.max(1, homes.length)] ?? { x: 1, y: 1 };
			this.list.push({
				x: home.x + 0.5,
				y: home.y + 0.5,
				fx: home.x,
				fy: home.y,
				tx: home.x,
				ty: home.y,
				p: 0,
				dx: 1,
				dy: 0,
				state: i < active && NET.drone.release[i % NET.drone.release.length] <= 0 ? 'hunt' : 'wait',
				timer: i < active ? NET.drone.release[i % NET.drone.release.length] : Infinity,
				role: i % 4,
				home
			});
			const m = new Int16Array(n);
			this.fill(m, home, () => false);
			this.homeMaps.push(m);
		}
	}

	update(dt: number, w: DroneWorld): void {
		this.clock += dt;
		this.fear = Math.max(0, this.fear - dt);
		this.refresh -= dt;
		if (this.refresh <= 0) {
			this.refresh = NET.drone.refresh;
			this.fill(this.heroMap, w.hero, w.shut);
			this.fill(this.aheadMap, w.ahead4, w.shut);
			const chaser = this.list[0] ? { x: this.list[0].fx, y: this.list[0].fy } : w.hero;
			this.fill(
				this.flankMap,
				this.nearestWalkable(w.ahead2.x * 2 - chaser.x, w.ahead2.y * 2 - chaser.y),
				w.shut
			);
		}
		for (const d of this.list) {
			if (d.state === 'wait' || d.state === 'dead') {
				d.timer -= dt;
				if (d.timer <= 0) {
					d.state = this.fear > 0 ? 'fright' : 'hunt';
				}
				continue;
			}
			if (d.state === 'fright' && this.fear <= 0) {
				d.state = 'hunt';
			}
			if (d.state === 'hunt' && this.fear > 0) {
				d.state = 'fright';
			}
			this.move(d, dt, w);
		}
	}

	/** Wakes the next sleeping extra drone, if there is one. */
	callExtra(): boolean {
		const d = this.list.find((q) => q.state === 'wait' && q.timer === Infinity);
		if (d) {
			d.timer = 0;
		}
		return Boolean(d);
	}

	/** Sends every drone after the first `keep` back home to sleep. */
	dismissExtras(keep: number): void {
		this.list.forEach((d, i) => {
			if (i >= keep) {
				d.state = 'wait';
				d.timer = Infinity;
				d.fx = d.home.x;
				d.fy = d.home.y;
				d.tx = d.home.x;
				d.ty = d.home.y;
				d.p = 0;
				d.x = d.home.x + 0.5;
				d.y = d.home.y + 0.5;
			}
		});
	}

	/** A hack: every drone on the field flees. */
	hack(seconds: number): void {
		this.fear = seconds;
		for (const d of this.list) {
			if (d.state === 'hunt') {
				d.state = 'fright';
				this.turnBack(d);
			}
		}
	}

	/** Eaten: it is gone for a while, then returns at its home. */
	eat(d: Drone): void {
		d.state = 'dead';
		d.timer = NET.drone.respawn;
		d.fx = d.home.x;
		d.fy = d.home.y;
		d.tx = d.home.x;
		d.ty = d.home.y;
		d.p = 0;
		d.x = d.home.x + 0.5;
		d.y = d.home.y + 0.5;
	}

	/** A bite: the drone backs off. */
	bitten(d: Drone): void {
		this.turnBack(d);
	}

	private turnBack(d: Drone): void {
		[d.fx, d.tx] = [d.tx, d.fx];
		[d.fy, d.ty] = [d.ty, d.fy];
		d.p = 1 - d.p;
		d.dx = -d.dx;
		d.dy = -d.dy;
	}

	private move(d: Drone, dt: number, w: DroneWorld): void {
		const speed =
			(d.state === 'fright' ? NET.drone.frightSpeed : NET.drone.speed * w.speedMul) * dt;
		d.p += speed;
		while (d.p >= 1) {
			d.p -= 1;
			d.fx = d.tx;
			d.fy = d.ty;
			this.aim(d, w);
		}
		if (d.fx === d.tx && d.fy === d.ty) {
			this.aim(d, w);
		}
		d.x = d.fx + 0.5 + (d.tx - d.fx) * d.p;
		d.y = d.fy + 0.5 + (d.ty - d.fy) * d.p;
	}

	/** The next tile: down the distance map to the drone's target, up the hero's map when it flees. */
	private aim(d: Drone, w: DroneWorld): void {
		const here = { x: d.fx, y: d.fy };
		const all = [
			[0, -1],
			[-1, 0],
			[0, 1],
			[1, 0]
		]
			.map(([dx, dy]) => ({ x: here.x + dx, y: here.y + dy, dx, dy }))
			.filter(
				(o) => this.grid.isGhostWalkable(o.x, o.y, false) && !w.shut(here.x, here.y, o.x, o.y)
			);
		if (all.length === 0) {
			d.tx = d.fx;
			d.ty = d.fy;
			d.p = 0;
			return;
		}
		const ahead = all.filter((o) => !(o.dx === -d.dx && o.dy === -d.dy));
		const pick = ahead.length > 0 ? ahead : all;
		const map = this.mapFor(d, here);
		let best = pick[Math.floor(this.rng() * pick.length)];
		if (map) {
			const flee = d.state === 'fright' ? -1 : 1;
			let bd = Infinity;
			for (const o of pick) {
				const v = map[o.y * this.grid.width + o.x];
				if (v >= 0 && v * flee < bd) {
					bd = v * flee;
					best = o;
				}
			}
		}
		d.tx = best.x;
		d.ty = best.y;
		d.dx = best.dx;
		d.dy = best.dy;
	}

	private mapFor(d: Drone, here: GridPoint): Int16Array | null {
		if (d.state === 'fright') {
			return this.heroMap;
		}
		if (d.role === 1) {
			return this.aheadMap;
		}
		if (d.role === 2) {
			return this.flankMap;
		}
		if (d.role === 3) {
			return this.heroMap[here.y * this.grid.width + here.x] > NET.drone.shy
				? this.heroMap
				: (this.homeMaps[this.list.indexOf(d)] ?? this.heroMap);
		}
		return this.heroMap;
	}

	/** The walkable tile nearest to (x, y), for a target that fell on a wall. */
	private nearestWalkable(x: number, y: number): GridPoint {
		const cx = Math.min(this.grid.width - 1, Math.max(0, Math.round(x)));
		const cy = Math.min(this.grid.height - 1, Math.max(0, Math.round(y)));
		for (let r = 0; r < Math.max(this.grid.width, this.grid.height); r += 1) {
			for (let dy = -r; dy <= r; dy += 1) {
				for (let dx = -r; dx <= r; dx += 1) {
					if (
						Math.max(Math.abs(dx), Math.abs(dy)) === r &&
						this.grid.isGhostWalkable(cx + dx, cy + dy, false)
					) {
						return { x: cx + dx, y: cy + dy };
					}
				}
			}
		}
		return { x: cx, y: cy };
	}

	/** Steps from `from` over the corridors, round the shut doors; -1 where it cannot be reached. */
	private fill(
		map: Int16Array,
		from: GridPoint,
		shut: (ax: number, ay: number, bx: number, by: number) => boolean
	): void {
		map.fill(-1);
		const W = this.grid.width;
		const q: number[] = [from.y * W + from.x];
		map[q[0]] = 0;
		for (let i = 0; i < q.length; i += 1) {
			const x = q[i] % W;
			const y = Math.floor(q[i] / W);
			for (const [dx, dy] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1]
			]) {
				const nx = x + dx;
				const ny = y + dy;
				if (
					this.grid.isGhostWalkable(nx, ny, false) &&
					map[ny * W + nx] < 0 &&
					!shut(x, y, nx, ny)
				) {
					map[ny * W + nx] = map[y * W + x] + 1;
					q.push(ny * W + nx);
				}
			}
		}
	}
}
