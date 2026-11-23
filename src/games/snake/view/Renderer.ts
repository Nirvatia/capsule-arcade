// Кадр игры на 2D-канвасе: фон, Течение, Полотно, оживление рисунка, змейка, эффекты.
// Затем пост (post.ts). Вид только читает состояние логики.

import { COLS, ROWS } from '../config';
import { morph, type StrokeShape } from '../pictures/smooth';
import type { Picture, Pt } from '../pictures/types';
import type { Current } from '../sim/current';
import { DIRS, type Pond } from '../sim/pond';
import type { Fx } from './fx';
import { Post, type Tunnel } from './post';

const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const ease = (t: number): number => {
	t = clamp(t, 0, 1);
	return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

/** Оттенок змейки — один на всю игру, это её «характер». */
export const SNAKE_HUE = 178;

export interface FrameState {
	t: number;
	mode: 'current' | 'pond' | 'reveal';
	/** 0 — Полотно, 1 — Течение: смешивание фона. */
	mix: number;
	picture: Picture;
	shapes: StrokeShape[];
	/** Зажжённые штрихи рисунка. */
	lit: ReadonlySet<number>;
	/** Когда штрих загорелся (для бегущего света). */
	litAt: ReadonlyMap<number, number>;
	current: Current | null;
	pond: Pond | null;
	/** Время с начала оживления, с. */
	reveal: number;
	/** Когда змейка последний раз что-то подобрала (волна света по телу). */
	pulseAt: number;
	fx: Fx;
	tunnel: Tunnel | null;
	/** Затемнение под меню 0..1. */
	dim: number;
}

interface Mote {
	x: number;
	y: number;
	z: number;
	ph: number;
}

interface SnakePt extends Pt {
	tx: number;
	ty: number;
	/** 0 — кончик хвоста, 1 — голова. */
	u: number;
	/** Расстояние от головы, px. */
	sh: number;
	/** Расстояние от кончика хвоста, px. */
	s: number;
}

export class Renderer {
	readonly view: HTMLCanvasElement;
	private readonly scene: HTMLCanvasElement;
	private readonly ctx: CanvasRenderingContext2D;
	private readonly post: Post;
	private readonly sprites = new Map<number, HTMLCanvasElement>();
	private motes: Mote[] = [];
	W = 0;
	H = 0;
	private S = 1;
	/** Сетка Полотна в пикселях. */
	grid = { cell: 40, x: 0, y: 0 };
	/** Пикселей на единицу поля Течения. */
	unit = 1;

	constructor(parent: HTMLElement) {
		this.view = document.createElement('canvas');
		this.view.className = 'drift-view';
		this.view.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
		parent.appendChild(this.view);
		this.scene = document.createElement('canvas');
		const ctx = this.scene.getContext('2d', { alpha: false });
		if (!ctx) throw new Error('2D canvas is not available');
		this.ctx = ctx;
		this.post = new Post(this.view);
		this.resize();
	}

	destroy(): void {
		this.view.remove();
	}

	resize(): void {
		const r = this.view.getBoundingClientRect();
		this.W = Math.max(1, r.width || innerWidth);
		this.H = Math.max(1, r.height || innerHeight);
		let s = Math.min(devicePixelRatio || 1, 1.5);
		const px = this.W * this.H * s * s;
		if (px > 2.6e6) s *= Math.sqrt(2.6e6 / px);
		this.S = s;
		this.scene.width = this.view.width = Math.max(2, Math.round(this.W * s));
		this.scene.height = this.view.height = Math.max(2, Math.round(this.H * s));
		this.post.resized();
		const top = this.W < 600 ? 64 : 76;
		const cell = Math.max(10, Math.min((this.W - 32) / COLS, (this.H - top - 40) / ROWS));
		this.grid = {
			cell,
			x: (this.W - cell * COLS) / 2,
			y: top + (this.H - top - 40 - cell * ROWS) / 2
		};
		this.unit = Math.min(this.W, this.H) / 1000;
		this.motes = Array.from({ length: 46 }, () => ({
			x: Math.random() * this.W,
			y: Math.random() * this.H,
			z: 0.25 + Math.random() * 0.75,
			ph: Math.random() * 10
		}));
	}

	/** Размер поля Течения в его единицах. */
	get field(): { w: number; h: number } {
		return { w: this.W / this.unit, h: this.H / this.unit };
	}

	cellPx(c: Pt): Pt {
		return {
			x: this.grid.x + (c.x + 0.5) * this.grid.cell,
			y: this.grid.y + (c.y + 0.5) * this.grid.cell
		};
	}

	// ------------------------------------------------------------------ helpers

	private sprite(h: number): HTMLCanvasElement {
		h = (((Math.round(h / 6) * 6) % 360) + 360) % 360;
		let c = this.sprites.get(h);
		if (c) return c;
		c = document.createElement('canvas');
		c.width = c.height = 64;
		const x = c.getContext('2d');
		if (x) {
			const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
			g.addColorStop(0, `hsla(${h},80%,72%,0.9)`);
			g.addColorStop(0.2, `hsla(${h},75%,58%,0.5)`);
			g.addColorStop(0.55, `hsla(${h},70%,45%,0.12)`);
			g.addColorStop(1, `hsla(${h},70%,40%,0)`);
			x.fillStyle = g;
			x.fillRect(0, 0, 64, 64);
		}
		this.sprites.set(h, c);
		return c;
	}

	private glow(h: number, x: number, y: number, r: number, a: number): void {
		if (a <= 0.003) return;
		this.ctx.globalAlpha = Math.min(1, a);
		this.ctx.drawImage(this.sprite(h), x - r, y - r, r * 2, r * 2);
		this.ctx.globalAlpha = 1;
	}

	private poly(pts: readonly Pt[], toPx: (p: Pt) => Pt): void {
		const ctx = this.ctx;
		ctx.beginPath();
		pts.forEach((p, i) => {
			const q = toPx(p);
			if (i) ctx.lineTo(q.x, q.y);
			else ctx.moveTo(q.x, q.y);
		});
	}

	// ------------------------------------------------------------------ кадр

	render(f: FrameState): void {
		const ctx = this.ctx;
		ctx.setTransform(this.S, 0, 0, this.S, 0, 0);
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
		this.drawBackground(f);
		if (f.mode === 'current' && f.current) {
			this.drawBackdropPicture(f);
			this.drawCurrent(f, f.current);
		} else if (f.pond) {
			this.drawPond(f, f.pond);
		}
		this.drawFx(f.fx);
		if (f.dim > 0) {
			ctx.fillStyle = `rgba(2,6,12,${0.55 * f.dim})`;
			ctx.fillRect(0, 0, this.W, this.H);
		}
		const flash: [number, number, number] = [0.08, 0.22, 0.28];
		this.post.present(this.scene, f.t, f.fx.warps(this.W, this.H), f.tunnel, flash);
	}

	private drawBackground(f: FrameState): void {
		const { ctx, W, H } = this;
		const m = f.mix;
		const g = ctx.createRadialGradient(
			W * 0.5,
			H * 0.55,
			0,
			W * 0.5,
			H * 0.55,
			Math.max(W, H) * 0.8
		);
		g.addColorStop(0, `rgb(${lerp(7, 6, m) | 0},${lerp(17, 22, m) | 0},${lerp(30, 32, m) | 0})`);
		g.addColorStop(0.6, `rgb(3,${lerp(9, 11, m) | 0},${lerp(18, 20, m) | 0})`);
		g.addColorStop(1, '#01040a');
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, W, H);
		ctx.globalCompositeOperation = 'lighter';
		for (const p of this.motes) {
			p.y -= (3 + 8 * p.z) / 60;
			p.x += Math.sin(f.t * 0.25 + p.ph) * 0.08 * p.z;
			if (p.y < -10) {
				p.y = H + 10;
				p.x = Math.random() * W;
			}
			const tw = 0.6 + 0.4 * Math.sin(f.t * 0.8 + p.ph * 3);
			ctx.fillStyle = `hsla(190,60%,70%,${0.12 * p.z * tw})`;
			ctx.beginPath();
			ctx.arc(p.x, p.y, 0.8 + 1.4 * p.z, 0, TAU);
			ctx.fill();
		}
		ctx.globalCompositeOperation = 'source-over';
	}

	/** На Течении зажжённая часть рисунка видна крупно и бледно — силуэт проступает. */
	private drawBackdropPicture(f: FrameState): void {
		const { ctx, W, H } = this;
		if (!f.lit.size) return;
		const c = Math.min(W / COLS, H / ROWS) * 0.92;
		const ox = (W - c * COLS) / 2;
		const oy = (H - c * ROWS) / 2;
		const toPx = (p: Pt): Pt => ({ x: ox + p.x * c, y: oy + p.y * c });
		const hue = f.picture.hue;
		ctx.lineJoin = 'round';
		ctx.lineCap = 'round';
		f.picture.strokes.forEach((s, i) => {
			if (!f.lit.has(i)) return;
			const sh = f.shapes[i];
			if (s.cells.length === 1) {
				const p = toPx(sh.raw[0]);
				ctx.fillStyle = `hsla(${hue},55%,60%,0.22)`;
				ctx.beginPath();
				ctx.arc(p.x, p.y, c * 0.12, 0, TAU);
				ctx.fill();
				return;
			}
			this.poly(sh.smooth, toPx);
			ctx.strokeStyle = `hsla(${hue},50%,55%,0.16)`;
			ctx.lineWidth = Math.max(2, c * 0.1);
			ctx.stroke();
		});
	}

	// ------------------------------------------------------------------ Течение

	private drawCurrent(f: FrameState, cur: Current): void {
		const { ctx } = this;
		const u = this.unit;
		const P = (p: Pt): Pt => ({ x: p.x * u, y: p.y * u });
		const t = f.t;

		const gate = P(cur.gate);
		this.drawGate(gate.x, gate.y, 46 * u, cur.gate.open, f.picture.hue, t);

		ctx.globalCompositeOperation = 'lighter';
		for (const s of cur.sparks) {
			const q = P(s);
			const fade = clamp((cur.time - s.born) / 1.2, 0, 1);
			const tw = 0.75 + 0.25 * Math.sin(t * 2.3 + s.ph);
			const h = s.big ? 44 : 186;
			const r = (s.big ? 10 : 6) * u * 1.3;
			this.glow(h, q.x, q.y, r * 3.4 * tw, 0.35 * fade);
			this.glow(h, q.x, q.y, r * 1.2, 0.7 * fade);
			ctx.strokeStyle = `hsla(${h},70%,74%,${0.4 * fade})`;
			ctx.lineWidth = 1;
			ctx.beginPath();
			const a0 = t * 0.8 + s.ph;
			const L = r * (s.big ? 2.2 : 1.7) * tw;
			for (let k = 0; k < 4; k++) {
				const a = a0 + (k * Math.PI) / 2;
				ctx.moveTo(q.x + Math.cos(a) * r * 0.5, q.y + Math.sin(a) * r * 0.5);
				ctx.lineTo(q.x + Math.cos(a) * L, q.y + Math.sin(a) * L);
			}
			ctx.stroke();
		}
		const since = cur.time - cur.callAt;
		if (since < 1.1) {
			const k = since / 1.1;
			const head = P(cur);
			ctx.strokeStyle = `hsla(${SNAKE_HUE},60%,65%,${0.35 * (1 - k)})`;
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.arc(head.x, head.y, 420 * u * (1 - Math.pow(1 - Math.min(1, k * 1.2), 3)), 0, TAU);
			ctx.stroke();
		}
		ctx.globalCompositeOperation = 'source-over';

		const subs: Pt[][] = [];
		let curSub: Pt[] = [];
		for (const p of cur.trail) {
			if (p.g && curSub.length) {
				subs.push(curSub);
				curSub = [];
			}
			curSub.push(P(p));
		}
		curSub.push(P(cur));
		subs.push(curSub);
		const R = clamp(10 * u * 1.15, 6, 13);
		this.drawSnake(this.sample(subs, 4), R, cur.ang, true, f, 1);
	}

	private drawGate(x: number, y: number, R: number, open: boolean, hue: number, t: number): void {
		const ctx = this.ctx;
		ctx.globalCompositeOperation = 'lighter';
		const br = 0.8 + 0.2 * Math.sin(t * 2.2);
		this.glow(hue, x, y, R * (open ? 2.6 : 1.6), (open ? 0.4 : 0.1) * br);
		const a = open ? 0.85 : 0.28;
		for (let i = 0; i < 3; i++) {
			ctx.lineWidth = 2 - i * 0.4;
			ctx.strokeStyle = `hsla(${hue + i * 22},65%,${62 - i * 4}%,${a * (0.8 - i * 0.18)})`;
			const rr = R * (1 - i * 0.24);
			const a0 = t * (1.1 + i * 0.5) * (i % 2 ? -1 : 1);
			ctx.beginPath();
			ctx.arc(x, y, rr, a0, a0 + Math.PI * 1.45);
			ctx.stroke();
			ctx.beginPath();
			ctx.arc(x, y, rr, a0 + Math.PI * 1.6, a0 + Math.PI * 1.9);
			ctx.stroke();
		}
		if (open) {
			ctx.strokeStyle = `hsla(${hue + 20},70%,72%,0.45)`;
			ctx.lineWidth = 1.2;
			ctx.beginPath();
			for (let k = 0; k < 14; k += 0.3) {
				const r = R * 0.07 * k;
				const an = k + t * 2.2;
				ctx.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r);
			}
			ctx.stroke();
		}
		ctx.globalCompositeOperation = 'source-over';
	}

	// ------------------------------------------------------------------ Полотно

	private drawPond(f: FrameState, pond: Pond): void {
		const { ctx } = this;
		const { cell: c, x: gx, y: gy } = this.grid;
		const gw = c * COLS;
		const gh = c * ROWS;
		const hue = f.picture.hue;
		const rev = f.mode === 'reveal' ? f.reveal : 0;
		const gridA = 1 - clamp(rev / 1.2, 0, 1);
		const head = this.pondHead(pond);

		// чаша
		ctx.fillStyle = `rgba(3,11,22,${0.5 * (0.4 + 0.6 * gridA)})`;
		this.roundRect(gx - 12, gy - 12, gw + 24, gh + 24, 20);
		ctx.fill();
		ctx.strokeStyle = `hsla(${hue},35%,50%,${0.16 * gridA})`;
		ctx.lineWidth = 1;
		ctx.stroke();

		if (gridA > 0) {
			for (let i = 0; i < COLS; i++)
				for (let j = 0; j < ROWS; j++) {
					const px = gx + (i + 0.5) * c;
					const py = gy + (j + 0.5) * c;
					const d = Math.hypot(px - head.x, py - head.y) / c;
					const near = Math.exp((-d * d) / 7);
					ctx.fillStyle = `hsla(${hue},35%,65%,${(0.07 + 0.2 * near) * gridA})`;
					ctx.beginPath();
					ctx.arc(px, py, c * (0.035 + 0.02 * near), 0, TAU);
					ctx.fill();
				}
		}

		if (f.mode === 'reveal') this.drawReveal(f);
		else this.drawStrokesOnGrid(f, pond, head);

		const fade = f.mode === 'reveal' ? 1 - clamp(rev / 0.9, 0, 1) : 1;
		if (fade > 0) {
			const pts = this.sample(this.pondPath(pond), c * 0.13);
			const last = pts[pts.length - 1];
			this.drawSnake(pts, c * 0.24, Math.atan2(last.ty, last.tx), false, f, fade);
		}
	}

	private drawStrokesOnGrid(f: FrameState, pond: Pond, head: Pt): void {
		const { ctx } = this;
		const c = this.grid.cell;
		const hue = f.picture.hue;
		const t = f.t;
		const px = (p: Pt): Pt => this.cellPx(p);
		ctx.lineJoin = 'round';
		ctx.lineCap = 'round';

		const active = new Map(pond.strokes.map((s) => [s.id, s]));
		f.picture.strokes.forEach((s, i) => {
			const lit = f.lit.has(i);
			const ps = active.get(i);
			if (!lit && !ps) return; // будущие заходы скрыты
			const pts = s.cells;
			if (lit) {
				const since = t - (f.litAt.get(i) ?? -99);
				// бегущий свет: за 0.9 с линия загорается от начала обводки к концу
				const front = since < 0.9 ? (since / 0.9) * (pts.length + 0.6) : Infinity;
				const order = ps?.rev ? [...pts].reverse() : pts;
				const shown = order.slice(0, Math.max(1, Math.ceil(front)));
				if (shown.length === 1) {
					const p = px(shown[0]);
					ctx.globalCompositeOperation = 'lighter';
					this.glow(hue, p.x, p.y, c * 0.6, 0.35);
					ctx.globalCompositeOperation = 'source-over';
					ctx.fillStyle = `hsla(${hue},70%,68%,0.9)`;
					ctx.beginPath();
					ctx.arc(p.x, p.y, c * 0.13, 0, TAU);
					ctx.fill();
					return;
				}
				ctx.globalCompositeOperation = 'lighter';
				this.poly(shown, px);
				ctx.strokeStyle = `hsla(${hue},70%,55%,0.07)`;
				ctx.lineWidth = c * 0.3;
				ctx.stroke();
				ctx.globalCompositeOperation = 'source-over';
				this.poly(shown, px);
				ctx.strokeStyle = `hsla(${hue},65%,64%,0.85)`;
				ctx.lineWidth = c * 0.11;
				ctx.stroke();
				if (since < 1.2) {
					const tip = px(shown[shown.length - 1]);
					ctx.globalCompositeOperation = 'lighter';
					this.glow(hue + 20, tip.x, tip.y, c * 0.9, 0.5 * (1 - since / 1.2));
					ctx.globalCompositeOperation = 'source-over';
				}
				return;
			}
			if (!ps) return;
			// бледная направляющая
			if (pts.length > 1) {
				this.poly(pts, px);
				ctx.strokeStyle = `hsla(${hue},40%,60%,0.2)`;
				ctx.lineWidth = c * 0.05;
				ctx.stroke();
			}
			for (const p of pts) {
				const q = px(p);
				ctx.fillStyle = `hsla(${hue},45%,66%,0.4)`;
				ctx.beginPath();
				ctx.arc(q.x, q.y, c * 0.07, 0, TAU);
				ctx.fill();
			}
			// пройденная часть
			if (ps.n > 0) {
				const seq = ps.rev ? [...pts].reverse() : pts;
				const done = seq.slice(0, ps.n);
				if (done.length > 1) {
					this.poly(done, px);
					ctx.strokeStyle = `hsla(${hue},70%,66%,0.75)`;
					ctx.lineWidth = c * 0.09;
					ctx.stroke();
				}
			}
			// концы — звёздочки; ближайшая к голове светится ярче
			const ends = pts.length === 1 ? [pts[0]] : [pts[0], pts[pts.length - 1]];
			if (ps.n === 0)
				for (const e of ends) {
					const q = px(e);
					const d = Math.hypot(q.x - head.x, q.y - head.y) / c;
					const near = clamp(1 - (d - 1) / 4, 0, 1);
					const pulse = 0.5 + 0.5 * Math.sin(t * 2.4 + e.x);
					this.star(
						q.x,
						q.y,
						c * (0.24 + 0.06 * near),
						hue,
						0.5 + 0.3 * near + 0.15 * pulse,
						t * 0.4 + e.y
					);
				}
		});

		// подсказки обводки: следующая клетка и ближайший поворот
		for (const e of pond.expected()) {
			const s = pond.strokes.find((q) => q.id === e.stroke);
			if (!s) continue;
			const q = this.cellPx(e.cell);
			const pulse = 0.5 + 0.5 * Math.sin(t * 6);
			ctx.strokeStyle = `hsla(${hue},70%,72%,${0.35 + 0.3 * pulse})`;
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.arc(q.x, q.y, c * 0.26, 0, TAU);
			ctx.stroke();
			const seq = s.rev ? [...s.cells].reverse() : s.cells;
			// ищем угол в пределах двух клеток впереди
			for (let k = s.n; k < Math.min(seq.length - 1, s.n + 2); k++) {
				const a = seq[k - 1];
				const b = seq[k];
				const n = seq[k + 1];
				const d1 = [b.x - a.x, b.y - a.y];
				const d2 = [n.x - b.x, n.y - b.y];
				if (d1[0] === d2[0] && d1[1] === d2[1]) continue;
				const turn = DIRS.findIndex(([dx, dy]) => dx === d2[0] && dy === d2[1]);
				if (turn < 0) break;
				const bp = this.cellPx(b);
				this.chevron(bp.x, bp.y, turn, c, hue, 0.4 + 0.4 * pulse);
				break;
			}
		}
	}

	private star(x: number, y: number, r: number, hue: number, a: number, rot: number): void {
		const ctx = this.ctx;
		ctx.globalCompositeOperation = 'lighter';
		this.glow(hue, x, y, r * 2.6, a * 0.35);
		ctx.globalCompositeOperation = 'source-over';
		ctx.fillStyle = `hsla(${hue},70%,72%,${Math.min(1, a)})`;
		ctx.beginPath();
		for (let i = 0; i < 8; i++) {
			const ang = rot + (i * Math.PI) / 4;
			const rr = i % 2 ? r * 0.38 : r;
			ctx.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
		}
		ctx.closePath();
		ctx.fill();
	}

	private chevron(x: number, y: number, dir: number, c: number, hue: number, a: number): void {
		const ctx = this.ctx;
		const [dx, dy] = DIRS[dir];
		const px = -dy;
		const py = dx;
		const s = c * 0.17;
		const ox = x + dx * c * 0.18;
		const oy = y + dy * c * 0.18;
		ctx.strokeStyle = `hsla(${hue},75%,74%,${a})`;
		ctx.lineWidth = Math.max(1.5, c * 0.05);
		ctx.beginPath();
		ctx.moveTo(ox - dx * s + px * s, oy - dy * s + py * s);
		ctx.lineTo(ox, oy);
		ctx.lineTo(ox - dx * s - px * s, oy - dy * s - py * s);
		ctx.stroke();
	}

	/** Оживление: сетка гаснет, ступеньки перетекают в гладкие линии, рисунок покачивается. */
	private drawReveal(f: FrameState): void {
		const { ctx } = this;
		const c = this.grid.cell;
		const hue = f.picture.hue;
		const r = f.reveal;
		const k = ease((r - 0.8) / 2.6);
		const alive = clamp((r - 3.4) / 1.5, 0, 1);
		const t = f.t;
		const toPx = (p: Pt): Pt => {
			const sx = Math.sin(t * 1.3 + p.y * 0.45) * 0.14 * alive;
			const sy = Math.sin(t * 1.05 + p.x * 0.35) * 0.1 * alive;
			return { x: this.grid.x + (p.x + sx) * c, y: this.grid.y + (p.y + sy) * c };
		};
		ctx.lineJoin = 'round';
		ctx.lineCap = 'round';
		const bright = 0.85 + 0.15 * Math.sin(r * 2) * alive;
		f.picture.strokes.forEach((s, i) => {
			const sh = f.shapes[i];
			if (s.cells.length === 1) {
				const p = toPx(sh.raw[0]);
				ctx.globalCompositeOperation = 'lighter';
				this.glow(hue, p.x, p.y, c * 0.7, 0.35);
				ctx.globalCompositeOperation = 'source-over';
				ctx.fillStyle = `hsla(${hue},70%,70%,0.95)`;
				ctx.beginPath();
				ctx.arc(p.x, p.y, c * 0.14, 0, TAU);
				ctx.fill();
				return;
			}
			const pts = morph(sh, k);
			ctx.globalCompositeOperation = 'lighter';
			this.poly(pts, toPx);
			ctx.strokeStyle = `hsla(${hue},70%,55%,${0.07 + 0.05 * alive})`;
			ctx.lineWidth = c * 0.32;
			ctx.stroke();
			ctx.globalCompositeOperation = 'source-over';
			this.poly(pts, toPx);
			ctx.strokeStyle = `hsla(${hue},65%,${64 + 6 * alive}%,${bright})`;
			ctx.lineWidth = c * lerp(0.11, 0.09, k);
			ctx.stroke();
		});
	}

	// ------------------------------------------------------------------ змейка

	private pondHead(pond: Pond): Pt {
		const a = this.cellPx(pond.head);
		if (pond.next.w) return a;
		const b = this.cellPx(pond.next);
		return { x: lerp(a.x, b.x, pond.t), y: lerp(a.y, b.y, pond.t) };
	}

	/** Путь тела на Полотне в пикселях, с разрывами там, где змейка прошла через край. */
	private pondPath(pond: Pond): Pt[][] {
		const seq = [...pond.body, pond.next];
		const n = pond.body.length;
		const c = this.grid.cell;
		const t = pond.t;
		const subs: Pt[][] = [];
		let cur: Pt[] = [];
		const add = (q: Pt): void => {
			const l = cur[cur.length - 1];
			if (!l || Math.abs(l.x - q.x) + Math.abs(l.y - q.y) > 1e-4) cur.push(q);
		};
		for (let k = 0; k < n; k++) {
			const a = seq[k];
			const b = seq[k + 1];
			const A = this.cellPx(a);
			const B = this.cellPx(b);
			const f0 = k === 0 ? t : 0;
			const f1 = k === n - 1 ? t : 1;
			if (a.x === b.x && a.y === b.y) {
				add(A);
				continue;
			}
			if (!b.w) {
				add({ x: lerp(A.x, B.x, f0), y: lerp(A.y, B.y, f0) });
				add({ x: lerp(A.x, B.x, f1), y: lerp(A.y, B.y, f1) });
				continue;
			}
			// шаг через край: первая половина уходит за край, вторая выходит с другой стороны
			const dx = Math.sign(b.x - a.x) === 0 ? 0 : -Math.sign(b.x - a.x);
			const dy = Math.sign(b.y - a.y) === 0 ? 0 : -Math.sign(b.y - a.y);
			const first = (q: number): Pt => ({ x: A.x + dx * c * q, y: A.y + dy * c * q });
			const second = (q: number): Pt => ({ x: B.x - dx * c * (1 - q), y: B.y - dy * c * (1 - q) });
			if (f0 < 0.5) {
				add(first(f0));
				if (f1 <= 0.5) add(first(f1));
				else {
					add(first(0.5));
					subs.push(cur);
					cur = [];
					add(second(0.5));
					add(second(f1));
				}
			} else {
				if (cur.length) {
					subs.push(cur);
					cur = [];
				}
				add(second(f0));
				add(second(f1));
			}
		}
		if (cur.length) subs.push(cur);
		return subs;
	}

	private sample(subs: Pt[][], step: number): SnakePt[] {
		let total = 0;
		for (const sub of subs)
			for (let i = 1; i < sub.length; i++)
				total += Math.hypot(sub[i].x - sub[i - 1].x, sub[i].y - sub[i - 1].y);
		const out: SnakePt[] = [];
		let s = 0;
		let carry = 0;
		for (const sub of subs) {
			for (let i = 1; i < sub.length; i++) {
				const p = sub[i - 1];
				const q = sub[i];
				const len = Math.hypot(q.x - p.x, q.y - p.y);
				if (len < 1e-6) continue;
				const ux = (q.x - p.x) / len;
				const uy = (q.y - p.y) / len;
				let d = carry;
				while (d < len) {
					out.push({ x: p.x + ux * d, y: p.y + uy * d, tx: ux, ty: uy, u: 0, sh: 0, s: s + d });
					d += step;
				}
				carry = d - len;
				s += len;
			}
		}
		const last = subs[subs.length - 1];
		const h = last[last.length - 1];
		const prev = out[out.length - 1];
		out.push({ x: h.x, y: h.y, tx: prev?.tx ?? 1, ty: prev?.ty ?? 0, u: 1, sh: 0, s: total });
		for (const o of out) {
			o.u = total > 0 ? o.s / total : 1;
			o.sh = total - o.s;
		}
		return out;
	}

	private drawSnake(
		pts: SnakePt[],
		R: number,
		headAng: number,
		undulate: boolean,
		f: FrameState,
		alpha: number
	): void {
		const { ctx } = this;
		const n = pts.length;
		if (!n || alpha <= 0) return;
		const hue = SNAKE_HUE;
		const t = f.t;
		if (undulate)
			for (const p of pts) {
				const off = Math.sin(p.sh * 0.05 - t * 4.6) * R * 0.5 * clamp(p.sh / 110, 0, 1);
				p.x += -p.ty * off;
				p.y += p.tx * off;
			}
		const wave = (t - f.pulseAt) * 0.9;
		const boost = (u: number): number => {
			const d = (u - (1 - wave)) / 0.13;
			return wave < 1.4 ? Math.exp(-d * d) : 0;
		};
		const rad = (u: number): number => R * (0.38 + 0.62 * Math.pow(u, 0.55));
		ctx.globalAlpha = alpha;
		ctx.globalCompositeOperation = 'lighter';
		for (let i = 0; i < n; i += 2) {
			const p = pts[i];
			this.glow(
				lerp(hue + 50, hue, p.u),
				p.x,
				p.y,
				rad(p.u) * 2.4,
				(0.02 + 0.07 * p.u + 0.14 * boost(p.u)) * alpha
			);
		}
		ctx.globalCompositeOperation = 'source-over';
		ctx.globalAlpha = alpha;
		for (const p of pts) {
			const b = boost(p.u);
			ctx.fillStyle = `hsl(${lerp(hue + 50, hue, p.u)},${45 + 20 * p.u}%,${10 + 22 * p.u + 16 * b}%)`;
			ctx.beginPath();
			ctx.arc(p.x, p.y, rad(p.u), 0, TAU);
			ctx.fill();
		}
		for (const p of pts) {
			const b = boost(p.u);
			const r = rad(p.u);
			ctx.fillStyle = `hsla(${hue - 6},60%,${52 + 12 * p.u + 10 * b}%,${(0.12 + 0.3 * p.u + 0.25 * b) * alpha})`;
			ctx.beginPath();
			ctx.arc(p.x - p.ty * r * 0.22, p.y + p.tx * r * 0.22, r * 0.45, 0, TAU);
			ctx.fill();
		}
		// пятна-огоньки вдоль тела
		ctx.globalCompositeOperation = 'lighter';
		const sp = R * 3.6;
		let pk = -1;
		for (const p of pts) {
			const k = Math.floor(p.sh / sp);
			if (k === pk || k === 0) continue;
			pk = k;
			const tw = 0.5 + 0.5 * Math.sin(t * 2.2 + k * 1.7);
			const r = rad(p.u);
			const side = k % 2 ? 1 : -1;
			this.glow(
				hue + 24,
				p.x - p.ty * r * 0.55 * side,
				p.y + p.tx * r * 0.55 * side,
				R * 0.7,
				(0.15 + 0.35 * tw) * p.u * alpha
			);
		}
		ctx.globalCompositeOperation = 'source-over';
		// голова
		const hd = pts[n - 1];
		const hr = R * 1.28;
		ctx.globalCompositeOperation = 'lighter';
		this.glow(hue, hd.x, hd.y, hr * 3, (0.22 + 0.15 * boost(1)) * alpha);
		ctx.globalCompositeOperation = 'source-over';
		const g = ctx.createRadialGradient(
			hd.x - hr * 0.25,
			hd.y - hr * 0.3,
			hr * 0.08,
			hd.x,
			hd.y,
			hr
		);
		g.addColorStop(0, `hsl(${hue - 6},70%,74%)`);
		g.addColorStop(0.55, `hsl(${hue},55%,46%)`);
		g.addColorStop(1, `hsl(${hue + 24},55%,24%)`);
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(hd.x, hd.y, hr, 0, TAU);
		ctx.fill();
		const ca = Math.cos(headAng);
		const sa = Math.sin(headAng);
		for (const side of [-1, 1]) {
			const ex = hd.x + ca * hr * 0.34 - sa * side * hr * 0.5;
			const ey = hd.y + sa * hr * 0.34 + ca * side * hr * 0.5;
			ctx.fillStyle = '#04121c';
			ctx.beginPath();
			ctx.arc(ex, ey, hr * 0.22, 0, TAU);
			ctx.fill();
			ctx.fillStyle = 'rgba(200,236,240,0.8)';
			ctx.beginPath();
			ctx.arc(ex - hr * 0.05, ey - hr * 0.06, hr * 0.07, 0, TAU);
			ctx.fill();
		}
		ctx.globalAlpha = 1;
	}

	// ------------------------------------------------------------------ эффекты

	private drawFx(fx: Fx): void {
		const { ctx } = this;
		ctx.globalCompositeOperation = 'lighter';
		for (const e of fx.portals) {
			if (!e.ring || e.t <= 0) continue;
			const grow = 1 - Math.pow(1 - clamp(e.t / 0.3, 0, 1), 3);
			const fade = 1 - ease((e.t - 0.25) / (e.dur - 0.25));
			const ry = e.size * (0.45 + grow * 1.05);
			const rx = e.size * (0.12 + grow * 0.22);
			ctx.save();
			ctx.translate(e.x, e.y);
			ctx.rotate(Math.atan2(e.dy, e.dx));
			this.glow(e.hue, 0, 0, ry * 1.4, 0.3 * fade);
			for (let i = 0; i < 3; i++) {
				ctx.lineWidth = 2.2 - i * 0.6;
				ctx.strokeStyle = `hsla(${e.hue + i * 20},70%,${64 - i * 4}%,${fade * (0.75 - i * 0.2)})`;
				ctx.beginPath();
				ctx.ellipse(0, 0, rx * (1 - i * 0.22), ry * (1 - i * 0.2), 0, 0, TAU);
				ctx.stroke();
			}
			ctx.restore();
		}
		for (const p of fx.parts) {
			const a = clamp(p.life / p.max, 0, 1);
			this.glow(p.hue, p.x, p.y, p.size * (0.5 + a), a * 0.6);
		}
		ctx.globalCompositeOperation = 'source-over';
	}

	private roundRect(x: number, y: number, w: number, h: number, r: number): void {
		const ctx = this.ctx;
		ctx.beginPath();
		ctx.moveTo(x + r, y);
		ctx.arcTo(x + w, y, x + w, y + h, r);
		ctx.arcTo(x + w, y + h, x, y + h, r);
		ctx.arcTo(x, y + h, x, y, r);
		ctx.arcTo(x, y, x + w, y, r);
		ctx.closePath();
	}
}
