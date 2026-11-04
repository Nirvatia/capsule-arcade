// Бронзовый аспид: тело, шипы, щитки-биты и голова. Всё — код, без спрайтов.

import type { Bit } from '../sim/types';
import { PAL, TAU, circle, ellipse, mix, type Light } from './paint';

const AS = {
	outline: '#040908',
	base: '#13272a',
	top: '#1c3638',
	scale: 'rgba(110,170,160,0.28)',
	spineDark: '#3a2a14',
	spine: '#b88a4a',
	rim: '#2a1d0e',
	hornDark: '#2a1d0e',
	horn: '#c9a060',
	frill: '#9a7442',
	frill2: '#7a5a2c',
	eye: '#ffd36a'
} as const;

/** f(d) → [x, y] в клетках: точка тела на расстоянии d клеток от головы. */
export type BodyPath = (d: number) => readonly [number, number];

export interface AspidStyle {
	len: number;
	bits: readonly Bit[];
	/** Позиции вздутий от проглоченной добычи, в клетках от головы. */
	bulges?: readonly number[];
	/** Тело начинается не с головы (смерть: голова уже рассыпалась). */
	from?: number;
	/** Отбрасывание от точки (провал удара), в клетках. */
	push?: { x: number; y: number; amt: number };
	/** Окаменение сегмента i: 0..1. */
	grey?: (i: number) => number;
	/** Показать бит сегмента инвертированным (волна NOT ещё не дошла). */
	flip?: (i: number) => boolean;
	flashAt?: (i: number) => number;
	flashBit?: (i: number) => number;
	/** Фронт золотой волны удара, в клетках. */
	sweep?: number | null;
	/** Фронт волны шипов, в клетках. */
	wave?: number | null;
	strike?: number;
	eyeGlow?: number;
	tongue?: boolean;
}

function drawHead(
	c: CanvasRenderingContext2D,
	x: number,
	y: number,
	a: number,
	cs: number,
	strike: number,
	eyeGlow: number,
	L: Light[],
	grey: number,
	t: number,
	tongue: boolean
): void {
	const s = (cs / 30) * 0.85 * (1 + 0.12 * strike);
	const col = (h: string): string => (grey > 0 ? mix(h, PAL.stone, grey) : h);
	const frill = 0.45 + 0.55 * strike;
	c.save();
	c.translate(x, y);
	c.rotate(a);
	c.scale(s, s);
	for (const sy of [-1, 1]) {
		for (let k = 0; k < 3; k++) {
			c.fillStyle = col(k % 2 ? AS.frill2 : AS.frill);
			c.beginPath();
			c.moveTo(-6 - k * 2, sy * 5);
			c.lineTo(-12 - k * 3, sy * ((8 + k * 2.4) * frill + 2));
			c.lineTo(-9 - k * 2.5, sy * 4);
			c.closePath();
			c.fill();
		}
	}
	if (strike > 0.02) {
		c.fillStyle = col('#5a1f22');
		c.beginPath();
		c.moveTo(5, 0);
		c.lineTo(17 + 3 * strike, -5.5 * strike);
		c.lineTo(17 + 3 * strike, 5.5 * strike);
		c.closePath();
		c.fill();
	} else if (tongue && grey === 0 && t % 2.9 < 0.28) {
		c.strokeStyle = '#a83a44';
		c.lineWidth = 0.9;
		c.beginPath();
		c.moveTo(15, 0);
		c.lineTo(19, 0);
		c.lineTo(21, -1.5);
		c.moveTo(19, 0);
		c.lineTo(21, 1.5);
		c.stroke();
	}
	const o = strike * 4;
	const head = (w: number): void => {
		c.beginPath();
		c.moveTo(15 + w, -1.5 - o);
		c.lineTo(6, -6 - w);
		c.lineTo(-2, -8 - w);
		c.lineTo(-9 - w, -5);
		c.lineTo(-9 - w, 5);
		c.lineTo(-2, 8 + w);
		c.lineTo(6, 6 + w);
		c.lineTo(15 + w, 1.5 + o);
		if (strike > 0.02) c.lineTo(6, 0);
		else c.quadraticCurveTo(16 + w, 0, 15 + w, -1.5);
		c.closePath();
	};
	c.fillStyle = 'rgba(0,0,0,0.45)';
	c.save();
	c.translate(1.5, 3);
	head(0);
	c.fill();
	c.restore();
	c.fillStyle = AS.outline;
	head(1.3);
	c.fill();
	c.fillStyle = col(AS.top);
	head(0);
	c.fill();
	c.fillStyle = col('#2a4c4c');
	ellipse(c, 2, 0, 7.5, 2.8);
	if (strike > 0.02) {
		c.fillStyle = '#efe6d2';
		for (const sy of [-1, 1])
			for (let k = 0; k < 3; k++) circle(c, 9 + k * 2, sy * (1.4 + k * 1.2) * strike, 0.6);
	}
	for (const sy of [-1, 1]) {
		c.fillStyle = col(AS.hornDark);
		c.beginPath();
		c.moveTo(-1, sy * 6.5);
		c.quadraticCurveTo(-8, sy * 11, -16, sy * 10.5);
		c.quadraticCurveTo(-9, sy * 8.5, -4, sy * 4.5);
		c.closePath();
		c.fill();
		c.fillStyle = col(AS.horn);
		c.beginPath();
		c.moveTo(-1.5, sy * 6.2);
		c.quadraticCurveTo(-8, sy * 10, -15, sy * 10.2);
		c.quadraticCurveTo(-8.5, sy * 8.4, -4, sy * 5);
		c.closePath();
		c.fill();
	}
	for (const sy of [-1, 1]) {
		c.fillStyle = grey > 0 ? PAL.stone : AS.eye;
		ellipse(c, 6, sy * 4.2, 2.2, 1.4, sy * 0.3);
		c.fillStyle = '#120a04';
		ellipse(c, 6.3, sy * 4.2, 0.5, 1.3, sy * 0.3);
	}
	c.restore();
	if (eyeGlow > 0) {
		for (const sy of [-1, 1]) {
			const ex = x + Math.cos(a) * 6 * s - Math.sin(a) * sy * 4.2 * s;
			const ey = y + Math.sin(a) * 6 * s + Math.cos(a) * sy * 4.2 * s;
			L.push([ex, ey, cs * 0.4, AS.eye, 0.75 * eyeGlow]);
		}
	}
}

interface Pt {
	x: number;
	y: number;
	r: number;
	d: number;
	a: number;
}
const ptPool: Pt[] = [];

export function drawAspid(
	c: CanvasRenderingContext2D,
	f: BodyPath,
	cs: number,
	t: number,
	o: AspidStyle,
	L: Light[]
): void {
	const len = o.len;
	if (len < 1) return;
	/** Радиус тела: 0,21 клетки (было 0,25). */
	const R = cs * 0.2125;
	const total = len - 0.55;
	const from = o.from ?? 0;
	const lod = cs < 26;
	const push = o.push;
	const off = (p: readonly [number, number]): readonly [number, number] => {
		if (!push || push.amt === 0) return p;
		const dx = p[0] - push.x;
		const dy = p[1] - push.y;
		const l = Math.hypot(dx, dy) || 1;
		return [p[0] + (dx / l) * push.amt, p[1] + (dy / l) * push.amt];
	};
	const grey = o.grey;
	const G = (d: number): number => (grey ? grey(Math.round(d)) : 0);
	const col = (h: string, g: number): string => (g > 0 ? mix(h, PAL.stone, g) : h);

	let n = 0;
	const step = 2 / cs;
	for (let d = from; d <= total; d += step) {
		const p = off(f(d));
		const q = off(f(d + 0.05));
		let r = R;
		const rel = d / total;
		if (rel > 0.62) r *= Math.max(0.22, 1 - ((rel - 0.62) / 0.38) * 0.78);
		if (o.bulges) for (const b of o.bulges) r *= 1 + 0.45 * Math.exp(-(((d - b) / 0.5) ** 2));
		const pt = ptPool[n] ?? (ptPool[n] = { x: 0, y: 0, r: 0, d: 0, a: 0 });
		pt.x = p[0] * cs;
		pt.y = p[1] * cs;
		pt.r = r;
		pt.d = d;
		pt.a = Math.atan2(p[1] - q[1], p[0] - q[0]);
		n++;
	}

	if (n >= 2) {
		c.fillStyle = 'rgba(0,0,0,0.45)';
		for (let i = n - 1; i >= 0; i--) circle(c, ptPool[i].x + 2, ptPool[i].y + 3.5, ptPool[i].r);
		c.fillStyle = AS.outline;
		for (let i = n - 1; i >= 0; i--) circle(c, ptPool[i].x, ptPool[i].y, ptPool[i].r + 1.4);
		for (let i = n - 1; i >= 0; i--) {
			const p = ptPool[i];
			c.fillStyle = col(AS.base, G(p.d));
			circle(c, p.x, p.y, p.r);
		}
		for (let i = n - 1; i >= 0; i--) {
			const p = ptPool[i];
			c.fillStyle = col(AS.top, G(p.d));
			circle(c, p.x, p.y - p.r * 0.1, p.r * 0.72);
		}
		if (!lod) {
			c.strokeStyle = AS.scale;
			c.lineWidth = 0.9;
			for (let i = 2; i < n; i += 4) {
				const p = ptPool[i];
				if (G(p.d) > 0.5) continue;
				for (const sd of [-1, 1]) {
					const ox = -Math.sin(p.a) * sd * p.r * 0.55;
					const oy = Math.cos(p.a) * sd * p.r * 0.55;
					c.beginPath();
					c.arc(p.x + ox, p.y + oy, p.r * 0.22, p.a + Math.PI * 0.5, p.a + Math.PI * 1.5);
					c.stroke();
				}
			}
		}
		if (o.sweep != null) {
			for (let i = 0; i < n; i += 2) {
				const p = ptPool[i];
				const k = Math.exp(-(((p.d - o.sweep) / 0.6) ** 2));
				if (k > 0.05) L.push([p.x, p.y, cs * 0.5, PAL.gold, 0.3 * k]);
			}
		}
	}

	const first = Math.max(1, Math.ceil(from - 0.01));
	// Шипы между щитками: лежат, встают волной по событию.
	for (let i = first; i < len; i++) {
		const p = off(f(i + 0.5));
		const p2 = off(f(i + 0.44));
		const p3 = off(f(i + 0.56));
		const a = Math.atan2(p2[1] - p3[1], p2[0] - p3[0]);
		const g = grey ? grey(i) : 0;
		let rise = 0.45;
		if (o.wave != null) rise += 0.55 * Math.exp(-(((i - o.wave) / 1.1) ** 2));
		if (o.strike) rise = Math.max(rise, 0.45 + 0.55 * o.strike);
		const tp = (i > len * 0.68 ? 0.7 : 1) * (lod ? 0.8 : 1) * 0.85;
		c.save();
		c.translate(p[0] * cs, p[1] * cs);
		c.rotate(a);
		c.fillStyle = col(AS.spineDark, g);
		c.beginPath();
		c.moveTo(cs * 0.06 * tp, 0);
		c.lineTo(-cs * 0.22 * rise * tp, -cs * 0.05 * tp);
		c.lineTo(-cs * 0.22 * rise * tp, cs * 0.05 * tp);
		c.closePath();
		c.fill();
		c.fillStyle = col(AS.spine, g);
		c.beginPath();
		c.moveTo(cs * 0.04 * tp, 0);
		c.lineTo(-cs * 0.2 * rise * tp, -cs * 0.025 * tp);
		c.lineTo(-cs * 0.18 * rise * tp, cs * 0.02 * tp);
		c.closePath();
		c.fill();
		c.restore();
	}

	// Щитки-биты: крупные, сплошные, в тёмной оправе. Светятся только по событию.
	for (let i = first; i < len; i++) {
		const p = off(f(i));
		const p2 = off(f(i - 0.06));
		const p3 = off(f(i + 0.06));
		const a = Math.atan2(p2[1] - p3[1], p2[0] - p3[0]);
		const raw = o.bits[i] ?? 0;
		const bit = o.flip && o.flip(i) ? raw ^ 1 : raw;
		const g = grey ? grey(i) : 0;
		const taper = i > len * 0.68 ? 0.8 : 1;
		const x = p[0] * cs;
		const y = p[1] * cs;
		const q = cs * 0.184 * taper;
		c.save();
		c.translate(x, y);
		c.rotate(a);
		if (bit) {
			c.fillStyle = col(AS.rim, g);
			diamond(c, q * 1.4, q * 1.05);
			c.fillStyle = col(PAL.gold, g);
			diamond(c, q * 1.15, q * 0.86);
			c.fillStyle = col('#8a6420', g);
			diamond(c, q * 0.48, q * 0.36);
		} else {
			c.strokeStyle = col(AS.rim, g);
			c.lineWidth = cs * 0.1 * taper;
			c.beginPath();
			c.ellipse(0, 0, q * 0.9, q * 0.75, 0, 0, TAU);
			c.stroke();
			c.strokeStyle = col(PAL.pat, g);
			c.lineWidth = cs * 0.055 * taper;
			c.beginPath();
			c.ellipse(0, 0, q * 0.9, q * 0.75, 0, 0, TAU);
			c.stroke();
			c.fillStyle = col('#0d3f39', g);
			circle(c, 0, 0, q * 0.22);
		}
		c.restore();
		const fb = o.flashBit ? o.flashBit(i) : 0;
		if (fb > 0) L.push([x, y, cs * 0.75, bit ? PAL.gold : PAL.pat, 0.75 * fb]);
		const fa = o.flashAt ? o.flashAt(i) : 0;
		if (fa > 0) L.push([x, y, cs, PAL.patHi, 0.85 * fa]);
		if (o.sweep != null && Math.abs(i - o.sweep) < 0.7) L.push([x, y, cs * 0.8, PAL.goldHi, 0.7]);
	}

	if (from <= 0.01) {
		const h = off(f(0));
		const h2 = f(-0.08);
		const h3 = f(0.08);
		drawHead(
			c,
			h[0] * cs,
			h[1] * cs,
			Math.atan2(h2[1] - h3[1], h2[0] - h3[0]),
			cs,
			o.strike ?? 0,
			o.eyeGlow ?? 0,
			L,
			grey ? grey(0) : 0,
			t,
			o.tongue ?? true
		);
	}
}

function diamond(c: CanvasRenderingContext2D, w: number, h: number): void {
	c.beginPath();
	c.moveTo(w, 0);
	c.lineTo(0, -h);
	c.lineTo(-w, 0);
	c.lineTo(0, h);
	c.closePath();
	c.fill();
}
