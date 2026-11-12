import type { EchoCloneService, EchoDirection } from '../../logic/bonuses/EchoCloneService';
import type { GridLayout } from '../maze/GridView';
import { ECHO } from '../../config/echoConfig';

// The echo bonus on the board, in its own look (not a copy of the hero): echo wisps, flat
// discs of ice light with a small chomping notch, a soft halo and a short comet tail. One wisp
// is quiet; the halos and tails add up (`lighter`) and neighbours are joined by threads of
// light, so a riot of 7-9 reads as a bright web.
// The token is one wisp asleep in a breathing ring with three motes circling it. A wisp a
// ghost catches bursts into a ring and sparks; the riot's last half second they flicker out.

/** A wisp's body radius in tiles (the old blue copy was 0.34; the owner: a quarter smaller). */
export const WISP_RADIUS = 0.255;
/** Seconds of path a wisp's tail covers. */
const TAIL_SECONDS = 0.13;
/** Seconds a caught wisp takes to burst. */
const BURST_SECONDS = 0.35;
/** Seconds a released wisp takes to flash out of the token. */
const BIRTH_SECONDS = 0.25;

const CORE = 'rgba(236, 251, 255, 1)';
const BODY = 'rgba(150, 228, 255, 0.92)';
const TAIL = 'rgba(110, 206, 255, ';
const RING = 'rgba(170, 236, 255, ';
const RIM = 'rgba(30, 120, 220, 0.9)';
/** Wisps closer than this (tiles) are joined by a thread of light: a crowd becomes a web. */
const THREAD_REACH = 3.2;

const ANGLES: Record<EchoDirection, number> = {
	RIGHT: 0,
	DOWN: Math.PI / 2,
	LEFT: Math.PI,
	UP: -Math.PI / 2
};

let haloSprite: HTMLCanvasElement | null = null;

/** The wisps' halo: a soft cyan glow, painted once. */
function halo(): HTMLCanvasElement {
	if (!haloSprite) {
		const n = 64;
		const c = document.createElement('canvas');
		c.width = c.height = n;
		const x = c.getContext('2d');
		if (x) {
			const g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
			g.addColorStop(0, 'rgba(160, 232, 255, 0.9)');
			g.addColorStop(0.35, 'rgba(90, 190, 255, 0.35)');
			g.addColorStop(1, 'rgba(60, 150, 255, 0)');
			x.fillStyle = g;
			x.fillRect(0, 0, n, n);
		}
		haloSprite = c;
	}
	return haloSprite;
}

interface Wisp {
	/** Screen positions of the last moments, newest last, with their age in seconds. */
	path: Array<{ x: number; y: number; age: number }>;
	/** Seconds since it left the token (the birth flash), and since it was caught (or -1). */
	born: number;
	caught: number;
	x: number;
	y: number;
	angle: number;
	phase: number;
}

export class EchoCloneView {
	private readonly wisps = new Map<number, Wisp>();
	private lastTime = -1;

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
		if (echo.phase === 'token') {
			this.drawToken(ctx, echo, layout, time);
		} else if (echo.phase === 'riot') {
			this.drawRiot(ctx, echo, layout, dt, time);
		}
		if (echo.phase !== 'riot') {
			this.wisps.clear();
		}
	}

	private drawToken(
		ctx: CanvasRenderingContext2D,
		echo: EchoCloneService,
		layout: GridLayout,
		time: number
	): void {
		const at = echo.tokenPosition;
		if (!at) {
			return;
		}
		const S = layout.tileSize;
		const x = layout.offsetX + at.x * S;
		const y = layout.offsetY + at.y * S;
		const r = S * WISP_RADIUS;
		// the last two seconds it flickers: take it or lose it
		const blinking = echo.timer < 2 && Math.floor(echo.timer * 5) % 2 === 0;
		ctx.save();
		ctx.globalAlpha = blinking ? 0.45 : 1;
		const pulse = 0.5 + 0.5 * Math.sin(time * 4);
		ctx.globalCompositeOperation = 'lighter';
		const h = r * (3.2 + 0.4 * pulse);
		ctx.drawImage(halo(), x - h, y - h, h * 2, h * 2);
		ctx.strokeStyle = `${RING}${0.55 + 0.35 * pulse})`;
		ctx.lineWidth = Math.max(1, S * 0.05);
		ctx.beginPath();
		ctx.arc(x, y, S * (0.4 + 0.05 * pulse), 0, Math.PI * 2);
		ctx.stroke();
		// three motes circling: the echoes waiting inside
		ctx.fillStyle = CORE;
		for (let i = 0; i < 3; i++) {
			const a = time * 2.4 + (i * Math.PI * 2) / 3;
			ctx.beginPath();
			ctx.arc(x + Math.cos(a) * S * 0.4, y + Math.sin(a) * S * 0.4, S * 0.045, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.globalCompositeOperation = 'source-over';
		this.body(ctx, x, y, r * (0.9 + 0.06 * pulse), -Math.PI / 2, 0.15 + 0.1 * pulse);
		ctx.restore();
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
		// the light first, all wisps together: halos and tails add up into the swarm
		ctx.globalCompositeOperation = 'lighter';
		for (const w of this.wisps.values()) {
			if (w.caught >= 0 || w.born < 0) continue;
			ctx.globalAlpha = 0.55 * fade;
			const h = r * 3;
			ctx.drawImage(halo(), w.x - h, w.y - h, h * 2, h * 2);
			this.tail(ctx, w, r, fade);
		}
		// threads between neighbours: the more wisps, the denser the web
		const live = [...this.wisps.values()].filter((w) => w.caught < 0 && w.born >= 0);
		ctx.lineCap = 'round';
		for (let i = 0; i < live.length; i++) {
			for (let j = i + 1; j < live.length; j++) {
				const a = live[i];
				const b = live[j];
				const d = Math.hypot(a.x - b.x, a.y - b.y) / S;
				if (d > THREAD_REACH || d < 0.3) continue;
				const k = 1 - d / THREAD_REACH;
				const shimmer = 0.75 + 0.25 * Math.sin(time * 9 + a.phase + b.phase);
				ctx.globalAlpha = Math.min(1, k * 1.1) * shimmer * fade;
				ctx.strokeStyle = `${TAIL}1)`;
				ctx.lineWidth = Math.max(1.5, S * 0.12 * k);
				ctx.beginPath();
				ctx.moveTo(a.x, a.y);
				ctx.lineTo(b.x, b.y);
				ctx.stroke();
				ctx.strokeStyle = CORE;
				ctx.lineWidth = Math.max(1, S * 0.035);
				ctx.stroke();
				// a spark running along the thread
				const u = (time * 1.8 + (a.phase + b.phase) * 0.3) % 1;
				ctx.fillStyle = CORE;
				ctx.beginPath();
				ctx.arc(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, S * 0.07, 0, Math.PI * 2);
				ctx.fill();
			}
		}
		// births and bursts
		for (const w of this.wisps.values()) {
			if (w.caught >= 0) {
				this.burst(ctx, w, r, w.caught / BURST_SECONDS);
			} else if (w.born >= 0 && w.born < BIRTH_SECONDS) {
				const k = w.born / BIRTH_SECONDS;
				ctx.globalAlpha = 1 - k;
				ctx.strokeStyle = `${RING}1)`;
				ctx.lineWidth = Math.max(1, r * 0.4 * (1 - k));
				ctx.beginPath();
				ctx.arc(w.x, w.y, r * (1 + 1.6 * k), 0, Math.PI * 2);
				ctx.stroke();
			}
		}
		// the bodies on top, plain
		ctx.globalCompositeOperation = 'source-over';
		for (const w of this.wisps.values()) {
			if (w.caught >= 0 || w.born < 0) continue;
			ctx.globalAlpha = fade;
			const chomp = 0.5 + 0.5 * Math.sin(time * 18 + w.phase);
			this.body(ctx, w.x, w.y, r, w.angle, 0.12 + 0.3 * chomp);
		}
		ctx.restore();
	}

	/** A flat disc of light with a notch (the mouth) and a bright core behind it. */
	private body(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		r: number,
		angle: number,
		open: number
	): void {
		const a = open * 0.9;
		ctx.fillStyle = BODY;
		ctx.strokeStyle = RIM;
		ctx.lineWidth = Math.max(1, r * 0.16);
		ctx.lineJoin = 'round';
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.arc(x, y, r, angle + a, angle + Math.PI * 2 - a);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = CORE;
		ctx.beginPath();
		ctx.arc(
			x - Math.cos(angle) * r * 0.28,
			y - Math.sin(angle) * r * 0.28,
			r * 0.42,
			0,
			Math.PI * 2
		);
		ctx.fill();
	}

	/** The comet tail along the last moments of the path, tapering to nothing. */
	private tail(ctx: CanvasRenderingContext2D, w: Wisp, r: number, fade: number): void {
		const pts = w.path;
		if (pts.length < 2) return;
		const n = pts.length;
		const left: Array<[number, number]> = [];
		const right: Array<[number, number]> = [];
		for (let i = n - 1; i >= 0; i--) {
			const a = pts[Math.max(0, i - 1)];
			const b = pts[Math.min(n - 1, i + 1)];
			const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
			const nx = -(b.y - a.y) / len;
			const ny = (b.x - a.x) / len;
			const u = pts[i].age / TAIL_SECONDS;
			const half = r * 0.8 * Math.sqrt(Math.max(0, 1 - u)) * (1 - u * 0.4);
			left.push([pts[i].x + nx * half, pts[i].y + ny * half]);
			right.push([pts[i].x - nx * half, pts[i].y - ny * half]);
		}
		ctx.globalAlpha = 0.38 * fade;
		ctx.fillStyle = `${TAIL}1)`;
		ctx.beginPath();
		ctx.moveTo(left[0][0], left[0][1]);
		for (const p of left) ctx.lineTo(p[0], p[1]);
		ctx.lineTo(pts[0].x, pts[0].y);
		for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
		ctx.closePath();
		ctx.fill();
	}

	/** A caught wisp: a ring that opens and six sparks flying off. */
	private burst(ctx: CanvasRenderingContext2D, w: Wisp, r: number, k: number): void {
		if (k >= 1) return;
		ctx.globalAlpha = 1 - k;
		ctx.strokeStyle = `${RING}1)`;
		ctx.lineWidth = Math.max(1, r * 0.35 * (1 - k));
		ctx.beginPath();
		ctx.arc(w.x, w.y, r * (0.8 + 1.4 * k), 0, Math.PI * 2);
		ctx.stroke();
		ctx.fillStyle = CORE;
		for (let i = 0; i < 6; i++) {
			const a = w.phase + (i * Math.PI) / 3;
			const d = r * (0.6 + 2.2 * k);
			ctx.beginPath();
			ctx.arc(w.x + Math.cos(a) * d, w.y + Math.sin(a) * d, r * 0.16 * (1 - k), 0, Math.PI * 2);
			ctx.fill();
		}
	}
}
