// Все числа игры в одном месте. Симуляция и рендер читают только отсюда.

export const COLS = 22;
export const ROWS = 13;
/** Логический размер клетки в CSS-пикселях. GameStage масштабирует сцену целиком. */
export const CELL_PX = 40;

/** Колонны, которые поднимаются из пола в акте PILLAR_ACT. Периметр — стены всегда. */
export const PILLARS: readonly (readonly [number, number])[] = [
	[5, 4],
	[16, 4],
	[5, 8],
	[16, 8]
];

/** Факелы на стенах (клетки стен). */
export const TORCHES: readonly (readonly [number, number])[] = [
	[5, 0],
	[16, 0],
	[0, 6],
	[21, 6]
];

export const SIM = {
	FIXED_MS: 1000 / 60,
	START_COL: 6,
	START_ROW: 6,
	START_LEN: 4,
	MIN_LEN: 4,
	INPUT_QUEUE: 3,

	SCARABS: 5,
	SCARAB_SPAWN_MIN_DIST: 3,
	SCARAB_MOVE_MIN_MS: 700,
	SCARAB_MOVE_MAX_MS: 1400,
	SCARAB_FLEE_MS: 340,
	SCARAB_FLEE_DIST: 2,
	SCARAB_IDLE_CHANCE: 0.35,

	ALPHA_MOVE_MS: 900,
	ALPHA_FLEE_MS: 480,
	ALPHA_FLEE_DIST: 3,
	ALPHA_SPAWN_DELAY_MS: 1500,
	ALPHA_SPAWN_MIN_DIST: 6,
	ALPHA_ESCAPE_MS: 560,

	/** Область больше этого не считается кольцом (змея просто перегородила поле). */
	MAX_ENCLOSE: 24,
	/** После удачного удара змея «переваривает»: длина = кольцо + DIGEST_EXTRA. */
	DIGEST_EXTRA: 2,
	FAIL_TAIL_LOSS: 2,
	/** Удар головой в Альфу: не смерть, а укус — минус хвост, Альфа отпрыгивает. */
	BITE_TAIL_LOSS: 2,
	PILLAR_ACT: 3,
	KILLS_PER_ACT: 3,

	RUNE_FROM_ACT: 2,
	RUNE_EVERY_MS: 12000,
	RUNE_LIFE_MS: 10000,

	/** Доля единиц у скарабеев, пока активна печать AND. */
	AND_ONE_BIAS: 0.7
} as const;

export const SCORE = {
	EAT: 10,
	KILL_BASE: 100,
	KILL_PER_SEGMENT: 10,
	BONUS_PREY: 25,
	MAX_MULTIPLIER: 5
} as const;

export function stepInterval(act: number): number {
	return Math.max(85, 150 - (act - 1) * 12);
}

export const MUSIC_SRC = '/assets/snake/music/theme.mp3';
