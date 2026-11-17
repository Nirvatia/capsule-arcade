import { describe, expect, it, vi } from 'vitest';
import { PacmanHero } from './PacmanHero';
import { MsPacmanHero } from './MsPacmanHero';

// The glow sprite needs a DOM canvas; these tests only read geometry and colours.
vi.mock('./Hero', async (importOriginal) => ({
	...(await importOriginal<typeof import('./Hero')>()),
	glow: () => ({}) as unknown as HTMLCanvasElement
}));

const DT = 1 / 60;

/** A context that records path points, gradients and ellipses instead of drawing. */
function record() {
	const points: Array<[number, number]> = [];
	/** Path ends and arc extents only: where a ray tip actually lands, not its control points. */
	const tips: Array<[number, number]> = [];
	const grads: Array<{ args: number[]; stops: Array<[number, string]> }> = [];
	const ellipses: Array<{ rx: number; fill: unknown }> = [];
	const state: Record<string, unknown> = {};
	let strokes = 0;
	let images = 0;
	const ctx = new Proxy(state, {
		get: (t, k: string) => {
			if (k in t) return t[k];
			if (k === 'createRadialGradient' || k === 'createLinearGradient')
				return (...args: number[]) => {
					const g = { args, stops: [] as Array<[number, string]> };
					grads.push(g);
					return { addColorStop: (o: number, c: string) => g.stops.push([o, c]) };
				};
			if (k === 'stroke') return () => (strokes += 1);
			if (k === 'drawImage') return () => (images += 1);
			if (k === 'ellipse')
				return (_x: number, _y: number, rx: number) => ellipses.push({ rx, fill: t.fillStyle });
			if (k === 'moveTo' || k === 'lineTo')
				return (x: number, y: number) => {
					points.push([x, y]);
					tips.push([x, y]);
				};
			if (k === 'quadraticCurveTo')
				return (a: number, b: number, x: number, y: number) => {
					points.push([a, b], [x, y]);
					tips.push([x, y]);
				};
			if (k === 'bezierCurveTo')
				return (a: number, b: number, c: number, d: number, x: number, y: number) => {
					points.push([a, b], [c, d], [x, y]);
					tips.push([x, y]);
				};
			if (k === 'arc')
				return (x: number, y: number, r: number) => {
					points.push([x + r, y], [x - r, y]);
					tips.push([x + r, y], [x - r, y]);
				};
			return () => {};
		},
		set: (t, k: string, v) => {
			t[k] = v;
			return true;
		}
	}) as unknown as CanvasRenderingContext2D;
	return { ctx, points, tips, grads, ellipses, strokes: () => strokes, images: () => images };
}

const reach = (points: Array<[number, number]>): number =>
	Math.max(...points.map(([x, y]) => Math.hypot(x, y)));

class SunProbe extends PacmanHero {
	aura(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		this.drawAura(ctx, R, p);
	}
	behind(ctx: CanvasRenderingContext2D, R: number, k: number): void {
		this.drawBehind(ctx, R, k);
	}
}

class MsProbe extends MsPacmanHero {
	paint(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		this.decorate(ctx, R, p);
	}
	worn(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		this.drawWorn(ctx, R, p, 0, -1);
	}
}

/** Runs him at full power so the solar wind and the rage are fully on. */
function raging(): SunProbe {
	const h = new SunProbe();
	h.setRadius(10);
	for (let i = 0; i < 60; i++) {
		h.update(DT, { x: i * 5, y: 0, angle: 0, moving: true, power: true, ending: false });
	}
	return h;
}

describe('the contained rage', () => {
	it('keeps the corona within the tile even at full power on the run', () => {
		const rec = record();
		raging().aura(rec.ctx, 10, 1);
		// the 1.45 radii cap plus the solar wind's shear on the side rays
		const max = reach(rec.tips);
		expect(max).toBeLessThanOrEqual(15.5);
		expect(max).toBeGreaterThan(13);
	});

	it('keeps the flare between the rays short', () => {
		const rec = record();
		raging().behind(rec.ctx, 10, 1);
		expect(reach(rec.points)).toBeLessThanOrEqual(13);
	});
});

describe('her light', () => {
	it('burns light enough to read at a tile', () => {
		const rec = record();
		new MsProbe().paint(rec.ctx, 10, 0);
		const base = rec.grads.find(
			(g) => g.args[2] === 0 && Math.abs(g.args[0] + 1) < 0.01 && g.args[5] > 9
		);
		expect(base).toBeDefined();
		const m = /rgba?\((\d+),(\d+),(\d+)/.exec(base?.stops[0][1] ?? '');
		expect(m).not.toBeNull();
		const lum = 0.2126 * Number(m?.[1]) + 0.7152 * Number(m?.[2]) + 0.0722 * Number(m?.[3]);
		expect(lum).toBeGreaterThanOrEqual(100);
	});

	it('grows the eye at tile size so it reads', () => {
		const rec = record();
		new MsProbe().worn(rec.ctx, 10, 0);
		const white = rec.ellipses.filter((e) => e.fill === 'rgba(255,250,252,1)');
		expect(white.length).toBeGreaterThan(0);
		expect(Math.max(...white.map((e) => e.rx))).toBeGreaterThanOrEqual(2.5);
	});
});
