// A world's atmosphere (mist, sun rays, light, colour wash, storm tint, vignette, night) in two
// small screen buffers instead of one pass per layer. Covering layers become a shade map (how
// much of the world shows through), additive layers and the covering layers' own colour become
// light on black; the world times the shade plus the light is the stack. The maps go over the
// whole screen (`draw`), over a part of it (`compositeRect`) or into a baked background
// (`compositeWithMargins`), so a world can bake its settled atmosphere and keep one pass.

import { MOOD_UPDATE_INTERVAL_MS } from './renderQuality';
import type { RenderQuality } from './renderQuality';

/** Longest side of the buffers, px. */
const BUFFER_SIDE = 512;

/** One layer of the atmosphere; `additive` layers add light, the others cover with their alpha. */
export type MoodPainter = (ctx: CanvasRenderingContext2D, additive: boolean) => void;

/** Extra shade work after the coverage became a multiply map (the season's night tint). */
export type MoodShadeFinish = (ctx: CanvasRenderingContext2D) => void;

interface Buffer {
	readonly cv: HTMLCanvasElement;
	readonly ctx: CanvasRenderingContext2D;
}

function canvas2d(willReadFrequently = false): Buffer {
	const cv = document.createElement('canvas');
	const ctx = cv.getContext('2d', { willReadFrequently });
	if (!ctx) {
		throw new Error('moodBuffer: 2d context unavailable');
	}
	return { cv, ctx };
}

export class MoodBuffer {
	private shade: Buffer | null = null;
	private light: Buffer | null = null;
	private vw = 0;
	private vh = 0;
	/** css px to buffer px; the buffer's sides are whole pixels, so the two differ a little. */
	private kx = 1;
	private ky = 1;
	private quality: RenderQuality = 'high';
	private painted = false;
	private nextPaintAt = 0;
	/** The shade map's form at its last paint: an opaque multiplier, or black with alpha. */
	private multiplier = false;
	/** False for a stack that only covers: no light map is painted or drawn. */
	private lightOn = true;

	/** The quality tier sets how often `draw` repaints the maps. */
	setQuality(quality: RenderQuality): void {
		if (this.quality !== quality) {
			this.quality = quality;
			this.painted = false;
		}
	}

	/** A stack of covering layers only needs the shade map: switch the light map off for it. */
	setLight(enabled: boolean): void {
		if (this.lightOn !== enabled) {
			this.lightOn = enabled;
			this.painted = false;
		}
	}

	/**
	 * Paints the stack when its quality interval allows and composites it over `ctx`, a screen
	 * of vw x vh css px whose transform is the identity in css px. High repaints every frame,
	 * Medium at 30 Hz, Low at 15 Hz.
	 */
	draw(
		ctx: CanvasRenderingContext2D,
		vw: number,
		vh: number,
		paint: MoodPainter,
		finishShade: MoodShadeFinish | null = null
	): void {
		if (this.paint(vw, vh, paint, finishShade)) {
			this.composite(ctx);
		}
	}

	/**
	 * Repaints the maps for a screen of vw x vh css px when the quality interval allows, or at
	 * once with `force`. False when there is nothing to composite.
	 */
	paint(
		vw: number,
		vh: number,
		paint: MoodPainter,
		finishShade: MoodShadeFinish | null = null,
		force = false
	): boolean {
		if (vw <= 0 || vh <= 0) {
			return false;
		}
		this.fit(vw, vh);
		const shade = this.shade;
		const light = this.light;
		if (!shade || !light) {
			return false;
		}
		const now = performance.now();
		const interval = MOOD_UPDATE_INTERVAL_MS[this.quality];
		if (force || !this.painted || interval === 0 || now >= this.nextPaintAt) {
			this.multiplier = finishShade !== null;
			this.paintShade(shade, paint, finishShade);
			if (this.lightOn) {
				this.paintLight(light, paint);
			}
			this.painted = true;
			this.nextPaintAt = now + interval;
		}
		return true;
	}

	/** The maps as last painted, over the whole screen (`ctx` in css px). */
	composite(ctx: CanvasRenderingContext2D): void {
		const shade = this.shade;
		if (!shade || !this.painted) {
			return;
		}
		ctx.save();
		this.blit(ctx, 0, 0, shade.cv.width, shade.cv.height, 0, 0, this.vw, this.vh);
		ctx.restore();
	}

	/**
	 * A part of the maps as last painted: the screen rectangle (sx, sy, sw, sh), in css px,
	 * drawn into (dx, dy, dw, dh) of `ctx`, in its own units.
	 */
	compositeRect(
		ctx: CanvasRenderingContext2D,
		sx: number,
		sy: number,
		sw: number,
		sh: number,
		dx: number,
		dy: number,
		dw: number,
		dh: number
	): void {
		if (!this.shade || !this.painted) {
			return;
		}
		ctx.save();
		this.blit(ctx, sx * this.kx, sy * this.ky, sw * this.kx, sh * this.ky, dx, dy, dw, dh);
		ctx.restore();
	}

	/**
	 * The maps as last painted, into an image that holds more than the screen: the screen is
	 * the rectangle (x, y, w, h) of `ctx`, and the maps' edge pixels are stretched over the
	 * margins around it, so the atmosphere does not stop at the screen's border.
	 */
	compositeWithMargins(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		w: number,
		h: number,
		left: number,
		top: number,
		right: number,
		bottom: number
	): void {
		const shade = this.shade;
		if (!shade || !this.painted) {
			return;
		}
		const W = shade.cv.width;
		const H = shade.cv.height;
		// columns and rows of the 3 x 3 layout: source start and size, target start and size
		const cols = [
			[0, 1, x - left, left],
			[0, W, x, w],
			[W - 1, 1, x + w, right]
		] as const;
		const rows = [
			[0, 1, y - top, top],
			[0, H, y, h],
			[H - 1, 1, y + h, bottom]
		] as const;
		ctx.save();
		for (const [sy, sh, dy, dh] of rows) {
			for (const [sx, sw, dx, dw] of cols) {
				if (dw > 0 && dh > 0) {
					this.blit(ctx, sx, sy, sw, sh, dx, dy, dw, dh);
				}
			}
		}
		ctx.restore();
	}

	/** Shade, then light; the source rectangle is in buffer px. */
	private blit(
		ctx: CanvasRenderingContext2D,
		sx: number,
		sy: number,
		sw: number,
		sh: number,
		dx: number,
		dy: number,
		dw: number,
		dh: number
	): void {
		const shade = this.shade;
		const light = this.light;
		if (!shade || !light) {
			return;
		}
		ctx.globalAlpha = 1;
		ctx.imageSmoothingEnabled = true;
		ctx.globalCompositeOperation = this.multiplier ? 'multiply' : 'source-over';
		ctx.drawImage(shade.cv, sx, sy, sw, sh, dx, dy, dw, dh);
		if (this.lightOn) {
			ctx.globalCompositeOperation = 'lighter';
			ctx.drawImage(light.cv, sx, sy, sw, sh, dx, dy, dw, dh);
		}
	}

	private paintShade(
		buffer: Buffer,
		paint: MoodPainter,
		finishShade: MoodShadeFinish | null
	): void {
		const s = buffer.ctx;
		const sw = buffer.cv.width;
		const sh = buffer.cv.height;
		s.setTransform(1, 0, 0, 1, 0, 0);
		s.globalAlpha = 1;
		s.globalCompositeOperation = 'source-over';
		s.clearRect(0, 0, sw, sh);
		s.setTransform(this.kx, 0, 0, this.ky, 0, 0);
		paint(s, false);

		// a painter may leave its last layer's alpha and blend mode behind
		s.setTransform(1, 0, 0, 1, 0, 0);
		s.globalAlpha = 1;
		s.globalCompositeOperation = 'source-over';
		if (finishShade) {
			// the night tint needs an opaque multiplier map to be multiplied into
			const image = s.getImageData(0, 0, sw, sh);
			const px = image.data;
			for (let i = 0; i < px.length; i += 4) {
				const shade = 255 - px[i + 3]!;
				px[i] = shade;
				px[i + 1] = shade;
				px[i + 2] = shade;
				px[i + 3] = 255;
			}
			s.putImageData(image, 0, 0);
			s.setTransform(this.kx, 0, 0, this.ky, 0, 0);
			finishShade(s);
			s.setTransform(1, 0, 0, 1, 0, 0);
			s.globalAlpha = 1;
			s.globalCompositeOperation = 'source-over';
		} else {
			// the usual covering stack keeps its cheaper black-alpha form
			s.globalCompositeOperation = 'source-atop';
			s.fillStyle = '#000';
			s.fillRect(0, 0, sw, sh);
			s.globalCompositeOperation = 'source-over';
		}
	}

	private paintLight(buffer: Buffer, paint: MoodPainter): void {
		const l = buffer.ctx;
		l.setTransform(1, 0, 0, 1, 0, 0);
		l.globalAlpha = 1;
		l.globalCompositeOperation = 'source-over';
		l.fillStyle = '#000';
		l.fillRect(0, 0, buffer.cv.width, buffer.cv.height);
		l.setTransform(this.kx, 0, 0, this.ky, 0, 0);
		paint(l, true);
		l.setTransform(1, 0, 0, 1, 0, 0);
		l.globalAlpha = 1;
		l.globalCompositeOperation = 'source-over';
	}

	private fit(vw: number, vh: number): void {
		if (vw === this.vw && vh === this.vh && this.shade && this.light) {
			return;
		}
		this.vw = vw;
		this.vh = vh;
		const scale = Math.min(1, BUFFER_SIDE / Math.max(vw, vh));
		const w = Math.max(1, Math.ceil(vw * scale));
		const h = Math.max(1, Math.ceil(vh * scale));
		this.kx = w / vw;
		this.ky = h / vh;
		this.shade ??= canvas2d(true);
		this.light ??= canvas2d();
		for (const b of [this.shade, this.light]) {
			b.cv.width = w;
			b.cv.height = h;
		}
		this.painted = false;
	}
}
