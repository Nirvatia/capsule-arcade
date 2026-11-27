// Prototype: the boss world "the cartridge" (a bad retro port; the owner's pick, 2026-11-27) on the
// game's own arcade board (`render/arcade`: pixel art, the CRT pass). A static candidate: the boss
// asleep or angry in the lair, and the world's rules as pictures (tearing, pits, false walls,
// flicker, a lag with its tracking band, the continue screen). Pac-Man and the ghosts only wander
// for life: no play, no AI. Art in `cartridgeArt.ts`.
import { GRID_CLASSIC } from '../../../src/games/pacman/config/mazes';
import type { GhostKind } from '../../../src/games/pacman/logic/actors/GhostModel';
import { ArcadeView } from '../../../src/games/pacman/render/arcade/ArcadeView';
import type { ArcadeScene } from '../../../src/games/pacman/render/arcade/ArcadeView';
import { ArcadeScreen } from '../../../src/games/pacman/render/arcade/ArcadeScreen';
import type { ArcadeDir } from '../../../src/games/pacman/render/arcade/arcadeSprites';
import {
	CART_H,
	CART_W,
	continueScreen,
	drawCartridge,
	drawFakeWall,
	drawPit,
	hash,
	tear,
	trackingBand
} from './cartridgeArt';

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const view = $<HTMLCanvasElement>('view');
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);
const T = 10;

const arcade = new ArcadeView(GRID_CLASSIC);
const screen = new ArcadeScreen();
const raw = document.createElement('canvas');
raw.width = arcade.canvas.width;
raw.height = arcade.canvas.height;
const rawCtx = raw.getContext('2d') as CanvasRenderingContext2D;
rawCtx.imageSmoothingEnabled = false;

// ------------------------------------------------------------------------------------ the maze

const walkable = (x: number, y: number): boolean => {
	const t = GRID_CLASSIC[y]?.[x];
	return t !== undefined && t !== 'WL' && t !== 'ES' && t !== 'LE' && t !== 'LT' && t[0] !== '0';
};
const food = new Map<string, 'dot' | 'energizer'>();
const dots: Array<[number, number]> = [];
GRID_CLASSIC.forEach((row, y) =>
	row.forEach((t, x) => {
		if (t === 'DT') {
			food.set(`${x},${y}`, 'dot');
			dots.push([x, y]);
		}
		if (t === 'EU') food.set(`${x},${y}`, 'energizer');
	})
);
// the rules' tiles: a few dot tiles each, away from the lair and the hero's start
const far = (x: number, y: number) => Math.hypot(x - 12.5, y - 12) > 5 && Math.hypot(x - 12, y - 19) > 3;
const pits = dots.filter(([x, y], i) => far(x, y) && hash(i, 7) < 0.1);
const fakes = dots.filter(([x, y], i) => far(x, y) && hash(i, 13) < 0.1 && !pits.some(([a, b]) => a === x && b === y));

// ----------------------------------------------------------------------------------- the actors

const VEC: Record<ArcadeDir, [number, number]> = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0] };
const BACK: Record<ArcadeDir, ArcadeDir> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };

/** Wanders tile to tile, never turning back unless at a dead end. */
class Walker {
	x: number;
	y: number;
	dir: ArcadeDir;
	u = 0;
	travel = 0;
	constructor(
		x: number,
		y: number,
		dir: ArcadeDir,
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
			const options = (Object.keys(VEC) as ArcadeDir[]).filter(
				(d) => d !== BACK[this.dir] && walkable(this.x + VEC[d][0], this.y + VEC[d][1])
			);
			this.dir = options.length
				? options[Math.floor(Math.random() * options.length)]
				: BACK[this.dir];
		}
	}
}
const pac = new Walker(11, 19, 'LEFT', 6);
const ghosts: Array<{ kind: GhostKind; w: Walker }> = [
	{ kind: 'BLINKY', w: new Walker(12, 9, 'LEFT', 5) },
	{ kind: 'PINKY', w: new Walker(3, 5, 'RIGHT', 5) },
	{ kind: 'INKY', w: new Walker(21, 17, 'LEFT', 5) },
	{ kind: 'CLYDE', w: new Walker(6, 23, 'RIGHT', 5) }
];

// ------------------------------------------------------------------------------------ the state

type Rule = 'clean' | 'glitch' | 'pits' | 'fake' | 'flicker' | 'lag' | 'over';
const NOTES: Record<Rule, string> = {
	clean: 'Чисто. Картридж спит в логове; лабиринт и спрайты те же, что в тайном аркадном уровне игры.',
	glitch: 'Глитч. Экран рвётся полосами, куски цвета инвертируются, блоки копируются не туда.',
	pits: 'Ямы, как в E.T. Тёмные провалы на клетках, края мигают заранее.',
	fake: 'Ложные стены. Мерцающая «стена» с вопросом на самом деле проходима.',
	flicker: 'Мерцание, как на Atari: призраки видны только через кадр.',
	lag: 'Лаг. Картинка замерла, по экрану ползёт полоса трекинга: окно для рывка.',
	over: 'Продолжить? Экран плохой игры с отсчётом 9…0 после гибели.'
};
let rule: Rule = 'clean';
let mood: 'calm' | 'angry' = 'calm';
let crt = true;

function pressed(group: string, value: string): void {
	for (const b of document.querySelectorAll<HTMLButtonElement>(`[data-${group}]`))
		b.setAttribute('aria-pressed', String(b.dataset[group] === value));
}
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-rule]'))
	b.addEventListener('click', () => {
		rule = b.dataset.rule as Rule;
		pressed('rule', rule);
		$('note').textContent = NOTES[rule];
	});
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-mood]'))
	b.addEventListener('click', () => {
		mood = b.dataset.mood as 'calm' | 'angry';
		pressed('mood', mood);
	});
$('crt').addEventListener('click', () => {
	crt = !crt;
	$('crt').setAttribute('aria-pressed', String(crt));
});
$('note').textContent = NOTES.clean;

// ----------------------------------------------------------------------------------- the frame

let time = 0;
let last = performance.now();
let vw = 0;
let vh = 0;
function layout(): void {
	vw = window.innerWidth;
	vh = window.innerHeight;
	view.width = Math.round(vw * D);
	view.height = Math.round(vh * D);
	view.style.width = `${vw}px`;
	view.style.height = `${vh}px`;
}
const LAIR = { x: 125, y: 120 };

function frame(now: number): void {
	const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
	last = now;
	time += dt;
	const stopped = rule === 'lag' || rule === 'over';
	if (!stopped) {
		pac.step(dt);
		for (const g of ghosts) g.w.step(dt);
	}
	const tick = Math.floor(time * 30);
	const blocked = (x: number, y: number) =>
		(rule === 'pits' && pits.some(([a, b]) => a === x && b === y)) ||
		(rule === 'fake' && fakes.some(([a, b]) => a === x && b === y));
	const p = pac.pos;
	const scene: ArcadeScene = {
		time,
		food: (x, y) => (blocked(x, y) ? null : (food.get(`${x},${y}`) ?? null)),
		pac: { x: p.x, y: p.y, dir: pac.dir, travel: pac.travel },
		death: null,
		ghosts:
			rule === 'over'
				? []
				: ghosts
						.map((g, i) => ({ kind: g.kind, ...g.w.pos, dir: g.w.dir, look: 'normal' as const, i }))
						.filter((g) => rule !== 'flicker' || tick % 3 === g.i % 3),
		fruit: null,
		popups: [],
		flash: false,
		frozen: stopped
	};
	arcade.draw(scene);
	rawCtx.drawImage(arcade.canvas, 0, 0);
	// the rules that stand on tiles
	if (rule === 'pits') for (const [x, y] of pits) drawPit(rawCtx, x, y, T, time);
	if (rule === 'fake') for (const [x, y] of fakes) drawFakeWall(rawCtx, x, y, T, time);
	// the boss, asleep or angry in the lair, its label watching the hero
	const shake = mood === 'angry' ? (tick % 2 ? 1 : -1) : 0;
	const bob = Math.round(Math.sin(time * 2));
	const art = drawCartridge({
		mood,
		time,
		lookX: Math.max(-1, Math.min(1, (p.x * T - LAIR.x) / 80)),
		lookY: Math.max(-1, Math.min(1, (p.y * T - LAIR.y) / 80))
	});
	const gx = LAIR.x - CART_W / 2 + shake;
	const gy = LAIR.y - CART_H / 2 + bob;
	const sliding = rule === 'glitch' ? 0.35 : tick % 45 < 3 ? 0.4 : 0;
	if (sliding > 0) {
		for (let y = 0; y < CART_H; y += 2) {
			const dx = hash(Math.floor(time * 10), y) < sliding ? Math.round((hash(tick, y) - 0.5) * 8) : 0;
			rawCtx.drawImage(art, 0, y, CART_W, 2, gx + dx, gy + y, CART_W, 2);
		}
	} else rawCtx.drawImage(art, gx, gy);
	// the passes over the finished board
	if (rule === 'glitch') tear(rawCtx, raw.width, raw.height, time, 1);
	else if (tick % 45 < 3) tear(rawCtx, raw.width, raw.height, time, 0.35);
	if (rule === 'lag') trackingBand(rawCtx, raw.width, raw.height, time);
	if (rule === 'over') continueScreen(rawCtx, raw.width, raw.height, time);

	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.fillStyle = '#000';
	ctx.fillRect(0, 0, vw, vh);
	const top = 12;
	const bottom = (document.getElementById('ctl')?.getBoundingClientRect().height ?? 100) + 20;
	const scale = Math.min((vw * 0.56 - 24) / raw.width, (vh - top - bottom) / raw.height);
	const w = raw.width * scale;
	const h = raw.height * scale;
	const x = 16;
	if (crt) screen.present(ctx, raw, x, top, w, h, D);
	else {
		ctx.imageSmoothingEnabled = false;
		ctx.drawImage(raw, x, top, w, h);
	}
	// the boss magnified at hard pixels, beside the screen
	const zx = x + w + 18;
	const zw = Math.min(vw - zx - 16, h);
	if (zw > 80) {
		const sw = CART_W + 24;
		const sh = CART_H + 24;
		const zs = Math.min(zw / sw, (h * 0.55) / sh);
		ctx.imageSmoothingEnabled = false;
		ctx.fillStyle = '#04030c';
		ctx.fillRect(zx, top, sw * zs, sh * zs);
		ctx.drawImage(raw, LAIR.x - sw / 2, LAIR.y - sh / 2, sw, sh, zx, top, sw * zs, sh * zs);
		ctx.strokeStyle = 'rgba(46,230,214,.6)';
		ctx.strokeRect(zx, top, sw * zs, sh * zs);
		ctx.fillStyle = '#9adcd6';
		ctx.font = '12px "Courier New", monospace';
		ctx.fillText(`босс, ×${zs.toFixed(1)}`, zx, top + sh * zs + 16);
	}
	requestAnimationFrame(frame);
}

window.addEventListener('resize', layout);
layout();
requestAnimationFrame(frame);
