// The grid world's light: everything that glows is drawn into one emissive layer, which is then
// halved again and again (each halving is a box blur) and added back over the frame in three
// layers: the crisp layer itself (the burnt core), a quarter-size copy (the narrow halo) and a
// sixteenth-size one (the wide halo). The floor mirrors the light, clipped to the floor.

export interface GlowSetup {
	readonly name: string;
	readonly core: number;
	readonly narrow: number;
	readonly wide: number;
	/** The floor's reflection of the light. */
	readonly mirror: number;
}

export const GLOW_SETUPS: Readonly<Record<'a' | 'b' | 'c', GlowSetup>> = {
	a: { name: 'Свет A', core: 1, narrow: 0.6, wide: 0.3, mirror: 0.25 },
	b: { name: 'Свет B', core: 1, narrow: 0.95, wide: 0.6, mirror: 0.4 },
	c: { name: 'Свет C', core: 1, narrow: 1.3, wide: 1.0, mirror: 0.55 }
};

type Layer = { cv: HTMLCanvasElement; x: CanvasRenderingContext2D };

function layer(w: number, h: number): Layer {
	const cv = document.createElement('canvas');
	cv.width = Math.max(1, Math.round(w));
	cv.height = Math.max(1, Math.round(h));
	return { cv, x: cv.getContext('2d') as CanvasRenderingContext2D };
}

export class GlowChain {
	private em: Layer | null = null;
	private down: Layer[] = [];

	/** The emissive layer for this frame, cleared, untransformed (device px). */
	begin(width: number, height: number): CanvasRenderingContext2D {
		if (
			!this.em ||
			this.em.cv.width !== Math.round(width) ||
			this.em.cv.height !== Math.round(height)
		) {
			this.em = layer(width, height);
			this.down = [2, 4, 8, 16].map((k) => layer(width / k, height / k));
		}
		const x = this.em.x;
		x.setTransform(1, 0, 0, 1, 0, 0);
		x.globalAlpha = 1;
		x.globalCompositeOperation = 'source-over';
		x.clearRect(0, 0, this.em.cv.width, this.em.cv.height);
		return x;
	}

	/**
	 * Adds the light over `target` (device px, untransformed). `mirror`, if given, is the floor
	 * (in the same device-px space) the reflection is clipped to.
	 */
	compose(
		target: CanvasRenderingContext2D,
		setup: GlowSetup,
		mirror: ((c: CanvasRenderingContext2D) => void) | null
	): void {
		const em = this.em;
		if (!em) return;
		let src = em.cv;
		for (const d of this.down) {
			d.x.setTransform(1, 0, 0, 1, 0, 0);
			d.x.globalCompositeOperation = 'copy';
			d.x.imageSmoothingEnabled = true;
			d.x.drawImage(src, 0, 0, d.cv.width, d.cv.height);
			src = d.cv;
		}
		const [, quarter, eighth, sixteenth] = this.down.map((d) => d.cv);
		const W = em.cv.width;
		const H = em.cv.height;
		target.save();
		target.setTransform(1, 0, 0, 1, 0, 0);
		target.imageSmoothingEnabled = true;
		target.globalCompositeOperation = 'lighter';
		if (mirror) {
			target.save();
			mirror(target);
			target.globalAlpha = setup.mirror;
			target.drawImage(eighth, 0, 0, W, H);
			target.restore();
			target.globalCompositeOperation = 'lighter';
		}
		target.globalAlpha = Math.min(1, setup.wide);
		target.drawImage(sixteenth, 0, 0, W, H);
		if (setup.wide > 1) {
			target.globalAlpha = setup.wide - 1;
			target.drawImage(sixteenth, 0, 0, W, H);
		}
		target.globalAlpha = Math.min(1, setup.narrow);
		target.drawImage(quarter, 0, 0, W, H);
		if (setup.narrow > 1) {
			target.globalAlpha = setup.narrow - 1;
			target.drawImage(quarter, 0, 0, W, H);
		}
		target.globalAlpha = setup.core;
		target.drawImage(em.cv, 0, 0);
		target.restore();
	}
}
