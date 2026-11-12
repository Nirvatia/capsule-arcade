// The grid world's colours (`TRON.md`): colour is the side. Cyan is the hero, orange-red the
// enemy, a cold white the world; everything else is black.

export interface SideColours {
	/** The white-hot core of a line. */
	readonly core: string;
	/** The line's own colour. */
	readonly mid: string;
}

export const HERO: SideColours = { core: '#ecfdff', mid: '#36dcff' };
export const ENEMY: SideColours = { core: '#ffe6d0', mid: '#ff6418' };
export const WORLD: SideColours = { core: '#f0f8ff', mid: '#8fcaf2' };

/** The floor's glass and the walls' black. */
export const FLOOR = '#02060b';
export const WALL = '#000000';
export const VOID = '#000105';
