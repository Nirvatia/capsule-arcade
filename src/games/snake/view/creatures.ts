// Скарабеи, варан (Альфа) и печати.

import type { Op } from '../sim/types';
import { FONT_DISPLAY, PAL, TAU, circle, ellipse, hs, mix, type Light } from './paint';

export function drawScarab(
	c: CanvasRenderingContext2D,
	x: number,
	y: number,
	a: number,
	bit: 0 | 1,
	t: number,
	s: number,
	flee: boolean,
	L: Light[],
	seed: number,
	alpha = 1
): void {
	const col = bit ? PAL.gold : PAL.pat;
	const hi = bit ? PAL.goldHi : PAL.patHi;
	const dark = bit ? '#5a3d0e' : '#0d4740';
	L.push([x, y, s * 17, col, 0.3 * alpha]);
	c.save();
	c.globalAlpha = alpha;
	c.translate(x, y);
	c.rotate(a);
	c.fillStyle = 'rgba(0,0,0,0.35)';
	ellipse(c, -1 * s, 2.5 * s, 10 * s, 6.5 * s);
	c.strokeStyle = '#0a0806';
	c.lineWidth = 1.3 * s;
	c.lineCap = 'round';
	c.lineJoin = 'round';
	const sp = flee ? 26 : 13;
	for (const sd of [-1, 1]) {
		for (let k = -1; k <= 1; k++) {
			const ph = t * sp + k * 2.1 + (sd > 0 ? Math.PI : 0) + seed;
			const sw = Math.sin(ph) * 2.4 * s;
			c.beginPath();
			c.moveTo(k * 3.6 * s + s, sd * 3.4 * s);
			c.lineTo(k * 4.4 * s + sw * 0.5 + s, sd * 7.4 * s);
			c.lineTo(k * 5.6 * s + sw + s, sd * 10 * s);
			c.stroke();
		}
	}
	if (flee) {
		const fl = Math.abs(Math.sin(t * 40 + seed));
		c.fillStyle = `rgba(225,235,255,${0.18 + 0.15 * fl})`;
		for (const sd of [-1, 1]) ellipse(c, -4 * s, sd * (7 + 2 * fl) * s, 10 * s, 3.2 * s, sd * 0.35);
	}
	c.fillStyle = '#14110c';
	ellipse(c, 10 * s, 0, 2.8 * s, 3.2 * s);
	c.strokeStyle = '#14110c';
	c.lineWidth = 0.9 * s;
	for (const sd of [-1, 1]) {
		c.beginPath();
		c.moveTo(11.5 * s, sd * 1.5 * s);
		c.quadraticCurveTo(15 * s, sd * 3 * s, 15.5 * s, sd * 5 * s);
		c.stroke();
	}
	const pg = c.createLinearGradient(0, -5 * s, 0, 5 * s);
	pg.addColorStop(0, mix(dark, '#000000', 0.3));
	pg.addColorStop(0.35, mix(col, '#000000', 0.35));
	pg.addColorStop(1, mix(dark, '#000000', 0.5));
	c.fillStyle = pg;
	ellipse(c, 6 * s, 0, 3.6 * s, 5 * s);
	const open = flee ? 0.38 : 0;
	for (const sd of [-1, 1]) {
		c.save();
		c.translate(3.5 * s, 0);
		c.rotate(-sd * open);
		const g = c.createLinearGradient(0, sd * 7 * s, 0, 0);
		g.addColorStop(0, dark);
		g.addColorStop(0.45, col);
		g.addColorStop(0.8, hi);
		g.addColorStop(1, mix(col, '#000000', 0.25));
		c.fillStyle = g;
		c.beginPath();
		c.moveTo(0, 0);
		c.bezierCurveTo(0, sd * 7.5 * s, -12 * s, sd * 7.5 * s, -12.5 * s, 0);
		c.closePath();
		c.fill();
		c.strokeStyle = 'rgba(0,0,0,0.55)';
		c.lineWidth = 0.8 * s;
		c.stroke();
		c.restore();
	}
	if (!flee) {
		c.strokeStyle = 'rgba(20,12,4,0.65)';
		c.lineWidth = 1.3 * s;
		c.lineJoin = 'miter';
		c.beginPath();
		if (bit) {
			c.moveTo(-1 * s, 0);
			c.lineTo(-4.5 * s, -2.3 * s);
			c.lineTo(-8 * s, 0);
			c.lineTo(-4.5 * s, 2.3 * s);
			c.closePath();
		} else {
			c.arc(-4.5 * s, 0, 2.3 * s, 0, TAU);
		}
		c.stroke();
		c.fillStyle = 'rgba(255,255,255,0.4)';
		ellipse(c, -3 * s, -3.2 * s, 4.5 * s, 0.9 * s, -0.08);
	}
	c.restore();
}

export interface VaranStyle {
	squeeze?: number;
	flash?: string;
	flashA?: number;
	alpha?: number;
	thrash?: number;
}

export function drawVaran(
	c: CanvasRenderingContext2D,
	x: number,
	y: number,
	angle: number,
	t: number,
	s: number,
	o: VaranStyle = {}
): void {
	const th = o.thrash ?? 0;
	const alpha = o.alpha ?? 1;
	if (alpha <= 0) return;
	const sqz = o.squeeze ?? 0;
	c.save();
	c.translate(x, y);
	c.rotate(angle);
	c.globalAlpha = alpha;
	c.scale(1 - 0.08 * sqz, 1 - 0.22 * sqz);
	if (th) c.rotate(Math.sin(t * 30) * 0.08 * th);
	c.fillStyle = 'rgba(0,0,0,0.38)';
	ellipse(c, 2 * s, 5 * s, 30 * s, 12 * s);
	for (let i = 0; i < 9; i++) {
		const tx = -14 * s - i * 3.6 * s;
		const ty = Math.sin(t * (2.6 + th * 8) - i * 0.55) * i * 0.75 * s;
		c.fillStyle = i % 2 ? '#4a4939' : '#55543f';
		circle(c, tx, ty, (5.2 - i * 0.5) * s);
	}
	c.strokeStyle = '#45443a';
	c.lineCap = 'round';
	for (const [lx, sd, ph] of [
		[9, -1, 0],
		[9, 1, 1],
		[-9, -1, 1],
		[-9, 1, 0]
	]) {
		const sw = Math.sin(t * (4 + th * 10) + ph * Math.PI) * 4 * s;
		c.lineWidth = 3 * s;
		c.beginPath();
		c.moveTo(lx * s, sd * 5 * s);
		c.lineTo(lx * s + sw * 0.6 + 2 * s, sd * 11 * s);
		c.lineTo(lx * s + sw + 4 * s, sd * 14 * s);
		c.stroke();
		c.lineWidth = s;
		for (let k = -1; k <= 1; k++) {
			c.beginPath();
			c.moveTo(lx * s + sw + 4 * s, sd * 14 * s);
			c.lineTo(lx * s + sw + 6 * s + k * 1.5 * s, sd * 16 * s);
			c.stroke();
		}
	}
	const bg = c.createLinearGradient(0, -9 * s, 0, 9 * s);
	bg.addColorStop(0, '#6b6a53');
	bg.addColorStop(0.5, '#5a5945');
	bg.addColorStop(1, '#3d3c2f');
	c.fillStyle = bg;
	ellipse(c, 0, 0, 17 * s, 8.5 * s);
	c.strokeStyle = 'rgba(30,30,22,0.55)';
	c.lineWidth = 1.2 * s;
	for (let i = -3; i <= 3; i++) {
		c.beginPath();
		c.ellipse(i * 4.2 * s, 0, 1.6 * s, 7.6 * s, 0, -Math.PI / 2, Math.PI / 2);
		c.stroke();
	}
	c.fillStyle = '#b08a46';
	for (let i = 0; i < 9; i++)
		circle(c, -13 * s + hs(i * 3) * 26 * s, (hs(i * 7) - 0.5) * 9 * s, (0.9 + hs(i) * 0.8) * s);
	const hw = Math.sin(t * 1.7) * 0.15 + (th ? Math.sin(t * 25) * 0.25 * th : 0);
	c.save();
	c.translate(14 * s, 0);
	c.rotate(hw);
	c.fillStyle = '#58573f';
	ellipse(c, 2 * s, 0, 6 * s, 4.6 * s);
	c.fillStyle = '#626148';
	ellipse(c, 9 * s, 0, 6.5 * s, 4.1 * s);
	c.fillStyle = '#4a4937';
	ellipse(c, 12 * s, 0, 3.5 * s, 2.6 * s);
	c.fillStyle = '#e8b84a';
	circle(c, 8.5 * s, -2.6 * s, 1.2 * s);
	circle(c, 8.5 * s, 2.6 * s, 1.2 * s);
	c.fillStyle = '#000';
	circle(c, 8.8 * s, -2.6 * s, 0.5 * s);
	circle(c, 8.8 * s, 2.6 * s, 0.5 * s);
	if (t % 2.3 < 0.32) {
		c.strokeStyle = '#c86b78';
		c.lineWidth = 0.9 * s;
		c.beginPath();
		c.moveTo(15 * s, 0);
		c.lineTo(19 * s, 0);
		c.lineTo(21 * s, -1.3 * s);
		c.moveTo(19 * s, 0);
		c.lineTo(21 * s, 1.3 * s);
		c.stroke();
	}
	c.restore();
	const fa = o.flashA ?? 0;
	if (fa > 0 && o.flash) {
		c.globalCompositeOperation = 'lighter';
		c.globalAlpha = alpha * fa;
		c.fillStyle = o.flash;
		ellipse(c, 0, 0, 18 * s, 9 * s);
		ellipse(c, 22 * s, 0, 8 * s, 5 * s);
	}
	c.restore();
}

function drawGlyph(
	c: CanvasRenderingContext2D,
	op: Op | 'not',
	x: number,
	y: number,
	r: number,
	col: string
): void {
	c.strokeStyle = col;
	c.fillStyle = col;
	c.lineWidth = r * 0.17;
	c.lineCap = 'round';
	c.lineJoin = 'round';
	c.beginPath();
	if (op === 'or') {
		c.moveTo(x, y - r * 0.5);
		c.lineTo(x, y + r * 0.5);
		c.stroke();
	} else if (op === 'xor') {
		c.moveTo(x - r * 0.42, y + r * 0.3);
		c.lineTo(x, y - r * 0.32);
		c.lineTo(x + r * 0.42, y + r * 0.3);
		c.stroke();
	} else if (op === 'not') {
		c.moveTo(x - r * 0.48, y + r * 0.1);
		c.bezierCurveTo(x - r * 0.3, y - r * 0.35, x - r * 0.05, y - r * 0.2, x, y);
		c.bezierCurveTo(
			x + r * 0.05,
			y + r * 0.2,
			x + r * 0.3,
			y + r * 0.35,
			x + r * 0.48,
			y - r * 0.1
		);
		c.stroke();
	} else {
		c.font = `${r * 1.25}px ${FONT_DISPLAY}`;
		c.textAlign = 'center';
		c.textBaseline = 'middle';
		c.fillText('&', x, y + r * 0.08);
	}
}

export interface SealStyle {
	scale?: number;
	glyphA?: number;
	crack?: number;
}

/**
 * Печать: бронзовый диск с оператором и зарубками прогресса кольца.
 * Золото — удар пройдёт, багровый — не пройдёт, тёмные зарубки — свободные клетки.
 */
export function drawSeal(
	c: CanvasRenderingContext2D,
	x: number,
	y: number,
	r: number,
	op: Op | 'not',
	ok: boolean,
	filled: number,
	total: number,
	t: number,
	L: Light[],
	o: SealStyle = {}
): void {
	const col = ok ? PAL.gold : PAL.crim;
	const n = Math.max(1, total);
	if (total > 0) {
		for (let k = 0; k < n; k++) {
			const a0 = -Math.PI / 2 + (k / n) * TAU + 0.06;
			const a1 = a0 + TAU / n - 0.12;
			c.strokeStyle = k < filled ? col : '#2a2f2f';
			c.lineWidth = r * 0.14;
			c.lineCap = 'butt';
			c.beginPath();
			c.arc(x, y, r * 1.2, a0, a1);
			c.stroke();
		}
	}
	const g = c.createRadialGradient(x, y - r * 0.4, 0, x, y, r);
	g.addColorStop(0, '#1e2126');
	g.addColorStop(1, '#060709');
	c.fillStyle = g;
	circle(c, x, y, r);
	c.strokeStyle = PAL.bronze;
	c.lineWidth = r * 0.1;
	c.beginPath();
	c.arc(x, y, r, 0, TAU);
	c.stroke();
	c.strokeStyle = 'rgba(240,199,102,0.3)';
	c.lineWidth = 1;
	c.beginPath();
	c.arc(x, y, r * 0.78, 0, TAU);
	c.stroke();
	c.save();
	c.globalAlpha = o.glyphA ?? 1;
	drawGlyph(c, op, x, y, r * (o.scale ?? 1), op === 'not' ? PAL.pat : col);
	c.restore();
	const crack = o.crack ?? 0;
	if (crack > 0) {
		c.strokeStyle = `rgba(255,154,166,${0.9 * crack})`;
		c.lineWidth = 1.4;
		for (let i = 0; i < 5; i++) {
			const a = i * 1.3 + 0.4;
			c.beginPath();
			c.moveTo(x + Math.cos(a) * r * 0.15, y + Math.sin(a) * r * 0.15);
			c.lineTo(x + Math.cos(a + 0.2) * r * 0.6, y + Math.sin(a + 0.2) * r * 0.6);
			c.lineTo(x + Math.cos(a - 0.1) * r * 1.05 * crack, y + Math.sin(a - 0.1) * r * 1.05 * crack);
			c.stroke();
		}
	}
	L.push([x, y, r * 2.6, op === 'not' ? PAL.pat : col, 0.2 + 0.05 * Math.sin(t * 2)]);
}
