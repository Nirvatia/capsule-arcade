// Классический Simon: каждый раунд к последовательности добавляется один шаг,
// игрок повторяет её целиком. Одна ошибка или пауза дольше таймаута — конец игры.
// Начиная с 6-го, 10-го и 14-го шага показ ускоряется, как в оригинальном автомате.

import { randomPad, type Pad, type Rng } from './types';

export const CLASSIC_START_DELAY_MS = 700;
export const CLASSIC_INPUT_TIMEOUT_MS = 3000;
export const CLASSIC_ROUND_PAUSE_MS = 900;

export interface PlaybackTiming {
	readonly onMs: number;
	readonly gapMs: number;
}

export function extendSequence(sequence: readonly Pad[], rng: Rng): Pad[] {
	return [...sequence, randomPad(rng)];
}

export function playbackTiming(length: number): PlaybackTiming {
	if (length <= 5) return { onMs: 420, gapMs: 180 };
	if (length <= 9) return { onMs: 320, gapMs: 140 };
	if (length <= 13) return { onMs: 250, gapMs: 110 };
	return { onMs: 200, gapMs: 90 };
}

export interface PlaybackFrame {
	/** Индекс текущего шага; -1 — ещё стартовая пауза. */
	readonly step: number;
	/** Горит ли сейчас кнопка шага. */
	readonly lit: boolean;
	/** Показ закончен — пора передавать ход игроку. */
	readonly done: boolean;
}

export function playbackFrame(elapsedMs: number, length: number): PlaybackFrame {
	const t = elapsedMs - CLASSIC_START_DELAY_MS;
	if (t < 0) return { step: -1, lit: false, done: false };

	const { onMs, gapMs } = playbackTiming(length);
	const period = onMs + gapMs;
	const step = Math.floor(t / period);
	if (step >= length) return { step: length, lit: false, done: true };

	return { step, lit: t - step * period < onMs, done: false };
}
