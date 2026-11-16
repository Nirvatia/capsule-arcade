// The heroes as elements, the nimble (everyday) form first, on the game's own hero machinery
// (`Hero`: the cel body, light, rim, acting, trail):
// - Pac-Man, fire: an ember core (a white heat at the heart, warm towards the edge) and living
//   flames that lick off his nape and crown, swept back by his run; anime fire, two tones and an
//   ink line, as the world's art; a warm glow on the floor; sparks for a trail;
// - Ms. Pac-Man, a nebula: pink and violet clouds drifting inside, stars twinkling in them, a soft
//   glow round her edge and a halo of star dust; her bow a ribbon of light; stars for a trail.
// Both 0.33 of a tile (the page sets it), with lighter tone bands than today's heroes.
// Frame space (the hooks): the hero faces +x, the top is -y, units px (R the body radius).
import { PACMAN_DESIGN, PacmanHero } from '../../../src/games/pacman/render/actors/hero/PacmanHero';
import { MS_DESIGN, MsPacmanHero } from '../../../src/games/pacman/render/actors/hero/MsPacmanHero';
import type { MsTint } from '../../../src/games/pacman/render/actors/hero/MsPacmanHero';
import { css, glow } from '../../../src/games/pacman/render/actors/hero/Hero';
import type { HeroDesign, Palette, ParticleKind } from '../../../src/games/pacman/render/actors/hero/Hero';
import { TAU, hash } from './kit';

type Ctx = CanvasRenderingContext2D;

export const NIMBLE_BANDS: readonly [number, number, number] = [0.1, 0.3, 0.64];

// ── fire ────────────────────────────────────────────────────────────────────────

const EMBER: Palette = {
	light: [255, 226, 130],
	mid: [255, 160, 44],
	shadow: [226, 86, 26],
	deep: [140, 34, 14],
	bounce: [255, 120, 48],
	ink: [52, 14, 6],
	highlight: [255, 255, 236],
	rim: [255, 214, 130]
};

export interface FlameLook {
	/** Tongue heights, body radii, at rest. */
	readonly height: number;
	readonly count: number;
	readonly outer: string;
	readonly mid: string;
	readonly inner: string;
	readonly ink: string;
}

const CALM_FLAME: FlameLook = {
	height: 0.85,
	count: 6,
	outer: 'rgb(236,78,24)',
	mid: 'rgb(255,150,38)',
	inner: 'rgb(255,236,150)',
	ink: 'rgb(52,14,6)'
};

/**
 * Living flames off the body's back half: `count` tongues spread from the crown round the nape
 * to the chin, each a teardrop whose tip flickers and is swept back by the run (`sweep` 0..1).
 * Drawn as one silhouette (the ink round the union, no lines between the tongues), in three
 * tones: an orange-red outside, a gold middle, a pale yellow heart.
 */
export function drawFlames(
	c: Ctx,
	R: number,
	t: number,
	sweep: number,
	look: FlameLook,
	up: { x: number; y: number },
	scale = 1
): void {
	const shapes: Array<(inset: number) => void> = [];
	// where the fire streams: up at rest, back along the run; the tongues leave from that side
	const mx = up.x * (1 - 0.65 * sweep) - (0.25 + 1.5 * sweep);
	const my = up.y * (1 - 0.65 * sweep);
	const main = Math.atan2(my, mx);
	for (let i = 0; i < look.count; i++) {
		const u = look.count > 1 ? i / (look.count - 1) : 0.5;
		const a = main + (u - 0.5) * 2.7;
		const n1 = Math.sin(t * (6 + hash(i, 1) * 4) + hash(i, 2) * 6);
		const n2 = Math.sin(t * (15 + hash(i, 3) * 8) + hash(i, 4) * 6);
		// the middle ones the tallest: a mantle that streams off one side
		const crest = 0.35 + 0.65 * Math.sin(Math.PI * u);
		const H = R * look.height * scale * crest * (0.82 + 0.12 * n1 + 0.06 * n2) * (0.9 + 0.2 * hash(i, 5));
		const W = R * (0.5 + 0.12 * hash(i, 6)) * Math.max(0.6, scale);
		const bx = Math.cos(a) * R * 0.74;
		const by = Math.sin(a) * R * 0.74;
		// each tongue leaves its own spot, bending towards the stream
		const out = Math.atan2(Math.sin(a) * 0.45 + Math.sin(main), Math.cos(a) * 0.45 + Math.cos(main)) + n2 * 0.1;
		const len = H + R * 0.2;
		const tx = bx + Math.cos(out) * len;
		const ty = by + Math.sin(out) * len;
		const nx = -Math.sin(out);
		const ny = Math.cos(out);
		const curl = n1 * 0.25;
		shapes.push((inset) => {
			const w = W * (1 - inset);
			const l = len * (1 - inset * 0.55);
			const ex = bx + Math.cos(out) * l;
			const ey = by + Math.sin(out) * l;
			c.moveTo(bx + nx * w * 0.5, by + ny * w * 0.5);
			c.bezierCurveTo(
				bx + Math.cos(out) * l * 0.45 + nx * w * (0.7 + curl),
				by + Math.sin(out) * l * 0.45 + ny * w * (0.7 + curl),
				ex + nx * w * 0.15,
				ey + ny * w * 0.15,
				inset > 0 ? ex : tx,
				inset > 0 ? ey : ty
			);
			c.bezierCurveTo(
				bx + Math.cos(out) * l * 0.55 - nx * w * (0.25 - curl),
				by + Math.sin(out) * l * 0.55 - ny * w * (0.25 - curl),
				bx + Math.cos(out) * l * 0.2 - nx * w * 0.55,
				by + Math.sin(out) * l * 0.2 - ny * w * 0.55,
				bx - nx * w * 0.5,
				by - ny * w * 0.5
			);
			c.closePath();
		});
	}
	const all = (inset: number) => {
		c.beginPath();
		for (const s of shapes) s(inset);
	};
	c.save();
	c.lineJoin = 'round';
	// the ink round the union: a thick stroke under the fills
	all(0);
	c.strokeStyle = look.ink;
	c.lineWidth = Math.max(1.2, R * 0.13);
	c.stroke();
	all(0);
	c.fillStyle = look.outer;
	c.fill('nonzero');
	all(0.32);
	c.fillStyle = look.mid;
	c.fill('nonzero');
	all(0.62);
	c.fillStyle = look.inner;
	c.fill('nonzero');
	c.restore();
}

export class EmberPacman extends PacmanHero {
	protected readonly design: HeroDesign = {
		...PACMAN_DESIGN,
		id: 'pac-ember',
		calm: EMBER,
		bands: NIMBLE_BANDS,
		powerScale: 1.22,
		flare: [255, 210, 120]
	};
	private sweep = 0;

	protected afterUpdate(dt: number): void {
		this.sweep += ((this.moving ? 1 : 0.15) - this.sweep) * Math.min(1, dt * 6);
	}

	/** A warm light on the floor round him, then the flames off his back. */
	protected drawAura(ctx: Ctx, R: number): void {
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.globalAlpha = 0.32 + 0.06 * Math.sin(this.time * 11);
		ctx.drawImage(glow([255, 140, 40]), -R * 2.1, -R * 2.1, R * 4.2, R * 4.2);
		ctx.restore();
		// the world's up, in his frame (turned by his heading, mirrored by his flip)
		const up = { x: -Math.sin(this.angle), y: -Math.cos(this.angle) * this.flip };
		drawFlames(ctx, R, this.time, this.sweep, CALM_FLAME, up);
	}

	/** No ki flames: the flames are always his now. */
	protected drawBehind(): void {}

	/** The heat at his heart: a white-yellow core, breathing. */
	protected decorate(sc: Ctx, R: number): void {
		const pulse = 0.85 + 0.15 * Math.sin(this.time * 6) + 0.05 * Math.sin(this.time * 19);
		const g = sc.createRadialGradient(-R * 0.18, R * 0.05, 0, -R * 0.18, R * 0.05, R * 0.78 * pulse);
		g.addColorStop(0, 'rgba(255,255,236,.8)');
		g.addColorStop(0.45, 'rgba(255,224,130,.35)');
		g.addColorStop(1, 'rgba(255,200,80,0)');
		sc.fillStyle = g;
		sc.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);
	}

	/** Sparks for a trail, always (fire leaves fire). */
	protected particleFor(moment: 'trail' | 'burst' | 'death'): ParticleKind {
		return moment === 'trail' ? 'ember' : 'ember';
	}
}

// ── nebula ────────────────────────────────────────────────────────────────────────

const NEBULA: Palette = {
	light: [250, 150, 222],
	mid: [196, 72, 186],
	shadow: [112, 44, 168],
	deep: [48, 20, 96],
	bounce: [255, 110, 200],
	ink: [46, 10, 52],
	highlight: [255, 255, 255],
	rim: [196, 222, 255]
};

/** Her bow, a ribbon of light: pale rose fading to white, a magenta edge. */
const LIGHT_TINT: MsTint = {
	id: 'light',
	bow: [255, 196, 238],
	bowShade: [214, 104, 214],
	bowTail: [255, 168, 232],
	lipstick: [232, 28, 110],
	blush: [240, 90, 170]
};

/** The clouds inside: colour, orbit radius and speed, size (body radii). */
const CLOUDS: ReadonlyArray<[string, number, number, number, number]> = [
	['255,120,220', 0.4, 0.35, 0.6, 0],
	['120,90,255', 0.45, -0.27, 0.62, 2.1],
	['90,210,255', 0.32, 0.22, 0.42, 4.0],
	['255,226,250', 0.22, -0.4, 0.34, 1.2]
];

export class NebulaMs extends MsPacmanHero {
	protected readonly design: HeroDesign = {
		...MS_DESIGN,
		id: 'ms-nebula',
		calm: NEBULA,
		bands: NIMBLE_BANDS,
		powerScale: 1.22,
		flare: [240, 200, 255]
	};
	protected readonly tint: MsTint = LIGHT_TINT;

	/** A soft glow round her and a halo of star dust drifting about her. */
	protected drawAura(ctx: Ctx, R: number): void {
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.globalAlpha = 0.34;
		ctx.drawImage(glow([200, 110, 255]), -R * 2, -R * 2, R * 4, R * 4);
		ctx.globalAlpha = 1;
		for (let i = 0; i < 12; i++) {
			const a = hash(i, 1) * TAU + this.time * (0.35 + hash(i, 2) * 0.4) * (i % 2 ? 1 : -1);
			const rr = R * (1.12 + 0.28 * hash(i, 3));
			const tw = 0.5 + 0.5 * Math.sin(this.time * (3 + hash(i, 4) * 4) + i);
			ctx.fillStyle = `rgba(255,236,255,${0.85 * tw})`;
			ctx.beginPath();
			ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, Math.max(0.6, R * 0.045 * (0.6 + 0.6 * hash(i, 5))), 0, TAU);
			ctx.fill();
		}
		ctx.restore();
	}

	/** Clouds of colour drifting inside her, and stars twinkling in them. */
	protected decorate(sc: Ctx, R: number): void {
		const t = this.time;
		for (const [rgb, orbit, speed, size, phase] of CLOUDS) {
			const a = t * speed + phase;
			const x = Math.cos(a) * R * orbit - R * 0.1;
			const y = Math.sin(a) * R * orbit;
			const g = sc.createRadialGradient(x, y, 0, x, y, R * size);
			g.addColorStop(0, `rgba(${rgb},.75)`);
			g.addColorStop(1, `rgba(${rgb},0)`);
			sc.fillStyle = g;
			sc.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);
		}
		for (let i = 0; i < 7; i++) {
			const a = hash(i, 11) * TAU + t * 0.25 * (i % 2 ? 1 : -1);
			const rr = R * (0.2 + 0.6 * hash(i, 12));
			const x = Math.cos(a) * rr - R * 0.1;
			const y = Math.sin(a) * rr;
			const tw = 0.4 + 0.6 * Math.max(0, Math.sin(t * (2.5 + hash(i, 13) * 3) + i * 1.7));
			const s = R * (0.06 + 0.06 * hash(i, 14)) * tw;
			sc.fillStyle = `rgba(255,255,255,${0.95 * tw})`;
			sc.beginPath();
			sc.moveTo(x, y - s * 2);
			sc.quadraticCurveTo(x, y, x + s * 2, y);
			sc.quadraticCurveTo(x, y, x, y + s * 2);
			sc.quadraticCurveTo(x, y, x - s * 2, y);
			sc.quadraticCurveTo(x, y, x, y - s * 2);
			sc.fill();
		}
	}

	/** Star dust for a trail. */
	protected particleFor(moment: 'trail' | 'burst' | 'death'): ParticleKind {
		return moment === 'trail' ? 'star' : 'star';
	}
}

export { css };
