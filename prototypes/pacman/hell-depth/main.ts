// Prototype: depth for the flesh hell's walls. The game's own bake on `grid_doom`; each candidate
// swaps in a maze layer with a pass over it (`depth.ts`). Buttons only: candidate, day / night,
// whole maze / a corner at x4 with the current look beside it.
import { GRID_DOOM } from '../../../src/games/pacman/config/mazes';
import { bakeFlesh, MX, MY, SCENE_TILE } from '../../../src/games/pacman/render/doom/fleshBake';
import { FleshLive } from '../../../src/games/pacman/render/doom/fleshLive';
import { context, makeCanvas } from '../../../src/games/pacman/render/doom/fleshNoise';
import { depthBake } from './depth';
import type { DepthId } from './depth';

const NAMES: Record<DepthId, string> = {
	now: 'Сейчас',
	a: 'А · Посадка',
	b: 'Б · Борт',
	c: 'В · Плоть на швах'
};
const NOTES: Record<DepthId, string> = {
	now: 'Как в игре: плоские плиты, слабая тень у подножия.',
	a: 'Свет с северо-запада. Раскалённый шов лежит на полу у подножия только с освещённой стороны, с другой падает длинная тень и тёмный шов у основания.',
	b: 'То же освещение, плюс южная грань плиты с заклёпками внутри тайла: у стены есть высота, коридор не уже.',
	c: 'То же освещение, плюс плоть, наросшая на края плит: бугры и короткие жилы сшивают железо с полом.'
};

const bake = bakeFlesh(GRID_DOOM);
const lives = new Map<DepthId, FleshLive>();
function live(id: DepthId): FleshLive {
	let l = lives.get(id);
	if (!l) {
		l = new FleshLive(depthBake(bake, GRID_DOOM, id));
		lives.set(id, l);
	}
	return l;
}

const T = SCENE_TILE;
const cols = GRID_DOOM[0].length;
const rows = GRID_DOOM.length;
const W = 1200;
let cand: DepthId = 'a';
let night = false;
let zoom = false;

const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = context(view);
const BEAT = 0.3;

/** One frame of `id` into `ctx`, the scene rect `r` fitted to `w` x `h`. */
function paint(
	g: CanvasRenderingContext2D,
	id: DepthId,
	r: { x: number; y: number; w: number; h: number },
	w: number,
	h: number
): void {
	const s = w / r.w;
	g.save();
	g.fillStyle = '#000';
	g.fillRect(0, 0, w, h);
	g.beginPath();
	g.rect(0, 0, w, h);
	g.clip();
	g.scale(s, s);
	g.translate(-r.x, -r.y);
	const l = live(id);
	l.draw(g, BEAT, r);
	if (night) {
		// the night: a dark veil with pools of light (a hero's torch, the lair), then what glows by itself
		const veil = makeCanvas(w, h);
		const v = context(veil);
		v.fillStyle = 'rgba(6,2,5,.82)';
		v.fillRect(0, 0, w, h);
		v.globalCompositeOperation = 'destination-out';
		v.scale(s, s);
		v.translate(-r.x, -r.y);
		const lights: Array<[number, number, number]> = [
			[MX + 6.5 * T, MY + 8.5 * T, T * 6],
			[MX + 18.5 * T, MY + 8.5 * T, T * 4.5],
			[bake.lair.x, bake.lair.y, T * 3.5]
		];
		for (const [lx, ly, lr] of lights) {
			const rg = v.createRadialGradient(lx, ly, 0, lx, ly, lr);
			rg.addColorStop(0, 'rgba(0,0,0,.95)');
			rg.addColorStop(1, 'rgba(0,0,0,0)');
			v.fillStyle = rg;
			v.fillRect(lx - lr, ly - lr, lr * 2, lr * 2);
		}
		g.save();
		g.setTransform(1, 0, 0, 1, 0, 0);
		g.drawImage(veil, 0, 0);
		g.restore();
		l.drawCord(g, BEAT, 1);
	}
	g.restore();
}

function render(): void {
	const pad = 40;
	const whole = { x: MX - pad, y: MY - pad, w: cols * T + 2 * pad, h: rows * T + 2 * pad };
	if (!zoom) {
		view.width = W;
		view.height = Math.round((W * whole.h) / whole.w);
		paint(ctx, cand, whole, view.width, view.height);
		return;
	}
	// a corner x4 (the top-left of the maze and its first junctions), the current look beside the candidate
	const rect = { x: MX + 1.2 * T, y: MY + 2.4 * T, w: 130, h: 130 };
	view.width = 1200;
	view.height = 600;
	for (const [i, id] of (['now', cand] as DepthId[]).entries()) {
		const tmp = makeCanvas(600, 600);
		paint(context(tmp), id, rect, 600, 600);
		ctx.drawImage(tmp, i * 600, 0);
	}
	ctx.fillStyle = 'rgba(13,7,9,.8)';
	ctx.fillRect(8, 8, 90, 26);
	ctx.fillRect(608, 8, 150, 26);
	ctx.fillStyle = '#efe0d8';
	ctx.font = '700 15px "Arial Narrow",sans-serif';
	ctx.fillText(NAMES.now, 16, 26);
	ctx.fillText(NAMES[cand], 616, 26);
}

const bar = document.getElementById('bar') as HTMLElement;
const note = document.getElementById('note') as HTMLElement;
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
function gap(): void {
	const d = document.createElement('span');
	d.className = 'gap';
	bar.append(d);
}
for (const id of ['now', 'a', 'b', 'c'] as DepthId[]) {
	add(NAMES[id], () => cand === id, () => (cand = id));
}
gap();
add('День', () => !night, () => (night = false));
add('Ночь', () => night, () => (night = true));
gap();
add('Весь лабиринт', () => !zoom, () => (zoom = false));
add('Деталь ×4.6 (рядом со «Сейчас»)', () => zoom, () => (zoom = true));

function refresh(): void {
	for (const b of buttons) {
		b.el.setAttribute('aria-pressed', String(b.on()));
	}
	note.textContent = NOTES[cand];
	render();
}
refresh();
