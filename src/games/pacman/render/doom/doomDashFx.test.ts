import { describe, expect, it } from 'vitest';
import { LavaDash, MORPH_IN, MORPH_OUT, stopMorph, telegraphMorph } from './doomDashFx';

const DT = 1 / 60;

/** A dash's round as the boss's state runs it: a telegraph of `tel` s, a run, a stop. */
function round(tel: number, run: number, after: number): number[] {
	const lava = new LavaDash();
	const morphs: number[] = [];
	let t = 0;
	for (; t < tel; t += DT) {
		lava.update(100, 100, true, false, Math.min(1, t / tel), t, 32);
		morphs.push(lava.morph);
	}
	for (let k = 0; k < run; k += DT, t += DT) {
		lava.update(100 + k * 300, 100, false, true, 1, t, 32);
		morphs.push(lava.morph);
	}
	for (let k = 0; k < after; k += DT, t += DT) {
		lava.update(100 + run * 300, 100, false, false, 0, t, 32);
		morphs.push(lava.morph);
	}
	return morphs;
}

describe('the boss turns into the lava ball for the dash', () => {
	it.each([0.7, 0.6, 0.5])('only over the last quarter second of a %s s telegraph', (tel) => {
		const m = round(tel, 0.5, 0.6);
		const n = Math.round(tel / DT);
		// still the body until MORPH_IN before the end
		expect(Math.max(...m.slice(0, Math.floor((tel - MORPH_IN - 0.05) / DT)))).toBe(0);
		// the ball when the dash starts
		expect(m[n - 1]).toBeGreaterThan(0.9);
		expect(m[n + 2]).toBe(1);
	});

	it('turns smoothly: no jump bigger than a frame of a quarter-second ease', () => {
		const m = round(0.7, 0.5, 0.6);
		for (let i = 1; i < m.length; i += 1) {
			expect(Math.abs(m[i] - m[i - 1])).toBeLessThan(0.15);
		}
	});

	it('comes back into the body over MORPH_OUT s after the stop', () => {
		const m = round(0.6, 0.4, 0.6);
		const stop = Math.round(1.0 / DT);
		expect(m[stop + 2]).toBeGreaterThan(0.8);
		expect(m[stop + Math.ceil(MORPH_OUT / DT) + 2]).toBe(0);
	});

	it('pure parts: the telegraph ease and the return', () => {
		expect(telegraphMorph(0.02, 0.01)).toBe(0);
		expect(telegraphMorph(1, 0.7)).toBe(1);
		expect(stopMorph(1, 0)).toBe(1);
		expect(stopMorph(1, MORPH_OUT)).toBe(0);
		expect(stopMorph(0.4, 0.1)).toBeLessThan(0.4);
	});
});
