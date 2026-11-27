import { ZONE } from '../../config/zoneConfig';
import type { GridPoint } from '../maze/GridModel';
import type { GridService } from '../maze/GridService';
import type { ZoneRng } from './zoneRng';
import { between, spread } from './zoneRng';

export type TushkanState = 'sniff' | 'hop' | 'rush' | 'tired' | 'dead';

export interface Tushkan {
	/** Centre, in tiles (3.5 is the middle of tile 3). */
	x: number;
	y: number;
	fx: number;
	fy: number;
	tx: number;
	ty: number;
	p: number;
	state: TushkanState;
	timer: number;
	hopLeft: number;
	/** Facing, for the drawing. */
	dx: number;
	dy: number;
	/** 0 chases, 1 ambushes (where the hero is heading), 2 chases, 3 prowls and rushes when near. */
	role: number;
}

export interface TushkanWorld {
	/** The hero's tile. */
	readonly hero: GridPoint;
	/** Four tiles ahead of the hero along his heading (the ambusher's target). */
	readonly ahead: GridPoint;
	/** A bolt's noise, while it lasts. */
	readonly lure: GridPoint | null;
	/** Does an anomaly hurt on this tile now? */
	readonly deadly: (x: number, y: number) => boolean;
}

/**
 * The tushkans: a small pack of rodents that hunt by ear. They creep, sniff, then hop two or three
 * tiles at a time; when the hero is close they rush for a moment and tire. A bolt's noise draws
 * them; they are not clever enough to avoid an anomaly, so they die in it and come back out of a
 * burrow. Their speed is `speedMul` times the base (a wish's price).
 */
export class TushkanPack {
	readonly list: Tushkan[] = [];
	private heard: Int16Array;
	private lureMap: Int16Array;
	private aheadMap: Int16Array;
	private refresh = 0;
	/** Seconds the pack still flees (an artifact was taken). */
	fear = 0;

	constructor(
		private readonly grid: GridService,
		private readonly burrows: readonly GridPoint[],
		private readonly rng: ZoneRng,
		private readonly speedMul = 1,
		count: number = ZONE.tushkan.count
	) {
		this.heard = new Int16Array(grid.width * grid.height).fill(-1);
		this.lureMap = new Int16Array(grid.width * grid.height).fill(-1);
		this.aheadMap = new Int16Array(grid.width * grid.height).fill(-1);
		for (let i = 0; i < count; i += 1) {
			const b = burrows[i % Math.max(1, burrows.length)] ?? { x: 1, y: 1 };
			const t = this.make(b);
			t.role = i % 4;
			t.timer = spread(rng, 0.2, 2.5);
			this.list.push(t);
		}
	}

	update(dt: number, w: TushkanWorld): void {
		this.fear = Math.max(0, this.fear - dt);
		this.refresh -= dt;
		if (this.refresh <= 0) {
			this.refresh = 0.2;
			this.fill(this.heard, w.hero);
			this.fill(this.aheadMap, w.ahead);
			if (w.lure) {
				this.fill(this.lureMap, w.lure);
			}
		}
		for (const t of this.list) {
			if (t.state === 'dead') {
				t.timer -= dt;
				if (t.timer <= 0) {
					this.revive(t, w.hero);
				}
				continue;
			}
			this.step(t, dt, w);
			const tile = t.p < 0.5 ? { x: t.fx, y: t.fy } : { x: t.tx, y: t.ty };
			if (w.deadly(tile.x, tile.y)) {
				this.kill(t);
			}
		}
	}

	kill(t: Tushkan): void {
		t.state = 'dead';
		t.timer = ZONE.tushkan.respawn;
	}

	killAll(): void {
		for (const t of this.list) {
			if (t.state !== 'dead') {
				this.kill(t);
			}
		}
	}

	/** The living tushkan on a tile, for a bolt. */
	at(x: number, y: number): Tushkan | null {
		return (
			this.list.find((t) => t.state !== 'dead' && Math.floor(t.x) === x && Math.floor(t.y) === y) ??
			null
		);
	}

	/** A bite: the biter leaps back and tires. */
	bitten(t: Tushkan): void {
		t.state = 'tired';
		t.timer = ZONE.tushkan.tired * 1.4;
		[t.fx, t.tx] = [t.tx, t.fx];
		[t.fy, t.ty] = [t.ty, t.fy];
		t.p = 1 - t.p;
	}

	private make(at: GridPoint): Tushkan {
		return {
			x: at.x + 0.5,
			y: at.y + 0.5,
			fx: at.x,
			fy: at.y,
			tx: at.x,
			ty: at.y,
			p: 0,
			state: 'sniff',
			timer: 0.5,
			hopLeft: 0,
			dx: 1,
			dy: 0,
			role: 0
		};
	}

	private revive(t: Tushkan, hero: GridPoint): void {
		const far = this.burrows.filter(
			(b) => Math.abs(b.x - hero.x) + Math.abs(b.y - hero.y) >= ZONE.tushkan.burrowClear
		);
		const pool = far.length > 0 ? far : this.burrows;
		const role = t.role;
		Object.assign(t, this.make(pool[Math.floor(this.rng() * pool.length)] ?? { x: 1, y: 1 }));
		t.role = role;
	}

	private step(t: Tushkan, dt: number, w: TushkanWorld): void {
		const c = ZONE.tushkan;
		if (t.state === 'sniff' || t.state === 'tired') {
			t.timer -= dt;
			if (t.timer > 0) {
				return;
			}
			const here = this.dist(this.heard, t.fx, t.fy);
			if (this.fear <= 0 && here >= 0 && here <= (t.role === 3 ? c.rushDist + 2 : c.rushDist)) {
				t.state = 'rush';
				t.timer = c.rushT;
			} else {
				t.state = 'hop';
				t.hopLeft = between(this.rng, c.hopTiles[0], c.hopTiles[1]);
			}
			this.aim(t, w);
		}
		const speed =
			(t.state === 'rush' ? c.rushSpeed : c.hopSpeed) * this.speedMul * (this.fear > 0 ? 0.75 : 1);
		t.p += speed * dt;
		if (t.state === 'rush') {
			t.timer -= dt;
		}
		while (t.p >= 1) {
			t.p -= 1;
			t.fx = t.tx;
			t.fy = t.ty;
			if (t.state === 'hop') {
				t.hopLeft -= 1;
			}
			if ((t.state === 'hop' && t.hopLeft <= 0) || (t.state === 'rush' && t.timer <= 0)) {
				t.p = 0;
				t.state = t.state === 'rush' ? 'tired' : 'sniff';
				t.timer = t.state === 'tired' ? c.tired : spread(this.rng, c.sniff[0], c.sniff[1]);
				break;
			}
			this.aim(t, w);
		}
		t.x = t.fx + 0.5 + (t.tx - t.fx) * t.p;
		t.y = t.fy + 0.5 + (t.ty - t.fy) * t.p;
	}

	/** Picks the next tile: down the ear's gradient (the bolt, the hero or where he is heading), up it when afraid, else a wander. */
	private aim(t: Tushkan, w: TushkanWorld): void {
		const here = { x: t.fx, y: t.fy };
		const lureD = w.lure ? this.dist(this.lureMap, here.x, here.y) : -1;
		const own = t.role === 1 ? this.aheadMap : this.heard;
		const hear = this.dist(own, here.x, here.y);
		let map: Int16Array | null = null;
		if (this.fear > 0) {
			map = this.heard;
		} else if (lureD >= 0 && lureD <= ZONE.tushkan.hearDist) {
			map = this.lureMap;
		} else if (t.role !== 3 && hear >= 0) {
			map = own;
		} else if (t.role === 3 && this.dist(this.heard, here.x, here.y) <= ZONE.tushkan.rushDist + 4) {
			map = this.heard;
		}
		const opts = [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1]
		]
			.map(([dx, dy]) => ({ x: here.x + dx, y: here.y + dy, dx, dy }))
			.filter((o) => this.grid.isGhostWalkable(o.x, o.y, false));
		if (opts.length === 0) {
			return;
		}
		const ahead = opts.filter((o) => !(o.dx === -t.dx && o.dy === -t.dy));
		const pick = ahead.length > 0 ? ahead : opts;
		let best = pick[Math.floor(this.rng() * pick.length)];
		if (map) {
			const flee = this.fear > 0 ? -1 : 1;
			let bd = 1e9;
			for (const o of pick) {
				const d = this.dist(map, o.x, o.y) * flee;
				if (this.dist(map, o.x, o.y) >= 0 && d < bd) {
					bd = d;
					best = o;
				}
			}
		}
		t.tx = best.x;
		t.ty = best.y;
		t.dx = best.dx;
		t.dy = best.dy;
	}

	private dist(map: Int16Array, x: number, y: number): number {
		return map[y * this.grid.width + x] ?? -1;
	}

	/** Steps from `from` over the corridors (the lair shut), -1 where it cannot be reached. */
	private fill(map: Int16Array, from: GridPoint): void {
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
				if (this.grid.isGhostWalkable(nx, ny, false) && map[ny * W + nx] < 0) {
					map[ny * W + nx] = map[y * W + x] + 1;
					q.push(ny * W + nx);
				}
			}
		}
	}
}
