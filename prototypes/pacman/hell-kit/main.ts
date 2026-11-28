// The hell redesign's missing art as three whole kits (`kits.ts`), each on the game's own hell (the
// real `DoomWorld`, maze and hero) at game scale, and as a sheet of its pieces at a larger scale with
// the hell's current pickups beside them for reference. Static frames, nothing plays.
import { GRID_DOOM, DOOM_PICKUP_TILES } from '../../../src/games/pacman/config/mazes/doom';
import type { PacmanEventMap } from '../../../src/games/pacman/core/Events';
import { EventBus } from '../../../src/games/pacman/engine/EventBus';
import { PlayerService } from '../../../src/games/pacman/logic/actors/PlayerService';
import { LevelProgress } from '../../../src/games/pacman/logic/level/LevelProgress';
import { ScoreModel } from '../../../src/games/pacman/logic/level/ScoreModel';
import { GridModel } from '../../../src/games/pacman/logic/maze/GridModel';
import { GridService } from '../../../src/games/pacman/logic/maze/GridService';
import { HeroView } from '../../../src/games/pacman/render/actors/HeroView';
import { PacmanHero } from '../../../src/games/pacman/render/actors/hero/PacmanHero';
import { chargePainter } from '../../../src/games/pacman/render/actors/hero/heroCharge';
import { pickupSprite } from '../../../src/games/pacman/render/doom/DoomSprites';
import { DoomWorld } from '../../../src/games/pacman/render/doom/DoomWorld';
import { KITS } from './kits';
import type { Dir, Kit } from './kits';

type Lay = { tileSize: number; offsetX: number; offsetY: number };

const D = Math.min(window.devicePixelRatio || 1, 2);
/** The world is drawn big and the frame keeps the maze (tile `SCENE_S` px, about the game's on a laptop). */
const WORLD_W = 1240;
const WORLD_H = 1340;
const CELL = 104;
const SHEET_COLS = 5;
const SHEET_ROWS = 4;
const SHEET_S = 54;
const FONT = '"PT Sans Narrow","Arial Narrow",system-ui,sans-serif';

const grid = new GridService(new GridModel(GRID_DOOM));
const events = new EventBus<PacmanEventMap>();
const progress = new LevelProgress(grid, new ScoreModel(), events);
const player = new PlayerService(grid, progress, events);
player.placeAt({ x: 8, y: 18 });
player.setDesiredDirection('RIGHT');
player.update(0.02);
const heroView = new HeroView(new PacmanHero(), chargePainter);
heroView.setSeason('hell');
const world = new DoomWorld(GRID_DOOM, DOOM_PICKUP_TILES);
world.resize(WORLD_W, WORLD_H, D);
world.update(0.016);

/** The frame of the game: what lies where. */
const EATEN = new Set(['2,18', '3,18', '4,18', '5,18', '6,18', '7,18', '8,18']);
const GHOSTS: ReadonlyArray<{ x: number; y: number; dir: Dir; fright: boolean }> = [
	{ x: 16, y: 10, dir: 'LEFT', fright: false },
	{ x: 5, y: 14, dir: 'UP', fright: false },
	{ x: 19, y: 15, dir: 'DOWN', fright: true },
	{ x: 18, y: 21, dir: 'LEFT', fright: true }
];
const PICKUPS: ReadonlyArray<{ tile: { x: number; y: number }; item: 'snare' | 'plasma' | 'armour' | 'berserk' }> = [
	{ tile: DOOM_PICKUP_TILES[0], item: 'snare' },
	{ tile: DOOM_PICKUP_TILES[1], item: 'plasma' },
	{ tile: DOOM_PICKUP_TILES[2], item: 'armour' },
	{ tile: DOOM_PICKUP_TILES[3], item: 'berserk' }
];

function canvas(w: number, h: number, label: string): [HTMLCanvasElement, CanvasRenderingContext2D] {
	const cv = document.createElement('canvas');
	cv.width = Math.round(w * D);
	cv.height = Math.round(h * D);
	cv.style.width = `${w}px`;
	cv.style.aspectRatio = `${w} / ${h}`;
	cv.setAttribute('role', 'img');
	cv.setAttribute('aria-label', label);
	const ctx = cv.getContext('2d') as CanvasRenderingContext2D;
	ctx.setTransform(D, 0, 0, D, 0, 0);
	return [cv, ctx];
}

function existing(ctx: CanvasRenderingContext2D, kind: 'berserk' | 'bfg' | 'medkit', x: number, y: number, S: number): void {
	const s = S * 0.9;
	ctx.drawImage(pickupSprite(kind).icon, x - s / 2, y - s / 2, s, s);
}

function drawScene(kit: Kit): HTMLCanvasElement {
	const off = document.createElement('canvas');
	off.width = Math.round(WORLD_W * D);
	off.height = Math.round(WORLD_H * D);
	const ctx = off.getContext('2d') as CanvasRenderingContext2D;
	ctx.setTransform(D, 0, 0, D, 0, 0);
	world.drawWorld(ctx);
	const L: Lay = world.layout;
	const S = L.tileSize;
	const X = (x: number): number => L.offsetX + (x + 0.5) * S;
	const Y = (y: number): number => L.offsetY + (y + 0.5) * S;
	world.drawMood(ctx, [{ x: player.position.x, y: player.position.y, r: 6.5, tint: 0xffe2b0, a: 1 }]);
	for (let y = 0; y < grid.height; y += 1) {
		for (let x = 0; x < grid.width; x += 1) {
			if (grid.isDot(x, y) && !EATEN.has(`${x},${y}`)) kit.food(ctx, X(x), Y(y), S);
			else if (grid.isEnergizer(x, y)) kit.energizer(ctx, X(x), Y(y), S);
		}
	}
	kit.snare(ctx, X(8), Y(5), S, 1);
	kit.snare(ctx, X(16), Y(5), S, 0);
	for (const p of PICKUPS) {
		if (p.item === 'berserk') existing(ctx, 'berserk', X(p.tile.x), Y(p.tile.y), S);
		else kit.icon(ctx, p.item, X(p.tile.x), Y(p.tile.y), S);
	}
	GHOSTS.forEach((g, i) => kit.ghost(ctx, i, X(g.x), Y(g.y), S, g.dir, g.fright));
	heroView.draw(ctx, player, L, 0.4, { look: 'normal', charge: 0, dying: false });
	kit.armour(ctx, player.position.x * S + L.offsetX, player.position.y * S + L.offsetY, S);
	for (let k = 0; k < 3; k += 1) kit.bolt(ctx, X(10 + k * 1.3), Y(18), S, 'RIGHT');
	world.drawOverlay(ctx);
	// the maze and a strip of its frame
	const sx = L.offsetX + 0.4 * S;
	const sy = L.offsetY + 0.4 * S;
	const sw = (grid.width - 0.8) * S;
	const sh = (grid.height - 0.8) * S;
	const [cv, out] = canvas(sw, sh, `${kit.name}: кадр игры`);
	out.drawImage(off, sx * D, sy * D, sw * D, sh * D, 0, 0, sw, sh);
	return cv;
}

function drawSheet(kit: Kit): HTMLCanvasElement {
	const w = CELL * SHEET_COLS;
	const h = (CELL + 18) * SHEET_ROWS;
	const [cv, ctx] = canvas(w, h, `${kit.name}: лист спрайтов`);
	ctx.fillStyle = '#120708';
	ctx.fillRect(0, 0, w, h);
	const S = SHEET_S;
	const cell = (col: number, row: number, span: number, label: string, ref = false): { x: number; y: number } => {
		const x0 = col * CELL + 3;
		const y0 = row * (CELL + 18) + 3;
		const g = ctx.createLinearGradient(x0, y0, x0 + CELL * span, y0 + CELL);
		g.addColorStop(0, '#4a1c1c');
		g.addColorStop(1, '#2a0c0e');
		ctx.fillStyle = g;
		ctx.fillRect(x0, y0, CELL * span - 6, CELL - 6);
		ctx.font = `600 12px ${FONT}`;
		ctx.fillStyle = ref ? '#8a7470' : '#d9c3b8';
		ctx.textAlign = 'center';
		ctx.fillText(label, x0 + (CELL * span - 6) / 2, y0 + CELL + 9);
		return { x: x0 + (CELL * span - 6) / 2, y: y0 + (CELL - 6) / 2 };
	};
	const names = ['Блинки', 'Пинки', 'Инки', 'Клайд'];
	for (let i = 0; i < 4; i += 1) {
		const c = cell(i, 0, 1, names[i]);
		kit.ghost(ctx, i, c.x, c.y + 4, S, 'RIGHT', false);
	}
	let c = cell(4, 0, 1, 'испуганный');
	kit.ghost(ctx, 1, c.x, c.y + 4, S, 'LEFT', true);
	c = cell(0, 1, 1, 'еда');
	for (let k = -1; k <= 1; k += 1) kit.food(ctx, c.x + k * S * 0.6, c.y, S);
	c = cell(1, 1, 1, 'энерджайзер');
	kit.energizer(ctx, c.x, c.y, S);
	c = cell(2, 1, 1, 'капкан');
	kit.snare(ctx, c.x, c.y, S, 1);
	c = cell(3, 1, 1, 'захлопнут');
	kit.snare(ctx, c.x, c.y, S, 0);
	c = cell(4, 1, 1, 'подбор: капкан');
	kit.icon(ctx, 'snare', c.x, c.y, S);
	c = cell(0, 2, 1, 'подбор: плазма');
	kit.icon(ctx, 'plasma', c.x, c.y, S);
	c = cell(1, 2, 1, 'выстрелы');
	for (let k = -1; k <= 1; k += 1) kit.bolt(ctx, c.x + k * S * 0.5, c.y, S, 'RIGHT');
	c = cell(2, 2, 1, 'подбор: броня');
	kit.icon(ctx, 'armour', c.x, c.y, S);
	c = cell(3, 2, 1, 'герой в броне');
	const L: Lay = { tileSize: S, offsetX: c.x - player.position.x * S, offsetY: c.y - player.position.y * S };
	heroView.draw(ctx, player, L, 0.4, { look: 'normal', charge: 0, dying: false });
	kit.armour(ctx, c.x, c.y, S);
	c = cell(4, 2, 1, 'есть: берсерк', true);
	existing(ctx, 'berserk', c.x, c.y, S);
	c = cell(0, 3, 3, 'рывок берсерка и удар');
	const left = c.x - CELL * 1.3;
	const hit = c.x + CELL * 1.15;
	kit.rush(ctx, left, hit - S * 0.45, c.y, S);
	const H: Lay = { tileSize: S, offsetX: hit - S * 0.6 - player.position.x * S, offsetY: c.y - player.position.y * S };
	heroView.draw(ctx, player, H, 0.4, { look: 'berserk', charge: 0, dying: false });
	kit.impact(ctx, hit, c.y, S);
	c = cell(3, 3, 1, 'есть: BFG', true);
	existing(ctx, 'bfg', c.x, c.y, S);
	c = cell(4, 3, 1, 'есть: аптечка', true);
	existing(ctx, 'medkit', c.x, c.y, S);
	return cv;
}

const root = document.getElementById('kits') as HTMLElement;
KITS.forEach((kit, n) => {
	const section = document.createElement('section');
	section.className = 'kit';
	section.innerHTML = `<header><span class="tag">Набор ${'АБВ'[n]}</span><h2>${kit.name}</h2><p>${kit.idea}</p></header>`;
	const row = document.createElement('div');
	row.className = 'frames';
	const scene = document.createElement('figure');
	scene.append(drawScene(kit));
	scene.insertAdjacentHTML('beforeend', '<figcaption>Кадр игры, масштаб игры</figcaption>');
	const sheet = document.createElement('figure');
	sheet.append(drawSheet(kit));
	sheet.insertAdjacentHTML('beforeend', '<figcaption>Крупно; серым подписаны нынешние предметы для сравнения</figcaption>');
	row.append(scene, sheet);
	section.append(row);
	root.append(section);
});
