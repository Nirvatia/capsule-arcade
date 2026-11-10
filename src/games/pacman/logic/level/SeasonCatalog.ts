import { GRID_CLASSIC, GRID_DOOM, SEASON_MAZES } from '../../config/mazes';
import { HELL_LEVEL_INTERVAL } from '../../config/gridConfig';
import type { GridMatrix } from '../../config/gridConfig';
import { CYCLE_LENGTH, mazeIndexForSeasonLevel } from './MazeCycle';

export type SeasonName = 'spring' | 'summer' | 'autumn' | 'winter';

export interface SeasonData {
	readonly name: SeasonName;
	readonly grid: GridMatrix;
	/** Which maze file the grid is (`grid_02`, `classic01`, `doom`): for the dev log and panel. */
	readonly maze: string;
}

/** Seasons in season-level order: summer, autumn, winter, spring, and again. */
const SEASONS: readonly SeasonName[] = ['summer', 'autumn', 'winter', 'spring'];

const SEASON_MAZE_NAMES: readonly string[] = SEASON_MAZES.map((_, i) => `grid_0${i + 1}`);

if (SEASONS.length !== CYCLE_LENGTH || SEASON_MAZES.length !== CYCLE_LENGTH) {
	throw new Error('SeasonCatalog: the seasons, the mazes and the maze cycle must all be four');
}

/**
 * Boss levels (every HELL_LEVEL_INTERVAL) are not season levels: the season levels count
 * on without them, so they come in runs 1-4, 6-9, 11-14 with a boss level between runs.
 * For a boss level this gives the number of the season level before it.
 */
export function seasonLevelOf(level: number): number {
	return Math.floor(level) - Math.floor(level / HELL_LEVEL_INTERVAL);
}

/** The level number of the `seasonLevel`-th season level (the inverse of `seasonLevelOf`). */
export function levelOfSeasonLevel(seasonLevel: number): number {
	const n = Math.max(1, Math.floor(seasonLevel));
	return n + Math.floor((n - 1) / (HELL_LEVEL_INTERVAL - 1));
}

/** The first level a season is played on (the dev panel's jump buttons). */
export function firstLevelOfSeason(season: SeasonName): number {
	return levelOfSeasonLevel(SEASONS.indexOf(season) + 1);
}

/**
 * The season and maze of a season level. `mazeSeed` is the run's seed for the maze order
 * (`MazeCycle`). Not for boss levels: they have their own world (`hellSeason`).
 */
export function seasonForLevel(level: number, mazeSeed = 0): SeasonData {
	if (!Number.isFinite(level) || level < 1) {
		console.error('SeasonCatalog.seasonForLevel', 'invalid level', level);
	}
	const safeLevel = Number.isFinite(level) && level >= 1 ? Math.floor(level) : 1;
	const seasonLevel = seasonLevelOf(safeLevel);
	const season = SEASONS[(seasonLevel - 1) % SEASONS.length];
	const mazeIndex = mazeIndexForSeasonLevel(mazeSeed, seasonLevel);
	const grid = SEASON_MAZES[mazeIndex];
	const maze = SEASON_MAZE_NAMES[mazeIndex];
	if (!season || !grid || !maze) {
		console.error('SeasonCatalog.seasonForLevel', 'missing season or grid', {
			level,
			seasonLevel,
			mazeIndex
		});
		throw new Error('SeasonCatalog.seasonForLevel: missing season or grid');
	}
	return { name: season, grid, maze };
}

/** The secret level's world: the first maze stays as its fallback. */
export function secretSeason(): SeasonData {
	return { name: 'winter', grid: GRID_CLASSIC, maze: 'classic01' };
}

/** The hell's world: its old maze stays until the new one is finished. */
export function hellSeason(): SeasonData {
	return { name: 'autumn', grid: GRID_DOOM, maze: 'doom' };
}

/** Per-season gameplay tuning (durations in seconds, speeds as multipliers). */
export interface SeasonModifiers {
	readonly powerDuration: number;
	readonly fruitDuration: number;
	readonly ghostSpeedModifier: number;
	readonly playerSpeedModifier: number;
}

const SEASON_MODIFIERS: Record<SeasonName, SeasonModifiers> = {
	spring: { powerDuration: 6.5, fruitDuration: 12, ghostSpeedModifier: 1, playerSpeedModifier: 1 },
	summer: { powerDuration: 6, fruitDuration: 14, ghostSpeedModifier: 1, playerSpeedModifier: 1 },
	autumn: { powerDuration: 6, fruitDuration: 12, ghostSpeedModifier: 0.97, playerSpeedModifier: 1 },
	winter: { powerDuration: 6, fruitDuration: 12, ghostSpeedModifier: 1, playerSpeedModifier: 0.97 }
};

export function seasonModifiers(season: SeasonName): SeasonModifiers {
	return SEASON_MODIFIERS[season];
}
