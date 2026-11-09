import { describe, expect, it } from 'vitest';
import { padSink } from './padSink';

describe('padSink', () => {
	it('is out of the pad a tile away and fully in on its centre', () => {
		expect(padSink(1)).toBe(0);
		expect(padSink(3)).toBe(0);
		expect(padSink(0)).toBe(1);
		expect(padSink(0.1)).toBe(1);
	});

	it('grows steadily as the hero nears the centre', () => {
		let last = -1;
		for (let d = 1; d >= 0; d -= 0.05) {
			const k = padSink(d);
			expect(k).toBeGreaterThanOrEqual(last);
			last = k;
		}
	});
});
