import type { GhostDirection, GhostTile } from './GhostModel';
import { DIRECTIONS, ahead, oppositeDirection } from './ghostTargets';

/**
 * Routes for a ghost, by path length: a breadth-first search over (tile, facing) that moves
 * the way a ghost moves (never straight back, unless it is a dead end; a tunnel carries it to
 * its other end), and the greedy plan the hypnotised feeder follows. Pure: the maze comes in
 * as two functions.
 */
export interface RouteWorld {
	/** Whether a ghost may stand on the tile (the lair does not count). */
	walkable(x: number, y: number): boolean;
	/** Where a tunnel tile leads, or undefined for any other tile. */
	teleport(x: number, y: number): GhostTile | undefined;
}

export interface RouteState {
	readonly tile: GhostTile;
	readonly facing: GhostDirection | null;
}

export interface Route {
	/** The direction to take at each step. */
	readonly directions: readonly GhostDirection[];
	/** The tile arrived at after each step (a tunnel's far end for a tunnel step). */
	readonly tiles: readonly GhostTile[];
	/** Where the route ends, with the heading it ends on. */
	readonly end: RouteState;
}

const key = (x: number, y: number, facing: GhostDirection | null): string =>
	`${x},${y},${facing ?? '-'}`;

/** The ways a ghost may leave a tile: not back, unless that is the only way. */
function waysFrom(world: RouteWorld, state: RouteState): GhostDirection[] {
	const open = DIRECTIONS.filter((d) => {
		const next = ahead(state.tile, d, 1);
		return world.walkable(next.x, next.y);
	});
	if (open.length <= 1 || !state.facing) {
		return open;
	}
	const back = oppositeDirection(state.facing);
	const forward = open.filter((d) => d !== back);
	return forward.length > 0 ? forward : open;
}

/** The tile a step from `tile` along `direction` ends on (a tunnel's far end for a tunnel). */
function step(world: RouteWorld, tile: GhostTile, direction: GhostDirection): GhostTile {
	const next = ahead(tile, direction, 1);
	return world.teleport(next.x, next.y) ?? next;
}

/**
 * The shortest route (by steps) from `from` to the nearest tile `isGoal` accepts, at most
 * `maxSteps` long; null when there is none. The start tile itself is never the goal.
 */
export function shortestRoute(
	world: RouteWorld,
	from: RouteState,
	isGoal: (x: number, y: number) => boolean,
	maxSteps = Number.POSITIVE_INFINITY
): Route | null {
	interface Node {
		readonly state: RouteState;
		readonly parent: Node | null;
		readonly direction: GhostDirection | null;
		readonly depth: number;
	}
	const start: Node = { state: from, parent: null, direction: null, depth: 0 };
	const seen = new Set<string>([key(from.tile.x, from.tile.y, from.facing)]);
	let frontier: Node[] = [start];
	while (frontier.length > 0) {
		const nextFrontier: Node[] = [];
		for (const node of frontier) {
			if (node.depth >= maxSteps) {
				continue;
			}
			for (const direction of waysFrom(world, node.state)) {
				const tile = step(world, node.state.tile, direction);
				const id = key(tile.x, tile.y, direction);
				if (seen.has(id)) {
					continue;
				}
				seen.add(id);
				const child: Node = {
					state: { tile, facing: direction },
					parent: node,
					direction,
					depth: node.depth + 1
				};
				if (isGoal(tile.x, tile.y)) {
					const directions: GhostDirection[] = [];
					const tiles: GhostTile[] = [];
					for (let at: Node | null = child; at && at.parent; at = at.parent) {
						directions.push(at.direction as GhostDirection);
						tiles.push(at.state.tile);
					}
					directions.reverse();
					tiles.reverse();
					return { directions, tiles, end: child.state };
				}
				nextFrontier.push(child);
			}
		}
		frontier = nextFrontier;
	}
	return null;
}

export interface FeedPlan {
	readonly directions: readonly GhostDirection[];
	/** How many dots the plan eats on the way (the ones already eaten do not count). */
	readonly dots: number;
}

/**
 * Plans a ghost's feeding for `steps` tiles of walking: again and again to the nearest dot
 * that is still there (the dots passed on the way are eaten too, so a corridor already
 * eaten is never walked for nothing), until the steps are spent.
 */
export function planFeeding(
	world: RouteWorld,
	from: RouteState,
	hasDot: (x: number, y: number) => boolean,
	steps: number
): FeedPlan {
	const eaten = new Set<string>();
	const stillThere = (x: number, y: number) => hasDot(x, y) && !eaten.has(`${x},${y}`);
	const directions: GhostDirection[] = [];
	let state = from;
	let left = Math.max(0, Math.floor(steps));
	let dots = 0;
	while (left > 0) {
		const route = shortestRoute(world, state, stillThere, left);
		if (!route) {
			break;
		}
		for (const tile of route.tiles) {
			if (stillThere(tile.x, tile.y)) {
				eaten.add(`${tile.x},${tile.y}`);
				dots += 1;
			}
		}
		directions.push(...route.directions);
		left -= route.directions.length;
		state = route.end;
	}
	return { directions, dots };
}
