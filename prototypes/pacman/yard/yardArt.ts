// Candidate (not in the game): the master assets of the demolition yard (DESIGN.md §13), drawn in
// code. One shared style: a toy construction yard seen strictly from above, daylight, the key light
// from the upper left (the shadows fall to the lower right, as in the seasons); sand and concrete,
// safety yellow, wood; fire orange and yellow, never the hell's reds.
// Masters: the ground and the corridor floor, the concrete wall with its painted curb, the crate,
// the bolt (the food), the bomb, the blast, the soot it leaves, the crate's planks.
import type { GridMatrix, TileType } from '../../../src/games/pacman/config/gridConfig';
import { isLairToken } from '../../../src/games/pacman/logic/maze/LairExit';
import { seededRandom } from '../../../src/games/pacman/render/common/random';

type Ctx = CanvasRenderingContext2D;
type Rng = () => number;

export const P = {
	ground: '#c9a46c',
	groundLight: 'rgba(255,236,200,',
	groundDark: 'rgba(104,70,36,',
	path: '#d6b884',
	pebbles: ['#9a8f80', '#b3a793', '#7d7368', '#cfc5b3', '#8c7a63'],
	concrete: { a: '#c4c0b6', b: '#a9a59b', c: '#8f8b82' },
	paint: '#f4b70c',
	ink: '#2b2824',
	wood: { light: '#e8a75a', mid: '#cf8a43', dark: '#8a5428', frame: '#8e4f21', edge: '#4a2812' },
	shadow: 'rgba(58,38,16,0.42)',
	night: 'rgba(34,48,104,0.86)'
} as const;

/** The light: from the upper left. Drop shadows go this way (in tiles). */
const SHADOW_DX = 0.07;
const SHADOW_DY = 0.1;

const smooth = (a: number, b: number, x: number): number => {
	const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
};

function tileRng(c: number, r: number, k = 0): Rng {
	return seededRandom(((c + 31) * 7919 + (r + 17) * 104729 + k * 15485863) % 2147483646);
}

function canvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
	const cv = document.createElement('canvas');
	cv.width = Math.max(1, Math.ceil(w));
	cv.height = Math.max(1, Math.ceil(h));
	return [cv, cv.getContext('2d') as Ctx];
}

/** The maze as the yard reads it. */
export class YardMap {
	readonly R: number;
	readonly C: number;
	constructor(readonly m: GridMatrix) {
		this.R = m.length;
		this.C = m[0]?.length ?? 0;
	}
	at(c: number, r: number): TileType {
		return this.m[r]?.[c] ?? 'ES';
	}
	wall(c: number, r: number): boolean {
		return this.at(c, r) === 'WL';
	}
	/** Walkable or the lair: anything but a wall and the outside. */
	open(c: number, r: number): boolean {
		const t = this.at(c, r);
		return t !== 'WL' && t !== 'ES';
	}
	lair(c: number, r: number): boolean {
		return isLairToken(this.at(c, r));
	}
	teleport(c: number, r: number): boolean {
		return this.at(c, r).startsWith('0');
	}
}

/** Corridor tiles that get a crate: a seeded share, kept off the start, the lair door, the tunnels. */
export function chooseCrates(map: YardMap, seed: number, share = 0.26): Array<[number, number]> {
	const rnd = seededRandom(seed);
	let pm: [number, number] = [-99, -99];
	for (let r = 0; r < map.R; r += 1)
		for (let c = 0; c < map.C; c += 1) if (map.at(c, r) === 'PM') pm = [c, r];
	const out: Array<[number, number]> = [];
	for (let r = 0; r < map.R; r += 1) {
		for (let c = 0; c < map.C; c += 1) {
			const v = rnd();
			if (map.at(c, r) !== 'DT') continue;
			if (Math.abs(c - pm[0]) + Math.abs(r - pm[1]) < 3) continue;
			let nearDoor = false;
			for (let dr = -2; dr <= 2; dr += 1)
				for (let dc = -2; dc <= 2; dc += 1)
					if (map.at(c + dc, r + dr) === 'LE' || map.teleport(c + dc, r + dr)) nearDoor = true;
			if (nearDoor) continue;
			if (v < share) out.push([c, r]);
		}
	}
	return out;
}

export interface Frame {
	readonly W: number;
	readonly H: number;
	/** Where tile (0,0)'s top-left corner lies, px. */
	readonly ox: number;
	readonly oy: number;
	/** Tile size, px. */
	readonly s: number;
}

// ---------------------------------------------------------------- the ground

function paintGround(g: Ctx, f: Frame, map: YardMap, rnd: Rng): void {
	const { W, H, s } = f;
	g.fillStyle = P.ground;
	g.fillRect(0, 0, W, H);
	const tiles = (W * H) / (s * s);
	// broad mottling: damp and dry patches of the sand
	for (let i = 0; i < tiles * 0.9; i += 1) {
		const x = rnd() * W;
		const y = rnd() * H;
		const r = s * (0.8 + rnd() * 2.8);
		const light = rnd() < 0.5;
		const gr = g.createRadialGradient(x, y, 0, x, y, r);
		gr.addColorStop(0, (light ? P.groundLight : P.groundDark) + (light ? 0.1 : 0.07) + ')');
		gr.addColorStop(1, (light ? P.groundLight : P.groundDark) + '0)');
		g.fillStyle = gr;
		g.fillRect(x - r, y - r, r * 2, r * 2);
	}
	// tyre ruts beside the maze (none cross it)
	const mazeL = f.ox;
	const mazeR = f.ox + map.C * s;
	const mazeB = f.oy + map.R * s;
	const ruts: Array<[number, number, number, number, number, number, number, number]> = [
		[mazeL - s * 2.2, -s, mazeL - s * 5.5, H * 0.35, mazeL - s * 0.6, H * 0.7, mazeL - s * 4, H + s],
		[mazeR + s * 2.4, -s, mazeR + s * 6, H * 0.3, mazeR + s * 0.8, H * 0.65, mazeR + s * 4.5, H + s],
		[-s, mazeB + s * 1.8, W * 0.3, mazeB + s * 0.6, W * 0.7, mazeB + s * 3.2, W + s, mazeB + s * 1.4]
	];
	for (const [x0, y0, x1, y1, x2, y2, x3, y3] of ruts) {
		const steps = 260;
		for (const side of [-0.55, 0.55]) {
			let px = 0;
			let py = 0;
			for (let i = 0; i <= steps; i += 1) {
				const t = i / steps;
				const u = 1 - t;
				const x = u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3;
				const y = u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3;
				if (i > 0) {
					const dx = x - px;
					const dy = y - py;
					const l = Math.hypot(dx, dy) || 1;
					const nx = -dy / l;
					const ny = dx / l;
					const cx = x + nx * side * s;
					const cy = y + ny * side * s;
					g.save();
					g.translate(cx, cy);
					g.rotate(Math.atan2(dy, dx));
					// the rut: a pressed, darker band with its tread
					g.fillStyle = 'rgba(96,64,32,0.07)';
					g.fillRect(-l * 0.6, -s * 0.2, l * 1.2, s * 0.4);
					if (i % 2 === 0) {
						g.fillStyle = 'rgba(80,52,26,0.16)';
						g.fillRect(-s * 0.03, -s * 0.17, s * 0.06, s * 0.13);
						g.fillRect(-s * 0.03, s * 0.04, s * 0.06, s * 0.13);
						g.fillStyle = 'rgba(255,238,205,0.08)';
						g.fillRect(s * 0.04, -s * 0.17, s * 0.03, s * 0.34);
					}
					g.restore();
				}
				px = x;
				py = y;
			}
		}
	}
	// fine grain
	for (let i = 0; i < tiles * 70; i += 1) {
		const x = rnd() * W;
		const y = rnd() * H;
		const z = s * (0.025 + rnd() * 0.04);
		g.fillStyle = rnd() < 0.5 ? `rgba(255,240,212,${0.15 + rnd() * 0.2})` : `rgba(92,62,32,${0.12 + rnd() * 0.18})`;
		g.fillRect(x, y, z, z);
	}
	// pebbles and gravel
	for (let i = 0; i < tiles * 1.3; i += 1) {
		const x = rnd() * W;
		const y = rnd() * H;
		pebble(g, x, y, s * (0.04 + rnd() * rnd() * 0.09), rnd);
	}
}

function pebble(g: Ctx, x: number, y: number, r: number, rnd: Rng): void {
	const a = rnd() * Math.PI;
	const e = 0.6 + rnd() * 0.4;
	g.fillStyle = 'rgba(60,40,20,0.3)';
	g.beginPath();
	g.ellipse(x + r * 0.35, y + r * 0.45, r, r * e, a, 0, Math.PI * 2);
	g.fill();
	g.fillStyle = P.pebbles[(rnd() * P.pebbles.length) | 0];
	g.beginPath();
	g.ellipse(x, y, r, r * e, a, 0, Math.PI * 2);
	g.fill();
	g.fillStyle = 'rgba(255,250,240,0.45)';
	g.beginPath();
	g.ellipse(x - r * 0.3, y - r * 0.3, r * 0.4, r * 0.3 * e, a, 0, Math.PI * 2);
	g.fill();
}

/** The corridors: sand rolled hard and pale, worn soft at its edges. */
function paintCorridors(g: Ctx, f: Frame, map: YardMap, rnd: Rng): void {
	const { W, H, s, ox, oy } = f;
	const [mc, m] = canvas(W, H);
	m.fillStyle = '#fff';
	for (let r = 0; r < map.R; r += 1) {
		for (let c = 0; c < map.C; c += 1) {
			if (!map.open(c, r) || map.lair(c, r)) continue;
			m.fillRect(ox + c * s - s * 0.05, oy + r * s - s * 0.05, s * 1.1, s * 1.1);
		}
	}
	const [pc, p] = canvas(W, H);
	p.filter = `blur(${s * 0.12}px)`;
	p.drawImage(mc, 0, 0);
	p.filter = 'none';
	p.globalCompositeOperation = 'source-in';
	p.fillStyle = P.path;
	p.fillRect(0, 0, W, H);
	g.globalAlpha = 0.6;
	g.drawImage(pc, 0, 0);
	g.globalAlpha = 1;
	// on it: a few things of a working yard (rare, quiet)
	for (let r = 0; r < map.R; r += 1) {
		for (let c = 0; c < map.C; c += 1) {
			if (map.at(c, r) !== 'DT' && map.at(c, r) !== 'FT') continue;
			const k = tileRng(c, r, 3);
			const v = k();
			const x = ox + (c + 0.15 + k() * 0.7) * s;
			const y = oy + (r + 0.15 + k() * 0.7) * s;
			if (v < 0.05) {
				// an old oil spot
				const gr = g.createRadialGradient(x, y, 0, x, y, s * 0.32);
				gr.addColorStop(0, 'rgba(52,40,34,0.32)');
				gr.addColorStop(0.7, 'rgba(52,40,34,0.18)');
				gr.addColorStop(1, 'rgba(52,40,34,0)');
				g.fillStyle = gr;
				g.beginPath();
				g.ellipse(x, y, s * 0.34, s * 0.24, k() * 3, 0, Math.PI * 2);
				g.fill();
			} else if (v < 0.1) {
				// a boot print, the heel toward the light
				g.save();
				g.translate(x, y);
				g.rotate(((k() * 4) | 0) * (Math.PI / 2) + (k() - 0.5) * 0.4);
				g.fillStyle = 'rgba(120,84,46,0.22)';
				g.beginPath();
				g.ellipse(0, -s * 0.06, s * 0.06, s * 0.09, 0, 0, Math.PI * 2);
				g.ellipse(0, s * 0.1, s * 0.05, s * 0.05, 0, 0, Math.PI * 2);
				g.fill();
				g.restore();
			} else if (v < 0.16) {
				pebble(g, x, y, s * 0.07, k);
			}
		}
	}
	void rnd;
}

/** The lair: a poured concrete pad behind a hatched border (the site cabin stands here later). */
function paintLair(g: Ctx, f: Frame, map: YardMap): void {
	const { s, ox, oy } = f;
	let c0 = 1e9;
	let r0 = 1e9;
	let c1 = -1;
	let r1 = -1;
	for (let r = 0; r < map.R; r += 1)
		for (let c = 0; c < map.C; c += 1)
			if (map.lair(c, r) && map.at(c, r) !== 'LE') {
				c0 = Math.min(c0, c);
				r0 = Math.min(r0, r);
				c1 = Math.max(c1, c);
				r1 = Math.max(r1, r);
			}
	if (c1 < 0) return;
	const x = ox + c0 * s;
	const y = oy + r0 * s;
	const w = (c1 - c0 + 1) * s;
	const h = (r1 - r0 + 1) * s;
	const gr = g.createLinearGradient(x, y, x + w, y + h);
	gr.addColorStop(0, '#c2bfb6');
	gr.addColorStop(1, '#a8a59c');
	g.fillStyle = gr;
	g.fillRect(x, y, w, h);
	const k = seededRandom(77);
	for (let i = 0; i < (w * h) / (s * s) * 40; i += 1) {
		g.fillStyle = k() < 0.5 ? 'rgba(255,255,250,0.18)' : 'rgba(60,56,50,0.16)';
		g.fillRect(x + k() * w, y + k() * h, s * 0.04, s * 0.04);
	}
	// slab joints
	g.strokeStyle = 'rgba(70,66,60,0.35)';
	g.lineWidth = Math.max(1, s * 0.03);
	for (let i = 1; i < 3; i += 1) {
		g.beginPath();
		g.moveTo(x + (w * i) / 3, y);
		g.lineTo(x + (w * i) / 3, y + h);
		g.stroke();
	}
	// the hatched border
	const b = s * 0.2;
	g.save();
	g.beginPath();
	g.rect(x, y, w, h);
	g.rect(x + b, y + h - b, w - 2 * b, -(h - 2 * b));
	g.clip('evenodd');
	g.fillStyle = P.paint;
	g.fillRect(x, y, w, h);
	g.fillStyle = P.ink;
	for (let t = -h; t < w + h; t += s * 0.36) {
		g.beginPath();
		g.moveTo(x + t, y);
		g.lineTo(x + t + s * 0.18, y);
		g.lineTo(x + t + s * 0.18 - h, y + h);
		g.lineTo(x + t - h, y + h);
		g.fill();
	}
	g.restore();
	g.fillStyle = 'rgba(255,255,255,0.12)';
	g.fillRect(x, y, w, b * 0.3);
}

/** The lair's door: a striped boom across it. */
function paintBoom(g: Ctx, f: Frame, map: YardMap): void {
	const { s, ox, oy } = f;
	const tiles: number[] = [];
	let row = -1;
	for (let r = 0; r < map.R; r += 1)
		for (let c = 0; c < map.C; c += 1)
			if (map.at(c, r) === 'LE') {
				tiles.push(c);
				row = r;
			}
	if (!tiles.length) return;
	const x0 = ox + Math.min(...tiles) * s;
	const x1 = ox + (Math.max(...tiles) + 1) * s;
	const y = oy + (row + 0.62) * s;
	const h = s * 0.16;
	g.fillStyle = 'rgba(58,38,16,0.35)';
	g.fillRect(x0 + s * 0.06, y + s * 0.08, x1 - x0, h);
	g.save();
	g.beginPath();
	g.roundRect(x0, y - h / 2, x1 - x0, h, h / 2);
	g.clip();
	g.fillStyle = '#f2efe8';
	g.fillRect(x0, y - h, x1 - x0, h * 2);
	g.fillStyle = '#e8542a';
	for (let x = x0; x < x1; x += s * 0.5) g.fillRect(x, y - h, s * 0.25, h * 2);
	g.fillStyle = 'rgba(255,255,255,0.4)';
	g.fillRect(x0, y - h / 2, x1 - x0, h * 0.3);
	g.restore();
	for (const x of [x0, x1]) {
		g.fillStyle = '#5a5650';
		g.beginPath();
		g.arc(x, y, s * 0.13, 0, Math.PI * 2);
		g.fill();
		g.fillStyle = '#8d8a83';
		g.beginPath();
		g.arc(x - s * 0.03, y - s * 0.03, s * 0.08, 0, Math.PI * 2);
		g.fill();
	}
}

/** The tunnel's mouth: a corrugated drain pipe. */
function paintPipes(g: Ctx, f: Frame, map: YardMap): void {
	const { s, ox, oy } = f;
	for (let r = 0; r < map.R; r += 1) {
		for (let c = 0; c < map.C; c += 1) {
			if (!map.teleport(c, r)) continue;
			const left = !map.open(c - 1, r);
			const x = ox + (left ? c : c + 1) * s;
			const y = oy + (r + 0.5) * s;
			const dir = left ? -1 : 1;
			g.save();
			g.translate(x, y);
			g.scale(dir, 1);
			// the pipe running out under the edge
			const L = s * 1.6;
			const R = s * 0.62;
			g.fillStyle = 'rgba(58,38,16,0.35)';
			g.fillRect(-s * 0.1 + s * 0.06, -R + s * 0.1, L, R * 2);
			const gr = g.createLinearGradient(0, -R, 0, R);
			gr.addColorStop(0, '#dfe2e2');
			gr.addColorStop(0.35, '#b7bcbd');
			gr.addColorStop(1, '#7d8384');
			g.fillStyle = gr;
			g.fillRect(-s * 0.1, -R, L, R * 2);
			g.strokeStyle = 'rgba(60,64,66,0.45)';
			g.lineWidth = Math.max(1, s * 0.04);
			for (let i = 0; i < 9; i += 1) {
				const px = -s * 0.04 + i * s * 0.18;
				g.beginPath();
				g.moveTo(px, -R);
				g.lineTo(px, R);
				g.stroke();
			}
			// its open end: dark inside, a lit rim
			g.fillStyle = '#1d1a17';
			g.beginPath();
			g.ellipse(-s * 0.1, 0, s * 0.16, R * 0.86, 0, 0, Math.PI * 2);
			g.fill();
			g.strokeStyle = '#c9cdcd';
			g.lineWidth = s * 0.08;
			g.beginPath();
			g.ellipse(-s * 0.1, 0, s * 0.18, R * 0.9, 0, 0, Math.PI * 2);
			g.stroke();
			g.restore();
		}
	}
}

// ---------------------------------------------------------------- the walls

function wallPath(map: YardMap, f: Frame): Path2D {
	const { s, ox, oy } = f;
	const path = new Path2D();
	const inset = s * 0.05;
	const rad = s * 0.3;
	const over = 0.6;
	for (let r = 0; r < map.R; r += 1) {
		for (let c = 0; c < map.C; c += 1) {
			if (!map.wall(c, r)) continue;
			const oL = !map.wall(c - 1, r);
			const oU = !map.wall(c, r - 1);
			const oR = !map.wall(c + 1, r);
			const oD = !map.wall(c, r + 1);
			const L = oL ? inset : -over;
			const U = oU ? inset : -over;
			const Rr = oR ? inset : -over;
			const D = oD ? inset : -over;
			path.roundRect(ox + c * s + L, oy + r * s + U, s - L - Rr, s - U - D, [
				oU && oL ? rad : 0,
				oU && oR ? rad : 0,
				oD && oR ? rad : 0,
				oD && oL ? rad : 0
			]);
		}
	}
	return path;
}

/** The mask with every corner rounded by `r` px (concave ones too): blurred, then cut at half. */
function smoothMask(mask: HTMLCanvasElement, r: number): HTMLCanvasElement {
	const [cv, g] = canvas(mask.width, mask.height);
	g.filter = `blur(${r}px)`;
	g.drawImage(mask, 0, 0);
	g.filter = 'none';
	const img = g.getImageData(0, 0, cv.width, cv.height);
	const d = img.data;
	for (let i = 3; i < d.length; i += 4) {
		const a = (d[i] - 128) * 5 + 128;
		d[i] = a < 0 ? 0 : a > 255 ? 255 : a;
		d[i - 3] = d[i - 2] = d[i - 1] = 255;
	}
	g.putImageData(img, 0, 0);
	return cv;
}

function tinted(mask: HTMLCanvasElement, color: string): HTMLCanvasElement {
	const [cv, g] = canvas(mask.width, mask.height);
	g.drawImage(mask, 0, 0);
	g.globalCompositeOperation = 'source-in';
	g.fillStyle = color;
	g.fillRect(0, 0, cv.width, cv.height);
	return cv;
}

/** `mask` shrunk by `e` px (eight shifted copies intersected). */
function erode(mask: HTMLCanvasElement, e: number): HTMLCanvasElement {
	const [cv, g] = canvas(mask.width, mask.height);
	g.drawImage(mask, 0, 0);
	g.globalCompositeOperation = 'destination-in';
	const d = e * Math.SQRT1_2;
	for (const [dx, dy] of [
		[e, 0],
		[-e, 0],
		[0, e],
		[0, -e],
		[d, d],
		[-d, d],
		[d, -d],
		[-d, -d]
	])
		g.drawImage(mask, dx, dy);
	return cv;
}

/** The part of `mask` that `mask` shifted by (dx, dy) does not cover, painted `color`. */
function rim(mask: HTMLCanvasElement, dx: number, dy: number, color: string, blur = 0): HTMLCanvasElement {
	const [cv, g] = canvas(mask.width, mask.height);
	g.drawImage(mask, 0, 0);
	g.globalCompositeOperation = 'destination-out';
	if (blur > 0) g.filter = `blur(${blur}px)`;
	g.drawImage(mask, dx, dy);
	g.filter = 'none';
	g.globalCompositeOperation = 'source-in';
	g.fillStyle = color;
	g.fillRect(0, 0, cv.width, cv.height);
	g.globalCompositeOperation = 'destination-in';
	g.drawImage(mask, 0, 0);
	return cv;
}

/**
 * The walls: precast concrete laid end to end, strictly from above. A soft drop shadow, a pillow
 * bevel lit from the upper left, joints between the blocks, form-tie holes, stains and hairline
 * cracks, a worn safety-yellow curb line along every edge, hazard stripes on the blunt ends.
 */
function paintWalls(g: Ctx, f: Frame, map: YardMap): void {
	const { W, H, s, ox, oy } = f;
	const path = wallPath(map, f);
	const [rawC, raw] = canvas(W, H);
	raw.fillStyle = '#fff';
	raw.fill(path);
	const mc = smoothMask(rawC, s * 0.09);
	const solid = tinted(mc, P.concrete.b);
	// the corridor darkens toward the walls (ambient occlusion), then the drop shadow
	g.save();
	g.shadowColor = 'rgba(70,46,20,0.35)';
	g.shadowBlur = s * 0.5;
	g.drawImage(solid, 0, 0);
	g.restore();
	g.save();
	g.shadowColor = P.shadow;
	g.shadowBlur = s * 0.16;
	g.shadowOffsetX = s * SHADOW_DX;
	g.shadowOffsetY = s * SHADOW_DY;
	g.drawImage(solid, 0, 0);
	g.restore();

	const [wc, w] = canvas(W, H);
	const base = w.createLinearGradient(0, 0, W, H);
	base.addColorStop(0, P.concrete.a);
	base.addColorStop(1, P.concrete.c);
	w.fillStyle = base;
	w.fillRect(0, 0, W, H);
	w.save();
	for (let r = 0; r < map.R; r += 1) {
		for (let c = 0; c < map.C; c += 1) {
			if (!map.wall(c, r)) continue;
			const k = tileRng(c, r);
			const x = ox + c * s;
			const y = oy + r * s;
			// each pour a little different
			const v = k() - 0.5;
			w.fillStyle = v > 0 ? `rgba(255,252,244,${v * 0.16})` : `rgba(70,64,56,${-v * 0.14})`;
			w.fillRect(x - 1, y - 1, s + 2, s + 2);
			// pores
			for (let i = 0; i < 26; i += 1) {
				const z = s * (0.02 + k() * 0.03);
				w.fillStyle = k() < 0.6 ? `rgba(78,72,64,${0.18 + k() * 0.25})` : `rgba(255,255,250,${0.2 + k() * 0.25})`;
				w.fillRect(x + k() * s, y + k() * s, z, z);
			}
			// a water stain
			if (k() < 0.35) {
				const sx = x + k() * s;
				const sy = y + k() * s;
				const sr = s * (0.25 + k() * 0.35);
				const gr = w.createRadialGradient(sx, sy, 0, sx, sy, sr);
				gr.addColorStop(0, 'rgba(96,88,72,0.16)');
				gr.addColorStop(1, 'rgba(96,88,72,0)');
				w.fillStyle = gr;
				w.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
			}
			// a hairline crack
			if (k() < 0.12) {
				w.strokeStyle = 'rgba(64,58,50,0.5)';
				w.lineWidth = Math.max(0.7, s * 0.022);
				w.beginPath();
				let px = x + k() * s;
				let py = y + k() * s;
				w.moveTo(px, py);
				const a0 = k() * Math.PI * 2;
				for (let i = 0; i < 4; i += 1) {
					const a = a0 + (k() - 0.5) * 1.4;
					px += Math.cos(a) * s * 0.14;
					py += Math.sin(a) * s * 0.14;
					w.lineTo(px, py);
				}
				w.stroke();
			}
			// form-tie holes on the long runs
			const horiz = map.wall(c - 1, r) || map.wall(c + 1, r);
			const vert = map.wall(c, r - 1) || map.wall(c, r + 1);
			if (horiz !== vert && k() < 0.55) {
				for (const t of [0.28, 0.72]) {
					const hx = x + (horiz ? t : 0.5) * s;
					const hy = y + (horiz ? 0.5 : t) * s;
					const hr = s * 0.045;
					if (k() < 0.4) {
						const gr = w.createRadialGradient(hx, hy, 0, hx, hy, s * 0.14);
						gr.addColorStop(0, 'rgba(150,84,40,0.35)');
						gr.addColorStop(1, 'rgba(150,84,40,0)');
						w.fillStyle = gr;
						w.fillRect(hx - s * 0.14, hy - s * 0.14, s * 0.28, s * 0.28);
					}
					w.fillStyle = 'rgba(255,255,250,0.5)';
					w.beginPath();
					w.arc(hx + hr * 0.25, hy + hr * 0.25, hr, 0, Math.PI * 2);
					w.fill();
					w.fillStyle = '#48433c';
					w.beginPath();
					w.arc(hx, hy, hr, 0, Math.PI * 2);
					w.fill();
					w.fillStyle = '#2c2925';
					w.beginPath();
					w.arc(hx - hr * 0.2, hy - hr * 0.2, hr * 0.6, 0, Math.PI * 2);
					w.fill();
				}
			}
			// joints between blocks: dark groove, lit lip
			const jw = Math.max(1, s * 0.035);
			if (map.wall(c + 1, r) && !vert && k() < 0.5) {
				w.fillStyle = 'rgba(58,54,48,0.55)';
				w.fillRect(x + s - jw / 2, y, jw, s);
				w.fillStyle = 'rgba(255,255,250,0.4)';
				w.fillRect(x + s + jw / 2, y, jw * 0.7, s);
			}
			if (map.wall(c, r + 1) && !horiz && k() < 0.5) {
				w.fillStyle = 'rgba(58,54,48,0.55)';
				w.fillRect(x, y + s - jw / 2, s, jw);
				w.fillStyle = 'rgba(255,255,250,0.4)';
				w.fillRect(x, y + s + jw / 2, s, jw * 0.7);
			}
		}
	}
	// hazard stripes on the blunt ends (a block with one neighbour)
	for (let r = 0; r < map.R; r += 1) {
		for (let c = 0; c < map.C; c += 1) {
			if (!map.wall(c, r)) continue;
			const n = [map.wall(c - 1, r), map.wall(c + 1, r), map.wall(c, r - 1), map.wall(c, r + 1)];
			if (n.filter(Boolean).length !== 1) continue;
			const x = ox + c * s;
			const y = oy + r * s;
			// the cap: the half of the tile away from the neighbour
			const cx = n[0] ? x + s * 0.55 : n[1] ? x : x;
			const cy = n[2] ? y + s * 0.55 : n[3] ? y : y;
			const cw = n[0] || n[1] ? s * 0.45 : s;
			const ch = n[2] || n[3] ? s * 0.45 : s;
			w.save();
			w.beginPath();
			w.rect(cx, cy, cw, ch);
			w.clip();
			w.fillStyle = P.paint;
			w.fillRect(cx, cy, cw, ch);
			w.fillStyle = P.ink;
			const st = s * 0.17;
			for (let t = -s; t < s * 2; t += st * 2) {
				w.beginPath();
				w.moveTo(x + t, y);
				w.lineTo(x + t + st, y);
				w.lineTo(x + t + st - s, y + s);
				w.lineTo(x + t - s, y + s);
				w.fill();
			}
			// worn paint
			const k = tileRng(c, r, 9);
			w.globalCompositeOperation = 'destination-out';
			for (let i = 0; i < 7; i += 1) {
				w.fillStyle = `rgba(0,0,0,${0.3 + k() * 0.5})`;
				w.beginPath();
				w.arc(cx + k() * cw, cy + k() * ch, s * (0.03 + k() * 0.06), 0, Math.PI * 2);
				w.fill();
			}
			w.globalCompositeOperation = 'source-over';
			w.restore();
		}
	}
	w.restore();
	w.globalCompositeOperation = 'destination-in';
	w.drawImage(mc, 0, 0);
	// the base again under the worn paint
	g.drawImage(wc, 0, 0);

	// the barrier's top: a flat ridge, paler than the slopes, stepped from them
	const ridge = erode(mc, s * 0.2);
	const [rc, rg] = canvas(W, H);
	rg.drawImage(ridge, 0, 0);
	rg.globalCompositeOperation = 'source-in';
	rg.fillStyle = 'rgba(255,253,246,0.28)';
	rg.fillRect(0, 0, W, H);
	g.drawImage(rc, 0, 0);
	g.drawImage(rim(ridge, s * 0.035, s * 0.035, 'rgba(255,255,250,0.55)'), 0, 0);
	g.drawImage(rim(ridge, -s * 0.035, -s * 0.035, 'rgba(60,54,46,0.35)'), 0, 0);
	// the slopes: lit up and left, in shade down and right
	g.drawImage(rim(mc, s * 0.2, s * 0.2, 'rgba(255,252,240,0.22)', s * 0.06), 0, 0);
	g.drawImage(rim(mc, -s * 0.2, -s * 0.2, 'rgba(54,46,36,0.3)', s * 0.06), 0, 0);

	// the curb line: a band along the ridge's edge, worn
	const e1 = erode(mc, s * 0.2);
	const e2 = erode(mc, s * 0.28);
	const [yc, yg] = canvas(W, H);
	yg.drawImage(e1, 0, 0);
	yg.globalCompositeOperation = 'destination-out';
	yg.drawImage(e2, 0, 0);
	yg.globalCompositeOperation = 'source-in';
	yg.fillStyle = P.paint;
	yg.fillRect(0, 0, W, H);
	yg.globalCompositeOperation = 'destination-out';
	const wear = seededRandom(4242);
	for (let i = 0; i < (W * H) / (s * s) * 5; i += 1) {
		yg.fillStyle = `rgba(0,0,0,${0.25 + wear() * 0.7})`;
		yg.beginPath();
		yg.ellipse(wear() * W, wear() * H, s * (0.03 + wear() * 0.12), s * (0.02 + wear() * 0.05), wear() * 3, 0, Math.PI * 2);
		yg.fill();
	}
	g.globalAlpha = 0.92;
	g.drawImage(yc, 0, 0);
	g.globalAlpha = 1;

	// the foot's edge: a lit lip up and left, a dark one down and right
	g.drawImage(rim(mc, s * 0.04, s * 0.04, 'rgba(255,255,252,0.55)'), 0, 0);
	g.drawImage(rim(mc, -s * 0.05, -s * 0.05, 'rgba(44,38,30,0.55)'), 0, 0);
}

/** The static yard: ground, corridors, lair pad, pipes, walls. Crates, food, bombs are live. */
export function bakeYard(map: YardMap, f: Frame, seed = 1): HTMLCanvasElement {
	const [cv, g] = canvas(f.W, f.H);
	const rnd = seededRandom(seed);
	paintGround(g, f, map, rnd);
	paintCorridors(g, f, map, rnd);
	paintLair(g, f, map);
	paintPipes(g, f, map);
	paintWalls(g, f, map);
	paintBoom(g, f, map);
	return cv;
}

// ---------------------------------------------------------------- the crate

const sprites = new Map<string, HTMLCanvasElement>();

function sprite(key: string, size: number, draw: (g: Ctx, c: number) => void): HTMLCanvasElement {
	let cv = sprites.get(key);
	if (!cv) {
		const [c, g] = canvas(size, size);
		draw(g, size / 2);
		cv = c;
		sprites.set(key, cv);
	}
	return cv;
}

/**
 * A wooden crate from above: a dark frame of boards, planks inside with grain and knots, a
 * stencil, nails; variant 0 a cross-braced lid, 1 steel corners and a strap, 2 a plain lid
 * with a tarp tied over a corner. Lit from the upper left.
 */
export function drawCrate(g: Ctx, x: number, y: number, s: number, variant: number, seed: number): void {
	const D = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
	const size = Math.ceil(s * 1.4 * D);
	const img = sprite(`crate:${s}:${variant}:${seed}:${D}`, size, (cg, c) => {
		cg.scale(D, D);
		paintCrate(cg, c / D, c / D, s, variant, seed);
	});
	g.drawImage(img, x - size / D / 2, y - size / D / 2, size / D, size / D);
}

function paintCrate(g: Ctx, x: number, y: number, s: number, variant: number, seed: number): void {
	const k = seededRandom(seed * 131 + variant * 7 + 3);
	const w = s * 0.9;
	const h = s * 0.9;
	const x0 = x - w / 2;
	const y0 = y - h / 2;
	const rot = (k() - 0.5) * 0.06;
	g.save();
	g.translate(x, y);
	g.rotate(rot);
	g.translate(-x, -y);
	// drop shadow
	g.save();
	g.shadowColor = 'rgba(52,32,12,0.5)';
	g.shadowBlur = s * 0.12;
	g.shadowOffsetX = s * SHADOW_DX * 1.3;
	g.shadowOffsetY = s * SHADOW_DY * 1.3;
	g.fillStyle = P.wood.edge;
	g.beginPath();
	g.roundRect(x0, y0, w, h, s * 0.06);
	g.fill();
	g.restore();
	const fb = s * 0.12; // frame board width
	// planks inside the frame
	const vertical = variant === 1;
	const n = 3;
	for (let i = 0; i < n; i += 1) {
		const a0 = (vertical ? x0 : y0) + fb + ((w - 2 * fb) * i) / n;
		const len = (w - 2 * fb) / n;
		const px = vertical ? a0 : x0 + fb;
		const py = vertical ? y0 + fb : a0;
		const pw = vertical ? len : w - 2 * fb;
		const ph = vertical ? h - 2 * fb : len;
		const tone = 0.85 + k() * 0.3;
		g.fillStyle = shade(P.wood.mid, tone);
		g.fillRect(px, py, pw, ph);
		plankGrain(g, px, py, pw, ph, vertical, s, k);
		// the gap between planks
		g.fillStyle = 'rgba(60,32,12,0.75)';
		if (i > 0) {
			if (vertical) g.fillRect(px - s * 0.012, py, s * 0.024, ph);
			else g.fillRect(px, py - s * 0.012, pw, s * 0.024);
		}
	}
	// a stencil on the lid: "↑↑" this side up, or a round warning mark
	g.save();
	g.globalAlpha = 0.55;
	g.fillStyle = '#3d2412';
	g.strokeStyle = '#3d2412';
	if (variant !== 0) {
		const mk = k();
		if (mk < 0.5) {
			for (const dx of [-0.09, 0.09]) {
				const ax = x + dx * s;
				g.beginPath();
				g.moveTo(ax, y - s * 0.15);
				g.lineTo(ax + s * 0.065, y - s * 0.04);
				g.lineTo(ax + s * 0.025, y - s * 0.04);
				g.lineTo(ax + s * 0.025, y + s * 0.12);
				g.lineTo(ax - s * 0.025, y + s * 0.12);
				g.lineTo(ax - s * 0.025, y - s * 0.04);
				g.lineTo(ax - s * 0.065, y - s * 0.04);
				g.closePath();
				g.fill();
			}
		} else {
			g.lineWidth = s * 0.035;
			g.beginPath();
			g.arc(x, y, s * 0.13, 0, Math.PI * 2);
			g.stroke();
			g.beginPath();
			g.moveTo(x - s * 0.08, y + s * 0.08);
			g.lineTo(x + s * 0.08, y - s * 0.08);
			g.stroke();
		}
	}
	g.restore();
	// the cross brace
	if (variant === 0) {
		g.save();
		g.beginPath();
		g.rect(x0 + fb, y0 + fb, w - 2 * fb, h - 2 * fb);
		g.clip();
		for (const dir of [1]) {
			g.save();
			g.translate(x, y);
			g.rotate(dir * Math.atan2(h, w));
			const L = Math.hypot(w, h);
			g.fillStyle = 'rgba(52,28,10,0.45)';
			g.fillRect(-L / 2, -fb / 2 + s * 0.03, L, fb);
			g.fillStyle = shade(P.wood.frame, 1.05);
			g.fillRect(-L / 2, -fb / 2, L, fb);
			plankGrain(g, -L / 2, -fb / 2, L, fb, false, s, k);
			g.fillStyle = 'rgba(255,230,190,0.35)';
			g.fillRect(-L / 2, -fb / 2, L, s * 0.018);
			g.restore();
		}
		g.restore();
	}
	// the frame boards (overlapping at the corners like a real lid)
	const boards: Array<[number, number, number, number, boolean]> = [
		[x0, y0, w, fb, false],
		[x0, y0 + h - fb, w, fb, false],
		[x0, y0 + fb, fb, h - 2 * fb, true],
		[x0 + w - fb, y0 + fb, fb, h - 2 * fb, true]
	];
	for (const [bx, by, bw, bh, v] of boards) {
		g.fillStyle = shade(P.wood.frame, 0.9 + k() * 0.2);
		g.fillRect(bx, by, bw, bh);
		plankGrain(g, bx, by, bw, bh, v, s, k);
		g.fillStyle = 'rgba(60,30,10,0.55)';
		if (v) g.fillRect(bx + (bx > x ? 0 : bw - s * 0.016), by, s * 0.016, bh);
		else g.fillRect(bx, by + (by > y ? 0 : bh - s * 0.016), bw, s * 0.016);
	}
	// nails at the board ends
	g.fillStyle = '#4a4440';
	for (const [nx, ny] of [
		[0.08, 0.08],
		[0.92, 0.08],
		[0.08, 0.92],
		[0.92, 0.92],
		[0.5, 0.06],
		[0.5, 0.94],
		[0.06, 0.5],
		[0.94, 0.5]
	]) {
		g.beginPath();
		g.arc(x0 + nx * w, y0 + ny * h, s * 0.018, 0, Math.PI * 2);
		g.fill();
	}
	// steel corners and a strap
	if (variant === 1) {
		for (const [cx, cy, sx, sy] of [
			[x0, y0, 1, 1],
			[x0 + w, y0, -1, 1],
			[x0, y0 + h, 1, -1],
			[x0 + w, y0 + h, -1, -1]
		]) {
			g.fillStyle = '#6f7375';
			g.beginPath();
			g.moveTo(cx, cy);
			g.lineTo(cx + sx * s * 0.2, cy);
			g.lineTo(cx + sx * s * 0.2, cy + sy * s * 0.06);
			g.lineTo(cx + sx * s * 0.06, cy + sy * s * 0.06);
			g.lineTo(cx + sx * s * 0.06, cy + sy * s * 0.2);
			g.lineTo(cx, cy + sy * s * 0.2);
			g.closePath();
			g.fill();
			g.fillStyle = 'rgba(255,255,255,0.35)';
			g.fillRect(cx + (sx < 0 ? -s * 0.2 : 0), cy + (sy < 0 ? -s * 0.012 : 0), s * 0.2, s * 0.012);
		}
		const sy = y + s * 0.1;
		g.fillStyle = 'rgba(40,40,44,0.4)';
		g.fillRect(x0 - s * 0.01, sy + s * 0.02, w + s * 0.02, s * 0.07);
		g.fillStyle = '#5d6266';
		g.fillRect(x0 - s * 0.01, sy, w + s * 0.02, s * 0.07);
		g.fillStyle = 'rgba(255,255,255,0.3)';
		g.fillRect(x0 - s * 0.01, sy, w + s * 0.02, s * 0.015);
	}
	// a burnt mark: the yard's own brand
	if (variant === 2) {
		g.save();
		g.globalAlpha = 0.6;
		g.strokeStyle = '#3a200e';
		g.lineWidth = s * 0.03;
		g.strokeRect(x - s * 0.17, y - s * 0.1, s * 0.34, s * 0.2);
		g.fillStyle = '#3a200e';
		for (const dx of [-0.1, 0, 0.1]) g.fillRect(x + dx * s - s * 0.018, y - s * 0.06, s * 0.036, s * 0.12);
		g.restore();
	}
	// light from the upper left over the whole lid
	const lg = g.createLinearGradient(x0, y0, x0 + w, y0 + h);
	lg.addColorStop(0, 'rgba(255,236,200,0.22)');
	lg.addColorStop(0.5, 'rgba(255,236,200,0)');
	lg.addColorStop(1, 'rgba(40,20,6,0.22)');
	g.fillStyle = lg;
	g.fillRect(x0, y0, w, h);
	g.fillStyle = 'rgba(255,236,200,0.55)';
	g.fillRect(x0, y0, w, s * 0.02);
	g.fillRect(x0, y0, s * 0.02, h);
	g.fillStyle = 'rgba(40,20,6,0.6)';
	g.fillRect(x0, y0 + h - s * 0.025, w, s * 0.025);
	g.fillRect(x0 + w - s * 0.025, y0, s * 0.025, h);
	g.strokeStyle = 'rgba(46,24,8,0.85)';
	g.lineWidth = Math.max(1, s * 0.03);
	g.strokeRect(x0, y0, w, h);
	g.restore();
}

function shade(hex: string, k: number): string {
	const n = parseInt(hex.slice(1), 16);
	const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
	return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function plankGrain(g: Ctx, x: number, y: number, w: number, h: number, vertical: boolean, s: number, k: Rng): void {
	g.save();
	g.beginPath();
	g.rect(x, y, w, h);
	g.clip();
	const across = vertical ? w : h;
	const along = vertical ? h : w;
	const lines = Math.max(2, Math.round(across / (s * 0.035)));
	g.lineWidth = Math.max(0.5, s * 0.01);
	for (let i = 0; i < lines; i += 1) {
		const o = ((i + 0.5) / lines) * across;
		const amp = s * 0.012 * (0.5 + k());
		const ph = k() * 6;
		g.strokeStyle = k() < 0.6 ? `rgba(90,48,16,${0.18 + k() * 0.2})` : `rgba(255,220,170,${0.12 + k() * 0.12})`;
		g.beginPath();
		for (let t = 0; t <= along; t += s * 0.05) {
			const d = o + Math.sin(t / (s * 0.18) + ph) * amp;
			if (vertical) {
				if (t === 0) g.moveTo(x + d, y + t);
				else g.lineTo(x + d, y + t);
			} else if (t === 0) g.moveTo(x + t, y + d);
			else g.lineTo(x + t, y + d);
		}
		g.stroke();
	}
	if (k() < 0.35) {
		const kx = vertical ? x + w * (0.3 + k() * 0.4) : x + k() * w;
		const ky = vertical ? y + k() * h : y + h * (0.3 + k() * 0.4);
		g.fillStyle = 'rgba(80,40,12,0.55)';
		g.beginPath();
		g.ellipse(kx, ky, s * (vertical ? 0.025 : 0.04), s * (vertical ? 0.04 : 0.025), 0, 0, Math.PI * 2);
		g.fill();
	}
	g.restore();
}

// ---------------------------------------------------------------- the food

/** A hex nut, the yard's dot: bright steel, a dark eye, lit from the upper left. */
export function drawBolt(g: Ctx, x: number, y: number, s: number, turn = 0): void {
	const D = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
	const a = Math.round((((turn % 1) + 1) % 1) * 6);
	const size = Math.ceil(s * 0.5 * D);
	const img = sprite(`bolt:${s}:${a}:${D}`, size, (cg, c) => {
		cg.scale(D, D);
		const cx = c / D;
		const r = s * 0.13;
		const hex = (ox: number, oy: number, rr: number) => {
			cg.beginPath();
			for (let i = 0; i < 6; i += 1) {
				const t = (i / 6) * Math.PI * 2 + (a / 6) * (Math.PI / 3) + Math.PI / 6;
				const px = cx + ox + Math.cos(t) * rr;
				const py = cx + oy + Math.sin(t) * rr;
				if (i === 0) cg.moveTo(px, py);
				else cg.lineTo(px, py);
			}
			cg.closePath();
		};
		cg.fillStyle = 'rgba(50,34,14,0.45)';
		hex(r * 0.35, r * 0.5, r * 1.05);
		cg.fill();
		const gr = cg.createLinearGradient(cx - r, cx - r, cx + r, cx + r);
		gr.addColorStop(0, '#ffffff');
		gr.addColorStop(0.5, '#d9e0e4');
		gr.addColorStop(1, '#8e989e');
		cg.fillStyle = gr;
		hex(0, 0, r);
		cg.fill();
		cg.strokeStyle = 'rgba(60,66,72,0.75)';
		cg.lineWidth = Math.max(0.6, s * 0.014);
		cg.stroke();
		cg.fillStyle = '#4d5458';
		cg.beginPath();
		cg.arc(cx, cx, r * 0.42, 0, Math.PI * 2);
		cg.fill();
		cg.fillStyle = 'rgba(255,255,255,0.55)';
		cg.beginPath();
		cg.arc(cx + r * 0.1, cx + r * 0.1, r * 0.42, 0.1, Math.PI / 2 + 0.6);
		cg.lineTo(cx, cx);
		cg.fill();
		cg.fillStyle = '#2f3437';
		cg.beginPath();
		cg.arc(cx - r * 0.05, cx - r * 0.05, r * 0.3, 0, Math.PI * 2);
		cg.fill();
	});
	g.drawImage(img, x - size / D / 2, y - size / D / 2, size / D, size / D);
}

// ---------------------------------------------------------------- the bomb

/**
 * The bomb: a black iron ball with a brass neck and a rope fuse; `fuse` 1 fresh .. 0 burnt.
 * The spark spits, the ball swells and its seams glow in the last quarter.
 */
export function drawBomb(g: Ctx, x: number, y: number, s: number, t: number, fuse: number): void {
	const late = smooth(0.3, 0, fuse);
	const beat = late > 0 ? 0.5 + 0.5 * Math.sin(t * (14 + 26 * late)) : 0;
	const r = s * 0.3 * (1 + 0.07 * late * beat + 0.02 * Math.sin(t * 5));
	// shadow
	g.fillStyle = 'rgba(40,26,10,0.42)';
	g.beginPath();
	g.ellipse(x + s * 0.09, y + s * 0.12, r * 1.02, r * 0.92, 0.6, 0, Math.PI * 2);
	g.fill();
	// the ball
	const gr = g.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.05, x, y, r);
	gr.addColorStop(0, '#7b828c');
	gr.addColorStop(0.35, '#353a42');
	gr.addColorStop(0.85, '#16181c');
	gr.addColorStop(1, '#0b0c0e');
	g.fillStyle = gr;
	g.beginPath();
	g.arc(x, y, r, 0, Math.PI * 2);
	g.fill();
	// cast seam, glowing hot at the end
	g.save();
	g.beginPath();
	g.arc(x, y, r, 0, Math.PI * 2);
	g.clip();
	g.strokeStyle = late > 0 ? `rgba(255,${150 + 60 * beat},60,${0.25 + 0.6 * late * beat})` : 'rgba(110,118,128,0.35)';
	g.lineWidth = s * 0.02;
	g.beginPath();
	g.ellipse(x, y, r * 0.98, r * 0.35, -0.6, 0, Math.PI * 2);
	g.stroke();
	// warm bounce light from the spark on the far side
	const wr = g.createRadialGradient(x + r * 0.6, y - r * 0.7, 0, x + r * 0.6, y - r * 0.7, r * 1.1);
	wr.addColorStop(0, `rgba(255,170,70,${0.22 + 0.35 * late * beat})`);
	wr.addColorStop(1, 'rgba(255,170,70,0)');
	g.fillStyle = wr;
	g.fillRect(x - r, y - r, r * 2, r * 2);
	g.restore();
	// specular
	const sp = g.createRadialGradient(x - r * 0.42, y - r * 0.48, 0, x - r * 0.42, y - r * 0.48, r * 0.4);
	sp.addColorStop(0, 'rgba(255,255,255,0.85)');
	sp.addColorStop(0.4, 'rgba(255,255,255,0.25)');
	sp.addColorStop(1, 'rgba(255,255,255,0)');
	g.fillStyle = sp;
	g.beginPath();
	g.arc(x - r * 0.42, y - r * 0.48, r * 0.4, 0, Math.PI * 2);
	g.fill();
	// the brass neck, up and right
	const nx = x + r * 0.52;
	const ny = y - r * 0.6;
	g.save();
	g.translate(nx, ny);
	g.rotate(-0.75);
	const ng = g.createLinearGradient(-r * 0.22, 0, r * 0.22, 0);
	ng.addColorStop(0, '#f6d98a');
	ng.addColorStop(0.5, '#c79a3c');
	ng.addColorStop(1, '#7c5a1e');
	g.fillStyle = ng;
	g.beginPath();
	g.roundRect(-r * 0.22, -r * 0.2, r * 0.44, r * 0.36, r * 0.06);
	g.fill();
	g.fillStyle = '#2a2420';
	g.beginPath();
	g.ellipse(0, -r * 0.2, r * 0.13, r * 0.06, 0, 0, Math.PI * 2);
	g.fill();
	g.restore();
	// the fuse: a curl of rope, shorter as it burns
	const len = 0.12 + 0.88 * Math.max(0, fuse);
	const pts: Array<[number, number]> = [];
	const steps = 18;
	for (let i = 0; i <= steps; i += 1) {
		const u = (i / steps) * len;
		const a = -0.9 + u * 2.4;
		const d = r * (0.18 + u * 0.75);
		pts.push([nx + Math.cos(a - 0.6) * d * 0.9 + u * r * 0.25, ny - Math.sin(a + 0.4) * d * 0.55 - u * r * 0.35]);
	}
	g.lineCap = 'round';
	g.strokeStyle = 'rgba(40,26,10,0.3)';
	g.lineWidth = s * 0.05;
	g.beginPath();
	pts.forEach(([px, py], i) => (i ? g.lineTo(px + s * 0.05, py + s * 0.07) : g.moveTo(px + s * 0.05, py + s * 0.07)));
	g.stroke();
	g.strokeStyle = '#b88d55';
	g.lineWidth = s * 0.045;
	g.beginPath();
	pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
	g.stroke();
	g.strokeStyle = 'rgba(90,60,26,0.8)';
	g.lineWidth = s * 0.012;
	for (let i = 1; i < pts.length; i += 2) {
		const [px, py] = pts[i];
		g.beginPath();
		g.moveTo(px - s * 0.018, py - s * 0.012);
		g.lineTo(px + s * 0.018, py + s * 0.012);
		g.stroke();
	}
	// the burnt tip and the spark
	const [tx, ty] = pts[pts.length - 1];
	g.fillStyle = '#2a2018';
	g.beginPath();
	g.arc(tx, ty, s * 0.028, 0, Math.PI * 2);
	g.fill();
	spark(g, tx, ty, s, t, 1 + late * 0.6);
}

function spark(g: Ctx, x: number, y: number, s: number, t: number, power: number): void {
	g.save();
	g.globalCompositeOperation = 'lighter';
	const flick = 0.8 + 0.2 * Math.sin(t * 47) * Math.sin(t * 31);
	const R = s * 0.3 * power * flick;
	const gl = g.createRadialGradient(x, y, 0, x, y, R);
	gl.addColorStop(0, 'rgba(255,250,220,0.95)');
	gl.addColorStop(0.25, 'rgba(255,200,90,0.6)');
	gl.addColorStop(1, 'rgba(255,120,30,0)');
	g.fillStyle = gl;
	g.fillRect(x - R, y - R, R * 2, R * 2);
	// rays
	g.strokeStyle = 'rgba(255,236,170,0.9)';
	g.lineWidth = Math.max(0.6, s * 0.012);
	for (let i = 0; i < 7; i += 1) {
		const a = i * 2.3 + t * 9;
		const l = s * (0.08 + 0.1 * Math.abs(Math.sin(t * 23 + i * 1.7))) * power;
		g.beginPath();
		g.moveTo(x + Math.cos(a) * s * 0.02, y + Math.sin(a) * s * 0.02);
		g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
		g.stroke();
	}
	// spat sparks flying off and falling
	for (let i = 0; i < 9; i += 1) {
		const life = 0.45;
		const ph = (t * 1.7 + i * 0.111) % 1;
		const age = ph * life;
		const k = seededRandom(i * 97 + Math.floor(t * 1.7 + i * 0.111) * 13);
		const a = k() * Math.PI * 2;
		const v = s * (0.6 + k() * 1.2) * power;
		const px = x + Math.cos(a) * v * age;
		const py = y + Math.sin(a) * v * age;
		const fade = 1 - ph;
		g.fillStyle = `rgba(255,${200 + ((k() * 55) | 0)},120,${0.9 * fade})`;
		g.beginPath();
		g.arc(px, py, s * 0.018 * (0.6 + fade), 0, Math.PI * 2);
		g.fill();
	}
	g.restore();
}

// ---------------------------------------------------------------- the blast

/** How far the blast runs each way, in tiles from the bomb's tile, and whether a wall stopped it. */
export interface Arm {
	readonly dx: number;
	readonly dy: number;
	readonly len: number;
	readonly wall: boolean;
	/** The crate it breaks at its end, if any. */
	readonly crate: boolean;
}

export function blastArms(map: YardMap, c: number, r: number, range: number, crates: ReadonlySet<string>): Arm[] {
	const arms: Arm[] = [];
	for (const [dx, dy] of [
		[1, 0],
		[-1, 0],
		[0, 1],
		[0, -1]
	]) {
		let len = 0;
		let wall = false;
		let crate = false;
		for (let i = 1; i <= range; i += 1) {
			const tc = c + dx * i;
			const tr = r + dy * i;
			if (!map.open(tc, tr) || map.lair(tc, tr)) {
				wall = true;
				break;
			}
			len = i;
			if (crates.has(`${tc},${tr}`)) {
				crate = true;
				break;
			}
		}
		arms.push({ dx, dy, len, wall, crate });
	}
	return arms;
}

/** The blast's life, s. */
export const BLAST_TIME = 0.95;

/**
 * The blast at `age` (0..1 of BLAST_TIME) on the bomb's tile centre: a fire cross along the
 * corridors (white core, yellow, orange skin, flickering tongues), a fireball at the centre, the
 * flame flattening where a wall stops it, sparks, then rolling dust and smoke that thin away.
 */
export function drawBlast(g: Ctx, x: number, y: number, s: number, arms: readonly Arm[], age: number, seed: number): void {
	if (age < 0 || age > 1) return;
	const grow = smooth(0, 0.12, age);
	const width = age < 0.12 ? 0.55 + 0.45 * grow : 1 - smooth(0.38, 0.92, age);
	const heat = 1 - smooth(0.2, 0.75, age);
	const T = age * BLAST_TIME;
	const k0 = seededRandom(seed);
	const reach = (a: Arm) => (a.len + (a.wall ? 0.42 : 0.3)) * grow;

	// smoke and dust underneath first (the thick of it is drawn over the fire later)
	g.save();
	g.globalCompositeOperation = 'lighter';
	// the ground glow
	const glowR = s * (1.6 + Math.max(...arms.map((a) => a.len)) * 0.8);
	const gg = g.createRadialGradient(x, y, 0, x, y, glowR);
	gg.addColorStop(0, `rgba(255,170,70,${0.45 * heat})`);
	gg.addColorStop(0.4, `rgba(255,130,40,${0.18 * heat})`);
	gg.addColorStop(1, 'rgba(255,120,30,0)');
	g.fillStyle = gg;
	g.fillRect(x - glowR, y - glowR, glowR * 2, glowR * 2);
	for (const a of arms) {
		const L = reach(a);
		for (let u = 0.4; u <= L; u += 0.45) {
			const px = x + a.dx * u * s;
			const py = y + a.dy * u * s;
			const R = s * 0.95;
			const gr = g.createRadialGradient(px, py, 0, px, py, R);
			gr.addColorStop(0, `rgba(255,150,50,${0.16 * heat})`);
			gr.addColorStop(1, 'rgba(255,150,50,0)');
			g.fillStyle = gr;
			g.fillRect(px - R, py - R, R * 2, R * 2);
		}
	}
	g.restore();

	// the fire: three skins along each arm, edges licking
	const skins: Array<[number, (h: number) => string]> = [
		[1, (h) => `rgba(${Math.round(230 + 25 * h)},${Math.round(90 + 50 * h)},${Math.round(20 + 10 * h)},${0.9 * Math.min(1, width * 1.4)})`],
		[0.66, (h) => `rgba(255,${Math.round(170 + 40 * h)},${Math.round(50 + 40 * h)},${0.95 * h + 0.2 * (1 - h)})`],
		[0.34, (h) => `rgba(255,${Math.round(240 + 15 * h)},${Math.round(190 + 50 * h)},${h * h})`]
	];
	for (const [scale, color] of skins) {
		if (width <= 0.01) break;
		g.fillStyle = color(heat);
		for (const a of arms) {
			const L = reach(a);
			if (L <= 0.05) continue;
			const nx = -a.dy;
			const ny = a.dx;
			const k = seededRandom(seed * 7 + a.dx * 3 + a.dy * 5 + 11);
			const ph = k() * 6;
			const left: Array<[number, number]> = [];
			const right: Array<[number, number]> = [];
			const steps = Math.max(4, Math.ceil(L / 0.1));
			for (let i = 0; i <= steps; i += 1) {
				const u = (i / steps) * L;
				const taper = 1 - 0.28 * (u / Math.max(1, L));
				const lick = 1 + 0.16 * Math.sin(u * 7.5 + T * 38 + ph) + 0.1 * Math.sin(u * 13 - T * 51 + ph * 2);
				const lick2 = 1 + 0.16 * Math.sin(u * 8.3 - T * 41 + ph * 3) + 0.1 * Math.sin(u * 11 + T * 47);
				const hw = s * 0.42 * width * scale * taper;
				const cx = x + a.dx * u * s;
				const cy = y + a.dy * u * s;
				left.push([cx + nx * hw * lick, cy + ny * hw * lick]);
				right.push([cx - nx * hw * lick2, cy - ny * hw * lick2]);
			}
			const ex = x + a.dx * L * s;
			const ey = y + a.dy * L * s;
			const endHw = s * 0.38 * width * scale * (1 - 0.28 * (L / Math.max(1, L)));
			g.beginPath();
			left.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
			// the end: a round cap, flattened and spread where a wall stopped it
			const ang = Math.atan2(a.dy, a.dx);
			if (a.wall && a.len > 0) {
				g.ellipse(ex, ey, endHw * 0.55, endHw * 1.35, ang, -Math.PI / 2, Math.PI / 2);
			} else {
				g.arc(ex, ey, endHw, ang - Math.PI / 2, ang + Math.PI / 2);
			}
			for (let i = right.length - 1; i >= 0; i -= 1) g.lineTo(right[i][0], right[i][1]);
			g.closePath();
			g.fill();
			// billows: round lumps of flame boiling along the arm, so it is fire, not a tube
			const kb = seededRandom(seed * 19 + a.dx * 5 + a.dy * 9 + Math.round(scale * 10));
			for (let u = 0.35; scale > 0.5 && u < L - 0.1; u += 0.32) {
				const boil = Math.sin(T * 26 + u * 9 + kb() * 6);
				const side = (kb() - 0.5) * 0.7;
				const hw = s * 0.38 * width * scale * (1 - 0.28 * (u / Math.max(1, L)));
				const R = hw * (0.75 + 0.3 * kb() + 0.12 * boil);
				g.beginPath();
				g.arc(x + (a.dx * u + -a.dy * side * 0.5) * s, y + (a.dy * u + a.dx * side * 0.5) * s, R, 0, Math.PI * 2);
				g.fill();
			}
		}
	}
	// the fireball
	if (width > 0.01) {
		const R = s * (0.5 + 0.25 * (1 - grow) + 0.1 * Math.sin(T * 30)) * Math.min(1, width * 1.3);
		const fb = g.createRadialGradient(x, y, 0, x, y, R);
		fb.addColorStop(0, `rgba(255,255,236,${heat})`);
		fb.addColorStop(0.45, `rgba(255,214,110,${0.9 * heat + 0.1})`);
		fb.addColorStop(0.8, `rgba(250,130,36,${0.8 * width})`);
		fb.addColorStop(1, 'rgba(240,110,30,0)');
		g.fillStyle = fb;
		g.beginPath();
		g.arc(x, y, R, 0, Math.PI * 2);
		g.fill();
	}
	// tongues: hot puffs riding the arms outward
	g.save();
	g.globalCompositeOperation = 'lighter';
	for (const a of arms) {
		const L = reach(a);
		const k = seededRandom(seed * 13 + a.dx * 7 + a.dy * 3 + 5);
		for (let i = 0; i < Math.ceil(L * 3); i += 1) {
			const u = ((k() + T * 2.2) % 1) * L;
			const side = (k() - 0.5) * 0.5;
			const px = x + (a.dx * u + -a.dy * side) * s;
			const py = y + (a.dy * u + a.dx * side) * s;
			const R = s * (0.14 + k() * 0.16) * width;
			if (R <= 0.5) continue;
			const gr = g.createRadialGradient(px, py, 0, px, py, R);
			gr.addColorStop(0, `rgba(255,236,160,${0.55 * heat})`);
			gr.addColorStop(1, 'rgba(255,160,60,0)');
			g.fillStyle = gr;
			g.fillRect(px - R, py - R, R * 2, R * 2);
		}
		// a splash against the wall
		if (a.wall && a.len > 0 && heat > 0) {
			const ex = x + a.dx * reach(a) * s;
			const ey = y + a.dy * reach(a) * s;
			const R = s * 0.55 * width;
			const gr = g.createRadialGradient(ex, ey, 0, ex, ey, R);
			gr.addColorStop(0, `rgba(255,240,190,${0.5 * heat})`);
			gr.addColorStop(1, 'rgba(255,160,60,0)');
			g.fillStyle = gr;
			g.beginPath();
			g.ellipse(ex, ey, R * 0.5, R * 1.3, Math.atan2(a.dy, a.dx), 0, Math.PI * 2);
			g.fill();
		}
	}
	// sparks: streaks flung along the arms
	for (let i = 0; i < 34; i += 1) {
		const a = arms[i % arms.length];
		const k = seededRandom(seed * 31 + i * 17);
		const spread = (k() - 0.5) * 0.9;
		const dirx = a.dx - a.dy * spread;
		const diry = a.dy + a.dx * spread;
		const v = s * (4 + k() * 6);
		const life = 0.35 + k() * 0.3;
		const tt = T - k() * 0.06;
		if (tt < 0 || tt > life) continue;
		const d = v * tt * (1 - (tt / life) * 0.5);
		const maxD = (a.len + 0.6) * s;
		const dd = Math.min(d, maxD);
		const px = x + dirx * dd;
		const py = y + diry * dd;
		const f = 1 - tt / life;
		g.strokeStyle = `rgba(255,${210 + ((k() * 45) | 0)},140,${f})`;
		g.lineWidth = Math.max(0.7, s * 0.03 * f);
		g.beginPath();
		g.moveTo(px, py);
		g.lineTo(px - dirx * s * 0.18 * f, py - diry * s * 0.18 * f);
		g.stroke();
	}
	g.restore();
	// smoke and dust rolling out over the dying fire
	for (const a of [...arms, { dx: 0, dy: 0, len: 0, wall: false, crate: false }]) {
		const L = Math.max(0.2, a.len + 0.2);
		const k = seededRandom(seed * 17 + a.dx * 11 + a.dy * 19 + 3);
		const n = a.dx === 0 && a.dy === 0 ? 5 : Math.ceil(L * 2.2);
		for (let i = 0; i < n; i += 1) {
			const u = (i + k() * 0.6) / Math.max(1, n) * L;
			const born = 0.12 + k() * 0.15 + (u / 4) * 0.2;
			const life = smooth(born, born + 0.25, age) * (1 - smooth(0.6, 1, age));
			if (life <= 0.01) continue;
			const grow2 = 0.4 + 0.9 * smooth(born, 1, age);
			const drift = smooth(born, 1, age) * s * 0.45;
			const side = (k() - 0.5) * 0.6;
			const px = x + (a.dx * u + -a.dy * side) * s + a.dx * drift - drift * 0.35;
			const py = y + (a.dy * u + a.dx * side) * s + a.dy * drift - drift * 0.45;
			const R = s * (0.32 + k() * 0.22) * grow2;
			const dark = k() < 0.5;
			const col = dark ? '78,66,58' : '168,150,128';
			const gr = g.createRadialGradient(px - R * 0.25, py - R * 0.25, 0, px, py, R);
			gr.addColorStop(0, `rgba(${dark ? '120,104,92' : '214,198,176'},${0.55 * life})`);
			gr.addColorStop(0.6, `rgba(${col},${0.4 * life})`);
			gr.addColorStop(1, `rgba(${col},0)`);
			g.fillStyle = gr;
			g.beginPath();
			g.arc(px, py, R, 0, Math.PI * 2);
			g.fill();
		}
	}
	void k0;
}

/** The soot a blast leaves: a dark star at the bomb, fading streaks along the arms, ash. */
export function drawScorch(g: Ctx, x: number, y: number, s: number, arms: readonly Arm[], seed: number, alpha = 1): void {
	if (alpha <= 0) return;
	const k = seededRandom(seed * 5 + 1);
	g.save();
	g.globalAlpha = alpha;
	for (const a of arms) {
		const L = a.len + 0.35;
		for (let u = 0; u <= L; u += 0.12) {
			const f = 1 - u / (L + 0.4);
			const px = x + a.dx * u * s + -a.dy * (k() - 0.5) * s * 0.15;
			const py = y + a.dy * u * s + a.dx * (k() - 0.5) * s * 0.15;
			const R = s * (0.3 + 0.12 * k()) * (0.5 + 0.5 * f);
			const gr = g.createRadialGradient(px, py, 0, px, py, R);
			gr.addColorStop(0, `rgba(36,26,18,${0.12 * f})`);
			gr.addColorStop(1, 'rgba(36,26,18,0)');
			g.fillStyle = gr;
			g.fillRect(px - R, py - R, R * 2, R * 2);
		}
	}
	// the star at the bomb
	for (let i = 0; i < 5; i += 1) {
		const px = x + (k() - 0.5) * s * 0.25;
		const py = y + (k() - 0.5) * s * 0.25;
		const R = s * (0.35 + k() * 0.2);
		const gr = g.createRadialGradient(px, py, 0, px, py, R);
		gr.addColorStop(0, 'rgba(28,20,14,0.3)');
		gr.addColorStop(0.6, 'rgba(28,20,14,0.14)');
		gr.addColorStop(1, 'rgba(28,20,14,0)');
		g.fillStyle = gr;
		g.fillRect(px - R, py - R, R * 2, R * 2);
	}
	g.strokeStyle = 'rgba(30,22,16,0.16)';
	g.lineCap = 'round';
	for (let i = 0; i < 9; i += 1) {
		const a = k() * Math.PI * 2;
		const l = s * (0.28 + k() * 0.22);
		g.lineWidth = s * (0.05 + k() * 0.05);
		g.beginPath();
		g.moveTo(x + Math.cos(a) * s * 0.12, y + Math.sin(a) * s * 0.12);
		g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
		g.stroke();
	}
	// ash flecks
	for (let i = 0; i < 16; i += 1) {
		const a = k() * Math.PI * 2;
		const d = s * k() * 0.6;
		g.fillStyle = k() < 0.5 ? 'rgba(200,196,188,0.6)' : 'rgba(30,24,20,0.6)';
		g.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, s * 0.03, s * 0.03);
	}
	g.restore();
}

/**
 * A crate blown apart: its planks tossed away from the bomb (they fly up, so their shadows
 * part from them, and land), a puff of sawdust. `age` s since the blast reached it.
 */
export function drawDebris(g: Ctx, x: number, y: number, s: number, fromX: number, fromY: number, age: number, seed: number): void {
	if (age < 0) return;
	const k = seededRandom(seed * 3 + 7);
	const away = Math.atan2(y - fromY, x - fromX);
	const land = 0.45;
	for (let i = 0; i < 8; i += 1) {
		const a = away + (k() - 0.5) * 2.4;
		const v = s * (1.2 + k() * 1.6);
		const t = Math.min(age, land);
		const slide = Math.max(0, age - land);
		const d = v * t * (1 - t / (2 * land)) + Math.min(slide, 0.15) * v * 0.3;
		const hgt = age < land ? Math.sin((age / land) * Math.PI) * s * (0.4 + k() * 0.5) : 0;
		const px = x + Math.cos(a) * d;
		const py = y + Math.sin(a) * d;
		const rot = k() * 3 + (age < land ? age * (k() - 0.5) * 22 : land * (k() - 0.5) * 22);
		const L = s * (0.22 + k() * 0.2);
		const Wd = s * (0.06 + k() * 0.04);
		// its shadow on the ground
		g.save();
		g.translate(px + s * SHADOW_DX + hgt * 0.35, py + s * SHADOW_DY + hgt * 0.5);
		g.rotate(rot);
		g.fillStyle = `rgba(50,30,12,${0.4 - Math.min(0.25, hgt / s * 0.3)})`;
		g.fillRect(-L / 2, -Wd / 2, L, Wd);
		g.restore();
		g.save();
		g.translate(px, py - hgt * 0.15);
		g.rotate(rot);
		const sc = 1 + hgt / s * 0.35;
		g.scale(sc, sc);
		g.fillStyle = shade(i % 3 === 0 ? P.wood.frame : P.wood.mid, 0.9 + k() * 0.25);
		g.beginPath();
		// a broken end
		g.moveTo(-L / 2, -Wd / 2);
		g.lineTo(L / 2 - Wd * 0.4, -Wd / 2);
		g.lineTo(L / 2, -Wd * 0.1);
		g.lineTo(L / 2 - Wd * 0.6, Wd * 0.2);
		g.lineTo(L / 2 - Wd * 0.2, Wd / 2);
		g.lineTo(-L / 2, Wd / 2);
		g.closePath();
		g.fill();
		g.fillStyle = 'rgba(255,230,190,0.45)';
		g.fillRect(-L / 2, -Wd / 2, L * 0.85, Wd * 0.25);
		g.fillStyle = 'rgba(60,30,10,0.5)';
		g.fillRect(-L / 2, Wd * 0.25, L * 0.85, Wd * 0.25);
		g.restore();
	}
	// sawdust puff
	const pf = 1 - smooth(0, 0.8, age);
	if (pf > 0) {
		const R = s * (0.3 + age * 1.2);
		const gr = g.createRadialGradient(x, y, 0, x, y, R);
		gr.addColorStop(0, `rgba(232,200,150,${0.5 * pf})`);
		gr.addColorStop(1, 'rgba(232,200,150,0)');
		g.fillStyle = gr;
		g.beginPath();
		g.arc(x, y, R, 0, Math.PI * 2);
		g.fill();
	}
}

// ---------------------------------------------------------------- the night

export interface Light {
	readonly x: number;
	readonly y: number;
	readonly r: number;
	/** 0..1: how much of the dark it lifts. */
	readonly k: number;
	/** The warm tint it adds. */
	readonly tint: string;
}

/**
 * The night: a cold blue dark over the yard with the lights cut out of it (floodlights from the
 * masts, a fuse's spark, a blast), and their warm tint added over what they light.
 */
export function drawNight(g: Ctx, W: number, H: number, lights: readonly Light[]): void {
	const [cv, n] = canvas(W, H);
	n.fillStyle = P.night;
	n.fillRect(0, 0, W, H);
	n.globalCompositeOperation = 'destination-out';
	for (const l of lights) {
		const gr = n.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
		gr.addColorStop(0, `rgba(0,0,0,${l.k})`);
		gr.addColorStop(0.55, `rgba(0,0,0,${l.k * 0.6})`);
		gr.addColorStop(1, 'rgba(0,0,0,0)');
		n.fillStyle = gr;
		n.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
	}
	// multiplied: the yard keeps its texture under a moonlit blue
	g.save();
	g.globalCompositeOperation = 'multiply';
	g.drawImage(cv, 0, 0);
	g.globalCompositeOperation = 'lighter';
	for (const l of lights) {
		const gr = g.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.7);
		gr.addColorStop(0, l.tint);
		gr.addColorStop(1, 'rgba(0,0,0,0)');
		g.fillStyle = gr;
		g.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
	}
	g.restore();
}

/** The day's grade: warm sun from the upper left, the corners a touch darker. */
export function drawDayGrade(g: Ctx, W: number, H: number): void {
	const sun = g.createRadialGradient(W * 0.2, H * 0.1, 0, W * 0.2, H * 0.1, Math.hypot(W, H) * 0.7);
	sun.addColorStop(0, 'rgba(255,240,200,0.12)');
	sun.addColorStop(1, 'rgba(255,240,200,0)');
	g.fillStyle = sun;
	g.fillRect(0, 0, W, H);
	const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.hypot(W, H) * 0.62);
	v.addColorStop(0, 'rgba(70,44,18,0)');
	v.addColorStop(1, 'rgba(70,44,18,0.28)');
	g.fillStyle = v;
	g.fillRect(0, 0, W, H);
}
