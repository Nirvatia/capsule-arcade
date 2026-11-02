import { describe, expect, it } from 'vitest';
import { Spring } from './Hero';

describe('hero spring', () => {
	it('stays bounded on a long frame (a hitch, or the first frame after a hidden spell)', () => {
		const spring = new Spring(1);
		spring.velocity = 5;
		for (let i = 0; i < 20; i++) {
			spring.step(1, 0.1);
			expect(Math.abs(spring.value - 1)).toBeLessThan(0.5);
		}
		expect(spring.value).toBeCloseTo(1, 2);
	});

	it('still overshoots and settles at 60 fps', () => {
		const spring = new Spring(0);
		let peak = 0;
		for (let i = 0; i < 120; i++) {
			spring.step(1, 1 / 60);
			peak = Math.max(peak, spring.value);
		}
		expect(peak).toBeGreaterThan(1);
		expect(spring.value).toBeCloseTo(1, 2);
	});
});
