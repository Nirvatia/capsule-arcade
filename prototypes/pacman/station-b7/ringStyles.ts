// Candidates for the quarantine ring's look in the hive's language (prototype, throwaway). The
// geometry, the phases and the warning contour are the game's (`quarantineRing`); only the lit
// rim, the zone and the seals are drawn here, three ways:
//   A  the rope: a pale veined cord with cysts and capillaries, the hive's own flesh grown pale;
//   B  the membrane: a thin orchid film with veins reaching into the zone, a new hue;
//   C  the welt: a stitched scar, raised bone-pink in an inflamed halo, the quarantine as a wound
//      sewn shut.
import type { QuarantineRing, RingSeal } from '../../../src/games/pacman/logic/station/StationSquad';
import {
	paintGuide,
	type RingLayout,
	type RingLook
} from '../../../src/games/pacman/render/station/quarantineRing';

export type RingStyle = 'A' | 'B' | 'C';

const TAU = Math.PI * 2;
const hash = (a: number, b: number) => {
	const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
	return s - Math.floor(s);
};
const rimAt = (R: number, S: number, a: number, t: number) =>
	R + Math.sin(a * 9 + t * 0.8) * S * 0.07 + Math.sin(a * 23 - t * 1.3) * S * 0.035;

interface Pal {
	dark: string;
	body: string;
	light: string;
	glow: string;
	zone: string;
	/** Cord widths in tiles: outline, body, highlight. */
	wo: number;
	wb: number;
	wl: number;
	/** The same for a seal. */
	so: number;
	sb: number;
}
const PAL: Record<RingStyle, Pal> = {
	A: { dark: '52,10,24', body: '226,152,140', light: '255,228,208', glow: '255,120,100', zone: '120,26,42', wo: 0.36, wb: 0.26, wl: 0.06, so: 0.5, sb: 0.37 },
	B: { dark: '38,10,62', body: '190,108,228', light: '250,216,255', glow: '180,90,255', zone: '126,44,176', wo: 0.15, wb: 0.085, wl: 0.035, so: 0.34, sb: 0.22 },
	C: { dark: '52,22,22', body: '228,202,180', light: '255,248,232', glow: '255,84,64', zone: '160,30,30', wo: 0.34, wb: 0.24, wl: 0.05, so: 0.46, sb: 0.34 }
};

interface Pt {
	x: number;
	y: number;
	nx: number;
	ny: number;
}

function rimPts(cx: number, cy: number, R: number, S: number, lo: number, hi: number, t: number): Pt[] {
	const n = Math.max(8, Math.ceil(((hi - lo) * R) / (S * 0.2)));
	const out: Pt[] = [];
	for (let i = 0; i <= n; i++) {
		const a = lo + ((hi - lo) * i) / n;
		const r = rimAt(R, S, a, t);
		out.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, nx: Math.cos(a), ny: Math.sin(a) });
	}
	return out;
}

function trace(c: CanvasRenderingContext2D, P: readonly Pt[], off = 0): void {
	c.beginPath();
	P.forEach((p, i) => (i ? c.lineTo(p.x + p.nx * off, p.y + p.ny * off) : c.moveTo(p.x + p.nx * off, p.y + p.ny * off)));
}

/** A cord along a path: glow, dark outline, body, highlight; strands and stitches on request. */
function cord(
	c: CanvasRenderingContext2D,
	P: readonly Pt[],
	pal: Pal,
	S: number,
	wo: number,
	wb: number,
	alive: number,
	t: number,
	style: RingStyle,
	seed: number
): void {
	if (P.length < 2) return;
	const pulse = 1 + 0.07 * Math.sin(t * 2.4 + seed);
	c.lineJoin = 'round';
	c.lineCap = 'round';
	c.globalCompositeOperation = 'lighter';
	trace(c, P);
	c.strokeStyle = `rgba(${pal.glow}, ${0.16 * alive})`;
	c.lineWidth = S * wo * 2.3;
	c.stroke();
	c.globalCompositeOperation = 'source-over';
	trace(c, P);
	c.strokeStyle = `rgba(${pal.dark}, ${0.92 * alive})`;
	c.lineWidth = S * wo * pulse;
	c.stroke();
	trace(c, P);
	c.strokeStyle = `rgba(${pal.body}, ${(style === 'B' ? 0.8 : 0.95) * alive})`;
	c.lineWidth = S * wb * pulse;
	c.stroke();
	if (style === 'A') {
		// two strands twisting over each other
		for (const k of [0, Math.PI]) {
			c.beginPath();
			P.forEach((p, i) => {
				const o = Math.sin(i * 0.55 + k + t * 0.7) * S * wb * 0.26;
				if (i) c.lineTo(p.x + p.nx * o, p.y + p.ny * o);
				else c.moveTo(p.x + p.nx * o, p.y + p.ny * o);
			});
			c.strokeStyle = `rgba(${pal.dark}, ${0.55 * alive})`;
			c.lineWidth = Math.max(1, S * 0.035);
			c.stroke();
		}
	}
	if (style === 'C') {
		// stitches across the welt, a thread over each
		const h = S * wb * 0.62;
		for (let i = 1; i < P.length - 1; i += 2) {
			const p = P[i];
			const tx = -p.ny;
			const ty = p.nx;
			const lean = (hash(i, seed) - 0.5) * 0.5;
			const ax = p.x + p.nx * h + tx * lean * S * 0.06;
			const ay = p.y + p.ny * h + ty * lean * S * 0.06;
			const bx = p.x - p.nx * h - tx * lean * S * 0.06;
			const by = p.y - p.ny * h - ty * lean * S * 0.06;
			c.beginPath();
			c.moveTo(ax, ay);
			c.lineTo(bx, by);
			c.strokeStyle = `rgba(${pal.dark}, ${0.85 * alive})`;
			c.lineWidth = Math.max(1, S * 0.04);
			c.stroke();
			c.beginPath();
			c.arc(ax, ay, S * 0.03, 0, TAU);
			c.arc(bx, by, S * 0.03, 0, TAU);
			c.fillStyle = `rgba(${pal.light}, ${0.9 * alive})`;
			c.fill();
		}
	}
	trace(c, P, -S * wb * 0.18);
	c.strokeStyle = `rgba(${pal.light}, ${(style === 'B' ? 0.85 : 0.55) * alive})`;
	c.lineWidth = Math.max(1, S * pal.wl);
	c.stroke();
}

function zone(c: CanvasRenderingContext2D, cx: number, cy: number, R: number, pal: Pal, lit: number, t: number): void {
	const g = c.createRadialGradient(cx, cy, R * 0.55, cx, cy, R);
	g.addColorStop(0, `rgba(${pal.zone}, 0)`);
	g.addColorStop(1, `rgba(${pal.zone}, ${0.2 * lit})`);
	c.fillStyle = g;
	c.beginPath();
	c.arc(cx, cy, R, 0, TAU);
	c.fill();
	// the hive's beat (6 s, soft): a swell sweeping in from the rim
	const k = (t % 6) / 6;
	const rw = R * (1 - 0.32 * k);
	const w = c.createRadialGradient(cx, cy, Math.max(0, rw - R * 0.16), cx, cy, rw);
	w.addColorStop(0, `rgba(${pal.zone}, 0)`);
	w.addColorStop(1, `rgba(${pal.zone}, ${0.16 * (1 - k) * lit})`);
	c.fillStyle = w;
	c.beginPath();
	c.arc(cx, cy, rw, 0, TAU);
	c.fill();
}

function extras(
	c: CanvasRenderingContext2D,
	style: RingStyle,
	cx: number,
	cy: number,
	R: number,
	S: number,
	pal: Pal,
	arcs: ReadonlyArray<readonly [number, number]>,
	alive: number,
	t: number
): void {
	const inArcs = (a: number) =>
		arcs.some(([lo, hi]) => {
			const d = Math.atan2(Math.sin(a - (lo + hi) / 2), Math.cos(a - (lo + hi) / 2));
			return Math.abs(d) <= (hi - lo) / 2;
		});
	if (style === 'A') {
		// cysts along the cord, a capillary fork reaching into the zone from each
		const n = Math.round((R * TAU) / (S * 1.5));
		for (let i = 0; i < n; i++) {
			const a = (i / n) * TAU + hash(i, 1) * 0.05;
			if (!inArcs(a)) continue;
			const r = rimAt(R, S, a, t);
			const x = cx + Math.cos(a) * r;
			const y = cy + Math.sin(a) * r;
			for (const side of [-1, 1]) {
				const len = S * (0.5 + 0.7 * hash(i, 2 + side));
				const bend = side * S * 0.3;
				const ex = cx + Math.cos(a + side * 0.12) * (r - len);
				const ey = cy + Math.sin(a + side * 0.12) * (r - len);
				c.beginPath();
				c.moveTo(x, y);
				c.quadraticCurveTo((x + ex) / 2 - Math.sin(a) * bend, (y + ey) / 2 + Math.cos(a) * bend, ex, ey);
				c.strokeStyle = `rgba(${pal.dark}, ${0.7 * alive})`;
				c.lineWidth = Math.max(1, S * 0.04);
				c.stroke();
				c.beginPath();
				c.arc(ex, ey, S * 0.035, 0, TAU);
				c.fillStyle = `rgba(${pal.light}, ${0.8 * alive})`;
				c.fill();
			}
			const beat = 0.5 + 0.5 * Math.sin(t * 2.4 + i * 1.7);
			c.beginPath();
			c.ellipse(x, y, S * 0.2, S * 0.17, a, 0, TAU);
			c.fillStyle = `rgba(${pal.body}, ${alive})`;
			c.fill();
			c.strokeStyle = `rgba(${pal.dark}, ${alive})`;
			c.lineWidth = Math.max(1, S * 0.045);
			c.stroke();
			c.beginPath();
			c.arc(x - S * 0.02, y - S * 0.03, S * (0.055 + 0.02 * beat), 0, TAU);
			c.fillStyle = `rgba(${pal.light}, ${(0.7 + 0.3 * beat) * alive})`;
			c.fill();
		}
	} else if (style === 'B') {
		// fine veins reaching into the zone, drifting a little, a bead at each tip
		const n = Math.round((R * TAU) / (S * 0.45));
		for (let i = 0; i < n; i++) {
			const a = (i / n) * TAU + hash(i, 1) * 0.06;
			if (!inArcs(a)) continue;
			const r = rimAt(R, S, a, t);
			const len = S * (0.8 + 1.7 * hash(i, 2));
			const sway = Math.sin(t * 0.7 + i) * S * 0.18;
			const x = cx + Math.cos(a) * r;
			const y = cy + Math.sin(a) * r;
			const ex = cx + Math.cos(a) * (r - len) - Math.sin(a) * sway;
			const ey = cy + Math.sin(a) * (r - len) + Math.cos(a) * sway;
			c.beginPath();
			c.moveTo(x, y);
			c.quadraticCurveTo(
				(x + ex) / 2 + Math.sin(a) * S * 0.25 * (hash(i, 3) - 0.5),
				(y + ey) / 2 - Math.cos(a) * S * 0.25 * (hash(i, 3) - 0.5),
				ex,
				ey
			);
			c.strokeStyle = `rgba(${pal.body}, ${(0.16 + 0.12 * hash(i, 4)) * alive})`;
			c.lineWidth = Math.max(1, S * 0.03);
			c.stroke();
			c.beginPath();
			c.arc(ex, ey, S * 0.03, 0, TAU);
			c.fillStyle = `rgba(${pal.light}, ${0.5 * alive})`;
			c.fill();
		}
	} else {
		// the inflamed halo on the rim's outside
		c.globalCompositeOperation = 'lighter';
		for (const [lo, hi] of arcs) {
			trace(c, rimPts(cx, cy, R, S, lo, hi, t), S * 0.18);
			c.strokeStyle = `rgba(${pal.glow}, ${0.1 * alive})`;
			c.lineWidth = S * 0.9;
			c.stroke();
		}
		c.globalCompositeOperation = 'source-over';
	}
}

function seal(
	c: CanvasRenderingContext2D,
	style: RingStyle,
	pal: Pal,
	S: number,
	s: RingSeal,
	broken: boolean,
	ph: RingLook,
	t: number,
	seed: number
): void {
	const grown = ph.lit > 0 ? 1 : ph.charge;
	if (grown <= 0) return;
	const alive = ph.lit > 0 ? ph.lit : 1;
	const h = S * 0.5;
	const thin = s.weak ? (broken ? 0.45 : 0.6) : 1;
	const hit = ph.pressed === s ? ph.press : 0;
	const bulge = S * (0.08 + 0.22 * hit);
	const flick = s.weak ? 0.65 + 0.35 * Math.sin(t * 9 + seed * 3) * Math.sin(t * 2.3) : 1;
	const reach = h * grown;
	const gap = s.weak ? (broken ? S * 0.36 : S * 0.11) : 0;
	const pieces = (
		[
			[-h, Math.min(-gap, -h + reach)],
			[Math.max(gap, h - reach), h]
		] as Array<[number, number]>
	).filter(([a, b]) => b > a);
	c.save();
	c.globalAlpha *= alive * flick;
	for (const [a, b] of pieces) {
		const P: Pt[] = [];
		for (let i = 0; i <= 10; i++) {
			const u = a + ((b - a) * i) / 10;
			P.push({ x: u, y: bulge * (1 - (u / h) ** 2), nx: 0, ny: 1 });
		}
		cord(c, P, pal, S, pal.so * thin, pal.sb * thin, 1, t, style, seed);
		// the bright core reads at once
		trace(c, P);
		c.strokeStyle = `rgba(${pal.light}, ${0.7 + 0.3 * Math.sin(t * 3.1 + seed) + 0.3 * hit})`;
		c.lineWidth = Math.max(1, S * 0.04 * thin);
		c.stroke();
	}
	for (const e of [-1, 1]) {
		const nx = e * h * 1.02;
		c.beginPath();
		c.ellipse(nx, 0, S * 0.14, S * 0.2 * thin + S * 0.03, 0, 0, TAU);
		c.fillStyle = `rgba(${pal.body}, 1)`;
		c.fill();
		c.strokeStyle = `rgba(${pal.dark}, 1)`;
		c.lineWidth = Math.max(1, S * 0.04);
		c.stroke();
		c.beginPath();
		c.arc(nx - e * S * 0.02, -S * 0.03, S * 0.055, 0, TAU);
		c.fillStyle = `rgba(${pal.light}, 0.95)`;
		c.fill();
	}
	if (s.weak && pieces.length === 2) {
		c.strokeStyle = `rgba(${pal.light}, 0.55)`;
		c.lineWidth = Math.max(1, S * 0.025);
		for (const e of [-1, 1]) {
			c.beginPath();
			c.moveTo(e * gap, -S * 0.12);
			c.lineTo(e * gap * 0.35, S * 0.08);
			c.stroke();
		}
	}
	c.restore();
}

export function drawRingStyled(
	style: RingStyle,
	c: CanvasRenderingContext2D,
	L: RingLayout,
	ring: QuarantineRing,
	ph: RingLook,
	t: number
): void {
	const S = L.tileSize;
	const cx = L.offsetX + ring.cx * S;
	const cy = L.offsetY + ring.cy * S;
	const R = ring.r * S;
	const pal = PAL[style];
	c.save();
	paintGuide(c, L, ring, ph, t);
	const grown = ph.lit > 0 ? 1 : ph.charge;
	if (grown > 0) {
		const alive = ph.lit > 0 ? ph.lit : 1;
		const span = Math.PI / ring.posts.length;
		const arcs = ring.posts.map((p) => [p.a - span * grown, p.a + span * grown] as const);
		if (ph.lit > 0) zone(c, cx, cy, R, pal, ph.lit, t);
		extras(c, style, cx, cy, R, S, pal, arcs, alive, t);
		arcs.forEach(([lo, hi], i) => cord(c, rimPts(cx, cy, R, S, lo, hi, t), pal, S, pal.wo, pal.wb, alive, t, style, i));
		ring.seals.forEach((s, i) => {
			c.save();
			c.translate(L.offsetX + (s.x + 0.5) * S, L.offsetY + (s.y + 0.5) * S);
			c.rotate(Math.atan2(s.dy, s.dx) - Math.PI / 2);
			seal(c, style, pal, S, s, ring.broken, ph, t, hash(i, 9));
			c.restore();
		});
	}
	c.restore();
}
