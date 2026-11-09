// Prototype: three candidate food sets per season (see variants.ts) beside the current one.
// Each set is a real MeadowWorld with its own `live.pellet` / `live.energizer`, drawn on the
// first season maze, with a cherry and an orange in the corridor. Under each crop the pieces
// stand large on a dark strip. "Масштаб игры" shows the crops at the game's real size.
import { GRID_01 } from '../../../src/games/pacman/config/mazes';
import { MeadowWorld } from '../../../src/games/pacman/render/seasons/meadow/MeadowWorld';
import { meadowThemeFor } from '../../../src/games/pacman/render/seasons/meadow/meadowThemes';
import type { MeadowTheme } from '../../../src/games/pacman/render/seasons/meadow/MeadowTheme';
import { drawFruit } from '../../../src/games/pacman/render/items/fruit/FruitView';
import { FRUIT } from '../../../src/games/pacman/logic/bonuses/fruitCatalog';
import { glowTexture } from '../../../src/games/pacman/render/seasons/meadow/meadowSprites';
import { FOOD, type FoodSet, type Season } from './variants';

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const view = $<HTMLCanvasElement>('view');
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);

const NAMES: Record<Season, string> = {
	spring: 'ВЕСНА',
	summer: 'ЛЕТО',
	autumn: 'ОСЕНЬ',
	winter: 'ЗИМА'
};
/** The crop: columns 2..8, rows 1..3 of GRID_01 (an energizer, dots, two fruit tiles). */
const CROP = { c: 2, r: 1, w: 7, h: 3 };
const CHERRY = { x: 5, y: 2 };
const ORANGE = { x: 7, y: 2 };

interface Column {
	readonly label: string;
	readonly note: string;
	readonly set: FoodSet | null;
	world: MeadowWorld;
	canvas: HTMLCanvasElement;
	c: CanvasRenderingContext2D;
}

const params = new URLSearchParams(location.search);
let season = (params.get('season') as Season) || 'spring';
let night = params.get('night') === '1';
let heat = false;
let gameScale = false;
let columns: Column[] = [];
let vw = 0;
let vh = 0;
let S = 20;
let worldW = 0;
let worldH = 0;
let colW = 0;

function themeWith(base: MeadowTheme, set: FoodSet | null): MeadowTheme {
	if (!set) return base;
	return { ...base, live: { ...base.live, pellet: set.pellet, energizer: set.energizer } };
}

function build(): void {
	const base = meadowThemeFor(season) as MeadowTheme;
	const sets: Array<FoodSet | null> = [null, ...FOOD[season]];
	const gap = 12;
	colW = Math.floor((vw - gap * 5) / 4);
	// the world's viewport, sized so one tile makes the crop fill a column (or the game's size)
	const probe = new MeadowWorld(GRID_01, base);
	probe.resize(1000, 1080, 1);
	const S0 = probe.layout.tileSize;
	if (gameScale) {
		worldW = vw;
		worldH = vh;
	} else {
		const want = Math.min(46, colW / CROP.w);
		worldW = Math.round((1000 * want) / S0);
		worldH = Math.round((1080 * want) / S0);
	}
	columns = sets.map((set) => {
		const world = new MeadowWorld(GRID_01, themeWith(base, set));
		world.resize(worldW, worldH, 1);
		world.setMood(heat ? 1 : 0, night ? 1 : 0);
		for (let k = 0; k < 80; k++) world.update(0.1);
		const canvas = document.createElement('canvas');
		canvas.width = worldW;
		canvas.height = worldH;
		return {
			label: set ? set.name : 'Сейчас',
			note: set ? set.note : 'как в игре',
			set,
			world,
			canvas,
			c: canvas.getContext('2d') as CanvasRenderingContext2D
		};
	});
	S = columns[0].world.layout.tileSize;
	for (const b of document.querySelectorAll<HTMLButtonElement>('[data-season]')) {
		b.setAttribute('aria-pressed', String(b.dataset.season === season));
	}
}

function layout(): void {
	vw = window.innerWidth;
	vh = window.innerHeight;
	view.width = Math.round(vw * D);
	view.height = Math.round(vh * D);
	view.style.width = `${vw}px`;
	view.style.height = `${vh}px`;
	build();
}

for (const b of document.querySelectorAll<HTMLButtonElement>('[data-season]')) {
	b.addEventListener('click', () => {
		season = b.dataset.season as Season;
		build();
	});
}
const toggle = (id: string, flip: () => void): void => {
	$(id).addEventListener('click', () => {
		flip();
		$(id).setAttribute('aria-pressed', String(id === 'night' ? night : id === 'heat' ? heat : gameScale));
		build();
	});
};
toggle('night', () => (night = !night));
toggle('heat', () => (heat = !heat));
toggle('game', () => (gameScale = !gameScale));
$('night').setAttribute('aria-pressed', String(night));

let time = 0;
let last = performance.now();
function frame(now: number): void {
	const dt = Math.min(0.1, (now - last) / 1000);
	last = now;
	time += dt;
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.fillStyle = '#12141a';
	ctx.fillRect(0, 0, vw, vh);
	ctx.fillStyle = '#e8eef6';
	ctx.font = '700 16px "Trebuchet MS", system-ui, sans-serif';
	ctx.textAlign = 'left';
	ctx.fillText(`${NAMES[season]} · еда`, 12, 26);

	const gap = 12;
	columns.forEach((col, i) => {
		const w = col.world;
		const L = w.layout;
		const c = col.c;
		c.setTransform(1, 0, 0, 1, 0, 0);
		w.update(dt);
		w.drawWorld(c);
		w.drawMood(c);
		w.drawFood(c, (x, y) => (x === CHERRY.x || x === ORANGE.x) && y === 2);
		drawFruit(c, FRUIT.CHERRY, L.offsetX + (CHERRY.x + 0.5) * S, L.offsetY + (CHERRY.y + 0.5) * S, S, time);
		drawFruit(c, FRUIT.ORANGE, L.offsetX + (ORANGE.x + 0.5) * S, L.offsetY + (ORANGE.y + 0.5) * S, S, time);
		w.drawOverlay(c);

		const x0 = gap + i * (colW + gap);
		const y0 = 72;
		const sw = CROP.w * S;
		const sh = CROP.h * S;
		const dw = gameScale ? sw : colW;
		const dh = gameScale ? sh : (colW * sh) / sw;
		ctx.fillStyle = i === 0 ? '#e0a838' : '#6fd0ff';
		ctx.font = '700 14px "Trebuchet MS", system-ui, sans-serif';
		ctx.fillText(col.label, x0, y0 - 8);
		ctx.drawImage(
			col.canvas,
			L.offsetX + CROP.c * S,
			L.offsetY + CROP.r * S,
			sw,
			sh,
			x0 + (colW - dw) / 2,
			y0,
			dw,
			dh
		);
		ctx.strokeStyle = 'rgba(255,255,255,.5)';
		ctx.lineWidth = 1;
		ctx.strokeRect(x0 + (colW - dw) / 2, y0, dw, dh);

		// the pieces large, on a dark strip: pellet, energizer, cherry, orange
		const cell = colW / 4;
		const sy = y0 + dh + 12;
		ctx.fillStyle = '#06080e';
		ctx.fillRect(x0, sy, colW, cell + 34);
		const live = col.world.theme.live;
		const k = cell / 34;
		const cy = sy + cell / 2 + 2;
		const pel = live.pellet.texture();
		const ps = live.pellet.size * k * 2.2;
		ctx.drawImage(pel, x0 + cell * 0.5 - ps / 2, cy - ps / 2, ps, ps);
		const en = live.energizer;
		const pulse = 1 + 0.05 * Math.sin(time * 2.6);
		const rot = en.motion === 'spin' ? time * 0.4 : Math.sin(time * 2) * 0.12;
		const ex = x0 + cell * 1.5;
		const gs = en.glowSize * k * pulse;
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.globalAlpha = 0.7;
		ctx.drawImage(glowTexture(en.glow), ex - gs / 2, cy - gs / 2, gs, gs);
		ctx.restore();
		ctx.save();
		ctx.translate(ex, cy);
		ctx.rotate(rot);
		const es = en.size * k * pulse;
		ctx.drawImage(en.texture(), -es / 2, -es / 2, es, es);
		ctx.restore();
		drawFruit(ctx, FRUIT.CHERRY, x0 + cell * 2.5, cy, cell * 0.78, time);
		drawFruit(ctx, FRUIT.ORANGE, x0 + cell * 3.5, cy, cell * 0.78, time);
		ctx.fillStyle = 'rgba(200,212,224,.8)';
		ctx.font = '11px "Trebuchet MS", system-ui, sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText(col.note, x0 + colW / 2, sy + cell + 24);
		ctx.textAlign = 'left';
	});
	requestAnimationFrame(frame);
}

window.addEventListener('resize', layout);
layout();
requestAnimationFrame(frame);
