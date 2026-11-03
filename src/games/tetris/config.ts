import { SpinKind } from './core/types';

export const COLS = 10;
export const VISIBLE_ROWS = 20;
export const HIDDEN_ROWS = 2;
export const ROWS = VISIBLE_ROWS + HIDDEN_ROWS;
export const PREVIEW_COUNT = 5;

export const TICK_MS = 1000 / 120;
export const MAX_TICKS_PER_FRAME = 24;

export const COUNTDOWN_STEP_MS = 520;
export const COUNTDOWN_STEPS = 3;
export const CLEAR_MS = 420;
export const TOPOUT_MS = 1100;

export const LOCK_DELAY_MS = 500;
export const MAX_LOCK_RESETS = 15;
export const SOFT_DROP_MS = 33;

export const DAS_MS = 150;
export const ARR_MS = 40;

export const START_LEVEL = 1;
export const MAX_LEVEL = 20;
export const LINES_PER_LEVEL = 10;

export function gravityMs(level: number): number {
	const l = Math.min(Math.max(level, START_LEVEL), MAX_LEVEL) - 1;
	return Math.max(1, Math.pow(0.8 - l * 0.007, l) * 1000);
}

export function levelForLines(lines: number, startLevel = START_LEVEL): number {
	return Math.min(MAX_LEVEL, startLevel + Math.floor(Math.max(0, lines) / LINES_PER_LEVEL));
}

export const SOFT_DROP_POINTS = 1;
export const HARD_DROP_POINTS = 2;
export const COMBO_POINTS = 50;
export const BACK_TO_BACK_MULTIPLIER = 1.5;

export const CLEAR_POINTS: Record<SpinKind, readonly number[]> = {
	[SpinKind.NONE]: [0, 100, 300, 500, 800],
	[SpinKind.MINI]: [100, 200, 400, 400, 400],
	[SpinKind.FULL]: [400, 800, 1200, 1600, 1600]
};

export const PERFECT_CLEAR_POINTS: readonly number[] = [0, 800, 1200, 1800, 2000];
