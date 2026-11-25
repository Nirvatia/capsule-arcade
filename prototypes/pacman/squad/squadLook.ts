// Placeholder looks for the squad prototype (DESIGN.md §7a): the creatures as discs with eyes
// (their real look is the next step), the food as a plain energy capsule (the spores read too
// busy), the power cell, the escape's console, route lights, doors and hatch, the tells.
import type { GhostKind, GhostModel } from '../../../src/games/pacman/logic/actors/GhostModel';
import type { Door } from '../../../src/games/pacman/logic/station/StationEscape';

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;

export const KIND_COLOR: Record<GhostKind, string> = {
	BLINKY: '#ff6b5e',
	PINKY: '#ff9fe0',
	INKY: '#5fe3ff',
	CLYDE: '#ffbb4d'
};

/** The food breathes all together; a mimic is out of step (`phase` 0.5). */
export function breath(t: number, phase = 0): number {
	return 1 + 0.08 * Math.sin((t * 1.9 + phase) * TAU * 0.5);
}

const sprites = new Map<string, HTMLCanvasElement>();

function sprite(key: string, size: number, paint: (g: Ctx, c: number) => void): HTMLCanvasElement {
	let cv = sprites.get(key);
	if (!cv) {
		cv = document.createElement('canvas');
		cv.width = cv.height = Math.ceil(size);
		paint(cv.getContext('2d') as Ctx, size / 2);
		sprites.set(key, cv);
	}
	return cv;
}

/** An energy capsule: a small pill, a white-cyan core in a dark shell, a soft glow. */
export function drawCapsule(g: Ctx, x: number, y: number, S: number, scale: number, D: number): void {
	const n = S * 1.1 * D;
	const img = sprite(`cap:${Math.round(S * 10)}:${D}`, n, (c, m) => {
		c.translate(m, m);
		c.scale(D, D);
		const glow = c.createRadialGradient(0, 0, 0, 0, 0, S * 0.42);
		glow.addColorStop(0, 'rgba(140,255,236,0.32)');
		glow.addColorStop(1, 'rgba(140,255,236,0)');
		c.fillStyle = glow;
		c.fillRect(-S * 0.5, -S * 0.5, S, S);
		c.fillStyle = '#062226';
		c.beginPath();
		c.roundRect(-S * 0.15, -S * 0.085, S * 0.3, S * 0.17, S * 0.085);
		c.fill();
		c.fillStyle = '#c8fff5';
		c.beginPath();
		c.roundRect(-S * 0.105, -S * 0.045, S * 0.21, S * 0.09, S * 0.045);
		c.fill();
	});
	const w = (n / D) * scale;
	g.drawImage(img, x - w / 2, y - w / 2, w, w);
}

/** A power cell: a canister from above, its core breathing. */
export function drawCell(g: Ctx, x: number, y: number, S: number, scale: number): void {
	const r = S * 0.34 * scale;
	const glow = g.createRadialGradient(x, y, 0, x, y, r * 2.2);
	glow.addColorStop(0, 'rgba(255,214,110,0.4)');
	glow.addColorStop(1, 'rgba(255,214,110,0)');
	g.fillStyle = glow;
	g.fillRect(x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4);
	g.fillStyle = '#1b1c20';
	g.beginPath();
	g.arc(x, y, r, 0, TAU);
	g.fill();
	g.strokeStyle = '#8a8f98';
	g.lineWidth = S * 0.05;
	g.stroke();
	const core = g.createRadialGradient(x - r * 0.2, y - r * 0.2, 0, x, y, r * 0.7);
	core.addColorStop(0, '#fffbe0');
	core.addColorStop(0.5, '#ffd36a');
	core.addColorStop(1, '#c98a12');
	g.fillStyle = core;
	g.beginPath();
	g.arc(x, y, r * 0.62, 0, TAU);
	g.fill();
}

export interface CreatureLook {
	/** 0..1 how far it has faded (a mimic going). */
	fade: number;
	/** The tell: its eyes turn one colour with the others. */
	tell: boolean;
	/** A revealed mimic, harmless for a moment: it flickers. */
	harmless: boolean;
	powerLeft: number;
}

/** A creature (placeholder): a disc in its colour, two eyes looking where it goes. */
export function drawCreature(g: Ctx, ghost: GhostModel, x: number, y: number, S: number, t: number, look: CreatureLook): void {
	const state = ghost.state;
	const r = S * 0.42 * (1 - look.fade * 0.6);
	const alpha = (1 - look.fade) * (look.harmless ? 0.45 + 0.35 * Math.sin(t * 14) ** 2 : 1);
	g.save();
	g.globalAlpha = alpha;
	if (state !== 'eyes') {
		const frightened = state === 'frightened';
		const ending = frightened && look.powerLeft < 1.6 && Math.floor(t * 4) % 2 === 0;
		const body = frightened ? (ending ? '#e8eefc' : '#2f4fd8') : KIND_COLOR[ghost.kind];
		g.fillStyle = 'rgba(0,0,0,0.35)';
		g.beginPath();
		g.ellipse(x + S * 0.06, y + S * 0.1, r, r * 0.9, 0, 0, TAU);
		g.fill();
		const grad = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
		grad.addColorStop(0, '#ffffff');
		grad.addColorStop(0.25, body);
		grad.addColorStop(1, body);
		g.fillStyle = grad;
		g.beginPath();
		g.arc(x, y, r, 0, TAU);
		g.fill();
		g.strokeStyle = 'rgba(0,0,0,0.45)';
		g.lineWidth = S * 0.035;
		g.stroke();
		if (frightened) {
			g.strokeStyle = ending ? '#ff5050' : '#ffd0d0';
			g.lineWidth = S * 0.04;
			g.beginPath();
			for (let i = 0; i <= 6; i += 1) {
				const px = x - r * 0.5 + (i / 6) * r;
				const py = y + r * 0.3 + (i % 2 ? -1 : 1) * r * 0.08;
				if (i === 0) g.moveTo(px, py);
				else g.lineTo(px, py);
			}
			g.stroke();
		}
	}
	// the eyes
	const f = ghost.facing;
	const lx = f === 'LEFT' ? -1 : f === 'RIGHT' ? 1 : 0;
	const ly = f === 'UP' ? -1 : f === 'DOWN' ? 1 : 0;
	for (const side of [-1, 1]) {
		const ex = x + side * r * 0.36;
		const ey = y - r * 0.18;
		g.fillStyle = look.tell ? '#ffe27a' : '#ffffff';
		g.beginPath();
		g.ellipse(ex, ey, r * 0.24, r * 0.3, 0, 0, TAU);
		g.fill();
		g.fillStyle = look.tell ? '#7a1400' : '#14213a';
		g.beginPath();
		g.arc(ex + lx * r * 0.11, ey + ly * r * 0.12, r * 0.13, 0, TAU);
		g.fill();
	}
	g.restore();
}

/** The pincer's tell: a line from a hunter's eyes to the junction it takes, and a ring there. */
export function drawClaim(g: Ctx, x0: number, y0: number, x1: number, y1: number, S: number, color: string, strength: number): void {
	g.save();
	g.globalAlpha = strength;
	g.strokeStyle = color;
	g.lineWidth = S * 0.06;
	g.setLineDash([S * 0.18, S * 0.14]);
	g.beginPath();
	g.moveTo(x0, y0);
	g.lineTo(x1, y1);
	g.stroke();
	g.setLineDash([]);
	g.lineWidth = S * 0.07;
	g.beginPath();
	g.arc(x1, y1, S * 0.4, 0, TAU);
	g.stroke();
	g.restore();
}

/** The console the escape starts at: a desk with a screen; lit when the hatch is charged. */
export function drawConsole(g: Ctx, x: number, y: number, S: number, t: number, state: 'off' | 'armed' | 'running'): void {
	const w = S * 0.86;
	const h = S * 0.6;
	if (state === 'armed') {
		const R = S * (1.4 + 0.25 * Math.sin(t * 3));
		const gl = g.createRadialGradient(x, y, 0, x, y, R);
		gl.addColorStop(0, 'rgba(120,255,170,0.55)');
		gl.addColorStop(1, 'rgba(120,255,170,0)');
		g.fillStyle = gl;
		g.fillRect(x - R, y - R, R * 2, R * 2);
	}
	g.fillStyle = '#20262c';
	g.beginPath();
	g.roundRect(x - w / 2, y - h / 2, w, h, S * 0.08);
	g.fill();
	g.strokeStyle = '#7d8892';
	g.lineWidth = S * 0.04;
	g.stroke();
	g.fillStyle = state === 'armed' ? '#7dffb0' : state === 'running' ? '#ff5a46' : '#264a52';
	g.fillRect(x - w * 0.36, y - h * 0.3, w * 0.72, h * 0.45);
	g.fillStyle = 'rgba(255,255,255,0.35)';
	for (let i = 0; i < 4; i += 1) g.fillRect(x - w * 0.3 + i * w * 0.18, y + h * 0.24, w * 0.1, h * 0.1);
}

/** The hatch: a round blast hatch, its ring alight once the escape is on its way. */
export function drawHatch(g: Ctx, x: number, y: number, S: number, t: number, open: number): void {
	const r = S * 0.46;
	if (open > 0) {
		const R = S * (1.6 + 0.3 * Math.sin(t * 4));
		const gl = g.createRadialGradient(x, y, 0, x, y, R);
		gl.addColorStop(0, `rgba(255,220,120,${0.6 * open})`);
		gl.addColorStop(1, 'rgba(255,220,120,0)');
		g.fillStyle = gl;
		g.fillRect(x - R, y - R, R * 2, R * 2);
	}
	g.fillStyle = '#2a2e33';
	g.beginPath();
	g.arc(x, y, r, 0, TAU);
	g.fill();
	g.strokeStyle = open > 0 ? '#ffd36a' : '#6d747c';
	g.lineWidth = S * 0.08;
	g.stroke();
	g.strokeStyle = 'rgba(255,255,255,0.25)';
	g.lineWidth = S * 0.04;
	for (let i = 0; i < 4; i += 1) {
		const a = (i / 4) * TAU + t * 0.4 * open;
		g.beginPath();
		g.moveTo(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2);
		g.lineTo(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75);
		g.stroke();
	}
}

/** The escape route: strip lights on the floor, a running wave toward the hatch. */
export function drawRoute(g: Ctx, pts: ReadonlyArray<{ x: number; y: number }>, S: number, t: number): void {
	g.save();
	g.globalCompositeOperation = 'lighter';
	for (let i = 0; i < pts.length - 1; i += 1) {
		const a = pts[i];
		const b = pts[i + 1];
		const wave = 0.35 + 0.65 * Math.max(0, Math.sin(i * 0.9 - t * 9)) ** 3;
		const ang = Math.atan2(b.y - a.y, b.x - a.x);
		g.save();
		g.translate((a.x + b.x) / 2, (a.y + b.y) / 2);
		g.rotate(ang);
		// a strip of floor light under the chevron, so the way reads at a glance
		g.fillStyle = `rgba(90,255,170,${0.1 + 0.12 * wave})`;
		g.fillRect(-S * 0.5, -S * 0.2, S, S * 0.4);
		g.fillStyle = `rgba(150,255,200,${0.5 + 0.5 * wave})`;
		g.beginPath();
		g.moveTo(-S * 0.2, -S * 0.22);
		g.lineTo(S * 0.1, 0);
		g.lineTo(-S * 0.2, S * 0.22);
		g.lineTo(-S * 0.08, 0);
		g.closePath();
		g.fill();
		g.restore();
	}
	g.restore();
}

/** A bulkhead door across the corridor: two leaves sliding in from the walls. */
export function drawDoor(g: Ctx, d: Door, x: number, y: number, S: number, across: 'h' | 'v'): void {
	if (d.closed <= 0.01) {
		g.strokeStyle = 'rgba(255,190,80,0.6)';
		g.lineWidth = S * 0.05;
		g.beginPath();
		if (across === 'h') {
			g.moveTo(x - S / 2, y);
			g.lineTo(x + S / 2, y);
		} else {
			g.moveTo(x, y - S / 2);
			g.lineTo(x, y + S / 2);
		}
		g.stroke();
		return;
	}
	const half = (S / 2) * d.closed;
	g.fillStyle = d.closed >= 0.6 ? '#c9a03c' : '#8e7a4e';
	g.strokeStyle = '#2a2418';
	g.lineWidth = S * 0.04;
	const leaf = (lx: number, ly: number, w: number, h: number) => {
		g.fillRect(lx, ly, w, h);
		g.strokeRect(lx, ly, w, h);
	};
	const th = S * 0.22;
	if (across === 'h') {
		leaf(x - S / 2, y - th / 2, half, th);
		leaf(x + S / 2 - half, y - th / 2, half, th);
	} else {
		leaf(x - th / 2, y - S / 2, th, half);
		leaf(x - th / 2, y + S / 2 - half, th, half);
	}
}

/**
 * A fence beam across the station: told as a faint dashed line, charging as a thickening dashed
 * line, lit as a bright laser with a glow. Drawn over the walls on purpose: it reads at once.
 */
export function drawBeam(g: Ctx, x0: number, y0: number, x1: number, y1: number, S: number, t: number, charge: number, lit: boolean): void {
	g.save();
	g.lineCap = 'round';
	if (!lit) {
		const a = 0.18 + 0.5 * charge + 0.15 * Math.sin(t * 9) * charge;
		g.strokeStyle = `rgba(255,90,200,${a})`;
		g.lineWidth = S * (0.05 + 0.12 * charge);
		g.setLineDash([S * 0.3, S * 0.25]);
		g.lineDashOffset = -t * S * 2;
		g.beginPath();
		g.moveTo(x0, y0);
		g.lineTo(x1, y1);
		g.stroke();
		g.restore();
		return;
	}
	g.globalCompositeOperation = 'lighter';
	for (const [w, a] of [
		[0.7, 0.12],
		[0.35, 0.3],
		[0.12, 0.95]
	]) {
		g.strokeStyle = `rgba(255,${120 + (w < 0.2 ? 120 : 0)},230,${a * (0.9 + 0.1 * Math.sin(t * 23))})`;
		g.lineWidth = S * w;
		g.beginPath();
		g.moveTo(x0, y0);
		g.lineTo(x1, y1);
		g.stroke();
	}
	g.restore();
}

/** An emitter: the fencer holding its beam, a ring charging round it. */
export function drawEmitter(g: Ctx, x: number, y: number, S: number, charge: number): void {
	g.save();
	g.strokeStyle = 'rgba(255,120,220,0.9)';
	g.lineWidth = S * 0.08;
	g.beginPath();
	g.arc(x, y, S * 0.56, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, charge));
	g.stroke();
	g.restore();
}

/** One waiting in a vent shaft: two eyes in the dark of the grille, a glow that swells when it is about to come out. */
export function drawShaft(g: Ctx, x: number, y: number, S: number, t: number, glow: number, color: string): void {
	g.save();
	g.globalCompositeOperation = 'lighter';
	const R = S * (1 + 1.3 * glow);
	const gr = g.createRadialGradient(x, y, 0, x, y, R);
	gr.addColorStop(0, hexA(color, 0.4 + 0.5 * glow));
	gr.addColorStop(1, hexA(color, 0));
	g.fillStyle = gr;
	g.fillRect(x - R, y - R, R * 2, R * 2);
	g.restore();
	const blink = Math.sin(t * 0.9) > 0.97 ? 0.2 : 1;
	for (const side of [-1, 1]) {
		g.fillStyle = hexA('#fff6c0', (0.55 + 0.45 * glow) * blink);
		g.beginPath();
		g.ellipse(x + side * S * 0.16, y, S * (0.09 + 0.04 * glow), S * 0.07 * blink + S * 0.015, 0, 0, TAU);
		g.fill();
	}
}

function hexA(hex: string, a: number): string {
	const n = parseInt(hex.slice(1), 16);
	return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/**
 * The phantom is not drawn: the station shows where it is. The light round it gutters (a dim
 * that flickers, never a flash) and the air shivers in a faint ring.
 */
export function drawPhantom(g: Ctx, x: number, y: number, S: number, t: number): void {
	const f = 0.5 + 0.5 * Math.sin(t * 17) * Math.sin(t * 5.3);
	const R = S * 2.6;
	const gr = g.createRadialGradient(x, y, 0, x, y, R);
	gr.addColorStop(0, `rgba(2,4,8,${0.32 + 0.22 * f})`);
	gr.addColorStop(1, 'rgba(2,4,8,0)');
	g.fillStyle = gr;
	g.fillRect(x - R, y - R, R * 2, R * 2);
	g.strokeStyle = `rgba(200,230,255,${0.06 + 0.06 * f})`;
	g.lineWidth = S * 0.05;
	g.beginPath();
	g.arc(x, y, S * (0.42 + 0.05 * Math.sin(t * 7)), 0, TAU);
	g.stroke();
}
