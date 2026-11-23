// The props of the season scenes (`seasonScene`), every one seen strictly from above (roofs,
// crowns, the tops of things, a shadow cast to the lower right since the key light is upper
// left), in world units (one tile = 24). They draw into the bake; the strings of lights return
// their bulbs so the world can light them at night.

export const TAU = Math.PI * 2;
export type C2 = CanvasRenderingContext2D;

/** A soft shadow on the ground, offset to the lower right (light from the upper left). */
export function shadow(
	b: C2,
	x: number,
	y: number,
	rx: number,
	ry: number,
	a = 0.32,
	dx = 0.18,
	dy = 0.24
): void {
	const cx = x + rx * dx;
	const cy = y + ry * dy;
	const g = b.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry) * 1.15);
	g.addColorStop(0, `rgba(10,8,12,${a})`);
	g.addColorStop(0.6, `rgba(10,8,12,${a * 0.6})`);
	g.addColorStop(1, 'rgba(10,8,12,0)');
	b.save();
	b.fillStyle = g;
	b.translate(cx, cy);
	b.scale(1, ry / rx);
	b.beginPath();
	b.arc(0, 0, rx * 1.15, 0, TAU);
	b.fill();
	b.restore();
}

/** A warm pool of light on the ground (baked: it is there by day too, faintly). */
export function lightPool(b: C2, x: number, y: number, r: number, rgb: string, a: number): void {
	const g = b.createRadialGradient(x, y, 0, x, y, r);
	g.addColorStop(0, `rgba(${rgb},${a})`);
	g.addColorStop(1, `rgba(${rgb},0)`);
	b.fillStyle = g;
	b.fillRect(x - r, y - r, r * 2, r * 2);
}

const ball = (b: C2, x: number, y: number, r: number, c0: string, c1: string): void => {
	const g = b.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
	g.addColorStop(0, c0);
	g.addColorStop(1, c1);
	b.fillStyle = g;
	b.beginPath();
	b.arc(x, y, r, 0, TAU);
	b.fill();
};

// ----------------------------------------------------------------------------- autumn

/**
 * A pumpkin from above: ribbed lobes round a stem. Carved (`lit`): the lid's cut ring glows and
 * the light leaks out onto the ground on the side the face looks to (`face`, radians).
 */
export function pumpkin(
	b: C2,
	x: number,
	y: number,
	r: number,
	lit: boolean,
	rot: number,
	face = 0.6
): void {
	shadow(b, x, y, r * 1.05, r * 0.95, 0.35);
	if (lit)
		lightPool(
			b,
			x + Math.cos(face) * r * 1.3,
			y + Math.sin(face) * r * 1.3,
			r * 2.6,
			'255,150,40',
			0.28
		);
	const N = 8;
	for (let i = 0; i < N; i += 1) {
		const a = rot + (i / N) * TAU;
		const lx = x + Math.cos(a) * r * 0.42;
		const ly = y + Math.sin(a) * r * 0.42;
		b.save();
		b.translate(lx, ly);
		b.rotate(a);
		const g = b.createLinearGradient(-r * 0.6, 0, r * 0.6, 0);
		g.addColorStop(0, '#b4480e');
		g.addColorStop(0.5, i % 2 ? '#e87a1c' : '#f08a26');
		g.addColorStop(1, '#a03c0a');
		b.fillStyle = g;
		b.beginPath();
		b.ellipse(0, 0, r * 0.62, r * 0.4, 0, 0, TAU);
		b.fill();
		b.restore();
	}
	// the grooves between the lobes
	b.strokeStyle = 'rgba(90,30,6,.55)';
	b.lineWidth = r * 0.07;
	for (let i = 0; i < N; i += 1) {
		const a = rot + ((i + 0.5) / N) * TAU;
		b.beginPath();
		b.moveTo(x + Math.cos(a) * r * 0.25, y + Math.sin(a) * r * 0.25);
		b.lineTo(x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95);
		b.stroke();
	}
	// light from the upper left on the top
	const hl = b.createRadialGradient(
		x - r * 0.35,
		y - r * 0.4,
		0,
		x - r * 0.35,
		y - r * 0.4,
		r * 0.7
	);
	hl.addColorStop(0, 'rgba(255,214,140,.45)');
	hl.addColorStop(1, 'rgba(255,214,140,0)');
	b.fillStyle = hl;
	b.beginPath();
	b.arc(x, y, r, 0, TAU);
	b.fill();
	if (lit) {
		// the lid cut: a glowing ring with a zigzag, the candle's light in it
		b.strokeStyle = '#ffd27a';
		b.lineWidth = r * 0.1;
		b.beginPath();
		for (let i = 0; i <= 16; i += 1) {
			const a = (i / 16) * TAU;
			const rr = r * (0.38 + (i % 2 ? 0.06 : 0));
			b.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
		}
		b.closePath();
		b.stroke();
		b.strokeStyle = 'rgba(120,40,8,.8)';
		b.lineWidth = r * 0.04;
		b.stroke();
	}
	// the stem
	b.save();
	b.translate(x, y);
	b.rotate(rot * 1.7);
	b.fillStyle = '#4a3a1c';
	b.beginPath();
	b.ellipse(0, 0, r * 0.13, r * 0.2, 0.5, 0, TAU);
	b.fill();
	b.fillStyle = '#6e5a2c';
	b.beginPath();
	b.ellipse(-r * 0.03, -r * 0.05, r * 0.06, r * 0.09, 0.5, 0, TAU);
	b.fill();
	b.restore();
}

/** A candle from above: a cream disc, a wax drip, the flame a bright dot (its glow is live). */
export function candle(b: C2, x: number, y: number, r: number): void {
	shadow(b, x, y, r * 1.1, r, 0.3);
	lightPool(b, x, y, r * 4, '255,170,70', 0.2);
	ball(b, x, y, r, '#fff6e0', '#d9c8a4');
	b.fillStyle = '#f2e6c8';
	b.beginPath();
	b.ellipse(x + r * 0.5, y + r * 0.6, r * 0.3, r * 0.45, -0.6, 0, TAU);
	b.fill();
	ball(b, x, y, r * 0.38, '#fffbe8', '#ffb340');
}

/**
 * A standing headstone from above: its narrow top (a rounded slab), the long shadow it throws to
 * the lower right; or a flat ledger stone with a cross cut into it.
 */
export function headstone(
	b: C2,
	x: number,
	y: number,
	w: number,
	rot: number,
	flat: boolean
): void {
	b.save();
	b.translate(x, y);
	b.rotate(rot);
	if (flat) {
		const h = w * 1.5;
		b.fillStyle = 'rgba(10,8,12,.3)';
		b.beginPath();
		b.roundRect(-w / 2 + 2, -h / 2 + 3, w, h, w * 0.2);
		b.fill();
		const g = b.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
		g.addColorStop(0, '#9a9aa2');
		g.addColorStop(1, '#5e5e68');
		b.fillStyle = g;
		b.beginPath();
		b.roundRect(-w / 2, -h / 2, w, h, w * 0.2);
		b.fill();
		b.strokeStyle = 'rgba(30,28,36,.6)';
		b.lineWidth = w * 0.09;
		b.beginPath();
		b.moveTo(0, -h * 0.32);
		b.lineTo(0, h * 0.3);
		b.moveTo(-w * 0.26, -h * 0.1);
		b.lineTo(w * 0.26, -h * 0.1);
		b.stroke();
		b.fillStyle = 'rgba(90,120,60,.5)';
		b.beginPath();
		b.ellipse(-w * 0.3, h * 0.38, w * 0.22, w * 0.12, 0.3, 0, TAU);
		b.fill();
	} else {
		// the shadow of a stone of height ~w: a long soft wedge to the lower right
		b.save();
		b.rotate(-rot);
		b.fillStyle = 'rgba(10,8,12,.32)';
		b.beginPath();
		b.ellipse(w * 0.45, w * 0.6, w * 0.75, w * 0.32, 0.6, 0, TAU);
		b.fill();
		b.restore();
		const g = b.createLinearGradient(0, -w * 0.15, 0, w * 0.15);
		g.addColorStop(0, '#b4b4bc');
		g.addColorStop(1, '#6a6a74');
		b.fillStyle = g;
		b.beginPath();
		b.roundRect(-w / 2, -w * 0.14, w, w * 0.28, [w * 0.14, w * 0.14, w * 0.04, w * 0.04]);
		b.fill();
		b.strokeStyle = 'rgba(30,28,36,.7)';
		b.lineWidth = 0.8;
		b.stroke();
	}
	b.restore();
}

/** A sheet ghost lying in the grass, looking up at the sky: a soft white shape, two dark eyes. */
export function grassGhost(b: C2, x: number, y: number, s: number, rot: number): void {
	b.save();
	b.translate(x, y);
	b.rotate(rot);
	const g = b.createRadialGradient(0, 0, 0, 0, s * 0.2, s * 1.2);
	g.addColorStop(0, 'rgba(236,240,250,.62)');
	g.addColorStop(0.6, 'rgba(220,226,240,.34)');
	g.addColorStop(1, 'rgba(220,226,240,0)');
	b.fillStyle = g;
	b.beginPath();
	b.moveTo(-s * 0.55, -s * 0.1);
	b.quadraticCurveTo(-s * 0.6, -s * 0.75, 0, -s * 0.78);
	b.quadraticCurveTo(s * 0.6, -s * 0.75, s * 0.55, -s * 0.1);
	for (let i = 0; i <= 6; i += 1) {
		const f = i / 6;
		b.lineTo(s * (0.55 - 1.1 * f) * 1.1, s * (0.8 + (i % 2 ? 0.25 : 0)));
	}
	b.closePath();
	b.fill();
	b.fillStyle = 'rgba(30,26,46,.7)';
	for (const sx of [-1, 1]) {
		b.beginPath();
		b.ellipse(sx * s * 0.2, -s * 0.35, s * 0.08, s * 0.12, 0, 0, TAU);
		b.fill();
	}
	b.restore();
}

/**
 * A fan of cobweb from a corner hub (`hx`, `hy`) between angles a0..a1: spokes, and sagging
 * threads between them. Muted (it must not read as snow or a light artefact at the corner).
 */
export function web(
	b: C2,
	hx: number,
	hy: number,
	r: number,
	a0: number,
	a1: number,
	col = 'rgba(196,190,214,.55)'
): void {
	const n = 5;
	b.save();
	b.strokeStyle = col;
	b.lineWidth = 0.55;
	b.lineCap = 'round';
	const spokes: Array<[number, number]> = [];
	for (let i = 0; i <= n; i += 1) {
		const a = a0 + ((a1 - a0) * i) / n;
		spokes.push([Math.cos(a), Math.sin(a)]);
		b.beginPath();
		b.moveTo(hx, hy);
		b.lineTo(hx + Math.cos(a) * r, hy + Math.sin(a) * r);
		b.stroke();
	}
	for (let k = 1; k <= 4; k += 1) {
		const rr = (r * k) / 4.4;
		b.beginPath();
		for (let i = 0; i < spokes.length; i += 1) {
			const [cx, cy] = spokes[i];
			const px = hx + cx * rr;
			const py = hy + cy * rr;
			if (i === 0) b.moveTo(px, py);
			else {
				const [qx, qy] = spokes[i - 1];
				// the thread sags towards the hub between two spokes
				const mx = hx + ((cx + qx) / 2) * rr * 0.86;
				const my = hy + ((cy + qy) / 2) * rr * 0.86;
				b.quadraticCurveTo(mx, my, px, py);
			}
		}
		b.stroke();
	}
	b.restore();
}

/** A small spider from above: a round body, a smaller head, eight bent legs. */
export function spider(b: C2, x: number, y: number, s: number, rot: number): void {
	b.save();
	b.translate(x, y);
	b.rotate(rot);
	b.strokeStyle = '#141018';
	b.lineWidth = s * 0.12;
	b.lineCap = 'round';
	for (const side of [-1, 1]) {
		for (let i = 0; i < 4; i += 1) {
			const a = -0.9 + i * 0.55;
			b.beginPath();
			b.moveTo(0, 0);
			b.lineTo(side * s * 0.55, s * (a * 0.6));
			b.lineTo(side * s * 0.9, s * (a * 0.95 + 0.15));
			b.stroke();
		}
	}
	b.fillStyle = '#1c1620';
	b.beginPath();
	b.ellipse(0, s * 0.2, s * 0.32, s * 0.38, 0, 0, TAU);
	b.fill();
	b.beginPath();
	b.arc(0, -s * 0.25, s * 0.18, 0, TAU);
	b.fill();
	b.fillStyle = 'rgba(200,60,60,.9)';
	b.fillRect(-s * 0.06, s * 0.12, s * 0.12, s * 0.12);
	b.restore();
}

/** A bat's silhouette (for its shadow, live): wings out, scalloped trailing edge. */
export function bat(
	b: C2,
	x: number,
	y: number,
	s: number,
	rot: number,
	flap: number,
	col: string
): void {
	b.save();
	b.translate(x, y);
	b.rotate(rot);
	b.fillStyle = col;
	b.beginPath();
	const w = s * (0.75 + 0.25 * flap);
	b.moveTo(0, -s * 0.3);
	b.quadraticCurveTo(w * 0.5, -s * 0.55, w, -s * 0.2);
	b.quadraticCurveTo(w * 0.8, s * 0.05, w * 0.62, s * 0.05);
	b.quadraticCurveTo(w * 0.5, s * 0.25, w * 0.32, s * 0.08);
	b.quadraticCurveTo(w * 0.18, s * 0.3, 0, s * 0.18);
	b.quadraticCurveTo(-w * 0.18, s * 0.3, -w * 0.32, s * 0.08);
	b.quadraticCurveTo(-w * 0.5, s * 0.25, -w * 0.62, s * 0.05);
	b.quadraticCurveTo(-w * 0.8, s * 0.05, -w, -s * 0.2);
	b.quadraticCurveTo(-w * 0.5, -s * 0.55, 0, -s * 0.3);
	b.fill();
	b.restore();
}

// ----------------------------------------------------------------------------- winter

export interface Bulb {
	x: number;
	y: number;
	rgb: string;
	ph: number;
}
const BULBS = ['255,214,120', '255,90,80', '120,220,140', '120,170,255', '255,240,210'];

/**
 * A string of lights along `pts` (world units): a dark wire and a bulb every `gap`. The bulbs are
 * returned so the live layer can light them (slowly, out of step).
 */
export function lights(
	b: C2,
	pts: ReadonlyArray<readonly [number, number]>,
	gap: number,
	seed: number,
	warm = false
): Bulb[] {
	const out: Bulb[] = [];
	b.save();
	b.strokeStyle = 'rgba(24,30,22,.8)';
	b.lineWidth = 0.7;
	b.beginPath();
	pts.forEach(([x, y], i) => (i ? b.lineTo(x, y) : b.moveTo(x, y)));
	b.stroke();
	let acc = gap / 2;
	let n = 0;
	for (let i = 1; i < pts.length; i += 1) {
		const [x0, y0] = pts[i - 1];
		const [x1, y1] = pts[i];
		const L = Math.hypot(x1 - x0, y1 - y0);
		while (acc < L) {
			const f = acc / L;
			const x = x0 + (x1 - x0) * f;
			const y = y0 + (y1 - y0) * f;
			const rgb = warm
				? BULBS[n % 2 === 0 ? 0 : 4]
				: BULBS[(((n + seed) % BULBS.length) + BULBS.length) % BULBS.length];
			b.fillStyle = `rgb(${rgb})`;
			b.beginPath();
			b.arc(x, y, 1.15, 0, TAU);
			b.fill();
			b.fillStyle = 'rgba(255,255,255,.8)';
			b.beginPath();
			b.arc(x - 0.35, y - 0.35, 0.4, 0, TAU);
			b.fill();
			out.push({ x, y, rgb, ph: ((n * 7 + seed * 13) % 17) / 17 });
			acc += gap;
			n += 1;
		}
		acc -= L;
	}
	b.restore();
	return out;
}

/** Warm window light spilling on the ground beside a wall of a house (from above: a soft trapezoid). */
export function windowSpill(
	b: C2,
	x: number,
	y: number,
	w: number,
	len: number,
	dirX: number,
	dirY: number,
	rgb = '255,196,110',
	a = 0.42
): void {
	b.save();
	b.translate(x, y);
	b.rotate(Math.atan2(dirY, dirX));
	const g = b.createLinearGradient(0, 0, len, 0);
	g.addColorStop(0, `rgba(${rgb},${a})`);
	g.addColorStop(1, `rgba(${rgb},0)`);
	b.fillStyle = g;
	b.beginPath();
	b.moveTo(0, -w / 2);
	b.lineTo(len, -w * 0.85);
	b.lineTo(len, w * 0.85);
	b.lineTo(0, w / 2);
	b.closePath();
	b.fill();
	// the window frame's shadow bar in the light
	b.fillStyle = `rgba(60,40,20,${a * 0.35})`;
	b.fillRect(0, -0.5, len * 0.8, 1);
	b.restore();
}

/**
 * The New Year tree from above: five layers of branches, each a star of soft points, darker
 * below, snow on the tips, baubles, a spiral of lights from the top down and the gold star at
 * the very top (the centre). Returns its bulbs.
 */
export function newYearTree(b: C2, x: number, y: number, r: number): Bulb[] {
	shadow(b, x + r * 0.15, y + r * 0.2, r * 1.05, r * 0.95, 0.4);
	const layers = 5;
	for (let l = 0; l < layers; l += 1) {
		const k = 1 - l / layers;
		const R0 = r * (0.25 + 0.75 * k);
		const n = 9 + l;
		const rot = l * 0.37;
		b.beginPath();
		for (let i = 0; i <= n * 2; i += 1) {
			const a = rot + (i / (n * 2)) * TAU;
			const rr = i % 2 ? R0 * 0.78 : R0;
			b.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
		}
		b.closePath();
		const g = b.createRadialGradient(x - R0 * 0.3, y - R0 * 0.3, R0 * 0.1, x, y, R0);
		g.addColorStop(0, ['#2f7a44', '#2c7340', '#2a6c3d', '#286539', '#265e35'][l]);
		g.addColorStop(1, ['#123d22', '#14421f', '#174a25', '#1a5229', '#1d592d'][l]);
		b.fillStyle = g;
		b.fill();
		b.strokeStyle = 'rgba(8,26,14,.55)';
		b.lineWidth = 0.7;
		b.stroke();
		// snow on the lit tips
		for (let i = 0; i < n; i += 1) {
			const a = rot + (i / n) * TAU;
			if (Math.cos(a - 3.9) < 0.1) continue;
			b.fillStyle = 'rgba(240,246,255,.85)';
			b.beginPath();
			b.ellipse(
				x + Math.cos(a) * R0 * 0.88,
				y + Math.sin(a) * R0 * 0.88,
				R0 * 0.09,
				R0 * 0.05,
				a,
				0,
				TAU
			);
			b.fill();
		}
	}
	// baubles
	const cols: ReadonlyArray<readonly [string, string]> = [
		['#ff8a8a', '#a01818'],
		['#ffe39a', '#b07810'],
		['#a8c8ff', '#2a4aa0'],
		['#f4b8ff', '#7a2a90']
	];
	for (let i = 0; i < 14; i += 1) {
		const a = i * 2.39996 + 0.4;
		const d = r * (0.3 + 0.62 * ((i * 0.618) % 1));
		ball(b, x + Math.cos(a) * d, y + Math.sin(a) * d, r * 0.075, cols[i % 4][0], cols[i % 4][1]);
	}
	// the lights: a spiral from the top (centre) out to the lowest branches
	const pts: Array<[number, number]> = [];
	for (let i = 0; i <= 60; i += 1) {
		const f = i / 60;
		const a = f * TAU * 2.6 + 0.8;
		const d = r * (0.12 + 0.8 * f);
		pts.push([x + Math.cos(a) * d, y + Math.sin(a) * d]);
	}
	const bulbs = lights(b, pts, 4.2, 2, true);
	// the star on top: gold, five points, at the centre
	b.save();
	b.translate(x, y);
	b.rotate(-0.3);
	b.beginPath();
	for (let i = 0; i < 10; i += 1) {
		const a = (i / 10) * TAU - Math.PI / 2;
		const rr = i % 2 ? r * 0.08 : r * 0.2;
		b.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
	}
	b.closePath();
	const sg = b.createRadialGradient(-r * 0.04, -r * 0.05, 0, 0, 0, r * 0.2);
	sg.addColorStop(0, '#fff6c8');
	sg.addColorStop(1, '#e0a020');
	b.fillStyle = sg;
	b.fill();
	b.strokeStyle = '#6a4408';
	b.lineWidth = 0.8;
	b.stroke();
	b.restore();
	bulbs.push({ x, y, rgb: '255,220,120', ph: 0.5 });
	return bulbs;
}

/** A wrapped present from above: the box's lid, a ribbon cross, a bow at the knot. */
export function gift(
	b: C2,
	x: number,
	y: number,
	w: number,
	h: number,
	rot: number,
	box: string,
	ribbon: string
): void {
	b.save();
	b.translate(x, y);
	b.rotate(rot);
	b.fillStyle = 'rgba(10,8,12,.32)';
	b.fillRect(-w / 2 + 2, -h / 2 + 2.6, w, h);
	b.fillStyle = box;
	b.fillRect(-w / 2, -h / 2, w, h);
	b.fillStyle = 'rgba(255,255,255,.18)';
	b.fillRect(-w / 2, -h / 2, w, h * 0.3);
	b.fillStyle = 'rgba(0,0,0,.16)';
	b.fillRect(-w / 2, h * 0.3, w, h * 0.2);
	b.fillStyle = ribbon;
	b.fillRect(-w * 0.09, -h / 2, w * 0.18, h);
	b.fillRect(-w / 2, -h * 0.09, w, h * 0.18);
	for (const s of [-1, 1]) {
		b.beginPath();
		b.ellipse(s * w * 0.16, 0, w * 0.16, h * 0.1, s * 0.5, 0, TAU);
		b.fill();
	}
	b.strokeStyle = 'rgba(30,10,10,.45)';
	b.lineWidth = 0.6;
	b.strokeRect(-w / 2, -h / 2, w, h);
	b.restore();
}

// ----------------------------------------------------------------------------- spring

/** A paper lantern from above: a round shade with ribs, a warm heart (its glow is live). */
export function paperLantern(b: C2, x: number, y: number, r: number, col: string): void {
	shadow(b, x + r * 1.2, y + r * 1.4, r, r * 0.8, 0.22);
	ball(b, x, y, r, '#fff1e0', col);
	b.strokeStyle = 'rgba(120,40,30,.45)';
	b.lineWidth = 0.5;
	for (let i = 1; i <= 2; i += 1) {
		b.beginPath();
		b.arc(x, y, (r * i) / 3, 0, TAU);
		b.stroke();
	}
	b.fillStyle = '#3a2418';
	b.beginPath();
	b.arc(x, y, r * 0.22, 0, TAU);
	b.fill();
}

/** A blanket with a check from above, slightly turned, with a soft edge shadow. */
export function blanket(
	b: C2,
	x: number,
	y: number,
	w: number,
	h: number,
	rot: number,
	c0: string,
	c1: string
): void {
	b.save();
	b.translate(x, y);
	b.rotate(rot);
	b.fillStyle = 'rgba(10,8,12,.2)';
	b.fillRect(-w / 2 + 1.5, -h / 2 + 2, w, h);
	b.fillStyle = c0;
	b.fillRect(-w / 2, -h / 2, w, h);
	b.fillStyle = c1;
	const s = w / 6;
	for (let i = 0; i < 6; i += 2) b.fillRect(-w / 2 + i * s, -h / 2, s, h);
	b.globalAlpha = 0.5;
	for (let j = 0; j * s < h; j += 2) b.fillRect(-w / 2, -h / 2 + j * s, w, s);
	b.globalAlpha = 1;
	b.restore();
}

/** A tent from above: a square roof of stripes meeting at the peak, a pennant on the pole. */
export function tent(b: C2, x: number, y: number, s: number, c0: string, c1: string): void {
	b.fillStyle = 'rgba(10,8,12,.3)';
	b.fillRect(x - s / 2 + 3, y - s / 2 + 4, s, s);
	const corners: Array<[number, number]> = [
		[-1, -1],
		[1, -1],
		[1, 1],
		[-1, 1]
	];
	for (let i = 0; i < 4; i += 1) {
		const [ax, ay] = corners[i];
		const [bx, by] = corners[(i + 1) % 4];
		const n = 4;
		for (let j = 0; j < n; j += 1) {
			const f0 = j / n;
			const f1 = (j + 1) / n;
			b.fillStyle = j % 2 ? c0 : c1;
			b.beginPath();
			b.moveTo(x, y);
			b.lineTo(x + (ax + (bx - ax) * f0) * s * 0.5, y + (ay + (by - ay) * f0) * s * 0.5);
			b.lineTo(x + (ax + (bx - ax) * f1) * s * 0.5, y + (ay + (by - ay) * f1) * s * 0.5);
			b.closePath();
			b.fill();
		}
		// the roof's sides lit from the upper left
		b.fillStyle = i === 0 || i === 3 ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.16)';
		b.beginPath();
		b.moveTo(x, y);
		b.lineTo(x + ax * s * 0.5, y + ay * s * 0.5);
		b.lineTo(x + bx * s * 0.5, y + by * s * 0.5);
		b.closePath();
		b.fill();
	}
	b.strokeStyle = 'rgba(40,20,20,.5)';
	b.lineWidth = 0.8;
	b.strokeRect(x - s / 2, y - s / 2, s, s);
	ball(b, x, y, s * 0.06, '#ffffff', '#a09080');
}

/** A bunch of balloons tied together, from above: their shadows lie away to the lower right. */
export function balloons(b: C2, x: number, y: number, s: number, seed: number): void {
	const cols: ReadonlyArray<readonly [string, string]> = [
		['#ff9a9a', '#c82828'],
		['#9ad0ff', '#2868c8'],
		['#fff09a', '#c8a020'],
		['#b8ffb0', '#30a040'],
		['#e8b0ff', '#8a38c0']
	];
	const pts: Array<[number, number, number]> = [];
	for (let i = 0; i < 5; i += 1) {
		const a = i * 1.3 + seed;
		pts.push([x + Math.cos(a) * s * 0.55, y + Math.sin(a) * s * 0.45, i]);
	}
	// shadows far off (they float high), strings to the knot
	for (const [px, py] of pts) {
		b.fillStyle = 'rgba(10,8,12,.16)';
		b.beginPath();
		b.ellipse(px + s * 1.2, py + s * 1.5, s * 0.34, s * 0.3, 0, 0, TAU);
		b.fill();
	}
	b.strokeStyle = 'rgba(250,250,250,.7)';
	b.lineWidth = 0.4;
	for (const [px, py] of pts) {
		b.beginPath();
		b.moveTo(x, y + s * 0.2);
		b.lineTo(px, py);
		b.stroke();
	}
	for (const [px, py, i] of pts) ball(b, px, py, s * 0.36, cols[i][0], cols[i][1]);
}
