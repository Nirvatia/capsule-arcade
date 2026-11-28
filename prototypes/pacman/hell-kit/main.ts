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
import { FRUIT_BODY_RATIO, OrangeHero } from '../../../src/games/pacman/render/actors/hero/FruitHero';
import { chargePainter } from '../../../src/games/pacman/render/actors/hero/heroCharge';
import { pickupSprite } from '../../../src/games/pacman/render/doom/DoomSprites';
import { DoomWorld } from '../../../src/games/pacman/render/doom/DoomWorld';
import type { CordLook } from '../../../src/games/pacman/render/doom/fleshBake';
import { HellBlinkyView } from '../../../src/games/pacman/render/doom/HellBlinkyView';
import { KITS } from './kits';
import type { Kit } from './kits';
import type { Dir } from './paint';

type Lay = { tileSize: number; offsetX: number; offsetY: number };

const D = Math.min(window.devicePixelRatio || 1, 2);
/** The world is drawn big and the frame keeps the maze (tile `SCENE_S` px, about the game's on a laptop). */
const WORLD_W = 1240;
const WORLD_H = 1340;
const CELL = 128;
const SHEET_COLS = 5;
const SHEET_ROWS = 4;
const SHEET_S = 70;
/** The frames are still: one moment of the animations. */
const T = 0.35;
const FONT = '"PT Sans Narrow","Arial Narrow",system-ui,sans-serif';

const grid = new GridService(new GridModel(GRID_DOOM));
const events = new EventBus<PacmanEventMap>();
const progress = new LevelProgress(grid, new ScoreModel(), events);
const player = new PlayerService(grid, progress, events);
player.placeAt({ x: 8, y: 18 });
player.setDesiredDirection('RIGHT');
player.update(0.02);
const heroView = new HeroView(new OrangeHero(), chargePainter, FRUIT_BODY_RATIO);
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
const PICKUPS: ReadonlyArray<{ tile: { x: number; y: number }; item: 'bfg' | 'plasma' | 'berserk' | 'medkit' }> = [
	{ tile: DOOM_PICKUP_TILES[0], item: 'bfg' },
	{ tile: DOOM_PICKUP_TILES[1], item: 'plasma' },
	{ tile: DOOM_PICKUP_TILES[2], item: 'berserk' },
	{ tile: DOOM_PICKUP_TILES[3], item: 'medkit' }
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

/** How the game shows a pickup lying on the floor: its glow under it (`DoomCombatView`), then the icon. */
const PICKUP_GLOW: Record<'bfg' | 'plasma' | 'berserk' | 'medkit', string> = {
	bfg: '255,150,60',
	plasma: '80,210,255',
	berserk: '255,122,26',
	medkit: '255,58,42'
};

function pickup(ctx: CanvasRenderingContext2D, kit: Kit, item: 'bfg' | 'plasma' | 'berserk' | 'medkit', x: number, y: number, S: number): void {
	const r = S * 0.62;
	const g = ctx.createRadialGradient(x, y, 0, x, y, r);
	g.addColorStop(0, `rgba(${PICKUP_GLOW[item]},.55)`);
	g.addColorStop(0.45, `rgba(${PICKUP_GLOW[item]},.22)`);
	g.addColorStop(1, `rgba(${PICKUP_GLOW[item]},0)`);
	ctx.save();
	ctx.globalCompositeOperation = 'lighter';
	ctx.fillStyle = g;
	ctx.fillRect(x - r, y - r, r * 2, r * 2);
	ctx.restore();
	if (item === 'bfg' || item === 'plasma') kit.icon(ctx, item, x, y, S);
	else existing(ctx, item, x, y, S);
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
			else if (grid.isEnergizer(x, y)) kit.energizer(ctx, X(x), Y(y), S, T);
		}
	}
	for (const p of PICKUPS) {
		pickup(ctx, kit, p.item, X(p.tile.x), Y(p.tile.y), S);
	}
	GHOSTS.forEach((g, i) => kit.ghost(ctx, i, X(g.x), Y(g.y), S, g.dir, g.fright, T + i * 0.4));
	heroView.draw(ctx, player, L, 0.4, { look: 'normal', charge: 0, dying: false });
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

/** The current hero (the orange) drawn with its centre at (x, y), tile `S`. */
function hero(ctx: CanvasRenderingContext2D, x: number, y: number, S: number, look: 'normal' | 'berserk'): void {
	const L: Lay = { tileSize: S, offsetX: x - player.position.x * S, offsetY: y - player.position.y * S };
	heroView.draw(ctx, player, L, T, { look, charge: 0, dying: false });
}

const bossView = new HellBlinkyView();

/** The boss (phase 3, the biggest horns) with its new long skirt, centred at (x, y). */
function boss(ctx: CanvasRenderingContext2D, x: number, y: number, S: number): void {
	bossView.draw(
		ctx,
		{ x: 0.5, y: 0.5, phase: 3, state: 'CHASE', shape: 'normal', dir: 'RIGHT', progress: 0, alpha: 1, intro: 1, look: 0, hit: 0, echo: false },
		{ tileSize: S, offsetX: x - S / 2, offsetY: y - S / 2 },
		T
	);
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
		const centre = { x: x0 + (CELL * span - 6) / 2, y: y0 + (CELL - 6) / 2 };
		if (span === 1 && label !== 'еда' && label !== 'выстрелы') {
			// the tile's bounds: nothing may leave them
			ctx.save();
			ctx.setLineDash([4, 4]);
			ctx.strokeStyle = 'rgba(255,230,210,.28)';
			ctx.lineWidth = 1;
			ctx.strokeRect(centre.x - S / 2, centre.y - S / 2, S, S);
			ctx.restore();
		}
		return centre;
	};
	const names = ['Блинки', 'Пинки', 'Инки', 'Клайд'];
	for (let i = 0; i < 4; i += 1) {
		const g = cell(i, 0, 1, names[i]);
		kit.ghost(ctx, i, g.x, g.y, S, 'RIGHT', false, T + i * 0.4);
	}
	let c = cell(4, 0, 1, 'испуганный');
	kit.ghost(ctx, 1, c.x, c.y, S, 'LEFT', true, T);
	c = cell(0, 1, 1, 'еда');
	for (let k = -1; k <= 1; k += 1) kit.food(ctx, c.x + k * S * 0.55, c.y, S);
	c = cell(1, 1, 1, 'энерджайзер');
	kit.energizer(ctx, c.x, c.y, S, T);
	c = cell(2, 1, 1, 'берсерк (кулак)');
	pickup(ctx, kit, 'berserk', c.x, c.y, S);
	c = cell(3, 1, 1, 'Жало');
	pickup(ctx, kit, 'plasma', c.x, c.y, S);
	c = cell(4, 1, 1, 'Жерло');
	pickup(ctx, kit, 'bfg', c.x, c.y, S);
	c = cell(0, 2, 1, 'выстрелы Жала');
	for (let k = -1; k <= 1; k += 1) kit.bolt(ctx, c.x + k * S * 0.45, c.y, S * 0.8, 'RIGHT');
	c = cell(1, 2, 1, 'герой');
	hero(ctx, c.x, c.y, S, 'normal');
	c = cell(2, 2, 1, 'босс, длинная юбка');
	boss(ctx, c.x, c.y, S);
	c = cell(3, 2, 1, 'есть: аптечка', true);
	pickup(ctx, kit, 'medkit', c.x, c.y, S);
	c = cell(4, 2, 1, 'было: BFG', true);
	existing(ctx, 'bfg', c.x, c.y, S);
	c = cell(0, 3, 3, 'рывок берсерка: превращение и удар');
	hero(ctx, c.x - CELL * 1.05, c.y, S, 'berserk');
	// halfway: the fruit fades as the whirlwind spins up over it
	ctx.save();
	ctx.globalAlpha = 0.4;
	hero(ctx, c.x - CELL * 0.12, c.y, S, 'berserk');
	ctx.restore();
	kit.form(ctx, c.x - CELL * 0.12, c.y, S, 'RIGHT', 0.5, T);
	kit.form(ctx, c.x + CELL * 0.78, c.y, S, 'RIGHT', 1, T);
	kit.impact(ctx, c.x + CELL * 1.25, c.y, S);
	return cv;
}

const root = document.getElementById('kits') as HTMLElement;

/** The hot line round the walls at three widths (seam, glow blur, warm spread on the floor, px). */
const CORDS: ReadonlyArray<{ name: string; note: string; look: Partial<CordLook> }> = [
	{ name: 'Сейчас', note: 'шов 2.6 · свечение 3 · ореол 5', look: {} },
	{ name: 'А', note: 'шов 1.8 · свечение 2 · ореол 4', look: { seam: 1.8, glow: 2, spread: 4 } },
	{ name: 'Б', note: 'шов 1.2 · свечение 1.5 · ореол 3', look: { seam: 1.2, glow: 1.5, spread: 3 } }
];
{
	const section = document.createElement('section');
	section.className = 'kit';
	section.id = 'cord';
	section.innerHTML = '<header><span class="tag">Стены</span><h2>Неоновый контур</h2><p>Левая верхняя четверть карты ада в масштабе игры, ночью. Меняется только горячая линия у основания стен.</p></header>';
	const row = document.createElement('div');
	row.className = 'frames';
	for (const cord of CORDS) {
		const w = new DoomWorld(GRID_DOOM, DOOM_PICKUP_TILES, cord.look);
		w.resize(WORLD_W, WORLD_H, D);
		w.update(0.016);
		const off = document.createElement('canvas');
		off.width = Math.round(WORLD_W * D);
		off.height = Math.round(WORLD_H * D);
		const ctx = off.getContext('2d') as CanvasRenderingContext2D;
		ctx.setTransform(D, 0, 0, D, 0, 0);
		w.drawWorld(ctx);
		w.drawMood(ctx, [{ x: 6, y: 8, r: 6.5, tint: 0xffe2b0, a: 1 }]);
		const L: Lay = w.layout;
		const sx = L.offsetX + 0.6 * L.tileSize;
		const sy = L.offsetY + 0.6 * L.tileSize;
		const sw = 9 * L.tileSize;
		const sh = 8 * L.tileSize;
		const [cv, out] = canvas(sw, sh, `Неоновый контур: ${cord.name}`);
		out.drawImage(off, sx * D, sy * D, sw * D, sh * D, 0, 0, sw, sh);
		const fig = document.createElement('figure');
		fig.append(cv);
		fig.insertAdjacentHTML('beforeend', `<figcaption><b>${cord.name}</b> — ${cord.note}</figcaption>`);
		row.append(fig);
	}
	section.append(row);
	root.append(section);
}

KITS.forEach((kit) => {
	const section = document.createElement('section');
	section.className = 'kit';
	section.innerHTML = `<header><span class="tag">Выбранный набор</span><h2>${kit.name}</h2><p>${kit.idea}</p></header>`;
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
