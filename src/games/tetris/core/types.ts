import type { GameMode } from './modes';

export const Phase = {
	IDLE: 'idle',
	COUNTDOWN: 'countdown',
	PLAYING: 'playing',
	CLEARING: 'clearing',
	PAUSED: 'paused',
	TOPOUT: 'topout',
	GAMEOVER: 'gameover'
} as const;

export type Phase = (typeof Phase)[keyof typeof Phase];

export const Action = {
	LEFT: 'left',
	RIGHT: 'right',
	SOFT_DROP: 'soft-drop',
	HARD_DROP: 'hard-drop',
	ROTATE_CW: 'rotate-cw',
	ROTATE_CCW: 'rotate-ccw',
	HOLD: 'hold'
} as const;

export type Action = (typeof Action)[keyof typeof Action];

export const PieceType = {
	I: 1,
	O: 2,
	T: 3,
	S: 4,
	Z: 5,
	J: 6,
	L: 7
} as const;

export type PieceType = (typeof PieceType)[keyof typeof PieceType];

export const CONCRETE = 8;

export type Cell = 0 | PieceType | typeof CONCRETE;

export type Rotation = 0 | 1 | 2 | 3;

export interface ActivePiece {
	type: PieceType;
	rotation: Rotation;
	x: number;
	y: number;
}

export const SpinKind = {
	NONE: 'none',
	MINI: 'mini',
	FULL: 'full'
} as const;

export type SpinKind = (typeof SpinKind)[keyof typeof SpinKind];

export interface ClearResult {
	rows: number[];
	count: number;
	spin: SpinKind;
	backToBack: boolean;
	combo: number;
	perfect: boolean;
	points: number;
}

export const EndReason = {
	TOPOUT: 'topout',
	GOAL: 'goal',
	TIME: 'time'
} as const;

export type EndReason = (typeof EndReason)[keyof typeof EndReason];

export interface InputState {
	dasMs: number;
	arrMs: number;
	held: Set<Action>;
	queue: Action[];
	shiftDir: -1 | 0 | 1;
	dasTimer: number;
	arrTimer: number;
}

export interface GameState {
	seed: number;
	mode: GameMode;
	elapsedMs: number;
	endReason: EndReason | null;
	phase: Phase;
	phaseTime: number;
	resumePhase: Phase;
	board: Cell[][];
	active: ActivePiece | null;
	hold: PieceType | null;
	holdUsed: boolean;
	queue: PieceType[];
	gravityTimer: number;
	lockTimer: number;
	lockResets: number;
	lowestY: number;
	lastActionWasRotation: boolean;
	lastKickIndex: number;
	clearing: ClearResult | null;
	score: number;
	lines: number;
	level: number;
	combo: number;
	backToBack: boolean;
	pieces: number;
	tetrises: number;
	spins: number;
	maxCombo: number;
	input: InputState;
}
