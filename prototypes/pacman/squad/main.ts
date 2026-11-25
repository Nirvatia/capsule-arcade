// Prototype: the station's squad to play (DESIGN.md §7a). The game's hero and ghosts on
// `grid_station`, the approved station art (style B) lit, no dark; the squad's plays from
// `logic/station/StationSquad` (calm, the train, the pincer, the mimics), the escape from
// `logic/station/StationEscape` (the charge, the console, the lit route, the doors, the pulse).
// Placeholder creatures. Arrows / WASD, R restarts. ?ms Ms. Pac-Man, ?charge=0..1 starts with
// that much of the hatch charged (food eaten at random), ?high the High setting.
import { GRID_STATION } from '../../../src/games/pacman/config/mazes';
import { EventBus } from '../../../src/games/pacman/engine/EventBus';
import type { PacmanEventMap } from '../../../src/games/pacman/core/Events';
import { GridModel } from '../../../src/games/pacman/logic/maze/GridModel';
import { GridService } from '../../../src/games/pacman/logic/maze/GridService';
import type { GridPoint } from '../../../src/games/pacman/logic/maze/GridModel';
import { LevelProgress } from '../../../src/games/pacman/logic/level/LevelProgress';
import { ScoreModel } from '../../../src/games/pacman/logic/level/ScoreModel';
import { PlayerService } from '../../../src/games/pacman/logic/actors/PlayerService';
import { GhostService } from '../../../src/games/pacman/logic/actors/GhostService';
import type { PlayerDirection } from '../../../src/games/pacman/logic/actors/PlayerModel';
import { SQUAD_TUNE, StationSquad } from '../../../src/games/pacman/logic/station/StationSquad';
import { StationEscape } from '../../../src/games/pacman/logic/station/StationEscape';
import { StationWorld } from '../../../src/games/pacman/render/station/StationWorld';
import { HeroView } from '../../../src/games/pacman/render/actors/HeroView';
import { PacmanHero } from '../../../src/games/pacman/render/actors/hero/PacmanHero';
import { MsPacmanHero } from '../../../src/games/pacman/render/actors/hero/MsPacmanHero';
import { chargePainter } from '../../../src/games/pacman/render/actors/hero/heroCharge';
import {
	KIND_COLOR,
	breath,
	drawCapsule,
	drawCell,
	drawClaim,
	drawConsole,
	drawBeam,
	drawCreature,
	drawEmitter,
	drawPhantom,
	drawShaft,
	drawDoor,
	drawHatch,
	drawRoute
} from './squadLook';

const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const q = new URLSearchParams(location.search);
const D = Math.min(window.devicePixelRatio || 1, 2);
const DEBUG = q.has('debug');
const grid = GRID_STATION;
const H = grid.length;
const W = grid[0].length;

const TUNE = {
	hits: 3,
	power: 6,
	death: 1.4,
	contact: 0.6,
	/** The pulse: how long it stuns the squad. */
	stun: 2,
	/** The escape: the hero's head start, s; a restart's stun on the squad, s. */
	headStart: 1.5,
	restartStun: 3,
	/** The lair's exit delays against the season levels'. */
	exitScale: 0.35,
	console: { x: 12, y: 24 },
	hatch: { x: 6, y: 1 }
};

/** The game's grid with the escape's doors in the way, and the hatch no vent once it is open. */
class SquadGrid extends GridService {
	escape: StationEscape | null = null;
	squad: StationSquad | null = null;
	isPlayerWalkable(x: number, y: number): boolean {
		return super.isPlayerWalkable(x, y) && !this.escape?.blocks(x, y) && !this.squad?.blocks(x, y);
	}
	isGhostWalkable(x: number, y: number, allowLair: boolean): boolean {
		return super.isGhostWalkable(x, y, allowLair) && !this.escape?.blocks(x, y);
	}
	private isHatch(x: number, y: number): boolean {
		return this.escape?.state === 'running' && x === TUNE.hatch.x && y === TUNE.hatch.y;
	}
	isTeleport(x: number, y: number): boolean {
		return !this.isHatch(x, y) && super.isTeleport(x, y);
	}
	teleportDestination(x: number, y: number): GridPoint | undefined {
		return this.isHatch(x, y) ? undefined : super.teleportDestination(x, y);
	}
}

interface Run {
	grid: SquadGrid;
	progress: LevelProgress;
	score: ScoreModel;
	player: PlayerService;
	ghosts: GhostService;
	squad: StationSquad;
	escape: StationEscape;
	total: number;
	hits: number;
	dying: number;
	power: number;
	chain: number;
	grab: number;
	/** Seconds since the pulse went off, or -1. */
	pulse: number;
	end: 'out' | 'taken' | null;
	popups: Array<{ x: number; y: number; text: string; age: number }>;
	time: number;
}

const isFood = (x: number, y: number) => grid[y]?.[x] === 'DT' || grid[y]?.[x] === 'EU';

function newRun(): Run {
	const g = new SquadGrid(new GridModel(grid));
	const events = new EventBus<PacmanEventMap>();
	const score = new ScoreModel();
	const progress = new LevelProgress(g, score, events);
	const player = new PlayerService(g, progress, events);
	const ghosts = new GhostService(g, player, progress);
	const seed = (Math.random() * 1e9) | 0;
	const squad = new StationSquad(
		{
			walkable: (x, y) => g.isGhostWalkable(x, y, false),
			teleport: (x, y) => g.teleportDestination(x, y),
			eaten: (x, y) => isFood(x, y) && progress.isCollected(x, y),
			food: (x, y) => isFood(x, y) && !progress.isCollected(x, y),
			cell: (x, y) => grid[y]?.[x] === 'EU',
			vent: (x, y) => grid[y]?.[x] === '0A' || grid[y]?.[x] === '0B' || grid[y]?.[x] === '0C',
			width: W,
			height: H
		},
		seed
	);
	const escape = new StationEscape({ walkable: (x, y) => GridService.prototype.isPlayerWalkable.call(g, x, y) }, TUNE.console, TUNE.hatch);
	g.escape = escape;
	g.squad = squad;
	ghosts.setSquadGuide(squad);
	// the squad is out of its containment quickly: it plays as four
	ghosts.setTuning(ghosts.waves.scatter, ghosts.waves.chase, TUNE.exitScale);
	player.reset();
	ghosts.reset();
	heroView.reset();
	const total = progress.remainingDots;
	// ?charge: some of the food eaten already, at random
	const pre = Math.min(1, Math.max(0, Number(q.get('charge') ?? 0)));
	if (pre > 0) {
		const want = Math.round(total * 0.75 * pre);
		const tiles: Array<[number, number]> = [];
		for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) if (grid[y][x] === 'DT') tiles.push([x, y]);
		for (let i = tiles.length - 1; i > 0; i -= 1) {
			const j = Math.floor(Math.random() * (i + 1));
			[tiles[i], tiles[j]] = [tiles[j], tiles[i]];
		}
		for (const [x, y] of tiles.slice(0, want)) progress.collectAt(x, y);
	}
	return { grid: g, progress, score, player, ghosts, squad, escape, total, hits: TUNE.hits, dying: -1, power: 0, chain: 0, grab: 0, pulse: -1, end: null, popups: [], time: 0 };
}

const heroView = new HeroView(q.has('ms') ? new MsPacmanHero() : new PacmanHero(), chargePainter);
heroView.setSeason('winter');
const world = new StationWorld(grid);
world.setQuality(q.has('high') ? 'high' : 'medium');
let run = newRun();
const held: PlayerDirection[] = [];

const under = (p: { x: number; y: number }) => ({ x: Math.floor(p.x), y: Math.floor(p.y) });

function popup(r: Run, x: number, y: number, text: string): void {
	r.popups.push({ x, y, text, age: 0 });
}

function respawn(r: Run): void {
	r.player.reset();
	r.ghosts.reset();
	r.squad.reset(r.ghosts);
	r.power = 0;
	r.grab = 0;
	r.player.setMovementLocked(false);
	heroView.reset();
}

/**
 * The alarm: the squad holds a moment (the hero's head start); those in the containment come
 * out on their own time and join the chase.
 */
function seal(r: Run, hold: number): void {
	for (const g of r.ghosts.list) {
		if (g.state === 'active' || g.state === 'frightened') r.ghosts.freeze(g.kind, hold);
	}
}

function step(r: Run, dt: number): void {
	r.time += dt;
	for (const p of r.popups) p.age += dt;
	r.popups = r.popups.filter((p) => p.age < 1.2);
	if (r.pulse >= 0) r.pulse += dt;
	if (r.end) return;
	if (r.dying >= 0) {
		r.dying += dt;
		if (r.dying >= TUNE.death) {
			r.dying = -1;
			r.hits -= 1;
			if (r.hits <= 0) {
				r.end = 'taken';
				return;
			}
			respawn(r);
		}
		return;
	}
	const dir = held[held.length - 1];
	if (dir) r.player.setDesiredDirection(dir);
	if (r.grab > 0) {
		r.grab -= dt;
		r.player.setMovementLocked(r.grab > 0);
	}
	r.player.update(dt);
	r.ghosts.update(dt);
	const hero = under(r.player.position);
	// the power cell: the play breaks, the mimics show, the squad can be eaten
	if (r.progress.consumePendingEnergizer()) {
		r.squad.onPower(r.ghosts);
		r.ghosts.frightenActive();
		r.ghosts.setPowerActive(true);
		r.power = TUNE.power;
		r.chain = 0;
	}
	if (r.power > 0) {
		r.power -= dt;
		if (r.power <= 0) {
			r.ghosts.endFrightened();
			r.ghosts.setPowerActive(false);
		}
	}
	r.escape.setFood(r.total - r.progress.remainingDots, r.total);
	const ev = r.escape.update(dt, hero);
	if (ev.armed) popup(r, TUNE.console.x + 0.5, TUNE.console.y - 0.4, 'TO THE CONSOLE');
	if (ev.started) {
		r.squad.chase(
			r.ghosts,
			(x, y) => r.escape.onRoute(x, y),
			() => r.escape.route
		);
		seal(r, TUNE.headStart);
		popup(r, hero.x + 0.5, hero.y - 0.4, 'RUN');
	}
	if (ev.out) {
		r.end = 'out';
		return;
	}
	const sev = r.squad.update(dt, r.ghosts, hero, r.player.facing);
	if (sev.grab > 0) {
		r.grab = sev.grab;
		r.player.setMovementLocked(true);
		popup(r, hero.x + 0.5, hero.y - 0.4, 'GRABBED');
	}
	// touches
	const p = r.player.position;
	for (const ghost of r.ghosts.list) {
		if (r.squad.hidden(ghost.kind)) continue;
		const gp = ghost.position;
		if (Math.hypot(gp.x - p.x, gp.y - p.y) >= TUNE.contact) continue;
		if (ghost.state === 'frightened') {
			r.ghosts.toEyes(ghost);
			r.chain += 1;
			const pts = 200 * 2 ** Math.min(3, r.chain - 1);
			r.score.add(pts);
			popup(r, gp.x, gp.y - 0.4, String(pts));
			continue;
		}
		if ((ghost.state !== 'active' && ghost.state !== 'enraged') || r.squad.harmless(ghost.kind)) continue;
		// stunned by the pulse or held by the alarm: it does not bite
		if (r.ghosts.frozenFor(ghost.kind) > 0) continue;
		if (r.escape.state === 'running') {
			if (r.escape.touch() === 'pulse') {
				// the pulse: the squad thrown off, stunned
				r.pulse = 0;
				for (const g of r.ghosts.list) r.ghosts.freeze(g.kind, TUNE.stun);
				popup(r, p.x, p.y - 0.5, 'PULSE');
			} else {
				r.player.placeAt(TUNE.console);
				r.squad.chase(
			r.ghosts,
			(x, y) => r.escape.onRoute(x, y),
			() => r.escape.route
		);
				seal(r, TUNE.restartStun);
				popup(r, TUNE.console.x + 0.5, TUNE.console.y - 0.4, 'AGAIN');
			}
			break;
		}
		r.dying = 0;
		break;
	}
}

// ---------------------------------------------------------------- drawing

function draw(r: Run, t: number): void {
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	if (view.width !== Math.round(vw * D)) {
		view.width = Math.round(vw * D);
		view.height = Math.round(vh * D);
	}
	ctx.setTransform(D, 0, 0, D, 0, 0);
	world.resize(vw, vh, D);
	const L = world.layout;
	const S = L.tileSize;
	const at = (x: number, y: number): [number, number] => [L.offsetX + x * S, L.offsetY + y * S];
	world.drawWorld(ctx, 1);
	world.drawGlow(ctx, 1, t);
	const escaping = r.escape.state === 'running';
	// the route and the doors
	if (escaping) drawRoute(ctx, r.escape.route.map((tt) => ({ x: at(tt.x + 0.5, 0)[0], y: at(0, tt.y + 0.5)[1] })), S, t);
	for (const d of r.escape.doors) {
		const horizontalCorridor = grid[d.y][d.x - 1] !== 'WL' && grid[d.y][d.x + 1] !== 'WL';
		const [x, y] = at(d.x + 0.5, d.y + 0.5);
		drawDoor(ctx, d, x, y, S, horizontalCorridor ? 'v' : 'h');
	}
	// the interception: the junction ahead blinks red while one is coming for it
	const ic = r.squad.intercept;
	if (escaping && ic) {
		const [ix, iy] = at(ic.x + 0.5, ic.y + 0.5);
		const on = ic.warn > 0 ? Math.sin(t * Math.PI * 5) > 0 : true;
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.fillStyle = `rgba(255,50,40,${on ? 0.55 : 0.15})`;
		ctx.fillRect(ix - S / 2, iy - S / 2, S, S);
		ctx.restore();
	}
	const cs = r.escape.state === 'armed' ? 'armed' : escaping ? 'running' : 'off';
	drawConsole(ctx, ...at(TUNE.console.x + 0.5, TUNE.console.y + 0.5), S, t, cs);
	drawHatch(ctx, ...at(TUNE.hatch.x + 0.5, TUNE.hatch.y + 0.5), S, t, escaping ? 1 : r.escape.state === 'armed' ? 0.4 : 0);
	// the food, and the lurkers among it, out of step
	const sq = r.squad;
	const lurkAt = new Map(sq.hiddenList.filter((h) => h.as !== 'vent' && h.state === 'hidden').map((h) => [`${h.x},${h.y}`, h]));
	const b = breath(t);
	for (let y = 0; y < H; y += 1) {
		for (let x = 0; x < W; x += 1) {
			const tk = grid[y][x];
			const m = lurkAt.get(`${x},${y}`);
			const [cx, cy] = at(x + 0.5, y + 0.5);
			if (m) {
				if (m.as === 'cell') drawCell(ctx, cx, cy, S, breath(t, 0.5));
				else drawCapsule(ctx, cx, cy, S, breath(t, 0.5), D);
				continue;
			}
			if (r.progress.isCollected(x, y)) continue;
			if (tk === 'DT') drawCapsule(ctx, cx, cy, S, b, D);
			else if (tk === 'EU') drawCell(ctx, cx, cy, S, b);
		}
	}
	// one waiting in a vent shaft: its eyes, its glow
	for (const h of sq.hiddenList) {
		if (h.as !== 'vent' || h.state === 'fading') continue;
		const glow = h.state === 'glow' ? Math.min(1, h.time / SQUAD_TUNE.glow) : 0.15 + 0.1 * Math.sin(t * 2);
		drawShaft(ctx, ...at(h.x + 0.5, h.y + 0.5), S, t, glow, KIND_COLOR[h.kind]);
	}
	// the fence: told, charging, lit
	const fenceTold = sq.phase === 'tell' && sq.next === 'fence';
	if (fenceTold || sq.tactic === 'fence') {
		for (const beam of sq.beams) {
			const [x0, y0] = beam.axis === 'row' ? at(0.5, beam.at + 0.5) : at(beam.at + 0.5, 0.5);
			const [x1, y1] = beam.axis === 'row' ? at(W - 0.5, beam.at + 0.5) : at(beam.at + 0.5, H - 0.5);
			drawBeam(ctx, x0, y0, x1, y1, S, t, beam.charge, beam.lit);
			if (beam.charge > 0 && !beam.lit) drawEmitter(ctx, ...at(beam.x + 0.5, beam.y + 0.5), S, beam.charge);
		}
	}
	// the creatures; the phantom shows only as the light guttering round it
	for (const g of r.ghosts.list) {
		const m = sq.hidden(g.kind);
		if (m && m.state !== 'fading') continue;
		const [x, y] = at(g.position.x, g.position.y);
		if (sq.role(g.kind) === 'phantom' && g.state === 'active') {
			drawPhantom(ctx, x, y, S, t);
			continue;
		}
		const fade = m ? Math.min(1, m.time / SQUAD_TUNE.fade) : 0;
		drawCreature(ctx, g, x, y, S, t, { fade, tell: sq.phase === 'tell', harmless: sq.harmless(g.kind) && !m, powerLeft: r.power });
	}
	if (DEBUG) debugView(r, at, S);
	heroView.draw(ctx, r.player, L, t, { look: 'normal', charge: 0, dying: r.dying >= 0 });
	// the pulse ring
	if (r.pulse >= 0 && r.pulse < 0.7) {
		const [hx, hy] = at(r.player.position.x, r.player.position.y);
		ctx.strokeStyle = `rgba(160,255,230,${1 - r.pulse / 0.7})`;
		ctx.lineWidth = S * 0.2;
		ctx.beginPath();
		ctx.arc(hx, hy, S * (0.5 + r.pulse * 9), 0, Math.PI * 2);
		ctx.stroke();
	}
	// the mood: a tell dims and flickers the station (2.5 a second, never a flash); the escape's alarm
	if (sq.phase === 'tell') {
		ctx.fillStyle = `rgba(4,8,14,${0.12 + 0.12 * Math.sin(t * Math.PI * 5) ** 2})`;
		ctx.fillRect(0, 0, vw, vh);
	}
	if (escaping || r.escape.state === 'armed') {
		const a = escaping ? 0.1 + 0.08 * Math.sin(t * Math.PI * 1.6) : 0.04;
		const gr = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.25, vw / 2, vh / 2, Math.hypot(vw, vh) * 0.6);
		gr.addColorStop(0, `rgba(255,40,30,${a * 0.4})`);
		gr.addColorStop(1, `rgba(255,40,30,${a * 2})`);
		ctx.fillStyle = gr;
		ctx.fillRect(0, 0, vw, vh);
	}
	world.drawGrain(ctx, t);
	for (const p of r.popups) {
		const [x, y] = at(p.x, p.y - p.age * 0.8);
		ctx.globalAlpha = Math.max(0, 1 - p.age / 1.2);
		ctx.font = `800 ${Math.round(S * 0.6)}px "Arial Narrow", Arial, sans-serif`;
		ctx.textAlign = 'center';
		ctx.lineWidth = 3;
		ctx.strokeStyle = 'rgba(0,0,0,0.8)';
		ctx.fillStyle = '#e8fff8';
		ctx.strokeText(p.text, x, y);
		ctx.fillText(p.text, x, y);
		ctx.globalAlpha = 1;
	}
	hud(r, vw, vh);
}

/** ?debug: what the squad thinks: his foreseen way, each one's role and target, the open way. */
function debugView(r: Run, at: (x: number, y: number) => [number, number], S: number): void {
	const sq = r.squad;
	ctx.save();
	ctx.fillStyle = 'rgba(255,255,120,0.8)';
	sq.foreseen.forEach((p, i) => {
		const [x, y] = at(p.x + 0.5, p.y + 0.5);
		ctx.globalAlpha = 1 - i / (sq.foreseen.length + 2);
		ctx.beginPath();
		ctx.arc(x, y, S * 0.12, 0, Math.PI * 2);
		ctx.fill();
	});
	ctx.globalAlpha = 1;
	for (const g of r.ghosts.list) {
		const role = sq.role(g.kind);
		const [x, y] = at(g.position.x, g.position.y);
		const tg = sq.targets.get(g.kind);
		if (tg) drawClaim(ctx, x, y, ...at(tg.x + 0.5, tg.y + 0.5), S, KIND_COLOR[g.kind], 0.7);
		ctx.font = `700 ${Math.round(S * 0.42)}px "Courier New", monospace`;
		ctx.textAlign = 'center';
		ctx.fillStyle = '#ffffff';
		ctx.strokeStyle = 'rgba(0,0,0,0.8)';
		ctx.lineWidth = 3;
		ctx.strokeText(role, x, y - S * 0.6);
		ctx.fillText(role, x, y - S * 0.6);
	}
	for (const h of sq.hiddenList) {
		const [x, y] = at(h.x + 0.5, h.y + 0.5);
		ctx.strokeStyle = KIND_COLOR[h.kind];
		ctx.lineWidth = 2;
		ctx.strokeRect(x - S * 0.45, y - S * 0.45, S * 0.9, S * 0.9);
	}
	if (sq.openWay) {
		const [x, y] = at(sq.openWay.x + 0.5, sq.openWay.y + 0.5);
		ctx.strokeStyle = '#7dffb0';
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.arc(x, y, S * 0.5, 0, Math.PI * 2);
		ctx.stroke();
	}
	ctx.restore();
}

function hud(r: Run, vw: number, vh: number): void {
	const x = 18;
	ctx.textAlign = 'left';
	ctx.fillStyle = 'rgba(6,12,16,0.75)';
	ctx.beginPath();
	ctx.roundRect(10, 10, 210, 150, 8);
	ctx.fill();
	ctx.fillStyle = '#d8f4ee';
	ctx.font = '700 13px "Courier New", monospace';
	ctx.fillText('HATCH', x, 32);
	ctx.fillStyle = '#1a2a2e';
	ctx.fillRect(x, 38, 190, 10);
	ctx.fillStyle = r.escape.charge >= 1 ? '#7dffb0' : '#5fe3ff';
	ctx.fillRect(x, 38, 190 * r.escape.charge, 10);
	ctx.fillStyle = '#d8f4ee';
	ctx.fillText(`HITS  ${'■ '.repeat(Math.max(0, r.hits))}${'□ '.repeat(Math.max(0, TUNE.hits - r.hits))}`, x, 70);
	const sq = r.squad;
	const play = sq.chasing ? 'THE CHASE' : sq.phase === 'tell' ? `${(sq.next ?? '').toUpperCase()} …` : sq.phase === 'on' ? (sq.tactic ?? '').toUpperCase() : 'calm';
	ctx.fillText(`SQUAD ${play}`, x, 92);
	ctx.fillText(`SCORE ${r.score.score}`, x, 114);
	if (r.escape.state === 'running') ctx.fillText(`PULSE ${r.escape.pulse ? 'ready' : 'spent'}`, x, 136);
	else if (r.escape.state === 'armed') ctx.fillText('→ the console', x, 136);
	ctx.fillStyle = 'rgba(216,244,238,0.6)';
	ctx.font = '12px "Courier New", monospace';
	ctx.fillText('arrows/WASD · R restart · ?charge=0.9 near the escape · ?debug what the squad thinks', 14, vh - 14);
	if (r.end) {
		ctx.fillStyle = 'rgba(0,0,0,0.65)';
		ctx.fillRect(0, vh / 2 - 50, vw, 100);
		ctx.textAlign = 'center';
		ctx.fillStyle = r.end === 'out' ? '#7dffb0' : '#ff6b5e';
		ctx.font = '800 42px "Arial Narrow", Arial, sans-serif';
		ctx.fillText(r.end === 'out' ? 'ESCAPED' : 'TAKEN', vw / 2, vh / 2 + 6);
		ctx.font = '14px "Courier New", monospace';
		ctx.fillStyle = '#d8f4ee';
		ctx.fillText(`${r.score.score} · ${r.time | 0} s · restarts ${r.escape.restarts} · R to play again`, vw / 2, vh / 2 + 34);
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

(window as unknown as { __squad: unknown }).__squad = {
	run: () => run,
	press: (d: PlayerDirection | null) => {
		held.length = 0;
		if (d) held.push(d);
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
