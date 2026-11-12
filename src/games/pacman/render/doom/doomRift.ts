// The rift and the cross's arms, drawn along a whole lane of tiles in the attacks' one visual
// language (`attackArt`): the warning is amber hazard hatching with a marching dashed edge, no
// glow and no fill; the blow is one continuous white-hot beam with an orange edge and a dark
// outline; what it leaves is only soot, so it is never taken for a live hazard. Drawn in screen
// pixels, along the corridor's axis.
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
	return { x0, y0, ang, len };
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
	const x0 = -s * 0.5;
	const w = beam.len + s;
	ctx.save();
	frame(ctx, beam);
	ctx.fillStyle = `rgba(24,8,2,${(0.3 + 0.25 * p) * soon})`;
	ctx.fillRect(x0, -s * 0.5 + 1, w, s - 2);
	ctx.save();
	ctx.beginPath();
	ctx.rect(x0, -s * 0.5 + 1, w, s - 2);
	ctx.clip();
	ctx.strokeStyle = `rgba(255,200,70,${(0.4 + 0.5 * p) * soon})`;
	ctx.lineWidth = s * 0.11;
	const step = s * 0.3;
	const off = (time * s * 0.5) % step;
	ctx.beginPath();
	for (let k = x0 - s; k < x0 + w; k += step) {
		ctx.moveTo(k + off, s * 0.5);
		ctx.lineTo(k + off + s, -s * 0.5);
	}
	ctx.stroke();
	ctx.restore();
	ctx.strokeStyle = `rgba(255,214,110,${0.9 * soon})`;
	ctx.lineWidth = Math.max(1.2, s * 0.06);
	ctx.setLineDash([s * 0.18, s * 0.12]);
	ctx.lineDashOffset = -time * s * 0.5;
	for (const side of [-1, 1]) {
		ctx.beginPath();
		ctx.moveTo(x0, side * (s * 0.5 - 1.5));
		ctx.lineTo(x0 + w, side * (s * 0.5 - 1.5));
		ctx.stroke();
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
	const x0 = -s * 0.5;
	const w = beam.len + s;
	const wobble = 0.85 + 0.15 * Math.sin(time * 60);
	ctx.save();
	frame(ctx, beam);
	ctx.fillStyle = `rgba(40,6,0,${0.7 * k})`;
	ctx.fillRect(x0, -s * 0.5, w, s);
	ctx.globalCompositeOperation = 'lighter';
	const g = ctx.createLinearGradient(0, -s * 0.5, 0, s * 0.5);
	g.addColorStop(0, 'rgba(255,60,10,0)');
	g.addColorStop(0.2, `rgba(255,110,30,${0.75 * k})`);
	g.addColorStop(0.5, `rgba(255,250,232,${k})`);
	g.addColorStop(0.8, `rgba(255,110,30,${0.75 * k})`);
	g.addColorStop(1, 'rgba(255,60,10,0)');
	ctx.fillStyle = g;
	ctx.fillRect(x0, -s * 0.5, w, s);
	ctx.fillStyle = `rgba(255,255,244,${0.9 * k})`;
	ctx.fillRect(x0, -s * 0.11 * wobble, w, s * 0.22 * wobble);
	ctx.globalCompositeOperation = 'source-over';
	// the outline: dark at the lane's edge, a pale line just inside it
	ctx.strokeStyle = `rgba(20,6,2,${0.95 * k})`;
	ctx.lineWidth = Math.max(1.6, s * 0.09);
	for (const side of [-1, 1]) {
		ctx.beginPath();
		ctx.moveTo(x0, side * (s * 0.5 - 0.5));
		ctx.lineTo(x0 + w, side * (s * 0.5 - 0.5));
		ctx.stroke();
	}
	ctx.strokeStyle = `rgba(255,240,200,${0.9 * k})`;
	ctx.lineWidth = Math.max(1, s * 0.04);
	for (const side of [-1, 1]) {
		ctx.beginPath();
		ctx.moveTo(x0, side * s * 0.41);
		ctx.lineTo(x0 + w, side * s * 0.41);
		ctx.stroke();
	}
	ctx.globalCompositeOperation = 'lighter';
	for (let i = 0; i < 20; i += 1) {
		const q = (1 - k) * 0.9 + noise(i, 11);
		ctx.fillStyle = `rgba(255,${Math.round(190 + 60 * noise(i, 3))},110,${k})`;
		const up = noise(i, 4) > 0.5 ? 1 : -1;
		ctx.fillRect(x0 + w * noise(i, 9), -((q * 1.3) % 1) * s * 0.9 * up, 2.5, 2.5);
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
			// only soot, with no glow: what is left must never read as a live hazard
			ctx.save();
			frame(ctx, beam);
			ctx.fillStyle = `rgba(10,3,4,${0.55 * a})`;
			ctx.fillRect(-s * 0.5, -s * 0.5 + 1, beam.len + s, s - 2);
			ctx.restore();
		}
	}
}
