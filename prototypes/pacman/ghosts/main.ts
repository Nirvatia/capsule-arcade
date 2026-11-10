// Throwaway comparison page: the boss and the imps on the hell's real maze, six candidate ways
// to part them from the red world. Every candidate wraps the game's own `HellBlinkyView` and
// `drawImp` (nothing in the game changes): the actor is drawn to a sprite, then dressed.
import { GRID_DOOM } from '../../../src/games/pacman/config/mazes';
import { DoomWorld } from '../../../src/games/pacman/render/doom/DoomWorld';
import { HellBlinkyView } from '../../../src/games/pacman/render/doom/HellBlinkyView';
import type { BossSnapshot } from '../../../src/games/pacman/render/doom/HellBlinkyView';
import { drawImp } from '../../../src/games/pacman/render/doom/HellImpView';
import type { DoomMinionKind } from '../../../src/games/pacman/logic/doom/DoomMinions';
import type { GridLayout } from '../../../src/games/pacman/render/maze/GridView';

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;

const STAGE_W = 1500;
const STAGE_H = 1620;
const stage = document.createElement('canvas');
stage.width = STAGE_W;
stage.height = STAGE_H;
const sctx = stage.getContext('2d') as CanvasRenderingContext2D;
const world = new DoomWorld(GRID_DOOM, [
	{ x: 3, y: 8 },
	{ x: 18, y: 8 },
	{ x: 20, y: 8 }
]);
world.resize(STAGE_W, STAGE_H, 1);
const WL = world.layout;
const T = WL.tileSize;

type Who =
	| { kind: 'boss'; phase: number; echo: boolean }
	| { kind: 'imp'; imp: DoomMinionKind };
const LINEUP: Array<{ who: Who; at: number; pale: string; eye: string }> = [
	{ who: { kind: 'boss', phase: 1, echo: false }, at: 3.5, pale: '#ffe9d2', eye: '255,226,122' },
	{ who: { kind: 'boss', phase: 2, echo: false }, at: 6.5, pale: '#ffd9b0', eye: '255,226,122' },
	{ who: { kind: 'boss', phase: 3, echo: false }, at: 9.5, pale: '#fffbe6', eye: '255,251,216' },
	{ who: { kind: 'boss', phase: 3, echo: true }, at: 12.5, pale: '#efe8ff', eye: '239,232,255' },
	{ who: { kind: 'imp', imp: 'pinky' }, at: 15.5, pale: '#ffe6f4', eye: '255,226,122' },
	{ who: { kind: 'imp', imp: 'inky' }, at: 18.5, pale: '#e2fbff', eye: '255,226,122' },
	{ who: { kind: 'imp', imp: 'clyde' }, at: 21.5, pale: '#fff0d4', eye: '255,226,122' }
];

const bossViews = LINEUP.map(() => new HellBlinkyView());

type Dress = 'shadow' | 'halo' | 'rim' | 'iron' | 'eyes';
interface Candidate {
	readonly tag: string;
	readonly title: string;
	readonly note: string;
	readonly dress: readonly Dress[];
}
const CANDIDATES: readonly Candidate[] = [
	{ tag: 'A', title: 'Как сейчас', note: 'Красный на красном: держится на чёрной линии и жёлтых глазах.', dress: [] },
	{
		tag: 'B',
		title: 'Бледный внешний контур',
		note: 'Тонкая светлая обводка снаружи чёрной линии, цвет свой у каждого (кремовый, розовый, голубой, медовый).',
		dress: ['rim']
	},
	{
		tag: 'C',
		title: 'Ореол цвета героя',
		note: 'Мягкое тёплое свечение вокруг тела, шире и ярче, чем сейчас; у импов в их цвете.',
		dress: ['halo']
	},
	{
		tag: 'D',
		title: 'Чернёное железо',
		note: 'Тело темнеет и теряет красный, горячими остаются глаза и свет (на странице это фильтр: трещины и пузо в игре дали бы отдельный скин).',
		dress: ['iron', 'eyes']
	},
	{ tag: 'E', title: 'Яркие глаза', note: 'Тело прежнее, у глаз большое светлое свечение.', dress: ['eyes'] },
	{ tag: 'F', title: 'Тень на полу', note: 'Тёмный диск-пятно под ногами, оторвёт от пола.', dress: ['shadow'] },
	{
		tag: 'G',
		title: 'Контур + глаза + тень',
		note: 'B, E и F вместе: самый явный вариант.',
		dress: ['rim', 'eyes', 'shadow']
	}
];

const SP = 3 * T; // sprite box: three tiles square, the actor at its centre
function makeSprite(): [HTMLCanvasElement, CanvasRenderingContext2D] {
	const c = document.createElement('canvas');
	c.width = SP;
	c.height = SP;
	return [c, c.getContext('2d') as CanvasRenderingContext2D];
}
const [sprite, spx] = makeSprite();
const [tint, tx] = makeSprite();

function snap(phase: number, echo: boolean): BossSnapshot {
	return {
		x: 0.5,
		y: 0.5,
		phase,
		state: 'CHASE',
		shape: 'normal',
		dir: 'RIGHT',
		progress: 0,
		alpha: 1,
		intro: 1,
		look: 0,
		hit: 0,
		echo
	};
}

function drawActor(i: number, time: number): void {
	spx.clearRect(0, 0, SP, SP);
	const e = LINEUP[i];
	if (e.who.kind === 'boss') {
		const L: GridLayout = { tileSize: T, offsetX: T, offsetY: T };
		bossViews[i].draw(spx, snap(e.who.phase, e.who.echo), L, time);
	} else {
		drawImp(spx, e.who.imp, SP / 2, SP / 2, T, 'RIGHT', time, 1);
	}
}

/** The sprite drawn at (cx, cy) in `c`, dressed by the candidate. */
function place(
	c: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	i: number,
	dress: readonly Dress[]
): void {
	const e = LINEUP[i];
	const x = cx - SP / 2;
	const y = cy - SP / 2;
	if (dress.includes('shadow')) {
		c.save();
		c.fillStyle = 'rgba(0,0,0,.62)';
		c.beginPath();
		c.ellipse(cx, cy + T * 0.36, T * 0.46, T * 0.16, 0, 0, Math.PI * 2);
		c.fill();
		c.restore();
	}
	if (dress.includes('halo')) {
		const g = c.createRadialGradient(cx, cy, T * 0.1, cx, cy, T * 0.82);
		g.addColorStop(0, `rgba(${e.eye},.0)`);
		g.addColorStop(0.55, `rgba(${e.eye},.26)`);
		g.addColorStop(1, `rgba(${e.eye},0)`);
		c.save();
		c.globalCompositeOperation = 'lighter';
		c.fillStyle = g;
		c.fillRect(cx - T, cy - T, T * 2, T * 2);
		c.restore();
	}
	if (dress.includes('rim')) {
		// the silhouette in the pale colour, shifted round, under the actor
		tx.clearRect(0, 0, SP, SP);
		tx.globalCompositeOperation = 'source-over';
		tx.drawImage(sprite, 0, 0);
		tx.globalCompositeOperation = 'source-in';
		tx.fillStyle = e.pale;
		tx.fillRect(0, 0, SP, SP);
		const r = Math.max(1.5, T * 0.055);
		for (let k = 0; k < 12; k += 1) {
			const a = (k / 12) * Math.PI * 2;
			c.drawImage(tint, x + Math.cos(a) * r, y + Math.sin(a) * r);
		}
	}
	if (dress.includes('iron')) {
		c.save();
		c.filter = 'grayscale(0.8) brightness(0.8) contrast(1.15)';
		c.drawImage(sprite, x, y);
		c.restore();
	} else {
		c.drawImage(sprite, x, y);
	}
	if (dress.includes('eyes')) {
		const w = e.who.kind === 'boss' ? T * 0.32 : T * 0.24;
		const ex = w * 0.42;
		const ey = e.who.kind === 'boss' ? T * 0.04 : T * 0.02;
		c.save();
		c.globalCompositeOperation = 'lighter';
		for (const s of [-1, 1]) {
			const gx = cx + s * ex + w * 0.06;
			const gy = cy + ey;
			const g = c.createRadialGradient(gx, gy, 0, gx, gy, T * 0.26);
			g.addColorStop(0, `rgba(${e.eye},.9)`);
			g.addColorStop(0.45, `rgba(${e.eye},.32)`);
			g.addColorStop(1, `rgba(${e.eye},0)`);
			c.fillStyle = g;
			c.fillRect(gx - T * 0.3, gy - T * 0.3, T * 0.6, T * 0.6);
		}
		c.restore();
	}
}

// the strip of the maze round row 8 (rows 7..10), the same for every candidate
const STRIP_X = WL.offsetX + 2 * T;
const STRIP_Y = WL.offsetY + 7 * T;
const STRIP_W = 21 * T;
const STRIP_H = 3 * T;
const list = $('list');
const canvases = CANDIDATES.map((cand) => {
	const sec = document.createElement('section');
	sec.innerHTML = `<h2><b>${cand.tag}</b>${cand.title}</h2><p>${cand.note}</p>`;
	const c = document.createElement('canvas');
	c.width = Math.round(STRIP_W);
	c.height = Math.round(STRIP_H);
	sec.appendChild(c);
	list.appendChild(sec);
	return c.getContext('2d') as CanvasRenderingContext2D;
});

let night = false;
$('night').addEventListener('click', () => {
	night = !night;
	$('night').setAttribute('aria-pressed', String(night));
	world.setMood(false, night);
});
$('gray').addEventListener('click', () => {
	const on = $('gray').getAttribute('aria-pressed') !== 'true';
	$('gray').setAttribute('aria-pressed', String(on));
	document.body.classList.toggle('gray', on);
});

let last = performance.now();
let time = 0;
function frame(now: number): void {
	const dt = Math.min(0.05, (now - last) / 1000);
	last = now;
	time += dt;
	world.update(dt);
	world.drawWorld(sctx);
	world.drawMood(sctx, []);
	for (let i = 0; i < LINEUP.length; i += 1) {
		drawActor(i, time);
		// the sprite is kept per actor only for this pass: dress it for every candidate
		CANDIDATES.forEach((cand, k) => {
			const c = canvases[k];
			if (i === 0) {
				c.drawImage(stage, STRIP_X, STRIP_Y, STRIP_W, STRIP_H, 0, 0, STRIP_W, STRIP_H);
			}
			place(c, (LINEUP[i].at - 2) * T, 1.5 * T, i, cand.dress);
		});
	}
	requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
