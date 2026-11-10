import { describe, expect, it } from 'vitest';
import { CYCLE_LENGTH, mazeIndexForSeasonLevel, mazeOrder } from './MazeCycle';
import {
	firstLevelOfSeason,
	levelOfSeasonLevel,
	seasonForLevel,
	seasonLevelOf
} from './SeasonCatalog';

const SEEDS = [0, 1, 7, 12345, 0xdeadbeef, 4294967295];

describe('mazeOrder', () => {
	it('the first cycle goes in order', () => {
		for (const seed of SEEDS) {
			expect(mazeOrder(seed, 0)).toEqual([0, 1, 2, 3]);
		}
	});

	it('every cycle plays each maze exactly once', () => {
		for (const seed of SEEDS) {
			for (let cycle = 0; cycle < 60; cycle += 1) {
				expect([...mazeOrder(seed, cycle)].sort()).toEqual([0, 1, 2, 3]);
			}
		}
	});

	it('never plays a maze twice in a row, across the cycle boundary too', () => {
		for (const seed of SEEDS) {
			let previous = -1;
			for (let n = 1; n <= 4 * 200; n += 1) {
				const maze = mazeIndexForSeasonLevel(seed, n);
				expect(maze).not.toBe(previous);
				previous = maze;
			}
		}
	});

	it('is repeatable for a seed and differs between seeds', () => {
		expect(mazeOrder(99, 5)).toEqual(mazeOrder(99, 5));
		const orders = new Set(SEEDS.map((seed) => mazeOrder(seed, 3).join()));
		expect(orders.size).toBeGreaterThan(1);
	});

	it('later cycles are not all the same order', () => {
		const orders = new Set(Array.from({ length: 30 }, (_, c) => mazeOrder(5, c).join()));
		expect(orders.size).toBeGreaterThan(5);
	});

	it('survives an invalid cycle', () => {
		expect(mazeOrder(1, -1)).toHaveLength(CYCLE_LENGTH);
	});
});

describe('season levels without the boss levels', () => {
	it('count on past every fifth level', () => {
		const levels = [1, 2, 3, 4, 6, 7, 8, 9, 11, 12];
		expect(levels.map(seasonLevelOf)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
		expect(levels.map((_, i) => levelOfSeasonLevel(i + 1))).toEqual(levels);
	});

	it('levels 1-4 and 6-9 are the four seasons in order', () => {
		const names = (levels: number[]) => levels.map((l) => seasonForLevel(l).name);
		expect(names([1, 2, 3, 4])).toEqual(['summer', 'autumn', 'winter', 'spring']);
		expect(names([6, 7, 8, 9])).toEqual(['summer', 'autumn', 'winter', 'spring']);
		expect(names([11, 12, 13, 14])).toEqual(['summer', 'autumn', 'winter', 'spring']);
	});

	it('each run of four plays all four mazes', () => {
		for (const seed of SEEDS) {
			for (const run of [
				[1, 2, 3, 4],
				[6, 7, 8, 9],
				[11, 12, 13, 14],
				[16, 17, 18, 19]
			]) {
				const mazes = run.map((l) => seasonForLevel(l, seed).maze).sort();
				expect(mazes).toEqual(['grid_01', 'grid_02', 'grid_03', 'grid_04']);
			}
		}
	});

	it('level 1 is always grid_01, so the menu and the first game agree', () => {
		for (const seed of SEEDS) {
			expect(seasonForLevel(1, seed).maze).toBe('grid_01');
		}
	});

	it('a jump to any level gets the maze a normal run reaches', () => {
		const seed = 31337;
		const walked: string[] = [];
		for (let level = 1; level <= 40; level += 1) {
			if (level % 5 !== 0) walked.push(seasonForLevel(level, seed).maze);
		}
		const jumped = walked.map((_, i) => seasonForLevel(levelOfSeasonLevel(i + 1), seed).maze);
		expect(jumped).toEqual(walked);
	});

	it('the dev panel jumps to the first level of each season', () => {
		expect((['summer', 'autumn', 'winter', 'spring'] as const).map(firstLevelOfSeason)).toEqual([
			1, 2, 3, 4
		]);
	});
});
