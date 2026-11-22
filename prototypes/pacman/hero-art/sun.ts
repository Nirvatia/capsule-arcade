// Pac-Man as a real sun (the owner's "mad experiment"): the game's disc and wedge mouth, his eye and
// his look where he goes stay; the madness is in the corona, the light, the particles, the motion.
//   The star itself: the accepted radial bands (white heart, red limb) now alive: granulation
//   cells that boil, two sunspots that ride the turning star and fade at the limb, faculae.
//   Prominences: two or three arches of red plasma standing on the limb, each born, swelling and
//   gone over a few seconds (slow, never a flicker).
//   The corona grows from ONE ring of fire (a single closed outline under one ink line, never
//   separate quills, which read as a hedgehog), in three forms the owner liked:
//     ring      the ring's edge boils into flame tongues that merge
//     emblem    eight soft rays, long and short in turn, set on the ring (the classic sun)
//     pinwheel  the ring cut into curved blades swept one way, turning
//   Running, the solar wind blows it back: the edge on his back stretches and its tips bend back,
//   and the wind's direction lags a turn by ~0.2 s, so a corner visibly swings the corona round.
//   Everything stays inside the game's reach (1.45 body radii, `CORONA_REACH`): the run and the
//   rage stretch the shape, never past it. The glow ends there too.
//   One trail, the solar wind: embers streaming back and cooling white-gold, gold, orange, red,
//   brown; particles only (DESIGN 12: never ribbons), no stars, nothing rises (seen from above). The rage (energizer): white-hot, the prominences erupt into big loops,
//   the corona turns fast, the embers run hot.
import type { Particle, ParticleKind } from '../../../src/games/pacman/render/actors/hero/Hero';
import { css, mix } from '../../../src/games/pacman/render/actors/hero/Hero';
import { PacmanHero } from '../../../src/games/pacman/render/actors/hero/PacmanHero';
import type { RGB } from '../../../src/games/pacman/render/actors/hero/heroSeasons';

const TAU = Math.PI * 2;
export type Corona = 'ring' | 'emblem' | 'pinwheel';
/** The game's reach (body radii): nothing of the corona or its glow goes past it. */
export const REACH = 1.45;
const INK = 'rgb(96,24,8)';
const OUTER: readonly [RGB, RGB] = [
	[240, 104, 22],
	[255, 214, 110]
];
const INNER: readonly [RGB, RGB] = [
	[255, 214, 96],
	[255, 252, 226]
];
const ss = (e0: number, e1: number, x: number) => {
	const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
	return k * k * (3 - 2 * k);
};
const hash = (i: number, k = 0) => {
	const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
	return v - Math.floor(v);
};

/** Granulation cells and faculae, fixed points on the disc (body radii). */
const CELLS = Array.from({ length: 46 }, (_, i) => {
	const r = Math.sqrt((i + 0.5) / 46) * 0.95;
	const a = i * 2.39996;
	return { x: Math.cos(a) * r, y: Math.sin(a) * r, s: 0.09 + 0.05 * hash(i, 1), ph: hash(i, 2) * TAU };
});

export class SunHero extends PacmanHero {
	/** Where the solar wind blows, a world unit vector (eased), and how hard, 0..1. */
	private windX = -1;
	private windY = 0;
	private windK = 0;
	private turnSpin = 0;
	private lastX = NaN;
	private lastY = NaN;
	private bitePulse = 0;
	/** The star's own turn (sunspots ride it), radians. */
	private rot = 0;
	/** For the measuring scripts: draw the corona and the body only. */
	bare = false;

	constructor(readonly kind: Corona) {
		super();
	}

	protected afterUpdate(dt: number): void {
		super.afterUpdate(dt);
		const vx = Number.isNaN(this.lastX) ? 0 : this.x - this.lastX;
		const vy = Number.isNaN(this.lastY) ? 0 : this.y - this.lastY;
		this.lastX = this.x;
		this.lastY = this.y;
		const v = Math.hypot(vx, vy);
		if (v > 0.01 && this.moving) {
			// the wind turns towards his back with a lag, so a corner swings it round
			const k = Math.min(1, dt * 9);
			this.windX += (-vx / v - this.windX) * k;
			this.windY += (-vy / v - this.windY) * k;
			const l = Math.hypot(this.windX, this.windY) || 1;
			this.windX /= l;
			this.windY /= l;
		}
		this.windK += ((this.moving ? 1 : 0) - this.windK) * Math.min(1, dt * 5);
		this.turnSpin += dt * (this.kind === 'pinwheel' ? 1.1 : 0.45) * (1 + 3.5 * this.power);
		this.rot += dt * 0.12;
		this.bitePulse = Math.max(0, this.bitePulse - dt / 0.3);
	}

	protected onBite(): void {
		this.bitePulse = 1;
	}

	protected resetLooks(): void {
		super.resetLooks();
		this.windK = 0;
	}

	/** The wind in the frame (the frame turns with him and flips for left). */
	private windInFrame(): { x: number; y: number } {
		const ca = Math.cos(this.angle);
		const sa = Math.sin(this.angle);
		return { x: this.windX * ca + this.windY * sa, y: (-this.windX * sa + this.windY * ca) * this.flip };
	}

	protected drawAura(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		// a warm glow that ends at the reach (the game's spills to 1.7-2.3 radii)
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		const g = ctx.createRadialGradient(0, 0, R * 0.8, 0, 0, R * REACH);
		g.addColorStop(0, `rgba(255,150,40,${0.42 + 0.2 * p})`);
		g.addColorStop(0.5, `rgba(255,120,30,${0.16 + 0.1 * p})`);
		g.addColorStop(1, 'rgba(255,110,30,0)');
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(0, 0, R * REACH, 0, TAU);
		ctx.fill();
		ctx.restore();
		this.sunCorona(ctx, R, p);
		this.prominences(ctx, R, p);
	}

	/** Where the corona's edge is at frame angle `a`: radius before the wind. */
	private edge(a: number, R: number, p: number): number {
		const t = this.time;
		const s = this.turnSpin;
		const grow = 1 + 0.4 * p - 0.25 * this.bitePulse;
		if (this.kind === 'ring') {
			// seven big tongues licking round a thick ring: narrow peaks, wide round valleys, the
			// peaks curling as the phase wanders; one continuous edge
			const w = 0.5 + 0.5 * Math.sin(7 * a + s * 2.2 + 0.9 * Math.sin(2 * a - t * 1.6));
			const f = Math.pow(w, 2.6);
			return R * (1.13 + (0.03 + 0.3 * f) * grow + 0.015 * Math.sin(19 * a - t * 5));
		}
		if (this.kind === 'emblem') {
			// the heraldic sun: eight rays on a ring, long straight ones and short wavy ones
			const N = 8;
			let bump = 0;
			for (let i = 0; i < N; i += 1) {
				const c = s + (i / N) * TAU;
				const d = Math.abs((((a - c + Math.PI) % TAU) + TAU) % TAU - Math.PI);
				const longRay = i % 2 === 0;
				const h = (TAU / N) * (longRay ? 0.26 : 0.2);
				if (d < h) {
					const k = 1 - d / h;
					const len = longRay ? 0.33 : 0.2 * (1 + 0.15 * Math.sin(t * 5 + i));
					bump = Math.max(bump, len * k);
				}
			}
			return R * (1.12 + bump * grow);
		}
		// pinwheel: six blades swept one way (a slow concave rise, a quick fall), turning
		const N = 6;
		const u = ((((a + s) * N) / TAU) % 1 + 1) % 1;
		const blade = u < 0.86 ? Math.pow(u / 0.86, 2.2) : 1 - ss(0.86, 1, u);
		return R * (1.1 + (0.02 + 0.33 * blade) * grow);
	}

	/** The corona: one outline, two tones under one ink line, blown back by the wind. */
	private sunCorona(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		const wind = this.windInFrame();
		const wk = this.windK;
		const N = 180;
		const pts: Array<[number, number]> = [];
		for (let j = 0; j < N; j += 1) {
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
			// the outline's ink (half its width) must stay inside the reach too
			const cap = R * (REACH - 0.045);
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
				const px = (x / d) * r;
				const py = (y / d) * r;
				if (i === 0) ctx.moveTo(px, py);
				else ctx.lineTo(px, py);
			});
			ctx.closePath();
		};
		ctx.save();
		ctx.lineJoin = 'round';
		path(1);
		ctx.strokeStyle = INK;
		ctx.lineWidth = R * 0.08;
		ctx.stroke();
		ctx.fillStyle = css(mix(OUTER[0], OUTER[1], p));
		ctx.fill();
		path(this.kind === 'emblem' ? 0.62 : 0.5);
		ctx.fillStyle = css(mix(INNER[0], INNER[1], p));
		ctx.fill();
		// the ring itself, the root everything grows from: a hot band under one ink line
		ctx.strokeStyle = css(mix([255, 196, 70], [255, 248, 210], p));
		ctx.lineWidth = R * 0.1;
		ctx.beginPath();
		ctx.arc(0, 0, R * 1.06, 0, TAU);
		ctx.stroke();
		ctx.restore();
	}

	/**
	 * Arches of plasma standing on the limb, over the corona: thick, soft, red-orange, two at a
	 * time, each born, swelling and gone over a few seconds (slow, never a flicker). In the rage
	 * they erupt hotter and taller, still under the reach.
	 */
	private prominences(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		const t = this.time;
		ctx.save();
		ctx.lineCap = 'round';
		for (let i = 0; i < 2; i += 1) {
			const life = 3.4 + i * 0.9;
			const cyc = (t + i * 1.7) / life;
			const gen = Math.floor(cyc);
			const k = cyc - gen;
			// a new place each time, never on his face (the upper front, where the eye is)
			const a = Math.PI * (0.35 + 1.3 * hash(gen * 7 + i, 5));
			const span = 0.2 + 0.1 * hash(gen * 7 + i, 6);
			const env = ss(0, 0.3, k) * (1 - ss(0.65, 1, k));
			if (env < 0.01) continue;
			const top = Math.min(R * (REACH - 0.08), R * (1.22 + 0.1 * hash(gen + i, 8) + 0.1 * p) * (0.92 + 0.08 * env));
			const foot = R * 1.0;
			const x0 = Math.cos(a - span) * foot;
			const y0 = Math.sin(a - span) * foot;
			const x1 = Math.cos(a + span) * foot;
			const y1 = Math.sin(a + span) * foot;
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

	/** The rage: no flicker; the eruptions are in the prominences, the light in the bands. */
	protected drawBehind(): void {
		// (the game's flickering arcs between the rays are left out)
	}

	/**
	 * The star: the game's bands, then a slow boil (soft brighter and darker patches drifting, not
	 * cells with edges), faculae near the limb, and a small pair of sunspots riding the turn low
	 * on his back, away from the eye (a dark spot by the eye reads as a second eye).
	 */
	protected decorate(sc: CanvasRenderingContext2D, R: number, p: number): void {
		super.decorate(sc, R, p);
		const t = this.time;
		for (let i = 0; i < CELLS.length; i += 1) {
			const c = CELLS[i];
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
		// one sunspot group near the limb on his back: a soft penumbra, a small umbra, riding the
		// turn and foreshortened at the limb (low contrast: two sharp dots read as a face)
		const lon = -1.0 + 0.5 * Math.sin(this.rot);
		const lat = 0.35;
		const z = Math.cos(lon) * Math.cos(lat);
		const x = Math.sin(lon) * Math.cos(lat) * R * 0.95;
		const y = Math.sin(lat) * R * 0.95;
		const vis = ss(0.05, 0.4, z) * (1 - 0.7 * p);
		sc.save();
		sc.translate(x, y);
		sc.rotate(Math.atan2(y, x));
		sc.scale(Math.max(0.3, z), 1);
		const g = sc.createRadialGradient(0, 0, 0, 0, 0, R * 0.2);
		g.addColorStop(0, `rgba(110,34,10,${0.75 * vis})`);
		g.addColorStop(0.35, `rgba(150,50,14,${0.5 * vis})`);
		g.addColorStop(1, 'rgba(170,60,16,0)');
		sc.fillStyle = g;
		sc.beginPath();
		sc.ellipse(0, 0, R * 0.2, R * 0.14, 0.4, 0, TAU);
		sc.fill();
		sc.restore();
	}

	/** His eye (the game's: a dot under a frowning brow), no star on the highlight. */
	protected drawWorn(ctx: CanvasRenderingContext2D, R: number): void {
		if (!this.feel.eye) return;
		const ex = R * 0.16;
		const ey = -R * 0.5;
		const ink = 'rgb(96,24,8)';
		ctx.strokeStyle = ink;
		ctx.lineCap = 'round';
		ctx.lineWidth = Math.max(1.2, R * 0.075);
		ctx.beginPath();
		ctx.moveTo(ex - R * 0.16, ey - R * 0.3);
		ctx.lineTo(ex + R * 0.15, ey - R * 0.19);
		ctx.stroke();
		ctx.fillStyle = ink;
		ctx.beginPath();
		ctx.arc(ex + this.gazeX * R * 0.04, ey + R * 0.04 + this.gazeY * R * 0.05, Math.max(1.3, R * 0.085), 0, TAU);
		ctx.fill();
	}

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

	/** An ember cooling as it ages: white-gold, gold, orange, red, brown; a drop of fire is a streak of the same. */
	protected drawParticle(ctx: CanvasRenderingContext2D, e: Particle, a: number, s: number): void {
		if (this.bare) return;
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
		ctx.globalAlpha = a;
		ctx.fillStyle = css(col);
		if (e.kind === 'flame' && e.ang !== undefined) {
			// a drop of fire in the rage: the same ember with two smaller, cooler ones behind it
			const L = (e.len ?? s * 3) * 0.22;
			for (let k = 0; k < 3; k += 1) {
				ctx.globalAlpha = a * (1 - k * 0.3);
				ctx.fillStyle = css(mix(col, [200, 60, 20], k * 0.3));
				ctx.beginPath();
				ctx.arc(e.x - Math.cos(e.ang) * L * k, e.y - Math.sin(e.ang) * L * k, s * 0.3 * (1 - k * 0.25), 0, TAU);
				ctx.fill();
			}
		} else {
			ctx.beginPath();
			ctx.arc(e.x, e.y, s * 0.55, 0, TAU);
			ctx.fill();
		}
		ctx.restore();
	}
}
