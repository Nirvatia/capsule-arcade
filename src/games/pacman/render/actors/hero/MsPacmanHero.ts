// Ms. Pac-Man: a pearl-white star. A cool shaded sphere with sparse glints, a raspberry bow and
// a single curved lash mark. Her rage is a pearl orbit, her teleport a continuous pearl spiral,
// and her trail, bursts and death shed matching stars. The shared Hero keeps all movement,
// mouth, bite, spring, power, ball and death mechanics.
import type { HeroDesign, MouthInside, Palette, Particle, ParticleKind } from './Hero';
import { Hero, Spring, css, glow } from './Hero';
import type { RGB } from './heroSeasons';
import { drawStarGlint, particleLift, particleSize, particleSwirl, starPath } from './heroFx';

const TAU = Math.PI * 2;
const INK: RGB = [44, 34, 66];
const BLUSH: RGB = [225, 92, 145];

const CALM: Palette = {
	light: [255, 255, 255],
	mid: [240, 245, 255],
	shadow: [190, 204, 232],
	deep: [91, 104, 150],
	bounce: [255, 215, 235],
	ink: INK,
	highlight: [255, 255, 255],
	rim: [225, 238, 255]
};
const AWOKEN: Palette = {
	light: [255, 255, 255],
	mid: [255, 246, 255],
	shadow: [211, 190, 240],
	deep: [108, 76, 156],
	bounce: [255, 180, 220],
	ink: INK,
	highlight: [255, 255, 255],
	rim: [255, 225, 248]
};
const INSIDE: MouthInside = {
	mid: [91, 65, 135],
	deep: [36, 26, 62]
};

export const BOW_ANGLE = -0.63 * Math.PI;
export const BOW_DISTANCE = 0.95;
export const BOW_SCALE = 0.75;

export function drawPearlBow(ctx: CanvasRenderingContext2D, R: number, t: number, p: number): void {
	ctx.save();
	ctx.save();
	ctx.globalCompositeOperation = 'lighter';
	ctx.globalAlpha = 0.18 + 0.28 * p;
	const g = R * (0.85 + 0.25 * p);
	ctx.drawImage(glow([255, 105, 170]), -g, -g, g * 2, g * 2);
	ctx.restore();
	ctx.scale(BOW_SCALE * (1 + 0.08 * p), BOW_SCALE * (1 + 0.08 * p));
	ctx.translate(0, -R * 0.08);
	const lobe = (side: number) => {
		ctx.moveTo(0, 0);
		ctx.quadraticCurveTo(side * R * 0.32, -R * 0.54, side * R * 0.82, -R * 0.5);
		ctx.quadraticCurveTo(side * R * 1.12, -R * 0.05, side * R * 0.84, R * 0.36);
		ctx.quadraticCurveTo(side * R * 0.34, R * 0.34, 0, 0);
		ctx.closePath();
	};
	ctx.lineJoin = 'round';
	ctx.beginPath();
	lobe(-1);
	lobe(1);
	ctx.strokeStyle = css(INK);
	ctx.lineWidth = R * 0.11;
	ctx.stroke();
	for (const side of [-1, 1]) {
		const fill = ctx.createLinearGradient(0, -R * 0.55, 0, R * 0.4);
		fill.addColorStop(0, '#ff9abc');
		fill.addColorStop(0.38, '#f34c83');
		fill.addColorStop(1, '#b71954');
		ctx.fillStyle = fill;
		ctx.beginPath();
		lobe(side);
		ctx.fill();
		ctx.strokeStyle = 'rgba(255,225,238,.72)';
		ctx.lineWidth = R * 0.045;
		ctx.lineCap = 'round';
		ctx.beginPath();
		ctx.moveTo(side * R * 0.2, -R * 0.12);
		ctx.quadraticCurveTo(side * R * 0.48, -R * 0.4, side * R * 0.72, -R * 0.32);
		ctx.stroke();
	}
	const twinkle = 0.92 + 0.08 * Math.sin(t * 5);
	ctx.fillStyle = '#fffaff';
	ctx.strokeStyle = css(INK);
	ctx.lineWidth = R * 0.04;
	starPath(ctx, 0, 0, R * 0.36 * twinkle, R * 0.15, -Math.PI / 2);
	ctx.fill();
	ctx.stroke();
	ctx.restore();
}

export const MS_DESIGN: HeroDesign = {
	id: 'ms-pacman-pearl-star',
	calm: CALM,
	awoken: AWOKEN,
	hinge: 0.08,
	inside: INSIDE,
	mouthSpan: 0.7,
	grinRest: 0.1,
	grinRun: 0.04,
	chompRate: 4.8,
	flare: [235, 242, 255],
	death: 'spin',
	bands: [0.1, 0.3, 0.64]
};

export class MsPacmanHero extends Hero {
	protected readonly design: HeroDesign = MS_DESIGN;
	private readonly bow = new Spring(0);
	private blink = -1;
	private nextBlink = 1.8;
	private blinks = 0;
	private squint = 0;
	private orbit = 0;

	protected resetLooks(): void {
		this.bow.value = 0;
		this.bow.velocity = 0;
		this.orbit = 0;
	}

	protected onBite(): void {
		this.bow.velocity += 3.2;
		this.squint = 1;
	}

	protected onTurn(): void {
		this.bow.velocity += this.random() < 0.5 ? 4.5 : -4.5;
	}

	protected afterUpdate(dt: number): void {
		this.orbit += dt * (0.35 + 1.8 * this.power);
		this.bow.step(0.07 * Math.sin(this.time * 2.1), dt, 90, 7);
		this.squint = Math.max(0, this.squint - dt / 0.35);
		if (this.blink >= 0) {
			this.blink += dt;
			if (this.blink > 0.14) this.blink = -1;
		} else if (this.time > this.nextBlink) {
			this.blink = 0;
			this.blinks += 1;
			this.nextBlink = this.time + (this.blinks % 4 === 0 ? 0.3 : 2.2 + (this.blinks % 3) * 1.1);
		}
	}

	protected drawAura(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.globalAlpha = 0.2 + 0.24 * p;
		const g = R * (1.8 + 0.45 * p);
		ctx.drawImage(glow([190, 215, 255]), -g, -g, g * 2, g * 2);
		ctx.restore();
	}

	private starRing(ctx: CanvasRenderingContext2D, R: number, k: number, back: boolean): void {
		if (k < 0.01) return;
		ctx.save();
		ctx.rotate(-0.25);
		const from = back ? Math.PI : 0;
		const arc = () => {
			ctx.beginPath();
			ctx.ellipse(0, 0, R * 1.42, R * 0.38, 0, from, from + Math.PI);
		};
		ctx.lineCap = 'round';
		ctx.globalCompositeOperation = 'lighter';
		arc();
		ctx.strokeStyle = `rgba(255,120,185,${0.34 * k})`;
		ctx.lineWidth = R * 0.2;
		ctx.stroke();
		arc();
		ctx.strokeStyle = `rgba(175,215,255,${0.55 * k})`;
		ctx.lineWidth = R * 0.09;
		ctx.stroke();
		arc();
		ctx.strokeStyle = `rgba(255,255,255,${0.95 * k})`;
		ctx.lineWidth = R * 0.035;
		ctx.stroke();
		ctx.globalCompositeOperation = 'source-over';
		for (let i = 0; i < 6; i++) {
			const a = this.time * 2.2 + (i / 6) * TAU;
			if (back ? Math.sin(a) > 0 : Math.sin(a) < 0) continue;
			const x = Math.cos(a) * R * 1.42;
			const y = Math.sin(a) * R * 0.38;
			ctx.fillStyle = i % 2 ? '#ffd7e9' : '#ffffff';
			starPath(ctx, x, y, R * 0.12, R * 0.035, a);
			ctx.fill();
		}
		ctx.restore();
	}

	protected drawBehind(ctx: CanvasRenderingContext2D, R: number, k: number): void {
		this.starRing(ctx, R, k, true);
		ctx.save();
		for (let i = 0; i < 8; i++) {
			const a = this.orbit + (i / 8) * TAU;
			const pulse = 0.5 + 0.5 * Math.sin(this.time * 4 + i);
			ctx.globalAlpha = k * (0.35 + 0.65 * pulse);
			ctx.fillStyle = i % 3 === 0 ? '#ffd0e5' : '#f8fcff';
			starPath(
				ctx,
				Math.cos(a) * R * 1.85,
				Math.sin(a) * R * 1.15,
				R * (0.09 + 0.05 * pulse),
				R * 0.025,
				a
			);
			ctx.fill();
		}
		ctx.restore();
	}

	protected decorate(sc: CanvasRenderingContext2D, R: number, p: number): void {
		const base = sc.createRadialGradient(-R * 0.28, -R * 0.32, 0, 0, 0, R * 1.08);
		base.addColorStop(0, '#ffffff');
		base.addColorStop(0.45, p > 0.4 ? '#fff7fd' : '#fafcff');
		base.addColorStop(0.78, p > 0.4 ? '#eadcf5' : '#e4ebf7');
		base.addColorStop(1, p > 0.4 ? '#c2a8d9' : '#b7c6df');
		sc.fillStyle = base;
		sc.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);

		const sheen = sc.createRadialGradient(-R * 0.38, -R * 0.42, 0, -R * 0.38, -R * 0.42, R * 0.62);
		sheen.addColorStop(0, 'rgba(255,255,255,.9)');
		sheen.addColorStop(1, 'rgba(255,255,255,0)');
		sc.fillStyle = sheen;
		sc.fillRect(-R * 1.1, -R * 1.1, R * 2.2, R * 2.2);

		const stars: ReadonlyArray<readonly [number, number, number]> = [
			[-0.43, -0.2, 0.12],
			[-0.3, 0.36, 0.08],
			[0.28, 0.42, 0.055]
		];
		for (const [x, y, size] of stars) {
			const twinkle = 0.45 + 0.35 * Math.sin(this.time * 2.4 + x * 9);
			sc.fillStyle = `rgba(255,255,255,${0.55 + 0.35 * twinkle})`;
			sc.strokeStyle = `rgba(112,139,181,${0.22 + 0.18 * twinkle})`;
			sc.lineWidth = R * 0.015;
			starPath(sc, x * R, y * R, size * R * (0.85 + 0.25 * twinkle), size * R * 0.22);
			sc.fill();
			sc.stroke();
		}

		const limb = sc.createRadialGradient(0, 0, R * 0.68, 0, 0, R);
		limb.addColorStop(0, 'rgba(150,175,225,0)');
		limb.addColorStop(0.78, `rgba(145,170,220,${0.12 + 0.12 * p})`);
		limb.addColorStop(1, `rgba(225,235,255,${0.72 + 0.2 * p})`);
		sc.fillStyle = limb;
		sc.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);
	}

	protected paintBallPattern(ctx: CanvasRenderingContext2D, R: number): void {
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		const spiral = () => {
			ctx.beginPath();
			for (let i = 0; i <= 64; i++) {
				const s = i / 64;
				const r = R * (0.06 + 0.82 * s);
				const a = -1.1 + s * Math.PI * 2.7;
				const x = Math.cos(a) * r;
				const y = Math.sin(a) * r;
				if (i === 0) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			}
		};
		spiral();
		ctx.strokeStyle = 'rgba(80,100,145,.32)';
		ctx.lineWidth = R * 0.2;
		ctx.stroke();
		spiral();
		ctx.strokeStyle = '#f8fcff';
		ctx.lineWidth = R * 0.105;
		ctx.stroke();
		ctx.fillStyle = '#ffffff';
		starPath(ctx, 0, 0, R * 0.18, R * 0.055);
		ctx.fill();
	}

	protected paintBallOrbit(ctx: CanvasRenderingContext2D, R: number): void {
		for (let i = 0; i < 5; i++) {
			const a = this.time * 4 + (i / 5) * TAU;
			ctx.fillStyle = i === 0 ? '#ff9cc3' : '#ffffff';
			ctx.strokeStyle = css(INK, 0.65);
			ctx.lineWidth = R * 0.025;
			starPath(ctx, Math.cos(a) * R * 1.3, Math.sin(a) * R * 1.3, R * 0.17, R * 0.05, a);
			ctx.fill();
			ctx.stroke();
		}
	}

	protected drawLashes(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		const lod = R < 20 ? 1.55 : 1;
		const ex = R * 0.27;
		const ey = -R * (0.45 + (lod - 1) * 0.1);
		const rx = R * 0.18 * lod;
		const ry = R * 0.22 * lod;
		const blink = this.blink >= 0 ? Math.sin((this.blink / 0.14) * Math.PI) : 0;
		const happy = Math.max(this.squint, p * 0.25);
		const curve = this.dying >= 0 ? -ry * 0.2 : ry * (0.7 + 0.35 * happy) * (1 - blink * 0.85);
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';

		ctx.strokeStyle = css(BLUSH, 0.75);
		ctx.lineWidth = Math.max(0.8, R * 0.027);
		ctx.beginPath();
		for (let i = -1; i <= 1; i++) {
			const x = ex - R * 0.24 + i * R * 0.055;
			const y = ey + R * 0.29;
			ctx.moveTo(x - R * 0.025, y + R * 0.035);
			ctx.lineTo(x + R * 0.025, y - R * 0.035);
		}
		ctx.stroke();

		ctx.strokeStyle = css(INK);
		ctx.lineWidth = Math.max(1.1, R * 0.065);
		ctx.beginPath();
		ctx.moveTo(ex - rx, ey);
		ctx.quadraticCurveTo(ex, ey - curve, ex + rx, ey);
		ctx.quadraticCurveTo(ex + rx * 1.35, ey - ry * 0.08, ex + rx * 1.65, ey - ry * 0.35);
		ctx.stroke();
	}

	protected drawLips(
		ctx: CanvasRenderingContext2D,
		lips: () => void,
		R: number,
		pal: Palette,
		ends: { A: { x: number; y: number }; U: { x: number; y: number }; Dn: { x: number; y: number } }
	): void {
		ctx.strokeStyle = css(pal.ink);
		ctx.lineWidth = R * 0.05;
		lips();
		ctx.stroke();
		if (ends.U.y < -R * 0.3) {
			const fx = ends.A.x + (ends.U.x - ends.A.x) * 0.66;
			const fy = ends.A.y + (ends.U.y - ends.A.y) * 0.66;
			ctx.fillStyle = 'rgba(255,255,255,1)';
			ctx.strokeStyle = css(INK, 0.9);
			ctx.lineWidth = R * 0.02;
			ctx.beginPath();
			ctx.moveTo(fx - R * 0.035, fy + R * 0.01);
			ctx.lineTo(fx + R * 0.035, fy + R * 0.03);
			ctx.lineTo(fx + R * 0.005, fy + R * 0.1);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();
		}
	}

	protected drawWorn(
		ctx: CanvasRenderingContext2D,
		R: number,
		p: number,
		lx: number,
		ly: number
	): void {
		this.starRing(ctx, R, p, false);
		ctx.save();
		ctx.translate(Math.cos(BOW_ANGLE) * R * BOW_DISTANCE, Math.sin(BOW_ANGLE) * R * BOW_DISTANCE);
		ctx.rotate(BOW_ANGLE + Math.PI / 2 + this.bow.value);
		drawPearlBow(ctx, R, this.time, p);
		ctx.restore();
		this.drawLashes(ctx, R, p);
		drawStarGlint(ctx, R, p, lx, ly);
	}

	protected particleFor(moment: 'trail' | 'burst' | 'death'): ParticleKind {
		if (moment === 'death') return 'star';
		if (moment === 'trail') return this.powerOn && !this.ball ? 'ember' : 'star';
		return this.random() < 0.35 ? 'heart' : 'star';
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
		ctx.save();
		ctx.translate(e.x, e.y);
		ctx.globalAlpha = a;
		if (e.kind === 'heart') {
			const h = s * 1.5;
			ctx.fillStyle = '#ff78ab';
			ctx.strokeStyle = css(INK, 0.8);
			ctx.lineWidth = Math.max(0.8, h * 0.14);
			ctx.beginPath();
			ctx.moveTo(0, h * 0.9);
			ctx.bezierCurveTo(-h * 1.3, h * 0.1, -h * 0.9, -h * 1.1, 0, -h * 0.4);
			ctx.bezierCurveTo(h * 0.9, -h * 1.1, h * 1.3, h * 0.1, 0, h * 0.9);
			ctx.fill();
			ctx.stroke();
			ctx.restore();
			return;
		}
		ctx.globalCompositeOperation = 'lighter';
		ctx.globalAlpha = a * 0.38;
		const g = s * 1.7;
		ctx.drawImage(
			glow(e.kind === 'ember' ? [255, 135, 190] : [180, 215, 255]),
			-g,
			-g,
			g * 2,
			g * 2
		);
		ctx.globalAlpha = a;
		if (e.kind === 'ember') {
			ctx.strokeStyle = '#ff9fc7';
			ctx.lineWidth = Math.max(1, s * 0.28);
			ctx.lineCap = 'round';
			ctx.beginPath();
			ctx.moveTo(-e.vx * 0.045, -e.vy * 0.045);
			ctx.lineTo(0, 0);
			ctx.stroke();
		}
		ctx.rotate(e.spin * (e.max - e.life));
		ctx.fillStyle = e.kind === 'ember' ? '#fff3fa' : '#ffffff';
		starPath(ctx, 0, 0, s * 1.6, s * 0.3);
		ctx.fill();
		ctx.restore();
	}
}
