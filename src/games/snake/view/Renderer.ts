// Отрисовка кадра: читает состояние симуляции и эффектов, ничего в них не меняет.

import { CELL_PX, TORCHES } from '../config';
import type { Sim } from '../sim/Sim';
import { drawArena, drawTorch } from './arena';
import { drawAspid, type AspidStyle } from './aspid';
import { drawScarab, drawSeal, drawVaran } from './creatures';
import type { Fx } from './Fx';
import { clamp01, drawLights, type Light } from './paint';

const smooth = (x: number): number => x * x * (3 - 2 * x);

export interface RenderOptions {
	/** Затемнение поля под экранами меню, 0..1. */
	dim: number;
	/** Показывать печать над Альфой. */
	seal: boolean;
}

export class Renderer {
	readonly canvas: HTMLCanvasElement;
	private readonly ctx: CanvasRenderingContext2D;
	private readonly cs = CELL_PX;
	private W = 0;
	private H = 0;
	private dpr = 1;
	private bg: HTMLCanvasElement | null = null;
	private bgKey = '';
	private path = new Float32Array(0);
	private pathLen = 0;
	private readonly angles = new Map<number, number>();
	private readonly lights: Light[] = [];

	constructor(parent: HTMLElement) {
		this.canvas = document.createElement('canvas');
		this.canvas.style.display = 'block';
		this.canvas.style.touchAction = 'none';
		const ctx = this.canvas.getContext('2d', { alpha: false });
		if (!ctx) throw new Error('Snake: 2D canvas is not available.');
		this.ctx = ctx;
		parent.appendChild(this.canvas);
	}

	get width(): number {
		return this.W;
	}

	resize(sim: Sim): void {
		const W = sim.cols * this.cs;
		const H = sim.rows * this.cs;
		const dpr = Math.min(2, window.devicePixelRatio || 1);
		if (W === this.W && H === this.H && dpr === this.dpr && this.bg) return;
		this.W = W;
		this.H = H;
		this.dpr = dpr;
		this.canvas.width = Math.round(W * dpr);
		this.canvas.height = Math.round(H * dpr);
		this.canvas.style.width = `${W}px`;
		this.canvas.style.height = `${H}px`;
		this.bgKey = '';
		this.bakeArena(sim);
	}

	private bakeArena(sim: Sim): void {
		const key = `${sim.cols}x${sim.rows}@${this.dpr}`;
		if (key === this.bgKey && this.bg) return;
		const bg = document.createElement('canvas');
		bg.width = this.canvas.width;
		bg.height = this.canvas.height;
		const b = bg.getContext('2d')!;
		b.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
		drawArena(b, sim.cols, sim.rows, this.cs, (c, r) => sim.walls[r * sim.cols + c] === 1, TORCHES);
		this.bg = bg;
		this.bgKey = key;
	}

	alphaAngle(id: number): number {
		return this.angles.get(-id) ?? 0;
	}

	destroy(): void {
		this.canvas.remove();
		this.bg = null;
	}

	render(sim: Sim, fx: Fx, t: number, opt: RenderOptions): void {
		const c = this.ctx;
		const cs = this.cs;
		const L = this.lights;
		L.length = 0;
		this.bakeArena(sim);
		const [sx, sy] = fx.shakeOffset(t);

		c.setTransform(1, 0, 0, 1, 0, 0);
		c.fillStyle = '#000';
		c.fillRect(0, 0, this.canvas.width, this.canvas.height);
		c.setTransform(this.dpr, 0, 0, this.dpr, sx * this.dpr, sy * this.dpr);
		if (this.bg) c.drawImage(this.bg, 0, 0, this.W, this.H);
		c.lineCap = 'round';
		c.lineJoin = 'round';

		// Руна NOT
		if (sim.rune) {
			const r = sim.rune;
			const x = ((r.cell % sim.cols) + 0.5) * cs;
			const y = (Math.floor(r.cell / sim.cols) + 0.5) * cs;
			const blink = r.life < 2500 ? 0.55 + 0.45 * Math.sin(t * 14) : 1;
			c.save();
			c.globalAlpha = blink;
			drawSeal(c, x, y + Math.sin(t * 2.4) * 1.5, cs * 0.3, 'not', true, 0, 0, t, L);
			c.restore();
		}

		// Скарабеи
		for (const s of sim.scarabs) {
			const p = smooth(clamp01((s.moveMs - s.timer) / Math.min(s.moveMs, 320)));
			const [x0, y0] = this.cellXY(sim, s.prev);
			const [x1, y1] = this.cellXY(sim, s.cell);
			let a = this.angles.get(s.id) ?? (s.id * 2.399) % (Math.PI * 2);
			if (s.prev !== s.cell) {
				a = Math.atan2(y1 - y0, x1 - x0);
				this.angles.set(s.id, a);
			}
			const wob = Math.sin(t * 3 + s.id) * cs * 0.04;
			drawScarab(
				c,
				x0 + (x1 - x0) * p,
				y0 + (y1 - y0) * p + wob,
				a,
				s.bit,
				t,
				cs / 30,
				s.fleeing,
				L,
				s.id * 3
			);
		}

		// Альфа (или её «призрак» в момент удушения)
		let sealX = 0;
		let sealY = 0;
		const a = sim.alpha;
		if (a) {
			const [x0, y0] = this.cellXY(sim, a.prev, 1);
			const [x1, y1] = this.cellXY(sim, a.cell, 1);
			let x: number;
			let y: number;
			let lift = 0;
			if (a.escaping) {
				const p = smooth(clamp01(1 - a.timer / a.moveMs));
				x = x0 + (x1 - x0) * p;
				y = y0 + (y1 - y0) * p;
				lift = Math.sin(p * Math.PI) * cs * 1.4;
			} else {
				const p = smooth(clamp01((a.moveMs - a.timer) / Math.min(a.moveMs, 520)));
				x = x0 + (x1 - x0) * p;
				y = y0 + (y1 - y0) * p;
			}
			let ang = this.angles.get(-a.id) ?? 0;
			if (a.prev !== a.cell && !a.escaping) {
				ang = Math.atan2(y1 - y0, x1 - x0);
				this.angles.set(-a.id, ang);
			}
			if (lift > 0) {
				c.fillStyle = 'rgba(0,0,0,0.3)';
				c.beginPath();
				c.ellipse(x, y + cs * 0.2, cs * 0.9, cs * 0.35, 0, 0, Math.PI * 2);
				c.fill();
			}
			drawVaran(c, x, y - lift, ang, t, (cs / 30) * 0.8, {});
			sealX = x;
			sealY = y - lift;
		}
		const ghost = fx.ghost;
		const gs = fx.ghostStyle(t);
		if (ghost && gs)
			drawVaran(c, ghost.x, ghost.y, ghost.angle, t, (cs / 30) * 0.8, { ...gs, flash: '#ffe6a3' });

		// Аспид
		this.buildPath(sim);
		const style: AspidStyle = { len: sim.length, bits: sim.bits, ...fx.snakeStyle(t, sim.length) };
		drawAspid(c, this.body, cs, t, style, L);

		// Печать над Альфой
		if (a && opt.seal) {
			const pv = sim.preview();
			if (pv) {
				const above = sealY - cs * 1.75;
				const y = above < cs * 0.9 ? sealY + cs * 1.75 : above;
				drawSeal(
					c,
					sealX,
					y,
					cs * 0.42,
					pv.op,
					pv.touching === 0 || pv.ok,
					pv.touching,
					pv.total,
					t,
					L,
					{
						crack: fx.sealCrack(t)
					}
				);
			}
		}

		TORCHES.forEach(([tc, tr], i) => drawTorch(c, cs, tc, tr, t, i * 1.9, L));
		fx.draw(c, t, this.W, this.H, L);
		drawLights(c, L);

		if (opt.dim > 0) {
			c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
			c.fillStyle = `rgba(4,5,6,${opt.dim})`;
			c.fillRect(0, 0, this.W, this.H);
		}
	}

	private cellXY(sim: Sim, cell: number, offset = 0.5): [number, number] {
		return [
			((cell % sim.cols) + offset) * this.cs,
			(Math.floor(cell / sim.cols) + offset) * this.cs
		];
	}

	/** Цепочка центров клеток тела + клетка, которую только что покинул хвост. */
	private buildPath(sim: Sim): void {
		const n = sim.length + 1;
		if (this.path.length < n * 2) this.path = new Float32Array(n * 4);
		for (let i = 0; i < sim.length; i++) {
			const cell = sim.cellAt(i);
			this.path[i * 2] = (cell % sim.cols) + 0.5;
			this.path[i * 2 + 1] = Math.floor(cell / sim.cols) + 0.5;
		}
		const pt = sim.prevTail >= 0 ? sim.prevTail : sim.tailCell;
		this.path[sim.length * 2] = (pt % sim.cols) + 0.5;
		this.path[sim.length * 2 + 1] = Math.floor(pt / sim.cols) + 0.5;
		this.pathLen = n;
		this.phaseShift = 1 - sim.phase;
	}

	private phaseShift = 0;
	private readonly tmp: [number, number] = [0, 0];

	private raw(k: number, out: [number, number]): void {
		const P = this.path;
		const last = this.pathLen - 1;
		if (k <= 0 || last < 1) {
			const dx = last >= 1 ? P[0] - P[2] : 0;
			const dy = last >= 1 ? P[1] - P[3] : 0;
			out[0] = P[0] - dx * k;
			out[1] = P[1] - dy * k;
			return;
		}
		if (k >= last) {
			out[0] = P[last * 2];
			out[1] = P[last * 2 + 1];
			return;
		}
		const i = Math.floor(k);
		const f = k - i;
		out[0] = P[i * 2] + (P[i * 2 + 2] - P[i * 2]) * f;
		out[1] = P[i * 2 + 1] + (P[i * 2 + 3] - P[i * 2 + 1]) * f;
	}

	/** Точка тела на расстоянии d клеток от головы, со скруглёнными углами. */
	private readonly body = (d: number): readonly [number, number] => {
		const k = d + this.phaseShift;
		let x = 0;
		let y = 0;
		for (let j = -2; j <= 2; j++) {
			this.raw(k + j * 0.12, this.tmp);
			x += this.tmp[0];
			y += this.tmp[1];
		}
		return [x / 5, y / 5];
	};
}
