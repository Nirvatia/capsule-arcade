// Кадр игры в духе акварели и туши. Два мира:
// Течение — бледная вода, в которую собранные рисунки возвращают свои цвета;
// Полотно — лист бумаги, где змейка-кисть обводит линии тушью.
// Тяжёлая акварель рисуется заранее в отдельные холсты; каждый кадр — только живое.
// Затем пост (post.ts): искажение у порталов и туннель между мирами.

import { COLS, ROWS } from '../config';
import { morph, type StrokeShape } from '../pictures/smooth';
import type { Picture, Pt } from '../pictures/types';
import type { Current } from '../sim/current';
import { DIRS, type Pond } from '../sim/pond';
import { drawCreature, type CreaturePalette } from './creature';
import type { Fx } from './fx';
import {
	TAU,
	bloom,
	brush,
	enso,
	fillPoly,
	layer,
	paper,
	resample,
	rng,
	roundCorners,
	spline,
	wash,
	type Rng
} from './paint';
import { Post, type Tunnel } from './post';

const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const ease = (t: number): number => {
	t = clamp(t, 0, 1);
	return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
const hsl = (h: number, s: number, l: number): string => `hsl(${h},${s}%,${l}%)`;

/** Палитра «Возвращение цвета». */
const PAL = {
	sky: ['#f3f2ef', '#e2e4e4', '#cdd2d5'],
	/** Бледная лаванда и серый: дымка мира до того, как в него вернутся цвета. */
	washes: ['#a3a2d6', '#b8bcc4', '#a9a8d8', '#c4c8cc'],
	far: '#c3c9ce',
	farTexture: '#d4d8da',
	near: '#9aa3ab',
	kelp: '#88929b',
	shaft: 'rgba(255,255,255,0.35)',
	mote: 'rgb(70,80,92)',
	ink: '#262c36',
	paper: '#f2ecdf',
	pencil: 'rgba(100,94,84,0.7)',
	gridDot: 'rgba(120,110,92,0.22)',
	veil: 'rgb(242,240,236)'
};

/** Змейка в воде: светлая, с тушевым контуром; плавник — цвета текущего рисунка. */
const waterSnake = (hue: number): CreaturePalette => ({
	ink: PAL.ink,
	body: '#eceeed',
	belly: '#ffffff',
	mark: '#a3acb4',
	fin: hsl(hue, 55, 70),
	finEdge: hsl(hue, 45, 48),
	eye: PAL.ink,
	glint: 'rgba(255,250,240,0.9)'
});

/** На бумаге змейка становится самой кистью: тушевое тело, плавник в цвет рисунка. */
const inkSnake = (hue: number): CreaturePalette => ({
	ink: PAL.ink,
	body: '#2e3442',
	belly: '#5a6170',
	mark: '#171b24',
	fin: hsl(hue, 50, 62),
	finEdge: hsl(hue, 45, 42),
	eye: '#f4eee0',
	glint: '#2e3442'
});

export interface FrameState {
	t: number;
	mode: 'current' | 'pond' | 'reveal';
	picture: Picture;
	shapes: StrokeShape[];
	/** Зажжённые штрихи рисунка. */
	lit: ReadonlySet<number>;
	/** Когда штрих загорелся в этой сессии (для бегущего мазка). */
	litAt: ReadonlyMap<number, number>;
	/** Оттенки собранных рисунков: они вернули цвет в воду. */
	colors: readonly number[];
	current: Current | null;
	pond: Pond | null;
	/** Время с начала оживления, с. */
	reveal: number;
	fx: Fx;
	tunnel: Tunnel | null;
	/** Вуаль под меню 0..1. */
	dim: number;
}

interface Mote {
	x: number;
	y: number;
	z: number;
	ph: number;
}

/** Сколько длится бегущий мазок только что зажжённого штриха. */
const SWEEP = 0.9;

export class Renderer {
	readonly view: HTMLCanvasElement;
	private readonly scene: HTMLCanvasElement;
	private readonly ctx: CanvasRenderingContext2D;
	private readonly post: Post;
	private motes: Mote[] = [];
	W = 0;
	H = 0;
	private S = 1;
	/** Масштаб декораций относительно эскиза 1280×720. */
	private k = 1;
	/** Сетка Полотна в пикселях. */
	grid = { cell: 40, x: 0, y: 0 };
	/** Пикселей на единицу поля Течения. */
	unit = 1;
	private pondAng: number | null = null;

	private water: { key: string; canvas: HTMLCanvasElement } | null = null;
	private sheet: { key: string; paper: HTMLCanvasElement; dots: HTMLCanvasElement } | null = null;
	private ink: { key: string; canvas: HTMLCanvasElement } | null = null;
	private tint: { key: string; canvas: HTMLCanvasElement } | null = null;
	private paths: { key: string; list: Pt[][] } | null = null;

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
		this.k = Math.min(this.W / 1280, this.H / 720) * 0.5 + (Math.min(this.W, this.H) / 720) * 0.5;
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
		const mr = rng(77);
		this.motes = Array.from({ length: 40 }, () => ({
			x: mr() * this.W,
			y: mr() * this.H,
			z: 0.3 + mr() * 0.7,
			ph: mr() * 10
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

	private get sizeKey(): string {
		return `${this.W}x${this.H}@${this.S}|${this.grid.cell}`;
	}

	// ------------------------------------------------------------------ кадр

	render(f: FrameState): void {
		const ctx = this.ctx;
		ctx.setTransform(this.S, 0, 0, this.S, 0, 0);
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
		if (f.mode === 'current' && f.current) this.drawCurrent(f, f.current);
		else if (f.pond) this.drawPond(f, f.pond);
		this.drawFx(f);
		if (f.dim > 0) {
			ctx.globalAlpha = 0.6 * f.dim;
			ctx.fillStyle = PAL.veil;
			ctx.fillRect(0, 0, this.W, this.H);
			ctx.globalAlpha = 1;
		}
		this.post.present(this.scene, f.t, f.fx.warps(this.W, this.H), f.tunnel, [0.95, 0.94, 0.9]);
	}

	// ------------------------------------------------------------------ Течение

	/** Вода: градиент, свет сверху, серые заливки, вернувшиеся цвета, лучи, риф. */
	private bakeWater(colors: readonly number[]): HTMLCanvasElement {
		const key = `${this.sizeKey}|${colors.join(',')}`;
		if (this.water?.key === key) return this.water.canvas;
		const { W, H, k } = this;
		const { canvas, ctx } = layer(W, H, this.S);
		const r = rng(21);
		const g = ctx.createLinearGradient(0, 0, 0, H);
		g.addColorStop(0, PAL.sky[0]);
		g.addColorStop(0.5, PAL.sky[1]);
		g.addColorStop(1, PAL.sky[2]);
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, W, H);
		bloom(ctx, W * 0.42, -H * 0.2, H * 1.05, '#ffffff', 0.8);
		for (let i = 0; i < 4; i++)
			wash(
				ctx,
				{
					x: W * (0.15 + 0.25 * i) + r.gauss() * 60 * k,
					y: H * (0.25 + 0.3 * r()),
					r: (200 + r() * 160) * k
				},
				PAL.washes[i],
				// не меньше ~2% на слой: тоньше 8-битный холст округляет неравномерно и уводит цвет
				{ rng: r, alpha: 0.03, layers: 14, sx: 1.7, sy: 0.75, rot: r.gauss() * 0.2, spread: 0.14 }
			);
		// вернувшиеся цвета: у каждого рисунка своё место, чтобы при новом цвете старые не прыгали
		colors.forEach((hue, i) => {
			const x = W * (0.12 + ((i * 0.37 + 0.05) % 1) * 0.76);
			const y = H * (0.22 + ((i * 0.53 + 0.4) % 1) * 0.45);
			wash(ctx, { x, y, r: 190 * k }, hsl(hue, 45, 72), {
				rng: rng(1000 + i * 31),
				alpha: 0.022,
				layers: 44,
				sx: 1.6,
				sy: 0.8,
				blend: 'multiply',
				spread: 0.15,
				edge: 0.06
			});
		});
		this.shafts(ctx, r);
		this.reef(ctx, r);
		paper(ctx, W, H, 0.16, 'multiply', 21);
		this.water = { key, canvas };
		return canvas;
	}

	private shafts(ctx: CanvasRenderingContext2D, r: Rng): void {
		const { W, H, k } = this;
		const { canvas: lc, ctx: l } = layer(W, H, 1);
		for (let i = 0; i < 4; i++) {
			const x = W * (0.16 + 0.22 * i) + r.gauss() * 30 * k;
			const w = (70 + r() * 80) * k;
			l.save();
			l.translate(x, 0);
			l.transform(1, 0, 0.32, 1, 0, 0);
			const lg = l.createLinearGradient(-w / 2, 0, w / 2, 0);
			lg.addColorStop(0, 'rgba(255,255,255,0)');
			lg.addColorStop(0.5, PAL.shaft);
			lg.addColorStop(1, 'rgba(255,255,255,0)');
			l.fillStyle = lg;
			l.fillRect(-w / 2, 0, w, H);
			l.restore();
		}
		l.globalCompositeOperation = 'destination-in';
		const fade = l.createLinearGradient(0, 0, 0, H * 0.8);
		fade.addColorStop(0, 'rgba(0,0,0,1)');
		fade.addColorStop(1, 'rgba(0,0,0,0)');
		l.fillStyle = fade;
		l.fillRect(0, 0, W, H);
		ctx.drawImage(lc, 0, 0, W, H);
	}

	/** Риф: два слоя круглых скал, арка и несколько длинных водорослей. */
	private reef(ctx: CanvasRenderingContext2D, r: Rng): void {
		const { W, H, k } = this;
		const ridge = (
			y0: number,
			amp: number,
			step: number,
			freq: number,
			ph: number,
			pow: number
		): Pt[] => {
			const pts: Pt[] = [];
			for (let x = -step * 2; x <= W + step * 2; x += step)
				pts.push({
					x,
					y: y0 - Math.pow(Math.abs(Math.sin(x * freq + ph)), pow) * amp - r() * 18 * k
				});
			return spline(pts, 10);
		};
		const fillRidge = (top: Pt[], color: string, a: number): Pt[] => {
			const poly = [{ x: top[0].x, y: H + 20 }, ...top, { x: top[top.length - 1].x, y: H + 20 }];
			ctx.save();
			ctx.globalAlpha = a;
			ctx.fillStyle = color;
			fillPoly(ctx, poly);
			ctx.restore();
			return poly;
		};
		const far = fillRidge(ridge(H * 0.74, 90 * k, 110 * k, 0.004 / k, 1.3, 2), PAL.far, 0.55);
		ctx.save();
		ctx.beginPath();
		far.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
		ctx.closePath();
		ctx.clip();
		for (let i = 0; i < 5; i++)
			wash(
				ctx,
				{ x: r() * W, y: H * (0.85 + 0.1 * r()), r: (120 + r() * 120) * k },
				PAL.farTexture,
				{
					rng: r,
					alpha: 0.02,
					layers: 24,
					sx: 1.8,
					sy: 0.6
				}
			);
		ctx.restore();
		// арка из камня справа, дальний план
		const ax = W * 0.83;
		const ay = H * 0.72;
		ctx.save();
		ctx.globalAlpha = 0.5;
		ctx.fillStyle = PAL.far;
		ctx.beginPath();
		ctx.moveTo(ax - 120 * k, ay + 40 * k);
		ctx.bezierCurveTo(
			ax - 110 * k,
			ay - 170 * k,
			ax + 120 * k,
			ay - 190 * k,
			ax + 130 * k,
			ay + 40 * k
		);
		ctx.lineTo(ax + 80 * k, ay + 40 * k);
		ctx.bezierCurveTo(
			ax + 70 * k,
			ay - 110 * k,
			ax - 60 * k,
			ay - 100 * k,
			ax - 70 * k,
			ay + 40 * k
		);
		ctx.closePath();
		ctx.fill();
		ctx.restore();
		fillRidge(ridge(H * 0.9, 70 * k, 140 * k, 0.0035 / k, 0.2, 3), PAL.near, 0.7);
		for (let i = 0; i < 5; i++) {
			const x = W * (0.06 + 0.2 * i) + r.gauss() * 40 * k;
			const h = (140 + r() * 190) * k;
			const pts: Pt[] = [];
			for (let j = 0; j <= 10; j++)
				pts.push({
					x: x + Math.sin(j * 0.5 + i * 1.7) * 22 * k * (j / 10),
					y: H + 10 - (h * j) / 10
				});
			brush(ctx, spline(pts, 6), (11 + r() * 5) * k, PAL.kelp, {
				seed: 300 + i,
				alpha: 0.45,
				taper: 0.5,
				dry: false,
				grit: 0.02,
				wobble: 0.6
			});
		}
	}

	private drawCurrent(f: FrameState, cur: Current): void {
		const { ctx, W, H, k } = this;
		const u = this.unit;
		const P = (p: Pt): Pt => ({ x: p.x * u, y: p.y * u });
		const t = f.t;
		const hue = f.picture.hue;
		ctx.drawImage(this.bakeWater(f.colors), 0, 0, W, H);

		// уже зажжённая часть рисунка — крупно и бледно, силуэт проступает в воде
		if (f.lit.size) {
			const c = Math.min(W / COLS, H / ROWS) * 0.92;
			const ox = (W - c * COLS) / 2;
			const oy = (H - c * ROWS) / 2;
			const toPx = (p: Pt): Pt => ({ x: ox + p.x * c, y: oy + p.y * c });
			f.picture.strokes.forEach((s, i) => {
				if (!f.lit.has(i)) return;
				const sh = f.shapes[i];
				if (s.cells.length === 1) {
					const p = toPx(sh.raw[0]);
					ctx.fillStyle = PAL.ink;
					ctx.globalAlpha = 0.1;
					ctx.beginPath();
					ctx.arc(p.x, p.y, c * 0.1, 0, TAU);
					ctx.fill();
					ctx.globalAlpha = 1;
					return;
				}
				brush(ctx, sh.smooth.map(toPx), c * 0.09, PAL.ink, {
					seed: 500 + i,
					alpha: 0.1,
					dry: false
				});
			});
		}

		// пылинки в воде
		ctx.fillStyle = PAL.mote;
		for (const m of this.motes) {
			const y = (((m.y - t * (4 + 8 * m.z)) % H) + H) % H;
			const x = m.x + Math.sin(t * 0.25 + m.ph) * 8 * m.z;
			ctx.globalAlpha = 0.08 + 0.2 * m.z;
			ctx.beginPath();
			ctx.arc(x, y, 0.5 + 1.1 * m.z * m.z, 0, TAU);
			ctx.fill();
		}
		ctx.globalAlpha = 1;

		// портал: закрыт — карандашный круг, открыт — энсо тушью и мягкое пятно цвета
		const gp = P(cur.gate);
		const R = 54 * k;
		if (cur.gate.open) {
			bloom(ctx, gp.x, gp.y, R * 1.6, hsl(hue, 45, 72), 0.55, 'multiply');
			enso(ctx, gp.x, gp.y, R, R * 0.2, PAL.ink, { seed: 8, alpha: 0.88, start: -1.2 + t * 0.15 });
			enso(ctx, gp.x, gp.y, R * 0.62, R * 0.07, PAL.ink, {
				seed: 9,
				alpha: 0.42,
				start: 1.4 - t * 0.25,
				span: 0.75
			});
		} else {
			ctx.save();
			ctx.strokeStyle = PAL.pencil;
			ctx.setLineDash([2 * k, 7 * k]);
			ctx.lineDashOffset = -t * 6;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.arc(gp.x, gp.y, R * 0.8, 0, TAU);
			ctx.stroke();
			ctx.restore();
		}

		// искры несут цвет рисунка: мокрое пятно и точка туши
		for (const s of cur.sparks) {
			const q = P(s);
			const fade = clamp((cur.time - s.born) / 1.2, 0, 1);
			const tw = 0.85 + 0.15 * Math.sin(t * 2 + s.ph);
			bloom(ctx, q.x, q.y, (s.big ? 26 : 16) * k * tw, hsl(hue, 60, 66), 0.55 * fade, 'multiply');
			ctx.fillStyle = PAL.ink;
			ctx.globalAlpha = 0.85 * fade;
			ctx.beginPath();
			ctx.arc(q.x, q.y, (s.big ? 2.8 : 1.9) * k, 0, TAU);
			ctx.fill();
			ctx.globalAlpha = 1;
		}

		// зов — тонкое кольцо туши, расходящееся по воде
		const since = cur.time - cur.callAt;
		if (since < 1.1) {
			const q = since / 1.1;
			const head = P(cur);
			ctx.strokeStyle = PAL.ink;
			ctx.globalAlpha = 0.35 * (1 - q);
			ctx.lineWidth = 1.2;
			ctx.beginPath();
			ctx.arc(head.x, head.y, 420 * u * (1 - Math.pow(1 - Math.min(1, q * 1.2), 3)), 0, TAU);
			ctx.stroke();
			ctx.globalAlpha = 1;
		}

		// тело: куски хвоста от головы к кончику (разрыв там, где змейка вынырнула с другой стороны)
		const subs: Pt[][] = [];
		let piece: Pt[] = [P(cur)];
		for (let i = cur.trail.length - 1; i >= 0; i--) {
			const p = cur.trail[i];
			piece.push(P(p));
			if (p.g) {
				subs.push(piece);
				piece = [];
			}
		}
		if (piece.length) subs.push(piece);
		drawCreature(ctx, subs, clamp(12 * k, 7, 16), cur.ang, waterSnake(hue), t, 0.5);
	}

	// ------------------------------------------------------------------ Полотно

	private bakeSheet(): { paper: HTMLCanvasElement; dots: HTMLCanvasElement } {
		const key = this.sizeKey;
		if (this.sheet?.key === key) return this.sheet;
		const { W, H } = this;
		const { canvas: pc, ctx } = layer(W, H, this.S);
		ctx.fillStyle = PAL.paper;
		ctx.fillRect(0, 0, W, H);
		const r = rng(31);
		for (let i = 0; i < 5; i++)
			bloom(
				ctx,
				r() * W,
				r() * H,
				(260 + r() * 200) * this.k,
				'rgb(196,182,150)',
				0.08,
				'multiply'
			);
		const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
		v.addColorStop(0, 'rgba(0,0,0,0)');
		v.addColorStop(1, 'rgba(120,100,70,0.22)');
		ctx.fillStyle = v;
		ctx.fillRect(0, 0, W, H);
		paper(ctx, W, H, 0.22, 'multiply', 31);
		const { canvas: dc, ctx: d } = layer(W, H, this.S);
		d.fillStyle = PAL.gridDot;
		const c = this.grid.cell;
		for (let x = 0; x < COLS; x++)
			for (let y = 0; y < ROWS; y++) {
				d.beginPath();
				d.arc(
					this.grid.x + (x + 0.5) * c,
					this.grid.y + (y + 0.5) * c,
					Math.max(0.8, c * 0.026),
					0,
					TAU
				);
				d.fill();
			}
		this.sheet = { key, paper: pc, dots: dc };
		return this.sheet;
	}

	/** Путь штриха по сетке со скруглёнными углами, в пикселях. */
	private strokePaths(pic: Picture): Pt[][] {
		const key = `${this.sizeKey}|${pic.id}`;
		if (this.paths?.key === key) return this.paths.list;
		const list = pic.strokes.map((s) =>
			roundCorners(
				s.cells.map((c) => this.cellPx(c)),
				this.grid.cell * 0.45
			)
		);
		this.paths = { key, list };
		return list;
	}

	/** Мокрый цвет вдоль линии: перекрывающиеся мягкие пятна. */
	private bleed(
		ctx: CanvasRenderingContext2D,
		pts: Pt[],
		color: string,
		size: number,
		a: number,
		seed: number
	): void {
		const r = rng(seed);
		for (const p of resample(pts, size * 0.85))
			bloom(
				ctx,
				p.x + r.gauss() * size * 0.15,
				p.y + r.gauss() * size * 0.15,
				size * (0.8 + r() * 0.5),
				color,
				a,
				'multiply'
			);
	}

	private inkStroke(ctx: CanvasRenderingContext2D, pts: Pt[], i: number, alpha = 0.9): void {
		const c = this.grid.cell;
		if (pts.length === 1) {
			ctx.fillStyle = PAL.ink;
			ctx.globalAlpha = alpha;
			ctx.beginPath();
			ctx.arc(pts[0].x, pts[0].y, c * 0.11, 0, TAU);
			ctx.fill();
			ctx.globalAlpha = 1;
			return;
		}
		brush(ctx, pts, c * 0.11, PAL.ink, { seed: 40 + i, alpha });
	}

	/** Слой туши: штрихи, которые уже отгорели (вместе с мокрым цветом под ними). */
	private bakeInk(f: FrameState, settled: number[]): HTMLCanvasElement {
		const key = `${this.sizeKey}|${f.picture.id}|${settled.join(',')}`;
		if (this.ink?.key === key) return this.ink.canvas;
		const { canvas, ctx } = layer(this.W, this.H, this.S);
		const paths = this.strokePaths(f.picture);
		const color = hsl(f.picture.hue, 55, 66);
		const c = this.grid.cell;
		for (const i of settled) this.bleed(ctx, paths[i], color, c * 0.7, 0.14, 70 + i);
		for (const i of settled) this.inkStroke(ctx, paths[i], i);
		this.ink = { key, canvas };
		return canvas;
	}

	private drawPond(f: FrameState, pond: Pond): void {
		const { ctx, W, H } = this;
		const c = this.grid.cell;
		const sheet = this.bakeSheet();
		const rev = f.mode === 'reveal' ? f.reveal : 0;
		const gridA = 1 - clamp(rev / 1.2, 0, 1);
		ctx.drawImage(sheet.paper, 0, 0, W, H);
		if (gridA > 0) {
			ctx.globalAlpha = gridA;
			ctx.drawImage(sheet.dots, 0, 0, W, H);
			ctx.globalAlpha = 1;
		}
		const head = this.pondHead(pond);
		if (f.mode === 'reveal') this.drawReveal(f);
		else this.drawStrokes(f, pond, head);

		// тело: путь по сетке со скруглёнными углами; через край — отдельными кусками
		const fade = f.mode === 'reveal' ? 1 - clamp(rev / 0.9, 0, 1) : 1;
		if (fade <= 0) return;
		const subs = this.pondPath(pond)
			.map((s) => roundCorners(s, c * 0.5).reverse())
			.reverse();
		const first = subs[0];
		if (first && first.length > 1) {
			const want = Math.atan2(first[0].y - first[1].y, first[0].x - first[1].x);
			if (this.pondAng === null) this.pondAng = want;
			const d = Math.atan2(Math.sin(want - this.pondAng), Math.cos(want - this.pondAng));
			this.pondAng += d * 0.3;
		}
		drawCreature(ctx, subs, c * 0.2, this.pondAng ?? 0, inkSnake(f.picture.hue), f.t, 0.25, fade);
	}

	private drawStrokes(f: FrameState, pond: Pond, head: Pt): void {
		const { ctx } = this;
		const c = this.grid.cell;
		const t = f.t;
		const color = hsl(f.picture.hue, 55, 66);
		const paths = this.strokePaths(f.picture);

		// ближайшие к голове точки сетки чуть темнее — легче целиться
		ctx.fillStyle = PAL.gridDot;
		const hx = Math.round((head.x - this.grid.x) / c - 0.5);
		const hy = Math.round((head.y - this.grid.y) / c - 0.5);
		for (let x = hx - 3; x <= hx + 3; x++)
			for (let y = hy - 3; y <= hy + 3; y++) {
				if (x < 0 || y < 0 || x >= COLS || y >= ROWS) continue;
				const p = this.cellPx({ x, y });
				ctx.globalAlpha = Math.exp(-((Math.hypot(p.x - head.x, p.y - head.y) / c) ** 2) / 4);
				ctx.beginPath();
				ctx.arc(p.x, p.y, Math.max(1, c * 0.035), 0, TAU);
				ctx.fill();
			}
		ctx.globalAlpha = 1;

		// отгоревшие штрихи — из готового слоя; свежие рисуются бегущим мазком
		const settled: number[] = [];
		const sweeping: number[] = [];
		for (const i of f.lit) {
			if (t - (f.litAt.get(i) ?? -99) < SWEEP) sweeping.push(i);
			else settled.push(i);
		}
		settled.sort((a, b) => a - b);
		ctx.drawImage(this.bakeInk(f, settled), 0, 0, this.W, this.H);
		const active = new Map(pond.strokes.map((s) => [s.id, s]));
		for (const i of sweeping) {
			const ps = active.get(i);
			const pts = ps?.rev ? [...paths[i]].reverse() : paths[i];
			const q = clamp((t - (f.litAt.get(i) ?? t)) / SWEEP, 0, 1);
			const shown = pts.slice(0, Math.max(1, Math.ceil(pts.length * ease(q))));
			this.bleed(ctx, shown, color, c * 0.7, 0.14 * q, 70 + i);
			this.inkStroke(ctx, shown, i);
		}

		// штрихи захода: карандашный пунктир, звёздочки на концах, пройденная часть — свежей тушью
		for (const ps of pond.strokes) {
			if (ps.lit) continue;
			const cells = ps.cells.map((p) => this.cellPx(p));
			ctx.save();
			ctx.strokeStyle = PAL.pencil;
			ctx.lineWidth = 1;
			ctx.setLineDash([Math.max(1, c * 0.035), c * 0.13]);
			ctx.lineCap = 'round';
			ctx.beginPath();
			cells.forEach((p, j) => (j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
			ctx.stroke();
			ctx.restore();
			if (ps.n > 0) {
				const seq = ps.rev ? [...ps.cells].reverse() : ps.cells;
				const done = roundCorners(
					seq.slice(0, ps.n).map((p) => this.cellPx(p)),
					c * 0.45
				);
				this.bleed(ctx, done, color, c * 0.6, 0.08, 90 + ps.id);
				if (done.length > 1) brush(ctx, done, c * 0.08, PAL.ink, { seed: 77 + ps.id, alpha: 0.55 });
			} else {
				const ends = cells.length === 1 ? [cells[0]] : [cells[0], cells[cells.length - 1]];
				for (const e of ends) {
					const near = clamp(1 - (Math.hypot(e.x - head.x, e.y - head.y) / c - 1) / 4, 0, 1);
					const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + e.x * 0.05);
					this.star(
						e.x,
						e.y,
						c * (0.15 + 0.05 * near + 0.015 * pulse),
						0.55 + 0.4 * near,
						e.y * 0.01
					);
				}
			}
		}

		// подсказки обводки: карандашный кружок на следующей клетке и уголок перед поворотом
		for (const e of pond.expected()) {
			const s = pond.strokes.find((q) => q.id === e.stroke);
			if (!s) continue;
			const q = this.cellPx(e.cell);
			const pulse = 0.5 + 0.5 * Math.sin(t * 5);
			ctx.strokeStyle = PAL.ink;
			ctx.globalAlpha = 0.25 + 0.25 * pulse;
			ctx.lineWidth = 1.1;
			ctx.beginPath();
			ctx.arc(q.x, q.y, c * 0.26, 0, TAU);
			ctx.stroke();
			ctx.globalAlpha = 1;
			const seq = s.rev ? [...s.cells].reverse() : s.cells;
			for (let j = s.n; j < Math.min(seq.length - 1, s.n + 2); j++) {
				const a = seq[j - 1];
				const b = seq[j];
				const n = seq[j + 1];
				if (b.x - a.x === n.x - b.x && b.y - a.y === n.y - b.y) continue;
				const turn = DIRS.findIndex(([dx, dy]) => dx === n.x - b.x && dy === n.y - b.y);
				if (turn < 0) break;
				const bp = this.cellPx(b);
				this.chevron(bp.x, bp.y, turn, c, 0.45 + 0.35 * pulse);
				break;
			}
		}
	}

	/** Звёздочка тушью на конце штриха. */
	private star(x: number, y: number, R: number, a: number, rot: number): void {
		const ctx = this.ctx;
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(rot);
		ctx.strokeStyle = PAL.ink;
		ctx.globalAlpha = Math.min(1, a);
		ctx.lineWidth = Math.max(1, R * 0.18);
		ctx.lineCap = 'round';
		for (let i = 0; i < 4; i++) {
			const ang = (i * Math.PI) / 4;
			const l = i % 2 ? R * 0.55 : R;
			ctx.beginPath();
			ctx.moveTo(-Math.cos(ang) * l, -Math.sin(ang) * l);
			ctx.lineTo(Math.cos(ang) * l, Math.sin(ang) * l);
			ctx.stroke();
		}
		ctx.restore();
	}

	private chevron(x: number, y: number, dir: number, c: number, a: number): void {
		const ctx = this.ctx;
		const [dx, dy] = DIRS[dir];
		const px = -dy;
		const py = dx;
		const s = c * 0.15;
		const ox = x + dx * c * 0.18;
		const oy = y + dy * c * 0.18;
		ctx.strokeStyle = PAL.ink;
		ctx.globalAlpha = a;
		ctx.lineWidth = Math.max(1.2, c * 0.04);
		ctx.lineCap = 'round';
		ctx.beginPath();
		ctx.moveTo(ox - dx * s + px * s, oy - dy * s + py * s);
		ctx.lineTo(ox, oy);
		ctx.lineTo(ox - dx * s - px * s, oy - dy * s - py * s);
		ctx.stroke();
		ctx.globalAlpha = 1;
	}

	/** Цвет готового рисунка: мокрые пятна вдоль гладких линий, рисуется один раз. */
	private bakeTint(f: FrameState): HTMLCanvasElement {
		const key = `${this.sizeKey}|${f.picture.id}`;
		if (this.tint?.key === key) return this.tint.canvas;
		const { canvas, ctx } = layer(this.W, this.H, this.S);
		const c = this.grid.cell;
		const hue = f.picture.hue;
		const toPx = (p: Pt): Pt => ({ x: this.grid.x + p.x * c, y: this.grid.y + p.y * c });
		f.picture.strokes.forEach((_, i) => {
			const pts = f.shapes[i].smooth.map(toPx);
			this.bleed(ctx, pts, hsl(hue + (i % 3) * 6 - 6, 50, 64), c * 1.1, 0.12, 200 + i);
		});
		this.tint = { key, canvas };
		return canvas;
	}

	/** Оживление: сетка гаснет, ступеньки перетекают в гладкие линии, разливается цвет, рисунок дышит. */
	private drawReveal(f: FrameState): void {
		const { ctx } = this;
		const c = this.grid.cell;
		const r = f.reveal;
		const k = ease((r - 0.8) / 2.6);
		const alive = clamp((r - 3.4) / 1.5, 0, 1);
		const t = f.t;
		const toPx = (p: Pt): Pt => {
			const sx = Math.sin(t * 1.3 + p.y * 0.45) * 0.12 * alive;
			const sy = Math.sin(t * 1.05 + p.x * 0.35) * 0.08 * alive;
			return { x: this.grid.x + (p.x + sx) * c, y: this.grid.y + (p.y + sy) * c };
		};
		ctx.globalAlpha = k;
		ctx.drawImage(this.bakeTint(f), 0, 0, this.W, this.H);
		ctx.globalAlpha = 1;
		f.picture.strokes.forEach((s, i) => {
			const sh = f.shapes[i];
			if (s.cells.length === 1) {
				this.inkStroke(ctx, [toPx(sh.raw[0])], i, 0.95);
				return;
			}
			const pts = morph(sh, 0.12 + 0.88 * k).map(toPx);
			brush(ctx, pts, c * (0.11 + 0.02 * k), PAL.ink, { seed: 60 + i, alpha: 0.92 });
		});
	}

	// ------------------------------------------------------------------ змейка на сетке

	private pondHead(pond: Pond): Pt {
		const a = this.cellPx(pond.head);
		if (pond.next.w) return a;
		const b = this.cellPx(pond.next);
		return { x: a.x + (b.x - a.x) * pond.t, y: a.y + (b.y - a.y) * pond.t };
	}

	/** Путь тела на Полотне в пикселях (от хвоста к голове), с разрывами там, где змейка прошла через край. */
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
		const lerp = (A: Pt, B: Pt, q: number): Pt => ({
			x: A.x + (B.x - A.x) * q,
			y: A.y + (B.y - A.y) * q
		});
		for (let i = 0; i < n; i++) {
			const a = seq[i];
			const b = seq[i + 1];
			const A = this.cellPx(a);
			const B = this.cellPx(b);
			const f0 = i === 0 ? t : 0;
			const f1 = i === n - 1 ? t : 1;
			if (a.x === b.x && a.y === b.y) {
				add(A);
				continue;
			}
			if (!b.w) {
				add(lerp(A, B, f0));
				add(lerp(A, B, f1));
				continue;
			}
			// шаг через край: первая половина уходит за край, вторая выходит с другой стороны
			const dx = -Math.sign(b.x - a.x);
			const dy = -Math.sign(b.y - a.y);
			const out = (q: number): Pt => ({ x: A.x + dx * c * q, y: A.y + dy * c * q });
			const back = (q: number): Pt => ({ x: B.x - dx * c * (1 - q), y: B.y - dy * c * (1 - q) });
			if (f0 < 0.5) {
				add(out(f0));
				if (f1 <= 0.5) add(out(f1));
				else {
					add(out(0.5));
					subs.push(cur);
					cur = [];
					add(back(0.5));
					add(back(f1));
				}
			} else {
				if (cur.length) {
					subs.push(cur);
					cur = [];
				}
				add(back(f0));
				add(back(f1));
			}
		}
		if (cur.length) subs.push(cur);
		return subs.filter((s) => s.length > 1);
	}

	// ------------------------------------------------------------------ эффекты

	private drawFx(f: FrameState): void {
		const { ctx } = this;
		const fx = f.fx;
		for (const e of fx.portals) {
			if (!e.ring || e.t <= 0) continue;
			const grow = 1 - Math.pow(1 - clamp(e.t / 0.3, 0, 1), 3);
			const fade = 1 - ease((e.t - 0.25) / (e.dur - 0.25));
			const ry = e.size * (0.45 + grow * 1.05);
			const rx = e.size * (0.12 + grow * 0.22);
			ctx.save();
			ctx.translate(e.x, e.y);
			ctx.rotate(Math.atan2(e.dy, e.dx));
			ctx.strokeStyle = PAL.ink;
			for (let i = 0; i < 2; i++) {
				ctx.globalAlpha = fade * (0.55 - i * 0.25);
				ctx.lineWidth = 1.6 - i * 0.6;
				ctx.beginPath();
				ctx.ellipse(0, 0, rx * (1 - i * 0.25), ry * (1 - i * 0.22), 0, 0, TAU);
				ctx.stroke();
			}
			ctx.restore();
		}
		for (const p of fx.parts) {
			const a = clamp(p.life / p.max, 0, 1);
			bloom(ctx, p.x, p.y, p.size * (0.6 + a), hsl(p.hue, 55, 62), a * 0.5, 'multiply');
		}
	}
}
