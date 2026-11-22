// The station's world, baked once per phase (a mock-up for DESIGN.md §7a): an abandoned research
// deck in the dark. The surround is the station's machinery (deck plates, hull frames, pipe
// runs, cargo, cryo pods, a coolant spill); the maze is cut into it: corridors of grating over a
// dark pit, walls of bulkhead plates with a light strip along every island's edge, the lair a
// nest of living resin behind a torn blast door, the tunnels vent grilles. The nest's resin
// spreads from the lair over the station phase by phase.
//
// Everything is painted in the scene's own units (a tile is 32, the maze's top-left corner is at
// (MX, MY)) and baked at K device pixels per unit.
import type { GridMatrix } from '../../../src/games/pacman/config/gridConfig';
import { isTeleportToken } from '../../../src/games/pacman/config/gridConfig';
import type { Rng } from '../../../src/games/pacman/render/doom/fleshNoise';
import {
	blur,
	context,
	edgeOf,
	fbm,
	makeCanvas,
	mixHex,
	rgbaOf,
	rng,
	threshold
} from '../../../src/games/pacman/render/doom/fleshNoise';

export const T = 32;
export const FRAME = { w: 1900, h: 1100 } as const;
export const MX = 550;
export const MY = 118;
export const K = 2;

export type Phase = 1 | 2 | 3;

export interface Lamp {
	/** Tile coordinates of the light's centre. */
	readonly x: number;
	readonly y: number;
	readonly kind: 'ceiling' | 'emergency' | 'wall';
	readonly seed: number;
}

export interface StationBake {
	/** The lit scene, FRAME × K. */
	readonly base: HTMLCanvasElement;
	/** What glows by itself (light strips, lamp fittings, screens), drawn over the dark. */
	readonly glow: HTMLCanvasElement;
	readonly lamps: readonly Lamp[];
}

export const PAL = {
	deck: '#1b2026',
	deckLight: '#2a3139',
	seam: '#0a0d10',
	plate: ['#5d6873', '#4b5560', '#3c444d'],
	plateEdge: 'rgba(210,228,240,.30)',
	outline: 'rgba(6,8,10,.96)',
	strip: '#7fe3ff',
	stripWarm: '#ff3b30',
	grate: '#2f363e',
	grateHi: '#5a646e',
	pit: '#07090b',
	hazardY: '#c9a227',
	hazardK: '#15171a',
	resin: '#141712',
	resinMid: '#262b20',
	resinHi: '#8f9a7c',
	resinWet: '#c8d4b0',
	nestGlow: '#9bd34a',
	coolant: '#2fd5c8',
	rust: '#6b4a2e'
} as const;

/** How far the nest's resin has spread, by phase (in tiles of path from the lair). */
const RESIN_REACH: Readonly<Record<Phase, number>> = { 1: 1.2, 2: 6.5, 3: 15 };

const isWall = (g: GridMatrix, x: number, y: number) => g[y]?.[x] === 'WL';
const isVoid = (g: GridMatrix, x: number, y: number) => {
	const t = g[y]?.[x];
	return t === undefined || t === 'ES';
};
const LAIR = new Set(['LT', 'BY', 'IY', 'PY', 'CE', 'DB']);
const isLair = (g: GridMatrix, x: number, y: number) => LAIR.has(g[y]?.[x] ?? '');
const isFloor = (g: GridMatrix, x: number, y: number) =>
	!isWall(g, x, y) && !isVoid(g, x, y) && !isLair(g, x, y) && g[y]?.[x] !== 'LE';

/** The lamps: ceiling lamps over some corridors, red emergency lamps at some junctions. */
export function stationLamps(g: GridMatrix): Lamp[] {
	const out: Lamp[] = [];
	const r = rng(77);
	for (let y = 0; y < g.length; y += 1) {
		for (let x = 0; x < (g[0]?.length ?? 0); x += 1) {
			if (!isFloor(g, x, y)) continue;
			const n =
				Number(isFloor(g, x + 1, y)) +
				Number(isFloor(g, x - 1, y)) +
				Number(isFloor(g, x, y + 1)) +
				Number(isFloor(g, x, y - 1));
			const straight =
				(isFloor(g, x + 1, y) && isFloor(g, x - 1, y) && n === 2) ||
				(isFloor(g, x, y + 1) && isFloor(g, x, y - 1) && n === 2);
			if (straight && (x * 7 + y * 13) % 11 === 0 && r() < 0.8) {
				out.push({ x: x + 0.5, y: y + 0.5, kind: 'ceiling', seed: r() });
			}
			if (n >= 3 && (x * 5 + y * 3) % 7 === 0) {
				out.push({ x: x + 0.5, y: y + 0.5, kind: 'emergency', seed: r() });
			}
		}
	}
	// wall lamps on the surround (tile coordinates may lie outside the maze)
	for (const [x, y] of [
		[-4.2, 3],
		[-4.2, 22],
		[29.2, 5],
		[29.2, 20],
		[-9, 13.5],
		[34, 12]
	] as const) {
		out.push({ x, y, kind: 'wall', seed: r() });
	}
	return out;
}

// ---------------------------------------------------------------------------------------------
// Small painting helpers

function rivet(c: CanvasRenderingContext2D, x: number, y: number, s: number): void {
	c.fillStyle = 'rgba(0,0,0,.55)';
	c.beginPath();
	c.arc(x + s * 0.35, y + s * 0.45, s, 0, Math.PI * 2);
	c.fill();
	const g = c.createRadialGradient(x - s * 0.4, y - s * 0.4, 0, x, y, s);
	g.addColorStop(0, '#9aa6b1');
	g.addColorStop(1, '#3a424a');
	c.fillStyle = g;
	c.beginPath();
	c.arc(x, y, s, 0, Math.PI * 2);
	c.fill();
}

function hazardBand(
	c: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	r: Rng
): void {
	c.save();
	c.beginPath();
	c.rect(x, y, w, h);
	c.clip();
	c.fillStyle = PAL.hazardK;
	c.fillRect(x, y, w, h);
	c.fillStyle = PAL.hazardY;
	const step = 14;
	for (let s = -h - step; s < w + h; s += step * 2) {
		c.beginPath();
		c.moveTo(x + s, y + h);
		c.lineTo(x + s + step, y + h);
		c.lineTo(x + s + step + h, y);
		c.lineTo(x + s + h, y);
		c.closePath();
		c.fill();
	}
	// worn: scuffs of bare deck through the paint
	c.globalCompositeOperation = 'source-atop';
	for (let i = 0; i < (w * h) / 60; i += 1) {
		c.fillStyle = `rgba(20,24,28,${0.25 + r() * 0.5})`;
		const px = x + r() * w;
		const py = y + r() * h;
		c.beginPath();
		c.ellipse(px, py, 1 + r() * 5, 0.5 + r() * 2, r() * 3, 0, Math.PI * 2);
		c.fill();
	}
	c.restore();
}

function stencil(
	c: CanvasRenderingContext2D,
	text: string,
	x: number,
	y: number,
	size: number,
	rot = 0,
	alpha = 0.32
): void {
	c.save();
	c.translate(x, y);
	c.rotate(rot);
	c.font = `700 ${size}px "Arial Narrow", "Roboto Condensed", Arial, sans-serif`;
	c.textAlign = 'center';
	c.textBaseline = 'middle';
	c.fillStyle = `rgba(214,206,170,${alpha})`;
	c.fillText(text, 0, 0);
	c.restore();
}

/** A frame-sized canvas at K pixels per unit, its context already scaled to scene units. */
function layer(): [HTMLCanvasElement, CanvasRenderingContext2D] {
	const c = makeCanvas(FRAME.w * K, FRAME.h * K);
	const x = context(c);
	x.scale(K, K);
	return [c, x];
}

/** Draws a frame-sized layer onto a scene-scaled context, pixel for pixel, moved by (dx, dy). */
function put(c: CanvasRenderingContext2D, src: HTMLCanvasElement, dx = 0, dy = 0): void {
	c.drawImage(src, dx, dy, FRAME.w, FRAME.h);
}

/** Shape helpers: grow / shrink an alpha mask by `d` units (12 shifted copies). */
function morph(src: HTMLCanvasElement, d: number, grow: boolean): HTMLCanvasElement {
	const c = makeCanvas(src.width, src.height);
	const x = context(c);
	x.drawImage(src, 0, 0);
	x.globalCompositeOperation = grow ? 'source-over' : 'destination-in';
	for (let i = 0; i < 12; i += 1) {
		const a = (i / 12) * Math.PI * 2;
		x.drawImage(src, Math.cos(a) * d * K, Math.sin(a) * d * K);
	}
	return c;
}

function minus(a: HTMLCanvasElement, b: HTMLCanvasElement): HTMLCanvasElement {
	const c = makeCanvas(a.width, a.height);
	const x = context(c);
	x.drawImage(a, 0, 0);
	x.globalCompositeOperation = 'destination-out';
	x.drawImage(b, 0, 0);
	return c;
}

function paintInto(mask: HTMLCanvasElement, paint: (c: CanvasRenderingContext2D) => void) {
	const [c, x] = layer();
	paint(x);
	x.setTransform(1, 0, 0, 1, 0, 0);
	x.globalCompositeOperation = 'destination-in';
	x.drawImage(mask, 0, 0);
	return c;
}

// ---------------------------------------------------------------------------------------------
// The surround

function paintDeck(c: CanvasRenderingContext2D): void {
	const r = rng(11);
	c.fillStyle = PAL.deck;
	c.fillRect(0, 0, FRAME.w, FRAME.h);
	const P = 64;
	for (let py = 0; py < FRAME.h; py += P) {
		for (let px = 0; px < FRAME.w; px += P) {
			const n = fbm(px / 300, py / 300);
			c.fillStyle = mixHex('#161a1f', '#262c33', n * 0.9 + r() * 0.15);
			c.fillRect(px + 1, py + 1, P - 2, P - 2);
			// tread: a faint diamond plate on some plates
			if (r() < 0.35) {
				c.strokeStyle = 'rgba(160,175,190,.05)';
				c.lineWidth = 1;
				for (let k = 4; k < P; k += 8) {
					for (let j = 4; j < P; j += 8) {
						const o = (k / 8) % 2 ? 4 : 0;
						c.beginPath();
						c.moveTo(px + j + o - 2, py + k + 2);
						c.lineTo(px + j + o + 2, py + k - 2);
						c.stroke();
					}
				}
			}
			c.fillStyle = 'rgba(200,215,230,.06)';
			c.fillRect(px + 1, py + 1, P - 2, 1);
			c.fillRect(px + 1, py + 1, 1, P - 2);
			c.fillStyle = 'rgba(0,0,0,.35)';
			c.fillRect(px + 1, py + P - 2, P - 2, 1);
			c.fillRect(px + P - 2, py + 1, 1, P - 2);
			for (const [rx, ry] of [
				[5, 5],
				[P - 5, 5],
				[5, P - 5],
				[P - 5, P - 5]
			]) {
				rivet(c, px + rx, py + ry, 1.6);
			}
		}
	}
	// grime: soft dark clouds, oil, scuffs
	for (let i = 0; i < 70; i += 1) {
		const x = r() * FRAME.w;
		const y = r() * FRAME.h;
		const rad = 30 + r() * 140;
		const g = c.createRadialGradient(x, y, 0, x, y, rad);
		g.addColorStop(0, `rgba(4,6,8,${0.18 + r() * 0.25})`);
		g.addColorStop(1, 'rgba(4,6,8,0)');
		c.fillStyle = g;
		c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
	}
	c.lineCap = 'round';
	for (let i = 0; i < 260; i += 1) {
		const x = r() * FRAME.w;
		const y = r() * FRAME.h;
		const a = r() * Math.PI;
		const l = 4 + r() * 26;
		c.strokeStyle = r() < 0.5 ? 'rgba(170,185,200,.07)' : 'rgba(0,0,0,.25)';
		c.lineWidth = 0.6 + r();
		c.beginPath();
		c.moveTo(x, y);
		c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
		c.stroke();
	}
}

/** A thick structural frame of the hull, a curved beam with bolts and lightening holes. */
function hullFrame(c: CanvasRenderingContext2D, pts: ReadonlyArray<readonly [number, number]>, w: number) {
	const path = () => {
		c.beginPath();
		c.moveTo(pts[0][0], pts[0][1]);
		for (let i = 1; i < pts.length - 1; i += 1) {
			const mx = (pts[i][0] + pts[i + 1][0]) / 2;
			const my = (pts[i][1] + pts[i + 1][1]) / 2;
			c.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
		}
		const e = pts[pts.length - 1];
		c.lineTo(e[0], e[1]);
	};
	c.save();
	c.lineCap = 'butt';
	c.lineJoin = 'round';
	// cast shadow
	c.translate(10, 14);
	path();
	c.strokeStyle = 'rgba(0,0,0,.55)';
	c.lineWidth = w + 10;
	c.filter = 'blur(8px)';
	c.stroke();
	c.filter = 'none';
	c.translate(-10, -14);
	path();
	c.strokeStyle = '#0b0e11';
	c.lineWidth = w + 4;
	c.stroke();
	path();
	c.strokeStyle = '#3a434c';
	c.lineWidth = w;
	c.stroke();
	path();
	c.strokeStyle = '#4c5762';
	c.lineWidth = w * 0.62;
	c.stroke();
	path();
	c.strokeStyle = '#2b3239';
	c.lineWidth = w * 0.22;
	c.stroke();
	c.restore();
	// bolts and holes along it
	let acc = 0;
	for (let i = 1; i < pts.length; i += 1) {
		const [ax, ay] = pts[i - 1];
		const [bx, by] = pts[i];
		const l = Math.hypot(bx - ax, by - ay);
		for (let d = 0; d < l; d += 6) {
			acc += 6;
			if (acc % 54 !== 0) continue;
			const u = d / l;
			const x = ax + (bx - ax) * u;
			const y = ay + (by - ay) * u;
			const nx = -(by - ay) / l;
			const ny = (bx - ax) / l;
			c.fillStyle = '#0d1013';
			c.beginPath();
			c.ellipse(x, y, w * 0.16, w * 0.16, 0, 0, Math.PI * 2);
			c.fill();
			rivet(c, x + nx * w * 0.38, y + ny * w * 0.38, 2.2);
			rivet(c, x - nx * w * 0.38, y - ny * w * 0.38, 2.2);
		}
	}
}

function pipe(
	c: CanvasRenderingContext2D,
	pts: ReadonlyArray<readonly [number, number]>,
	w: number,
	color: string,
	band?: string
): void {
	c.save();
	c.lineCap = 'round';
	c.lineJoin = 'round';
	const path = () => {
		c.beginPath();
		pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
	};
	c.translate(5, 7);
	path();
	c.strokeStyle = 'rgba(0,0,0,.5)';
	c.lineWidth = w + 4;
	c.filter = 'blur(4px)';
	c.stroke();
	c.filter = 'none';
	c.translate(-5, -7);
	path();
	c.strokeStyle = '#090b0d';
	c.lineWidth = w + 3;
	c.stroke();
	path();
	c.strokeStyle = color;
	c.lineWidth = w;
	c.stroke();
	path();
	c.strokeStyle = 'rgba(0,0,0,.35)';
	c.lineWidth = w * 0.45;
	c.translate(w * 0.18, w * 0.18);
	c.stroke();
	c.translate(-w * 0.18, -w * 0.18);
	path();
	c.strokeStyle = 'rgba(235,245,255,.35)';
	c.lineWidth = w * 0.16;
	c.translate(-w * 0.22, -w * 0.22);
	c.stroke();
	c.restore();
	// flanges and bands along the run
	for (let i = 1; i < pts.length; i += 1) {
		const [ax, ay] = pts[i - 1];
		const [bx, by] = pts[i];
		const l = Math.hypot(bx - ax, by - ay);
		const nx = -(by - ay) / l;
		const ny = (bx - ax) / l;
		for (let d = 40; d < l - 20; d += 96) {
			const x = ax + ((bx - ax) * d) / l;
			const y = ay + ((by - ay) * d) / l;
			c.strokeStyle = '#0a0c0e';
			c.lineWidth = 6;
			c.beginPath();
			c.moveTo(x - nx * (w * 0.75), y - ny * (w * 0.75));
			c.lineTo(x + nx * (w * 0.75), y + ny * (w * 0.75));
			c.stroke();
			c.strokeStyle = band && (d / 96) % 2 < 1 ? band : '#6b7781';
			c.lineWidth = 4;
			c.stroke();
		}
	}
}

function crate(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, r: Rng) {
	c.save();
	c.fillStyle = 'rgba(0,0,0,.55)';
	c.filter = 'blur(6px)';
	c.fillRect(x + 8, y + 10, w, h);
	c.filter = 'none';
	c.fillStyle = '#0a0c0e';
	c.fillRect(x - 2, y - 2, w + 4, h + 4);
	const g = c.createLinearGradient(x, y, x + w, y + h);
	g.addColorStop(0, mixHex(color, '#ffffff', 0.12));
	g.addColorStop(1, mixHex(color, '#000000', 0.35));
	c.fillStyle = g;
	c.fillRect(x, y, w, h);
	// corrugation
	c.strokeStyle = 'rgba(0,0,0,.28)';
	c.lineWidth = 2;
	for (let k = 6; k < w; k += 7) {
		c.beginPath();
		c.moveTo(x + k, y + 4);
		c.lineTo(x + k, y + h - 4);
		c.stroke();
	}
	c.strokeStyle = 'rgba(255,255,255,.08)';
	c.lineWidth = 1;
	for (let k = 7; k < w; k += 7) {
		c.beginPath();
		c.moveTo(x + k, y + 4);
		c.lineTo(x + k, y + h - 4);
		c.stroke();
	}
	c.strokeStyle = 'rgba(0,0,0,.6)';
	c.lineWidth = 3;
	c.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
	for (const [px, py] of [
		[x + 4, y + 4],
		[x + w - 4, y + 4],
		[x + 4, y + h - 4],
		[x + w - 4, y + h - 4]
	]) {
		rivet(c, px, py, 2);
	}
	// rust and scrapes
	for (let i = 0; i < 6; i += 1) {
		const px = x + r() * w;
		const py = y + r() * h;
		const gr = c.createRadialGradient(px, py, 0, px, py, 6 + r() * 12);
		gr.addColorStop(0, 'rgba(107,74,46,.45)');
		gr.addColorStop(1, 'rgba(107,74,46,0)');
		c.fillStyle = gr;
		c.fillRect(px - 20, py - 20, 40, 40);
	}
	c.restore();
}

/** A cryo pod seen from above: a capsule of frosted glass, a dead sleeper's shape, a cracked lid. */
function cryoPod(c: CanvasRenderingContext2D, glow: CanvasRenderingContext2D, x: number, y: number, rot: number, broken: boolean) {
	const w = 46;
	const h = 120;
	for (const ctx of [c]) {
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(rot);
		ctx.fillStyle = 'rgba(0,0,0,.55)';
		ctx.filter = 'blur(7px)';
		ctx.beginPath();
		ctx.roundRect(-w / 2 + 8, -h / 2 + 10, w, h, 22);
		ctx.fill();
		ctx.filter = 'none';
		ctx.fillStyle = '#0a0c0e';
		ctx.beginPath();
		ctx.roundRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6, 25);
		ctx.fill();
		const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
		g.addColorStop(0, '#68737d');
		g.addColorStop(0.5, '#8f9aa4');
		g.addColorStop(1, '#3d454d');
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.roundRect(-w / 2, -h / 2, w, h, 22);
		ctx.fill();
		// glass
		const gl = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
		gl.addColorStop(0, broken ? '#1d2a2e' : '#24434c');
		gl.addColorStop(1, broken ? '#0d1416' : '#0f2329');
		ctx.fillStyle = gl;
		ctx.beginPath();
		ctx.roundRect(-w / 2 + 7, -h / 2 + 12, w - 14, h - 30, 16);
		ctx.fill();
		// the sleeper's dark shape (or the empty hollow)
		ctx.fillStyle = broken ? 'rgba(0,0,0,.35)' : 'rgba(6,12,14,.75)';
		ctx.beginPath();
		ctx.ellipse(0, -h / 2 + 30, 9, 10, 0, 0, Math.PI * 2);
		ctx.ellipse(0, 6, 12, 30, 0, 0, Math.PI * 2);
		ctx.fill();
		// frost / reflections
		ctx.strokeStyle = 'rgba(200,240,255,.35)';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(-w / 2 + 11, -h / 2 + 22);
		ctx.quadraticCurveTo(-w / 2 + 9, 0, -w / 2 + 12, h / 2 - 30);
		ctx.stroke();
		if (broken) {
			ctx.strokeStyle = 'rgba(220,240,250,.5)';
			ctx.lineWidth = 1;
			for (let i = 0; i < 9; i += 1) {
				const a = (i / 9) * Math.PI * 2;
				ctx.beginPath();
				ctx.moveTo(4, -8);
				ctx.lineTo(4 + Math.cos(a) * (10 + (i % 3) * 7), -8 + Math.sin(a) * (14 + (i % 2) * 10));
				ctx.stroke();
			}
		}
		ctx.restore();
	}
	// the status light at the foot
	glow.save();
	glow.translate(x, y);
	glow.rotate(rot);
	glow.fillStyle = broken ? '#ff3b30' : '#59e3ff';
	glow.beginPath();
	glow.arc(0, h / 2 - 9, 2.6, 0, Math.PI * 2);
	glow.fill();
	glow.fillStyle = broken ? 'rgba(255,60,50,.25)' : 'rgba(90,220,255,.18)';
	glow.beginPath();
	glow.roundRect(-w / 2 + 8, -h / 2 + 13, w - 16, h - 32, 14);
	glow.fill();
	glow.restore();
}

function coolantSpill(c: CanvasRenderingContext2D, x: number, y: number, s: number, r: Rng) {
	const [mask, m] = layer();
	m.fillStyle = '#fff';
	for (let i = 0; i < 9; i += 1) {
		m.beginPath();
		m.ellipse(x + (r() - 0.5) * s * 1.6, y + (r() - 0.5) * s * 0.9, s * (0.25 + r() * 0.4), s * (0.15 + r() * 0.25), r() * 3, 0, Math.PI * 2);
		m.fill();
	}
	const soft = threshold(blur(mask, 4, true), 9);
	const pool = paintInto(soft, (p) => {
		const g = p.createRadialGradient(x, y, 0, x, y, s);
		g.addColorStop(0, 'rgba(20,70,72,.85)');
		g.addColorStop(1, 'rgba(10,36,40,.8)');
		p.fillStyle = g;
		p.fillRect(0, 0, FRAME.w, FRAME.h);
	});
	put(c, pool);
	// a wet rim and sheen
	const rim = edgeOf(soft, 2 * K, 2 * K);
	put(c, paintInto(rim, (p) => ((p.fillStyle = 'rgba(160,255,245,.45)'), p.fillRect(0, 0, FRAME.w, FRAME.h))));
	c.strokeStyle = 'rgba(180,255,250,.22)';
	c.lineWidth = 2;
	c.beginPath();
	c.ellipse(x - s * 0.2, y - s * 0.1, s * 0.3, s * 0.08, -0.2, Math.PI * 1.1, Math.PI * 1.7);
	c.stroke();
}

function cable(c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, sag: number, color: string) {
	c.save();
	c.lineCap = 'round';
	const mx = (x0 + x1) / 2 + sag * 0.4;
	const my = (y0 + y1) / 2 + sag;
	c.strokeStyle = 'rgba(0,0,0,.45)';
	c.lineWidth = 6;
	c.beginPath();
	c.moveTo(x0 + 3, y0 + 4);
	c.quadraticCurveTo(mx + 3, my + 4, x1 + 3, y1 + 4);
	c.stroke();
	c.strokeStyle = '#08090a';
	c.lineWidth = 5;
	c.beginPath();
	c.moveTo(x0, y0);
	c.quadraticCurveTo(mx, my, x1, y1);
	c.stroke();
	c.strokeStyle = color;
	c.lineWidth = 3;
	c.stroke();
	c.strokeStyle = 'rgba(255,255,255,.18)';
	c.lineWidth = 1;
	c.stroke();
	c.restore();
}

function wallLampFitting(c: CanvasRenderingContext2D, glow: CanvasRenderingContext2D, x: number, y: number) {
	c.fillStyle = '#0a0c0e';
	c.beginPath();
	c.roundRect(x - 13, y - 8, 26, 16, 4);
	c.fill();
	c.fillStyle = '#3b444c';
	c.beginPath();
	c.roundRect(x - 11, y - 6, 22, 12, 3);
	c.fill();
	c.strokeStyle = '#0a0c0e';
	c.lineWidth = 1.5;
	for (let k = -7; k <= 7; k += 4.6) {
		c.beginPath();
		c.moveTo(x + k, y - 6);
		c.lineTo(x + k, y + 6);
		c.stroke();
	}
	glow.fillStyle = '#ffd89a';
	glow.beginPath();
	glow.roundRect(x - 9, y - 4, 18, 8, 3);
	glow.fill();
}

function paintSurround(c: CanvasRenderingContext2D, glow: CanvasRenderingContext2D, g: GridMatrix): void {
	const r = rng(23);
	const L = MX + T; // the maze's outer wall, scene x
	const R = MX + 24 * T;
	const TOP = MY + T;
	const BOT = MY + 26 * T;
	// hull frames: two curved beams each side, like ribs of the station
	hullFrame(c, [[L - 250, -40], [L - 170, 300], [L - 150, 560], [L - 170, 820], [L - 250, 1160]], 40);
	hullFrame(c, [[L - 470, -40], [L - 400, 300], [L - 380, 560], [L - 400, 820], [L - 470, 1160]], 30);
	hullFrame(c, [[R + 250, -40], [R + 170, 300], [R + 150, 560], [R + 170, 820], [R + 250, 1160]], 40);
	hullFrame(c, [[R + 470, -40], [R + 400, 300], [R + 380, 560], [R + 400, 820], [R + 470, 1160]], 30);
	// pipe runs
	pipe(c, [[L - 90, -20], [L - 90, 380], [L - 60, 410], [L - 60, 1120]], 16, '#56616b', '#c9a227');
	pipe(c, [[L - 112, -20], [L - 112, 1120]], 9, '#4b6b70', '#2fd5c8');
	pipe(c, [[R + 90, -20], [R + 90, 640], [R + 60, 670], [R + 60, 1120]], 16, '#56616b', '#c9a227');
	pipe(c, [[R + 114, -20], [R + 114, 1120]], 9, '#6b4f4b', '#ff3b30');
	// the side vents' ducts, from the edge vents out to the frames
	const vy = MY + 13.5 * T;
	pipe(c, [[L - 300, vy], [L - 6, vy]], 30, '#3d464f');
	pipe(c, [[R + 6, vy], [R + 300, vy]], 30, '#3d464f');
	// valves on the pipe runs
	for (const [x, y] of [
		[L - 90, 240],
		[R + 90, 860]
	]) {
		c.strokeStyle = '#090b0d';
		c.lineWidth = 6;
		c.beginPath();
		c.arc(x, y, 15, 0, Math.PI * 2);
		c.stroke();
		c.strokeStyle = '#a3322b';
		c.lineWidth = 3.5;
		c.stroke();
		for (let k = 0; k < 4; k += 1) {
			const a = (k * Math.PI) / 2 + 0.4;
			c.beginPath();
			c.moveTo(x, y);
			c.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14);
			c.stroke();
		}
		rivet(c, x, y, 3.5);
	}
	// the platform's hazard band round the maze
	const B = 14;
	const gap = 10;
	hazardBand(c, L - gap - B, TOP - gap - B, R - L + 2 * (gap + B), B, r);
	hazardBand(c, L - gap - B, BOT + gap, R - L + 2 * (gap + B), B, r);
	hazardBand(c, L - gap - B, TOP - gap, B, BOT - TOP + 2 * gap, r);
	hazardBand(c, R + gap, TOP - gap, B, BOT - TOP + 2 * gap, r);
	// cargo, pods, spill, cables
	crate(c, L - 330, 90, 96, 60, '#4d5a3c', r);
	crate(c, L - 318, 158, 70, 52, '#5a4a36', r);
	crate(c, R + 236, 930, 96, 64, '#4d5a3c', r);
	crate(c, R + 330, 860, 64, 64, '#3c4a5a', r);
	crate(c, L - 360, 900, 80, 60, '#3c4a5a', r);
	cryoPod(c, glow, R + 300, 250, 0.12, false);
	cryoPod(c, glow, R + 370, 330, 0.05, true);
	cryoPod(c, glow, L - 300, 600, -0.08, true);
	coolantSpill(c, L - 220, 980, 90, r);
	cable(c, L - 60, 700, L - 330, 760, 50, '#2c3a2a');
	cable(c, L - 60, 720, L - 300, 830, 30, '#4a2a2a');
	cable(c, R + 60, 420, R + 350, 470, 40, '#2c2f3a');
	cable(c, R + 60, 440, R + 320, 560, 60, '#3a3a2a');
	// stencils
	stencil(c, 'DECK 07', L - 220, 470, 26, -Math.PI / 2);
	stencil(c, 'C-3', R + 220, 120, 34);
	stencil(c, 'MAINT ▸', L - 210, 1050, 16);
	stencil(c, 'NO ENTRY', MX + 12.5 * T, BOT + gap + B + 22, 15, 0, 0.26);
	stencil(c, 'SECTOR C · LAB', MX + 12.5 * T, TOP - gap - B - 20, 15, 0, 0.26);
	// wall lamps
	for (const l of stationLamps(g)) {
		if (l.kind === 'wall') {
			wallLampFitting(c, glow, MX + l.x * T, MY + l.y * T);
		}
	}
}

// ---------------------------------------------------------------------------------------------
// The maze

function wallMask(g: GridMatrix, grow: number): HTMLCanvasElement {
	const [m, c] = layer();
	c.fillStyle = '#fff';
	const rad = 7;
	for (let y = 0; y < g.length; y += 1) {
		for (let x = 0; x < (g[0]?.length ?? 0); x += 1) {
			if (!isWall(g, x, y)) continue;
			const up = isWall(g, x, y - 1);
			const dn = isWall(g, x, y + 1);
			const lf = isWall(g, x - 1, y);
			const rt = isWall(g, x + 1, y);
			const px = MX + x * T - grow;
			const py = MY + y * T - grow;
			c.beginPath();
			c.roundRect(px, py, T + grow * 2, T + grow * 2, [
				!up && !lf ? rad : 0,
				!up && !rt ? rad : 0,
				!dn && !rt ? rad : 0,
				!dn && !lf ? rad : 0
			]);
			c.fill();
		}
	}
	return m;
}

function floorMask(g: GridMatrix, pred: (x: number, y: number) => boolean): HTMLCanvasElement {
	const [m, c] = layer();
	c.fillStyle = '#fff';
	for (let y = 0; y < g.length; y += 1) {
		for (let x = 0; x < (g[0]?.length ?? 0); x += 1) {
			if (pred(x, y)) c.fillRect(MX + x * T, MY + y * T, T, T);
		}
	}
	return m;
}

function paintCorridors(c: CanvasRenderingContext2D, g: GridMatrix): void {
	const mask = floorMask(g, (x, y) => !isWall(g, x, y) && !isVoid(g, x, y));
	const r = rng(5);
	const tex = paintInto(mask, (p) => {
		p.fillStyle = PAL.pit;
		p.fillRect(0, 0, FRAME.w, FRAME.h);
		// the grating: bars across the corridor, one panel to a tile, a little light from above-left
		for (let y = 0; y < g.length; y += 1) {
			for (let x = 0; x < (g[0]?.length ?? 0); x += 1) {
				if (isWall(g, x, y) || isVoid(g, x, y)) continue;
				const px = MX + x * T;
				const py = MY + y * T;
				const horiz = isWall(g, x, y - 1) && isWall(g, x, y + 1);
				const n = fbm(x / 6, y / 6);
				p.fillStyle = mixHex('#0f1317', '#161b21', n);
				p.fillRect(px, py, T, T);
				const bar = mixHex('#1f252c', '#2a3139', n);
				for (let k = 3; k < T; k += 5) {
					p.fillStyle = 'rgba(0,0,0,.4)';
					if (horiz) p.fillRect(px + k + 1, py + 2, 2.2, T - 3);
					else p.fillRect(px + 2, py + k + 1, T - 3, 2.2);
					p.fillStyle = bar;
					if (horiz) p.fillRect(px + k, py + 1, 2, T - 2);
					else p.fillRect(px + 1, py + k, T - 2, 2);
					p.fillStyle = 'rgba(200,220,235,.06)';
					if (horiz) p.fillRect(px + k, py + 1, 0.8, T - 2);
					else p.fillRect(px + 1, py + k, T - 2, 0.8);
				}
				// the panel's frame
				p.strokeStyle = 'rgba(0,0,0,.7)';
				p.lineWidth = 1.5;
				p.strokeRect(px + 0.75, py + 0.75, T - 1.5, T - 1.5);
				p.strokeStyle = 'rgba(150,165,180,.12)';
				p.lineWidth = 0.8;
				p.strokeRect(px + 1.6, py + 1.6, T - 3.2, T - 3.2);
			}
		}
		// grime and wet patches over the grating
		for (let i = 0; i < 90; i += 1) {
			const x = MX + r() * 25 * T;
			const y = MY + r() * 27 * T;
			const rad = 10 + r() * 50;
			const gr = p.createRadialGradient(x, y, 0, x, y, rad);
			gr.addColorStop(0, `rgba(2,3,4,${0.2 + r() * 0.3})`);
			gr.addColorStop(1, 'rgba(2,3,4,0)');
			p.fillStyle = gr;
			p.fillRect(x - rad, y - rad, rad * 2, rad * 2);
		}
	});
	put(c, tex);
}

/** Wall runs of one-tile-thick islands get a conduit along their middle: structure, not noise. */
function conduits(p: CanvasRenderingContext2D, g: GridMatrix): void {
	const W = g[0]?.length ?? 0;
	const runs: Array<[number, number, number, number]> = [];
	for (let y = 0; y < g.length; y += 1) {
		let x = 0;
		while (x < W) {
			if (isWall(g, x, y) && !isWall(g, x, y - 1) && !isWall(g, x, y + 1)) {
				let e = x;
				while (e + 1 < W && isWall(g, e + 1, y) && !isWall(g, e + 1, y - 1) && !isWall(g, e + 1, y + 1)) e += 1;
				if (e - x >= 2) runs.push([x, y, e, y]);
				x = e + 1;
			} else x += 1;
		}
	}
	for (let x = 0; x < W; x += 1) {
		let y = 0;
		while (y < g.length) {
			if (isWall(g, x, y) && !isWall(g, x - 1, y) && !isWall(g, x + 1, y)) {
				let e = y;
				while (e + 1 < g.length && isWall(g, x, e + 1) && !isWall(g, x - 1, e + 1) && !isWall(g, x + 1, e + 1)) e += 1;
				if (e - y >= 2) runs.push([x, y, x, e]);
				y = e + 1;
			} else y += 1;
		}
	}
	for (const [x0, y0, x1, y1] of runs) {
		const ax = MX + (x0 + 0.5) * T + (x0 === x1 ? 0 : 6);
		const ay = MY + (y0 + 0.5) * T + (y0 === y1 ? 0 : 6);
		const bx = MX + (x1 + 0.5) * T - (x0 === x1 ? 0 : 6);
		const by = MY + (y1 + 0.5) * T - (y0 === y1 ? 0 : 6);
		p.lineCap = 'round';
		p.strokeStyle = '#0b0d10';
		p.lineWidth = 9;
		p.beginPath();
		p.moveTo(ax, ay);
		p.lineTo(bx, by);
		p.stroke();
		p.strokeStyle = '#36404a';
		p.lineWidth = 6;
		p.stroke();
		p.strokeStyle = 'rgba(220,235,250,.22)';
		p.lineWidth = 1.4;
		p.beginPath();
		p.moveTo(ax - 1.4, ay - 1.4);
		p.lineTo(bx - 1.4, by - 1.4);
		p.stroke();
		// clamps every tile
		const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
		for (let k = 0; k <= n; k += 1) {
			const cx = MX + (x0 + 0.5 + (x1 > x0 ? k : 0)) * T;
			const cy = MY + (y0 + 0.5 + (y1 > y0 ? k : 0)) * T;
			p.fillStyle = '#0b0d10';
			if (x0 === x1) p.fillRect(cx - 7, cy - 2, 14, 4);
			else p.fillRect(cx - 2, cy - 7, 4, 14);
			p.fillStyle = '#5b6670';
			if (x0 === x1) p.fillRect(cx - 6, cy - 1.2, 12, 2.4);
			else p.fillRect(cx - 1.2, cy - 6, 2.4, 12);
		}
	}
}

function paintWalls(c: CanvasRenderingContext2D, glow: CanvasRenderingContext2D, g: GridMatrix): void {
	const r = rng(31);
	const mask = wallMask(g, 0);
	// the shadow the blocks lay on the floor (down-right, soft): ambient occlusion
	const shadow = blur(wallMask(g, 3), 4, true);
	c.save();
	c.globalAlpha = 0.85;
	put(c, paintInto(shadow, (p) => ((p.fillStyle = '#000'), p.fillRect(0, 0, FRAME.w, FRAME.h))), 4, 6);
	c.restore();
	// outline
	put(c, paintInto(morph(mask, 2.2, true), (p) => ((p.fillStyle = PAL.outline), p.fillRect(0, 0, FRAME.w, FRAME.h))));
	// the plates
	const plates = paintInto(mask, (p) => {
		const gr = p.createLinearGradient(MX, MY, MX + 25 * T, MY + 27 * T);
		gr.addColorStop(0, PAL.plate[0]);
		gr.addColorStop(0.5, PAL.plate[1]);
		gr.addColorStop(1, PAL.plate[2]);
		p.fillStyle = gr;
		p.fillRect(0, 0, FRAME.w, FRAME.h);
		for (let y = 0; y < g.length; y += 1) {
			for (let x = 0; x < (g[0]?.length ?? 0); x += 1) {
				if (!isWall(g, x, y)) continue;
				const px = MX + x * T;
				const py = MY + y * T;
				const n = fbm(x / 3.1, y / 3.1);
				p.fillStyle = `rgba(${n < 0.5 ? '0,0,0' : '255,255,255'},${Math.abs(n - 0.5) * 0.22})`;
				p.fillRect(px, py, T, T);
				// the plate's seam and inner bevel
				p.fillStyle = 'rgba(8,10,12,.75)';
				if (isWall(g, x + 1, y)) p.fillRect(px + T - 1, py + 2, 1.6, T - 4);
				if (isWall(g, x, y + 1)) p.fillRect(px + 2, py + T - 1, T - 4, 1.6);
				p.fillStyle = 'rgba(230,240,250,.10)';
				p.fillRect(px + 2, py + 2, T - 5, 1);
				p.fillRect(px + 2, py + 2, 1, T - 5);
				p.fillStyle = 'rgba(0,0,0,.18)';
				p.fillRect(px + 3, py + T - 4, T - 6, 1.2);
				p.fillRect(px + T - 4, py + 3, 1.2, T - 6);
				// details: bolts, a vent slit, a label, a small dead screen
				const k = r();
				if (k < 0.5) {
					for (const [bx, by] of [
						[5, 5],
						[T - 5, 5],
						[5, T - 5],
						[T - 5, T - 5]
					]) {
						rivet(p, px + bx, py + by, 1.5);
					}
				} else if (k < 0.62) {
					p.fillStyle = '#0d1013';
					for (let s = 0; s < 4; s += 1) p.fillRect(px + 8, py + 8 + s * 4.5, T - 16, 2);
				} else if (k < 0.7) {
					p.fillStyle = 'rgba(201,162,39,.55)';
					p.fillRect(px + 6, py + 11, T - 12, 9);
					p.fillStyle = 'rgba(20,20,20,.7)';
					p.fillRect(px + 8, py + 14, T - 18, 1.4);
					p.fillRect(px + 8, py + 16.5, T - 22, 1.4);
				} else if (k < 0.75) {
					p.fillStyle = '#0a0d10';
					p.beginPath();
					p.roundRect(px + 7, py + 8, T - 14, T - 17, 2);
					p.fill();
					p.fillStyle = 'rgba(80,140,150,.18)';
					p.fillRect(px + 9, py + 10, T - 18, 3);
				}
			}
		}
		conduits(p, g);
		// grime pooling at the plates' feet, rust streaks under rivets
		for (let i = 0; i < 140; i += 1) {
			const x = MX + r() * 25 * T;
			const y = MY + r() * 27 * T;
			p.strokeStyle = `rgba(107,74,46,${0.12 + r() * 0.2})`;
			p.lineWidth = 1 + r() * 1.5;
			p.beginPath();
			p.moveTo(x, y);
			p.lineTo(x + (r() - 0.5) * 2, y + 6 + r() * 14);
			p.stroke();
		}
	});
	put(c, plates);
	// the bevel of the island: a lit top-left lip and a dark bottom-right one
	put(c, paintInto(edgeOf(mask, 2 * K, 2 * K), (p) => ((p.fillStyle = PAL.plateEdge), p.fillRect(0, 0, FRAME.w, FRAME.h))));
	put(c, paintInto(edgeOf(mask, -2 * K, -2 * K), (p) => ((p.fillStyle = 'rgba(0,0,0,.55)'), p.fillRect(0, 0, FRAME.w, FRAME.h))));
	// the light strip: a thin band just inside every island's edge
	const band = minus(morph(mask, 3.2, false), morph(mask, 4.6, false));
	put(c, paintInto(band, (p) => ((p.fillStyle = 'rgba(12,16,20,.9)'), p.fillRect(0, 0, FRAME.w, FRAME.h))));
	put(glow, paintInto(band, (p) => ((p.fillStyle = PAL.strip), p.fillRect(0, 0, FRAME.w, FRAME.h))));
}

function paintVents(c: CanvasRenderingContext2D, g: GridMatrix): void {
	for (let y = 0; y < g.length; y += 1) {
		for (let x = 0; x < (g[0]?.length ?? 0); x += 1) {
			const t = g[y]?.[x] ?? 'ES';
			if (!isTeleportToken(t)) continue;
			const cx = MX + (x + 0.5) * T;
			const cy = MY + (y + 0.5) * T;
			const s = T * 0.46;
			c.save();
			c.fillStyle = '#060708';
			c.beginPath();
			c.roundRect(cx - s - 3, cy - s - 3, (s + 3) * 2, (s + 3) * 2, 5);
			c.fill();
			const gr = c.createLinearGradient(cx - s, cy - s, cx + s, cy + s);
			gr.addColorStop(0, '#6a757f');
			gr.addColorStop(1, '#2f363d');
			c.fillStyle = gr;
			c.beginPath();
			c.roundRect(cx - s, cy - s, s * 2, s * 2, 4);
			c.fill();
			// the dark duct under the louvres
			const inner = s - 4;
			const dg = c.createRadialGradient(cx, cy, 0, cx, cy, inner * 1.4);
			dg.addColorStop(0, '#000');
			dg.addColorStop(1, '#0b0e11');
			c.fillStyle = dg;
			c.fillRect(cx - inner, cy - inner, inner * 2, inner * 2);
			// louvres
			for (let k = -inner + 2.5; k < inner; k += 5) {
				c.fillStyle = '#4c5660';
				c.fillRect(cx - inner, cy + k, inner * 2, 2);
				c.fillStyle = 'rgba(220,235,250,.25)';
				c.fillRect(cx - inner, cy + k, inner * 2, 0.7);
			}
			for (const [bx, by] of [
				[-s + 3, -s + 3],
				[s - 3, -s + 3],
				[-s + 3, s - 3],
				[s - 3, s - 3]
			]) {
				rivet(c, cx + bx, cy + by, 1.6);
			}
			c.restore();
		}
	}
}

/** The nest: the lair filled with living resin, its gate a torn blast door. */
function paintNest(c: CanvasRenderingContext2D, glow: CanvasRenderingContext2D, g: GridMatrix): void {
	const r = rng(41);
	const lair = floorMask(g, (x, y) => isLair(g, x, y));
	const nest = paintInto(lair, (p) => {
		const cx = MX + 12.5 * T;
		const cy = MY + 13 * T;
		const gr = p.createRadialGradient(cx, cy, 0, cx, cy, 3 * T);
		gr.addColorStop(0, '#2d3420');
		gr.addColorStop(1, '#0c0e0a');
		p.fillStyle = gr;
		p.fillRect(0, 0, FRAME.w, FRAME.h);
		resinTexture(p, cx - 3 * T, cy - 2 * T, 6 * T, 4 * T, r, 1.4);
	});
	put(c, nest);
	// the nest's own sickly glow from deep inside
	const cx = MX + 12.5 * T;
	const cy = MY + 13 * T;
	const ng = glow.createRadialGradient(cx, cy, 0, cx, cy, 2.6 * T);
	ng.addColorStop(0, 'rgba(155,211,74,.32)');
	ng.addColorStop(1, 'rgba(155,211,74,0)');
	glow.fillStyle = ng;
	glow.fillRect(cx - 3 * T, cy - 3 * T, 6 * T, 6 * T);
	// the torn blast door over the LE tiles
	const les: number[] = [];
	for (let x = 0; x < (g[0]?.length ?? 0); x += 1) if (g[11]?.[x] === 'LE') les.push(x);
	if (les.length) {
		const x0 = MX + les[0] * T;
		const x1 = MX + (les[les.length - 1] + 1) * T;
		const y0 = MY + 11 * T + 6;
		const h = T - 12;
		const half = (x1 - x0) / 2;
		for (const side of [-1, 1]) {
			c.save();
			const hinge = side < 0 ? x0 : x1;
			c.translate(hinge, y0 + h / 2);
			c.rotate(side * 0.12);
			const w = half - 10;
			const x = side < 0 ? 0 : -w;
			c.fillStyle = '#080a0c';
			c.fillRect(x - 2, -h / 2 - 2, w + 4, h + 4);
			c.save();
			c.beginPath();
			c.rect(x, -h / 2, w, h);
			c.clip();
			hazardBand(c, x, -h / 2, w, h, r);
			c.restore();
			// the torn edge
			c.fillStyle = '#080a0c';
			const ex = side < 0 ? x + w : x;
			c.beginPath();
			c.moveTo(ex, -h / 2 - 2);
			for (let k = 0; k <= 6; k += 1) {
				c.lineTo(ex - side * (2 + r() * 6), -h / 2 + (k / 6) * h);
			}
			c.lineTo(ex, h / 2 + 2);
			c.closePath();
			c.fill();
			c.restore();
		}
	}
}

/** Resin: glossy dark sheets with ribs that flow, beads of wet light, a few strands. */
function resinTexture(p: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, r: Rng, density: number): void {
	const n = Math.floor(((w * h) / 90) * density);
	p.lineCap = 'round';
	for (let i = 0; i < n; i += 1) {
		const px = x0 + r() * w;
		const py = y0 + r() * h;
		const a = fbm(px / 90, py / 90) * 9;
		const len = 8 + r() * 26;
		const b = a + (r() - 0.5) * 1.2;
		const mx = px + Math.cos(a) * len * 0.5;
		const my = py + Math.sin(a) * len * 0.5;
		const ex = mx + Math.cos(b) * len * 0.5;
		const ey = my + Math.sin(b) * len * 0.5;
		p.strokeStyle = r() < 0.6 ? 'rgba(4,5,3,.7)' : rgbaOf(PAL.resinMid, 0.9);
		p.lineWidth = 2 + r() * 3.5;
		p.beginPath();
		p.moveTo(px, py);
		p.quadraticCurveTo(mx, my, ex, ey);
		p.stroke();
		if (r() < 0.45) {
			p.strokeStyle = rgbaOf(PAL.resinHi, 0.35 + r() * 0.3);
			p.lineWidth = 0.8;
			p.beginPath();
			p.moveTo(px - 1, py - 1);
			p.quadraticCurveTo(mx - 1, my - 1, ex - 1, ey - 1);
			p.stroke();
		}
	}
	for (let i = 0; i < n * 0.08; i += 1) {
		const px = x0 + r() * w;
		const py = y0 + r() * h;
		p.fillStyle = rgbaOf(PAL.resinWet, 0.5 + r() * 0.4);
		p.beginPath();
		p.arc(px, py, 0.6 + r() * 1.3, 0, Math.PI * 2);
		p.fill();
	}
}

/** The nest's resin over the station: from the lair along the corridors and over the walls. */
function paintResin(c: CanvasRenderingContext2D, g: GridMatrix, phase: Phase): void {
	const reach = RESIN_REACH[phase];
	const W = g[0]?.length ?? 0;
	// path distance from the lair, through floors and walls (resin creeps over both)
	const dist: number[] = new Array(W * g.length).fill(Infinity);
	const q: Array<[number, number]> = [];
	for (let y = 0; y < g.length; y += 1)
		for (let x = 0; x < W; x += 1)
			if (isLair(g, x, y) || g[y]?.[x] === 'LE') {
				dist[y * W + x] = 0;
				q.push([x, y]);
			}
	while (q.length) {
		const [x, y] = q.shift() as [number, number];
		for (const [dx, dy] of [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1]
		]) {
			const nx = x + dx;
			const ny = y + dy;
			if (isVoid(g, nx, ny)) continue;
			const cost = isWall(g, nx, ny) ? 1.6 : 1;
			const d = dist[y * W + x] + cost;
			if (d < dist[ny * W + nx]) {
				dist[ny * W + nx] = d;
				q.push([nx, ny]);
			}
		}
	}
	const [mask, m] = layer();
	m.fillStyle = '#fff';
	const r = rng(53 + phase);
	for (let y = 0; y < g.length; y += 1) {
		for (let x = 0; x < W; x += 1) {
			const d = dist[y * W + x];
			if (!Number.isFinite(d) || isLair(g, x, y)) continue;
			const jitter = (fbm(x / 2.3, y / 2.3) - 0.5) * 5;
			const cover = reach - (d + jitter);
			if (cover <= 0) continue;
			const k = Math.min(1, cover / 2.5);
			for (let i = 0; i < 3; i += 1) {
				m.beginPath();
				m.ellipse(
					MX + (x + 0.2 + r() * 0.6) * T,
					MY + (y + 0.2 + r() * 0.6) * T,
					T * (0.25 + k * 0.45) * (0.7 + r() * 0.5),
					T * (0.25 + k * 0.45) * (0.7 + r() * 0.5),
					r() * 3,
					0,
					Math.PI * 2
				);
				m.fill();
			}
		}
	}
	// tendrils reaching ahead of the sheet
	m.strokeStyle = '#fff';
	m.lineCap = 'round';
	for (let i = 0; i < 40 * phase; i += 1) {
		const a = r() * Math.PI * 2;
		const d0 = r() * reach * T * 0.9;
		let x = MX + 12.5 * T + Math.cos(a) * d0;
		let y = MY + 13 * T + Math.sin(a) * d0 * 0.9;
		let h = a + (r() - 0.5);
		m.lineWidth = 2 + r() * 3;
		m.beginPath();
		m.moveTo(x, y);
		for (let s = 0; s < 8 + r() * 10; s += 1) {
			h += (r() - 0.5) * 0.7;
			x += Math.cos(h) * 9;
			y += Math.sin(h) * 9;
			m.lineTo(x, y);
		}
		m.stroke();
	}
	const soft = threshold(blur(mask, 3, true), 5);
	// keep it off the void and the lair (the lair is the nest already)
	const keep = floorMask(g, (x, y) => !isVoid(g, x, y));
	const shaped = paintInto(keep, (p) => put(p, soft));
	// a dark wet halo under it, then the resin, then its glossy rim
	c.save();
	c.globalAlpha = 0.7;
	put(c, paintInto(blur(shaped, 2, false), (p) => ((p.fillStyle = 'rgba(0,0,0,1)'), p.fillRect(0, 0, FRAME.w, FRAME.h))), 3, 4);
	c.restore();
	const rr = rng(97 + phase);
	put(
		c,
		paintInto(shaped, (p) => {
			p.fillStyle = PAL.resin;
			p.fillRect(0, 0, FRAME.w, FRAME.h);
			resinTexture(p, MX - T, MY - T, 27 * T, 29 * T, rr, 0.9);
		})
	);
	put(c, paintInto(edgeOf(shaped, 2 * K, 2 * K), (p) => ((p.fillStyle = rgbaOf(PAL.resinHi, 0.55)), p.fillRect(0, 0, FRAME.w, FRAME.h))));
}

// ---------------------------------------------------------------------------------------------

const cache = new Map<Phase, StationBake>();
let shared: { base: HTMLCanvasElement; glow: HTMLCanvasElement } | null = null;

export function bakeStation(g: GridMatrix, phase: Phase): StationBake {
	const hit = cache.get(phase);
	if (hit) return hit;
	if (!shared) {
		const base = makeCanvas(FRAME.w * K, FRAME.h * K);
		const glow = makeCanvas(FRAME.w * K, FRAME.h * K);
		const c = context(base);
		const gl = context(glow);
		c.scale(K, K);
		gl.scale(K, K);
		paintDeck(c);
		paintSurround(c, gl, g);
		paintCorridors(c, g);
		paintWalls(c, gl, g);
		paintVents(c, g);
		paintNest(c, gl, g);
		shared = { base, glow };
	}
	const base = makeCanvas(FRAME.w * K, FRAME.h * K);
	const c = context(base);
	c.drawImage(shared.base, 0, 0);
	c.scale(K, K);
	paintResin(c, g, phase);
	const out: StationBake = { base, glow: shared.glow, lamps: stationLamps(g) };
	cache.set(phase, out);
	return out;
}
