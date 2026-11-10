import { FLOW } from '../../../config/flowConfig';

/** Width of the grey band behind the drain front, in death-field distance. */
export const DRAIN_BAND = 7;
/** Width of the band where the colour comes back behind its front, in respawn-field distance. */
export const COLOR_BAND = 6;
/** Front value meaning "not started" for the shader. */
export const FRONT_OFF = -100;

/** The drain front sweeps the whole view in this many seconds. */
const DRAIN_TIME = 1.2;
/** The world starts to fall into the hole this long after the death. */
const COLLAPSE_AT = 1.0;
/** The colour of the reborn world starts to return this long after the rebirth begins. */
const COLOR_DELAY = 0.35;
/** Share of the rebuild phase in which the world unfolds; the colour runs to its end. */
const BLOOM_SHARE = 0.79;
const FLASH_AT = 0.08;
const FLASH_WIDTH = 0.16;
const SHOCK_AT = 0.05;
const SHOCK_TIME = 0.8;

/** Which picture the pass shows: the dying world, the void between, the reborn world. */
export type DecayPhase = 0 | 1 | 2;

export interface DecayFronts {
	readonly phase: DecayPhase;
	/** Drain front in death-field distance; FRONT_OFF before it starts. */
	readonly drain: number;
	/** 0..1 how far the dying world has fallen into the hole (0 intact). */
	readonly collapse: number;
	/** 0..1 flash of the singularity. */
	readonly flash: number;
	/** Shock wave progress 0..1, or -1 when there is none. */
	readonly shock: number;
	/** 1..0 how much of the reborn world is still folded into the hole (0 unfolded). */
	readonly bloom: number;
	/** Colour front in respawn-field distance; FRONT_OFF until it starts, huge at the end. */
	readonly color: number;
	/** 0..1 how much of the level is gone overall (for the no-WebGL fallback). */
	readonly cover: number;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => {
	const t = clamp01(v);
	return t * t * (3 - 2 * t);
};

/**
 * The black hole's clock for `elapsed` seconds into the death state. `frontEnd` /
 * `colorEnd` are the largest distances on screen, so each front sweeps the whole view in
 * its phase. `shatter` holds the drain and the fall into the hole, `void` the flash and
 * the dark, `rebuild` the unfolding of the next picture from the respawn point.
 */
export function decayFronts(elapsed: number, frontEnd: number, colorEnd: number): DecayFronts {
	const { shatter, void: hold, rebuild } = FLOW.death;
	if (!(elapsed >= 0)) {
		return {
			phase: 0,
			drain: FRONT_OFF,
			collapse: 0,
			flash: 0,
			shock: -1,
			bloom: 1,
			color: FRONT_OFF,
			cover: 0
		};
	}
	const start = shatter + hold;
	const phase: DecayPhase = elapsed < shatter ? 0 : elapsed < start ? 1 : 2;

	const dp = clamp01(elapsed / DRAIN_TIME);
	const drain =
		dp >= 1 ? frontEnd + DRAIN_BAND + 6 : -3 + (frontEnd + DRAIN_BAND + 9) * Math.pow(dp, 1.2);
	const collapse = Math.pow(clamp01((elapsed - COLLAPSE_AT) / (shatter - COLLAPSE_AT)), 2);

	const flash = Math.exp(-(((elapsed - shatter - FLASH_AT) / FLASH_WIDTH) ** 2));
	const shockAt = elapsed - shatter - SHOCK_AT;
	const shock = shockAt >= 0 && shockAt < SHOCK_TIME ? shockAt / SHOCK_TIME : -1;

	const bloomEnd = rebuild * BLOOM_SHARE;
	const bloom = Math.pow(1 - clamp01((elapsed - start) / bloomEnd), 3);
	const colorAt = start + COLOR_DELAY;
	const color =
		elapsed < colorAt
			? FRONT_OFF
			: elapsed >= start + rebuild
				? 1e4
				: -3 + (colorEnd + COLOR_BAND + 6) * clamp01((elapsed - colorAt) / (rebuild - COLOR_DELAY));

	const cover =
		elapsed < start ? smooth(elapsed / shatter) : 1 - smooth((elapsed - start) / rebuild);
	return { phase, drain, collapse, flash, shock, bloom, color, cover };
}

/**
 * The distance from (x, y) to the farthest corner of a `width` × `height` view, plus a
 * little: the radius of a disc that holds the whole picture.
 */
export function farCorner(x: number, y: number, width: number, height: number): number {
	return (
		Math.max(
			Math.hypot(x, y),
			Math.hypot(width - x, y),
			Math.hypot(x, height - y),
			Math.hypot(width - x, height - y)
		) * 1.03
	);
}
