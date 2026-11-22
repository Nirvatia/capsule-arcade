// A tail or a wake made of where the hero has been (it bends with every turn, as the trail
// rule asks), drawn from the pure `ribbon` (common/trail.ts): width and alpha go to 0 at both
// ends in every frame, and when the hero stops it shrinks back and fades by itself.
// Drawn additively in short chunks, each with a gradient between its ends: additive edges add
// up exactly, so the chunks join without seams, and a curved tail keeps its colour along it.
import type { RibbonPoint, Sample } from '../common/trail';
import { ribbon } from '../common/trail';

export interface WakeSpec {
	readonly life: number;
	readonly width: number;
	readonly capHead: number;
	readonly capTail: number;
	/** Colour at a point: `u` 0 head .. 1 end, `a` the ribbon's alpha there. */
	readonly color: (u: number, a: number, p: RibbonPoint) => string;
	/** Width factor along it (`u`), e.g. a fan that widens. */
	readonly widen?: (u: number) => number;
	/** Sideways shift (px, along the left normal) at a point: a curved tail. */
	readonly shift?: (u: number, p: RibbonPoint) => number;
	readonly add?: boolean;
}

export class Wake {
	private hist: Sample[] = [];

	push(x: number, y: number, t: number, emit: number): void {
		this.hist.push({ x, y, t, emit });
		const old = t - 2;
		while (this.hist.length && this.hist[0].t < old) this.hist.shift();
	}

	clear(): void {
		this.hist = [];
	}

	points(now: number, spec: WakeSpec): RibbonPoint[] {
		const r = ribbon(this.hist, now, { life: spec.life, width: spec.width, capHead: spec.capHead, capTail: spec.capTail });
		if (!spec.widen && !spec.shift) return r;
		return r.map((p) => {
			const off = spec.shift ? spec.shift(p.u, p) : 0;
			return { ...p, x: p.x + p.nx * off, y: p.y + p.ny * off, w: p.w * (spec.widen ? spec.widen(p.u) : 1) };
		});
	}

	draw(ctx: CanvasRenderingContext2D, now: number, spec: WakeSpec): RibbonPoint[] {
		const pts = this.points(now, spec);
		if (pts.length < 2) return pts;
		ctx.save();
		if (spec.add !== false) ctx.globalCompositeOperation = 'lighter';
		const step = 3;
		for (let i0 = 0; i0 < pts.length - 1; i0 += step) {
			const i1 = Math.min(pts.length - 1, i0 + step);
			const a = pts[i0];
			const b = pts[i1];
			ctx.beginPath();
			for (let i = i0; i <= i1; i += 1) {
				const p = pts[i];
				if (i === i0) ctx.moveTo(p.x + p.nx * p.w, p.y + p.ny * p.w);
				else ctx.lineTo(p.x + p.nx * p.w, p.y + p.ny * p.w);
			}
			for (let i = i1; i >= i0; i -= 1) {
				const p = pts[i];
				ctx.lineTo(p.x - p.nx * p.w, p.y - p.ny * p.w);
			}
			ctx.closePath();
			if (Math.hypot(b.x - a.x, b.y - a.y) < 0.01) continue;
			const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
			g.addColorStop(0, spec.color(a.u, a.a, a));
			g.addColorStop(1, spec.color(b.u, b.a, b));
			ctx.fillStyle = g;
			ctx.fill();
		}
		ctx.restore();
		return pts;
	}
}
