// The rift attack (the owner's mock-up `prototypes/pacman/art/hell-flesh-attacks.html`): the
// corridor the player runs in tears open along its length like the tunnels' seam. First the
// marking: a jagged seam grows and the red lips of flesh pull apart as the blast nears; then
// the burst along the whole corridor, a dark gap with a white-hot core; then a scar that
// smoulders and fades. Drawn in screen pixels, along the corridor's axis.
import type { GridLayout } from '../maze/GridView';
import type { DoomHazard } from '../../logic/doom/DoomHazards';

/** How long a scar stays, seconds. */
const SCAR_LIFE = 2.2;

interface Beam {
	/** Centre of the first tile, px. */
	readonly x0: number;
	readonly y0: number;
	readonly ang: number;
	/** From the first tile's centre to the last one's, px. */
	readonly len: number;
	/** Seed of the seam's jag. */
	readonly seed: number;
}

function noise(i: number, k: number): number {
	const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
	return v - Math.floor(v);
}

/** A straight run of tiles, from its first to its last. */
export interface Lane {
	readonly a: { readonly x: number; readonly y: number };
	readonly b: { readonly x: number; readonly y: number };
}

function beamOf(hazard: DoomHazard, layout: GridLayout): Beam | null {
	const a = hazard.tiles[0];
	const b = hazard.tiles[hazard.tiles.length - 1];
	return a && b ? beamBetween(a, b, hazard.axis, layout) : null;
}

function beamBetween(
	a: { readonly x: number; readonly y: number },
	b: { readonly x: number; readonly y: number },
	axis: 'x' | 'y' | null,
	layout: GridLayout
): Beam {
	const s = layout.tileSize;
	const x0 = layout.offsetX + (a.x + 0.5) * s;
	const y0 = layout.offsetY + (a.y + 0.5) * s;
	const x1 = layout.offsetX + (b.x + 0.5) * s;
	const y1 = layout.offsetY + (b.y + 0.5) * s;
	const len = Math.hypot(x1 - x0, y1 - y0);
	const ang = len > 0 ? Math.atan2(y1 - y0, x1 - x0) : axis === 'y' ? Math.PI / 2 : 0;
	return { x0, y0, ang, len, seed: a.x * 7 + a.y * 13 };
}

/** The seam: points from one end of the corridor to the other, jagged across the axis. */
function seam(beam: Beam, s: number): Array<[number, number]> {
	const u0 = -s * 0.5;
	const u1 = beam.len + s * 0.5;
	const n = Math.max(6, Math.round(((u1 - u0) / s) * 3));
	const pts: Array<[number, number]> = [];
	for (let i = 0; i <= n; i += 1) {
		const u = i / n;
		const env = Math.sin(Math.PI * u);
		pts.push([u0 + (u1 - u0) * u, (noise(beam.seed, i) - 0.5) * 2 * s * 0.12 * (0.4 + 0.6 * env)]);
	}
	return pts;
}

function trace(ctx: CanvasRenderingContext2D, pts: ReadonlyArray<readonly [number, number]>): void {
	ctx.beginPath();
	pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
	ctx.stroke();
}

/** Puts the context in the beam's frame: x along the corridor from the first tile's centre. */
function frame(ctx: CanvasRenderingContext2D, beam: Beam): void {
	ctx.translate(beam.x0, beam.y0);
	ctx.rotate(beam.ang);
}

/** The marking, `p` 0..1 towards the blast; `soon` flickers it in the last moments. */
export function drawRiftWarning(
	ctx: CanvasRenderingContext2D,
	hazard: DoomHazard,
	layout: GridLayout,
	p: number,
	soon: number,
	time: number
): void {
	const beam = beamOf(hazard, layout);
	if (beam) {
		warnBeam(ctx, beam, layout, p, soon, time);
	}
}

/** The same marking along any straight run of tiles (the cross's four arms). */
export function drawLaneWarning(
	ctx: CanvasRenderingContext2D,
	lane: Lane,
	layout: GridLayout,
	p: number,
	soon: number,
	time: number
): void {
	warnBeam(ctx, beamBetween(lane.a, lane.b, null, layout), layout, p, soon, time);
}

function warnBeam(
	ctx: CanvasRenderingContext2D,
	beam: Beam,
	layout: GridLayout,
	p: number,
	soon: number,
	time: number
): void {
	const s = layout.tileSize;
	const pts = seam(beam, s);
	ctx.save();
	frame(ctx, beam);
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	ctx.fillStyle = `rgba(30,2,6,${(0.2 + 0.3 * p) * soon})`;
	ctx.fillRect(-s * 0.5, -s * 0.5 + 1, beam.len + s, s - 2);
	ctx.strokeStyle = '#12030a';
	ctx.lineWidth = s * (0.05 + 0.08 * p);
	trace(ctx, pts);
	// the lips of flesh pull apart from the middle outwards
	for (let i = 0; i < pts.length - 1; i += 1) {
		const u = Math.abs(i / (pts.length - 1) - 0.5) * 2;
		if (u > p * 1.1 + 0.05) {
			continue;
		}
		const gap = s * (0.03 + 0.17 * p) * (0.6 + 0.4 * noise(i, 8));
		ctx.strokeStyle = `rgba(196,84,76,${0.9 * soon})`;
		ctx.lineWidth = s * 0.07;
		for (const side of [-1, 1]) {
			ctx.beginPath();
			ctx.moveTo(pts[i][0], pts[i][1] + side * gap);
			ctx.lineTo(pts[i + 1][0], pts[i + 1][1] + side * gap);
			ctx.stroke();
		}
	}
	ctx.globalCompositeOperation = 'lighter';
	ctx.strokeStyle = `rgba(255,58,26,${(0.2 + 0.7 * p) * soon})`;
	ctx.lineWidth = s * (0.05 + 0.1 * p);
	trace(ctx, pts);
	for (let i = 0; i < 10; i += 1) {
		const q = (time * 1.3 + noise(i, 5)) % 1;
		ctx.fillStyle = `rgba(255,170,80,${0.8 * p * (1 - q)})`;
		ctx.fillRect(-s * 0.5 + (beam.len + s) * noise(i, 6), -q * s * 1.1, 2, 2);
	}
	ctx.restore();
}

/** The burst, `k` 1 → 0 over its short life. */
export function drawRiftBeam(
	ctx: CanvasRenderingContext2D,
	hazard: DoomHazard,
	layout: GridLayout,
	k: number,
	time: number
): void {
	const beam = beamOf(hazard, layout);
	if (beam) {
		burstBeam(ctx, beam, layout, k, time);
	}
}

/** The same burst along any straight run of tiles. */
export function drawLaneBeam(
	ctx: CanvasRenderingContext2D,
	lane: Lane,
	layout: GridLayout,
	k: number,
	time: number
): void {
	burstBeam(ctx, beamBetween(lane.a, lane.b, null, layout), layout, k, time);
}

function burstBeam(
	ctx: CanvasRenderingContext2D,
	beam: Beam,
	layout: GridLayout,
	k: number,
	time: number
): void {
	const s = layout.tileSize;
	const pts = seam(beam, s);
	const wobble = 0.7 + 0.3 * Math.sin(time * 60);
	ctx.save();
	frame(ctx, beam);
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	// the gap: a dark band round the seam
	ctx.fillStyle = `rgba(8,2,6,${0.9 * k})`;
	ctx.beginPath();
	pts.forEach((p, i) =>
		i ? ctx.lineTo(p[0], p[1] - s * 0.34 * k) : ctx.moveTo(p[0], p[1] - s * 0.34 * k)
	);
	for (let i = pts.length - 1; i >= 0; i -= 1) {
		ctx.lineTo(pts[i][0], pts[i][1] + s * 0.34 * k);
	}
	ctx.closePath();
	ctx.fill();
	ctx.globalCompositeOperation = 'lighter';
	const layers: ReadonlyArray<readonly [string, number, number]> = [
		['255,40,20', 0.5, 1.1],
		['255,140,60', 0.8, 0.55],
		['255,255,240', 1, 0.16]
	];
	for (const [rgb, a, w] of layers) {
		ctx.strokeStyle = `rgba(${rgb},${a * k})`;
		ctx.lineWidth = s * w * wobble;
		trace(ctx, pts);
	}
	for (let i = 0; i < 26; i += 1) {
		const q = (1 - k) * 0.35 * 2.5 + noise(i, 11);
		ctx.fillStyle = `rgba(255,${Math.round(180 + 60 * noise(i, 3))},90,${k})`;
		const up = noise(i, 4) > 0.5 ? 1 : -1;
		ctx.fillRect(-s * 0.5 + (beam.len + s) * noise(i, 9), -((q * 1.4) % 1) * s * 1.3 * up, 3, 3);
	}
	ctx.restore();
}

/** What the rifts leave: a scar that smoulders and fades. */
export class RiftScars {
	private readonly scars: Array<{ hazard: DoomHazard; born: number }> = [];
	private readonly known = new WeakSet<DoomHazard>();

	/** Notes the rifts that have burst; call each frame with the live hazards. */
	track(hazards: readonly DoomHazard[], time: number): void {
		for (const h of hazards) {
			if (h.kind === 'rift' && h.warn <= 0 && !this.known.has(h)) {
				this.known.add(h);
				this.scars.push({ hazard: h, born: time });
			}
		}
		while (this.scars.length > 0 && time - this.scars[0].born > SCAR_LIFE + 1) {
			this.scars.shift();
		}
	}

	draw(ctx: CanvasRenderingContext2D, layout: GridLayout, time: number): void {
		const s = layout.tileSize;
		for (const { hazard, born } of this.scars) {
			const age = time - born - hazard.activeTotal * 0.6;
			const a = Math.min(1, Math.max(0, age / 0.2)) * Math.max(0, 1 - age / SCAR_LIFE);
			const beam = beamOf(hazard, layout);
			if (!beam || a <= 0) {
				continue;
			}
			const pts = seam(beam, s);
			ctx.save();
			frame(ctx, beam);
			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';
			ctx.strokeStyle = `rgba(10,2,4,${0.8 * a})`;
			ctx.lineWidth = s * 0.34;
			trace(ctx, pts);
			ctx.globalCompositeOperation = 'lighter';
			ctx.strokeStyle = `rgba(255,110,40,${0.45 * a * (0.6 + 0.4 * Math.sin(time * 5))})`;
			ctx.lineWidth = s * 0.06;
			trace(ctx, pts);
			for (let i = 0; i < 8; i += 1) {
				const q = (time * 0.7 + noise(i, 5)) % 1;
				ctx.fillStyle = `rgba(255,150,70,${0.7 * a * (1 - q)})`;
				ctx.fillRect(-s * 0.5 + (beam.len + s) * noise(i, 6), -q * s * 0.9, 2, 2);
			}
			ctx.restore();
		}
	}
}
