// The station's marks and materials (style B): rivets and hex bolts, worn hazard paint and
// stencils, blood smears and drag trails, claw gouges, soot, and the nest's resin.
import type { Rng } from '../doom/fleshNoise';
import { fbm, rgbaOf } from '../doom/fleshNoise';

/** The resin's palette (the nest and what it grows over). */
export const RESIN = {
	dark: '#141712',
	mid: '#262b20',
	hi: '#8f9a7c',
	wet: '#c8d4b0'
} as const;

export function rivet(c: CanvasRenderingContext2D, x: number, y: number, s: number): void {
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

export function hexBolt(c: CanvasRenderingContext2D, x: number, y: number, s: number): void {
	c.fillStyle = 'rgba(0,0,0,.7)';
	c.beginPath();
	for (let i = 0; i < 6; i += 1) {
		const a = (i / 6) * Math.PI * 2 + 0.3;
		c.lineTo(x + s * 0.5 + Math.cos(a) * s * 1.1, y + s * 0.6 + Math.sin(a) * s * 1.1);
	}
	c.fill();
	const g = c.createLinearGradient(x - s, y - s, x + s, y + s);
	g.addColorStop(0, '#5f6662');
	g.addColorStop(1, '#1b1e1d');
	c.fillStyle = g;
	c.beginPath();
	for (let i = 0; i < 6; i += 1) {
		const a = (i / 6) * Math.PI * 2 + 0.3;
		c.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s);
	}
	c.fill();
	c.fillStyle = 'rgba(0,0,0,.5)';
	c.beginPath();
	c.arc(x, y, s * 0.35, 0, Math.PI * 2);
	c.fill();
}

export function hazardBand(
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
	c.fillStyle = '#15171a';
	c.fillRect(x, y, w, h);
	c.fillStyle = '#c9a227';
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

export function stencil(
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

/** Dried and fresh blood: a smear with a dark rim and drips. */
export function bloodSmear(
	c: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	a: number,
	r: Rng
): void {
	c.save();
	c.translate(x, y);
	c.rotate(a);
	for (let i = 0; i < 9; i += 1) {
		const px = (r() - 0.5) * w;
		const py = (r() - 0.5) * h;
		const g = c.createRadialGradient(px, py, 0, px, py, Math.max(w, h) * (0.2 + r() * 0.25));
		g.addColorStop(0, `rgba(58,9,8,${0.55 + r() * 0.3})`);
		g.addColorStop(0.7, `rgba(40,6,6,${0.35 + r() * 0.2})`);
		g.addColorStop(1, 'rgba(30,4,4,0)');
		c.fillStyle = g;
		c.beginPath();
		c.ellipse(px, py, w * (0.2 + r() * 0.3), h * (0.2 + r() * 0.3), r() * 3, 0, Math.PI * 2);
		c.fill();
	}
	c.strokeStyle = 'rgba(70,10,9,.6)';
	c.lineCap = 'round';
	for (let i = 0; i < 5; i += 1) {
		const px = (r() - 0.5) * w * 0.8;
		c.lineWidth = 0.8 + r() * 1.6;
		c.beginPath();
		c.moveTo(px, 0);
		c.lineTo(px + (r() - 0.5) * 2, h * 0.5 + r() * h * 0.8);
		c.stroke();
	}
	c.restore();
}

/** Three gouges torn through paint into bright metal. */
export function clawMarks(
	c: CanvasRenderingContext2D,
	x: number,
	y: number,
	len: number,
	a: number,
	r: Rng
): void {
	c.save();
	c.translate(x, y);
	c.rotate(a);
	c.lineCap = 'round';
	for (let k = -1; k <= 1; k += 1) {
		const off = k * 4.2 + (r() - 0.5);
		const l = len * (0.8 + r() * 0.3);
		c.strokeStyle = 'rgba(0,0,0,.8)';
		c.lineWidth = 2.6;
		c.beginPath();
		c.moveTo(-l / 2, off + 0.6);
		c.quadraticCurveTo(0, off - 2 + 0.6, l / 2, off + 1.5 + 0.6);
		c.stroke();
		c.strokeStyle = 'rgba(190,200,196,.55)';
		c.lineWidth = 1;
		c.beginPath();
		c.moveTo(-l / 2 + 2, off);
		c.quadraticCurveTo(0, off - 2, l / 2 - 1, off + 1.5);
		c.stroke();
	}
	c.restore();
}

export function scorch(
	c: CanvasRenderingContext2D,
	x: number,
	y: number,
	rad: number,
	a: number
): void {
	const g = c.createRadialGradient(x, y, 0, x, y, rad);
	g.addColorStop(0, `rgba(5,4,3,${a})`);
	g.addColorStop(0.6, `rgba(20,12,6,${a * 0.5})`);
	g.addColorStop(1, 'rgba(20,12,6,0)');
	c.fillStyle = g;
	c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
}

/** A blood trail dragged along a path of scene points. */
export function dragTrail(
	c: CanvasRenderingContext2D,
	pts: ReadonlyArray<readonly [number, number]>,
	r: Rng
): void {
	c.save();
	c.lineCap = 'round';
	c.lineJoin = 'round';
	for (let pass = 0; pass < 3; pass += 1) {
		for (let i = 1; i < pts.length; i += 1) {
			const k = i / pts.length;
			c.strokeStyle =
				pass === 0
					? `rgba(30,4,4,${0.5 * (1 - k * 0.6)})`
					: pass === 1
						? `rgba(62,8,7,${0.55 * (1 - k * 0.7)})`
						: `rgba(110,18,14,${0.25 * (1 - k)})`;
			c.lineWidth = (pass === 0 ? 16 : pass === 1 ? 10 : 2) * (1 - k * 0.5) * (0.8 + r() * 0.4);
			c.beginPath();
			c.moveTo(pts[i - 1][0] + (r() - 0.5) * 2, pts[i - 1][1] + (r() - 0.5) * 2);
			c.lineTo(pts[i][0], pts[i][1]);
			c.stroke();
		}
	}
	// streaks inside the smear (fingers, cloth)
	c.strokeStyle = 'rgba(20,2,2,.45)';
	c.lineWidth = 1;
	for (let i = 1; i < pts.length; i += 1) {
		for (const o of [-4, 0, 3]) {
			c.beginPath();
			c.moveTo(pts[i - 1][0] + o, pts[i - 1][1] + o * 0.4);
			c.lineTo(pts[i][0] + o, pts[i][1] + o * 0.4);
			c.stroke();
		}
	}
	c.restore();
}

/** Resin: glossy dark sheets with ribs that flow, beads of wet light, a few strands. */
export function resinTexture(
	p: CanvasRenderingContext2D,
	x0: number,
	y0: number,
	w: number,
	h: number,
	r: Rng,
	density: number
): void {
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
		p.strokeStyle = r() < 0.6 ? 'rgba(4,5,3,.7)' : rgbaOf(RESIN.mid, 0.9);
		p.lineWidth = 2 + r() * 3.5;
		p.beginPath();
		p.moveTo(px, py);
		p.quadraticCurveTo(mx, my, ex, ey);
		p.stroke();
		if (r() < 0.45) {
			p.strokeStyle = rgbaOf(RESIN.hi, 0.35 + r() * 0.3);
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
		p.fillStyle = rgbaOf(RESIN.wet, 0.5 + r() * 0.4);
		p.beginPath();
		p.arc(px, py, 0.6 + r() * 1.3, 0, Math.PI * 2);
		p.fill();
	}
}
