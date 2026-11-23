// Живая морская змея сбоку: сужающееся тело с мягкими кольцами, полупрозрачный плавник
// с лучами вдоль спины, шлейф на хвосте, голова с миндалевидным глазом и усами.
// Путь может быть разорван (змейка прошла через край): каждый кусок рисуется отдельно,
// а кольца, ширина и плавник считаются по общей длине — тело не растягивается через экран.

import type { Pt } from '../pictures/types';
import { TAU, frame, resample, type FramePt } from './paint';

type Ctx = CanvasRenderingContext2D;

export interface CreaturePalette {
	ink: string;
	body: string;
	belly: string;
	mark: string;
	fin: string;
	finEdge: string;
	eye: string;
	/** Блик в глазу. */
	glint: string;
}

interface BodyPt extends FramePt {
	/** 0 — кончик носа, 1 — кончик хвоста. */
	u: number;
	/** Расстояние от головы вдоль тела. */
	s: number;
	w: number;
}

/**
 * `subs` — куски пути от головы к хвосту (первая точка первого куска — голова).
 * `R` — полуширина тела, `ang` — направление морды, `wave` — сила извивов (доля R).
 */
export function drawCreature(
	ctx: Ctx,
	subs: readonly Pt[][],
	R: number,
	ang: number,
	pal: CreaturePalette,
	t: number,
	wave: number,
	alpha = 1
): void {
	if (alpha <= 0) return;
	const pieces = subs.map((s) => resample(s, Math.max(1.5, R * 0.22))).filter((s) => s.length > 1);
	if (!pieces.length) return;
	const total = pieces.reduce((acc, p) => acc + length(p), 0) || 1;

	// извивы: бегущая волна, у головы гаснет, чтобы нос смотрел ровно
	let s0 = 0;
	const bodies: BodyPt[][] = [];
	for (const piece of pieces) {
		const fr = frame(piece);
		let s = s0;
		const moved = fr.map((p, i) => {
			if (i) s += Math.hypot(p.x - fr[i - 1].x, p.y - fr[i - 1].y);
			const k = Math.min(1, s / (R * 7));
			const off = wave > 0 ? Math.sin(s / (R * 5.5) - t * 4.2) * R * wave * k : 0;
			return { x: p.x + p.nx * off, y: p.y + p.ny * off, s };
		});
		const fr2 = frame(moved);
		bodies.push(
			fr2.map((p, i) => {
				const u = moved[i].s / total;
				return { ...p, u, s: moved[i].s, w: half(u, R) };
			})
		);
		s0 = s;
	}

	// плавник на той стороне, что смотрит вверх у шеи
	const neck = bodies[0][Math.min(bodies[0].length - 1, 6)];
	const side = neck.ny < 0 ? 1 : -1;

	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';
	for (const b of bodies) drawFin(ctx, b, R, pal, side, t);
	const last = bodies[bodies.length - 1];
	drawWisp(ctx, last[last.length - 1], R, pal, t);
	for (const b of bodies) drawBody(ctx, b, R, pal, side);
	ctx.restore();
	drawHead(ctx, bodies[0][0], R, ang, pal, side, t, alpha);
}

function length(p: readonly Pt[]): number {
	let l = 0;
	for (let i = 1; i < p.length; i++) l += Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y);
	return l;
}

/** Полуширина: шея перед головой, ровное тело, длинный тонкий хвост. */
function half(u: number, R: number): number {
	const neck = 0.07;
	if (u < neck) return R * (0.78 + 0.22 * (u / neck));
	const tail = Math.pow(1 - (u - neck) / (1 - neck), 1.15);
	return R * (0.06 + 0.94 * Math.min(1, tail * 1.25));
}

const upper = (p: BodyPt, side: number): Pt => ({
	x: p.x + p.nx * p.w * side,
	y: p.y + p.ny * p.w * side
});
const lower = (p: BodyPt, side: number): Pt => ({
	x: p.x - p.nx * p.w * side,
	y: p.y - p.ny * p.w * side
});

function drawFin(
	ctx: Ctx,
	b: BodyPt[],
	R: number,
	pal: CreaturePalette,
	side: number,
	t: number
): void {
	const fin = b.map((p) => {
		const env =
			p.u < 0.1 || p.u > 0.97 ? 0 : Math.pow(Math.sin((Math.PI * (p.u - 0.1)) / 0.87), 0.7);
		const ripple = 0.75 + 0.25 * Math.sin(p.u * 26 - t * 3);
		const h = R * 1.3 * env * ripple;
		const top = upper(p, side);
		return {
			x: top.x + p.nx * side * h - p.tx * h * 0.25,
			y: top.y + p.ny * side * h - p.ty * h * 0.25
		};
	});
	const base = ctx.globalAlpha;
	ctx.beginPath();
	b.forEach((p, i) => {
		const q = upper(p, side);
		if (i) ctx.lineTo(q.x, q.y);
		else ctx.moveTo(q.x, q.y);
	});
	for (let i = b.length - 1; i >= 0; i--) ctx.lineTo(fin[i].x, fin[i].y);
	ctx.closePath();
	ctx.fillStyle = pal.fin;
	ctx.globalAlpha = base * 0.36;
	ctx.fill();
	// лучи плавника — на постоянном шаге вдоль тела, чтобы не мерцали
	ctx.strokeStyle = pal.finEdge;
	ctx.lineWidth = 0.8;
	ctx.globalAlpha = base * 0.25;
	const ray = R * 1.1;
	for (let i = 1; i < b.length; i++) {
		if (Math.floor(b[i].s / ray) === Math.floor(b[i - 1].s / ray)) continue;
		const q = upper(b[i], side);
		ctx.beginPath();
		ctx.moveTo(q.x, q.y);
		ctx.lineTo(fin[i].x, fin[i].y);
		ctx.stroke();
	}
	ctx.globalAlpha = base * 0.6;
	ctx.lineWidth = 1;
	ctx.beginPath();
	fin.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
	ctx.stroke();
	ctx.globalAlpha = base;
}

/** Тонкий шлейф, продолжающий хвост. */
function drawWisp(ctx: Ctx, tip: BodyPt, R: number, pal: CreaturePalette, t: number): void {
	const base = ctx.globalAlpha;
	ctx.beginPath();
	for (let k = 0; k <= 10; k++) {
		const d = k * R * 0.55;
		const sway = Math.sin(k * 0.7 - t * 3) * R * 0.5 * (k / 10);
		const x = tip.x + tip.tx * d + tip.nx * sway;
		const y = tip.y + tip.ty * d + tip.ny * sway;
		if (k) ctx.lineTo(x, y);
		else ctx.moveTo(x, y);
	}
	ctx.strokeStyle = pal.fin;
	ctx.globalAlpha = base * 0.5;
	ctx.lineWidth = Math.max(1, R * 0.28);
	ctx.stroke();
	ctx.globalAlpha = base;
}

function drawBody(ctx: Ctx, b: BodyPt[], R: number, pal: CreaturePalette, side: number): void {
	const base = ctx.globalAlpha;
	const n = b.length;
	const outline = (): void => {
		ctx.beginPath();
		b.forEach((p, i) => {
			const q = upper(p, side);
			if (i) ctx.lineTo(q.x, q.y);
			else ctx.moveTo(q.x, q.y);
		});
		for (let i = n - 1; i >= 0; i--) {
			const q = lower(b[i], side);
			ctx.lineTo(q.x, q.y);
		}
		ctx.closePath();
	};
	ctx.save();
	outline();
	ctx.fillStyle = pal.body;
	ctx.fill();
	ctx.clip();
	// светлое брюхо вдоль нижнего края
	ctx.globalAlpha = base * 0.55;
	ctx.strokeStyle = pal.belly;
	ctx.beginPath();
	b.forEach((p, i) => {
		const q = lower(p, side);
		const x = q.x + (p.x - q.x) * 0.25;
		const y = q.y + (p.y - q.y) * 0.25;
		if (i) ctx.lineTo(x, y);
		else ctx.moveTo(x, y);
	});
	ctx.lineWidth = R * 0.9;
	ctx.stroke();
	// мягкие поперечные пятна по спине, привязанные к длине тела
	ctx.globalAlpha = base * 0.38;
	ctx.fillStyle = pal.mark;
	const band = R * 2.2;
	for (let i = 1; i < n; i++) {
		const p = b[i];
		if (p.u < 0.1 || Math.floor(p.s / band) === Math.floor(b[i - 1].s / band)) continue;
		ctx.beginPath();
		ctx.ellipse(
			p.x + p.nx * side * p.w * 0.35,
			p.y + p.ny * side * p.w * 0.35,
			p.w * 0.32,
			p.w * 0.75,
			Math.atan2(p.ty, p.tx),
			0,
			TAU
		);
		ctx.fill();
	}
	ctx.restore();
	// обводка тушью: спина плотнее, брюхо тоньше
	ctx.strokeStyle = pal.ink;
	ctx.globalAlpha = base * 0.85;
	ctx.lineWidth = 1.6;
	ctx.beginPath();
	b.forEach((p, i) => {
		const q = upper(p, side);
		if (i) ctx.lineTo(q.x, q.y);
		else ctx.moveTo(q.x, q.y);
	});
	ctx.stroke();
	ctx.globalAlpha = base * 0.6;
	ctx.lineWidth = 1;
	ctx.beginPath();
	b.forEach((p, i) => {
		const q = lower(p, side);
		if (i) ctx.lineTo(q.x, q.y);
		else ctx.moveTo(q.x, q.y);
	});
	ctx.stroke();
	ctx.globalAlpha = base;
}

function drawHead(
	ctx: Ctx,
	p: Pt,
	R: number,
	ang: number,
	pal: CreaturePalette,
	side: number,
	t: number,
	alpha: number
): void {
	ctx.save();
	ctx.translate(p.x, p.y);
	ctx.rotate(ang);
	// после поворота локальная -y смотрит туда же, куда нормаль пути (+n); плавник лежит
	// на стороне side·n, поэтому при side = -1 голову отражаем: спина — к плавнику
	ctx.scale(1, side === 1 ? 1 : -1);
	ctx.globalAlpha = alpha;
	// здесь +x — вперёд, -y — спина
	const L = R * 2.3;
	const Hh = R * 1.05;
	ctx.strokeStyle = pal.ink;
	ctx.lineWidth = 0.9;
	ctx.globalAlpha = alpha * 0.7;
	for (const k of [0, 1]) {
		ctx.beginPath();
		ctx.moveTo(L * 0.72, Hh * 0.45);
		ctx.bezierCurveTo(
			L * 0.5,
			Hh * (1.4 + k * 0.5),
			-L * 0.2,
			Hh * (1.2 + k * 0.4 + 0.2 * Math.sin(t * 2 + k)),
			-L * (0.8 + 0.3 * k),
			Hh * (1.5 + k * 0.6)
		);
		ctx.stroke();
	}
	ctx.globalAlpha = alpha;
	ctx.beginPath();
	ctx.moveTo(-R * 0.3, -Hh * 0.78);
	ctx.bezierCurveTo(L * 0.15, -Hh * 1.15, L * 0.6, -Hh * 0.9, L * 0.95, -Hh * 0.28);
	ctx.quadraticCurveTo(L * 1.05, 0, L * 0.9, Hh * 0.3);
	ctx.bezierCurveTo(L * 0.6, Hh * 0.8, L * 0.15, Hh * 0.95, -R * 0.3, Hh * 0.78);
	ctx.closePath();
	ctx.fillStyle = pal.body;
	ctx.fill();
	ctx.save();
	ctx.clip();
	ctx.globalAlpha = alpha * 0.55;
	ctx.fillStyle = pal.belly;
	ctx.beginPath();
	ctx.ellipse(L * 0.45, Hh * 0.7, L * 0.6, Hh * 0.45, 0, 0, TAU);
	ctx.fill();
	ctx.restore();
	ctx.strokeStyle = pal.ink;
	ctx.globalAlpha = alpha * 0.85;
	ctx.lineWidth = 1.5;
	ctx.stroke();
	ctx.lineWidth = 0.9;
	ctx.beginPath();
	ctx.moveTo(L * 0.92, Hh * 0.2);
	ctx.quadraticCurveTo(L * 0.7, Hh * 0.42, L * 0.5, Hh * 0.36);
	ctx.stroke();
	// миндалевидный глаз с линией века
	const ex = L * 0.52;
	const ey = -Hh * 0.22;
	ctx.globalAlpha = alpha;
	ctx.fillStyle = pal.eye;
	ctx.beginPath();
	ctx.ellipse(ex, ey, R * 0.32, R * 0.24, -0.15, 0, TAU);
	ctx.fill();
	ctx.fillStyle = pal.glint;
	ctx.beginPath();
	ctx.arc(ex + R * 0.1, ey - R * 0.08, R * 0.08, 0, TAU);
	ctx.fill();
	ctx.strokeStyle = pal.ink;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(ex - R * 0.45, ey - R * 0.12);
	ctx.quadraticCurveTo(ex, ey - R * 0.48, ex + R * 0.45, ey - R * 0.18);
	ctx.stroke();
	ctx.restore();
}
