// Three whole kits for the hell redesign's missing art (DESIGN §7 "The fight, redesigned"), each one
// idea drawn in the hell's own language (`paint.ts`): the food, the split's energizer, its four equal
// ghosts (and frightened), the snare (lying open, shut, as a pickup), the plasma (pickup and bolts),
// the armour (pickup and on the hero), and the berserk's rush as the hero's transformation.
// (x, y) is a tile's centre in px, S the tile in px.
import type { Ctx, Dir } from './paint';
import { FLESH_KIT } from './kitFlesh';
import { FORGE_KIT } from './kitForge';
import { BRIM_KIT } from './kitBrim';

export type Item = 'snare' | 'plasma' | 'armour';

export interface Kit {
	readonly id: string;
	readonly name: string;
	readonly idea: string;
	food(c: Ctx, x: number, y: number, S: number): void;
	energizer(c: Ctx, x: number, y: number, S: number, t: number): void;
	/** index 0 Blinky, 1 Pinky, 2 Inky, 3 Clyde: the same body, only the colour differs. */
	ghost(c: Ctx, i: number, x: number, y: number, S: number, dir: Dir, fright: boolean, t: number): void;
	/** open 1 is set, 0 is shut. */
	snare(c: Ctx, x: number, y: number, S: number, open: number): void;
	icon(c: Ctx, item: Item, x: number, y: number, S: number): void;
	bolt(c: Ctx, x: number, y: number, S: number, dir: Dir): void;
	/** Drawn over the hero while he has armour (on his back, `dir` his heading). */
	armour(c: Ctx, x: number, y: number, S: number, dir: Dir): void;
	/** The berserk's rush: the hero transformed, `morph` 0 (the fruit) to 1 (the beast). */
	form(c: Ctx, x: number, y: number, S: number, dir: Dir, morph: number, t: number): void;
	/** The rush's hit on the boss. */
	impact(c: Ctx, x: number, y: number, S: number): void;
}

export const KITS: readonly Kit[] = [FLESH_KIT, FORGE_KIT, BRIM_KIT];
