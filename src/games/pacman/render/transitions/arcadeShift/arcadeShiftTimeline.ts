/**
 * The clock of the arcade shift: the way into the arcade (`enter`, a world breaking into
 * pixels and a CRT switching on) and the way out (`leave`, the CRT switching off and the
 * dot of light unfolding into the next world). A pure function of the progress 0..1, so the
 * shader and the tests read the same numbers.
 */
export type ShiftKind = 'enter' | 'leave';

/** Seconds each shift takes. */
export const SHIFT_DURATION: Readonly<Record<ShiftKind, number>> = {
	enter: 2.6,
	leave: 2.2
};

/** Mosaic block sizes, css px at an 800 px short side, and the colour levels at each step. */
export const MOSAIC_BLOCKS = [1, 2, 3, 5, 8, 13, 21] as const;
export const MOSAIC_LEVELS = [256, 64, 32, 16, 10, 7, 5] as const;

export interface ShiftChannels {
	readonly kind: ShiftKind;
	/** Enter only: 0 the world still shows (it pixelates), 1 the arcade is switching on. */
	readonly phase: 0 | 1;
	/** Enter: the egg's white bloom, 0..1. */
	readonly flash: number;
	/** Enter: mosaic block, css px at an 800 px short side (1 = none). */
	readonly block: number;
	/** Enter: colour levels per channel (256 = none). */
	readonly levels: number;
	/** Enter: brightness of the pixelated world, 1 to 0. */
	readonly dim: number;
	/** The CRT's aperture: how much of the half width and the half height shows, 0..1. */
	readonly openX: number;
	readonly openY: number;
	/** Brightness of the picture inside the aperture (the tube's overdrive). */
	readonly boost: number;
	/** Leave: the afterglow of the dot, 0..1. */
	readonly glow: number;
	/** Leave: how much of its radius the next world has grown, 0..1. */
	readonly grow: number;
}

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const span = (p: number, a: number, b: number): number => clamp01((p - a) / (b - a));
const smooth = (t: number): number => t * t * (3 - 2 * t);
const easeIn = (t: number): number => t * t * t;
const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);

/** Where the enter's world gives way to the dark and to the CRT. */
const ENTER = {
	flashEnd: 0.14,
	pixelFrom: 0.06,
	pixelTo: 0.4,
	dimTo: 0.52,
	lineFrom: 0.56,
	lineTo: 0.64,
	openTo: 0.86,
	settleTo: 0.96
} as const;

/** The leave's squash, shrink, afterglow and growth. */
const LEAVE = {
	squashTo: 0.34,
	shrinkTo: 0.52,
	glowTo: 0.74,
	growFrom: 0.7
} as const;

/** Channels at progress `p` (clamped to 0..1). */
export function shiftChannels(kind: ShiftKind, progress: number): ShiftChannels {
	const p = clamp01(Number.isFinite(progress) ? progress : 0);
	if (kind === 'enter') {
		const flash = p < ENTER.flashEnd ? Math.pow(1 - p / ENTER.flashEnd, 2) : 0;
		const t = smooth(span(p, ENTER.pixelFrom, ENTER.pixelTo));
		const step = Math.min(MOSAIC_BLOCKS.length - 1, Math.floor(t * MOSAIC_BLOCKS.length));
		const dim = 1 - easeIn(span(p, ENTER.pixelTo, ENTER.dimTo));
		const phase = p < ENTER.lineFrom ? 0 : 1;
		const line = easeOut(span(p, ENTER.lineFrom, ENTER.lineTo));
		const open = smooth(span(p, ENTER.lineTo, ENTER.openTo));
		return {
			kind,
			phase,
			flash,
			block: MOSAIC_BLOCKS[step],
			levels: MOSAIC_LEVELS[step],
			dim,
			openX: phase === 0 ? 0 : line,
			openY: phase === 0 ? 0 : open,
			boost: 1 + 1.4 * (1 - span(p, ENTER.lineTo, ENTER.settleTo)),
			glow: 0,
			grow: 0
		};
	}
	const squash = easeIn(span(p, 0, LEAVE.squashTo));
	const shrink = easeIn(span(p, LEAVE.squashTo, LEAVE.shrinkTo));
	const glowT = span(p, LEAVE.shrinkTo, LEAVE.glowTo);
	return {
		kind,
		phase: 0,
		flash: 0,
		block: 1,
		levels: 256,
		dim: 1,
		openX: 1 - shrink,
		openY: 1 - squash,
		boost: 1 + 1.4 * span(p, 0, LEAVE.shrinkTo),
		glow: p < LEAVE.shrinkTo ? 1 : Math.pow(1 - glowT, 1.6),
		grow: easeOut(span(p, LEAVE.growFrom, 1))
	};
}
