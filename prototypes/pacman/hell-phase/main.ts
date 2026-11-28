// A playable prototype of the hell fight's redesign (DESIGN.md §7 "The fight, redesigned") on the game's
// own hell: the real boss with his attacks and phases, the real hero and maze, and the new rules of
// `rules.ts` (food charges the BFG, the split at 1000 and 500 HP, the rush, the snare, the plasma, the
// armour). The art of what is new is a placeholder (the snare, the plasma, the armour, the core, the four
// ghosts); the food's three candidates switch on the fly. Arrows / WASD move, F or Shift is the button.
import { GRID_DOOM as DRAWN } from '../../../src/games/pacman/config/mazes/grid_doom';
import type { DoomAbilityService } from '../../../src/games/pacman/logic/doom/DoomAbilityService';
import type { PlayerDirection } from '../../../src/games/pacman/logic/actors/PlayerModel';
import { HeroView } from '../../../src/games/pacman/render/actors/HeroView';
import { MsPacmanHero } from '../../../src/games/pacman/render/actors/hero/MsPacmanHero';
import { PacmanHero } from '../../../src/games/pacman/render/actors/hero/PacmanHero';
import { chargePainter } from '../../../src/games/pacman/render/actors/hero/heroCharge';
import { DoomCombatView } from '../../../src/games/pacman/render/doom/DoomCombatView';
import { DoomFxView } from '../../../src/games/pacman/render/doom/DoomFxView';
import { pickupSprite } from '../../../src/games/pacman/render/doom/DoomSprites';
import { DoomWorld } from '../../../src/games/pacman/render/doom/DoomWorld';
import type { DoomLight } from '../../../src/games/pacman/render/doom/DoomWorld';
import { HellBlinkyView } from '../../../src/games/pacman/render/doom/HellBlinkyView';
import { drawImp } from '../../../src/games/pacman/render/doom/HellImpView';
import { INK } from '../../../src/games/pacman/render/doom/hellGhost';
import { easeGate, gateTiles, gateWanted } from '../../../src/games/pacman/render/doom/doomGate';
import type { DoomDirection } from '../../../src/games/pacman/logic/doom/DoomGraph';
import { drawFood } from './food';
import type { FoodKind } from './food';
import { HellRules, TUNE } from './rules';
import type { PickupKind } from './rules';

type Lay = { tileSize: number; offsetX: number; offsetY: number };

const D = Math.min(window.devicePixelRatio || 1, 2);
const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const world = new DoomWorld(DRAWN, []);
const bossView = new HellBlinkyView();
const combat = new DoomCombatView();
const fx = new DoomFxView();
const NO_PICKUPS = { pickupList: [], barrelList: [], canCollect: () => false } as unknown as DoomAbilityService;
const GHOST_KINDS = ['clyde', 'pinky', 'inky', 'clyde'] as const;
const FONT = '"Arial Narrow",system-ui,sans-serif';

let rules = new HellRules();
let heroView = makeHero();
let food: FoodKind = 'fang';
let gate = 0;
const gateAt = gateTiles(rules.grid);
let w = 0;
let h = 0;
let time = 0;
let fireHeld = false;
let firePressed = false;
let god = false;
let formedAt = -10;
let lastStage = rules.stage;
const held: PlayerDirection[] = [];

function makeHero(): HeroView {
	const v = new HeroView(location.search.includes('ms') ? new MsPacmanHero() : new PacmanHero(), chargePainter);
	v.setSeason('hell');
	return v;
}

function restart(): void {
	rules = new HellRules();
	rules.god = god;
	heroView = makeHero();
	fx.reset();
	gate = 0;
	formedAt = -10;
	held.length = 0;
}

// ---------- the page ----------

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
function refresh(): void {
	for (const b of buttons) b.el.setAttribute('aria-pressed', String(b.on()));
}
const gFood = group('Еда');
for (const [k, label] of [
	['fang', 'Клык'],
	['bone', 'Кость'],
	['eye', 'Глаз']
] as const) {
	add(gFood, label, () => food === k, () => (food = k));
}
const gGive = group('Дать');
for (const [k, label] of [
	['berserk', 'Берсерк'],
	['snare', 'Капкан'],
	['plasma', 'Плазма'],
	['bfg', 'Заряд BFG'],
	['armour', 'Броня']
] as const) {
	add(gGive, label, null, () => rules.give(k));
}
const gRun = group('Бой');
add(gRun, 'Распад сейчас', null, () => rules.splitNow());
add(gRun, 'Заново', null, restart);
add(gRun, 'Бессмертие', () => god, () => {
	god = !god;
	rules.god = god;
});
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
const isFire = (e: KeyboardEvent): boolean => e.key === 'Shift' || e.code === 'KeyF';
window.addEventListener('keydown', (e) => {
	const dir = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
	if (dir) {
		if (!held.includes(dir)) held.push(dir);
		e.preventDefault();
	} else if (isFire(e)) {
		if (!e.repeat) firePressed = true;
		fireHeld = true;
		e.preventDefault();
	} else if (e.code === 'KeyR') {
		restart();
	}
});
window.addEventListener('keyup', (e) => {
	const dir = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
	if (dir) held.splice(held.indexOf(dir), 1);
	if (isFire(e)) fireHeld = false;
});

function layout(): void {
	w = view.clientWidth;
	h = view.clientHeight;
	view.width = Math.round(w * D);
	view.height = Math.round(h * D);
	world.resize(w, h - 56, D);
}
window.addEventListener('resize', layout);
layout();

// ---------- update ----------

function update(dt: number): void {
	world.update(dt);
	const want = held[held.length - 1];
	if (want) rules.player.setDesiredDirection(want);
	rules.update(dt, fireHeld, firePressed);
	firePressed = false;
	if (lastStage === 'merge' && rules.stage === 'fight') formedAt = time;
	lastStage = rules.stage;
	for (const e of rules.consumeFx()) fx.spawn(e);
	fx.update(dt, rules.orbs, []);
	const boss = rules.boss;
	const actors = rules.split || boss.introProgress < 1 ? [] : [boss.position];
	gate = easeGate(gate, gateWanted(gateAt, [...actors, ...boss.minionList.map((m) => ({ x: m.tile.x + 0.5, y: m.tile.y + 0.5 }))]), dt);
	world.setGateOpen(gate);
}

// ---------- drawing ----------

const px = (L: Lay, x: number): number => L.offsetX + x * L.tileSize;
const py = (L: Lay, y: number): number => L.offsetY + y * L.tileSize;

function drawFoodField(L: Lay): void {
	const S = L.tileSize;
	const { grid, progress, player } = rules;
	const hx = player.position.x;
	const hy = player.position.y;
	for (let r = 0; r < grid.height; r += 1) {
		for (let c = 0; c < grid.width; c += 1) {
			if (!grid.isDot(c, r) || progress.isCollected(c, r)) continue;
			const horiz = grid.isDot(c - 1, r) || grid.isDot(c + 1, r);
			drawFood(ctx, food, px(L, c + 0.5), py(L, r + 0.5), S, Math.atan2(hy - (r + 0.5), hx - (c + 0.5)), horiz ? 0 : Math.PI / 2);
		}
	}
	if (!rules.split) return;
	for (let r = 0; r < grid.height; r += 1) {
		for (let c = 0; c < grid.width; c += 1) {
			if (!grid.isEnergizer(c, r) || progress.isCollected(c, r)) continue;
			const k = 1 + 0.1 * Math.sin(time * 5 + c);
			ctx.beginPath();
			ctx.arc(px(L, c + 0.5), py(L, r + 0.5), S * 0.27 * k, 0, 7);
			ctx.fillStyle = '#ffe9a8';
			ctx.fill();
			ctx.lineWidth = Math.max(1.8, S * 0.05);
			ctx.strokeStyle = INK;
			ctx.stroke();
		}
	}
}

/** Placeholder icons for what is new (the game's own for the berserk, the medkit and the BFG). */
function drawIcon(kind: PickupKind | 'bfg', x: number, y: number, s: number, alpha = 1): void {
	ctx.save();
	ctx.globalAlpha = alpha;
	if (kind === 'berserk' || kind === 'medkit' || kind === 'bfg') {
		ctx.drawImage(pickupSprite(kind).icon, x - s / 2, y - s / 2, s, s);
		ctx.restore();
		return;
	}
	ctx.lineWidth = Math.max(1.6, s * 0.06);
	ctx.strokeStyle = INK;
	if (kind === 'snare') {
		jaws(x, y, s * 0.42, 0.55);
	} else if (kind === 'plasma') {
		ctx.fillStyle = '#26324a';
		ctx.beginPath();
		ctx.roundRect(x - s * 0.36, y - s * 0.16, s * 0.6, s * 0.32, s * 0.08);
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = '#7fd8ff';
		ctx.beginPath();
		ctx.arc(x + s * 0.3, y, s * 0.14, 0, 7);
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = '#bff0ff';
		ctx.fillRect(x - s * 0.28, y - s * 0.05, s * 0.4, s * 0.1);
	} else {
		ctx.fillStyle = '#3a7ad8';
		ctx.beginPath();
		ctx.moveTo(x, y - s * 0.4);
		ctx.lineTo(x + s * 0.34, y - s * 0.26);
		ctx.quadraticCurveTo(x + s * 0.32, y + s * 0.2, x, y + s * 0.42);
		ctx.quadraticCurveTo(x - s * 0.32, y + s * 0.2, x - s * 0.34, y - s * 0.26);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = 'rgba(255,255,255,.55)';
		ctx.fillRect(x - s * 0.2, y - s * 0.24, s * 0.08, s * 0.3);
	}
	ctx.restore();
}

/** The snare: two rows of bone teeth; `open` 1 is wide, 0 is shut. */
function jaws(x: number, y: number, r: number, open: number): void {
	for (const side of [-1, 1]) {
		ctx.fillStyle = '#e8dcc0';
		ctx.beginPath();
		const yy = y + side * r * 0.25 * open;
		ctx.ellipse(x, yy, r, r * (0.35 + 0.3 * open), 0, side < 0 ? Math.PI : 0, side < 0 ? Math.PI * 2 : Math.PI);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = '#fff6e0';
		for (let k = -2; k <= 2; k += 1) {
			const tx = x + k * r * 0.36;
			ctx.beginPath();
			ctx.moveTo(tx - r * 0.12, yy);
			ctx.lineTo(tx, yy - side * r * 0.32);
			ctx.lineTo(tx + r * 0.12, yy);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();
		}
	}
}

function drawPickups(L: Lay): void {
	if (rules.split) return;
	const S = L.tileSize;
	for (const p of rules.pickups) {
		if (!p.kind) continue;
		const x = px(L, p.tile.x + 0.5);
		const y = py(L, p.tile.y + 0.5) + Math.sin(time * 3 + p.tile.x) * S * 0.05;
		ctx.fillStyle = 'rgba(10,3,4,.55)';
		ctx.beginPath();
		ctx.ellipse(x + S * 0.06, py(L, p.tile.y + 0.5) + S * 0.32, S * 0.36, S * 0.12, 0, 0, 7);
		ctx.fill();
		drawIcon(p.kind, x, y, S * 0.95, rules.canTake(p.kind) ? 1 : 0.45);
	}
	const sn = rules.snare;
	if (sn) {
		const open = sn.snapped < 0 ? 0.55 + 0.05 * Math.sin(time * 4) : 0;
		ctx.lineWidth = Math.max(1.6, S * 0.05);
		ctx.strokeStyle = INK;
		jaws(px(L, sn.tile.x + 0.5), py(L, sn.tile.y + 0.5), S * 0.4, open);
	}
}

function look(at: { x: number; y: number }): number {
	const p = rules.player.position;
	return Math.atan2(p.y - at.y, p.x - at.x);
}

function drawBoss(L: Lay): void {
	const boss = rules.boss;
	if (boss.defeated || rules.split) return;
	const rs = boss.renderState;
	const shakeX = rules.stage === 'omen' ? Math.sin(time * 60) * 0.05 * Math.min(1, rules.stageT / 1.5) : 0;
	bossView.draw(
		ctx,
		{
			x: boss.position.x + shakeX,
			y: boss.position.y,
			phase: boss.phase,
			state: boss.state,
			shape: rs.shape,
			dir: rs.dir,
			progress: rs.progress,
			alpha: rs.alpha,
			intro: boss.introProgress,
			look: look(boss.position),
			hit: 0,
			echo: false
		},
		L,
		time
	);
	if (rules.stage === 'omen') {
		const u = Math.min(1, rules.stageT / 2.5);
		const x = px(L, boss.position.x);
		const y = py(L, boss.position.y);
		const g = ctx.createRadialGradient(x, y, 0, x, y, L.tileSize * (1 + 1.2 * u));
		g.addColorStop(0, `rgba(255,236,190,${0.5 * u})`);
		g.addColorStop(1, 'rgba(255,120,60,0)');
		ctx.fillStyle = g;
		ctx.fillRect(x - L.tileSize * 2.4, y - L.tileSize * 2.4, L.tileSize * 4.8, L.tileSize * 4.8);
	}
}

/** The core: the tile he burst on, beating, the four's way home. */
function drawCore(L: Lay): void {
	const c = rules.core;
	if (!c || !rules.split) return;
	const S = L.tileSize;
	const x = px(L, c.x + 0.5);
	const y = py(L, c.y + 0.5);
	const beat = 1 + 0.12 * Math.max(0, Math.sin(time * 5));
	const g = ctx.createRadialGradient(x, y, 0, x, y, S * 0.9);
	g.addColorStop(0, 'rgba(255,90,50,.55)');
	g.addColorStop(1, 'rgba(255,60,30,0)');
	ctx.fillStyle = g;
	ctx.fillRect(x - S, y - S, S * 2, S * 2);
	ctx.beginPath();
	ctx.arc(x, y, S * 0.26 * beat, 0, 7);
	ctx.fillStyle = '#8a1418';
	ctx.fill();
	ctx.lineWidth = Math.max(1.6, S * 0.05);
	ctx.strokeStyle = INK;
	ctx.stroke();
	ctx.beginPath();
	ctx.arc(x - S * 0.07, y - S * 0.07, S * 0.09 * beat, 0, 7);
	ctx.fillStyle = '#ff7a4a';
	ctx.fill();
}

function facingOf(dx: number, dy: number): DoomDirection {
	return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'RIGHT' : 'LEFT') : dy > 0 ? 'DOWN' : 'UP';
}

/** The four, equal (a placeholder: the brood's painter, the red one is Clyde's turned red). */
function ghost(L: Lay, i: number, x: number, y: number, dir: DoomDirection, scale: number, scared: boolean): void {
	const S = L.tileSize;
	ctx.save();
	if (i === 0) ctx.filter = 'hue-rotate(-28deg) saturate(1.5)';
	drawImp(ctx, GHOST_KINDS[i], px(L, x), py(L, y), S * 1.5 * scale, dir, time, 1);
	ctx.restore();
	if (scared) {
		const white = rules.pack.fear < 2 && Math.floor(time * 8) % 2 === 0;
		ctx.fillStyle = white ? 'rgba(255,255,255,.72)' : 'rgba(50,80,230,.62)';
		ctx.beginPath();
		ctx.arc(px(L, x), py(L, y), S * 0.44, 0, 7);
		ctx.fill();
	}
}

function drawGhosts(L: Lay): void {
	if (rules.stage === 'merge') {
		const c = rules.core;
		if (!c) return;
		const u = Math.min(1, rules.stageT / TUNE.merge);
		const e = u * u * (3 - 2 * u);
		rules.mergePoints.forEach((m, i) => {
			const x = m.x + (c.x + 0.5 - m.x) * e;
			const y = m.y + (c.y + 0.5 - m.y) * e;
			ghost(L, i % 4, x, y, facingOf(c.x + 0.5 - m.x, c.y + 0.5 - m.y), 1 - 0.3 * u, false);
		});
		return;
	}
	rules.pack.list.forEach((d, i) => {
		if (d.state !== 'hunt' && d.state !== 'fright') return;
		ghost(L, i, d.x, d.y, facingOf(d.dx, d.dy), 1, d.state === 'fright');
	});
}

function drawBurst(L: Lay): void {
	const c = rules.core;
	if (rules.stage !== 'burst' || !c) return;
	const S = L.tileSize;
	const u = Math.min(1, rules.stageT / TUNE.burst);
	const x = px(L, c.x + 0.5);
	const y = py(L, c.y + 0.5);
	ctx.strokeStyle = `rgba(255,240,200,${1 - u})`;
	ctx.lineWidth = 5 * (1 - u) + 1;
	ctx.beginPath();
	ctx.arc(x, y, S * (0.4 + 3.4 * u), 0, 7);
	ctx.stroke();
}

function drawBolts(L: Lay): void {
	const S = L.tileSize;
	ctx.save();
	ctx.globalCompositeOperation = 'lighter';
	for (const b of rules.bolts) {
		const x = px(L, b.x);
		const y = py(L, b.y);
		const g = ctx.createRadialGradient(x, y, 0, x, y, S * 0.34);
		g.addColorStop(0, 'rgba(220,250,255,.95)');
		g.addColorStop(0.4, 'rgba(80,180,255,.7)');
		g.addColorStop(1, 'rgba(40,90,255,0)');
		ctx.fillStyle = g;
		ctx.fillRect(x - S * 0.4, y - S * 0.4, S * 0.8, S * 0.8);
	}
	ctx.restore();
}

function text(s: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'start'): void {
	ctx.font = `700 ${size}px ${FONT}`;
	ctx.textAlign = align;
	ctx.lineWidth = Math.max(3, size * 0.18);
	ctx.strokeStyle = INK;
	ctx.strokeText(s, x, y);
	ctx.fillStyle = color;
	ctx.fillText(s, x, y);
	ctx.textAlign = 'start';
}

function drawHud(L: Lay): void {
	const S = L.tileSize;
	const mazeW = rules.grid.width * S;
	const top = L.offsetY + S * 1.2;
	// health and armour, score
	const hearts = '♥'.repeat(Math.max(0, rules.hp)) + '♡'.repeat(Math.max(0, TUNE.maxHp - rules.hp));
	text(hearts, L.offsetX + S * 2.2, top, S * 0.9, '#ff6a8a');
	if (rules.armour) drawIcon('armour', L.offsetX + S * 5.2, top - S * 0.3, S * 0.8);
	text(String(rules.score), L.offsetX + S * 2.2, top + S * 0.9, S * 0.6, '#efe0d8');
	// the hand: the item, or the BFG with its ring of eaten food
	const cx = L.offsetX + mazeW - S * 3.4;
	const cy = top - S * 0.05;
	const R = S * 0.78;
	ctx.fillStyle = 'rgba(14,6,8,.85)';
	ctx.beginPath();
	ctx.arc(cx, cy, R, 0, 7);
	ctx.fill();
	const off = rules.split;
	const item = rules.hand ?? 'bfg';
	drawIcon(item, cx, cy, R * 1.3, off || (item === 'bfg' && !rules.bfgReady) ? 0.35 : 1);
	ctx.lineWidth = S * 0.14;
	ctx.strokeStyle = 'rgba(255,255,255,.12)';
	ctx.beginPath();
	ctx.arc(cx, cy, R, 0, 7);
	ctx.stroke();
	ctx.strokeStyle = rules.bfgReady ? '#8cff6a' : '#4f9a3c';
	ctx.beginPath();
	ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * rules.charge) / TUNE.foodPerShot);
	ctx.stroke();
	let label = rules.bfgReady ? 'BFG готова' : `еда ${rules.charge}/${TUNE.foodPerShot}`;
	if (rules.hand === 'berserk') label = `рывок · ${Math.ceil(rules.berserkLeft)} с`;
	if (rules.hand === 'snare') label = 'капкан';
	if (rules.hand === 'plasma') label = `плазма · ${rules.plasmaLeft.toFixed(1)} с`;
	if (off) label = 'отключено';
	text(label, cx, cy + R + S * 0.7, S * 0.5, off ? '#ff6a5a' : '#efe0d8', 'center');
	// the boss's health with the two splits marked
	const boss = rules.boss;
	const bx = L.offsetX + mazeW / 2 - S * 5.5;
	const bw = S * 11;
	const by = top - S * 0.45;
	ctx.fillStyle = 'rgba(14,6,8,.85)';
	ctx.fillRect(bx, by, bw, S * 0.32);
	ctx.fillStyle = '#e0483c';
	ctx.fillRect(bx, by, (bw * Math.max(0, boss.hp)) / 1500, S * 0.32);
	ctx.fillStyle = '#ffe9a8';
	for (const t of [1000, 500]) ctx.fillRect(bx + (bw * t) / 1500 - 1, by - S * 0.1, 2, S * 0.52);
	ctx.strokeStyle = INK;
	ctx.lineWidth = 2;
	ctx.strokeRect(bx, by, bw, S * 0.32);
	// the stage
	const mid = L.offsetX + mazeW / 2;
	const st = rules.stage;
	if (st === 'omen') text('ОН РАСПАДАЕТСЯ', mid, by + S * 1.3, S * 0.8, '#ffe9a8', 'center');
	if (st === 'burst' || st === 'pacman') {
		const left = st === 'pacman' ? TUNE.pacman - rules.stageT : TUNE.pacman;
		text(`РАСПАД · ${Math.ceil(left)} с · съедено ${rules.eaten}/4`, mid, by + S * 1.3, S * 0.8, '#ffe9a8', 'center');
		ctx.fillStyle = '#ffe9a8';
		ctx.fillRect(bx, by + S * 1.6, (bw * left) / TUNE.pacman, S * 0.16);
	}
	if (st === 'merge') text('ОНИ ВОЗВРАЩАЮТСЯ К ЯДРУ', mid, by + S * 1.3, S * 0.8, '#ffe9a8', 'center');
	if (st === 'fight' && boss.isStunned && time - formedAt < 8) text('ОН СОБРАЛСЯ И ОГЛУШЁН: БЕЙ', mid, by + S * 1.3, S * 0.8, '#8cff6a', 'center');
	for (const q of rules.popups) {
		ctx.globalAlpha = Math.max(0, 1 - q.age / 1.1);
		text(q.text, px(L, q.x), py(L, q.y) - q.age * S, S * 0.55, '#ffd24a', 'center');
		ctx.globalAlpha = 1;
	}
	if (st === 'won' || st === 'lost') {
		ctx.fillStyle = 'rgba(8,2,4,.72)';
		ctx.fillRect(0, 0, w, h);
		text(st === 'won' ? 'ПОБЕДА' : 'ПОЙМАН', w / 2, h / 2, S * 2, '#ffe9a8', 'center');
		text('R или «Заново»', w / 2, h / 2 + S * 1.3, S * 0.8, '#efe0d8', 'center');
	}
}

function render(): void {
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.fillStyle = '#0d0709';
	ctx.fillRect(0, 0, w, h);
	const boss = rules.boss;
	world.setMood(boss.phase >= 2, boss.phase >= 3);
	world.drawWorld(ctx);
	const p = rules.player.position;
	const lights: DoomLight[] = [{ x: p.x, y: p.y, r: 6.5, tint: 0xffe2b0, a: 1 }];
	if (!rules.split && !boss.defeated) lights.push({ x: boss.position.x, y: boss.position.y, r: 3.2, tint: 0xff3a2a, a: 0.85 });
	world.drawMood(ctx, lights);
	const L = world.layout;
	fx.drawGround(ctx, L);
	if (!rules.split && !boss.defeated) combat.drawGround(ctx, boss, NO_PICKUPS, rules.grid, L, time);
	drawFoodField(L);
	drawPickups(L);
	drawCore(L);
	drawBoss(L);
	drawGhosts(L);
	if (!rules.split && !boss.defeated) {
		combat.drawAir(ctx, boss, L, time);
		combat.drawPull(ctx, boss, p, L, time);
	}
	heroView.draw(ctx, rules.player, L, time, {
		look: rules.berserk ? 'berserk' : 'normal',
		charge: rules.charging >= 0 ? rules.charging / TUNE.bfgCharge : 0,
		dying: false,
		chargeLight: true
	});
	drawBolts(L);
	fx.draw(ctx, L, rules.orbs, []);
	drawBurst(L);
	world.drawFx(ctx);
	world.drawOverlay(ctx);
	fx.drawHurt(ctx, w, h);
	drawHud(L);
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
