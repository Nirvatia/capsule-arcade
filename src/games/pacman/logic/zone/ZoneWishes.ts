/**
 * The Wish Granter: three wishes on offer, each a gift with a price (the monkey's paw). A wish
 * changes the next level: `Modifiers` are read by `ZoneService`.
 */
export interface Modifiers {
	readonly hpBonus: number;
	readonly heroSpeed: number;
	readonly tushkanSpeed: number;
	/** 1 is the normal calm between emissions; 0.5 is half as long. */
	readonly calmScale: number;
	readonly noEmission: boolean;
	readonly boltMax: number;
	readonly anomalyScale: number;
	/** Fewer seconds between the poltergeist's throws: 1 normal, 0.5 twice as often. */
	readonly poltergeistPause: number;
	readonly score: number;
}

export const NO_MODIFIERS: Modifiers = {
	hpBonus: 0,
	heroSpeed: 1,
	tushkanSpeed: 1,
	calmScale: 1,
	noEmission: false,
	boltMax: 3,
	anomalyScale: 1,
	poltergeistPause: 1,
	score: 0
};

export interface Wish {
	readonly id: string;
	readonly title: string;
	readonly boon: string;
	readonly price: string;
	readonly effect: Partial<Modifiers>;
}

export const WISHES: readonly Wish[] = [
	{
		id: 'health',
		title: 'Здоровье',
		boon: '+2 жизни на уровень',
		price: 'Выбросы вдвое чаще',
		effect: { hpBonus: 2, calmScale: 0.5 }
	},
	{
		id: 'speed',
		title: 'Лёгкие ноги',
		boon: 'Ты быстрее на 15%',
		price: 'Тушканы быстрее на 30%',
		effect: { heroSpeed: 1.15, tushkanSpeed: 1.3 }
	},
	{
		id: 'stock',
		title: 'Карманы',
		boon: '5 болтов в запасе вместо 3',
		price: 'Аномалий на 60% больше',
		effect: { boltMax: 5, anomalyScale: 1.6 }
	},
	{
		id: 'calm',
		title: 'Тишина',
		boon: 'Выбросов больше нет',
		price: 'Полтергейст бросает вдвое чаще',
		effect: { noEmission: true, poltergeistPause: 0.5 }
	},
	{
		id: 'gold',
		title: 'Золото',
		boon: '+5000 очков',
		price: 'Болтов нет совсем',
		effect: { score: 5000, boltMax: 0 }
	},
	{
		id: 'luck',
		title: 'Везение',
		boon: 'Тушканы медленнее на 25%',
		price: 'Ты медленнее на 10%',
		effect: { tushkanSpeed: 0.75, heroSpeed: 0.9 }
	}
];

/** Three different wishes, picked by `pick` (a 0..1 random). */
export function offerWishes(pick: () => number): Wish[] {
	const pool = [...WISHES];
	const out: Wish[] = [];
	while (out.length < 3 && pool.length > 0) {
		out.push(pool.splice(Math.floor(pick() * pool.length), 1)[0]);
	}
	return out;
}

export function applyWish(base: Modifiers, wish: Wish): Modifiers {
	return { ...base, ...wish.effect };
}
