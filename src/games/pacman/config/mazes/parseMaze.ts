import { isTileToken } from '../gridConfig';
import type { GridMatrix, TileType } from '../gridConfig';

/**
 * Builds a maze from one string per row, tokens separated by spaces (`'WL DT 0A …'`).
 * Every row must have the same width and every token must be a tile token; a bad maze
 * throws at import time, so it cannot reach a level.
 */
export function parseMaze(name: string, rows: readonly string[]): GridMatrix {
	if (rows.length === 0) {
		throw new Error(`parseMaze(${name}): no rows`);
	}
	const grid = rows.map((row, r) => {
		const tokens = row.trim().split(/\s+/);
		return tokens.map((token, c): TileType => {
			if (!isTileToken(token)) {
				throw new Error(`parseMaze(${name}): unknown token '${token}' at row ${r}, col ${c}`);
			}
			return token;
		});
	});
	const width = grid[0]?.length ?? 0;
	const ragged = grid.findIndex((row) => row.length !== width);
	if (ragged >= 0) {
		throw new Error(
			`parseMaze(${name}): row ${ragged} has ${grid[ragged]?.length} tiles, not ${width}`
		);
	}
	return grid;
}
