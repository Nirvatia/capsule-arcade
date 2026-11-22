// Candidates for the heroes' art (prototype, nothing in the game changes until the owner picks).
// Pac-Man: the corona without the hedgehog's quills, and one trail language, the sun's.
//   Why a hedgehog: ten separate tongues stand round the disc with gaps at their roots, so the
//   silhouette is a ring of spikes. All three candidates grow from one continuous ring of fire.
//   A  flame ring: no rays at all, one boiling fire edge that streams back when he runs
//   B  sun emblem: eight soft rays, long and short in turn, set on a ring (the classic sun)
//   C  pinwheel: seven curved tongues all bent the way the corona turns
//   Trail ("solar wind"): only embers, cooling white-gold, gold, orange, red, brown as they age,
//   streaming straight back (no flutter, no stars) with a short comet tail, and thin plasma
//   filaments that leave the corona's back and tie it to the trail.
// Ms. Pac-Man: her white stays; two sets of small details.
//   A  beauty mark and a pearl earring    B  a curl under the bow and a twinkle on the lash
import type { HeroDesign, OverPainter, Particle, ParticleKind } from '../../../src/games/pacman/render/actors/hero/Hero';
import { css, glow, mix } from '../../../src/games/pacman/render/actors/hero/Hero';
import { PacmanHero } from '../../../src/games/pacman/render/actors/hero/PacmanHero';
import type { RGB } from '../../../src/games/pacman/render/actors/hero/heroSeasons';

const TAU = Math.PI * 2;
export type CoronaKind = 'A' | 'B' | 'C';

const OUTER: readonly [RGB, RGB] = [
	[255, 170, 36],
	[255, 226, 120]
];
const INNER: readonly [RGB, RGB] = [
	[255, 234, 130],
	[255, 255, 236]
];
const INK = 'rgb(96,24,8)';
/** The corona never reaches past this (body radii): the rage stays inside the tile. */
const REACH = 1.45;

export class SunPacman extends PacmanHero {
	private mySweep = 0;
	private mySpin = 0;

	constructor(private readonly kind: CoronaKind) {
		super();
	}

	protected afterUpdate(dt: number): void {
		super.afterUpdate(dt);
		this.mySweep += ((this.moving ? 1 : 0) - this.mySweep) * Math.min(1, dt * 5);
		this.mySpin += dt * (this.kind === 'C' ? 0.9 : 0.5) * (1 + 4 * this.power);
	}

	protected get designOf(): HeroDesign {
		return this.design;
	}

	/** A warm glow, the corona, then the plasma filaments of the back. */
	protected drawAura(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.globalAlpha = 0.3 + 0.2 * p + 0.05 * Math.sin(this.time * 2);
		const g = R * (1.7 + 0.6 * p);
		ctx.drawImage(glow([255, 150, 40]), -g, -g, g * 2, g * 2);
		ctx.restore();
		if (this.kind === 'A') this.flameRing(ctx, R, p);
		else if (this.kind === 'B') this.emblem(ctx, R, p);
		else this.pinwheel(ctx, R, p);
		this.filaments(ctx, R, p);
	}

	/** Fills a path made by `build` in the corona's two tones under one thin ink line. */
	private paint(ctx: CanvasRenderingContext2D, R: number, p: number, build: () => void): void {
		ctx.save();
		ctx.lineJoin = 'round';
		build();
		ctx.strokeStyle = INK;
		ctx.lineWidth = R * 0.09;
		ctx.stroke();
		build();
		ctx.fillStyle = css(mix(OUTER[0], OUTER[1], p));
		ctx.fill();
		ctx.scale(0.88, 0.88);
		build();
		ctx.fillStyle = css(mix(INNER[0], INNER[1], p));
		ctx.fill();
		ctx.restore();
	}

	private reach(len: number, R: number): number {
		return Math.min(R * REACH, R * 1.0 + len);
	}

	/** A: one boiling edge of fire round the disc; longer on his back when he runs. */
	private flameRing(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		const t = this.time;
		const w = this.mySweep;
		this.paint(ctx, R, p, () => {
			ctx.beginPath();
			const N = 140;
			for (let j = 0; j <= N; j += 1) {
				const a = (j / N) * TAU;
				const ca = Math.cos(a);
				const back = Math.max(0, -ca);
				const front = Math.max(0, ca);
				const f = (Math.sin(a * 5 - t * 3.4 + this.mySpin) + 0.6 * Math.sin(a * 9 + t * 5.1) + 0.5 * Math.sin(a * 3 + t * 2.2)) / 2.1;
				let len = R * (0.09 + 0.16 * (0.5 + 0.5 * f)) * (1 + 0.55 * p) * (1 + 1.5 * w * back * back) * (1 - 0.5 * w * front);
				len = Math.max(0, len);
				const r = this.reach(len, R);
				const x = ca * r - w * len * 0.4 * (1 - back);
				const y = Math.sin(a) * r;
				if (j === 0) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			}
			ctx.closePath();
		});
	}

	/** B: a ring and eight soft rays, long and short in turn, each swaying a little. */
	private emblem(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		const t = this.time;
		const w = this.mySweep;
		const N = 8;
		this.paint(ctx, R, p, () => {
			ctx.beginPath();
			ctx.arc(0, 0, R * 1.08, 0, TAU);
			ctx.closePath();
			for (let i = 0; i < N; i += 1) {
				const a = this.mySpin + (i / N) * TAU;
				const ca = Math.cos(a);
				const sa = Math.sin(a);
				const back = Math.max(0, -ca);
				const front = Math.max(0, ca);
				const longRay = i % 2 === 0;
				let len = R * (longRay ? 0.34 : 0.17) * (0.94 + 0.06 * Math.sin(t * 4 + i)) * (1 + 0.5 * p) * (1 + 1.2 * w * back * back) * (1 - 0.5 * w * front);
				len = Math.max(R * 0.05, len);
				const tipR = this.reach(len, R) + R * 0.06;
				const half = (TAU / N) * 0.3;
				const base = R * 1.06;
				const sway = Math.sin(t * 3 + i * 1.7) * 0.18;
				const tx = ca * tipR - w * len * 0.4 * (1 - back);
				const ty = sa * tipR;
				const nx = -sa;
				const ny = ca;
				const b0 = [Math.cos(a - half) * base, Math.sin(a - half) * base] as const;
				const b1 = [Math.cos(a + half) * base, Math.sin(a + half) * base] as const;
				const o = R * (0.09 + sway * 0.1);
				ctx.moveTo(b0[0], b0[1]);
				ctx.bezierCurveTo(b0[0] + (tx - b0[0]) * 0.35 + nx * o, b0[1] + (ty - b0[1]) * 0.35 + ny * o, tx + (b0[0] - tx) * 0.3 - nx * o, ty + (b0[1] - ty) * 0.3 - ny * o, tx, ty);
				ctx.bezierCurveTo(tx + (b1[0] - tx) * 0.3 - nx * o, ty + (b1[1] - ty) * 0.3 - ny * o, b1[0] + (tx - b1[0]) * 0.35 + nx * o, b1[1] + (ty - b1[1]) * 0.35 + ny * o, b1[0], b1[1]);
				ctx.closePath();
			}
		});
	}

	/** C: seven curved tongues, each bent the way the corona turns, rooted in a ring. */
	private pinwheel(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		const w = this.mySweep;
		const t = this.time;
		const N = 7;
		this.paint(ctx, R, p, () => {
			ctx.beginPath();
			ctx.arc(0, 0, R * 1.06, 0, TAU);
			ctx.closePath();
			for (let i = 0; i < N; i += 1) {
				const a = this.mySpin + (i / N) * TAU;
				const ca = Math.cos(a);
				const back = Math.max(0, -ca);
				const front = Math.max(0, ca);
				let len = R * 0.4 * (0.94 + 0.06 * Math.sin(t * 4 + i * 1.3)) * (1 + 0.5 * p) * (1 + 1.1 * w * back * back) * (1 - 0.5 * w * front);
				len = Math.max(R * 0.06, len);
				const tipR = this.reach(len, R) + R * 0.05;
				const curl = 0.62 + 0.1 * Math.sin(t * 3 + i);
				const half = (TAU / N) * 0.46;
				const base = R * 1.05;
				const at = (ang: number, r: number) => [Math.cos(ang) * r, Math.sin(ang) * r] as const;
				const b0 = at(a - half, base);
				const tip = at(a + curl, tipR);
				const c0 = at(a - half * 0.2 + curl * 0.2, base + (tipR - base) * 0.55);
				const c1 = at(a + half * 0.9 + curl * 0.55, base + (tipR - base) * 0.35);
				const b1 = at(a + half, base);
				ctx.moveTo(b0[0], b0[1]);
				ctx.quadraticCurveTo(c0[0], c0[1], tip[0], tip[1]);
				ctx.quadraticCurveTo(c1[0], c1[1], b1[0], b1[1]);
				ctx.closePath();
			}
		});
	}

	/** Thin plasma filaments leaving the corona's back while he runs: they tie it to the trail. */
	private filaments(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		const w = this.mySweep;
		if (w < 0.05) return;
		const t = this.time;
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.lineCap = 'round';
		for (let i = 0; i < 5; i += 1) {
			const a = Math.PI + (i - 2) * 0.34;
			const len = R * (0.9 + 0.7 * ((i * 37) % 10) / 10) * w * (1 + 0.5 * p);
			const x0 = Math.cos(a) * R * 1.12;
			const y0 = Math.sin(a) * R * 1.12;
			const sway = Math.sin(t * 5 + i * 2) * R * 0.18;
			const g = ctx.createLinearGradient(x0, y0, x0 - len, y0);
			g.addColorStop(0, 'rgba(255,214,120,.55)');
			g.addColorStop(1, 'rgba(255,120,40,0)');
			ctx.strokeStyle = g;
			ctx.lineWidth = R * 0.07;
			ctx.beginPath();
			ctx.moveTo(x0, y0);
			ctx.quadraticCurveTo(x0 - len * 0.5, y0 + sway, x0 - len, y0 + sway * 0.4);
			ctx.stroke();
		}
		ctx.restore();
	}

	// --------------------------------------------------------------- the solar-wind trail

	protected particleFor(moment: 'trail' | 'burst' | 'death'): ParticleKind {
		return moment === 'trail' ? 'ember' : super.particleFor(moment);
	}
	protected sizeFor(kind: ParticleKind): number {
		return kind === 'ember' ? 2.3 : super.sizeFor(kind);
	}
	protected liftFor(kind: ParticleKind): number {
		return kind === 'ember' ? 0 : super.liftFor(kind);
	}
	protected swirlFor(kind: ParticleKind): number {
		return kind === 'ember' ? 0 : super.swirlFor(kind);
	}
	protected drawParticle(ctx: CanvasRenderingContext2D, e: Particle, a: number, s: number): void {
		if (e.kind === 'ember') solarMote(ctx, e, a, s);
		else super.drawParticle(ctx, e, a, s);
	}
}

const STOPS: ReadonlyArray<readonly [number, RGB]> = [
	[1, [255, 228, 150]],
	[0.7, [255, 188, 78]],
	[0.4, [255, 128, 40]],
	[0.18, [208, 64, 26]],
	[0, [96, 28, 14]]
];
function heat(u: number): RGB {
	for (let i = 1; i < STOPS.length; i += 1) {
		if (u >= STOPS[i][0]) {
			const [u1, c1] = STOPS[i - 1];
			const [u0, c0] = STOPS[i];
			return mix(c0, c1, (u - u0) / (u1 - u0));
		}
	}
	return STOPS[STOPS.length - 1][1];
}

/** One mote of the solar wind: it cools as it ages and leaves a short tail along its way. */
function solarMote(ctx: CanvasRenderingContext2D, e: Particle, a: number, s: number): void {
	const u = e.life / e.max;
	const col = heat(u);
	const r = s * (0.35 + 0.55 * u);
	ctx.save();
	ctx.globalCompositeOperation = 'lighter';
	const sp = Math.hypot(e.vx, e.vy);
	if (sp > r * 4) {
		const tail = Math.min(r * 5, sp * 0.1);
		ctx.strokeStyle = css(col, 0.55 * a);
		ctx.lineWidth = r * 0.7;
		ctx.lineCap = 'round';
		ctx.beginPath();
		ctx.moveTo(e.x, e.y);
		ctx.lineTo(e.x - (e.vx / sp) * tail, e.y - (e.vy / sp) * tail);
		ctx.stroke();
	}
	ctx.globalAlpha = a * 0.7;
	ctx.drawImage(glow(col), e.x - r * 2.4, e.y - r * 2.4, r * 4.8, r * 4.8);
	ctx.globalAlpha = a;
	ctx.fillStyle = css(heat(Math.min(1, u + 0.12)));
	ctx.beginPath();
	ctx.arc(e.x, e.y, r * 0.6, 0, TAU);
	ctx.fill();
	ctx.restore();
}

// ------------------------------------------------------------------- Ms. Pac-Man's details

const MS_INK = 'rgba(44,34,66,.9)';

/** A: a beauty mark on the lower cheek, a pearl stud on the back rim at the ear. */
export const msClassic: OverPainter = (ctx, R, cut) => {
	ctx.save();
	cut.outline(ctx);
	ctx.clip();
	ctx.fillStyle = MS_INK;
	ctx.beginPath();
	ctx.arc(R * 0.3, R * 0.3, R * 0.06, 0, TAU);
	ctx.fill();
	ctx.fillStyle = 'rgba(255,255,255,.9)';
	ctx.beginPath();
	ctx.arc(R * 0.285, R * 0.28, R * 0.018, 0, TAU);
	ctx.fill();
	ctx.restore();
	// the stud sits on the rim at the back (the ear), with a small gold drop under it
	const ex = -R * 0.97;
	const ey = R * 0.12;
	ctx.strokeStyle = '#d9b46a';
	ctx.lineWidth = Math.max(1, R * 0.05);
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.moveTo(ex, ey);
	ctx.lineTo(ex - R * 0.02, ey + R * 0.2);
	ctx.stroke();
	for (const [rr, col] of [
		[R * 0.115, MS_INK],
		[R * 0.09, '#f4f6ff']
	] as const) {
		ctx.fillStyle = col;
		ctx.beginPath();
		ctx.arc(ex - R * 0.02, ey + R * 0.28, rr, 0, TAU);
		ctx.fill();
	}
	ctx.fillStyle = 'rgba(255,255,255,1)';
	ctx.beginPath();
	ctx.arc(ex - R * 0.05, ey + R * 0.25, R * 0.03, 0, TAU);
	ctx.fill();
};

/** B: a lock of hair curling off the back of her head, a pink sparkle above the eye. */
export const msGlam: OverPainter = (ctx, R, cut) => {
	ctx.save();
	const cx = -R * 0.98;
	const cy = -R * 0.5;
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	for (const [lw, col] of [
		[R * 0.14, MS_INK],
		[R * 0.08, '#7a52c4']
	] as const) {
		ctx.strokeStyle = col;
		ctx.lineWidth = lw;
		ctx.beginPath();
		for (let i = 0; i <= 26; i += 1) {
			const a = 0.6 + i * 0.4;
			const r = R * (0.15 - 0.005 * i);
			const x = cx + Math.cos(a) * r - i * R * 0.004;
			const y = cy + Math.sin(a) * r + i * R * 0.012;
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.stroke();
	}
	ctx.restore();
	// a four-point sparkle in pink with an ink edge, so it reads on her white
	const k = 0.8 + 0.2 * Math.sin(cut.time * 2.1);
	const tx = R * 0.68;
	const ty = -R * 0.62;
	ctx.save();
	ctx.beginPath();
	for (let i = 0; i < 8; i += 1) {
		const a = (i / 8) * TAU - Math.PI / 2;
		const r = i % 2 === 0 ? R * 0.17 * k : R * 0.04;
		ctx.lineTo(tx + Math.cos(a) * r, ty + Math.sin(a) * r);
	}
	ctx.closePath();
	ctx.lineJoin = 'round';
	ctx.strokeStyle = MS_INK;
	ctx.lineWidth = Math.max(1, R * 0.045);
	ctx.stroke();
	ctx.fillStyle = '#ff7fb6';
	ctx.fill();
	ctx.restore();
};
