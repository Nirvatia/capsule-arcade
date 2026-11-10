import type { PacmanFx } from '../../core/Events';
import type { GridLayout } from '../maze/GridView';
import { drawAir, drawGround, drawPulse } from './fxDraw';
import { recipeFor, WHITE } from './fxPresets';
import type {
	Flash,
	FxRecipe,
	FxStyle,
	ParticleSource,
	Popup,
	Ring,
	Spark,
	Streak
} from './fxTypes';

export type { FxStyle } from './fxTypes';

/**
 * Gameplay feedback on the season levels, one style for every season: score pop-ups, a
 * flash and a burst where a ghost is eaten, a shockwave from an energizer, the season's
 * particles thrown up by a pickup, a whoosh for a near miss, and the screen shake and edge
 * pulse that go with them. Fed by `fx:event`; positions are tile-centre coordinates. What
 * an event is made of lives in `fxPresets`, how it looks in `fxDraw`; this class keeps the
 * live effects and ages them.
 */
export class LevelFx {
	private rings: Ring[] = [];
	private sparks: Spark[] = [];
	private popups: Popup[] = [];
	private flashes: Flash[] = [];
	private streaks: Streak[] = [];
	private shakeValue = 0;
	private pulseValue = 0;
	private pulseTint = WHITE;
	private seed = 0;

	/** 0..1, eased out by the caller into a camera offset. */
	get shake(): number {
		return this.shakeValue;
	}

	/** How many effects are alive (for tests and the prototype). */
	get active(): number {
		return (
			this.rings.length +
			this.sparks.length +
			this.popups.length +
			this.flashes.length +
			this.streaks.length
		);
	}

	spawn(fx: PacmanFx, style: FxStyle): void {
		this.play(recipeFor(fx, style));
	}

	update(dt: number): void {
		if (!(dt > 0)) {
			return;
		}
		const age = <T extends { age: number; life: number; delay?: number }>(list: T[]): T[] =>
			list.filter((item) => {
				item.age += dt;
				return item.age < item.life + (item.delay ?? 0);
			});
		this.rings = age(this.rings);
		this.flashes = age(this.flashes);
		this.popups = age(this.popups);
		this.streaks = age(this.streaks);
		this.sparks = age(this.sparks);
		for (const s of this.sparks) {
			const drag = Math.exp(-dt * 4);
			s.vx *= drag;
			s.vy *= drag;
			s.x += s.vx * dt;
			s.y += s.vy * dt;
		}
		this.shakeValue = Math.max(0, this.shakeValue - dt * 3.5);
		this.pulseValue = Math.max(0, this.pulseValue - dt * 2.2);
	}

	/** Effects that lie on the ground, under the actors: rings and flashes. */
	drawUnder(ctx: CanvasRenderingContext2D, layout: GridLayout): void {
		drawGround(ctx, layout, this.rings, this.flashes);
	}

	/** Effects over the actors: sparks, particles, streaks and the score pop-ups. */
	drawOver(ctx: CanvasRenderingContext2D, layout: GridLayout): void {
		drawAir(ctx, layout, this.sparks, this.streaks, this.popups);
	}

	/** The edge pulse in screen space (after the world's vignette). */
	drawScreen(ctx: CanvasRenderingContext2D, width: number, height: number): void {
		if (this.pulseValue > 0) {
			drawPulse(ctx, width, height, this.pulseTint, this.pulseValue);
		}
	}

	reset(): void {
		this.rings = [];
		this.sparks = [];
		this.popups = [];
		this.flashes = [];
		this.streaks = [];
		this.shakeValue = 0;
		this.pulseValue = 0;
	}

	private play(recipe: FxRecipe): void {
		for (const r of recipe.rings) {
			this.rings.push({ ...r, delay: r.delay ?? 0, weak: r.weak ?? false, age: 0 });
		}
		for (const f of recipe.flashes) {
			this.flashes.push({ ...f, age: 0 });
		}
		for (const g of recipe.gathers) {
			this.gather(g.x, g.y, g.tint, g.count, g.particle);
		}
		for (const b of recipe.bursts) {
			this.burst(b.x, b.y, b.tint, b.count, b.speed, b.particle);
		}
		for (const p of recipe.popups) {
			this.popups.push({ ...p, age: 0, life: 1.1 });
		}
		for (const k of recipe.streaks) {
			this.streaks.push({ ...k, age: 0 });
		}
		if (recipe.pulse) {
			this.pulseTint = recipe.pulse.tint;
			this.pulseValue = Math.max(this.pulseValue, recipe.pulse.strength);
		}
		if (recipe.kick !== undefined) {
			this.shakeValue = Math.min(1, Math.max(this.shakeValue, recipe.kick));
		}
	}

	private burst(
		x: number,
		y: number,
		tint: number,
		count: number,
		speed: number,
		particle: ParticleSource
	): void {
		for (let i = 0; i < count; i += 1) {
			this.seed += 1;
			const a = (i / count) * Math.PI * 2 + this.noise() * 0.6;
			const v = speed * (0.6 + this.noise() * 0.6);
			this.sparks.push({
				x,
				y,
				vx: Math.cos(a) * v,
				vy: Math.sin(a) * v,
				tint,
				age: 0,
				life: particle ? 0.9 : 0.45,
				texture: particle ? particle(this.seed) : null,
				spin: (this.noise() - 0.5) * 8
			});
		}
	}

	/** Sparks that start round a point and fly into it (the reverse of a burst). */
	private gather(
		x: number,
		y: number,
		tint: number,
		count: number,
		particle: ParticleSource
	): void {
		const life = 0.3;
		// the sparks slow down (drag 4 a second): start fast enough to arrive in `life`
		const reach = 4 / (1 - Math.exp(-4 * life));
		for (let i = 0; i < count; i += 1) {
			this.seed += 1;
			const a = (i / count) * Math.PI * 2 + this.noise() * 0.6;
			const r = 0.85 + this.noise() * 0.3;
			this.sparks.push({
				x: x + Math.cos(a) * r,
				y: y + Math.sin(a) * r,
				vx: -Math.cos(a) * r * reach,
				vy: -Math.sin(a) * r * reach,
				tint,
				age: 0,
				life,
				texture: particle ? particle(this.seed) : null,
				spin: (this.noise() - 0.5) * 8
			});
		}
	}

	private noise(): number {
		const v = Math.sin(this.seed * 12.9898 + this.sparks.length * 78.233) * 43758.5453;
		return v - Math.floor(v);
	}
}
