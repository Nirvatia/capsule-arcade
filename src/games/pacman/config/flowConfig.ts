/**
 * Durations of the game flow, in seconds. Every timed state reads its phases from here, so
 * later animation stages retime the flow in one place.
 */
export const FLOW = {
	/** READY at the start of a new game, with the intro jingle. */
	readyIntro: 5,
	/** READY after a death or a level change. */
	readyShort: 2,
	/**
	 * Death, a black hole: the colour drains from the death point and the level falls into
	 * it (`shatter`; Pac-Man's own death, 1.75 s, plays inside it), the singularity flashes
	 * over the dark (`void`), and the level unfolds again from the respawn point, its colour
	 * returning along the corridors (`rebuild`). 4 s in all.
	 */
	death: {
		shatter: 1.9,
		void: 0.45,
		rebuild: 1.65
	},
	/**
	 * Level clear: the season turns. Beads of light run down the corridors (`lights`, and
	 * on into the turn), every tile flips over to the next level's world (`turn`), the new
	 * world settles (`settle`). The next level then starts in place, without a fade.
	 */
	levelClear: {
		lights: 1.3,
		turn: 3,
		settle: 1
	},
	/**
	 * The arcade (secret level): Pac-Man folds away (`fold`), a beat of empty board
	 * (`pause`); a cleared round blinks the maze (`flash`), and after round 2 the
	 * intermission plays.
	 */
	arcade: {
		death: { fold: 1.8, pause: 0.6 },
		flash: 2,
		intermission: 7.5
	},
	/** Screen fade between menu and game and between levels: each half, out then in. */
	screenFade: 0.4,
	/** Game over ignores confirm/menu this long, so a held key does not restart at once. */
	gameOverInputLock: 1
} as const;
