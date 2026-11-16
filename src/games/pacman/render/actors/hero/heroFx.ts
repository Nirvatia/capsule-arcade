// What both heroes share: the season's particles (and dust), drops and sparks of fire, the
// little star on the highlight. All drawn in code, in the same outlined style; the colours
// come from the season (`heroSeasons.ts`).
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

/** A spark of fire while powered: a bead with a bright core and an ink outline, cooling as it ages. */
export function drawFireSpark(
	ctx: CanvasRenderingContext2D,
	e: Particle,
	s: number,
	outer: RGB,
	inner: RGB
): void {
	const u = e.life / e.max;
	const r = s * (0.5 + 0.5 * u);
	ctx.save();
	ctx.globalAlpha = Math.min(1, u * 3);
	ctx.fillStyle = css(outer);
	ctx.strokeStyle = css(INK, 0.9);
	ctx.lineWidth = Math.max(0.8, r * 0.18);
	ctx.beginPath();
	ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
	ctx.fill();
	ctx.stroke();
	ctx.fillStyle = css(inner);
	ctx.beginPath();
	ctx.arc(e.x - r * 0.1, e.y - r * 0.1, r * 0.5, 0, Math.PI * 2);
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
		case 'petal': {
			// a petal flips over and over as it flutters
			const flip = Math.max(0.2, Math.abs(Math.cos((e.max - e.life) * 8 + (e.lane ?? 0))));
			ctx.fillStyle = css(look.particleFill);
			ctx.strokeStyle = css(look.particleEdge);
			ctx.lineWidth = Math.max(0.8, s * 0.18);
			ctx.beginPath();
			ctx.ellipse(0, 0, s, s * 0.62 * flip, 0, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();
			break;
		}
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
