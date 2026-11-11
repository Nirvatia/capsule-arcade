import { describe, expect, it } from 'vitest';
import { mipLevel } from './collectibleSprite';

describe('mipLevel', () => {
	it('draws the full texture when it is not shrunk', () => {
		expect(mipLevel(1, 5)).toBe(0);
		expect(mipLevel(1.4, 5)).toBe(0);
	});

	it('picks the mip that is then shrunk by 1x to 2x', () => {
		for (const scale of [0.9, 0.5, 0.3, 0.12, 0.07]) {
			const level = mipLevel(scale, 6);
			const left = scale * 2 ** level;
			expect(left).toBeGreaterThan(0.5 - 1e-9);
			expect(left).toBeLessThanOrEqual(1 + 1e-9);
		}
	});

	it('stops at the smallest mip', () => {
		expect(mipLevel(0.001, 4)).toBe(3);
	});

	it('falls back to the texture for a bad scale', () => {
		expect(mipLevel(0, 4)).toBe(0);
		expect(mipLevel(Number.NaN, 4)).toBe(0);
	});
});
