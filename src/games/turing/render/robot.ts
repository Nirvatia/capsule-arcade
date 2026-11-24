// Каретка: the head of the machine as a robot on a rail. Local units: the body is ~104 wide at
// scale 1; the origin is the tip of the reading nozzle, the rail runs at y = RAIL_Y.
import { C, FONT_MONO } from './palette';

export type Mood = 'idle' | 'focus' | 'happy' | 'confused' | 'dizzy';
export type Arm = 'rest' | 'write' | 'erase' | 'wave';

export interface RobotPose {
	x: number;
	tipY: number;
	scale: number;
	mood: Mood;
	t: number;
	state?: string;
	arm?: Arm;
	/** swing in radians around the rail, from moving or from being dizzy */
	tilt?: number;
}

export const RAIL_Y = -150;

function shade(
	ctx: CanvasRenderingContext2D,
	y0: number,
	y1: number,
	a: string,
	b: string,
	c: string
) {
	const g = ctx.createLinearGradient(0, y0, 0, y1);
	g.addColorStop(0, a);
	g.addColorStop(0.5, b);
	g.addColorStop(1, c);
	return g;
}

function drawTool(ctx: CanvasRenderingContext2D, kind: 'pen' | 'eraser') {
	if (kind === 'pen') {
		ctx.fillStyle = C.sun;
		ctx.beginPath();
		ctx.roundRect(-4, -2, 8, 22, 2);
		ctx.fill();
		ctx.fillStyle = '#f4d7b0';
		ctx.beginPath();
		ctx.moveTo(-4, 20);
		ctx.lineTo(4, 20);
		ctx.lineTo(0, 29);
		ctx.closePath();
		ctx.fill();
		ctx.fillStyle = C.ink;
		ctx.beginPath();
		ctx.moveTo(-1.6, 25.5);
		ctx.lineTo(1.6, 25.5);
		ctx.lineTo(0, 29);
		ctx.closePath();
		ctx.fill();
	} else {
		ctx.fillStyle = C.pink;
		ctx.beginPath();
		ctx.roundRect(-7, 2, 14, 16, 3);
		ctx.fill();
		ctx.fillStyle = '#fbd2e2';
		ctx.beginPath();
		ctx.roundRect(-7, 12, 14, 6, 2);
		ctx.fill();
	}
}

/** Arm from a shoulder at (sx, sy): two segments and a hand tool. */
function drawArm(
	ctx: CanvasRenderingContext2D,
	sx: number,
	sy: number,
	a1: number,
	a2: number,
	tool: 'pen' | 'eraser' | null
) {
	const l1 = 22;
	const l2 = 20;
	const ex = sx + Math.sin(a1) * l1;
	const ey = sy + Math.cos(a1) * l1;
	const hx = ex + Math.sin(a2) * l2;
	const hy = ey + Math.cos(a2) * l2;
	ctx.lineCap = 'round';
	ctx.strokeStyle = C.steelLo;
	ctx.lineWidth = 10;
	ctx.beginPath();
	ctx.moveTo(sx, sy);
	ctx.lineTo(ex, ey);
	ctx.lineTo(hx, hy);
	ctx.stroke();
	ctx.strokeStyle = C.steelHi;
	ctx.lineWidth = 6;
	ctx.stroke();
	ctx.fillStyle = C.rail;
	ctx.beginPath();
	ctx.arc(ex, ey, 4.5, 0, Math.PI * 2);
	ctx.fill();
	if (tool) {
		ctx.save();
		ctx.translate(hx, hy);
		ctx.rotate(-a2);
		drawTool(ctx, tool);
		ctx.restore();
	}
	ctx.fillStyle = C.steelHi;
	ctx.beginPath();
	ctx.arc(hx, hy, 5.5, 0, Math.PI * 2);
	ctx.fill();
}

function spiral(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number) {
	ctx.beginPath();
	for (let i = 0; i <= 40; i++) {
		const k = i / 40;
		const a = rot + k * Math.PI * 4;
		const rr = r * k;
		const px = x + Math.cos(a) * rr;
		const py = y + Math.sin(a) * rr;
		if (i === 0) ctx.moveTo(px, py);
		else ctx.lineTo(px, py);
	}
	ctx.stroke();
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
	ctx.beginPath();
	for (let i = 0; i < 10; i++) {
		const a = (i * Math.PI) / 5 - Math.PI / 2;
		const rr = i % 2 ? r * 0.45 : r;
		ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
	}
	ctx.closePath();
	ctx.fill();
}

function drawFace(ctx: CanvasRenderingContext2D, mood: Mood, t: number) {
	const ey = -80;
	const ex = 16;
	ctx.save();
	ctx.shadowColor = C.glow;
	ctx.shadowBlur = 10;
	ctx.fillStyle = C.glow;
	ctx.strokeStyle = C.glow;
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	ctx.lineWidth = 4;
	const blink = t % 3.6 > 3.45;
	if (mood === 'idle' || mood === 'focus') {
		const h = blink ? 2 : mood === 'focus' ? 8 : 17;
		for (const sx of [-ex, ex]) {
			ctx.beginPath();
			ctx.roundRect(sx - 6, ey - h / 2 + (mood === 'focus' ? 3 : 0), 12, h, 5);
			ctx.fill();
		}
		if (mood === 'focus') {
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.moveTo(-ex - 8, ey - 8);
			ctx.lineTo(-ex + 6, ey - 5);
			ctx.moveTo(ex + 8, ey - 8);
			ctx.lineTo(ex - 6, ey - 5);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(-5, -62);
			ctx.lineTo(5, -62);
			ctx.stroke();
		} else {
			ctx.beginPath();
			ctx.arc(0, -66, 7, 0.15 * Math.PI, 0.85 * Math.PI);
			ctx.stroke();
		}
	} else if (mood === 'happy') {
		for (const sx of [-ex, ex]) {
			ctx.beginPath();
			ctx.arc(sx, ey + 3, 7, 1.1 * Math.PI, 1.9 * Math.PI);
			ctx.stroke();
		}
		ctx.beginPath();
		ctx.moveTo(-11, -68);
		ctx.quadraticCurveTo(0, -55, 11, -68);
		ctx.closePath();
		ctx.fill();
		ctx.shadowBlur = 0;
		ctx.fillStyle = 'rgba(255,79,147,.45)';
		for (const sx of [-29, 29]) {
			ctx.beginPath();
			ctx.ellipse(sx, -66, 6, 3.5, 0, 0, Math.PI * 2);
			ctx.fill();
		}
	} else if (mood === 'confused') {
		ctx.beginPath();
		ctx.arc(-ex, ey, 8, 0, Math.PI * 2);
		ctx.fill();
		ctx.beginPath();
		ctx.arc(ex, ey - 3, 4, 0, Math.PI * 2);
		ctx.fill();
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(ex - 8, ey - 14);
		ctx.lineTo(ex + 8, ey - 11);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(-9, -63);
		ctx.bezierCurveTo(-4, -68, 2, -58, 9, -64);
		ctx.stroke();
	} else {
		ctx.lineWidth = 2.6;
		spiral(ctx, -ex, ey, 9, t * 6);
		spiral(ctx, ex, ey, 9, t * 6 + Math.PI);
		ctx.lineWidth = 3;
		ctx.beginPath();
		for (let i = 0; i <= 12; i++) {
			const px = -11 + (22 * i) / 12;
			const py = -63 + Math.sin(i * 1.4 + t * 8) * 2.4;
			if (i === 0) ctx.moveTo(px, py);
			else ctx.lineTo(px, py);
		}
		ctx.stroke();
	}
	ctx.restore();
}

export function drawRobot(ctx: CanvasRenderingContext2D, p: RobotPose) {
	const { t, mood } = p;
	const arm = p.arm ?? 'rest';
	const bob = mood === 'dizzy' ? 0 : Math.sin(t * 2.2) * 1.6;
	const tilt = (p.tilt ?? 0) + (mood === 'dizzy' ? Math.sin(t * 5) * 0.12 : 0);
	ctx.save();
	ctx.translate(p.x, p.tipY);
	ctx.scale(p.scale, p.scale);

	// trolley on the rail (does not swing)
	ctx.fillStyle = shade(ctx, RAIL_Y - 4, RAIL_Y + 16, C.steelHi, C.steel, C.steelLo);
	ctx.beginPath();
	ctx.roundRect(-30, RAIL_Y + 2, 60, 15, 6);
	ctx.fill();
	for (const wx of [-17, 17]) {
		const g = ctx.createRadialGradient(wx - 2, RAIL_Y - 2, 1, wx, RAIL_Y, 10);
		g.addColorStop(0, '#d9e0ff');
		g.addColorStop(1, C.steelHi);
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(wx, RAIL_Y, 9.5, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = C.steelLo;
		ctx.lineWidth = 2;
		ctx.beginPath();
		const a = t * 4;
		ctx.moveTo(wx + Math.cos(a) * 6, RAIL_Y + Math.sin(a) * 6);
		ctx.lineTo(wx - Math.cos(a) * 6, RAIL_Y - Math.sin(a) * 6);
		ctx.stroke();
		ctx.fillStyle = C.steelLo;
		ctx.beginPath();
		ctx.arc(wx, RAIL_Y, 3, 0, Math.PI * 2);
		ctx.fill();
	}

	ctx.translate(0, RAIL_Y + 14);
	ctx.rotate(tilt);
	ctx.translate(0, -(RAIL_Y + 14) + bob);

	// neck: an accordion strut
	ctx.fillStyle = C.steelLo;
	ctx.fillRect(-9, RAIL_Y + 14, 18, 22);
	ctx.fillStyle = C.steel;
	for (let i = 0; i < 4; i++) ctx.fillRect(-12, RAIL_Y + 16 + i * 5.5, 24, 2.6);

	const top = -114;
	const bottom = -22;

	// arms behind the body
	const tw = t * 9;
	if (arm === 'write') {
		drawArm(ctx, -46, -58, 0.55, -0.05 + Math.sin(tw) * 0.05, 'pen');
	} else if (arm === 'erase') {
		drawArm(ctx, -46, -58, 0.5, 0.05 + Math.sin(tw) * 0.18, 'eraser');
	} else {
		drawArm(ctx, -46, -58, -0.18, 0.12, 'pen');
	}
	if (arm === 'wave') {
		const w = Math.sin(t * 7) * 0.35;
		drawArm(ctx, 46, -64, Math.PI - 0.7, Math.PI - 0.15 + w, null);
	} else if (mood === 'confused') {
		drawArm(ctx, 46, -62, Math.PI - 0.9, Math.PI + 0.9, null);
	} else {
		drawArm(ctx, 46, -58, 0.18, -0.12, 'eraser');
	}

	// body
	ctx.save();
	ctx.shadowColor = 'rgba(0,0,0,.5)';
	ctx.shadowBlur = 18;
	ctx.shadowOffsetY = 8;
	ctx.fillStyle = shade(ctx, top, bottom, C.coralHi, C.coral, C.coralLo);
	ctx.beginPath();
	ctx.roundRect(-52, top, 104, bottom - top, 26);
	ctx.fill();
	ctx.restore();
	// sheen and a belly seam
	ctx.fillStyle = 'rgba(255,255,255,.22)';
	ctx.beginPath();
	ctx.roundRect(-44, top + 6, 40, 8, 4);
	ctx.fill();
	ctx.strokeStyle = 'rgba(120,25,15,.35)';
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(-52, -40);
	ctx.lineTo(52, -40);
	ctx.stroke();
	// side ear lamps
	for (const sx of [-55, 55]) {
		ctx.fillStyle = C.coralLo;
		ctx.beginPath();
		ctx.roundRect(sx - 5, -92, 10, 26, 5);
		ctx.fill();
		ctx.save();
		ctx.shadowColor = C.glow;
		ctx.shadowBlur = 8;
		ctx.fillStyle = C.glow;
		ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 3 + sx);
		ctx.beginPath();
		ctx.arc(sx, -79, 3, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}
	// face screen
	ctx.fillStyle = '#7a2418';
	ctx.beginPath();
	ctx.roundRect(-41, -104, 82, 54, 17);
	ctx.fill();
	const sg = ctx.createLinearGradient(0, -101, 0, -53);
	sg.addColorStop(0, '#142347');
	sg.addColorStop(1, C.screen);
	ctx.fillStyle = sg;
	ctx.beginPath();
	ctx.roundRect(-38, -101, 76, 48, 14);
	ctx.fill();
	ctx.fillStyle = 'rgba(255,255,255,.07)';
	ctx.beginPath();
	ctx.roundRect(-34, -98, 36, 10, 5);
	ctx.fill();
	drawFace(ctx, mood, t);
	// state display
	ctx.fillStyle = C.screen;
	ctx.beginPath();
	ctx.roundRect(-24, -37, 48, 13, 4);
	ctx.fill();
	if (p.state) {
		ctx.save();
		ctx.font = `800 11px ${FONT_MONO}`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillStyle = mood === 'dizzy' ? C.pink : C.sun;
		ctx.shadowColor = ctx.fillStyle;
		ctx.shadowBlur = 6;
		ctx.fillText(p.state, 0, -30.2);
		ctx.restore();
	}

	// reading nozzle
	ctx.fillStyle = shade(ctx, bottom - 2, 0, C.steelHi, C.steel, C.steelLo);
	ctx.beginPath();
	ctx.moveTo(-16, bottom - 2);
	ctx.lineTo(16, bottom - 2);
	ctx.lineTo(8, -4);
	ctx.lineTo(-8, -4);
	ctx.closePath();
	ctx.fill();
	ctx.save();
	ctx.shadowColor = C.sun;
	ctx.shadowBlur = 12;
	ctx.fillStyle = C.sun;
	ctx.beginPath();
	ctx.roundRect(-8, -5, 16, 5, 2.5);
	ctx.fill();
	ctx.restore();

	if (mood === 'dizzy') {
		ctx.fillStyle = C.sun;
		for (let i = 0; i < 3; i++) {
			const a = t * 3 + (i * Math.PI * 2) / 3;
			star(ctx, Math.cos(a) * 46, top - 8 + Math.sin(a) * 9, 6);
		}
	}
	if (mood === 'confused') {
		ctx.save();
		ctx.font = `800 30px ${FONT_MONO}`;
		ctx.fillStyle = C.sun;
		ctx.shadowColor = C.sun;
		ctx.shadowBlur = 10;
		ctx.textAlign = 'center';
		ctx.fillText('?', 66, top + 6 + Math.sin(t * 3) * 3);
		ctx.restore();
	}
	ctx.restore();
}

/** Cone of light from the nozzle tip onto the cell below (drawn before the robot). */
export function drawBeam(
	ctx: CanvasRenderingContext2D,
	x: number,
	tipY: number,
	cellTop: number,
	cellW: number,
	color: string = C.sun
) {
	ctx.save();
	ctx.globalCompositeOperation = 'lighter';
	const g = ctx.createLinearGradient(0, tipY, 0, cellTop);
	g.addColorStop(0, color + 'aa');
	g.addColorStop(1, color + '18');
	ctx.fillStyle = g;
	ctx.beginPath();
	ctx.moveTo(x - 7, tipY);
	ctx.lineTo(x + 7, tipY);
	ctx.lineTo(x + cellW * 0.55, cellTop);
	ctx.lineTo(x - cellW * 0.55, cellTop);
	ctx.closePath();
	ctx.fill();
	ctx.restore();
}
