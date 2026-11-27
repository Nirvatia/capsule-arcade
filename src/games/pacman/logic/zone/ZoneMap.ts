import type { GridPoint } from '../maze/GridModel';
import type { GridService } from '../maze/GridService';

/**
 * What the Zone reads from a maze, so the owner's own maze drops in: the corner energizers are the
 * artifacts, the lair's middle is the Monolith, the shelters (bunker hatches) and the tushkans'
 * burrows are spread over the corridors.
 */
export interface ZoneMap {
	readonly artifacts: readonly GridPoint[];
	readonly monolith: GridPoint;
	readonly shelters: readonly GridPoint[];
	readonly burrows: readonly GridPoint[];
}

const SHELTERS = 8;
const BURROWS = 4;

export function readZoneMap(grid: GridService): ZoneMap {
	const artifacts: GridPoint[] = [];
	const lair: GridPoint[] = [];
	const corridor: GridPoint[] = [];
	for (let y = 0; y < grid.height; y += 1) {
		for (let x = 0; x < grid.width; x += 1) {
			if (grid.isEnergizer(x, y)) {
				artifacts.push({ x, y });
			}
			const t = grid.tileAt(x, y);
			if (t === 'LT' || t === 'BY' || t === 'PY' || t === 'IY' || t === 'CE') {
				lair.push({ x, y });
			} else if (
				grid.isGhostWalkable(x, y, false) &&
				!grid.isTeleport(x, y) &&
				!grid.isEnergizer(x, y)
			) {
				corridor.push({ x, y });
			}
		}
	}
	const cx = lair.reduce((s, p) => s + p.x, 0) / Math.max(1, lair.length);
	const cy = lair.reduce((s, p) => s + p.y, 0) / Math.max(1, lair.length);
	const monolith = lair.reduce<GridPoint>(
		(best, p) => (Math.hypot(p.x - cx, p.y - cy) < Math.hypot(best.x - cx, best.y - cy) ? p : best),
		lair[0] ?? { x: Math.round(cx), y: Math.round(cy) }
	);
	const spawn = grid.playerSpawn;
	const away = corridor.filter((p) => Math.abs(p.x - spawn.x) + Math.abs(p.y - spawn.y) >= 4);
	const junctions = away.filter((p) => grid.exitsCount(p.x, p.y) >= 3);
	const shelters = farthestSpread(junctions.length >= SHELTERS ? junctions : away, SHELTERS, [
		spawn
	]);
	const straight = away.filter((p) => grid.exitsCount(p.x, p.y) === 2);
	const burrows = farthestSpread(straight, BURROWS, [spawn, ...shelters]);
	return { artifacts, monolith, shelters, burrows };
}

/** `n` tiles of `pool` as far from each other (and from `seeds`) as the pool allows; deterministic. */
export function farthestSpread(
	pool: readonly GridPoint[],
	n: number,
	seeds: readonly GridPoint[]
): GridPoint[] {
	const chosen: GridPoint[] = [];
	const near = (p: GridPoint, set: readonly GridPoint[]): number =>
		set.length === 0 ? 0 : Math.min(...set.map((q) => Math.abs(p.x - q.x) + Math.abs(p.y - q.y)));
	for (let i = 0; i < n && i < pool.length; i += 1) {
		const have = [...seeds, ...chosen];
		let best = pool[0];
		let bestD = -1;
		for (const p of pool) {
			const d = near(p, have);
			if (d > bestD) {
				bestD = d;
				best = p;
			}
		}
		chosen.push(best);
	}
	return chosen;
}
