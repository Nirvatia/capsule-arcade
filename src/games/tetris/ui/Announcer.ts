import { HIDDEN_ROWS, VISIBLE_ROWS } from '../config';
import { countHoles, stackHeight } from '../core/board';
import { EndReason, Phase, SpinKind, type ClearResult, type GameState } from '../core/types';
import type { EventBus } from '../engine/EventBus';
import { fillTemplate, levelName, RADIO, RadioTopic } from '../theme/texts';

const GLOBAL_COOLDOWN_MS = 4500;
const TOPIC_COOLDOWN_MS = 18000;
const IDLE_MS = 10000;
const HOLE_STEP = 3;
const DANGER_ROWS = 5;

const END_TOPIC: Readonly<Record<EndReason, RadioTopic>> = {
	[EndReason.TOPOUT]: RadioTopic.END_TOPOUT,
	[EndReason.GOAL]: RadioTopic.END_GOAL,
	[EndReason.TIME]: RadioTopic.END_TIME
};

export class Announcer {
	private clock = 0;
	private quietUntil = 0;
	private readonly lastTopicAt = new Map<RadioTopic, number>();
	private readonly bags = new Map<RadioTopic, string[]>();
	private idleMs = 0;
	private seenPieces = 0;
	private reportedHoles = 0;
	private holdPieces: number[] = [];
	private recordCalled = false;
	private wasPaused = false;
	private readonly unsubscribe: (() => void)[];

	constructor(
		bus: EventBus,
		private readonly publish: (text: string) => void,
		private readonly bestScore: () => number
	) {
		this.unsubscribe = [
			bus.on('reset', () => {
				this.resetRun();
				this.say(RadioTopic.START, {}, true);
			}),
			bus.on('phase', (e) => {
				if (e.phase === Phase.PAUSED) this.wasPaused = true;
			}),
			bus.on('countdown', (e) => {
				if (e.step === 0 && this.wasPaused) {
					this.wasPaused = false;
					this.say(RadioTopic.RESUME, {}, true);
				}
			}),
			bus.on('move', () => (this.idleMs = 0)),
			bus.on('rotate', () => (this.idleMs = 0)),
			bus.on('hardDrop', () => (this.idleMs = 0)),
			bus.on('hold', () => {
				this.idleMs = 0;
				this.holdPieces.push(this.seenPieces);
				this.holdPieces = this.holdPieces.filter((p) => this.seenPieces - p < 6);
				if (this.holdPieces.length >= 4) this.sayTopic(RadioTopic.HOLD_SPAM);
			}),
			bus.on('clear', (e) => this.onClear(e)),
			bus.on('levelUp', (e) =>
				this.say(RadioTopic.LEVEL_UP, { n: e.level, name: levelName(e.level) }, true)
			),
			bus.on('gameOver', (e) => this.say(END_TOPIC[e.reason], {}, true))
		];
	}

	tick(state: GameState, frameMs: number): void {
		if (state.phase !== Phase.PLAYING && state.phase !== Phase.CLEARING) return;
		const dt = Math.min(frameMs, 250);
		this.clock += dt;
		this.idleMs += dt;

		if (this.idleMs >= IDLE_MS) {
			this.idleMs = -IDLE_MS * 2;
			this.sayTopic(RadioTopic.IDLE);
		}

		if (state.pieces !== this.seenPieces) {
			this.seenPieces = state.pieces;
			const holes = countHoles(state.board);
			if (holes < this.reportedHoles) this.reportedHoles = holes;
			if (holes - this.reportedHoles >= HOLE_STEP) {
				this.reportedHoles = holes;
				this.sayTopic(RadioTopic.HOLES);
			}
			const height = stackHeight(state.board) - HIDDEN_ROWS;
			if (height > VISIBLE_ROWS - DANGER_ROWS) this.sayTopic(RadioTopic.DANGER);
		}

		const best = this.bestScore();
		if (!this.recordCalled && best > 0 && state.score > best) {
			this.recordCalled = true;
			this.say(RadioTopic.RECORD, {}, true);
		}
	}

	destroy(): void {
		for (const off of this.unsubscribe) off();
	}

	private resetRun(): void {
		this.quietUntil = this.clock;
		this.lastTopicAt.clear();
		this.idleMs = 0;
		this.seenPieces = 0;
		this.reportedHoles = 0;
		this.holdPieces = [];
		this.recordCalled = false;
		this.wasPaused = false;
	}

	private onClear(e: ClearResult): void {
		if (e.perfect) return this.say(RadioTopic.PERFECT, {}, true);
		if (e.count >= 4) return this.say(RadioTopic.TETRIS, {}, true);
		if (e.spin !== SpinKind.NONE) return this.say(RadioTopic.SPIN, {}, e.count > 0);
		if (e.backToBack) return this.say(RadioTopic.BACK_TO_BACK, {});
		if (e.combo >= 2) return this.say(RadioTopic.COMBO, { n: e.combo });
		if (e.count === 3) return this.say(RadioTopic.TRIPLE, {});
		if (e.count === 2) return this.say(RadioTopic.DOUBLE, {});
		if (e.count === 1 && Math.random() < 0.3) this.say(RadioTopic.SINGLE, {});
	}

	private sayTopic(topic: RadioTopic): void {
		const last = this.lastTopicAt.get(topic);
		if (last !== undefined && this.clock - last < TOPIC_COOLDOWN_MS) return;
		this.say(topic, {});
	}

	private say(topic: RadioTopic, values: Record<string, string | number>, force = false): void {
		if (!force && this.clock < this.quietUntil) return;
		const text = this.draw(topic);
		if (!text) return;
		this.quietUntil = this.clock + GLOBAL_COOLDOWN_MS;
		this.lastTopicAt.set(topic, this.clock);
		this.publish(fillTemplate(text, values));
	}

	private draw(topic: RadioTopic): string | undefined {
		let bag = this.bags.get(topic);
		if (!bag || bag.length === 0) {
			bag = [...RADIO[topic]];
			for (let i = bag.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[bag[i], bag[j]] = [bag[j], bag[i]];
			}
			this.bags.set(topic, bag);
		}
		return bag.pop();
	}
}
