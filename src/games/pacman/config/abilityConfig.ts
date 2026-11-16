/** The abilities of the season levels (`DESIGN.md` §5, Abilities): echo, mask, shock. */
export type AbilityKind = 'echo' | 'mask' | 'shock';

export const ABILITY_KINDS: readonly AbilityKind[] = ['echo', 'mask', 'shock'];

export const ABILITY = {
	/** Chance that a season level has an ability token at all (at most one per level). */
	chance: 0.5,
	/** The token appears once this share of the dots is eaten: a random point in the window. */
	window: [0.3, 0.7],
	/** The token lies this many steps (by path, tunnels not counted) from the hero. */
	steps: [8, 18],
	/** A tile this close (steps) to an active ghost blocks the way to the token. */
	ghostClearance: 1,
	/** No tile for the token now: seconds before the next try. */
	retrySeconds: 0.25,
	/** Seconds the token waits to be taken, and its last seconds, when it blinks. */
	tokenSeconds: 8,
	tokenBlinkSeconds: 2,
	mask: {
		/** Seconds the hero is a ghost, and the last ones, when the mask blinks. */
		seconds: 5,
		blinkSeconds: 1,
		/** Seconds the hero stays untouchable when the mask ends inside a ghost. */
		graceSeconds: 0.5
	},
	shock: {
		/** Tiles (straight line) from the hero to the first ghost, and from ghost to ghost. */
		reach: 6,
		/** Seconds a struck ghost stands still, and the last ones, when it shakes. */
		seconds: 3,
		shakeSeconds: 0.5
	}
} as const;
