import { gravityMs, LOCK_DELAY_MS, SOFT_DROP_MS, SOFT_DROP_POINTS } from '../../config';
import { fits } from '../board';
import { Action, type GameState } from '../types';

export function fallInterval(state: GameState): number {
	const base = gravityMs(state.level);
	return state.input.held.has(Action.SOFT_DROP) ? Math.min(base, SOFT_DROP_MS) : base;
}

export function stepFall(state: GameState, dt: number): boolean {
	const piece = state.active;
	if (!piece) return false;
	const soft = state.input.held.has(Action.SOFT_DROP);
	const interval = fallInterval(state);
	state.gravityTimer += dt;
	while (state.gravityTimer >= interval) {
		if (!fits(state.board, piece, 0, 1)) {
			state.gravityTimer = 0;
			break;
		}
		state.gravityTimer -= interval;
		piece.y += 1;
		state.lastActionWasRotation = false;
		if (soft) state.score += SOFT_DROP_POINTS;
		if (piece.y > state.lowestY) {
			state.lowestY = piece.y;
			state.lockResets = 0;
			state.lockTimer = 0;
		}
	}
	if (fits(state.board, piece, 0, 1)) {
		state.lockTimer = 0;
		return false;
	}
	state.lockTimer += dt;
	return state.lockTimer >= LOCK_DELAY_MS;
}
