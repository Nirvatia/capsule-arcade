// Акварель и тушь на Canvas 2D: заливки, мягкие пятна цвета, бумага, кисть, энсо.
// Всё случайное — от сида, поэтому один и тот же мазок рисуется одинаково каждый кадр.

import type { Pt } from '../pictures/types';

export const TAU = Math.PI * 2;
type Ctx = CanvasRenderingContext2D;

export interface Rng {
	(): number;
	gauss(): number;
}

export function rng(seed: number): Rng {
	let a = seed >>> 0 || 1;
	const next = (): number => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), a | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	const r = next as Rng;
	r.gauss = (): number => {
		const u = 1 - next();
		const v = next();
		return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
	};
	return r;
}

// ------------------------------------------------------------------ акварель

interface WPt extends Pt {
	v: number;
}

/** Смещение середин: у каждого ребра появляется новая вершина, сдвинутая случайно. */
function deform(poly: WPt[], depth: number, variance: number, r: Rng): WPt[] {
	let out = poly;
	for (let d = 0; d < depth; d++) {
		const next: WPt[] = [];
		for (let i = 0; i < out.length; i++) {
			const a = out[i];
			const b = out[(i + 1) % out.length];
			next.push(a);
			const len = Math.hypot(b.x - a.x, b.y - a.y);
			const k = variance * (a.v + b.v) * 0.5;
			next.push({
				x: (a.x + b.x) / 2 + r.gauss() * len * k,
				y: (a.y + b.y) / 2 + r.gauss() * len * k,
				v: (a.v + b.v) / 2 + r.gauss() * 0.08
			});
		}
		out = next;
	}
	return out;
}

export function fillPoly(ctx: Ctx, poly: readonly Pt[]): void {
	ctx.beginPath();
	poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
	ctx.closePath();
	ctx.fill();
}

export interface WashOpts {
	rng: Rng;
	layers?: number;
	alpha?: number;
	sides?: number;
	sx?: number;
	sy?: number;
	rot?: number;
	spread?: number;
	blend?: GlobalCompositeOperation;
	/** Пигмент, скопившийся у края высохшей заливки: прозрачность обводки. */
	edge?: number;
}

/**
 * Акварельная заливка: много полупрозрачных, чуть разных копий одной рваной формы.
 * Каждый слой немного больше или меньше, поэтому края расплываются.
 */
export function wash(
	ctx: Ctx,
	shape: readonly Pt[] | { x: number; y: number; r: number },
	color: string,
	o: WashOpts
): void {
	const r = o.rng;
	let base: WPt[];
	if (Array.isArray(shape)) base = shape.map((p) => ({ x: p.x, y: p.y, v: 0.5 + r() * 0.5 }));
	else {
		const c = shape as { x: number; y: number; r: number };
		const n = o.sides ?? 10;
		const sx = o.sx ?? 1;
		const sy = o.sy ?? 1;
		const rot = o.rot ?? 0;
		base = [];
		for (let i = 0; i < n; i++) {
			const a = (i / n) * TAU;
			const x = Math.cos(a) * c.r * sx;
			const y = Math.sin(a) * c.r * sy;
			base.push({
				x: c.x + x * Math.cos(rot) - y * Math.sin(rot),
				y: c.y + x * Math.sin(rot) + y * Math.cos(rot),
				v: 0.4 + r() * 0.8
			});
		}
	}
	const spread = o.spread ?? 0.11;
	base = deform(base, 2, spread, r);
	let cx = 0;
	let cy = 0;
	for (const p of base) {
		cx += p.x / base.length;
		cy += p.y / base.length;
	}
	ctx.save();
	ctx.globalCompositeOperation = o.blend ?? 'source-over';
	ctx.fillStyle = color;
	let last = base;
	for (let i = 0; i < (o.layers ?? 26); i++) {
		const k = 0.9 + r() * 0.16;
		last = deform(
			base.map((p) => ({ x: cx + (p.x - cx) * k, y: cy + (p.y - cy) * k, v: p.v })),
			3,
			spread * 1.7,
			r
		);
		ctx.globalAlpha = o.alpha ?? 0.035;
		fillPoly(ctx, last);
	}
	if (o.edge) {
		ctx.globalAlpha = o.edge;
		ctx.strokeStyle = color;
		ctx.lineWidth = 1.2;
		ctx.beginPath();
		last.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
		ctx.closePath();
		ctx.stroke();
	}
	ctx.restore();
}

const rgbCache = new Map<string, [number, number, number]>();
let probe: CanvasRenderingContext2D | null = null;

/** Любой css-цвет → [r, g, b], чтобы градиент угасал в тот же цвет, а не в чёрный. */
export function rgbOf(color: string): [number, number, number] {
	const hit = rgbCache.get(color);
	if (hit) return hit;
	if (!probe)
		probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
	if (!probe) return [0, 0, 0];
	probe.clearRect(0, 0, 1, 1);
	probe.fillStyle = color;
	probe.fillRect(0, 0, 1, 1);
	const d = probe.getImageData(0, 0, 1, 1).data;
	const v: [number, number, number] = [d[0], d[1], d[2]];
	rgbCache.set(color, v);
	return v;
}

/** Мягкое круглое пятно цвета: свет или мокрый пигмент. */
export function bloom(
	ctx: Ctx,
	x: number,
	y: number,
	r: number,
	color: string,
	a: number,
	blend: GlobalCompositeOperation = 'source-over'
): void {
	if (a <= 0.002 || r <= 0) return;
	const [cr, cg, cb] = rgbOf(color);
	ctx.save();
	ctx.globalCompositeOperation = blend;
	const g = ctx.createRadialGradient(x, y, 0, x, y, r);
	g.addColorStop(0, `rgba(${cr},${cg},${cb},1)`);
	g.addColorStop(0.5, `rgba(${cr},${cg},${cb},0.45)`);
	g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
	ctx.globalAlpha = Math.min(1, a);
	ctx.fillStyle = g;
	ctx.beginPath();
	ctx.arc(x, y, r, 0, TAU);
	ctx.fill();
	ctx.restore();
}

const grainCache = new Map<string, HTMLCanvasElement>();

/** Зерно бумаги: мелкий шум и редкие волокна. Кэшируется по размеру. */
function grain(w: number, h: number, seed: number): HTMLCanvasElement {
	const key = `${w}x${h}:${seed}`;
	const hit = grainCache.get(key);
	if (hit) return hit;
	const c = document.createElement('canvas');
	c.width = w;
	c.height = h;
	const x = c.getContext('2d');
	if (x) {
		const img = x.createImageData(w, h);
		const r = rng(seed);
		for (let i = 0; i < img.data.length; i += 4) {
			const v = 128 + (r() - 0.5) * 90;
			img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
			img.data[i + 3] = 255;
		}
		x.putImageData(img, 0, 0);
		x.globalAlpha = 0.05;
		x.strokeStyle = '#000';
		for (let i = 0; i < (w * h) / 9000; i++) {
			const px = r() * w;
			const py = r() * h;
			const a = r() * TAU;
			const l = 6 + r() * 26;
			x.lineWidth = 0.5 + r();
			x.beginPath();
			x.moveTo(px, py);
			x.quadraticCurveTo(
				px + Math.cos(a + 0.6) * l * 0.5,
				py + Math.sin(a + 0.6) * l * 0.5,
				px + Math.cos(a) * l,
				py + Math.sin(a) * l
			);
			x.stroke();
		}
	}
	if (grainCache.size > 6) grainCache.clear();
	grainCache.set(key, c);
	return c;
}

export function paper(
	ctx: Ctx,
	w: number,
	h: number,
	strength: number,
	blend: GlobalCompositeOperation,
	seed: number
): void {
	ctx.save();
	ctx.globalCompositeOperation = blend;
	ctx.globalAlpha = strength;
	ctx.drawImage(grain(Math.ceil(w), Math.ceil(h), seed), 0, 0, w, h);
	ctx.restore();
}

// ------------------------------------------------------------------ кривые

/** Катмулл — Ром через точки, `per` точек на отрезок. */
export function spline(pts: readonly Pt[], per = 12): Pt[] {
	const out: Pt[] = [];
	for (let i = 0; i < pts.length - 1; i++) {
		const p0 = pts[Math.max(0, i - 1)];
		const p1 = pts[i];
		const p2 = pts[i + 1];
		const p3 = pts[Math.min(pts.length - 1, i + 2)];
		for (let k = 0; k < per; k++) {
			const t = k / per;
			const t2 = t * t;
			const t3 = t2 * t;
			out.push({
				x:
					0.5 *
					(2 * p1.x +
						(-p0.x + p2.x) * t +
						(2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
						(-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
				y:
					0.5 *
					(2 * p1.y +
						(-p0.y + p2.y) * t +
						(2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
						(-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
			});
		}
	}
	out.push({ ...pts[pts.length - 1] });
	return out;
}

export function resample(pts: readonly Pt[], step: number): Pt[] {
	if (pts.length < 2) return pts.map((p) => ({ ...p }));
	const out: Pt[] = [{ ...pts[0] }];
	let carry = 0;
	for (let i = 1; i < pts.length; i++) {
		const a = pts[i - 1];
		const b = pts[i];
		const len = Math.hypot(b.x - a.x, b.y - a.y);
		if (len < 1e-9) continue;
		let d = step - carry;
		while (d < len) {
			out.push({ x: a.x + ((b.x - a.x) * d) / len, y: a.y + ((b.y - a.y) * d) / len });
			d += step;
		}
		carry = len - (d - step);
	}
	const last = pts[pts.length - 1];
	const tail = out[out.length - 1];
	if (Math.hypot(last.x - tail.x, last.y - tail.y) > 1e-6) out.push({ ...last });
	return out;
}

export interface FramePt extends Pt {
	tx: number;
	ty: number;
	nx: number;
	ny: number;
}

export function frame(pts: readonly Pt[]): FramePt[] {
	return pts.map((p, i) => {
		const a = pts[Math.max(0, i - 1)];
		const b = pts[Math.min(pts.length - 1, i + 1)];
		const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
		const tx = (b.x - a.x) / l;
		const ty = (b.y - a.y) / l;
		return { x: p.x, y: p.y, tx, ty, nx: -ty, ny: tx };
	});
}

/** Ломаная по сетке со скруглёнными углами: каждый угол — дуга радиуса `rad`. */
export function roundCorners(pts: readonly Pt[], rad: number): Pt[] {
	if (pts.length < 3) return pts.map((p) => ({ ...p }));
	const out: Pt[] = [{ ...pts[0] }];
	for (let i = 1; i < pts.length - 1; i++) {
		const a = pts[i - 1];
		const b = pts[i];
		const c = pts[i + 1];
		const d1 = { x: b.x - a.x, y: b.y - a.y };
		const d2 = { x: c.x - b.x, y: c.y - b.y };
		const l1 = Math.hypot(d1.x, d1.y);
		const l2 = Math.hypot(d2.x, d2.y);
		if (l1 < 1e-6 || l2 < 1e-6 || Math.abs(d1.x * d2.y - d1.y * d2.x) < 1e-6 * l1 * l2) {
			out.push({ ...b });
			continue;
		}
		const r = Math.min(rad, l1 / 2, l2 / 2);
		const p = { x: b.x - (d1.x / l1) * r, y: b.y - (d1.y / l1) * r };
		const q = { x: b.x + (d2.x / l2) * r, y: b.y + (d2.y / l2) * r };
		for (let k = 0; k <= 8; k++) {
			const t = k / 8;
			out.push({
				x: (1 - t) * (1 - t) * p.x + 2 * (1 - t) * t * b.x + t * t * q.x,
				y: (1 - t) * (1 - t) * p.y + 2 * (1 - t) * t * b.y + t * t * q.y
			});
		}
	}
	out.push({ ...pts[pts.length - 1] });
	return out;
}

// ------------------------------------------------------------------ тушь

export interface BrushOpts {
	seed: number;
	alpha?: number;
	taper?: number;
	step?: number;
	dry?: boolean;
	grit?: number;
	wobble?: number;
}

/** Мазок кистью: ширина дышит, концы сужаются, сухой второй проход по краям. */
export function brush(ctx: Ctx, pts: readonly Pt[], w: number, color: string, o: BrushOpts): void {
	const r = rng(o.seed);
	const P = frame(resample(pts, o.step ?? 2));
	const n = P.length;
	if (n < 2) return;
	const taper = o.taper ?? 0.18;
	let ph = r() * 10;
	const widths = P.map((_, i) => {
		const u = i / (n - 1);
		const tip = Math.min(1, u / taper, (1 - u) / taper);
		const e = tip < 1 ? Math.sin((tip * Math.PI) / 2) : 1;
		ph += 0.06;
		return (
			w *
			(0.12 + 0.88 * e) *
			(0.82 + 0.18 * Math.sin(ph * (o.wobble ?? 1.7)) + (o.grit ?? 0.05) * r.gauss())
		);
	});
	ctx.save();
	ctx.globalAlpha = o.alpha ?? 1;
	ctx.fillStyle = color;
	ctx.beginPath();
	P.forEach((p, i) => {
		const x = p.x + p.nx * widths[i] * 0.5;
		const y = p.y + p.ny * widths[i] * 0.5;
		if (i) ctx.lineTo(x, y);
		else ctx.moveTo(x, y);
	});
	for (let i = n - 1; i >= 0; i--)
		ctx.lineTo(P[i].x - P[i].nx * widths[i] * 0.5, P[i].y - P[i].ny * widths[i] * 0.5);
	ctx.closePath();
	ctx.fill();
	if (o.dry !== false) {
		ctx.globalAlpha = (o.alpha ?? 1) * 0.35;
		ctx.strokeStyle = color;
		ctx.lineWidth = Math.max(0.6, w * 0.08);
		for (const off of [-0.62, 0.66]) {
			ctx.beginPath();
			let open = false;
			P.forEach((p, i) => {
				if (r() < 0.08) {
					open = false;
					return;
				}
				const x = p.x + p.nx * widths[i] * off;
				const y = p.y + p.ny * widths[i] * off;
				if (open) ctx.lineTo(x, y);
				else ctx.moveTo(x, y);
				open = true;
			});
			ctx.stroke();
		}
	}
	ctx.restore();
}

/** Энсо: один круг кистью — густой в начале, сухой и разомкнутый в конце. */
export function enso(
	ctx: Ctx,
	cx: number,
	cy: number,
	R: number,
	w: number,
	color: string,
	o: { seed: number; alpha?: number; start?: number; span?: number }
): void {
	const r = rng(o.seed);
	const a0 = o.start ?? -1.2;
	const span = TAU * (o.span ?? 0.9);
	const N = 64;
	const pts: Pt[] = [];
	for (let i = 0; i <= N; i++) {
		const a = a0 + (span * i) / N;
		const rr = R * (1 + 0.025 * Math.sin(a * 3 + 1) + 0.01 * r.gauss());
		pts.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr });
	}
	const P = frame(pts);
	const wid = (u: number): number => w * (u < 0.08 ? 0.5 + 6 * u : 1 - 0.75 * Math.pow(u, 1.6));
	ctx.save();
	ctx.globalAlpha = o.alpha ?? 1;
	ctx.fillStyle = color;
	ctx.beginPath();
	P.forEach((p, i) => {
		const ww = wid(i / N) / 2;
		if (i) ctx.lineTo(p.x + p.nx * ww, p.y + p.ny * ww);
		else ctx.moveTo(p.x + p.nx * ww, p.y + p.ny * ww);
	});
	for (let i = N; i >= 0; i--) {
		const ww = wid(i / N) / 2;
		ctx.lineTo(P[i].x - P[i].nx * ww, P[i].y - P[i].ny * ww);
	}
	ctx.closePath();
	ctx.fill();
	ctx.strokeStyle = color;
	ctx.lineWidth = Math.max(0.6, w * 0.06);
	for (let k = 0; k < 6; k++) {
		const off = (k / 5 - 0.5) * 0.8;
		const from = Math.floor(N * 0.62 + r() * N * 0.18);
		const to = Math.min(N, Math.floor(N * 0.88 + r() * N * 0.16));
		ctx.globalAlpha = (o.alpha ?? 1) * 0.45;
		ctx.beginPath();
		for (let i = from; i <= to; i++) {
			const ww = wid(i / N) * off;
			const x = P[i].x + P[i].nx * ww;
			const y = P[i].y + P[i].ny * ww;
			if (i === from) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.stroke();
	}
	ctx.restore();
}

/** Холст размера w×h (в CSS-пикселях) с плотностью s. Рисовать в CSS-координатах. */
export function layer(w: number, h: number, s: number): { canvas: HTMLCanvasElement; ctx: Ctx } {
	const canvas = document.createElement('canvas');
	canvas.width = Math.max(1, Math.round(w * s));
	canvas.height = Math.max(1, Math.round(h * s));
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('2D canvas is not available');
	ctx.scale(s, s);
	return { canvas, ctx };
}
