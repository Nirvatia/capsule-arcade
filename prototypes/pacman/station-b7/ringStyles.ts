// Candidate for the quarantine zone (prototype, throwaway): the owner's pick of the ring's look,
// the bile film, on a zone of tiles instead of a circle: a stepped figure, walls and corridors
// alike, like a piece of a mosaic (every corner cut by a staircase of its own, so it differs from
// one part of the maze to another; the maze's rim cuts it too). Its outline is the film: thin
// along the tile edges through the walls, a bright curtain where it crosses a corridor and holds
// the hero. No plugs, no roots in the walls.
import type { GhostKind } from '../../../src/games/pacman/logic/actors/GhostModel';

const TAU = Math.PI * 2;
const hash = (a: number, b: number) => {
	const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
	return s - Math.floor(s);
};

/** A corridor leaving the zone: the zone's last tile and the way out across the film. */
export interface Door {
	readonly x: number;
	readonly y: number;
	readonly dx: number;
	readonly dy: number;
	/** The thin one: he can push through it. */
	readonly weak: boolean;
}

export interface Zone {
	readonly tiles: ReadonlySet<number>;
	readonly W: number;
	readonly doors: readonly Door[];
	/** The rest of the outline, through the walls: [x, y, dx, dy] of a zone tile's side. */
	readonly edges: ReadonlyArray<readonly [number, number, number, number]>;
	posts: Array<{ kind: GhostKind; x: number; y: number; a: number; charge: number }>;
	lit: boolean;
	push: number;
	broken: boolean;
}

export interface ZoneLook {
	readonly guide: number;
	readonly charge: number;
	readonly lit: number;
	readonly pressed: Door | null;
	readonly press: number;
}

export interface ZoneLayout {
	readonly tileSize: number;
	readonly offsetX: number;
	readonly offsetY: number;
}

/** Wall blocks larger than this are the maze's long walls: cut, not kept whole. */
const ISLE_MAX = 45;

const DIRS = [
	[0, -1],
	[0, 1],
	[-1, 0],
	[1, 0]
] as const;

/**
 * The zone round a tile: a block of 9-11 tiles a side kept inside the maze, each corner cut by a
 * staircase (its depth and its step, 1 or 2 tiles wide, drawn by the seed), so no two look alike.
 * A wall island is never cut: it goes into the zone whole (when most of it lies inside) or stays
 * out whole, so the outline follows its contour and turns at its end. The void outside the
 * maze is never in.
 */
export function planZone(
	kind: (x: number, y: number) => 'open' | 'wall' | 'void' | 'lair',
	W: number,
	H: number,
	tx: number,
	ty: number,
	seed: number
): Zone {
	const w = 9 + Math.floor(hash(seed, 1) * 3);
	const h = 9 + Math.floor(hash(seed, 2) * 3);
	const x0 = Math.max(0, Math.min(W - w, tx - Math.floor(w / 2)));
	const y0 = Math.max(0, Math.min(H - h, ty - Math.floor(h / 2)));
	const corner = [0, 1, 2, 3].map((i) => ({
		depth: 1 + Math.floor(hash(seed, 10 + i) * 5),
		kx: 1 + Math.floor(hash(seed, 20 + i) * 2),
		ky: 1 + Math.floor(hash(seed, 30 + i) * 2)
	}));
	const tiles = new Set<number>();
	for (let y = y0; y < y0 + h; y++)
		for (let x = x0; x < x0 + w; x++) {
			const fromL = x - x0;
			const fromR = x0 + w - 1 - x;
			const fromT = y - y0;
			const fromB = y0 + h - 1 - y;
			const cut = (c: { depth: number; kx: number; ky: number }, dx: number, dy: number) =>
				Math.floor(dx / c.kx) + Math.floor(dy / c.ky) < c.depth;
			if (cut(corner[0], fromL, fromT) || cut(corner[1], fromR, fromT)) continue;
			if (cut(corner[2], fromL, fromB) || cut(corner[3], fromR, fromB)) continue;
			tiles.add(y * W + x);
		}
	const open = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && kind(x, y) === 'open';
	// the islands: each wall block, in or out as a whole; the lair with its ring is one block
	const seen = new Set<number>();
	const lair: number[] = [];
	let [lx0, ly0, lx1, ly1] = [W, H, -1, -1];
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++)
			if (kind(x, y) === 'lair') [lx0, ly0, lx1, ly1] = [Math.min(lx0, x), Math.min(ly0, y), Math.max(lx1, x), Math.max(ly1, y)];
	for (let y = Math.max(0, ly0 - 1); y <= Math.min(H - 1, ly1 + 1); y++)
		for (let x = Math.max(0, lx0 - 1); x <= Math.min(W - 1, lx1 + 1); x++) {
			lair.push(y * W + x);
			seen.add(y * W + x);
		}
	if (lair.length) {
		const inside = lair.filter((k) => tiles.has(k)).length;
		for (const k of lair) {
			if (inside * 2 >= lair.length) tiles.add(k);
			else tiles.delete(k);
		}
	}
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++) {
			if (kind(x, y) !== 'wall' || seen.has(y * W + x)) continue;
			const isle = [y * W + x];
			seen.add(y * W + x);
			for (let i = 0; i < isle.length; i++) {
				const ix = isle[i] % W;
				const iy = Math.floor(isle[i] / W);
				for (const [dx, dy] of DIRS) {
					const nx = ix + dx;
					const ny = iy + dy;
					if (nx < 0 || ny < 0 || nx >= W || ny >= H || kind(nx, ny) !== 'wall') continue;
					if (seen.has(ny * W + nx)) continue;
					seen.add(ny * W + nx);
					isle.push(ny * W + nx);
				}
			}
			if (isle.length > ISLE_MAX) continue; // the maze's long walls are cut like anything else
			const inside = isle.filter((k) => tiles.has(k)).length;
			for (const k of isle) {
				if (inside * 2 >= isle.length) tiles.add(k);
				else tiles.delete(k);
			}
		}
	for (const k of [...tiles]) if (kind(k % W, Math.floor(k / W)) === 'void') tiles.delete(k);
	const doors: Door[] = [];
	const edges: Array<[number, number, number, number]> = [];
	for (const k of tiles) {
		const x = k % W;
		const y = Math.floor(k / W);
		for (const [dx, dy] of DIRS) {
			const nx = x + dx;
			const ny = y + dy;
			if (nx < 0 || ny < 0 || nx >= W || ny >= H || kind(nx, ny) === 'void') continue; // the rim closes it
			if (tiles.has(ny * W + nx)) continue;
			if (open(x, y) && open(nx, ny)) doors.push({ x, y, dx, dy, weak: false });
			else edges.push([x, y, dx, dy]);
		}
	}
	const thin = doors.length > 1 ? 1 : 0;
	const marked = doors.map((d, i) => (i === thin ? { ...d, weak: true } : d));
	// two projectors at the doors farthest apart
	let best: [Door, Door] | null = null;
	let far = -1;
	for (const a of marked)
		for (const b of marked) {
			const d = Math.hypot(a.x - b.x, a.y - b.y);
			if (d > far) {
				far = d;
				best = [a, b];
			}
		}
	const posts = (['BLINKY', 'PINKY'] as GhostKind[]).map((kind, i) => {
		const d = (best as [Door, Door])[i];
		return { kind, x: d.x, y: d.y, a: 0, charge: 0 };
	});
	return { tiles, W, doors: marked, edges, posts, lit: false, push: 0, broken: false };
}

const BILE = {
	dark: '14,20,6',
	body: '206,216,112',
	light: '250,252,204',
	glow: '170,204,50',
	zone: '70,96,20'
};

/** A film across a corridor, in local space: u along it (wall to wall), v the way out. */
function film(
	c: CanvasRenderingContext2D,
	S: number,
	d: Door,
	broken: boolean,
	ph: ZoneLook,
	t: number,
	seed: number
): void {
	const grown = ph.lit > 0 ? 1 : ph.charge;
	if (grown <= 0) return;
	const alive = ph.lit > 0 ? ph.lit : 1;
	const h = S * 0.5;
	const hit = ph.pressed === d ? ph.press : 0;
	const bulge = S * (0.06 + 0.3 * hit);
	const flick = d.weak ? 0.7 + 0.3 * Math.sin(t * 9 + seed * 3) * Math.sin(t * 2.3) : 1;
	const gap = d.weak ? (broken ? S * 0.34 : S * 0.1) : 0;
	const reach = h * grown;
	const pieces = (
		[
			[-h, Math.min(-gap, -h + reach)],
			[Math.max(gap, h - reach), h]
		] as Array<[number, number]>
	).filter(([a, b]) => b > a);
	const v = (u: number) => bulge * (1 - (u / h) ** 2) + Math.sin(u * 0.35 + t * 1.6 + seed) * S * 0.02;
	const w = (d.weak ? 0.07 : 0.1) * S * (1 + 0.1 * Math.sin(t * 2.4 + seed));
	c.save();
	c.globalAlpha *= alive * flick;
	c.lineCap = 'round';
	c.lineJoin = 'round';
	for (const [a, b] of pieces) {
		const path = () => {
			c.beginPath();
			for (let i = 0; i <= 10; i++) {
				const u = a + ((b - a) * i) / 10;
				if (i) c.lineTo(u, v(u));
				else c.moveTo(u, v(u));
			}
		};
		// the curtain: a soft glow spilling both ways
		c.globalCompositeOperation = 'lighter';
		path();
		c.strokeStyle = `rgba(${BILE.glow}, ${0.2 + 0.18 * hit})`;
		c.lineWidth = w * 5;
		c.stroke();
		c.globalCompositeOperation = 'source-over';
		path();
		c.strokeStyle = `rgba(${BILE.dark}, 0.9)`;
		c.lineWidth = w * 2.2;
		c.stroke();
		path();
		c.strokeStyle = `rgba(${BILE.body}, 0.9)`;
		c.lineWidth = w * 1.4;
		c.stroke();
		path();
		c.strokeStyle = `rgba(${BILE.light}, ${0.75 + 0.25 * Math.sin(t * 3.1 + seed) + 0.3 * hit})`;
		c.lineWidth = Math.max(1, w * 0.45);
		c.stroke();
		// fine veins reaching back into the zone
		for (let k = 0; k < 4; k++) {
			const u = a + (b - a) * (0.15 + 0.7 * hash(seed * 7 + k, 1));
			const len = S * (0.35 + 0.55 * hash(seed * 7 + k, 2));
			const sway = Math.sin(t * 0.8 + k + seed) * S * 0.07;
			c.beginPath();
			c.moveTo(u, v(u));
			c.quadraticCurveTo(u + sway, v(u) - len * 0.5, u + sway * 1.6, v(u) - len);
			c.strokeStyle = `rgba(${BILE.body}, 0.3)`;
			c.lineWidth = Math.max(1, S * 0.025);
			c.stroke();
		}
	}
	if (d.weak && pieces.length === 2) {
		c.strokeStyle = `rgba(${BILE.light}, 0.55)`;
		c.lineWidth = Math.max(1, S * 0.022);
		for (const e of [-1, 1]) {
			c.beginPath();
			c.moveTo(e * gap, v(0) - S * 0.1);
			c.lineTo(e * gap * 0.35, v(0) + S * 0.06);
			c.stroke();
		}
	}
	c.restore();
}

/** The whole zone: the warning, the tint, the stepped outline, the films across the corridors. */
export function drawZone(
	c: CanvasRenderingContext2D,
	L: ZoneLayout,
	z: Zone,
	ph: ZoneLook,
	t: number
): void {
	const S = L.tileSize;
	const px = (x: number) => L.offsetX + x * S;
	const py = (y: number) => L.offsetY + y * S;
	const grown = ph.lit > 0 ? 1 : ph.charge;
	const alive = ph.lit > 0 ? ph.lit : 1;
	const all = [...z.edges, ...z.doors.map((d) => [d.x, d.y, d.dx, d.dy] as const)];
	const side = (x: number, y: number, dx: number, dy: number) => {
		const ex = px(x + 0.5 + dx * 0.5);
		const ey = py(y + 0.5 + dy * 0.5);
		c.moveTo(ex - dy * S * 0.5, ey + dx * S * 0.5);
		c.lineTo(ex + dy * S * 0.5, ey - dx * S * 0.5);
	};
	const fillTiles = (style: string) => {
		c.fillStyle = style;
		for (const k of z.tiles) c.fillRect(px(k % z.W) - 0.5, py(Math.floor(k / z.W)) - 0.5, S + 1, S + 1);
	};
	c.save();
	c.lineCap = 'round';
	c.lineJoin = 'round';
	// the warning: the whole coming zone at once, an amber dashed outline, fading as it charges
	if (ph.guide > 0) {
		const pulse = 0.5 + 0.5 * Math.sin(t * TAU * 0.9);
		const fade = ph.guide * (1 - 0.7 * (ph.lit > 0 ? 1 : ph.charge));
		fillTiles(`rgba(150, 120, 40, ${(0.09 + 0.05 * pulse) * fade})`);
		c.setLineDash([S * 0.34, S * 0.22]);
		c.lineDashOffset = -t * S * 0.5;
		c.strokeStyle = `rgba(255, 190, 110, ${(0.5 + 0.35 * pulse) * fade})`;
		c.lineWidth = Math.max(1.5, S * 0.07);
		c.beginPath();
		for (const [x, y, dx, dy] of all) side(x, y, dx, dy);
		c.stroke();
		c.setLineDash([]);
	}
	if (grown > 0) {
		if (ph.lit > 0) {
			// the zone inside: a faint sick tint, the hive's slow beat sweeping through it
			const beat = 0.5 + 0.5 * Math.sin((t / 6) * TAU);
			fillTiles(`rgba(${BILE.zone}, ${(0.2 + 0.06 * beat) * ph.lit})`);
		}
		// the outline through the walls: a soft glow, a thin bright film along the tile edges
		c.globalAlpha = alive * grown;
		c.beginPath();
		for (const [x, y, dx, dy] of z.edges) side(x, y, dx, dy);
		c.globalCompositeOperation = 'lighter';
		c.strokeStyle = `rgba(${BILE.glow}, 0.22)`;
		c.lineWidth = S * 0.34;
		c.stroke();
		c.globalCompositeOperation = 'source-over';
		c.strokeStyle = `rgba(${BILE.dark}, 0.85)`;
		c.lineWidth = Math.max(2, S * 0.1);
		c.stroke();
		c.strokeStyle = `rgba(${BILE.body}, 0.9)`;
		c.lineWidth = Math.max(1.5, S * 0.06);
		c.stroke();
		c.strokeStyle = `rgba(${BILE.light}, ${0.6 + 0.2 * Math.sin(t * 2.4)})`;
		c.lineWidth = Math.max(1, S * 0.022);
		c.stroke();
		// fine veins reaching inward from the outline
		c.strokeStyle = `rgba(${BILE.body}, 0.26)`;
		c.lineWidth = Math.max(1, S * 0.025);
		z.edges.forEach(([x, y, dx, dy], i) => {
			if (hash(i, 5) < 0.45) return;
			const ex = px(x + 0.5 + dx * 0.5) + (-dy) * S * (hash(i, 6) - 0.5) * 0.6;
			const ey = py(y + 0.5 + dy * 0.5) + dx * S * (hash(i, 6) - 0.5) * 0.6;
			const len = S * (0.35 + 0.8 * hash(i, 7));
			const sway = Math.sin(t * 0.8 + i) * S * 0.08;
			c.beginPath();
			c.moveTo(ex, ey);
			c.quadraticCurveTo(ex - dx * len * 0.5 + dy * sway, ey - dy * len * 0.5 - dx * sway, ex - dx * len, ey - dy * len);
			c.stroke();
		});
		c.globalAlpha = 1;
		z.doors.forEach((d, i) => {
			c.save();
			c.translate(px(d.x + 0.5 + d.dx * 0.5), py(d.y + 0.5 + d.dy * 0.5));
			c.rotate(Math.atan2(d.dy, d.dx) - Math.PI / 2);
			film(c, S, d, z.broken, ph, t, hash(i, 9));
			c.restore();
		});
	}
	c.restore();
}
