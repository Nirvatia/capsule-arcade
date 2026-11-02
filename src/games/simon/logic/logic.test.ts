import { describe, expect, it } from 'vitest';
import { CLASSIC_START_DELAY_MS, extendSequence, playbackFrame, playbackTiming } from './classic';
import { REAL_SOURCE, award, comboMultiplier, createOrder, judge, type Order } from './orders';
import { seeded } from './seeded';
import type { Rng } from './types';

describe('classic', () => {
	it('extends the sequence by exactly one step, keeping previous steps', () => {
		const rng = seeded(1);
		let seq = extendSequence([], rng);
		for (let i = 0; i < 20; i += 1) {
			const next = extendSequence(seq, rng);
			expect(next).toHaveLength(seq.length + 1);
			expect(next.slice(0, seq.length)).toEqual(seq);
			seq = next;
		}
	});

	it('speeds up after steps 5, 9 and 13', () => {
		const period = (n: number) => playbackTiming(n).onMs + playbackTiming(n).gapMs;
		expect(period(6)).toBeLessThan(period(5));
		expect(period(10)).toBeLessThan(period(9));
		expect(period(14)).toBeLessThan(period(13));
	});

	it('walks through every step and then finishes', () => {
		const { onMs, gapMs } = playbackTiming(3);
		const at = (step: number, offset: number) =>
			playbackFrame(CLASSIC_START_DELAY_MS + step * (onMs + gapMs) + offset, 3);

		expect(playbackFrame(0, 3)).toEqual({ step: -1, lit: false, done: false });
		expect(at(0, 1)).toEqual({ step: 0, lit: true, done: false });
		expect(at(0, onMs + 1)).toEqual({ step: 0, lit: false, done: false });
		expect(at(2, 1)).toEqual({ step: 2, lit: true, done: false });
		expect(at(3, 0).done).toBe(true);
	});
});

describe('orders', () => {
	const sample = (level: number, n = 3000) => {
		const rng = seeded(level * 7919);
		const orders: Order[] = [];
		let prevBreak = false;
		for (let i = 0; i < n; i += 1) {
			const order = createOrder(level, prevBreak, rng);
			prevBreak = order.kind === 'break';
			orders.push(order);
		}
		return orders;
	};

	it('only real orders start with "1С говорит:"', () => {
		for (const level of [1, 3, 5, 8]) {
			for (const order of sample(level)) {
				const startsReal = order.text.startsWith(`${REAL_SOURCE}:`);
				expect(startsReal, order.text).toBe(order.kind !== 'fake');
			}
		}
	});

	it('introduces breaks from level 3 and never twice in a row', () => {
		expect(sample(1).some((o) => o.kind === 'break')).toBe(false);
		const orders = sample(3);
		expect(orders.some((o) => o.kind === 'break')).toBe(true);
		orders.forEach((o, i) => {
			if (i > 0 && o.kind === 'break') expect(orders[i - 1]!.kind).not.toBe('break');
		});
	});

	it('uses trickier fake sources on higher levels', () => {
		const sources = (level: number) => new Set(sample(level).map((o) => o.source));
		expect(sources(1).has('1С говорила')).toBe(false);
		expect(sources(3).has('1С говорила')).toBe(true);
		expect(sources(5).has('1С гаварит')).toBe(true);
	});

	it('lights decoy pads only from level 4; a real order never lights its own pad', () => {
		expect(sample(3).every((o) => o.decoy === null)).toBe(true);
		const orders = sample(4);
		expect(orders.some((o) => o.decoy !== null)).toBe(true);
		for (const o of orders) {
			if (o.kind === 'real' && o.decoy !== null) expect(o.decoy).not.toBe(o.pad);
		}
	});

	const real: Order = {
		kind: 'real',
		pad: 1,
		source: REAL_SOURCE,
		text: '',
		decoy: null,
		durationMs: 1000
	};
	const fake: Order = { ...real, kind: 'fake', source: 'Главбух говорит' };
	const rest: Order = { ...real, kind: 'break', pad: null };

	it('judges real orders', () => {
		expect(judge(real, { type: 'pad', pad: 1 })).toEqual({ ok: true, kind: 'done' });
		expect(judge(real, { type: 'pad', pad: 2 })).toEqual({ ok: false, reason: 'wrong-pad' });
		expect(judge(real, { type: 'skip' })).toEqual({ ok: false, reason: 'skipped' });
		expect(judge(real, { type: 'timeout' })).toEqual({ ok: false, reason: 'timeout' });
	});

	it('judges fake orders and breaks', () => {
		expect(judge(fake, { type: 'pad', pad: 1 })).toEqual({ ok: false, reason: 'obeyed-fake' });
		expect(judge(fake, { type: 'skip' })).toEqual({ ok: true, kind: 'ignored' });
		expect(judge(fake, { type: 'timeout' })).toEqual({ ok: true, kind: 'ignored' });
		expect(judge(rest, { type: 'timeout' })).toEqual({ ok: true, kind: 'rest' });
		expect(judge(rest, { type: 'skip' })).toEqual({ ok: false, reason: 'break' });
		expect(judge(rest, { type: 'pad', pad: 0 })).toEqual({ ok: false, reason: 'break' });
	});

	it('scores fast answers higher and multiplies by combo', () => {
		const ctx = { level: 1, combo: 1, lives: 3 };
		const slow = award(real, 'done', { ...ctx, timeLeft: 0.2 }, seeded(1));
		const fast = award(real, 'done', { ...ctx, timeLeft: 0.9 }, seeded(1));
		expect(fast.crit).toBe(true);
		expect(slow.crit).toBe(false);
		expect(fast.points).toBeGreaterThan(slow.points);

		const combo = award(real, 'done', { ...ctx, combo: 9, timeLeft: 0.2 }, seeded(1));
		expect(combo.points).toBe(slow.points * comboMultiplier(9));

		const skipped = award(fake, 'ignored', { ...ctx, timeLeft: 0.8 }, seeded(1));
		const waited = award(fake, 'ignored', { ...ctx, timeLeft: 0 }, seeded(1));
		expect(skipped.points).toBeGreaterThan(waited.points);
	});

	it('gives no extra life from the lottery when lives are full', () => {
		const eshche: Order = { ...real, pad: 3 };
		const alwaysLow: Rng = () => 0.01;
		expect(
			award(eshche, 'done', { level: 1, combo: 1, lives: 3, timeLeft: 0 }, alwaysLow).lottery
		).toBe('bonus500');
		expect(
			award(eshche, 'done', { level: 1, combo: 1, lives: 2, timeLeft: 0 }, alwaysLow).lottery
		).toBe('life');
	});
});
