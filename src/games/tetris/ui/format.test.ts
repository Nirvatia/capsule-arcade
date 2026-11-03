import { describe, expect, it } from 'vitest';
import { formatScore, formatTime } from './format';

describe('format', () => {
	it('pads and groups scores', () => {
		expect(formatScore(48720)).toBe('048 720');
		expect(formatScore(1234567)).toBe('1 234 567');
		expect(formatScore(-5)).toBe('000 000');
	});

	it('formats time', () => {
		expect(formatTime(83456)).toBe('1:23.4');
		expect(formatTime(120000, false)).toBe('2:00');
		expect(formatTime(Number.NaN)).toBe('0:00.0');
	});
});
