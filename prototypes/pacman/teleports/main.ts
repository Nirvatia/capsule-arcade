// Throwaway comparison page for the hell's teleports (part II, step 1): the current rift against
// three different teleports (an iron gateway, a sigil with a column of light, two pylons with
// lightning), animated over the real maze at game scale. Deleted once the owner has chosen.
import { GRID_DOOM } from '../../../src/games/pacman/config/mazes';
import { isTeleportToken } from '../../../src/games/pacman/config/gridConfig';
import { DoomWorld } from '../../../src/games/pacman/render/doom/DoomWorld';
import { FleshLive } from '../../../src/games/pacman/render/doom/fleshLive';
import {
	bakeFlesh as bakeNow,
	MX,
	MY,
	SCENE_TILE
} from '../../../src/games/pacman/render/doom/fleshBake';
import { bakeFlesh as bakePlain } from './fleshBakePlain';
import { DESIGNS } from './designs';
import type { Design } from './designs';

type Choice = 'now' | Design;
const CHOICES: ReadonlyArray<{ id: Choice; name: string }> = [
	{ id: 'now', name: 'Сейчас: разрыв плоти' },
	{ id: 'gate', name: '1 · Железные врата' },
	{ id: 'sigil', name: '2 · Печать и столб света' },
	{ id: 'tesla', name: '3 · Тесла-ворота' }
];
const W = 1280;
const H = 720;
const D = 2;
const cols = GRID_DOOM[0].length;

const pads: Array<{ c: number; r: number }> = [];
GRID_DOOM.forEach((row, r) =>
	row.forEach((tok, c) => {
		if (isTeleportToken(tok)) pads.push({ c, r });
	})
);

const world = new DoomWorld(GRID_DOOM, []);
world.resize(W, H, D);
const layout = world.layout;
const s = layout.tileSize;

function renderBase(scene: FleshLive): HTMLCanvasElement {
	const cv = document.createElement('canvas');
	cv.width = W * D;
	cv.height = H * D;
	const ctx = cv.getContext('2d') as CanvasRenderingContext2D;
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.fillStyle = '#0a0204';
	ctx.fillRect(0, 0, W, H);
	const k = s / SCENE_TILE;
	ctx.translate(layout.offsetX, layout.offsetY);
	ctx.scale(k, k);
	ctx.translate(-MX, -MY);
	scene.draw(ctx, 1.5, {
		x: -layout.offsetX / k + MX,
		y: -layout.offsetY / k + MY,
		w: W / k,
		h: H / k
	});
	return cv;
}
const baseNow = renderBase(new FleshLive(bakeNow(GRID_DOOM)));
const basePlain = renderBase(new FleshLive(bakePlain(GRID_DOOM)));

const pos = (p: { c: number; r: number }) => ({
	x: layout.offsetX + (p.c + 0.5) * s,
	y: layout.offsetY + (p.r + 0.5) * s,
	dir: p.c < cols / 2 ? 1 : -1
});

function standIns(ctx: CanvasRenderingContext2D, p: { c: number; r: number }): void {
	const q = pos(p);
	ctx.fillStyle = '#f3e3b0';
	for (let i = 2; i <= 6; i += 2) {
		ctx.beginPath();
		ctx.arc(q.x + q.dir * i * s, q.y, s * 0.1, 0, 6.3);
		ctx.fill();
	}
	const hx = q.x + q.dir * 4 * s + q.dir * s;
	ctx.fillStyle = '#ffd23a';
	ctx.strokeStyle = '#2a1204';
	ctx.lineWidth = s * 0.09;
	ctx.beginPath();
	ctx.moveTo(hx, q.y);
	ctx.arc(hx, q.y, s * 0.42, q.dir > 0 ? Math.PI + 0.5 : 0.5, q.dir > 0 ? Math.PI * 3 - 0.5 : Math.PI * 2 - 0.5);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
}

function paint(
	canvas: HTMLCanvasElement,
	choice: Choice,
	t: number,
	crop: { x: number; y: number; w: number; h: number } | null,
	actors: boolean
): void {
	const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
	const view = crop ?? { x: 0, y: 0, w: W, h: H };
	const k = canvas.width / (view.w * D);
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.setTransform(k * D, 0, 0, k * D, -view.x * k * D, -view.y * k * D);
	ctx.drawImage(choice === 'now' ? baseNow : basePlain, 0, 0, W, H);
	if (choice !== 'now') {
		for (const p of pads) {
			const q = pos(p);
			ctx.save();
			ctx.translate(q.x, q.y);
			ctx.scale(q.dir, 1);
			DESIGNS[choice](ctx, s, t);
			ctx.restore();
		}
	}
	if (actors) for (const p of pads) standIns(ctx, p);
}

const state = { gray: false, choice: 'gate' as Choice, actors: true };
const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const overview = $<HTMLCanvasElement>('overview');
overview.width = W * D;
overview.height = H * D;
const panels = $('panels');
const left = pos(pads.find((p) => p.c < cols / 2) ?? pads[0]);
const CROP_W = 7.5 * s;
const CROP_H = 5 * s;
const crop = { x: left.x - 1.6 * s, y: left.y - CROP_H / 2, w: CROP_W, h: CROP_H };
const panelCanvases = new Map<Choice, HTMLCanvasElement>();
for (const c of CHOICES) {
	const fig = document.createElement('figure');
	const cv = document.createElement('canvas');
	cv.width = 560;
	cv.height = Math.round((560 * CROP_H) / CROP_W);
	const cap = document.createElement('figcaption');
	cap.textContent = c.name;
	fig.append(cv, cap);
	panels.append(fig);
	panelCanvases.set(c.id, cv);
}

function sync(): void {
	document.body.classList.toggle('gray', state.gray);
	for (const b of document.querySelectorAll<HTMLButtonElement>('[data-choice]')) {
		b.setAttribute('aria-pressed', String(b.dataset.choice === state.choice));
	}
	$('gray').setAttribute('aria-pressed', String(state.gray));
	$('actors').setAttribute('aria-pressed', String(state.actors));
}
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-choice]')) {
	b.addEventListener('click', () => {
		state.choice = b.dataset.choice as Choice;
		sync();
	});
}
$('gray').addEventListener('click', () => {
	state.gray = !state.gray;
	sync();
});
$('actors').addEventListener('click', () => {
	state.actors = !state.actors;
	sync();
});
sync();

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function frame(now: number): void {
	const t = reduce ? 1.2 : now / 1000;
	paint(overview, state.choice, t, null, state.actors);
	for (const c of CHOICES) {
		paint(panelCanvases.get(c.id) as HTMLCanvasElement, c.id, t, crop, state.actors);
	}
	requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
