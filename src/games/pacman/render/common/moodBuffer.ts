// The season's atmosphere (mist, sun rays, light, colour wash, storm tint) in two screen passes
// instead of one per layer. Every layer is a source-over or an additive draw, so the whole stack
// turns the world under it into `world * m + a` per pixel (m from the layers' alpha, a their
// colour). Both terms are painted into small screen-space buffers (the layers are soft textures
// of 256 px at most, so a buffer of about 512 px loses nothing) and composited once each: the
// shade (black, alpha 1 - m) over the world, then the light (a, on black) added. On a weak GPU
// the frame is bound by full-screen fills, and this saves four to six of them per frame.

/** Longest side of the buffers, px. */
const BUFFER_SIDE = 512;

/** One layer of the atmosphere; `additive` layers add light, the others cover with their alpha. */
export type MoodPainter = (ctx: CanvasRenderingContext2D, additive: boolean) => void;

function canvas2d(): { cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
	const cv = document.createElement('canvas');
	const ctx = cv.getContext('2d');
	if (!ctx) {
		throw new Error('moodBuffer: 2d context unavailable');
	}
	return { cv, ctx };
}

export class MoodBuffer {
	private shade: { cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null;
	private light: { cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null;
	private vw = 0;
	private vh = 0;
	private scale = 1;

	/**
	 * Paints the stack (`paint` is called twice: once for the shade, skipping additive layers,
	 * once for the light) and composites it over `ctx`, a screen of vw x vh css px whose
	 * transform is the identity in css px.
	 */
	draw(ctx: CanvasRenderingContext2D, vw: number, vh: number, paint: MoodPainter): void {
		if (vw <= 0 || vh <= 0) {
			return;
		}
		this.fit(vw, vh);
		const shade = this.shade;
		const light = this.light;
		if (!shade || !light) {
			return;
		}
		const k = this.scale;
		const sw = shade.cv.width;
		const sh = shade.cv.height;

		const s = shade.ctx;
		s.setTransform(1, 0, 0, 1, 0, 0);
		s.globalAlpha = 1;
		s.globalCompositeOperation = 'source-over';
		s.clearRect(0, 0, sw, sh);
		s.setTransform(k, 0, 0, k, 0, 0);
		paint(s, false);
		// keep the coverage, drop the colour: what is left darkens the world by its alpha
		s.setTransform(1, 0, 0, 1, 0, 0);
		s.globalAlpha = 1;
		s.globalCompositeOperation = 'source-atop';
		s.fillStyle = '#000';
		s.fillRect(0, 0, sw, sh);
		s.globalCompositeOperation = 'source-over';

		const l = light.ctx;
		l.setTransform(1, 0, 0, 1, 0, 0);
		l.globalAlpha = 1;
		l.globalCompositeOperation = 'source-over';
		l.fillStyle = '#000';
		l.fillRect(0, 0, sw, sh);
		l.setTransform(k, 0, 0, k, 0, 0);
		paint(l, true);
		l.globalAlpha = 1;
		l.globalCompositeOperation = 'source-over';

		ctx.save();
		ctx.globalAlpha = 1;
		ctx.imageSmoothingEnabled = true;
		ctx.globalCompositeOperation = 'source-over';
		ctx.drawImage(shade.cv, 0, 0, vw, vh);
		ctx.globalCompositeOperation = 'lighter';
		ctx.drawImage(light.cv, 0, 0, vw, vh);
		ctx.restore();
	}

	private fit(vw: number, vh: number): void {
		if (vw === this.vw && vh === this.vh && this.shade && this.light) {
			return;
		}
		this.vw = vw;
		this.vh = vh;
		this.scale = Math.min(1, BUFFER_SIDE / Math.max(vw, vh));
		const w = Math.max(1, Math.ceil(vw * this.scale));
		const h = Math.max(1, Math.ceil(vh * this.scale));
		this.shade ??= canvas2d();
		this.light ??= canvas2d();
		for (const b of [this.shade, this.light]) {
			b.cv.width = w;
			b.cv.height = h;
		}
	}
}
