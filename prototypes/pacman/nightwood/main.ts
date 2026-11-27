// Prototype: the boss world "light against the dark" (the owner's pick of the ideas, 2026-11-27; a
// night forest after the manner of Alan Wake) on the real maze. A static candidate: the lit forest,
// the hero's torch, the lamps, the fog, the Taken under their shrouds (which burn away in light),
// the Dark Presence in the lair. Pac-Man and the Taken only wander for life; the shroud really
// follows the light (a ray from the lamp or the torch), so the rule can be seen. No play, no AI.
// Art: `forest.ts` (the baked forest), `nightArt.ts` (rays, textures, the Taken, the Presence).
import { GRID_CLASSIC } from '../../../src/games/pacman/config/mazes';
import type { GhostKind } from '../../../src/games/pacman/logic/actors/GhostModel';
import { GAME_FEEL } from '../../../src/games/pacman/render/actors/HeroView';
import { FRUIT_BODY_RATIO, OrangeHero } from '../../../src/games/pacman/render/actors/hero/FruitHero';
import { TAU, bakeForest, clamp, kindOf } from './forest';
import type { Forest } from './forest';
import {
	LightGrid,
	drawFirefly,
	drawFlare,
	drawLampHead,
	drawTaken,
	drawTakenEyes,
	drawTendrils,
	drawVortex,
	makeCloud,
	makeGrain,
	paintLight,
	sees,
	visibility
} from './nightArt';

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const view = $<HTMLCanvasElement>('view');
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);
const GRID = GRID_CLASSIC;
const rows = GRID.length;
const cols = GRID[0].length;
const lightGrid = new LightGrid(GRID);

// ----------------------------------------------------------------------------------- the maze

const walkable = (x: number, y: number): boolean => {
	const t = GRID[y]?.[x];
	return t !== undefined && kindOf(t) === 'open' && t[0] !== '0';
};
const dots: Array<[number, number]> = [];
const flares: Array<[number, number]> = [];
GRID.forEach((row, y) =>
	row.forEach((t, x) => {
		if (t === 'DT') dots.push([x, y]);
		if (t === 'EU') flares.push([x, y]);
	})
);

type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
const VEC: Record<Dir, [number, number]> = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0] };
const BACK: Record<Dir, Dir> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };

/** Wanders tile to tile, never turning back unless at a dead end. */
class Walker {
	x: number;
	y: number;
	dir: Dir;
	u = 0;
	travel = 0;
	constructor(
		x: number,
		y: number,
		dir: Dir,
		readonly speed: number
	) {
		this.x = x;
		this.y = y;
		this.dir = dir;
	}
	get pos(): { x: number; y: number } {
		const [dx, dy] = VEC[this.dir];
		return { x: this.x + 0.5 + dx * this.u, y: this.y + 0.5 + dy * this.u };
	}
	step(dt: number): void {
		this.u += dt * this.speed;
		this.travel += dt * this.speed;
		while (this.u >= 1) {
			this.u -= 1;
			const [dx, dy] = VEC[this.dir];
			this.x += dx;
			this.y += dy;
			const options = (Object.keys(VEC) as Dir[]).filter(
				(d) => d !== BACK[this.dir] && walkable(this.x + VEC[d][0], this.y + VEC[d][1])
			);
			this.dir = options.length ? options[Math.floor(Math.random() * options.length)] : BACK[this.dir];
		}
	}
}
const heroW = new Walker(11, 19, 'LEFT', 3.6);
const takenW: Array<{ kind: GhostKind; w: Walker; shield: number; burn: number }> = [
	{ kind: 'BLINKY', w: new Walker(12, 9, 'LEFT', 2.6), shield: 1, burn: 0 },
	{ kind: 'PINKY', w: new Walker(3, 5, 'RIGHT', 2.6), shield: 1, burn: 0 },
	{ kind: 'INKY', w: new Walker(21, 17, 'LEFT', 2.6), shield: 1, burn: 0 },
	{ kind: 'CLYDE', w: new Walker(6, 23, 'RIGHT', 2.6), shield: 1, burn: 0 }
];
const hero = new OrangeHero();
hero.setFeel(GAME_FEEL);

// ------------------------------------------------------------------------------------ the state

const st = {
	light: 'cone' as 'cone' | 'lamp' | 'off',
	foes: 'auto' as 'auto' | 'dark' | 'burn' | 'bare',
	boss: 'calm' as 'calm' | 'angry',
	fog: true,
	lamps: true
};
const NOTES: Record<string, string> = {
	'foes-auto': 'Враги по свету: под лучом или в круге лампы оболочка тьмы сгорает, в тени снова нарастает.',
	'foes-dark': 'Все во тьме: оболочка цела, видны только холодные глаза.',
	'foes-burn': 'Горят: свет разъедает оболочку, сквозь неё белое свечение и искры.',
	'foes-bare': 'Открыты: оболочки нет, фигура уязвима (бледно-синий ободок).'
};
function pressed(group: string, value: string): void {
	for (const b of document.querySelectorAll<HTMLButtonElement>(`[data-${group}]`))
		b.setAttribute('aria-pressed', String(b.dataset[group] === value));
}
function bind<K extends 'light' | 'foes' | 'boss'>(key: K): void {
	for (const b of document.querySelectorAll<HTMLButtonElement>(`[data-${key}]`))
		b.addEventListener('click', () => {
			(st as Record<string, unknown>)[key] = b.dataset[key];
			pressed(key, String(b.dataset[key]));
			if (key === 'foes') $('note').textContent = NOTES[`foes-${st.foes}`];
		});
}
bind('light');
bind('foes');
bind('boss');
for (const id of ['fog', 'lamps'] as const)
	$(id).addEventListener('click', () => {
		st[id] = !st[id];
		$(id).setAttribute('aria-pressed', String(st[id]));
	});
$('note').textContent = NOTES['foes-auto'];

// ---------------------------------------------------------------------------------- the stage

const cv = (w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] => {
	const c = document.createElement('canvas');
	c.width = Math.max(1, Math.round(w));
	c.height = Math.max(1, Math.round(h));
	return [c, c.getContext('2d') as CanvasRenderingContext2D];
};
const FOG_COOL = makeCloud(256, [150, 178, 198], 3, 4, 0.4, 0.9, 0.55);
const FOG_WARM = makeCloud(256, [236, 206, 168], 3, 4, 0.4, 0.9, 0.9);
const WISP = makeCloud(256, [52, 90, 128], 9, 3, 0.45, 0.92, 0.55);
const GRAIN = makeGrain();
const NIGHT = 'rgba(2,6,12,0.9)';
const COLD_STOPS = [
	[0, 'rgba(0,0,0,1)'],
	[0.28, 'rgba(0,0,0,0.95)'],
	[0.6, 'rgba(0,0,0,0.55)'],
	[0.85, 'rgba(0,0,0,0.16)'],
	[1, 'rgba(0,0,0,0)']
] as const;

let S = 28;
let W = 0;
let H = 0;
let forest: Forest;
let stage: HTMLCanvasElement;
let sc: CanvasRenderingContext2D;
let plainDark: HTMLCanvasElement;
let lampDark: HTMLCanvasElement;
let lampGlow: HTMLCanvasElement;
let moon: HTMLCanvasElement;
let dk: HTMLCanvasElement;
let dc: CanvasRenderingContext2D;
let gl: HTMLCanvasElement;
let gc: CanvasRenderingContext2D;
let lf: HTMLCanvasElement;
let lc: CanvasRenderingContext2D;
let ready = false;

function rebuild(): void {
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	const ctlH = $('ctl').getBoundingClientRect().height;
	S = Math.max(14, Math.floor(Math.min((vw * 0.6) / cols, (vh - ctlH - 28) / rows)));
	W = cols * S;
	H = rows * S;
	view.width = Math.round(vw * D);
	view.height = Math.round(vh * D);
	view.style.width = `${vw}px`;
	view.style.height = `${vh}px`;
	forest = bakeForest(GRID, S, D);
	[stage, sc] = cv(W * D, H * D);
	[dk, dc] = cv(W * D, H * D);
	[gl, gc] = cv(W * D, H * D);
	[lf, lc] = cv(W * D, H * D);
	let c: CanvasRenderingContext2D;
	// the moonlight: the forest again, tinted cold and brightened, added over the dark so that its
	// shapes never vanish
	[moon, c] = cv(W * D, H * D);
	c.drawImage(forest.canvas, 0, 0);
	c.globalCompositeOperation = 'multiply';
	c.fillStyle = 'rgb(105,140,190)';
	c.fillRect(0, 0, W * D, H * D);
	c.globalCompositeOperation = 'lighter';
	c.drawImage(moon, 0, 0);
	[plainDark, c] = cv(W * D, H * D);
	c.fillStyle = NIGHT;
	c.fillRect(0, 0, W * D, H * D);
	// the lamps' light, cast once: darkness with holes, and the warm colour that fills them
	[lampDark, c] = cv(W * D, H * D);
	c.fillStyle = NIGHT;
	c.fillRect(0, 0, W * D, H * D);
	c.setTransform(D, 0, 0, D, 0, 0);
	c.globalCompositeOperation = 'destination-out';
	c.filter = `blur(${D * 1.3}px)`;
	for (const l of forest.lamps) paintLight(c, S, visibility(lightGrid, l.x, l.y, 0, TAU, 180, l.r), l.r, COLD_STOPS);
	[lampGlow, c] = cv(W * D, H * D);
	c.setTransform(D, 0, 0, D, 0, 0);
	c.globalCompositeOperation = 'lighter';
	c.filter = `blur(${D * 1.3}px)`;
	for (const l of forest.lamps)
		paintLight(c, S, visibility(lightGrid, l.x, l.y, 0, TAU, 180, l.r), l.r, [
			[0, 'rgba(255,200,115,0.34)'],
			[0.3, 'rgba(255,172,82,0.2)'],
			[0.65, 'rgba(255,140,60,0.1)'],
			[1, 'rgba(255,120,40,0)']
		]);
	ready = true;
}

/** A tileable texture scrolled across the stage. */
function scroll(c: CanvasRenderingContext2D, tex: HTMLCanvasElement, size: number, ox: number, oy: number): void {
	const pat = c.createPattern(tex, 'repeat');
	if (!pat) return;
	pat.setTransform(new DOMMatrix().translate(ox, oy).scale(size / tex.width));
	c.fillStyle = pat;
	c.fillRect(0, 0, W, H);
}

const angDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

let time = 0;
let last = performance.now();
let heroAng = Math.PI;
let rage = 0;

function frame(now: number): void {
	const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
	last = now;
	requestAnimationFrame(frame);
	if (!ready) return;
	time += dt;
	heroW.step(dt);
	for (const g of takenW) g.w.step(dt);
	const hp = heroW.pos;
	const hv = VEC[heroW.dir];
	heroAng += angDiff(Math.atan2(hv[1], hv[0]), heroAng) * (1 - Math.exp(-dt * 7));
	rage += ((st.boss === 'angry' ? 1 : 0) - rage) * (1 - Math.exp(-dt * 3));
	const flick = 0.93 + 0.07 * Math.sin(time * 11) * Math.sin(time * 2.7);

	// where the light is
	const cone = st.light === 'cone';
	const lamp = st.light === 'lamp';
	const coneR = 8.6;
	const spread = 0.5;
	const lightAt = (x: number, y: number): number => {
		let best = 0;
		if (st.lamps)
			for (const l of forest.lamps) {
				const d = Math.hypot(x - l.x, y - l.y);
				if (d < l.r * 0.85 && sees(lightGrid, l.x, l.y, x, y)) best = Math.max(best, 1 - d / (l.r * 0.85));
			}
		const d = Math.hypot(x - hp.x, y - hp.y);
		if (cone && d < coneR && Math.abs(angDiff(Math.atan2(y - hp.y, x - hp.x), heroAng)) < spread && sees(lightGrid, hp.x, hp.y, x, y))
			best = Math.max(best, 1 - (d / coneR) * 0.7);
		if ((cone || lamp) && d < (lamp ? 4 : 2.4) && sees(lightGrid, hp.x, hp.y, x, y)) best = Math.max(best, 1 - d / (lamp ? 4 : 2.4));
		return best;
	};
	for (const g of takenW) {
		const p = g.w.pos;
		const li = lightAt(p.x, p.y);
		let target = li > 0.22 ? 0 : 1;
		if (st.foes === 'dark') target = 1;
		else if (st.foes === 'bare') target = 0;
		else if (st.foes === 'burn') target = 0.5;
		const k = st.foes === 'auto' ? 2.4 : 14;
		g.shield += (target - g.shield) * (1 - Math.exp(-dt * k));
		g.burn = st.foes === 'burn' ? 1 : st.foes === 'auto' ? clamp(li * 1.2) * (g.shield > 0.03 ? 1 : 0) : 0;
	}

	// ---- the scene
	sc.setTransform(D, 0, 0, D, 0, 0);
	sc.globalCompositeOperation = 'source-over';
	sc.globalAlpha = 1;
	sc.drawImage(forest.canvas, 0, 0, W, H);
	sc.globalCompositeOperation = 'lighter';
	sc.globalAlpha = 0.3;
	sc.drawImage(forest.canvas, 0, 0, W, H);
	sc.globalAlpha = 1;
	sc.globalCompositeOperation = 'source-over';
	if (st.fog) {
		sc.globalCompositeOperation = 'screen';
		sc.globalAlpha = 0.34;
		scroll(sc, FOG_COOL, S * 16, time * 6, time * 2.5);
		sc.globalAlpha = 0.22;
		scroll(sc, FOG_COOL, S * 10, -time * 4 + 40, time * 3.5 + 90);
		sc.globalAlpha = 1;
		sc.globalCompositeOperation = 'source-over';
	}

	// ---- the darkness: the lamps' holes cached, the torch and the lair's own light cut each frame
	dc.setTransform(1, 0, 0, 1, 0, 0);
	dc.globalCompositeOperation = 'copy';
	dc.globalAlpha = 1;
	dc.drawImage(st.lamps ? lampDark : plainDark, 0, 0);
	dc.globalCompositeOperation = 'lighter';
	dc.setTransform(D, 0, 0, D, 0, 0);
	dc.globalAlpha = 0.5;
	scroll(dc, WISP, S * 12, time * 5, -time * 3);
	dc.globalAlpha = 0.4;
	scroll(dc, WISP, S * 7.5, -time * 7 + 30, time * 4);
	dc.globalAlpha = 1;
	dc.globalCompositeOperation = 'destination-out';
	gc.setTransform(1, 0, 0, 1, 0, 0);
	gc.globalCompositeOperation = 'copy';
	gc.globalAlpha = st.lamps ? flick : 0;
	gc.drawImage(lampGlow, 0, 0);
	gc.globalAlpha = 1;
	gc.setTransform(D, 0, 0, D, 0, 0);
	gc.globalCompositeOperation = 'lighter';
	if (cone) {
		const poly = visibility(lightGrid, hp.x, hp.y, heroAng - spread, heroAng + spread, 70, coneR);
		paintLight(dc, S, poly, coneR, COLD_STOPS);
		paintLight(gc, S, poly, coneR, [
			[0, 'rgba(225,238,255,0.5)'],
			[0.35, 'rgba(205,225,255,0.3)'],
			[0.75, 'rgba(180,205,240,0.1)'],
			[1, 'rgba(180,205,240,0)']
		]);
		const core = visibility(lightGrid, hp.x, hp.y, heroAng - 0.14, heroAng + 0.14, 24, coneR + 1.5);
		paintLight(gc, S, core, coneR + 1.5, [
			[0, 'rgba(255,255,255,0.4)'],
			[0.5, 'rgba(235,245,255,0.16)'],
			[1, 'rgba(235,245,255,0)']
		]);
	}
	if (cone || lamp) {
		const r = lamp ? 4 : 2.4;
		const halo = visibility(lightGrid, hp.x, hp.y, 0, TAU, 90, r);
		paintLight(dc, S, halo, r, COLD_STOPS);
		paintLight(gc, S, halo, r, [
			[0, lamp ? 'rgba(255,214,150,0.48)' : 'rgba(215,232,255,0.34)'],
			[0.5, lamp ? 'rgba(255,190,120,0.22)' : 'rgba(200,222,255,0.14)'],
			[1, 'rgba(200,220,255,0)']
		]);
	}
	{
		const lair = visibility(lightGrid, forest.lair.x, forest.lair.y, 0, TAU, 90, 3.9, true);
		paintLight(dc, S, lair, 3.9, COLD_STOPS);
		const k = 0.7 + 0.3 * Math.sin(time * 1.8) + 0.3 * rage;
		paintLight(gc, S, lair, 3.9, [
			[0, `rgba(140,185,255,${0.5 * k})`],
			[0.5, `rgba(90,140,220,${0.26 * k})`],
			[1, 'rgba(70,110,200,0)']
		]);
	}
	sc.setTransform(1, 0, 0, 1, 0, 0);
	sc.globalCompositeOperation = 'source-over';
	sc.drawImage(dk, 0, 0);
	sc.globalCompositeOperation = 'lighter';
	sc.globalAlpha = 0.34;
	sc.drawImage(moon, 0, 0);
	sc.globalAlpha = 1;
	sc.drawImage(gl, 0, 0);
	if (st.fog) {
		// the fog shows where the light is: warm haze in the pools, a cold veil in the beam
		lc.setTransform(1, 0, 0, 1, 0, 0);
		lc.globalCompositeOperation = 'copy';
		lc.clearRect(0, 0, lf.width, lf.height);
		lc.setTransform(D, 0, 0, D, 0, 0);
		lc.globalCompositeOperation = 'source-over';
		lc.globalAlpha = 1;
		scroll(lc, FOG_WARM, S * 16, time * 6, time * 2.5);
		lc.globalAlpha = 0.7;
		scroll(lc, FOG_WARM, S * 10, -time * 4 + 40, time * 3.5 + 90);
		lc.globalAlpha = 1;
		lc.setTransform(1, 0, 0, 1, 0, 0);
		lc.globalCompositeOperation = 'destination-in';
		lc.drawImage(gl, 0, 0);
		sc.drawImage(lf, 0, 0);
	}

	// ---- the Taken: bright as the light on them, dark shapes in the dark
	sc.setTransform(D, 0, 0, D, 0, 0);
	sc.globalCompositeOperation = 'source-over';
	for (const g of takenW) {
		const p = g.w.pos;
		const [dx, dy] = VEC[g.w.dir];
		sc.filter = `brightness(${(0.45 + 0.55 * clamp(lightAt(p.x, p.y) * 1.4, 0, 1)).toFixed(2)})`;
		drawTaken(sc, p.x * S, p.y * S, S * 1.45, g.kind, { time, dx, dy, step: g.w.travel * 5, shield: g.shield, burn: g.burn });
		sc.filter = 'none';
	}
	// ---- what shines in the dark, then the hero, the Presence
	if (st.lamps) forest.lamps.forEach((l, i) => drawLampHead(sc, l.postX * S, l.postY * S, S, time, i * 1.9));
	dots.forEach(([x, y], i) => drawFirefly(sc, (x + 0.5) * S, (y + 0.5) * S, S, time, ((i * 37) % 101) / 101));
	flares.forEach(([x, y], i) => drawFlare(sc, (x + 0.5) * S, (y + 0.5) * S, S, time, i * 2.3));
	for (const g of takenW) {
		const p = g.w.pos;
		const [dx, dy] = VEC[g.w.dir];
		drawTakenEyes(sc, p.x * S, p.y * S, S * 1.45, { time, dx, dy, step: 0, shield: g.shield, burn: g.burn });
	}
	hero.setRadius(S * FRUIT_BODY_RATIO);
	hero.update(dt, { x: hp.x * S, y: hp.y * S, angle: heroAng, moving: true, power: false, ending: false });
	hero.draw(sc);
	if (cone) {
		// the lens of the torch, a hot point ahead of the hero
		sc.globalCompositeOperation = 'lighter';
		const lx = hp.x * S + Math.cos(heroAng) * S * 0.3;
		const ly = hp.y * S + Math.sin(heroAng) * S * 0.3;
		const g = sc.createRadialGradient(lx, ly, 0, lx, ly, S * 0.5);
		g.addColorStop(0, 'rgba(255,255,255,0.95)');
		g.addColorStop(0.2, 'rgba(220,235,255,0.5)');
		g.addColorStop(1, 'rgba(220,235,255,0)');
		sc.fillStyle = g;
		sc.fillRect(lx - S * 0.5, ly - S * 0.5, S, S);
		sc.globalCompositeOperation = 'source-over';
	}
	drawTendrils(sc, S, 0, 0, time, rage, TENDRILS);
	drawVortex(sc, forest.lair.x * S, forest.lair.y * S, S, time, rage);

	// ---- the picture: a vignette, black lifted to a cold blue, grain
	sc.setTransform(D, 0, 0, D, 0, 0);
	const vg = sc.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.78);
	vg.addColorStop(0, 'rgba(0,0,0,0)');
	vg.addColorStop(1, 'rgba(0,0,0,0.6)');
	sc.fillStyle = vg;
	sc.fillRect(0, 0, W, H);
	sc.globalCompositeOperation = 'lighten';
	sc.fillStyle = 'rgb(6,15,24)';
	sc.fillRect(0, 0, W, H);
	sc.globalCompositeOperation = 'overlay';
	sc.globalAlpha = 0.1;
	sc.drawImage(GRAIN, Math.floor((time * 977) % 96) - 96, Math.floor((time * 631) % 96) - 96, W + 192, H + 192);
	sc.globalAlpha = 1;
	sc.globalCompositeOperation = 'source-over';

	// ---- the page: the stage, and two close-ups beside it
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.fillStyle = '#04070b';
	ctx.fillRect(0, 0, vw, vh);
	const x0 = 14;
	const y0 = 10;
	ctx.drawImage(stage, x0, y0, W, H);
	const px = x0 + W + 16;
	const pw = Math.min(vw - px - 14, (H - 40) / 3);
	if (pw > 90) {
		const inset = (cx: number, cy: number, tiles: number, ty: number, label: string) => {
			const src = tiles * S * D;
			const sx = clamp(cx * S * D - src / 2, 0, stage.width - src);
			const sy = clamp(cy * S * D - src / 2, 0, stage.height - src);
			ctx.imageSmoothingEnabled = true;
			ctx.drawImage(stage, sx, sy, src, src, px, ty, pw, pw);
			ctx.strokeStyle = 'rgba(120,160,190,0.5)';
			ctx.strokeRect(px, ty, pw, pw);
			ctx.fillStyle = '#9db6c6';
			ctx.font = '12px "Courier New", monospace';
			ctx.fillText(label, px + 6, ty + 15);
		};
		inset(forest.lair.x, forest.lair.y, 7, y0, 'Тьма');
		inset(hp.x, hp.y, 6, y0 + pw + 20, 'Герой');
		const g0 = takenW[0].w.pos;
		inset(g0.x, g0.y, 5, y0 + 2 * (pw + 20), 'Враг');
	}
}

/** The tendrils' paths, in tiles: out of the gate, along the corridor above the lair, and down. */
const TENDRILS: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
	[
		[12.5, 10.4],
		[12.5, 9.5],
		[9.5, 9.5],
		[8.5, 9.5],
		[8.5, 6.5]
	],
	[
		[12.5, 10.4],
		[12.5, 9.5],
		[15.5, 9.5],
		[16.5, 9.5],
		[16.5, 6.5]
	],
	[
		[12.5, 10.4],
		[12.5, 8.5],
		[12.5, 6.5]
	]
];

let timer = 0;
window.addEventListener('resize', () => {
	clearTimeout(timer);
	timer = window.setTimeout(rebuild, 200);
});
rebuild();
requestAnimationFrame(frame);
