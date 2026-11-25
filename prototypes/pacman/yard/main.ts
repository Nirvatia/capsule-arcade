// Prototype: the demolition yard to play (DESIGN.md §13). The game's own hero and ghosts
// (`PlayerService`, `GhostService`: their speeds, cornering, scatter/chase, eyes going home) on
// `grid_01` without energizers; crates, bombs, blasts and pickups from `logic/yard/YardRules`;
// the look from `yardArt.ts` (the owner's approved master assets). The ghosts wear a placeholder
// look. Arrows / WASD move, Space lays a bomb, R starts over. ?night=1 the night.
import { GRID_01 } from '../../../src/games/pacman/config/mazes';
import type { GridMatrix, TileType } from '../../../src/games/pacman/config/gridConfig';
import { EventBus } from '../../../src/games/pacman/engine/EventBus';
import type { PacmanEventMap } from '../../../src/games/pacman/core/Events';
import { GridModel } from '../../../src/games/pacman/logic/maze/GridModel';
import { GridService } from '../../../src/games/pacman/logic/maze/GridService';
import { LevelProgress } from '../../../src/games/pacman/logic/level/LevelProgress';
import { ScoreModel } from '../../../src/games/pacman/logic/level/ScoreModel';
import { PlayerService } from '../../../src/games/pacman/logic/actors/PlayerService';
import { GhostService } from '../../../src/games/pacman/logic/actors/GhostService';
import type { PlayerDirection } from '../../../src/games/pacman/logic/actors/PlayerModel';
import { YARD_TUNE, YardRules } from '../../../src/games/pacman/logic/yard/YardRules';
import type { YardBlast } from '../../../src/games/pacman/logic/yard/YardRules';
import { HeroView } from '../../../src/games/pacman/render/actors/HeroView';
import { PacmanHero } from '../../../src/games/pacman/render/actors/hero/PacmanHero';
import { MsPacmanHero } from '../../../src/games/pacman/render/actors/hero/MsPacmanHero';
import { chargePainter } from '../../../src/games/pacman/render/actors/hero/heroCharge';
import { GhostView } from '../../../src/games/pacman/render/actors/GhostView';
import type { Light } from './yardArt';
import {
	YardMap,
	bakeYard,
	chooseCrates,
	drawBlast,
	drawBolt,
	drawBomb,
	drawCrate,
	drawDayGrade,
	drawDebris,
	drawNight,
	drawPickup,
	drawPipes,
	drawScorch
} from './yardArt';

const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const q = new URLSearchParams(location.search);
const D = Math.min(window.devicePixelRatio || 1, 2);
const night = q.get('night') === '1';
const LIVES = 3;
/** How close a ghost's centre may come before it catches him, tiles. */
const CONTACT = 0.6;
/** Seconds of his death before the next life. */
const DEATH = 1.6;
/** Seconds planks stay live before they are stamped into the ground. */
const PLANKS = 1.2;

// the yard has no energizers: the bomb is the only defence
const matrix: GridMatrix = GRID_01.map((row) => row.map((t): TileType => (t === 'EU' ? 'DT' : t)));
const map = new YardMap(matrix);

/** The game's grid, with the yard's crates and bombs in the way (eyes and the lair's door pass). */
class YardGrid extends GridService {
	rules: YardRules | null = null;
	isPlayerWalkable(x: number, y: number): boolean {
		return super.isPlayerWalkable(x, y) && !this.rules?.blocks(x, y);
	}
	isGhostWalkable(x: number, y: number, allowLair: boolean): boolean {
		return super.isGhostWalkable(x, y, allowLair) && (allowLair || !this.rules?.blocks(x, y));
	}
}

interface Run {
	grid: YardGrid;
	progress: LevelProgress;
	score: ScoreModel;
	player: PlayerService;
	ghosts: GhostService;
	rules: YardRules;
	lives: number;
	/** Seconds into his death, or -1. */
	dying: number;
	end: 'clear' | 'over' | null;
	planks: Array<{ x: number; y: number; fromX: number; fromY: number; age: number; seed: number }>;
	popups: Array<{ x: number; y: number; text: string; age: number }>;
	seen: Set<YardBlast>;
	time: number;
}

// ---------------------------------------------------------------- layout and the static yard

const vw = window.innerWidth;
const vh = window.innerHeight;
view.width = Math.round(vw * D);
view.height = Math.round(vh * D);
const S = Math.floor(Math.min((vh - 16) / map.R, (vw - 40) / map.C));
const OX = Math.round((vw - map.C * S) / 2);
const OY = Math.round((vh - map.R * S) / 2);
const layout = { tileSize: S, offsetX: OX, offsetY: OY };
const bake = bakeYard(map, { W: vw * D, H: vh * D, ox: OX * D, oy: OY * D, s: S * D }, 5);
/** Soot and settled planks, stamped as they happen. */
const ground = document.createElement('canvas');
ground.width = view.width;
ground.height = view.height;
const groundCtx = ground.getContext('2d') as CanvasRenderingContext2D;
groundCtx.scale(D, D);

const heroView = new HeroView(q.has('ms') ? new MsPacmanHero() : new PacmanHero(), chargePainter);
heroView.setSeason('summer');
const ghostView = new GhostView();
ghostView.style = 'drop';

const px = (x: number) => OX + x * S;
const py = (y: number) => OY + y * S;

function newRun(): Run {
	const grid = new YardGrid(new GridModel(matrix));
	const events = new EventBus<PacmanEventMap>();
	const score = new ScoreModel();
	const progress = new LevelProgress(grid, score, events);
	const player = new PlayerService(grid, progress, events);
	const ghosts = new GhostService(grid, player, progress);
	const seed = (Math.random() * 1e9) | 0;
	const rules = new YardRules(
		{ width: map.C, height: map.R, open: (x, y) => map.open(x, y) && !map.lair(x, y) },
		chooseCrates(map, seed),
		seed
	);
	grid.rules = rules;
	player.reset();
	ghosts.reset();
	heroView.reset();
	groundCtx.clearRect(0, 0, vw, vh);
	return {
		grid,
		progress,
		score,
		player,
		ghosts,
		rules,
		lives: LIVES,
		dying: -1,
		end: null,
		planks: [],
		popups: [],
		seen: new Set(),
		time: 0
	};
}

let run = newRun();
const held: PlayerDirection[] = [];
let bombRequest = false;

// ---------------------------------------------------------------- the rules of play

const under = (p: { x: number; y: number }) => ({ x: Math.floor(p.x), y: Math.floor(p.y) });

function die(r: Run): void {
	if (r.dying >= 0 || r.end) return;
	r.dying = 0;
}

function step(r: Run, dt: number): void {
	r.time += dt;
	for (const p of r.popups) p.age += dt;
	r.popups = r.popups.filter((p) => p.age < 1);
	for (const p of r.planks) p.age += dt;
	for (const p of r.planks.filter((p) => p.age >= PLANKS)) {
		drawDebris(groundCtx, px(p.x + 0.5), py(p.y + 0.5), S, px(p.fromX + 0.5), py(p.fromY + 0.5), PLANKS, p.seed);
	}
	r.planks = r.planks.filter((p) => p.age < PLANKS);
	if (r.end) return;
	if (r.dying >= 0) {
		r.dying += dt;
		if (r.dying >= DEATH) {
			r.lives -= 1;
			r.dying = -1;
			if (r.lives <= 0) {
				r.end = 'over';
				return;
			}
			r.rules.clearFire();
			r.player.reset();
			r.ghosts.reset();
			heroView.reset();
		}
		return;
	}
	const dir = held[held.length - 1];
	if (dir) r.player.setDesiredDirection(dir);
	if (bombRequest) {
		const t = under(r.player.position);
		r.rules.place(t.x, t.y);
		bombRequest = false;
	}
	r.player.update(dt);
	r.ghosts.update(dt);
	const hero = under(r.player.position);
	const got = r.rules.take(hero.x, hero.y);
	if (got) r.popups.push({ x: hero.x + 0.5, y: hero.y, text: got === 'bomb' ? '+1 BOMB' : '+1 FIRE', age: 0 });
	for (const b of r.rules.update(dt)) {
		r.planks.push({ ...b, age: 0, seed: b.x * 13 + b.y });
	}
	for (const blast of r.rules.blasts) {
		if (r.seen.has(blast)) continue;
		r.seen.add(blast);
		drawScorch(groundCtx, px(blast.x + 0.5), py(blast.y + 0.5), S, blast.arms, blast.x * 7 + blast.y);
	}
	// the fire: ghosts caught go home as eyes, 200 .. 1600 within one blast
	for (const ghost of r.ghosts.list) {
		if (ghost.state !== 'active' && ghost.state !== 'frightened' && ghost.state !== 'enraged') continue;
		const t = under(ghost.position);
		const blast = r.rules.burning(t.x, t.y);
		if (!blast) continue;
		r.ghosts.toEyes(ghost);
		blast.caught += 1;
		const points = 200 * 2 ** Math.min(3, blast.caught - 1);
		r.score.add(points);
		r.popups.push({ x: ghost.position.x, y: ghost.position.y - 0.4, text: String(points), age: 0 });
	}
	if (r.rules.burning(hero.x, hero.y)) die(r);
	// a touch
	const p = r.player.position;
	for (const ghost of r.ghosts.list) {
		if (ghost.state !== 'active' && ghost.state !== 'enraged') continue;
		const g = ghost.position;
		if (Math.hypot(g.x - p.x, g.y - p.y) < CONTACT) die(r);
	}
	if (r.progress.remainingDots <= 0) r.end = 'clear';
}

// ---------------------------------------------------------------- drawing

function draw(r: Run, t: number): void {
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.drawImage(bake, 0, 0);
	ctx.drawImage(ground, 0, 0);
	ctx.setTransform(D, 0, 0, D, 0, 0);
	// food (the nuts under crates wait for the crate to go)
	for (let y = 0; y < map.R; y += 1) {
		for (let x = 0; x < map.C; x += 1) {
			const tk = map.at(x, y);
			if (tk !== 'DT' && tk !== 'FT') continue;
			if (r.progress.isCollected(x, y) || r.rules.crates.has(`${x},${y}`)) continue;
			drawBolt(ctx, px(x + 0.5), py(y + 0.5), S, (x * 0.37 + y * 0.61) % 1);
		}
	}
	for (const [k, kind] of r.rules.pickups) {
		const [x, y] = k.split(',').map(Number);
		drawPickup(ctx, px(x + 0.5), py(y + 0.5), S, kind, t);
	}
	for (const k of r.rules.crates) {
		const [x, y] = k.split(',').map(Number);
		drawCrate(ctx, px(x + 0.5), py(y + 0.5), S, (x * 7 + y * 3) % 3, (x + y) % 5);
	}
	for (const p of r.planks) {
		drawDebris(ctx, px(p.x + 0.5), py(p.y + 0.5), S, px(p.fromX + 0.5), py(p.fromY + 0.5), p.age, p.seed);
	}
	const lights: Light[] = [];
	for (const b of r.rules.bombs) {
		const x = px(b.x + 0.5);
		const y = py(b.y + 0.5);
		drawBomb(ctx, x, y, S, t, Math.max(0, b.fuse / YARD_TUNE.fuse));
		lights.push({ x: x + S * 0.3, y: y - S * 0.4, r: S * 2.2, k: 0.7, tint: 'rgba(255,150,60,0.3)' });
	}
	ghostView.time = t;
	ghostView.draw(ctx, r.ghosts, layout, 0, false);
	heroView.draw(ctx, r.player, layout, t, { look: 'normal', charge: 0, dying: r.dying >= 0 });
	drawPipes(ctx, map, OX, OY, S);
	for (const [mx, my] of [
		[0.5, 0.5],
		[map.C - 0.5, map.R - 0.5],
		[map.C - 0.5, 6],
		[0.5, map.R - 7],
		[map.C / 2, map.R / 2 - 2]
	])
		lights.push({ x: px(mx), y: py(my), r: S * 6.5, k: 0.9, tint: 'rgba(255,196,120,0.13)' });
	for (const b of r.rules.blasts) {
		const heat = Math.max(0, 1 - (b.age / YARD_TUNE.life) * 1.2);
		const len = Math.max(...b.arms.map((a) => a.len));
		lights.push({ x: px(b.x + 0.5), y: py(b.y + 0.5), r: S * (3 + len * 1.6), k: 0.98 * heat, tint: `rgba(255,140,50,${0.45 * heat})` });
	}
	if (night) drawNight(ctx, vw, vh, lights);
	for (const b of r.rules.blasts) {
		drawBlast(ctx, px(b.x + 0.5), py(b.y + 0.5), S, b.arms, b.age / YARD_TUNE.life, b.x * 5 + b.y);
	}
	if (!night) drawDayGrade(ctx, vw, vh);
	for (const p of r.popups) {
		ctx.globalAlpha = 1 - p.age;
		ctx.fillStyle = '#fff3c4';
		ctx.strokeStyle = 'rgba(30,20,8,0.8)';
		ctx.lineWidth = 3;
		ctx.font = `800 ${Math.round(S * 0.55)}px "Arial Narrow", Arial, sans-serif`;
		ctx.textAlign = 'center';
		ctx.strokeText(p.text, px(p.x), py(p.y - p.age * 0.8));
		ctx.fillText(p.text, px(p.x), py(p.y - p.age * 0.8));
		ctx.globalAlpha = 1;
	}
	hud(r);
}

function hud(r: Run): void {
	ctx.textAlign = 'left';
	ctx.fillStyle = 'rgba(30,22,12,0.72)';
	ctx.beginPath();
	ctx.roundRect(12, 12, 172, 112, 10);
	ctx.fill();
	ctx.fillStyle = '#ffe6a8';
	ctx.font = '800 22px "Arial Narrow", Arial, sans-serif';
	ctx.fillText(String(r.score.score).padStart(6, '0'), 26, 42);
	ctx.font = '700 14px "Arial Narrow", Arial, sans-serif';
	ctx.fillStyle = '#f4d9a0';
	ctx.fillText(`LIVES ${'●'.repeat(Math.max(0, r.lives))}`, 26, 66);
	ctx.fillText(`BOMBS ${r.rules.maxBombs - r.rules.bombs.length}/${r.rules.maxBombs}   FIRE ${r.rules.range}`, 26, 88);
	ctx.fillText(`CRATES ${r.rules.crates.size}   NUTS ${r.progress.remainingDots}`, 26, 110);
	ctx.fillStyle = 'rgba(255,240,210,0.75)';
	ctx.font = '13px "Courier New", monospace';
	ctx.fillText('arrows/WASD move · Space bomb · R restart', 14, vh - 14);
	if (r.end) {
		ctx.fillStyle = 'rgba(20,14,8,0.7)';
		ctx.fillRect(0, vh / 2 - 54, vw, 108);
		ctx.textAlign = 'center';
		ctx.fillStyle = r.end === 'clear' ? '#ffd24a' : '#ff8a4a';
		ctx.font = '800 44px "Arial Narrow", Arial, sans-serif';
		ctx.fillText(r.end === 'clear' ? 'YARD CLEAR' : 'GAME OVER', vw / 2, vh / 2 + 8);
		ctx.font = '14px "Courier New", monospace';
		ctx.fillStyle = '#f4e6c8';
		ctx.fillText(`${r.score.score} · ${r.time | 0} s · R to play again`, vw / 2, vh / 2 + 36);
		ctx.textAlign = 'left';
	}
}

// ---------------------------------------------------------------- input and the loop

const KEYS: Record<string, PlayerDirection> = {
	ArrowUp: 'UP',
	ArrowDown: 'DOWN',
	ArrowLeft: 'LEFT',
	ArrowRight: 'RIGHT',
	KeyW: 'UP',
	KeyS: 'DOWN',
	KeyA: 'LEFT',
	KeyD: 'RIGHT'
};
window.addEventListener('keydown', (e) => {
	const dir = KEYS[e.code];
	if (dir) {
		e.preventDefault();
		if (!held.includes(dir)) held.push(dir);
	} else if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyX') {
		e.preventDefault();
		if (!e.repeat) bombRequest = true;
	} else if (e.code === 'KeyR') {
		run = newRun();
		held.length = 0;
	}
});
window.addEventListener('keyup', (e) => {
	const dir = KEYS[e.code];
	const i = dir ? held.indexOf(dir) : -1;
	if (i >= 0) held.splice(i, 1);
});
window.addEventListener('blur', () => (held.length = 0));

// a hook for scripted checks: the run, and a way to step it
(window as unknown as { __yard: unknown }).__yard = {
	run: () => run,
	press: (d: PlayerDirection | 'bomb' | null) => {
		held.length = 0;
		if (d === 'bomb') bombRequest = true;
		else if (d) held.push(d);
	},
	advance: (seconds: number) => {
		for (let s = 0; s < seconds; s += 1 / 60) step(run, 1 / 60);
	}
};

let last = -1;
function frame(now: number): void {
	const dt = last < 0 ? 1 / 60 : Math.min(0.05, (now - last) / 1000);
	last = now;
	step(run, dt);
	draw(run, now / 1000);
	requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
