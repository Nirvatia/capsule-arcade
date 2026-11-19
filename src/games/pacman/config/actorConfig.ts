/** Two actors touch when their centers are within half a tile (squared distance, tiles²). */
export const ACTOR_CONTACT_DISTANCE_SQ = 0.25;

/** The hero eats a dot or an energizer once his centre is this close to it (tiles). */
export const EAT_REACH = 0.3;

/**
 * A turn pressed this close (tiles) before a junction's centre cuts the corner: the hero
 * takes the new heading at once and runs the corner on the diagonal (the arcade's cornering;
 * the ghosts cannot).
 */
export const CORNER_WINDOW = 0.4;

/**
 * The rage. `dashStart` / `dashEnd`: Pac-Man's speed under the energizer, a factor on his
 * own, as it begins and as it runs out (the season levels only; the arcade keeps its own
 * speeds, Ms. Pac-Man's overdrive none: the balance bot found her dying far more). Taking an
 * energizer never stops play; only eating a ghost has its own separate hit-stop.
 */
export const RAGE = {
	dashStart: 1.22,
	dashEnd: 1.1
} as const;

/** The rage's speed factor with `left` of it to run (1 as it starts, 0 at its end). */
export function rageSpeed(left: number): number {
	const k = Math.max(0, Math.min(1, left));
	return RAGE.dashEnd + (RAGE.dashStart - RAGE.dashEnd) * k;
}
