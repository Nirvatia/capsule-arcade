import { BOARD_HEIGHT_SHARE, BOARD_TOP_RESERVE, BOARD_WIDTH_SHARE } from '../../config/boardConfig';

export { BOARD_HEIGHT_SHARE, BOARD_TOP_RESERVE, BOARD_WIDTH_SHARE };

/** The least gap between the HUD band and the walls, css px. */
const MIN_GAP = 4;

export interface BoardPlacement {
	/** World units to css px. */
	readonly scale: number;
	/** The top-left corner of the whole board (the empty border included), css px. */
	readonly x: number;
	readonly y: number;
}

/**
 * Where a board of `cols` × `rows` tiles of `tile` world units goes on a `vw` × `vh` screen.
 * Every maze has an empty border of one tile on each side (`validateMaze`), so the walls cover
 * `cols - 2` × `rows - 2` tiles. They take `BOARD_HEIGHT_SHARE` of the height, less if the
 * width or the HUD band at the top does not leave that much, and sit centred in the space
 * below the band (`topReserve`, 0 when the HUD stands in the side margins) and above a band at
 * the bottom (`bottomReserve`, the stacked HUD's). Page zoom changes the screen's size in css px and the scale with it, so the
 * share stays the same at any zoom.
 */
export function boardPlacement(
	vw: number,
	vh: number,
	cols: number,
	rows: number,
	tile: number,
	topReserve: number = BOARD_TOP_RESERVE,
	bottomReserve = 0
): BoardPlacement {
	const wallsH = (rows - 2) * tile;
	const wallsW = (cols - 2) * tile;
	const scale = Math.min(
		(BOARD_HEIGHT_SHARE * vh) / wallsH,
		(vh - topReserve - bottomReserve - (topReserve > 0 ? MIN_GAP : 0)) / wallsH,
		(BOARD_WIDTH_SHARE * vw) / wallsW
	);
	const wallsTop = topReserve + (vh - topReserve - bottomReserve - wallsH * scale) / 2;
	return {
		scale,
		x: vw / 2 - (cols * tile * scale) / 2,
		y: wallsTop - tile * scale
	};
}
