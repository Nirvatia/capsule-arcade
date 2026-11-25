import type { GridMatrix } from '../../config/gridConfig';
import type { GhostDirection, GhostKind, GhostModel } from '../../logic/actors/GhostModel';
import type { StationRun } from '../../logic/station/StationRun';
import { RUN_TUNE } from '../../logic/station/StationRun';
import { mimicTell } from '../../logic/station/MimicTells';
import type { RenderQuality } from '../common/renderQuality';
import type { GridLayout } from '../maze/GridView';
import type { LevelRenderer, PreviewFrame, RenderFrame, WorldPreview } from '../RenderFrame';
import type { SharedLayers } from '../SharedLayers';
import { B7World } from './b7/B7World';
import type { B7Light, B7Phase } from './b7/B7World';
import { drawAlbino } from './albino';
import type { AlbinoState } from './albino';
import {
	KIND_COLOR,
	drawBeam,
	drawDoor,
	drawEmitter,
	drawLane,
	drawPhantom,
	drawRoute,
	drawShaft
} from './squadMarks';

const KINDS: readonly GhostKind[] = ['BLINKY', 'PINKY', 'INKY', 'CLYDE'];
const ANGLE: Readonly<Record<GhostDirection, number>> = {
	RIGHT: 0,
	DOWN: Math.PI / 2,
	LEFT: Math.PI,
	UP: -Math.PI / 2
};

/** The hero's flashlight in the escape (the owner, 2026-11-25): a pool of light round him, stage px. */
const FLASHLIGHT = { r: 34 * 3.8, rgb: '236, 242, 230', alpha: 0.95, core: 34 * 1.6 } as const;

/**
 * The station boss level (DESIGN.md §7a): the B-7 station of the owner's mock-up (`B7World`) on
 * the game's maze, played by `StationRun`. The phase follows the hatch's charge (containment,
 * then the breakout once half charged, the absorption in the escape); the light is the
 * quarantine's, the alarm's in the escape, with the hero's flashlight. The squad are glass
 * albinos (`albino`); a lurker lies as one of the level's spores with its tells (`MimicTells`),
 * drawn with the food under the light so it shares the food's look but for them. The marks of the
 * plays and of the escape, the hero and the words go over the light.
 */
export class StationLevelRenderer implements LevelRenderer, WorldPreview {
	private readonly shared: SharedLayers;
	private world: { grid: GridMatrix; world: B7World } | null = null;
	private previewWorld: { grid: GridMatrix; world: B7World } | null = null;
	private quality: RenderQuality = 'high';
	private readonly headings = new Map<GhostKind, number>();

	constructor(shared: SharedLayers) {
		this.shared = shared;
	}

	setQuality(quality: RenderQuality): void {
		this.quality = quality;
		this.world?.world.setQuality(quality);
		this.previewWorld?.world.setQuality(quality);
	}

	render(frame: RenderFrame): GridLayout {
		const { ctx, state, level, progress, time, dt } = frame;
		const world = this.worldFor(frame.season.grid);
		world.resize(frame.width, frame.height, frame.pixelRatio);
		const layout = world.layout;
		const S = layout.tileSize;
		const sx = (x: number) => layout.offsetX + x * S;
		const sy = (y: number) => layout.offsetY + y * S;
		const run = level.stationRun;
		const scene = world.scene;
		const clear = state === 'level-clear';
		const escaping = run?.escape.state === 'running';
		const phase: B7Phase = escaping ? 3 : (run?.escape.charge ?? 0) >= 0.5 ? 2 : 1;
		const light: B7Light = escaping ? 'alert' : 'quarantine';
		scene.setPresent((x, y) => !progress.isCollected(x, y));
		const player = level.player;
		const hero = player && !clear ? player.position : null;
		scene.setExtraLights(
			escaping && hero
				? [
						{
							x: scene.MAZE_X + hero.x * 34,
							y: scene.MAZE_Y + hero.y * 34,
							r: FLASHLIGHT.r,
							rgb: FLASHLIGHT.rgb,
							alpha: FLASHLIGHT.alpha
						},
						{
							x: scene.MAZE_X + hero.x * 34,
							y: scene.MAZE_Y + hero.y * 34,
							r: FLASHLIGHT.core,
							rgb: FLASHLIGHT.rgb,
							alpha: 0.6
						}
					]
				: []
		);

		world.drawScene(ctx, time, dt, phase, true);
		// the lurkers lie with the food, under the same light
		const disguises = (c: CanvasRenderingContext2D) => {
			if (run && !clear) this.drawDisguises(c, run, hero, time, frame.season.grid);
		};
		world.enter(ctx);
		disguises(ctx);
		ctx.restore();
		world.drawLight(ctx, time, phase, light, true, disguises);

		if (run && !clear) this.drawPlays(ctx, run, layout, time, escaping);
		const ghosts: readonly GhostModel[] = clear || !run ? [] : (level.ghosts?.list ?? []);
		for (const g of ghosts) this.drawCreature(ctx, run as StationRun, g, sx, sy, S, time, escaping);
		if (run && escaping && !clear) {
			run.rush.runners.forEach((rn) => {
				const p = run.rush.position(rn);
				const kind = KINDS[rn.id % KINDS.length];
				const ang = Math.atan2(rn.ny - rn.y, rn.nx - rn.x);
				ctx.save();
				if (rn.stun > 0) ctx.globalAlpha = 0.55;
				drawAlbino(ctx, sx(p.x), sy(p.y), S, kind, rn.stun > 0 ? 'frightened' : 'rage', time, {
					angle: ang
				});
				ctx.restore();
			});
		}
		if (state !== 'death' && !clear) {
			// a hit: he blinks out while the station holds its breath
			const blinkOut = run && run.dying >= 0 && Math.floor(run.dying * 6) % 2 === 1;
			if (!blinkOut) this.shared.drawPlayer(frame, layout);
		}
		if (run && !clear) {
			this.drawPulse(ctx, run, hero, sx, sy, S);
			this.drawWords(ctx, run, sx, sy, S);
			this.drawReadout(ctx, run, layout);
		}
		world.drawGrain(ctx, time);
		return layout;
	}

	/** The station before the level: no actors, every spore in place, the quarantine's light. */
	preview(frame: PreviewFrame): GridLayout {
		if (!this.previewWorld || this.previewWorld.grid !== frame.season.grid) {
			this.previewWorld = { grid: frame.season.grid, world: new B7World(frame.season.grid) };
			this.previewWorld.world.setQuality(this.quality);
		}
		const world = this.previewWorld.world;
		world.resize(frame.width, frame.height, frame.pixelRatio);
		const time = performance.now() / 1000;
		world.scene.setPresent(() => true);
		world.scene.setExtraLights([]);
		world.drawScene(frame.ctx, time, frame.dt, 1, true);
		world.drawLight(frame.ctx, time, 1, 'quarantine', true);
		world.drawGrain(frame.ctx, time);
		return world.layout;
	}

	/** The world the season turn showed becomes the level's world: nothing is baked twice. */
	private worldFor(grid: GridMatrix): B7World {
		if (this.world?.grid !== grid) {
			const preview = this.previewWorld;
			const world = preview && preview.grid === grid ? preview.world : new B7World(grid);
			world.setQuality(this.quality);
			this.world = { grid, world };
			this.previewWorld = null;
		}
		return this.world.world;
	}

	/** Stage space (34 px tiles): the lurkers as spores with their tells, and folding into them. */
	private drawDisguises(
		c: CanvasRenderingContext2D,
		run: StationRun,
		hero: { x: number; y: number } | null,
		time: number,
		grid: GridMatrix
	): void {
		const T = 34;
		const scene = this.world?.world.scene;
		if (!scene) return;
		const wall = (x: number, y: number) => grid[y]?.[x] === 'WL';
		for (const h of run.squad.hiddenList) {
			if (h.as === 'vent' || h.state !== 'hidden') continue;
			const tell = mimicTell(
				h.x,
				h.y,
				hero ?? { x: -99, y: -99 },
				time,
				h.lesson,
				KINDS.indexOf(h.kind),
				wall
			);
			const jx = tell.tremble ? Math.sin(time * 31) * tell.tremble : 0;
			const jy = tell.tremble ? Math.cos(time * 27) * tell.tremble : 0;
			const x = scene.MAZE_X + (h.x + 0.5 + tell.dx + jx) * T;
			const y = scene.MAZE_Y + (h.y + 0.5 + tell.dy + jy) * T;
			// a soft shadow, larger than the spore's own crisp one
			c.save();
			c.fillStyle = `rgba(0,0,0,${0.55 * tell.shadow})`;
			c.beginPath();
			c.ellipse(x + 2.4, y + 3.2, 7.2, 5.4, 0, 0, Math.PI * 2);
			c.fill();
			c.restore();
			// the food breathes together; it breathes half a breath apart
			scene.drawSporeAt(c, x, y, 1 + 0.04 * Math.sin(time * 2.0 + Math.PI * 2 * tell.breath));
			if (tell.eyes > 0.02) {
				// its eyes open for a moment: two pale slits over the pearl
				c.save();
				c.globalAlpha = tell.eyes;
				for (const s of [-1, 1]) {
					c.fillStyle = '#080b0c';
					c.beginPath();
					c.ellipse(x + s * 3.1, y - 4.6, 1.9, 1.5 * tell.eyes + 0.2, 0, 0, Math.PI * 2);
					c.fill();
					c.fillStyle = 'rgba(220,240,236,0.95)';
					c.beginPath();
					c.arc(x + s * 3.1 + 0.4, y - 4.7, 0.8, 0, Math.PI * 2);
					c.fill();
				}
				c.restore();
			}
		}
	}

	/** The marks of the plays and of the escape, over the light. */
	private drawPlays(
		ctx: CanvasRenderingContext2D,
		run: StationRun,
		layout: GridLayout,
		time: number,
		escaping: boolean
	): void {
		const S = layout.tileSize;
		const at = (x: number, y: number) => ({
			x: layout.offsetX + (x + 0.5) * S,
			y: layout.offsetY + (y + 0.5) * S
		});
		const { squad, escape } = run;
		if (escaping) {
			drawRoute(
				ctx,
				escape.route.map((t) => at(t.x, t.y)),
				S,
				time
			);
			if (escape.lane)
				drawLane(
					ctx,
					escape.lane.route.map((t) => at(t.x, t.y)),
					S,
					time,
					escape.lane.left
				);
			const ic = squad.intercept;
			if (ic) {
				const p = at(ic.x, ic.y);
				const on = ic.warn > 0 ? Math.sin(time * Math.PI * 5) > 0 : true;
				ctx.save();
				ctx.globalCompositeOperation = 'lighter';
				ctx.fillStyle = `rgba(255,50,40,${on ? 0.55 : 0.15})`;
				ctx.fillRect(p.x - S / 2, p.y - S / 2, S, S);
				ctx.restore();
			}
		}
		for (const d of escape.doors) {
			const p = at(d.x, d.y);
			drawDoor(ctx, d, p.x, p.y, S, 'h');
		}
		const W = this.world?.world.scene.COLS ?? 25;
		const H = this.world?.world.scene.ROWS ?? 27;
		for (const b of squad.beams) {
			const a = b.axis === 'row' ? at(0, b.at) : at(b.at, 0);
			const z = b.axis === 'row' ? at(W - 1, b.at) : at(b.at, H - 1);
			drawBeam(
				ctx,
				b.axis === 'row' ? a.x - S / 2 : a.x,
				b.axis === 'row' ? a.y : a.y - S / 2,
				b.axis === 'row' ? z.x + S / 2 : z.x,
				b.axis === 'row' ? z.y : z.y + S / 2,
				S,
				time,
				b.charge,
				b.lit
			);
			const e = at(b.x, b.y);
			drawEmitter(ctx, e.x, e.y, S, b.charge);
		}
		for (const h of squad.hiddenList) {
			if (h.as !== 'vent') continue;
			const p = at(h.x, h.y);
			drawShaft(
				ctx,
				p.x,
				p.y,
				S,
				time,
				h.state === 'glow' ? Math.min(1, h.time / 1.2) : 0.25,
				KIND_COLOR[h.kind]
			);
		}
	}

	private drawCreature(
		ctx: CanvasRenderingContext2D,
		run: StationRun,
		g: GhostModel,
		sx: (x: number) => number,
		sy: (y: number) => number,
		S: number,
		time: number,
		escaping: boolean
	): void {
		const squad = run.squad;
		const hidden = squad.hidden(g.kind);
		const p = g.position;
		const dir = g.facing;
		const target = dir ? ANGLE[dir] : (this.headings.get(g.kind) ?? 0);
		const prev = this.headings.get(g.kind) ?? target;
		let diff = target - prev;
		while (diff > Math.PI) diff -= Math.PI * 2;
		while (diff < -Math.PI) diff += Math.PI * 2;
		const angle = prev + diff * 0.25;
		this.headings.set(g.kind, angle);
		const scene = this.world?.world.scene;
		const spore = (
			c: CanvasRenderingContext2D,
			x: number,
			y: number,
			alpha: number,
			scale: number
		) => {
			if (!scene) return;
			c.save();
			c.globalAlpha *= alpha;
			c.translate(x, y);
			c.scale(S / 34, S / 34);
			scene.drawSporeAt(c, 0, 0, scale);
			c.restore();
		};
		if (hidden) {
			if (hidden.as === 'vent') return;
			if (hidden.state === 'fading') {
				// the fold into a spore (the mock-up's mimicry), slow on the run's first lurker
				const k = Math.min(1, hidden.time / hidden.fade);
				drawAlbino(ctx, sx(hidden.x + 0.5), sy(hidden.y + 0.5), S, g.kind, 'mimic', time, {
					angle,
					mimicK: k,
					spore
				});
			}
			return;
		}
		if (g.state === 'eyes') {
			ctx.save();
			ctx.globalAlpha = 0.35;
			drawAlbino(ctx, sx(p.x), sy(p.y), S, g.kind, 'frightened', time, { angle });
			ctx.restore();
			return;
		}
		const role = squad.role(g.kind);
		if (role === 'phantom' && !escaping) {
			drawPhantom(ctx, sx(p.x), sy(p.y), S, time);
			return;
		}
		let st: AlbinoState = 'hunt';
		if (g.state === 'frightened') st = 'frightened';
		else if (escaping || g.state === 'enraged') st = 'rage';
		else if (squad.phase === 'tell') st = 'tell';
		ctx.save();
		if (squad.harmless(g.kind)) ctx.globalAlpha = 0.7;
		drawAlbino(ctx, sx(p.x), sy(p.y), S, g.kind, st, time, { angle, spore });
		ctx.restore();
	}

	/** The pulse: a ring thrown out round him. */
	private drawPulse(
		ctx: CanvasRenderingContext2D,
		run: StationRun,
		hero: { x: number; y: number } | null,
		sx: (x: number) => number,
		sy: (y: number) => number,
		S: number
	): void {
		if (!hero || run.pulse < 0 || run.pulse > 0.6) return;
		const k = run.pulse / 0.6;
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.strokeStyle = `rgba(190,240,255,${0.8 * (1 - k)})`;
		ctx.lineWidth = Math.max(2, S * 0.18 * (1 - k));
		ctx.beginPath();
		ctx.arc(sx(hero.x), sy(hero.y), S * RUN_TUNE.pulseReach * k, 0, Math.PI * 2);
		ctx.stroke();
		ctx.restore();
	}

	private drawWords(
		ctx: CanvasRenderingContext2D,
		run: StationRun,
		sx: (x: number) => number,
		sy: (y: number) => number,
		S: number
	): void {
		ctx.save();
		ctx.textAlign = 'center';
		ctx.font = `700 ${Math.max(10, Math.round(S * 0.42))}px ui-monospace, monospace`;
		for (const p of run.popups) {
			const a = Math.max(0, 1 - p.age / 1.2);
			ctx.fillStyle = `rgba(255,236,190,${a})`;
			ctx.fillText(p.text, sx(p.x), sy(p.y) - p.age * S * 0.6);
		}
		ctx.restore();
	}

	/** Until the station's HUD (its own step): the hits, the hatch's charge, the escape's kit. */
	private drawReadout(ctx: CanvasRenderingContext2D, run: StationRun, layout: GridLayout): void {
		const S = layout.tileSize;
		const x = layout.offsetX + S * 1.2;
		const y = layout.offsetY + S * 0.62;
		const e = run.escape;
		const hits =
			'●'.repeat(Math.max(0, run.hits)) + '○'.repeat(Math.max(0, RUN_TUNE.hits - run.hits));
		const tail =
			e.state === 'running'
				? `  PULSE ${e.pulse ? 'READY' : 'SPENT'}  BREAK ${e.charges}`
				: e.state === 'armed'
					? '  TO THE CONSOLE'
					: '';
		ctx.save();
		ctx.font = `700 ${Math.max(9, Math.round(S * 0.36))}px ui-monospace, monospace`;
		ctx.textBaseline = 'middle';
		ctx.fillStyle = 'rgba(214,236,226,0.92)';
		ctx.fillText(`B-7  ${hits}  HATCH ${Math.round(e.charge * 100)}%${tail}`, x, y);
		ctx.restore();
	}
}
