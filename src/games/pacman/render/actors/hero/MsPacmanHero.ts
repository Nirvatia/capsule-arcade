// Ms. Pac-Man, the heroine: a galaxy (the owner's pick of the `elements` prototype, variant 2).
// A sphere of deep space with a tilted spiral galaxy turning inside, stars twinkling, an
// atmosphere glowing at her limb and a pale cloud round her eye (so the ink of the lashes reads);
// her bow a bipolar nebula (two glowing lobes, a star at the knot) on a spring, no lipstick (the
// owner's calls: the bow a quarter smaller than her old one, the lips bare). Her eye is the
// anime one (a gradient iris, an ink wing on the lid, lashes, a brow; it blinks and squints),
// with blush on the cheek and a little fang. The rage (her overdrive) pulls the sky in: the
// galaxy spins up and flares, an accretion ring of light circles her and stars spiral into her.
// Stars for a trail. The machinery (mouth, acting, bites, spring, the energizer's beat, the
// ball, the death) is the shared Hero; the body's paint is hers.
import type { HeroDesign, MouthInside, Palette, Particle, ParticleKind } from './Hero';
import { Hero, Spring, css, glow } from './Hero';
import type { RGB } from './heroSeasons';
import {
	drawEmberGlow,
	drawFlameDrop,
	drawStarGlint,
	particleLift,
	particleSwirl,
	particleSize,
	starPath
} from './heroFx';

const TAU = Math.PI * 2;

/** Under her own paint (only the ball and the flash show it); the ink is her outline. */
const CALM: Palette = {
	light: [120, 80, 210],
	mid: [70, 40, 150],
	shadow: [40, 20, 100],
	deep: [20, 10, 50],
	bounce: [130, 60, 200],
	ink: [22, 6, 44],
	highlight: [255, 255, 255],
	rim: [180, 200, 255]
};
const AWOKEN: Palette = {
	light: [200, 150, 255],
	mid: [150, 90, 230],
	shadow: [96, 50, 180],
	deep: [40, 20, 90],
	bounce: [220, 110, 230],
	ink: [22, 6, 44],
	highlight: [255, 255, 255],
	rim: [255, 220, 255]
};

const INSIDE: MouthInside = {
	mid: [40, 12, 70],
	deep: [16, 4, 34]
};

const INK: RGB = [22, 6, 44];
const BLUSH: RGB = [240, 100, 180];

/** Her bow: on top of the head, a little behind, on the head's outline. */
export const BOW_ANGLE = -0.63 * Math.PI;
export const BOW_DISTANCE = 0.95;
/** The nebula bow's size against the head (her old bow was 1: the owner, a quarter smaller). */
export const BOW_SCALE = 0.75;

/** The galaxy's arms: the broad glow, the bright lane in it. */
const ARMS: ReadonlyArray<readonly [string, string]> = [
	['255,110,214', '255,206,246'],
	['110,160,255', '196,226,255']
];

/** The galaxy's turn, radians per second, calm and in the rage. */
const TURN = 0.45;
const TURN_RAGE = 2.6;

/**
 * Her bow, a bipolar nebula, at its knot (0, 0) with its wings along x and its outside to -y,
 * `R` her head's radius: two lobes of glowing gas (pink and blue-violet) under one ink line,
 * filaments drifting in them, a star at the knot. `p` the glow of the rage, 0..1.
 */
export function drawNebulaBow(
	ctx: CanvasRenderingContext2D,
	R: number,
	t: number,
	p: number
): void {
	ctx.save();
	ctx.save();
	ctx.globalCompositeOperation = 'lighter';
	ctx.globalAlpha = 0.45 + 0.35 * p;
	const g = R * (0.9 + 0.3 * p);
	ctx.drawImage(glow([230, 140, 255]), -g, -g, g * 2, g * 2);
	ctx.restore();
	const k = BOW_SCALE * (1 + 0.1 * p);
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
		const fill = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.02);
		fill.addColorStop(0, 'rgb(255,238,252)');
		fill.addColorStop(0.3 + 0.1 * p, 'rgb(255,142,226)');
		fill.addColorStop(0.72, s < 0 ? 'rgb(182,78,236)' : 'rgb(116,118,252)');
		fill.addColorStop(1, 'rgb(76,48,186)');
		ctx.fillStyle = fill;
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

export const MS_DESIGN: HeroDesign = {
	id: 'ms-pacman-galaxy',
	calm: CALM,
	awoken: AWOKEN,
	hinge: 0.08,
	inside: INSIDE,
	// a wide mouth like his, a little less: fully open about 80 degrees
	mouthSpan: 0.7,
	grinRest: 0.1,
	grinRun: 0.04,
	chompRate: 4.8,
	flare: [240, 200, 255],
	death: 'spin',
	// the rage never enlarges her (the owner's pick)
	bands: [0.1, 0.3, 0.64]
};

/** The accretion ring of the rage: radii (body radii) and its tilt in her frame. */
const RING = { rx: 1.5, ry: 0.42, tilt: -0.3 };

export class MsPacmanHero extends Hero {
	protected readonly design: HeroDesign = MS_DESIGN;
	/** The bow's sway, radians, on a soft spring. */
	private readonly bow = new Spring(0);
	/** Seconds into a blink, or -1; the next blink is due at `nextBlink`. */
	private blink = -1;
	private nextBlink = 1.8;
	private blinks = 0;
	/** A happy squint after a bite, 1 → 0. */
	private squint = 0;
	/** The galaxy's turn, radians (it speeds up in the rage). */
	private turn = 0;

	protected resetLooks(): void {
		this.bow.value = 0;
		this.bow.velocity = 0;
		this.turn = 0;
	}

	protected onBite(): void {
		this.bow.velocity += 3.2;
		this.squint = 1;
	}

	protected onTurn(): void {
		this.bow.velocity += this.random() < 0.5 ? 4.5 : -4.5;
	}

	protected afterUpdate(dt: number): void {
		this.turn += dt * (TURN + (TURN_RAGE - TURN) * this.power);
		this.bow.step(0.07 * Math.sin(this.time * 2.1), dt, 90, 7);
		this.squint = Math.max(0, this.squint - dt / 0.35);
		if (this.blink >= 0) {
			this.blink += dt;
			if (this.blink > 0.14) this.blink = -1;
		} else if (this.time > this.nextBlink) {
			this.blink = 0;
			this.blinks += 1;
			// irregular, like a living thing; now and then a double blink
			this.nextBlink = this.time + (this.blinks % 4 === 0 ? 0.3 : 2.2 + (this.blinks % 3) * 1.1);
		}
	}

	/** A violet glow round her, brighter in the rage. */
	protected drawAura(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.globalAlpha = 0.3 + 0.2 * p;
		const g = R * (2 + 0.5 * p);
		ctx.drawImage(glow([170, 100, 255]), -g, -g, g * 2, g * 2);
		ctx.restore();
	}

	/**
	 * The rage behind her (`k` its look times the end-of-power pulse): the accretion ring's far
	 * half, and stars spiralling in from the sky round her.
	 */
	protected drawBehind(ctx: CanvasRenderingContext2D, R: number, k: number): void {
		const t = this.time;
		this.ring(ctx, R, k, true);
		ctx.save();
		for (let i = 0; i < 9; i++) {
			const f = (t * 0.7 + i / 9) % 1;
			const r = R * (2.4 - 1.4 * f);
			const a = (i / 9) * TAU + f * 2.6 - this.turn * 0.3;
			const x = Math.cos(a) * r;
			const y = Math.sin(a) * r;
			ctx.globalAlpha = k * Math.sin(Math.PI * f);
			ctx.fillStyle = i % 3 === 0 ? 'rgb(255,190,240)' : 'rgb(255,255,255)';
			starPath(ctx, x, y, R * (0.16 + 0.08 * (1 - f)), R * 0.04, a);
			ctx.fill();
		}
		ctx.restore();
	}

	/** One half of the accretion ring (`back`: the far one, behind her), with stars on it. */
	private ring(ctx: CanvasRenderingContext2D, R: number, k: number, back: boolean): void {
		if (k < 0.01) return;
		const t = this.time;
		ctx.save();
		ctx.rotate(RING.tilt);
		const from = back ? Math.PI : 0;
		const arc = () => {
			ctx.beginPath();
			ctx.ellipse(0, 0, R * RING.rx, R * RING.ry, 0, from, from + Math.PI);
		};
		ctx.lineCap = 'round';
		ctx.globalCompositeOperation = 'lighter';
		arc();
		ctx.strokeStyle = `rgba(255,120,220,${0.45 * k})`;
		ctx.lineWidth = R * 0.26;
		ctx.stroke();
		arc();
		ctx.strokeStyle = `rgba(160,190,255,${0.5 * k})`;
		ctx.lineWidth = R * 0.12;
		ctx.stroke();
		arc();
		ctx.strokeStyle = `rgba(255,246,255,${0.95 * k})`;
		ctx.lineWidth = R * 0.05;
		ctx.stroke();
		ctx.globalCompositeOperation = 'source-over';
		// motes running round the ring
		for (let i = 0; i < 8; i++) {
			const a = t * 3 + (i / 8) * TAU;
			const s = Math.sin(a);
			if (back ? s > 0 : s < 0) continue;
			ctx.globalAlpha = k;
			ctx.fillStyle = '#fff';
			ctx.beginPath();
			ctx.arc(Math.cos(a) * R * RING.rx, s * R * RING.ry, R * 0.06, 0, TAU);
			ctx.fill();
		}
		ctx.restore();
	}

	/**
	 * Deep space, a spiral galaxy turning in it (faster and brighter in the rage), stars, a cloud
	 * round the eye, a glowing limb.
	 */
	protected decorate(sc: CanvasRenderingContext2D, R: number, p: number): void {
		const t = this.time;
		// a luminous galaxy (the owner: she was too dark, the eye barely read)
		const base = sc.createRadialGradient(-R * 0.1, R * 0.05, 0, -R * 0.1, R * 0.05, R * 1.05);
		base.addColorStop(0, css([152, 98, 238]));
		base.addColorStop(0.55, css([98, 56, 192]));
		base.addColorStop(1, css([60, 32, 130]));
		sc.fillStyle = base;
		sc.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);
		// the galaxy: tilted, flattened, turning; each arm a stroke that thins outwards
		const gx = -R * 0.2;
		const gy = R * 0.14;
		const tilt = -0.35;
		const ct = Math.cos(tilt);
		const st = Math.sin(tilt);
		const at = (a: number, r: number): [number, number] => {
			const x = Math.cos(a) * r;
			const y = Math.sin(a) * r * 0.55;
			return [gx + x * ct - y * st, gy + x * st + y * ct];
		};
		const bright = 1.35 + 0.6 * p;
		sc.lineCap = 'round';
		ARMS.forEach(([broad, lane], arm) => {
			const steps = 22;
			for (let pass = 0; pass < 2; pass++) {
				for (let i = 0; i < steps; i++) {
					const s0 = i / steps;
					const s1 = (i + 1) / steps;
					const [x0, y0] = at(this.turn + arm * Math.PI + s0 * 3.4, R * (0.06 + 0.7 * s0));
					const [x1, y1] = at(this.turn + arm * Math.PI + s1 * 3.4, R * (0.06 + 0.7 * s1));
					const alpha = pass === 0 ? 0.42 * (1 - s0 * 0.5) * bright : 0.8 * (1 - s0 * 0.7) * bright;
					sc.strokeStyle = `rgba(${pass === 0 ? broad : lane},${Math.min(1, alpha)})`;
					sc.lineWidth = pass === 0 ? R * (0.24 * (1 - s0) + 0.06) : R * (0.07 * (1 - s0) + 0.02);
					sc.beginPath();
					sc.moveTo(x0, y0);
					sc.lineTo(x1, y1);
					sc.stroke();
				}
			}
		});
		const coreR = R * 0.32 * (1 + 0.5 * p);
		const core = sc.createRadialGradient(gx, gy, 0, gx, gy, coreR);
		core.addColorStop(0, 'rgba(255,250,232,1)');
		core.addColorStop(0.3, 'rgba(255,214,240,.8)');
		core.addColorStop(1, 'rgba(255,170,230,0)');
		sc.fillStyle = core;
		sc.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);
		// stars, turning slowly with the galaxy, twinkling
		for (let i = 0; i < 10; i++) {
			const a = hash(i, 21) * TAU + this.turn * 0.3;
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
		const face = sc.createRadialGradient(R * 0.3, -R * 0.45, 0, R * 0.3, -R * 0.45, R * 0.62);
		face.addColorStop(0, css([255, 176, 232], 0.88));
		face.addColorStop(1, 'rgba(255,150,220,0)');
		sc.fillStyle = face;
		sc.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);
		// the atmosphere at her limb
		const limb = sc.createRadialGradient(0, 0, R * 0.7, 0, 0, R);
		limb.addColorStop(0, 'rgba(150,190,255,0)');
		limb.addColorStop(0.75, `rgba(176,160,255,${0.65 + 0.2 * p})`);
		limb.addColorStop(1, 'rgba(236,206,255,.95)');
		sc.fillStyle = limb;
		sc.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);
	}

	/** Her galaxy's two arms wound round the ball, turning with the roll. */
	protected paintBallPattern(ctx: CanvasRenderingContext2D, R: number): void {
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ARMS.forEach(([broad, lane], k) => {
			const a0 = k * Math.PI;
			const arm = () => {
				ctx.beginPath();
				for (let i = 0; i <= 28; i++) {
					const s = i / 28;
					const r = R * (0.08 + 1.0 * s);
					const a = a0 + s * 2.6;
					if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
					else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
				}
			};
			arm();
			ctx.strokeStyle = css(INK, 0.9);
			ctx.lineWidth = R * 0.32;
			ctx.stroke();
			arm();
			ctx.strokeStyle = `rgb(${broad})`;
			ctx.lineWidth = R * 0.22;
			ctx.stroke();
			arm();
			ctx.strokeStyle = `rgb(${lane})`;
			ctx.lineWidth = R * 0.07;
			ctx.stroke();
		});
		const core = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.35);
		core.addColorStop(0, 'rgba(255,250,232,1)');
		core.addColorStop(1, 'rgba(255,170,230,0)');
		ctx.fillStyle = core;
		ctx.fillRect(-R * 0.4, -R * 0.4, R * 0.8, R * 0.8);
	}

	/** Twinkles and little hearts circling the ball. */
	protected paintBallOrbit(ctx: CanvasRenderingContext2D, R: number): void {
		ctx.lineJoin = 'round';
		for (let k = 0; k < 6; k++) {
			const a = this.time * 5 + (k * Math.PI * 2) / 6;
			const x = Math.cos(a) * R * 1.32;
			const y = Math.sin(a) * R * 1.32;
			if (k % 2 === 0) {
				ctx.fillStyle = this.power > 0.5 ? css([255, 226, 110]) : 'rgba(255,252,255,1)';
				ctx.strokeStyle = css([110, 26, 76], 0.9);
				ctx.lineWidth = R * 0.04;
				starPath(ctx, x, y, R * 0.2, R * 0.05, a);
				ctx.fill();
				ctx.stroke();
			} else {
				const h = R * 0.1;
				ctx.fillStyle = 'rgba(255,72,130,1)';
				ctx.strokeStyle = css([120, 20, 60], 0.9);
				ctx.lineWidth = R * 0.035;
				ctx.beginPath();
				ctx.moveTo(x, y + h * 0.9);
				ctx.bezierCurveTo(x - h * 1.3, y + h * 0.1, x - h * 0.9, y - h * 1.1, x, y - h * 0.4);
				ctx.bezierCurveTo(x + h * 0.9, y - h * 1.1, x + h * 1.3, y + h * 0.1, x, y + h * 0.9);
				ctx.fill();
				ctx.stroke();
			}
		}
	}

	/** Blush: three short slanted strokes on the cheek. */
	private drawBlush(ctx: CanvasRenderingContext2D, R: number, ex: number, ey: number): void {
		ctx.strokeStyle = css(BLUSH, 0.9);
		ctx.lineWidth = Math.max(0.8, R * 0.026);
		ctx.lineCap = 'round';
		ctx.beginPath();
		for (let i = -1; i <= 1; i++) {
			const x = ex - R * 0.3 + i * R * 0.055;
			const y = ey + R * 0.3;
			ctx.moveTo(x - R * 0.03, y + R * 0.04);
			ctx.lineTo(x + R * 0.03, y - R * 0.04);
		}
		ctx.stroke();
	}

	/**
	 * Her eye, in profile above the mouth, drawn the anime way: a white with a big gradient
	 * iris, a dark pupil with two glints, a thick ink lid that flares into a wing, a lash and
	 * a brow above. It blinks, squints happily after a bite, lifts the brow and puts a star in
	 * its glint when she is powered, and stays shut while she dies.
	 */
	private drawEye(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		// above the upper lip even with the mouth wide open, clear of the bow; at tile size
		// (a small radius) the eye grows a little so it still reads
		const lod = R < 20 ? 1.65 : 1;
		const ex = R * 0.28;
		const ey = -R * (0.43 + (lod - 1) * 0.12);
		const rx = R * 0.17 * lod;
		const ry = R * 0.235 * lod;
		const ink = css(INK);
		const raise = R * 0.05 * p;
		const blinkShut = this.blink >= 0 ? Math.sin((this.blink / 0.14) * Math.PI) : 0;
		const shut = this.dying >= 0 ? 1 : Math.max(blinkShut, this.squint > 0.05 ? 1 : 0);
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		this.drawBlush(ctx, R, ex, ey);
		// the brow: an arc with a little flick, lifted when she is powered
		ctx.strokeStyle = ink;
		ctx.lineWidth = R * 0.05;
		ctx.beginPath();
		ctx.moveTo(ex - rx * 0.9, ey - ry * 1.3 - raise);
		ctx.quadraticCurveTo(
			ex + rx * 0.1,
			ey - ry * 1.62 - raise,
			ex + rx * 1.05,
			ey - ry * 1.3 - raise * 1.5
		);
		ctx.stroke();
		if (shut > 0.85) {
			// closed: a happy arc (squint) or a soft smiling line (blink, dying)
			const happy = this.squint > 0.05 && this.dying < 0;
			ctx.strokeStyle = ink;
			ctx.lineWidth = R * 0.075;
			ctx.beginPath();
			if (happy) ctx.arc(ex, ey + ry * 0.4, rx * 1.15, Math.PI * 1.12, Math.PI * 1.88);
			else ctx.arc(ex, ey - ry * 0.4, rx * 1.15, Math.PI * 0.2, Math.PI * 0.8);
			ctx.stroke();
			this.lashes(ctx, ex - rx * 0.95, happy ? ey - ry * 0.2 : ey + ry * 0.35, rx, R);
			return;
		}
		const open = Math.max(0.12, 1 - shut);
		ctx.save();
		ctx.translate(ex, ey);
		ctx.scale(1, open);
		// the white, then the iris and the pupil inside it
		ctx.fillStyle = css([255, 250, 252]);
		ctx.beginPath();
		ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.save();
		ctx.beginPath();
		ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
		ctx.clip();
		const g = ctx.createLinearGradient(0, -ry, 0, ry);
		g.addColorStop(0, css([56, 18, 98]));
		g.addColorStop(0.55, css([128, 48, 168]));
		g.addColorStop(1, css([214, 96, 206]));
		ctx.fillStyle = g;
		// the iris and the pupil follow the gaze (ahead by default: as she always looked)
		const gx = this.gazeX;
		const gy = this.gazeY * 0.32;
		ctx.beginPath();
		ctx.ellipse(rx * 0.2 * gx, ry * (0.04 + gy), rx * 0.8, ry * 0.95, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = css([34, 8, 44]);
		ctx.beginPath();
		ctx.ellipse(rx * 0.26 * gx, ry * (0.02 + gy), rx * 0.4, ry * 0.5, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
		// glints: a big one (a star when powered) and a small one
		ctx.fillStyle = 'rgba(255,255,255,1)';
		if (p > 0.3) {
			starPath(ctx, rx * 0.14, -ry * 0.3, rx * 0.5, rx * 0.12);
		} else {
			ctx.beginPath();
			ctx.arc(rx * 0.14, -ry * 0.3, rx * 0.28, 0, Math.PI * 2);
		}
		ctx.fill();
		ctx.beginPath();
		ctx.arc(rx * 0.5, ry * 0.36, rx * 0.13, 0, Math.PI * 2);
		ctx.fill();
		// the eye's outline
		ctx.strokeStyle = ink;
		ctx.lineWidth = R * 0.035;
		ctx.beginPath();
		ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
		ctx.stroke();
		ctx.restore();
		// the thick upper lid, flaring into a wing towards the front
		ctx.strokeStyle = ink;
		ctx.lineWidth = R * 0.07;
		ctx.beginPath();
		ctx.ellipse(ex, ey, rx * 1.02, ry * open * 1.02, 0, Math.PI * 1.02, Math.PI * 1.98);
		ctx.stroke();
		ctx.fillStyle = ink;
		const top = ey - ry * open * 0.9;
		ctx.beginPath();
		ctx.moveTo(ex + rx * 0.3, top);
		ctx.quadraticCurveTo(ex + rx * 1.2, top - ry * 0.05, ex + rx * 1.95, ey - ry * 0.4);
		ctx.quadraticCurveTo(ex + rx * 1.35, ey - ry * 0.5 * open, ex + rx * 1.0, ey - ry * 0.12);
		ctx.closePath();
		ctx.fill();
		this.lashes(ctx, ex - rx * 0.95, ey - ry * open * 0.35, rx, R);
	}

	/** A lash curling out at the back corner of the eye, and a second shorter one. */
	private lashes(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, R: number): void {
		ctx.strokeStyle = css(INK);
		ctx.lineWidth = R * 0.05;
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.quadraticCurveTo(x - rx * 0.5, y - rx * 0.1, x - rx * 0.8, y - rx * 0.6);
		ctx.moveTo(x + rx * 0.15, y - rx * 0.35);
		ctx.quadraticCurveTo(x - rx * 0.2, y - rx * 0.6, x - rx * 0.3, y - rx * 1.05);
		ctx.stroke();
	}

	/**
	 * Her lips: the ink line and the little fang under the upper one; no lipstick (the owner's
	 * call: the galaxy is colour enough).
	 */
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

	/** The accretion ring's near half (the rage), the bow, her eye, a star on the highlight. */
	protected drawWorn(
		ctx: CanvasRenderingContext2D,
		R: number,
		p: number,
		lx: number,
		ly: number
	): void {
		this.ring(ctx, R, p, false);
		ctx.save();
		ctx.translate(Math.cos(BOW_ANGLE) * R * BOW_DISTANCE, Math.sin(BOW_ANGLE) * R * BOW_DISTANCE);
		ctx.rotate(BOW_ANGLE + Math.PI / 2 + this.bow.value);
		drawNebulaBow(ctx, R, this.time, p);
		ctx.restore();
		// the eye last: on her face, in front of the bow
		this.drawEye(ctx, R, p);
		drawStarGlint(ctx, R, p, lx, ly);
	}

	/** Stars for a trail (fire and stars in the rage); hearts and stars on bursts. */
	protected particleFor(moment: 'trail' | 'burst' | 'death'): ParticleKind {
		const r = this.random();
		if (moment === 'trail') {
			if (this.ball) return r < 0.5 ? 'heart' : 'star';
			return this.power > 0.5 && r < 0.4 ? 'ember' : 'star';
		}
		return r < 0.45 ? 'heart' : 'star';
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
			drawEmberGlow(ctx, e, a, s, [255, 150, 230], [255, 230, 250]);
			return;
		}
		if (e.kind === 'flame') {
			drawFlameDrop(ctx, e, [200, 110, 255], [255, 220, 250]);
			return;
		}
		if (e.kind === 'heart') {
			ctx.save();
			ctx.translate(e.x, e.y);
			ctx.globalAlpha = a;
			ctx.lineJoin = 'round';
			const h = s * 1.6;
			ctx.fillStyle = 'rgba(255,90,200,1)';
			ctx.strokeStyle = css(INK, 0.9);
			ctx.lineWidth = Math.max(0.8, h * 0.18);
			ctx.beginPath();
			ctx.moveTo(0, h * 0.9);
			ctx.bezierCurveTo(-h * 1.3, h * 0.1, -h * 0.9, -h * 1.1, 0, -h * 0.4);
			ctx.bezierCurveTo(h * 0.9, -h * 1.1, h * 1.3, h * 0.1, 0, h * 0.9);
			ctx.fill();
			ctx.stroke();
			ctx.restore();
			return;
		}
		// a soft twinkle: white (pink in the rage) in a pale glow, no ink outline
		ctx.save();
		ctx.translate(e.x, e.y);
		ctx.rotate(e.spin * (e.max - e.life));
		ctx.globalCompositeOperation = 'lighter';
		ctx.globalAlpha = a * 0.45;
		const g = s * 1.5;
		ctx.drawImage(glow([255, 220, 250]), -g, -g, g * 2, g * 2);
		ctx.globalCompositeOperation = 'source-over';
		ctx.globalAlpha = a;
		ctx.fillStyle = this.power > 0.5 ? 'rgb(255,224,246)' : 'rgb(255,252,255)';
		starPath(ctx, 0, 0, s * 1.6, s * 0.3);
		ctx.fill();
		ctx.restore();
	}
}

/** A repeatable random number in 0..1 for (a, b). */
function hash(a: number, b = 0): number {
	let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul((b | 0) + 0x9e3779b9, 0x85ebca6b);
	h ^= h >>> 15;
	h = Math.imul(h, 0x2c1b3c6d);
	h ^= h >>> 12;
	return ((h >>> 0) % 100000) / 100000;
}
