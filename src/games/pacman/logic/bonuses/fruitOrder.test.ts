import { describe, expect, it } from 'vitest';
import { fruitForLevel, MS_FRUIT_BY_LEVEL } from './fruitCatalog';

describe('fruit order', () => {
	it("follows the arcade's Pac-Man order, then the key", () => {
		const levels = Array.from({ length: 15 }, (_, i) => fruitForLevel(i + 1, 'pacman'));
		expect(levels).toEqual([
			'CHERRY',
			'STRAWBERRY',
			'ORANGE',
			'ORANGE',
			'APPLE',
			'APPLE',
			'MELON',
			'MELON',
			'GALAXIAN',
			'GALAXIAN',
			'BELL',
			'BELL',
			'KEY',
			'KEY',
			'KEY'
		]);
	});

	it('gives Ms. Pac-Man a fixed order for levels 1-7, then a stable random one of those', () => {
		const first = Array.from({ length: 7 }, (_, i) => fruitForLevel(i + 1, 'ms-pacman'));
		expect(first).toEqual([...MS_FRUIT_BY_LEVEL]);
		const later = Array.from({ length: 40 }, (_, i) => fruitForLevel(i + 8, 'ms-pacman'));
		for (const kind of later) {
			expect(MS_FRUIT_BY_LEVEL).toContain(kind);
		}
		expect(new Set(later).size).toBeGreaterThan(3);
		expect(fruitForLevel(20, 'ms-pacman')).toBe(fruitForLevel(20, 'ms-pacman'));
	});

	it('never gives a bell or a key early', () => {
		for (const profile of ['pacman', 'ms-pacman'] as const) {
			for (let level = 1; level <= 4; level += 1) {
				expect(['BELL', 'KEY']).not.toContain(fruitForLevel(level, profile));
			}
		}
	});
});
