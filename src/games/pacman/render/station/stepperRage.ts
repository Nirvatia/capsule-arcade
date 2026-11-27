// The stepper's rage face: the maniac (the owner's pick of the candidates, 2026-11-27; `stepper.ts`
// paints the hot red body, this paints the face over it). Bulging white eyes with tiny pupils that
// look along the heading, a thin raised brow over each (apart, never a unibrow), and a grin ear to
// ear with two rows of even pointed teeth. Clean drawing: one line weight, flat fills, plain
// geometry, both sides mirrored. Funny and dangerous at once.
type Ctx = CanvasRenderingContext2D;

export interface RageFace {
	/** The face's centre in tile units, on the (hunched) body. */
	readonly x: number;
	readonly y: number;
	/** How much of the rage face is in, 0..1 (the calm one fades out as it comes). */
	readonly alpha: number;
	/** The jaws, 0..1 (the chomp). */
	readonly open: number;
	/** One tile in pixels' reciprocal, for the line's floor. */
	readonly px: number;
	/** The heading the pupils look along. */
	readonly faceX: number;
	readonly faceY: number;
}

const INK = '#1b0f15';
const TAU = Math.PI * 2;
const WHITE = '#fffbea';
const MOUTH = '#4a0a0c';
const TOOTH = '#fff4dc';
const TOOTH_SHADE = '#e6cf9c';
/** The lowest the mouth may reach: the body's lower edge is near 0.27. */
const MOUTH_FLOOR = 0.235;
const TEETH = 6;

export function drawManicFace(c: Ctx, f: RageFace): void {
	if (f.alpha <= 0.01) return;
	const lw = Math.max(f.px * 1.6, 0.03);
	c.save();
	c.globalAlpha *= f.alpha;
	c.lineCap = 'round';
	c.lineJoin = 'round';
	c.strokeStyle = INK;
	// the eyes, and the brows floating over them, the outer end high
	const ey = f.y - 0.1;
	for (const side of [-1, 1]) {
		const ex = f.x + side * 0.12;
		c.beginPath();
		c.arc(ex, ey, 0.1, 0, TAU);
		c.fillStyle = WHITE;
		c.fill();
		c.lineWidth = lw;
		c.stroke();
		c.beginPath();
		c.arc(ex + f.faceX * 0.055, ey + f.faceY * 0.055, 0.028, 0, TAU);
		c.fillStyle = INK;
		c.fill();
		c.beginPath();
		c.moveTo(f.x + side * 0.05, f.y - 0.2);
		c.lineTo(f.x + side * 0.18, f.y - 0.245);
		c.lineWidth = lw * 1.25;
		c.stroke();
	}
	// the grin: corners up, the jaw drops with the chomp (never below the body)
	const W = 0.3;
	const ya = f.y + 0.025;
	const depth = Math.min(0.14 + 0.04 * f.open, MOUTH_FLOOR - ya);
	const ct = ya + 2 * 0.05;
	const cb = ya + 2 * depth;
	const path = () => {
		c.beginPath();
		c.moveTo(f.x - W, ya);
		c.quadraticCurveTo(f.x, ct, f.x + W, ya);
		c.quadraticCurveTo(f.x, cb, f.x - W, ya);
		c.closePath();
	};
	path();
	c.fillStyle = MOUTH;
	c.fill();
	c.save();
	path();
	c.clip();
	const edge = (t: number, ctl: number) => ya + 2 * t * (1 - t) * (ctl - ya);
	const hw = 0.05;
	const tooth = (t: number, len: number, dir: 1 | -1) => {
		const x = f.x - W + 2 * W * t;
		const y = edge(t, dir === 1 ? ct : cb);
		c.beginPath();
		c.moveTo(x - hw, y);
		c.lineTo(x, y + dir * len);
		c.lineTo(x + hw, y);
		c.closePath();
		c.fillStyle = TOOTH;
		c.fill();
		c.beginPath();
		c.moveTo(x + hw * 0.15, y);
		c.lineTo(x, y + dir * len);
		c.lineTo(x + hw, y);
		c.closePath();
		c.fillStyle = TOOTH_SHADE;
		c.fill();
		c.beginPath();
		c.moveTo(x - hw, y);
		c.lineTo(x, y + dir * len);
		c.lineTo(x + hw, y);
		c.lineWidth = lw * 0.8;
		c.stroke();
	};
	// the upper row, and the lower one sitting in its gaps
	for (let k = 0; k < TEETH; k++) tooth((k + 0.5) / TEETH, 0.07, 1);
	for (let k = 1; k < TEETH; k++) tooth(k / TEETH, 0.06, -1);
	c.restore();
	path();
	c.lineWidth = lw;
	c.stroke();
	c.restore();
}
