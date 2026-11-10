import { isTeleportToken } from '../gridConfig';
import type { GridMatrix, TileType } from '../gridConfig';

export interface MazeValidationOptions {
	/** Season mazes are full of dots; the hell's maze has none. Default true. */
	readonly requireDots?: boolean;
}

const LAIR_TOKENS: ReadonlySet<TileType> = new Set<TileType>(['LE', 'LT', 'BY', 'PY', 'IY', 'CE']);
const SINGLE_TOKENS = ['PM', 'FT', 'BY', 'PY', 'IY', 'CE'] as const;

interface Point {
	readonly x: number;
	readonly y: number;
}

/**
 * Checks a maze against the game's rules and returns every problem found (an empty list
 * means the maze is fine): an empty `ES` border, exactly one Pac-Man pad, fruit pad and
 * ghost pad per ghost, a lair with an exit, tunnels in pairs (a maze may have none), and
 * every dot, energizer and the fruit pad reachable from Pac-Man's pad (through the tunnels,
 * with the lair shut).
 */
export function validateMaze(grid: GridMatrix, options: MazeValidationOptions = {}): string[] {
	const requireDots = options.requireDots ?? true;
	const problems: string[] = [];
	const height = grid.length;
	const width = grid[0]?.length ?? 0;
	if (height === 0 || width === 0) {
		return ['the maze is empty'];
	}
	const tileAt = (x: number, y: number): TileType | undefined => grid[y]?.[x];

	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const onBorder = x === 0 || y === 0 || x === width - 1 || y === height - 1;
			if (onBorder && tileAt(x, y) !== 'ES') {
				problems.push(`border tile (${x},${y}) is ${tileAt(x, y)}, not ES`);
			}
		}
	}

	const found = new Map<TileType, Point[]>();
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const token = tileAt(x, y);
			if (token !== undefined) {
				const list = found.get(token) ?? [];
				list.push({ x, y });
				found.set(token, list);
			}
		}
	}
	const all = (token: TileType): Point[] => found.get(token) ?? [];

	for (const token of SINGLE_TOKENS) {
		const count = all(token).length;
		if (count !== 1) {
			problems.push(`expected exactly one ${token}, found ${count}`);
		}
	}
	if (all('LE').length === 0) {
		problems.push('the lair has no exit tile (LE)');
	}
	if (requireDots && all('DT').length === 0) {
		problems.push('the maze has no dots');
	}
	if (requireDots && all('EU').length === 0) {
		problems.push('the maze has no energizers');
	}

	const tunnels = new Map<TileType, Point[]>();
	for (const [token, points] of found) {
		if (isTeleportToken(token)) {
			tunnels.set(token, points);
			if (points.length !== 2) {
				problems.push(`tunnel ${token} has ${points.length} ends, not 2`);
			}
		}
	}

	const start = all('PM')[0];
	if (!start) {
		return problems;
	}
	const walkable = (x: number, y: number): boolean => {
		const token = tileAt(x, y);
		return token !== undefined && token !== 'WL' && token !== 'ES' && !LAIR_TOKENS.has(token);
	};
	const key = (x: number, y: number) => y * width + x;
	const seen = new Set<number>([key(start.x, start.y)]);
	const queue: Point[] = [start];
	while (queue.length > 0) {
		const at = queue.shift() as Point;
		const next: Point[] = [
			{ x: at.x + 1, y: at.y },
			{ x: at.x - 1, y: at.y },
			{ x: at.x, y: at.y + 1 },
			{ x: at.x, y: at.y - 1 }
		];
		const token = tileAt(at.x, at.y);
		if (token && isTeleportToken(token)) {
			const other = (tunnels.get(token) ?? []).find((p) => p.x !== at.x || p.y !== at.y);
			if (other) {
				next.push(other);
			}
		}
		for (const point of next) {
			if (walkable(point.x, point.y) && !seen.has(key(point.x, point.y))) {
				seen.add(key(point.x, point.y));
				queue.push(point);
			}
		}
	}

	const unreachable = (token: TileType, label: string) => {
		const lost = all(token).filter((p) => !seen.has(key(p.x, p.y)));
		if (lost.length > 0) {
			const where = lost
				.slice(0, 5)
				.map((p) => `(${p.x},${p.y})`)
				.join(' ');
			problems.push(`${lost.length} ${label} unreachable from Pac-Man's pad, e.g. ${where}`);
		}
	};
	unreachable('DT', 'dots');
	unreachable('EU', 'energizers');
	unreachable('FT', 'fruit pad');

	const exitReachable = all('LE').some((p) =>
		[
			{ x: p.x + 1, y: p.y },
			{ x: p.x - 1, y: p.y },
			{ x: p.x, y: p.y + 1 },
			{ x: p.x, y: p.y - 1 }
		].some((q) => seen.has(key(q.x, q.y)))
	);
	if (all('LE').length > 0 && !exitReachable) {
		problems.push('no lair exit tile touches a corridor Pac-Man can reach');
	}
	return problems;
}
