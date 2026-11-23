// Pac-Man, the hero: a real sun (the owner's pick of the `hero-art` prototype, the "pinwheel").
// Self-lit, so the key light never shades him: the accepted radial bands from a white heart to a
// red limb, alive (a slow boil of brighter and darker patches, a soft sunspot riding the star's
// turn); red plasma arches on the limb, each born, swelling and gone over a few seconds; round
// him a corona grown from ONE ring of fire (a single outline under one thin ink line, never
// separate quills, which read as a hedgehog) cut into six curved blades that turn. Running, a
// solar wind blows it back (the back stretches, the tips bend back) and the wind's direction
// lags a turn by ~0.2 s, so a corner swings the corona round. Everything stays inside 1.45 body
// radii (the rage spilled over the tile once, the owner's review), the glow too. One trail, the
// solar wind: embers streaming back and cooling white-gold, gold, orange, red, brown (particles
// only, DESIGN 12; no stars; nothing rises, seen from above). The rage (the energizer): white-hot,
// the arches erupt taller, the blades turn fast, the embers run hot. His minimal eye (a dot under
// a frowning brow). The machinery (mouth, acting, bites, spring, the energizer's beat, the ball,
// the death) is the shared Hero; the body's paint is his.
import type { HeroDesign, MouthInside, Palette, Particle, ParticleKind } from './Hero';
import { Hero, css, mix } from './Hero';
import type { RGB } from './heroSeasons';
import { INK, drawFlameDrop } from './heroFx';

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
	[240, 104, 22],
	[255, 214, 110]
];
const CORONA_INNER: readonly [RGB, RGB] = [
	[255, 214, 96],
	[255, 252, 226]
];
/** The blades' turn, radians per second (x4.5 in the rage). */
const SPIN = 1.1;
/** Nothing of the corona or its glow reaches past this (body radii): it stays inside the tile. */
export const CORONA_REACH = 1.45;
const ss = (e0: number, e1: number, x: number): number => {
	const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
	return k * k * (3 - 2 * k);
};
const hash = (i: number, k = 0): number => {
	const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
	return v - Math.floor(v);
};
/** The boil's patches, fixed points on the disc (body radii). */
const CELLS = Array.from({ length: 46 }, (_, i) => {
	const r = Math.sqrt((i + 0.5) / 46) * 0.95;
	const a = i * 2.39996;
	return {
		x: Math.cos(a) * r,
		y: Math.sin(a) * r,
		s: 0.09 + 0.05 * hash(i, 1),
		ph: hash(i, 2) * TAU
	};
});

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
	// lighter tone bands (the ball's cel); the rage never grows him (the owner's review)
	bands: [0.1, 0.3, 0.64]
};

export class PacmanHero extends Hero {
	protected readonly design: HeroDesign = PACMAN_DESIGN;
	/** Where the solar wind blows, a world unit vector (eased), and how hard, 0..1. */
	private windX = -1;
	private windY = 0;
	private windK = 0;
	/** The blades' turn, radians. */
	private spin = 0;
	private lastX = Number.NaN;
	private lastY = Number.NaN;
	/** A bite pulls the corona in for a moment. */
	private bitePulse = 0;
	/** The star's own turn (the sunspot rides it), radians. */
	private rot = 0;

	protected afterUpdate(dt: number): void {
		const vx = Number.isNaN(this.lastX) ? 0 : this.x - this.lastX;
		const vy = Number.isNaN(this.lastY) ? 0 : this.y - this.lastY;
		this.lastX = this.x;
		this.lastY = this.y;
		const v = Math.hypot(vx, vy);
		// (a teleport's jump is no wind)
		if (v > 0.01 && v < this.r * 3 && this.moving) {
			// the wind turns towards his back with a lag, so a corner swings it round
			const k = Math.min(1, dt * 9);
			this.windX += (-vx / v - this.windX) * k;
			this.windY += (-vy / v - this.windY) * k;
			const l = Math.hypot(this.windX, this.windY) || 1;
			this.windX /= l;
			this.windY /= l;
		}
		this.windK += ((this.moving ? 1 : 0) - this.windK) * Math.min(1, dt * 5);
		this.spin += dt * SPIN * (1 + 3.5 * this.power);
		this.rot += dt * 0.12;
		this.bitePulse = Math.max(0, this.bitePulse - dt / 0.3);
	}

	protected onBite(): void {
		this.bitePulse = 1;
	}

	protected resetLooks(): void {
		this.windK = 0;
		this.spin = 0;
		this.bitePulse = 0;
	}

	/** The wind in the frame (the frame turns with him and flips for left). */
	private windInFrame(): { x: number; y: number } {
		const ca = Math.cos(this.angle);
		const sa = Math.sin(this.angle);
		return {
			x: this.windX * ca + this.windY * sa,
			y: (-this.windX * sa + this.windY * ca) * this.flip
		};
	}

	/** A warm glow that ends at the reach, the corona, the plasma arches. */
	protected drawAura(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		const g = ctx.createRadialGradient(0, 0, R * 0.8, 0, 0, R * CORONA_REACH);
		g.addColorStop(0, `rgba(255,150,40,${0.42 + 0.2 * p})`);
		g.addColorStop(0.5, `rgba(255,120,30,${0.16 + 0.1 * p})`);
		g.addColorStop(1, 'rgba(255,110,30,0)');
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(0, 0, R * CORONA_REACH, 0, TAU);
		ctx.fill();
		ctx.restore();
		this.corona(ctx, R, p);
		this.prominences(ctx, R, p);
	}

	/** The pinwheel's edge at frame angle `a`: six blades, a slow concave rise and a quick fall. */
	private edge(a: number, R: number, p: number): number {
		const grow = 1 + 0.4 * p - 0.25 * this.bitePulse;
		const N = 6;
		const u = (((((a + this.spin) * N) / TAU) % 1) + 1) % 1;
		const blade = u < 0.86 ? Math.pow(u / 0.86, 2.2) : 1 - ss(0.86, 1, u);
		return R * (1.1 + (0.02 + 0.33 * blade) * grow);
	}

	/** The corona: one outline, two tones under one ink line, blown back by the wind. */
	private corona(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		const wind = this.windInFrame();
		const wk = this.windK;
		const N = 180;
		const pts: Array<[number, number]> = [];
		for (let j = 0; j < N; j++) {
			const a = (j / N) * TAU;
			const ca = Math.cos(a);
			const sa = Math.sin(a);
			let r = this.edge(a, R, p);
			const dot = ca * wind.x + sa * wind.y;
			const back = Math.max(0, dot);
			const front = Math.max(0, -dot);
			const len = r - R * 1.1;
			r = R * 1.1 + len * (1 + 1.5 * wk * back * back) * (1 - 0.45 * wk * front);
			// the tips bend back in the wind
			const bend = (r - R * 1.1) * 0.45 * wk * (1 - back);
			let x = ca * r + wind.x * bend;
			let y = sa * r + wind.y * bend;
			// the outline's ink (half its width) stays inside the reach too
			const cap = R * (CORONA_REACH - 0.045);
			const d = Math.hypot(x, y);
			if (d > cap) {
				x *= cap / d;
				y *= cap / d;
			}
			pts.push([x, y]);
		}
		const path = (k: number) => {
			ctx.beginPath();
			pts.forEach(([x, y], i) => {
				// the inner tone: the same outline pulled towards the ring
				const d = Math.hypot(x, y);
				const r = R * 1.02 + (d - R * 1.02) * k;
				if (i === 0) ctx.moveTo((x / d) * r, (y / d) * r);
				else ctx.lineTo((x / d) * r, (y / d) * r);
			});
			ctx.closePath();
		};
		ctx.save();
		ctx.lineJoin = 'round';
		path(1);
		ctx.strokeStyle = CORONA_INK;
		ctx.lineWidth = R * 0.08;
		ctx.stroke();
		ctx.fillStyle = css(mix(CORONA_OUTER[0], CORONA_OUTER[1], p));
		ctx.fill();
		path(0.5);
		ctx.fillStyle = css(mix(CORONA_INNER[0], CORONA_INNER[1], p));
		ctx.fill();
		// the ring itself, the root the blades grow from
		ctx.strokeStyle = css(mix([255, 196, 70], [255, 248, 210], p));
		ctx.lineWidth = R * 0.1;
		ctx.beginPath();
		ctx.arc(0, 0, R * 1.06, 0, TAU);
		ctx.stroke();
		ctx.restore();
	}

	/**
	 * Arches of plasma standing on the limb, over the corona: thick, soft, red-orange, two at a
	 * time, each born, swelling and gone over a few seconds (never a flicker), never on his face
	 * (the upper front). In the rage they erupt hotter and taller, still under the reach.
	 */
	private prominences(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		const t = this.time;
		ctx.save();
		ctx.lineCap = 'round';
		for (let i = 0; i < 2; i++) {
			const life = 3.4 + i * 0.9;
			const cyc = (t + i * 1.7) / life;
			const gen = Math.floor(cyc);
			const k = cyc - gen;
			const a = Math.PI * (0.35 + 1.3 * hash(gen * 7 + i, 5));
			const span = 0.2 + 0.1 * hash(gen * 7 + i, 6);
			const env = ss(0, 0.3, k) * (1 - ss(0.65, 1, k));
			if (env < 0.01) continue;
			const top = Math.min(
				R * (CORONA_REACH - 0.08),
				R * (1.22 + 0.1 * hash(gen + i, 8) + 0.1 * p) * (0.92 + 0.08 * env)
			);
			const foot = R;
			const x0 = Math.cos(a - span) * foot;
			const y0 = Math.sin(a - span) * foot;
			const x1 = Math.cos(a + span) * foot;
			const y1 = Math.sin(a + span) * foot;
			// the control point is pushed so the arch's apex sits at `top`
			const cx = Math.cos(a) * (2 * top - foot * Math.cos(span));
			const cy = Math.sin(a) * (2 * top - foot * Math.cos(span));
			const arch = () => {
				ctx.beginPath();
				ctx.moveTo(x0, y0);
				ctx.quadraticCurveTo(cx, cy, x1, y1);
			};
			arch();
			ctx.strokeStyle = css(mix([214, 56, 30], [255, 150, 70], p), 0.85 * env);
			ctx.lineWidth = R * 0.15;
			ctx.stroke();
			arch();
			ctx.strokeStyle = css(mix([255, 128, 70], [255, 232, 170], p), 0.9 * env);
			ctx.lineWidth = R * 0.07;
			ctx.stroke();
		}
		ctx.restore();
	}

	/**
	 * His own light: radial bands from a white heart to a red limb, boiling; white-hot in the
	 * rage. Over them a slow boil (soft brighter and darker patches, not cells with edges) and
	 * one soft sunspot low on his back riding the star's turn (two sharp dots read as a face).
	 */
	protected decorate(sc: CanvasRenderingContext2D, R: number, p: number): void {
		const t = this.time;
		this.paintBands(sc, R, p, t);
		for (const c of CELLS) {
			const b = Math.sin(t * 0.9 + c.ph);
			const x = (c.x + 0.04 * Math.sin(t * 0.5 + c.ph)) * R;
			const y = (c.y + 0.04 * Math.cos(t * 0.6 + c.ph)) * R;
			const r = c.s * R * 1.5;
			const g = sc.createRadialGradient(x, y, 0, x, y, r);
			const col: RGB = b > 0 ? mix([255, 246, 200], [255, 255, 245], p) : [190, 70, 16];
			g.addColorStop(0, css(col, Math.abs(b) * (b > 0 ? 0.22 : 0.13) * (1 - 0.5 * p)));
			g.addColorStop(1, css(col, 0));
			sc.fillStyle = g;
			sc.fillRect(x - r, y - r, r * 2, r * 2);
		}
		const lon = -1.0 + 0.5 * Math.sin(this.rot);
		const lat = 0.35;
		const z = Math.cos(lon) * Math.cos(lat);
		const sx = Math.sin(lon) * Math.cos(lat) * R * 0.95;
		const sy = Math.sin(lat) * R * 0.95;
		const vis = ss(0.05, 0.4, z) * (1 - 0.7 * p);
		sc.save();
		sc.translate(sx, sy);
		sc.rotate(Math.atan2(sy, sx));
		sc.scale(Math.max(0.3, z), 1);
		const spot = sc.createRadialGradient(0, 0, 0, 0, 0, R * 0.2);
		spot.addColorStop(0, `rgba(110,34,10,${0.75 * vis})`);
		spot.addColorStop(0.35, `rgba(150,50,14,${0.5 * vis})`);
		spot.addColorStop(1, 'rgba(170,60,16,0)');
		sc.fillStyle = spot;
		sc.beginPath();
		sc.ellipse(0, 0, R * 0.2, R * 0.14, 0.4, 0, TAU);
		sc.fill();
		sc.restore();
	}

	private paintBands(sc: CanvasRenderingContext2D, R: number, p: number, t: number): void {
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

	/** His minimal eye if on (a sun is self-lit: no star on a highlight). */
	protected drawWorn(ctx: CanvasRenderingContext2D, R: number): void {
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

	/** One trail, the solar wind: embers (drops of fire too in the rage and the ball). */
	protected particleFor(): ParticleKind {
		return 'ember';
	}

	protected sizeFor(): number {
		return 1.6;
	}

	/** Nothing rises: seen from above, embers only stream back and slow. */
	protected liftFor(): number {
		return 0;
	}

	protected swirlFor(): number {
		return 0.6;
	}

	/** An ember cooling as it ages: white-gold, gold, orange, red, brown; a drop of fire is three. */
	protected drawParticle(ctx: CanvasRenderingContext2D, e: Particle, a: number, s: number): void {
		const u = e.life / e.max;
		const heat = e.hot ? Math.min(1, u * 1.25) : u;
		const col: RGB =
			heat > 0.75
				? mix([255, 214, 110], [255, 248, 220], (heat - 0.75) / 0.25)
				: heat > 0.5
					? mix([250, 140, 40], [255, 214, 110], (heat - 0.5) / 0.25)
					: heat > 0.25
						? mix([190, 52, 20], [250, 140, 40], (heat - 0.25) / 0.25)
						: mix([88, 40, 30], [190, 52, 20], heat / 0.25);
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.globalAlpha = a * 0.45 * heat;
		const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, s * 2.4);
		g.addColorStop(0, css(col));
		g.addColorStop(1, css(col, 0));
		ctx.fillStyle = g;
		ctx.fillRect(e.x - s * 2.4, e.y - s * 2.4, s * 4.8, s * 4.8);
		ctx.globalCompositeOperation = 'source-over';
		if (e.kind === 'flame' && e.ang !== undefined) {
			// a drop of fire in the rage: the same ember, two smaller, cooler ones behind it
			const L = (e.len ?? s * 3) * 0.22;
			for (let k = 0; k < 3; k++) {
				ctx.globalAlpha = a * (1 - k * 0.3);
				ctx.fillStyle = css(mix(col, [200, 60, 20], k * 0.3));
				ctx.beginPath();
				ctx.arc(
					e.x - Math.cos(e.ang) * L * k,
					e.y - Math.sin(e.ang) * L * k,
					s * 0.3 * (1 - k * 0.25),
					0,
					TAU
				);
				ctx.fill();
			}
		} else {
			ctx.globalAlpha = a;
			ctx.fillStyle = css(col);
			ctx.beginPath();
			ctx.arc(e.x, e.y, s * 0.55, 0, TAU);
			ctx.fill();
		}
		ctx.restore();
	}
}
