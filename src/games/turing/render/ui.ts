// Canvas widgets of the play screen: panels, round icon buttons, stars, state chips, arrows,
// test lamps and the command board. Everything is drawn in the screen's logical pixels.
import { C, FONT_HEAD, FONT_HUD, FONT_MONO, U } from './palette';
import { drawTile, pitch } from './tape';

export type Icon = 'play' | 'pause' | 'step' | 'back' | 'reset' | 'home' | 'sound' | 'next';
export type Lamp = 'wait' | 'run' | 'ok' | 'bad';
export type Move = -1 | 0 | 1;

export interface Cmd {
	write: string;
	move: Move;
	next: number;
}

export interface Rect {
	x: number;
	y: number;
	w: number;
	h: number;
}

export function label(
	ctx: CanvasRenderingContext2D,
	s: string,
	x: number,
	y: number,
	o: {
		size?: number;
		weight?: number;
		font?: 'hud' | 'head' | 'mono';
		color?: string;
		align?: CanvasTextAlign;
	} = {}
) {
	const family = o.font === 'head' ? FONT_HEAD : o.font === 'mono' ? FONT_MONO : FONT_HUD;
	ctx.font = `${o.weight ?? 700} ${o.size ?? 16}px ${family}`;
	ctx.fillStyle = o.color ?? U.text;
	ctx.textAlign = o.align ?? 'left';
	ctx.textBaseline = 'middle';
	ctx.fillText(s, x, y);
}

export function panel(ctx: CanvasRenderingContext2D, r: Rect, radius = 20, fill: string = U.panel) {
	ctx.save();
	ctx.shadowColor = 'rgba(0,0,0,.5)';
	ctx.shadowBlur = 30;
	ctx.shadowOffsetY = 10;
	ctx.fillStyle = fill;
	ctx.beginPath();
	ctx.roundRect(r.x, r.y, r.w, r.h, radius);
	ctx.fill();
	ctx.restore();
	ctx.strokeStyle = U.line;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.roundRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1, radius);
	ctx.stroke();
	ctx.fillStyle = 'rgba(255,255,255,.04)';
	ctx.fillRect(r.x + radius, r.y + 1, r.w - radius * 2, 1);
}

export function drawIcon(
	ctx: CanvasRenderingContext2D,
	icon: Icon,
	cx: number,
	cy: number,
	s: number,
	color: string
) {
	ctx.save();
	ctx.fillStyle = color;
	ctx.strokeStyle = color;
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	ctx.lineWidth = s * 0.16;
	const tri = (x: number, dir: number, h: number) => {
		ctx.beginPath();
		ctx.moveTo(x - dir * h * 0.45, cy - h / 2);
		ctx.lineTo(x + dir * h * 0.5, cy);
		ctx.lineTo(x - dir * h * 0.45, cy + h / 2);
		ctx.closePath();
		ctx.fill();
	};
	if (icon === 'play' || icon === 'next') tri(cx + s * 0.06, 1, s * 0.9);
	else if (icon === 'pause') {
		ctx.fillRect(cx - s * 0.32, cy - s * 0.4, s * 0.22, s * 0.8);
		ctx.fillRect(cx + s * 0.1, cy - s * 0.4, s * 0.22, s * 0.8);
	} else if (icon === 'step') {
		tri(cx - s * 0.12, 1, s * 0.7);
		ctx.fillRect(cx + s * 0.28, cy - s * 0.35, s * 0.15, s * 0.7);
	} else if (icon === 'back') {
		tri(cx + s * 0.12, -1, s * 0.7);
		ctx.fillRect(cx - s * 0.43, cy - s * 0.35, s * 0.15, s * 0.7);
	} else if (icon === 'reset') {
		ctx.beginPath();
		ctx.arc(cx, cy, s * 0.36, -Math.PI * 0.3, Math.PI * 1.45);
		ctx.stroke();
		const a = -Math.PI * 0.3;
		const ax = cx + Math.cos(a) * s * 0.36;
		const ay = cy + Math.sin(a) * s * 0.36;
		ctx.beginPath();
		ctx.moveTo(ax + s * 0.2, ay - s * 0.06);
		ctx.lineTo(ax, ay);
		ctx.lineTo(ax - s * 0.02, ay - s * 0.24);
		ctx.stroke();
	} else if (icon === 'home') {
		ctx.beginPath();
		ctx.moveTo(cx + s * 0.15, cy - s * 0.32);
		ctx.lineTo(cx - s * 0.17, cy);
		ctx.lineTo(cx + s * 0.15, cy + s * 0.32);
		ctx.stroke();
	} else if (icon === 'sound') {
		ctx.beginPath();
		ctx.moveTo(cx - s * 0.42, cy - s * 0.15);
		ctx.lineTo(cx - s * 0.2, cy - s * 0.15);
		ctx.lineTo(cx + s * 0.05, cy - s * 0.38);
		ctx.lineTo(cx + s * 0.05, cy + s * 0.38);
		ctx.lineTo(cx - s * 0.2, cy + s * 0.15);
		ctx.lineTo(cx - s * 0.42, cy + s * 0.15);
		ctx.closePath();
		ctx.fill();
		ctx.lineWidth = s * 0.11;
		ctx.beginPath();
		ctx.arc(cx + s * 0.08, cy, s * 0.24, -0.9, 0.9);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(cx + s * 0.08, cy, s * 0.42, -0.9, 0.9);
		ctx.stroke();
	}
	ctx.restore();
}

export function roundButton(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	r: number,
	icon: Icon,
	o: { primary?: boolean; glow?: number } = {}
) {
	ctx.save();
	const depth = r * 0.12;
	ctx.fillStyle = o.primary ? '#a8321f' : '#0b0e15';
	ctx.beginPath();
	ctx.arc(cx, cy + depth, r, 0, Math.PI * 2);
	ctx.fill();
	if (o.primary) {
		ctx.shadowColor = U.accent;
		ctx.shadowBlur = 20 + (o.glow ?? 0) * 20;
	}
	const g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
	if (o.primary) {
		g.addColorStop(0, '#ff8f72');
		g.addColorStop(1, U.accent);
	} else {
		g.addColorStop(0, '#272e40');
		g.addColorStop(1, '#1b2130');
	}
	ctx.fillStyle = g;
	ctx.beginPath();
	ctx.arc(cx, cy, r, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
	drawIcon(ctx, icon, cx, cy, r * 0.75, o.primary ? '#2a0d06' : U.text);
}

function starPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
	ctx.beginPath();
	for (let i = 0; i < 10; i++) {
		const a = (i * Math.PI) / 5 - Math.PI / 2;
		const rr = i % 2 ? r * 0.48 : r;
		ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
	}
	ctx.closePath();
}

/** Three stars centred at cx; `filled` may be fractional for the fill-in animation. */
export function stars(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	r: number,
	filled: number
) {
	for (let i = 0; i < 3; i++) {
		const x = cx + (i - 1) * r * 2.5;
		const k = Math.max(0, Math.min(1, filled - i));
		const y = cy + (i === 1 ? -r * 0.3 : 0);
		starPath(ctx, x, y, r);
		ctx.fillStyle = '#0b0e15';
		ctx.fill();
		ctx.strokeStyle = U.dim;
		ctx.lineWidth = 2;
		ctx.stroke();
		if (k > 0) {
			ctx.save();
			ctx.shadowColor = U.now;
			ctx.shadowBlur = 16 * k;
			starPath(ctx, x, y, r * (0.6 + 0.4 * k));
			ctx.fillStyle = U.now;
			ctx.fill();
			ctx.restore();
		}
	}
}

export function stateChip(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	q: number,
	o: { active?: boolean; size?: number } = {}
) {
	const s = o.size ?? 1;
	const w = 58 * s;
	const h = 34 * s;
	const halt = q === 0;
	ctx.save();
	if (o.active) {
		ctx.shadowColor = U.now;
		ctx.shadowBlur = 16;
	}
	ctx.fillStyle = o.active ? U.now : halt ? '#173226' : '#262d3e';
	ctx.beginPath();
	ctx.roundRect(cx - w / 2, cy - h / 2, w, h, h / 2);
	ctx.fill();
	ctx.restore();
	const color = o.active ? '#2a2005' : halt ? U.ok : U.text;
	ctx.font = `800 ${17 * s}px ${FONT_MONO}`;
	ctx.fillStyle = color;
	ctx.textBaseline = 'middle';
	ctx.textAlign = 'right';
	ctx.fillText('q', cx + 1 * s, cy - 1 * s);
	ctx.font = `800 ${12 * s}px ${FONT_MONO}`;
	ctx.textAlign = 'left';
	ctx.fillText(String(q), cx + 2 * s, cy + 4 * s);
	if (halt) {
		// a tiny flag: q0 is where the machine stops
		ctx.fillStyle = color;
		ctx.fillRect(cx - 20 * s, cy - 9 * s, 2 * s, 18 * s);
		ctx.beginPath();
		ctx.moveTo(cx - 18 * s, cy - 9 * s);
		ctx.lineTo(cx - 9 * s, cy - 5.5 * s);
		ctx.lineTo(cx - 18 * s, cy - 2 * s);
		ctx.fill();
	}
}

/** ← · → : where the carriage goes after writing. */
export function moveGlyph(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	s: number,
	move: Move,
	color: string
) {
	ctx.save();
	ctx.strokeStyle = color;
	ctx.fillStyle = color;
	ctx.lineWidth = s * 0.14;
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	if (move === 0) {
		ctx.beginPath();
		ctx.arc(cx, cy, s * 0.14, 0, Math.PI * 2);
		ctx.fill();
	} else {
		const d = move;
		ctx.beginPath();
		ctx.moveTo(cx - d * s * 0.36, cy);
		ctx.lineTo(cx + d * s * 0.36, cy);
		ctx.moveTo(cx + d * s * 0.08, cy - s * 0.28);
		ctx.lineTo(cx + d * s * 0.38, cy);
		ctx.lineTo(cx + d * s * 0.08, cy + s * 0.28);
		ctx.stroke();
	}
	ctx.restore();
}

export function lamp(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	r: number,
	st: Lamp,
	t: number
) {
	const color = st === 'ok' ? U.ok : st === 'bad' ? U.bad : st === 'run' ? U.now : null;
	ctx.save();
	ctx.fillStyle = '#0b0e15';
	ctx.beginPath();
	ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
	ctx.fill();
	if (color) {
		ctx.shadowColor = color;
		ctx.shadowBlur = st === 'run' ? 8 + 6 * Math.sin(t * 8) : 12;
		ctx.fillStyle = color;
	} else ctx.fillStyle = '#2a3142';
	ctx.beginPath();
	ctx.arc(cx, cy, r, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
}

/** A row of small paper tiles (the goal card). Returns the drawn width. */
export function miniTape(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	s: number,
	str: string
) {
	const p = pitch(s);
	const cells = [...str];
	ctx.fillStyle = '#0b0e15';
	ctx.beginPath();
	ctx.roundRect(x - 6, y - 6, cells.length * p + 12 - (p - s), s * 1.12 + 12, 10);
	ctx.fill();
	cells.forEach((c, i) => drawTile(ctx, x + i * p, y, s, c));
	return cells.length * p - (p - s);
}

// ---------- the command board ----------

export interface BoardModel {
	states: number;
	symbols: string[];
	cells: Record<string, Cmd | undefined>;
	/** the cell the machine is executing now */
	active?: { q: number; sym: string };
	/** the cell open in the picker */
	editing?: { q: number; sym: string };
}

export const cellKey = (q: number, sym: string) => `${q}:${sym}`;

export interface BoardLayout {
	cell: (q: number, sym: string) => Rect;
	width: number;
}

const SYM_W = 58;
const COL_W = 200;
const GAP = 12;
const ROW_H = 60;
const HEAD_H = 46;

export function boardLayout(x: number, y: number, m: BoardModel): BoardLayout {
	const cx0 = x + SYM_W + 18;
	return {
		cell: (q, sym) => ({
			x: cx0 + (q - 1) * (COL_W + GAP),
			y: y + HEAD_H + m.symbols.indexOf(sym) * (ROW_H + 10),
			w: COL_W,
			h: ROW_H
		}),
		width: SYM_W + 18 + m.states * (COL_W + GAP) + 62
	};
}

function drawCmd(ctx: CanvasRenderingContext2D, r: Rect, c: Cmd, active: boolean) {
	const cy = r.y + r.h / 2;
	drawTile(ctx, r.x + 18, cy - 24, 40, c.write, { lit: false });
	moveGlyph(ctx, r.x + r.w / 2 - 4, cy, 34, c.move, active ? U.now : U.muted);
	stateChip(ctx, r.x + r.w - 46, cy, c.next, { size: 0.92 });
}

export function drawBoard(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	m: BoardModel,
	t: number
) {
	const L = boardLayout(x, y, m);
	// state headers
	for (let q = 1; q <= m.states; q++) {
		const r = L.cell(q, m.symbols[0]);
		stateChip(ctx, r.x + r.w / 2, y + 18, q, { active: m.active?.q === q, size: 1.05 });
	}
	const add = L.cell(m.states + 1, m.symbols[0]);
	ctx.strokeStyle = U.lineHi;
	ctx.setLineDash([5, 5]);
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.roundRect(add.x, y + 1, 50, 34, 17);
	ctx.stroke();
	ctx.setLineDash([]);
	label(ctx, '+', add.x + 25, y + 18, { size: 22, color: U.muted, align: 'center' });

	for (const sym of m.symbols) {
		const r0 = L.cell(1, sym);
		// row header: the symbol as a paper tile, lit when it is under the head
		const lit = m.active?.sym === sym;
		drawTile(ctx, x, r0.y + (ROW_H - 52 * 1.12) / 2, 52, sym, { lit });
		for (let q = 1; q <= m.states; q++) {
			const r = L.cell(q, sym);
			const c = m.cells[cellKey(q, sym)];
			const active = m.active?.q === q && m.active?.sym === sym;
			const editing = m.editing?.q === q && m.editing?.sym === sym;
			ctx.save();
			if (active) {
				ctx.shadowColor = U.now;
				ctx.shadowBlur = 18 + 6 * Math.sin(t * 6);
			}
			ctx.fillStyle = active ? '#2b2611' : c ? U.panelHi : U.socket;
			ctx.beginPath();
			ctx.roundRect(r.x, r.y, r.w, r.h, 14);
			ctx.fill();
			ctx.restore();
			if (active || editing) {
				ctx.strokeStyle = active ? U.now : U.text;
				ctx.lineWidth = 2.5;
				ctx.beginPath();
				ctx.roundRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2, 15);
				ctx.stroke();
			} else if (!c) {
				ctx.strokeStyle = U.line;
				ctx.setLineDash([6, 6]);
				ctx.lineWidth = 1.5;
				ctx.beginPath();
				ctx.roundRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2, 13);
				ctx.stroke();
				ctx.setLineDash([]);
			}
			if (c) drawCmd(ctx, r, c, active);
			else if (editing)
				label(ctx, '?', r.x + r.w / 2, r.y + r.h / 2, {
					size: 26,
					color: U.text,
					align: 'center',
					font: 'head'
				});
		}
	}
	return L;
}

/** The cell picker: three short rows — write, go, next state — over the cell being edited. */
export function drawPicker(
	ctx: CanvasRenderingContext2D,
	anchor: Rect,
	symbols: string[],
	states: number,
	sel: Partial<Cmd>
) {
	const w = 430;
	const h = 214;
	const x = Math.max(24, anchor.x + anchor.w / 2 - w / 2);
	const y = anchor.y - h - 16;
	panel(ctx, { x, y, w, h }, 18, '#1e2433');
	ctx.fillStyle = '#1e2433';
	ctx.beginPath();
	ctx.moveTo(anchor.x + anchor.w / 2 - 12, y + h - 1);
	ctx.lineTo(anchor.x + anchor.w / 2 + 12, y + h - 1);
	ctx.lineTo(anchor.x + anchor.w / 2, y + h + 12);
	ctx.closePath();
	ctx.fill();
	const rowY = [y + 40, y + 106, y + 170];
	const names = ['пиши', 'едь', 'потом'];
	names.forEach((n, i) =>
		label(ctx, n, x + 20, rowY[i], { size: 13, color: U.muted, weight: 600 })
	);
	const ox = x + 96;
	const ring = (cx: number, cy: number, rw: number, rh: number) => {
		ctx.strokeStyle = U.now;
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.roundRect(cx - rw / 2, cy - rh / 2, rw, rh, 12);
		ctx.stroke();
	};
	symbols.forEach((s, i) => {
		const cx = ox + 24 + i * 58;
		drawTile(ctx, cx - 22, rowY[0] - 26, 44, s);
		if (sel.write === s) ring(cx, rowY[0] - 1, 56, 62);
	});
	([-1, 0, 1] as Move[]).forEach((mv, i) => {
		const cx = ox + 24 + i * 58;
		ctx.fillStyle = '#272e40';
		ctx.beginPath();
		ctx.roundRect(cx - 24, rowY[1] - 22, 48, 44, 12);
		ctx.fill();
		moveGlyph(ctx, cx, rowY[1], 34, mv, U.text);
		if (sel.move === mv) ring(cx, rowY[1], 56, 52);
	});
	for (let q = 0; q <= states; q++) {
		const cx = ox + 30 + q * 74;
		stateChip(ctx, cx, rowY[2], q);
		if (sel.next === q) ring(cx, rowY[2], 72, 46);
	}
}

/** A paper speech bubble with a tail pointing at (tx, ty). */
export function bubble(
	ctx: CanvasRenderingContext2D,
	s: string,
	x: number,
	y: number,
	tx: number,
	ty: number
) {
	ctx.font = `600 18px ${FONT_HUD}`;
	const w = ctx.measureText(s).width + 36;
	const h = 48;
	ctx.save();
	ctx.shadowColor = 'rgba(0,0,0,.45)';
	ctx.shadowBlur = 20;
	ctx.fillStyle = C.paper;
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, 16);
	ctx.fill();
	ctx.restore();
	ctx.fillStyle = C.paper;
	ctx.beginPath();
	if (tx < x) {
		const by = Math.min(Math.max(ty, y + 14), y + h - 14);
		ctx.moveTo(x + 1, by - 9);
		ctx.lineTo(x + 1, by + 9);
	} else {
		const bx = Math.min(Math.max(tx, x + 24), x + w - 24);
		const by = ty > y ? y + h - 1 : y + 1;
		ctx.moveTo(bx - 10, by);
		ctx.lineTo(bx + 10, by);
	}
	ctx.lineTo(tx, ty);
	ctx.closePath();
	ctx.fill();
	label(ctx, s, x + 18, y + h / 2 + 1, { size: 18, weight: 600, color: C.ink });
	return w;
}
