import { describe, expect, it } from 'vitest';
import { settle } from './math';

describe('settle', () => {
	it('lands on the target instead of creeping towards it for ever', () => {
		let value = 0;
		let frames = 0;
		while (value !== 1 && frames < 1000) {
			value = settle(value, 1, 0.04, 0.004);
			frames += 1;
		}
		expect(value).toBe(1);
		// a mood change takes a couple of seconds at 60 frames a second, not for ever
		expect(frames).toBeGreaterThan(60);
		expect(frames).toBeLessThan(200);
	});

	it('eases while it is far from the target', () => {
		expect(settle(0, 1, 0.25, 0.004)).toBeCloseTo(0.25);
		expect(settle(1, 0, 0.25, 0.004)).toBeCloseTo(0.75);
	});

	it('stays on the target', () => {
		expect(settle(1, 1, 0.04, 0.004)).toBe(1);
		expect(settle(0, 0, 0.04, 0.004)).toBe(0);
	});
});
