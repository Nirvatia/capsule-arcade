import type { GridMatrix, TileType } from '../gridConfig';
import { GRID_DOOM as GRID_DOOM_DRAWN } from './grid_doom';

/**
 * The hell's four pickup spots: the middle of the outer sides, away from the corners (the
 * corners' energizers are the split's) and the lair (DESIGN §7 "The fight, redesigned").
 */
export const DOOM_PICKUP_TILES: ReadonlyArray<{ readonly x: number; readonly y: number }> = [
	{ x: 12, y: 2 },
	{ x: 19, y: 12 },
	{ x: 12, y: 24 },
	{ x: 5, y: 12 }
];

/**
 * The hell's maze (level 5): the owner's `grid_doom`, with two changes the fight needs. Its food
 * stays (it charges the BFG; the energizers light only during the split) but the pickup spots are
 * bare floor; and the boss is born on the lair's centre tile, `DB`, the one between Inky's and
 * Pinky's (`IY` · centre · `PY`).
 */
export const GRID_DOOM: GridMatrix = GRID_DOOM_DRAWN.map((row, r) =>
	row.map((token, c): TileType => {
		if (DOOM_PICKUP_TILES.some((p) => p.x === c && p.y === r)) {
			return 'FL';
		}
		return token === 'LT' && row[c - 1] === 'IY' && row[c + 1] === 'PY' ? 'DB' : token;
	})
);
