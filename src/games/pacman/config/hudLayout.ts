/**
 * Where the season HUD stands. On a landscape screen the margins on both sides of the maze hold
 * it (`side`); a taller screen has no margins to speak of, so the HUD is two bands, one above
 * the maze and one below it (`stack`), and the maze sits between them. The art is drawn for a
 * fixed size and scales with the screen (`scale`); the bands' share of the screen is `top` and
 * `bottom` in css px, which the board placement leaves free.
 */
import { BOARD_HEIGHT_SHARE, BOARD_WIDTH_SHARE, MAZE_WALLS_ASPECT } from './boardConfig';

export type HudMode = 'side' | 'stack';

export interface HudLayout {
	readonly mode: HudMode;
	/** The art's scale: 1 is the size it is drawn at. */
	readonly scale: number;
	/** The bands the board leaves free above and below it, css px (0 in `side`). */
	readonly top: number;
	readonly bottom: number;
}

/** From this aspect (width / height) up the margins hold the HUD. */
export const HUD_SIDE_MIN_ASPECT = 1.25;

/** The side HUD is drawn for a 720 px high screen and needs 254 units across at each side. */
export const HUD_SIDE_HEIGHT = 720;
export const HUD_SIDE_WIDTH = 254;

/** The stacked HUD is drawn for a 400 px wide, 800 px high screen: two bands of 176 units. */
export const HUD_STACK_WIDTH = 400;
export const HUD_STACK_HEIGHT = 800;
export const HUD_STACK_BAND = 176;

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

export function hudLayoutFor(width: number, height: number): HudLayout {
	if (!(width > 0) || !(height > 0)) {
		return { mode: 'side', scale: 1, top: 0, bottom: 0 };
	}
	if (width / height >= HUD_SIDE_MIN_ASPECT) {
		const wallsH = BOARD_HEIGHT_SHARE * height;
		const wallsW = Math.min(wallsH * MAZE_WALLS_ASPECT, BOARD_WIDTH_SHARE * width);
		const margin = (width - wallsW) / 2;
		const scale = clamp(Math.min(height / HUD_SIDE_HEIGHT, margin / HUD_SIDE_WIDTH), 0.55, 1.8);
		return { mode: 'side', scale, top: 0, bottom: 0 };
	}
	const scale = clamp(Math.min(width / HUD_STACK_WIDTH, height / HUD_STACK_HEIGHT), 0.6, 1.6);
	return { mode: 'stack', scale, top: HUD_STACK_BAND * scale, bottom: HUD_STACK_BAND * scale };
}
