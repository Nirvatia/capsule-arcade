import { describe, expect, it, vi } from 'vitest';
import { heroPortrait } from './heroPortrait';

// The glow sprite needs a DOM canvas; the portrait bake only needs recorded draws.
vi.mock('../../../render/actors/hero/Hero', async (importOriginal) => ({
	...(await importOriginal<typeof import('../../../render/actors/hero/Hero')>()),
	glow: () => ({}) as unknown as HTMLCanvasElement
}));

interface FakeCanvas {
	width: number;
	height: number;
	images: unknown[][];
	getContext: () => CanvasRenderingContext2D;
	toDataURL: () => string;
}

/** A canvas whose context records drawImage sources instead of painting. */
function fakeCanvas(scale: number): FakeCanvas {
	const images: unknown[][] = [];
	const state: Record<string, unknown> = { globalAlpha: 1 };
	const ctx = new Proxy(state, {
		get: (t, k: string) => {
			if (k in t) return t[k];
			if (k === 'getTransform') return () => ({ a: scale, b: 0, c: 0, d: scale, e: 0, f: 0 });
			if (k === 'drawImage') return (...args: unknown[]) => images.push(args);
			if (k === 'createRadialGradient' || k === 'createLinearGradient')
				return () => ({ addColorStop: () => {} });
			return () => {};
		},
		set: (t, k: string, v) => {
			t[k] = v;
			return true;
		}
	}) as unknown as CanvasRenderingContext2D;
	return {
		width: 0,
		height: 0,
		images,
		getContext: () => ctx,
		toDataURL: () => 'data:image/png;base64,AA'
	};
}

describe('the menu portrait bake', () => {
	it('paints the body disc at the bake scale, not at the screen dpr (no upscaled blur)', () => {
		const made: FakeCanvas[] = [];
		vi.stubGlobal('document', {
			createElement: () => {
				const c = fakeCanvas(6);
				made.push(c);
				return c;
			}
		});
		try {
			heroPortrait(false, 'summer');
			// the portrait canvas is the first one made; its body source is the scratch disc
			const sources = made[0].images
				.map((a) => (a[0] as FakeCanvas).width)
				.filter((w) => typeof w === 'number');
			// R=18 at scale 6: the disc spans ±1.15 radii, so ~248 px across, never 42
			expect(Math.max(...sources)).toBeGreaterThanOrEqual(18 * 1.15 * 2 * 6 * 0.9);
		} finally {
			vi.unstubAllGlobals();
		}
	});
});
