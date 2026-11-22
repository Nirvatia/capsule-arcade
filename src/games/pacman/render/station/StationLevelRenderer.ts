import type { GridMatrix } from '../../config/gridConfig';
import { isTeleportToken } from '../../config/gridConfig';
import type { GhostKind, GhostModel } from '../../logic/actors/GhostModel';
import type { PlayerDirection } from '../../logic/actors/PlayerModel';
import type { RenderQuality } from '../common/renderQuality';
import type { GridLayout } from '../maze/GridView';
import type { LevelRenderer, PreviewFrame, RenderFrame, WorldPreview } from '../RenderFrame';
import type { SharedLayers } from '../SharedLayers';
import { StationWorld } from './StationWorld';
import type { Phase } from './stationPaint';
import { FLASHLIGHT } from './stationLight';
import type { StationLights } from './stationLight';
import { drawFlare, drawSpore } from './stationFood';
import { drawWraith } from './stationWraith';
import { drawCocoon, drawHunter, drawHunterGlints } from './stationHunter';
import { drawTracker } from './stationTracker';
import { stationGlow } from './stationColors';

const ANGLE: Readonly<Record<PlayerDirection, number>> = {
	RIGHT: 0,
	DOWN: Math.PI / 2,
	LEFT: Math.PI,
	UP: -Math.PI / 2
};

const NONE: ReadonlySet<GhostKind> = new Set();

/**
 * The station boss level (DESIGN.md §7a, style B), drawn from its rules (`StationService`): the
 * baked scene; the cocoons and the hunters under the light map (the light shows them); then what
 * glows by itself, the vents, the spores, the burning flares, the super flare and its beam, the
 * wraiths, the hunters' silhouettes (never fully hidden), the hero with his HP, the tracker, and
 * the video tape's rewind when he is touched.
 */
export class StationLevelRenderer implements LevelRenderer, WorldPreview {
	private readonly shared: SharedLayers;
	private world: { grid: GridMatrix; world: StationWorld } | null = null;
	private previewWorld: { grid: GridMatrix; world: StationWorld } | null = null;
	private quality: RenderQuality = 'high';
	private heroAngle = 0;

	constructor(shared: SharedLayers) {
		this.shared = shared;
	}

	setQuality(quality: RenderQuality): void {
		this.quality = quality;
		this.world?.world.setQuality(quality);
		this.previewWorld?.world.setQuality(quality);
	}

	render(frame: RenderFrame): GridLayout {
		const { ctx, state, level, progress, time } = frame;
		const world = this.worldFor(frame.season.grid);
		world.resize(frame.width, frame.height, frame.pixelRatio);
		const layout = world.layout;
		const S = layout.tileSize;
		const sx = (x: number) => layout.offsetX + x * S;
		const sy = (y: number) => layout.offsetY + y * S;
		const rules = level.stationRules;
		const phase: Phase = rules?.phase ?? 1;
		const hunters = rules?.hunters ?? NONE;
		const clear = state === 'level-clear';
		const cocoons = !clear && rules ? rules.cocoons : [];
		const cocooned = new Set(cocoons.map((c) => c.kind));
		const player = level.player;
		const facing = player?.facing;
		if (facing) {
			this.heroAngle = ANGLE[facing];
		}
		const hero = player && !clear ? { ...player.position, angle: this.heroAngle } : null;
		const ghosts: readonly GhostModel[] = clear
			? []
			: (level.ghosts?.list ?? []).filter((g) => !cocooned.has(g.kind));
		const grid = frame.season.grid;
		const solid = (x: number, y: number) => {
			const t = grid[y]?.[x];
			return t === undefined || t === 'WL' || t === 'ES';
		};
		const beam = !clear && rules?.superBeam ? rules.superBeam : null;
		const burning = !clear && rules ? rules.flares : [];

		world.drawWorld(ctx, phase);
		// the cocoons and the hunters live in the dark: drawn before it, the light shows them
		for (const c of cocoons) {
			drawCocoon(ctx, sx(c.x + 0.5), sy(c.y + 0.5), S, c.kind, time);
		}
		for (const g of ghosts) {
			if (hunters.has(g.kind)) {
				const p = g.position;
				drawHunter(ctx, sx(p.x), sy(p.y), S, g.kind, angleOf(g), time, {
					lit: hero ? litBy(hero, p) : 0
				});
			}
		}
		const lights: StationLights = {
			phase,
			time,
			hero,
			flares: burning,
			beam: beam ? beam.tiles.map((b) => ({ x: b.x + 0.5, y: b.y + 0.5 })) : [],
			solid
		};
		world.drawDark(ctx, lights);
		world.drawGlow(ctx, phase, time);
		this.drawVents(ctx, grid, layout, time);
		if (hero) {
			this.drawBeamDust(ctx, layout, hero, solid, time);
		}
		this.drawFood(ctx, grid, layout, time, (x, y) => progress.isCollected(x, y));
		if (!clear) {
			for (const f of burning) {
				drawFlare(ctx, sx(f.x), sy(f.y), S, time, true);
			}
			if (beam) {
				this.drawSuperBeam(ctx, layout, beam.tiles, beam.left);
			}
			const token = rules?.token;
			if (token) {
				this.drawSuperToken(ctx, sx(token.x + 0.5), sy(token.y + 0.5), S, time);
			}
			this.shared.drawCollectibles(frame, layout);
			for (const g of ghosts) {
				const p = g.position;
				const fleeing = g.state === 'frightened';
				if (hunters.has(g.kind)) {
					const lit = hero ? litBy(hero, p) : 0;
					if (lit < 0.3) {
						// never fully hidden: a dim silhouette and the slit of its colour
						ctx.save();
						ctx.globalAlpha = 0.5;
						drawHunter(ctx, sx(p.x), sy(p.y), S, g.kind, angleOf(g), time);
						ctx.restore();
						drawHunterGlints(ctx, sx(p.x), sy(p.y), S, g.kind, angleOf(g), 0.8);
					}
				} else {
					drawWraith(ctx, sx(p.x), sy(p.y), S, g.kind, angleOf(g), time, fleeing ? 0.6 : 0.95);
				}
			}
			if (state !== 'death') {
				// while dying, the pipeline draws Pac-Man over the level decay
				this.shared.drawPlayer(frame, layout);
				if (hero && rules) {
					drawHp(ctx, sx(hero.x), sy(hero.y), S, rules.hp, rules.hpMax);
				}
			}
			if (hero && state === 'playing') {
				const blips = [
					...ghosts.map((g) => g.position),
					...cocoons.map((c) => ({ x: c.x + 0.5, y: c.y + 0.5 }))
				].map((p) => ({ x: p.x - hero.x, y: p.y - hero.y }));
				drawTracker(ctx, sx(hero.x), sy(hero.y), S, time, blips);
			}
		}
		world.drawGrain(ctx, time);
		const rewind = rules?.rewind;
		if (rewind) {
			drawRewind(ctx, frame.width, frame.height, rewind.progress, time);
		}
		return layout;
	}

	/** The station before the level: no actors, every spore in place, the power still on. */
	preview(frame: PreviewFrame): GridLayout {
		if (!this.previewWorld || this.previewWorld.grid !== frame.season.grid) {
			this.previewWorld = { grid: frame.season.grid, world: new StationWorld(frame.season.grid) };
			this.previewWorld.world.setQuality(this.quality);
		}
		const world = this.previewWorld.world;
		world.resize(frame.width, frame.height, frame.pixelRatio);
		const grid = frame.season.grid;
		const solid = (x: number, y: number) => {
			const t = grid[y]?.[x];
			return t === undefined || t === 'WL' || t === 'ES';
		};
		const time = performance.now() / 1000;
		world.drawWorld(frame.ctx, 1);
		world.drawDark(frame.ctx, { phase: 1, time, hero: null, flares: [], beam: [], solid });
		world.drawGlow(frame.ctx, 1, time);
		this.drawFood(frame.ctx, grid, world.layout, time, () => false);
		return world.layout;
	}

	/** The world the season turn showed becomes the level's world: nothing is baked twice. */
	private worldFor(grid: GridMatrix): StationWorld {
		if (this.world?.grid !== grid) {
			const preview = this.previewWorld;
			const world = preview && preview.grid === grid ? preview.world : new StationWorld(grid);
			world.setQuality(this.quality);
			this.world = { grid, world };
			this.previewWorld = null;
		}
		return this.world.world;
	}

	/** The vents' grilles glow from afar, so they are seen before the hero is on them. */
	private drawVents(
		ctx: CanvasRenderingContext2D,
		grid: GridMatrix,
		layout: GridLayout,
		time: number
	): void {
		const S = layout.tileSize;
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		for (let y = 0; y < grid.length; y += 1) {
			const row = grid[y];
			for (let x = 0; x < row.length; x += 1) {
				if (!isTeleportToken(row[x])) {
					continue;
				}
				const cx = layout.offsetX + (x + 0.5) * S;
				const cy = layout.offsetY + (y + 0.5) * S;
				const a = 0.32 + 0.08 * Math.sin(time * 1.2 + x + y);
				stationGlow(ctx, cx, cy, S * 1.1, '#7fd8ff', a);
				ctx.strokeStyle = `rgba(160,230,255,${a + 0.2})`;
				ctx.lineWidth = Math.max(1, S * 0.05);
				ctx.strokeRect(cx - S * 0.42, cy - S * 0.42, S * 0.84, S * 0.84);
			}
		}
		ctx.restore();
	}

	/** The super flare's beam: a white-hot corridor fading as it burns down. */
	private drawSuperBeam(
		ctx: CanvasRenderingContext2D,
		layout: GridLayout,
		tiles: readonly { x: number; y: number }[],
		left: number
	): void {
		const S = layout.tileSize;
		const a = Math.min(1, left / 1.5);
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		for (const t of tiles) {
			const cx = layout.offsetX + (t.x + 0.5) * S;
			const cy = layout.offsetY + (t.y + 0.5) * S;
			stationGlow(ctx, cx, cy, S * 0.9, '#fff2e0', 0.35 * a);
		}
		ctx.restore();
	}

	/** The super flare lying in the maze: a bigger flare in a white halo. */
	private drawSuperToken(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		S: number,
		time: number
	): void {
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		stationGlow(ctx, x, y, S * 1.2, '#fff6ea', 0.45 + 0.1 * Math.sin(time * 1.5));
		ctx.restore();
		drawFlare(ctx, x, y, S * 1.35, time, false);
	}

	private drawFood(
		ctx: CanvasRenderingContext2D,
		grid: GridMatrix,
		layout: GridLayout,
		time: number,
		eaten: (x: number, y: number) => boolean
	): void {
		const S = layout.tileSize;
		for (let y = 0; y < grid.length; y += 1) {
			const row = grid[y];
			for (let x = 0; x < row.length; x += 1) {
				const t = row[x];
				if ((t !== 'DT' && t !== 'EU') || eaten(x, y)) {
					continue;
				}
				const cx = layout.offsetX + (x + 0.5) * S;
				const cy = layout.offsetY + (y + 0.5) * S;
				if (t === 'DT') {
					drawSpore(ctx, cx, cy, S, time, ((x * 31 + y * 17) % 13) / 13);
				} else {
					drawFlare(ctx, cx, cy, S, time, false);
				}
			}
		}
	}

	/** Dust turning in the flashlight's beam (only where the beam reaches). */
	private drawBeamDust(
		ctx: CanvasRenderingContext2D,
		layout: GridLayout,
		hero: { x: number; y: number; angle: number },
		solid: (x: number, y: number) => boolean,
		time: number
	): void {
		const S = layout.tileSize;
		ctx.save();
		for (let i = 0; i < 40; i += 1) {
			const d = ((i * 0.618 + time * 0.05) % 1) * (FLASHLIGHT.reach - 0.3) + 0.4;
			const a = hero.angle + Math.sin(i * 12.9 + time * 0.3) * FLASHLIGHT.half * 0.9;
			let clear = true;
			for (let k = 0.2; k <= d && clear; k += 0.25) {
				clear = !solid(Math.floor(hero.x + Math.cos(a) * k), Math.floor(hero.y + Math.sin(a) * k));
			}
			if (!clear) {
				continue;
			}
			const px =
				layout.offsetX + (hero.x + Math.cos(a) * d) * S + Math.sin(time * 0.7 + i) * S * 0.1;
			const py =
				layout.offsetY + (hero.y + Math.sin(a) * d) * S + Math.cos(time * 0.5 + i * 2) * S * 0.1;
			ctx.fillStyle = `rgba(235,242,250,${0.45 * (1 - d / (FLASHLIGHT.reach + 0.1))})`;
			ctx.fillRect(px, py, Math.max(1, S * 0.03), Math.max(1, S * 0.03));
		}
		ctx.restore();
	}
}

function angleOf(g: GhostModel): number {
	return g.facing ? ANGLE[g.facing] : Math.PI / 2;
}

/** How much the flashlight falls on `p`: 1 close by, fading along the cone, 0 outside it. */
function litBy(hero: { x: number; y: number; angle: number }, p: { x: number; y: number }): number {
	const dx = p.x - hero.x;
	const dy = p.y - hero.y;
	const d = Math.hypot(dx, dy);
	if (d < 1.3) {
		return 1;
	}
	if (d > FLASHLIGHT.reach) {
		return 0;
	}
	let da = Math.atan2(dy, dx) - hero.angle;
	while (da > Math.PI) da -= Math.PI * 2;
	while (da < -Math.PI) da += Math.PI * 2;
	return Math.abs(da) < FLASHLIGHT.half ? 1 - d / (FLASHLIGHT.reach + 0.5) : 0;
}

/** The hero's HP: small pips over his head, the lost ones dark. */
function drawHp(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	S: number,
	hp: number,
	max: number
): void {
	const r = S * 0.07;
	const gap = S * 0.2;
	const y0 = y - S * 0.62;
	for (let i = 0; i < max; i += 1) {
		const px = x + (i - (max - 1) / 2) * gap;
		ctx.fillStyle = 'rgba(0,0,0,.7)';
		ctx.beginPath();
		ctx.arc(px, y0, r + 1.2, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = i < hp ? '#ff3b4a' : '#2a1416';
		ctx.beginPath();
		ctx.arc(px, y0, r, 0, Math.PI * 2);
		ctx.fill();
	}
}

/**
 * The video tape's rewind over the screen while the hero is pulled back: slow tracking bands, a
 * colour fringe and the rewind mark. No flash, nothing blinks.
 */
function drawRewind(
	ctx: CanvasRenderingContext2D,
	w: number,
	h: number,
	progress: number,
	time: number
): void {
	const k = Math.sin(Math.min(1, progress) * Math.PI);
	ctx.save();
	ctx.globalAlpha = 0.5 * k;
	ctx.fillStyle = 'rgb(20,40,60)';
	ctx.globalCompositeOperation = 'multiply';
	ctx.fillRect(0, 0, w, h);
	ctx.globalCompositeOperation = 'lighter';
	for (let i = 0; i < 5; i += 1) {
		const y = ((time * 90 + i * h * 0.23) % (h + 40)) - 20;
		const bh = 6 + (i % 3) * 5;
		ctx.fillStyle = `rgba(${i % 2 ? '120,220,255' : '255,120,200'},${0.18 * k})`;
		ctx.fillRect(0, y, w, bh);
	}
	ctx.globalCompositeOperation = 'source-over';
	ctx.globalAlpha = 0.85 * k;
	ctx.fillStyle = '#e8f4ff';
	ctx.font = `700 ${Math.round(Math.min(w, h) * 0.05)}px "Courier New", monospace`;
	ctx.textBaseline = 'top';
	ctx.fillText('\u25C0\u25C0', w * 0.05, h * 0.06);
	ctx.restore();
}
