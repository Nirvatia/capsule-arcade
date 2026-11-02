// The world around a maze, shared by the season meadows and the hell: one maze tile is
// WORLD_TILE world units, the maze's top-left corner is the origin; cabins, pond, trees and
// the stream (water or lava) live around it, in the same seeded places in every world.

/** World units per maze tile. */
export const WORLD_TILE = 24;

const T = WORLD_TILE;

export type Rng = () => number;

export type WorldDecorKind =
	'cabin' | 'pond' | 'landmark' | 'lamp' | 'bridge' | 'tree' | 'rock' | 'bush' | 'fl';

export interface WorldDecor {
	k: WorldDecorKind;
	x: number;
	y: number;
	w?: number;
	h?: number;
	rx?: number;
	ry?: number;
	r?: number;
	ex?: number;
	pk?: boolean;
	s?: number;
	n?: number;
	c?: number;
}

/** Seeded per-tile generator (Park–Miller), identical to the mock-ups' `hs`. */
export function tileRandom(a: number, b: number): Rng {
	let s = (((a + 50) * 7919 + (b + 50) * 104729) % 2147483646) + 1;
	return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Stream centre line (world y for a world x). */
export function streamY(rows: number, x: number): number {
	return (rows + 4.7) * T + Math.sin(x / (9 * T)) * 2.5 * T + Math.sin(x / (3.7 * T) + 1) * 0.6 * T;
}

const decorCache = new Map<string, WorldDecor[]>();

/**
 * Fixed landmarks plus seeded scatter, sorted back to front. Shared by the bake and the
 * live layer. The two `landmark`s are each world's own (a season's ornament, the hell's
 * pentagrams); their keep-out radii (`landmarkEx`, in tiles) shift the scatter.
 */
export function worldDecor(
	rows: number,
	cols: number,
	landmarkEx: readonly [number, number]
): WorldDecor[] {
	const cacheKey = `${rows}x${cols}:${landmarkEx[0]},${landmarkEx[1]}`;
	const cached = decorCache.get(cacheKey);
	if (cached) {
		return cached;
	}
	const R = rows;
	const C = cols;
	const TY = 12.5 * T;
	let s = 91;
	const fixed: WorldDecor[] = [
		{ k: 'cabin', x: -8.5, y: 7, w: 7, h: 5, ex: 4.2 },
		{ k: 'cabin', x: 33.5, y: 19, w: 7, h: 5, ex: 4.2 },
		{ k: 'cabin', x: 23.5, y: -5, w: 6, h: 4.4, ex: 3.8 },
		{ k: 'pond', x: 1.5, y: -4.5, rx: 3.6, ry: 2.4, ex: 4.2 },
		{ k: 'landmark', x: -3.6, y: 3.2, r: 0.8, ex: landmarkEx[0] },
		{ k: 'landmark', x: 28.6, y: 23.5, r: 0.7, ex: landmarkEx[1] },
		{ k: 'lamp', x: -2, y: -2, ex: 1 },
		{ k: 'lamp', x: 27, y: -2, ex: 1 },
		{ k: 'lamp', x: -2, y: 28, ex: 1 },
		{ k: 'lamp', x: 27, y: 28, ex: 1 }
	];
	const P: WorldDecor[] = fixed.map((o) => {
		const q: WorldDecor = { ...o, x: o.x * T, y: o.y * T };
		for (const key of ['w', 'h', 'rx', 'ry', 'r', 'ex'] as const) {
			const v = o[key];
			if (v !== undefined) {
				q[key] = v * T;
			}
		}
		return q;
	});
	P.push({ k: 'bridge', x: 12.5 * T, y: streamY(R, 12.5 * T), ex: 2 * T });
	const g = () => (s = (s * 16807) % 2147483647) / 2147483647;
	const free = (x: number, y: number, m: number) =>
		!(x > -m && x < C * T + m && y > -m && y < R * T + m) &&
		Math.abs(y - streamY(R, x)) > 3.6 * T &&
		!(Math.abs(y - TY) < 2.4 * T && (x < 0 || x > C * T));
	const add = (
		k: WorldDecorKind,
		n: number,
		dist: number,
		m: number,
		f: () => Partial<WorldDecor>
	) => {
		let t = 0;
		let cnt = 0;
		while (cnt < n && t++ < 6000) {
			const x = (-34 + g() * (C + 68)) * T;
			const y = (-25 + g() * (R + 50)) * T;
			if (!free(x, y, m) || P.some((q) => Math.hypot(q.x - x, q.y - y) < dist + (q.ex || 0))) {
				continue;
			}
			P.push({ k, x, y, ...f() });
			cnt++;
		}
	};
	add('tree', 80, 5.5 * T, 4 * T, () => ({
		r: (1.5 + g() * 0.7) * T,
		pk: g() < 0.45,
		s: (g() * 99) | 0
	}));
	add('rock', 28, 3 * T, 3 * T, () => ({ r: (0.5 + g() * 0.4) * T }));
	add('bush', 44, 2.5 * T, 3 * T, () => ({ r: (0.6 + g() * 0.4) * T }));
	add('fl', 110, 2 * T, 2 * T, () => ({ n: 6 + ((g() * 6) | 0), c: g() }));
	P.sort((a, c) => a.y - c.y);
	decorCache.set(cacheKey, P);
	return P;
}
