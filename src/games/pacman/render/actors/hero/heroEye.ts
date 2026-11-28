// The fruit heroes' eye (the owner's pick of the `hero-eyes` prototype, 2026-11-28: "cocky"): an oval
// 30% bigger than the old round eye, its upper lid lowered aslant toward the front, the pupil looking
// out from under it; her lashes with a winged liner; his brow a sharp slash right above the lid.
// (x, y) is the eye's centre, r the radius the hero gives it, `close` its blink 0..1.
type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;

/** The eye is this much bigger than the radius the hero gives it. */
const GROW = 1.3;

export interface EyeInput {
	readonly r: number;
	readonly close: number;
	/** The pupil's offset on the gaze, px. */
	readonly gx: number;
	readonly gy: number;
	/** The power, 0..1: a cold ring round the pupil. */
	readonly power: number;
	/** Her lashes and liner. */
	readonly girl: boolean;
	/** The outline's colour and the lid's (the hero's skin, darker). */
	readonly ink: string;
	readonly lid: string;
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

function lashes(
	c: Ctx,
	r: number,
	rx: number,
	ry: number,
	width: number,
	wing: boolean,
	ink: string
): void {
	c.strokeStyle = ink;
	c.lineCap = 'round';
	c.lineWidth = width;
	for (const [a, len] of [
		[-0.35, 0.55],
		[-0.85, 0.6],
		[-1.35, 0.45]
	] as const) {
		const x0 = Math.cos(a) * rx * 0.98;
		const y0 = Math.sin(a) * ry * 0.98;
		c.beginPath();
		c.moveTo(x0, y0);
		c.quadraticCurveTo(
			x0 + Math.cos(a) * r * len * 0.6,
			y0 + Math.sin(a) * r * len * 0.6 - r * 0.1,
			x0 + Math.cos(a - 0.3) * r * len,
			y0 + Math.sin(a - 0.3) * r * len
		);
		c.stroke();
	}
	if (wing) {
		// a winged liner flicked up at the outer corner
		c.lineWidth = width * 1.2;
		c.beginPath();
		c.moveTo(rx * 0.7, -ry * 0.55);
		c.quadraticCurveTo(rx * 1.15, -ry * 0.5, rx * 1.45, -ry * 0.95);
		c.stroke();
	}
}

/**
 * B: cocky. The same oval with its upper lid lowered flat across the top third and tilted down to the
 * front (set, sure of itself), the pupil under the lid; the orange's brow a sharp slash close above.
 */
function cocky(c: Ctx, e: EyeInput): void {
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
	c.fillStyle = e.lid;
	c.beginPath();
	c.moveTo(-rx * 1.2, -ry * 1.2);
	c.lineTo(rx * 1.2, -ry * 1.2);
	c.lineTo(rx * 1.2, -ry * 0.12);
	c.lineTo(-rx * 1.2, -ry * 0.48);
	c.closePath();
	c.fill();
	c.restore();
	oval(c, rx, ry);
	c.strokeStyle = e.ink;
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
	if (e.girl) lashes(c, r, rx, ry, Math.max(1.1, r * 0.2), true, e.ink);
}

/** Paints the eye at (x, y): the blink squeezes it, the power rings its pupil cold. */
export function paintHeroEye(c: Ctx, x: number, y: number, input: EyeInput): void {
	const e = { ...input, r: input.r * GROW, gx: input.gx * GROW, gy: input.gy * GROW };
	c.save();
	c.translate(x, y);
	c.scale(1, 1 - 0.88 * e.close);
	cocky(c, e);
	if (e.power > 0.3) {
		c.beginPath();
		c.arc(e.gx * 1.2, e.gy * 0.6 + e.r * 0.12, e.r * 0.62, 0, TAU);
		c.strokeStyle = `rgba(110,230,255,${0.8 * e.power})`;
		c.lineWidth = Math.max(0.8, e.r * 0.1);
		c.stroke();
	}
	c.restore();
}

/** His brow: a sharp slash right above the lid, down toward the front. */
export function paintHeroBrow(
	c: Ctx,
	ex: number,
	ey: number,
	eye: number,
	R: number,
	ink: string
): void {
	const er = eye * GROW;
	const w = R < 12 ? Math.max(1.2, R * 0.085) : Math.max(1.6, R * 0.11);
	c.strokeStyle = ink;
	c.fillStyle = ink;
	c.lineCap = 'round';
	c.beginPath();
	c.moveTo(ex - er * 1.0, ey - er * 1.45);
	c.lineTo(ex + er * 1.25, ey - er * 1.05);
	c.lineTo(ex + er * 1.15, ey - er * 1.3);
	c.closePath();
	c.lineWidth = w;
	c.stroke();
	c.fill();
}
