/** The echo ability's riot: a swarm of wisps that run out of the hero's tile and eat. */
export const ECHO = {
	/** How many clones come out (picked at random), and how long the riot lasts (seconds). */
	clones: [7, 9],
	seconds: 3,
	/** The last seconds of the riot the clones blink. */
	fadeSeconds: 0.5,
	/** Tiles per second. */
	speed: 6,
	/** The clones leave the hero one after another, this many seconds apart. */
	stagger: 0.06
} as const;
