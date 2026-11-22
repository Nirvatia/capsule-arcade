// Prototype: the hell boss's dash as a transformation (`forms.ts`), on the real hell world, beside
// the game's current dash (`сейчас`). First screen: the contact sheet, rows the variants, columns
// the moments of one round. "Живое" plays the round on the whole board with a x3 magnifier.
// Every switch is a button; the same choices work as a query for scripted screenshots:
// ?mode=sheet|live &v=now|A1|A2|B1|B2 &p=1|2|3 &lane=h|v &len=long|short &zoom=1|2 &speed=1|0.25
// &t=<s> (freeze the live round at that time).
import { GRID_DOOM } from '../../../src/games/pacman/config/mazes';
import { DoomWorld } from '../../../src/games/pacman/render/doom/DoomWorld';
import { Bar } from '../common/ui';
import { VARIANTS, drawScene } from './forms';
import type { Variant } from './forms';
import type { Lane, Round } from './script';
import { beat, moments, timing } from './script';

const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);
const q = new URLSearchParams(location.search);
const FROZEN = q.has('t') ? Number(q.get('t')) : null;

const bar = new Bar(
	[
		{ key: 'mode', label: 'вид', options: [{ id: 'sheet', label: 'сетка: все варианты × моменты' }, { id: 'tail', label: 'конец следа' }, { id: 'live', label: 'живое' }] },
		{ key: 'v', label: 'вариант (живое)', options: VARIANTS.map((v) => ({ id: v.id, label: v.name })) },
		{ key: 'p', label: 'фаза', options: [{ id: '1', label: '1 кость' }, { id: '2', label: '2 шлем' }, { id: '3', label: '3 шлем+рога' }] },
		{ key: 'len', label: 'рывок', options: [{ id: 'long', label: '10 тайлов' }, { id: 'short', label: '3 тайла' }] },
		{ key: 'lane', label: 'курс', options: [{ id: 'h', label: '→' }, { id: 'v', label: '↓' }] },
		{ key: 'zoom', label: 'масштаб сетки', options: [{ id: '1', label: '1:1 игра' }, { id: '2', label: '×2' }, { id: '4', label: '×4' }] },
		{ key: 'speed', label: 'скорость', options: [{ id: '1', label: '1×' }, { id: '0.25', label: '¼×' }] }
	],
	{ mode: 'sheet', v: 'A1', p: '1', len: 'long', lane: 'h', zoom: '1', speed: '1' },
	() => {
		dirty = true;
	}
);

// the world, baked once into a canvas at 2x (the sheet crops and scales it)
const WV = { w: 1200, h: 1000 };
const world = new DoomWorld(GRID_DOOM, [
	{ x: 3, y: 8 },
	{ x: 18, y: 8 },
	{ x: 20, y: 8 }
]);
world.resize(WV.w, WV.h, 2);
for (let i = 0; i < 40; i += 1) world.update(0.1);
world.setMood(false, false);
const worldCanvas = document.createElement('canvas');
worldCanvas.width = WV.w * 2;
worldCanvas.height = WV.h * 2;
{
	const g = worldCanvas.getContext('2d') as CanvasRenderingContext2D;
	g.setTransform(2, 0, 0, 2, 0, 0);
	world.drawWorld(g);
	world.drawMood(g, []);
}
const L = world.layout;
const S = L.tileSize;

function round(): Round {
	const tiles = bar.get('len') === 'short' ? 3 : 10;
	// row 8 (the corridor over the lair) runs from column 2 to 22; column 5 from row 2 to 27
	const lane: Lane = bar.get('lane') === 'v' ? { x0: 5.5, y0: 9.5, dx: 0, dy: 1, tiles } : { x0: 5.5, y0: 8.5, dx: 1, dy: 0, tiles };
	return { phase: Number(bar.get('p')), lane };
}

let vw = 0;
let vh = 0;
let dirty = true;

function label(text: string, x: number, y: number, size = 12, align: CanvasTextAlign = 'left'): void {
	ctx.font = `600 ${size}px system-ui, sans-serif`;
	ctx.textAlign = align;
	ctx.fillStyle = 'rgba(0,0,0,.6)';
	ctx.fillText(text, x + 1, y + 1);
	ctx.fillStyle = 'rgba(255,240,230,.92)';
	ctx.fillText(text, x, y);
}

/** One crop of the world with the boss at `t`, `z` css px per world px. */
function cell(x: number, y: number, w: number, h: number, r: Round, v: Variant, t: number, z: number, key: string, onTail = false): void {
	const b = beat(r, t);
	const L0 = r.lane;
	// the boss sits ahead in the crop so the trail behind it shows; or the crop holds the dash's
	// start, where the trail's old end is
	const bx = L.offsetX + (onTail ? L0.x0 + L0.dx * 1.2 : b.x) * S;
	const by = L.offsetY + (onTail ? L0.y0 + L0.dy * 1.2 : b.y) * S;
	const cx = bx - (onTail ? 0 : L0.dx * (w / z) * 0.22);
	const cy = by - (onTail ? 0 : L0.dy * (h / z) * 0.22);
	ctx.save();
	ctx.beginPath();
	ctx.rect(x, y, w, h);
	ctx.clip();
	ctx.translate(x + w / 2, y + h / 2);
	ctx.scale(z, z);
	ctx.translate(-cx, -cy);
	ctx.drawImage(worldCanvas, 0, 0, WV.w, WV.h);
	drawScene(ctx, { layout: L, round: r, variant: v, phase: r.phase }, t, key);
	ctx.restore();
	ctx.strokeStyle = 'rgba(255,255,255,.18)';
	ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function sheet(tail: boolean): void {
	const r = round();
	const T0 = timing(r);
	const ms = tail
		? [0.25, 0.5, 0.8].map((k) => ({ name: `рывок ${Math.round(k * 100)}%`, t: T0.t1 + (T0.t2 - T0.t1) * k })).concat([0, 0.5, 1.0, 1.5, 2.0, 2.5].map((d) => ({ name: `стоп +${d.toFixed(1)} с`, t: T0.t2 + d })))
		: moments(r);
	const top = bar.height + 22;
	const left = 128;
	const rows = VARIANTS.length;
	const cw = (vw - left - 8) / ms.length;
	const ch = (vh - top - 8) / rows;
	const z = (Number(bar.get('zoom')) * (bar.get('lane') === 'v' ? 1 : 1)) as number;
	ctx.fillStyle = '#0c0a0c';
	ctx.fillRect(0, 0, vw, vh);
	ms.forEach((m, i) => label(`${m.name} (${m.t.toFixed(2)} с)`, left + i * cw + cw / 2, top - 6, 12, 'center'));
	VARIANTS.forEach((v, j) => {
		label(v.name, 8, top + j * ch + ch / 2, 13);
		ms.forEach((m, i) => cell(left + i * cw + 2, top + j * ch + 2, cw - 4, ch - 4, r, v.id, m.t, z, `${j}-${i}`, tail));
	});
	const T = timing(r);
	bar.setNote(
		`фаза ${r.phase}: замах ${T.tel.toFixed(2)} с, рывок ${r.lane.tiles} тайлов за ${(T.t2 - T.t1).toFixed(2)} с (${T.speed.toFixed(1)} т/с), восстановление ${T.rec.toFixed(2)} с\n` +
			'превращение: последние 0.25 с замаха; возврат: первые 0.28 с остановки'
	);
}

let simT = 0;
let last = -1;
function live(now: number): void {
	const r = round();
	const v = bar.get('v') as Variant;
	const dt = last < 0 ? 0 : Math.min(0.05, (now - last) / 1000);
	last = now;
	simT += dt * Number(bar.get('speed'));
	const t = FROZEN ?? simT;
	const top = bar.height;
	ctx.fillStyle = '#0c0a0c';
	ctx.fillRect(0, 0, vw, vh);
	// the board, fit under the bar
	const z = Math.min(vw / WV.w, (vh - top) / WV.h);
	ctx.save();
	ctx.translate((vw - WV.w * z) / 2, top);
	ctx.scale(z, z);
	ctx.drawImage(worldCanvas, 0, 0, WV.w, WV.h);
	drawScene(ctx, { layout: L, round: r, variant: v, phase: r.phase }, t, 'live');
	ctx.restore();
	// the magnifier
	const mw = Math.min(vw * 0.42, 560);
	const mh = mw * 0.55;
	cell(vw - mw - 10, top + 10, mw, mh, r, v, t, 3, 'mag');
	label('×3', vw - mw, top + 28, 13);
	const b = beat(r, t);
	const T = timing(r);
	label(`${VARIANTS.find((x) => x.id === v)?.name}   t=${(((t % T.cycle) + T.cycle) % T.cycle).toFixed(2)} с   ${b.state}`, 12, top + 20, 13);
	bar.setNote('');
}

function frame(now: number): void {
	if (vw !== window.innerWidth || vh !== window.innerHeight) {
		vw = window.innerWidth;
		vh = window.innerHeight;
		view.width = Math.round(vw * D);
		view.height = Math.round(vh * D);
		view.style.width = `${vw}px`;
		view.style.height = `${vh}px`;
		dirty = true;
	}
	ctx.setTransform(D, 0, 0, D, 0, 0);
	if (bar.get('mode') === 'live') live(now);
	else if (dirty) {
		sheet(bar.get('mode') === 'tail');
		dirty = false;
	}
	requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// for scripts: measure how far the effects reach across and ahead of the dash line (see README)
(window as unknown as Record<string, unknown>).__measure = (v: Variant, phase: number, len: 'long' | 'short', layer: 'trail' | 'form' = 'trail') => {
	const tiles = len === 'short' ? 3 : 10;
	const r: Round = { phase, lane: { x0: 5.5, y0: 8.5, dx: 1, dy: 0, tiles } };
	const T = timing(r);
	const c = document.createElement('canvas');
	c.width = WV.w;
	c.height = WV.h;
	const g = c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
	const laneY = L.offsetY + 8.5 * S;
	let across = 0;
	let ahead = 0;
	const lum: number[] = [];
	for (let t = 0; t < T.cycle; t += 1 / 60) {
		g.setTransform(1, 0, 0, 1, 0, 0);
		g.clearRect(0, 0, c.width, c.height);
		const bt = beat(r, t);
		// the form: only while he is transformed (the body is the game's own and stays as it is)
		if (layer === 'form' && bt.morph < 0.02) {
			lum.push(0);
			continue;
		}
		drawScene(g, { layout: L, round: r, variant: v, phase, layers: layer === 'trail' ? { body: false, trail: true } : { body: true, trail: false, sprite: false } }, t, 'measure');
		const data = g.getImageData(0, 0, c.width, c.height).data;
		const bx = L.offsetX + beat(r, t).x * S;
		let sum = 0;
		for (let y = 0; y < c.height; y += 1) {
			for (let x = 0; x < c.width; x += 1) {
				const i = (y * c.width + x) * 4;
				const a = data[i + 3];
				if (a < 12) continue;
				across = Math.max(across, Math.abs(y + 0.5 - laneY) / S);
				ahead = Math.max(ahead, (x + 0.5 - bx) / S);
				sum += ((data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722) * a) / 255;
			}
		}
		lum.push(sum / (S * S));
	}
	return { across, ahead, lum, cycle: T.cycle };
};
