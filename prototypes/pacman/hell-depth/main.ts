// Prototype: the hell's walls sitting in the floor (depth.ts), shown in the game's own world
// (`DoomWorld`: camera, ground, mood, night) on the real `grid_doom` with the hero and the boss.
// Buttons: the current look / the candidate, day / night, a loupe on the hero's corridor.
import { GRID_DOOM } from '../../../src/games/pacman/config/mazes';
import { DoomWorld } from '../../../src/games/pacman/render/doom/DoomWorld';
import type { DoomLight } from '../../../src/games/pacman/render/doom/DoomWorld';
import { bakeFlesh } from '../../../src/games/pacman/render/doom/fleshBake';
import { FleshLive } from '../../../src/games/pacman/render/doom/fleshLive';
import { HellBlinkyView } from '../../../src/games/pacman/render/doom/HellBlinkyView';
import { PacmanHero } from '../../../src/games/pacman/render/actors/hero/PacmanHero';
import { chargePainter } from '../../../src/games/pacman/render/actors/hero/heroCharge';
import { depthBake } from './depth';

const D = Math.min(window.devicePixelRatio || 1, 2);
const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const loupe = document.getElementById('loupe') as HTMLCanvasElement;
const lctx = loupe.getContext('2d') as CanvasRenderingContext2D;

const now = new DoomWorld(GRID_DOOM, []);
const sit = new DoomWorld(GRID_DOOM, []);
// the candidate's world draws the same scene with the pass over its maze layer
(sit as unknown as { scene: FleshLive }).scene = new FleshLive(depthBake(bakeFlesh(GRID_DOOM), GRID_DOOM));
const hero = new PacmanHero();
hero.setOver(chargePainter);
const boss = new HellBlinkyView();

let candidate = true;
let night = false;
let magnify = false;
let w = 0;
let h = 0;

function layout(): void {
	w = view.clientWidth;
	h = view.clientHeight;
	view.width = Math.round(w * D);
	view.height = Math.round(h * D);
	now.resize(w, h, D);
	sit.resize(w, h, D);
}
window.addEventListener('resize', layout);
layout();

const bar = document.getElementById('bar') as HTMLElement;
const buttons: Array<{ el: HTMLButtonElement; on: () => boolean }> = [];
function add(label: string, on: () => boolean, click: () => void): void {
	const el = document.createElement('button');
	el.type = 'button';
	el.textContent = label;
	el.addEventListener('click', () => {
		click();
		refresh();
	});
	bar.append(el);
	buttons.push({ el, on });
}
add('Сейчас', () => !candidate, () => (candidate = false));
add('Посадка', () => candidate, () => (candidate = true));
add('День', () => !night, () => (night = false));
add('Ночь', () => night, () => (night = true));
add('Крупно', () => magnify, () => (magnify = !magnify));
function refresh(): void {
	for (const b of buttons) {
		b.el.setAttribute('aria-pressed', String(b.on()));
	}
	for (const g of [now, sit]) {
		g.setMood(false, night);
	}
	loupe.style.display = magnify ? 'block' : 'none';
}
refresh();

const HERO = { x: 6.5, y: 8.5 };

function frame(time: number, dt: number): void {
	const world = candidate ? sit : now;
	world.update(dt);
	ctx.setTransform(D, 0, 0, D, 0, 0);
	world.drawWorld(ctx);
	const L = world.layout;
	const S = L.tileSize;
	boss.draw(
		ctx,
		{
			x: 12.5,
			y: 18.5,
			phase: 3,
			state: 'CHASE',
			shape: 'normal',
			dir: 'LEFT',
			progress: 0,
			alpha: 1,
			intro: 1,
			look: Math.PI,
			hit: 0,
			echo: false
		},
		L,
		time
	);
	const lights: DoomLight[] = [
		{ x: HERO.x, y: HERO.y, r: 6.5, tint: 0xffe2b0, a: 1 },
		{ x: 12.5, y: 18.5, r: 3.2, tint: 0xff3a2a, a: 0.85 }
	];
	world.drawMood(ctx, lights);
	hero.setRadius(S * 0.39);
	hero.update(dt, {
		x: L.offsetX + HERO.x * S,
		y: L.offsetY + HERO.y * S,
		angle: 0,
		moving: false,
		power: false,
		ending: false,
		season: 'hell'
	});
	hero.draw(ctx);
	world.drawOverlay(ctx);
	if (magnify) {
		// the loupe: a few tiles round the hero, three times larger
		const cx = (L.offsetX + (HERO.x + 1.5) * S) * D;
		const cy = (L.offsetY + (HERO.y - 0.5) * S) * D;
		const half = (loupe.width / 2 / 3) ;
		lctx.imageSmoothingEnabled = true;
		lctx.drawImage(view, cx - half, cy - half, half * 2, half * 2, 0, 0, loupe.width, loupe.height);
	}
}

let last = performance.now();
const loop = (t: number): void => {
	frame(t / 1000, Math.min(0.1, Math.max(0, (t - last) / 1000)));
	last = t;
	requestAnimationFrame(loop);
};
requestAnimationFrame(loop);
