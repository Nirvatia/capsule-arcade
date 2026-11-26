// Prototype: the station B-7 as the game draws it (`render/station/b7`: the scene, the hive's
// takeover, the lamps under its film, the heartbeat) with the game's quarantine ring, its lure
// (the cyan flare) and its Pretenders (the rage, the acid overheat) on the real maze, beside the
// candidate of `ferro.ts`: the station taken by a living black metal, its spikes rising for the
// hero (the game's Cinnabar vessel walks a corridor), and the squad of the same fluid. Everything
// is switched by the buttons on top; a panel shows the squad large.
import { GRID_STATION } from '../../../src/games/pacman/config/mazes';
import type { GhostKind } from '../../../src/games/pacman/logic/actors/GhostModel';
import type { QuarantineRing, RingSeal } from '../../../src/games/pacman/logic/station/StationSquad';
import { B7World } from '../../../src/games/pacman/render/station/b7/B7World';
import { drawPretender, RailGait, type PretenderOpts } from '../../../src/games/pacman/render/station/pretender';
import { drawRing } from '../../../src/games/pacman/render/station/quarantineRing';
import { drawLureFlare, LURE_RGB } from '../../../src/games/pacman/render/station/lureFlare';
import { CJ_BODY_RATIO } from '../../../src/games/pacman/render/actors/hero/vesselHero';
import { CinnabarHero } from '../../../src/games/pacman/render/actors/hero/CinnabarHero';
import { GAME_FEEL } from '../../../src/games/pacman/render/actors/HeroView';
import { drawHeroGlow } from '../../../src/games/pacman/render/station/pretender';
import { createFerro, drawFerroMimic, type CandState } from './ferro';

const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const bar = document.getElementById('bar') as HTMLDivElement;
const D = Math.min(window.devicePixelRatio || 1, 2);
const world = new B7World(GRID_STATION);
const ferro = createFerro(world.scene, GRID_STATION);
const heroView = new CinnabarHero();
heroView.setFeel(GAME_FEEL);
world.setQuality('medium');
const grid = GRID_STATION;
const H = grid.length;
const W = grid[0].length;
const OPEN = new Set(['DT', 'EU', 'FL', 'PM', 'CE', 'FT', 'BY', 'PY', 'IY']);
const open = (x: number, y: number) => y >= 0 && y < H && x >= 0 && x < W && OPEN.has(grid[y][x]);

// ------------------------------------------------------------------------------ what is shown

type RingMode = 'cycle' | 'guide' | 'charge' | 'lit' | 'off';
type Pick = 'now' | 'off';
type Mim = 'ferro' | 'now' | 'off';
type Lure = 'on' | 'off';
const st = {
	inf: 0.65,
	style: 'ferro' as 'hive' | 'ferro',
	alarm: false,
	ring: 'off' as RingMode,
	mimic: 'ferro' as Mim,
	rage: 'off' as Pick,
	lure: 'off' as Lure,
	big: true
};

const NOTES: Record<string, string> = {
	'rage-now': 'Ярость как в игре: кислотный перегрев',
	'mimic-now': 'Мимики как в игре: Pretender в маске',
	'mimic-ferro': 'Мимики из феррожидкости: лепят из себя фальшивое лицо, корона шипов у каждого своя, отлив его цвета',
	'lure-on': 'Приманка: циановая шашка, как в игре',
	'style-ferro': 'Заражение «Феррожидкость»: чёрный живой металл забирает стены от логова, ряды шипов по краям поднимаются за героем; коридоры чистые',
	'style-hive': 'Заражение как в игре: улей',
	'ring-cycle': 'Круг, как в игре: контур → зарядка по контуру → горит'
};

interface Group {
	label: string;
	key: keyof typeof st;
	items: Array<[string, string | number | boolean]>;
	after?: (v: string | number | boolean) => void;
}
const GROUPS: Group[] = [
	{
		label: 'Круг',
		key: 'ring',
		items: [
			['Цикл', 'cycle'],
			['Контур', 'guide'],
			['Зарядка', 'charge'],
			['Горит', 'lit'],
			['Выкл', 'off']
		],
		after: (v) => {
			if (v !== 'off') st.alarm = false;
		}
	},
	{
		label: 'Мимики',
		key: 'mimic',
		items: [
			['Как в игре', 'now'],
			['Феррожидкость', 'ferro'],
			['Выкл', 'off']
		],
		after: (v) => {
			if (v !== 'off') {
				st.rage = 'off';
				st.alarm = false;
			}
		}
	},
	{
		label: 'Ярость',
		key: 'rage',
		items: [
			['Как в игре', 'now'],
			['Выкл', 'off']
		],
		after: (v) => {
			if (v !== 'off') {
				st.mimic = 'off';
				st.alarm = true;
				st.inf = 1;
			}
		}
	},
	{
		label: 'Приманка',
		key: 'lure',
		items: [
			['Шашка', 'on'],
			['Выкл', 'off']
		],
		after: (v) => {
			if (v !== 'off') {
				st.alarm = true;
				st.inf = 1;
			}
		}
	},
	{
		label: 'Свет',
		key: 'alarm',
		items: [
			['Карантин', false],
			['Тревога', true]
		]
	},
	{
		label: 'Стиль',
		key: 'style',
		items: [
			['Феррожидкость', 'ferro'],
			['Как в игре', 'hive']
		]
	},
	{
		label: 'Заражение',
		key: 'inf',
		items: [
			['0%', 0],
			['35%', 0.35],
			['65%', 0.65],
			['100%', 1]
		]
	},
	{
		label: 'Крупно',
		key: 'big',
		items: [
			['Вкл', true],
			['Выкл', false]
		]
	}
];

const note = document.createElement('div');
note.className = 'note';
function render(): void {
	bar.textContent = '';
	for (const g of GROUPS) {
		const row = document.createElement('div');
		row.className = 'grp';
		const lab = document.createElement('span');
		lab.textContent = g.label;
		row.append(lab);
		for (const [text, value] of g.items) {
			const b = document.createElement('button');
			b.textContent = text;
			if (st[g.key] === value) b.className = 'on';
			b.onclick = () => {
				(st as Record<string, unknown>)[g.key] = value;
				g.after?.(value);
				render();
			};
			row.append(b);
		}
		bar.append(row);
	}
	const lines = [
		NOTES[`style-${st.style}`],
		st.ring === 'cycle' ? NOTES['ring-cycle'] : '',
		st.mimic !== 'off' ? NOTES[`mimic-${st.mimic}`] : '',
		st.rage !== 'off' ? NOTES[`rage-${st.rage}`] : '',
		st.lure !== 'off' ? NOTES[`lure-${st.lure}`] : ''
	].filter(Boolean);
	note.textContent = lines.join('\n');
	bar.append(note);
}
render();

// ------------------------------------------------------------------------- the ring's layout

/** The game's seal finder (`StationSquad.ringPlan`) round a fixed point, its posts left and right. */
function planRing(tx: number, ty: number, r: number): QuarantineRing {
	const cx = tx + 0.5;
	const cy = ty + 0.5;
	const inside = (x: number, y: number) => Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r;
	const throat = (x: number, y: number, dx: number, dy: number) =>
		open(x, y) && !open(x + dy, y + dx) && !open(x - dy, y - dx);
	const seals: RingSeal[] = [];
	const taken = new Set<number>();
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++) {
			if (!open(x, y) || !inside(x, y)) continue;
			for (const [dx, dy] of [
				[0, -1],
				[0, 1],
				[-1, 0],
				[1, 0]
			]) {
				const bx = x + dx;
				const by = y + dy;
				if (!open(bx, by) || inside(bx, by)) continue;
				const cand: Array<[number, number]> = [
					[bx, by],
					[x, y],
					[bx + dx, by + dy],
					[x - dx, y - dy],
					[bx + 2 * dx, by + 2 * dy],
					[x - 2 * dx, y - 2 * dy]
				];
				const [sx, sy] = cand.find(([a, b]) => throat(a, b, dx, dy)) ?? [bx, by];
				if (taken.has(sy * W + sx)) continue;
				taken.add(sy * W + sx);
				seals.push({ x: sx, y: sy, dx, dy, weak: seals.length === 1 });
			}
		}
	const posts = (['BLINKY', 'PINKY'] as GhostKind[]).map((kind, i) => {
		const want = i ? Math.PI : 0;
		let best = { x: tx, y: ty, a: 0, score: Infinity };
		for (let y = 0; y < H; y++)
			for (let x = 0; x < W; x++) {
				if (!open(x, y)) continue;
				const a = Math.atan2(y + 0.5 - cy, x + 0.5 - cx);
				const da = Math.abs(Math.atan2(Math.sin(a - want), Math.cos(a - want)));
				const score = Math.abs(Math.hypot(x + 0.5 - cx, y + 0.5 - cy) - r) * 2 + da * 3;
				if (score < best.score) best = { x, y, a, score };
			}
		return { kind, x: best.x, y: best.y, a: best.a, charge: 0 };
	});
	return { cx, cy, r, posts, seals, lit: false, push: 0, broken: false };
}

function nearestOpen(fx: number, fy: number): [number, number] {
	let best: [number, number] = [1, 1];
	let bd = Infinity;
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++) {
			const d = Math.hypot(x - fx, y - fy);
			if (open(x, y) && d < bd) [best, bd] = [[x, y], d];
		}
	return best;
}

const [rx, ry] = nearestOpen(W * 0.3, H * 0.5);
const ring = planRing(rx, ry, 7.5);
const [lx, ly] = nearestOpen(W * 0.7, H * 0.42);

// ------------------------------------------------------------------- the enraged on their runs

/** Straight runs of open tiles (at least 5), the nearest four to the lure. */
function runs(): Array<{ x0: number; y0: number; dx: number; dy: number; n: number }> {
	const out: Array<{ x0: number; y0: number; dx: number; dy: number; n: number; d: number }> = [];
	for (const [dx, dy] of [
		[1, 0],
		[0, 1]
	]) {
		for (let y = 0; y < H; y++)
			for (let x = 0; x < W; x++) {
				if (!open(x, y) || open(x - dx, y - dy)) continue;
				let n = 0;
				while (open(x + dx * n, y + dy * n)) n++;
				if (n < 5) continue;
				const mx = x + (dx * (n - 1)) / 2;
				const my = y + (dy * (n - 1)) / 2;
				out.push({ x0: x, y0: y, dx, dy, n, d: Math.hypot(mx - lx, my - ly) });
			}
	}
	return out.sort((a, b) => a.d - b.d).slice(0, 4);
}
const KINDS: GhostKind[] = ['BLINKY', 'PINKY', 'INKY', 'CLYDE'];
const walkers = runs().map((r, i) => ({ ...r, kind: KINDS[i], gait: new RailGait(), off: i * 0.37 }));
const SPEED = 5.2;

/** A stand-in hero on the longest straight run, back and forth, for the walls to notice. */
const heroRun = (() => {
	let best = { x0: 2, y0: 2, dx: 1, dy: 0, n: 2 };
	for (const [dx, dy] of [
		[1, 0],
		[0, 1]
	])
		for (let y = 0; y < H; y++)
			for (let x = 0; x < W; x++) {
				if (!open(x, y) || open(x - dx, y - dy)) continue;
				let n = 0;
				while (open(x + dx * n, y + dy * n)) n++;
				if (n > best.n && y > 3 && y < H - 4) best = { x0: x, y0: y, dx, dy, n };
			}
	return best;
})();
function heroAt(t: number): { x: number; y: number; dx: number; dy: number } {
	const len = heroRun.n - 1;
	const u = (t * 6) / len;
	const f = u % 2;
	const s = f < 1 ? f : 2 - f;
	const dir = f < 1 ? 1 : -1;
	return {
		x: heroRun.x0 + heroRun.dx * s * len + 0.5,
		y: heroRun.y0 + heroRun.dy * s * len + 0.5,
		dx: heroRun.dx * dir,
		dy: heroRun.dy * dir
	};
}

function walkerAt(w: (typeof walkers)[number], t: number) {
	const len = w.n - 1;
	const u = (t * SPEED) / len + w.off * 2;
	const f = u % 2;
	const s = f < 1 ? f : 2 - f;
	const dir = f < 1 ? 1 : -1;
	return { x: w.x0 + w.dx * s * len + 0.5, y: w.y0 + w.dy * s * len + 0.5, dx: w.dx * dir, dy: w.dy * dir };
}

// ------------------------------------------------------------------------------- the frame

function ringPhase(t: number): { guide: number; charge: number; lit: boolean } | null {
	if (st.ring === 'off') return null;
	if (st.ring === 'guide') return { guide: 1, charge: 0, lit: false };
	if (st.ring === 'charge') return { guide: 1, charge: 0.5, lit: false };
	if (st.ring === 'lit') return { guide: 0, charge: 1, lit: true };
	const u = t % 7.3;
	if (u < 1.8) return { guide: Math.min(1, u / 0.25), charge: 0, lit: false };
	if (u < 3.3) return { guide: 1, charge: (u - 1.8) / 1.5, lit: false };
	if (u < 6.3) return { guide: 0, charge: 1, lit: true };
	return null;
}

function look(g: RailGait, dx: number, dy: number, t: number): PretenderOpts {
	return { lookX: dx, lookY: dy, faceX: g.faceX, faceY: g.faceY, time: t, step: g.step, reveal: g.reveal };
}

function drawRage(c: CanvasRenderingContext2D, x: number, y: number, S: number, kind: GhostKind, o: PretenderOpts): void {
	if (st.rage === 'now') drawPretender(c, x, y, S, kind, 'rage', o);
}

/** The level's food, for the mimicry (a 34 px tile's spore scaled to `S`). */
function sporeAt(S: number, t: number) {
	return (c: CanvasRenderingContext2D, alpha: number, scale: number) => {
		c.save();
		c.globalAlpha *= alpha;
		c.scale(S / world.scene.TILE, S / world.scene.TILE);
		world.scene.drawSporeAt(c, 0, 0, scale * (1 + 0.04 * Math.sin(t * 2.0 + Math.PI)));
		c.restore();
	};
}

/** The picked calm look (the game's Pretender or a candidate) in `cs`. */
function drawMimic(
	c: CanvasRenderingContext2D,
	x: number,
	y: number,
	S: number,
	kind: GhostKind,
	cs: CandState,
	o: PretenderOpts
): void {
	if (st.mimic === 'off') return;
	if (st.mimic === 'now') drawPretender(c, x, y, S, kind, cs, o);
	else drawFerroMimic(c, x, y, S, kind, cs, o);
}

/** The sheet: the four kinds, the headings and the tell, the fright, the eyes and the mimicry. */
function sheet(c: CanvasRenderingContext2D, vw: number, t: number): void {
	const w = 452;
	const x0 = vw - w - 14;
	const y0 = 150;
	const h = 450;
	c.save();
	c.fillStyle = 'rgba(8, 11, 12, 0.92)';
	c.strokeStyle = 'rgba(160, 175, 170, 0.5)';
	c.lineWidth = 1;
	c.fillRect(x0, y0, w, h);
	c.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);
	c.beginPath();
	c.rect(x0, y0, w, h);
	c.clip();
	c.font = '11px ui-monospace, monospace';
	const S = 72;
	const u = (t % 5.2) / 5.2;
	const fold = smoothstep(0.12, 0.42, u) * (1 - smoothstep(0.72, 0.95, u));
	const flashWhite = Math.floor(t * 4) % 2 === 0;
	const cells: Array<[string, GhostKind, CandState, number, number, Partial<PretenderOpts>]> = [
		['BLINKY →', 'BLINKY', 'hunt', 1, 0, {}],
		['PINKY →', 'PINKY', 'hunt', 1, 0, {}],
		['INKY →', 'INKY', 'hunt', 1, 0, {}],
		['CLYDE →', 'CLYDE', 'hunt', 1, 0, {}],
		['←', 'BLINKY', 'hunt', -1, 0, {}],
		['↑', 'PINKY', 'hunt', 0, -1, {}],
		['↓', 'INKY', 'hunt', 0, 1, {}],
		['подсказка', 'CLYDE', 'tell', 1, 0, {}],
		['испуг', 'BLINKY', 'fright', 1, 0, {}],
		['конец испуга', 'PINKY', 'fright', -1, 0, { flashing: true, white: flashWhite }],
		['съеден', 'INKY', 'eyes', -1, 0, {}],
		['маскировка', 'CLYDE', 'mimic', 0, 1, { fold }]
	];
	cells.forEach(([label, kind, cs, dx, dy, extra], i) => {
		const cx = x0 + 58 + (i % 4) * 112;
		const cy = y0 + 70 + Math.floor(i / 4) * 140;
		const o: PretenderOpts = {
			lookX: dx,
			lookY: dy,
			faceX: dx,
			faceY: dy,
			time: t,
			step: cs === 'mimic' ? 0 : t * 9,
			spore: sporeAt(S, t),
			...extra
		};
		drawMimic(c, cx, cy, S, kind, cs, o);
		c.fillStyle = '#9fb0aa';
		c.textAlign = 'center';
		c.fillText(label, cx, cy + 62);
	});
	c.restore();
}

function smoothstep(e0: number, e1: number, x: number): number {
	const k = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
	return k * k * (3 - 2 * k);
}

/** The panel: the picked rage in its four headings and the lure, large. */
function panel(c: CanvasRenderingContext2D, vw: number, t: number): void {
	if (!st.big) return;
	if (st.mimic !== 'off') {
		sheet(c, vw, t);
		return;
	}
	if (st.rage === 'off' && st.lure === 'off') return;
	const w = 340;
	const x0 = vw - w - 14;
	const y0 = 150;
	const h = 470;
	c.save();
	c.fillStyle = 'rgba(8, 11, 12, 0.9)';
	c.strokeStyle = 'rgba(160, 175, 170, 0.5)';
	c.lineWidth = 1;
	c.fillRect(x0, y0, w, h);
	c.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);
	c.beginPath();
	c.rect(x0, y0, w, h);
	c.clip();
	c.font = '12px ui-monospace, monospace';
	c.fillStyle = '#cfd8d4';
	if (st.rage !== 'off') {
		c.fillText('ярость: → ← ↑ ↓', x0 + 12, y0 + 20);
		const S = 72;
		const heads: Array<[number, number]> = [
			[1, 0],
			[-1, 0],
			[0, -1],
			[0, 1]
		];
		heads.forEach(([dx, dy], i) => {
			const cx = x0 + 85 + (i % 2) * 170;
			const cy = y0 + 85 + Math.floor(i / 2) * 120;
			const o: PretenderOpts = { lookX: dx, lookY: dy, faceX: dx, faceY: dy, time: t, step: t * 9, reveal: 1 };
			drawRage(c, cx, cy, S, KINDS[i], o);
		});
	}
	if (st.lure !== 'off') {
		c.fillStyle = '#cfd8d4';
		c.fillText('приманка', x0 + 12, y0 + 318);
		drawLureFlare(c, x0 + w / 2, y0 + 395, 90, t, 1);
	}
	c.restore();
}

let last = 0;
function frame(now: number): void {
	const t = now / 1000;
	const dt = last ? Math.min(0.05, t - last) : 1 / 60;
	last = t;
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	if (view.width !== Math.round(vw * D)) {
		view.width = Math.round(vw * D);
		view.height = Math.round(vh * D);
	}
	ctx.setTransform(D, 0, 0, D, 0, 0);
	world.resize(vw, vh, D);
	const sc = world.scene;
	const lights = [];
	if (st.lure !== 'off') {
		lights.push({
			x: sc.MAZE_X + (lx + 0.5) * 34,
			y: sc.MAZE_Y + (ly + 0.5) * 34,
			r: 34 * 3.2,
			rgb: LURE_RGB,
			alpha: 0.8 + 0.15 * Math.sin(t * 5)
		});
	}
	if (st.alarm && st.rage !== 'off') {
		// the hero's flashlight, as if he stood by the lure
		lights.push({ x: sc.MAZE_X + (lx - 2.5) * 34, y: sc.MAZE_Y + (ly + 0.5) * 34, r: 34 * 3.8, rgb: '236, 242, 230', alpha: 0.95 });
	}
	sc.setExtraLights(lights);
	world.showHive(st.style === 'hive');
	sc.setFilm(st.style === 'hive' ? 'flesh' : 'none');
	world.drawScene(ctx, t, dt, st.inf, true);
	const hero = heroAt(t);
	if (st.style === 'ferro') {
		world.enter(ctx);
		ferro.draw(ctx, st.inf, t);
		ctx.restore();
	}
	world.drawLight(ctx, t, st.inf, st.alarm ? 'alert' : 'quarantine', true);
	if (st.style === 'ferro') {
		world.enter(ctx);
		ferro.drawGlow(ctx, st.inf, t, dt, hero);
		ctx.restore();
	}
	const L = world.layout;
	const S = L.tileSize;
	const ph = ringPhase(t);
	if (ph) {
		ring.lit = ph.lit;
		drawRing(ctx, L, ring, { guide: ph.guide, charge: ph.charge, lit: ph.lit ? 1 : 0, pressed: null, press: 0 }, t);
		for (const p of ring.posts) {
			const g = new RailGait();
			drawPretender(ctx, L.offsetX + (p.x + 0.5) * S, L.offsetY + (p.y + 0.5) * S, S, p.kind, ph.lit ? 'hunt' : 'tell', look(g, 0, 1, t));
		}
	}
	if (st.rage !== 'off' || st.mimic !== 'off') {
		for (const w of walkers) {
			const p = walkerAt(w, t);
			w.gait.update(dt, p.x, p.y, p.dx, p.dy, st.rage !== 'off');
			const o = look(w.gait, p.dx, p.dy, t);
			if (st.mimic !== 'off') drawMimic(ctx, L.offsetX + p.x * S, L.offsetY + p.y * S, S, w.kind, 'hunt', o);
			else drawRage(ctx, L.offsetX + p.x * S, L.offsetY + p.y * S, S, w.kind, o);
		}
	}
	{
		// the game's hero, the Cinnabar vessel, walking his corridor
		const hx = L.offsetX + hero.x * S;
		const hy = L.offsetY + hero.y * S;
		drawHeroGlow(ctx, hx, hy, S);
		heroView.setRadius(S * CJ_BODY_RATIO);
		heroView.update(dt, {
			x: hx,
			y: hy,
			angle: Math.atan2(hero.dy, hero.dx),
			moving: true,
			power: false,
			ending: false
		});
		heroView.draw(ctx);
	}
	if (st.lure !== 'off') drawLureFlare(ctx, L.offsetX + (lx + 0.5) * S, L.offsetY + (ly + 0.5) * S, S, t, 1);
	world.drawGrain(ctx, t);
	ctx.setTransform(D, 0, 0, D, 0, 0);
	panel(ctx, vw, t);
	requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
