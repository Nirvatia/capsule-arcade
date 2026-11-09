import { describe, expect, it } from 'vitest';
import { EventBus } from '../../engine/EventBus';
import type { PacmanEventMap } from '../../core/Events';
import { LevelLoader } from './LevelLoader';
import { SCORE_TABLE } from '../../config/scoreConfig';

function newRun(profile: 'pacman' | 'ms-pacman' = 'pacman'): LevelLoader {
	const loader = new LevelLoader(new EventBus<PacmanEventMap>());
	if (loader.profile !== profile) {
		loader.toggleProfile();
	}
	loader.startNewGame();
	return loader;
}

describe('level routing', () => {
	it('levels 1-4 are the seasons in order, then again', () => {
		const loader = newRun();
		const seasons: string[] = [];
		for (let level = 1; level <= 4; level += 1) {
			seasons.push(loader.ensure().season.name);
			loader.advanceLevel();
		}
		expect(seasons).toEqual(['summer', 'autumn', 'winter', 'spring']);
	});

	it('the seasons go on after the hell: level 6 is summer again, on a new run of mazes', () => {
		const loader = newRun();
		loader.setMazeSeed(2024);
		loader.startNewGame();
		const seen: { level: number; season: string; maze: string; hell: boolean }[] = [];
		for (let level = 1; level <= 14; level += 1) {
			const session = loader.ensure();
			seen.push({
				level: loader.level,
				season: session.season.name,
				maze: session.season.maze,
				hell: loader.hellMode
			});
			loader.advanceLevel();
		}
		expect(seen.filter((s) => s.hell).map((s) => s.level)).toEqual([5, 10]);
		const regular = seen.filter((s) => !s.hell);
		expect(regular.slice(0, 4).map((s) => s.season)).toEqual([
			'summer',
			'autumn',
			'winter',
			'spring'
		]);
		expect(regular.slice(4, 8).map((s) => s.season)).toEqual([
			'summer',
			'autumn',
			'winter',
			'spring'
		]);
		expect(regular.slice(0, 4).map((s) => s.maze)).toEqual([
			'grid_01',
			'grid_02',
			'grid_03',
			'grid_04'
		]);
		for (const run of [regular.slice(0, 4), regular.slice(4, 8)]) {
			expect(run.map((s) => s.maze).sort()).toEqual(['grid_01', 'grid_02', 'grid_03', 'grid_04']);
		}
		for (const s of seen.filter((x) => x.hell)) {
			expect(s.maze).toBe('doom');
		}
	});

	it('peekNextLevel shows the maze the next level will get', () => {
		const loader = newRun();
		loader.setMazeSeed(77);
		loader.startNewGame();
		for (let i = 0; i < 12; i += 1) {
			const next = loader.peekNextLevel();
			loader.advanceLevel();
			expect(loader.ensure().season.maze).toBe(next.season.maze);
		}
	});

	it('a new game picks a new maze order, but level 1 stays grid_01', () => {
		const loader = newRun();
		const orders = new Set<string>();
		for (let game = 0; game < 12; game += 1) {
			loader.startNewGame();
			expect(loader.ensure().season.maze).toBe('grid_01');
			let order = '';
			for (let i = 0; i < 9; i += 1) {
				loader.advanceLevel();
				order += loader.ensure().season.maze;
			}
			orders.add(order);
		}
		expect(orders.size).toBeGreaterThan(1);
	});

	it.each(['pacman', 'ms-pacman'] as const)('every fifth level is the hell (%s)', (profile) => {
		const loader = newRun(profile);
		for (let level = 1; level < 5; level += 1) {
			expect(loader.hellMode).toBe(false);
			loader.advanceLevel();
		}
		expect(loader.level).toBe(5);
		expect(loader.hellMode).toBe(true);
		expect(loader.ensure().doom).not.toBeNull();
		expect(loader.peekNextLevel().hell).toBe(false);
		loader.advanceLevel();
		expect(loader.hellMode).toBe(false);
	});
});

describe('level change carry-over', () => {
	it('keeps the score, the lives and the next-life threshold', () => {
		const loader = newRun();
		const before = loader.ensure();
		before.score.add(1234);
		before.combat.setLives(5);
		before.combat.setNextLifeThreshold(SCORE_TABLE.lifeThresholdStep * 3);
		loader.advanceLevel();
		const after = loader.ensure();
		expect(after).not.toBe(before);
		expect(loader.level).toBe(2);
		expect(after.score.score).toBe(1234);
		expect(after.combat.lives).toBe(5);
		expect(after.combat.nextLifeThreshold).toBe(SCORE_TABLE.lifeThresholdStep * 3);
	});

	it('a new game starts over on level 1 with three lives and no score', () => {
		const loader = newRun();
		loader.ensure().score.add(500);
		loader.advanceLevel();
		loader.startNewGame();
		const session = loader.ensure();
		expect(loader.level).toBe(1);
		expect(session.score.score).toBe(0);
		expect(session.combat.lives).toBe(3);
	});
});
