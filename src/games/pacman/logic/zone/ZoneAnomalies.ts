import { ZONE } from '../../config/zoneConfig';
import type { GridPoint } from '../maze/GridModel';
import type { GridService } from '../maze/GridService';
import type { ZoneMap } from './ZoneMap';
import type { ZoneRng } from './zoneRng';
import { spread } from './zoneRng';

export type AnomalyKind = 'heat' | 'electra';
/** idle: harmless now; warn: about to fire (shows it); active: hurts; inert: spent by a bolt or a Medusa. */
export type AnomalyState = 'idle' | 'warn' | 'active' | 'inert';

export interface Anomaly {
	readonly id: number;
	readonly kind: AnomalyKind;
	x: number;
	y: number;
	/** Where it sits in its own cycle, so the field does not beat in step. */
	readonly offset: number;
	inertUntil: number;
}

/**
 * The anomaly fields: a few pockets on a corridor, never on the only way (the maze stays whole
 * without them) and never near the spawn. Heat pulses on three tiles in a line, electra strikes its
 * tile and the corridor tiles round it. Each warns before it fires, so a hit is always avoidable;
 * the nuts inside are golden (a risk worth taking). A bolt or a Medusa makes one inert; the
 * tushkans are not clever enough to keep out of them.
 */
export class ZoneAnomalies {
	readonly list: Anomaly[] = [];
	private time = 0;

	constructor(
		private readonly grid: GridService,
		private readonly map: ZoneMap,
		private readonly rng: ZoneRng,
		scale = 1
	) {
		const n = ZONE.anomalies;
		let id = 0;
		for (const [kind, count] of [
			['heat', Math.round(n.heat * scale)],
			['electra', Math.round(n.electra * scale)]
		] as const) {
			for (let i = 0; i < count; i += 1) {
				this.list.push(this.make(id, kind));
				id += 1;
			}
		}
		this.reshuffle();
	}

	get now(): number {
		return this.time;
	}

	update(dt: number): void {
		this.time += dt;
	}

	stateOf(a: Anomaly): AnomalyState {
		if (this.time < a.inertUntil) {
			return 'inert';
		}
		const c = a.kind === 'heat' ? ZONE.heat : ZONE.electra;
		const live = a.kind === 'heat' ? ZONE.heat.hot : ZONE.electra.strike;
		const u = (this.time + a.offset) % c.period;
		if (u >= c.period - live) {
			return 'active';
		}
		return u >= c.period - live - c.warn ? 'warn' : 'idle';
	}

	/** The tiles an anomaly covers: heat three tiles in a line, electra a plus of corridor. */
	zoneOf(a: Anomaly): GridPoint[] {
		const out: GridPoint[] = [{ x: a.x, y: a.y }];
		const ok = (x: number, y: number): boolean => this.grid.isGhostWalkable(x, y, false);
		if (a.kind === 'heat') {
			const horizontal = ok(a.x - 1, a.y) && ok(a.x + 1, a.y);
			const [dx, dy] = horizontal ? [1, 0] : [0, 1];
			for (const k of [-1, 1]) {
				if (ok(a.x + dx * k, a.y + dy * k)) {
					out.push({ x: a.x + dx * k, y: a.y + dy * k });
				}
			}
			return out;
		}
		for (const [dx, dy] of [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1]
		]) {
			if (ok(a.x + dx, a.y + dy)) {
				out.push({ x: a.x + dx, y: a.y + dy });
			}
		}
		return out;
	}

	/** The anomaly that hurts whoever stands on tile (x, y) right now, if any. */
	hazardAt(x: number, y: number): Anomaly | null {
		for (const a of this.list) {
			if (this.stateOf(a) === 'active' && this.zoneOf(a).some((p) => p.x === x && p.y === y)) {
				return a;
			}
		}
		return null;
	}

	/** Is tile (x, y) inside a field (the nuts there are golden)? */
	covers(x: number, y: number): boolean {
		return this.list.some((a) => this.zoneOf(a).some((p) => p.x === x && p.y === y));
	}

	/** The first anomaly on tile (x, y) that is not inert, for a bolt's flight. */
	liveAt(x: number, y: number): Anomaly | null {
		return (
			this.list.find(
				(a) => this.stateOf(a) !== 'inert' && this.zoneOf(a).some((p) => p.x === x && p.y === y)
			) ?? null
		);
	}

	disarm(a: Anomaly, seconds: number): void {
		a.inertUntil = this.time + seconds;
	}

	disarmAll(seconds: number): void {
		for (const a of this.list) {
			this.disarm(a, seconds);
		}
	}

	/** After an emission (and at the start): the fields move to new tiles, each leaving the maze whole. */
	reshuffle(): void {
		const spawn = this.grid.playerSpawn;
		const blocked = new Set<string>();
		for (const p of [...this.map.artifacts, ...this.map.shelters, ...this.map.burrows]) {
			blocked.add(`${p.x},${p.y}`);
		}
		const pool: GridPoint[] = [];
		for (let y = 0; y < this.grid.height; y += 1) {
			for (let x = 0; x < this.grid.width; x += 1) {
				if (
					this.grid.isGhostWalkable(x, y, false) &&
					!this.grid.isTeleport(x, y) &&
					!blocked.has(`${x},${y}`) &&
					this.grid.exitsCount(x, y) === 2 &&
					Math.abs(x - spawn.x) + Math.abs(y - spawn.y) >= ZONE.anomalies.spawnClear
				) {
					pool.push({ x, y });
				}
			}
		}
		const placed: Anomaly[] = [];
		for (const a of this.list) {
			let at: GridPoint | null = null;
			for (let tries = 0; tries < 80 && !at; tries += 1) {
				const p = pool[Math.floor(this.rng() * pool.length)];
				if (!p) {
					break;
				}
				a.x = p.x;
				a.y = p.y;
				const apart = placed.every(
					(q) => Math.max(Math.abs(q.x - p.x), Math.abs(q.y - p.y)) >= ZONE.anomalies.gap
				);
				if (apart && this.keepsMazeWhole([...placed, a])) {
					at = p;
				}
			}
			if (!at && pool.length > 0) {
				a.x = pool[0].x;
				a.y = pool[0].y;
			}
			placed.push(a);
		}
	}

	private make(id: number, kind: AnomalyKind): Anomaly {
		const period = kind === 'heat' ? ZONE.heat.period : ZONE.electra.period;
		return { id, kind, x: 0, y: 0, offset: spread(this.rng, 0, period), inertUntil: 0 };
	}

	/** With the fields' tiles taken out, is every other corridor tile still reachable from the spawn? */
	private keepsMazeWhole(fields: readonly Anomaly[]): boolean {
		const W = this.grid.width;
		const out = new Set<number>();
		for (const a of fields) {
			for (const p of this.zoneOf(a)) {
				out.add(p.y * W + p.x);
			}
		}
		const seen = new Set<number>();
		const spawn = this.grid.playerSpawn;
		const q = [spawn.y * W + spawn.x];
		seen.add(q[0]);
		for (let i = 0; i < q.length; i += 1) {
			const x = q[i] % W;
			const y = Math.floor(q[i] / W);
			for (const [dx, dy] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1]
			]) {
				const k = (y + dy) * W + x + dx;
				if (!seen.has(k) && !out.has(k) && this.grid.isGhostWalkable(x + dx, y + dy, false)) {
					seen.add(k);
					q.push(k);
				}
			}
		}
		let total = 0;
		for (let y = 0; y < this.grid.height; y += 1) {
			for (let x = 0; x < W; x += 1) {
				if (this.grid.isGhostWalkable(x, y, false) && !out.has(y * W + x)) {
					total += 1;
				}
			}
		}
		return seen.size >= total;
	}
}
