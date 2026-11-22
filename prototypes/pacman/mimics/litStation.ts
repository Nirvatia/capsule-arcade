// A lit, working station (prototype, DESIGN.md §7a rethought): the same maze and the same bake
// helpers as the quarantine lab (`render/station/stationPaint`), painted clean: pale panelled
// walls with a teal safety edge, cool grey deck plates, a viewport onto a planet, the nest turned
// into a stasis chamber. The strangeness is live: ceiling lamps drift from white to violet, the
// wall monitors open eyes that follow the hero, the stasis tanks fill with copies of him. Food is
// energy capsules, the energizers are power cells.
import type { GridMatrix } from '../../../src/games/pacman/config/gridConfig';
import { blur, fbm, rng } from '../../../src/games/pacman/render/doom/fleshNoise';
import {
	FRAME,
	MX,
	MY,
	T,
	fill,
	floorMask,
	isFloor,
	isWall,
	layer,
	minus,
	morph,
	paintInto,
	put,
	setBakeScale,
	sk,
	stationLamps,
	wallMask
} from '../../../src/games/pacman/render/station/stationPaint';
import type { Lamp } from '../../../src/games/pacman/render/station/stationPaint';

const TAU = Math.PI * 2;
/** The part of the scene on screen: the maze and a margin of the station round it. */
const VIEW = { x: MX - 250, y: MY - 62, w: 25 * T + 500, h: 27 * T + 124 };

export interface Layout {
	tileSize: number;
	offsetX: number;
	offsetY: number;
}
export interface Monitor {
	x: number;
	y: number;
	/** 0..1: how strange the station must be before this screen opens its eye. */
	thresh: number;
}

const mixRgb = (a: readonly number[], b: readonly number[], k: number): string =>
	`rgb(${Math.round(a[0] + (b[0] - a[0]) * k)},${Math.round(a[1] + (b[1] - a[1]) * k)},${Math.round(a[2] + (b[2] - a[2]) * k)})`;

function window_(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number): void {
	const r = rng(seed);
	c.fillStyle = '#26333e';
	c.beginPath();
	c.roundRect(x - 14, y - 14, w + 28, h + 28, 26);
	c.fill();
	c.save();
	c.beginPath();
	c.roundRect(x, y, w, h, 16);
	c.clip();
	const sky = c.createLinearGradient(0, y, 0, y + h);
	sky.addColorStop(0, '#04060f');
	sky.addColorStop(1, '#0b1233');
	c.fillStyle = sky;
	c.fillRect(x, y, w, h);
	for (let i = 0; i < 140; i += 1) {
		c.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.7})`;
		const s = r() < 0.1 ? 1.8 : 0.9;
		c.fillRect(x + r() * w, y + r() * h, s, s);
	}
	// the planet's limb, violet and teal
	const px = x + w * (seed % 2 ? 0.2 : 0.8);
	const py = y + h * 1.05;
	const pg = c.createRadialGradient(px, py - 90, 40, px, py, 420);
	pg.addColorStop(0, '#6b4bd8');
	pg.addColorStop(0.7, '#2a1f6a');
	pg.addColorStop(1, '#0a0a24');
	c.fillStyle = pg;
	c.beginPath();
	c.arc(px, py, 400, 0, TAU);
	c.fill();
	c.strokeStyle = 'rgba(110,255,225,.55)';
	c.lineWidth = 3;
	c.beginPath();
	c.arc(px, py, 400, Math.PI * 1.15, Math.PI * 1.85);
	c.stroke();
	// glass glints
	c.strokeStyle = 'rgba(200,230,255,.08)';
	c.lineWidth = 14;
	for (const k of [0.25, 0.4]) {
		c.beginPath();
		c.moveTo(x + w * k, y);
		c.lineTo(x + w * (k - 0.35), y + h);
		c.stroke();
	}
	c.restore();
	c.strokeStyle = '#4b6070';
	c.lineWidth = 3;
	c.beginPath();
	c.roundRect(x, y, w, h, 16);
	c.stroke();
}

function paintSurround(c: CanvasRenderingContext2D): void {
	const r = rng(5);
	c.fillStyle = '#0c131a';
	c.fillRect(0, 0, FRAME.w, FRAME.h);
	for (let y = 0; y < FRAME.h; y += 70) {
		for (let x = 0; x < FRAME.w; x += 110) {
			const n = fbm(x / 260, y / 260);
			c.fillStyle = `rgb(${16 + n * 14},${25 + n * 16},${34 + n * 18})`;
			c.fillRect(x + 1, y + 1, 108, 68);
			c.fillStyle = 'rgba(130,170,200,.07)';
			c.fillRect(x + 1, y + 1, 108, 1);
			c.fillStyle = 'rgba(0,0,0,.35)';
			for (const [bx, by] of [[6, 6], [102, 6], [6, 62], [102, 62]]) {
				c.beginPath();
				c.arc(x + bx, y + by, 1.6, 0, TAU);
				c.fill();
			}
		}
	}
	// light strips and a console row under each window
	for (const y of [40, 1050]) {
		c.fillStyle = 'rgba(110,255,225,.5)';
		c.fillRect(120, y, FRAME.w - 240, 4);
	}
	window_(c, 70, 190, 360, 560, 1);
	window_(c, 1470, 190, 360, 560, 2);
	for (const x0 of [70, 1470]) {
		for (let i = 0; i < 9; i += 1) {
			c.fillStyle = r() < 0.7 ? 'rgba(110,255,225,.7)' : 'rgba(255,170,70,.7)';
			c.fillRect(x0 + i * 40, 800, 26, 8);
		}
		c.fillStyle = '#18232c';
		c.fillRect(x0, 830, 360, 90);
		c.fillStyle = 'rgba(110,255,225,.12)';
		c.fillRect(x0 + 10, 840, 340, 70);
	}
}

function paintDeck(c: CanvasRenderingContext2D): void {
	c.fillStyle = '#18232c';
	c.beginPath();
	c.roundRect(MX - 22, MY - 22, 25 * T + 44, 27 * T + 44, 16);
	c.fill();
	// a hazard border and a thin teal trim
	c.save();
	c.setLineDash([14, 14]);
	c.lineWidth = 7;
	c.strokeStyle = '#d8b400';
	c.beginPath();
	c.roundRect(MX - 15, MY - 15, 25 * T + 30, 27 * T + 30, 12);
	c.stroke();
	c.lineDashOffset = 14;
	c.strokeStyle = '#10181e';
	c.stroke();
	c.restore();
	c.fillStyle = '#202d37';
	c.beginPath();
	c.roundRect(MX - 6, MY - 6, 25 * T + 12, 27 * T + 12, 8);
	c.fill();
}

function paintFloor(c: CanvasRenderingContext2D, g: GridMatrix): void {
	const r = rng(9);
	const mask = floorMask(g, (x, y) => isFloor(g, x, y));
	put(
		c,
		paintInto(mask, (p) => {
			for (let y = 0; y < g.length; y += 1) {
				for (let x = 0; x < (g[0]?.length ?? 0); x += 1) {
					if (!isFloor(g, x, y)) continue;
					const px = MX + x * T;
					const py = MY + y * T;
					const n = fbm(x / 3.1, y / 3.1);
					p.fillStyle = `rgb(${74 + n * 20},${90 + n * 20},${106 + n * 20})`;
					p.fillRect(px, py, T, T);
					p.fillStyle = 'rgba(230,240,248,.22)';
					p.fillRect(px, py, T, 1);
					p.fillRect(px, py, 1, T);
					p.fillStyle = 'rgba(14,26,36,.6)';
					p.fillRect(px + T - 1, py, 1, T);
					p.fillRect(px, py + T - 1, T, 1);
					p.strokeStyle = 'rgba(0,0,0,.14)';
					p.strokeRect(px + 3.5, py + 3.5, T - 7, T - 7);
					p.fillStyle = 'rgba(0,0,0,.25)';
					for (const [bx, by] of [[5, 5], [T - 5, 5], [5, T - 5], [T - 5, T - 5]]) {
						p.beginPath();
						p.arc(px + bx, py + by, 1, 0, TAU);
						p.fill();
					}
					const h = isFloor(g, x - 1, y) && isFloor(g, x + 1, y);
					const v = isFloor(g, x, y - 1) && isFloor(g, x, y + 1);
					if ((h !== v) && (x + y) % 2 === 0) {
						p.fillStyle = 'rgba(120,244,226,.38)';
						if (h) p.fillRect(px + 7, py + T / 2 - 1, T - 14, 2);
						else p.fillRect(px + T / 2 - 1, py + 7, 2, T - 14);
					}
					if (r() < 0.1) {
						p.strokeStyle = 'rgba(30,44,56,.25)';
						p.beginPath();
						p.moveTo(px + r() * T, py + r() * T);
						p.lineTo(px + r() * T, py + r() * T);
						p.stroke();
					}
				}
			}
		})
	);
}

function paintWalls(c: CanvasRenderingContext2D, ed: CanvasRenderingContext2D, g: GridMatrix): Monitor[] {
	const r = rng(231);
	const mask = wallMask(g, 0);
	// the screens: a few wall faces, kept apart
	const monitors: Monitor[] = [];
	const cand: Array<[number, number]> = [];
	for (let y = 2; y < g.length - 2; y += 1) {
		for (let x = 2; x < (g[0]?.length ?? 0) - 2; x += 1) if (isWall(g, x, y)) cand.push([x, y]);
	}
	for (let i = cand.length - 1; i > 0; i -= 1) {
		const j = Math.floor(r() * (i + 1));
		[cand[i], cand[j]] = [cand[j], cand[i]];
	}
	for (const [x, y] of cand) {
		if (monitors.length >= 16) break;
		if (monitors.every((m) => Math.hypot(m.x - x, m.y - y) >= 4)) monitors.push({ x, y, thresh: r() });
	}
	const isMon = (x: number, y: number) => monitors.some((m) => m.x === x && m.y === y);
	const shadow = blur(wallMask(g, 4), 4, true);
	put(c, paintInto(shadow, fill('rgba(4,12,18,.7)')), 4, 6);
	put(c, paintInto(morph(mask, 2.4, true), fill('#0a1a22')));
	put(
		c,
		paintInto(mask, (p) => {
			const gr = p.createLinearGradient(MX, MY, MX + 25 * T, MY + 27 * T);
			gr.addColorStop(0, '#e9f0f4');
			gr.addColorStop(1, '#b3c2cc');
			p.fillStyle = gr;
			p.fillRect(0, 0, FRAME.w, FRAME.h);
			for (let y = 0; y < g.length; y += 1) {
				for (let x = 0; x < (g[0]?.length ?? 0); x += 1) {
					if (!isWall(g, x, y)) continue;
					const px = MX + x * T;
					const py = MY + y * T;
					const n = fbm(x / 2.7, y / 2.7);
					p.fillStyle = n < 0.5 ? `rgba(30,50,65,${(0.5 - n) * 0.2})` : `rgba(255,255,255,${(n - 0.5) * 0.25})`;
					p.fillRect(px, py, T, T);
					p.fillStyle = 'rgba(40,62,78,.5)';
					p.fillRect(px + 4, py + 4, T - 8, T - 8);
					const fg = p.createLinearGradient(px, py, px + T, py + T);
					fg.addColorStop(0, 'rgba(240,246,250,.96)');
					fg.addColorStop(1, 'rgba(196,208,217,.96)');
					p.fillStyle = fg;
					p.fillRect(px + 5.5, py + 5.5, T - 11, T - 11);
					p.fillStyle = 'rgba(255,255,255,.6)';
					p.fillRect(px + 5.5, py + 5.5, T - 11, 1);
					p.fillRect(px + 5.5, py + 5.5, 1, T - 11);
					p.fillStyle = 'rgba(30,50,65,.7)';
					if (isWall(g, x + 1, y)) p.fillRect(px + T - 1, py, 2, T);
					if (isWall(g, x, y + 1)) p.fillRect(px, py + T - 1, T, 2);
					if (isMon(x, y)) {
						p.fillStyle = '#2b3b46';
						p.fillRect(px + 3, py + 6, T - 6, T - 12);
						p.fillStyle = '#05090d';
						p.fillRect(px + 4, py + 7, T - 8, T - 14);
						continue;
					}
					const k = r();
					if (k < 0.18) {
						p.fillStyle = '#27cdb8';
						p.fillRect(px + 8, py + T / 2 - 1.5, T - 16, 3);
					} else if (k < 0.28) {
						p.save();
						p.font = '700 11px "Arial Narrow", Arial, sans-serif';
						p.textAlign = 'center';
						p.textBaseline = 'middle';
						p.fillStyle = 'rgba(60,84,100,.6)';
						p.fillText(String(10 + Math.floor(r() * 80)), px + T / 2, py + T / 2 + 1);
						p.restore();
					} else if (k < 0.36) {
						p.fillStyle = 'rgba(40,62,78,.55)';
						for (let s = 0; s < 3; s += 1) p.fillRect(px + 8, py + 9 + s * 5, T - 16, 2);
					}
				}
			}
		})
	);
	const rim = minus(morph(mask, 0.5, false), morph(mask, 1.9, false));
	put(ed, paintInto(rim, fill('#a8f6ea')));
	return monitors;
}

/** The nest becomes a stasis chamber: cols 10..14, rows 11..14 of this maze. */
export const CHAMBER = { x: 10, y: 11, w: 5, h: 4 };

function paintChamber(c: CanvasRenderingContext2D): void {
	const x = MX + CHAMBER.x * T;
	const y = MY + CHAMBER.y * T;
	const w = CHAMBER.w * T;
	const h = CHAMBER.h * T;
	const g = c.createLinearGradient(x, y, x, y + h);
	g.addColorStop(0, '#0e2a33');
	g.addColorStop(1, '#16414d');
	c.fillStyle = g;
	c.fillRect(x, y, w, h);
	c.strokeStyle = 'rgba(120,244,226,.12)';
	c.lineWidth = 1;
	for (let i = 1; i < CHAMBER.w * 2; i += 1) {
		c.beginPath();
		c.moveTo(x + (i * T) / 2, y);
		c.lineTo(x + (i * T) / 2, y + h);
		c.stroke();
	}
	// the sliding door of the chamber (the lair's gate, three tiles wide)
	for (let i = 0; i < 3; i += 1) {
		const dx = MX + (11 + i) * T;
		c.fillStyle = '#c4d2da';
		c.fillRect(dx + 2, y, T - 4, T - 6);
		c.fillStyle = '#27cdb8';
		c.fillRect(dx + T / 2 - 1, y + 4, 2, T - 14);
	}
	c.strokeStyle = '#6f8594';
	c.lineWidth = 3;
	c.strokeRect(x, y, w, h);
}

export class LitWorld {
	layout: Layout = { tileSize: 0, offsetX: 0, offsetY: 0 };
	monitors: Monitor[] = [];
	lamps: Lamp[] = [];
	private base: HTMLCanvasElement | null = null;
	private edge: HTMLCanvasElement | null = null;
	private k = 0;
	private s = 1;
	private ox = 0;
	private oy = 0;
	private chip: HTMLCanvasElement | null = null;
	private chipFor = 0;

	constructor(private readonly grid: GridMatrix) {}

	resize(vw: number, vh: number, dpr: number): void {
		const s = Math.min(vw / VIEW.w, vh / VIEW.h);
		this.s = s;
		this.ox = (vw - VIEW.w * s) / 2 - VIEW.x * s;
		this.oy = (vh - VIEW.h * s) / 2 - VIEW.y * s;
		this.layout = { tileSize: T * s, offsetX: this.ox + MX * s, offsetY: this.oy + MY * s };
		const k = Math.min(2, Math.max(0.75, s * dpr));
		if (!this.base || Math.abs(k - this.k) > 0.2) this.bake(k);
	}

	private bake(k: number): void {
		setBakeScale(k);
		const [base, c] = layer();
		const [edge, ed] = layer();
		const g = this.grid;
		paintSurround(c);
		paintDeck(c);
		paintFloor(c, g);
		paintChamber(c);
		this.monitors = paintWalls(c, ed, g);
		this.lamps = stationLamps(g).filter((l) => l.kind === 'ceiling');
		this.base = base;
		this.edge = edge;
		this.k = sk();
	}

	draw(ctx: CanvasRenderingContext2D, t: number): void {
		if (!this.base || !this.edge) return;
		ctx.drawImage(this.base, this.ox, this.oy, FRAME.w * this.s, FRAME.h * this.s);
		ctx.save();
		ctx.globalAlpha = 0.85 + 0.1 * Math.sin(t * 1.3);
		ctx.drawImage(this.edge, this.ox, this.oy, FRAME.w * this.s, FRAME.h * this.s);
		ctx.restore();
	}

	/** Ceiling lamps pool light on the deck; with strangeness they drift to violet and breathe. */
	drawLights(ctx: CanvasRenderingContext2D, t: number, strange: number): void {
		const { tileSize: S, offsetX, offsetY } = this.layout;
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		for (const l of this.lamps) {
			const x = offsetX + l.x * S;
			const y = offsetY + l.y * S;
			const breathe = 1 - strange * 0.3 * (0.5 + 0.5 * Math.sin(t * (0.5 + l.seed) + l.seed * 9));
			const col = mixRgb([170, 225, 255], [210, 110, 255], strange * (0.6 + 0.4 * l.seed));
			const g = ctx.createRadialGradient(x, y, 0, x, y, S * 3.6);
			g.addColorStop(0, col.replace('rgb', 'rgba').replace(')', `,${0.1 * breathe})`));
			g.addColorStop(1, col.replace('rgb', 'rgba').replace(')', ',0)'));
			ctx.fillStyle = g;
			ctx.fillRect(x - S * 3.6, y - S * 3.6, S * 7.2, S * 7.2);
		}
		ctx.restore();
	}

	private chipSprite(S: number): HTMLCanvasElement {
		if (this.chip && Math.abs(this.chipFor - S) < 0.5) return this.chip;
		const c = document.createElement('canvas');
		const n = Math.ceil(S * 1.2);
		c.width = n;
		c.height = n;
		const x = c.getContext('2d') as CanvasRenderingContext2D;
		x.translate(n / 2, n / 2);
		const g = x.createRadialGradient(0, 0, 0, 0, 0, S * 0.5);
		g.addColorStop(0, 'rgba(120,255,235,.28)');
		g.addColorStop(1, 'rgba(120,255,235,0)');
		x.fillStyle = g;
		x.fillRect(-n / 2, -n / 2, n, n);
		x.fillStyle = '#04181c';
		x.beginPath();
		x.roundRect(-S * 0.15, -S * 0.095, S * 0.3, S * 0.19, S * 0.095);
		x.fill();
		x.fillStyle = '#b6fff2';
		x.beginPath();
		x.roundRect(-S * 0.1, -S * 0.045, S * 0.2, S * 0.09, S * 0.045);
		x.fill();
		this.chip = c;
		this.chipFor = S;
		return c;
	}

	/** Energy capsules for food. */
	drawChips(ctx: CanvasRenderingContext2D, taken: (x: number, y: number) => boolean): void {
		const { tileSize: S, offsetX, offsetY } = this.layout;
		const sp = this.chipSprite(S);
		for (let y = 0; y < this.grid.length; y += 1) {
			for (let x = 0; x < (this.grid[0]?.length ?? 0); x += 1) {
				if (this.grid[y][x] !== 'DT' || taken(x, y)) continue;
				ctx.drawImage(sp, offsetX + (x + 0.5) * S - sp.width / 2, offsetY + (y + 0.5) * S - sp.height / 2);
			}
		}
	}

	/** Power cells for the energizers: a canister seen from above, its core pulsing slowly. */
	drawCells(ctx: CanvasRenderingContext2D, taken: (x: number, y: number) => boolean, t: number): void {
		const { tileSize: S, offsetX, offsetY } = this.layout;
		for (let y = 0; y < this.grid.length; y += 1) {
			for (let x = 0; x < (this.grid[0]?.length ?? 0); x += 1) {
				if (this.grid[y][x] !== 'EU' || taken(x, y)) continue;
				const cx = offsetX + (x + 0.5) * S;
				const cy = offsetY + (y + 0.5) * S;
				const p = 0.5 + 0.5 * Math.sin(t * 1.6 + x);
				ctx.save();
				ctx.globalCompositeOperation = 'lighter';
				const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 1.2);
				g.addColorStop(0, `rgba(120,255,235,${0.35 + 0.2 * p})`);
				g.addColorStop(1, 'rgba(120,255,235,0)');
				ctx.fillStyle = g;
				ctx.fillRect(cx - S * 1.2, cy - S * 1.2, S * 2.4, S * 2.4);
				ctx.restore();
				ctx.fillStyle = '#1a2730';
				ctx.beginPath();
				ctx.arc(cx, cy, S * 0.36, 0, TAU);
				ctx.fill();
				ctx.strokeStyle = '#8fa4b2';
				ctx.lineWidth = Math.max(1, S * 0.05);
				ctx.stroke();
				ctx.fillStyle = `rgba(150,255,240,${0.7 + 0.3 * p})`;
				ctx.beginPath();
				ctx.arc(cx, cy, S * (0.17 + 0.03 * p), 0, TAU);
				ctx.fill();
				ctx.strokeStyle = 'rgba(255,255,255,.55)';
				ctx.lineWidth = Math.max(1, S * 0.03);
				for (let i = 0; i < 4; i += 1) {
					const a = (i / 4) * TAU + Math.PI / 4;
					ctx.beginPath();
					ctx.moveTo(cx + Math.cos(a) * S * 0.26, cy + Math.sin(a) * S * 0.26);
					ctx.lineTo(cx + Math.cos(a) * S * 0.33, cy + Math.sin(a) * S * 0.33);
					ctx.stroke();
				}
			}
		}
	}

	/** The wall screens: calm bars while the station is itself, a watching eye as it turns strange. */
	drawMonitors(ctx: CanvasRenderingContext2D, t: number, strange: number, target: { x: number; y: number }): void {
		const { tileSize: S, offsetX, offsetY } = this.layout;
		for (const m of this.monitors) {
			const sx = offsetX + m.x * S + S * 0.14;
			const sy = offsetY + m.y * S + S * 0.22;
			const sw = S * 0.72;
			const sh = S * 0.56;
			const open = Math.max(0, Math.min(1, strange * 1.7 - m.thresh * 0.9));
			ctx.save();
			ctx.beginPath();
			ctx.rect(sx, sy, sw, sh);
			ctx.clip();
			ctx.fillStyle = '#05090d';
			ctx.fillRect(sx, sy, sw, sh);
			if (open < 0.05) {
				for (let i = 0; i < 3; i += 1) {
					const l = 0.25 + 0.6 * (0.5 + 0.5 * Math.sin(t * (0.6 + i * 0.3) + m.x * 3 + i));
					ctx.fillStyle = 'rgba(110,255,225,.75)';
					ctx.fillRect(sx + sw * 0.1, sy + sh * (0.2 + i * 0.25), sw * 0.8 * l, sh * 0.1);
				}
			} else {
				const cx = sx + sw / 2;
				const cy = sy + sh / 2;
				const dx = target.x - (m.x + 0.5);
				const dy = target.y - (m.y + 0.5);
				const d = Math.hypot(dx, dy) || 1;
				const ix = (dx / d) * sw * 0.12;
				const iy = (dy / d) * sh * 0.14;
				const eh = sh * 0.38 * open;
				ctx.fillStyle = 'rgba(210,120,255,.18)';
				ctx.fillRect(sx, sy, sw, sh);
				ctx.beginPath();
				ctx.moveTo(cx - sw * 0.42, cy);
				ctx.quadraticCurveTo(cx, cy - eh * 2, cx + sw * 0.42, cy);
				ctx.quadraticCurveTo(cx, cy + eh * 2, cx - sw * 0.42, cy);
				ctx.fillStyle = '#e8f6ff';
				ctx.fill();
				ctx.save();
				ctx.clip();
				ctx.fillStyle = '#8a4dff';
				ctx.beginPath();
				ctx.arc(cx + ix, cy + iy, sh * 0.3, 0, TAU);
				ctx.fill();
				ctx.fillStyle = '#05010c';
				ctx.beginPath();
				ctx.ellipse(cx + ix, cy + iy, sh * 0.05, sh * 0.25, 0, 0, TAU);
				ctx.fill();
				ctx.restore();
			}
			ctx.restore();
			ctx.fillStyle = `rgba(110,255,225,${open < 0.05 ? 0.12 : 0.3})`;
			ctx.fillRect(sx, sy, sw, 1);
		}
	}

	/** The stasis chamber: a glow, and `count` copies of the hero asleep in it. */
	drawChamber(ctx: CanvasRenderingContext2D, t: number, count: number, strange: number): void {
		const { tileSize: S, offsetX, offsetY } = this.layout;
		const x = offsetX + CHAMBER.x * S;
		const y = offsetY + CHAMBER.y * S;
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.fillStyle = `rgba(${Math.round(90 + 120 * strange)},${Math.round(255 - 110 * strange)},235,.07)`;
		ctx.fillRect(x, y + S, CHAMBER.w * S, (CHAMBER.h - 1) * S);
		ctx.restore();
		const n = Math.min(count, 6);
		for (let i = 0; i < n; i += 1) {
			const cx = x + (0.7 + (i % 3) * 1.8) * S;
			const cy = y + (1.7 + Math.floor(i / 3) * 1.4) * S + Math.sin(t * 0.8 + i) * S * 0.05;
			ctx.fillStyle = 'rgba(20,10,44,.9)';
			ctx.beginPath();
			ctx.arc(cx, cy, S * 0.34, 0, TAU);
			ctx.fill();
			ctx.strokeStyle = 'rgba(110,255,225,.8)';
			ctx.lineWidth = Math.max(1, S * 0.035);
			ctx.stroke();
			ctx.fillStyle = '#05010c';
			ctx.beginPath();
			ctx.moveTo(cx, cy);
			ctx.lineTo(cx + S * 0.34, cy - S * 0.18);
			ctx.lineTo(cx + S * 0.34, cy + S * 0.18);
			ctx.fill();
			ctx.fillStyle = '#7dffe6';
			ctx.beginPath();
			ctx.arc(cx - S * 0.04, cy - S * 0.15, S * 0.04, 0, TAU);
			ctx.fill();
		}
	}
}
