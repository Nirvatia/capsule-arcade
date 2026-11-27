// Mock-ups on the game's own hell world: (1) the food for the empty maze, three candidates; (2) the
// boss splitting into four ghosts, the weapon shut off and the game plain Pac-Man, in four moments.
// Static frames, buttons only. Nothing here is game code.
import { GRID_DOOM } from '../../../src/games/pacman/config/mazes';
// the owner's drawn hell maze still has its dots: the game turns them into floor (`config/mazes/doom.ts`)
import { GRID_DOOM as DRAWN } from '../../../src/games/pacman/config/mazes/grid_doom';
import { OrangeHero } from '../../../src/games/pacman/render/actors/hero/FruitHero';
import { chargePainter } from '../../../src/games/pacman/render/actors/hero/heroCharge';
import { sigil } from '../../../src/games/pacman/render/doom/attackArt';
import { DoomWorld } from '../../../src/games/pacman/render/doom/DoomWorld';
import { drawImp } from '../../../src/games/pacman/render/doom/HellImpView';
import type { BossSnapshot } from '../../../src/games/pacman/render/doom/HellBlinkyView';
import { HellBlinkyView } from '../../../src/games/pacman/render/doom/HellBlinkyView';
import { INK } from '../../../src/games/pacman/render/doom/hellGhost';
import { pickupSprite } from '../../../src/games/pacman/render/doom/DoomSprites';
import { drawFood } from './food';
import type { FoodKind } from './food';

type Frame = 'food' | 'telegraph' | 'split' | 'chase' | 'return';
const D = Math.min(window.devicePixelRatio || 1, 2);
const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const world = new DoomWorld(GRID_DOOM, []);
const bossView = new HellBlinkyView();
const hero = new OrangeHero();
hero.setOver(chargePainter);

let food: FoodKind = 'soul';
let frame: Frame = 'food';
let w = 0;
let h = 0;

const FOODS: Array<[FoodKind, string]> = [
	['soul', 'Души'],
	['bone', 'Кости'],
	['eye', 'Глаза']
];
const FRAMES: Array<[Frame, string]> = [
	['telegraph', '1 Предвестие'],
	['split', '2 Распад'],
	['chase', '3 Пакман'],
	['return', '4 Возврат']
];
const GHOST = ['#ff3a2a', '#e0388e', '#1fa8d0', '#ee7a1e'] as const;

const bar = document.getElementById('bar') as HTMLElement;
const buttons: Array<{ el: HTMLButtonElement; on: () => boolean }> = [];
function group(title: string): HTMLElement {
	const g = document.createElement('div');
	g.className = 'grp';
	g.innerHTML = `<b>${title}</b>`;
	bar.append(g);
	return g;
}
function add(parent: HTMLElement, label: string, on: () => boolean, click: () => void): void {
	const el = document.createElement('button');
	el.type = 'button';
	el.textContent = label;
	el.addEventListener('click', () => {
		click();
		refresh();
	});
	parent.append(el);
	buttons.push({ el, on });
}
const g1 = group('Еда');
for (const [k, label] of FOODS) {
	add(g1, label, () => frame === 'food' && food === k, () => {
		food = k;
		frame = 'food';
	});
}
const g2 = group('Фаза распада');
for (const [k, label] of FRAMES) {
	add(g2, label, () => frame === k, () => (frame = k));
}
function refresh(): void {
	for (const b of buttons) b.el.setAttribute('aria-pressed', String(b.on()));
}
refresh();

function layout(): void {
	w = view.clientWidth;
	h = view.clientHeight;
	view.width = Math.round(w * D);
	view.height = Math.round(h * D);
	world.resize(w, h, D);
}
window.addEventListener('resize', layout);
layout();

const snap = (x: number, y: number, state: BossSnapshot['state'], shape: BossSnapshot['shape'], look: number): BossSnapshot => ({
	x,
	y,
	phase: 3,
	state,
	shape,
	dir: 'LEFT',
	progress: 0,
	alpha: 1,
	intro: 1,
	look,
	hit: 0,
	echo: false
});

/** Food on every corridor tile of the real maze, but not under the pickups and the lair. */
function drawFoodField(L: { tileSize: number; offsetX: number; offsetY: number }, time: number, hx: number, hy: number): void {
	const S = L.tileSize;
	for (let r = 0; r < DRAWN.length; r += 1) {
		for (let c = 0; c < DRAWN[0].length; c += 1) {
			if (DRAWN[r][c] !== 'DT') continue;
			const x = L.offsetX + (c + 0.5) * S;
			const y = L.offsetY + (r + 0.5) * S;
			// the bones lie along their corridor
			const horiz = DRAWN[r][c - 1] === 'DT' || DRAWN[r][c + 1] === 'DT';
			drawFood(ctx, food, c, r, x, y, S, time, Math.atan2(hy - (r + 0.5), hx - (c + 0.5)), horiz ? 0 : Math.PI / 2);
		}
	}
}

function pellets(L: { tileSize: number; offsetX: number; offsetY: number }, time: number): void {
	const S = L.tileSize;
	for (const [c, r] of [
		[2, 2],
		[22, 2],
		[2, 24],
		[22, 24]
	]) {
		const x = L.offsetX + (c + 0.5) * S;
		const y = L.offsetY + (r + 0.5) * S;
		const k = 1 + 0.1 * Math.sin(time * 5 + c);
		const g = ctx.createRadialGradient(x, y, 0, x, y, S * 0.7);
		g.addColorStop(0, 'rgba(255,228,150,.8)');
		g.addColorStop(1, 'rgba(255,228,150,0)');
		ctx.fillStyle = g;
		ctx.fillRect(x - S * 0.7, y - S * 0.7, S * 1.4, S * 1.4);
		ctx.beginPath();
		ctx.arc(x, y, S * 0.26 * k, 0, 7);
		ctx.fillStyle = '#ffe9a8';
		ctx.fill();
		ctx.lineWidth = Math.max(1.6, S * 0.04);
		ctx.strokeStyle = INK;
		ctx.stroke();
	}
}

/** The weapon slot in the corner: lit, warning, or shut off. */
function weaponSlot(L: { tileSize: number; offsetX: number; offsetY: number }, mode: 'on' | 'warn' | 'off', time: number): void {
	const S = L.tileSize;
	const s = S * 2.1;
	const x = L.offsetX;
	const y = L.offsetY - s - S * 0.6;
	ctx.fillStyle = 'rgba(14,6,8,.85)';
	ctx.beginPath();
	ctx.roundRect(x, y, s, s, 8);
	ctx.fill();
	ctx.lineWidth = 2.4;
	ctx.strokeStyle = mode === 'warn' ? (Math.floor(time * 6) % 2 ? '#ffb02e' : '#7a4a10') : mode === 'off' ? '#5a2a2c' : '#e0483c';
	ctx.stroke();
	ctx.globalAlpha = mode === 'off' ? 0.28 : 1;
	ctx.drawImage(pickupSprite('bfg').icon, x + s * 0.12, y + s * 0.12, s * 0.76, s * 0.76);
	ctx.globalAlpha = 1;
	if (mode === 'off') {
		ctx.strokeStyle = '#ff3a2a';
		ctx.lineWidth = 4;
		ctx.beginPath();
		ctx.moveTo(x + s * 0.18, y + s * 0.82);
		ctx.lineTo(x + s * 0.82, y + s * 0.18);
		ctx.stroke();
	}
	ctx.fillStyle = mode === 'on' ? '#efe0d8' : mode === 'warn' ? '#ffb02e' : '#ff6a5a';
	ctx.font = `700 ${S * 0.55}px "Arial Narrow",system-ui,sans-serif`;
	ctx.textAlign = 'center';
	ctx.fillText(mode === 'on' ? 'BFG' : mode === 'warn' ? 'ОТКЛЮЧАЕТСЯ' : 'ОТКЛЮЧЕНО', x + s / 2, y + s + S * 0.62);
	ctx.textAlign = 'start';
}

/** A banner and a bar at the top of the board. */
function banner(L: { tileSize: number; offsetX: number; offsetY: number }, text: string, sub: string, bar: number | null): void {
	const S = L.tileSize;
	const cx = L.offsetX + (GRID_DOOM[0].length * S) / 2;
	const y = L.offsetY - S * 1.6;
	ctx.textAlign = 'center';
	ctx.font = `700 ${S * 1.15}px "Arial Narrow",system-ui,sans-serif`;
	ctx.lineWidth = 5;
	ctx.strokeStyle = INK;
	ctx.strokeText(text, cx, y);
	ctx.fillStyle = '#ffe9a8';
	ctx.fillText(text, cx, y);
	ctx.font = `700 ${S * 0.6}px "Arial Narrow",system-ui,sans-serif`;
	ctx.fillStyle = '#d8b8b0';
	ctx.fillText(sub, cx, y + S * 0.85);
	if (bar !== null) {
		const bw = S * 11;
		ctx.fillStyle = 'rgba(14,6,8,.85)';
		ctx.fillRect(cx - bw / 2, y + S * 1.1, bw, S * 0.34);
		ctx.fillStyle = '#e0483c';
		ctx.fillRect(cx - bw / 2, y + S * 1.1, bw * bar, S * 0.34);
		ctx.strokeStyle = INK;
		ctx.lineWidth = 2;
		ctx.strokeRect(cx - bw / 2, y + S * 1.1, bw, S * 0.34);
	}
	ctx.textAlign = 'start';
}

function render(time: number): void {
	ctx.setTransform(D, 0, 0, D, 0, 0);
	world.update(1 / 60);
	world.drawWorld(ctx);
	const L = world.layout;
	const S = L.tileSize;
	const tx = (c: number): number => L.offsetX + c * S;
	const ty = (r: number): number => L.offsetY + r * S;
	const heroAt = frame === 'chase' ? { c: 8.5, r: 8.5 } : frame === 'return' ? { c: 6.5, r: 5.5 } : { c: 6.5, r: 8.5 };
	drawFoodField(L, time, heroAt.c, heroAt.r);
	let heroAngle = 0;
	const imp = (kind: 'pinky' | 'inky' | 'clyde', c: number, r: number, dir: 'LEFT' | 'RIGHT' | 'UP' | 'DOWN'): void =>
		drawImp(ctx, kind, tx(c), ty(r), S * 1.5, dir, time, 1);
	if (frame === 'food') {
		pellets(L, time);
		bossView.draw(ctx, snap(14.5, 8.5, 'CHASE', 'normal', Math.PI), L, time);
		weaponSlot(L, 'on', time);
	} else if (frame === 'telegraph') {
		pellets(L, time);
		ctx.save();
		sigil(ctx, tx(12.5), ty(8.5), S * 1.6, time, 0.75, 1);
		ctx.restore();
		bossView.draw(ctx, snap(12.5, 8.5, 'TELEGRAPH', 'cast', Math.PI), L, time);
		for (let k = 0; k < 4; k += 1) {
			const a = time * 2.2 + (k / 4) * Math.PI * 2;
			const x = tx(12.5) + Math.cos(a) * S * 1.1;
			const y = ty(8.5) + Math.sin(a) * S * 0.9;
			const g = ctx.createRadialGradient(x, y, 0, x, y, S * 0.55);
			g.addColorStop(0, `${GHOST[k]}ff`);
			g.addColorStop(1, `${GHOST[k]}00`);
			ctx.fillStyle = g;
			ctx.fillRect(x - S * 0.55, y - S * 0.55, S * 1.1, S * 1.1);
			ctx.beginPath();
			ctx.arc(x, y, S * 0.17, 0, 7);
			ctx.fillStyle = '#ffffff';
			ctx.fill();
		}
		weaponSlot(L, 'warn', time);
		banner(L, 'ОН РАСПАДАЕТСЯ', 'оружие отключится, беги', null);
	} else if (frame === 'split') {
		ctx.save();
		for (const [r, a] of [
			[S * 2.4, 0.7],
			[S * 1.6, 0.9],
			[S * 0.8, 1]
		]) {
			ctx.strokeStyle = `rgba(255,240,200,${a})`;
			ctx.lineWidth = 4;
			ctx.beginPath();
			ctx.arc(tx(12.5), ty(8.5), r, 0, 7);
			ctx.stroke();
		}
		const f = ctx.createRadialGradient(tx(12.5), ty(8.5), 0, tx(12.5), ty(8.5), S * 2.2);
		f.addColorStop(0, 'rgba(255,250,230,.95)');
		f.addColorStop(0.4, 'rgba(255,170,70,.5)');
		f.addColorStop(1, 'rgba(255,90,40,0)');
		ctx.fillStyle = f;
		ctx.fillRect(tx(12.5) - S * 2.4, ty(8.5) - S * 2.4, S * 4.8, S * 4.8);
		ctx.restore();
		ctx.strokeStyle = 'rgba(255,240,200,.55)';
		ctx.lineWidth = 3;
		for (const [c, d] of [
			[9.2, -1],
			[10.6, -1],
			[14.4, 1],
			[15.8, 1]
		]) {
			ctx.beginPath();
			ctx.moveTo(tx(c - d * 0.1), ty(8.5));
			ctx.lineTo(tx(c + d * 1.4), ty(8.5));
			ctx.stroke();
		}
		bossView.draw(ctx, snap(9.4, 8.5, 'CHASE', 'normal', Math.PI), L, time);
		imp('pinky', 11.0, 8.5, 'LEFT');
		imp('inky', 14.0, 8.5, 'RIGHT');
		imp('clyde', 15.6, 8.5, 'RIGHT');
		weaponSlot(L, 'off', time);
		banner(L, 'РАСПАД', 'четыре призрака', null);
		pellets(L, time);
		heroAngle = Math.PI;
	} else if (frame === 'chase') {
		pellets(L, time);
		bossView.draw(ctx, snap(12.5, 8.5, 'CHASE', 'normal', Math.PI), L, time);
		imp('pinky', 8.5, 5.5, 'DOWN');
		imp('inky', 8.5, 11.5, 'UP');
		imp('clyde', 4.5, 8.5, 'RIGHT');
		weaponSlot(L, 'off', time);
		banner(L, 'ПАКМАН', 'продержись, оружия нет', 0.62);
		heroAngle = 0;
	} else {
		// the four streams run back into him at the lair
		for (let k = 0; k < 4; k += 1) {
			const from = [
				[6.5, 8.5],
				[18.5, 8.5],
				[12.5, 20.5],
				[3.5, 13.5]
			][k];
			ctx.strokeStyle = `${GHOST[k]}cc`;
			ctx.lineWidth = S * 0.2;
			ctx.lineCap = 'round';
			ctx.beginPath();
			ctx.moveTo(tx(from[0]), ty(from[1]));
			ctx.quadraticCurveTo(tx((from[0] + 12.5) / 2), ty(11.5 + (k - 1.5) * 0.4), tx(12.5), ty(13.5));
			ctx.stroke();
		}
		const g = ctx.createRadialGradient(tx(12.5), ty(13.5), 0, tx(12.5), ty(13.5), S * 2.4);
		g.addColorStop(0, 'rgba(255,230,160,.8)');
		g.addColorStop(1, 'rgba(255,120,60,0)');
		ctx.fillStyle = g;
		ctx.fillRect(tx(12.5) - S * 2.4, ty(13.5) - S * 2.4, S * 4.8, S * 4.8);
		bossView.draw(ctx, snap(12.5, 13.5, 'STUNNED', 'stunned', Math.PI), L, time);
		weaponSlot(L, 'on', time);
		banner(L, 'ОН СЛАБ', 'оружие вернулось: бей', null);
		pellets(L, time);
	}
	hero.setRadius(S * 0.39);
	hero.update(1 / 60, {
		x: tx(heroAt.c),
		y: ty(heroAt.r),
		angle: heroAngle,
		moving: false,
		power: false,
		ending: false,
		season: 'hell'
	});
	hero.draw(ctx);
	world.drawOverlay(ctx);
}

function loop(now: number): void {
	render(now / 1000);
	requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
