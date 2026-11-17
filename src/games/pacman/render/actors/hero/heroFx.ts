// What both heroes share: drops of fire, outline-free embers, the little star on the highlight.
// All drawn in code; the trail speaks each hero's element language (the owner's review: no
// beads, no ribbons, no puffs).
import type { Particle, ParticleKind } from './Hero';
import { css, glow } from './Hero';
import type { RGB } from './heroSeasons';

export const INK: RGB = [38, 14, 12];

const TAU = Math.PI * 2;

/** How big a particle kind is, against the base size. */
export function particleSize(kind: ParticleKind): number {
	switch (kind) {
		case 'dust':
			return 2;
		case 'petal':
		case 'leaf':
		case 'flake':
			return 2.6;
		case 'spark':
			return 2;
		case 'ember':
			return 2.6;
		case 'star':
			return 2;
		default:
			return 1.2;
	}
}

/** How hard a trail particle kind flutters sideways (body radii per second squared). */
export function particleSwirl(kind: ParticleKind): number {
	switch (kind) {
		case 'petal':
			return 14;
		case 'leaf':
			return 11;
		case 'flake':
			return 8;
		case 'spark':
		case 'star':
			return 5;
		default:
			return 0;
	}
}

/** How fast a particle kind rises (negative: it sinks): petals and dust hang about. */
export function particleLift(kind: ParticleKind): number {
	switch (kind) {
		case 'dust':
			return 0.1;
		case 'petal':
			return 0.25;
		case 'leaf':
			return -0.3;
		case 'flake':
			return -0.18;
		case 'star':
			return 0.15;
		case 'flame':
			return 0;
		default:
			return 0.6;
	}
}

/** An ember of the trail: a soft glowing dot without an outline, cooling as it ages. */
export function drawEmberGlow(
	ctx: CanvasRenderingContext2D,
	e: Particle,
	a: number,
	s: number,
	outer: RGB,
	core: RGB
): void {
	const u = e.life / e.max;
	const r = s * (0.4 + 0.5 * u);
	ctx.save();
	ctx.globalCompositeOperation = 'lighter';
	ctx.globalAlpha = a * 0.9;
	ctx.drawImage(glow(outer), e.x - r * 2.2, e.y - r * 2.2, r * 4.4, r * 4.4);
	ctx.fillStyle = css(core, Math.min(1, u * 2));
	ctx.beginPath();
	ctx.arc(e.x, e.y, r * 0.55, 0, TAU);
	ctx.fill();
	ctx.restore();
}

/**
 * A drop of fire: a pointed teardrop streaming backwards (its tip away from the hero), an
 * orange body with a bright core and an ink outline, shrinking to nothing.
 */
export function drawFlameDrop(
	ctx: CanvasRenderingContext2D,
	e: Particle,
	outer: RGB,
	inner: RGB
): void {
	const u = e.life / e.max;
	const k = 0.25 + 0.75 * Math.pow(u, 0.8);
	const L = (e.len ?? e.size * 3) * k;
	const W = e.size * k;
	if (L < 1) return;
	ctx.save();
	ctx.translate(e.x, e.y);
	ctx.rotate(e.ang ?? 0);
	ctx.globalAlpha = Math.min(1, u * 4);
	const drop = (l: number, w: number) => {
		ctx.beginPath();
		ctx.moveTo(-l * 0.5, 0);
		ctx.bezierCurveTo(-l * 0.3, -w, l * 0.1, -w * 0.8, l * 0.5, 0);
		ctx.bezierCurveTo(l * 0.1, w * 0.8, -l * 0.3, w, -l * 0.5, 0);
		ctx.closePath();
	};
	drop(L, W);
	ctx.fillStyle = css(outer);
	ctx.fill();
	ctx.strokeStyle = css(INK, 0.95);
	ctx.lineWidth = Math.max(0.8, W * 0.18);
	ctx.lineJoin = 'round';
	ctx.stroke();
	ctx.translate(-L * 0.06, 0);
	drop(L * 0.55, W * 0.55);
	ctx.fillStyle = css(inner);
	ctx.fill();
	ctx.restore();
}

/** A four-point star path of outer radius `big` and inner radius `small`, centred at (cx, cy). */
export function starPath(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	big: number,
	small: number,
	rot = -Math.PI / 2
): void {
	ctx.beginPath();
	for (let i = 0; i < 8; i++) {
		const a = (i / 8) * Math.PI * 2 + rot;
		const r = i % 2 === 0 ? big : small;
		ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
	}
	ctx.closePath();
}

/** The little star on the highlight of a powered hero (frame space; (lx, ly) is the light). */
export function drawStarGlint(
	ctx: CanvasRenderingContext2D,
	R: number,
	p: number,
	lx: number,
	ly: number
): void {
	if (p < 0.3) return;
	const cx = lx * R * 0.4 - ly * R * 0.12;
	const cy = ly * R * 0.4 + lx * R * 0.12;
	const big = R * 0.1 * p;
	ctx.fillStyle = css([255, 255, 255], p);
	starPath(ctx, cx, cy, big, big * 0.28);
	ctx.fill();
}
