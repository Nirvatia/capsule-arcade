import { describe, expect, it } from 'vitest';
import { BOSSES, bossForLevel, isBossLevel } from './BossCatalog';

describe('the boss catalog', () => {
	it('gives a boss to every fifth level only', () => {
		expect([1, 2, 3, 4, 6, 9, 11].map((level) => bossForLevel(level, 7))).toEqual(
			Array(7).fill(null)
		);
		for (const level of [5, 10, 15, 20]) {
			expect(isBossLevel(level)).toBe(true);
			expect(BOSSES).toContain(bossForLevel(level, 7));
		}
	});

	it('never brings the same boss twice in a row', () => {
		for (let seed = 0; seed < 200; seed += 1) {
			for (let level = 10; level <= 60; level += 5) {
				expect(bossForLevel(level, seed)).not.toBe(bossForLevel(level - 5, seed));
			}
		}
	});

	it('is fixed by the seed and varies between runs', () => {
		expect(bossForLevel(5, 1234)).toBe(bossForLevel(5, 1234));
		const firsts = new Set(Array.from({ length: 64 }, (_, seed) => bossForLevel(5, seed)));
		expect([...firsts].sort()).toEqual([...BOSSES].sort());
	});

	it('lets the dev panel force a boss', () => {
		for (let seed = 0; seed < 20; seed += 1) {
			expect(bossForLevel(5, seed, 'station')).toBe('station');
			expect(bossForLevel(10, seed, 'hell')).toBe('hell');
		}
		expect(bossForLevel(4, 0, 'hell')).toBeNull();
	});
});
