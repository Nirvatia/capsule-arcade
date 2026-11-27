import { ZONE } from '../../config/zoneConfig';
import type { GridPoint } from '../maze/GridModel';
import type { GridService } from '../maze/GridService';
import type { ZoneMap } from './ZoneMap';
import type { ZoneRng } from './zoneRng';
import { spread } from './zoneRng';

export type AnomalyKind = 'heat' | 'electra' | 'trampoline';
/** idle: harmless now; warn: about to fire (shows it); active: hurts; inert: spent by a bolt or a Medusa. */
export type AnomalyState = 'idle' | 'warn' | 'active' | 'inert';

export interface Anomaly {
	readonly id: number;
	readonly kind: AnomalyKind;
	x: number;
	y: number;
	/** Where it sits in its own cycle, so the field does not beat in step. */
	readonly offset: number;
	/** Guards of an artifact stay where they are when the field is shuffled. */
	readonly anchored: boolean;
	inertUntil: number;
	cooldownUntil: number;
}

/**
 * The anomaly field: heat pulses on one tile, electra strikes its tile and the corridor tiles next
 * to it, a trampoline throws the hero three tiles on. Each one warns before it fires, so a hit is
 * always avoidable by timing; a bolt (or a Medusa) makes one inert for a while.
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
		let id = 0;
		for (const a of map.artifacts) {
			const at = this.guardTile(a);
			if (at) {
				this.list.push(this.make(id, 'electra', at, true));
				id += 1;
			}
		}
		const n = ZONE.anomalies;
		const kinds: Array<[AnomalyKind, number]> = [
			['heat', Math.round(n.heat * scale)],
			['electra', Math.round(n.electra * scale)],
			['trampoline', Math.round(n.trampoline * scale)]
		];
		for (const [kind, count] of kinds) {
			for (let i = 0; i < count; i += 1) {
				this.list.push(this.make(id, kind, { x: 0, y: 0 }, false));
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
		if (a.kind === 'trampoline') {
			return 'idle';
		}
		const c = a.kind === 'heat' ? ZONE.heat : ZONE.electra;
		const hot = a.kind === 'heat' ? ZONE.heat.hot : ZONE.electra.strike;
		const u = (this.time + a.offset) % c.period;
		if (u >= c.period - hot) {
			return 'active';
		}
		return u >= c.period - hot - c.warn ? 'warn' : 'idle';
	}

	/** The tiles an anomaly covers: one for heat and a trampoline, a plus of corridor for electra. */
	zoneOf(a: Anomaly): GridPoint[] {
		if (a.kind !== 'electra') {
			return [{ x: a.x, y: a.y }];
		}
		const out: GridPoint[] = [{ x: a.x, y: a.y }];
		for (const [dx, dy] of [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1]
		]) {
			if (this.grid.isGhostWalkable(a.x + dx, a.y + dy, false)) {
				out.push({ x: a.x + dx, y: a.y + dy });
			}
		}
		return out;
	}

	/** The anomaly that hurts whoever stands on tile (x, y) right now, if any. */
	hazardAt(x: number, y: number): Anomaly | null {
		for (const a of this.list) {
			if (
				a.kind !== 'trampoline' &&
				this.stateOf(a) === 'active' &&
				this.zoneOf(a).some((p) => p.x === x && p.y === y)
			) {
				return a;
			}
		}
		return null;
	}

	trampolineAt(x: number, y: number): Anomaly | null {
		for (const a of this.list) {
			if (
				a.kind === 'trampoline' &&
				a.x === x &&
				a.y === y &&
				this.stateOf(a) !== 'inert' &&
				this.time >= a.cooldownUntil
			) {
				return a;
			}
		}
		return null;
	}

	/** Anything on tile (x, y), for a bolt's flight: the anomaly that is not inert already. */
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

	/** After an emission: the free anomalies move to new tiles; the guards stay. */
	reshuffle(): void {
		const taken: GridPoint[] = this.list.filter((a) => a.anchored).map((a) => ({ x: a.x, y: a.y }));
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
					Math.abs(x - spawn.x) + Math.abs(y - spawn.y) >= ZONE.anomalies.spawnClear
				) {
					pool.push({ x, y });
				}
			}
		}
		for (const a of this.list) {
			if (a.anchored) {
				continue;
			}
			let at: GridPoint | null = null;
			for (let tries = 0; tries < 60 && !at; tries += 1) {
				const p = pool[Math.floor(this.rng() * pool.length)];
				const clear = taken.every(
					(q) => Math.max(Math.abs(q.x - p.x), Math.abs(q.y - p.y)) >= ZONE.anomalies.gap
				);
				const corridor = this.grid.exitsCount(p.x, p.y) === 2;
				if (clear && (a.kind !== 'heat' || corridor)) {
					at = p;
				}
			}
			at ??= pool[Math.floor(this.rng() * pool.length)];
			a.x = at.x;
			a.y = at.y;
			taken.push(at);
		}
	}

	private make(id: number, kind: AnomalyKind, at: GridPoint, anchored: boolean): Anomaly {
		const period = kind === 'heat' ? ZONE.heat.period : ZONE.electra.period;
		return {
			id,
			kind,
			x: at.x,
			y: at.y,
			offset: spread(this.rng, 0, period),
			anchored,
			inertUntil: 0,
			cooldownUntil: 0
		};
	}

	/** The corridor tile beside an artifact whose electra covers the artifact's tile. */
	private guardTile(a: GridPoint): GridPoint | null {
		for (const [dx, dy] of [
			[1, 0],
			[0, 1],
			[-1, 0],
			[0, -1]
		]) {
			if (this.grid.isGhostWalkable(a.x + dx, a.y + dy, false)) {
				return { x: a.x + dx, y: a.y + dy };
			}
		}
		return null;
	}
}
