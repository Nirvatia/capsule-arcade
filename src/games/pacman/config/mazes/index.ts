import type { GridMatrix } from '../gridConfig';
import { GRID_CLASSIC } from './classic01';
import { GRID_01 } from './grid_01';
import { GRID_02 } from './grid_02';
import { GRID_03 } from './grid_03';
import { GRID_04 } from './grid_04';
import { GRID_DOOM } from './doom';

export { GRID_CLASSIC, GRID_01, GRID_02, GRID_03, GRID_04, GRID_DOOM };

/**
 * The four season mazes. Every cycle of four season levels plays all of them, in an order
 * `MazeCycle` picks.
 */
export const SEASON_MAZES: readonly GridMatrix[] = [GRID_01, GRID_02, GRID_03, GRID_04];
