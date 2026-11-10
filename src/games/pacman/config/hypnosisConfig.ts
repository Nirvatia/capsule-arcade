/** Ms. Pac-Man's overdrive and hypnosis: the times (seconds) and how the hypnotised ghost plays. */
export const HYPNOSIS = {
	/** The overdrive an energizer starts. */
	overdriveSeconds: 5,
	/** How long a ghost stays hypnotised. */
	seconds: 4,
	/** A ghost that wakes up on its own is enraged (faster, deadly) for this long. */
	enragedSeconds: 2,
	/** The hypnotised feeder's speed, against the ghost's own. */
	speedFactor: 0.8,
	/** The hunter's: a ghost on a hunt is no slower than usual, or a fleeing one is never caught. */
	hunterSpeedFactor: 1,
	/**
	 * It plans once for the time it has: at least this many dots it can really eat in that time
	 * make it a feeder (it follows the route); fewer make it a hunter (it chases the other ghosts).
	 */
	feederMinDots: 6,
	/** A frightened ghost within this many tiles of the hunter runs from it, not from her. */
	hunterFleeRadius: 4
} as const;
