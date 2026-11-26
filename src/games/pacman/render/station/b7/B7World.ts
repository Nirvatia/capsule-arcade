// The station B-7 on screen (the owner's mock-up, `b7Scene`), composed for the game's frame
// budget: the hull and the baked architecture are one screen-sized layer, redrawn only on a
// resize; the infestation of the phase is a second one, redrawn only when the phase changes; the
// live props draw over them in stage space; the infection (0..1) reveals the infestation from
// the lair out (`B7Hive`: veins, then flesh, the torn lair doors) and sinks the light, the
// hive's heartbeat over the light (not on Low); the light map is a small canvas of sprite lights
// (no gradient per frame), its bloom a downscale (no canvas filter, which Safari lacks); the
// grain and the bloom are High only, the food's emissive lift Medium and up.
import type { GridMatrix } from '../../../config/gridConfig';
import { hudLayoutFor } from '../../../config/hudLayout';
import { boardPlacement } from '../../common/boardScale';
import type { RenderQuality } from '../../common/renderQuality';
import type { GridLayout } from '../../maze/GridView';
import { createB7Scene } from './b7Scene';
import { B7Hive } from './b7Hive';

export type B7Phase = 1 | 2 | 3;
export type B7Light = 'quarantine' | 'alert';

/** The light map's resolution against the screen (the mock-up's). */
const LIGHT_SCALE = 0.32;

/** The mock-up's phase for the props that still go by it (the tanks, the screens, the steam). */
export function phaseOf(infection: number): B7Phase {
	return infection < 0.34 ? 1 : infection < 0.72 ? 2 : 3;
}

function canvas(w: number, h: number): HTMLCanvasElement {
	const c = document.createElement('canvas');
	c.width = Math.max(1, Math.ceil(w));
	c.height = Math.max(1, Math.ceil(h));
	return c;
}

function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
	return c.getContext('2d') as CanvasRenderingContext2D;
}

export class B7World {
	readonly scene: ReturnType<typeof createB7Scene>;
	private readonly base: HTMLCanvasElement;
	/** The infestation at its fullest, revealed from the lair out as the infection grows. */
	private readonly hive: B7Hive;
	private readonly grain: HTMLCanvasElement;
	private quality: RenderQuality = 'high';
	private vw = 0;
	private vh = 0;
	private dpr = 1;
	/** Stage units to css px, and where the stage's origin lands. */
	private scale = 1;
	private offX = 0;
	private offY = 0;
	private staticView: HTMLCanvasElement | null = null;
	private hiveView: { key: string; canvas: HTMLCanvasElement } | null = null;
	private lightMap: HTMLCanvasElement | null = null;
	private bloom: HTMLCanvasElement | null = null;

	constructor(grid: GridMatrix) {
		// the lair's doors are the hive's (torn apart), not the scene's
		this.scene = createB7Scene(grid, { lairDoors: false });
		this.base = this.scene.bakeBaseScene();
		this.grain = this.scene.buildGrainTile();
		// the infestation at its fullest, baked once with the level
		this.hive = new B7Hive(this.scene, grid);
	}

	setQuality(quality: RenderQuality): void {
		this.quality = quality;
	}

	get layout(): GridLayout {
		const { TILE, MAZE_X, MAZE_Y } = this.scene;
		return {
			tileSize: TILE * this.scale,
			offsetX: this.offX + MAZE_X * this.scale,
			offsetY: this.offY + MAZE_Y * this.scale
		};
	}

	/** The maze fitted like every world's (the HUD's bands kept free); the stage round it. */
	resize(vw: number, vh: number, dpr: number): void {
		if (vw === this.vw && vh === this.vh && dpr === this.dpr) return;
		this.vw = vw;
		this.vh = vh;
		this.dpr = dpr;
		const { TILE, MAZE_X, MAZE_Y, COLS, ROWS } = this.scene;
		const hud = hudLayoutFor(vw, vh);
		const board = boardPlacement(vw, vh, COLS, ROWS, TILE, hud.top, hud.bottom);
		this.scale = board.scale;
		this.offX = board.x - MAZE_X * board.scale;
		this.offY = board.y - MAZE_Y * board.scale;
		this.staticView = null;
		this.hiveView = null;
		const lw = Math.max(64, Math.ceil(vw * LIGHT_SCALE));
		const lh = Math.max(64, Math.ceil(vh * LIGHT_SCALE));
		this.lightMap = canvas(lw, lh);
		this.bloom = canvas(Math.ceil(lw / 4), Math.ceil(lh / 4));
	}

	/** Stage space on `ctx` (css px): for whatever the game draws in it. */
	enter(ctx: CanvasRenderingContext2D): void {
		ctx.save();
		ctx.translate(this.offX, this.offY);
		ctx.scale(this.scale, this.scale);
	}

	/** A screen layer at device resolution holding `paint` in stage space. */
	private screenLayer(paint: (g: CanvasRenderingContext2D) => void): HTMLCanvasElement {
		const c = canvas(this.vw * this.dpr, this.vh * this.dpr);
		const g = ctx2d(c);
		g.setTransform(
			this.dpr * this.scale,
			0,
			0,
			this.dpr * this.scale,
			this.dpr * this.offX,
			this.dpr * this.offY
		);
		paint(g);
		return c;
	}

	/** The world under the actors: steps 1-11 of the mock-up's frame. */
	drawScene(
		ctx: CanvasRenderingContext2D,
		time: number,
		dt: number,
		infection: number,
		showProps: boolean
	): void {
		const s = this.scene;
		const phase = phaseOf(infection);
		s.setInfection(infection);
		if (!this.staticView) {
			this.staticView = this.screenLayer((g) => {
				const minX = -this.offX / this.scale - 4;
				const minY = -this.offY / this.scale - 4;
				s.drawInfiniteHullBackdrop(
					g,
					minX,
					minY,
					this.vw / this.scale + 8,
					this.vh / this.scale + 8
				);
				g.drawImage(this.base, 0, 0, s.STAGE_W, s.STAGE_H);
			});
		}
		const key = this.hive.key(infection);
		if (!this.hiveView || this.hiveView.key !== key) {
			this.hiveView = {
				key,
				canvas: this.screenLayer((g) => this.hive.paint(g, infection))
			};
		}
		ctx.drawImage(this.staticView, 0, 0, this.vw, this.vh);
		this.enter(ctx);
		s.drawLiveDuctTurbines(ctx, time, phase);
		s.drawLiveBiolabTanks(ctx, time, phase);
		s.drawLiveViewportAndWindowGlint(ctx, time);
		s.drawLiveObsConsoleScreens(ctx, time, phase);
		s.drawLiveRoofFans(ctx, time, phase);
		ctx.restore();
		ctx.drawImage(this.hiveView.canvas, 0, 0, this.vw, this.vh);
		this.enter(ctx);
		if (showProps) s.drawEscapeProps(ctx, time, phase);
		s.drawLairCocoons(ctx, time, phase);
		s.drawBioSpores(ctx, time, showProps);
		s.drawLabPowerCellsEU(ctx, time);
		s.drawAtmosphereFX(ctx, dt, time, phase);
		ctx.restore();
	}

	/** Step 12: the light map multiplied over the world, the food's lift, the bloom. */
	drawLight(
		ctx: CanvasRenderingContext2D,
		time: number,
		infection: number,
		mode: B7Light,
		showProps: boolean,
		/** What lies with the food and must be lifted like it (the lurkers), in stage space. */
		lift?: (ctx: CanvasRenderingContext2D) => void
	): void {
		const lightMap = this.lightMap;
		const bloom = this.bloom;
		if (!lightMap || !bloom) return;
		const s = this.scene;
		const phase = phaseOf(infection);
		s.setInfection(infection);
		const ls = lightMap.width / Math.max(1, this.vw);
		s.renderLightmap(
			ctx2d(lightMap),
			this.scale,
			this.offX,
			this.offY,
			ls,
			time,
			phase,
			mode,
			true,
			showProps
		);
		ctx.save();
		ctx.imageSmoothingEnabled = true;
		ctx.globalCompositeOperation = 'multiply';
		ctx.drawImage(lightMap, 0, 0, this.vw, this.vh);
		ctx.globalCompositeOperation = 'source-over';
		const hot = mode === 'alert' || phase === 3;
		if (this.quality !== 'low') {
			// the food stays luminous under the light map (the mock-up's emissive lift)
			this.enter(ctx);
			ctx.globalAlpha = hot ? 0.68 : 0.48;
			s.drawBioSpores(ctx, time, showProps);
			lift?.(ctx);
			ctx.globalAlpha = hot ? 0.78 : 0.6;
			s.drawLabPowerCellsEU(ctx, time);
			ctx.restore();
		}
		if (this.quality === 'high') {
			// the bloom: the light map shrunk to a quarter and stretched back (a soft blur)
			const bg = ctx2d(bloom);
			bg.globalCompositeOperation = 'copy';
			bg.imageSmoothingEnabled = true;
			bg.drawImage(lightMap, 0, 0, bloom.width, bloom.height);
			ctx.globalCompositeOperation = 'lighter';
			ctx.globalAlpha = hot ? 0.15 : 0.095;
			ctx.drawImage(bloom, 0, 0, this.vw, this.vh);
		}
		ctx.restore();
		if (this.quality !== 'low') {
			// the hive's heartbeat, a light of its own
			this.enter(ctx);
			this.hive.drawPulse(ctx, infection, time);
			ctx.restore();
		}
	}

	/** Step 13: the film grain, High only. */
	drawGrain(ctx: CanvasRenderingContext2D, time: number): void {
		if (this.quality !== 'high') return;
		const pat = ctx.createPattern(this.grain, 'repeat');
		if (!pat) return;
		pat.setTransform(new DOMMatrix().translate((time * 420) % 256, (time * 280) % 256));
		ctx.save();
		ctx.globalCompositeOperation = 'overlay';
		ctx.fillStyle = pat;
		ctx.fillRect(0, 0, this.vw, this.vh);
		ctx.restore();
	}
}
