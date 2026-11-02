// Режим «Приказы 1С» — «Simon says» про будни 1С-программиста.
// Выполнять можно только то, что начинается ровно с «1С говорит:».
// Всё остальное (главбух, директор, «1С говорила», опечатки) — игнорировать или пропускать.
// Перекур — не трогать вообще ничего, пока не кончится таймер.

import { PAD_LABELS, pick, randomPad, type Pad, type Rng } from './types';

export const REAL_SOURCE = '1С говорит';
export const ORDERS_PER_LEVEL = 7;
export const MAX_LIVES = 3;
export const ORDER_ISSUE_DELAY_MS = 380;
export const FEEDBACK_MS = 750;
export const FAIL_MS = 1700;

export type OrderKind = 'real' | 'fake' | 'break';

export interface Order {
	readonly kind: OrderKind;
	/** Кнопка, названная в приказе (null — перекур). */
	readonly pad: Pad | null;
	/** Кто «говорит»; null — приказ без источника. */
	readonly source: string | null;
	readonly text: string;
	/** Кнопка, которую подсвечивает «глючный интерфейс» (ловушка), или null. */
	readonly decoy: Pad | null;
	readonly durationMs: number;
}

export type OrderAction = { type: 'pad'; pad: Pad } | { type: 'skip' } | { type: 'timeout' };

export type FailReason = 'wrong-pad' | 'timeout' | 'skipped' | 'obeyed-fake' | 'break';

export type Verdict =
	{ ok: true; kind: 'done' | 'ignored' | 'rest' } | { ok: false; reason: FailReason };

export type Lottery = 'life' | 'bonus500' | 'bonus200';

export interface Award {
	readonly points: number;
	readonly crit: boolean;
	readonly lottery: Lottery | null;
}

const COMMANDS: readonly string[] = ['жми «{p}»', 'нажми «{p}»', 'срочно «{p}»', 'быстро «{p}»'];

/** Ложные источники по уровням: чем дальше, тем ближе к настоящему «1С говорит». */
const FAKE_SOURCES: readonly (readonly (string | null)[])[] = [
	[null, 'Главбух говорит', 'Директор говорит', 'Клиент говорит', 'Стажёр говорит'],
	['1С говорила', '1С сказала бы', 'Налоговая говорит', 'Говорят, 1С говорит'],
	['1С гаварит', '1С говорит?..', 'Не 1С говорит', '1С-франчайзи говорит']
];

export function orderDurationMs(level: number): number {
	return Math.max(1300, 3000 - (level - 1) * 170);
}

export function breakDurationMs(level: number): number {
	return Math.max(2000, 3000 - (level - 1) * 100);
}

export function fakeChance(level: number): number {
	return 0.35 + Math.min(0.1, (level - 1) * 0.02);
}

function fakeSourcePool(level: number): (string | null)[] {
	const tiers = level >= 5 ? 3 : level >= 3 ? 2 : 1;
	return FAKE_SOURCES.slice(0, tiers).flat();
}

function formatOrder(source: string | null, pad: Pad, rng: Rng): string {
	const command = pick(COMMANDS, rng).replace('{p}', PAD_LABELS[pad]);
	if (source === null) {
		return `${command.charAt(0).toUpperCase()}${command.slice(1)}!`;
	}
	const separator = source.endsWith('..') ? ' ' : ': ';
	return `${source}${separator}${command}!`;
}

export function createOrder(level: number, previousWasBreak: boolean, rng: Rng): Order {
	if (level >= 3 && !previousWasBreak && rng() < 0.12) {
		return {
			kind: 'break',
			pad: null,
			source: REAL_SOURCE,
			text: `${REAL_SOURCE}: ПЕРЕКУР! Ничего не трогай.`,
			decoy: level >= 4 ? randomPad(rng) : null,
			durationMs: breakDurationMs(level)
		};
	}

	const pad = randomPad(rng);
	const kind: OrderKind = rng() < fakeChance(level) ? 'fake' : 'real';
	const source = kind === 'real' ? REAL_SOURCE : pick(fakeSourcePool(level), rng);

	let decoy: Pad | null = null;
	if (level >= 4 && rng() < 0.35) {
		// Для настоящего приказа подсвечивается не та кнопка, для ложного — именно та, что «просят».
		decoy = kind === 'real' ? (((pad + 1 + Math.floor(rng() * 3)) % 4) as Pad) : pad;
	}

	return {
		kind,
		pad,
		source,
		text: formatOrder(source, pad, rng),
		decoy,
		durationMs: orderDurationMs(level)
	};
}

export function judge(order: Order, action: OrderAction): Verdict {
	if (order.kind === 'break') {
		return action.type === 'timeout' ? { ok: true, kind: 'rest' } : { ok: false, reason: 'break' };
	}

	if (order.kind === 'fake') {
		return action.type === 'pad'
			? { ok: false, reason: 'obeyed-fake' }
			: { ok: true, kind: 'ignored' };
	}

	switch (action.type) {
		case 'pad':
			return action.pad === order.pad
				? { ok: true, kind: 'done' }
				: { ok: false, reason: 'wrong-pad' };
		case 'skip':
			return { ok: false, reason: 'skipped' };
		case 'timeout':
			return { ok: false, reason: 'timeout' };
	}
}

export function comboMultiplier(combo: number): number {
	if (combo >= 20) return 5;
	if (combo >= 14) return 4;
	if (combo >= 9) return 3;
	if (combo >= 5) return 2;
	return 1;
}

export interface AwardContext {
	readonly level: number;
	/** Комбо с учётом текущего успеха. */
	readonly combo: number;
	/** Доля оставшегося времени, 0..1. */
	readonly timeLeft: number;
	readonly lives: number;
}

export function award(
	order: Order,
	kind: 'done' | 'ignored' | 'rest',
	ctx: AwardContext,
	rng: Rng
): Award {
	if (kind === 'rest') {
		return { points: 100 * ctx.level, crit: false, lottery: null };
	}

	const multiplier = comboMultiplier(ctx.combo);

	if (kind === 'ignored') {
		const points = 40 + ctx.level * 10 + Math.round(60 * ctx.timeLeft);
		return { points: points * multiplier, crit: false, lottery: null };
	}

	const crit = ctx.timeLeft > 0.6;
	const speed = Math.round(100 * ctx.timeLeft) * (crit ? 2 : 1);
	let points = (100 + ctx.level * 10 + speed) * multiplier;
	let lottery: Lottery | null = null;

	if (order.pad === 3) {
		const roll = rng();
		if (roll < 0.3 && ctx.lives < MAX_LIVES) {
			lottery = 'life';
		} else if (roll < 0.55) {
			lottery = 'bonus500';
			points += 500;
		} else {
			lottery = 'bonus200';
			points += 200;
		}
	}

	return { points, crit, lottery };
}

export function failMessage(order: Order, reason: FailReason, pressed: Pad | null): string {
	const wanted = order.pad === null ? '' : PAD_LABELS[order.pad];
	switch (reason) {
		case 'wrong-pad':
			return `Не та кнопка: 1С просила «${wanted}», а вы нажали «${pressed === null ? '?' : PAD_LABELS[pressed]}».`;
		case 'timeout':
			return 'Не успели. Документ остался непроведённым.';
		case 'skipped':
			return 'Это был прямой приказ 1С, а вы его пропустили!';
		case 'obeyed-fake':
			return order.source === null
				? 'Приказ без «1С говорит» — это не приказ. Нарушение субординации!'
				: `«${order.source}» — это не «${REAL_SOURCE}». Нарушение субординации!`;
		case 'break':
			return 'СЕЙЧАС ПЕРЕКУР! Руки прочь от клавиатуры.';
	}
}

const DONE_MESSAGES: readonly string[] = [
	'Документ «Реализация товаров №{n}» проведён.',
	'Проводки сформированы автоматически.',
	'Партии пересчитаны. Расхождения отправлены в архив.',
	'Записано в журнал регистрации. Надеемся, вы ничего не нарушили.',
	'Отчётность сдана. Проверяющие уведомлены.'
];

const LOTTERY_MESSAGES: Readonly<Record<Lottery, string>> = {
	life: 'Из «Ещё…» выпало: +1 жизнь ❤',
	bonus500: 'Из «Ещё…» выпала премия: +500!',
	bonus200: 'Из «Ещё…» выпал бонус: +200'
};

export function successMessage(
	order: Order,
	kind: 'done' | 'ignored' | 'rest',
	lottery: Lottery | null,
	rng: Rng
): string {
	if (kind === 'rest') return 'Перекур засчитан ☕ Можно выдохнуть.';
	if (kind === 'ignored') {
		return order.source === null
			? 'Приказ без подписи проигнорирован. Субординация соблюдена.'
			: `«${order.source}» — не начальство. Проигнорировано.`;
	}
	if (lottery) return LOTTERY_MESSAGES[lottery];
	return pick(DONE_MESSAGES, rng).replace('{n}', String(1000 + Math.floor(rng() * 9000)));
}
