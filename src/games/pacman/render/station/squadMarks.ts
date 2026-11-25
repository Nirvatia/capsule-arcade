// The marks of the squad's plays (DESIGN.md §7a), from the squad prototype: the fence's beams
// and emitters, the vent's eyes in the shaft, the phantom's guttering light, the herders' claims,
// and the escape's route lights, doors and breakthrough lane.
import type { GhostKind } from '../../logic/actors/GhostModel';
import type { Door } from '../../logic/station/StationEscape';

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

/** The pincer's tell: a line from a hunter's eyes to the junction it takes, and a ring there. */
export function drawClaim(
	g: Ctx,
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	S: number,
	color: string,
	strength: number
): void {
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

/** The escape route: strip lights on the floor, a running wave toward the hatch. */
export function drawRoute(
	g: Ctx,
	pts: ReadonlyArray<{ x: number; y: number }>,
	S: number,
	t: number
): void {
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
export function drawDoor(
	g: Ctx,
	d: Door,
	x: number,
	y: number,
	S: number,
	across: 'h' | 'v'
): void {
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
export function drawBeam(
	g: Ctx,
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	S: number,
	t: number,
	charge: number,
	lit: boolean
): void {
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
export function drawShaft(
	g: Ctx,
	x: number,
	y: number,
	S: number,
	t: number,
	glow: number,
	color: string
): void {
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
		g.ellipse(
			x + side * S * 0.16,
			y,
			S * (0.09 + 0.04 * glow),
			S * 0.07 * blink + S * 0.015,
			0,
			0,
			TAU
		);
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

/** The breakthrough's lane: the way to the hatch as a corridor of white light, fading at its end. */
export function drawLane(
	g: Ctx,
	pts: ReadonlyArray<{ x: number; y: number }>,
	S: number,
	t: number,
	left: number
): void {
	if (pts.length < 2) return;
	const a = Math.min(1, left / 0.5);
	g.save();
	g.globalCompositeOperation = 'lighter';
	g.lineCap = 'round';
	g.lineJoin = 'round';
	for (const [w, al] of [
		[0.95, 0.12],
		[0.6, 0.22],
		[0.22, 0.75]
	]) {
		g.strokeStyle = `rgba(190,255,245,${al * a * (0.9 + 0.1 * Math.sin(t * 20))})`;
		g.lineWidth = S * w;
		g.beginPath();
		pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
		g.stroke();
	}
	g.restore();
}
