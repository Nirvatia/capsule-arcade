// The station on screen (DESIGN.md §7a, style B): the camera, the baked scene scaled to the
// screen once, the dark (a small light map multiplied over everything, the vignette and the cold
// grade folded into it), and what glows by itself over the dark. A settled frame draws three
// full-screen layers (the scene, the dark, the glow); High adds the light's bloom and the grain.
import type { GridMatrix } from '../../config/gridConfig';
import { hudLayoutFor } from '../../config/hudLayout';
import { boardPlacement } from '../common/boardScale';
import type { RenderQuality } from '../common/renderQuality';
import { WORLD_TILE } from '../common/worldDecor';
import type { GridLayout } from '../maze/GridView';
import { context, makeCanvas } from '../doom/fleshNoise';
import type { StationBake } from './StationBake';
import { bakeStation } from './StationBake';
import type { Phase } from './stationPaint';
import { FRAME, MX, MY, T } from './stationPaint';
import type { StationLights } from './stationLight';
import { buildLightMap } from './stationLight';

/** Light-map resolution, a share of the screen's device pixels, per quality. */
const LIGHT_SCALE: Readonly<Record<RenderQuality, number>> = { high: 0.25, medium: 0.2, low: 0.16 };

export class StationWorld {
	private readonly grid: GridMatrix;
	private readonly rows: number;
	private readonly cols: number;
	private bake: StationBake | null = null;
	private quality: RenderQuality = 'high';
	private vw = 0;
	private vh = 0;
	private dpr = 1;
	private sc = 1;
	private wx = 0;
	private wy = 0;
	/** The scene of the current phase at the screen's size (with its scanlines). */
	private baseView: { phase: Phase; canvas: HTMLCanvasElement } | null = null;
	/** What glows by itself, per phase, at the screen's size. */
	private readonly glowViews = new Map<string, HTMLCanvasElement>();
	private lightMap: HTMLCanvasElement | null = null;
	private soft: HTMLCanvasElement | null = null;
	private bloom: HTMLCanvasElement | null = null;
	private post: HTMLCanvasElement | null = null;
	private grain: HTMLCanvasElement | null = null;

	constructor(grid: GridMatrix) {
		this.grid = grid;
		this.rows = grid.length;
		this.cols = grid[0]?.length ?? 0;
	}

	get layout(): GridLayout {
		return { tileSize: WORLD_TILE * this.sc, offsetX: this.wx, offsetY: this.wy };
	}

	/** The lamps of the station (tile coordinates). */
	get lamps(): StationBake['lamps'] {
		return this.ensureBake().lamps;
	}

	setQuality(quality: RenderQuality): void {
		if (quality !== this.quality) {
			this.quality = quality;
			this.lightMap = null;
			this.post = null;
		}
	}

	resize(vw: number, vh: number, dpr: number): void {
		if (vw === this.vw && vh === this.vh && dpr === this.dpr) {
			return;
		}
		this.vw = vw;
		this.vh = vh;
		this.dpr = dpr;
		const hud = hudLayoutFor(vw, vh);
		const board = boardPlacement(vw, vh, this.cols, this.rows, WORLD_TILE, hud.top, hud.bottom);
		this.sc = board.scale;
		this.wx = board.x;
		this.wy = board.y;
		this.baseView = null;
		this.glowViews.clear();
		this.lightMap = null;
		this.post = null;
		// bake again only when the screen asks for clearly more detail than the bake has
		const wanted = Math.round(((WORLD_TILE * this.sc * dpr) / T) * 4) / 4;
		if (this.bake && wanted > this.bake.k * 1.3) {
			this.bake = null;
		}
	}

	/** The scene of `phase` (the nest's resin grown that far). */
	drawWorld(ctx: CanvasRenderingContext2D, phase: Phase): void {
		if (this.baseView?.phase !== phase) {
			this.baseView = { phase, canvas: this.sceneAtScreen(phase) };
		}
		ctx.drawImage(this.baseView.canvas, 0, 0, this.vw, this.vh);
	}

	/** The dark: the light map multiplied over everything drawn so far, then its bloom. */
	drawDark(ctx: CanvasRenderingContext2D, lights: StationLights): void {
		const ls = LIGHT_SCALE[this.quality];
		const w = Math.max(1, Math.ceil(this.vw * this.dpr * ls));
		const h = Math.max(1, Math.ceil(this.vh * this.dpr * ls));
		if (!this.lightMap || this.lightMap.width !== w || this.lightMap.height !== h) {
			this.lightMap = makeCanvas(w, h);
			this.soft = makeCanvas(w, h);
			this.bloom = makeCanvas(w, h);
		}
		const f = this.dpr * ls;
		buildLightMap(context(this.lightMap), f, this.layout, this.lamps, lights);
		// the vignette and the cold grade, folded into the map: no extra full-screen layer
		const lm = context(this.lightMap);
		lm.setTransform(1, 0, 0, 1, 0, 0);
		lm.globalCompositeOperation = 'multiply';
		lm.drawImage(this.postLayer(w, h), 0, 0);
		lm.globalCompositeOperation = 'source-over';
		const soft = this.soft as HTMLCanvasElement;
		const sc = context(soft);
		sc.globalCompositeOperation = 'copy';
		sc.filter = 'blur(1px)';
		sc.drawImage(this.lightMap, 0, 0);
		sc.filter = 'none';
		ctx.save();
		ctx.imageSmoothingEnabled = true;
		ctx.globalCompositeOperation = 'multiply';
		ctx.drawImage(soft, 0, 0, this.vw, this.vh);
		if (this.quality === 'high') {
			const bloom = this.bloom as HTMLCanvasElement;
			const bc = context(bloom);
			bc.globalCompositeOperation = 'copy';
			bc.filter = 'blur(5px)';
			bc.drawImage(this.lightMap, 0, 0);
			bc.filter = 'none';
			ctx.globalCompositeOperation = 'lighter';
			ctx.globalAlpha = 0.14;
			ctx.drawImage(bloom, 0, 0, this.vw, this.vh);
		}
		ctx.restore();
	}

	/**
	 * What glows by itself over the dark: the surround's lamps and the walls' safety edge, one
	 * continuous line round every block, lit in every phase. Nothing here blinks.
	 */
	drawGlow(ctx: CanvasRenderingContext2D, phase: Phase, time: number): void {
		const key = String(phase);
		let view = this.glowViews.get(key);
		if (!view) {
			view = this.glowAtScreen(phase);
			this.glowViews.set(key, view);
		}
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.globalAlpha = 0.88 + 0.08 * Math.sin(time * 0.8);
		ctx.drawImage(view, 0, 0, this.vw, this.vh);
		ctx.restore();
	}

	/** Film grain crawling over the frame (High only). */
	drawGrain(ctx: CanvasRenderingContext2D, time: number): void {
		if (this.quality !== 'high') {
			return;
		}
		if (!this.grain) {
			const g = makeCanvas(256, 256);
			const c = context(g);
			const im = c.createImageData(256, 256);
			for (let i = 0; i < im.data.length; i += 4) {
				const v = Math.random() * 255;
				im.data[i] = v;
				im.data[i + 1] = v;
				im.data[i + 2] = v;
				im.data[i + 3] = 30;
			}
			c.putImageData(im, 0, 0);
			this.grain = g;
		}
		const pattern = ctx.createPattern(this.grain, 'repeat');
		if (!pattern) {
			return;
		}
		pattern.setTransform(new DOMMatrix().translate((time * 977) % 256, (time * 631) % 256));
		ctx.save();
		ctx.globalCompositeOperation = 'overlay';
		ctx.fillStyle = pattern;
		ctx.fillRect(0, 0, this.vw, this.vh);
		ctx.restore();
	}

	private ensureBake(): StationBake {
		if (!this.bake) {
			const tilePx = WORLD_TILE * this.sc * this.dpr;
			const k = Math.max(0.75, Math.min(1.5, Math.round((tilePx / T) * 4) / 4 || 1));
			this.bake = bakeStation(this.grid, k);
		}
		return this.bake;
	}

	/** The baked frame's placement on screen (css px). */
	private sceneRect(): { x: number; y: number; w: number; h: number } {
		const s = (WORLD_TILE * this.sc) / T;
		return { x: this.wx - MX * s, y: this.wy - MY * s, w: FRAME.w * s, h: FRAME.h * s };
	}

	private screenCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
		const c = makeCanvas(this.vw * this.dpr, this.vh * this.dpr);
		const x = context(c);
		x.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
		x.imageSmoothingQuality = 'high';
		return [c, x];
	}

	private sceneAtScreen(phase: Phase): HTMLCanvasElement {
		const bake = this.ensureBake();
		const r = this.sceneRect();
		const [c, x] = this.screenCanvas();
		x.fillStyle = '#050606';
		x.fillRect(0, 0, this.vw, this.vh);
		x.drawImage(bake.base, r.x, r.y, r.w, r.h);
		x.drawImage(bake.resin(phase), r.x, r.y, r.w, r.h);
		// faint scanlines, baked into the scene (the actors stay clean)
		x.fillStyle = 'rgba(0,0,0,.12)';
		for (let y = 0; y < this.vh; y += 3) {
			x.fillRect(0, y, this.vw, 1);
		}
		return c;
	}

	private glowAtScreen(phase: Phase): HTMLCanvasElement {
		const bake = this.ensureBake();
		const r = this.sceneRect();
		const [c, x] = this.screenCanvas();
		x.globalCompositeOperation = 'lighter';
		x.globalAlpha = phase === 1 ? 1 : 0.55;
		x.drawImage(bake.glow, r.x, r.y, r.w, r.h);
		x.globalAlpha = 0.7;
		x.drawImage(bake.edge, r.x, r.y, r.w, r.h);
		return c;
	}

	/** The vignette and the cold, sick grade, as one small multiply layer. */
	private postLayer(w: number, h: number): HTMLCanvasElement {
		if (this.post && this.post.width === w && this.post.height === h) {
			return this.post;
		}
		const c = makeCanvas(w, h);
		const x = context(c);
		x.fillStyle = 'rgb(214,228,218)';
		x.fillRect(0, 0, w, h);
		const g = x.createRadialGradient(
			w / 2,
			h / 2,
			Math.min(w, h) * 0.35,
			w / 2,
			h / 2,
			Math.max(w, h) * 0.75
		);
		g.addColorStop(0, 'rgba(0,0,0,0)');
		g.addColorStop(1, 'rgba(0,0,0,.85)');
		x.fillStyle = g;
		x.fillRect(0, 0, w, h);
		this.post = c;
		return c;
	}
}
