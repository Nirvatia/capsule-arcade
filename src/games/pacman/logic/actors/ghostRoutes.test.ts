import { describe, expect, it } from 'vitest';
import type { GhostTile } from './GhostModel';
import { planFeeding, shortestRoute } from './ghostRoutes';
import type { RouteWorld } from './ghostRoutes';

/** A tiny maze from text: '#' wall, '.' open, 'o' a dot, 'T' a tunnel end (the two Ts are paired). */
function maze(rows: string[]): { world: RouteWorld; dots: Set<string> } {
	const tunnels: GhostTile[] = [];
	const dots = new Set<string>();
	rows.forEach((row, y) =>
		[...row].forEach((c, x) => {
			if (c === 'T') tunnels.push({ x, y });
			if (c === 'o') dots.add(`${x},${y}`);
		})
	);
	const world: RouteWorld = {
		walkable: (x, y) => (rows[y]?.[x] ?? '#') !== '#',
		teleport: (x, y) => {
			const i = tunnels.findIndex((t) => t.x === x && t.y === y);
			return i < 0 ? undefined : tunnels[1 - i];
		}
	};
	return { world, dots };
}

const at = (x: number, y: number) => ({ tile: { x, y }, facing: null });

describe('shortestRoute', () => {
	it('walks a corridor to the nearest goal', () => {
		const { world } = maze(['#######', '#.....#', '#######']);
		const route = shortestRoute(world, at(1, 1), (x) => x === 4)!;
		expect(route.directions).toEqual(['RIGHT', 'RIGHT', 'RIGHT']);
		expect(route.end.tile).toEqual({ x: 4, y: 1 });
	});

	it('never turns straight back at a junction: the way round is the way', () => {
		// a ring; the goal is just behind the ghost, which is heading away from it
		const { world } = maze(['#####', '#...#', '#.#.#', '#...#', '#####']);
		const route = shortestRoute(
			world,
			{ tile: { x: 2, y: 1 }, facing: 'RIGHT' },
			(x, y) => x === 1 && y === 1
		)!;
		expect(route.directions.length).toBeGreaterThan(1);
		expect(route.directions[0]).not.toBe('LEFT');
	});

	it('turns back in a dead end, the only way', () => {
		const { world } = maze(['#####', '#...#', '#####']);
		const route = shortestRoute(world, { tile: { x: 3, y: 1 }, facing: 'RIGHT' }, (x) => x === 1)!;
		expect(route.directions).toEqual(['LEFT', 'LEFT']);
	});

	it('goes through a tunnel to its far end', () => {
		const { world } = maze(['#########', 'T.......T', '#########']);
		const route = shortestRoute(world, at(1, 1), (x) => x === 7)!;
		// left through the tunnel to the far end, then two steps in: shorter than six steps right
		expect(route.directions.length).toBeLessThan(6);
		expect(route.directions[0]).toBe('LEFT');
	});

	it('finds nothing past the step limit, or in a closed room', () => {
		const { world } = maze(['#######', '#.....#', '#######']);
		expect(shortestRoute(world, at(1, 1), (x) => x === 5, 3)).toBeNull();
		const closed = maze(['#####', '#.#.#', '#####']).world;
		expect(shortestRoute(closed, at(1, 1), (x) => x === 3)).toBeNull();
	});

	it('does not count the start tile as the goal', () => {
		const { world } = maze(['#####', '#...#', '#####']);
		const route = shortestRoute(world, at(2, 1), (x, y) => x === 2 && y === 1);
		expect(route === null || route.directions.length > 0).toBe(true);
	});
});

describe('planFeeding', () => {
	it('counts the dots passed on the way and stops when the steps are spent', () => {
		const { world, dots } = maze(['#########', '#.ooooo.#', '#########']);
		const has = (x: number, y: number) => dots.has(`${x},${y}`);
		const plan = planFeeding(world, at(1, 1), has, 3);
		expect(plan.dots).toBe(3);
		expect(plan.directions).toHaveLength(3);
		expect(planFeeding(world, at(1, 1), has, 50).dots).toBe(5);
	});

	it('goes cluster to cluster and does not walk an eaten corridor twice', () => {
		// two clusters at the ends of a long corridor, a side branch with one dot in the middle
		const { world, dots } = maze([
			'###########',
			'#oo.....oo#',
			'####.#.####',
			'####o#.####',
			'###########'
		]);
		const has = (x: number, y: number) => dots.has(`${x},${y}`);
		const plan = planFeeding(world, at(4, 1), has, 40);
		expect(plan.dots).toBe(5);
		// 6 of the 7 steps from the left cluster to the right are walked once only
		expect(plan.directions.length).toBeLessThan(25);
	});

	it('is empty with no food in reach', () => {
		const { world } = maze(['#####', '#...#', '#####']);
		const plan = planFeeding(world, at(1, 1), () => false, 10);
		expect(plan).toEqual({ directions: [], dots: 0 });
	});

	it('beats the straight-line pick when the food is behind a wall', () => {
		// the dot nearest in a straight line (2 tiles) is behind a wall: 12 steps round; the other
		// dot is 6 steps down the corridor
		const { world, dots } = maze([
			'###########',
			'#.#o#######',
			'#.#.#######',
			'#.#.#######',
			'#.#.#######',
			'#.#.#######',
			'#.........#',
			'#o#########',
			'###########'
		]);
		const has = (x: number, y: number) => dots.has(`${x},${y}`);
		const from = at(1, 1);
		const isBehindWall = (x: number, y: number) => x === 3 && y === 1;
		expect(shortestRoute(world, from, isBehindWall)!.directions).toHaveLength(12);
		expect(shortestRoute(world, from, isBehindWall, 8)).toBeNull();
		const plan = planFeeding(world, from, has, 8);
		expect(plan.dots).toBe(1);
		expect(plan.directions[0]).toBe('DOWN');
		// given the time for both, it takes both, nearest first
		expect(planFeeding(world, from, has, 30).dots).toBe(2);
	});
});
