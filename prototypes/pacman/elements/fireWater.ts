// Variant 3, "fire and water": a pair drawn from scratch as one idea, each hero a drop of its
// element (a ball with a tail, one silhouette, one ink line, the tail always behind the mouth):
// - Pac-Man, a flame: flat anime fire (red, orange, gold, a white heart) whose layers run from
//   the body up into the tail and two side licks; fire rises, so at rest the tail points up and
//   the run sweeps it back; it flickers; little flames for a trail;
// - Ms. Pac-Man, water (blue now): a drop cel-shaded under the world's key light (a hard
//   highlight on the lit side, the light gathering on the far side as in a real drop),
//   bubbles rising inside; water sinks, so at rest she is all but round (a little point sags
//   down behind her) and the run draws the tail out; her bow is water too; droplets for a trail.
// The tail is painted twice: under the body (with its ink) and over the body's own ink line
// outside the body (without), so body and tail read as one shape.
// Frame space (the hooks): the hero faces +x, the top is -y, units px (R the body radius).
import { PACMAN_DESIGN, PacmanHero } from '../../../src/games/pacman/render/actors/hero/PacmanHero';
import { MS_DESIGN, MsPacmanHero } from '../../../src/games/pacman/render/actors/hero/MsPacmanHero';
import type { MsTint } from '../../../src/games/pacman/render/actors/hero/MsPacmanHero';
import { glow } from '../../../src/games/pacman/render/actors/hero/Hero';
import type {
	HeroDesign,
	HeroFeel,
	Palette,
	Particle,
	ParticleKind
} from '../../../src/games/pacman/render/actors/hero/Hero';
import { NIMBLE_BANDS } from './forms';
import { TAU, clipOutside, frameLight, frameUp, unit } from './kit';
import type { Vec } from './kit';

type Ctx = CanvasRenderingContext2D;

/** A drop: a circle (centre, radius) drawn out into a tip; `bulge` > 0 swells its sides, < 0 pinches them; `curl` bends the tip sideways. */
interface Drop {
	readonly cx: number;
	readonly cy: number;
	readonly r: number;
	readonly tx: number;
	readonly ty: number;
	readonly bulge: number;
	readonly curl: number;
}

/** Adds a drop's outline to the current path: the circle the long way round, then two curves to the tip. */
function dropPath(c: Ctx, d: Drop): void {
	const dx = d.tx - d.cx;
	const dy = d.ty - d.cy;
	const dist = Math.hypot(dx, dy);
	if (dist <= d.r * 1.04) {
		c.moveTo(d.cx + d.r, d.cy);
		c.arc(d.cx, d.cy, d.r, 0, TAU);
		return;
	}
	const phi = Math.atan2(dy, dx);
	const beta = Math.acos(d.r / dist);
	const a1 = phi + beta;
	const a2 = phi - beta;
	const p1 = { x: d.cx + Math.cos(a1) * d.r, y: d.cy + Math.sin(a1) * d.r };
	const p2 = { x: d.cx + Math.cos(a2) * d.r, y: d.cy + Math.sin(a2) * d.r };
	// across the tail: +q is p1's side
	const qx = -dy / dist;
	const qy = dx / dist;
	const towards = (p: Vec, side: number) => {
		const L = Math.hypot(d.tx - p.x, d.ty - p.y);
		const off = (side * d.bulge + d.curl) * L;
		return {
			near: { x: p.x + (d.tx - p.x) * 0.4, y: p.y + (d.ty - p.y) * 0.4 },
			far: { x: d.tx - (d.tx - p.x) * 0.3 + qx * off, y: d.ty - (d.ty - p.y) * 0.3 + qy * off }
		};
	};
	const s2 = towards(p2, -1);
	const s1 = towards(p1, 1);
	c.moveTo(p1.x, p1.y);
	c.arc(d.cx, d.cy, d.r, a1, a2 + TAU, false);
	c.bezierCurveTo(s2.near.x, s2.near.y, s2.far.x, s2.far.y, d.tx, d.ty);
	c.bezierCurveTo(s1.far.x, s1.far.y, s1.near.x, s1.near.y, p1.x, p1.y);
	c.closePath();
}

function fillDrops(c: Ctx, drops: readonly Drop[], colour: string): void {
	c.beginPath();
	for (const d of drops) dropPath(c, d);
	c.fillStyle = colour;
	c.fill('nonzero');
}

/** A drop of radius `r`, centre `back` radii behind (away from the tip), its tip `reach` along `u`. */
function drop(R: number, u: Vec, r: number, back: number, reach: number, bulge: number, curl: number): Drop {
	return { cx: -u.x * back * R, cy: -u.y * back * R, r: r * R, tx: u.x * reach, ty: u.y * reach, bulge, curl };
}

// ── fire ────────────────────────────────────────────────────────────────────────

const FLAME: Palette = {
	light: [255, 214, 80],
	mid: [255, 140, 30],
	shadow: [236, 62, 28],
	deep: [130, 20, 14],
	bounce: [255, 110, 40],
	ink: [72, 12, 6],
	highlight: [255, 250, 214],
	rim: [255, 214, 130]
};
const FIRE_TONES = ['rgb(232,58,28)', 'rgb(255,138,30)', 'rgb(255,212,74)', 'rgb(255,250,214)'];
const FIRE_INK = 'rgb(72,12,6)';

export class FlamePacman extends PacmanHero {
	protected readonly design: HeroDesign = {
		...PACMAN_DESIGN,
		id: 'pac-flame',
		calm: FLAME,
		inside: { mid: [120, 20, 12], deep: [66, 8, 4] },
		bands: NIMBLE_BANDS,
		powerScale: 1.22,
		flare: [255, 214, 120]
	};
	private sweep = 0;
	/** This frame's layers, outside in: each a set of drops (the tail and the side licks). */
	private layers: Drop[][] = [];

	/** No rolling-ball meridians: they read as lines on the flame. */
	setFeel(feel: HeroFeel): void {
		super.setFeel({ ...feel, sphere: false });
	}

	protected afterUpdate(dt: number): void {
		this.sweep += ((this.moving ? 1 : 0) - this.sweep) * Math.min(1, dt * 6);
	}

	private shape(R: number): Drop[][] {
		const t = this.time;
		const w = this.sweep;
		const up = frameUp(this.angle, this.flip);
		// fire rises: up at rest, swept back by the run
		const u = unit(up.x * (1 - 0.7 * w) - (0.15 + 1.3 * w), up.y * (1 - 0.7 * w));
		const flick = Math.sin(t * 9) * 0.06 + Math.sin(t * 15.3) * 0.04;
		const curl = 0.22 * Math.sin(t * 6.3) + 0.1 * Math.sin(t * 13.1);
		const reach = R * (1.72 + 0.22 * w) * (1 + flick);
		// two licks either side of the tail, flickering on their own
		const lick = (side: number, seed: number) => {
			const a = Math.atan2(u.y, u.x) + side * 0.95;
			const v = { x: Math.cos(a), y: Math.sin(a) };
			const h = R * (1.32 + 0.12 * Math.sin(t * (10 + seed) + seed * 2));
			return [
				drop(R, v, 0.42, -0.5, h, -0.1, side * -0.25 + 0.08 * Math.sin(t * 8 + seed)),
				drop(R, v, 0.24, -0.52, h * 0.84, -0.08, side * -0.2)
			] as const;
		};
		const left = lick(-1, 1);
		const right = lick(1, 4);
		return [
			[drop(R, u, 1, 0, reach, -0.14, curl), left[0], right[0]],
			[drop(R, u, 0.72, 0.18, reach * 0.8, -0.1, curl * 1.2), left[1], right[1]],
			[drop(R, u, 0.46, 0.32, reach * 0.62, -0.06, curl * 1.4)],
			[drop(R, u, 0.22, 0.4, reach * 0.42, 0, curl * 1.6)]
		];
	}

	private paint(c: Ctx): void {
		this.layers.forEach((layer, i) => fillDrops(c, layer, FIRE_TONES[i]!));
	}

	/** A warm glow, then the flame's tail and licks with their ink, under the body. */
	protected drawAura(ctx: Ctx, R: number): void {
		this.layers = this.shape(R);
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.globalAlpha = 0.3 + 0.06 * Math.sin(this.time * 11);
		ctx.drawImage(glow([255, 130, 40]), -R * 2.1, -R * 2.1, R * 4.2, R * 4.2);
		ctx.restore();
		ctx.save();
		ctx.lineJoin = 'round';
		ctx.beginPath();
		for (const d of this.layers[0]!) dropPath(ctx, d);
		ctx.strokeStyle = FIRE_INK;
		ctx.lineWidth = R * 0.13;
		ctx.stroke();
		this.paint(ctx);
		ctx.restore();
	}

	protected drawBehind(): void {}

	/** The body is the flame's base: the same layers, cut by the mouth. */
	protected decorate(sc: Ctx): void {
		this.paint(sc);
	}

	/** The tail again over the body's ink line, so the two read as one flame. */
	protected drawWorn(ctx: Ctx, R: number, p: number, lx: number, ly: number): void {
		ctx.save();
		clipOutside(ctx, R * 0.985);
		this.paint(ctx);
		ctx.restore();
		super.drawWorn(ctx, R, p, lx, ly);
	}

	protected particleFor(): ParticleKind {
		return 'ember';
	}

	/** A lick of fire: a small flame drop, its tip up and away from its flight, shrinking. */
	protected drawParticle(ctx: Ctx, e: Particle, a: number, s: number): void {
		if (e.kind !== 'ember') {
			super.drawParticle(ctx, e, a, s);
			return;
		}
		const u = e.life / e.max;
		const r = s * (0.35 + 0.55 * u);
		const v = Math.hypot(e.vx, e.vy) || 1;
		const tip = unit(-e.vx / v, -e.vy / v - 1.4);
		ctx.save();
		ctx.globalAlpha = Math.min(1, u * 3);
		ctx.translate(e.x, e.y);
		const outer: Drop = { cx: 0, cy: 0, r, tx: tip.x * r * 2.6, ty: tip.y * r * 2.6, bulge: -0.1, curl: 0 };
		ctx.beginPath();
		dropPath(ctx, outer);
		ctx.lineJoin = 'round';
		ctx.strokeStyle = FIRE_INK;
		ctx.lineWidth = Math.max(0.7, r * 0.3);
		ctx.stroke();
		ctx.fillStyle = FIRE_TONES[0]!;
		ctx.fill();
		ctx.beginPath();
		dropPath(ctx, { cx: -tip.x * r * 0.2, cy: -tip.y * r * 0.2, r: r * 0.5, tx: tip.x * r * 1.5, ty: tip.y * r * 1.5, bulge: 0, curl: 0 });
		ctx.fillStyle = FIRE_TONES[2]!;
		ctx.fill();
		ctx.restore();
	}
}

// ── water ───────────────────────────────────────────────────────────────────────

const AQUA: Palette = {
	light: [130, 210, 255],
	mid: [40, 130, 232],
	shadow: [24, 70, 190],
	deep: [12, 34, 110],
	bounce: [60, 170, 255],
	ink: [10, 22, 74],
	highlight: [255, 255, 255],
	rim: [200, 240, 255]
};
const WATER_INK = 'rgb(10,22,74)';

/** Her bow is water: pale aqua, a deep blue shade; coral lipstick. */
const WATER_TINT: MsTint = {
	id: 'water',
	bow: [120, 214, 255],
	bowShade: [34, 110, 214],
	bowTail: [80, 180, 250],
	lipstick: [255, 76, 96],
	blush: [255, 128, 160]
};

export class WaterMs extends MsPacmanHero {
	protected readonly design: HeroDesign = {
		...MS_DESIGN,
		id: 'ms-water',
		calm: AQUA,
		inside: { mid: [20, 40, 110], deep: [8, 16, 60] },
		bands: NIMBLE_BANDS,
		powerScale: 1.22,
		flare: [200, 240, 255]
	};
	protected readonly tint: MsTint = WATER_TINT;
	private sweep = 0;
	private silhouette: Drop | null = null;

	/** No rolling-ball meridians: the light in the drop is her volume. */
	setFeel(feel: HeroFeel): void {
		super.setFeel({ ...feel, sphere: false });
	}

	protected afterUpdate(dt: number): void {
		this.sweep += ((this.moving ? 1 : 0) - this.sweep) * Math.min(1, dt * 5);
	}

	private shape(R: number): Drop {
		const t = this.time;
		const w = this.sweep;
		const up = frameUp(this.angle, this.flip);
		// water sinks: at rest the tail sags down behind her, the run draws it out behind
		const u = unit(-up.x * (0.6 - 0.45 * w) - (0.8 + 0.6 * w), -up.y * (0.6 - 0.45 * w));
		const reach = R * (1.14 + 0.62 * w + 0.04 * Math.sin(t * 5));
		return drop(R, u, 1, 0, reach, 0.14, 0.05 * Math.sin(t * 3.2));
	}

	/**
	 * The drop under the key light, clipped to its outline: deep blue, a lighter tone pushed
	 * towards the light, a pale lit zone, the light gathered on the far side, bubbles, a hard
	 * white highlight.
	 */
	private paint(c: Ctx, R: number): void {
		const d = this.silhouette;
		if (!d) return;
		const t = this.time;
		const L = frameLight(this.angle, this.flip);
		const la = Math.atan2(L.y, L.x);
		c.save();
		c.beginPath();
		dropPath(c, d);
		c.clip();
		c.fillStyle = 'rgb(22,62,176)';
		c.fillRect(-R * 3, -R * 3, R * 6, R * 6);
		c.translate(L.x * R * 0.16, L.y * R * 0.16);
		c.beginPath();
		dropPath(c, d);
		c.fillStyle = 'rgb(38,128,232)';
		c.fill();
		c.translate(-L.x * R * 0.16, -L.y * R * 0.16);
		c.fillStyle = 'rgb(118,204,255)';
		c.beginPath();
		c.ellipse(L.x * R * 0.4, L.y * R * 0.4, R * 0.5, R * 0.36, la + Math.PI / 2, 0, TAU);
		c.fill();
		// the light gathers on the far side, as in a real drop
		c.lineCap = 'round';
		c.strokeStyle = 'rgba(150,236,255,.9)';
		c.lineWidth = R * 0.13;
		c.beginPath();
		c.arc(0, 0, R * 0.74, la + Math.PI - 0.62, la + Math.PI + 0.62);
		c.stroke();
		// bubbles rising (the world's up), each a ring with a glint
		const up = frameUp(this.angle, this.flip);
		const side = { x: -up.y, y: up.x };
		for (let i = 0; i < 3; i++) {
			const f = (t * (0.32 + 0.08 * i) + i * 0.37) % 1;
			const along = (f - 0.5) * R * 1.3;
			const across = (i - 1) * R * 0.32 + Math.sin(t * 3 + i * 2) * R * 0.05;
			const x = up.x * along + side.x * across;
			const y = up.y * along + side.y * across;
			const r = R * (0.06 + 0.035 * i);
			c.globalAlpha = Math.sin(Math.PI * f);
			c.strokeStyle = 'rgba(230,248,255,.95)';
			c.lineWidth = Math.max(0.6, R * 0.03);
			c.beginPath();
			c.arc(x, y, r, 0, TAU);
			c.stroke();
			c.fillStyle = '#fff';
			c.beginPath();
			c.arc(x + L.x * r * 0.4, y + L.y * r * 0.4, r * 0.3, 0, TAU);
			c.fill();
		}
		c.globalAlpha = 1;
		// the hard highlight and its dot
		const hx = L.x * R * 0.6;
		const hy = L.y * R * 0.6;
		c.fillStyle = '#fff';
		c.beginPath();
		c.ellipse(hx, hy, R * 0.24, R * 0.1, la + Math.PI / 2, 0, TAU);
		c.fill();
		c.beginPath();
		c.arc(hx - L.y * R * 0.3, hy + L.x * R * 0.3, R * 0.05, 0, TAU);
		c.fill();
		c.restore();
	}

	/** The tail with its ink, under the body. */
	protected drawAura(ctx: Ctx, R: number): void {
		this.silhouette = this.shape(R);
		ctx.save();
		ctx.lineJoin = 'round';
		ctx.beginPath();
		dropPath(ctx, this.silhouette);
		ctx.strokeStyle = WATER_INK;
		ctx.lineWidth = R * 0.12;
		ctx.stroke();
		ctx.restore();
		this.paint(ctx, R);
	}

	protected drawBehind(): void {}

	protected decorate(sc: Ctx, R: number): void {
		this.paint(sc, R);
	}

	/** The tail again over the body's ink line, then her bow and eye. */
	protected drawWorn(ctx: Ctx, R: number, p: number, lx: number, ly: number): void {
		ctx.save();
		clipOutside(ctx, R * 0.985);
		this.paint(ctx, R);
		ctx.restore();
		super.drawWorn(ctx, R, p, lx, ly);
	}

	protected particleFor(): ParticleKind {
		return 'dust';
	}

	protected liftFor(kind: ParticleKind): number {
		return kind === 'dust' ? -0.5 : super.liftFor(kind);
	}

	protected sizeFor(kind: ParticleKind): number {
		return kind === 'dust' ? 1.1 : super.sizeFor(kind);
	}

	protected swirlFor(kind: ParticleKind): number {
		return kind === 'dust' ? 0 : super.swirlFor(kind);
	}

	/** A droplet: a blue bead drawn out along its flight, an ink line, a glint. */
	protected drawParticle(ctx: Ctx, e: Particle, a: number, s: number): void {
		if (e.kind !== 'dust') {
			super.drawParticle(ctx, e, a, s);
			return;
		}
		const u = e.life / e.max;
		const r = s * (0.45 + 0.45 * u);
		const ang = Math.atan2(e.vy, e.vx) + Math.PI;
		ctx.save();
		ctx.globalAlpha = Math.min(1, u * 3);
		ctx.translate(e.x, e.y);
		ctx.beginPath();
		dropPath(ctx, { cx: 0, cy: 0, r, tx: Math.cos(ang) * r * 2.1, ty: Math.sin(ang) * r * 2.1, bulge: 0.1, curl: 0 });
		ctx.fillStyle = 'rgb(64,160,246)';
		ctx.strokeStyle = WATER_INK;
		ctx.lineWidth = Math.max(0.7, r * 0.26);
		ctx.lineJoin = 'round';
		ctx.stroke();
		ctx.fill();
		ctx.fillStyle = '#fff';
		ctx.beginPath();
		ctx.arc(-r * 0.3, -r * 0.3, r * 0.3, 0, TAU);
		ctx.fill();
		ctx.restore();
	}
}
