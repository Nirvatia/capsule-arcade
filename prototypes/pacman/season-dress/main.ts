// Prototype: the seasons as holiday scenes (`scenes.ts`) on the real `MeadowWorld`, beside the game's
// seasons as they are. First screen: a split view, the game's season on the left, the new scene on
// the right, the same board under both. "Целиком" shows one; "лист" is the season's contact sheet
// (rows: now and the concepts; columns: day, night, a cabin x3, the landmark x3, a wall corner x4).
// Every switch is a button; for scripts the same choices work as a query:
// ?mode=split|full|sheet &season=… &spring=hanami|easter &summer=beach|fair &v=now|new
// &layers=floor,shadow,dress,props,live &night=0|1 &storm=0|1 &t=<s>
import { GRID_01 } from '../../../src/games/pacman/config/mazes';
import { GAME_FEEL } from '../../../src/games/pacman/render/actors/HeroView';
import { MsPacmanHero } from '../../../src/games/pacman/render/actors/hero/MsPacmanHero';
import { PacmanHero } from '../../../src/games/pacman/render/actors/hero/PacmanHero';
import { SEASON_GHOST, drawCuteGhost } from '../../../src/games/pacman/render/actors/cuteGhost';
import { T, bakeMeadow } from '../../../src/games/pacman/render/seasons/meadow/MeadowBake';
import { MeadowWorld } from '../../../src/games/pacman/render/seasons/meadow/MeadowWorld';
import type { MeadowTheme } from '../../../src/games/pacman/render/seasons/meadow/MeadowTheme';
import { paintWalls } from '../../../src/games/pacman/render/seasons/meadow/meadowBakeWalls';
import { meadowThemeFor } from '../../../src/games/pacman/render/seasons/meadow/meadowThemes';
import { Bar } from '../common/ui';
import { onWalls } from './common';
import { SCENES, sceneCell, sceneOf } from './scenes';
import type { Lit, Scene, Season } from './scenes';

const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);
const q = new URLSearchParams(location.search);
const FROZEN = q.has('t') ? Number(q.get('t')) : null;
const LAYERS = ['floor', 'shadow', 'dress', 'props', 'live'] as const;
type Layer = (typeof LAYERS)[number];

const bar = new Bar(
	[
		{ key: 'mode', label: 'вид', options: [{ id: 'split', label: 'сейчас | новое' }, { id: 'full', label: 'целиком' }, { id: 'sheet', label: 'лист сезона' }] },
		{ key: 'season', label: 'сезон', options: [{ id: 'autumn', label: 'осень' }, { id: 'winter', label: 'зима' }, { id: 'spring', label: 'весна' }, { id: 'summer', label: 'лето' }] },
		{ key: 'spring', label: 'весна', options: [{ id: 'hanami', label: 'A ханами ★' }, { id: 'easter', label: 'B Пасха' }] },
		{ key: 'summer', label: 'лето', options: [{ id: 'fair', label: 'B ярмарка ★' }, { id: 'beach', label: 'A пляж' }] },
		{ key: 'v', label: 'целиком', options: [{ id: 'new', label: 'новое' }, { id: 'now', label: 'сейчас' }] },
		{
			key: 'layers',
			label: 'слои',
			multi: true,
			options: [
				{ id: 'floor', label: 'пол' },
				{ id: 'shadow', label: 'тени' },
				{ id: 'dress', label: 'стены' },
				{ id: 'props', label: 'антураж' },
				{ id: 'live', label: 'живое' }
			]
		},
		{ key: 'night', label: 'время', options: [{ id: '0', label: 'день' }, { id: '1', label: 'ночь' }] },
		{ key: 'storm', label: 'погода', options: [{ id: '0', label: 'тихо' }, { id: '1', label: 'непогода' }] }
	],
	{ mode: 'split', season: 'autumn', spring: 'hanami', summer: 'fair', v: 'new', layers: LAYERS.join(','), night: '0', storm: '0' },
	() => {
		dirty = true;
	}
);

type Layers = Record<Layer, boolean>;
const layersNow = (): Layers => Object.fromEntries(LAYERS.map((l) => [l, bar.has('layers', l)])) as Layers;
const ALL: Layers = { floor: true, shadow: true, dress: true, props: true, live: true };

/** The game's theme with a scene laid over it, layer by layer. The walls' painter runs unchanged. */
function sceneTheme(base: MeadowTheme, sc: Scene, L: Layers, lit: Lit): MeadowTheme {
	const bk = base.bake;
	const tone = sc.floor;
	return {
		...base,
		bake: {
			...bk,
			...(L.props ? sc.bake : {}),
			floor:
				L.floor && tone
					? { ...bk.floor, tiles: [tone.base, tone.base, tone.base], paint: (f, cell) => sceneCell(sc, f, cell, L.shadow) }
					: bk.floor,
			landmark: {
				...bk.landmark,
				draw: (k, o) => {
					bk.landmark.draw(k, o);
					if (L.props) sc.landmark?.(k, o, lit, o.x < 0 ? 0 : 1);
				}
			},
			wall: {
				...bk.wall,
				paint: (f) => {
					// the theme's own painter (winter's) or the shared one, untouched
					if (bk.wall.paint) bk.wall.paint(f);
					else paintWalls(f, L.shadow ? { shadow: [9, 3, 4] } : {});
					if (L.dress && sc.wallDress) onWalls(f, (r) => sc.wallDress?.(f, r));
					if (L.props) sc.props?.(f, lit);
				}
			}
		}
	};
}

interface Built {
	world: MeadowWorld;
	sc: Scene | null;
	lit: Lit;
	season: Season;
}
const cache = new Map<string, Built>();
function built(season: Season, sc: Scene | null, L: Layers, vw: number, vh: number): Built {
	const k = `${season}|${sc?.id ?? 'now'}|${LAYERS.filter((l) => L[l]).join(',')}|${vw}x${vh}`;
	let b = cache.get(k);
	if (b) return b;
	const base = meadowThemeFor(season) as MeadowTheme;
	const lit: Lit = { bulbs: new Map(), glows: new Map() };
	const world = new MeadowWorld(GRID_01, sc ? sceneTheme(base, sc, L, lit) : base);
	world.resize(vw, vh, D);
	world.setLairGate(0);
	b = { world, sc, lit, season };
	cache.set(k, b);
	return b;
}

const season = () => bar.get('season') as Season;
const scene = (s: Season = season()) => sceneOf(s, s === 'spring' ? bar.get('spring') : s === 'summer' ? bar.get('summer') : s);

// heroes and ghosts on the board, to see that the dress never hides them
const pac = new PacmanHero();
const ms = new MsPacmanHero();
pac.setFeel(GAME_FEEL);
ms.setFeel(GAME_FEEL);

let vw = 0;
let vh = 0;
let dirty = true;
let simT = 0;
let last = -1;

/** One frame of a built world into `c` at the time `t` (its mood eased to night/storm). */
function frameOf(c: CanvasRenderingContext2D, b: Built, t: number, L: Layers, night: number, storm: number): void {
	const w = b.world;
	w.setMood(storm, night);
	w.drawWorld(c);
	w.drawMood(c);
	const lay = w.layout;
	const k = lay.tileSize / T;
	if (b.sc && L.live && L.props) b.sc.live?.(c, t, { ox: lay.offsetX, oy: lay.offsetY, k, night, storm, vw, vh, grid: GRID_01, lit: b.lit });
	w.drawFood(c, () => false);
	const S = lay.tileSize;
	const at = (tx: number, ty: number) => ({ x: lay.offsetX + tx * S, y: lay.offsetY + ty * S });
	const gk = ['BLINKY', 'PINKY', 'INKY', 'CLYDE'] as const;
	[
		[6.5, 4.5],
		[18.5, 8.5],
		[4.5, 22.5],
		[20.5, 18.5]
	].forEach(([tx, ty], i) => {
		const p = at(tx, ty);
		drawCuteGhost(c, p.x, p.y, (S / 25) * 0.78, { shape: SEASON_GHOST[b.season], kind: gk[i], state: 'normal', lookX: i % 2 ? -1 : 1, lookY: 0, time: t, step: t * 6 + i });
	});
	for (const [h, tx, ty] of [
		[pac, 12.5, 20.5],
		[ms, 8.5, 12.5]
	] as const) {
		const p = at(tx, ty);
		h.setRadius(S * 0.33);
		h.update(0, { x: p.x, y: p.y, angle: 0, moving: false, power: false, ending: false, season: b.season });
		h.draw(c);
	}
	w.drawOverlay(c);
}

/** Lets a world's mood reach its target (night and storm ease in over seconds in the game). */
function settle(b: Built, night: number, storm: number): void {
	b.world.setMood(storm, night);
	for (let i = 0; i < 80; i += 1) b.world.update(0.1);
}

function label(text: string, x: number, y: number, size = 13, align: CanvasTextAlign = 'left'): void {
	ctx.font = `600 ${size}px system-ui, sans-serif`;
	ctx.textAlign = align;
	ctx.fillStyle = 'rgba(0,0,0,.65)';
	ctx.fillText(text, x + 1, y + 1);
	ctx.fillStyle = 'rgba(255,245,235,.95)';
	ctx.fillText(text, x, y);
}

function live(now: number): void {
	const dt = last < 0 ? 0 : Math.min(0.05, (now - last) / 1000);
	last = now;
	simT += dt;
	const t = FROZEN ?? simT;
	const L = layersNow();
	const night = Number(bar.get('night'));
	const storm = Number(bar.get('storm'));
	const s = season();
	const mode = bar.get('mode');
	const nowB = built(s, null, ALL, vw, vh);
	const newB = built(s, scene(s), L, vw, vh);
	for (const b of [nowB, newB]) {
		b.world.setMood(storm, night);
		b.world.update(dt || 1 / 60);
	}
	if (dirty) {
		settle(nowB, night, storm);
		settle(newB, night, storm);
		dirty = false;
	}
	ctx.fillStyle = '#000';
	ctx.fillRect(0, 0, vw, vh);
	if (mode === 'full') {
		frameOf(ctx, bar.get('v') === 'now' ? nowB : newB, t, L, night, storm);
		label(bar.get('v') === 'now' ? `сейчас: ${s}` : `новое: ${scene(s).name}`, 12, bar.height + 22);
	} else {
		const mid = vw / 2;
		for (const [b, x0, x1] of [
			[nowB, 0, mid],
			[newB, mid, vw]
		] as const) {
			ctx.save();
			ctx.beginPath();
			ctx.rect(x0, 0, x1 - x0, vh);
			ctx.clip();
			frameOf(ctx, b, t, L, night, storm);
			ctx.restore();
		}
		ctx.fillStyle = 'rgba(255,255,255,.85)';
		ctx.fillRect(mid - 1, 0, 2, vh);
		label('← сейчас', mid - 12, bar.height + 22, 14, 'right');
		label(`новое: ${scene(s).name} →`, mid + 12, bar.height + 22, 14);
	}
	bar.setNote(night ? 'ночь: свет окон, фонарей и гирлянд живой (дышит медленнее 1 раза в секунду)' : '');
}

// --------------------------------------------------------------------------- the season's sheet

function sheet(): void {
	const s = season();
	const rows: Array<{ name: string; sc: Scene | null }> = [{ name: 'сейчас', sc: null }, ...SCENES.filter((x) => x.season === s).map((x) => ({ name: x.name, sc: x }))];
	const top = bar.height + 24;
	const left = 130;
	const cols = ['день', 'ночь', 'домик ×3', 'ориентир ×3', 'угол стены ×4'];
	const cw = (vw - left - 8) / cols.length;
	// rows as tall as a frame's proportions want, no taller (fewer rows leave room below)
	const ch = Math.min((vh - top - 8) / rows.length, cw * 0.66);
	// one full frame per row and time, rendered at the page's size, then cropped
	const FW = 1600;
	const FH = 1000;
	ctx.fillStyle = '#0d0c10';
	ctx.fillRect(0, 0, vw, vh);
	cols.forEach((n, i) => label(n, left + i * cw + cw / 2, top - 8, 12, 'center'));
	rows.forEach((row, j) => {
		label(row.name, 8, top + j * ch + ch / 2, 12);
		const b = built(s, row.sc, ALL, FW, FH);
		const lay = b.world.layout;
		const k = lay.tileSize / T;
		const frames = [0, 1].map((night) => {
			settle(b, night, 0);
			const cv = document.createElement('canvas');
			cv.width = FW * D;
			cv.height = FH * D;
			const g = cv.getContext('2d') as CanvasRenderingContext2D;
			g.setTransform(D, 0, 0, D, 0, 0);
			frameOf(g, b, 3.3, ALL, night, 0);
			return cv;
		});
		settle(b, 0, 0);
		const cab = b.world && { x: lay.offsetX + -6.5 * T * k, y: lay.offsetY + 7.5 * T * k };
		const mark = { x: lay.offsetX + -3.8 * T * k, y: lay.offsetY + 3.6 * T * k };
		const corner = { x: lay.offsetX + 1.6 * T * k, y: lay.offsetY + 1.6 * T * k };
		const crops: Array<{ img: HTMLCanvasElement; cx: number; cy: number; z: number }> = [
			{ img: frames[0], cx: FW / 2, cy: FH / 2, z: Math.min(cw / FW, ch / FH) },
			{ img: frames[1], cx: FW / 2, cy: FH / 2, z: Math.min(cw / FW, ch / FH) },
			{ img: frames[0], cx: cab.x, cy: cab.y, z: 3 * Math.min(1, (cw / FW) * 2.2) },
			{ img: frames[1], cx: mark.x, cy: mark.y, z: 3 * Math.min(1, (cw / FW) * 2.2) },
			{ img: frames[0], cx: corner.x, cy: corner.y, z: 4 * Math.min(1, (cw / FW) * 2.2) }
		];
		crops.forEach((c, i) => {
			const x = left + i * cw + 2;
			const y = top + j * ch + 2;
			const w = cw - 4;
			const h = ch - 4;
			ctx.save();
			ctx.beginPath();
			ctx.rect(x, y, w, h);
			ctx.clip();
			ctx.fillStyle = '#000';
			ctx.fillRect(x, y, w, h);
			ctx.translate(x + w / 2, y + h / 2);
			ctx.scale(c.z, c.z);
			ctx.drawImage(c.img, -c.cx, -c.cy, FW, FH);
			ctx.restore();
			ctx.strokeStyle = 'rgba(255,255,255,.2)';
			ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
		});
	});
	bar.setNote('ряды: сейчас и концепты; колонки: день, ночь, домик (день), ориентир (ночь), угол лабиринта');
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
	if (bar.get('mode') === 'sheet') {
		if (dirty) {
			sheet();
			dirty = false;
		}
	} else live(now);
	requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------------------------------------------------------------------- the walls' guard

/**
 * The walls' guard, for a script: bakes the scene's static world with the wall dress off and on
 * (everything else the same) and with the game's own theme, at 3 px a world unit, and counts
 *  - outside: pixels outside the walls' silhouette (1 px of anti-aliasing allowed round it) that
 *    differ at all between dress off and on (must be 0: the dress never leaves the stone);
 *  - cornerLight: pixels inside the silhouette near an outer rounded corner that the dress made
 *    light (luminance > 200 and > 30 above the undressed): white corners (must be 0);
 *  - wallsChanged: pixels inside the silhouette (2 px in from its edge) that differ between the
 *    scene with its dress off and the game's season as it is: the walls are not repainted (0).
 */
(window as unknown as Record<string, unknown>).__guard = (id: string) => {
	const sc = SCENES.find((x) => x.id === id) as Scene;
	const base = meadowThemeFor(sc.season) as MeadowTheme;
	const R = GRID_01.length;
	const C = GRID_01[0].length;
	const RS = 3;
	const x0 = -T;
	const y0 = -T;
	const w = (C + 2) * T;
	const h = (R + 2) * T;
	const bake = (th: MeadowTheme) => {
		const cv = bakeMeadow(GRID_01, th.bake, x0, y0, w, h, RS);
		return (cv.getContext('2d') as CanvasRenderingContext2D).getImageData(0, 0, cv.width, cv.height).data;
	};
	const lit = (): Lit => ({ bulbs: new Map(), glows: new Map() });
	const off = bake(sceneTheme(base, sc, { ...ALL, dress: false }, lit()));
	const on = bake(sceneTheme(base, sc, ALL, lit()));
	const now = bake(base);
	const W = Math.ceil(w * RS);
	const H = Math.ceil(h * RS);
	// the silhouette, the same shape `paintWalls` fills under the stones
	const mc = document.createElement('canvas');
	mc.width = W;
	mc.height = H;
	const m = mc.getContext('2d') as CanvasRenderingContext2D;
	m.scale(RS, RS);
	m.translate(-x0, -y0);
	const isW = (r: number, c: number) => !!GRID_01[r] && GRID_01[r][c] === 'WL';
	m.fillStyle = '#fff';
	const corners: Array<[number, number, number, number]> = [];
	for (let r = 0; r < R; r += 1) {
		for (let c = 0; c < C; c += 1) {
			if (!isW(r, c)) continue;
			const oL = !isW(r, c - 1);
			const oU = !isW(r - 1, c);
			const oR = !isW(r, c + 1);
			const oD = !isW(r + 1, c);
			const L = oL ? 0 : -0.4;
			const U = oU ? 0 : -0.4;
			const Rr = oR ? 0 : -0.4;
			const Dd = oD ? 0 : -0.4;
			m.beginPath();
			m.roundRect(c * T + L, r * T + U, T - L - Rr, T - U - Dd, [oU && oL ? 8 : 0, oU && oR ? 8 : 0, oD && oR ? 8 : 0, oD && oL ? 8 : 0]);
			m.fill();
			if (oU && oL) corners.push([c * T, r * T, 1, 1]);
			if (oU && oR) corners.push([(c + 1) * T, r * T, -1, 1]);
			if (oD && oL) corners.push([c * T, (r + 1) * T, 1, -1]);
			if (oD && oR) corners.push([(c + 1) * T, (r + 1) * T, -1, -1]);
		}
	}
	const md = m.getImageData(0, 0, W, H).data;
	const inside = new Uint8Array(W * H);
	for (let i = 0; i < W * H; i += 1) inside[i] = md[i * 4 + 3] > 0 ? 1 : 0;
	const grow = (src: Uint8Array, rad: number, val: number) => {
		const out = new Uint8Array(src);
		for (let y = 0; y < H; y += 1) {
			for (let x = 0; x < W; x += 1) {
				if (src[y * W + x] !== val) continue;
				for (let dy = -rad; dy <= rad; dy += 1) {
					for (let dx = -rad; dx <= rad; dx += 1) {
						const xx = x + dx;
						const yy = y + dy;
						if (xx >= 0 && yy >= 0 && xx < W && yy < H) out[yy * W + xx] = val;
					}
				}
			}
		}
		return out;
	};
	const near = grow(inside, 1, 1);
	const core = grow(inside, 2, 0);
	const lum = (d: Uint8ClampedArray, i: number) => d[i] * 0.2126 + d[i + 1] * 0.7152 + d[i + 2] * 0.0722;
	let outside = 0;
	let wallsChanged = 0;
	for (let p = 0; p < W * H; p += 1) {
		const i = p * 4;
		if (!near[p] && (off[i] !== on[i] || off[i + 1] !== on[i + 1] || off[i + 2] !== on[i + 2] || off[i + 3] !== on[i + 3])) outside += 1;
		if (core[p] && (off[i] !== now[i] || off[i + 1] !== now[i + 1] || off[i + 2] !== now[i + 2])) wallsChanged += 1;
	}
	let cornerLight = 0;
	for (const [cx, cy, sx, sy] of corners) {
		for (let u = 0; u < 10 * RS; u += 1) {
			for (let v = 0; v < 10 * RS; v += 1) {
				const x = Math.round((cx - x0) * RS + sx * u);
				const y = Math.round((cy - y0) * RS + sy * v);
				if (x < 0 || y < 0 || x >= W || y >= H) continue;
				const p = y * W + x;
				if (!inside[p]) continue;
				const i = p * 4;
				if (lum(on, i) > 200 && lum(on, i) - lum(off, i) > 30) cornerLight += 1;
			}
		}
	}
	let dressed = 0;
	for (let p = 0; p < W * H; p += 1) {
		const i = p * 4;
		if (off[i] !== on[i] || off[i + 1] !== on[i + 1] || off[i + 2] !== on[i + 2]) dressed += 1;
	}
	return { id, outside, cornerLight, wallsChanged, dressedPixels: dressed, corners: corners.length, size: `${W}x${H}` };
};
