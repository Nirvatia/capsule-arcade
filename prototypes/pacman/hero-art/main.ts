// Prototype: the heroes' art candidates (`./sun.ts`). Left: Pac-Man, one row per candidate (the
// game's as it is, then three coronas with the solar-wind trail), columns rest, run, rage, and the
// run at the game's scale; right: Ms. Pac-Man, the game's and two sets of details.
// Query: ?t=<seconds> simulates that long and freezes (for screenshots).
import { GAME_FEEL } from '../../../src/games/pacman/render/actors/HeroView';
import type { Hero } from '../../../src/games/pacman/render/actors/hero/Hero';
import { PacmanHero } from '../../../src/games/pacman/render/actors/hero/PacmanHero';
import { MsPacmanHero } from '../../../src/games/pacman/render/actors/hero/MsPacmanHero';
import { SunPacman, msClassic, msGlam } from './sun';

const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);
const FROZEN = new URLSearchParams(location.search).has('t') ? Number(new URLSearchParams(location.search).get('t')) : null;
const STEP = 1 / 60;
const TILE = 32;

type Mode = 'rest' | 'run' | 'rage' | 'small';
interface Cell {
	hero: Hero;
	mode: Mode;
	x: number;
	y: number;
	w: number;
	h: number;
	label: string;
	ms?: boolean;
}

const mk = (h: Hero): Hero => {
	h.setFeel(GAME_FEEL);
	return h;
};
const PAC: ReadonlyArray<{ name: string; make: () => Hero }> = [
	{ name: 'now', make: () => mk(new PacmanHero()) },
	{ name: 'A flame ring', make: () => mk(new SunPacman('A')) },
	{ name: 'B sun emblem', make: () => mk(new SunPacman('B')) },
	{ name: 'C pinwheel', make: () => mk(new SunPacman('C')) }
];
const MS: ReadonlyArray<{ name: string; make: () => Hero }> = [
	{ name: 'now', make: () => mk(new MsPacmanHero()) },
	{
		name: 'A beauty mark + pearl earring',
		make: () => {
			const h = mk(new MsPacmanHero());
			h.setOver(msClassic);
			return h;
		}
	},
	{
		name: 'B curl + lash twinkle',
		make: () => {
			const h = mk(new MsPacmanHero());
			h.setOver(msGlam);
			return h;
		}
	}
];

let cells: Cell[] = [];
const PAC_MODES: Mode[] = ['rest', 'run', 'rage', 'small'];
const MS_MODES: Mode[] = ['rest', 'run', 'small'];

function build(vw: number, vh: number): void {
	cells = [];
	const top = 30;
	const leftW = vw * 0.6;
	const rows = PAC.length;
	const ch = (vh - top - 16) / rows;
	const cw = (leftW - 24) / PAC_MODES.length;
	PAC.forEach((c, r) =>
		PAC_MODES.forEach((m, i) =>
			cells.push({ hero: c.make(), mode: m, x: 16 + i * cw, y: top + r * ch, w: cw - 6, h: ch - 6, label: i === 0 ? c.name : '' })
		)
	);
	const rx = leftW + 16;
	const mw = (vw - rx - 16) / MS_MODES.length;
	const mh = (vh - top - 16) / MS.length;
	MS.forEach((c, r) =>
		MS_MODES.forEach((m, i) =>
			cells.push({ hero: c.make(), mode: m, x: rx + i * mw, y: top + r * mh, w: mw - 6, h: mh - 6, label: i === 0 ? c.name : '', ms: true })
		)
	);
}

function place(c: Cell, t: number): { x: number; y: number; angle: number; moving: boolean; R: number } {
	const R = c.mode === 'small' ? TILE * 0.33 : Math.min(c.w, c.h) * (c.ms && c.mode === 'rest' ? 0.32 : 0.2);
	const cx = c.x + c.w / 2;
	const cy = c.y + c.h / 2 + 6;
	if (c.mode === 'rest') return { x: cx, y: cy, angle: 0, moving: false, R };
	const ax = c.w * 0.3;
	const ay = c.h * 0.16;
	const speed = 12 * R;
	const w = (t * speed) / ((ax + ay) / 2);
	return {
		x: cx + Math.cos(w) * ax,
		y: cy + Math.sin(w) * ay,
		angle: Math.atan2(Math.cos(w) * ay, -Math.sin(w) * ax),
		moving: true,
		R
	};
}

function advance(t: number, dt: number): void {
	for (const c of cells) {
		const p = place(c, t);
		c.hero.setRadius(p.R);
		c.hero.update(dt, { x: p.x, y: p.y, angle: p.angle, moving: p.moving, power: c.mode === 'rage', ending: false, season: 'summer' });
	}
}

function draw(vw: number, vh: number): void {
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.fillStyle = '#0c0a10';
	ctx.fillRect(0, 0, vw, vh);
	['rest', 'run', 'rage', 'game scale'].forEach((n, i) => {
		const c = cells[i];
		ctx.fillStyle = 'rgba(255,255,255,.6)';
		ctx.font = '12px "Courier New", monospace';
		ctx.textAlign = 'center';
		ctx.fillText(n, c.x + c.w / 2, 20);
	});
	for (const c of cells) {
		ctx.save();
		ctx.beginPath();
		ctx.roundRect(c.x, c.y, c.w, c.h, 10);
		ctx.clip();
		ctx.fillStyle = c.mode === 'small' ? '#6f4d31' : '#1b1624';
		ctx.fillRect(c.x, c.y, c.w, c.h);
		c.hero.draw(ctx);
		ctx.restore();
		if (c.label) {
			ctx.fillStyle = 'rgba(255,255,255,.85)';
			ctx.font = '600 12px "Courier New", monospace';
			ctx.textAlign = 'left';
			ctx.fillText(c.label, c.x + 8, c.y + 16);
		}
	}
}

let simulated = 0;
let last = -1;
let size = { w: 0, h: 0 };
function frame(now: number): void {
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	if (size.w !== vw || size.h !== vh) {
		size = { w: vw, h: vh };
		view.width = Math.round(vw * D);
		view.height = Math.round(vh * D);
		build(vw, vh);
		simulated = 0;
	}
	if (FROZEN !== null) {
		while (simulated < FROZEN) {
			simulated += STEP;
			advance(simulated, STEP);
		}
	} else {
		const dt = last < 0 ? STEP : Math.min(0.05, (now - last) / 1000);
		last = now;
		simulated += dt;
		advance(simulated, dt);
	}
	draw(vw, vh);
	requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
