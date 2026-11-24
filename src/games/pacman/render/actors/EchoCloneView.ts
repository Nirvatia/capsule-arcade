import type { EchoCloneService, EchoDirection } from '../../logic/bonuses/EchoCloneService';
import type { GridLayout } from '../maze/GridView';
import { ECHO } from '../../config/echoConfig';

// The echo bonus on the board, in its own look (not a copy of the hero): spirit flames (the
// owner's pick B of the `echo` prototype, 2026-11-24), in the game's cel language: a round head
// with a face and a tail that licks back against the heading, teal tone bands lit from the top
// left, a dark ink outline and a white glint; sparks left behind on the way. No halo, no threads
// between them. A wisp pops out of the hero inside an ink ring; one a ghost catches bursts into
// ink-rimmed shards; the riot's last half second they flicker out.

/** A wisp's head radius in tiles (the old blue copy was 0.34; the owner: a quarter smaller). */
export const WISP_RADIUS = 0.255;
/** Seconds of path a wisp's sparks cover. */
const TAIL_SECONDS = 0.13;
/** Seconds a caught wisp takes to burst. */
const BURST_SECONDS = 0.35;
/** Seconds a released wisp takes to pop out. */
const BIRTH_SECONDS = 0.25;

/** The echo's teal (its medallion's enamel) in cel tones, and the ink. */
const TEAL = { light: '#d6fff6', mid: '#5fe3cf', dark: '#1d9aa3', ink: '#0d3442' };
/** The light, from the top left (a unit vector), as on the heroes. */
const LX = -0.55;
const LY = -0.83;

const ANGLES: Record<EchoDirection, number> = {
	RIGHT: 0,
	DOWN: Math.PI / 2,
	LEFT: Math.PI,
	UP: -Math.PI / 2
};

interface Wisp {
	/** Screen positions of the last moments, newest last, with their age in seconds. */
	path: Array<{ x: number; y: number; age: number }>;
	/** Seconds since it left the token (the birth pop), and since it was caught (or -1). */
	born: number;
	caught: number;
	x: number;
	y: number;
	angle: number;
	phase: number;
}

/** A four-pointed spark. */
function spark(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, fill: string): void {
	ctx.fillStyle = fill;
	ctx.beginPath();
	ctx.moveTo(x, y - s);
	ctx.quadraticCurveTo(x, y, x + s, y);
	ctx.quadraticCurveTo(x, y, x, y + s);
	ctx.quadraticCurveTo(x, y, x - s, y);
	ctx.quadraticCurveTo(x, y, x, y - s);
	ctx.fill();
}

export class EchoCloneView {
	private readonly wisps = new Map<number, Wisp>();
	private lastTime = -1;

	/** The riot (nothing while it does not run). */
	draw(
		ctx: CanvasRenderingContext2D,
		echo: EchoCloneService,
		layout: GridLayout,
		time: number
	): void {
		const S = layout.tileSize;
		if (!Number.isFinite(S) || S <= 0) {
			console.error('EchoCloneView.draw', 'invalid layout tile size', S);
			return;
		}
		const dt = this.lastTime < 0 ? 0 : Math.min(0.1, Math.max(0, time - this.lastTime));
		this.lastTime = time;
		if (echo.phase === 'riot') {
			this.drawRiot(ctx, echo, layout, dt, time);
		} else {
			this.wisps.clear();
		}
	}

	private drawRiot(
		ctx: CanvasRenderingContext2D,
		echo: EchoCloneService,
		layout: GridLayout,
		dt: number,
		time: number
	): void {
		const S = layout.tileSize;
		const r = S * WISP_RADIUS;
		const left = echo.timer;
		// the last half second they flicker out, softer than a hard blink
		const fade = left < ECHO.fadeSeconds ? 0.35 + 0.35 * (0.5 + 0.5 * Math.cos(time * 40)) : 1;
		const seen = new Set<number>();
		for (const clone of echo.clones) {
			seen.add(clone.id);
			const x = layout.offsetX + clone.x * S;
			const y = layout.offsetY + clone.y * S;
			let w = this.wisps.get(clone.id);
			if (!w) {
				w = { path: [], born: -1, caught: -1, x, y, angle: 0, phase: clone.id * 1.7 };
				this.wisps.set(clone.id, w);
			}
			if (clone.started && w.born < 0) w.born = 0;
			if (w.born >= 0) w.born += dt;
			if (!clone.alive && w.caught < 0) w.caught = 0;
			if (w.caught >= 0) w.caught += dt;
			for (const p of w.path) p.age += dt;
			if (clone.alive && clone.started && Math.hypot(x - w.x, y - w.y) < S * 2) {
				w.path.push({ x, y, age: 0 });
			} else if (Math.hypot(x - w.x, y - w.y) >= S * 2) {
				w.path = [];
			}
			w.path = w.path.filter((p) => p.age < TAIL_SECONDS);
			w.x = x;
			w.y = y;
			w.angle = ANGLES[clone.facing];
		}
		for (const id of [...this.wisps.keys()]) {
			if (!seen.has(id)) this.wisps.delete(id);
		}

		ctx.save();
		ctx.globalCompositeOperation = 'source-over';
		for (const w of this.wisps.values()) {
			if (w.caught < 0 && w.born >= 0) this.sparks(ctx, w, r, fade);
		}
		for (const w of this.wisps.values()) {
			if (w.caught >= 0) {
				this.burst(ctx, w, r, w.caught / BURST_SECONDS);
			} else if (w.born >= 0 && w.born < BIRTH_SECONDS) {
				this.pop(ctx, w, r, w.born / BIRTH_SECONDS);
			}
		}
		for (const w of this.wisps.values()) {
			if (w.caught >= 0 || w.born < 0) continue;
			ctx.globalAlpha = fade;
			const chomp = 0.5 + 0.5 * Math.sin(time * 18 + w.phase);
			this.body(ctx, w.x, w.y, r, w.angle, 0.12 + 0.3 * chomp, time + w.phase);
		}
		ctx.restore();
	}

	/**
	 * The spirit flame: a round head and a tail licking back against `angle`, cel bands, an
	 * ink outline; the face looks at the viewer, its eyes leaning toward the heading and its
	 * mouth opening by `open`.
	 */
	private body(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		r: number,
		angle: number,
		open: number,
		time: number
	): void {
		const bx = -Math.cos(angle);
		const by = -Math.sin(angle);
		const px = -by;
		const py = bx;
		const wob = Math.sin(time * 16) * r * 0.28;
		const tipX = x + bx * r * 2.1 + px * wob;
		const tipY = y + by * r * 2.1 + py * wob;
		const side = Math.atan2(py, px);
		const flame = () => {
			ctx.beginPath();
			ctx.arc(x, y, r, side, side + Math.PI, false);
			ctx.quadraticCurveTo(
				x + bx * r * 1.1 - px * r * 0.9 + px * wob * 0.4,
				y + by * r * 1.1 - py * r * 0.9 + py * wob * 0.4,
				tipX,
				tipY
			);
			ctx.quadraticCurveTo(
				x + bx * r * 1.1 + px * r * 0.9 + px * wob * 0.4,
				y + by * r * 1.1 + py * r * 0.9 + py * wob * 0.4,
				x + px * r,
				y + py * r
			);
			ctx.closePath();
		};
		ctx.save();
		flame();
		ctx.save();
		ctx.clip();
		ctx.fillStyle = TEAL.dark;
		ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
		// the inner flame, then the light core toward the light
		ctx.fillStyle = TEAL.mid;
		ctx.beginPath();
		ctx.ellipse(x + bx * r * 0.35, y + by * r * 0.35, r * 0.9, r * 1.25, angle, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = TEAL.light;
		ctx.beginPath();
		ctx.arc(x + LX * r * 0.25, y + LY * r * 0.25, r * 0.6, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
		ctx.beginPath();
		ctx.ellipse(x + LX * r * 0.5, y + LY * r * 0.5, r * 0.2, r * 0.12, -0.6, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
		flame();
		ctx.strokeStyle = TEAL.ink;
		ctx.lineWidth = Math.max(1.2, r * 0.2);
		ctx.lineJoin = 'round';
		ctx.stroke();
		const fx = Math.cos(angle) * r * 0.22;
		const fy = Math.sin(angle) * r * 0.22;
		ctx.fillStyle = TEAL.ink;
		for (const s of [-1, 1]) {
			ctx.beginPath();
			ctx.ellipse(x + fx + s * r * 0.34, y + fy - r * 0.12, r * 0.12, r * 0.17, 0, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.beginPath();
		ctx.ellipse(x + fx, y + fy + r * 0.3, r * 0.2, r * (0.06 + 0.24 * open), 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}

	/** Sparks left along the last moments of the path, fading. */
	private sparks(ctx: CanvasRenderingContext2D, w: Wisp, r: number, fade: number): void {
		for (const p of w.path) {
			const u = p.age / TAIL_SECONDS;
			if (((p.x + p.y) | 0) % 3 !== 0 || u > 1) continue;
			ctx.globalAlpha = (1 - u) * 0.9 * fade;
			const off = Math.sin(p.x * 0.3 + w.phase) * r * 0.6;
			spark(
				ctx,
				p.x - Math.sin(w.angle) * off,
				p.y + Math.cos(w.angle) * off,
				r * 0.22 * (1 - u * 0.5),
				TEAL.light
			);
		}
	}

	/** A wisp popping out: an ink ring with a light core line, opening and fading. */
	private pop(ctx: CanvasRenderingContext2D, w: Wisp, r: number, k: number): void {
		ctx.globalAlpha = 1 - k;
		ctx.lineWidth = Math.max(1.5, r * 0.34 * (1 - k));
		ctx.strokeStyle = TEAL.ink;
		ctx.beginPath();
		ctx.arc(w.x, w.y, r * (1 + 1.4 * k), 0, Math.PI * 2);
		ctx.stroke();
		ctx.lineWidth *= 0.5;
		ctx.strokeStyle = TEAL.light;
		ctx.stroke();
	}

	/** A caught wisp: six ink-rimmed shards flying off. */
	private burst(ctx: CanvasRenderingContext2D, w: Wisp, r: number, k: number): void {
		if (k >= 1) return;
		ctx.globalAlpha = 1 - k;
		ctx.lineWidth = Math.max(1, r * 0.12);
		ctx.strokeStyle = TEAL.ink;
		for (let i = 0; i < 6; i++) {
			const a = w.phase + (i * Math.PI) / 3;
			const d = r * (0.5 + 2.2 * k);
			const s = r * 0.42 * (1 - k * 0.6);
			ctx.save();
			ctx.translate(w.x + Math.cos(a) * d, w.y + Math.sin(a) * d);
			ctx.rotate(a);
			ctx.beginPath();
			ctx.moveTo(s, 0);
			ctx.lineTo(-s * 0.6, s * 0.5);
			ctx.lineTo(-s * 0.6, -s * 0.5);
			ctx.closePath();
			ctx.fillStyle = i % 2 ? TEAL.mid : TEAL.light;
			ctx.fill();
			ctx.stroke();
			ctx.restore();
		}
	}
}
