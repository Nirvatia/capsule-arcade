import type { GridLayout } from '../maze/GridView';
import { glowTexture } from '../common/textures';
import { rgba } from '../common/color';
import type { Flash, Popup, Ring, Spark, Streak } from './fxTypes';
import { WHITE } from './fxPresets';

/** Tile-centre coordinates to canvas pixels. */
export function projector(layout: GridLayout): {
	S: number;
	X: (x: number) => number;
	Y: (y: number) => number;
} {
	const S = layout.tileSize;
	return { S, X: (x) => layout.offsetX + x * S, Y: (y) => layout.offsetY + y * S };
}

/** Rings and flashes, lying on the ground under the actors. */
export function drawGround(
	ctx: CanvasRenderingContext2D,
	layout: GridLayout,
	rings: readonly Ring[],
	flashes: readonly Flash[]
): void {
	const { S, X, Y } = projector(layout);
	ctx.save();
	// a dark rim under each ring keeps it readable on the bright seasons too
	for (const r of rings) {
		const t = (r.age - r.delay) / r.life;
		if (t < 0) {
			continue;
		}
		const ease = 1 - (1 - t) ** 3;
		const radius = Math.max(0.1, r.radius * S * ease);
		const width = Math.max(1.5, S * 0.22 * (1 - t));
		ctx.beginPath();
		ctx.arc(X(r.x), Y(r.y), radius, 0, Math.PI * 2);
		ctx.strokeStyle = `rgba(20,12,6,${0.3 * (1 - t)})`;
		ctx.lineWidth = width + Math.max(1.5, S * 0.06);
		ctx.stroke();
		ctx.strokeStyle = rgba(r.tint, 0.95 * (1 - t));
		ctx.lineWidth = width;
		ctx.stroke();
	}
	ctx.globalCompositeOperation = 'lighter';
	for (const f of flashes) {
		const t = f.age / f.life;
		const size = S * (1.2 + t * 0.8);
		ctx.globalAlpha = 1 - t;
		ctx.drawImage(glowTexture(WHITE), X(f.x) - size, Y(f.y) - size, size * 2, size * 2);
	}
	ctx.restore();
}

/** Sparks, particles, streaks and the score pop-ups, over the actors. */
export function drawAir(
	ctx: CanvasRenderingContext2D,
	layout: GridLayout,
	sparks: readonly Spark[],
	streaks: readonly Streak[],
	popups: readonly Popup[]
): void {
	const { S, X, Y } = projector(layout);
	ctx.save();
	ctx.lineCap = 'round';
	for (const s of sparks) {
		const t = s.age / s.life;
		if (s.texture) {
			const size = S * 0.42 * (1 - t * 0.4);
			ctx.save();
			ctx.globalAlpha = 1 - t;
			ctx.translate(X(s.x), Y(s.y));
			ctx.rotate(s.spin * s.age);
			ctx.drawImage(s.texture, -size / 2, -size / 2, size, size);
			ctx.restore();
			continue;
		}
		// a coloured streak with a white core
		ctx.beginPath();
		ctx.moveTo(X(s.x), Y(s.y));
		ctx.lineTo(X(s.x - s.vx * 0.06), Y(s.y - s.vy * 0.06));
		ctx.strokeStyle = rgba(s.tint, 1 - t);
		ctx.lineWidth = Math.max(1.5, S * 0.1 * (1 - t));
		ctx.stroke();
		ctx.strokeStyle = rgba(WHITE, 0.9 * (1 - t));
		ctx.lineWidth = Math.max(0.8, S * 0.04 * (1 - t));
		ctx.stroke();
	}
	for (const k of streaks) {
		const t = k.age / k.life;
		ctx.globalCompositeOperation = 'lighter';
		// a whoosh from where the ghost was to Pac-Man, swept forward and fading
		const grad = ctx.createLinearGradient(X(k.x0), Y(k.y0), X(k.x1), Y(k.y1));
		grad.addColorStop(0, rgba(k.tint, 0));
		grad.addColorStop(Math.min(0.99, 0.3 + t * 0.7), rgba(WHITE, 0.8 * (1 - t)));
		grad.addColorStop(1, rgba(WHITE, 0));
		ctx.strokeStyle = grad;
		ctx.lineWidth = Math.max(1, S * 0.12 * (1 - t));
		ctx.beginPath();
		ctx.moveTo(X(k.x0), Y(k.y0));
		ctx.lineTo(X(k.x1), Y(k.y1));
		ctx.stroke();
		ctx.globalCompositeOperation = 'source-over';
	}
	const font = Math.max(10, Math.round(S * 0.62));
	ctx.font = `900 ${font}px "Trebuchet MS", "Segoe UI", system-ui, sans-serif`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.lineJoin = 'round';
	for (const p of popups) {
		const t = p.age / p.life;
		// pops in big, settles, rises and fades
		const pop = p.age < 0.12 ? 1.45 - (p.age / 0.12) * 0.45 : 1;
		const rise = (1 - (1 - t) ** 2) * 0.9;
		const alpha = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
		ctx.save();
		ctx.globalAlpha = alpha;
		ctx.translate(X(p.x), Y(p.y - 0.3 - rise));
		ctx.scale(pop, pop);
		ctx.shadowColor = rgba(p.tint, 0.9);
		ctx.shadowBlur = font * 0.6;
		ctx.lineWidth = Math.max(2, font * 0.18);
		ctx.strokeStyle = 'rgba(20,12,6,.85)';
		ctx.strokeText(p.text, 0, 0);
		ctx.shadowBlur = 0;
		ctx.fillStyle = '#ffffff';
		ctx.fillText(p.text, 0, 0);
		ctx.restore();
	}
	ctx.restore();
}

/** The edge pulse in screen space (after the world's vignette). */
export function drawPulse(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	tint: number,
	value: number
): void {
	const r = Math.hypot(width, height) / 2;
	const g = ctx.createRadialGradient(width / 2, height / 2, r * 0.55, width / 2, height / 2, r);
	g.addColorStop(0, rgba(tint, 0));
	g.addColorStop(1, rgba(tint, 0.32 * value));
	ctx.save();
	ctx.globalCompositeOperation = 'lighter';
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, width, height);
	ctx.restore();
}
