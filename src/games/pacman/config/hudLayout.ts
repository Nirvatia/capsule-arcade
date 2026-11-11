/**
 * Where the season HUD stands. On a landscape screen the margins on both sides of the maze
 * hold it (`side`); a narrower one keeps the old bar above the board (`top`), which takes a
 * band of the screen (`render/common/boardScale`).
 */
export type HudMode = 'side' | 'top';

/** The season HUD needs margins of about 250 px at 720 px high: from this aspect up they exist. */
export const HUD_SIDE_MIN_ASPECT = 1.5;

export function hudModeFor(width: number, height: number): HudMode {
	return width >= height * HUD_SIDE_MIN_ASPECT ? 'side' : 'top';
}

/** The side HUD is drawn for a 720 px high screen and scales with the height. */
export const HUD_DESIGN_HEIGHT = 720;

export function hudScaleFor(height: number): number {
	if (!Number.isFinite(height) || height <= 0) {
		return 1;
	}
	return Math.min(1.8, Math.max(0.7, height / HUD_DESIGN_HEIGHT));
}
