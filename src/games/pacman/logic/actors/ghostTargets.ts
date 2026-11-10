import type { GridService } from '../maze/GridService';
import type { LevelProgress } from '../level/LevelProgress';
import type { GhostDirection, GhostKind, GhostTile } from './GhostModel';

/**
 * Where each ghost heads: the classic scatter corners, chase targets and flight, and the
 * hypnotised ghost's food. Pure functions of the tiles involved.
 */

export const VECTORS: Record<GhostDirection, { x: number; y: number }> = {
	UP: { x: 0, y: -1 },
	DOWN: { x: 0, y: 1 },
	LEFT: { x: -1, y: 0 },
	RIGHT: { x: 1, y: 0 }
};

/** Tie-break order of the arcade: up, left, down, right. */
export const DIRECTIONS: readonly GhostDirection[] = ['UP', 'LEFT', 'DOWN', 'RIGHT'];

export const SCATTER_TARGETS: Record<GhostKind, GhostTile> = {
	BLINKY: { x: 22, y: 2 },
	PINKY: { x: 2, y: 2 },
	INKY: { x: 22, y: 23 },
	CLYDE: { x: 2, y: 23 }
};

export function distanceSq(a: GhostTile, b: GhostTile): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	return dx * dx + dy * dy;
}

/** The tile `steps` tiles from `point` along `direction` (may lie outside the maze). */
export function ahead(
	point: GhostTile,
	direction: GhostDirection | null,
	steps: number
): GhostTile {
	if (!direction) {
		return point;
	}
	const vector = VECTORS[direction];
	return { x: point.x + vector.x * steps, y: point.y + vector.y * steps };
}

export function oppositeDirection(direction: GhostDirection): GhostDirection {
	if (direction === 'UP') {
		return 'DOWN';
	}
	if (direction === 'DOWN') {
		return 'UP';
	}
	if (direction === 'LEFT') {
		return 'RIGHT';
	}
	return 'LEFT';
}

export interface ChaseContext {
	readonly player: GhostTile;
	readonly playerFacing: GhostDirection | null;
	/** Blinky's tile (Inky's pivot); null when Blinky is missing. */
	readonly blinky: GhostTile | null;
}

/**
 * The classic chase targets: Blinky the player, Pinky four tiles ahead, Inky Blinky's
 * vector doubled through two tiles ahead, Clyde the player when far, his corner when near.
 */
export function chaseTarget(kind: GhostKind, ghost: GhostTile, ctx: ChaseContext): GhostTile {
	const { player, playerFacing } = ctx;
	if (kind === 'BLINKY') {
		return player;
	}
	if (kind === 'PINKY') {
		return ahead(player, playerFacing, 4);
	}
	if (kind === 'INKY') {
		const pivot = ahead(player, playerFacing, 2);
		if (!ctx.blinky) {
			return pivot;
		}
		return { x: pivot.x + (pivot.x - ctx.blinky.x), y: pivot.y + (pivot.y - ctx.blinky.y) };
	}
	return distanceSq(ghost, player) > 64 ? player : SCATTER_TARGETS.CLYDE;
}

/** A frightened ghost runs to the point mirrored away from the player. */
export function fleeTarget(kind: GhostKind, ghost: GhostTile, player: GhostTile): GhostTile {
	const dx = ghost.x - player.x;
	const dy = ghost.y - player.y;
	if (dx === 0 && dy === 0) {
		return SCATTER_TARGETS[kind];
	}
	return { x: ghost.x + dx * 2, y: ghost.y + dy * 2 };
}

/** The uneaten dot closest to `from` in a straight line; null when none is left. */
export function nearestDotTarget(
	grid: GridService,
	progress: LevelProgress,
	from: GhostTile
): GhostTile | null {
	let best: GhostTile | null = null;
	let bestScore = Number.POSITIVE_INFINITY;
	for (let y = 0; y < grid.height; y += 1) {
		for (let x = 0; x < grid.width; x += 1) {
			if (grid.tileAt(x, y) !== 'DT' || progress.isCollected(x, y)) {
				continue;
			}
			const score = distanceSq(from, { x, y });
			if (score < bestScore) {
				bestScore = score;
				best = { x, y };
			}
		}
	}
	return best;
}
