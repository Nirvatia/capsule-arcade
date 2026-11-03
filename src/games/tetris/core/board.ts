import { COLS, HIDDEN_ROWS, ROWS } from '../config';
import { pieceCells } from './pieces';
import type { ActivePiece, Cell, GameState } from './types';

export function createBoard(): Cell[][] {
	return Array.from({ length: ROWS }, () => new Array<Cell>(COLS).fill(0));
}

export function isBlocked(board: Cell[][], x: number, y: number): boolean {
	if (x < 0 || x >= COLS || y >= ROWS) return true;
	if (y < 0) return false;
	return board[y][x] !== 0;
}

export function fits(board: Cell[][], piece: ActivePiece, dx = 0, dy = 0): boolean {
	for (const [cx, cy] of pieceCells(piece.type, piece.rotation)) {
		if (isBlocked(board, piece.x + cx + dx, piece.y + cy + dy)) return false;
	}
	return true;
}

export function dropDistance(board: Cell[][], piece: ActivePiece): number {
	let d = 0;
	while (fits(board, piece, 0, d + 1)) d++;
	return d;
}

export function placePiece(board: Cell[][], piece: ActivePiece): boolean {
	let anyVisible = false;
	for (const [cx, cy] of pieceCells(piece.type, piece.rotation)) {
		const x = piece.x + cx;
		const y = piece.y + cy;
		if (y < 0 || y >= ROWS || x < 0 || x >= COLS) {
			throw new Error(`[Tetris/board] Locking piece outside the board at ${x},${y}`);
		}
		board[y][x] = piece.type;
		if (y >= HIDDEN_ROWS) anyVisible = true;
	}
	return anyVisible;
}

export function fullRows(board: Cell[][]): number[] {
	const rows: number[] = [];
	board.forEach((row, y) => {
		if (row.every((c) => c !== 0)) rows.push(y);
	});
	return rows;
}

export function removeRows(state: GameState, rows: readonly number[]): void {
	if (rows.length === 0) return;
	const kept = state.board.filter((_, y) => !rows.includes(y));
	while (kept.length < ROWS) kept.unshift(new Array<Cell>(COLS).fill(0));
	state.board = kept;
}

export function isBoardEmpty(board: Cell[][]): boolean {
	return board.every((row) => row.every((c) => c === 0));
}

export function stackHeight(board: Cell[][]): number {
	const top = board.findIndex((row) => row.some((c) => c !== 0));
	return top === -1 ? 0 : ROWS - top;
}
