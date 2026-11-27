// The quarantine ring as the game draws it (the owner's pick of the `ring` prototype, 2026-11-26;
// `StationSquad`'s fence): seen from above a ring of mycelium round a point, a haze of spores and
// a wavering filament that may pass over walls; where it crosses a corridor a seal grows in the
// corridor's throat between its two walls: a membrane of flesh rooted in both walls by nodules,
// veined, a bright cream core so it reads at once, throbbing slowly; the thin seal torn in the
// middle and flickering (he can push through it; torn wide once he has). The tell: the filament
// creeps out of the projectors, the seals grow from their roots; lit, beads of light run along
// it; his push bulges the seal before him. Before all that, the warning (the owner, 2026-11-26: a
// ring growing in pieces did not show what it would hold): the whole contour at once, a dashed
// amber line on the filament's own path, the zone faintly tinted, dashed bars where the seals will
// grow; the filament then grows along it and the warning fades.
import type { QuarantineRing, RingSeal } from '../../logic/station/StationSquad';

export interface RingLook {
	/** The warning contour, 0..1: shown while the projectors walk and charge. */
	readonly guide: number;
	/** The projectors' charge, 0..1 (the tell); lit 0..1. */
	readonly charge: number;
	readonly lit: number;
	/** The seal he presses into, and how hard (0..1). */
	readonly pressed: RingSeal | null;
	readonly press: number;
}

export interface RingLayout {
	readonly tileSize: number;
	readonly offsetX: number;
	readonly offsetY: number;
}

const TAU = Math.PI * 2;
const WINE = '118, 30, 44';
const WINE_DARK = '42, 12, 20';
const AMBER = '255, 166, 90';
const CREAM = '255, 226, 192';

/** A seed per position, 0..1. */
const hash = (a: number, b: number) => {
	const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
	return s - Math.floor(s);
};

/** The filament's radius at angle `a`: it wavers, it is alive. */
const rimAt = (R: number, S: number, a: number, t: number) =>
	R + Math.sin(a * 9 + t * 0.8) * S * 0.07 + Math.sin(a * 23 - t * 1.3) * S * 0.035;

function filament(
	c: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	R: number,
	S: number,
	a0: number,
	a1: number,
	t: number
): void {
	const n = Math.max(8, Math.ceil(((a1 - a0) * R) / (S * 0.25)));
	c.beginPath();
	for (let i = 0; i <= n; i++) {
		const a = a0 + ((a1 - a0) * i) / n;
		const r = rimAt(R, S, a, t);
		const px = cx + Math.cos(a) * r;
		const py = cy + Math.sin(a) * r;
		if (i === 0) c.moveTo(px, py);
		else c.lineTo(px, py);
	}
}

/** The rim: the infected zone's faint tint, the haze of spores, the filament. */
function paintRim(
	c: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	R: number,
	S: number,
	from: readonly number[],
	ph: RingLook,
	t: number
): void {
	const grown = ph.lit > 0 ? 1 : ph.charge;
	if (grown <= 0) return;
	const span = Math.PI / from.length;
	const alive = ph.lit > 0 ? ph.lit : 1;
	const arcs = from.map((a) => [a - span * grown, a + span * grown] as const);
	const on = (a: number) =>
		arcs.some(([lo, hi]) => {
			let d = a - (lo + hi) / 2;
			d = Math.atan2(Math.sin(d), Math.cos(d));
			return Math.abs(d) <= (hi - lo) / 2;
		});
	if (ph.lit > 0) {
		// the zone inside: a faint sick tint toward the rim
		const g = c.createRadialGradient(cx, cy, R * 0.6, cx, cy, R);
		g.addColorStop(0, `rgba(${WINE}, 0)`);
		g.addColorStop(1, `rgba(${WINE}, ${0.16 * ph.lit})`);
		c.fillStyle = g;
		c.beginPath();
		c.arc(cx, cy, R, 0, TAU);
		c.fill();
	}
	// the haze: spores drifting along the rim
	const motes = Math.round((R * TAU) / (S * 0.18));
	for (let i = 0; i < motes; i++) {
		const a = (i / motes) * TAU + t * 0.03 * (hash(i, 1) - 0.5) + hash(i, 2) * 0.05;
		if (!on(a)) continue;
		const rr = rimAt(R, S, a, t) + (hash(i, 3) - 0.5) * S * 0.55;
		const tw = 0.5 + 0.5 * Math.sin(t * (0.8 + hash(i, 4)) + i);
		c.fillStyle = `rgba(${hash(i, 5) < 0.7 ? AMBER : CREAM}, ${(0.18 + 0.32 * tw) * alive})`;
		c.beginPath();
		c.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, S * (0.03 + 0.04 * hash(i, 6)), 0, TAU);
		c.fill();
	}
	// the filament: a dark wine strand, an amber glow, a thin cream thread
	for (const [lo, hi] of arcs) {
		filament(c, cx, cy, R, S, lo, hi, t);
		c.strokeStyle = `rgba(${WINE_DARK}, ${0.7 * alive})`;
		c.lineWidth = S * 0.16;
		c.stroke();
		c.strokeStyle = `rgba(${AMBER}, ${0.35 * alive})`;
		c.lineWidth = S * 0.09;
		c.stroke();
		c.strokeStyle = `rgba(${CREAM}, ${0.55 * alive})`;
		c.lineWidth = Math.max(1, S * 0.03);
		c.stroke();
	}
	if (ph.lit > 0) {
		// beads of light out of each projector, both ways
		for (const a0 of from) {
			for (const dir of [1, -1]) {
				for (let k = 0; k < 2; k++) {
					const a = a0 + dir * (((t * 0.35 + k * 0.5) % 1) * span);
					const r = rimAt(R, S, a, t);
					const g = c.createRadialGradient(
						cx + Math.cos(a) * r,
						cy + Math.sin(a) * r,
						0,
						cx + Math.cos(a) * r,
						cy + Math.sin(a) * r,
						S * 0.22
					);
					g.addColorStop(0, `rgba(${CREAM}, ${0.9 * ph.lit})`);
					g.addColorStop(1, `rgba(${AMBER}, 0)`);
					c.fillStyle = g;
					c.beginPath();
					c.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, S * 0.22, 0, TAU);
					c.fill();
				}
			}
		}
	}
}

/** A seal in its throat, in local space: u along the membrane (wall to wall), v the way out. */
function paintSeal(
	c: CanvasRenderingContext2D,
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
	const thin = s.weak ? (broken ? 0.4 : 0.55) : 1;
	const throb = 1 + 0.12 * Math.sin(t * 2.4 + seed * 6);
	const hit = ph.pressed === s ? ph.press : 0;
	// a touch bulges it outward, a weak one flickers
	const bulge = S * (0.08 + 0.22 * hit);
	const flick = s.weak ? 0.65 + 0.35 * Math.sin(t * 9 + seed * 3) * Math.sin(t * 2.3) : 1;
	const reach = h * grown; // it grows from both roots toward the middle
	const w = S * 0.15 * thin * throb;
	const v = (u: number) => bulge * (1 - (u / h) ** 2);

	const band = (half: number, from: number, to: number) => {
		c.beginPath();
		const n = 10;
		for (let i = 0; i <= n; i++) {
			const u = from + ((to - from) * i) / n;
			const wob = Math.sin(u * 0.4 + t * 1.7 + seed) * S * 0.015;
			c.lineTo(u, v(u) - half + wob);
		}
		for (let i = n; i >= 0; i--) {
			const u = from + ((to - from) * i) / n;
			const wob = Math.sin(u * 0.5 - t * 1.3 + seed) * S * 0.015;
			c.lineTo(u, v(u) + half + wob);
		}
		c.closePath();
	};
	// the weak one is torn in the middle
	const gap = s.weak ? (broken ? S * 0.36 : S * 0.11) : 0;
	const pieces: Array<[number, number]> = [
		[-h, Math.min(-gap, -h + reach)],
		[Math.max(gap, h - reach), h]
	].filter(([a, b]) => b > a) as Array<[number, number]>;
	c.save();
	c.globalAlpha *= alive * flick;
	for (const [a, b] of pieces) {
		// the glow, the flesh, its rim
		c.globalCompositeOperation = 'lighter';
		band(w * 2.2, a, b);
		c.fillStyle = `rgba(${AMBER}, ${0.22 + 0.2 * hit})`;
		c.fill();
		c.globalCompositeOperation = 'source-over';
		band(w, a, b);
		const g = c.createLinearGradient(0, -w, 0, w);
		g.addColorStop(0, `rgba(${WINE}, 0.95)`);
		g.addColorStop(0.5, `rgba(214, 112, 72, 0.92)`);
		g.addColorStop(1, `rgba(${WINE}, 0.95)`);
		c.fillStyle = g;
		c.fill();
		c.strokeStyle = `rgba(${WINE_DARK}, 0.95)`;
		c.lineWidth = Math.max(1, S * 0.035);
		c.stroke();
		// veins along it
		for (const off of [-0.45, 0.4]) {
			c.beginPath();
			for (let i = 0; i <= 8; i++) {
				const u = a + ((b - a) * i) / 8;
				c.lineTo(u, v(u) + w * off + Math.sin(u * 0.9 + seed * 4) * w * 0.25);
			}
			c.strokeStyle = `rgba(${WINE_DARK}, 0.75)`;
			c.lineWidth = Math.max(0.8, S * 0.025);
			c.stroke();
		}
		// the bright core: it must read at once
		c.beginPath();
		for (let i = 0; i <= 8; i++) {
			const u = a + ((b - a) * i) / 8;
			c.lineTo(u, v(u) + Math.sin(u * 0.7 + t * 2 + seed) * w * 0.12);
		}
		c.strokeStyle = `rgba(${CREAM}, ${0.75 + 0.25 * Math.sin(t * 3.1 + seed) + 0.3 * hit})`;
		c.lineWidth = Math.max(1, S * 0.045 * thin);
		c.stroke();
	}
	// the roots in both walls: fleshy nodules, a spore glowing in each
	for (const e of [-1, 1]) {
		const nx = e * h * 1.02;
		c.beginPath();
		c.ellipse(nx, 0, S * 0.13, S * 0.17 * thin + S * 0.03, 0, 0, TAU);
		c.fillStyle = `rgba(${WINE}, 1)`;
		c.fill();
		c.strokeStyle = `rgba(${WINE_DARK}, 1)`;
		c.lineWidth = Math.max(1, S * 0.035);
		c.stroke();
		c.beginPath();
		c.arc(nx - e * S * 0.02, -S * 0.03, S * 0.055, 0, TAU);
		c.fillStyle = `rgba(${CREAM}, 0.95)`;
		c.fill();
	}
	if (s.weak && pieces.length === 2) {
		// the torn edges: frayed strands across the hole
		c.strokeStyle = `rgba(${CREAM}, 0.5)`;
		c.lineWidth = Math.max(0.8, S * 0.02);
		for (const e of [-1, 1]) {
			c.beginPath();
			c.moveTo(e * gap, v(0) - w * 0.4);
			c.lineTo(e * gap * 0.35, v(0) + w * 0.2);
			c.stroke();
		}
	}
	c.restore();
}

/** The warning: the whole coming ring at once, fading as the projectors charge. */
export function paintGuide(
	c: CanvasRenderingContext2D,
	L: RingLayout,
	ring: QuarantineRing,
	ph: RingLook,
	t: number
): void {
	const k = ph.guide;
	if (k <= 0) return;
	const S = L.tileSize;
	const cx = L.offsetX + ring.cx * S;
	const cy = L.offsetY + ring.cy * S;
	const R = ring.r * S;
	const pulse = 0.5 + 0.5 * Math.sin(t * TAU * 0.9);
	const charge = ph.lit > 0 ? 1 : ph.charge;
	const fade = k * (1 - 0.7 * charge);
	// the zone: a faint sick tint toward the rim
	const g = c.createRadialGradient(cx, cy, R * 0.5, cx, cy, R);
	g.addColorStop(0, `rgba(${WINE}, 0)`);
	g.addColorStop(1, `rgba(150, 40, 50, ${(0.1 + 0.06 * pulse) * fade})`);
	c.fillStyle = g;
	c.beginPath();
	c.arc(cx, cy, R, 0, TAU);
	c.fill();
	// the contour on the filament's own path, so the filament lands on it
	filament(c, cx, cy, R, S, 0, TAU, t);
	c.lineJoin = 'round';
	c.strokeStyle = `rgba(255, 150, 80, ${(0.1 + 0.1 * pulse) * fade})`;
	c.lineWidth = S * 0.34;
	c.stroke();
	c.setLineDash([S * 0.34, S * 0.22]);
	c.lineDashOffset = -t * S * 0.5;
	c.strokeStyle = `rgba(${CREAM}, ${(0.5 + 0.35 * pulse) * fade})`;
	c.lineWidth = Math.max(1.5, S * 0.07);
	c.stroke();
	// the seals to come: a dashed bar across each corridor's throat
	c.setLineDash([S * 0.12, S * 0.08]);
	c.lineDashOffset = 0;
	const a = (0.35 + 0.45 * pulse) * k * (1 - charge);
	for (const s of ring.seals) {
		if (a <= 0.01) break;
		c.save();
		c.translate(L.offsetX + (s.x + 0.5) * S, L.offsetY + (s.y + 0.5) * S);
		c.rotate(Math.atan2(s.dy, s.dx) - Math.PI / 2);
		c.fillStyle = `rgba(255, 120, 90, ${a * 0.35})`;
		c.fillRect(-S * 0.5, -S * 0.12, S, S * 0.24);
		c.strokeStyle = `rgba(${CREAM}, ${a})`;
		c.lineWidth = Math.max(1, S * 0.045);
		c.strokeRect(-S * 0.5, -S * 0.12, S, S * 0.24);
		c.restore();
	}
	c.setLineDash([]);
}

export function drawRing(
	c: CanvasRenderingContext2D,
	L: RingLayout,
	ring: QuarantineRing,
	ph: RingLook,
	time: number
): void {
	const S = L.tileSize;
	const cx = L.offsetX + ring.cx * S;
	const cy = L.offsetY + ring.cy * S;
	c.save();
	paintGuide(c, L, ring, ph, time);
	paintRim(
		c,
		cx,
		cy,
		ring.r * S,
		S,
		ring.posts.map((p) => p.a),
		ph,
		time
	);
	ring.seals.forEach((s, i) => {
		c.save();
		c.translate(L.offsetX + (s.x + 0.5) * S, L.offsetY + (s.y + 0.5) * S);
		// local u runs along the membrane (across the way), +v the way out
		c.rotate(Math.atan2(s.dy, s.dx) - Math.PI / 2);
		paintSeal(c, S, s, ring.broken, ph, time, hash(i, 9));
		c.restore();
	});
	c.restore();
}
