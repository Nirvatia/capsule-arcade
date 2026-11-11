// Throwaway comparison page for the hell's maze walls (part II, step 1.0): four wall looks on the
// real maze (`grid_doom`) and the real flesh scene, the walls and the floor are the only things
// that change. Built from the game's own sources (a fork of `fleshBake` with a wall variant).
import { GRID_DOOM } from '../../../src/games/pacman/config/mazes';
import { FleshLive } from '../../../src/games/pacman/render/doom/fleshLive';
import { MX, MY, SCENE_TILE } from '../../../src/games/pacman/render/doom/fleshBake';
import { bakeFlesh, floorTiles } from './fleshBakeVariants';
import type { Variant } from './fleshBakeVariants';

const VARIANTS: ReadonlyArray<{ id: Variant; name: string }> = [
	{ id: 'now', name: 'Сейчас: шнур' },
	{ id: 'plates', name: 'A · Обожжённые плиты' },
	{ id: 'obsidian', name: 'B · Чёрное стекло' },
	{ id: 'blocks', name: 'C · Сшитые блоки' }
];
const T = SCENE_TILE;
const rows = GRID_DOOM.length;
const cols = GRID_DOOM[0].length;
const PAD = 70;
const SW = cols * T + 2 * PAD;
const SH = rows * T + 2 * PAD;
const W = 560;
const H = Math.round((W * SH) / SW);
const TIME = 1.5;

const floors = floorTiles(GRID_DOOM);
const state = { calm: false, gray: false, actors: true };
const scenes = new Map<string, FleshLive>();

function scene(v: Variant, calm: boolean): FleshLive {
	const key = `${v}${calm ? '-calm' : ''}`;
	let s = scenes.get(key);
	if (!s) {
		s = new FleshLive(bakeFlesh(GRID_DOOM, v, calm));
		scenes.set(key, s);
	}
	return s;
}

function standIns(ctx: CanvasRenderingContext2D): void {
	const at = (c: number, r: number): [number, number] => [MX + c * T + T / 2, MY + r * T + T / 2];
	// dots on every corridor tile (the hell has none; they show how small things read on the floor)
	ctx.fillStyle = '#f3e3b0';
	for (const [c, r] of floors) {
		if ((c + r) % 2) continue;
		const [x, y] = at(c, r);
		ctx.beginPath();
		ctx.arc(x, y, 2.6, 0, 6.3);
		ctx.fill();
	}
	// the hero: a gold disc with a mouth
	{
		const [x, y] = at(12, 20);
		ctx.fillStyle = '#ffd23a';
		ctx.strokeStyle = '#2a1204';
		ctx.lineWidth = 2.2;
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.arc(x, y, 12, 0.5, 6.28 - 0.5);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
	}
	// the boss: a red ghost the size of a tile, as red as the game paints him
	{
		const [x, y] = at(12, 8);
		ctx.fillStyle = '#d8281c';
		ctx.strokeStyle = '#2a0606';
		ctx.lineWidth = 2.2;
		ctx.beginPath();
		ctx.arc(x, y - 1, 12, Math.PI, 0);
		ctx.lineTo(x + 12, y + 12);
		for (let i = 0; i < 3; i += 1) {
			ctx.lineTo(x + 12 - (i + 0.5) * 8, y + 8);
			ctx.lineTo(x + 12 - (i + 1) * 8, y + 12);
		}
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = '#ffe14a';
		ctx.fillRect(x - 7, y - 4, 4, 5);
		ctx.fillRect(x + 3, y - 4, 4, 5);
	}
}

function draw(canvas: HTMLCanvasElement, v: Variant): void {
	const dpr = Math.min(window.devicePixelRatio || 1, 2);
	canvas.width = W * dpr;
	canvas.height = H * dpr;
	const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.fillStyle = '#0a0204';
	ctx.fillRect(0, 0, W, H);
	const k = W / SW;
	const vx = MX - PAD;
	const vy = MY - PAD;
	ctx.save();
	ctx.scale(k, k);
	ctx.translate(-vx, -vy);
	scene(v, state.calm).draw(ctx, TIME, { x: vx, y: vy, w: SW, h: SH });
	if (state.actors) standIns(ctx);
	ctx.restore();
}

const grid = document.getElementById('grid') as HTMLElement;
const canvases = new Map<Variant, HTMLCanvasElement>();
for (const v of VARIANTS) {
	const fig = document.createElement('figure');
	const cv = document.createElement('canvas');
	cv.setAttribute('aria-label', v.name);
	const cap = document.createElement('figcaption');
	cap.textContent = v.name;
	fig.append(cv, cap);
	grid.append(fig);
	canvases.set(v.id, cv);
}

function render(): void {
	document.body.classList.toggle('gray', state.gray);
	for (const v of VARIANTS) draw(canvases.get(v.id) as HTMLCanvasElement, v.id);
}

function wire(id: string, key: 'calm' | 'gray' | 'actors'): void {
	const b = document.getElementById(id) as HTMLButtonElement;
	b.setAttribute('aria-pressed', String(state[key]));
	b.addEventListener('click', () => {
		state[key] = !state[key];
		b.setAttribute('aria-pressed', String(state[key]));
		b.disabled = true;
		// the bake of a new set takes a moment: let the button show first
		requestAnimationFrame(() =>
			requestAnimationFrame(() => {
				render();
				b.disabled = false;
			})
		);
	});
}
wire('calm', 'calm');
wire('gray', 'gray');
wire('actors', 'actors');
render();
