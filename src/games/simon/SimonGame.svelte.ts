// Вся игра — один реактивный класс. UI читает $state-поля напрямую,
// звук и визуальные эффекты подписываются на одноразовые события через onFx().
// Время двигает внешний цикл через tick(dt), поэтому класс легко тестировать.

import {
	CLASSIC_INPUT_TIMEOUT_MS,
	CLASSIC_ROUND_PAUSE_MS,
	extendSequence,
	playbackFrame
} from './logic/classic';
import {
	FAIL_MS,
	FEEDBACK_MS,
	MAX_LIVES,
	ORDER_ISSUE_DELAY_MS,
	ORDERS_PER_LEVEL,
	award,
	createOrder,
	failMessage,
	judge,
	successMessage,
	type Lottery,
	type Order,
	type OrderAction
} from './logic/orders';
import type { Mode, Mood, Pad, Rng } from './logic/types';

export type Phase =
	| 'menu'
	| 'playback' // classic: показ последовательности
	| 'input' // classic: ввод игрока
	| 'cleared' // classic: раунд пройден
	| 'issuing' // orders: пауза перед приказом
	| 'order' // orders: приказ активен
	| 'feedback' // orders: успех
	| 'fail' // ошибка (classic — перед концом игры)
	| 'gameover';

export type Fx =
	| { type: 'start' }
	| { type: 'pad'; pad: Pad; playback: boolean }
	| { type: 'order'; kind: Order['kind'] }
	| { type: 'success'; points: number; crit: boolean; lottery: Lottery | null; rest: boolean }
	| { type: 'fail' }
	| { type: 'levelUp'; level: number }
	| { type: 'gameOver'; record: boolean };

export interface BestStorage {
	load(mode: Mode): number;
	save(mode: Mode, score: number): void;
}

const PRESS_FLASH_MS = 200;

const SUCCESS_HEADLINES = {
	done: 'Принято!',
	ignored: 'Верно, это не приказ 1С!',
	rest: 'Перекур засчитан ☕'
} as const;

const PAUSABLE: ReadonlySet<Phase> = new Set([
	'playback',
	'input',
	'cleared',
	'issuing',
	'order',
	'feedback',
	'fail'
]);

export class SimonGame {
	mode = $state<Mode>('classic');
	phase = $state<Phase>('menu');
	paused = $state(false);

	score = $state(0);
	best = $state(0);
	newRecord = $state(false);

	/** classic: длина последовательности; orders: номер приказа. */
	round = $state(0);
	/** classic: сколько шагов уже повторено в текущем раунде. */
	step = $state(0);

	lives = $state(MAX_LIVES);
	level = $state(1);
	combo = $state(0);
	bestCombo = $state(0);
	ordersInLevel = $state(0);

	order = $state<Order | null>(null);
	/** Подсвеченная игрой кнопка (показ последовательности / ловушка). */
	litPad = $state<Pad | null>(null);
	/** Кнопка, которую только что нажал игрок. */
	pressedPad = $state<Pad | null>(null);
	/** Счётчик нажатий — чтобы UI мог перезапускать анимацию даже на ту же кнопку. */
	pressCount = $state(0);
	/** Остаток таймера, 1 → 0. */
	timer = $state(0);

	mood = $state<Mood>('happy');
	headline = $state('');
	status = $state('Готово');

	private sequence: Pad[] = [];
	private phaseMs = 0;
	private lastPlaybackStep = -1;
	private pressMs = 0;
	private previousWasBreak = false;
	private listeners: ((fx: Fx) => void)[] = [];

	constructor(
		private readonly storage: BestStorage,
		private readonly rng: Rng = Math.random
	) {
		this.best = storage.load(this.mode);
		this.toMenu();
	}

	get canPause(): boolean {
		return PAUSABLE.has(this.phase);
	}

	get acceptsPads(): boolean {
		return !this.paused && (this.phase === 'input' || this.phase === 'order');
	}

	get canSkip(): boolean {
		return !this.paused && this.phase === 'order';
	}

	onFx(listener: (fx: Fx) => void): () => void {
		this.listeners = [...this.listeners, listener];
		return () => {
			this.listeners = this.listeners.filter((l) => l !== listener);
		};
	}

	selectMode(mode: Mode): void {
		if (this.phase !== 'menu' && this.phase !== 'gameover') return;
		this.mode = mode;
		this.best = this.storage.load(mode);
	}

	start(mode: Mode = this.mode): void {
		this.selectMode(mode);
		this.paused = false;
		this.score = 0;
		this.newRecord = false;
		this.round = 0;
		this.step = 0;
		this.lives = MAX_LIVES;
		this.level = 1;
		this.combo = 0;
		this.bestCombo = 0;
		this.ordersInLevel = 0;
		this.order = null;
		this.sequence = [];
		this.previousWasBreak = false;
		this.emit({ type: 'start' });

		if (this.mode === 'classic') {
			this.status = 'Смена начата. Запоминайте последовательность.';
			this.nextRound();
		} else {
			this.status = 'Смена начата. Выполняйте только то, что говорит 1С.';
			this.beginIssuing();
		}
	}

	toMenu(): void {
		this.paused = false;
		this.setPhase('menu');
		this.order = null;
		this.litPad = null;
		this.timer = 0;
		this.mood = 'happy';
		this.headline = 'База сама себя не проведёт…';
	}

	pause(): void {
		if (this.canPause) this.paused = true;
	}

	resume(): void {
		this.paused = false;
	}

	togglePause(): void {
		if (this.paused) this.resume();
		else this.pause();
	}

	press(pad: Pad): void {
		if (!this.acceptsPads) return;

		this.pressedPad = pad;
		this.pressCount += 1;
		this.pressMs = 0;
		this.emit({ type: 'pad', pad, playback: false });

		if (this.phase === 'input') this.classicInput(pad);
		else this.resolveOrder({ type: 'pad', pad });
	}

	skip(): void {
		if (this.canSkip) this.resolveOrder({ type: 'skip' });
	}

	tick(deltaMs: number): void {
		if (this.paused || this.phase === 'menu' || this.phase === 'gameover') return;

		const dt = Math.min(Math.max(deltaMs, 0), 250);
		this.phaseMs += dt;

		if (this.pressedPad !== null) {
			this.pressMs += dt;
			if (this.pressMs >= PRESS_FLASH_MS) this.pressedPad = null;
		}

		switch (this.phase) {
			case 'playback':
				return this.updatePlayback();
			case 'input':
				this.timer = Math.max(0, 1 - this.phaseMs / CLASSIC_INPUT_TIMEOUT_MS);
				if (this.phaseMs >= CLASSIC_INPUT_TIMEOUT_MS) this.classicFail(null);
				return;
			case 'cleared':
				if (this.phaseMs >= CLASSIC_ROUND_PAUSE_MS) this.nextRound();
				return;
			case 'issuing':
				if (this.phaseMs >= ORDER_ISSUE_DELAY_MS) this.issueOrder();
				return;
			case 'order':
				return this.updateOrder();
			case 'feedback':
				if (this.phaseMs >= FEEDBACK_MS) this.beginIssuing();
				return;
			case 'fail':
				if (this.phaseMs >= FAIL_MS) {
					if (this.mode === 'classic' || this.lives <= 0) this.gameOver();
					else this.beginIssuing();
				}
				return;
		}
	}

	// ---------- Классика ----------

	private nextRound(): void {
		this.sequence = extendSequence(this.sequence, this.rng);
		this.round = this.sequence.length;
		this.step = 0;
		this.lastPlaybackStep = -1;
		this.litPad = null;
		this.timer = 0;
		this.mood = 'shout';
		this.headline = `Запоминай: ${this.round} ${plural(this.round, 'шаг', 'шага', 'шагов')}`;
		this.setPhase('playback');
	}

	private updatePlayback(): void {
		const frame = playbackFrame(this.phaseMs, this.sequence.length);

		if (frame.done) {
			this.litPad = null;
			this.mood = 'normal';
			this.headline = `Повтори! 0 из ${this.round}`;
			this.timer = 1;
			this.setPhase('input');
			return;
		}

		const pad = frame.lit ? (this.sequence[frame.step] ?? null) : null;
		this.litPad = pad;
		if (pad !== null && frame.step !== this.lastPlaybackStep) {
			this.lastPlaybackStep = frame.step;
			this.emit({ type: 'pad', pad, playback: true });
		}
	}

	private classicInput(pad: Pad): void {
		if (pad !== this.sequence[this.step]) {
			this.classicFail(pad);
			return;
		}

		this.step += 1;
		this.phaseMs = 0;
		this.timer = 1;
		this.headline = `Повтори! ${this.step} из ${this.round}`;

		if (this.step < this.round) return;

		this.score = this.round;
		this.updateBest();
		this.mood = 'happy';
		this.headline = `Пакет из ${this.round} проведён!`;
		this.status = `Пакет из ${this.round} ${plural(this.round, 'документа', 'документов', 'документов')} проведён без ошибок.`;
		this.timer = 0;
		this.emit({ type: 'success', points: 1, crit: false, lottery: null, rest: false });
		this.setPhase('cleared');
	}

	private classicFail(pressed: Pad | null): void {
		const expected = this.sequence[this.step] ?? null;
		this.litPad = expected; // показываем, какая кнопка была нужна
		this.timer = 0;
		this.mood = 'angry';
		this.headline = pressed === null ? 'Время вышло!' : 'Не та кнопка!';
		this.status = 'Нарушена последовательность проведения. Регистр разнесён.';
		this.emit({ type: 'fail' });
		this.setPhase('fail');
	}

	// ---------- Приказы 1С ----------

	private beginIssuing(): void {
		this.order = null;
		this.litPad = null;
		this.timer = 0;
		this.mood = 'normal';
		this.headline = 'Ожидание приказа…';
		this.setPhase('issuing');
	}

	private issueOrder(): void {
		const order = createOrder(this.level, this.previousWasBreak, this.rng);
		this.previousWasBreak = order.kind === 'break';
		this.round += 1;
		this.order = order;
		this.litPad = order.decoy;
		this.timer = 1;
		// Настроение не подсказывает, настоящий ли приказ: кричит всегда, кроме перекура.
		this.mood = order.kind === 'break' ? 'coffee' : 'shout';
		this.headline = order.text;
		this.emit({ type: 'order', kind: order.kind });
		this.setPhase('order');
	}

	private updateOrder(): void {
		const order = this.order;
		if (!order) return this.beginIssuing();

		this.timer = Math.max(0, 1 - this.phaseMs / order.durationMs);
		if (this.phaseMs >= order.durationMs) this.resolveOrder({ type: 'timeout' });
	}

	private resolveOrder(action: OrderAction): void {
		const order = this.order;
		if (!order || this.phase !== 'order') return;

		const timeLeft = this.timer;
		const verdict = judge(order, action);
		this.litPad = null;
		this.timer = 0;

		if (!verdict.ok) {
			this.lives = Math.max(0, this.lives - 1);
			this.combo = 0;
			this.mood = 'angry';
			this.headline = failMessage(order, verdict.reason, action.type === 'pad' ? action.pad : null);
			this.status = 'Ошибка. Подробности в журнале регистрации.';
			this.emit({ type: 'fail' });
			this.setPhase('fail');
			return;
		}

		this.combo += 1;
		this.bestCombo = Math.max(this.bestCombo, this.combo);

		const result = award(
			order,
			verdict.kind,
			{ level: this.level, combo: this.combo, timeLeft, lives: this.lives },
			this.rng
		);
		if (result.lottery === 'life') this.lives = Math.min(MAX_LIVES, this.lives + 1);

		this.score += result.points;
		this.updateBest();
		this.mood = 'happy';
		this.headline = result.crit ? 'КРИТ! Молниеносно!' : SUCCESS_HEADLINES[verdict.kind];
		this.status = successMessage(order, verdict.kind, result.lottery, this.rng);
		this.emit({
			type: 'success',
			points: result.points,
			crit: result.crit,
			lottery: result.lottery,
			rest: verdict.kind === 'rest'
		});

		this.ordersInLevel += 1;
		if (this.ordersInLevel >= ORDERS_PER_LEVEL) {
			this.ordersInLevel = 0;
			this.level += 1;
			this.emit({ type: 'levelUp', level: this.level });
		}

		this.setPhase('feedback');
	}

	// ---------- Общее ----------

	private gameOver(): void {
		this.litPad = null;
		this.order = null;
		this.timer = 0;
		this.mood = 'shock';
		this.headline = 'База упала. Смена окончена.';
		if (this.newRecord) this.storage.save(this.mode, this.score);
		this.emit({ type: 'gameOver', record: this.newRecord });
		this.setPhase('gameover');
	}

	private updateBest(): void {
		if (this.score > this.best) {
			this.best = this.score;
			this.newRecord = true;
		}
	}

	private setPhase(phase: Phase): void {
		this.phase = phase;
		this.phaseMs = 0;
	}

	private emit(fx: Fx): void {
		for (const listener of this.listeners) listener(fx);
	}
}

function plural(n: number, one: string, few: string, many: string): string {
	const mod10 = n % 10;
	const mod100 = n % 100;
	if (mod10 === 1 && mod100 !== 11) return one;
	if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
	return many;
}
