import { HIDDEN_ROWS, COLS } from '../config';
import { PieceType, type Rotation } from './types';

export type Offset = readonly [number, number];

const SHAPES: Record<PieceType, readonly string[]> = {
	[PieceType.I]: ['....', '####', '....', '....'],
	[PieceType.O]: ['##', '##'],
	[PieceType.T]: ['.#.', '###', '...'],
	[PieceType.S]: ['.##', '##.', '...'],
	[PieceType.Z]: ['##.', '.##', '...'],
	[PieceType.J]: ['#..', '###', '...'],
	[PieceType.L]: ['..#', '###', '...']
};

export const ALL_PIECES: readonly PieceType[] = [
	PieceType.I,
	PieceType.O,
	PieceType.T,
	PieceType.S,
	PieceType.Z,
	PieceType.J,
	PieceType.L
];

function toMatrix(rows: readonly string[]): boolean[][] {
	return rows.map((row) => Array.from(row, (ch) => ch === '#'));
}

function rotateCW(m: boolean[][]): boolean[][] {
	const n = m.length;
	return m.map((_, r) => m.map((__, c) => m[n - 1 - c][r]));
}

function toCells(m: boolean[][]): Offset[] {
	const cells: Offset[] = [];
	m.forEach((row, y) => row.forEach((filled, x) => filled && cells.push([x, y])));
	return cells;
}

function buildRotations(type: PieceType): readonly Offset[][] {
	const base = toMatrix(SHAPES[type]);
	if (base.length === 0 || base.some((row) => row.length !== base.length)) {
		throw new Error(`[Tetris/pieces] Shape ${type} must be a square matrix`);
	}
	const result: Offset[][] = [];
	let m = base;
	for (let i = 0; i < 4; i++) {
		result.push(toCells(m));
		m = rotateCW(m);
	}
	if (result[0].length !== 4) {
		throw new Error(`[Tetris/pieces] Shape ${type} must have 4 cells`);
	}
	return result;
}

const ROTATIONS: Record<PieceType, readonly Offset[][]> = Object.fromEntries(
	ALL_PIECES.map((t) => [t, buildRotations(t)])
) as Record<PieceType, readonly Offset[][]>;

export function pieceCells(type: PieceType, rotation: Rotation): readonly Offset[] {
	return ROTATIONS[type][rotation];
}

export function spawnPosition(type: PieceType): { x: number; y: number } {
	const size = SHAPES[type].length;
	const top = Math.min(...ROTATIONS[type][0].map(([, y]) => y));
	return { x: Math.floor((COLS - size) / 2), y: HIDDEN_ROWS - top };
}

type KickKey = `${Rotation}${Rotation}`;

const KICKS_JLSTZ: Record<string, readonly Offset[]> = {
	'01': [
		[0, 0],
		[-1, 0],
		[-1, 1],
		[0, -2],
		[-1, -2]
	],
	'10': [
		[0, 0],
		[1, 0],
		[1, -1],
		[0, 2],
		[1, 2]
	],
	'12': [
		[0, 0],
		[1, 0],
		[1, -1],
		[0, 2],
		[1, 2]
	],
	'21': [
		[0, 0],
		[-1, 0],
		[-1, 1],
		[0, -2],
		[-1, -2]
	],
	'23': [
		[0, 0],
		[1, 0],
		[1, 1],
		[0, -2],
		[1, -2]
	],
	'32': [
		[0, 0],
		[-1, 0],
		[-1, -1],
		[0, 2],
		[-1, 2]
	],
	'30': [
		[0, 0],
		[-1, 0],
		[-1, -1],
		[0, 2],
		[-1, 2]
	],
	'03': [
		[0, 0],
		[1, 0],
		[1, 1],
		[0, -2],
		[1, -2]
	]
};

const KICKS_I: Record<string, readonly Offset[]> = {
	'01': [
		[0, 0],
		[-2, 0],
		[1, 0],
		[-2, -1],
		[1, 2]
	],
	'10': [
		[0, 0],
		[2, 0],
		[-1, 0],
		[2, 1],
		[-1, -2]
	],
	'12': [
		[0, 0],
		[-1, 0],
		[2, 0],
		[-1, 2],
		[2, -1]
	],
	'21': [
		[0, 0],
		[1, 0],
		[-2, 0],
		[1, -2],
		[-2, 1]
	],
	'23': [
		[0, 0],
		[2, 0],
		[-1, 0],
		[2, 1],
		[-1, -2]
	],
	'32': [
		[0, 0],
		[-2, 0],
		[1, 0],
		[-2, -1],
		[1, 2]
	],
	'30': [
		[0, 0],
		[1, 0],
		[-2, 0],
		[1, -2],
		[-2, 1]
	],
	'03': [
		[0, 0],
		[-1, 0],
		[2, 0],
		[-1, 2],
		[2, -1]
	]
};

const NO_KICKS: readonly Offset[] = [[0, 0]];

export function kicksFor(type: PieceType, from: Rotation, to: Rotation): readonly Offset[] {
	if (type === PieceType.O) return NO_KICKS;
	const key: KickKey = `${from}${to}`;
	const table = type === PieceType.I ? KICKS_I : KICKS_JLSTZ;
	const kicks = table[key];
	if (!kicks) {
		throw new Error(`[Tetris/pieces] Missing kick data ${key} for piece ${type}`);
	}
	return kicks;
}
