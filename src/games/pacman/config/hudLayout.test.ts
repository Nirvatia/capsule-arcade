import { describe, expect, it } from 'vitest';
import { hudModeFor, hudScaleFor } from './hudLayout';

describe('hudLayout', () => {
	it('puts the HUD in the margins of a landscape screen and on top of a narrower one', () => {
		expect(hudModeFor(1920, 1080)).toBe('side');
		expect(hudModeFor(1280, 720)).toBe('side');
		expect(hudModeFor(1024, 768)).toBe('top');
		expect(hudModeFor(400, 800)).toBe('top');
	});

	it('scales with the height, within limits', () => {
		expect(hudScaleFor(720)).toBe(1);
		expect(hudScaleFor(1080)).toBeCloseTo(1.5, 5);
		expect(hudScaleFor(300)).toBe(0.7);
		expect(hudScaleFor(4000)).toBe(1.8);
		expect(hudScaleFor(Number.NaN)).toBe(1);
	});
});
