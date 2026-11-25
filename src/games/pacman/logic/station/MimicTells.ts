// The lurker's tells (DESIGN.md §7a): what gives a creature lying as food away, so the player
// can learn it. Real food has none of them. Pure, independent of the creature's look: any body
// that takes the disguise paints them the same way.
// - a soft shadow (food is light and casts none of its own size);
// - sitting off the tile's centre, towards a wall (the food sits dead centre, in rows);
// - breathing out of step with the food;
// - its eyes open now and then for a moment;
// - a tremble when the hero comes near.
// The run's first lurkers teach (`lesson` 1 .. 0): every tell is stronger and the eyes open
// more often.

export const TELL_TUNE = {
	/** Off the centre, tiles. */
	offset: 0.15,
	/** The shadow's strength. */
	shadow: 0.5,
	/** The eyes: open every `blinkEvery` s, for `blinkFor` s. */
	blinkEvery: 5,
	blinkFor: 0.15,
	/** The tremble: within this many tiles of the hero, at most this far, tiles. */
	near: 3,
	tremble: 0.035,
	/** The breathing's phase against the food's (half a breath). */
	breath: 0.5,
	/** A full lesson doubles the tells. */
	lessonGain: 1
} as const;

export interface MimicTell {
	/** Off the tile's centre, tiles. */
	readonly dx: number;
	readonly dy: number;
	/** The shadow's strength, 0..1. */
	readonly shadow: number;
	/** The eyes, 0 shut .. 1 open. */
	readonly eyes: number;
	/** The tremble's reach this frame, tiles (0 when he is far). */
	readonly tremble: number;
	/** The breathing's phase offset against the food. */
	readonly breath: number;
}

const SIDES: ReadonlyArray<readonly [number, number]> = [
	[0, -1],
	[-1, 0],
	[0, 1],
	[1, 0]
];

/**
 * The tells of a lurker on tile (`x`, `y`) at `time`. `wall` says where the walls are (it leans
 * to one); `seed` spreads the blinks of different creatures; `lesson` 0..1 strengthens all.
 */
export function mimicTell(
	x: number,
	y: number,
	hero: { readonly x: number; readonly y: number },
	time: number,
	lesson: number,
	seed: number,
	wall: (x: number, y: number) => boolean
): MimicTell {
	const gain = 1 + TELL_TUNE.lessonGain * Math.max(0, Math.min(1, lesson));
	let dx = 0.7071;
	let dy = 0.7071;
	for (const [sx, sy] of SIDES) {
		if (wall(x + sx, y + sy)) {
			dx = sx;
			dy = sy;
			break;
		}
	}
	const off = TELL_TUNE.offset * Math.min(gain, 1.6);
	const every = TELL_TUNE.blinkEvery / gain;
	const phase = (time + seed * every * 0.37) % every;
	const open = TELL_TUNE.blinkFor * gain;
	const eyes = phase < open ? Math.sin((phase / open) * Math.PI) : 0;
	const d = Math.hypot(hero.x - (x + 0.5), hero.y - (y + 0.5));
	const tremble = d < TELL_TUNE.near ? TELL_TUNE.tremble * gain * (1 - d / TELL_TUNE.near) : 0;
	return {
		dx: dx * off,
		dy: dy * off,
		shadow: Math.min(1, TELL_TUNE.shadow * gain),
		eyes,
		tremble,
		breath: TELL_TUNE.breath
	};
}
