// The Zone (a boss world candidate, `DESIGN.md` §7b): every number of its rules, in tiles and seconds.
export const ZONE = {
	hp: 3,
	hitInvulnerable: 1.4,
	/** Nuts (the dots) feed the bolts: one bolt per `dotsPer` nuts, `max` in the pocket. */
	bolt: { max: 3, dotsPer: 10, range: 4, disarm: 8, lure: 4 },
	/** The share of nuts that must be taken, besides the artifacts, to open the Monolith. */
	dotsNeeded: 0.5,
	/** Seconds: the first calm, the later calm, the siren, the wave; the wave hurts at `peak` of its length. */
	emission: { first: 22, calm: 30, siren: 6, wave: 2.4, peak: 0.4, hit: 2 },
	heat: { period: 3.6, warn: 0.5, hot: 1.4 },
	electra: { period: 2.8, warn: 0.7, strike: 0.3 },
	trampoline: { tiles: 3, cooldown: 1.2 },
	anomalies: { heat: 5, electra: 3, trampoline: 3, gap: 3, spawnClear: 4 },
	tushkan: {
		count: 5,
		hopSpeed: 7,
		rushSpeed: 7.5,
		rushT: 1.2,
		rushDist: 3,
		hearDist: 8,
		sniff: [0.4, 0.9],
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
	artifacts: { medusa: 8, speed: 8, speedFactor: 1.25 }
} as const;
