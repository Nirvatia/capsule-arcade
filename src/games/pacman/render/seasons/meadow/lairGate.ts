// The season lair gate (the owner's pick A of `lair-gate`, 2026-11-24): a wooden double gate
// in the walls' 3/4 view (a top edge, a face toward the viewer), boards with a Z brace, iron
// hinges at the posts and a ring latch where the leaves meet; two stone posts in the season's
// wall stone with the season's cap, and the season's dress along the leaves. Opening, each
// leaf slides into its post (its dress with it). World units; drawn live over the bake.

import type { MeadowTheme } from './MeadowTheme';

export interface LairGateRun {
	readonly x0: number;
	readonly x1: number;
	readonly y: number;
}

/** The gate's frame relative to the run's centre line (world units). */
const TOP = -7;
const FACE = -4;
const BOT = 7;
const POST = 8;

/** What the gate may paint around its run (for the live object's rectangle). */
export const LAIR_GATE_REACH = { x: 6, above: 14, below: 11 } as const;

interface PostStone {
	readonly top: string;
	readonly face: string;
	readonly dark: string;
}

/** The posts' stone per season (summer's hedge walls get a warm stone instead). */
const STONE: Readonly<Record<string, PostStone>> = {
	spring: { top: '#e2caa0', face: '#b89a6c', dark: '#7a6044' },
	summer: { top: '#c9b48a', face: '#9c8460', dark: '#5e4c34' },
	autumn: { top: '#e2a456', face: '#a65a28', dark: '#6a2e10' },
	winter: { top: '#a9b0bd', face: '#7a8799', dark: '#4a5566' }
};

function postStone(theme: MeadowTheme): PostStone {
	const w = theme.bake.wall;
	return STONE[theme.name] ?? { top: w.top[0], face: w.bottom[0], dark: w.base };
}

function rnd(seed: number): () => number {
	let s = seed >>> 0 || 1;
	return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

function blossom(
	c: CanvasRenderingContext2D,
	x: number,
	y: number,
	r: number,
	petal: string,
	eye: string
): void {
	c.fillStyle = petal;
	for (let k = 0; k < 5; k++) {
		const a = k * 1.2566 + 0.4;
		c.beginPath();
		c.arc(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.52, 0, 7);
		c.fill();
	}
	c.fillStyle = eye;
	c.beginPath();
	c.arc(x, y, r * 0.3, 0, 7);
	c.fill();
}

function leaf(
	c: CanvasRenderingContext2D,
	x: number,
	y: number,
	len: number,
	a: number,
	fill: string
): void {
	c.save();
	c.translate(x, y);
	c.rotate(a);
	c.fillStyle = fill;
	c.beginPath();
	c.moveTo(0, 0);
	c.quadraticCurveTo(len * 0.5, -len * 0.42, len, 0);
	c.quadraticCurveTo(len * 0.5, len * 0.42, 0, 0);
	c.fill();
	c.restore();
}

/** The season's dress along a leaf, from x to x + w (inside the leaf's clip). */
function dressLeaf(
	c: CanvasRenderingContext2D,
	x: number,
	w: number,
	y: number,
	season: string,
	seed: number
): void {
	const r = rnd(seed);
	if (season === 'spring') {
		// a blossoming twig laid along the top rail
		c.strokeStyle = '#6b4a2e';
		c.lineWidth = 1;
		c.beginPath();
		c.moveTo(x + 2, y + TOP + 2);
		c.bezierCurveTo(x + w * 0.3, y + TOP - 1, x + w * 0.6, y + TOP + 3, x + w - 3, y + TOP + 1);
		c.stroke();
		for (let i = 0; i < 4; i++) {
			const px = x + 5 + (i + r() * 0.5) * ((w - 10) / 4);
			leaf(c, px, y + TOP + 1.5, 4, -0.6 + r() * 1.2, '#7fb84a');
			blossom(c, px + 2, y + TOP + 1 + r() * 1.5, 2.6, i % 2 ? '#ffd0e2' : '#f58fb5', '#fff4c2');
		}
	} else if (season === 'summer') {
		// a vine wound along the leaf, leaves and one flower
		c.strokeStyle = '#2f7a2c';
		c.lineWidth = 1.1;
		c.beginPath();
		for (let i = 0; i <= 12; i++) {
			const px = x + (i / 12) * w;
			const py = y + 1 + Math.sin(i * 1.3 + seed) * 4;
			if (i === 0) c.moveTo(px, py);
			else c.lineTo(px, py);
		}
		c.stroke();
		for (let i = 0; i < 6; i++) {
			const px = x + 3 + i * ((w - 6) / 6) + r() * 3;
			const py = y + 1 + Math.sin((i * 2 + 1) * 0.65 + seed) * 4;
			leaf(c, px, py, 4.5, r() * 6.28, i % 2 ? '#5fae3e' : '#86cc4e');
		}
		blossom(c, x + w * 0.55, y - 1, 2.4, '#ffd23f', '#ff7a59');
	} else if (season === 'autumn') {
		// a few fallen leaves caught on the rail
		const tints = ['#e8743a', '#f6c25a', '#c0502e', '#e0602e'];
		for (let i = 0; i < 4; i++) {
			const px = x + 4 + r() * (w - 10);
			const py = y + TOP + 1 + r() * 4;
			leaf(c, px, py, 4 + r() * 1.5, r() * 6.28, tints[i % 4]);
		}
	} else if (season === 'winter') {
		// a thin snow line on the top edge, an icicle or two
		c.fillStyle = '#f4f9fd';
		c.beginPath();
		c.moveTo(x, y + TOP + 1.2);
		for (let i = 0; i <= 12; i++) c.lineTo(x + (i / 12) * w, y + TOP - 0.8 - r() * 0.9);
		c.lineTo(x + w, y + TOP + 1.4);
		c.closePath();
		c.fill();
		c.fillStyle = 'rgba(210,232,250,.9)';
		for (let i = 0; i < 2; i++) {
			const ix = x + 6 + r() * (w - 12);
			c.beginPath();
			c.moveTo(ix - 1, y + TOP + 1);
			c.lineTo(ix + 1, y + TOP + 1);
			c.lineTo(ix, y + TOP + 4 + r() * 2);
			c.closePath();
			c.fill();
		}
	}
}

/** The two stone posts with the season's cap. */
function drawPosts(c: CanvasRenderingContext2D, g: LairGateRun, theme: MeadowTheme): void {
	const st = postStone(theme);
	for (const px of [g.x0 - POST / 2 + 1, g.x1 - POST / 2 - 1]) {
		c.fillStyle = 'rgba(0,0,0,.28)';
		c.fillRect(px + 1, g.y + BOT - 1, POST, 3);
		c.fillStyle = st.face;
		c.fillRect(px, g.y + TOP, POST, BOT - TOP + 1);
		c.fillStyle = st.top;
		c.fillRect(px - 0.5, g.y + TOP - 3, POST + 1, 6);
		c.strokeStyle = st.dark;
		c.lineWidth = 0.8;
		c.strokeRect(px - 0.5, g.y + TOP - 3, POST + 1, 6);
		c.strokeRect(px, g.y + TOP + 3, POST, BOT - TOP - 2);
		const cx = px + POST / 2;
		const cy = g.y + TOP;
		if (theme.name === 'spring') {
			blossom(c, cx, cy, 3, '#ffd0e2', '#fff4c2');
		} else if (theme.name === 'summer') {
			leaf(c, cx, cy, 4.5, -2.4, '#5fae3e');
			leaf(c, cx, cy, 4.5, -0.6, '#86cc4e');
			leaf(c, cx, cy, 4, 1.4, '#3f8f2e');
		} else if (theme.name === 'autumn') {
			c.fillStyle = '#e8743a';
			c.beginPath();
			c.ellipse(cx, cy, 3, 2.4, 0, 0, 7);
			c.fill();
			c.fillStyle = '#5a3a1a';
			c.fillRect(cx - 0.4, cy - 3.4, 0.9, 1.6);
		} else if (theme.name === 'winter') {
			c.fillStyle = '#ffffff';
			c.beginPath();
			c.ellipse(cx, cy - 1, POST / 2 + 1.2, 3.2, 0, 0, 7);
			c.fill();
		}
	}
}

/** One wooden leaf at full width `w` from `x`; `side` 1 hangs on the left post, -1 the right. */
function drawLeaf(
	c: CanvasRenderingContext2D,
	x: number,
	w: number,
	y: number,
	side: 1 | -1
): void {
	const boards = 5;
	const bw = w / boards;
	for (let i = 0; i < boards; i++) {
		const bx = x + i * bw;
		c.fillStyle = i % 2 ? '#94603a' : '#8a5834';
		c.fillRect(bx, y + FACE, bw, BOT - FACE);
		c.fillStyle = '#b8844e';
		c.fillRect(bx, y + TOP, bw, FACE - TOP);
		c.fillStyle = '#5a3820';
		c.fillRect(bx + bw - 0.6, y + TOP, 0.6, BOT - TOP);
	}
	c.fillStyle = '#6e4428';
	c.fillRect(x, y - 1.6, w, 2.2);
	c.fillRect(x, y + 4, w, 2);
	c.strokeStyle = '#6e4428';
	c.lineWidth = 1.8;
	c.beginPath();
	c.moveTo(side > 0 ? x + 1 : x + w - 1, y + 4);
	c.lineTo(side > 0 ? x + w - 1 : x + 1, y - 1);
	c.stroke();
	c.strokeStyle = '#3d2614';
	c.lineWidth = 0.8;
	c.strokeRect(x, y + TOP, w, BOT - TOP);
	// hinges at the post, the latch ring at the meeting edge
	c.fillStyle = '#2c2a2e';
	const hx = side > 0 ? x : x + w - 6;
	c.fillRect(hx, y - 1.8, 6, 1.6);
	c.fillRect(hx, y + 4.2, 6, 1.6);
	if (side > 0) {
		c.strokeStyle = '#2c2a2e';
		c.lineWidth = 1;
		c.beginPath();
		c.arc(x + w - 2.5, y + 2, 1.7, 0, 7);
		c.stroke();
	}
}

/** The gate over one run of lair-entry tiles, `open` 0 (shut) .. 1 (slid into its posts). */
export function drawLairGate(
	c: CanvasRenderingContext2D,
	g: LairGateRun,
	open: number,
	theme: MeadowTheme
): void {
	const inner0 = g.x0 + POST / 2 + 1;
	const inner1 = g.x1 - POST / 2 - 1;
	const full = (inner1 - inner0) / 2;
	const shown = full * (1 - Math.max(0, Math.min(1, open)));
	if (shown >= 0.3) {
		c.fillStyle = 'rgba(0,0,0,.3)';
		c.fillRect(inner0, g.y + BOT, shown, 2.5);
		c.fillRect(inner1 - shown, g.y + BOT, shown, 2.5);
		const slide = full - shown;
		for (const side of [1, -1] as const) {
			const x = side > 0 ? inner0 - slide : inner1 - full + slide;
			c.save();
			c.beginPath();
			c.rect(side > 0 ? inner0 : inner1 - shown, g.y + TOP - 6, shown, BOT - TOP + 12);
			c.clip();
			drawLeaf(c, x, full, g.y, side);
			dressLeaf(c, x, full, g.y, theme.name, side > 0 ? 11 : 29);
			c.restore();
		}
	}
	drawPosts(c, g, theme);
}
