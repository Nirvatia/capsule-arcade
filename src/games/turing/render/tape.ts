// The tape: a rubber belt with sprocket holes and chunky paper tiles on it.
import { C, FONT_HEAD, FONT_MONO } from './palette';

export const BLANK = 'λ';
export const MARKERS = new Set(['a', 'b', 'x', '#']);

export interface TileLook {
	lit?: boolean; // under the head
	flash?: number; // 0..1, just written
	font?: 'mono' | 'head';
}

/** Tile height for a tile of width `s`. */
export const tileH = (s: number) => s * 1.12;

export function drawBelt(
	ctx: CanvasRenderingContext2D,
	x0: number,
	x1: number,
	y: number,
	s: number,
	shift: number
) {
	const pad = s * 0.26;
	const top = y - pad;
	const h = tileH(s) + pad * 2;
	const g = ctx.createLinearGradient(0, top, 0, top + h);
	g.addColorStop(0, '#1d2230');
	g.addColorStop(0.5, '#11151f');
	g.addColorStop(1, '#0b0e16');
	ctx.fillStyle = g;
	ctx.fillRect(x0, top, x1 - x0, h);
	ctx.fillStyle = 'rgba(190,200,220,.12)';
	ctx.fillRect(x0, top, x1 - x0, 1.5);
	ctx.fillStyle = 'rgba(0,0,0,.45)';
	ctx.fillRect(x0, top + h - 2, x1 - x0, 2);
	// sprocket holes, top and bottom rows
	const step = s * 0.5;
	const off = (((shift % step) + step) % step) - step;
	ctx.fillStyle = '#06080e';
	for (let x = x0 + off; x < x1 + step; x += step) {
		for (const hy of [top + pad * 0.45, top + h - pad * 0.45]) {
			ctx.beginPath();
			ctx.roundRect(x - s * 0.07, hy - s * 0.045, s * 0.14, s * 0.09, s * 0.04);
			ctx.fill();
		}
	}
}

export function drawSymbol(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	s: number,
	sym: string,
	font: 'mono' | 'head' = 'mono'
) {
	ctx.save();
	if (sym === '' || sym === BLANK) {
		ctx.fillStyle = C.paperEdge;
		ctx.globalAlpha = 0.55;
		ctx.beginPath();
		ctx.arc(cx, cy, s * 0.05, 0, Math.PI * 2);
		ctx.fill();
	} else if (sym === '|') {
		ctx.fillStyle = C.ink;
		ctx.beginPath();
		ctx.roundRect(cx - s * 0.075, cy - s * 0.29, s * 0.15, s * 0.58, s * 0.075);
		ctx.fill();
	} else if (sym === '*') {
		ctx.strokeStyle = C.ink;
		ctx.lineWidth = s * 0.11;
		ctx.lineCap = 'round';
		ctx.beginPath();
		for (let i = 0; i < 3; i++) {
			const a = (i * Math.PI) / 3 + Math.PI / 2;
			const r = s * 0.22;
			ctx.moveTo(cx - Math.cos(a) * r, cy - Math.sin(a) * r);
			ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
		}
		ctx.stroke();
	} else {
		const marker = MARKERS.has(sym);
		ctx.fillStyle = marker ? '#4b5fb5' : C.ink;
		const size = font === 'head' ? s * 0.5 : s * 0.6;
		ctx.font = `${font === 'head' ? 700 : 800} ${size}px ${font === 'head' ? FONT_HEAD : FONT_MONO}`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(sym, cx, cy + s * (font === 'head' ? 0.03 : 0.02));
		if (marker) {
			// markers wear a small violet underline so they never pass for answer symbols
			ctx.fillStyle = 'rgba(75,95,181,.35)';
			ctx.fillRect(cx - s * 0.22, cy + s * 0.3, s * 0.44, s * 0.05);
		}
	}
	ctx.restore();
}

export function drawTile(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	s: number,
	sym: string,
	look: TileLook = {}
) {
	const h = tileH(s);
	const depth = s * 0.12;
	const r = s * 0.16;
	ctx.save();
	// drop shadow on the belt
	ctx.fillStyle = 'rgba(0,0,0,.45)';
	ctx.beginPath();
	ctx.roundRect(x + s * 0.03, y + depth * 0.9, s, h, r);
	ctx.fill();
	if (look.lit) {
		ctx.shadowColor = C.sun;
		ctx.shadowBlur = s * 0.55;
	}
	// edge (depth)
	ctx.fillStyle = look.lit ? '#d8a92a' : C.paperLo;
	ctx.beginPath();
	ctx.roundRect(x, y + depth, s, h - depth, r);
	ctx.fill();
	ctx.shadowBlur = 0;
	// top face
	const g = ctx.createLinearGradient(0, y, 0, y + h - depth);
	if (look.lit) {
		g.addColorStop(0, '#fffbe6');
		g.addColorStop(1, '#ffe9a6');
	} else {
		g.addColorStop(0, C.paperHi);
		g.addColorStop(1, C.paper);
	}
	ctx.fillStyle = g;
	ctx.beginPath();
	ctx.roundRect(x, y, s, h - depth, r);
	ctx.fill();
	// paper grain: two faint ruling lines
	ctx.strokeStyle = 'rgba(168,152,122,.18)';
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(x + r, y + (h - depth) * 0.18);
	ctx.lineTo(x + s - r, y + (h - depth) * 0.18);
	ctx.stroke();
	if (look.flash) {
		ctx.globalAlpha = look.flash * 0.55;
		ctx.fillStyle = '#ffffff';
		ctx.beginPath();
		ctx.roundRect(x, y, s, h - depth, r);
		ctx.fill();
		ctx.globalAlpha = 1;
	}
	if (look.lit) {
		ctx.strokeStyle = C.sun;
		ctx.lineWidth = Math.max(2, s * 0.05);
		ctx.beginPath();
		ctx.roundRect(x - 1, y - 1, s + 2, h - depth + 2, r + 1);
		ctx.stroke();
	}
	ctx.restore();
	drawSymbol(ctx, x + s / 2, y + (h - depth) / 2, s, sym, look.font);
}

export interface TapeView {
	cells: string[];
	head: number;
	/** x of the left edge of cells[0] */
	x: number;
	y: number;
	size: number;
	flash?: { index: number; amount: number };
	font?: 'mono' | 'head';
}

/** Cell pitch (tile + gap). */
export const pitch = (s: number) => s * 1.1;

/** Draws the belt over the whole width and every tile that is on screen; blanks fill the rest. */
export function drawTape(ctx: CanvasRenderingContext2D, w: number, v: TapeView) {
	const p = pitch(v.size);
	drawBelt(ctx, 0, w, v.y, v.size, v.x);
	const first = Math.floor(-v.x / p) - 1;
	const last = Math.ceil((w - v.x) / p) + 1;
	for (let i = first; i <= last; i++) {
		const sym = v.cells[i] ?? BLANK;
		drawTile(ctx, v.x + i * p + (p - v.size) / 2, v.y, v.size, sym, {
			lit: i === v.head,
			flash: v.flash?.index === i ? v.flash.amount : 0,
			font: v.font
		});
	}
}
