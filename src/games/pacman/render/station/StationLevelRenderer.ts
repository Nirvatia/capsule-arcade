import type { GridMatrix } from '../../config/gridConfig';
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
import { drawHunter, drawHunterGlints } from './stationHunter';
import { drawTracker } from './stationTracker';

/** The order the ghosts turn into hunters (DESIGN.md §7a). */
const METAMORPHOSIS: readonly GhostKind[] = ['BLINKY', 'PINKY', 'INKY', 'CLYDE'];
/** Share of the dots eaten per hunter that hatches (the 2nd and the 4th bring the next phase). */
const PER_HUNTER = 0.2;

const ANGLE: Readonly<Record<PlayerDirection, number>> = {
	RIGHT: 0,
	DOWN: Math.PI / 2,
	LEFT: Math.PI,
	UP: -Math.PI / 2
};

/** The phase by the dots eaten: power, failure at the second hunter, the nest at the fourth. */
export function stationPhase(ratio: number): Phase {
	return ratio >= PER_HUNTER * 4 ? 3 : ratio >= PER_HUNTER * 2 ? 2 : 1;
}

/** How many ghosts have turned into hunters at this share of the dots eaten. */
export function huntersAt(ratio: number): number {
	return Math.max(0, Math.min(METAMORPHOSIS.length, Math.floor(ratio / PER_HUNTER + 1e-9)));
}

/**
 * The station boss level (DESIGN.md §7a, style B): the baked scene, the actors that live in the
 * dark (hunters) under the light map, then what glows by itself, the food, the wraiths, the hero
 * and the tracker over it. Until the station's own rules land, the metamorphosis is shown by the
 * dots eaten: a ghost past its share is drawn as a hunter.
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
		const ratio = progress.collectionRatio;
		const phase = stationPhase(ratio);
		const hunters = new Set(METAMORPHOSIS.slice(0, huntersAt(ratio)));
		const player = level.player;
		const facing = player?.facing;
		if (facing) {
			this.heroAngle = ANGLE[facing];
		}
		const hero =
			player && state !== 'level-clear' ? { ...player.position, angle: this.heroAngle } : null;
		const ghosts: readonly GhostModel[] = state === 'level-clear' ? [] : (level.ghosts?.list ?? []);
		const grid = frame.season.grid;
		const solid = (x: number, y: number) => {
			const t = grid[y]?.[x];
			return t === undefined || t === 'WL' || t === 'ES';
		};

		world.drawWorld(ctx, phase);
		// the hunters live in the dark: drawn before it, only the light shows them
		for (const g of ghosts) {
			if (hunters.has(g.kind)) {
				const p = g.position;
				drawHunter(ctx, sx(p.x), sy(p.y), S, g.kind, angleOf(g), time, {
					lit: hero ? litBy(hero, p) : 0
				});
			}
		}
		const lights: StationLights = { phase, time, hero, flares: [], solid };
		world.drawDark(ctx, lights);
		world.drawGlow(ctx, phase, time);
		if (hero) {
			this.drawBeamDust(ctx, layout, hero, solid, time);
		}
		this.drawFood(ctx, frame.season.grid, layout, time, (x, y) => progress.isCollected(x, y));
		if (state !== 'level-clear') {
			this.shared.drawCollectibles(frame, layout);
			for (const g of ghosts) {
				const p = g.position;
				if (hunters.has(g.kind)) {
					if (!hero || litBy(hero, p) < 0.3) {
						drawHunterGlints(ctx, sx(p.x), sy(p.y), S, g.kind, angleOf(g), 0.6);
					}
				} else {
					drawWraith(ctx, sx(p.x), sy(p.y), S, g.kind, angleOf(g), time, 0.9);
				}
			}
			if (state !== 'death') {
				// while dying, the pipeline draws Pac-Man over the level decay
				this.shared.drawPlayer(frame, layout);
			}
			if (hero && state === 'playing') {
				const blips = ghosts.map((g) => ({ x: g.position.x - hero.x, y: g.position.y - hero.y }));
				drawTracker(ctx, sx(hero.x), sy(hero.y), S, time, blips);
			}
		}
		world.drawGrain(ctx, time);
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
		world.drawDark(frame.ctx, { phase: 1, time, hero: null, flares: [], solid });
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
