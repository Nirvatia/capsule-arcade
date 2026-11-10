import type { PacmanFx } from '../../core/Events';
import type { GhostKind } from '../../logic/actors/GhostModel';
import type { FxRecipe, FxStyle } from './fxTypes';

export const GHOST_TINT: Record<GhostKind, number> = {
	BLINKY: 0xff4d4d,
	PINKY: 0xff9de2,
	INKY: 0x59f0ff,
	CLYDE: 0xffb14d
};
export const GOLD = 0xffd84a;
export const WHITE = 0xffffff;
const ECHO_BLUE = 0x7fd0ff;

/** Shockwaves linger a little longer than a plain ring would. */
const WAVE_STRETCH = 1.15;

function wave(
	x: number,
	y: number,
	tint: number,
	radius: number,
	life: number,
	delay = 0,
	weak = false
): FxRecipe['rings'][number] {
	return { x, y, tint, radius, life: life * WAVE_STRETCH, delay, weak };
}

const NONE: FxRecipe = {
	rings: [],
	flashes: [],
	gathers: [],
	bursts: [],
	popups: [],
	streaks: []
};

/** The effect of a gameplay moment, in the season's style. Pure: no state, no drawing. */
export function recipeFor(fx: PacmanFx, style: FxStyle): FxRecipe {
	switch (fx.kind) {
		case 'ghost-eaten': {
			const tint = GHOST_TINT[fx.ghost];
			return {
				...NONE,
				flashes: [{ x: fx.x, y: fx.y, life: 0.18 }],
				rings: [
					wave(fx.x, fx.y, tint, 1.6, 0.4),
					wave(fx.x, fx.y, style.accent, 1.1, 0.35, 0.06, true)
				],
				bursts: [{ x: fx.x, y: fx.y, tint, count: 12, speed: 5.5, particle: null }],
				popups: [{ x: fx.x, y: fx.y, text: String(fx.points), tint: style.accent }],
				kick: 0.55
			};
		}
		case 'energizer':
			return {
				...NONE,
				rings: [
					wave(fx.x, fx.y, style.accent, 3.2, 0.5),
					wave(fx.x, fx.y, WHITE, 2.2, 0.4, 0.08, true)
				],
				bursts: [
					{ x: fx.x, y: fx.y, tint: style.accent, count: 6, speed: 3, particle: style.particle }
				],
				pulse: { tint: style.accent, strength: 0.5 },
				kick: 0.3
			};
		case 'fruit':
			return {
				...NONE,
				rings: [wave(fx.x, fx.y, style.accent, 1.3, 0.35)],
				bursts: [
					{ x: fx.x, y: fx.y, tint: style.accent, count: 10, speed: 3.5, particle: style.particle }
				],
				popups: [{ x: fx.x, y: fx.y, text: String(fx.points), tint: style.accent }]
			};
		case 'egg':
			return {
				...NONE,
				rings: [wave(fx.x, fx.y, GOLD, 2.4, 0.5)],
				bursts: [{ x: fx.x, y: fx.y, tint: GOLD, count: 16, speed: 4.5, particle: null }],
				popups: [{ x: fx.x, y: fx.y, text: String(fx.points), tint: GOLD }],
				pulse: { tint: GOLD, strength: 0.6 },
				kick: 0.35
			};
		case 'extra-life':
			return {
				...NONE,
				rings: [wave(fx.x, fx.y, GOLD, 1.8, 0.5)],
				popups: [{ x: fx.x, y: fx.y, text: '1UP', tint: GOLD }],
				pulse: { tint: GOLD, strength: 0.4 }
			};
		case 'teleport':
			// into the tunnel: the season's particles gather into the pad and flash; out of it: a
			// ring goes out, a burst of them and a flash of light
			return {
				...NONE,
				gathers: [{ x: fx.x, y: fx.y, tint: style.accent, count: 10, particle: style.particle }],
				flashes: [
					{ x: fx.x, y: fx.y, life: 0.16 },
					{ x: fx.tx, y: fx.ty, life: 0.2 }
				],
				rings: [
					wave(fx.x, fx.y, WHITE, 0.9, 0.25),
					wave(fx.tx, fx.ty, style.accent, 2.4, 0.45),
					wave(fx.tx, fx.ty, WHITE, 1.6, 0.35, 0.05, true)
				],
				bursts: [
					{ x: fx.tx, y: fx.ty, tint: style.accent, count: 10, speed: 4, particle: style.particle }
				]
			};
		case 'echo-pop':
			// a clone caught by a ghost: a small blue ring and a puff of blue sparks
			return {
				...NONE,
				flashes: [{ x: fx.x, y: fx.y, life: 0.12 }],
				rings: [wave(fx.x, fx.y, ECHO_BLUE, 1.0, 0.3)],
				bursts: [{ x: fx.x, y: fx.y, tint: ECHO_BLUE, count: 7, speed: 3.5, particle: null }]
			};
		case 'near-miss':
			return {
				...NONE,
				streaks: [
					{
						x0: fx.gx,
						y0: fx.gy,
						x1: fx.x,
						y1: fx.y,
						tint: GHOST_TINT[fx.ghost],
						life: 0.4
					}
				],
				bursts: [{ x: fx.x, y: fx.y, tint: WHITE, count: 4, speed: 2.5, particle: null }],
				kick: 0.18
			};
	}
}
