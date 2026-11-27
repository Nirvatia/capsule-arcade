// The Zone (a boss world candidate, `DESIGN.md` §7b): every number of its rules, in tiles and seconds.
export const ZONE = {
	hp: 3,
	hitInvulnerable: 1.4,
	/** Nuts (the dots) feed the bolts: one bolt per `dotsPer` nuts, `max` in the pocket. */
	bolt: { max: 3, dotsPer: 10, range: 4, disarm: 8, lure: 4 },
	/** The share of nuts that must be taken, besides the artifacts, to open the Monolith. */
	dotsNeeded: 0.5,
	/** Seconds: the first calm, the later calm, the siren, the wave; the wave hurts at `peak` of its length. */
	emission: { first: 30, calm: 40, siren: 7, wave: 2.4, peak: 0.4, hit: 2 },
	heat: { period: 4.5, warn: 0.7, hot: 1.0 },
	electra: { period: 4, warn: 0.9, strike: 0.3 },
	/** A few fields, never on the only way; each holds golden nuts (a pocket worth the risk). */
	anomalies: { heat: 1, electra: 1, gap: 4, spawnClear: 5 },
	golden: { score: 100, nuts: 3 },
	tushkan: {
		count: 3,
		hopSpeed: 7.5,
		rushSpeed: 8,
		rushT: 1.2,
		rushDist: 3,
		hearDist: 99,
		sniff: [0.2, 0.45],
		hopTiles: [2, 3],
		tired: 1.0,
		bite: 0.55,
		respawn: 8,
		burrowClear: 8
	},
	poltergeist: {
		first: 9,
		interval: [4, 7],
		appear: 0.8,
		telegraph: 1.1,
		barrel: 14,
		range: [4, 9],
		stun: 3
	},
	/** An artifact is also an energizer: the tushkans flee for `fear` seconds and can be eaten (200, 400, 800, 1600). */
	artifacts: { medusa: 8, speed: 8, speedFactor: 1.25, fear: 7, eat: 200 }
} as const;
