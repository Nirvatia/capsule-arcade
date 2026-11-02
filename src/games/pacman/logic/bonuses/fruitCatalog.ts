export const FRUIT = {
	CHERRY: 'CHERRY',
	STRAWBERRY: 'STRAWBERRY',
	ORANGE: 'ORANGE',
	PRETZEL: 'PRETZEL',
	APPLE: 'APPLE',
	PEAR: 'PEAR',
	MELON: 'MELON',
	GALAXIAN: 'GALAXIAN',
	BELL: 'BELL',
	KEY: 'KEY'
} as const;

export type FruitKind = (typeof FRUIT)[keyof typeof FRUIT];

/** Every fruit kind, by value (the dev panel lists them in this order). */
export const FRUIT_ORDER: readonly FruitKind[] = [
	FRUIT.CHERRY,
	FRUIT.STRAWBERRY,
	FRUIT.ORANGE,
	FRUIT.PRETZEL,
	FRUIT.APPLE,
	FRUIT.PEAR,
	FRUIT.MELON,
	FRUIT.GALAXIAN,
	FRUIT.BELL,
	FRUIT.KEY
];

export interface FruitInfo {
	readonly kind: FruitKind;
	readonly name: string;
	readonly description: string;
}

export const FRUIT_CATALOG: readonly FruitInfo[] = [
	{
		kind: FRUIT.CHERRY,
		name: 'Cherry',
		description: 'Ранний низкорисковый бонус.'
	},
	{
		kind: FRUIT.STRAWBERRY,
		name: 'Strawberry',
		description: 'Ранний/средний рисковый бонус.'
	},
	{
		kind: FRUIT.ORANGE,
		name: 'Orange',
		description: 'Средний бонус рядом с маршрутами призраков.'
	},
	{
		kind: FRUIT.PRETZEL,
		name: 'Pretzel',
		description: 'Средний бонус на пересечении маршрутов призраков.'
	},
	{
		kind: FRUIT.APPLE,
		name: 'Apple',
		description: 'Повышенный бонус в более опасной зоне.'
	},
	{
		kind: FRUIT.PEAR,
		name: 'Pear',
		description: 'Повышенный бонус, требует короткого отклонения от маршрута.'
	},
	{
		kind: FRUIT.MELON,
		name: 'Melon',
		description: 'Высокий бонус, требует отклонения от безопасного маршрута.'
	},
	{
		kind: FRUIT.GALAXIAN,
		name: 'Galaxian',
		description: 'Редкий бонус, часто рядом с телепортом или логовом.'
	},
	{
		kind: FRUIT.BELL,
		name: 'Bell',
		description: 'Премиальный бонус в зоне высокого давления.'
	},
	{
		kind: FRUIT.KEY,
		name: 'Key',
		description: 'Максимальный фруктовый бонус, самая рискованная цель.'
	}
];

/** Pac-Man's fruit by level (arcade order), the key from level 13 on. */
export const PACMAN_FRUIT_BY_LEVEL: readonly FruitKind[] = [
	FRUIT.CHERRY,
	FRUIT.STRAWBERRY,
	FRUIT.ORANGE,
	FRUIT.ORANGE,
	FRUIT.APPLE,
	FRUIT.APPLE,
	FRUIT.MELON,
	FRUIT.MELON,
	FRUIT.GALAXIAN,
	FRUIT.GALAXIAN,
	FRUIT.BELL,
	FRUIT.BELL,
	FRUIT.KEY
];

/**
 * Ms. Pac-Man's fruit for levels 1–7 (arcade order; the melon stands in for the banana,
 * which the game does not have); from level 8 one of these at random.
 */
export const MS_FRUIT_BY_LEVEL: readonly FruitKind[] = [
	FRUIT.CHERRY,
	FRUIT.STRAWBERRY,
	FRUIT.ORANGE,
	FRUIT.PRETZEL,
	FRUIT.APPLE,
	FRUIT.PEAR,
	FRUIT.MELON
];

/** A fixed pseudo-random 0..1 per level, so the HUD row and the board agree. */
function levelRandom(level: number): number {
	const v = Math.sin(level * 12.9898 + 4.1414) * 43758.5453;
	return v - Math.floor(v);
}

/** The fruit of `level` for a hero: the arcade orders, Ms. Pac-Man's random from level 8. */
export function fruitForLevel(
	level: number,
	profile: 'pacman' | 'ms-pacman' = 'pacman'
): FruitKind {
	if (!Number.isFinite(level) || level < 1) {
		console.error('fruitCatalog.fruitForLevel', 'invalid level', level);
	}
	const safeLevel = Number.isFinite(level) && level >= 1 ? Math.floor(level) : 1;
	if (profile === 'ms-pacman') {
		const table = MS_FRUIT_BY_LEVEL;
		const index =
			safeLevel <= table.length
				? safeLevel - 1
				: Math.floor(levelRandom(safeLevel) * table.length) % table.length;
		return table[index];
	}
	const table = PACMAN_FRUIT_BY_LEVEL;
	return table[Math.min(safeLevel, table.length) - 1];
}
