import { MAX_LEVEL } from '../config';
import { PieceType } from '../core/types';
import { ModeId } from '../core/modes';
import { EndReason } from '../core/types';
import type { GameSummary } from '../engine/EventBus';

export const LEVEL_NAMES: readonly string[] = [
	'Котлован',
	'Фундамент',
	'Цоколь',
	'Первый этаж',
	'Хрущёвка',
	'Панелька',
	'Плотина',
	'Домна',
	'ГЭС',
	'Метро',
	'БАМ',
	'Целина',
	'Высотка',
	'Телебашня',
	'Космодром',
	'Атомград',
	'Наукоград',
	'Луноход',
	'Город-сад',
	'Коммунизм'
];

export function levelName(level: number): string {
	const index = Math.min(Math.max(Math.floor(level), 1), MAX_LEVEL) - 1;
	return LEVEL_NAMES[index] ?? LEVEL_NAMES[0];
}

export interface Rank {
	title: string;
	short: string;
	min: number;
}

const SCORE_RANKS: readonly Rank[] = [
	{ title: 'Стажёр', short: 'Стажёр', min: 0 },
	{ title: 'Разнорабочий', short: 'Разнорабочий', min: 5000 },
	{ title: 'Передовик производства', short: 'Передовик', min: 15000 },
	{ title: 'Ударник коммунистического труда', short: 'Ударник', min: 40000 },
	{ title: 'Стахановец', short: 'Стахановец', min: 100000 },
	{ title: 'Герой Социалистического Труда', short: 'Герой Соцтруда', min: 250000 }
];

const SPRINT_RANKS: readonly { rank: Rank; maxMs: number }[] = [
	{ rank: SCORE_RANKS[5], maxMs: 60000 },
	{ rank: SCORE_RANKS[4], maxMs: 90000 },
	{ rank: SCORE_RANKS[3], maxMs: 120000 },
	{ rank: SCORE_RANKS[2], maxMs: 180000 },
	{ rank: SCORE_RANKS[1], maxMs: 300000 }
];

export interface RankProgress {
	rank: Rank;
	next: Rank | null;
	toNext: number;
	fraction: number;
}

export function rankFor(
	summary: Pick<GameSummary, 'mode' | 'reason' | 'score' | 'timeMs'>
): RankProgress {
	if (summary.mode === ModeId.SPRINT) {
		const finished = summary.reason === EndReason.GOAL;
		const hit = finished ? SPRINT_RANKS.find((r) => summary.timeMs <= r.maxMs) : undefined;
		return { rank: hit ? hit.rank : SCORE_RANKS[0], next: null, toNext: 0, fraction: 1 };
	}
	let index = 0;
	for (let i = 0; i < SCORE_RANKS.length; i++) if (summary.score >= SCORE_RANKS[i].min) index = i;
	const rank = SCORE_RANKS[index];
	const next = SCORE_RANKS[index + 1] ?? null;
	if (!next) return { rank, next, toNext: 0, fraction: 1 };
	const span = next.min - rank.min;
	return {
		rank,
		next,
		toNext: next.min - summary.score,
		fraction: Math.min(1, Math.max(0, (summary.score - rank.min) / span))
	};
}

export const END_REASON_TEXT: Readonly<Record<EndReason, string>> = {
	[EndReason.TOPOUT]: 'переполнение участка',
	[EndReason.GOAL]: 'план выполнен',
	[EndReason.TIME]: 'гудок, конец смены'
};

export const LINE_TITLES: readonly string[] = ['', 'РЯД!', 'ДВА РЯДА!', 'ТРОЙКА!', 'ТЕТРИС!'];

export const RadioTopic = {
	START: 'start',
	RESUME: 'resume',
	SINGLE: 'single',
	DOUBLE: 'double',
	TRIPLE: 'triple',
	TETRIS: 'tetris',
	SPIN: 'spin',
	COMBO: 'combo',
	BACK_TO_BACK: 'backToBack',
	PERFECT: 'perfect',
	LEVEL_UP: 'levelUp',
	DANGER: 'danger',
	HOLES: 'holes',
	HOLD_SPAM: 'holdSpam',
	IDLE: 'idle',
	RECORD: 'record',
	END_TOPOUT: 'endTopout',
	END_GOAL: 'endGoal',
	END_TIME: 'endTime'
} as const;

export type RadioTopic = (typeof RadioTopic)[keyof typeof RadioTopic];

export const RADIO: Readonly<Record<RadioTopic, readonly string[]>> = {
	[RadioTopic.START]: [
		'Говорит «Маяк». Бригада тов. Игрока заступила на смену.',
		'Начинаем трудовую вахту. Прорабу — валерьянку, бригаде — кирпичи.',
		'Внимание! На участок прибыл новый бригадир. Прораб насторожился.'
	],
	[RadioTopic.RESUME]: [
		'С возвращением к станку, товарищ!',
		'Перерыв окончен. Баранки доедим потом.',
		'Профсоюз доволен, прораб — не очень. За работу!'
	],
	[RadioTopic.SINGLE]: [
		'Ряд уложен. Скромно, но по ГОСТу.',
		'Ещё один ряд в копилку пятилетки.',
		'Медленно, но верно. Как трамвай.'
	],
	[RadioTopic.DOUBLE]: [
		'Два ряда! Бригада входит во вкус.',
		'Пара рядов — и никакой бюрократии.',
		'Два ряда за раз. Прораб приподнял бровь.'
	],
	[RadioTopic.TRIPLE]: [
		'Тройка! Почти как у птицы-тройки, только кирпичами.',
		'Три ряда! В министерстве заинтересовались.',
		'Тройка — ударно! Не хватило совсем чуть-чуть.'
	],
	[RadioTopic.TETRIS]: [
		'Четыре ряда разом! Прораб плачет. От счастья.',
		'Тетрис! Партком доволен, профсоюз в смятении.',
		'Перевыполнение плана! Готовьте доску почёта.',
		'Четыре ряда! В Госплане срочно пересчитывают цифры.'
	],
	[RadioTopic.SPIN]: [
		'Т-вираж! Инженеры чешут затылки: так можно было?',
		'Бригада тов. Игрока выполнила Т-вираж. Партком доволен. Профсоюз — в смятении.',
		'Т-вираж! Рацпредложение оформлено задним числом.'
	],
	[RadioTopic.COMBO]: [
		'Серия ×{n}! Конвейер работает без перекуров.',
		'Серия ×{n}! Кирпичи не успевают остывать.',
		'×{n} подряд! Соседняя бригада нервно курит.'
	],
	[RadioTopic.BACK_TO_BACK]: [
		'Двойная норма! Госплан не верит своим глазам.',
		'Снова ударно! Вымпел уже в пути.'
	],
	[RadioTopic.PERFECT]: [
		'Площадка чиста! Объект сдан под ключ!',
		'Ни одного кирпича на участке! Это рекорд или ошибка в отчёте?'
	],
	[RadioTopic.LEVEL_UP]: [
		'Пятилетка №{n} «{name}» — досрочно! Темп растёт.',
		'Переходим к объекту «{name}». Кран, давай быстрее!',
		'Пятилетка №{n}. Объект «{name}». Отступать некуда.'
	],
	[RadioTopic.DANGER]: [
		'Внимание! Участок переполнен. Технику безопасности никто не отменял!',
		'Товарищ, кирпичи под потолком! Не зевай!',
		'Аврал! Прораб ищет каску побольше.'
	],
	[RadioTopic.HOLES]: [
		'Брак на участке! Подтянись, товарищ.',
		'ОТК недоволен: дыры в перекрытиях.',
		'Перерасход плит! Кто так строит?'
	],
	[RadioTopic.HOLD_SPAM]: [
		'Склад не резиновый, товарищ!',
		'Опять на склад? Завскладом пишет докладную.',
		'Отложить на чёрный день — не значит отложить всё.'
	],
	[RadioTopic.IDLE]: [
		'Товарищ, перекур не объявляли!',
		'Бригадир задумался. Стране нужны ряды!',
		'Тишина на участке. Прораб проверяет, жив ли бригадир.'
	],
	[RadioTopic.RECORD]: [
		'Внимание! Бригада идёт на рекорд!',
		'Рекорд бригады побит! Фотограф уже выехал.'
	],
	[RadioTopic.END_TOPOUT]: [
		'Смена окончена. Участок переполнен, но дух не сломлен.',
		'Стройка встала. Составляем акт.'
	],
	[RadioTopic.END_GOAL]: [
		'План выполнен! Ура, товарищи!',
		'Объект сдан досрочно! Готовьте медали.'
	],
	[RadioTopic.END_TIME]: [
		'Гудок! Смена окончена. Подсчитываем выработку.',
		'Время вышло. Сдаём инструмент на склад.'
	]
};

export function fillTemplate(
	text: string,
	values: Readonly<Record<string, string | number>>
): string {
	return text.replace(/\{(\w+)\}/g, (match, key: string) =>
		key in values ? String(values[key]) : match
	);
}

export const PIECE_NAMES: Readonly<Record<PieceType, string>> = {
	[PieceType.I]: 'Балка ж/б',
	[PieceType.O]: 'Плита перекр.',
	[PieceType.T]: 'Тавр стальной',
	[PieceType.S]: 'Зигзаг правый',
	[PieceType.Z]: 'Зигзаг левый',
	[PieceType.J]: 'Уголок левый',
	[PieceType.L]: 'Уголок правый'
};
