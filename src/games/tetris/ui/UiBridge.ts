import { SpinKind, type ClearResult, type GameState } from '../core/types';
import type { EventBus } from '../engine/EventBus';
import { bestScore, loadRecords, submitRecord } from '../records';
import { CalloutTone, ui, type Callout } from './store.svelte';

const LINE_TITLES = ['', 'РЯД!', 'ДВА РЯДА!', 'ТРОЙКА!', 'ТЕТРИС!'];

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

	constructor(bus: EventBus) {
		ui.records = loadRecords();
		ui.best = bestScore(ui.records);
		ui.result = null;
		ui.callout = null;
		ui.levelUp = null;
		ui.countdown = null;

		this.unsubscribe = [
			bus.on('reset', () => {
				ui.result = null;
				ui.callout = null;
				ui.levelUp = null;
			}),
			bus.on('countdown', (e) => (ui.countdown = { key: ++this.key, step: e.step })),
			bus.on('clear', (e) => (ui.callout = describeClear(e, ++this.key))),
			bus.on('levelUp', (e) => (ui.levelUp = { key: ++this.key, level: e.level })),
			bus.on('gameOver', (summary) => {
				const previousBest = ui.best;
				const { list, rank } = submitRecord(summary);
				ui.records = list;
				ui.best = bestScore(list);
				ui.result = { summary, rank, newBest: previousBest > 0 && summary.score > previousBest };
			})
		];
	}

	sync(state: GameState): void {
		ui.phase = state.phase;
		ui.score = state.score;
		ui.lines = state.lines;
		ui.level = state.level;
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
		for (const off of this.unsubscribe) off();
	}
}
