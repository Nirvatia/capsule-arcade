import type { GridService } from './GridService';
import type { LevelProgress } from '../level/LevelProgress';
import type { GridPoint } from './GridModel';

export class SpawnLocator {
	private readonly grid: GridService;
	private readonly progress: LevelProgress;

	constructor(grid: GridService, progress: LevelProgress) {
		if (!grid) {
			console.error('SpawnLocator.constructor', 'missing grid service');
			throw new Error('SpawnLocator.constructor: missing grid service');
		}
		if (!progress) {
			console.error('SpawnLocator.constructor', 'missing level progress');
			throw new Error('SpawnLocator.constructor: missing level progress');
		}
		this.grid = grid;
		this.progress = progress;
	}

	/**
	 * A collected dot tile picked by `seed`. With `away`, only tiles at least `away.min` steps
	 * (by path) from `away.from`, so a bonus never appears under the hero's feet; if every tile
	 * is closer, the farthest ones.
	 */
	findSafeTile(
		seed: number,
		exclude: readonly GridPoint[] = [],
		away: { readonly from: GridPoint; readonly min: number } | null = null
	): GridPoint | null {
		if (!Number.isFinite(seed) || seed < 0) {
			console.error('SpawnLocator.findSafeTile', 'invalid seed', seed);
		}
		const candidates = this.progress.safeSpawnTiles();
		const available: GridPoint[] = [];
		for (const tile of candidates) {
			if (!this.isInside(tile.x, tile.y)) {
				continue;
			}
			if (this.grid.tileAt(tile.x, tile.y) !== 'DT') {
				continue;
			}
			if (this.isExcluded(tile.x, tile.y, exclude)) {
				continue;
			}
			available.push(tile);
		}
		if (available.length === 0) {
			return null;
		}
		if (away) {
			const steps = this.pathSteps(away.from);
			const far = (t: GridPoint) => steps.get(t.y * this.grid.width + t.x) ?? Infinity;
			const kept = available.filter((t) => far(t) >= away.min);
			if (kept.length > 0) {
				available.splice(0, available.length, ...kept);
			} else {
				const best = Math.max(...available.map(far));
				const farthest = available.filter((t) => far(t) === best);
				available.splice(0, available.length, ...farthest);
			}
		}
		const safeSeed = Number.isFinite(seed) && seed >= 0 ? Math.floor(seed) : 0;
		const index = safeSeed % available.length;
		const tile = available[index];
		if (!tile) {
			console.error('SpawnLocator.findSafeTile', 'candidate is missing', { seed, index });
			return null;
		}
		return tile;
	}

	/** Steps from `from` to every tile the hero can reach (tunnels not counted), by tile index. */
	private pathSteps(from: GridPoint): Map<number, number> {
		const W = this.grid.width;
		const steps = new Map<number, number>();
		if (!this.grid.isPlayerWalkable(from.x, from.y)) {
			return steps;
		}
		steps.set(from.y * W + from.x, 0);
		let frontier: GridPoint[] = [from];
		let d = 0;
		while (frontier.length > 0) {
			d += 1;
			const next: GridPoint[] = [];
			for (const t of frontier) {
				for (const [dx, dy] of [
					[1, 0],
					[-1, 0],
					[0, 1],
					[0, -1]
				] as const) {
					const x = t.x + dx;
					const y = t.y + dy;
					const k = y * W + x;
					if (!steps.has(k) && this.grid.isPlayerWalkable(x, y)) {
						steps.set(k, d);
						next.push({ x, y });
					}
				}
			}
			frontier = next;
		}
		return steps;
	}

	private isInside(x: number, y: number): boolean {
		return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0;
	}

	private isExcluded(x: number, y: number, exclude: readonly GridPoint[]): boolean {
		for (const point of exclude) {
			if (point.x === x && point.y === y) {
				return true;
			}
		}
		return false;
	}
}
