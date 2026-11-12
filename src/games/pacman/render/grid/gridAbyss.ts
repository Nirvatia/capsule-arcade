// What lies under the grid world's arena: the void, and far below a vast grid plane whose lines
// carry pulses of data, slow and sparse, all running the same way: the system at work, the scale
// under the platform. Nothing random-looking: one plane, one rhythm.
import { VOID } from './gridPalette';

interface Pulse {
	/** Which line (index from the centre) and how far along it, in grid cells. */
	line: number;
	at: number;
	speed: number;
	vertical: boolean;
}

export class GridAbyss {
	private pulses: Pulse[] = [];
	private seed = 3;

	private rnd(): number {
		this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
		return this.seed / 4294967296;
	}

	private pulse(): Pulse {
		return {
			line: Math.floor(this.rnd() * 30) - 15,
			at: -24 - this.rnd() * 20,
			speed: 3 + this.rnd() * 3,
			vertical: this.rnd() < 0.5
		};
	}

	update(dt: number): void {
		while (this.pulses.length < 10) this.pulses.push(this.pulse());
		for (const p of this.pulses) p.at += p.speed * dt;
		this.pulses = this.pulses.map((p) => (p.at > 26 ? this.pulse() : p));
	}

	/**
	 * Draws the void and the plane, css px. `scale` is how near the plane looks (the dive
	 * brings it closer, slower than the arena).
	 */
	draw(ctx: CanvasRenderingContext2D, vw: number, vh: number, scale: number): void {
		ctx.fillStyle = VOID;
		ctx.fillRect(0, 0, vw, vh);
		const cell = 38 * scale;
		const cx = vw / 2;
		const cy = vh / 2;
		const n = Math.ceil(Math.max(vw, vh) / cell / 2) + 1;
		// the plane fades out towards the screen's edges, as if into haze
		const fade = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(vw, vh) * 0.6);
		fade.addColorStop(0, 'rgba(60,130,190,0.16)');
		fade.addColorStop(1, 'rgba(60,130,190,0)');
		ctx.strokeStyle = fade;
		ctx.lineWidth = 1;
		ctx.beginPath();
		for (let i = -n; i <= n; i++) {
			const x = Math.round(cx + i * cell) + 0.5;
			const y = Math.round(cy + i * cell) + 0.5;
			ctx.moveTo(x, 0);
			ctx.lineTo(x, vh);
			ctx.moveTo(0, y);
			ctx.lineTo(vw, y);
		}
		ctx.stroke();
		// the pulses: a short bright head with a tail along the line
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.lineCap = 'butt';
		for (const p of this.pulses) {
			const along = p.at * cell;
			const off = p.line * cell;
			const len = cell * 2.2;
			const x0 = p.vertical ? cx + off : cx + along - len;
			const y0 = p.vertical ? cy + along - len : cy + off;
			const x1 = p.vertical ? cx + off : cx + along;
			const y1 = p.vertical ? cy + along : cy + off;
			const g = ctx.createLinearGradient(x0, y0, x1, y1);
			g.addColorStop(0, 'rgba(120,200,255,0)');
			g.addColorStop(1, 'rgba(170,225,255,0.55)');
			ctx.strokeStyle = g;
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(Math.round(x0) + 0.5, Math.round(y0) + 0.5);
			ctx.lineTo(Math.round(x1) + 0.5, Math.round(y1) + 0.5);
			ctx.stroke();
		}
		ctx.restore();
	}
}
