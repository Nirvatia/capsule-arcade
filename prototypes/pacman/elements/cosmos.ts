// Variant 2, "cosmos": fire and a nebula redrawn from scratch as celestial bodies (the heroes'
// own machinery: mouth, acting, spring, trail; the body's paint is theirs):
// - Pac-Man, a sun: self-lit, so no key light on him; hard radial bands from a white heart to
//   a red limb whose edges boil; a corona as a sun in splendour (twelve turning rays, straight
//   and wavy in turn, under one ink line) that the run sweeps back into a solar wind; glints of
//   sunlight for a trail;
// - Ms. Pac-Man, a galaxy: a sphere of deep space with a tilted spiral galaxy turning inside,
//   stars, a pale cloud round her eye (so the lashes read) and an atmosphere glowing at her
//   limb; her bow a bipolar nebula (two glowing lobes, a star at the knot).
// Frame space (the hooks): the hero faces +x, the top is -y, units px (R the body radius).
import { PACMAN_DESIGN, PacmanHero } from '../../../src/games/pacman/render/actors/hero/PacmanHero';
import {
	BOW_ANGLE,
	BOW_DISTANCE,
	MS_DESIGN,
	MsPacmanHero
} from '../../../src/games/pacman/render/actors/hero/MsPacmanHero';
import { glow } from '../../../src/games/pacman/render/actors/hero/Hero';
import type {
	HeroDesign,
	HeroFeel,
	Palette,
	Particle,
	ParticleKind
} from '../../../src/games/pacman/render/actors/hero/Hero';
import { starPath } from '../../../src/games/pacman/render/actors/hero/heroFx';
import { NIMBLE_BANDS } from './forms';
import { TAU, hash } from './kit';

type Ctx = CanvasRenderingContext2D;

// ── the sun ──────────────────────────────────────────────────────────────────────

/** Under his own paint (the cel disc never shows); the ink is his outline. */
const SOL: Palette = {
	light: [255, 240, 170],
	mid: [255, 190, 70],
	shadow: [240, 120, 30],
	deep: [150, 40, 10],
	bounce: [255, 140, 40],
	ink: [96, 24, 8],
	highlight: [255, 255, 240],
	rim: [255, 220, 150]
};

/** His bands, outside in: radius (body radii) and colour; the limb is the fill under them. */
const SOL_LIMB = 'rgb(222,72,22)';
const SOL_BANDS: ReadonlyArray<[number, string]> = [
	[0.9, 'rgb(250,126,30)'],
	[0.7, 'rgb(255,184,54)'],
	[0.47, 'rgb(255,226,120)'],
	[0.24, 'rgb(255,250,224)']
];

export class SolPacman extends PacmanHero {
	protected readonly design: HeroDesign = {
		...PACMAN_DESIGN,
		id: 'pac-sol',
		calm: SOL,
		inside: { mid: [140, 34, 12], deep: [80, 14, 6] },
		bands: NIMBLE_BANDS,
		powerScale: 1.22,
		flare: [255, 220, 140]
	};
	private sweep = 0;

	/** No rolling-ball meridians: they read as lines on the star. */
	setFeel(feel: HeroFeel): void {
		super.setFeel({ ...feel, sphere: false });
	}

	protected afterUpdate(dt: number): void {
		this.sweep += ((this.moving ? 1 : 0) - this.sweep) * Math.min(1, dt * 5);
	}

	/** A warm glow, then the corona: a turning crown of rays that the run sweeps back. */
	protected drawAura(ctx: Ctx, R: number): void {
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.globalAlpha = 0.3 + 0.05 * Math.sin(this.time * 7);
		ctx.drawImage(glow([255, 150, 40]), -R * 2.2, -R * 2.2, R * 4.4, R * 4.4);
		ctx.restore();
		this.corona(ctx, R);
	}

	/**
	 * The corona as a sun in splendour: twelve rays turning round him, straight and wavy in
	 * turn, two tones under one ink line. The run stretches the rays on his back and bends
	 * them back into a solar wind, and shortens the ones ahead.
	 */
	private corona(ctx: Ctx, R: number): void {
		const t = this.time;
		const w = this.sweep;
		const N = 12;
		const spin = t * 0.5;
		const shapes: Array<(inset: number) => void> = [];
		for (let i = 0; i < N; i++) {
			const a = spin + (i / N) * TAU;
			const straight = i % 2 === 0;
			const ca = Math.cos(a);
			const sa = Math.sin(a);
			const back = Math.max(0, -ca);
			const front = Math.max(0, ca);
			let len = R * (straight ? 0.42 : 0.32) * (0.92 + 0.08 * Math.sin(t * 7 + i * 1.3));
			len *= (1 + 1.3 * w * back * back) * (1 - 0.55 * w * front);
			const half = (TAU / N) * (straight ? 0.46 : 0.4);
			const base = R * 0.97;
			const tipR = R * 1.02 + len;
			const tx = ca * tipR - w * len * 0.5 * (1 - back);
			const ty = sa * tipR;
			const nx = -sa;
			const ny = ca;
			const sway = straight ? 0 : Math.sin(t * 6 + i) * 0.2;
			shapes.push((inset) => {
				const h = half * (1 - inset * 0.55);
				const k = 1 - inset * 0.5;
				const ex = ca * base + (tx - ca * base) * k;
				const ey = sa * base + (ty - sa * base) * k;
				const b0x = Math.cos(a - h) * base;
				const b0y = Math.sin(a - h) * base;
				const b1x = Math.cos(a + h) * base;
				const b1y = Math.sin(a + h) * base;
				const W = base * h;
				const lerp = (x0: number, y0: number, f: number, off: number) =>
					[x0 + (ex - x0) * f + nx * off, y0 + (ey - y0) * f + ny * off] as const;
				ctx.moveTo(b0x, b0y);
				if (straight) {
					const [m0x, m0y] = lerp(b0x, b0y, 0.5, W * 0.12);
					const [m1x, m1y] = lerp(b1x, b1y, 0.5, -W * 0.12);
					ctx.quadraticCurveTo(m0x, m0y, ex, ey);
					ctx.quadraticCurveTo(m1x, m1y, b1x, b1y);
				} else {
					// a wavy ray: both edges swing the same way, a flame laid along the ray
					const o = W * (0.8 + sway);
					const [c0x, c0y] = lerp(b0x, b0y, 0.33, o);
					const [c1x, c1y] = lerp(b0x, b0y, 0.66, -o);
					const [d1x, d1y] = lerp(b1x, b1y, 0.66, -o);
					const [d0x, d0y] = lerp(b1x, b1y, 0.33, o);
					ctx.bezierCurveTo(c0x, c0y, c1x, c1y, ex, ey);
					ctx.bezierCurveTo(d1x, d1y, d0x, d0y, b1x, b1y);
				}
				ctx.closePath();
			});
		}
		const all = (inset: number) => {
			ctx.beginPath();
			for (const s of shapes) s(inset);
		};
		ctx.save();
		ctx.lineJoin = 'round';
		all(0);
		ctx.strokeStyle = 'rgb(96,24,8)';
		ctx.lineWidth = R * 0.12;
		ctx.stroke();
		all(0);
		ctx.fillStyle = 'rgb(255,170,36)';
		ctx.fill();
		all(0.45);
		ctx.fillStyle = 'rgb(255,234,130)';
		ctx.fill();
		ctx.restore();
	}

	/** No ki flames: the corona is his. */
	protected drawBehind(): void {}

	/** His own light: radial bands from a white heart to a red limb, their edges boiling. */
	protected decorate(sc: Ctx, R: number): void {
		const t = this.time;
		sc.fillStyle = SOL_LIMB;
		sc.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);
		SOL_BANDS.forEach(([r, colour], i) => {
			const breath = i === SOL_BANDS.length - 1 ? 1 + 0.06 * Math.sin(t * 5) : 1;
			sc.fillStyle = colour;
			sc.beginPath();
			for (let j = 0; j <= 48; j++) {
				const a = (j / 48) * TAU;
				const rr =
					R * r * breath * (1 + 0.045 * Math.sin(5 * a + t * 2.2 + i) + 0.03 * Math.sin(9 * a - t * 3.1 + i * 2));
				const x = Math.cos(a) * rr - R * 0.04;
				const y = Math.sin(a) * rr;
				if (j === 0) sc.moveTo(x, y);
				else sc.lineTo(x, y);
			}
			sc.closePath();
			sc.fill();
		});
	}

	protected particleFor(): ParticleKind {
		return 'ember';
	}

	/** A glint of sunlight: a small gold star in a warm glow, shrinking as it fades. */
	protected drawParticle(ctx: Ctx, e: Particle, a: number, s: number): void {
		if (e.kind !== 'ember') {
			super.drawParticle(ctx, e, a, s);
			return;
		}
		const u = e.life / e.max;
		const r = s * (0.5 + 0.9 * u);
		ctx.save();
		ctx.globalAlpha = Math.min(1, u * 2.5);
		ctx.globalCompositeOperation = 'lighter';
		ctx.globalAlpha *= 0.6;
		ctx.drawImage(glow([255, 160, 50]), e.x - r * 1.8, e.y - r * 1.8, r * 3.6, r * 3.6);
		ctx.globalAlpha = Math.min(1, u * 2.5);
		ctx.globalCompositeOperation = 'source-over';
		ctx.fillStyle = 'rgb(255,232,150)';
		starPath(ctx, e.x, e.y, r * 1.4, r * 0.32, e.spin * (e.max - e.life));
		ctx.fill();
		ctx.restore();
	}
}

// ── the galaxy ───────────────────────────────────────────────────────────────────

const VOID: Palette = {
	light: [120, 80, 210],
	mid: [70, 40, 150],
	shadow: [40, 20, 100],
	deep: [20, 10, 50],
	bounce: [130, 60, 200],
	ink: [22, 6, 44],
	highlight: [255, 255, 255],
	rim: [180, 200, 255]
};

/** The galaxy's arms: the broad glow, the bright lane in it. */
const ARMS: ReadonlyArray<[string, string]> = [
	['255,110,214', '255,206,246'],
	['110,160,255', '196,226,255']
];

export class GalaxyMs extends MsPacmanHero {
	protected readonly design: HeroDesign = {
		...MS_DESIGN,
		id: 'ms-galaxy',
		calm: VOID,
		inside: { mid: [40, 12, 70], deep: [16, 4, 34] },
		bands: NIMBLE_BANDS,
		powerScale: 1.22,
		flare: [240, 200, 255]
	};

	/** No rolling-ball meridians: the galaxy is her volume. */
	setFeel(feel: HeroFeel): void {
		super.setFeel({ ...feel, sphere: false });
	}

	/** A violet glow round her. */
	protected drawAura(ctx: Ctx, R: number): void {
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.globalAlpha = 0.3;
		ctx.drawImage(glow([170, 100, 255]), -R * 2, -R * 2, R * 4, R * 4);
		ctx.restore();
	}

	/** Deep space, a spiral galaxy turning in it, stars, a cloud round the eye, a glowing limb. */
	protected decorate(sc: Ctx, R: number): void {
		const t = this.time;
		const base = sc.createRadialGradient(-R * 0.1, R * 0.05, 0, -R * 0.1, R * 0.05, R * 1.05);
		base.addColorStop(0, 'rgb(92,46,168)');
		base.addColorStop(0.55, 'rgb(52,26,118)');
		base.addColorStop(1, 'rgb(26,12,66)');
		sc.fillStyle = base;
		sc.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);
		// the galaxy: tilted, flattened, turning; each arm a stroke that thins outwards
		const gx = -R * 0.2;
		const gy = R * 0.14;
		const tilt = -0.35;
		const ct = Math.cos(tilt);
		const st = Math.sin(tilt);
		const turn = t * 0.45;
		const at = (a: number, r: number): [number, number] => {
			const x = Math.cos(a) * r;
			const y = Math.sin(a) * r * 0.55;
			return [gx + x * ct - y * st, gy + x * st + y * ct];
		};
		sc.lineCap = 'round';
		ARMS.forEach(([broad, lane], arm) => {
			const steps = 22;
			for (let pass = 0; pass < 2; pass++) {
				for (let i = 0; i < steps; i++) {
					const s0 = i / steps;
					const s1 = (i + 1) / steps;
					const [x0, y0] = at(turn + arm * Math.PI + s0 * 3.4, R * (0.06 + 0.7 * s0));
					const [x1, y1] = at(turn + arm * Math.PI + s1 * 3.4, R * (0.06 + 0.7 * s1));
					sc.strokeStyle =
						pass === 0 ? `rgba(${broad},${0.42 * (1 - s0 * 0.5)})` : `rgba(${lane},${0.8 * (1 - s0 * 0.7)})`;
					sc.lineWidth = pass === 0 ? R * (0.24 * (1 - s0) + 0.06) : R * (0.07 * (1 - s0) + 0.02);
					sc.beginPath();
					sc.moveTo(x0, y0);
					sc.lineTo(x1, y1);
					sc.stroke();
				}
			}
		});
		const core = sc.createRadialGradient(gx, gy, 0, gx, gy, R * 0.32);
		core.addColorStop(0, 'rgba(255,250,232,1)');
		core.addColorStop(0.3, 'rgba(255,214,240,.8)');
		core.addColorStop(1, 'rgba(255,170,230,0)');
		sc.fillStyle = core;
		sc.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);
		// stars, turning slowly with the galaxy, twinkling
		for (let i = 0; i < 10; i++) {
			const a = hash(i, 21) * TAU + turn * 0.3;
			const r = R * (0.2 + 0.7 * hash(i, 22));
			const x = Math.cos(a) * r;
			const y = Math.sin(a) * r;
			const tw = 0.35 + 0.65 * Math.max(0, Math.sin(t * (2 + hash(i, 23) * 3) + i * 1.9));
			sc.fillStyle = `rgba(255,255,255,${tw})`;
			if (i < 2) {
				starPath(sc, x, y, R * 0.13 * tw, R * 0.03);
				sc.fill();
			} else {
				sc.beginPath();
				sc.arc(x, y, Math.max(0.5, R * (0.025 + 0.025 * hash(i, 24))), 0, TAU);
				sc.fill();
			}
		}
		// a pale cloud round her eye, so the ink of the lashes reads on deep space
		const face = sc.createRadialGradient(R * 0.3, -R * 0.45, 0, R * 0.3, -R * 0.45, R * 0.5);
		face.addColorStop(0, 'rgba(255,176,232,.62)');
		face.addColorStop(1, 'rgba(255,150,220,0)');
		sc.fillStyle = face;
		sc.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);
		// the atmosphere at her limb
		const limb = sc.createRadialGradient(0, 0, R * 0.7, 0, 0, R);
		limb.addColorStop(0, 'rgba(150,190,255,0)');
		limb.addColorStop(0.75, 'rgba(176,160,255,.5)');
		limb.addColorStop(1, 'rgba(236,206,255,.95)');
		sc.fillStyle = limb;
		sc.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);
	}

	/** Her bow, a bipolar nebula: two glowing lobes either side of a star. */
	protected drawBow(ctx: Ctx, R: number, p: number): void {
		const t = this.time;
		ctx.save();
		ctx.translate(Math.cos(BOW_ANGLE) * R * BOW_DISTANCE, Math.sin(BOW_ANGLE) * R * BOW_DISTANCE);
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.globalAlpha = 0.45 + 0.3 * p;
		ctx.drawImage(glow([230, 140, 255]), -R * 1.2, -R * 1.2, R * 2.4, R * 2.4);
		ctx.restore();
		ctx.rotate(this.bowTurn());
		const k = 1 + 0.1 * p;
		ctx.scale(k, k);
		ctx.translate(0, -R * 0.08);
		const lobe = (s: number) => {
			ctx.moveTo(0, 0);
			ctx.quadraticCurveTo(s * R * 0.32, -R * 0.54, s * R * 0.82, -R * 0.5);
			ctx.quadraticCurveTo(s * R * 1.12, -R * 0.05, s * R * 0.84, R * 0.36);
			ctx.quadraticCurveTo(s * R * 0.34, R * 0.34, 0, 0);
			ctx.closePath();
		};
		ctx.lineJoin = 'round';
		ctx.beginPath();
		lobe(-1);
		lobe(1);
		ctx.strokeStyle = 'rgb(34,8,58)';
		ctx.lineWidth = R * 0.11;
		ctx.stroke();
		for (const s of [-1, 1]) {
			const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.02);
			g.addColorStop(0, 'rgb(255,238,252)');
			g.addColorStop(0.3, 'rgb(255,142,226)');
			g.addColorStop(0.72, s < 0 ? 'rgb(182,78,236)' : 'rgb(116,118,252)');
			g.addColorStop(1, 'rgb(76,48,186)');
			ctx.fillStyle = g;
			ctx.beginPath();
			lobe(s);
			ctx.fill();
			// the gas's filaments, drifting
			ctx.save();
			ctx.clip();
			const drift = Math.sin(t * 1.6 + s) * R * 0.05;
			ctx.strokeStyle = 'rgba(255,255,255,.5)';
			ctx.lineWidth = R * 0.045;
			ctx.beginPath();
			ctx.moveTo(0, 0);
			ctx.quadraticCurveTo(s * R * 0.4, -R * 0.42 + drift, s * R * 0.86, -R * 0.26);
			ctx.moveTo(0, 0);
			ctx.quadraticCurveTo(s * R * 0.46, R * 0.3 - drift, s * R * 0.86, R * 0.16);
			ctx.stroke();
			ctx.restore();
		}
		// the star at the knot
		const tw = 0.85 + 0.15 * Math.sin(t * 6);
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.globalAlpha = 0.8;
		ctx.drawImage(glow([255, 230, 255]), -R * 0.5, -R * 0.5, R, R);
		ctx.restore();
		ctx.fillStyle = '#fff';
		ctx.strokeStyle = 'rgb(34,8,58)';
		ctx.lineWidth = R * 0.04;
		starPath(ctx, 0, 0, R * 0.42 * tw, R * 0.1, -Math.PI / 2 + t * 0.4);
		ctx.fill();
		ctx.stroke();
		ctx.restore();
	}

	/** Stars for a trail, and on bursts. */
	protected particleFor(): ParticleKind {
		return 'star';
	}
}
