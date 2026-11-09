// What both heroes share in the owner's anime mock-ups: the season's particles (and dust), the
// ink-outlined "ki" flames behind a powered hero and the little star on his highlight. All drawn
// in code, in the same outlined style; the colours come from the season (`heroSeasons.ts`).
import type { Particle, ParticleKind } from './Hero';
import { css } from './Hero';
import { SEASON_LOOKS } from './heroSeasons';
import type { HeroSeason, RGB } from './heroSeasons';

export const INK: RGB = [38, 14, 12];

const DUST: RGB = [255, 246, 226];
const DUST_EDGE: RGB = [196, 158, 126];

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
		case 'star':
			return 2;
		default:
			return 1.2;
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
		case 'chevron':
		case 'flame':
		case 'whoosh':
			return 0;
		default:
			return 0.6;
	}
}

/**
 * A speed chevron (like >): a thick bent bar pointing the way the hero runs, in a flat colour
 * with an ink outline, shrinking and fading.
 */
export function drawChevron(ctx: CanvasRenderingContext2D, e: Particle, colour: RGB): void {
	const u = e.life / e.max;
	const k = 0.55 + 0.45 * u;
	const R = (e.len ?? e.size) * k;
	const a = R * 0.42;
	const b = R * 0.62;
	const t = R * 0.26;
	ctx.save();
	ctx.translate(e.x, e.y);
	ctx.rotate(e.ang ?? 0);
	ctx.globalAlpha = Math.min(1, u * 3);
	ctx.lineJoin = 'miter';
	ctx.lineCap = 'butt';
	ctx.miterLimit = 6;
	const path = () => {
		ctx.beginPath();
		ctx.moveTo(-a, -b);
		ctx.lineTo(a, 0);
		ctx.lineTo(-a, b);
	};
	path();
	ctx.strokeStyle = css(INK, 0.95);
	ctx.lineWidth = t + R * 0.12;
	ctx.stroke();
	path();
	ctx.strokeStyle = css(colour);
	ctx.lineWidth = t;
	ctx.stroke();
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

/**
 * A shock-arc of the trail: a crescent bulging backwards (tips towards the hero), thickest in
 * the middle, growing a little and fading, with a thin ink outline.
 */
export function drawWhoosh(ctx: CanvasRenderingContext2D, e: Particle, colour: RGB): void {
	const u = e.life / e.max;
	const grow = 0.8 + 0.4 * (1 - u);
	const R = (e.len ?? e.size) * grow;
	const th = 0.95;
	const thick = R * 0.5 * (0.4 + 0.6 * u);
	const n = 14;
	ctx.save();
	ctx.translate(e.x, e.y);
	ctx.rotate(e.ang ?? 0);
	ctx.globalAlpha = Math.min(1, u * 2.2);
	ctx.beginPath();
	for (let i = 0; i <= n; i++) {
		const t = -1 + (2 * i) / n;
		const a = Math.PI + t * th;
		ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R);
	}
	for (let i = n; i >= 0; i--) {
		const t = -1 + (2 * i) / n;
		const a = Math.PI + t * th;
		const r = R - thick * (1 - t * t);
		ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
	}
	ctx.closePath();
	ctx.fillStyle = css(colour);
	ctx.fill();
	ctx.strokeStyle = css(INK, 0.85);
	ctx.lineWidth = Math.max(0.8, R * 0.05);
	ctx.lineJoin = 'round';
	ctx.stroke();
	ctx.restore();
}

/**
 * One season particle (dust, petal, leaf, flake, spark, ember) at alpha `a` and size `s`.
 * Returns false for a kind it does not know (the caller draws its own).
 */
export function drawSeasonParticle(
	ctx: CanvasRenderingContext2D,
	e: Particle,
	a: number,
	s: number,
	season: HeroSeason
): boolean {
	const look = SEASON_LOOKS[season];
	if (
		e.kind !== 'dust' &&
		e.kind !== 'petal' &&
		e.kind !== 'leaf' &&
		e.kind !== 'flake' &&
		e.kind !== 'spark' &&
		e.kind !== 'ember'
	) {
		return false;
	}
	ctx.save();
	ctx.translate(e.x, e.y);
	ctx.rotate(e.spin * (e.max - e.life) + e.spin * 2);
	ctx.globalAlpha = a;
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';
	switch (e.kind) {
		case 'dust':
			ctx.fillStyle = css(DUST);
			ctx.strokeStyle = css(DUST_EDGE, 0.8);
			ctx.lineWidth = Math.max(0.8, s * 0.16);
			ctx.beginPath();
			ctx.arc(0, 0, s, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();
			break;
		case 'petal':
			ctx.fillStyle = css(look.particleFill);
			ctx.strokeStyle = css(look.particleEdge);
			ctx.lineWidth = Math.max(0.8, s * 0.18);
			ctx.beginPath();
			ctx.ellipse(0, 0, s, s * 0.62, 0, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();
			break;
		case 'leaf':
			ctx.fillStyle = css(look.particleFill);
			ctx.strokeStyle = css(look.particleEdge);
			ctx.lineWidth = Math.max(0.8, s * 0.2);
			ctx.beginPath();
			for (let i = 0; i < 10; i++) {
				const an = (i / 10) * Math.PI * 2 - Math.PI / 2;
				const r = i % 2 === 0 ? s : s * 0.42;
				ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r);
			}
			ctx.closePath();
			ctx.fill();
			ctx.stroke();
			break;
		case 'flake':
			ctx.strokeStyle = css(look.particleEdge);
			ctx.lineWidth = Math.max(0.8, s * 0.2);
			ctx.beginPath();
			for (let i = 0; i < 3; i++) {
				const an = (i / 3) * Math.PI;
				ctx.moveTo(Math.cos(an) * s, Math.sin(an) * s);
				ctx.lineTo(-Math.cos(an) * s, -Math.sin(an) * s);
			}
			ctx.stroke();
			ctx.fillStyle = css(look.particleFill);
			ctx.beginPath();
			ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
			ctx.fill();
			break;
		default: {
			// a spark (or an ember in the hell): a round bead with a glint
			ctx.fillStyle = css(look.particleFill);
			ctx.strokeStyle = css(look.particleEdge, 0.9);
			ctx.lineWidth = Math.max(0.8, s * 0.2);
			ctx.beginPath();
			ctx.arc(0, 0, s * 0.8, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();
			ctx.fillStyle = 'rgba(255,252,230,0.9)';
			ctx.beginPath();
			ctx.arc(-s * 0.2, -s * 0.2, s * 0.25, 0, Math.PI * 2);
			ctx.fill();
		}
	}
	ctx.restore();
	ctx.globalAlpha = 1;
	return true;
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

export interface FlameLook {
	readonly outer: RGB;
	readonly inner: RGB;
	readonly ink: RGB;
}

/**
 * Ink-outlined "ki" flames round the back of the body (frame space, behind it): an outer
 * tongue and a smaller bright one inside it, at most 1.2 body radii long, the length
 * trembling with time `t`; `k` 0..1 is how strong the look is.
 */
export function drawKiFlames(
	ctx: CanvasRenderingContext2D,
	R: number,
	k: number,
	t: number,
	look: FlameLook
): void {
	const N = 9;
	const a = Math.min(1, k * 1.4);
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';
	for (const pass of [0, 1]) {
		for (let i = 0; i < N; i++) {
			const f = i / (N - 1);
			const ang = Math.PI + (f - 0.5) * 2.5;
			const flick = 0.5 + 0.5 * Math.sin(t * 11 + i * 2.3);
			const edge = 1 - Math.abs(f - 0.5) * 1.3;
			const len = R * (0.22 + 0.7 * flick) * k * edge * (pass === 0 ? 1 : 0.58);
			if (len < 1) continue;
			const bx = Math.cos(ang) * R * 0.93;
			const by = Math.sin(ang) * R * 0.93;
			// outwards, blown back (away from the heading), swaying a little
			let dx = Math.cos(ang) - 0.7;
			let dy = Math.sin(ang) * 0.8 + 0.12 * Math.sin(t * 7 + i);
			const n = Math.hypot(dx, dy) || 1;
			dx /= n;
			dy /= n;
			const px = -dy;
			const py = dx;
			const w = R * (pass === 0 ? 0.17 : 0.09);
			ctx.beginPath();
			ctx.moveTo(bx + px * w, by + py * w);
			ctx.quadraticCurveTo(
				bx + dx * len * 0.55 + px * w * 0.9,
				by + dy * len * 0.55 + py * w * 0.9,
				bx + dx * len,
				by + dy * len
			);
			ctx.quadraticCurveTo(
				bx + dx * len * 0.5 - px * w * 0.5,
				by + dy * len * 0.5 - py * w * 0.5,
				bx - px * w,
				by - py * w
			);
			ctx.closePath();
			if (pass === 0) {
				ctx.fillStyle = css(look.outer, a);
				ctx.fill();
				ctx.strokeStyle = css(look.ink, a);
				ctx.lineWidth = Math.max(1, R * 0.035);
				ctx.stroke();
			} else {
				ctx.fillStyle = css(look.inner, a);
				ctx.fill();
			}
		}
	}
}
