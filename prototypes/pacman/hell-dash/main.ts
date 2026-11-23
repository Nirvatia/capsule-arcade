// Prototype: the hell boss's dash as the game draws it (`HellBlinkyView` with `doomDashFx`: the
// body turns into a rolling lava ball, the owner's pick B1), on the real hell world, in a scripted
// round at the game's timings (`script.ts`). First screen: the contact sheet, rows the phases and
// the echo, columns the moments of one round; "конец следа" frames the track's old end; "живое"
// plays the round with a x3 magnifier. Query (scripts): ?mode=sheet|tail|live &v=1|2|3|echo
// &len=long|short &lane=h|v &zoom=1|2|4 &speed=1|0.25 &t=<s>
import { GRID_DOOM } from '../../../src/games/pacman/config/mazes';
import { DoomWorld } from '../../../src/games/pacman/render/doom/DoomWorld';
import { Bar } from '../common/ui';
import { HellBlinkyView } from '../../../src/games/pacman/render/doom/HellBlinkyView';
import type { BossSnapshot } from '../../../src/games/pacman/render/doom/HellBlinkyView';
import type { GridLayout } from '../../../src/games/pacman/render/maze/GridView';
import type { Lane, Round } from './script';
import { beat, moments, timing } from './script';
import type { Beat } from './script';

type Variant = '1' | '2' | '3' | 'echo';
const VARIANTS: ReadonlyArray<{ id: Variant; name: string }> = [
	{ id: '1', name: 'фаза 1 (кость)' },
	{ id: '2', name: 'фаза 2 (шлем)' },
	{ id: '3', name: 'фаза 3 (рога)' },
	{ id: 'echo', name: 'эхо (фаза 3)' }
];

function snapOf(b: Beat, r: Round, v: Variant): BossSnapshot {
	const L0 = r.lane;
	return {
		x: b.x,
		y: b.y,
		phase: v === 'echo' ? 3 : Number(v),
		state: b.state,
		shape: b.shape,
		dir: L0.dx > 0 ? 'RIGHT' : L0.dx < 0 ? 'LEFT' : L0.dy > 0 ? 'DOWN' : 'UP',
		progress: b.progress,
		alpha: 1,
		intro: 1,
		look: Math.atan2(L0.dy, L0.dx),
		hit: 0,
		echo: v === 'echo'
	};
}

/** The game's view keeps state (its lava track): replayed from the round's start when time jumps. */
const views = new Map<string, { view: HellBlinkyView; t: number }>();
let dummy: CanvasRenderingContext2D | null = null;
function drawScene(c: CanvasRenderingContext2D, layout: GridLayout, r: Round, v: Variant, time: number, key: string): void {
	const T = timing(r);
	const t0 = time - (((time % T.cycle) + T.cycle) % T.cycle);
	let slot = views.get(key);
	if (!slot || slot.t > time || time - slot.t > 0.5) {
		slot = { view: new HellBlinkyView(), t: t0 };
		views.set(key, slot);
	}
	dummy ??= document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D;
	while (slot.t < time - 1 / 60) {
		slot.t += 1 / 60;
		slot.view.draw(dummy, snapOf(beat(r, slot.t), r, v), layout, slot.t);
	}
	slot.t = time;
	slot.view.draw(c, snapOf(beat(r, time), r, v), layout, time);
}

const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);
const q = new URLSearchParams(location.search);
const FROZEN = q.has('t') ? Number(q.get('t')) : null;

const bar = new Bar(
	[
		{ key: 'mode', label: 'вид', options: [{ id: 'sheet', label: 'сетка: все варианты × моменты' }, { id: 'tail', label: 'конец следа' }, { id: 'live', label: 'живое' }] },
		{ key: 'v', label: 'живое', options: VARIANTS.map((v) => ({ id: v.id, label: v.name })) },
		{ key: 'len', label: 'рывок', options: [{ id: 'long', label: '10 тайлов' }, { id: 'short', label: '3 тайла' }] },
		{ key: 'lane', label: 'курс', options: [{ id: 'h', label: '→' }, { id: 'v', label: '↓' }] },
		{ key: 'zoom', label: 'масштаб сетки', options: [{ id: '1', label: '1:1 игра' }, { id: '2', label: '×2' }, { id: '4', label: '×4' }] },
		{ key: 'speed', label: 'скорость', options: [{ id: '1', label: '1×' }, { id: '0.25', label: '¼×' }] }
	],
	{ mode: 'sheet', v: '1', len: 'long', lane: 'h', zoom: '4', speed: '1' },
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
	return { phase: bar.get('v') === 'echo' ? 3 : Number(bar.get('v')), lane };
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
	drawScene(ctx, L, r, v, t, key);
	ctx.restore();
	ctx.strokeStyle = 'rgba(255,255,255,.18)';
	ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function sheet(tail: boolean): void {
	const base = round();
	// every row runs its own phase's timings: the moments are taken per row
	const momentsOf = (r: Round) => {
		const T0 = timing(r);
		return tail
			? [0.25, 0.5, 0.8]
					.map((k) => ({ name: `рывок ${Math.round(k * 100)}%`, t: T0.t1 + (T0.t2 - T0.t1) * k }))
					.concat([0, 0.5, 1.0, 1.5, 2.0, 2.5].map((d) => ({ name: `стоп +${d.toFixed(1)} с`, t: T0.t2 + d })))
			: moments(r);
	};
	const names = momentsOf(base).map((m) => m.name);
	const top = bar.height + 22;
	const left = 128;
	const cw = (vw - left - 8) / names.length;
	const ch = (vh - top - 8) / VARIANTS.length;
	const z = Number(bar.get('zoom'));
	ctx.fillStyle = '#0c0a0c';
	ctx.fillRect(0, 0, vw, vh);
	names.forEach((n, i) => label(n, left + i * cw + cw / 2, top - 6, 12, 'center'));
	VARIANTS.forEach((v, j) => {
		const r: Round = { ...base, phase: v.id === 'echo' ? 3 : Number(v.id) };
		label(v.name, 8, top + j * ch + ch / 2, 13);
		momentsOf(r).forEach((m, i) => cell(left + i * cw + 2, top + j * ch + 2, cw - 4, ch - 4, r, v.id, m.t, z, `${j}-${i}`, tail));
	});
	bar.setNote(
		VARIANTS.slice(0, 3)
			.map((v) => {
				const T = timing({ ...base, phase: Number(v.id) });
				return `фаза ${v.id}: замах ${T.tel.toFixed(2)} с, рывок ${base.lane.tiles} т за ${(T.t2 - T.t1).toFixed(2)} с, восстановление ${T.rec.toFixed(2)} с`;
			})
			.join('\n') + '\nпревращение: последние 0.25 с замаха; возврат: первые 0.28 с после остановки'
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
	drawScene(ctx, L, r, v, t, 'live');
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
