// Throwaway: lair gate candidates, each painting the gate in world units over the bake, in
// the walls' 3/4 view (a top edge, a face toward the viewer). Shared: stone posts in the
// season's wall palette and the season's dress; opening, each leaf slides into its post.
export type GateSeason = 'spring' | 'summer' | 'autumn' | 'winter';
export interface GateState {
	open: number;
	season: GateSeason;
	night: number;
	t: number;
}
type G = { readonly x0: number; readonly x1: number; readonly y: number };
export type GatePainter = (ctx: CanvasRenderingContext2D, g: G, s: GateState) => void;

/** The season's wall stone (from the themes) for the posts. */
const STONE: Record<GateSeason, { top: string; face: string; dark: string }> = {
	spring: { top: '#e2caa0', face: '#b89a6c', dark: '#7a6044' },
	summer: { top: '#c9b48a', face: '#9c8460', dark: '#5e4c34' },
	autumn: { top: '#e2a456', face: '#a65a28', dark: '#6a2e10' },
	winter: { top: '#a9b0bd', face: '#7a8799', dark: '#4a5566' }
};

// the gate's frame in the 3/4 view, relative to g.y (the tile's centre line)
const TOP = -7; // the leaf's top edge
const FACE = -4; // where the face begins
const BOT = 7; // the face's foot
const POST = 8; // a post's width

function rnd(seed: number): () => number {
	let s = seed >>> 0 || 1;
	return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function blossom(c: CanvasRenderingContext2D, x: number, y: number, r: number, petal: string, eye: string): void {
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

function leaf(c: CanvasRenderingContext2D, x: number, y: number, len: number, a: number, fill: string): void {
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

/** The season's dress along a leaf's top edge, from x to x + w (drawn inside the leaf's clip). */
function dressLeaf(c: CanvasRenderingContext2D, x: number, w: number, y: number, s: GateSeason, seed: number): void {
	const r = rnd(seed);
	if (s === 'spring') {
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
	} else if (s === 'summer') {
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
			leaf(c, px, y + 1 + Math.sin((i * 2 + 1) * 0.65 + seed) * 4, 4.5, r() * 6.28, i % 2 ? '#5fae3e' : '#86cc4e');
		}
		blossom(c, x + w * 0.55, y - 1, 2.4, '#ffd23f', '#ff7a59');
	} else if (s === 'autumn') {
		// a few fallen leaves caught on the rail
		const tints = ['#e8743a', '#f6c25a', '#c0502e', '#e0602e'];
		for (let i = 0; i < 4; i++) {
			leaf(c, x + 4 + r() * (w - 10), y + TOP + 1 + r() * 4, 4 + r() * 1.5, r() * 6.28, tints[i % 4]);
		}
	} else {
		// a thin snow line on the top edge, a lump here and there, an icicle or two
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

/** The two stone posts, with the season's cap. */
function posts(c: CanvasRenderingContext2D, g: G, s: GateSeason): void {
	const st = STONE[s];
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
		if (s === 'spring') blossom(c, cx, cy, 3, '#ffd0e2', '#fff4c2');
		else if (s === 'summer') {
			leaf(c, cx, cy, 4.5, -2.4, '#5fae3e');
			leaf(c, cx, cy, 4.5, -0.6, '#86cc4e');
			leaf(c, cx, cy, 4, 1.4, '#3f8f2e');
		} else if (s === 'autumn') {
			c.fillStyle = '#e8743a';
			c.beginPath();
			c.ellipse(cx, cy, 3, 2.4, 0, 0, 7);
			c.fill();
			c.fillStyle = '#5a3a1a';
			c.fillRect(cx - 0.4, cy - 3.4, 0.9, 1.6);
		} else {
			c.fillStyle = '#ffffff';
			c.beginPath();
			c.ellipse(cx, cy - 1, POST / 2 + 1.2, 3.2, 0, 0, 7);
			c.fill();
		}
	}
}

/** Each leaf painted at full width, clipped to what is still out of its post. */
function leaves(
	c: CanvasRenderingContext2D,
	g: G,
	st: GateState,
	paint: (x: number, w: number, side: -1 | 1) => void
): void {
	const inner0 = g.x0 + POST / 2 + 1;
	const inner1 = g.x1 - POST / 2 - 1;
	const full = (inner1 - inner0) / 2;
	const shown = full * (1 - st.open);
	if (shown < 0.3) return;
	for (const side of [1, -1] as const) {
		const slide = full - shown;
		const x = side > 0 ? inner0 - slide : inner1 - full + slide;
		c.save();
		c.beginPath();
		c.rect(side > 0 ? inner0 : inner1 - shown, g.y + TOP - 6, shown, BOT - TOP + 12);
		c.clip();
		paint(x, full, side);
		dressLeaf(c, x, full, g.y, st.season, side > 0 ? 11 : 29);
		c.restore();
	}
}

/** A: a wooden double gate, boards with a Z brace, iron hinges and a ring latch. */
const wood: GatePainter = (c, g, st) => {
	const y = g.y;
	c.fillStyle = 'rgba(0,0,0,.3)';
	c.fillRect(g.x0, y + BOT, g.x1 - g.x0, 2.5);
	leaves(c, g, st, (x, w, side) => {
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
	});
	posts(c, g, st.season);
};

/** B: a wrought-iron gate, bars with spear tips and a scroll in each leaf; the lair shows through. */
const iron: GatePainter = (c, g, st) => {
	const y = g.y;
	const ink = '#2a2730';
	const hi = '#5a5562';
	leaves(c, g, st, (x, w, side) => {
		c.fillStyle = 'rgba(0,0,0,.22)';
		c.fillRect(x, y + BOT, w, 1.8);
		const n = 7;
		for (let i = 0; i <= n; i++) {
			const bx = x + 1 + (i / n) * (w - 2);
			c.fillStyle = ink;
			c.fillRect(bx - 0.6, y + TOP + 2, 1.2, BOT - TOP - 2);
			// spear tip
			c.beginPath();
			c.moveTo(bx, y + TOP - 1.2);
			c.lineTo(bx + 1.4, y + TOP + 1.6);
			c.lineTo(bx - 1.4, y + TOP + 1.6);
			c.closePath();
			c.fill();
			c.fillStyle = hi;
			c.fillRect(bx - 0.6, y + TOP + 2, 0.5, BOT - TOP - 2);
		}
		c.fillStyle = ink;
		c.fillRect(x, y + FACE, w, 1.4);
		c.fillRect(x, y + BOT - 1.6, w, 1.6);
		// a scroll (two curls) in the middle of the leaf
		c.strokeStyle = ink;
		c.lineWidth = 1;
		const mx = x + w / 2;
		for (const d of [-1, 1]) {
			c.beginPath();
			c.arc(mx + d * 3.4, y + 1.2, 2.6, d > 0 ? Math.PI : 0, d > 0 ? Math.PI * 2.6 : Math.PI * 1.6, d < 0);
			c.stroke();
		}
		if (side > 0) {
			c.fillStyle = '#c9a24a';
			c.fillRect(x + w - 2, y - 0.6, 2, 2.4);
		}
	});
	posts(c, g, st.season);
};

/** C: a wattle (woven willow) gate on stakes; the willow takes the season's tint. */
const WILLOW: Record<GateSeason, [string, string, string]> = {
	spring: ['#a08a58', '#c2ad74', '#6e5a34'],
	summer: ['#8e7a4a', '#b09a62', '#5e4c2c'],
	autumn: ['#9a6a3a', '#c08a50', '#5e3a1c'],
	winter: ['#857c70', '#a69c8e', '#544c44']
};
const wattle: GatePainter = (c, g, st) => {
	const y = g.y;
	const [mid, light, dark] = WILLOW[st.season];
	c.fillStyle = 'rgba(0,0,0,.28)';
	c.fillRect(g.x0, y + BOT, g.x1 - g.x0, 2.5);
	leaves(c, g, st, (x, w) => {
		const stakes = 5;
		const sx = (i: number) => x + 2 + (i / (stakes - 1)) * (w - 4);
		c.fillStyle = dark;
		c.fillRect(x, y + TOP + 1, w, BOT - TOP - 1);
		// the woven rods, over and under the stakes
		for (let row = 0; row < 9; row++) {
			const ry = y + TOP + 1.6 + row * 1.55;
			for (let i = 0; i < stakes - 1; i++) {
				const a = sx(i);
				const b = sx(i + 1);
				const up = (i + row) % 2 ? -0.45 : 0.45;
				c.strokeStyle = row % 3 === 0 ? light : row % 3 === 1 ? mid : light;
				c.lineWidth = 1.25;
				c.beginPath();
				c.moveTo(a - 0.5, ry - up);
				c.quadraticCurveTo((a + b) / 2, ry + up * 1.4, b + 0.5, ry - up);
				c.stroke();
			}
		}
		for (let i = 0; i < stakes; i++) {
			c.fillStyle = dark;
			c.fillRect(sx(i) - 1.1, y + TOP - 1, 2.2, BOT - TOP + 1);
			c.fillStyle = light;
			c.beginPath();
			c.arc(sx(i), y + TOP - 1, 1.2, 0, 7);
			c.fill();
		}
		if (st.season === 'spring') {
			// catkins on the fresh rods
			c.fillStyle = '#f2ecc8';
			for (let i = 0; i < 4; i++) {
				c.beginPath();
				c.ellipse(x + 5 + i * (w / 4), y + 2 + (i % 2) * 2, 1.4, 0.8, 0.3, 0, 7);
				c.fill();
			}
		}
	});
	posts(c, g, st.season);
};

export const CANDIDATES: Record<string, GatePainter> = { A: wood, B: iron, C: wattle };
