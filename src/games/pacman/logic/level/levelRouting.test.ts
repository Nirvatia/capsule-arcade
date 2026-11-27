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

	it('the seasons go on after a boss: level 6 is summer again, on a new run of mazes', () => {
		const loader = newRun();
		loader.setMazeSeed(2024);
		loader.startNewGame();
		const seen: { level: number; season: string; maze: string; hell: boolean }[] = [];
		const bossMazes: string[] = [];
		for (let level = 1; level <= 14; level += 1) {
			const session = loader.ensure();
			seen.push({
				level: loader.level,
				season: session.season.name,
				maze: session.season.maze,
				hell: loader.hellMode || loader.stationMode
			});
			if (loader.hellMode || loader.stationMode) bossMazes.push(session.season.maze);
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
		// the hell and the station, one each: never the same boss twice in a row
		expect([...bossMazes].sort()).toEqual(['doom', 'station']);
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

	it.each(['pacman', 'ms-pacman'] as const)('every fifth level is a boss level (%s)', (profile) => {
		const loader = newRun(profile);
		for (let level = 1; level < 5; level += 1) {
			expect(loader.hellMode || loader.stationMode).toBe(false);
			loader.advanceLevel();
		}
		expect(loader.level).toBe(5);
		expect(loader.hellMode !== loader.stationMode).toBe(true);
		expect(loader.peekNextLevel()).toMatchObject({ hell: false, station: false });
		loader.advanceLevel();
		expect(loader.hellMode || loader.stationMode).toBe(false);
	});

	it.each(['hell', 'station'] as const)('a forced %s builds its own world', (boss) => {
		const loader = newRun();
		loader.debugForceBoss(boss);
		loader.debugGotoLevel(5);
		const session = loader.ensure();
		expect(loader.hellMode).toBe(boss === 'hell');
		expect(loader.stationMode).toBe(boss === 'station');
		expect(session.season.maze).toBe(boss === 'hell' ? 'doom' : 'station');
		expect(session.doom !== null).toBe(boss === 'hell');
		expect(session.station).toBe(boss === 'station');
	});

	it('a forced nightwood builds the forest: its rules, no hell, no station', () => {
		const loader = newRun();
		loader.debugForceBoss('nightwood');
		loader.debugGotoLevel(5);
		const session = loader.ensure();
		expect(loader.nightwoodMode).toBe(true);
		expect(loader.hellMode || loader.stationMode).toBe(false);
		expect(session.season.maze).toBe('nightwood');
		expect(session.nightwood).toBe(true);
		expect(session.nightwoodRun).not.toBeNull();
		expect(session.doom).toBeNull();
		expect(session.bossReward).not.toBeNull();
		// the boss is the level 5 only: level 6 goes back to the seasons
		expect(loader.peekNextLevel()).toMatchObject({ hell: false, station: false, nightwood: false });
	});

	it('in the forest the last dot does not end the level, and an energizer frightens as usual', () => {
		const loader = newRun();
		loader.debugForceBoss('nightwood');
		loader.debugGotoLevel(5);
		const session = loader.ensure();
		let energizer: { x: number; y: number } | null = null;
		for (let y = 0; y < session.grid.height; y += 1) {
			for (let x = 0; x < session.grid.width; x += 1) {
				const token = session.grid.tileAt(x, y);
				if (token === 'DT') session.progress.collectAt(x, y);
				if (token === 'EU' && !energizer) energizer = { x, y };
			}
		}
		expect(session.progress.remainingDots).toBe(0);
		session.combat.update(1 / 60);
		expect(session.combat.endRequested).toBe(false);
		session.ghosts.setGhostState('BLINKY', 'active');
		session.progress.collectAt(energizer!.x, energizer!.y);
		session.combat.update(1 / 60);
		expect(session.combat.isPowerActive).toBe(true);
		expect(session.ghosts.list.find((g) => g.kind === 'BLINKY')?.state).toBe('frightened');
	});

	it('on the station an energizer frightens nobody', () => {
		const loader = newRun();
		loader.debugForceBoss('station');
		loader.debugGotoLevel(5);
		const session = loader.ensure();
		let energizer: { x: number; y: number } | null = null;
		for (let y = 0; y < session.grid.height && !energizer; y += 1) {
			for (let x = 0; x < session.grid.width && !energizer; x += 1) {
				if (session.grid.tileAt(x, y) === 'EU') energizer = { x, y };
			}
		}
		expect(energizer).not.toBeNull();
		session.progress.collectAt(energizer!.x, energizer!.y);
		session.combat.update(1 / 60);
		expect(session.combat.isPowerActive).toBe(false);
		expect(session.ghosts.list.some((g) => g.state === 'frightened')).toBe(false);
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
