// The night forest's world (`DESIGN.md` §7b): the baked forest (`forestBake`) over the whole screen
// and, every frame, the light over it: the darkness (a dark veil with wisps in it) cut open by the
// lamps' pools, the torch's cone, the flares and the lair's cold glow, all of them cast over the
// maze's grid so the thickets throw crisp shadows; the fog, cool in the shade and warm in the light;
// the moonlight the dark never fully hides; and at the end a vignette, a cold grade and grain.
// The level renderer puts the actors between these steps. All drawn in code.
import type { GridMatrix } from '../../config/gridConfig';
import { visibility } from '../../logic/nightwood/lightRays';
import type { Solid } from '../../logic/nightwood/lightRays';
import { forestKind } from '../../logic/nightwood/nightwoodLamps';
import type { GridLayout } from '../maze/GridView';
import { hudLayoutFor } from '../../config/hudLayout';
import { boardPlacement } from '../common/boardScale';
import type { RenderQuality } from '../common/renderQuality';
import { bakeForest, paintLampPost } from './forestBake';
import { placeLamps } from '../../logic/nightwood/nightwoodLamps';
import type { ForestBake, ForestLayout } from './forestBake';
import { makeCloud, makeGrain } from './nightArt';
import { TAU, lerp } from './noise';

type Ctx = CanvasRenderingContext2D;

/** What lights the forest this frame. Positions are in tiles. */
export interface LightInput {
	readonly time: number;
	readonly lamps: ReadonlyArray<{
		readonly x: number;
		readonly y: number;
		readonly r: number;
		readonly state: 'on' | 'tell' | 'out';
	}>;
	readonly flares: ReadonlyArray<{ readonly x: number; readonly y: number; readonly k: number }>;
	/** The hero's torch (null while he is gone), the flash's glare 0..1 and the battery lit. */
	readonly hero: {
		readonly x: number;
		readonly y: number;
		readonly heading: number;
		readonly torch: boolean;
	} | null;
	readonly flash: number;
	/** The lair's glow: where it is (tiles) and how wild the Presence is, 0..1. */
	readonly clearing: { readonly x: number; readonly y: number };
	readonly rage: number;
	/** The dawn, 0 night to 1 morning: the dark thins out. */
	readonly dawn: number;
	readonly fog: boolean;
}

const COLD_STOPS = [
	[0, 'rgba(0,0,0,1)'],
	[0.28, 'rgba(0,0,0,0.95)'],
	[0.6, 'rgba(0,0,0,0.55)'],
	[0.85, 'rgba(0,0,0,0.16)'],
	[1, 'rgba(0,0,0,0)']
] as const;
const LAMP_STOPS = [
	[0, 'rgba(255,200,115,0.34)'],
	[0.3, 'rgba(255,172,82,0.2)'],
	[0.65, 'rgba(255,140,60,0.1)'],
	[1, 'rgba(255,120,40,0)']
] as const;
const FLARE_STOPS = [
	[0, 'rgba(255,120,70,0.5)'],
	[0.4, 'rgba(255,80,50,0.25)'],
	[1, 'rgba(255,60,40,0)']
] as const;
const CONE_STOPS = [
	[0, 'rgba(225,238,255,0.5)'],
	[0.35, 'rgba(205,225,255,0.3)'],
	[0.75, 'rgba(180,205,240,0.1)'],
	[1, 'rgba(180,205,240,0)']
] as const;

const make = (w: number, h: number): [HTMLCanvasElement, Ctx] => {
	const cv = document.createElement('canvas');
	cv.width = Math.max(1, Math.round(w));
	cv.height = Math.max(1, Math.round(h));
	return [cv, cv.getContext('2d') as Ctx];
};

/** Fills a light's polygon (tile coordinates) with a radial falloff of `stops`. */
function paintLight(
	c: Ctx,
	S: number,
	poly: readonly number[],
	R: number,
	stops: ReadonlyArray<readonly [number, string]>
): void {
	const ox = poly[0] * S;
	const oy = poly[1] * S;
	const g = c.createRadialGradient(ox, oy, 0, ox, oy, R * S);
	for (const [t, col] of stops) {
		g.addColorStop(t, col);
	}
	c.fillStyle = g;
	c.beginPath();
	c.moveTo(ox, oy);
	for (let i = 2; i < poly.length; i += 2) {
		c.lineTo(poly[i] * S, poly[i + 1] * S);
	}
	c.closePath();
	c.fill();
}

export class NightwoodWorld {
	readonly grid: GridMatrix;
	readonly cols: number;
	readonly rows: number;
	private quality: RenderQuality = 'high';
	private vw = 0;
	private vh = 0;
	private dpr = 0;
	private place: ForestLayout = { tile: 1, x: 0, y: 0 };
	private bake: ForestBake | null = null;
	private dk: [HTMLCanvasElement, Ctx] | null = null;
	private gl: [HTMLCanvasElement, Ctx] | null = null;
	private lf: [HTMLCanvasElement, Ctx] | null = null;
	/** The lamps' lit polygons, cast once per lamp and layout. */
	private readonly pools = new Map<string, number[]>();
	private readonly solid: Solid;
	private readonly lairSolid: Solid;
	private fogCool: HTMLCanvasElement | null = null;
	private fogWarm: HTMLCanvasElement | null = null;
	private wisp: HTMLCanvasElement | null = null;
	private grain: HTMLCanvasElement | null = null;

	constructor(grid: GridMatrix) {
		this.grid = grid;
		this.rows = grid.length;
		this.cols = grid[0]?.length ?? 0;
		const kind = (x: number, y: number) =>
			x < 0 || y < 0 || x >= this.cols || y >= this.rows ? 'void' : forestKind(grid[y]?.[x]);
		this.solid = (x, y) => {
			const k = kind(x, y);
			return k === 'wall' || k === 'void' || k === 'lair';
		};
		this.lairSolid = (x, y) => {
			const k = kind(x, y);
			return k === 'wall' || k === 'void';
		};
	}

	setQuality(quality: RenderQuality): void {
		if (quality !== this.quality) {
			this.quality = quality;
			this.dpr = 0;
		}
	}

	get layout(): GridLayout {
		return { tileSize: this.place.tile, offsetX: this.place.x, offsetY: this.place.y };
	}

	/** The maze fitted like every world's (the HUD's bands kept free); the forest round it. */
	resize(vw: number, vh: number, dpr: number): void {
		const D = Math.min(dpr, this.quality === 'low' ? 1 : 1.5);
		if (vw === this.vw && vh === this.vh && D === this.dpr) {
			return;
		}
		this.vw = vw;
		this.vh = vh;
		this.dpr = D;
		const hud = hudLayoutFor(vw, vh);
		const board = boardPlacement(vw, vh, this.cols, this.rows, 1, hud.top, hud.bottom);
		this.place = { tile: board.scale, x: board.x, y: board.y };
		this.bake = bakeForest(this.grid, this.place, vw, vh, D);
		// the lamp posts stand in the forest whether their lamps burn or not
		const bc = this.bake.canvas.getContext('2d');
		if (bc) {
			bc.save();
			bc.scale(D, D);
			for (const lamp of placeLamps(this.grid)) paintLampPost(bc, lamp, this.place);
			bc.restore();
		}
		const W = this.cols * board.scale * D;
		const H = this.rows * board.scale * D;
		this.dk = make(W, H);
		this.gl = make(W, H);
		this.lf = make(W, H);
		this.pools.clear();
		this.fogCool ??= makeCloud(256, [150, 178, 198], 3, 4, 0.4, 0.9, 0.55);
		this.fogWarm ??= makeCloud(256, [236, 206, 168], 3, 4, 0.4, 0.9, 0.9);
		this.wisp ??= makeCloud(256, [52, 90, 128], 9, 3, 0.45, 0.92, 0.55);
		this.grain ??= makeGrain();
	}

	/** Stage space: tile units from the grid's corner, in css px (what the actors are placed in). */
	enter(ctx: Ctx): void {
		ctx.save();
		ctx.translate(this.place.x, this.place.y);
		ctx.scale(this.place.tile, this.place.tile);
	}

	/** The forest under everything, exposed a little brighter where the light will land. */
	drawGround(ctx: Ctx): void {
		const b = this.bake;
		if (!b) {
			return;
		}
		ctx.save();
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
		ctx.drawImage(b.canvas, 0, 0, this.vw, this.vh);
		ctx.globalCompositeOperation = 'lighter';
		ctx.globalAlpha = 0.3;
		ctx.drawImage(b.canvas, 0, 0, this.vw, this.vh);
		ctx.restore();
	}

	/** A tileable texture scrolled across a context. */
	private scroll(
		c: Ctx,
		tex: HTMLCanvasElement,
		size: number,
		ox: number,
		oy: number,
		w: number,
		h: number
	): void {
		const pat = c.createPattern(tex, 'repeat');
		if (!pat) {
			return;
		}
		pat.setTransform(new DOMMatrix().translate(ox, oy).scale(size / tex.width));
		c.fillStyle = pat;
		c.fillRect(0, 0, w, h);
	}

	private pool(key: string, ox: number, oy: number, r: number, solid: Solid, n = 150): number[] {
		let poly = this.pools.get(key);
		if (!poly) {
			poly = visibility(solid, ox, oy, 0, TAU, n, r);
			this.pools.set(key, poly);
		}
		return poly;
	}

	/** The fog, the dark with its holes, the moonlight, the glow of every light, the haze it shows. */
	drawLight(ctx: Ctx, L: LightInput): void {
		const bake = this.bake;
		const dk = this.dk;
		const gl = this.gl;
		const lf = this.lf;
		if (!bake || !dk || !gl || !lf) {
			return;
		}
		const S = this.place.tile;
		const D = this.dpr;
		const W = this.cols * S;
		const H = this.rows * S;
		const { x: gx, y: gy } = this.place;
		const t = L.time;
		const night = `rgba(2,6,12,${lerp(0.9, 0.3, L.dawn).toFixed(3)})`;
		const fogOn = L.fog && this.quality !== 'low';

		// the fog over the shade (the cool one), over the whole screen
		if (fogOn && this.fogCool) {
			ctx.save();
			ctx.globalCompositeOperation = 'screen';
			ctx.globalAlpha = 0.34;
			ctx.translate(0, 0);
			this.scroll(ctx, this.fogCool, S * 16, t * 6, t * 2.5, this.vw, this.vh);
			ctx.globalAlpha = 0.22;
			this.scroll(ctx, this.fogCool, S * 10, -t * 4 + 40, t * 3.5 + 90, this.vw, this.vh);
			ctx.restore();
		}

		// ---- the darkness, with its wisps, cut open by every light (the stage's own canvas)
		const [dkc, dc] = dk;
		dc.setTransform(1, 0, 0, 1, 0, 0);
		dc.globalCompositeOperation = 'copy';
		dc.fillStyle = night;
		dc.globalAlpha = 1;
		dc.fillRect(0, 0, dkc.width, dkc.height);
		dc.globalCompositeOperation = 'lighter';
		dc.setTransform(D, 0, 0, D, 0, 0);
		if (this.wisp) {
			dc.globalAlpha = 0.5 * (1 - L.dawn);
			this.scroll(dc, this.wisp, S * 12, t * 5, -t * 3, W, H);
			dc.globalAlpha = 0.4 * (1 - L.dawn);
			this.scroll(dc, this.wisp, S * 7.5, -t * 7 + 30, t * 4, W, H);
		}
		dc.globalAlpha = 1;
		dc.globalCompositeOperation = 'destination-out';
		const [glc, gc] = gl;
		gc.setTransform(1, 0, 0, 1, 0, 0);
		gc.globalCompositeOperation = 'copy';
		gc.fillStyle = 'rgba(0,0,0,0)';
		gc.fillRect(0, 0, glc.width, glc.height);
		gc.setTransform(D, 0, 0, D, 0, 0);
		gc.globalCompositeOperation = 'lighter';
		L.lamps.forEach((l, i) => {
			if (l.state === 'out') {
				return;
			}
			const k =
				l.state === 'tell'
					? 0.25 + 0.75 * Math.max(0, Math.sin(t * 31 + i) * Math.sin(t * 17))
					: 0.93 + 0.07 * Math.sin(t * 11 + i) * Math.sin(t * 2.7);
			const poly = this.pool(`lamp${i}`, l.x, l.y, l.r, this.solid);
			dc.globalAlpha = k;
			paintLight(dc, S, poly, l.r, COLD_STOPS);
			gc.globalAlpha = k;
			paintLight(gc, S, poly, l.r, LAMP_STOPS);
		});
		dc.globalAlpha = 1;
		gc.globalAlpha = 1;
		for (const f of L.flares) {
			const r = 4.5;
			const poly = visibility(this.solid, f.x + 0.5, f.y + 0.5, 0, TAU, 80, r);
			dc.globalAlpha = f.k;
			paintLight(dc, S, poly, r, COLD_STOPS);
			gc.globalAlpha = f.k;
			paintLight(gc, S, poly, r, FLARE_STOPS);
		}
		dc.globalAlpha = 1;
		gc.globalAlpha = 1;
		if (L.hero) {
			const h = L.hero;
			if (h.torch) {
				const range = 7.5;
				const spread = 0.5;
				const cone = visibility(
					this.solid,
					h.x,
					h.y,
					h.heading - spread,
					h.heading + spread,
					70,
					range
				);
				paintLight(dc, S, cone, range, COLD_STOPS);
				paintLight(gc, S, cone, range, CONE_STOPS);
				const core = visibility(
					this.solid,
					h.x,
					h.y,
					h.heading - 0.14,
					h.heading + 0.14,
					24,
					range + 1.5
				);
				paintLight(gc, S, core, range + 1.5, [
					[0, 'rgba(255,255,255,0.4)'],
					[0.5, 'rgba(235,245,255,0.16)'],
					[1, 'rgba(235,245,255,0)']
				]);
			}
			const halo = h.torch ? 1.7 : 1.1;
			const ring = visibility(this.solid, h.x, h.y, 0, TAU, 80, halo);
			paintLight(dc, S, ring, halo, COLD_STOPS);
			paintLight(gc, S, ring, halo, [
				[0, 'rgba(215,232,255,0.34)'],
				[0.5, 'rgba(200,222,255,0.14)'],
				[1, 'rgba(200,220,255,0)']
			]);
			if (L.flash > 0) {
				const r = 3.6;
				const burst = visibility(this.solid, h.x, h.y, 0, TAU, 90, r);
				dc.globalAlpha = L.flash;
				paintLight(dc, S, burst, r, COLD_STOPS);
				gc.globalAlpha = L.flash;
				paintLight(gc, S, burst, r, [
					[0, 'rgba(255,255,255,0.8)'],
					[0.5, 'rgba(235,245,255,0.4)'],
					[1, 'rgba(235,245,255,0)']
				]);
				dc.globalAlpha = 1;
				gc.globalAlpha = 1;
			}
		}
		{
			// the clearing's own cold glow, the lair's light leaking out at its gate
			const r = 3.9;
			const lair = this.pool('lair', L.clearing.x, L.clearing.y, r, this.lairSolid, 90);
			paintLight(dc, S, lair, r, COLD_STOPS);
			const k = 0.7 + 0.3 * Math.sin(t * 1.8) + 0.3 * L.rage;
			paintLight(gc, S, lair, r, [
				[0, `rgba(140,185,255,${0.5 * k})`],
				[0.5, `rgba(90,140,220,${0.26 * k})`],
				[1, 'rgba(70,110,200,0)']
			]);
		}

		// ---- onto the screen: the dark (the stage's, and a flat veil round it), the moonlight, the glow
		ctx.save();
		ctx.globalCompositeOperation = 'source-over';
		ctx.fillStyle = night;
		ctx.fillRect(0, 0, this.vw, gy);
		ctx.fillRect(0, gy + H, this.vw, this.vh - gy - H);
		ctx.fillRect(0, gy, gx, H);
		ctx.fillRect(gx + W, gy, this.vw - gx - W, H);
		ctx.drawImage(dkc, gx, gy, W, H);
		// the veil round the stage is as pale as the stage's own (its wisps lift the dark a little)
		ctx.globalCompositeOperation = 'lighter';
		ctx.fillStyle = 'rgba(7,14,24,0.5)';
		ctx.fillRect(0, 0, this.vw, gy);
		ctx.fillRect(0, gy + H, this.vw, this.vh - gy - H);
		ctx.fillRect(0, gy, gx, H);
		ctx.fillRect(gx + W, gy, this.vw - gx - W, H);
		ctx.globalCompositeOperation = 'source-over';
		ctx.globalCompositeOperation = 'lighter';
		ctx.globalAlpha = 0.34 + 0.3 * L.dawn;
		ctx.drawImage(bake.moon, 0, 0, this.vw, this.vh);
		ctx.globalAlpha = 1;
		ctx.drawImage(glc, gx, gy, W, H);
		ctx.restore();

		// ---- the fog where the light is: a warm haze in the pools, a cold veil in the beam
		if (fogOn && this.fogWarm) {
			const [lfc, lc] = lf;
			lc.setTransform(1, 0, 0, 1, 0, 0);
			lc.globalCompositeOperation = 'copy';
			lc.fillStyle = 'rgba(0,0,0,0)';
			lc.fillRect(0, 0, lfc.width, lfc.height);
			lc.setTransform(D, 0, 0, D, 0, 0);
			lc.globalCompositeOperation = 'source-over';
			lc.globalAlpha = 1;
			this.scroll(lc, this.fogWarm, S * 16, t * 6, t * 2.5, W, H);
			lc.globalAlpha = 0.7;
			this.scroll(lc, this.fogWarm, S * 10, -t * 4 + 40, t * 3.5 + 90, W, H);
			lc.globalAlpha = 1;
			lc.setTransform(1, 0, 0, 1, 0, 0);
			lc.globalCompositeOperation = 'destination-in';
			lc.drawImage(glc, 0, 0);
			ctx.save();
			ctx.globalCompositeOperation = 'lighter';
			ctx.drawImage(lfc, gx, gy, W, H);
			ctx.restore();
		}
	}

	/** The picture: a vignette, black lifted to a cold blue, a grain that moves. */
	drawPost(ctx: Ctx, time: number, dawn: number): void {
		const { vw, vh } = this;
		ctx.save();
		const vg = ctx.createRadialGradient(
			vw / 2,
			vh / 2,
			Math.min(vw, vh) * 0.35,
			vw / 2,
			vh / 2,
			Math.max(vw, vh) * 0.78
		);
		vg.addColorStop(0, 'rgba(0,0,0,0)');
		vg.addColorStop(1, `rgba(0,0,0,${(0.6 * (1 - 0.6 * dawn)).toFixed(3)})`);
		ctx.fillStyle = vg;
		ctx.fillRect(0, 0, vw, vh);
		ctx.globalCompositeOperation = 'lighten';
		ctx.fillStyle = 'rgb(6,15,24)';
		ctx.fillRect(0, 0, vw, vh);
		if (this.grain && this.quality === 'high') {
			ctx.globalCompositeOperation = 'overlay';
			ctx.globalAlpha = 0.1;
			const ox = Math.floor((time * 977) % 96) - 96;
			const oy = Math.floor((time * 631) % 96) - 96;
			ctx.drawImage(this.grain, ox, oy, vw + 192, vh + 192);
		}
		ctx.restore();
	}
}
