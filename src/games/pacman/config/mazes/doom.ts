import type { GridMatrix, TileType } from '../gridConfig';
import { GRID_DOOM as GRID_DOOM_DRAWN } from './grid_doom';

/**
 * The hell's maze (level 5): the owner's `grid_doom`, with two changes the fight needs. The
 * hell has no food, so dots and energizers become floor (`assertDoomMap` demands a map without
 * dots); and the boss is born on the lair's centre tile, `DB`, the one between Inky's and
 * Pinky's (`IY` · centre · `PY`).
 */
export const GRID_DOOM: GridMatrix = GRID_DOOM_DRAWN.map((row) =>
	row.map((token, c): TileType => {
		if (token === 'DT' || token === 'EU') {
			return 'FL';
		}
		return token === 'LT' && row[c - 1] === 'IY' && row[c + 1] === 'PY' ? 'DB' : token;
	})
);
