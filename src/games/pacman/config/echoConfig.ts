/** The echo bonus: a rare token that sets off a riot of Pac-Man clones. */
export const ECHO = {
	/** Chance that a season level has an echo token at all (at most one per level). */
	chance: 0.35,
	/** The token appears once this share of the dots is eaten: a random point in the window. */
	window: [0.3, 0.7],
	/** The token lies at least this many steps (by path) from the hero, never under his feet. */
	minSteps: 8,
	/** Seconds the token waits to be taken. */
	tokenSeconds: 8,
	/** How many clones come out, and how long the riot lasts (seconds): both picked at random. */
	clones: [7, 9],
	seconds: [2, 3],
	/** The last seconds of the riot the clones blink. */
	fadeSeconds: 0.5,
	/** Tiles per second. */
	speed: 6,
	/** The clones leave the token one after another, this many seconds apart. */
	stagger: 0.06
} as const;
