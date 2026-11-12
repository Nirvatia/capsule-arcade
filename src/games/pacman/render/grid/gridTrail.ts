// A wall of light on screen (`logic/grid/LightWall` gives its line): seen from above, a rigid
// band with a white-hot core, sharp at every corner (miter joins, butt ends); tilted, a ribbon
// standing up with its bright top edge. Its tail derezzes: as the tail slides on, it sheds small
// squares that hang for a moment and go out.
import type { WallPoint } from '../../logic/grid/LightWall';
import type { SideColours } from './gridPalette';

type Ctx = CanvasRenderingContext2D;

/** Draws a wall whose points are already in screen px; `lift` is its height (tilted view). */
export function drawLightWall(
	light: Ctx,
	pts: readonly WallPoint[],
	c: SideColours,
	T: number,
	lift: number
): void {
	if (pts.length < 2) return;
	light.lineJoin = 'miter';
	light.lineCap = 'butt';
	const line = (dy: number) => {
		light.beginPath();
		light.moveTo(pts[0].x, pts[0].y - dy);
		for (const p of pts.slice(1)) light.lineTo(p.x, p.y - dy);
	};
	if (lift > 0) {
		// the ribbon's face, one translucent sheet per segment, and its foot
		light.fillStyle = c.mid;
		light.globalAlpha = 0.22;
		for (let i = 1; i < pts.length; i++) {
			const a = pts[i - 1];
			const b = pts[i];
			light.beginPath();
			light.moveTo(a.x, a.y);
			light.lineTo(b.x, b.y);
			light.lineTo(b.x, b.y - lift);
			light.lineTo(a.x, a.y - lift);
			light.closePath();
			light.fill();
		}
		light.globalAlpha = 0.5;
		light.strokeStyle = c.mid;
		light.lineWidth = Math.max(1, T * 0.04);
		line(0);
		light.stroke();
	}
	light.globalAlpha = 1;
	light.strokeStyle = c.mid;
	light.lineWidth = Math.max(1.5, T * 0.13);
	line(lift);
	light.stroke();
	light.strokeStyle = c.core;
	light.lineWidth = Math.max(1, T * 0.045);
	line(lift);
	light.stroke();
}

interface Shard {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	size: number;
}

/** The tail's derez: squares shed where the tail just was. */
export class Derez {
	private shards: Shard[] = [];
	private seed = 5;
	private debt = 0;

	private rnd(): number {
		this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
		return this.seed / 4294967296;
	}

	/** The tail moved `shed` tiles to `tail` (screen px): shed squares behind it. */
	shed(tail: WallPoint | null, shed: number, T: number): void {
		if (!tail || shed <= 0) return;
		// a few at a time: a shower of them reads as a dotted second trail
		this.debt += shed * 2.5;
		const n = Math.min(2, Math.floor(this.debt));
		this.debt -= n;
		for (let i = 0; i < n; i++) {
			this.shards.push({
				x: tail.x + (this.rnd() - 0.5) * T * 0.2,
				y: tail.y + (this.rnd() - 0.5) * T * 0.2,
				vx: (this.rnd() - 0.5) * T * 0.8,
				vy: (this.rnd() - 0.5) * T * 0.8,
				life: 0.22 + this.rnd() * 0.18,
				size: T * (0.04 + this.rnd() * 0.05)
			});
		}
	}

	update(dt: number): void {
		for (const s of this.shards) {
			s.life -= dt;
			s.x += s.vx * dt;
			s.y += s.vy * dt;
		}
		this.shards = this.shards.filter((s) => s.life > 0);
	}

	draw(light: Ctx, c: SideColours): void {
		light.fillStyle = c.mid;
		for (const s of this.shards) {
			light.globalAlpha = Math.min(1, s.life * 3);
			light.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
		}
		light.globalAlpha = 1;
	}
}
