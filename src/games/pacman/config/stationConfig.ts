// The station boss level's numbers (DESIGN.md §7a). Speeds are shares of the hero's base speed.

export const STATION = {
	/** The hero's health on the station; a touch costs one. */
	hp: 3,
	/** Seconds of grace after a touch (after the rewind). */
	grace: 1.5,
	rewind: {
		/** How far back the hero is pulled, seconds of his own running. */
		back: 2,
		/** How long the pull takes (everything else stands still). */
		seconds: 0.6
	},
	beam: {
		/** Half the flashlight cone's angle, radians, and its reach, tiles. */
		half: 0.46,
		reach: 6.5,
		/** A creature caught in the beam keeps fleeing this long after it leaves it. */
		linger: 0.7
	},
	flare: {
		/** A flare picked up bursts: everything this close (tiles) flees for `seconds`. */
		radius: 6,
		seconds: 5
	},
	superFlare: {
		/** The carried flare's beam down the corridor ahead: tiles, seconds. */
		reach: 12,
		seconds: 6,
		/** The token appears at least this far (tiles by path) from the hero. */
		awayFromHero: 4
	},
	speed: {
		wraith: 0.8,
		hunter: 0.95,
		/** The hunters in the nest (phase 3). */
		nest: 1,
		/** Anything fleeing runs a little faster than the hero, so it never blocks his way. */
		flee: 1.05
	},
	metamorphosis: {
		/** Shares of the dots eaten at which the next ghost wraps itself in a cocoon. */
		shares: [0.2, 0.4, 0.6, 0.8],
		/** At most this long after the previous one (seconds), so waiting does not stop it. */
		maxGap: 40,
		/** Seconds a cocoon beats before the hunter hatches. */
		cocoon: 6,
		/** Seconds the beam holds the hatching back per second it is on the cocoon. */
		beamHold: 1
	}
} as const;

/** The order the ghosts turn into hunters. */
export const METAMORPHOSIS_ORDER = ['BLINKY', 'PINKY', 'INKY', 'CLYDE'] as const;
