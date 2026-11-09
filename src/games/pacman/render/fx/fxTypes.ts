/** The season's look for its effects: the accent colour and its drift particles. */
export interface FxStyle {
	/** 0xRRGGBB: rings, glows, the pop-up outline (the season's energizer glow). */
	readonly accent: number;
	/** The season's own particle (petal, leaf, snowflake, drop), by index. */
	readonly particle: (i: number) => HTMLCanvasElement;
}

/** A season particle texture factory, or null for a streak of light. */
export type ParticleSource = ((i: number) => HTMLCanvasElement) | null;

export interface Ring {
	x: number;
	y: number;
	tint: number;
	/** Final radius in tiles. */
	radius: number;
	age: number;
	life: number;
	delay: number;
	/** A secondary wave: fainter and thinner, with no trailing ring. */
	weak: boolean;
}
export interface Spark {
	x: number;
	y: number;
	vx: number;
	vy: number;
	tint: number;
	age: number;
	life: number;
	/** A season particle texture, or null for a streak of light. */
	texture: HTMLCanvasElement | null;
	spin: number;
}
export interface Popup {
	x: number;
	y: number;
	text: string;
	tint: number;
	age: number;
	life: number;
}
export interface Flash {
	x: number;
	y: number;
	age: number;
	life: number;
}
export interface Streak {
	x0: number;
	y0: number;
	x1: number;
	y1: number;
	tint: number;
	age: number;
	life: number;
}

/** What one gameplay moment is made of: the pure description `LevelFx` plays. */
export interface FxRecipe {
	readonly rings: ReadonlyArray<{
		x: number;
		y: number;
		tint: number;
		radius: number;
		life: number;
		delay?: number;
		weak?: boolean;
	}>;
	readonly flashes: ReadonlyArray<{ x: number; y: number; life: number }>;
	/** Sparks that start round a point and fly into it. */
	readonly gathers: ReadonlyArray<{
		x: number;
		y: number;
		tint: number;
		count: number;
		particle: ParticleSource;
	}>;
	readonly bursts: ReadonlyArray<{
		x: number;
		y: number;
		tint: number;
		count: number;
		speed: number;
		particle: ParticleSource;
	}>;
	readonly popups: ReadonlyArray<{ x: number; y: number; text: string; tint: number }>;
	readonly streaks: ReadonlyArray<{
		x0: number;
		y0: number;
		x1: number;
		y1: number;
		tint: number;
		life: number;
	}>;
	readonly pulse?: { tint: number; strength: number };
	/** Screen shake, 0..1. */
	readonly kick?: number;
}
