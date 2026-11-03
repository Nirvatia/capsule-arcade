import { Phase, SpinKind, type ClearResult, type GameState } from '../core/types';
import type { EventBus } from '../engine/EventBus';
import { HIDDEN_ROWS, VISIBLE_ROWS } from '../config';
import { stackHeight } from '../core/board';
import { MODES } from '../core/modes';
import { isBetter, loadRecords, submitRecord } from '../records';
import { LINE_TITLES } from '../theme/texts';
import { Announcer } from './Announcer';
import { CalloutTone, ui, type Callout } from './store.svelte';

function describeClear(result: ClearResult, key: number): Callout {
	const parts: string[] = [];
	let title = LINE_TITLES[result.count] ?? '';
	if (result.spin !== SpinKind.NONE) {
		const mini = result.spin === SpinKind.MINI ? ' МИНИ' : '';
		title = `Т-ВИРАЖ${mini}${result.count > 0 ? ` ×${result.count}` : ''}`;
	}
	if (result.perfect) title = 'ЧИСТАЯ ПЛОЩАДКА!';
	if (result.backToBack) parts.push('ДВОЙНАЯ НОРМА');
	if (result.combo > 0) parts.push(`СЕРИЯ ×${result.combo}`);
	const tone =
		result.count >= 4 || result.perfect || result.spin === SpinKind.FULL
			? CalloutTone.GREAT
			: result.count >= 2 || result.combo > 0 || result.spin !== SpinKind.NONE
				? CalloutTone.GOOD
				: CalloutTone.SMALL;
	return { key, title, sub: parts.join(' · '), points: result.points, tone };
}

export class UiBridge {
	private key = 0;
	private nextKey = '';
	private readonly unsubscribe: (() => void)[];
	private readonly announcer: Announcer;

	constructor(bus: EventBus) {
		ui.records = loadRecords(ui.mode);
		ui.result = null;
		ui.callout = null;
		ui.levelUp = null;
		ui.countdown = null;
		ui.radio = { key: ++this.key, text: 'Радиоточка ждёт начала смены. Не переключайтесь.' };
		this.announcer = new Announcer(
			bus,
			(text) => (ui.radio = { key: ++this.key, text }),
			() => (MODES[ui.mode].rankByTime ? 0 : (ui.records[0]?.score ?? 0))
		);

		this.unsubscribe = [
			bus.on('reset', (e) => {
				ui.mode = e.mode;
				ui.shiftNo = 1000 + (e.seed % 9000);
				ui.records = loadRecords(e.mode);
				ui.result = null;
				ui.callout = null;
				ui.levelUp = null;
			}),
			bus.on('countdown', (e) => (ui.countdown = { key: ++this.key, step: e.step })),
			bus.on('clear', (e) => (ui.callout = describeClear(e, ++this.key))),
			bus.on('levelUp', (e) => (ui.levelUp = { key: ++this.key, level: e.level })),
			bus.on('gameOver', (summary) => {
				const previousBest = ui.records[0];
				const { list, rank } = submitRecord(summary);
				ui.records = list;
				ui.result = {
					summary,
					rank,
					newBest: rank === 0 && isBetter(summary.mode, previousBest, summary)
				};
			})
		];
	}

	sync(state: GameState, frameMs: number): void {
		this.announcer.tick(state, frameMs);
		ui.phase = state.phase;
		ui.score = state.score;
		ui.lines = state.lines;
		ui.level = state.level;
		ui.danger = stackHeight(state.board) - HIDDEN_ROWS > VISIBLE_ROWS - 5;
		ui.elapsedMs = Math.floor(state.elapsedMs / 100) * 100;
		ui.pausedMs = state.phase === Phase.PAUSED ? Math.floor(state.phaseTime / 1000) * 1000 : 0;
		ui.hold = state.hold;
		ui.holdUsed = state.holdUsed;
		ui.combo = Math.max(0, state.combo);
		ui.backToBack = state.backToBack;
		const nextKey = state.queue.join(',');
		if (nextKey !== this.nextKey) {
			this.nextKey = nextKey;
			ui.next = [...state.queue];
		}
	}

	destroy(): void {
		this.announcer.destroy();
		for (const off of this.unsubscribe) off();
	}
}
