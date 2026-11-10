import type { GridService } from '../maze/GridService';
import { isLairToken } from '../maze/LairExit';

export interface DoomTile {
	readonly x: number;
	readonly y: number;
}

export type DoomDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

/** The lair's tiles, the boss's birth tile `DB` included. */
export function isLairSpace(grid: GridService, x: number, y: number): boolean {
	if (!grid.isInside(x, y)) {
		return false;
	}
	const token = grid.tileAt(x, y);
	return isLairToken(token) || token === 'DB';
}

/**
 * A tile of the corridors: walkable, and neither the lair nor a tunnel's pad. The boss's
 * attacks, blinks and dashes land and run on these only (a pad is a dead end he can be stuck
 * on; the lair is where he is born, not where he reappears).
 */
export function isCorridorTile(grid: GridService, x: number, y: number): boolean {
	return grid.isWalkable(x, y) && !grid.isTeleport(x, y) && !isLairSpace(grid, x, y);
}

export function doomTileKey(tile: DoomTile): string {
	return `${tile.x},${tile.y}`;
}

export function adjacentTile(from: DoomTile, direction: DoomDirection): DoomTile {
	switch (direction) {
		case 'UP':
			return { x: from.x, y: from.y - 1 };
		case 'DOWN':
			return { x: from.x, y: from.y + 1 };
		case 'LEFT':
			return { x: from.x - 1, y: from.y };
		case 'RIGHT':
			return { x: from.x + 1, y: from.y };
	}
}

export function oppositeDirection(direction: DoomDirection): DoomDirection {
	switch (direction) {
		case 'UP':
			return 'DOWN';
		case 'DOWN':
			return 'UP';
		case 'LEFT':
			return 'RIGHT';
		case 'RIGHT':
			return 'LEFT';
	}
}

export function bfsDistanceFrom(grid: GridService, origin: DoomTile): Map<string, number> {
	const distances = new Map<string, number>();
	const queue: Array<{ tile: DoomTile; distance: number }> = [];
	let head = 0;
	const originKey = doomTileKey(origin);
	distances.set(originKey, 0);
	queue.push({ tile: origin, distance: 0 });
	while (head < queue.length) {
		const current = queue[head++];
		const neighbors = grid.walkableNeighbors(current.tile.x, current.tile.y);
		for (const neighbor of neighbors) {
			const key = doomTileKey(neighbor);
			if (!distances.has(key)) {
				distances.set(key, current.distance + 1);
				queue.push({ tile: neighbor, distance: current.distance + 1 });
			}
		}
	}
	return distances;
}
