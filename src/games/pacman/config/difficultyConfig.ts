/**
 * How the season levels get harder. The n-th season level (boss levels do not count: 1-4, then
 * 6-9, ...) tunes the ghosts, the energizer and the waves; the ramp stops at `RAMP_LEVELS`.
 * Level 1 is the base game as it was before the ramp.
 */
export interface LevelTuning {
	/** Multiplier on the ghosts' speed. */
	readonly ghostSpeed: number;
	/** Seconds taken off the season's energizer time (never below `MIN_POWER`). */
	readonly powerLoss: number;
	/** The scatter and chase waves, seconds (they alternate for the whole level). */
	readonly scatter: number;
	readonly chase: number;
	/** Multiplier on the ghosts' delays before they leave the lair. */
	readonly exitScale: number;
	/** Ms. Pac-Man's overdrive, seconds (her energizer). */
	readonly overdrive: number;
}

/** The ramp reaches its end at this season level and stays there. */
export const RAMP_LEVELS = 13;
/** The least time an energizer (or her overdrive) ever lasts. */
export const MIN_POWER = 2.5;
export const MIN_OVERDRIVE = 3;
/**
 * The ghosts never outrun the hero: his 6.0 tiles a second against their 5.4 is a ratio of 1.11, so
 * a ghost at 1.1 times its speed is about as fast as he is (the arcade's ghosts never are faster).
 */
export const MAX_GHOST_SPEED = 1.1;

export function levelTuning(seasonLevel: number): LevelTuning {
	const n = Number.isFinite(seasonLevel) ? Math.max(1, Math.floor(seasonLevel)) : 1;
	const step = Math.min(n, RAMP_LEVELS) - 1;
	return {
		ghostSpeed: Math.min(MAX_GHOST_SPEED, 1 + 0.009 * step),
		powerLoss: 0.35 * step,
		scatter: Math.max(4, 7 - 0.25 * step),
		chase: Math.min(28, 20 + 0.7 * step),
		exitScale: Math.max(0.5, 1 - 0.04 * step),
		overdrive: Math.max(MIN_OVERDRIVE, 5 - 0.17 * step)
	};
}

/** The energizer time of a season at a level: the season's base less the ramp, at least MIN_POWER. */
export function powerSeconds(base: number, tuning: LevelTuning): number {
	return Math.max(MIN_POWER, base - tuning.powerLoss);
}
