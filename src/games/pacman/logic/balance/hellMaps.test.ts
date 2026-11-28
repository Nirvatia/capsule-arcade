import { describe, expect, it } from 'vitest';
import type { GridMatrix } from '../../config/gridConfig';
import { validateMaze } from '../../config/mazes/validateMaze';
import { GridModel } from '../maze/GridModel';
import { GridService } from '../maze/GridService';
import { assertDoomMap } from '../doom/DoomMapValidation';
import { HELL_MAP_CANDIDATES } from './hellMaps';
import { hellGrid } from './hellBot';

const LAIR = new Set(['LT', 'LE', 'BY', 'IY', 'PY', 'CE', 'DB']);

/**
 * How the owner draws a maze (every season maze and the hell's since 2026-11-28): the walls are
 * thin strokes, never a 2×2 block of wall outside the lair; and an island (walls not joined to
 * the frame) is a short bar, an L or a T of 3 to 11 tiles, never a pillar or a slab.
 */
function styleProblems(grid: GridMatrix): string[] {
	const H = grid.length;
	const W = grid[0]?.length ?? 0;
	const wall = (x: number, y: number) => y >= 0 && y < H && x >= 0 && x < W && grid[y][x] === 'WL';
	const problems: string[] = [];
	for (let y = 0; y + 1 < H; y += 1) {
		for (let x = 0; x + 1 < W; x += 1) {
			const block = [wall(x, y), wall(x + 1, y), wall(x, y + 1), wall(x + 1, y + 1)];
			if (block.every(Boolean)) problems.push(`a 2×2 block of wall at ${x},${y}`);
		}
	}
	const key = (x: number, y: number) => y * W + x;
	const frame = new Set<number>();
	const stack: Array<[number, number]> = [];
	for (let y = 0; y < H; y += 1) {
		for (let x = 0; x < W; x += 1) {
			if (wall(x, y) && (x <= 1 || y <= 1 || x >= W - 2 || y >= H - 2)) {
				frame.add(key(x, y));
				stack.push([x, y]);
			}
		}
	}
	const around = (x: number, y: number): Array<[number, number]> => [
		[x + 1, y],
		[x - 1, y],
		[x, y + 1],
		[x, y - 1]
	];
	while (stack.length > 0) {
		const [x, y] = stack.pop()!;
		for (const [nx, ny] of around(x, y)) {
			if (wall(nx, ny) && !frame.has(key(nx, ny))) {
				frame.add(key(nx, ny));
				stack.push([nx, ny]);
			}
		}
	}
	const seen = new Set<number>();
	for (let y = 0; y < H; y += 1) {
		for (let x = 0; x < W; x += 1) {
			if (!wall(x, y) || frame.has(key(x, y)) || seen.has(key(x, y))) continue;
			let size = 0;
			let lair = false;
			const island: Array<[number, number]> = [[x, y]];
			seen.add(key(x, y));
			while (island.length > 0) {
				const [cx, cy] = island.pop()!;
				size += 1;
				for (const [nx, ny] of around(cx, cy)) {
					if (LAIR.has(grid[ny]?.[nx] ?? '')) lair = true;
					if (wall(nx, ny) && !frame.has(key(nx, ny)) && !seen.has(key(nx, ny))) {
						seen.add(key(nx, ny));
						island.push([nx, ny]);
					}
				}
			}
			if (!lair && (size < 3 || size > 11)) problems.push(`an island of ${size} at ${x},${y}`);
		}
	}
	return problems;
}

describe('the hell maze candidates', () => {
	it.each(HELL_MAP_CANDIDATES.filter((m) => m.id !== 'old').map((m) => [m.id, m] as const))(
		'%s is drawn in the owner’s style and passes the maze and hell checks',
		(_id, map) => {
			expect(styleProblems(map.drawn)).toEqual([]);
			expect(validateMaze(map.drawn)).toEqual([]);
			const grid = new GridService(new GridModel(hellGrid(map.drawn, map.pickups)));
			expect(() => assertDoomMap(grid, map.pickups)).not.toThrow();
		}
	);
});
