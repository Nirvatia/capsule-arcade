/** The share of the screen's height the maze's walls take (the empty border not counted). */
export const BOARD_HEIGHT_SHARE = 0.8;

/** The share of the screen's width the maze's walls may take, so a narrow screen is not overfilled. */
export const BOARD_WIDTH_SHARE = 0.92;

/** The band at the top of the screen the old HUD bar covers, css px; the walls start below it. */
export const BOARD_TOP_RESERVE = 96;

/** Every season maze is 25 x 27 tiles with an empty border of one tile: the walls are 23 x 25. */
export const MAZE_WALLS_ASPECT = 23 / 25;
