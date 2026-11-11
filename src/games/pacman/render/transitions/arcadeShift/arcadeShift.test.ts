import { describe, expect, it } from 'vitest';
import { MOSAIC_BLOCKS, SHIFT_DURATION, shiftChannels } from './arcadeShiftTimeline';

const steps = Array.from({ length: 201 }, (_, i) => i / 200);

describe('shiftChannels, enter', () => {
	it('starts as the plain world and ends as the plain arcade', () => {
		const a = shiftChannels('enter', 0);
		expect(a).toMatchObject({ phase: 0, block: 1, levels: 256, dim: 1 });
		const z = shiftChannels('enter', 1);
		expect(z).toMatchObject({ phase: 1, openX: 1, openY: 1, boost: 1, flash: 0 });
	});

	it('breaks the picture into ever bigger blocks and never back', () => {
		let last = 0;
		for (const p of steps) {
			const c = shiftChannels('enter', p);
			if (c.phase === 0) {
				expect(c.block).toBeGreaterThanOrEqual(last);
				last = c.block;
			}
		}
		expect(last).toBe(MOSAIC_BLOCKS[MOSAIC_BLOCKS.length - 1]);
	});

	it('goes dark before the tube switches on, and opens the line before the height', () => {
		const dark = shiftChannels('enter', 0.54);
		expect(dark.dim).toBeLessThan(0.1);
		const line = shiftChannels('enter', 0.6);
		expect(line.phase).toBe(1);
		expect(line.openX).toBeGreaterThan(0);
		expect(line.openY).toBe(0);
		const half = shiftChannels('enter', 0.75);
		expect(half.openX).toBe(1);
		expect(half.openY).toBeGreaterThan(0);
		expect(half.openY).toBeLessThan(1);
	});

	it('never shows the world after the arcade has begun to switch on', () => {
		let on = false;
		for (const p of steps) {
			const c = shiftChannels('enter', p);
			if (c.phase === 1) on = true;
			if (on) expect(c.phase).toBe(1);
		}
	});
});

describe('shiftChannels, leave', () => {
	it('starts as the plain arcade and ends as the plain next world', () => {
		expect(shiftChannels('leave', 0)).toMatchObject({ openX: 1, openY: 1, boost: 1, grow: 0 });
		expect(shiftChannels('leave', 1)).toMatchObject({ grow: 1, glow: 0 });
	});

	it('squashes to a line, then to a dot, before the next world appears', () => {
		const line = shiftChannels('leave', 0.34);
		expect(line.openY).toBeCloseTo(0, 5);
		expect(line.openX).toBeCloseTo(1, 5);
		const dot = shiftChannels('leave', 0.52);
		expect(dot.openX).toBeCloseTo(0, 5);
		expect(dot.grow).toBe(0);
	});

	it('squash and shrink only close, and the growth only opens', () => {
		let openY = 1;
		let openX = 1;
		let grow = 0;
		for (const p of steps) {
			const c = shiftChannels('leave', p);
			expect(c.openY).toBeLessThanOrEqual(openY + 1e-9);
			expect(c.openX).toBeLessThanOrEqual(openX + 1e-9);
			expect(c.grow).toBeGreaterThanOrEqual(grow - 1e-9);
			openY = c.openY;
			openX = c.openX;
			grow = c.grow;
		}
	});
});

describe('shiftChannels, input', () => {
	it('clamps the progress and survives a bad one', () => {
		expect(shiftChannels('enter', -1)).toEqual(shiftChannels('enter', 0));
		expect(shiftChannels('leave', 9)).toEqual(shiftChannels('leave', 1));
		expect(shiftChannels('leave', Number.NaN)).toEqual(shiftChannels('leave', 0));
	});

	it('has a duration for both ways', () => {
		expect(SHIFT_DURATION.enter).toBeGreaterThan(0);
		expect(SHIFT_DURATION.leave).toBeGreaterThan(0);
	});
});
