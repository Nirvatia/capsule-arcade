// Prototype: the heroes as the game draws them: Pac-Man the sun with the pinwheel corona, Ms.
// Pac-Man the white comet with the ice bow (the owner's picks). First screen: the contact sheet,
// rows the heroes, columns the moments (rest, run, a turn, a bite, the rage, the game's 1:1
// scale) on the real season corridor (`MeadowWorld`).
// "Живое": the hero runs a route through the real maze, with a x4 magnifier.
// Every switch is a button; for scripts the same choices work as a query:
// ?mode=sheet|live &who=both|pac|ms &season=… &zoom=2|3|4 &v=<id> &rage=0|1 &speed=1|0.25
import { GRID_01 } from '../../../src/games/pacman/config/mazes';
import { GAME_FEEL } from '../../../src/games/pacman/render/actors/HeroView';
import type { Hero } from '../../../src/games/pacman/render/actors/hero/Hero';
import { MsPacmanHero } from '../../../src/games/pacman/render/actors/hero/MsPacmanHero';
import { CORONA_REACH as REACH, PacmanHero } from '../../../src/games/pacman/render/actors/hero/PacmanHero';
import { MeadowWorld } from '../../../src/games/pacman/render/seasons/meadow/MeadowWorld';
import type { MeadowTheme } from '../../../src/games/pacman/render/seasons/meadow/MeadowTheme';
import { meadowThemeFor } from '../../../src/games/pacman/render/seasons/meadow/meadowThemes';
import { Bar } from '../common/ui';
import { EmberAshHero, FrostMistHero, HF_BODY_RATIO } from './geminiHeatFrost';
import { CinnabarHero } from '../../../src/games/pacman/render/actors/hero/CinnabarHero';
import { JadeHero } from '../../../src/games/pacman/render/actors/hero/JadeHero';
import { CJ_BODY_RATIO } from '../../../src/games/pacman/render/actors/hero/vesselHero';

type Season = 'spring' | 'summer' | 'autumn' | 'winter';
interface Cand {
	readonly id: string;
	readonly name: string;
	readonly ms: boolean;
	readonly make: () => Hero;
	/** Body radius in tiles (the game's 0.33 by default). */
	readonly r?: number;
}
const mk = (h: Hero): Hero => {
	h.setFeel(GAME_FEEL);
	return h;
};
const CANDS: readonly Cand[] = [
	{ id: 'pac', name: 'Pac-Man: солнце', ms: false, make: () => mk(new PacmanHero()) },
	{ id: 'ms', name: 'Ms. Pac-Man: комета', ms: true, make: () => mk(new MsPacmanHero()) },
	{ id: 'cin', name: 'Pac-Man: киноварь (макет)', ms: false, r: CJ_BODY_RATIO, make: () => mk(new CinnabarHero()) },
	{ id: 'jade', name: 'Ms. Pac-Man: нефрит (макет)', ms: true, r: CJ_BODY_RATIO, make: () => mk(new JadeHero()) },
	{ id: 'g-heat', name: 'Gemini: Пламя', ms: false, r: HF_BODY_RATIO, make: () => mk(new EmberAshHero() as Hero) },
	{ id: 'g-frost', name: 'Gemini: Пар', ms: true, r: HF_BODY_RATIO, make: () => mk(new FrostMistHero() as Hero) }
];

const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);

const bar = new Bar(
	[
		{ key: 'mode', label: 'вид', options: [{ id: 'sheet', label: 'сетка: варианты × моменты' }, { id: 'portrait', label: 'портреты' }, { id: 'live', label: 'живое' }] },
		{ key: 'who', label: 'герои', options: [{ id: 'both', label: 'оба' }, { id: 'pac', label: 'Pac-Man' }, { id: 'ms', label: 'Ms. Pac-Man' }] },
		{ key: 'season', label: 'коридор', options: [{ id: 'spring', label: 'весна' }, { id: 'summer', label: 'лето' }, { id: 'autumn', label: 'осень' }, { id: 'winter', label: 'зима' }] },
		{ key: 'zoom', label: 'крупно', options: [{ id: '2', label: '×2' }, { id: '3', label: '×3' }, { id: '4', label: '×4' }] },
		{ key: 'v', label: 'живое: герой', options: CANDS.map((c) => ({ id: c.id, label: c.name })) },
		{ key: 'rage', label: 'энерджайзер', options: [{ id: '0', label: 'нет' }, { id: '1', label: 'да' }] },
		{ key: 'speed', label: 'скорость', options: [{ id: '1', label: '1×' }, { id: '0.25', label: '¼×' }] }
	],
	{ mode: 'sheet', who: 'both', season: 'summer', zoom: '3', v: 'pac', rage: '0', speed: '1' },
	() => {
		dirty = true;
		liveHero = null;
	}
);

// the season's world, baked once per season at 3x (crops are scaled up to x4)
const WV = { w: 900, h: 1000 };
const BAKE = 3;
const worlds = new Map<Season, { canvas: HTMLCanvasElement; world: MeadowWorld }>();
function worldOf(season: Season) {
	let w = worlds.get(season);
	if (w) return w;
	const world = new MeadowWorld(GRID_01, meadowThemeFor(season) as MeadowTheme);
	world.resize(WV.w, WV.h, BAKE);
	world.setMood(0, 0);
	world.setLairGate(0);
	for (let i = 0; i < 30; i += 1) world.update(0.1);
	const canvas = document.createElement('canvas');
	canvas.width = WV.w * BAKE;
	canvas.height = WV.h * BAKE;
	const g = canvas.getContext('2d') as CanvasRenderingContext2D;
	g.setTransform(BAKE, 0, 0, BAKE, 0, 0);
	world.drawWorld(g);
	// the dots along the run rows are eaten (he has just run over them)
	world.drawFood(g, (x, y) => (y === 24 && x <= 17) || (y === 2 && x >= 3 && x <= 10) || (x === 10 && y <= 4));
	w = { canvas, world };
	worlds.set(season, w);
	return w;
}
const season = () => bar.get('season') as Season;
const L = () => worldOf(season()).world.layout;

// ------------------------------------------------------------------- scripted moments

interface Pose {
	x: number;
	y: number;
	angle: number;
	moving: boolean;
	power: boolean;
}
type Moment = 'rest' | 'run' | 'turn' | 'bite' | 'rage' | 'game';
const MOMENTS: ReadonlyArray<{ id: Moment; name: string; t: number }> = [
	{ id: 'rest', name: 'покой', t: 2.4 },
	{ id: 'run', name: 'бег', t: 1.3 },
	{ id: 'turn', name: 'поворот (+0.15 с)', t: 0 },
	{ id: 'bite', name: 'укус', t: 1.58 },
	{ id: 'rage', name: 'рейдж (энерджайзер)', t: 1.6 },
	{ id: 'game', name: 'игра 1:1', t: 1.3 }
];
const SPEED = 7;
// row 24 runs from column 2 to 22; row 2 from 2 to 10, then column 10 goes down to row 4
const TURN_AT = (10 - 3.5) / SPEED;

/** Where the hero is at `t` in a moment's script (tile-centre coordinates). */
function pose(m: Moment, t: number): Pose {
	if (m === 'rest' || m === 'bite') return { x: 6.5, y: 24.5, angle: 0, moving: false, power: false };
	if (m === 'turn') {
		if (t < TURN_AT) return { x: 3.5 + SPEED * t, y: 2.5, angle: 0, moving: true, power: false };
		return { x: 10.5, y: Math.min(4.5, 2.5 + SPEED * (t - TURN_AT)), angle: Math.PI / 2, moving: true, power: false };
	}
	return { x: 2.5 + SPEED * (m === 'rage' ? 1.15 : 1) * t, y: 24.5, angle: 0, moving: true, power: m === 'rage' && t > 0.3 };
}

/** Plays a fresh hero through the moment's script and returns it frozen at the moment. */
function played(c: Cand, m: Moment, t1: number, S: number, ox: number, oy: number): Hero {
	const h = c.make();
	h.setRadius(S * (c.r ?? 0.33));
	const dt = 1 / 60;
	let lastAngle = 0;
	for (let t = 0; t <= t1 + 1e-6; t += dt) {
		const p = pose(m, t);
		if (Math.abs(p.angle - lastAngle) > 0.5) h.turnKick(lastAngle);
		lastAngle = p.angle;
		if (m === 'bite' && Math.abs(t - 1.5) < dt / 2) h.eat();
		h.update(dt, { x: ox + p.x * S, y: oy + p.y * S, angle: p.angle, moving: p.moving, power: p.power, ending: false, season: season() });
	}
	return h;
}

let vw = 0;
let vh = 0;
let dirty = true;

function label(text: string, x: number, y: number, size = 12, align: CanvasTextAlign = 'left'): void {
	ctx.font = `600 ${size}px system-ui, sans-serif`;
	ctx.textAlign = align;
	ctx.fillStyle = 'rgba(0,0,0,.6)';
	ctx.fillText(text, x + 1, y + 1);
	ctx.fillStyle = 'rgba(255,245,235,.92)';
	ctx.fillText(text, x, y);
}

/** One crop of the season world with a hero, `z` css px per world px. */
function cell(x: number, y: number, w: number, h: number, c: Cand, m: Moment, t: number, z: number): void {
	const lay = L();
	const S = lay.tileSize;
	const hero = played(c, m, t, S, lay.offsetX, lay.offsetY);
	const p = pose(m, t);
	const hx = lay.offsetX + p.x * S;
	const hy = lay.offsetY + p.y * S;
	// the hero a little ahead of the centre, so what trails him shows
	const back = m === 'rest' || m === 'bite' ? 0 : (w / z) * 0.18;
	// the turn: the corner in the middle, so the bent trail and the hero both show
	const cx = m === 'turn' ? lay.offsetX + 10 * S : hx - Math.cos(p.angle) * back;
	const cy = m === 'turn' ? lay.offsetY + 3.3 * S : hy - Math.sin(p.angle) * back;
	ctx.save();
	ctx.beginPath();
	ctx.rect(x, y, w, h);
	ctx.clip();
	ctx.translate(x + w / 2, y + h / 2);
	ctx.scale(z, z);
	ctx.translate(-cx, -cy);
	ctx.drawImage(worldOf(season()).canvas, 0, 0, WV.w, WV.h);
	// the hero's own tile, dashed (the corona must stay inside it)
	if (m !== 'game') {
		ctx.strokeStyle = 'rgba(255,255,255,.35)';
		ctx.setLineDash([3 / z, 3 / z]);
		ctx.lineWidth = 1 / z;
		ctx.strokeRect(hx - S / 2, hy - S / 2, S, S);
		ctx.setLineDash([]);
	}
	hero.draw(ctx);
	ctx.restore();
	ctx.strokeStyle = 'rgba(255,255,255,.18)';
	ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function sheet(): void {
	const who = bar.get('who');
	const rows = CANDS.filter((c) => who === 'both' || (who === 'ms') === c.ms);
	const top = bar.height + 22;
	const left = 150;
	const cw = (vw - left - 8) / MOMENTS.length;
	const ch = (vh - top - 8) / rows.length;
	const z = Number(bar.get('zoom'));
	ctx.fillStyle = '#0d0c10';
	ctx.fillRect(0, 0, vw, vh);
	MOMENTS.forEach((m, i) => label(m.id === 'game' ? m.name : `${m.name}  ×${z}`, left + i * cw + cw / 2, top - 6, 12, 'center'));
	rows.forEach((c, j) => {
		label(c.name, 8, top + j * ch + ch / 2, 13);
		MOMENTS.forEach((m, i) => {
			const t = m.id === 'turn' ? TURN_AT + 0.15 : m.t;
			cell(left + i * cw + 2, top + j * ch + 2, cw - 4, ch - 4, c, m.id, t, m.id === 'game' ? 1 : z);
		});
	});
	bar.setNote(`пунктир: тайл героя. Корона и свечение не выходят за ${REACH} радиуса (CORONA_REACH игры). Бег 7 т/с, рейдж ×1.15.`);
}

// ----------------------------------------------------------------------------- live

// a route through the real maze, run there and back (corners at path tiles; checked below)
const ROUTE: ReadonlyArray<[number, number]> = [
	[2, 24],
	[22, 24],
	[22, 18],
	[16, 18],
	[16, 8],
	[8, 8]
];
for (let i = 1; i < ROUTE.length; i += 1) {
	const [x0, y0] = ROUTE[i - 1];
	const [x1, y1] = ROUTE[i];
	const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
	for (let k = 0; k <= n; k += 1) {
		const x = x0 + Math.sign(x1 - x0) * k;
		const y = y0 + Math.sign(y1 - y0) * k;
		if (GRID_01[y][x] === 'WL') console.error('hero-art: the route crosses a wall at', x, y);
	}
}
const legs = ROUTE.slice(1).map((p, i) => Math.abs(p[0] - ROUTE[i][0]) + Math.abs(p[1] - ROUTE[i][1]));
const routeLen = legs.reduce((a, b) => a + b, 0);
function routeAt(d: number): { x: number; y: number; angle: number } {
	const total = routeLen * 2;
	let s = ((d % total) + total) % total;
	const fwd = s <= routeLen;
	if (!fwd) s = total - s;
	for (let i = 0; i < legs.length; i += 1) {
		if (s <= legs[i] || i === legs.length - 1) {
			const [x0, y0] = ROUTE[i];
			const [x1, y1] = ROUTE[i + 1];
			const k = Math.min(1, s / legs[i]);
			const ang = Math.atan2(y1 - y0, x1 - x0) + (fwd ? 0 : Math.PI);
			return { x: x0 + (x1 - x0) * k + 0.5, y: y0 + (y1 - y0) * k + 0.5, angle: ang };
		}
		s -= legs[i];
	}
	return { x: 2.5, y: 24.5, angle: 0 };
}

let liveHero: Hero | null = null;
let liveD = 0;
let lastAngle = 0;
let last = -1;
function live(now: number): void {
	const c = CANDS.find((x) => x.id === bar.get('v')) ?? CANDS[1];
	const lay = L();
	const S = lay.tileSize;
	if (!liveHero) {
		liveHero = c.make();
		liveHero.setRadius(S * (c.r ?? 0.33));
	}
	const dt = last < 0 ? 0 : Math.min(0.05, (now - last) / 1000) * Number(bar.get('speed'));
	last = now;
	const rage = bar.get('rage') === '1';
	liveD += dt * SPEED * (rage ? 1.15 : 1);
	const p = routeAt(liveD);
	const ang = p.angle;
	if (Math.abs(Math.atan2(Math.sin(ang - lastAngle), Math.cos(ang - lastAngle))) > 0.5) liveHero.turnKick(lastAngle);
	lastAngle = ang;
	liveHero.update(dt, { x: lay.offsetX + p.x * S, y: lay.offsetY + p.y * S, angle: ang, moving: true, power: rage, ending: false, season: season() });
	const top = bar.height;
	ctx.fillStyle = '#0d0c10';
	ctx.fillRect(0, 0, vw, vh);
	const z = Math.min((vw * 0.5) / WV.w, (vh - top) / WV.h);
	ctx.save();
	ctx.translate(8, top);
	ctx.scale(z, z);
	ctx.drawImage(worldOf(season()).canvas, 0, 0, WV.w, WV.h);
	liveHero.draw(ctx);
	ctx.restore();
	// the magnifier, x4, following him
	const mx = WV.w * z + 20;
	const mw = vw - mx - 10;
	const mh = vh - top - 20;
	const hx = lay.offsetX + p.x * S;
	const hy = lay.offsetY + p.y * S;
	ctx.save();
	ctx.beginPath();
	ctx.rect(mx, top + 10, mw, mh);
	ctx.clip();
	ctx.translate(mx + mw / 2, top + 10 + mh / 2);
	ctx.scale(4, 4);
	ctx.translate(-hx, -hy);
	ctx.drawImage(worldOf(season()).canvas, 0, 0, WV.w, WV.h);
	liveHero.draw(ctx);
	ctx.restore();
	label(`${c.name}  ×4`, mx + 8, top + 30, 13);
	bar.setNote('');
}

/** Big, on a plain ground: every candidate at rest, running and in the rage (R = 0.33 tile x 6). */
function portraits(): void {
	const who = bar.get('who');
	const rows = CANDS.filter((c) => who === 'both' || (who === 'ms') === c.ms);
	const top = bar.height + 22;
	const left = 150;
	const cols = ['rest', 'run', 'rage'] as const;
	const cw = (vw - left - 8) / cols.length;
	const ch = (vh - top - 8) / rows.length;
	const R = Math.min(ch / 3.4, cw / 6);
	ctx.fillStyle = '#0d0c10';
	ctx.fillRect(0, 0, vw, vh);
	['покой', 'бег (вправо)', 'рейдж, бег'].forEach((n, i) => label(n, left + i * cw + cw / 2, top - 6, 12, 'center'));
	rows.forEach((c, j) => {
		label(c.name, 8, top + j * ch + ch / 2, 13);
		cols.forEach((m, i) => {
			const x = left + i * cw;
			const y = top + j * ch;
			ctx.fillStyle = '#5a4630';
			ctx.fillRect(x + 2, y + 2, cw - 4, ch - 4);
			const h = c.make();
			h.setRadius(R);
			const cx = x + cw * 0.62;
			const cy = y + ch / 2;
			const run = m !== 'rest';
			for (let t = 0; t <= 2; t += 1 / 60) {
				const px = run ? cx - (2 - t) * (R / 0.33) * SPEED : cx;
				h.update(1 / 60, { x: px, y: cy, angle: 0, moving: run, power: m === 'rage' && t > 0.3, ending: false, season: season() });
			}
			ctx.save();
			ctx.beginPath();
			ctx.rect(x + 2, y + 2, cw - 4, ch - 4);
			ctx.clip();
			ctx.strokeStyle = 'rgba(255,255,255,.3)';
			ctx.setLineDash([4, 4]);
			ctx.strokeRect(cx - R / 0.66, cy - R / 0.66, R / 0.33, R / 0.33);
			ctx.setLineDash([]);
			h.draw(ctx);
			ctx.restore();
		});
	});
	bar.setNote('пунктир: тайл героя (радиус героя 0.33 тайла)');
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
		if (bar.get('mode') === 'portrait') portraits();
		else sheet();
		dirty = false;
	}
	requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// for scripts: how far each hero's corona / coma and glow reach (body radii), the trail left
// out; and how wide the comet's tails spread across the run line (tiles)
(window as unknown as Record<string, unknown>).__measureHero = (id: string) => {
	const c = CANDS.find((x) => x.id === id) as Cand;
	const R = 60;
	const S = R / 0.33;
	const size = Math.ceil(R * 8);
	const cv = document.createElement('canvas');
	cv.width = size;
	cv.height = size;
	const g = cv.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
	const out: Record<string, number> = {};
	for (const st of ['rest', 'run', 'rage-run', 'rage-rest'] as const) {
		const h = c.make() as Hero & { bare?: boolean };
		h.setRadius(R);
		if ('bare' in h) h.bare = true;
		const running = st === 'run' || st === 'rage-run';
		// the game's heroes keep their trail: measure them standing only
		if (running && !('bare' in h)) continue;
		let reach = 0;
		for (let t = 0; t < 2.5; t += 1 / 60) {
			const x = size / 2 + (running ? (t - 2.5) * 0 : 0);
			h.update(1 / 60, { x, y: size / 2, angle: 0, moving: running, power: st.startsWith('rage') && t > 0.2, ending: false, season: 'summer' });
			if (t < 1.6 || Math.round(t * 60) % 6) continue;
			g.clearRect(0, 0, size, size);
			h.draw(g);
			const d = g.getImageData(0, 0, size, size).data;
			for (let yy = 0; yy < size; yy += 1) {
				for (let xx = 0; xx < size; xx += 1) {
					if (d[(yy * size + xx) * 4 + 3] < 12) continue;
					reach = Math.max(reach, Math.hypot(xx + 0.5 - size / 2, yy + 0.5 - size / 2) / R);
				}
			}
		}
		out[st] = Number(reach.toFixed(3));
	}
	// the comet's tails across the run: a real run, everything drawn
	if (c.ms) {
		const h = c.make();
		h.setRadius(R);
		let across = 0;
		const W = Math.ceil(S * 8);
		const tc = document.createElement('canvas');
		tc.width = W;
		tc.height = Math.ceil(S * 2);
		const tg = tc.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
		const cy = tc.height / 2;
		for (let t = 0; t < 1.2; t += 1 / 60) {
			h.update(1 / 60, { x: S + t * SPEED * S * 0.8, y: cy, angle: 0, moving: true, power: false, ending: false, season: 'summer' });
		}
		tg.clearRect(0, 0, W, tc.height);
		h.draw(tg);
		const d = tg.getImageData(0, 0, W, tc.height).data;
		for (let yy = 0; yy < tc.height; yy += 1) {
			for (let xx = 0; xx < W; xx += 1) if (d[(yy * W + xx) * 4 + 3] >= 12) across = Math.max(across, Math.abs(yy + 0.5 - cy) / S);
		}
		out.tailsAcrossTiles = Number(across.toFixed(3));
	}
	return out;
};
