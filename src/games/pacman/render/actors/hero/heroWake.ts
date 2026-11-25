// Ms. Pac-Man's comet tails: a tail made of where she has been (it bends with every turn, as the trail
// rule asks), drawn from the pure `ribbon` (common/trailRibbon): width and alpha go to 0 at both
// ends in every frame, and when the hero stops it shrinks back and fades by itself.
// Drawn additively in short chunks, each with a gradient between its ends: additive edges add
// up exactly, so the chunks join without seams, and a curved tail keeps its colour along it.
import type { RibbonPoint, Sample } from '../../common/trailRibbon';
import { ribbon } from '../../common/trailRibbon';

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
	/** Points per filled stretch (each a fill with its own gradient): more is cheaper, coarser. */
	readonly step?: number;
}

export class Wake {
	/** Where she has been, cut at every jump (a teleport): each piece is a tail of its own. */
	private pieces: Sample[][] = [[]];

	/**
	 * A sample. A step longer than `gap` px is a jump: the tail does not bridge it but starts
	 * anew, and the piece left at the tunnel's mouth fades there by itself.
	 */
	push(x: number, y: number, t: number, emit: number, gap = Infinity): void {
		let piece = this.pieces[this.pieces.length - 1];
		const last = piece[piece.length - 1];
		if (last && Math.hypot(x - last.x, y - last.y) > gap) {
			piece = [];
			this.pieces.push(piece);
		}
		piece.push({ x, y, t, emit });
		const old = t - 2;
		for (const each of this.pieces) {
			while (each.length && each[0].t < old) each.shift();
		}
		this.pieces = this.pieces.filter((each) => each.length > 0 || each === piece);
	}

	clear(): void {
		this.pieces = [[]];
	}

	/** The ribbon of every piece that still shows. */
	points(now: number, spec: WakeSpec): RibbonPoint[][] {
		const out: RibbonPoint[][] = [];
		for (const piece of this.pieces) {
			const pts = this.piecePoints(piece, now, spec);
			if (pts.length > 0) out.push(pts);
		}
		return out;
	}

	private piecePoints(hist: Sample[], now: number, spec: WakeSpec): RibbonPoint[] {
		const r = ribbon(hist, now, {
			life: spec.life,
			width: spec.width,
			capHead: spec.capHead,
			capTail: spec.capTail
		});
		if (!spec.widen && !spec.shift) return r;
		return r.map((p) => {
			const off = spec.shift ? spec.shift(p.u, p) : 0;
			return {
				...p,
				x: p.x + p.nx * off,
				y: p.y + p.ny * off,
				w: p.w * (spec.widen ? spec.widen(p.u) : 1)
			};
		});
	}

	draw(ctx: CanvasRenderingContext2D, now: number, spec: WakeSpec): void {
		for (const pts of this.points(now, spec)) {
			if (pts.length >= 2) this.drawPiece(ctx, pts, spec);
		}
	}

	private drawPiece(ctx: CanvasRenderingContext2D, pts: RibbonPoint[], spec: WakeSpec): void {
		ctx.save();
		if (spec.add !== false) ctx.globalCompositeOperation = 'lighter';
		const step = spec.step ?? 3;
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
	}
}
