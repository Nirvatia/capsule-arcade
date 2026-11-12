// Candidates for a stronger hero trail (the owner: "something more powerful"), each drawn
// under the hero in screen px, in the season's colours (`SEASON_LOOKS`), hotter while powered:
// - jet: a solid stream of light from the hero's back along his path, a white core, speed lines;
// - flame: the same path as a ragged, flickering tongue of fire that throws sparks;
// - wave: afterimages of the body, arcs of a shockwave left behind, and shards on every turn.
// Only plain paths, arcs and `lighter` blending: no shadow blur, no filters, a small area.
import { SEASON_LOOKS } from './heroSeasons';
import type { HeroSeason, RGB } from './heroSeasons';

export type TrailStyle = 'jet' | 'flame' | 'wave';

export const TRAIL_STYLES: readonly TrailStyle[] = ['jet', 'flame', 'wave'];

export interface TrailInput {
	readonly x: number;
	readonly y: number;
	/** The hero's body radius, px. */
	readonly r: number;
	readonly angle: number;
	readonly moving: boolean;
	readonly power: boolean;
	readonly season: HeroSeason;
}

interface PathPoint {
	x: number;
	y: number;
	age: number;
}

interface Spark {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	max: number;
	size: number;
	spin: number;
	rot: number;
}

interface Ring {
	x: number;
	y: number;
	angle: number;
	age: number;
}

/** Seconds of path the stream covers, calm and powered. */
const SPAN: Record<TrailStyle, number> = { jet: 0.34, flame: 0.36, wave: 0.3 };
const RING_LIFE = 0.4;

const rgba = (c: RGB, a: number): string =>
	`rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${Math.max(0, Math.min(1, a))})`;
const mixRGB = (a: RGB, b: RGB, k: number): RGB => [
	a[0] + (b[0] - a[0]) * k,
	a[1] + (b[1] - a[1]) * k,
	a[2] + (b[2] - a[2]) * k
];
const WHITE: RGB = [255, 255, 255];

export class HeroTrail {
	private readonly style: TrailStyle;
	private path: PathPoint[] = [];
	private sparks: Spark[] = [];
	private rings: Ring[] = [];
	private time = 0;
	private ringClock = 0;
	private sparkClock = 0;
	private lastAngle: number | null = null;
	private hot = 0;
	private r = 10;
	private season: HeroSeason = 'summer';
	private seed = 7;

	constructor(style: TrailStyle) {
		this.style = style;
	}

	reset(): void {
		this.path = [];
		this.sparks = [];
		this.rings = [];
		this.lastAngle = null;
	}

	private random(): number {
		this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
		return this.seed / 4294967296;
	}

	update(dt: number, s: TrailInput): void {
		this.time += dt;
		this.r = s.r;
		this.season = s.season;
		this.hot += ((s.power ? 1 : 0) - this.hot) * Math.min(1, dt * 6);
		const span = SPAN[this.style] * (1 + 0.4 * this.hot);
		for (const p of this.path) p.age += dt;
		const head = this.path[this.path.length - 1];
		// a jump (a tunnel, a respawn) cuts the stream instead of drawing a line across the maze
		if (head && Math.hypot(s.x - head.x, s.y - head.y) > s.r * 3) {
			this.path = [];
		}
		if (s.moving) {
			this.path.push({ x: s.x, y: s.y, age: 0 });
		}
		this.path = this.path.filter((p) => p.age < span);

		const ux = Math.cos(s.angle);
		const uy = Math.sin(s.angle);
		let turned = false;
		if (this.lastAngle !== null) {
			let d = Math.abs(s.angle - this.lastAngle) % (Math.PI * 2);
			if (d > Math.PI) d = Math.PI * 2 - d;
			turned = d > 0.6 && s.moving;
		}
		this.lastAngle = s.angle;

		if (this.style === 'flame' && s.moving) {
			this.sparkClock += dt * (14 + 16 * this.hot);
			while (this.sparkClock >= 1) {
				this.sparkClock -= 1;
				const side = (this.random() - 0.5) * 2;
				const life = 0.25 + this.random() * 0.25;
				this.sparks.push({
					x: s.x - ux * s.r * 1.2 - uy * side * s.r * 0.5,
					y: s.y - uy * s.r * 1.2 + ux * side * s.r * 0.5,
					vx: -ux * s.r * (3 + this.random() * 4) - uy * side * s.r * 3,
					vy: -uy * s.r * (3 + this.random() * 4) + ux * side * s.r * 3,
					life,
					max: life,
					size: s.r * (0.05 + this.random() * 0.06),
					spin: 0,
					rot: 0
				});
			}
		}
		if (this.style === 'wave') {
			if (s.moving) {
				this.ringClock += dt / (0.13 - 0.04 * this.hot);
				while (this.ringClock >= 1) {
					this.ringClock -= 1;
					this.rings.push({
						x: s.x - ux * s.r * 0.6,
						y: s.y - uy * s.r * 0.6,
						angle: s.angle,
						age: 0
					});
				}
			}
			if (turned) {
				const n = 7 + Math.round(5 * this.hot);
				for (let i = 0; i < n; i++) {
					const a = s.angle + Math.PI + (this.random() - 0.5) * 2.6;
					const v = s.r * (6 + this.random() * 6);
					const life = 0.35 + this.random() * 0.2;
					this.sparks.push({
						x: s.x,
						y: s.y,
						vx: Math.cos(a) * v,
						vy: Math.sin(a) * v,
						life,
						max: life,
						size: s.r * (0.16 + this.random() * 0.12),
						spin: (this.random() - 0.5) * 18,
						rot: this.random() * 6
					});
				}
			}
		}
		for (const p of this.sparks) {
			p.life -= dt;
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			const drag = Math.pow(0.88, dt * 60);
			p.vx *= drag;
			p.vy *= drag;
			p.rot += p.spin * dt;
		}
		this.sparks = this.sparks.filter((p) => p.life > 0);
		for (const g of this.rings) g.age += dt;
		this.rings = this.rings.filter((g) => g.age < RING_LIFE);
	}

	/** Draws the trail; call it before the hero's body. */
	draw(ctx: CanvasRenderingContext2D): void {
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		if (this.style === 'jet') this.drawJet(ctx);
		else if (this.style === 'flame') this.drawFlame(ctx);
		else this.drawWave(ctx);
		ctx.restore();
	}

	private colours(): { edge: RGB; line: RGB; core: RGB } {
		const look = SEASON_LOOKS[this.season];
		const k = this.hot;
		return {
			edge: mixRGB(look.particleEdge, look.line, 0.35 + 0.4 * k),
			line: mixRGB(look.line, look.lineHot, 0.5 * k),
			core: mixRGB(look.lineHot, WHITE, 0.4 + 0.6 * k)
		};
	}

	/** The path from the hero back to the tail, oldest last, with the span's share for each point. */
	private stream(): Array<{ x: number; y: number; u: number }> {
		const span = SPAN[this.style] * (1 + 0.4 * this.hot);
		const out: Array<{ x: number; y: number; u: number }> = [];
		for (let i = this.path.length - 1; i >= 0; i--) {
			const p = this.path[i];
			out.push({ x: p.x, y: p.y, u: Math.min(1, p.age / span) });
		}
		return out;
	}

	/** A ribbon along `pts` whose half-width at each point is `half(u, i, side)`. */
	private ribbon(
		ctx: CanvasRenderingContext2D,
		pts: ReadonlyArray<{ x: number; y: number; u: number }>,
		half: (u: number, i: number, side: number) => number
	): void {
		const n = pts.length;
		const left: Array<[number, number]> = [];
		const right: Array<[number, number]> = [];
		for (let i = 0; i < n; i++) {
			const a = pts[Math.max(0, i - 1)];
			const b = pts[Math.min(n - 1, i + 1)];
			let tx = b.x - a.x;
			let ty = b.y - a.y;
			const len = Math.hypot(tx, ty) || 1;
			tx /= len;
			ty /= len;
			const p = pts[i];
			const hl = half(p.u, i, 1);
			const hr = half(p.u, i, -1);
			left.push([p.x - ty * hl, p.y + tx * hl]);
			right.push([p.x + ty * hr, p.y - tx * hr]);
		}
		ctx.beginPath();
		ctx.moveTo(left[0][0], left[0][1]);
		for (let i = 1; i < n; i++) ctx.lineTo(left[i][0], left[i][1]);
		const tail = pts[n - 1];
		ctx.lineTo(tail.x, tail.y);
		for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
		ctx.closePath();
		ctx.fill();
	}

	private drawJet(ctx: CanvasRenderingContext2D): void {
		const pts = this.stream();
		if (pts.length < 2) return;
		const r = this.r * (1 + 0.2 * this.hot);
		const c = this.colours();
		const w = (u: number) => Math.pow(1 - u, 0.6);
		ctx.fillStyle = rgba(c.edge, 0.14 + 0.08 * this.hot);
		this.ribbon(ctx, pts, (u) => r * 1.9 * w(u));
		ctx.fillStyle = rgba(c.edge, 0.32 + 0.1 * this.hot);
		this.ribbon(ctx, pts, (u) => r * 1.35 * w(u));
		ctx.fillStyle = rgba(c.line, 0.62);
		this.ribbon(ctx, pts, (u) => r * 0.92 * w(u));
		ctx.fillStyle = rgba(c.core, 0.95);
		this.ribbon(ctx, pts, (u) => r * 0.4 * w(u));
		// speed lines along the stream, flickering
		ctx.strokeStyle = rgba(c.core, 0.55);
		ctx.lineWidth = Math.max(1, r * 0.07);
		for (const off of [-1.6, -1.2, 1.2, 1.6]) {
			const flick = 0.6 + 0.4 * Math.sin(this.time * 40 + off * 3);
			ctx.globalAlpha = flick;
			ctx.beginPath();
			const k = Math.floor(pts.length * 0.75);
			for (let i = 0; i < k; i++) {
				const a = pts[Math.max(0, i - 1)];
				const b = pts[Math.min(pts.length - 1, i + 1)];
				const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
				const nx = -(b.y - a.y) / len;
				const ny = (b.x - a.x) / len;
				const d = r * off * w(pts[i].u);
				if (i === 0) ctx.moveTo(pts[i].x + nx * d, pts[i].y + ny * d);
				else ctx.lineTo(pts[i].x + nx * d, pts[i].y + ny * d);
			}
			ctx.stroke();
		}
		ctx.globalAlpha = 1;
	}

	private drawFlame(ctx: CanvasRenderingContext2D): void {
		const pts = this.stream();
		const r = this.r * (1 + 0.25 * this.hot);
		const c = this.colours();
		const t = this.time;
		if (pts.length >= 2) {
			// tongues: the edges flicker on their own, faster towards the tail
			const tongue = (u: number, i: number, side: number, amp: number) =>
				r *
				Math.pow(1 - u, 0.8) *
				(1 +
					amp * Math.sin(i * 0.9 - t * 26 + side * 1.7) * u +
					amp * 0.6 * Math.sin(i * 2.3 + t * 17 + side) * u);
			ctx.fillStyle = rgba(c.edge, 0.4);
			this.ribbon(ctx, pts, (u, i, side) => 1.55 * tongue(u, i, side, 0.9));
			ctx.fillStyle = rgba(c.line, 0.65);
			this.ribbon(ctx, pts, (u, i, side) => 1.0 * tongue(u, i, -side, 0.7));
			ctx.fillStyle = rgba(c.core, 0.92);
			this.ribbon(ctx, pts, (u, i, side) => 0.42 * tongue(u, i, side, 0.35));
		}
		for (const p of this.sparks) {
			const k = p.life / p.max;
			ctx.fillStyle = rgba(k > 0.5 ? c.core : c.line, k);
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.size * (0.5 + k), 0, Math.PI * 2);
			ctx.fill();
		}
	}

	private drawWave(ctx: CanvasRenderingContext2D): void {
		const r = this.r * (1 + 0.15 * this.hot);
		const c = this.colours();
		const pts = this.stream();
		// afterimages: the body's outline left behind at even steps along the path
		const steps = [0.15, 0.35, 0.55, 0.75];
		for (const u of steps) {
			const p = pts.find((q) => q.u >= u);
			if (!p) continue;
			ctx.fillStyle = rgba(c.line, 0.55 * (1 - u));
			ctx.beginPath();
			ctx.arc(p.x, p.y, r * (1 - 0.25 * u), 0, Math.PI * 2);
			ctx.fill();
		}
		// the shock arcs: open backwards, they grow and thin out
		for (const g of this.rings) {
			const k = g.age / RING_LIFE;
			const rad = r * (1.1 + 2.2 * k);
			const back = g.angle + Math.PI;
			ctx.strokeStyle = rgba(k < 0.3 ? c.core : c.line, (1 - k) * 0.85);
			ctx.lineWidth = r * 0.42 * (1 - k) + 1;
			ctx.beginPath();
			ctx.arc(
				g.x - Math.cos(g.angle) * r * 1.4 * k,
				g.y - Math.sin(g.angle) * r * 1.4 * k,
				rad,
				back - 1.1,
				back + 1.1
			);
			ctx.stroke();
		}
		// shards from the turns: spinning triangles
		ctx.globalCompositeOperation = 'source-over';
		for (const p of this.sparks) {
			const k = p.life / p.max;
			ctx.save();
			ctx.translate(p.x, p.y);
			ctx.rotate(p.rot);
			ctx.globalAlpha = Math.min(1, k * 1.6);
			ctx.fillStyle = rgba(c.core, 1);
			ctx.strokeStyle = rgba(SEASON_LOOKS[this.season].particleEdge, 1);
			ctx.lineWidth = Math.max(1, p.size * 0.18);
			ctx.beginPath();
			ctx.moveTo(p.size, 0);
			ctx.lineTo(-p.size * 0.6, p.size * 0.45);
			ctx.lineTo(-p.size * 0.4, -p.size * 0.5);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();
			ctx.restore();
		}
		ctx.globalCompositeOperation = 'lighter';
	}
}
