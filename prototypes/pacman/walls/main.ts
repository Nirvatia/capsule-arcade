// Throwaway comparison page for the hell's plates (part II, step 1.0): the accepted charred iron
// plates with no wear, a little blood and rust, and a bit more, on the real maze (`grid_doom`)
// and the real flesh scene. Built from the game's own sources (a fork of `fleshBake` with a
// `wear` level). Deleted once the owner has chosen.
import { GRID_DOOM } from '../../../src/games/pacman/config/mazes';
import { FleshLive } from '../../../src/games/pacman/render/doom/fleshLive';
import { MX, MY, SCENE_TILE } from '../../../src/games/pacman/render/doom/fleshBake';
import { bakeFlesh, floorTiles } from './fleshBakeWear';

const LEVELS: ReadonlyArray<{ wear: 0 | 1 | 2; name: string }> = [
	{ wear: 0, name: 'Сейчас: чистые плиты' },
	{ wear: 1, name: 'Немного крови и ржавчины' },
	{ wear: 2, name: 'Чуть больше' }
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
const ZOOM = 2.4;

const floors = floorTiles(GRID_DOOM);
const state = { gray: false, actors: true, zoom: false };
const scenes = new Map<number, FleshLive>();

function scene(wear: 0 | 1 | 2): FleshLive {
	let s = scenes.get(wear);
	if (!s) {
		s = new FleshLive(bakeFlesh(GRID_DOOM, wear));
		scenes.set(wear, s);
	}
	return s;
}

function standIns(ctx: CanvasRenderingContext2D): void {
	const at = (c: number, r: number): [number, number] => [MX + c * T + T / 2, MY + r * T + T / 2];
	ctx.fillStyle = '#f3e3b0';
	for (const [c, r] of floors) {
		if ((c + r) % 2) continue;
		const [x, y] = at(c, r);
		ctx.beginPath();
		ctx.arc(x, y, 2.6, 0, 6.3);
		ctx.fill();
	}
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

function draw(canvas: HTMLCanvasElement, wear: 0 | 1 | 2): void {
	const dpr = Math.min(window.devicePixelRatio || 1, 2);
	canvas.width = W * dpr;
	canvas.height = H * dpr;
	const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.fillStyle = '#0a0204';
	ctx.fillRect(0, 0, W, H);
	const vw = state.zoom ? SW / ZOOM : SW;
	const vh = state.zoom ? SH / ZOOM : SH;
	const vx = state.zoom ? MX + 0.6 * T : MX - PAD;
	const vy = state.zoom ? MY + 7.2 * T : MY - PAD;
	const k = W / vw;
	ctx.save();
	ctx.scale(k, k);
	ctx.translate(-vx, -vy);
	scene(wear).draw(ctx, TIME, { x: vx, y: vy, w: vw, h: vh });
	if (state.actors) standIns(ctx);
	ctx.restore();
}

const grid = document.getElementById('grid') as HTMLElement;
const canvases = new Map<number, HTMLCanvasElement>();
for (const l of LEVELS) {
	const fig = document.createElement('figure');
	const cv = document.createElement('canvas');
	cv.setAttribute('aria-label', l.name);
	const cap = document.createElement('figcaption');
	cap.textContent = l.name;
	fig.append(cv, cap);
	grid.append(fig);
	canvases.set(l.wear, cv);
}

function render(): void {
	document.body.classList.toggle('gray', state.gray);
	for (const l of LEVELS) draw(canvases.get(l.wear) as HTMLCanvasElement, l.wear);
}

function wire(id: string, key: 'gray' | 'actors' | 'zoom'): void {
	const b = document.getElementById(id) as HTMLButtonElement;
	b.setAttribute('aria-pressed', String(state[key]));
	b.addEventListener('click', () => {
		state[key] = !state[key];
		b.setAttribute('aria-pressed', String(state[key]));
		render();
	});
}
wire('gray', 'gray');
wire('actors', 'actors');
wire('zoom', 'zoom');
render();
