export const ModeId = {
	MARATHON: 'marathon',
	SPRINT: 'sprint',
	ULTRA: 'ultra'
} as const;

export type ModeId = (typeof ModeId)[keyof typeof ModeId];

export interface GameMode {
	id: ModeId;
	title: string;
	subtitle: string;
	startLevel: number;
	levelUp: boolean;
	goalLines: number | null;
	timeLimitMs: number | null;
	rankByTime: boolean;
}

export const MODES: Readonly<Record<ModeId, GameMode>> = {
	[ModeId.MARATHON]: {
		id: ModeId.MARATHON,
		title: 'Пятилетка',
		subtitle: '20 пятилеток до коммунизма',
		startLevel: 1,
		levelUp: true,
		goalLines: 200,
		timeLimitMs: null,
		rankByTime: false
	},
	[ModeId.SPRINT]: {
		id: ModeId.SPRINT,
		title: 'Аврал',
		subtitle: '40 рядов — как можно быстрее',
		startLevel: 1,
		levelUp: false,
		goalLines: 40,
		timeLimitMs: null,
		rankByTime: true
	},
	[ModeId.ULTRA]: {
		id: ModeId.ULTRA,
		title: 'Ударная смена',
		subtitle: 'Максимум очков за 2 минуты',
		startLevel: 1,
		levelUp: true,
		goalLines: null,
		timeLimitMs: 120000,
		rankByTime: false
	}
};

export const MODE_LIST: readonly GameMode[] = [
	MODES[ModeId.MARATHON],
	MODES[ModeId.SPRINT],
	MODES[ModeId.ULTRA]
];

export function isModeId(value: unknown): value is ModeId {
	return typeof value === 'string' && Object.values(ModeId).some((id) => id === value);
}
