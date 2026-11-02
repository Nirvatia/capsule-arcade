import type { GridService } from '../maze/GridService';
import type { GridPoint } from '../maze/GridModel';
import type { PlayerService } from '../actors/PlayerService';
import type { DoomDirection } from './DoomGraph';
import { adjacentTile, doomTileKey, oppositeDirection } from './DoomGraph';
import { tileDistance } from './DoomAttackCore';
import type { DoomSegment } from './DoomHazards';
import { distanceRings, straightSegment } from './DoomHazards';
import {
	BLINK_DEST_MAX_DIST,
	BLINK_DEST_MIN_DIST,
	RIFT_MIN_LENGTH,
	SEAL_MAX_DIST,
	SEAL_MIN_DIST,
	SEAL_TELEGRAPH,
	SPLIT_MIN_END_DIST,
	SPLIT_MIN_LENGTH
} from './DoomBalance';

/**
 * Where the boss's attacks land: tiles and corridors picked around the player. Pure
 * functions of the grid and the actors (the seal and blink picks use `Math.random`).
 */

/** The tile the player stands on. */
export function playerTileOf(player: PlayerService): GridPoint {
	const pos = player.position;
	return { x: Math.floor(pos.x), y: Math.floor(pos.y) };
}

export function segmentKeys(segment: DoomSegment): Set<string> {
	return new Set(segment.tiles.map(doomTileKey));
}

/** The player's heading axis first, then the other one. */
function axesFor(facing: DoomDirection | null): ['x' | 'y', 'x' | 'y'] {
	return facing === 'UP' || facing === 'DOWN' ? ['y', 'x'] : ['x', 'y'];
}

/** The corridor the player runs along (falls back to the other axis). */
export function riftSegment(
	grid: GridService,
	facing: DoomDirection | null,
	playerTile: GridPoint
): DoomSegment | null {
	for (const axis of axesFor(facing)) {
		const segment = straightSegment(grid, playerTile, axis);
		if (segment.tiles.length >= RIFT_MIN_LENGTH) {
			return segment;
		}
	}
	return null;
}

/** A long corridor with the player well inside it, so both ends can close in. */
export function splitSegmentFor(
	grid: GridService,
	facing: DoomDirection | null,
	playerTile: GridPoint
): DoomSegment | null {
	for (const axis of axesFor(facing)) {
		const segment = straightSegment(grid, playerTile, axis);
		const n = segment.tiles.length;
		if (n < SPLIT_MIN_LENGTH) {
			continue;
		}
		const i = segment.tiles.findIndex((t) => t.x === playerTile.x && t.y === playerTile.y);
		if (i >= SPLIT_MIN_END_DIST && n - 1 - i >= SPLIT_MIN_END_DIST) {
			return segment;
		}
	}
	return null;
}

/**
 * Where the player is going: straight on along the heading, and at a corner or a
 * junction the turn the player has asked for, else the first way that is not back.
 * Element 0 is the player's tile.
 */
export function predictPlayerPath(
	grid: GridService,
	player: PlayerService,
	from: GridPoint,
	length: number
): GridPoint[] {
	const path: GridPoint[] = [from];
	let dir: DoomDirection | null = player.facing ?? player.desired;
	if (!dir) {
		return path;
	}
	const open = (tile: GridPoint, d: DoomDirection): boolean => {
		const n = adjacentTile(tile, d);
		return grid.isPlayerWalkable(n.x, n.y) && !grid.isTeleport(n.x, n.y);
	};
	const order: readonly DoomDirection[] = ['UP', 'LEFT', 'DOWN', 'RIGHT'];
	let tile = from;
	while (path.length <= length) {
		const wanted = player.desired;
		const back = oppositeDirection(dir);
		if (path.length > 1 && wanted && wanted !== back && wanted !== dir && open(tile, wanted)) {
			dir = wanted;
		} else if (!open(tile, dir)) {
			const turn = order.find((d) => d !== back && open(tile, d));
			if (!turn) {
				break;
			}
			dir = turn;
		}
		tile = adjacentTile(tile, dir);
		path.push(tile);
	}
	return path;
}

export interface SealPickContext {
	readonly grid: GridService;
	readonly player: PlayerService;
	readonly playerTile: GridPoint;
	readonly bossTile: GridPoint;
	readonly playerSpeed: number;
	readonly protectedTileKeys: ReadonlySet<string>;
}

/**
 * Seals aimed at the player's way: the tile the player reaches just as the seals burn
 * (a junction when one is near that point), the next junction past it, then other
 * junctions around, spread apart.
 */
export function pickSeals(ctx: SealPickContext, count: number): GridPoint[] {
	if (count <= 0) {
		return [];
	}
	const { grid, playerTile, bossTile } = ctx;
	const usable = (tile: GridPoint): boolean =>
		!ctx.protectedTileKeys.has(doomTileKey(tile)) &&
		!grid.isVoidBlocked(tile.x, tile.y) &&
		!grid.isTeleport(tile.x, tile.y) &&
		!(tile.x === bossTile.x && tile.y === bossTile.y);
	const picked: GridPoint[] = [];
	const take = (tile: GridPoint | undefined): void => {
		if (
			tile &&
			picked.length < count &&
			usable(tile) &&
			picked.every((p) => tileDistance(p, tile) >= 3)
		) {
			picked.push(tile);
		}
	};
	const path = predictPlayerPath(grid, ctx.player, playerTile, SEAL_MAX_DIST + 4);
	const aim = Math.round(SEAL_TELEGRAPH * ctx.playerSpeed);
	const isJunction = (tile: GridPoint): boolean => grid.exitsCount(tile.x, tile.y) >= 3;
	let best = -1;
	let bestScore = Infinity;
	for (let d = SEAL_MIN_DIST; d < Math.min(path.length, SEAL_MAX_DIST + 1); d += 1) {
		// a junction within a tile of the aim point wins over a plain corridor tile
		const score = Math.abs(d - aim) - (isJunction(path[d]) ? 1.5 : 0);
		if (usable(path[d]) && score < bestScore) {
			best = d;
			bestScore = score;
		}
	}
	if (best >= 0) {
		take(path[best]);
		take(path.slice(best + 1).find(isJunction));
	}
	const rings = distanceRings(grid, playerTile, SEAL_MAX_DIST);
	const candidates: GridPoint[] = [];
	for (let d = SEAL_MIN_DIST; d < rings.length; d += 1) {
		candidates.push(...rings[d].filter(isJunction));
	}
	for (let i = candidates.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[candidates[i], candidates[j]] = [candidates[j], candidates[i]];
	}
	for (const tile of candidates) {
		take(tile);
	}
	return picked;
}

/**
 * Ambush pursuit: when the player is not close, head for the intersection the player
 * is running into instead of the player's current tile.
 */
export function chaseTargetTile(
	grid: GridService,
	bossTile: GridPoint,
	player: PlayerService
): GridPoint {
	const playerTile = playerTileOf(player);
	const facing = player.facing;
	if (!facing || tileDistance(bossTile, playerTile) <= 4) {
		return playerTile;
	}
	let tile = playerTile;
	for (let step = 0; step < 6; step += 1) {
		const next = adjacentTile(tile, facing);
		if (!grid.isWalkable(next.x, next.y)) {
			break;
		}
		tile = next;
		if (grid.exitsCount(tile.x, tile.y) >= 3) {
			return tile;
		}
	}
	return tile;
}

/** A junction in blink range, out of the player's line of sight, preferably closer. */
export function findBlinkTarget(
	grid: GridService,
	bossTile: GridPoint,
	playerTile: GridPoint,
	barrel: GridPoint | null
): GridPoint | null {
	const candidates: GridPoint[] = [];
	for (let y = 0; y < grid.height; y += 1) {
		for (let x = 0; x < grid.width; x += 1) {
			if (!grid.isWalkable(x, y) || grid.isVoidBlocked(x, y) || grid.exitsCount(x, y) < 3) {
				continue;
			}
			const dist = tileDistance({ x, y }, playerTile);
			if (dist < BLINK_DEST_MIN_DIST || dist > BLINK_DEST_MAX_DIST) {
				continue;
			}
			if (barrel && barrel.x === x && barrel.y === y) {
				continue;
			}
			if (seesAlongLine(grid, { x, y }, playerTile)) {
				continue;
			}
			candidates.push({ x, y });
		}
	}
	if (candidates.length === 0) {
		return null;
	}
	const bossDist = tileDistance(bossTile, playerTile);
	const closer = candidates.filter((c) => tileDistance(c, playerTile) < bossDist);
	const pool = closer.length > 0 ? closer : candidates;
	return pool[Math.floor(Math.random() * pool.length)];
}

/** True when `from` and `to` share a row or column with open tiles all the way between. */
export function seesAlongLine(grid: GridService, from: GridPoint, to: GridPoint): boolean {
	if (from.x !== to.x && from.y !== to.y) {
		return false;
	}
	const stepX = Math.sign(to.x - from.x);
	const stepY = Math.sign(to.y - from.y);
	let x = from.x + stepX;
	let y = from.y + stepY;
	while (x !== to.x || y !== to.y) {
		if (!grid.isInside(x, y) || !grid.isWalkable(x, y)) {
			return false;
		}
		x += stepX;
		y += stepY;
	}
	return true;
}

/** True when blocking `candidate` leaves every player-walkable tile reachable. */
export function keepsPlayerGraphConnected(
	grid: GridService,
	candidate: GridPoint,
	playerTile: GridPoint
): boolean {
	if (!grid.isPlayerWalkable(playerTile.x, playerTile.y)) {
		return false;
	}
	let total = 0;
	for (let y = 0; y < grid.height; y += 1) {
		for (let x = 0; x < grid.width; x += 1) {
			if ((x !== candidate.x || y !== candidate.y) && grid.isPlayerWalkable(x, y)) {
				total += 1;
			}
		}
	}
	const visited = new Set<string>();
	const queue: GridPoint[] = [playerTile];
	visited.add(`${playerTile.x},${playerTile.y}`);
	let head = 0;
	while (head < queue.length) {
		const current = queue[head];
		head += 1;
		for (const neighbor of grid.walkableNeighbors(current.x, current.y)) {
			if (neighbor.x === candidate.x && neighbor.y === candidate.y) {
				continue;
			}
			if (!grid.isPlayerWalkable(neighbor.x, neighbor.y)) {
				continue;
			}
			const key = `${neighbor.x},${neighbor.y}`;
			if (!visited.has(key)) {
				visited.add(key);
				queue.push(neighbor);
			}
		}
	}
	return visited.size >= total;
}

export function aheadTile(
	tile: GridPoint,
	direction: DoomDirection | null,
	steps: number
): GridPoint {
	if (!direction) {
		return tile;
	}
	let result = tile;
	for (let i = 0; i < steps; i += 1) {
		result = adjacentTile(result, direction);
	}
	return result;
}

/** The maze corner (two tiles in from the edge) closest to `from`. */
export function nearestCorner(grid: GridService, from: GridPoint): GridPoint {
	const corners: GridPoint[] = [
		{ x: 2, y: 2 },
		{ x: 2, y: grid.height - 3 },
		{ x: grid.width - 3, y: 2 },
		{ x: grid.width - 3, y: grid.height - 3 }
	];
	let best = corners[0];
	let bestDist = Number.POSITIVE_INFINITY;
	for (const corner of corners) {
		const d = tileDistance(corner, from);
		if (d < bestDist) {
			bestDist = d;
			best = corner;
		}
	}
	return best;
}
