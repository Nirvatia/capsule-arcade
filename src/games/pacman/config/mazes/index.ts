import type { GridMatrix } from '../gridConfig';
import { GRID_01 } from './classic01';
import { GRID_DOOM } from './doom';

export { GRID_01, GRID_DOOM };

/** The season levels' mazes, in rotation order. */
export const GRIDS: readonly GridMatrix[] = [GRID_01];
