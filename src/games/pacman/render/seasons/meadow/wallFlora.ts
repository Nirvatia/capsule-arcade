// Plants on the walls and at their feet: summer's Jumanji-like lianas along the walls' edges and
// round their corners (the owner's pick, 2026-11-23), and a band along the walls' feet instead of
// grass blades (spring's moss, summer's roots). The lianas run inside the walls' silhouette (the
// scene's wall dress); the band reaches under 2 units into the corridor.
import type { MeadowFrame } from './MeadowBake';
import { TAU, hash, nearCorner, rng } from './seasonScene';
import { WORLD_TILE } from '../../common/worldDecor';

const T = WORLD_TILE;
type C2 = CanvasRenderingContext2D;

/** A smooth growth map over the walls, 0..1: value noise on a 4-tile lattice. */
function growth(seed: number, r: number, c: number): number {
	const g = 4;
	const gr = r / g;
	const gc = c / g;
	const r0 = Math.floor(gr);
	const c0 = Math.floor(gc);
	const fr = gr - r0;
	const fc = gc - c0;
	const v = (a: number, b: number) => hash(a * 157 + b * 31, seed);
	const sm = (t: number) => t * t * (3 - 2 * t);
	const top = v(r0, c0) + (v(r0, c0 + 1) - v(r0, c0)) * sm(fc);
	const bot = v(r0 + 1, c0) + (v(r0 + 1, c0 + 1) - v(r0 + 1, c0)) * sm(fc);
	return top + (bot - top) * sm(fr);
}

function leafAt(
	b: C2,
	x: number,
	y: number,
	s: number,
	rot: number,
	col: string,
	shape: 'ivy' | 'heart'
): void {
	b.save();
	b.translate(x, y);
	b.rotate(rot);
	b.fillStyle = col;
	b.beginPath();
	if (shape === 'ivy') {
		// three lobes round a point: the ivy leaf from above
		for (const a of [-0.9, 0, 0.9]) {
			b.moveTo(Math.sin(a) * s * 0.55 + s * 0.42, -Math.cos(a) * s * 0.55);
			b.arc(Math.sin(a) * s * 0.55, -Math.cos(a) * s * 0.55, s * 0.42, 0, TAU);
		}
		b.moveTo(s * 0.5, 0);
		b.arc(0, 0, s * 0.5, 0, TAU);
	} else {
		// a heart, its point away from the stem
		b.moveTo(0, s * 0.8);
		b.bezierCurveTo(-s * 0.9, s * 0.1, -s * 0.6, -s * 0.8, 0, -s * 0.35);
		b.bezierCurveTo(s * 0.6, -s * 0.8, s * 0.9, s * 0.1, 0, s * 0.8);
	}
	b.fill();
	b.strokeStyle = 'rgba(20,40,10,.35)';
	b.lineWidth = 0.35;
	b.beginPath();
	b.moveTo(0, s * 0.5);
	b.lineTo(0, -s * 0.5);
	b.stroke();
	b.restore();
}

/**
 * A green band at the walls' feet (`paintWalls`'s `foot`, under the stones): a damp shade round the
 * silhouette and soft tufts along it, in the season's tones.
 */
export function greenFoot(
	f: MeadowFrame,
	band: string,
	tufts: readonly string[],
	seed: number
): void {
	const { b } = f;
	const r = rng(seed);
	// along the straight runs only: the band and its tufts stop where a rounded corner begins
	// (the owner's review: carried round the arc it broke the walls' rounding)
	const cut = 8;
	b.save();
	b.strokeStyle = band;
	b.lineWidth = 4;
	b.lineCap = 'butt';
	for (let rr = 0; rr < f.R; rr += 1) {
		for (let c = 0; c < f.C; c += 1) {
			if (!f.isW(rr, c)) continue;
			const x = c * T;
			const y = rr * T;
			const oL = !f.isW(rr, c - 1);
			const oU = !f.isW(rr - 1, c);
			const oR = !f.isW(rr, c + 1);
			const oD = !f.isW(rr + 1, c);
			const line = (x0: number, y0: number, x1: number, y1: number) => {
				b.beginPath();
				b.moveTo(x0, y0);
				b.lineTo(x1, y1);
				b.stroke();
			};
			const h0 = (a: boolean) => (a ? cut : 0);
			if (oU) line(x + h0(oL), y + 0.6, x + T - h0(oR), y + 0.6);
			if (oD) line(x + h0(oL), y + T - 0.6, x + T - h0(oR), y + T - 0.6);
			if (oL) line(x + 0.6, y + h0(oU), x + 0.6, y + T - h0(oD));
			if (oR) line(x + T - 0.6, y + h0(oU), x + T - 0.6, y + T - h0(oD));
			const tuft = (tx: number, ty: number, hz: boolean) => {
				b.fillStyle = tufts[(r() * tufts.length) | 0];
				b.beginPath();
				b.ellipse(
					tx,
					ty,
					hz ? 1.9 + r() : 1 + r() * 0.5,
					hz ? 1 + r() * 0.5 : 1.9 + r(),
					0,
					0,
					TAU
				);
				b.fill();
			};
			for (let sx = 2.5; sx < T; sx += 4.5) {
				const o = 0.5 + r() * 0.8;
				const hzOk = sx > h0(oL) && sx < T - h0(oR);
				const vtOk = sx > h0(oU) && sx < T - h0(oD);
				if (oU && hzOk) tuft(x + sx, y - o, true);
				if (oD && hzOk) tuft(x + sx, y + T + o, true);
				if (oL && vtOk) tuft(x - o, y + sx, false);
				if (oR && vtOk) tuft(x + T + o, y + sx, false);
			}
		}
	}
	b.restore();
}

export interface LianaStyle {
	readonly seed: number;
	/** Share of the walls the lianas reach, 0..1. */
	readonly cover: number;
	readonly stem: string;
	readonly stemLight: string;
	readonly leaves: readonly string[];
	readonly leaf: number;
}

/**
 * Jumanji-like lianas (the owner's pick for summer, 2026-11-23): few thick curving stems that
 * run along the walls' open edges a little inside them and wrap round the rounded corners, big
 * leaves now and then, a root tendril reaching for the edge. Never a mat over the top: the wall
 * still reads. Call inside the scene's wall dress.
 */
export function lianas(f: MeadowFrame, s: LianaStyle): void {
	const { b } = f;
	const inset = 3.4;
	const on = (r: number, c: number) => f.isW(r, c) && growth(s.seed, r, c) > 1 - s.cover;
	const wave = (u: number) => 1.5 * Math.sin(u * 0.22 + s.seed);
	const leaves: Array<[number, number, number]> = [];
	const stroke = (path: Path2D) => {
		b.lineCap = 'round';
		b.lineJoin = 'round';
		b.strokeStyle = 'rgba(20,30,10,.3)';
		b.lineWidth = 4.4;
		b.save();
		b.translate(0.6, 0.8);
		b.stroke(path);
		b.restore();
		b.strokeStyle = s.stem;
		b.lineWidth = 3.4;
		b.stroke(path);
		b.strokeStyle = s.stemLight;
		b.lineWidth = 1;
		b.save();
		b.translate(-0.7, -0.7);
		b.stroke(path);
		b.restore();
	};
	const path = new Path2D();
	for (let r = 0; r < f.R; r += 1) {
		for (let c = 0; c < f.C; c += 1) {
			if (!on(r, c)) continue;
			const oL = !f.isW(r, c - 1);
			const oU = !f.isW(r - 1, c);
			const oR = !f.isW(r, c + 1);
			const oD = !f.isW(r + 1, c);
			const x = c * T;
			const y = r * T;
			// along each open edge, from tile side to tile side (or to the corner's arc)
			const seg = (hz: boolean, fixed: number, a0: number, a1: number, side: number) => {
				const n = 8;
				for (let i = 0; i <= n; i += 1) {
					const u = a0 + ((a1 - a0) * i) / n;
					const px = hz ? u : fixed + wave(u) * side;
					const py = hz ? fixed + wave(u) * side : u;
					if (i) path.lineTo(px, py);
					else path.moveTo(px, py);
				}
				for (let u = a0 + 4; u < a1 - 2; u += 7) {
					leaves.push([hz ? u : fixed, hz ? fixed : u, (u * 7 + r * 3 + c) % 2 ? 1 : -1]);
				}
			};
			const cut = 8;
			if (oU) seg(true, y + inset, x + (oL ? cut : 0), x + T - (oR ? cut : 0), 1);
			if (oD) seg(true, y + T - inset, x + (oL ? cut : 0), x + T - (oR ? cut : 0), -1);
			if (oL) seg(false, x + inset, y + (oU ? cut : 0), y + T - (oD ? cut : 0), 1);
			if (oR) seg(false, x + T - inset, y + (oU ? cut : 0), y + T - (oD ? cut : 0), -1);
			// round the corners: an arc a step inside the silhouette's own
			for (const [ok, cx, cy, a0] of [
				[oU && oL, x + 8, y + 8, Math.PI],
				[oU && oR, x + T - 8, y + 8, Math.PI * 1.5],
				[oD && oR, x + T - 8, y + T - 8, 0],
				[oD && oL, x + 8, y + T - 8, Math.PI * 0.5]
			] as const) {
				if (!ok) continue;
				const rr = 8 - inset;
				path.moveTo(cx + Math.cos(a0) * rr, cy + Math.sin(a0) * rr);
				path.arc(cx, cy, rr, a0, a0 + Math.PI / 2);
			}
		}
	}
	stroke(path);
	// big leaves on short stalks, alternating sides, a root tendril now and then
	const k = rng(s.seed * 31 + 7);
	for (const [lx, ly, side] of leaves) {
		if (nearCorner(f, lx, ly, 9)) continue;
		if (k() < 0.2) continue;
		const a = k() * TAU;
		const ox = lx + Math.cos(a) * 3 * side;
		const oy = ly + Math.sin(a) * 3 * side;
		b.strokeStyle = s.stem;
		b.lineWidth = 0.8;
		b.beginPath();
		b.moveTo(lx, ly);
		b.lineTo(ox, oy);
		b.stroke();
		b.fillStyle = 'rgba(20,30,10,.25)';
		b.beginPath();
		b.arc(ox + 0.7, oy + 0.9, s.leaf * 0.6, 0, TAU);
		b.fill();
		leafAt(
			b,
			ox,
			oy,
			s.leaf * (0.85 + k() * 0.35),
			a + Math.PI / 2,
			s.leaves[(k() * s.leaves.length) | 0],
			'heart'
		);
		if (k() < 0.2) {
			b.strokeStyle = s.stem;
			b.lineWidth = 0.6;
			b.beginPath();
			b.moveTo(lx, ly);
			b.quadraticCurveTo(lx + 2 * side, ly - 2, lx + 3 * side, ly + 2.5);
			b.stroke();
		}
	}
}
