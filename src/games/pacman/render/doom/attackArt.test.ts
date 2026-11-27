import { describe, expect, it } from 'vitest';
import { tar } from './attackArt';

/** A 2D context that records the clip rectangles. */
function recorder() {
	const clipRects: number[][] = [];
	let rects: number[][] = [];
	const target: Record<string, unknown> = {};
	const ctx = new Proxy(target, {
		get(_t, key: string) {
			if (key === 'beginPath') return () => (rects = []);
			if (key === 'rect') return (...r: number[]) => void rects.push(r);
			if (key === 'clip') return () => void clipRects.push(...rects);
			if (key in target) return target[key];
			return () => undefined;
		},
		set(_t, key: string, value) {
			target[key] = value;
			return true;
		}
	}) as unknown as CanvasRenderingContext2D;
	return { ctx, clipRects };
}

describe('the tar pool', () => {
	const S = 40;
	const OX = 100;
	const OY = 60;
	const tiles = [
		{ c: 2, r: 3 },
		{ c: 3, r: 3 },
		{ c: 3, r: 4 }
	];

	it('keeps clear of the tile’s edge: the corridor’s wall and its rim are never painted over', () => {
		const { ctx, clipRects } = recorder();
		tar(ctx, tiles, OX, OY, S, 1);
		expect(clipRects).toHaveLength(tiles.length);
		for (const [x, y, w, h] of clipRects) {
			const tile = tiles.find(
				(q) => Math.abs(OX + q.c * S - x) < S * 0.3 && Math.abs(OY + q.r * S - y) < S * 0.3
			);
			expect(tile).toBeDefined();
			// a margin of at least 4% of the tile on every side
			expect(x - (OX + (tile?.c ?? 0) * S)).toBeGreaterThanOrEqual(S * 0.04);
			expect(y - (OY + (tile?.r ?? 0) * S)).toBeGreaterThanOrEqual(S * 0.04);
			expect(OX + ((tile?.c ?? 0) + 1) * S - (x + w)).toBeGreaterThanOrEqual(S * 0.04);
			expect(OY + ((tile?.r ?? 0) + 1) * S - (y + h)).toBeGreaterThanOrEqual(S * 0.04);
		}
	});
});
