import { MAX_LOCK_RESETS } from '../../config';
import { fits } from '../board';
import { kicksFor } from '../pieces';
import type { GameState, Rotation } from '../types';

function registerManipulation(state: GameState): void {
	const piece = state.active;
	if (!piece) return;
	const grounded = !fits(state.board, piece, 0, 1);
	if ((grounded || state.lockTimer > 0) && state.lockResets < MAX_LOCK_RESETS) {
		state.lockTimer = 0;
		state.lockResets += 1;
	}
}

export function shift(state: GameState, dx: -1 | 1): boolean {
	const piece = state.active;
	if (!piece || !fits(state.board, piece, dx, 0)) return false;
	piece.x += dx;
	state.lastActionWasRotation = false;
	registerManipulation(state);
	return true;
}

export function rotate(state: GameState, dir: 1 | -1): { ok: boolean; kicked: boolean } {
	const piece = state.active;
	if (!piece) return { ok: false, kicked: false };
	const from = piece.rotation;
	const to = ((from + dir + 4) % 4) as Rotation;
	const kicks = kicksFor(piece.type, from, to);
	for (let i = 0; i < kicks.length; i++) {
		const [kx, ky] = kicks[i];
		const candidate = { ...piece, rotation: to, x: piece.x + kx, y: piece.y - ky };
		if (fits(state.board, candidate)) {
			piece.rotation = to;
			piece.x = candidate.x;
			piece.y = candidate.y;
			state.lastActionWasRotation = true;
			state.lastKickIndex = i;
			registerManipulation(state);
			return { ok: true, kicked: i > 0 };
		}
	}
	return { ok: false, kicked: false };
}
