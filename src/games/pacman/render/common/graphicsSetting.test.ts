import { describe, expect, it } from 'vitest';
import {
	GRAPHICS_CHOICES,
	isGraphicsChoice,
	nextGraphicsChoice,
	parseAutoQuality
} from './graphicsSetting';

describe('graphics setting', () => {
	it('goes round the choices in the menu order', () => {
		expect(GRAPHICS_CHOICES).toEqual(['auto', 'high', 'medium', 'low']);
		expect(nextGraphicsChoice('auto')).toBe('high');
		expect(nextGraphicsChoice('high')).toBe('medium');
		expect(nextGraphicsChoice('medium')).toBe('low');
		expect(nextGraphicsChoice('low')).toBe('auto');
	});

	it('recognizes the choices', () => {
		for (const choice of GRAPHICS_CHOICES) {
			expect(isGraphicsChoice(choice)).toBe(true);
		}
		expect(isGraphicsChoice('ultra')).toBe(false);
		expect(isGraphicsChoice(null)).toBe(false);
	});

	it('reads what Auto found, and starts from High on anything else', () => {
		const fresh = { quality: 'high', settled: false };
		expect(parseAutoQuality('{"quality":"medium","settled":false}')).toEqual({
			quality: 'medium',
			settled: false
		});
		expect(parseAutoQuality('{"quality":"low","settled":true}')).toEqual({
			quality: 'low',
			settled: true
		});
		expect(parseAutoQuality(null)).toEqual(fresh);
		expect(parseAutoQuality('')).toEqual(fresh);
		expect(parseAutoQuality('not json')).toEqual(fresh);
		expect(parseAutoQuality('"medium"')).toEqual(fresh);
		expect(parseAutoQuality('{"quality":"ultra","settled":true}')).toEqual(fresh);
	});
});
