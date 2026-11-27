import type { GridMatrix } from '../../config/gridConfig';
import type { GhostDirection, GhostKind } from '../../logic/actors/GhostModel';
import { NIGHT_TUNE } from '../../logic/nightwood/NightwoodRun';
import { clearingOf, placeLamps } from '../../logic/nightwood/nightwoodLamps';
import type { RenderQuality } from '../common/renderQuality';
import type { GridLayout } from '../maze/GridView';
import type { LevelRenderer, PreviewFrame, RenderFrame, WorldPreview } from '../RenderFrame';
import type { SharedLayers } from '../SharedLayers';
import {
	drawBanishedEyes,
	drawFirefly,
	drawFlare,
	drawLampHead,
	drawRelightMark,
	drawTaken,
	drawTakenEyes,
	drawVortex
} from './nightArt';
import { NightwoodWorld } from './NightwoodWorld';
import type { LightInput } from './NightwoodWorld';
import { clamp } from './noise';

const DIR: Readonly<Record<GhostDirection, readonly [number, number]>> = {
	RIGHT: [1, 0],
	DOWN: [0, 1],
	LEFT: [-1, 0],
	UP: [0, -1]
};
/** The dawn takes this long to come after the Presence falls, s. */
const DAWN_TIME = 4;
/** The Presence flinches this long when a Taken is banished, s. */
const FLINCH = 0.9;

/**
 * The night forest boss level (`DESIGN.md` §7b): the forest world (`NightwoodWorld`) on the game's
 * maze, played by the classic rules and `NightwoodRun`. Under the light: the Taken with their
 * shrouds, the Presence's whirl in the clearing. Over the light: the fireflies and flares, the lamps'
 * heads, the Taken's eyes, the hero with his torch. The dawn thins the dark when the Presence falls.
 */
export class NightwoodLevelRenderer implements LevelRenderer, WorldPreview {
	private readonly shared: SharedLayers;
	private world: NightwoodWorld | null = null;
	private previewWorld: NightwoodWorld | null = null;
	private quality: RenderQuality = 'high';
	private dawn = 0;
	private flinch = 0;
	private lastBanished = 0;
	private readonly facing = new Map<GhostKind, readonly [number, number]>();

	constructor(shared: SharedLayers) {
		this.shared = shared;
	}

	setQuality(quality: RenderQuality): void {
		this.quality = quality;
		this.world?.setQuality(quality);
		this.previewWorld?.setQuality(quality);
	}

	render(frame: RenderFrame): GridLayout {
		const { ctx, state, level, progress, time, dt, width, height } = frame;
		const world = this.worldFor(frame.season.grid);
		world.resize(width, height, frame.pixelRatio);
		const layout = world.layout;
		const S = layout.tileSize;
		const run = level.nightwoodRun;
		const player = level.player;
		const clear = state === 'level-clear';
		const step = frame.paused ? 0 : dt;

		// the dawn comes as the Presence falls, and stays for the level clear
		if (clear || run?.defeated) {
			this.dawn = clear ? 1 : Math.min(1, this.dawn + step / DAWN_TIME);
		} else {
			this.dawn = 0;
		}
		if (run) {
			if (run.banished > this.lastBanished) {
				this.flinch = FLINCH;
			}
			this.lastBanished = run.banished;
		} else {
			this.lastBanished = 0;
		}
		this.flinch = Math.max(0, this.flinch - step);

		const hero = player && !clear && state !== 'death' ? player.position : null;
		const lampSpecs =
			run?.lamps ??
			placeLamps(frame.season.grid).map((l) => ({ ...l, on: true, tell: 0, held: 0 }));
		const clearing = run?.clearing ?? clearingOf(frame.season.grid);
		const light: LightInput = {
			time,
			lamps: lampSpecs.map((l) => ({
				x: l.x,
				y: l.y,
				r: l.r,
				state: !l.on ? 'out' : l.tell > 0 ? 'tell' : 'on'
			})),
			flares: (run?.flares ?? []).map((f) => ({ x: f.x, y: f.y, k: clamp(f.left / 1.2) })),
			hero: hero
				? { x: hero.x, y: hero.y, heading: run?.heading ?? Math.PI, torch: (run?.battery ?? 1) > 0 }
				: null,
			flash: run && run.flash > 0 ? run.flash / NIGHT_TUNE.flash.time : 0,
			clearing,
			rage: run
				? 1 - run.presenceRatio + (this.flinch > 0 ? 0.35 * (this.flinch / FLINCH) : 0)
				: 0.3,
			dawn: this.dawn,
			fog: true
		};

		world.drawGround(ctx);
		world.drawLight(ctx, light);

		// ---- the Taken, as bright as the light on them
		const at = (x: number, y: number) => ({ x: layout.offsetX + x * S, y: layout.offsetY + y * S });
		const ghosts = clear || !run ? [] : (level.ghosts?.list ?? []);
		const powered = level.combat?.isPowerActive ?? false;
		const blink = powered && (level.combat?.powerTimer ?? 0) < 2 && Math.floor(time * 6) % 2 === 0;
		for (const g of ghosts) {
			if (g.state === 'lair') continue;
			const p = g.position;
			const f = g.facing ? DIR[g.facing] : (this.facing.get(g.kind) ?? DIR.LEFT);
			this.facing.set(g.kind, f);
			if (g.state === 'eyes') {
				const q = at(p.x, p.y);
				drawBanishedEyes(ctx, q.x, q.y, S, time);
				continue;
			}
			if (!run) continue;
			const lit = run.lightAt(p.x, p.y);
			const look = {
				time,
				dx: f[0],
				dy: f[1],
				shield: run.shield(g.kind),
				burn: lit > 0.2 && run.shield(g.kind) > 0.02 ? clamp(lit * 1.2) : 0,
				blink
			};
			ctx.filter = `brightness(${(0.45 + 0.55 * clamp(lit * 1.4)).toFixed(2)})`;
			const q = at(p.x, p.y);
			drawTaken(ctx, q.x, q.y, S * 0.95, g.kind, look);
			ctx.filter = 'none';
		}

		// ---- what shines in the dark
		lampSpecs.forEach((l, i) => {
			const p = at(l.postX, l.postY);
			drawLampHead(ctx, p.x, p.y, S, time, i * 1.9, !l.on ? 'out' : l.tell > 0 ? 'tell' : 'on');
			if (!l.on) {
				const c = at(l.x, l.y);
				drawRelightMark(ctx, c.x, c.y, S, time, l.held / NIGHT_TUNE.lamp.relight);
			}
		});
		const grid = frame.season.grid;
		grid.forEach((row, y) =>
			row.forEach((token, x) => {
				if (progress.isCollected(x, y)) return;
				if (token === 'DT') {
					const p = at(x + 0.5, y + 0.5);
					drawFirefly(ctx, p.x, p.y, S, time, ((x * 37 + y * 11) % 101) / 101);
				} else if (token === 'EU') {
					const p = at(x + 0.5, y + 0.5);
					drawFlare(ctx, p.x, p.y, S, time, x + y * 0.7, 0);
				}
			})
		);
		for (const f of run?.flares ?? []) {
			const p = at(f.x + 0.5, f.y + 0.5);
			drawFlare(ctx, p.x, p.y, S, time, f.x + f.y * 0.7, 1);
		}
		for (const g of ghosts) {
			if (g.state === 'lair' || g.state === 'eyes') continue;
			const p = at(g.position.x, g.position.y);
			drawTakenEyes(ctx, p.x, p.y, S * 0.95, {
				time,
				dx: (this.facing.get(g.kind) ?? DIR.LEFT)[0],
				dy: (this.facing.get(g.kind) ?? DIR.LEFT)[1],
				shield: run?.shield(g.kind) ?? 1,
				burn: 0,
				blink: false
			});
		}

		// ---- the Presence in its clearing, then the heart and the exit, then the hero
		const c = at(clearing.x, clearing.y);
		drawVortex(ctx, c.x, c.y, S * 1.9, time, clamp(light.rage), 1 - this.dawn);
		this.shared.drawCollectibles(frame, layout);
		if (state !== 'death' && !clear && hero) {
			this.shared.drawPlayer(frame, layout);
			if (run && run.battery > 0) this.drawLens(ctx, at(hero.x, hero.y), run.heading, S);
			if (run && run.flash > 0)
				this.drawFlash(ctx, at(hero.x, hero.y), run.flash / NIGHT_TUNE.flash.time, S);
		}
		world.drawPost(ctx, time, this.dawn);
		return layout;
	}

	/** The torch's lens: a hot point ahead of the hero. */
	private drawLens(
		ctx: CanvasRenderingContext2D,
		p: { x: number; y: number },
		heading: number,
		S: number
	): void {
		const lx = p.x + Math.cos(heading) * S * 0.3;
		const ly = p.y + Math.sin(heading) * S * 0.3;
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, S * 0.5);
		g.addColorStop(0, 'rgba(255,255,255,0.95)');
		g.addColorStop(0.2, 'rgba(220,235,255,0.5)');
		g.addColorStop(1, 'rgba(220,235,255,0)');
		ctx.fillStyle = g;
		ctx.fillRect(lx - S * 0.5, ly - S * 0.5, S, S);
		ctx.restore();
	}

	/** The flash: a ring of white racing out to the edge of its reach. */
	private drawFlash(
		ctx: CanvasRenderingContext2D,
		p: { x: number; y: number },
		left: number,
		S: number
	): void {
		const k = 1 - left;
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.strokeStyle = `rgba(255,252,235,${0.8 * left})`;
		ctx.lineWidth = Math.max(2, S * 0.12 * left);
		ctx.beginPath();
		ctx.arc(p.x, p.y, S * NIGHT_TUNE.flash.radius * (0.2 + 0.8 * k), 0, Math.PI * 2);
		ctx.stroke();
		ctx.restore();
	}

	/** The forest before the level: no actors, every firefly in place, the lamps lit. */
	preview(frame: PreviewFrame): GridLayout {
		if (!this.previewWorld || this.previewWorld.grid !== frame.season.grid) {
			this.previewWorld = new NightwoodWorld(frame.season.grid);
			this.previewWorld.setQuality(this.quality);
		}
		const world = this.previewWorld;
		const { ctx } = frame;
		world.resize(frame.width, frame.height, frame.pixelRatio);
		const layout = world.layout;
		const S = layout.tileSize;
		const time = performance.now() / 1000;
		const clearing = clearingOf(frame.season.grid);
		world.drawGround(ctx);
		world.drawLight(ctx, {
			time,
			lamps: placeLamps(frame.season.grid).map((l) => ({
				x: l.x,
				y: l.y,
				r: l.r,
				state: 'on' as const
			})),
			flares: [],
			hero: null,
			flash: 0,
			clearing,
			rage: 0.3,
			dawn: 0,
			fog: true
		});
		this.drawFood(ctx, frame.season.grid, layout, time);
		drawVortex(
			ctx,
			layout.offsetX + clearing.x * S,
			layout.offsetY + clearing.y * S,
			S * 1.9,
			time,
			0.3,
			1
		);
		world.drawPost(ctx, time, 0);
		return layout;
	}

	private drawFood(
		ctx: CanvasRenderingContext2D,
		grid: GridMatrix,
		layout: GridLayout,
		time: number
	): void {
		const S = layout.tileSize;
		grid.forEach((row, y) =>
			row.forEach((token, x) => {
				const px = layout.offsetX + (x + 0.5) * S;
				const py = layout.offsetY + (y + 0.5) * S;
				if (token === 'DT') drawFirefly(ctx, px, py, S, time, ((x * 37 + y * 11) % 101) / 101);
				else if (token === 'EU') drawFlare(ctx, px, py, S, time, x + y * 0.7, 0);
			})
		);
	}

	/** The world the season turn showed becomes the level's world: nothing is baked twice. */
	private worldFor(grid: GridMatrix): NightwoodWorld {
		if (this.world?.grid !== grid) {
			const preview = this.previewWorld;
			const world = preview && preview.grid === grid ? preview : new NightwoodWorld(grid);
			world.setQuality(this.quality);
			this.world = world;
			this.previewWorld = null;
		}
		return this.world;
	}
}
