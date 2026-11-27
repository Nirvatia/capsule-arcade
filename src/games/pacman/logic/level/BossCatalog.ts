import { HELL_LEVEL_INTERVAL } from '../../config/gridConfig';

/** The boss worlds: the hell (combat) and the station (stealth, DESIGN.md §7a). */
export type BossId = 'hell' | 'station';

export const BOSSES: readonly BossId[] = ['hell', 'station'];

/** The bosses a run draws from: the finished ones (the station back in since 2026-11-26). */
export const BOSS_ROTATION: readonly BossId[] = ['hell', 'station'];

/** Every HELL_LEVEL_INTERVAL-th level is a boss level, for both heroes. */
export function isBossLevel(level: number): boolean {
	return Number.isFinite(level) && level >= 1 && Math.floor(level) % HELL_LEVEL_INTERVAL === 0;
}

/** A number in 0..1 from the run's seed and the boss level's index (no state, any order). */
function pick(seed: number, index: number): number {
	let h = (Math.floor(seed) ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0;
	h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
	h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * The boss of `level` in a run seeded `seed`, or null for a level that is not a boss level.
 * The pick from `rotation` is random per run but fixed by the seed, and never the same boss twice
 * in a row while there are two to choose from. `forced` (the dev panel) wins.
 */
export function bossForLevel(
	level: number,
	seed: number,
	forced: BossId | null = null,
	rotation: readonly BossId[] = BOSS_ROTATION
): BossId | null {
	if (!isBossLevel(level)) {
		return null;
	}
	if (forced) {
		return forced;
	}
	const count = Math.floor(level) / HELL_LEVEL_INTERVAL;
	let previous: BossId | null = null;
	for (let k = 1; k <= count; k += 1) {
		const others = rotation.filter((boss) => boss !== previous);
		const pool = others.length > 0 ? others : rotation;
		previous = pool[Math.floor(pick(seed, k) * pool.length)] ?? pool[0] ?? null;
	}
	return previous;
}
