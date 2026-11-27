// The night forest, baked once per size (`DESIGN.md` §7b): a mossy floor with packed-earth trails
// soft at their edges, needles, pebbles and tufts, the maze's walls as pine hedges seen from above
// (every wall tile is four crowns on a regular lattice, so the thickets run neat and even along the
// trails), fences here and there, the scorched clearing of the lair, the lamp posts. The bake covers
// the whole screen, the forest going on past the maze's border; the light, the fog and the actors
// are drawn over it every frame (`NightwoodWorld`). All drawn in code.
import type { GridMatrix } from '../../config/gridConfig';
import { clearingOf, forestKind } from '../../logic/nightwood/nightwoodLamps';
import type { LampSpec } from '../../logic/nightwood/nightwoodLamps';
import { TAU, fbm, hash2, lerp, rng, smoothstep } from './noise';

type Ctx = CanvasRenderingContext2D;

export interface ForestLayout {
	/** Css px per tile and where the grid's top-left corner is on the screen. */
	readonly tile: number;
	readonly x: number;
	readonly y: number;
}

const canvasOf = (w: number, h: number): HTMLCanvasElement => {
	const c = document.createElement('canvas');
	c.width = Math.max(1, Math.round(w));
	c.height = Math.max(1, Math.round(h));
	return c;
};

/** Fills the (css-unit) rectangle by a colour function sampled every `cell` units, upscaled smooth. */
function noiseFill(
	c: Ctx,
	W: number,
	H: number,
	cell: number,
	fn: (x: number, y: number) => readonly [number, number, number]
): void {
	const w = Math.ceil(W / cell);
	const h = Math.ceil(H / cell);
	const small = canvasOf(w, h);
	const sc = small.getContext('2d') as Ctx;
	const img = sc.createImageData(w, h);
	for (let y = 0; y < h; y += 1) {
		for (let x = 0; x < w; x += 1) {
			const [r, g, b] = fn(x * cell, y * cell);
			const i = (y * w + x) * 4;
			img.data[i] = r;
			img.data[i + 1] = g;
			img.data[i + 2] = b;
			img.data[i + 3] = 255;
		}
	}
	sc.putImageData(img, 0, 0);
	c.save();
	c.imageSmoothingEnabled = true;
	c.imageSmoothingQuality = 'high';
	c.drawImage(small, 0, 0, W, H);
	c.restore();
}

/** One pine crown from above: a base, boughs in layers, the moon side paler. `simple` is the far forest. */
function crown(c: Ctx, x: number, y: number, R: number, seed: number, simple: boolean): void {
	const rnd = rng(seed);
	const base = c.createRadialGradient(x - R * 0.25, y - R * 0.3, R * 0.05, x, y, R);
	base.addColorStop(0, simple ? '#091510' : '#13281e');
	base.addColorStop(1, '#050d09');
	c.fillStyle = base;
	c.beginPath();
	c.arc(x, y, R * 0.94, 0, TAU);
	c.fill();
	const layers: Array<[string, string, number, number]> = simple
		? [['#07130d', '#0d2218', 8, 1]]
		: [
				['#0a1a12', '#10281c', 12, 1],
				['#112a1e', '#1a3d2c', 11, 0.72]
			];
	c.lineCap = 'round';
	layers.forEach(([dark, light, n, len], li) => {
		for (let i = 0; i < n; i += 1) {
			const a = (i / n) * TAU + rnd() * 0.35 + li * 0.4;
			const r1 = R * len * (0.86 + rnd() * 0.18);
			const bend = (rnd() - 0.5) * 0.4;
			const tx = x + Math.cos(a + bend) * r1;
			const ty = y + Math.sin(a + bend) * r1;
			const mx = x + Math.cos(a - bend * 0.6) * r1 * 0.55;
			const my = y + Math.sin(a - bend * 0.6) * r1 * 0.55;
			c.strokeStyle = dark;
			c.lineWidth = R * (0.26 - li * 0.05);
			c.beginPath();
			c.moveTo(x + Math.cos(a) * R * 0.1, y + Math.sin(a) * R * 0.1);
			c.quadraticCurveTo(mx, my, tx, ty);
			c.stroke();
			const facing = -Math.cos(a) * 0.55 - Math.sin(a) * 0.83;
			if (!simple && facing > 0.1) {
				c.strokeStyle = light;
				c.globalAlpha = 0.35 + 0.65 * facing;
				c.lineWidth = R * (0.15 - li * 0.03);
				c.beginPath();
				c.moveTo(mx, my);
				c.quadraticCurveTo((mx + tx) / 2 + 0.5, (my + ty) / 2, tx, ty);
				c.stroke();
				c.globalAlpha = 1;
			}
		}
	});
	c.fillStyle = '#04100a';
	c.beginPath();
	c.arc(x, y, R * 0.12, 0, TAU);
	c.fill();
}

export interface ForestBake {
	/** The forest over the whole screen, device-pixel sized. */
	readonly canvas: HTMLCanvasElement;
	/** The same forest tinted cold and brightened: the moonlight the dark never fully hides. */
	readonly moon: HTMLCanvasElement;
}

/** Bakes the forest over a `vw` × `vh` screen with the grid at `layout`. */
export function bakeForest(
	grid: GridMatrix,
	layout: ForestLayout,
	vw: number,
	vh: number,
	D: number,
	seed = 11
): ForestBake {
	const S = layout.tile;
	const canvas = canvasOf(vw * D, vh * D);
	const c = canvas.getContext('2d') as Ctx;
	c.scale(D, D);
	const rnd = rng(seed);
	const rows = grid.length;
	const cols = grid[0]?.length ?? 0;
	const kind = (x: number, y: number) =>
		x < 0 || y < 0 || x >= cols || y >= rows ? 'void' : forestKind(grid[y]?.[x]);
	const near = (x: number, y: number, k: string) =>
		[
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1]
		].some(([dx, dy]) => kind(x + dx, y + dy) === k);
	const px = (tx: number) => layout.x + tx * S;
	const py = (ty: number) => layout.y + ty * S;
	const tx0 = Math.floor(-layout.x / S) - 1;
	const tx1 = Math.ceil((vw - layout.x) / S) + 1;
	const ty0 = Math.floor(-layout.y / S) - 1;
	const ty1 = Math.ceil((vh - layout.y) / S) + 1;

	// the floor: moss and needle litter in broad soft patches
	noiseFill(c, vw, vh, 3, (x, y) => {
		const n1 = fbm(x / 110, y / 110, 1, 3);
		const n2 = fbm(x / 26, y / 26, 2, 3);
		const dry = smoothstep(0.55, 0.8, n2) * 0.7;
		return [
			lerp(lerp(13, 27, n1), 46, dry),
			lerp(lerp(23, 41, n1), 38, dry),
			lerp(lerp(18, 28, n1), 22, dry)
		];
	});

	// the trails: packed earth, its edges soft
	const mask = canvasOf(vw * D, vh * D);
	const mc = mask.getContext('2d') as Ctx;
	mc.fillStyle = '#fff';
	const trail = canvasOf(vw * D, vh * D);
	const tc = trail.getContext('2d') as Ctx;
	tc.scale(D, D);
	for (let y = 0; y < rows; y += 1) {
		for (let x = 0; x < cols; x += 1) {
			if (kind(x, y) === 'open') {
				mc.fillRect(px(x) * D - 1, py(y) * D - 1, S * D + 2, S * D + 2);
			}
		}
	}
	noiseFill(tc, vw, vh, 2, (x, y) => {
		const n = fbm(x / 34, y / 34, 3, 3);
		const f = fbm(x / 7, y / 7, 4, 2);
		return [lerp(50, 78, n) + f * 12, lerp(43, 65, n) + f * 10, lerp(32, 46, n) + f * 7];
	});
	tc.setTransform(1, 0, 0, 1, 0, 0);
	tc.globalCompositeOperation = 'destination-in';
	tc.filter = `blur(${S * D * 0.11}px)`;
	tc.drawImage(mask, 0, 0);
	tc.filter = 'none';
	c.drawImage(trail, 0, 0, vw, vh);

	// needles, pebbles and tufts
	c.lineCap = 'round';
	for (let i = 0; i < (vw * vh) / 90; i += 1) {
		const x = rnd() * vw;
		const y = rnd() * vh;
		const a = rnd() * TAU;
		const l = 2 + rnd() * 3.5;
		c.strokeStyle = rnd() < 0.6 ? 'rgba(74,58,30,0.5)' : 'rgba(30,60,36,0.55)';
		c.lineWidth = 0.8;
		c.beginPath();
		c.moveTo(x, y);
		c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
		c.stroke();
	}
	for (let y = 0; y < rows; y += 1) {
		for (let x = 0; x < cols; x += 1) {
			if (kind(x, y) !== 'open') {
				continue;
			}
			for (let i = 0; i < 3; i += 1) {
				const qx = px(x + rnd());
				const qy = py(y + rnd());
				const r = 0.7 + rnd() * 1.4;
				c.fillStyle = 'rgba(0,0,0,0.35)';
				c.beginPath();
				c.ellipse(qx + 0.6, qy + 0.8, r, r * 0.7, 0, 0, TAU);
				c.fill();
				c.fillStyle = rnd() < 0.5 ? 'rgba(124,126,118,0.7)' : 'rgba(92,86,74,0.8)';
				c.beginPath();
				c.ellipse(qx, qy, r, r * 0.7, 0, 0, TAU);
				c.fill();
			}
			if (near(x, y, 'wall') && rnd() < 0.55) {
				const qx = px(x + 0.15 + rnd() * 0.7);
				const qy = py(y + 0.15 + rnd() * 0.7);
				c.strokeStyle = 'rgba(54,86,44,0.8)';
				c.lineWidth = 1;
				for (let k = 0; k < 4; k += 1) {
					c.beginPath();
					c.moveTo(qx + k - 1.5, qy);
					c.lineTo(qx + (k - 1.5) * 1.8, qy - 3 - rnd() * 3);
					c.stroke();
				}
			}
		}
	}

	// the lair's clearing: scorched ground, cracks reaching out
	const lair = clearingOf(grid);
	{
		const cx = px(lair.x);
		const cy = py(lair.y);
		const g = c.createRadialGradient(cx, cy, 0, cx, cy, S * 3.1);
		g.addColorStop(0, 'rgba(4,6,9,0.96)');
		g.addColorStop(0.6, 'rgba(10,13,17,0.85)');
		g.addColorStop(1, 'rgba(10,13,17,0)');
		c.fillStyle = g;
		c.beginPath();
		c.arc(cx, cy, S * 3.1, 0, TAU);
		c.fill();
		c.strokeStyle = 'rgba(0,0,0,0.65)';
		c.lineWidth = 1.4;
		for (let i = 0; i < 12; i += 1) {
			const a = (i / 12) * TAU + rnd() * 0.3;
			let qx = cx + Math.cos(a) * S * 0.6;
			let qy = cy + Math.sin(a) * S * 0.6;
			c.beginPath();
			c.moveTo(qx, qy);
			for (let k = 0; k < 3; k += 1) {
				qx += Math.cos(a + (rnd() - 0.5) * 0.7) * S * 0.45;
				qy += Math.sin(a + (rnd() - 0.5) * 0.7) * S * 0.45;
				c.lineTo(qx, qy);
			}
			c.stroke();
		}
	}

	// the hedges: four crowns to a wall tile on a regular lattice, a hair of jitter; the far forest
	// beyond the border is plainer. Shadows first, then the crowns from the back to the front.
	interface Crown {
		x: number;
		y: number;
		R: number;
		seed: number;
		simple: boolean;
	}
	const crowns: Crown[] = [];
	for (let ty = ty0; ty <= ty1; ty += 1) {
		for (let tx = tx0; tx <= tx1; tx += 1) {
			const k = kind(tx, ty);
			if (k !== 'wall' && k !== 'void') {
				continue;
			}
			const far = k === 'void' && (tx < -1 || ty < -1 || tx > cols || ty > rows);
			for (const [ox, oy] of [
				[-0.25, -0.25],
				[0.25, -0.25],
				[-0.25, 0.25],
				[0.25, 0.25]
			]) {
				const h = hash2(tx * 2 + ox * 4, ty * 2 + oy * 4);
				crowns.push({
					x: px(tx + 0.5 + ox) + (h - 0.5) * S * 0.05,
					y: py(ty + 0.5 + oy) + (hash2(tx * 7 + oy * 4, ty * 5 + ox * 4) - 0.5) * S * 0.05,
					R: S * (0.36 + (h - 0.5) * 0.05) * (k === 'void' ? 1.1 : 1),
					seed: Math.floor(h * 1e6),
					simple: far || k === 'void'
				});
			}
		}
	}
	crowns.sort((a, b) => a.y - b.y);
	for (const t of crowns) {
		const sx = t.x + t.R * 0.2;
		const sy = t.y + t.R * 0.26;
		const g = c.createRadialGradient(sx, sy, 0, sx, sy, t.R * 1.1);
		g.addColorStop(0, 'rgba(0,0,0,0.45)');
		g.addColorStop(1, 'rgba(0,0,0,0)');
		c.fillStyle = g;
		c.beginPath();
		c.arc(sx, sy, t.R * 1.1, 0, TAU);
		c.fill();
	}
	for (const t of crowns) {
		crown(c, t.x, t.y, t.R, t.seed, t.simple);
	}

	// fences along some trails: a rail between three posts, on the thicket's edge
	for (let y = 0; y < rows; y += 1) {
		for (let x = 0; x < cols; x += 1) {
			if (kind(x, y) !== 'wall') {
				continue;
			}
			for (const [dx, dy] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1]
			]) {
				if (kind(x + dx, y + dy) !== 'open' || hash2(x * 3 + dx, y * 5 + dy) > 0.14) {
					continue;
				}
				const ex = px(x + 0.5 + dx * 0.5);
				const ey = py(y + 0.5 + dy * 0.5);
				const ux = -dy;
				const uy = dx;
				c.strokeStyle = 'rgba(0,0,0,0.4)';
				c.lineWidth = 3.4;
				c.beginPath();
				c.moveTo(ex + ux * S * 0.5 + 1, ey + uy * S * 0.5 + 1.5);
				c.lineTo(ex - ux * S * 0.5 + 1, ey - uy * S * 0.5 + 1.5);
				c.stroke();
				c.strokeStyle = '#4a3622';
				c.lineWidth = 2.4;
				c.beginPath();
				c.moveTo(ex + ux * S * 0.5, ey + uy * S * 0.5);
				c.lineTo(ex - ux * S * 0.5, ey - uy * S * 0.5);
				c.stroke();
				c.strokeStyle = '#8a6e48';
				c.lineWidth = 0.8;
				c.stroke();
				for (const p of [-0.42, 0, 0.42]) {
					c.fillStyle = '#2c1f12';
					c.fillRect(ex + ux * S * p - 2.2, ey + uy * S * p - 2.2, 4.4, 4.4);
					c.fillStyle = '#7a5e3c';
					c.fillRect(ex + ux * S * p - 1.6, ey + uy * S * p - 1.8, 3, 2.2);
				}
			}
		}
	}

	// the moonlight: the forest again, tinted cold and brightened
	const moon = canvasOf(vw * D, vh * D);
	const m = moon.getContext('2d') as Ctx;
	m.drawImage(canvas, 0, 0);
	m.globalCompositeOperation = 'multiply';
	m.fillStyle = 'rgb(105,140,190)';
	m.fillRect(0, 0, moon.width, moon.height);
	m.globalCompositeOperation = 'lighter';
	m.drawImage(moon, 0, 0);
	return { canvas, moon };
}

/** A lamp post's footing, painted on the baked forest by the world (it never moves). */
export function paintLampPost(c: Ctx, lamp: LampSpec, layout: ForestLayout): void {
	const S = layout.tile;
	const x = layout.x + lamp.postX * S;
	const y = layout.y + lamp.postY * S;
	c.fillStyle = 'rgba(0,0,0,0.45)';
	c.beginPath();
	c.ellipse(x + 1.5, y + 2.2, S * 0.17, S * 0.12, 0, 0, TAU);
	c.fill();
	c.fillStyle = '#0b0d11';
	c.beginPath();
	c.arc(x, y, S * 0.15, 0, TAU);
	c.fill();
	c.fillStyle = '#2c333b';
	c.beginPath();
	c.arc(x - S * 0.015, y - S * 0.02, S * 0.11, 0, TAU);
	c.fill();
	c.strokeStyle = 'rgba(190,210,225,0.4)';
	c.lineWidth = 1;
	c.beginPath();
	c.arc(x, y, S * 0.1, Math.PI * 1.1, Math.PI * 1.6);
	c.stroke();
}
