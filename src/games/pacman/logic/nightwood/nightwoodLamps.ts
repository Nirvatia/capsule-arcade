import type { GridMatrix } from '../../config/gridConfig';

/** What a tile is to the forest: a thicket (wall), the dark outside the maze, a trail, the clearing. */
export type ForestKind = 'wall' | 'void' | 'open' | 'lair';

const LAIR_TOKENS: ReadonlySet<string> = new Set(['LE', 'LT', 'BY', 'IY', 'PY', 'CE']);

export function forestKind(token: string | undefined): ForestKind {
	if (token === undefined || token === 'ES') {
		return 'void';
	}
	if (token === 'WL') {
		return 'wall';
	}
	return LAIR_TOKENS.has(token) ? 'lair' : 'open';
}

/** A lamp post: the light's origin is the tile's centre, the post stands beside it at a wall. */
export interface LampSpec {
	readonly x: number;
	readonly y: number;
	/** The post, in tile units (the tile's wall side). */
	readonly postX: number;
	readonly postY: number;
	/** How far its pool reaches, tiles. */
	readonly r: number;
}

export const LAMP_REACH = 4.4;
/** The lamps: at most this many, this far apart (tiles), this far from the clearing. */
const MAX_LAMPS = 8;
const SPACING = 8;
const CLEARING_GAP = 4;

const hashOf = (a: number, b: number): number => {
	const s = Math.sin(a * 127.1 + b * 311.7 + 9 * 74.7) * 43758.5453;
	return s - Math.floor(s);
};

/** The centre of the lair's clearing, in tile units. */
export function clearingOf(grid: GridMatrix): { x: number; y: number } {
	let sx = 0;
	let sy = 0;
	let n = 0;
	grid.forEach((row, y) =>
		row.forEach((token, x) => {
			if (forestKind(token) === 'lair') {
				sx += x + 0.5;
				sy += y + 0.5;
				n += 1;
			}
		})
	);
	return n > 0 ? { x: sx / n, y: sy / n } : { x: (grid[0]?.length ?? 0) / 2, y: grid.length / 2 };
}

/**
 * Where the lamps stand: along the trails, each beside a thicket, spread apart and away from the
 * clearing. Deterministic in the maze, so the rules and the painter agree.
 */
export function placeLamps(grid: GridMatrix): LampSpec[] {
	const kind = (x: number, y: number) => forestKind(grid[y]?.[x]);
	const clearing = clearingOf(grid);
	const dirs: ReadonlyArray<readonly [number, number]> = [
		[1, 0],
		[-1, 0],
		[0, 1],
		[0, -1]
	];
	const candidates: Array<{ x: number; y: number; dx: number; dy: number }> = [];
	grid.forEach((row, y) =>
		row.forEach((_, x) => {
			if (kind(x, y) !== 'open' || grid[y]?.[x]?.startsWith('0')) {
				return;
			}
			if (Math.hypot(x + 0.5 - clearing.x, y + 0.5 - clearing.y) < CLEARING_GAP) {
				return;
			}
			const wall = dirs.find(([dx, dy]) => kind(x + dx, y + dy) === 'wall');
			if (wall) {
				candidates.push({ x, y, dx: wall[0], dy: wall[1] });
			}
		})
	);
	candidates.sort((a, b) => hashOf(a.x, a.y) - hashOf(b.x, b.y));
	const lamps: LampSpec[] = [];
	for (const c of candidates) {
		if (lamps.length >= MAX_LAMPS) {
			break;
		}
		if (lamps.some((l) => Math.hypot(l.x - (c.x + 0.5), l.y - (c.y + 0.5)) < SPACING)) {
			continue;
		}
		lamps.push({
			x: c.x + 0.5,
			y: c.y + 0.5,
			postX: c.x + 0.5 + c.dx * 0.4,
			postY: c.y + 0.5 + c.dy * 0.4,
			r: LAMP_REACH
		});
	}
	return lamps;
}
