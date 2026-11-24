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
 * The rage. Pac-Man's speed under the energizer, a factor on his own: `dash` for its first
 * `dashTime` seconds, then `lead` to its end, a step with no blend (the season levels only;
 * the arcade keeps its own speeds, Ms. Pac-Man's overdrive none: the balance bot found her
 * dying far more). Taking an energizer never stops play; only eating a ghost has its own
 * separate hit-stop.
 */
export const RAGE = {
	dash: 1.2,
	dashTime: 1,
	lead: 1.1
} as const;

/** The rage's speed factor `elapsed` seconds after the energizer was eaten. */
export function rageSpeed(elapsed: number): number {
	return elapsed < RAGE.dashTime ? RAGE.dash : RAGE.lead;
}
