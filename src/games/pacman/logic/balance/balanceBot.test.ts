import { describe, expect, it } from 'vitest';
import { playLevel } from './balanceBot';
import { seasonForLevel } from '../level/SeasonCatalog';

describe('the balance bot', () => {
	it('plays a whole level and clears it', () => {
		const result = playLevel({ season: seasonForLevel(1), level: 1, profile: 'pacman', seed: 1 });
		expect(result.cleared).toBe(true);
		expect(result.seconds).toBeGreaterThan(30);
		expect(result.seconds).toBeLessThan(300);
		expect(result.score).toBeGreaterThan(2000);
	});

	it('plays the same game for the same seed, and a different one for another', () => {
		const run = (seed: number) =>
			playLevel({ season: seasonForLevel(2), level: 2, profile: 'ms-pacman', seed });
		const a = run(5);
		const b = run(5);
		expect(a).toEqual(b);
		const others = [6, 7, 8].map(run);
		expect(others.some((o) => o.seconds !== a.seconds)).toBe(true);
	});
});
