// What the game tells a hero's view each frame (`HeroView`): the look, the BFG charge, the death.
export type PlayerLook = 'normal' | 'energized' | 'berserk';

/** Per-frame state decided by the game. */
export interface PlayerDrawOptions {
	/** energized: power pellet / overdrive; berserk: the hell level's berserk pickup. */
	readonly look: PlayerLook;
	/** BFG charge 0..1: the body swells and the throat glows. */
	readonly charge: number;
	/** The death sequence is running. */
	readonly dying: boolean;
	/** The energizer is in its last seconds. */
	readonly ending?: boolean;
	/**
	 * Show the respawn shield's blink. Off outside play: the shield waits through READY
	 * and only ticks once the level runs, so it would blink on a hero standing still.
	 */
	readonly shield?: boolean;
	/** A tunnel pad lies one or two tiles ahead: a hero curls into a rolling ball for it. */
	readonly padAhead?: boolean;
	/** How far the hero has sunk into a tunnel pad, 0..1 (`padSink`). */
	readonly padSink?: number;
	/** The hell's BFG charge light: a level with a boss fight gives both heroes it. */
	readonly chargeLight?: boolean;
}
