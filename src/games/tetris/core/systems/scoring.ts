import {
	BACK_TO_BACK_MULTIPLIER,
	CLEAR_POINTS,
	COMBO_POINTS,
	levelForLines,
	PERFECT_CLEAR_POINTS
} from '../../config';
import { isBlocked } from '../board';
import { PieceType, SpinKind, type ActivePiece, type ClearResult, type GameState } from '../types';

const CORNERS: readonly (readonly [number, number])[] = [
	[-1, -1],
	[1, -1],
	[1, 1],
	[-1, 1]
];

const FRONT_CORNERS: readonly (readonly [number, number])[] = [
	[0, 1],
	[1, 2],
	[2, 3],
	[3, 0]
];

export function detectSpin(state: GameState, piece: ActivePiece): SpinKind {
	if (piece.type !== PieceType.T || !state.lastActionWasRotation) return SpinKind.NONE;
	const cx = piece.x + 1;
	const cy = piece.y + 1;
	const occupied = CORNERS.map(([dx, dy]) => isBlocked(state.board, cx + dx, cy + dy));
	if (occupied.filter(Boolean).length < 3) return SpinKind.NONE;
	const [a, b] = FRONT_CORNERS[piece.rotation];
	if ((occupied[a] && occupied[b]) || state.lastKickIndex === 4) return SpinKind.FULL;
	return SpinKind.MINI;
}

export function scoreLock(state: GameState, rows: number[], spin: SpinKind): ClearResult {
	const count = rows.length;
	const level = state.level;
	const difficult = count > 0 && (count === 4 || spin !== SpinKind.NONE);
	const backToBack = difficult && state.backToBack;

	if (count > 0) {
		state.combo += 1;
		state.backToBack = difficult;
	} else {
		state.combo = -1;
	}

	const perfect =
		count > 0 && state.board.every((row, y) => rows.includes(y) || row.every((c) => c === 0));

	let points = (CLEAR_POINTS[spin][count] ?? 0) * level;
	if (backToBack) points *= BACK_TO_BACK_MULTIPLIER;
	if (state.combo > 0) points += COMBO_POINTS * state.combo * level;
	if (perfect) points += (PERFECT_CLEAR_POINTS[count] ?? 0) * level;
	points = Math.round(points);

	state.score += points;
	state.lines += count;
	if (state.mode.levelUp) {
		state.level = Math.max(state.level, levelForLines(state.lines, state.mode.startLevel));
	}
	state.maxCombo = Math.max(state.maxCombo, state.combo);
	if (count === 4) state.tetrises += 1;
	if (spin !== SpinKind.NONE) state.spins += 1;

	return { rows, count, spin, backToBack, combo: Math.max(0, state.combo), perfect, points };
}
