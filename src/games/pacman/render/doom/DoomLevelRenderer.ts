import type { GridService } from '../../logic/maze/GridService';
import type { LevelLoader } from '../../logic/level/LevelLoader';
import type { DoomBossService } from '../../logic/doom/DoomBossService';
import type { PacmanStateName } from '../../core/Events';
import { DoomFxView } from './DoomFxView';
import { DoomCombatView } from './DoomCombatView';
import { HellBlinkyView } from './HellBlinkyView';
import type { BossSnapshot } from './HellBlinkyView';
import { DoomWorld } from './DoomWorld';
import type { DoomLight } from './DoomWorld';
import { pickupSprite } from './DoomSprites';
import { SPLIT_MERGE } from '../../logic/doom/DoomBalance';
import { drawFleshEnergizer, drawFleshGhost, drawStingBolt, fleshFoodSprite } from './fleshKit';
import { counterReady, mawCharge, rushSaw, rushTrail, stingMuzzle } from './weaponArt';
import { WeaponFxView, hitStrength } from './WeaponFxView';
import { core as drawCore, omen, stunOverlay, windowMark } from './bossArt';
import { bossDeath } from './finaleArt';
import type { DoomAbilityService } from '../../logic/doom/DoomAbilityService';
import type { DoomDirection } from '../../logic/doom/DoomGraph';
import type { LevelProgress } from '../../logic/level/LevelProgress';
import { easeGate, gateTiles, gateWanted, lairSide } from './doomGate';
import type { Point } from './doomGate';
import type { SharedLayers } from '../SharedLayers';
import type { LevelRenderer, PreviewFrame, RenderFrame, WorldPreview } from '../RenderFrame';
import type { GridMatrix } from '../../config/gridConfig';
import type { GridLayout } from '../maze/GridView';

/**
 * Hell level: the CLAUDE_GRID_DOOM_v3 world (baked maze + meadow), its atmosphere (ash
 * storm in boss phase 2, night with a corridor light map in phase 3), then the actors on
 * top so they always stay readable, then embers and vignette.
 */
/** Seconds the boss's death plays (the pool stays after). */
const DEATH_TIME = 3;
/** Seconds of the boss's recoil from a hit. */
const RECOIL_TIME = 0.22;
/** The omen's cracks open fully over this long (the old transition's length). */
const OMEN_LOOK = 2.5;

export class DoomLevelRenderer implements LevelRenderer, WorldPreview {
	private readonly shared: SharedLayers;
	private readonly fxView = new DoomFxView();
	private readonly weaponFx = new WeaponFxView();
	private recoil: { x: number; y: number; amount: number; t: number } | null = null;
	/** When and where the boss died: his death plays, then his pool stays with his horns. */
	private death: { start: number; x: number; y: number } | null = null;
	private readonly bossView = new HellBlinkyView();
	private readonly echoBossView = new HellBlinkyView();
	private readonly combatView = new DoomCombatView();
	private bossHitFlash = 0;
	private world: DoomWorld | null = null;
	private worldGrid: GridService | null = null;
	/** The hell world shown by the season turn before the hell level exists. */
	private previewWorld: { grid: GridMatrix; world: DoomWorld } | null = null;
	private lastPlayerPos: { x: number; y: number } | null = null;
	/** How far the lair's gate is open (the boss, his echo and the imps open it). */
	private gate = 0;
	/** When the current rush started (render time), or -1. */
	private rushStart = -1;
	private gateOf: { grid: GridService; tiles: Point[]; side: 1 | -1 } | null = null;

	constructor(shared: SharedLayers) {
		this.shared = shared;
	}

	render(frame: RenderFrame): GridLayout {
		const { ctx, dt, time, state, level, grid } = frame;
		const world = this.worldFor(frame);
		world.resize(frame.width, frame.height, frame.pixelRatio);
		const boss = level.doomBoss;
		const doom = level.doom;
		const phase = boss ? boss.phase : 1;
		world.setMood(phase >= 2, phase >= 3);
		world.update(dt);
		const layout = world.layout;
		const fighting = Boolean(boss && doom && !boss.defeated);
		this.updateGate(grid, fighting ? boss : null, dt);
		world.setGateOpen(this.gate);

		if (doom) {
			for (const event of doom.consumeFx()) {
				this.fxView.spawn(event);
				this.weaponFx.spawn(event);
				const strength = hitStrength(event);
				if (strength > 0 && boss && level.player) {
					// he recoils away from the hero, harder for a harder hit
					const p = level.player.position;
					const b = boss.position;
					const d = Math.hypot(b.x - p.x, b.y - p.y) || 1;
					this.recoil = { x: (b.x - p.x) / d, y: (b.y - p.y) / d, amount: 0.06 * strength, t: 0 };
				}
				if (event.kind === 'boss-hit' || event.kind === 'bite') {
					this.bossHitFlash = 1;
				}
				if (event.kind === 'bfg-fire') {
					this.shared.fireBurst();
				}
			}
			this.fxView.update(dt, doom.shots);
			this.weaponFx.update(dt);
			if (this.recoil) {
				this.recoil.t += dt;
				if (this.recoil.t >= RECOIL_TIME) {
					this.recoil = null;
				}
			}
			this.bossHitFlash = Math.max(0, this.bossHitFlash - dt * 5);
		}

		// camera shake moves the world and the actors, never the screen-space overlay
		const shake = Math.max(boss ? boss.shake : 0, this.fxView.shake);
		const amp = shake * shake * layout.tileSize * 0.35;
		ctx.save();
		ctx.translate((Math.random() - 0.5) * amp, (Math.random() - 0.5) * amp);
		world.drawWorld(ctx);
		world.drawMood(ctx, this.lights(level, state, grid, world.moodStyle.headlight));

		// on level clear only the world: the season turn flips it over, actors stay out
		if (state !== 'level-clear') {
			this.fxView.drawGround(ctx, layout);
			this.shared.drawCollectibles(frame, layout);
			if (doom && level.progress) {
				this.drawFood(ctx, grid, level.progress, doom.split.active, doom.canEat, layout, time);
			}
			const split = doom?.split.active ?? false;
			if (doom && split) {
				this.drawSplit(ctx, doom, layout, time);
			}
			if (boss && doom && fighting && !split) {
				this.combatView.hero = level.player ? level.player.position : null;
				this.combatView.drawGround(ctx, boss, doom, grid, layout, time);
				const echo = boss.echo;
				const echoPos = boss.echoPosition();
				if (echo && echoPos) {
					this.echoBossView.draw(
						ctx,
						this.bossSnapshot(level, boss, echoPos, true, echo.presence),
						layout,
						time
					);
				}
				const r = this.recoil;
				const kick = r ? Math.sin((r.t / RECOIL_TIME) * Math.PI) * r.amount : 0;
				const at = {
					x: boss.position.x + (r ? r.x * kick : 0),
					y: boss.position.y + (r ? r.y * kick : 0)
				};
				this.bossView.draw(ctx, this.bossSnapshot(level, boss, at, false, 1), layout, time);
				const S = layout.tileSize;
				const bx = layout.offsetX + at.x * S;
				const by = layout.offsetY + at.y * S;
				if (doom.split.stage === 'omen') {
					omen(ctx, bx, by, S, time, Math.min(1, doom.split.stageElapsed / OMEN_LOOK));
				}
				if (boss.isStunned) {
					stunOverlay(ctx, bx, by, S, time, boss.stunLeft);
					if (doom.splitWindow) {
						windowMark(ctx, bx, by, S, time, boss.stunLeft);
					}
				}
				this.combatView.drawAir(ctx, boss, layout, time);
			}
			if (boss && doom && boss.defeated) {
				this.drawDeath(ctx, level, boss, layout, time);
			} else {
				this.death = null;
			}
			const player = level.player;
			if (state !== 'death') {
				// while dying, the pipeline draws Pac-Man over the level decay
				if (player && boss && fighting && !split) {
					this.combatView.drawPull(ctx, boss, player.position, layout, time);
				}
				this.drawHero(frame, layout, doom, time);
			}
			if (doom) {
				this.drawBolts(ctx, doom, layout);
				this.fxView.draw(ctx, layout, doom.shots, doom.tracerList);
				this.weaponFx.draw(ctx, layout);
			}
		}
		this.trackTeleport(frame, world);
		world.drawFx(ctx);
		ctx.restore();
		world.drawOverlay(ctx);
		this.fxView.drawHurt(ctx, frame.width, frame.height);
		return layout;
	}

	/** The food (placeholder fang sprites, one cached image) and, in the split, the energizers. */
	private drawFood(
		ctx: CanvasRenderingContext2D,
		grid: GridService | null,
		progress: LevelProgress,
		split: boolean,
		canEat: boolean,
		layout: GridLayout,
		time: number
	): void {
		if (!grid) {
			return;
		}
		const S = layout.tileSize;
		const sprite = fleshFoodSprite(S);
		// the food he cannot eat now (a full meter, an empty hand) shows faded
		const faded = canEat ? 1 : 0.45;
		for (let y = 0; y < grid.height; y += 1) {
			for (let x = 0; x < grid.width; x += 1) {
				if (progress.isCollected(x, y)) {
					continue;
				}
				const px = layout.offsetX + x * S;
				const py = layout.offsetY + y * S;
				if (grid.isDot(x, y)) {
					ctx.globalAlpha = faded;
					ctx.drawImage(sprite, px, py, S, S);
					ctx.globalAlpha = 1;
				} else if (split && grid.isEnergizer(x, y)) {
					drawFleshEnergizer(ctx, px + S / 2, py + S / 2, S, time);
				}
			}
		}
	}

	/** The split: the core where he burst and the four ghosts (or their way back to it). */
	private drawSplit(
		ctx: CanvasRenderingContext2D,
		doom: DoomAbilityService,
		layout: GridLayout,
		time: number
	): void {
		const split = doom.split;
		const core = split.core;
		const S = layout.tileSize;
		const X = (x: number) => layout.offsetX + x * S;
		const Y = (y: number) => layout.offsetY + y * S;
		if (core) {
			drawCore(ctx, X(core.x + 0.5), Y(core.y + 0.5), S, time);
		}
		if (split.stage === 'merge' && core) {
			const u = Math.min(1, split.stageElapsed / SPLIT_MERGE);
			const e = u * u * (3 - 2 * u);
			for (const m of split.mergeFrom) {
				const x = m.x + (core.x + 0.5 - m.x) * e;
				const y = m.y + (core.y + 0.5 - m.y) * e;
				const facing = headingOf(core.x + 0.5 - m.x, core.y + 0.5 - m.y);
				splitGhost(ctx, m.ghost, X(x), Y(y), S, facing, time, 0, 1 - 0.3 * u);
			}
			return;
		}
		for (const { drone, index } of split.ghosts) {
			const fright = drone.state === 'fright' ? split.fear : 0;
			splitGhost(
				ctx,
				index,
				X(drone.x),
				Y(drone.y),
				S,
				headingOf(drone.dx, drone.dy),
				time,
				fright
			);
		}
	}

	/** The Sting's bolts. */
	private drawBolts(
		ctx: CanvasRenderingContext2D,
		doom: DoomAbilityService,
		layout: GridLayout
	): void {
		if (doom.bolts.length === 0) {
			return;
		}
		const S = layout.tileSize;
		for (const bolt of doom.bolts) {
			drawStingBolt(
				ctx,
				layout.offsetX + bolt.x * S,
				layout.offsetY + bolt.y * S,
				S,
				headingOf(bolt.vx, bolt.vy)
			);
		}
	}

	/**
	 * The hero, or during the berserk's rush the whirlwind he spins up into (it grows in over the
	 * first moment); a gold ring round him while a rush would be a counter (the boss's attack is live).
	 */
	private drawHero(
		frame: RenderFrame,
		layout: GridLayout,
		doom: DoomAbilityService | null,
		time: number
	): void {
		const player = frame.level.player;
		const rushing = Boolean(doom?.rushActive && player);
		if (!rushing) {
			if (this.rushStart >= 0) {
				// the rush is over: he is back where the saw stopped, his old tail must not stay behind
				this.shared.cutHeroTrail();
			}
			this.rushStart = -1;
			this.shared.drawPlayer(frame, layout);
		}
		if (!doom || !player) {
			return;
		}
		const S = layout.tileSize;
		const x = layout.offsetX + player.position.x * S;
		const y = layout.offsetY + player.position.y * S;
		if (rushing) {
			if (this.rushStart < 0) {
				this.rushStart = time;
			}
			// he turns into the fang saw (it grows in over the first moment), its trail behind
			const morph = Math.min(1, (time - this.rushStart) / 0.12);
			const counter = doom.rushIsCounter;
			const ctx = frame.ctx;
			const facing = player.facing ?? 'RIGHT';
			rushTrail(ctx, x, y, S, facing, morph, counter);
			const k = 0.6 + 0.4 * morph;
			ctx.save();
			ctx.translate(x, y);
			ctx.scale(k, k);
			ctx.translate(-x, -y);
			rushSaw(ctx, x, y, S, time, counter);
			ctx.restore();
			return;
		}
		if (doom.berserkActive && doom.counterWindow && doom.rushCooldown <= 0) {
			counterReady(frame.ctx, x, y, S, time);
		}
		const facing = player.facing ?? 'RIGHT';
		if (doom.bfgCharging) {
			mawCharge(frame.ctx, x, y, S, facing, doom.bfgChargeProgress);
		}
		if (doom.stingFiring) {
			stingMuzzle(frame.ctx, x, y, S, facing, (time * 10) % 1);
		}
	}

	/** The boss's death where he fell (`finaleArt.bossDeath`), then the pool of blood he leaves. */
	private drawDeath(
		ctx: CanvasRenderingContext2D,
		level: LevelLoader,
		boss: DoomBossService,
		layout: GridLayout,
		time: number
	): void {
		if (!this.death) {
			this.death = { start: time, x: boss.position.x, y: boss.position.y };
		}
		const d = this.death;
		const S = layout.tileSize;
		const f = Math.min(1, (time - d.start) / DEATH_TIME);
		bossDeath(ctx, layout.offsetX + d.x * S, layout.offsetY + d.y * S, S, f, time, (dx) =>
			this.bossView.draw(
				ctx,
				this.bossSnapshot(level, boss, { x: d.x + dx, y: d.y }, false, 1),
				layout,
				time
			)
		);
	}

	/** The baked world is rebuilt only when a new hell level (a new grid) starts. */
	private worldFor(frame: RenderFrame): DoomWorld {
		if (!this.world || this.worldGrid !== frame.grid) {
			const doom = frame.level.doom;
			const pickupTiles = doom ? doom.pickupList.map((pickup) => pickup.tile) : [];
			const preview = this.previewWorld;
			if (preview && preview.grid === frame.season.grid) {
				// the world the season turn showed becomes the level's world: no jump
				this.world = preview.world;
				this.world.addPickupLights(pickupTiles);
			} else {
				this.world = new DoomWorld(frame.season.grid, pickupTiles);
			}
			this.previewWorld = null;
			this.fxView.reset();
			this.weaponFx.reset();
			this.worldGrid = frame.grid;
		}
		return this.world;
	}

	/** Opens the lair's gate for the boss (once he has materialised), his echo and the imps going through it. */
	private updateGate(grid: GridService | null, boss: DoomBossService | null, dt: number): void {
		const actors: Point[] = [];
		if (grid && boss) {
			if (this.gateOf?.grid !== grid) {
				const tiles = gateTiles(grid);
				this.gateOf = { grid, tiles, side: lairSide(grid, tiles) };
			}
			if (boss.introProgress >= 1) {
				actors.push(boss.position);
			}
			const echo = boss.echoPosition();
			if (echo) {
				actors.push(echo);
			}
			for (const imp of boss.minionList) {
				actors.push({ x: imp.tile.x + 0.5, y: imp.tile.y + 0.5 });
			}
		}
		const wanted = this.gateOf ? gateWanted(this.gateOf.tiles, actors, this.gateOf.side) : 0;
		this.gate = easeGate(this.gate, wanted, dt);
	}

	/** The hell world before the fight: no boss, no actors, calm (phase 1 mood). */
	preview(frame: PreviewFrame): GridLayout {
		if (!this.previewWorld || this.previewWorld.grid !== frame.season.grid) {
			this.previewWorld = { grid: frame.season.grid, world: new DoomWorld(frame.season.grid, []) };
		}
		const world = this.previewWorld.world;
		world.resize(frame.width, frame.height, frame.pixelRatio);
		world.setMood(false, false);
		world.update(frame.paused ? 0 : frame.dt);
		world.drawWorld(frame.ctx);
		world.drawMood(frame.ctx, []);
		world.drawOverlay(frame.ctx);
		return world.layout;
	}

	/** A jump of several tiles between frames is a teleport: fog at both ends, Doom style. */
	private trackTeleport(frame: RenderFrame, world: DoomWorld): void {
		const player = frame.level.player;
		if (!player) {
			this.lastPlayerPos = null;
			return;
		}
		const p = player.position;
		const last = this.lastPlayerPos;
		if (last && Math.abs(p.x - last.x) + Math.abs(p.y - last.y) > 3) {
			if (frame.state === 'playing') {
				world.teleportFog(last.x, last.y);
				world.teleportFog(p.x, p.y);
			}
		}
		this.lastPlayerPos = { x: p.x, y: p.y };
	}

	/** Light-map sources carried by the actors (tile-center coordinates, radius in tiles). */
	private lights(
		level: LevelLoader,
		state: PacmanStateName,
		grid: GridService,
		ahead: number
	): DoomLight[] {
		const lights: DoomLight[] = [];
		const player = level.player;
		if (player && state !== 'death') {
			const p = player.position;
			lights.push({ x: p.x, y: p.y, r: 6.5, tint: 0xffe2b0, a: 1 });
			if (ahead > 0 && player.facing) {
				// a second light thrown along his heading, as far as the corridor goes
				const v = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0] }[player.facing];
				for (let d = ahead; d >= 0.5; d -= 0.25) {
					const x = p.x + v[0] * d;
					const y = p.y + v[1] * d;
					if (
						grid.isInside(Math.floor(x), Math.floor(y)) &&
						grid.isWalkable(Math.floor(x), Math.floor(y))
					) {
						lights.push({ x, y, r: 4.5, tint: 0xffd8a0, a: 0.8 });
						break;
					}
				}
			}
		}
		const boss = level.doomBoss;
		const doom = level.doom;
		if (!boss || !doom || boss.defeated) {
			return lights;
		}
		const core = doom.split.active ? doom.split.core : null;
		if (core) {
			lights.push({ x: core.x + 0.5, y: core.y + 0.5, r: 2.6, tint: 0xff3a2a, a: 0.8 });
			return lights;
		}
		lights.push({ x: boss.position.x, y: boss.position.y, r: 3.2, tint: 0xff3a2a, a: 0.85 });
		const echo = boss.echoPosition();
		if (echo) {
			lights.push({ x: echo.x, y: echo.y, r: 2.6, tint: 0x9a6aff, a: 0.7 });
		}
		for (const pickup of doom.pickupList) {
			if (pickup.visible && pickup.kind) {
				lights.push({
					x: pickup.tile.x + 0.5,
					y: pickup.tile.y + 0.5,
					r: 2.4,
					tint: pickupSprite(pickup.kind).glow,
					a: 0.75
				});
			}
		}
		for (const shot of doom.shots) {
			lights.push({ x: shot.x, y: shot.y, r: 3.5, tint: 0x60ff70, a: 1 });
		}
		for (const hazard of boss.hazardList) {
			if (hazard.warn <= 0 && hazard.tiles.length > 0) {
				const mid = hazard.tiles[Math.floor(hazard.tiles.length / 2)];
				// the light of a burst dies down with it instead of cutting out
				const k = Math.max(0, Math.min(1, hazard.active / hazard.activeTotal));
				lights.push({ x: mid.x + 0.5, y: mid.y + 0.5, r: 6, tint: 0xff6a3a, a: 0.25 + 0.75 * k });
			}
		}
		return lights;
	}

	private bossSnapshot(
		level: LevelLoader,
		boss: DoomBossService,
		at: { x: number; y: number },
		echo: boolean,
		presence: number
	): BossSnapshot {
		const rs = boss.renderState;
		const player = level.player;
		const target = player ? player.position : { x: at.x - 1, y: at.y };
		return {
			x: at.x,
			y: at.y,
			phase: boss.phase,
			state: boss.state,
			shape: rs.shape,
			dir: rs.dir,
			progress: rs.progress,
			alpha: echo ? Math.max(0, Math.min(1, presence)) : rs.alpha,
			intro: boss.introProgress,
			look: Math.atan2(target.y - at.y, target.x - at.x),
			hit: echo ? 0 : this.bossHitFlash,
			echo
		};
	}
}

function headingOf(dx: number, dy: number): DoomDirection {
	return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'RIGHT' : 'LEFT') : dy > 0 ? 'DOWN' : 'UP';
}

/**
 * A ghost of the split (0 Blinky, 1 Pinky, 2 Inky, 3 Clyde), `scale` on its way back to the core;
 * frightened it is blue, and in its last two seconds of fear it blinks back to its colour.
 */
function splitGhost(
	ctx: CanvasRenderingContext2D,
	index: number,
	x: number,
	y: number,
	S: number,
	facing: DoomDirection,
	time: number,
	fear: number,
	scale = 1
): void {
	const fright = fear > 0 && !(fear < 2 && Math.floor(time * 8) % 2 === 0);
	ctx.save();
	ctx.translate(x, y);
	ctx.scale(scale, scale);
	drawFleshGhost(ctx, index, 0, 0, S, facing, fright, time);
	ctx.restore();
}
