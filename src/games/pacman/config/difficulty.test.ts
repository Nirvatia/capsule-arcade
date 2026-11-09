import { describe, expect, it } from 'vitest';
import { EventBus } from '../engine/EventBus';
import type { PacmanEventMap } from '../core/Events';
import {
	MAX_GHOST_SPEED,
	MIN_OVERDRIVE,
	MIN_POWER,
	RAMP_LEVELS,
	levelTuning
} from './difficultyConfig';
import { buildLevelSession } from '../logic/level/LevelSession';
import type { LevelSession } from '../logic/level/LevelSession';
import { seasonForLevel, seasonLevelOf, seasonModifiers } from '../logic/level/SeasonCatalog';
import type { SeasonName } from '../logic/level/SeasonCatalog';
import { SEASON_MAZES } from './mazes';
import type { GameProfile } from '../logic/rules/HypnosisService';

function session(level: number, season = seasonForLevel(level), secret = false): LevelSession {
	return buildLevelSession({
		events: new EventBus<PacmanEventMap>(),
		level,
		profile: 'pacman' as GameProfile,
		season,
		hell: false,
		secret,
		godMode: false
	});
}

describe('the difficulty ramp', () => {
	it('starts as the game was before it: level 1 is the base', () => {
		expect(levelTuning(1)).toEqual({
			ghostSpeed: 1,
			powerLoss: 0,
			scatter: 7,
			chase: 20,
			exitScale: 1,
			overdrive: 5
		});
	});

	it('only gets harder, step by step, and stops at the end of the ramp', () => {
		let prev = levelTuning(1);
		for (let n = 2; n <= 30; n += 1) {
			const t = levelTuning(n);
			expect(t.ghostSpeed).toBeGreaterThanOrEqual(prev.ghostSpeed);
			expect(t.powerLoss).toBeGreaterThanOrEqual(prev.powerLoss);
			expect(t.scatter).toBeLessThanOrEqual(prev.scatter);
			expect(t.chase).toBeGreaterThanOrEqual(prev.chase);
			expect(t.exitScale).toBeLessThanOrEqual(prev.exitScale);
			expect(t.overdrive).toBeLessThanOrEqual(prev.overdrive);
			if (n > RAMP_LEVELS) expect(t).toEqual(levelTuning(RAMP_LEVELS));
			prev = t;
		}
		expect(levelTuning(2).ghostSpeed).toBeGreaterThan(1);
		expect(levelTuning(RAMP_LEVELS).ghostSpeed).toBeLessThanOrEqual(MAX_GHOST_SPEED);
		expect(levelTuning(RAMP_LEVELS).overdrive).toBeGreaterThanOrEqual(MIN_OVERDRIVE);
	});

	it('treats a bad level as the first', () => {
		expect(levelTuning(0)).toEqual(levelTuning(1));
		expect(levelTuning(Number.NaN)).toEqual(levelTuning(1));
	});
});

describe('the ramp in a level', () => {
	it('level 1 plays at the season base', () => {
		const s = session(1);
		const mods = seasonModifiers(s.season.name);
		expect(s.ghosts.speedModifier).toBeCloseTo(mods.ghostSpeedModifier, 6);
		expect(s.combat.powerDuration).toBe(mods.powerDuration);
		expect(s.ghosts.waves).toEqual({ scatter: 7, chase: 20 });
		expect(s.ghosts.exitDelay('CLYDE')).toBe(9);
		expect(s.hypnosis.overdriveSeconds).toBe(5);
	});

	it('a late level has faster ghosts, a shorter energizer and waves, an earlier release', () => {
		const first = session(1);
		const late = session(17);
		expect(late.ghosts.speedModifier).toBeGreaterThan(first.ghosts.speedModifier);
		expect(late.combat.powerDuration).toBeLessThan(first.combat.powerDuration);
		expect(late.combat.powerDuration).toBeGreaterThanOrEqual(MIN_POWER);
		expect(late.ghosts.waves.scatter).toBeLessThan(7);
		expect(late.ghosts.waves.chase).toBeGreaterThan(20);
		expect(late.ghosts.exitDelay('CLYDE')).toBeLessThan(9);
		expect(late.hypnosis.overdriveSeconds).toBeLessThan(5);
	});

	it('does not count the boss levels: the level after a boss is the next season level', () => {
		// level 6 is the fifth season level, whatever the hell between did
		expect(seasonLevelOf(6)).toBe(5);
		const t = levelTuning(5);
		const s = session(6);
		expect(s.ghosts.waves).toEqual({ scatter: t.scatter, chase: t.chase });
	});

	it('never lets a ghost outrun the hero, in any season, at any level, on any maze', () => {
		const names: readonly SeasonName[] = ['summer', 'autumn', 'winter', 'spring'];
		for (const name of names) {
			for (const level of [1, 5, 9, 13, 20, 40]) {
				const s = session(level, { name, grid: SEASON_MAZES[0]!, maze: 'grid_01' });
				const hero = s.player.baseSpeed * seasonModifiers(name).playerSpeedModifier;
				const ghost = s.ghosts.baseSpeed * s.ghosts.speedModifier;
				expect(ghost).toBeLessThanOrEqual(hero + 1e-9);
			}
		}
	});

	it('leaves the secret level to its own rounds', () => {
		const s = session(99, seasonForLevel(1), true);
		expect(s.ghosts.waves).toEqual({ scatter: 7, chase: 20 });
		expect(s.hypnosis.overdriveSeconds).toBe(5);
	});
});
