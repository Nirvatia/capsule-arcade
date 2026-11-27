// A playable mock-up of the boss's split on the game's own hell world: you run with the arrow keys, the
// boss hunts you, then falls into four ghosts, the weapon is shut off and it is plain Pac-Man for a
// while, then the four run back into him and he is weak. It loops. The hero, the maze, the food and the
// ghosts' chase are the game's own pieces (`PlayerService`, `DronePack`); the split itself is only a
// script here. Food candidates switch on the fly. Nothing here is the game's boss logic.
import { GRID_DOOM as DRAWN } from '../../../src/games/pacman/config/mazes/grid_doom';
import { NET } from '../../../src/games/pacman/config/netConfig';
import type { PacmanEventMap } from '../../../src/games/pacman/core/Events';
import { EventBus } from '../../../src/games/pacman/engine/EventBus';
import type { PlayerDirection } from '../../../src/games/pacman/logic/actors/PlayerModel';
import { PlayerService } from '../../../src/games/pacman/logic/actors/PlayerService';
import { LevelProgress } from '../../../src/games/pacman/logic/level/LevelProgress';
import { ScoreModel } from '../../../src/games/pacman/logic/level/ScoreModel';
import { GridModel } from '../../../src/games/pacman/logic/maze/GridModel';
import { GridService } from '../../../src/games/pacman/logic/maze/GridService';
import { DronePack } from '../../../src/games/pacman/logic/net/DronePack';
import { zoneRng } from '../../../src/games/pacman/logic/zone/zoneRng';
import { HeroView } from '../../../src/games/pacman/render/actors/HeroView';
import { OrangeHero } from '../../../src/games/pacman/render/actors/hero/FruitHero';
import { chargePainter } from '../../../src/games/pacman/render/actors/hero/heroCharge';
import { DoomWorld } from '../../../src/games/pacman/render/doom/DoomWorld';
import { pickupSprite } from '../../../src/games/pacman/render/doom/DoomSprites';
import type { BossSnapshot } from '../../../src/games/pacman/render/doom/HellBlinkyView';
import { HellBlinkyView } from '../../../src/games/pacman/render/doom/HellBlinkyView';
import { drawImp } from '../../../src/games/pacman/render/doom/HellImpView';
import { INK } from '../../../src/games/pacman/render/doom/hellGhost';
import { drawFood } from './food';
import type { FoodKind } from './food';

type Phase = 'fight' | 'omen' | 'burst' | 'pacman' | 'merge' | 'weak';
const LENGTH: Record<Phase, number> = { fight: 7, omen: 1.7, burst: 0.7, pacman: 22, merge: 1.6, weak: 4.5 };
const NEXT: Record<Phase, Phase> = { fight: 'omen', omen: 'burst', burst: 'pacman', pacman: 'merge', merge: 'weak', weak: 'fight' };
const HOMES = [
	{ x: 12, y: 10 },
	{ x: 4, y: 8 },
	{ x: 20, y: 8 },
	{ x: 12, y: 16 }
];
const LAIR = { x: 12.5, y: 13.5 };
const KINDS = ['pinky', 'inky', 'clyde'] as const;
const GHOST = ['#ff3a2a', '#e0388e', '#1fa8d0', '#ee7a1e'] as const;

const D = Math.min(window.devicePixelRatio || 1, 2);
const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const world = new DoomWorld(DRAWN, []);
const bossView = new HellBlinkyView();

let grid = new GridService(new GridModel(DRAWN));
let events = new EventBus<PacmanEventMap>();
let progress = new LevelProgress(grid, new ScoreModel(), events);
let player = new PlayerService(grid, progress, events);
let pack = new DronePack(grid, HOMES, zoneRng(3), 4, 1);
let heroView = makeHero();
let phase: Phase = 'fight';
let phaseT = 0;
let hp = 3;
let bonus = 0;
let dead = false;
let immortal = false;
let flash = 0;
let want: PlayerDirection | null = null;
let food: FoodKind = 'bone';
let chain = 0;
let energizers: boolean[] = [];
let merging: Array<{ x: number; y: number }> = [];
let bossAt = { x: 12.5, y: 10.5 };
const popups: Array<{ x: number; y: number; text: string; age: number }> = [];
let w = 0;
let h = 0;
let time = 0;

function makeHero(): HeroView {
	const v = new HeroView(new OrangeHero(), chargePainter);
	v.setSeason('hell');
	return v;
}

function restart(): void {
	grid = new GridService(new GridModel(DRAWN));
	events = new EventBus<PacmanEventMap>();
	progress = new LevelProgress(grid, new ScoreModel(), events);
	player = new PlayerService(grid, progress, events);
	player.reset();
	pack = new DronePack(grid, HOMES, zoneRng(3), 4, 1);
	heroView = makeHero();
	phase = 'fight';
	phaseT = 0;
	hp = 3;
	bonus = 0;
	dead = false;
	chain = 0;
	merging = [];
	popups.length = 0;
	energizers = [];
	for (let y = 0; y < DRAWN.length; y += 1) {
		for (let x = 0; x < DRAWN[0].length; x += 1) {
			if (grid.isEnergizer(x, y)) energizers.push(false);
		}
	}
}
restart();

const bar = document.getElementById('bar') as HTMLElement;
const buttons: Array<{ el: HTMLButtonElement; on: () => boolean }> = [];
function group(title: string): HTMLElement {
	const g = document.createElement('div');
	g.className = 'grp';
	g.innerHTML = `<b>${title}</b>`;
	bar.append(g);
	return g;
}
function add(parent: HTMLElement, label: string, on: (() => boolean) | null, click: () => void): void {
	const el = document.createElement('button');
	el.type = 'button';
	el.textContent = label;
	el.addEventListener('click', () => {
		click();
		el.blur();
		refresh();
	});
	parent.append(el);
	if (on) buttons.push({ el, on });
}
const g1 = group('Еда');
for (const [k, label] of [
	['bone', 'Кость'],
	['fang', 'Клык'],
	['eye', 'Глаз']
] as const) {
	add(g1, label, () => food === k, () => (food = k));
}
const g2 = group('Сценарий');
add(g2, 'Распад сейчас', null, () => start('omen'));
add(g2, 'Заново', null, restart);
add(g2, 'Бессмертие', () => immortal, () => (immortal = !immortal));
function refresh(): void {
	for (const b of buttons) b.el.setAttribute('aria-pressed', String(b.on()));
}
refresh();

const KEYS: Record<string, PlayerDirection> = {
	ArrowUp: 'UP',
	ArrowDown: 'DOWN',
	ArrowLeft: 'LEFT',
	ArrowRight: 'RIGHT',
	w: 'UP',
	s: 'DOWN',
	a: 'LEFT',
	d: 'RIGHT',
	ц: 'UP',
	ы: 'DOWN',
	ф: 'LEFT',
	в: 'RIGHT'
};
window.addEventListener('keydown', (e) => {
	const d = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
	if (d) {
		want = d;
		e.preventDefault();
	} else if (e.key.toLowerCase() === 'r' || e.key.toLowerCase() === 'к') {
		restart();
	}
});

function layout(): void {
	w = view.clientWidth;
	h = view.clientHeight;
	view.width = Math.round(w * D);
	view.height = Math.round(h * D);
	world.resize(w, h, D);
}
window.addEventListener('resize', layout);
layout();

/** Moves the script on to `p`: what each step does to the ghosts. */
function start(p: Phase): void {
	phase = p;
	phaseT = 0;
	const boss = pack.list[0];
	if (p === 'omen') {
		bossAt = { x: boss.x, y: boss.y };
		boss.state = 'wait';
		boss.timer = Infinity;
	} else if (p === 'burst') {
		// all four from the boss's tile, one after another
		const tx = Math.floor(bossAt.x);
		const ty = Math.floor(bossAt.y);
		pack.list.forEach((d, i) => {
			Object.assign(d, { fx: tx, fy: ty, tx, ty, p: 0, x: tx + 0.5, y: ty + 0.5, state: 'wait', timer: i * 0.28 });
		});
		pack.fear = 0;
	} else if (p === 'merge') {
		merging = pack.list.map((d) => ({ x: d.x, y: d.y }));
		pack.list.forEach((d) => Object.assign(d, { state: 'wait', timer: Infinity }));
		pack.fear = 0;
		grid.setLairOpen(true);
	} else if (p === 'fight') {
		grid.setLairOpen(false);
		const b = pack.list[0];
		Object.assign(b, { fx: 12, fy: 10, tx: 12, ty: 10, p: 0, x: 12.5, y: 10.5, state: 'hunt', timer: 0 });
		pack.list.slice(1).forEach((d) => Object.assign(d, { state: 'wait', timer: Infinity }));
	}
}

function hit(): void {
	if (player.isInvulnerable || immortal) return;
	hp -= 1;
	flash = 0.35;
	if (hp <= 0) {
		dead = true;
		return;
	}
	player.grantInvulnerability(1.4);
}

function update(dt: number): void {
	world.update(dt);
	for (const q of popups) q.age += dt;
	while (popups.length && popups[0].age > 1.1) popups.shift();
	flash = Math.max(0, flash - dt);
	if (dead) return;
	phaseT += dt;
	if (phaseT >= LENGTH[phase]) start(NEXT[phase]);
	if (want) player.setDesiredDirection(want);
	player.update(dt);
	// an energizer: the ghosts flee (plain Pac-Man, in the Pac-Man phase and in the omen's calm too)
	let i = 0;
	for (let y = 0; y < DRAWN.length; y += 1) {
		for (let x = 0; x < DRAWN[0].length; x += 1) {
			if (!grid.isEnergizer(x, y)) continue;
			if (!energizers[i] && progress.isCollected(x, y)) {
				energizers[i] = true;
				if (phase === 'pacman' || phase === 'fight') {
					pack.hack(NET.hack.fear);
					chain = 0;
				}
			}
			i += 1;
		}
	}
	const t = { x: Math.floor(player.position.x), y: Math.floor(player.position.y) };
	pack.update(dt, {
		hero: t,
		ahead2: ahead(t, 2),
		ahead4: ahead(t, 4),
		speedMul: phase === 'fight' ? 0.85 : 1,
		shut: () => false
	});
	if (pack.fear <= 0) chain = 0;
	for (const d of pack.list) {
		if (d.state === 'wait' || d.state === 'dead') continue;
		if (Math.hypot(d.x - player.position.x, d.y - player.position.y) >= NET.drone.bite) continue;
		if (d.state === 'fright') {
			const worth = NET.hack.eat * 2 ** chain;
			bonus += worth;
			chain = Math.min(3, chain + 1);
			popups.push({ x: d.x, y: d.y, text: `+${worth}`, age: 0 });
			pack.eat(d);
		} else {
			hit();
			pack.bitten(d);
		}
	}
	// the weak boss at the lair: touch him (a bite here stands for a BFG hit)
	if (phase === 'weak' && Math.hypot(LAIR.x - player.position.x, LAIR.y - player.position.y) < 0.9) {
		bonus += 1000;
		popups.push({ x: LAIR.x, y: LAIR.y, text: '+1000', age: 0 });
		start('fight');
	}
}

function ahead(t: { x: number; y: number }, n: number): { x: number; y: number } {
	const f = player.facing ?? player.desired;
	const [dx, dy] = f ? { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0] }[f] : [0, 0];
	let at = t;
	for (let i = 1; i <= n; i += 1) {
		const p = { x: t.x + dx * i, y: t.y + dy * i };
		if (!grid.isGhostWalkable(p.x, p.y, false)) break;
		at = p;
	}
	return at;
}

type Lay = { tileSize: number; offsetX: number; offsetY: number };

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

function drawFoodField(L: Lay): void {
	const S = L.tileSize;
	const hx = player.position.x;
	const hy = player.position.y;
	for (let r = 0; r < DRAWN.length; r += 1) {
		for (let c = 0; c < DRAWN[0].length; c += 1) {
			if (!grid.isDot(c, r) || progress.isCollected(c, r)) continue;
			const horiz = DRAWN[r][c - 1] === 'DT' || DRAWN[r][c + 1] === 'DT';
			drawFood(ctx, food, L.offsetX + (c + 0.5) * S, L.offsetY + (r + 0.5) * S, S, Math.atan2(hy - (r + 0.5), hx - (c + 0.5)), horiz ? 0 : Math.PI / 2);
		}
	}
}

function drawEnergizers(L: Lay): void {
	const S = L.tileSize;
	let i = 0;
	for (let r = 0; r < DRAWN.length; r += 1) {
		for (let c = 0; c < DRAWN[0].length; c += 1) {
			if (!grid.isEnergizer(c, r)) continue;
			if (!energizers[i++]) {
				const x = L.offsetX + (c + 0.5) * S;
				const y = L.offsetY + (r + 0.5) * S;
				const k = 1 + 0.1 * Math.sin(time * 5 + c);
				ctx.beginPath();
				ctx.arc(x, y, S * 0.27 * k, 0, 7);
				ctx.fillStyle = '#ffe9a8';
				ctx.fill();
				ctx.lineWidth = Math.max(1.8, S * 0.05);
				ctx.strokeStyle = INK;
				ctx.stroke();
			}
		}
	}
}

/** The ghosts: the boss in his own armour, the three others as the brood in the arcade colours. */
function drawGhosts(L: Lay): void {
	const S = L.tileSize;
	pack.list.forEach((d, i) => {
		if (d.state === 'dead' || (d.state === 'wait' && (phase === 'fight' || phase === 'weak' || phase === 'merge'))) return;
		const x = L.offsetX + d.x * S;
		const y = L.offsetY + d.y * S;
		const scared = d.state === 'fright';
		const white = scared && pack.fear < 2 && Math.floor(time * 8) % 2 === 0;
		const dir = Math.abs(d.dx) > Math.abs(d.dy) ? (d.dx > 0 ? 'RIGHT' : 'LEFT') : d.dy > 0 ? 'DOWN' : 'UP';
		ctx.save();
		ctx.globalAlpha = d.state === 'wait' ? 0.0 : 1;
		if (i === 0) {
			ctx.globalAlpha = 1;
			bossView.draw(ctx, snap(d.x, d.y, 'CHASE', 'normal', Math.atan2(d.dy, d.dx)), L, time);
		} else {
			drawImp(ctx, KINDS[i - 1], x, y, S * 1.5, dir, time, d.state === 'wait' ? 0 : 1);
		}
		ctx.restore();
		if (scared) {
			ctx.fillStyle = white ? 'rgba(255,255,255,.7)' : 'rgba(60,90,230,.6)';
			ctx.beginPath();
			ctx.arc(x, y, S * 0.45, 0, 7);
			ctx.fill();
		}
	});
}

/** The omen: the boss shakes, four coloured ghosts peel out of his body and press back in. */
function drawOmen(L: Lay): void {
	const S = L.tileSize;
	const u = Math.min(1, phaseT / LENGTH.omen);
	const sx = Math.sin(time * 60) * S * 0.04 * u;
	const x = L.offsetX + bossAt.x * S;
	const y = L.offsetY + bossAt.y * S;
	for (let k = 0; k < 4; k += 1) {
		const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
		const off = S * (0.1 + 0.55 * u) * (0.8 + 0.2 * Math.sin(time * 9 + k));
		const gx = x + Math.cos(a) * off;
		const gy = y + Math.sin(a) * off;
		ctx.globalAlpha = 0.25 + 0.6 * u;
		if (k === 0) {
			ctx.fillStyle = GHOST[0];
			ctx.beginPath();
			ctx.arc(gx, gy, S * 0.4, 0, 7);
			ctx.fill();
		} else {
			drawImp(ctx, KINDS[k - 1], gx, gy, S * 1.5, 'LEFT', time, 1);
		}
		ctx.globalAlpha = 1;
	}
	bossView.draw(ctx, snap(bossAt.x + sx / S, bossAt.y, 'TELEGRAPH', 'cast', Math.PI), L, time);
	const g = ctx.createRadialGradient(x, y, 0, x, y, S * (1 + 1.2 * u));
	g.addColorStop(0, `rgba(255,236,190,${0.55 * u})`);
	g.addColorStop(1, 'rgba(255,120,60,0)');
	ctx.fillStyle = g;
	ctx.fillRect(x - S * 2.4, y - S * 2.4, S * 4.8, S * 4.8);
}

function drawBurst(L: Lay): void {
	const S = L.tileSize;
	const u = Math.min(1, phaseT / LENGTH.burst);
	const x = L.offsetX + bossAt.x * S;
	const y = L.offsetY + bossAt.y * S;
	ctx.strokeStyle = `rgba(255,240,200,${1 - u})`;
	ctx.lineWidth = 5 * (1 - u) + 1;
	ctx.beginPath();
	ctx.arc(x, y, S * (0.4 + 2.6 * u), 0, 7);
	ctx.stroke();
	const g = ctx.createRadialGradient(x, y, 0, x, y, S * (0.6 + 2 * u));
	g.addColorStop(0, `rgba(255,250,230,${0.9 * (1 - u)})`);
	g.addColorStop(1, 'rgba(255,120,60,0)');
	ctx.fillStyle = g;
	ctx.fillRect(x - S * 3, y - S * 3, S * 6, S * 6);
}

/** The return: the four run into the lair, the boss is there, weak. */
function drawMerge(L: Lay): void {
	const S = L.tileSize;
	const u = Math.min(1, phaseT / LENGTH.merge);
	const e = u * u * (3 - 2 * u);
	merging.forEach((m, i) => {
		const x = L.offsetX + (m.x + (LAIR.x - m.x) * e) * S;
		const y = L.offsetY + (m.y + (LAIR.y - m.y) * e) * S;
		ctx.globalAlpha = 1 - 0.6 * u;
		if (i === 0) {
			ctx.fillStyle = GHOST[0];
			ctx.beginPath();
			ctx.arc(x, y, S * 0.4 * (1 - 0.3 * u), 0, 7);
			ctx.fill();
		} else {
			drawImp(ctx, KINDS[i - 1], x, y, S * 1.5 * (1 - 0.3 * u), 'RIGHT', time, 1);
		}
		ctx.globalAlpha = 1;
	});
}

function weaponSlot(L: Lay, mode: 'on' | 'warn' | 'off'): void {
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

function banner(L: Lay, text: string, sub: string, bar: number | null): void {
	const S = L.tileSize;
	const cx = L.offsetX + (DRAWN[0].length * S) / 2;
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

function render(): void {
	ctx.setTransform(D, 0, 0, D, 0, 0);
	world.drawWorld(ctx);
	const L = world.layout;
	const S = L.tileSize;
	drawFoodField(L);
	drawEnergizers(L);
	if (phase === 'omen') drawOmen(L);
	if (phase === 'merge') drawMerge(L);
	if (phase === 'weak') {
		bossView.draw(ctx, snap(LAIR.x, LAIR.y, 'STUNNED', 'stunned', Math.PI), L, time);
		const g = ctx.createRadialGradient(L.offsetX + LAIR.x * S, L.offsetY + LAIR.y * S, 0, L.offsetX + LAIR.x * S, L.offsetY + LAIR.y * S, S * 2);
		g.addColorStop(0, 'rgba(255,230,160,.6)');
		g.addColorStop(1, 'rgba(255,120,60,0)');
		ctx.fillStyle = g;
		ctx.fillRect(L.offsetX + LAIR.x * S - S * 2, L.offsetY + LAIR.y * S - S * 2, S * 4, S * 4);
	}
	drawGhosts(L);
	if (phase === 'burst') drawBurst(L);
	heroView.draw(ctx, player, L, time, { look: 'normal', charge: 0, dying: false });
	world.drawOverlay(ctx);
	for (const q of popups) {
		ctx.globalAlpha = Math.max(0, 1 - q.age / 1.1);
		ctx.font = `700 ${S * 0.62}px "Arial Narrow",system-ui,sans-serif`;
		ctx.textAlign = 'center';
		ctx.lineWidth = 4;
		ctx.strokeStyle = INK;
		ctx.fillStyle = '#ffd24a';
		ctx.strokeText(q.text, L.offsetX + q.x * S, L.offsetY + q.y * S - q.age * S);
		ctx.fillText(q.text, L.offsetX + q.x * S, L.offsetY + q.y * S - q.age * S);
		ctx.textAlign = 'start';
		ctx.globalAlpha = 1;
	}
	const hearts = '♥'.repeat(Math.max(0, hp)) + '♡'.repeat(Math.max(0, 3 - hp));
	ctx.font = `700 ${S * 0.8}px "Arial Narrow",system-ui,sans-serif`;
	ctx.fillStyle = '#ff6a8a';
	ctx.fillText(hearts, L.offsetX + S * 3, L.offsetY - S * 1.2);
	ctx.fillStyle = '#efe0d8';
	ctx.fillText(String(progress.score + bonus), L.offsetX + S * 3, L.offsetY - S * 0.3);
	if (phase === 'fight') {
		weaponSlot(L, 'on');
		banner(L, 'БОЙ', 'босс гонится за тобой', null);
	} else if (phase === 'omen') {
		weaponSlot(L, 'warn');
		banner(L, 'ОН РАСПАДАЕТСЯ', 'оружие отключится, беги', null);
	} else if (phase === 'burst') {
		weaponSlot(L, 'off');
		banner(L, 'РАСПАД', '', null);
	} else if (phase === 'pacman') {
		weaponSlot(L, 'off');
		banner(L, 'ПАКМАН', 'продержись, оружия нет', 1 - phaseT / LENGTH.pacman);
	} else if (phase === 'merge') {
		weaponSlot(L, 'off');
		banner(L, 'ОНИ ВОЗВРАЩАЮТСЯ', '', null);
	} else {
		weaponSlot(L, 'on');
		banner(L, 'ОН СЛАБ', 'коснись его, это удар', 1 - phaseT / LENGTH.weak);
	}
	if (flash > 0) {
		ctx.fillStyle = `rgba(255,40,30,${flash * 0.7})`;
		ctx.fillRect(0, 0, w, h);
	}
	if (dead) {
		ctx.fillStyle = 'rgba(8,2,4,.72)';
		ctx.fillRect(0, 0, w, h);
		ctx.fillStyle = '#ffe9a8';
		ctx.textAlign = 'center';
		ctx.font = `700 ${S * 2}px "Arial Narrow",system-ui,sans-serif`;
		ctx.fillText('ПОЙМАН', w / 2, h / 2);
		ctx.font = `700 ${S * 0.8}px "Arial Narrow",system-ui,sans-serif`;
		ctx.fillText('R или «Заново»', w / 2, h / 2 + S * 1.3);
		ctx.textAlign = 'start';
	}
}

let last = performance.now();
function loop(now: number): void {
	const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
	last = now;
	time += dt;
	update(dt);
	render();
	requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
