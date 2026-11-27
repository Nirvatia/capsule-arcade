// The Net (a boss world candidate, `DESIGN.md` §7c): a cyberpunk server maze on the Lady Bug idea.
// Every number of its rules, in tiles and seconds.
export const NET = {
	hp: 3,
	hitInvulnerable: 1.4,
	/** The security drones: four, each with a Pac-Man ghost's way of hunting; released one by one. */
	drone: {
		count: 4,
		speed: 5.4,
		frightSpeed: 3.6,
		release: [0, 3, 6, 9],
		refresh: 0.15,
		shy: 8,
		respawn: 6,
		bite: 0.6
	},
	/** A hack node: the drones flee and can be eaten (200, 400, 800, 1600). */
	hack: { fear: 7, eat: 200 },
	/** Firewall doors in the corridors: the hero slams one shut behind him for `hold` seconds. */
	doors: { count: 10, hold: 8, clear: 3 },
	/** The last data: the drones get faster (Elroy). */
	surge: { first: 20, firstMul: 1.15, second: 8, secondMul: 1.3 }
} as const;
