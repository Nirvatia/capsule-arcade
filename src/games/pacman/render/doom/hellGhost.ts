import type { DoomDirection } from '../../logic/doom/DoomGraph';

/**
 * Shared drawing for the hell's ghost demons (the boss Blinky and its imps), in the heroes'
 * cel-shaded language (the owner's mock-up `prototypes/pacman/art/hell-flesh-boss.html`): the
 * ghost outline, hard tone bands, a thick ink line, bone horns, eyes that look where the body is
 * heading, and the heading chevron. Everything is sized from the body's half-width `w`, so a
 * body stays inside its tile.
 */

const TAU = Math.PI * 2;

/** The ink line of every demon. */
export const INK = '#1a0406';

export function dirAngle(dir: DoomDirection | null): number {
	if (dir === 'UP') return -Math.PI / 2;
	if (dir === 'DOWN') return Math.PI / 2;
	if (dir === 'LEFT') return Math.PI;
	return 0;
}

export function glow(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	r: number,
	rgb: string,
	a: number
): void {
	if (a <= 0 || r <= 0) {
		return;
	}
	const g = ctx.createRadialGradient(x, y, 0, x, y, r);
	g.addColorStop(0, `rgba(${rgb},${Math.min(1, a)})`);
	g.addColorStop(1, `rgba(${rgb},0)`);
	ctx.fillStyle = g;
	ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** Seeded 0..1 noise, stable per (i, k). */
export function noise(i: number, k: number): number {
	const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
	return v - Math.floor(v);
}

export interface GhostShape {
	/** Half-width of the body. */
	readonly w: number;
	/** Dome centre (the dome's radius is `w`). */
	readonly domeY: number;
	/** Bottom line of the skirt. */
	readonly hem: number;
	/** Number of skirt feet. */
	readonly feet: number;
	/** 0: the round arcade skirt; 1: ragged, torn tatters. */
	readonly torn: number;
	readonly seed: number;
}

/**
 * Ghost outline around (x, y): a dome on top, straight sides and a skirt of feet that
 * ripple with time (the arcade ghost's two-frame wiggle, smoothed).
 */
export function ghostPath(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	shape: GhostShape,
	t: number
): void {
	const { w, domeY, hem, feet, torn, seed } = shape;
	const foot = (hem - domeY) * 0.22;
	ctx.beginPath();
	ctx.moveTo(x - w, y + domeY);
	ctx.arc(x, y + domeY, w, Math.PI, 0);
	ctx.lineTo(x + w, y + hem);
	const n = feet * 2;
	for (let i = 1; i <= n; i += 1) {
		const u = i / n;
		const px = x + w - u * 2 * w;
		const up = i % 2 === 1;
		const wiggle = Math.sin(t * 9 + i * Math.PI) * 0.35;
		const rag = torn * (noise(seed, i) - 0.3) * foot * 1.4;
		const py = y + hem - (up ? foot * (0.75 + wiggle) + rag : -rag * 0.5);
		const cx = px + w / n;
		ctx.quadraticCurveTo(cx, y + hem + (up ? foot * 0.25 : -foot * 0.1), px, py);
	}
	ctx.closePath();
}

/** A soft additive glow. */
export function lightGlow(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	r: number,
	rgb: string,
	a: number
): void {
	if (a <= 0 || r <= 0) {
		return;
	}
	const g = ctx.createRadialGradient(x, y, 0, x, y, r);
	g.addColorStop(0, `rgba(${rgb},${Math.min(1, a)})`);
	g.addColorStop(0.4, `rgba(${rgb},${Math.min(1, a) * 0.4})`);
	g.addColorStop(1, `rgba(${rgb},0)`);
	ctx.save();
	ctx.globalCompositeOperation = 'lighter';
	ctx.fillStyle = g;
	ctx.fillRect(x - r, y - r, r * 2, r * 2);
	ctx.restore();
}

/** The three tones of a body: a lit patch, the mid tone, a shadow crescent. */
export interface CelTones {
	readonly light: string;
	readonly mid: string;
	readonly shade: string;
}

/**
 * The tone bands over a body whose outline is already the clip: the lit patch on the upper
 * left, the shadow where the light does not reach. The mid tone is the fill under them.
 */
export function celBands(ctx: CanvasRenderingContext2D, shape: GhostShape, tones: CelTones): void {
	const { w, domeY, hem } = shape;
	ctx.fillStyle = tones.light;
	ctx.beginPath();
	ctx.ellipse(-w * 0.22, domeY - w * 0.3, w * 0.82, w * 0.62, -0.25, 0, TAU);
	ctx.fill();
	ctx.fillStyle = tones.shade;
	ctx.beginPath();
	ctx.rect(-w * 2, domeY - w * 2, w * 4, hem - domeY + w * 4);
	ctx.ellipse(-w * 0.12, domeY - w * 0.05, w * 1.25, w * 1.35, 0, 0, TAU);
	ctx.fill('evenodd');
}

/** The ink line round a body, and a rim light along the upper left of the dome. */
export function celOutline(
	ctx: CanvasRenderingContext2D,
	shape: GhostShape,
	t: number,
	rim: string
): void {
	const { w, domeY } = shape;
	ghostPath(ctx, 0, 0, shape, t);
	ctx.lineWidth = Math.max(1.6, w * 0.15);
	ctx.strokeStyle = INK;
	ctx.lineJoin = 'round';
	ctx.stroke();
	ctx.save();
	ctx.globalAlpha *= 0.75;
	ctx.strokeStyle = rim;
	ctx.lineWidth = Math.max(1, w * 0.08);
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.arc(0, domeY, w * 0.84, Math.PI * 1.08, Math.PI * 1.62);
	ctx.stroke();
	ctx.restore();
}

export interface HornStyle {
	/** Horn length relative to the body half-width. */
	readonly length: number;
	/** Outward curl. */
	readonly curl: number;
	/** The bone: lit and shaded. */
	readonly bone: readonly [string, string];
	/** Glowing tips (rgb) or null. */
	readonly ember: string | null;
}

/**
 * A pair of bone horns growing from the dome at angle `at` from the top (radians): a curved
 * cone with a lit streak and an ink line, an ember at the tip when it burns. Drawn round
 * (x, y), the body's centre.
 */
export function drawHorns(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	shape: GhostShape,
	at: number,
	style: HornStyle,
	pulse: number
): void {
	const { w, domeY } = shape;
	ctx.save();
	ctx.translate(x, y);
	ctx.lineJoin = 'round';
	for (const side of [-1, 1]) {
		const bx = side * w * Math.sin(at);
		const by = domeY - w * Math.cos(at) * 0.98;
		const dir = -Math.PI / 2 + side * (at + 0.3);
		const len = style.length * w * 1.7;
		const th = w * 0.26;
		const dx = Math.cos(dir);
		const dy = Math.sin(dir);
		const tipX = bx + dx * len - side * style.curl * w * 0.5;
		const tipY = by + dy * len;
		const nx = -dy;
		const ny = dx;
		const cone = () => {
			ctx.beginPath();
			ctx.moveTo(bx + nx * th, by + ny * th);
			ctx.quadraticCurveTo(
				bx + dx * len * 0.55 + nx * th * 0.5 - side * style.curl * w * 0.3,
				by + dy * len * 0.55 + ny * th * 0.5,
				tipX,
				tipY
			);
			ctx.quadraticCurveTo(
				bx + dx * len * 0.5 - nx * th * 0.4 - side * style.curl * w * 0.2,
				by + dy * len * 0.5 - ny * th * 0.4,
				bx - nx * th,
				by - ny * th
			);
			ctx.closePath();
		};
		cone();
		ctx.fillStyle = style.bone[1];
		ctx.fill();
		ctx.save();
		cone();
		ctx.clip();
		ctx.fillStyle = style.bone[0];
		ctx.beginPath();
		ctx.ellipse(
			bx + dx * len * 0.35 - side * w * 0.04,
			by + dy * len * 0.35,
			th * 0.55,
			len * 0.5,
			dir + Math.PI / 2,
			0,
			TAU
		);
		ctx.fill();
		ctx.restore();
		cone();
		ctx.lineWidth = Math.max(1.2, w * 0.09);
		ctx.strokeStyle = INK;
		ctx.stroke();
		if (style.ember) {
			lightGlow(ctx, tipX, tipY, w * 0.38, style.ember, 0.5 + 0.4 * pulse);
		}
	}
	ctx.restore();
}

export interface EyeStyle {
	readonly sclera: string;
	/** Glow around the eyes (rgb) or null. */
	readonly glow: string | null;
}

/**
 * Two eyes looking along `look` (radians): the pupils shift toward the heading, the way
 * arcade ghosts show where they go, under ink brows set in a scowl. `open` 0 closes them,
 * `daze` turns them into spirals.
 */
export function drawEyes(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	look: number,
	style: EyeStyle,
	open: number,
	daze: boolean,
	t: number
): void {
	const ex = w * 0.42;
	const ey = -w * 0.18;
	const rx = w * 0.3;
	const ry = w * 0.36;
	const lx = Math.cos(look);
	const ly = Math.sin(look);
	for (const side of [-1, 1]) {
		const cx = x + side * ex + lx * w * 0.06;
		const cy = y + ey + ly * w * 0.06;
		if (style.glow && open > 0.05 && !daze) {
			lightGlow(ctx, cx, cy, rx * 1.9, style.glow, 0.6);
		}
		ctx.strokeStyle = INK;
		if (open <= 0.05) {
			ctx.lineWidth = Math.max(1, w * 0.08);
			ctx.beginPath();
			ctx.moveTo(cx - rx, cy);
			ctx.quadraticCurveTo(cx, cy + ry * 0.4, cx + rx, cy);
			ctx.stroke();
			continue;
		}
		ctx.fillStyle = style.sclera;
		ctx.beginPath();
		ctx.ellipse(cx, cy, rx, ry * open, 0, 0, TAU);
		ctx.fill();
		ctx.lineWidth = Math.max(1, w * 0.07);
		ctx.stroke();
		if (daze) {
			ctx.lineWidth = Math.max(0.8, w * 0.05);
			ctx.beginPath();
			for (let i = 0; i <= 18; i += 1) {
				const a = side * (t * 7 + i * 0.6);
				const d = (i / 18) * rx * 0.8;
				const px = cx + Math.cos(a) * d;
				const py = cy + Math.sin(a) * d * open;
				if (i === 0) {
					ctx.moveTo(px, py);
				} else {
					ctx.lineTo(px, py);
				}
			}
			ctx.stroke();
		} else {
			// pupils pushed to the edge of the eye in the heading direction
			ctx.fillStyle = '#1a0000';
			ctx.beginPath();
			ctx.ellipse(
				cx + lx * rx * 0.48,
				cy + ly * ry * 0.48 * open,
				rx * 0.42,
				ry * 0.46 * open,
				0,
				0,
				TAU
			);
			ctx.fill();
		}
		// outer end high, inner end low: a scowl
		ctx.lineWidth = Math.max(1.2, w * 0.11);
		ctx.lineCap = 'round';
		ctx.beginPath();
		ctx.moveTo(cx + side * rx * 1.1, cy - ry * 1.25);
		ctx.lineTo(cx - side * rx * 0.9, cy - ry * 0.5);
		ctx.stroke();
	}
}

/**
 * The heading chevron, the shared direction rule of the hell: a small ink-outlined arrow on
 * the tile's leading edge. `size` is the tile size, (x, y) the tile centre.
 */
export function drawHeading(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	heading: number,
	rgb: string,
	alpha: number
): void {
	if (alpha <= 0.01) {
		return;
	}
	const d = size * 0.42;
	const a = size * 0.09;
	ctx.save();
	ctx.translate(x + Math.cos(heading) * d, y + Math.sin(heading) * d);
	ctx.rotate(heading);
	ctx.globalAlpha *= alpha;
	ctx.beginPath();
	ctx.moveTo(a, 0);
	ctx.lineTo(-a * 0.7, -a * 0.9);
	ctx.lineTo(-a * 0.3, 0);
	ctx.lineTo(-a * 0.7, a * 0.9);
	ctx.closePath();
	ctx.fillStyle = `rgb(${rgb})`;
	ctx.fill();
	ctx.lineWidth = Math.max(1, size * 0.04);
	ctx.strokeStyle = INK;
	ctx.lineJoin = 'round';
	ctx.stroke();
	ctx.restore();
}
