/** Кнопка пульта: 0 — Провести, 1 — Записать, 2 — Удалить, 3 — Ещё… */
export type Pad = 0 | 1 | 2 | 3;

export const PADS: readonly Pad[] = [0, 1, 2, 3];

export const PAD_LABELS: Readonly<Record<Pad, string>> = {
	0: 'Провести',
	1: 'Записать',
	2: 'Удалить',
	3: 'Ещё…'
};

export type Mode = 'classic' | 'orders';

export type Mood = 'normal' | 'happy' | 'shock' | 'angry' | 'coffee' | 'shout';

/** Источник случайности (подменяется в тестах). Возвращает число в [0, 1). */
export type Rng = () => number;

export function randomPad(rng: Rng): Pad {
	return Math.min(3, Math.floor(rng() * 4)) as Pad;
}

export function pick<T>(items: readonly T[], rng: Rng): T {
	return items[Math.min(items.length - 1, Math.floor(rng() * items.length))] as T;
}
