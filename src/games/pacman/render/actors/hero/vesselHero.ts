// The heroes' vessel look (the owner's mock-up "Heroes.html", 2026-11-25, carried over as
// drawn): a glass vessel 85% full with a rolling air bubble, a see-through mouth, a glowing wedge
// eye, a ribbon stream behind, flicks thrown back. The power turns the contour inside out (a dark
// rim becomes a glowing one). Shared here: the shapes, the eye and the base of both heroes.
import type { Palette } from './Hero';
import { Hero, LIGHT, css, mix } from './Hero';
import type { RGB } from './heroSeasons';
import { Wake } from './heroWake';

/** A drop thrown back from the stream. */
export interface Flick {
	x: number;
	y: number;
	vx: number;
	vy: number;
	ang: number;
	size: number;
	life: number;
	max: number;
	hot: boolean;
	alt: boolean;
}

/** The wedge eye's look this frame. */
export interface WedgeEye {
	readonly gazeX: number;
	readonly gazeY: number;
	readonly squint: number;
	readonly inkRgb: RGB;
	readonly glowCoreRgb: RGB;
	readonly glowHaloRgb: RGB;
	readonly isMs: boolean;
}
export const CJ_TAU = Math.PI * 2;
// the body is 0.33 tile, as the heroes before (the mock-up had 0.295; the owner, 2026-11-25)
export const CJ_BODY_RATIO = 0.33;
export const CJ_MAX_FX_R = 1.44; // 0.475 tile, about the old corona's reach (1.45 radii)
export const CJ_AURA_MAX = 1.5; // 0.495 tile: the aura fades out inside the tile
/**
 * The stream's ribbons fill six points per stretch (the default three): half the fills and
 * gradients, no visible change (measured: no pixel off by more than 13/255).
 */
export const VESSEL_STREAM_STEP = 6;
export const CJ_CINN_INK: RGB = [42, 10, 18]; // deep ruby lacquer ink #2a0a12
export const CJ_JADE_INK: RGB = [10, 42, 38]; // deep pine-jade ink #0a2a26

/** The world's key light in the hero's own frame. */
export function cjLight(angle: number, flip: number): { lx: number; ly: number } {
	const ca = Math.cos(angle);
	const sa = Math.sin(angle);
	return {
		lx: LIGHT.x * ca + LIGHT.y * sa,
		ly: (-LIGHT.x * sa + LIGHT.y * ca) * flip
	};
}

/** A clean glossy drop along +X. */
export function cjDropShape(ctx: CanvasRenderingContext2D, len: number, wid: number): void {
	ctx.beginPath();
	ctx.moveTo(len, 0);
	ctx.quadraticCurveTo(len * 0.15, -wid, -len * 0.55, -wid * 0.56);
	ctx.quadraticCurveTo(-len * 0.95, 0, -len * 0.55, wid * 0.56);
	ctx.quadraticCurveTo(len * 0.15, wid, len, 0);
	ctx.closePath();
}

/** A crisp faceted diamond spark. */
export function cjDiamond(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	rx: number,
	ry: number,
	rot = 0
): void {
	ctx.save();
	ctx.translate(cx, cy);
	ctx.rotate(rot);
	ctx.beginPath();
	ctx.moveTo(0, -ry);
	ctx.lineTo(rx, 0);
	ctx.lineTo(0, ry);
	ctx.lineTo(-rx, 0);
	ctx.closePath();
	ctx.restore();
}

/** A crisp four-point star spark (the stream in the power). */
export function cjStar4(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	big: number,
	small: number,
	rot = 0
): void {
	ctx.beginPath();
	for (let i = 0; i < 8; i++) {
		const a = rot + (i * Math.PI) / 4;
		const r = i % 2 === 0 ? big : small;
		const x = cx + Math.cos(a) * r;
		const y = cy + Math.sin(a) * r;
		if (i === 0) ctx.moveTo(x, y);
		else ctx.lineTo(x, y);
	}
	ctx.closePath();
}

/**
 * The glowing wedge eye, lit from inside.
 */
export function drawGlowWedgeEye(
	ctx: CanvasRenderingContext2D,
	R: number,
	p: number,
	opts: WedgeEye
): void {
	const { gazeX, gazeY, squint, inkRgb, glowCoreRgb, glowHaloRgb, isMs } = opts;
	const lod = R < 20 ? 1 + ((20 - R) / 20) * 0.22 : 1;
	const gx = gazeX * R * 0.05;
	const gy = gazeY * R * 0.034;
	const ex = R * 0.26 + gx;
	const ey = -R * 0.33 + gy;

	ctx.save();
	ctx.translate(ex, ey);

	// biting or blinking: one sharp confident stroke
	if (squint > 0.68) {
		const w = R * 0.22 * lod;
		ctx.strokeStyle = css(glowCoreRgb);
		ctx.lineWidth = Math.max(1.55, R * 0.092);
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.beginPath();
		if (isMs) {
			ctx.moveTo(-w, R * 0.03);
			ctx.quadraticCurveTo(0, -R * 0.13, w * 0.96, -R * 0.04);
		} else {
			ctx.moveTo(-w * 0.85, -R * 0.07);
			ctx.lineTo(w * 0.78, R * 0.01);
			ctx.lineTo(-w * 0.85, R * 0.1);
		}
		ctx.stroke();
		ctx.restore();
		return;
	}

	// the glowing wedge
	ctx.rotate(isMs ? -0.14 : 0.12);
	const w = R * 0.255 * lod;
	const h = R * (0.132 + 0.02 * p) * lod * (1 - squint * 0.76);

	// a soft recess under it
	ctx.fillStyle = css(inkRgb, 0.72);
	ctx.beginPath();
	if (isMs) {
		ctx.moveTo(-w * 1.18, h * 0.18);
		ctx.quadraticCurveTo(-w * 0.1, -h * 1.55, w * 1.24, -h * 0.42);
		ctx.quadraticCurveTo(w * 0.14, h * 1.32, -w * 1.18, h * 0.18);
	} else {
		ctx.moveTo(-w * 1.15, -h * 0.42);
		ctx.quadraticCurveTo(w * 0.08, -h * 1.12, w * 1.18, h * 0.08);
		ctx.quadraticCurveTo(w * 0.02, h * 1.42, -w * 1.15, -h * 0.42);
	}
	ctx.closePath();
	ctx.fill();

	// a soft glow round the wedge
	ctx.save();
	ctx.globalCompositeOperation = 'lighter';
	const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 1.65);
	g.addColorStop(0, css(glowHaloRgb, 0.48 + 0.42 * p));
	g.addColorStop(1, css(glowHaloRgb, 0));
	ctx.fillStyle = g;
	ctx.beginPath();
	ctx.arc(0, 0, w * 1.65, 0, CJ_TAU);
	ctx.fill();
	ctx.restore();

	// the crescent wedge itself
	ctx.beginPath();
	if (isMs) {
		ctx.moveTo(-w * 0.96, h * 0.16);
		ctx.quadraticCurveTo(-w * 0.08, -h * 1.18, w * 1.04, -h * 0.36);
		ctx.quadraticCurveTo(w * 0.12, h * 0.92, -w * 0.96, h * 0.16);
	} else {
		ctx.moveTo(-w * 0.96, -h * 0.36);
		ctx.lineTo(w * 1.0, h * 0.04);
		ctx.quadraticCurveTo(w * 0.06, h * 1.06, -w * 0.96, -h * 0.36);
	}
	ctx.closePath();

	const cg = ctx.createLinearGradient(-w, -h, w, h);
	cg.addColorStop(0, p > 0.3 ? '#ffffff' : css(glowCoreRgb));
	cg.addColorStop(0.55, '#ffffff');
	cg.addColorStop(1, css(glowCoreRgb));
	ctx.fillStyle = cg;
	ctx.fill();

	ctx.restore();
}

/**
 * The base of both vessels: the power turns the contour inside out.
 */
export abstract class VesselHero extends Hero {
	protected readonly wake = new Wake();

	/** The contour's glow in the power, and its hot outer halo. */
	protected abstract phaseGlowRgb(): RGB;
	protected abstract phaseHotRgb(): RGB;

	/** No cavity behind the mouth: the open mouth is see-through. */
	protected override drawInside(): void {}
	protected flicks: Flick[] = [];
	protected flickDist = 0;
	protected windK = 0;
	protected bitePulse = 0;
	protected turnPulse = 0;

	protected override resetLooks(): void {
		this.flicks = [];
		this.flickDist = 0;
		this.windK = 0;
		this.bitePulse = 0;
		this.turnPulse = 0;
		this.wake.clear();
	}
	protected override onBite(): void {
		this.bitePulse = 1;
		this.emitFlicks(2, true);
	}
	protected override onTurn(): void {
		this.turnPulse = 1;
		this.emitFlicks(5, true);
		for (let i = 0; i < 6; i++) {
			this.spawn(
				this.particleFor?.('burst') ?? 'ember',
				this.power > 0.45,
				this.angle + Math.PI + (this.random() - 0.5) * 1.4,
				2.8 + this.random() * 2.6,
				true
			);
		}
	}
	protected emitFlicks(count: number, isKick = false): void {
		const R = this.r;
		const backX = -Math.cos(this.angle);
		const backY = -Math.sin(this.angle);
		const perpX = -backY;
		const perpY = backX;
		for (let i = 0; i < count; i++) {
			const lat = (this.random() - 0.5) * R * (isKick ? 1.05 : 0.78);
			const spd = R * ((isKick ? 2.3 : 1.3) + this.random() * 1.7) * (1 + 0.26 * this.power);
			const life = (0.25 + this.random() * 0.16) * (1 + 0.25 * this.power);
			this.flicks.push({
				x: this.x + backX * R * (0.52 + this.random() * 0.32) + perpX * lat,
				y: this.y + backY * R * (0.52 + this.random() * 0.32) + perpY * lat,
				vx: backX * spd + perpX * (this.random() - 0.5) * R * 0.8,
				vy: backY * spd + perpY * (this.random() - 0.5) * R * 0.8,
				ang: this.angle + Math.PI + (this.random() - 0.5) * 0.35,
				size: R * ((isKick ? 0.24 : 0.18) + this.random() * 0.09) * (1 + 0.16 * this.power),
				life,
				max: life,
				hot: isKick || this.power > 0.45,
				alt: this.random() < 0.35
			});
		}
		if (this.flicks.length > 24) this.flicks.splice(0, this.flicks.length - 24);
	}
	protected override afterUpdate(dt: number): void {
		this.windK += ((this.moving ? 1 : 0) - this.windK) * Math.min(1, dt * 6);
		this.bitePulse = Math.max(0, this.bitePulse - dt / 0.26);
		this.turnPulse = Math.max(0, this.turnPulse - dt / 0.28);
		this.wake.push(this.x, this.y, this.time, this.moving ? 1 : 0, this.r * 3);

		if (this.moving) {
			this.flickDist += this.r * 3.6 * dt;
			const fGap = this.r * (this.power > 0.5 ? 0.6 : 0.96);
			if (this.flickDist >= fGap) {
				this.flickDist = 0;
				this.emitFlicks(1, false);
			}
		}

		const drag = Math.pow(0.89, dt * 60);
		for (const fl of this.flicks) {
			fl.life -= dt;
			fl.x += fl.vx * dt;
			fl.y += fl.vy * dt;
			fl.vx *= drag;
			fl.vy *= drag;
		}
		this.flicks = this.flicks.filter((fl) => fl.life > 0);
	}
	protected override liftFor(): number {
		return 0;
	}

	/** The contour in the power: the dark ink becomes a glowing rim. */
	protected override drawSilhouetteOutline(
		ctx: CanvasRenderingContext2D,
		outline: (c: CanvasRenderingContext2D) => void,
		R: number,
		p: number,
		lx: number,
		ly: number,
		pal: Palette
	): void {
		const phaseOn = p > 0.05;
		const glowRgb = this.phaseGlowRgb();
		const hotRgb = this.phaseHotRgb();

		if (phaseOn) {
			ctx.save();
			ctx.globalCompositeOperation = 'lighter';
			ctx.scale(1.13 + 0.05 * p, 1.13 + 0.05 * p);
			outline(ctx);
			ctx.fillStyle = css(hotRgb, 0.48 * p);
			ctx.fill();
			ctx.restore();

			ctx.save();
			ctx.scale(1.065 + 0.02 * p, 1.065 + 0.02 * p);
			outline(ctx);
			ctx.fillStyle = css(mix(pal.ink, glowRgb, p));
			ctx.fill();
			ctx.restore();
		} else {
			ctx.save();
			ctx.translate(-lx * R * 0.026, -ly * R * 0.026);
			ctx.scale(1.046, 1.046);
			outline(ctx);
			ctx.fillStyle = css(pal.ink);
			ctx.fill();
			ctx.restore();
		}
	}
}
