import { describe, expect, it } from 'vitest';
import { handPoints } from './finaleArt';

describe('the slow tiles: hands out of the floor', () => {
	const S = 40;
	const OX = 100;
	const OY = 60;
	const tile = { c: 3, r: 4 };
	const x0 = OX + tile.c * S;
	const y0 = OY + tile.r * S;

	it('keep inside their tile at rest: the corridor’s wall and its rim are never reached', () => {
		for (let t = 0; t < 6; t += 0.37) {
			for (const h of handPoints(tile, OX, OY, S, t, null)) {
				// the arm and the palm with its fingers (0.14 of a tile) stay off the tile's edge
				for (const [x, y] of [
					[h.bx, h.by],
					[h.hx, h.hy]
				]) {
					expect(x - x0).toBeGreaterThanOrEqual(S * 0.18);
					expect(x0 + S - x).toBeGreaterThanOrEqual(S * 0.18);
					expect(y - y0).toBeGreaterThanOrEqual(S * 0.14);
					expect(y0 + S - y).toBeGreaterThanOrEqual(S * 0.14);
				}
			}
		}
	});

	it('reach for the hero on their tile, and only then', () => {
		const away = { x: tile.c + 3.5, y: tile.r + 0.5 };
		const on = { x: tile.c + 0.5, y: tile.r + 0.5 };
		const rest = handPoints(tile, OX, OY, S, 1, away);
		const grab = handPoints(tile, OX, OY, S, 1, on);
		// they grab at his feet
		const feetY = OY + on.y * S + S * 0.15;
		grab.forEach((h, i) => {
			expect(Math.abs(h.hy - feetY)).toBeLessThan(Math.abs(rest[i].hy - feetY));
		});
		expect(rest).toEqual(handPoints(tile, OX, OY, S, 1, null));
	});
});
