// Pac-Man, the hero: a sun (the owner's pick of the `elements` prototype, variant 2). Self-lit,
// so the key light never shades him: hard radial bands from a white heart to a red limb, their
// edges boiling; round him a corona as a sun in splendour (twelve turning rays, straight and
// wavy in turn, two tones under one ink line) that the run stretches back into a solar wind,
// and a warm glow; glints of sunlight for a trail. The rage (the energizer) is a flare: he
// burns white-hot and the corona spins fast, but its rays never reach past their calm reach
// (the owner: the rage spilled over the tile); short arcs of light flicker between the rays
// and the trail is drops of fire. His minimal eye (a dot under a frowning brow). The
// machinery (mouth, acting, bites, spring, the energizer's beat, the ball, the death) is the
// shared Hero; the body's paint is his.
import type { HeroDesign, MouthInside, Palette, Particle, ParticleKind } from './Hero';
import { Hero, css, glow, mix } from './Hero';
import type { RGB } from './heroSeasons';
import {
	INK,
	drawEmberGlow,
	drawFlameDrop,
	drawStarGlint,
	particleLift,
	particleSwirl,
	particleSize,
	starPath
} from './heroFx';

const TAU = Math.PI * 2;

/** Under his own paint (only the ball and the flash show it); the ink is his outline. */
const CALM: Palette = {
	light: [255, 240, 170],
	mid: [255, 190, 70],
	shadow: [240, 120, 30],
	deep: [150, 40, 10],
	bounce: [255, 140, 40],
	ink: [96, 24, 8],
	highlight: [255, 255, 240],
	rim: [255, 220, 150]
};
const AWOKEN: Palette = {
	light: [255, 252, 224],
	mid: [255, 222, 120],
	shadow: [255, 160, 50],
	deep: [190, 60, 14],
	bounce: [255, 176, 70],
	ink: [96, 24, 8],
	highlight: [255, 255, 255],
	rim: [255, 236, 190]
};

const INSIDE: MouthInside = {
	mid: [140, 34, 12],
	deep: [80, 14, 6]
};

/** The sun's bands, outside in: radius (body radii), calm and white-hot colours; the limb first. */
const BANDS: ReadonlyArray<readonly [number, RGB, RGB]> = [
	[1.2, [222, 72, 22], [255, 132, 40]],
	[0.9, [250, 126, 30], [255, 184, 64]],
	[0.7, [255, 184, 54], [255, 226, 130]],
	[0.47, [255, 226, 120], [255, 246, 200]],
	[0.24, [255, 250, 224], [255, 255, 252]]
];

const CORONA_INK = 'rgb(96,24,8)';
const CORONA_OUTER: readonly [RGB, RGB] = [
	[255, 170, 36],
	[255, 226, 120]
];
const CORONA_INNER: readonly [RGB, RGB] = [
	[255, 234, 130],
	[255, 255, 236]
];
/** The corona's turn, radians per second, calm and in the rage. */
const SPIN = 0.5;
const SPIN_RAGE = 3;
/** The corona's tip never reaches past this (body radii): the rage stays inside the tile. */
const CORONA_REACH = 1.45;

export const PACMAN_DESIGN: HeroDesign = {
	id: 'pacman-sun',
	calm: CALM,
	awoken: AWOKEN,
	hinge: 0.08,
	inside: INSIDE,
	// wide jaws (the owner's review): fully open the mouth spans about 92 degrees
	mouthSpan: 0.76,
	grinRest: 0.2,
	grinRun: 0.08,
	chompRate: 4.2,
	flare: [255, 220, 140],
	death: 'open',
	// lighter tone bands (the ball's cel); the rage never enlarges him (the owner's pick)
	bands: [0.1, 0.3, 0.64]
};

export class PacmanHero extends Hero {
	protected readonly design: HeroDesign = PACMAN_DESIGN;
	/** 0 standing, 1 running: the solar wind. */
	private sweep = 0;
	/** The corona's turn, radians (it speeds up in the rage). */
	private spin = 0;

	protected afterUpdate(dt: number): void {
		this.sweep += ((this.moving ? 1 : 0) - this.sweep) * Math.min(1, dt * 5);
		this.spin += dt * (SPIN + (SPIN_RAGE - SPIN) * this.power);
	}

	protected resetLooks(): void {
		this.sweep = 0;
		this.spin = 0;
	}

	/** A warm glow, then the corona. */
	protected drawAura(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.globalAlpha = 0.3 + 0.2 * p + 0.05 * Math.sin(this.time * 7);
		const g = R * (1.7 + 0.6 * p);
		ctx.drawImage(glow([255, 150, 40]), -g, -g, g * 2, g * 2);
		ctx.restore();
		this.corona(ctx, R, p);
	}

	/**
	 * The corona as a sun in splendour: twelve rays turning round him, straight and wavy in
	 * turn, two tones under one ink line. The run stretches the rays on his back and bends them
	 * back into a solar wind, and shortens the ones ahead; the rage makes them longer and hotter.
	 */
	private corona(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		const t = this.time;
		const w = this.sweep;
		const N = 12;
		const shapes: Array<(inset: number) => void> = [];
		for (let i = 0; i < N; i++) {
			const a = this.spin + (i / N) * TAU;
			const straight = i % 2 === 0;
			const ca = Math.cos(a);
			const sa = Math.sin(a);
			const back = Math.max(0, -ca);
			const front = Math.max(0, ca);
			let len = R * (straight ? 0.42 : 0.32) * (0.92 + 0.08 * Math.sin(t * (7 + 6 * p) + i * 1.3));
			len *= (1 + 0.55 * p) * (1 + 1.3 * w * back * back) * (1 - 0.55 * w * front);
			const half = (TAU / N) * (straight ? 0.46 : 0.4);
			const base = R * 0.97;
			let tipR = R * 1.02 + len;
			if (tipR > R * CORONA_REACH) {
				tipR = R * CORONA_REACH;
				len = tipR - R * 1.02;
			}
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
				const along = (x0: number, y0: number, f: number, off: number) =>
					[x0 + (ex - x0) * f + nx * off, y0 + (ey - y0) * f + ny * off] as const;
				ctx.moveTo(b0x, b0y);
				if (straight) {
					const [m0x, m0y] = along(b0x, b0y, 0.5, W * 0.12);
					const [m1x, m1y] = along(b1x, b1y, 0.5, -W * 0.12);
					ctx.quadraticCurveTo(m0x, m0y, ex, ey);
					ctx.quadraticCurveTo(m1x, m1y, b1x, b1y);
				} else {
					// a wavy ray: both edges swing the same way, a flame laid along the ray
					const o = W * (0.8 + sway);
					const [c0x, c0y] = along(b0x, b0y, 0.33, o);
					const [c1x, c1y] = along(b0x, b0y, 0.66, -o);
					const [d1x, d1y] = along(b1x, b1y, 0.66, -o);
					const [d0x, d0y] = along(b1x, b1y, 0.33, o);
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
		ctx.strokeStyle = CORONA_INK;
		ctx.lineWidth = R * 0.12;
		ctx.stroke();
		all(0);
		ctx.fillStyle = css(mix(CORONA_OUTER[0], CORONA_OUTER[1], p));
		ctx.fill();
		all(0.45);
		ctx.fillStyle = css(mix(CORONA_INNER[0], CORONA_INNER[1], p));
		ctx.fill();
		ctx.restore();
	}

	/**
	 * The flare (the rage, `k` its look times the end-of-power pulse): short arcs of white-gold
	 * light flickering between the corona's rays, never reaching past them.
	 */
	protected drawBehind(ctx: CanvasRenderingContext2D, R: number, k: number): void {
		const t = this.time;
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.lineCap = 'round';
		for (let i = 0; i < 12; i++) {
			const a = this.spin * 0.6 + ((i + 0.5) / 12) * TAU;
			const flick = 0.5 + 0.5 * Math.sin(t * (13 + (i % 4) * 3) + i * 2.1);
			ctx.strokeStyle = `rgba(255,240,180,${0.7 * k * flick})`;
			ctx.lineWidth = R * 0.07;
			ctx.beginPath();
			ctx.arc(0, 0, R * (1.08 + 0.1 * flick), a - 0.1, a + 0.1);
			ctx.stroke();
		}
		ctx.restore();
	}

	/** His own light: radial bands from a white heart to a red limb, boiling; white-hot in the rage. */
	protected decorate(sc: CanvasRenderingContext2D, R: number, p: number): void {
		const t = this.time;
		BANDS.forEach(([r, calm, hot], i) => {
			const last = i === BANDS.length - 1;
			const breath = last ? (1 + 0.5 * p) * (1 + 0.06 * Math.sin(t * (5 + 6 * p))) : 1;
			const boil = 1 + 0.6 * p;
			sc.fillStyle = css(mix(calm, hot, p));
			sc.beginPath();
			for (let j = 0; j <= 48; j++) {
				const a = (j / 48) * TAU;
				const rr =
					R *
					r *
					breath *
					(1 +
						boil * 0.045 * Math.sin(5 * a + t * 2.2 + i) +
						boil * 0.03 * Math.sin(9 * a - t * 3.1 + i * 2));
				const x = Math.cos(a) * rr - R * 0.04;
				const y = Math.sin(a) * rr;
				if (j === 0) sc.moveTo(x, y);
				else sc.lineTo(x, y);
			}
			sc.closePath();
			sc.fill();
		});
	}

	/** Three fire swirls on the gold ball (white-hot when powered), turning with the roll. */
	protected paintBallPattern(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		for (let k = 0; k < 3; k++) {
			const a0 = (k * Math.PI * 2) / 3;
			const swirl = () => {
				ctx.beginPath();
				for (let i = 0; i <= 24; i++) {
					const s = i / 24;
					const r = R * (0.1 + 1.0 * s);
					const a = a0 + s * 2.3;
					if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
					else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
				}
			};
			swirl();
			ctx.strokeStyle = css(INK, 0.9);
			ctx.lineWidth = R * 0.3;
			ctx.stroke();
			swirl();
			ctx.strokeStyle = css(mix([236, 96, 28], [255, 244, 200], p));
			ctx.lineWidth = R * 0.2;
			ctx.stroke();
			swirl();
			ctx.strokeStyle = css(mix([255, 210, 80], [255, 255, 255], p));
			ctx.lineWidth = R * 0.07;
			ctx.stroke();
		}
	}

	/** Three drops of fire circling the ball. */
	protected paintBallOrbit(ctx: CanvasRenderingContext2D, R: number): void {
		for (let k = 0; k < 3; k++) {
			const a = this.time * 7 + (k * Math.PI * 2) / 3;
			const rr = R * 1.3;
			drawFlameDrop(
				ctx,
				{
					kind: 'flame',
					x: Math.cos(a) * rr,
					y: Math.sin(a) * rr,
					vx: 0,
					vy: 0,
					life: 0.7,
					max: 1,
					size: R * 0.3,
					hot: true,
					spin: 0,
					len: R * 0.95,
					ang: a + Math.PI / 2
				},
				[255, 150, 40],
				[255, 236, 150]
			);
		}
	}

	/** A small four-point star on the highlight while he is powered; his minimal eye if on. */
	protected drawWorn(
		ctx: CanvasRenderingContext2D,
		R: number,
		p: number,
		lx: number,
		ly: number
	): void {
		drawStarGlint(ctx, R, p, lx, ly);
		if (this.feel.eye) this.drawEye(ctx, R);
	}

	/**
	 * His eye, the minimum (the owner: a dot under a frowning brow): a dark dot that follows the
	 * gaze and a short thick brow slanting down to the front. Never under 1.4 px, so it still
	 * reads at a tile.
	 */
	private drawEye(ctx: CanvasRenderingContext2D, R: number): void {
		const ex = R * 0.16;
		const ey = -R * 0.5;
		const ink = css(CALM.ink);
		ctx.strokeStyle = ink;
		ctx.lineCap = 'round';
		// the brow: short, slanting down to the front, clear of the dot so the two never merge
		ctx.lineWidth = Math.max(1.2, R * 0.075);
		ctx.beginPath();
		ctx.moveTo(ex - R * 0.16, ey - R * 0.3);
		ctx.lineTo(ex + R * 0.15, ey - R * 0.19);
		ctx.stroke();
		ctx.fillStyle = ink;
		ctx.beginPath();
		ctx.arc(
			ex + this.gazeX * R * 0.04,
			ey + R * 0.04 + this.gazeY * R * 0.05,
			Math.max(1.3, R * 0.085),
			0,
			Math.PI * 2
		);
		ctx.fill();
	}

	/** Glints of sunlight for a trail; fire in the rage and rolled into a ball. */
	protected particleFor(moment: 'trail' | 'burst' | 'death'): ParticleKind {
		return moment === 'trail' && (this.power > 0.5 || this.ball) ? 'ember' : 'spark';
	}

	protected sizeFor(kind: ParticleKind): number {
		return particleSize(kind);
	}

	protected liftFor(kind: ParticleKind): number {
		return particleLift(kind);
	}

	protected swirlFor(kind: ParticleKind): number {
		return particleSwirl(kind);
	}

	protected drawParticle(ctx: CanvasRenderingContext2D, e: Particle, a: number, s: number): void {
		if (e.kind === 'ember') {
			drawEmberGlow(ctx, e, a, s, [255, 170, 60], [255, 236, 170]);
			return;
		}
		if (e.kind === 'flame') {
			drawFlameDrop(ctx, e, [255, 150, 40], [255, 236, 150]);
			return;
		}
		// a glint of sunlight: a thin warm flare in a soft glow, shrinking as it fades
		const u = e.life / e.max;
		const r = s * (0.3 + 0.5 * u);
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.globalAlpha = a * 0.5;
		ctx.drawImage(glow([255, 180, 70]), e.x - r * 1.6, e.y - r * 1.6, r * 3.2, r * 3.2);
		ctx.globalAlpha = a;
		ctx.fillStyle = 'rgb(255,236,160)';
		starPath(ctx, e.x, e.y, r * 1.7, r * 0.18, e.spin * (e.max - e.life));
		ctx.fill();
		ctx.restore();
	}
}
