// The quarantine zone (DESIGN.md §7a): a stepped block of tiles, walls and corridors alike, like a
// piece of a mosaic. A rectangle of tiles round a point ahead of the hero, kept inside the maze,
// each corner cut by a staircase of its own (its depth, and its step 1 or 2 tiles wide), so no two
// zones look alike. A wall island is never cut: it goes into the zone whole (when most of it lies
// inside) or stays out whole, and the lair with its ring is one such island, so the outline
// follows a block's contour and turns at its end. The void outside the maze is never in. Where the
// outline crosses a corridor there is a door: the film that holds the hero stands there.
export type ZoneKind = 'open' | 'wall' | 'void' | 'lair';

/** A way out of the zone: its last tile and the direction across the outline. */
export interface ZoneDoor {
	readonly x: number;
	readonly y: number;
	readonly dx: number;
	readonly dy: number;
}

export interface ZonePlan {
	/** The tiles inside, as `y * width + x`. */
	readonly tiles: ReadonlySet<number>;
	readonly width: number;
	/** The outline through walls and the like: a zone tile's side, `[x, y, dx, dy]`. */
	readonly edges: ReadonlyArray<readonly [number, number, number, number]>;
	readonly doors: readonly ZoneDoor[];
	/** The rectangle's centre, in tiles (cell centres at x + 0.5). */
	readonly cx: number;
	readonly cy: number;
}

/** Wall blocks larger than this are the maze's long walls: cut like anything else. */
export const ISLE_MAX = 45;

const DIRS = [
	[0, -1],
	[0, 1],
	[-1, 0],
	[1, 0]
] as const;

interface Corner {
	readonly depth: number;
	readonly kx: number;
	readonly ky: number;
}

/**
 * The zone round `at`, `size` tiles a side at most (`[min, max]`), the hero's tile always inside.
 * Null when the maze gives it fewer than two doors.
 */
export function planZone(
	kind: (x: number, y: number) => ZoneKind,
	width: number,
	height: number,
	hero: { readonly x: number; readonly y: number },
	at: { readonly x: number; readonly y: number },
	size: readonly [number, number],
	random: () => number
): ZonePlan | null {
	const span = size[1] - size[0] + 1;
	const w = Math.min(width, size[0] + Math.floor(random() * span));
	const h = Math.min(height, size[0] + Math.floor(random() * span));
	const x0 = Math.max(0, Math.min(width - w, at.x - Math.floor(w / 2)));
	const y0 = Math.max(0, Math.min(height - h, at.y - Math.floor(h / 2)));
	const cut = (c: Corner, a: number, b: number) =>
		Math.floor(a / c.kx) + Math.floor(b / c.ky) < c.depth;
	const corners: Corner[] = [0, 1, 2, 3].map(() => ({
		depth: 1 + Math.floor(random() * 5),
		kx: 1 + Math.floor(random() * 2),
		ky: 1 + Math.floor(random() * 2)
	}));
	const block = (cs: readonly Corner[]): Set<number> => {
		const tiles = new Set<number>();
		for (let y = y0; y < y0 + h; y += 1)
			for (let x = x0; x < x0 + w; x += 1) {
				const l = x - x0;
				const r = x0 + w - 1 - x;
				const t = y - y0;
				const b = y0 + h - 1 - y;
				if (cut(cs[0], l, t) || cut(cs[1], r, t) || cut(cs[2], l, b) || cut(cs[3], r, b)) continue;
				tiles.add(y * width + x);
			}
		return tiles;
	};
	let tiles = block(corners);
	// a corner cut must not take the hero's own tile: then the block is whole
	if (!tiles.has(hero.y * width + hero.x)) {
		tiles = block(corners.map(() => ({ depth: 0, kx: 1, ky: 1 })));
	}
	const inGrid = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height;
	// the islands: each wall block in or out as a whole; the lair with its ring is one block
	const seen = new Set<number>();
	const settle = (isle: readonly number[]) => {
		const inside = isle.filter((k) => tiles.has(k)).length;
		for (const k of isle) {
			if (inside * 2 >= isle.length) tiles.add(k);
			else tiles.delete(k);
		}
	};
	let [lx0, ly0, lx1, ly1] = [width, height, -1, -1];
	for (let y = 0; y < height; y += 1)
		for (let x = 0; x < width; x += 1)
			if (kind(x, y) === 'lair')
				[lx0, ly0, lx1, ly1] = [
					Math.min(lx0, x),
					Math.min(ly0, y),
					Math.max(lx1, x),
					Math.max(ly1, y)
				];
	const lair: number[] = [];
	for (let y = Math.max(0, ly0 - 1); y <= Math.min(height - 1, ly1 + 1); y += 1)
		for (let x = Math.max(0, lx0 - 1); x <= Math.min(width - 1, lx1 + 1); x += 1) {
			lair.push(y * width + x);
			seen.add(y * width + x);
		}
	if (lair.length) settle(lair);
	for (let y = 0; y < height; y += 1)
		for (let x = 0; x < width; x += 1) {
			if (kind(x, y) !== 'wall' || seen.has(y * width + x)) continue;
			const isle = [y * width + x];
			seen.add(y * width + x);
			for (let i = 0; i < isle.length; i += 1) {
				for (const [dx, dy] of DIRS) {
					const nx = (isle[i] % width) + dx;
					const ny = Math.floor(isle[i] / width) + dy;
					if (!inGrid(nx, ny) || kind(nx, ny) !== 'wall' || seen.has(ny * width + nx)) continue;
					seen.add(ny * width + nx);
					isle.push(ny * width + nx);
				}
			}
			if (isle.length <= ISLE_MAX) settle(isle);
		}
	for (const k of [...tiles])
		if (kind(k % width, Math.floor(k / width)) === 'void') tiles.delete(k);
	tiles.add(hero.y * width + hero.x);
	const doors: ZoneDoor[] = [];
	const edges: Array<[number, number, number, number]> = [];
	for (const k of tiles) {
		const x = k % width;
		const y = Math.floor(k / width);
		for (const [dx, dy] of DIRS) {
			const nx = x + dx;
			const ny = y + dy;
			// the maze's rim closes it
			if (!inGrid(nx, ny) || kind(nx, ny) === 'void' || tiles.has(ny * width + nx)) continue;
			if (kind(x, y) === 'open' && kind(nx, ny) === 'open') doors.push({ x, y, dx, dy });
			else edges.push([x, y, dx, dy]);
		}
	}
	if (doors.length < 2) return null;
	return { tiles, width, edges, doors, cx: x0 + w / 2, cy: y0 + h / 2 };
}

/**
 * Two projectors' posts: the doors' last tiles nearest the two sides of the line from the zone's
 * centre to the hero (the first side first), never the same tile.
 */
export function zoneSpots(
	plan: ZonePlan,
	hero: { readonly x: number; readonly y: number },
	moving: boolean
): Array<{ x: number; y: number; a: number }> {
	const toHim = Math.atan2(hero.y + 0.5 - plan.cy, hero.x + 0.5 - plan.cx);
	const base = moving && Number.isFinite(toHim) ? toHim : 0;
	const spots: Array<{ x: number; y: number; a: number }> = [];
	for (const want of [base + Math.PI / 2, base - Math.PI / 2]) {
		let best: { x: number; y: number; a: number; score: number } | null = null;
		for (const d of plan.doors) {
			if (spots.some((p) => p.x === d.x && p.y === d.y)) continue;
			const a = Math.atan2(d.y + 0.5 - plan.cy, d.x + 0.5 - plan.cx);
			const score = Math.abs(Math.atan2(Math.sin(a - want), Math.cos(a - want)));
			if (!best || score < best.score) best = { x: d.x, y: d.y, a, score };
		}
		if (best) spots.push({ x: best.x, y: best.y, a: best.a });
	}
	return spots;
}
