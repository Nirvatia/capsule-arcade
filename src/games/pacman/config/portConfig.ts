// The Port (a boss world candidate, `DESIGN.md` §7c): the hero hunts the Broker, a smuggler AI that
// hacks the crane terminals one by one. Every number of its rules, in tiles and seconds.
export const PORT = {
	hp: 3,
	hitInvulnerable: 1.4,
	/** The Broker: three hits (the phases), faster and quicker at his work each time. */
	boss: {
		hp: 3,
		speed: [4.8, 5.2, 5.6],
		/** Seconds he must stand at a terminal, per phase. */
		hack: [4, 3.4, 2.8],
		/** A sprint when the hero is near on his way: faster by this factor, within `panicDist` tiles. */
		panic: 1.2,
		panicDist: 4,
		stun: 1.1,
		bite: 0.75,
		/** After a warp he needs a moment before he starts hacking (a fraction of the hack). */
		warpDelay: 0.25,
		/** A power cell: the Broker's speed factor and the seconds it lasts. */
		slow: 0.65,
		slowFor: 7
	},
	/** The drones: three on the field, one more wakes with every terminal he hacks (six at most). */
	drones: { count: 6, active: 3 },
	/** The hero's dash: one charge per `nuts` nuts, `max` in the pocket, `tiles` long. */
	dash: { tiles: 4, nuts: 12, max: 3 },
	/** A power cell makes the drones flee for this long (and slows the Broker). */
	cell: { fear: 7, eat: 200 },
	/** The crane terminals, in tiles (four-way crossings of the yard). */
	terminals: [
		{ x: 6, y: 5 },
		{ x: 18, y: 5 },
		{ x: 6, y: 21 },
		{ x: 18, y: 21 }
	],
	score: { bite: 1000 }
} as const;
