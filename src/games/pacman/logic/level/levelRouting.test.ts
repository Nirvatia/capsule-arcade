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
