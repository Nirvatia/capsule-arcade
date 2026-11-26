// Candidates for the station (throwaway, the owner picks; then the pick moves into the game): the
// lure's flare in other colours, its green now meeting the acid rage (the owner, 2026-11-26).
import type { FlareTint } from '../../../src/games/pacman/render/station/lureFlare';

export const FLARE_TINTS: Record<'cyan' | 'magenta' | 'blue', FlareTint> = {
	cyan: {
		light: '110, 235, 255',
		glow: ['180, 250, 255', '70, 215, 255', '30, 170, 230'],
		core: '235, 252, 255',
		spark: '205, 245, 255',
		smoke: '165, 195, 205'
	},
	magenta: {
		light: '255, 110, 235',
		glow: ['255, 185, 245', '245, 80, 220', '200, 40, 180'],
		core: '255, 238, 252',
		spark: '255, 210, 245',
		smoke: '200, 170, 195'
	},
	blue: {
		light: '110, 140, 255',
		glow: ['190, 205, 255', '90, 120, 255', '50, 70, 230'],
		core: '238, 242, 255',
		spark: '210, 220, 255',
		smoke: '165, 175, 205'
	}
};
