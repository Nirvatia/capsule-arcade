import type { GridMatrix } from '../../config/gridConfig';
import type { GhostDirection, GhostKind, GhostModel } from '../../logic/actors/GhostModel';
import type { StationRun } from '../../logic/station/StationRun';
import { RUN_TUNE } from '../../logic/station/StationRun';
import { mimicTell } from '../../logic/station/MimicTells';
import { escapeGoal } from '../../logic/station/StationEscape';
import { SQUAD_TUNE } from '../../logic/station/StationSquad';
import type { RenderQuality } from '../common/renderQuality';
import type { GridLayout } from '../maze/GridView';
import type { LevelRenderer, PreviewFrame, RenderFrame, WorldPreview } from '../RenderFrame';
import type { SharedLayers } from '../SharedLayers';
import { B7World } from './b7/B7World';
import type { B7Light } from './b7/B7World';
import {
	RailGait,
	drawHeroGlow,
	drawLurkerEye,
	drawPretender,
	pretenderStateFor
} from './pretender';
import type { PretenderOpts, PretenderState } from './pretender';
import { KIND_COLOR, drawDoor, drawLane, drawShaft } from './squadMarks';
import { drawRing } from './quarantineRing';
import { drawLureFlare, LURE_RGB } from './lureFlare';
import { drawGoalMark } from './goalMark';
import { t as translate } from '../../ui/i18n';
import type { I18nKey } from '../../ui/i18n';

const KINDS: readonly GhostKind[] = ['BLINKY', 'PINKY', 'INKY', 'CLYDE'];
const DIR: Readonly<Record<GhostDirection, readonly [number, number]>> = {
	RIGHT: [1, 0],
	DOWN: [0, 1],
	LEFT: [-1, 0],
	UP: [0, -1]
};

/** How long the screen's edges pulse after a hit, s. */
const HURT_TIME = 0.6;

/** The hero's flashlight in the escape (the owner, 2026-11-25): a pool of light round him, stage px. */
const FLASHLIGHT = { r: 34 * 3.8, rgb: '236, 242, 230', alpha: 0.95, core: 34 * 1.6 } as const;

/**
 * The station boss level (DESIGN.md §7a): the B-7 station of the owner's mock-up (`B7World`) on
 * the game's maze, played by `StationRun`. The phase follows the hatch's charge (containment,
 * then the breakout once half charged, the absorption in the escape); the light is the
 * quarantine's, the alarm's in the escape, with the hero's flashlight. The squad are
 * Pretenders (`pretender`); a lurker lies as one of the level's spores with its tells (`MimicTells`),
 * drawn with the food under the light so it shares the food's look but for them. The marks of the
 * plays and of the escape, the hero and the words go over the light.
 */
export class StationLevelRenderer implements LevelRenderer, WorldPreview {
	private readonly shared: SharedLayers;
	private world: { grid: GridMatrix; world: B7World } | null = null;
	private previewWorld: { grid: GridMatrix; world: B7World } | null = null;
	private quality: RenderQuality = 'high';
	/** How each creature walks the rails (the squad by kind, the rush by id). */
	private readonly gaits = new Map<string, RailGait>();
	/** The power cell's time left (the fright's blink at its end). */
	private powerTimer = 0;
	/** Where each lurker's disguise is drawn (it glides a creep), and the frame's step, s. */
	private readonly lying = new Map<GhostKind, { x: number; y: number }>();
	private lastDt = 1 / 60;
	/** The interface's words (the goal's plate). */
	private word: (key: I18nKey) => string = (key) => key;

	constructor(shared: SharedLayers) {
		this.shared = shared;
		// the goal's name in the player's language, followed as it changes
		translate.subscribe((fn) => (this.word = fn));
	}

	setQuality(quality: RenderQuality): void {
		this.quality = quality;
		this.world?.world.setQuality(quality);
		this.previewWorld?.world.setQuality(quality);
	}

	render(frame: RenderFrame): GridLayout {
		const { ctx, state, level, progress, time, dt } = frame;
		this.lastDt = dt;
		this.powerTimer = level.combat?.powerTimer ?? 0;
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
		const infection = clear ? 1 : (run?.infection ?? 0);
		const light: B7Light = escaping ? 'alert' : 'quarantine';
		scene.setPresent((x, y) => !progress.isCollected(x, y));
		const player = level.player;
		const hero = player && !clear ? player.position : null;
		const lure = run && !clear ? run.lure : null;
		const lureLights = lure
			? [
					{
						x: scene.MAZE_X + (lure.x + 0.5) * 34,
						y: scene.MAZE_Y + (lure.y + 0.5) * 34,
						r: 34 * 3.2,
						rgb: LURE_RGB,
						alpha: 0.8 + 0.15 * Math.sin(time * 5)
					}
				]
			: [];
		scene.setExtraLights(
			escaping && hero
				? [
						...lureLights,
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
				: lureLights
		);

		world.drawScene(ctx, time, dt, infection, true);
		// the lurkers lie with the food, under the same light
		const disguises = (c: CanvasRenderingContext2D) => {
			if (run && !clear) this.drawDisguises(c, run, hero, time, frame.season.grid);
		};
		world.enter(ctx);
		disguises(ctx);
		ctx.restore();
		world.drawLight(ctx, time, infection, light, true, disguises);

		if (run && !clear) this.drawPlays(ctx, run, layout, time, escaping);
		if (run && !clear) this.drawGoal(ctx, run, sx, sy, S, time);
		const ghosts: readonly GhostModel[] = clear || !run ? [] : (level.ghosts?.list ?? []);
		for (const g of ghosts)
			this.drawCreature(ctx, run as StationRun, g, sx, sy, S, time, dt, escaping);
		if (run && escaping && !clear) {
			run.rush.runners.forEach((rn) => {
				const p = run.rush.position(rn);
				const kind = KINDS[rn.id % KINDS.length];
				const gait = this.gait(`rush${rn.id}`);
				const dx = Math.sign(rn.nx - rn.x);
				const dy = dx ? 0 : Math.sign(rn.ny - rn.y);
				const st: PretenderState = rn.stun > 0 ? 'fright' : 'rage';
				gait.update(dt, p.x, p.y, dx || dy ? dx : gait.faceX, dy, st === 'rage');
				ctx.save();
				if (rn.stun > 0) ctx.globalAlpha = 0.55;
				drawPretender(ctx, sx(p.x), sy(p.y), S, kind, st, this.look(gait, dx, dy, time));
				ctx.restore();
			});
		}
		if (state !== 'death' && !clear) {
			// after a hit he blinks while he is safe
			const blinkOut = run && run.safe > 0 && Math.floor(run.safe * 8) % 2 === 1;
			if (!blinkOut) {
				if (hero) drawHeroGlow(ctx, sx(hero.x), sy(hero.y), S);
				this.shared.drawPlayer(frame, layout);
			}
		}
		if (run && !clear) {
			if (lure)
				drawLureFlare(
					ctx,
					sx(lure.x + 0.5),
					sy(lure.y + 0.5),
					S,
					time,
					Math.min(1, lure.left / 0.6)
				);
			this.drawPulse(ctx, run, hero, sx, sy, S);
			this.drawHurt(ctx, run, frame.width, frame.height);
			this.drawWords(ctx, run, sx, sy, S);
		}
		world.drawGrain(ctx, time);
		return layout;
	}

	/** The station before the level: no actors, every spore in place, the quarantine's light. */
	preview(frame: PreviewFrame): GridLayout {
		if (!this.previewWorld || this.previewWorld.grid !== frame.season.grid) {
			this.previewWorld = {
				grid: frame.season.grid,
				world: new B7World(frame.season.grid)
			};
			this.previewWorld.world.setQuality(this.quality);
		}
		const world = this.previewWorld.world;
		world.resize(frame.width, frame.height, frame.pixelRatio);
		const time = performance.now() / 1000;
		world.scene.setPresent(() => true);
		world.scene.setExtraLights([]);
		world.drawScene(frame.ctx, time, frame.dt, 0, true);
		world.drawLight(frame.ctx, time, 0, 'quarantine', true);
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
			// a creep along the eaten corridor: it glides there, it does not jump
			const prev = this.lying.get(h.kind);
			const at = prev && Math.hypot(prev.x - h.x, prev.y - h.y) <= 1.5 ? prev : { x: h.x, y: h.y };
			const step = Math.min(1, this.lastDt * 2.2);
			at.x += (h.x - at.x) * step;
			at.y += (h.y - at.y) * step;
			this.lying.set(h.kind, at);
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
			const x = scene.MAZE_X + (at.x + 0.5 + tell.dx + jx) * T;
			const y = scene.MAZE_Y + (at.y + 0.5 + tell.dy + jy) * T;
			// a soft shadow, larger than the spore's own crisp one
			c.save();
			c.fillStyle = `rgba(0,0,0,${0.55 * tell.shadow})`;
			c.beginPath();
			c.ellipse(x + 2.4, y + 3.2, 7.2, 5.4, 0, 0, Math.PI * 2);
			c.fill();
			c.restore();
			// the food breathes together; it breathes half a breath apart
			scene.drawSporeAt(c, x, y, 1 + 0.04 * Math.sin(time * 2.0 + Math.PI * 2 * tell.breath));
			// its gold eye opens for a moment, turned toward him
			const him = hero ?? { x: at.x, y: at.y + 1 };
			drawLurkerEye(c, x, y, tell.eyes, him.x - at.x, him.y - at.y);
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
		// the fence: the quarantine ring, its contour shown while the projectors walk, the filament
		// growing along it as they charge
		const ring = squad.ring;
		if (ring) {
			const charge = ring.posts.length
				? ring.posts.reduce((sum, p) => sum + p.charge, 0) / ring.posts.length
				: 0;
			const thin = ring.seals.find((x) => x.weak) ?? null;
			drawRing(
				ctx,
				layout,
				ring,
				{
					guide: ring.lit ? 0 : 1,
					charge,
					lit: ring.lit ? 1 : 0,
					pressed: thin && ring.push > 0 ? thin : null,
					press: Math.min(1, ring.push / SQUAD_TUNE.breach)
				},
				time
			);
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
		dt: number,
		escaping: boolean
	): void {
		const squad = run.squad;
		const hidden = squad.hidden(g.kind);
		// drawn at its real point on the rails, like the season ghosts (a glide read clumsy)
		const p = g.position;
		const [dx, dy] = g.facing ? DIR[g.facing] : [0, 0];
		const st = pretenderStateFor({ state: g.state, escaping, tell: squad.phase === 'tell' });
		const gait = this.gait(g.kind);
		gait.update(dt, p.x, p.y, dx || dy ? dx : gait.faceX, dy, st === 'rage');
		const scene = this.world?.world.scene;
		const spore = (c: CanvasRenderingContext2D, alpha: number, scale: number) => {
			if (!scene) return;
			c.save();
			c.globalAlpha *= alpha;
			c.scale(S / 34, S / 34);
			scene.drawSporeAt(c, 0, 0, scale);
			c.restore();
		};
		const look = { ...this.look(gait, dx, dy, time), spore };
		if (hidden) {
			if (hidden.as === 'vent') {
				// it goes into the vent's grille: it shrinks and fades where it stands
				if (hidden.state === 'fading') {
					const k = Math.min(1, hidden.time / hidden.fade);
					ctx.save();
					ctx.globalAlpha = 1 - k;
					ctx.translate(sx(p.x), sy(p.y));
					ctx.scale(1 - 0.5 * k, 1 - 0.5 * k);
					drawPretender(ctx, 0, 0, S, g.kind, 'hunt', look);
					ctx.restore();
				}
				return;
			}
			if (hidden.state === 'fading') {
				// the fold into a spore (the mask slips home, it sinks), slow on the run's first lurker
				const k = Math.min(1, hidden.time / hidden.fade);
				drawPretender(ctx, sx(hidden.x + 0.5), sy(hidden.y + 0.5), S, g.kind, 'mimic', {
					...look,
					fold: k
				});
			}
			return;
		}
		const role = squad.role(g.kind);
		if (role === 'phantom' && !escaping) {
			// the phantom: almost clear, guttering
			ctx.save();
			ctx.globalAlpha = 0.18 + 0.07 * Math.sin(time * 2.3);
			drawPretender(ctx, sx(p.x), sy(p.y), S, g.kind, 'hunt', look);
			ctx.restore();
			return;
		}
		ctx.save();
		if (squad.harmless(g.kind)) ctx.globalAlpha = 0.7;
		drawPretender(ctx, sx(p.x), sy(p.y), S, g.kind, st, look);
		ctx.restore();
	}

	private gait(key: string): RailGait {
		let m = this.gaits.get(key);
		if (!m) {
			m = new RailGait();
			this.gaits.set(key, m);
		}
		return m;
	}

	/** A Pretender's look this frame: its heading, its gait, the fright's blink at the end. */
	private look(gait: RailGait, dx: number, dy: number, time: number): PretenderOpts {
		const flashing = this.powerTimer > 0 && this.powerTimer < 2;
		return {
			lookX: dx,
			lookY: dy,
			faceX: gait.faceX,
			faceY: gait.faceY,
			time,
			step: gait.step,
			reveal: gait.reveal,
			flashing,
			white: flashing && Math.floor(this.powerTimer * 4) % 2 === 0
		};
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

	/** The goal's mark, held until it is reached (the words fade, it does not): the console once
	 *  the hatch is charged, then the hatch (`goalMark`), named in the player's language. */
	private drawGoal(
		ctx: CanvasRenderingContext2D,
		run: StationRun,
		sx: (x: number) => number,
		sy: (y: number) => number,
		S: number,
		time: number
	): void {
		const goal = escapeGoal(run.escape.state);
		if (!goal) return;
		const at = RUN_TUNE[goal];
		drawGoalMark(ctx, goal, sx(at.x + 0.5), sy(at.y + 0.5), S, time, at.y < 3, this.word(goal));
	}

	/** The damage: the screen's edges pulse red for a moment after a hit. */
	private drawHurt(ctx: CanvasRenderingContext2D, run: StationRun, w: number, h: number): void {
		if (run.hurt < 0 || run.hurt > HURT_TIME) return;
		const a = 0.55 * (1 - run.hurt / HURT_TIME);
		ctx.save();
		const g = ctx.createRadialGradient(
			w / 2,
			h / 2,
			Math.min(w, h) * 0.35,
			w / 2,
			h / 2,
			Math.hypot(w, h) * 0.6
		);
		g.addColorStop(0, 'rgba(200,20,20,0)');
		g.addColorStop(1, `rgba(200,20,20,${a})`);
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, w, h);
		ctx.restore();
	}
}
