// Eye candidates for the fruit heroes (the owner: the eye reads neither cute, nor mean, nor cool).
// Each style paints the eye (and the orange's brow) in place of the game's; the heroes are the game's.
// (x, y) is the eye's centre, r its radius as the game gives it, `close` 0..1 its blink.
type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const INK = '#2a1208';

export type EyeStyle = 'now' | 'a' | 'b' | 'c';

/** The candidates' eye is this much bigger than the game's. */
const GROW = 1.3;

export interface EyeInput {
	readonly r: number;
	readonly close: number;
	readonly gx: number;
	readonly gy: number;
	readonly power: number;
	readonly girl: boolean;
}

function oval(c: Ctx, rx: number, ry: number, tilt = 0): void {
	c.beginPath();
	c.ellipse(0, 0, rx, ry, tilt, 0, TAU);
}

function glints(c: Ctx, x: number, y: number, r: number, big: number): void {
	c.fillStyle = '#ffffff';
	c.beginPath();
	c.ellipse(x - r * 0.22, y - r * 0.26, r * big, r * big * 0.8, -0.5, 0, TAU);
	c.fill();
	c.fillStyle = 'rgba(255,255,255,.75)';
	c.beginPath();
	c.arc(x + r * 0.2, y + r * 0.22, r * big * 0.42, 0, TAU);
	c.fill();
}

function lashes(c: Ctx, r: number, rx: number, ry: number, ink: number, wing: boolean): void {
	c.strokeStyle = INK;
	c.lineCap = 'round';
	c.lineWidth = ink;
	for (const [a, len] of [[-0.35, 0.55], [-0.85, 0.6], [-1.35, 0.45]] as const) {
		const x0 = Math.cos(a) * rx * 0.98;
		const y0 = Math.sin(a) * ry * 0.98;
		c.beginPath();
		c.moveTo(x0, y0);
		c.quadraticCurveTo(x0 + Math.cos(a) * r * len * 0.6, y0 + Math.sin(a) * r * len * 0.6 - r * 0.1, x0 + Math.cos(a - 0.3) * r * len, y0 + Math.sin(a - 0.3) * r * len);
		c.stroke();
	}
	if (wing) {
		// a winged liner flicked up at the outer corner
		c.lineWidth = ink * 1.2;
		c.beginPath();
		c.moveTo(rx * 0.7, -ry * 0.55);
		c.quadraticCurveTo(rx * 1.15, -ry * 0.5, rx * 1.45, -ry * 0.95);
		c.stroke();
	}
}

/**
 * A: lively. A tall oval tilted a little, a big tall pupil on the gaze, a big glint; a liner along
 * its top that thickens to the outer corner. The orange's brow an arched, confident stroke.
 */
function eyeA(c: Ctx, e: EyeInput): void {
	const { r, gx, gy } = e;
	const rx = r * 0.84;
	const ry = r * 1.12;
	oval(c, rx, ry, -0.12);
	c.fillStyle = '#fffaf0';
	c.fill();
	c.save();
	oval(c, rx, ry, -0.12);
	c.clip();
	c.fillStyle = 'rgba(200,180,160,.5)';
	c.beginPath();
	c.ellipse(0, ry * 0.9, rx * 1.2, ry * 0.5, 0, 0, TAU);
	c.fill();
	c.fillStyle = '#1c0e0a';
	c.beginPath();
	c.ellipse(gx * 1.1, gy * 1.1 + r * 0.05, r * 0.5, r * 0.68, 0, 0, TAU);
	c.fill();
	glints(c, gx * 1.1, gy * 1.1, r, 0.26);
	c.restore();
	oval(c, rx, ry, -0.12);
	c.strokeStyle = INK;
	c.lineWidth = Math.max(1.2, r * 0.18);
	c.stroke();
	// the liner on top, thicker to the outer (front) corner
	c.beginPath();
	c.ellipse(0, 0, rx, ry, -0.12, Math.PI * 1.15, Math.PI * 1.95);
	c.lineWidth = Math.max(1.6, r * 0.32);
	c.lineCap = 'round';
	c.stroke();
	if (e.girl) lashes(c, r, rx, ry, Math.max(1.1, r * 0.2), false);
}

/**
 * B: cocky. The same oval with its upper lid lowered flat across the top third and tilted down to the
 * front (set, sure of itself), the pupil under the lid; the orange's brow a sharp slash close above.
 */
function eyeB(c: Ctx, e: EyeInput): void {
	const { r, gx, gy } = e;
	const rx = r * 0.9;
	const ry = r * 1.02;
	c.save();
	oval(c, rx, ry);
	c.fillStyle = '#fffaf0';
	c.fill();
	c.clip();
	c.fillStyle = '#1c0e0a';
	c.beginPath();
	c.ellipse(gx * 1.2, gy * 0.6 + r * 0.12, r * 0.5, r * 0.6, 0, 0, TAU);
	c.fill();
	glints(c, gx * 1.2, gy * 0.6 + r * 0.12, r, 0.2);
	// the lid
	c.fillStyle = e.girl ? '#4a1420' : '#a84a08';
	c.beginPath();
	c.moveTo(-rx * 1.2, -ry * 1.2);
	c.lineTo(rx * 1.2, -ry * 1.2);
	c.lineTo(rx * 1.2, -ry * 0.12);
	c.lineTo(-rx * 1.2, -ry * 0.48);
	c.closePath();
	c.fill();
	c.restore();
	oval(c, rx, ry);
	c.strokeStyle = INK;
	c.lineWidth = Math.max(1.2, r * 0.18);
	c.stroke();
	c.save();
	oval(c, rx, ry);
	c.clip();
	c.beginPath();
	c.moveTo(-rx * 1.2, -ry * 0.48);
	c.lineTo(rx * 1.2, -ry * 0.12);
	c.lineWidth = Math.max(1.6, r * 0.3);
	c.stroke();
	c.restore();
	if (e.girl) lashes(c, r, rx, ry, Math.max(1.1, r * 0.2), true);
}

/**
 * C: cute. A big round eye with a coloured iris (amber for him, rose for her) round a dark pupil,
 * two large glints and a soft shine under it; the orange's brow a small raised arc.
 */
function eyeC(c: Ctx, e: EyeInput): void {
	const { r, gx, gy } = e;
	const R = r * 1.12;
	c.save();
	oval(c, R, R * 1.05);
	c.fillStyle = '#ffffff';
	c.fill();
	c.clip();
	const ix = gx * 0.9;
	const iy = gy * 0.9 + r * 0.06;
	const g = c.createRadialGradient(ix, iy - r * 0.2, r * 0.05, ix, iy, r * 0.75);
	if (e.girl) {
		g.addColorStop(0, '#ff9ab8');
		g.addColorStop(1, '#8a1438');
	} else {
		g.addColorStop(0, '#ffd070');
		g.addColorStop(1, '#8a4a08');
	}
	c.fillStyle = g;
	c.beginPath();
	c.ellipse(ix, iy, r * 0.72, r * 0.8, 0, 0, TAU);
	c.fill();
	c.fillStyle = '#140806';
	c.beginPath();
	c.ellipse(ix, iy, r * 0.36, r * 0.44, 0, 0, TAU);
	c.fill();
	glints(c, ix, iy, r, 0.3);
	c.fillStyle = 'rgba(255,255,255,.35)';
	c.beginPath();
	c.ellipse(ix, iy + r * 0.55, r * 0.4, r * 0.12, 0, 0, TAU);
	c.fill();
	c.restore();
	oval(c, R, R * 1.05);
	c.strokeStyle = INK;
	c.lineWidth = Math.max(1.2, r * 0.2);
	c.stroke();
	if (e.girl) lashes(c, r, R, R * 1.05, Math.max(1.1, r * 0.2), false);
}

/** Paints the eye of `style` at (x, y): the blink squeezes it, the power rings its pupil cold. */
export function paintEye(c: Ctx, style: EyeStyle, x: number, y: number, input: EyeInput): void {
	// a bigger eye than the game's (it carries the face)
	const e = { ...input, r: input.r * GROW, gx: input.gx * GROW, gy: input.gy * GROW };
	c.save();
	c.translate(x, y);
	c.scale(1, 1 - 0.88 * e.close);
	if (style === 'a') eyeA(c, e);
	else if (style === 'b') eyeB(c, e);
	else eyeC(c, e);
	if (e.power > 0.3) {
		c.beginPath();
		c.arc(e.gx, e.gy, e.r * 0.62, 0, TAU);
		c.strokeStyle = `rgba(110,230,255,${0.8 * e.power})`;
		c.lineWidth = Math.max(0.8, e.r * 0.1);
		c.stroke();
	}
	c.restore();
}

/** The orange's brow for `style` over an eye at (ex, ey) of radius er. */
export function paintBrow(c: Ctx, style: EyeStyle, ex: number, ey: number, eye: number, R: number): void {
	const er = eye * GROW;
	const w = R < 12 ? Math.max(1.2, R * 0.085) : Math.max(1.6, R * 0.11);
	c.strokeStyle = INK;
	c.fillStyle = INK;
	c.lineCap = 'round';
	if (style === 'a') {
		// arched and confident, the outer end raised, thicker in the middle
		c.beginPath();
		c.moveTo(ex - er * 0.95, ey - er * 1.15);
		c.quadraticCurveTo(ex + er * 0.1, ey - er * 2.0, ex + er * 1.2, ey - er * 1.55);
		c.lineWidth = w * 1.1;
		c.stroke();
	} else if (style === 'b') {
		// a sharp slash right above the lid, down to the front
		c.beginPath();
		c.moveTo(ex - er * 1.0, ey - er * 1.45);
		c.lineTo(ex + er * 1.25, ey - er * 1.05);
		c.lineTo(ex + er * 1.15, ey - er * 1.3);
		c.closePath();
		c.lineWidth = w;
		c.stroke();
		c.fill();
	} else {
		// a small raised arc
		c.beginPath();
		c.moveTo(ex - er * 0.6, ey - er * 1.55);
		c.quadraticCurveTo(ex + er * 0.1, ey - er * 2.0, ex + er * 0.8, ey - er * 1.6);
		c.lineWidth = w * 0.85;
		c.stroke();
	}
}
