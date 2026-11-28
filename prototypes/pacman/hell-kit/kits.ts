// The kit (three were offered, the owner kept one) for the hell redesign's missing art (DESIGN §7 "The fight, redesigned"), each one
// idea drawn in the hell's own language (`paint.ts`): the food, the split's energizer, its four equal
// ghosts (and frightened), the three weapons' pickups (the berserk, the Sting, the Maw), the Sting's
// bolts, and the berserk's rush as the hero's transformation.
// (x, y) is a tile's centre in px, S the tile in px.
import type { Ctx, Dir } from './paint';
import { FLESH_KIT } from './kitFlesh';

/** The new weapons' pickups: the Maw (`bfg`) and the Sting (`plasma`); the berserk keeps its fist. */
export type Item = 'bfg' | 'plasma';

export interface Kit {
	readonly id: string;
	readonly name: string;
	readonly idea: string;
	food(c: Ctx, x: number, y: number, S: number): void;
	energizer(c: Ctx, x: number, y: number, S: number, t: number): void;
	/** index 0 Blinky, 1 Pinky, 2 Inky, 3 Clyde: the same body, only the colour differs. */
	ghost(c: Ctx, i: number, x: number, y: number, S: number, dir: Dir, fright: boolean, t: number): void;
	icon(c: Ctx, item: Item, x: number, y: number, S: number): void;
	bolt(c: Ctx, x: number, y: number, S: number, dir: Dir): void;
	/** The berserk's rush: the hero transformed, `morph` 0 (the fruit) to 1 (the beast). */
	form(c: Ctx, x: number, y: number, S: number, dir: Dir, morph: number, t: number): void;
	/** The rush's hit on the boss. */
	impact(c: Ctx, x: number, y: number, S: number): void;
}

/** The owner picked «Плоть» (2026-11-28); the forge and the brimstone kits are gone. */
export const KITS: readonly Kit[] = [FLESH_KIT];
