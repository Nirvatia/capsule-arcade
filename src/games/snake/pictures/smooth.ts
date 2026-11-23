// Ступенчатый штрих → гладкая линия. Лесенки становятся диагоналями, углы — дугами.
// Сырая и гладкая линии имеют одинаковое число точек, поэтому их можно смешивать (оживление).

import type { Cell, Pt, Stroke } from './types';

const STEP = 0.25;

const center = (c: Cell): Pt => ({ x: c.x + 0.5, y: c.y + 0.5 });

/** Точки пути через центры клеток, с продлением концов к соседним штрихам. */
export function strokePath(s: Stroke, withJoins: boolean): Pt[] {
	const pts = s.cells.map(center);
	if (withJoins) {
		if (s.joins[0]) pts.unshift({ ...s.joins[0] });
		if (s.joins[1]) pts.push({ ...s.joins[1] });
	}
	return pts;
}

/** Передискретизация ломаной с равным шагом (последняя точка — ровно конец). */
export function resample(pts: readonly Pt[], step = STEP): Pt[] {
	if (pts.length < 2) return pts.map((p) => ({ ...p }));
	const out: Pt[] = [{ ...pts[0] }];
	let carry = 0;
	for (let i = 1; i < pts.length; i++) {
		const a = pts[i - 1];
		const b = pts[i];
		const len = Math.hypot(b.x - a.x, b.y - a.y);
		if (len < 1e-9) continue;
		let d = step - carry;
		while (d < len - 1e-9) {
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

/**
 * Гауссово сглаживание с закреплёнными концами: у края окно сужается симметрично,
 * поэтому концы остаются на месте и не «втягиваются» внутрь.
 */
export function gaussian(pts: readonly Pt[], sigmaCells = 0.75, step = STEP): Pt[] {
	const n = pts.length;
	const sigma = sigmaCells / step;
	const reach = Math.ceil(sigma * 3);
	const out: Pt[] = [];
	for (let i = 0; i < n; i++) {
		const r = Math.min(reach, i, n - 1 - i);
		let sx = 0;
		let sy = 0;
		let sw = 0;
		for (let k = -r; k <= r; k++) {
			const w = Math.exp(-(k * k) / (2 * sigma * sigma));
			sx += pts[i + k].x * w;
			sy += pts[i + k].y * w;
			sw += w;
		}
		out.push({ x: sx / sw, y: sy / sw });
	}
	return out;
}

export interface StrokeShape {
	/** Сырая линия по центрам клеток (с продлением к соседям), передискретизированная. */
	raw: Pt[];
	/** Та же линия после сглаживания, той же длины. */
	smooth: Pt[];
}

export function strokeShape(s: Stroke): StrokeShape {
	const raw = resample(strokePath(s, true));
	return { raw, smooth: gaussian(raw) };
}

/** Смешивание сырой и гладкой линии: 0 — сетка, 1 — рисунок. */
export function morph(shape: StrokeShape, k: number): Pt[] {
	return shape.raw.map((p, i) => ({
		x: p.x + (shape.smooth[i].x - p.x) * k,
		y: p.y + (shape.smooth[i].y - p.y) * k
	}));
}
