// Prototype: the station's swarm (DESIGN.md §7a) to be played before it goes into the game. The
// real maze, the real hero and his movement, the station's baked look and light map; the swarm is
// the game's `SwarmField`, drawn by `render/station/stationSwarm`. The torch, its fuel, the health,
// the beacons and the escape are written here for the feel; they move into the game's rules once
// the owner has played them. Arrows / WASD steer, F or Shift drops / takes the torch, R restarts.
import { GRID_STATION } from '../../../src/games/pacman/config/mazes';
import { isTeleportToken } from '../../../src/games/pacman/config/gridConfig';
import { EventBus } from '../../../src/games/pacman/engine/EventBus';
import type { PacmanEventMap } from '../../../src/games/pacman/core/Events';
import { GridModel } from '../../../src/games/pacman/logic/maze/GridModel';
import { GridService } from '../../../src/games/pacman/logic/maze/GridService';
import { LevelProgress } from '../../../src/games/pacman/logic/level/LevelProgress';
import { ScoreModel } from '../../../src/games/pacman/logic/level/ScoreModel';
import { PlayerService } from '../../../src/games/pacman/logic/actors/PlayerService';
import type { PlayerDirection } from '../../../src/games/pacman/logic/actors/PlayerModel';
import { SwarmField } from '../../../src/games/pacman/logic/station/SwarmField';
import type { SwarmLight, SwarmPoint, SwarmTuning } from '../../../src/games/pacman/logic/station/SwarmField';
import { StationWorld } from '../../../src/games/pacman/render/station/StationWorld';
import { drawSwarm } from '../../../src/games/pacman/render/station/stationSwarm';
import { drawFlare, drawSpore } from '../../../src/games/pacman/render/station/stationFood';
import { stationGlow } from '../../../src/games/pacman/render/station/stationColors';
import { HeroView } from '../../../src/games/pacman/render/actors/HeroView';
import { PacmanHero } from '../../../src/games/pacman/render/actors/hero/PacmanHero';
import { chargePainter } from '../../../src/games/pacman/render/actors/hero/heroCharge';
import type { Phase } from '../../../src/games/pacman/render/station/stationPaint';

const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const params0 = new URLSearchParams(location.search);
// the game's Medium by default (the page has no Auto to step down on a weak GPU); ?high for High
const HIGH = params0.has('high');
const D = Math.min(window.devicePixelRatio || 1, HIGH ? 2 : 1.5);
const grid = GRID_STATION;
const W = grid[0].length;
const H = grid.length;
const params = new URLSearchParams(location.search);

/** Everything to tune by feel, in one place. */
const TUNE = {
	/** The torch: seconds a full one lasts, fuel a dot gives, its radius empty and full (tiles). */
	burn: 28,
	perDot: 0.05,
	rMin: 0.9,
	rMax: 2.9,
	/** How much the swarm pressing round the fire shrinks it (per unit of density nearby). */
	press: 0.045,
	/** Health drained per second per unit of density, out of the light. */
	bite: 0.55,
	/** A lit beacon's radius (tiles). */
	beacon: 4.6,
	/** The swarm by beacons lit (0..3), then the nest's breakout. */
	stages: [
		{ output: 1.1, spread: 1.4, pull: 0.85, push: 7, maxMass: 26 },
		{ output: 1.5, spread: 1.4, pull: 1.0, push: 7, maxMass: 36 },
		{ output: 2.0, spread: 1.5, pull: 1.15, push: 7, maxMass: 46 },
		{ output: 2.6, spread: 1.6, pull: 1.3, push: 7, maxMass: 56 }
	] as SwarmTuning[],
	breakout: { output: 7, spread: 1.8, pull: 1.7, push: 7, maxMass: 130 } as SwarmTuning
};

const tileAt = (x: number, y: number) => grid[y]?.[x];
const swarmWalkable = (x: number, y: number) => {
	const t = tileAt(x, y);
	return t !== undefined && t !== 'WL' && t !== 'ES';
};
const find = (pred: (t: string) => boolean): SwarmPoint[] => {
	const out: SwarmPoint[] = [];
	for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) if (pred(tileAt(x, y) ?? '')) out.push({ x, y });
	return out;
};
const NEST = find((t) => ['LT', 'BY', 'IY', 'PY', 'CE', 'DB', 'LE'].includes(t));
const BEACONS = find((t) => t === 'EU');
const VENTS = ['0B', '0C', '0A'].map((id) => find((t) => t === id));

interface Run {
	grid: GridService;
	progress: LevelProgress;
	player: PlayerService;
	field: SwarmField;
	fuel: number;
	hp: number;
	/** The torch lying on a tile, or null when the hero carries it. */
	dropped: { x: number; y: number; fuel: number } | null;
	lit: boolean[];
	breakout: boolean;
	hatch: SwarmPoint | null;
	end: 'caught' | 'escaped' | null;
	time: number;
}

function newRun(): Run {
	const g = new GridService(new GridModel(grid));
	const events = new EventBus<PacmanEventMap>();
	const progress = new LevelProgress(g, new ScoreModel(), events);
	const player = new PlayerService(g, progress, events);
	const field = new SwarmField({
		width: W,
		height: H,
		walkable: swarmWalkable,
		teleport: (x, y) => (isTeleportToken(tileAt(x, y) ?? '') ? (g.teleportDestination(x, y) ?? null) : null)
	});
	heroView.reset();
	return { grid: g, progress, player, field, fuel: 1, hp: 1, dropped: null, lit: BEACONS.map(() => false), breakout: false, hatch: null, end: null, time: 0 };
}

const heroView = new HeroView(params.has('ms') ? new PacmanHero() : new PacmanHero(), chargePainter);
heroView.setSeason('winter');
const world = new StationWorld(grid);
world.setQuality(HIGH ? 'high' : 'medium');
let run = newRun();
const held: PlayerDirection[] = [];
let dropRequest = false;

function litCount(r: Run): number {
	return r.lit.filter(Boolean).length;
}

function torchRadius(r: Run, fuel: number, at: SwarmPoint): number {
	let press = 0;
	for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) press += r.field.at(Math.floor(at.x) + dx, Math.floor(at.y) + dy);
	const full = TUNE.rMin + (TUNE.rMax - TUNE.rMin) * Math.pow(Math.max(0, fuel), 0.6);
	return fuel <= 0 ? 0 : Math.max(0.35, full - press * TUNE.press);
}

function lightsOf(r: Run): SwarmLight[] {
	const out: SwarmLight[] = [];
	const p = r.player.position;
	if (!r.dropped && r.fuel > 0) out.push({ x: p.x, y: p.y, r: torchRadius(r, r.fuel, p) });
	if (r.dropped && r.dropped.fuel > 0) {
		const d = { x: r.dropped.x + 0.5, y: r.dropped.y + 0.5 };
		out.push({ ...d, r: torchRadius(r, r.dropped.fuel, d) });
	}
	BEACONS.forEach((b, i) => r.lit[i] && out.push({ x: b.x + 0.5, y: b.y + 0.5, r: TUNE.beacon }));
	return out;
}

function farthestFrom(r: Run, from: SwarmPoint): SwarmPoint {
	const dist = new Map<string, number>([[`${from.x},${from.y}`, 0]]);
	const queue = [from];
	let best = from;
	for (let q = 0; q < queue.length; q += 1) {
		const a = queue[q];
		for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
			const b = { x: a.x + dx, y: a.y + dy };
			const k = `${b.x},${b.y}`;
			if (!dist.has(k) && r.grid.isWalkable(b.x, b.y)) {
				dist.set(k, (dist.get(`${a.x},${a.y}`) ?? 0) + 1);
				queue.push(b);
				if ((dist.get(k) ?? 0) > (dist.get(`${best.x},${best.y}`) ?? 0) && tileAt(b.x, b.y) === 'DT') best = b;
			}
		}
	}
	return best;
}

function step(r: Run, dt: number): void {
	if (r.end) return;
	r.time += dt;
	const want = held[held.length - 1];
	if (want) r.player.setDesiredDirection(want);
	const dotsBefore = r.progress.remainingDots;
	r.player.update(dt);
	const eaten = dotsBefore - r.progress.remainingDots;
	const tile = r.player.tile;
	// the torch: dropped or taken back; a lying one burns where it lies
	if (dropRequest) {
		dropRequest = false;
		if (!r.dropped && r.fuel > 0) {
			r.dropped = { x: tile.x, y: tile.y, fuel: r.fuel };
			r.fuel = 0;
		} else if (r.dropped && r.dropped.x === tile.x && r.dropped.y === tile.y) {
			r.fuel = r.dropped.fuel;
			r.dropped = null;
		}
	}
	if (r.dropped && r.fuel <= 0 && r.dropped.x === tile.x && r.dropped.y === tile.y && r.player.facing) {
		// running over it takes it back
		r.fuel = r.dropped.fuel;
		r.dropped = null;
	}
	if (!r.dropped) r.fuel = Math.min(1, r.fuel + eaten * TUNE.perDot);
	r.fuel = Math.max(0, r.fuel - dt / TUNE.burn);
	if (r.dropped) {
		r.dropped.fuel = Math.max(0, r.dropped.fuel - dt / TUNE.burn);
		if (r.dropped.fuel <= 0) r.dropped = null;
	}
	// the beacons
	BEACONS.forEach((b, i) => {
		if (!r.lit[i] && r.progress.isCollected(b.x, b.y)) {
			r.lit[i] = true;
			r.fuel = 1;
			if (r.dropped) {
				r.dropped = null;
			}
		}
	});
	const lit = litCount(r);
	if (lit === 4 && !r.breakout) {
		r.breakout = true;
		for (const n of NEST) r.field.add(n.x, n.y, 3);
		r.hatch = farthestFrom(r, tile);
	}
	// the swarm
	const sources = [...NEST, ...VENTS.slice(0, Math.min(3, lit)).flat()];
	const tuning = r.breakout ? TUNE.breakout : (TUNE.stages[lit] ?? TUNE.stages[3]);
	r.field.step(dt, r.player.position, lightsOf(r), sources, tuning);
	// the bite: out of the light inside the swarm
	const lights = lightsOf(r);
	const p = r.player.position;
	const safe = lights.some((l) => Math.hypot(l.x - p.x, l.y - p.y) < l.r * 0.85);
	if (!safe) {
		const d = r.field.at(tile.x, tile.y);
		r.hp = Math.max(0, r.hp - d * TUNE.bite * dt);
	}
	if (r.hp <= 0) r.end = 'caught';
	if (r.hatch && tile.x === r.hatch.x && tile.y === r.hatch.y) r.end = 'escaped';
}

function litAt(lights: readonly SwarmLight[], x: number, y: number): number {
	let k = 0;
	for (const l of lights) k = Math.max(k, 1 - Math.hypot(l.x - x, l.y - y) / Math.max(0.01, l.r));
	return Math.max(0, k);
}

function draw(r: Run, dt: number, now: number): void {
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	if (view.width !== Math.round(vw * D) || view.height !== Math.round(vh * D)) {
		view.width = Math.round(vw * D);
		view.height = Math.round(vh * D);
	}
	ctx.setTransform(D, 0, 0, D, 0, 0);
	world.resize(vw, vh, D);
	const L = world.layout;
	const S = L.tileSize;
	const lit = litCount(r);
	const phase: Phase = r.breakout ? 3 : lit >= 2 ? 2 : 1;
	const t = now / 1000;
	world.drawWorld(ctx, phase);
	const lights = lightsOf(r);
	const flares = lights.map((l) => ({ x: l.x, y: l.y, r: l.r + 1.2 }));
	world.drawDark(ctx, {
		phase,
		time: t,
		hero: null,
		flares,
		beam: [],
		solid: (x, y) => !swarmWalkable(x, y)
	});
	world.drawGlow(ctx, phase, t);
	// the dots and the beacons
	for (let y = 0; y < H; y += 1) {
		for (let x = 0; x < W; x += 1) {
			const tk = tileAt(x, y);
			const cx = L.offsetX + (x + 0.5) * S;
			const cy = L.offsetY + (y + 0.5) * S;
			if (tk === 'DT' && !r.progress.isCollected(x, y)) drawSpore(ctx, cx, cy, S, t, ((x * 31 + y * 17) % 13) / 13);
		}
	}
	BEACONS.forEach((b, i) => {
		const cx = L.offsetX + (b.x + 0.5) * S;
		const cy = L.offsetY + (b.y + 0.5) * S;
		if (r.lit[i]) {
			ctx.save();
			ctx.globalCompositeOperation = 'lighter';
			stationGlow(ctx, cx, cy, S * 2.4, '#ff9a4a', 0.5);
			ctx.restore();
			drawFlare(ctx, cx, cy, S * 1.6, t, true);
		} else {
			ctx.save();
			ctx.globalCompositeOperation = 'lighter';
			stationGlow(ctx, cx, cy, S * 1.3, '#ff7a3a', 0.25 + 0.08 * Math.sin(t * 1.4 + i));
			ctx.restore();
			drawFlare(ctx, cx, cy, S * 1.3, t, false);
		}
	});
	if (r.hatch) {
		const cx = L.offsetX + (r.hatch.x + 0.5) * S;
		const cy = L.offsetY + (r.hatch.y + 0.5) * S;
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		stationGlow(ctx, cx, cy, S * 2, '#5dff8a', 0.55);
		ctx.restore();
		ctx.fillStyle = '#5dff8a';
		ctx.fillRect(cx - S * 0.35, cy - S * 0.35, S * 0.7, S * 0.7);
	}
	if (r.dropped) {
		drawFlare(ctx, L.offsetX + (r.dropped.x + 0.5) * S, L.offsetY + (r.dropped.y + 0.5) * S, S, t, r.dropped.fuel > 0);
	}
	if (!params.has('noswarm')) drawSwarm(ctx, r.field, L, t, (x, y) => litAt(lights, x, y));
	// the hero and his fire
	heroView.draw(ctx, r.player, L, t, { look: 'normal', charge: 0, dying: r.end === 'caught' });
	const p = r.player.position;
	if (!r.dropped && r.fuel > 0) drawFlare(ctx, L.offsetX + (p.x + 0.35) * S, L.offsetY + (p.y - 0.3) * S, S * 0.8, t, true);
	if (!params.has('nograin')) world.drawGrain(ctx, t);
	hud(r, vw, vh);
	void dt;
}

function bar(x: number, y: number, w: number, v: number, color: string, label: string): void {
	ctx.fillStyle = 'rgba(0,0,0,.6)';
	ctx.fillRect(x - 2, y - 2, w + 4, 16);
	ctx.fillStyle = '#1a1a1a';
	ctx.fillRect(x, y, w, 12);
	ctx.fillStyle = color;
	ctx.fillRect(x, y, w * Math.max(0, Math.min(1, v)), 12);
	ctx.fillStyle = '#d8e2ea';
	ctx.font = '700 12px "Courier New", monospace';
	ctx.fillText(label, x, y - 6);
}

function hud(r: Run, vw: number, vh: number): void {
	const x = 24;
	bar(x, 40, 200, r.hp, '#ff3b4a', 'HEALTH');
	bar(x, 80, 200, r.dropped ? r.dropped.fuel : r.fuel, '#ffb04a', r.dropped ? 'TORCH (DROPPED)' : 'TORCH');
	ctx.fillStyle = '#d8e2ea';
	ctx.font = '700 13px "Courier New", monospace';
	ctx.fillText(`BEACONS ${litCount(r)}/4`, x, 122);
	ctx.fillText(`SWARM ${r.field.mass.toFixed(0)}`, x, 142);
	ctx.fillStyle = 'rgba(216,226,234,.6)';
	ctx.font = '12px "Courier New", monospace';
	ctx.fillText('arrows/WASD · F drop/take torch · R restart', x, vh - 20);
	if (r.end) {
		ctx.fillStyle = 'rgba(0,0,0,.6)';
		ctx.fillRect(0, vh / 2 - 50, vw, 100);
		ctx.fillStyle = r.end === 'escaped' ? '#5dff8a' : '#ff3b4a';
		ctx.font = '700 40px "Arial Narrow", Arial, sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText(r.end === 'escaped' ? 'ESCAPED' : 'CAUGHT', vw / 2, vh / 2 + 6);
		ctx.font = '14px "Courier New", monospace';
		ctx.fillText(`${(r.time | 0)} s · R to run again`, vw / 2, vh / 2 + 34);
		ctx.textAlign = 'left';
	}
}

const KEYS: Record<string, PlayerDirection> = {
	ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
	KeyW: 'UP', KeyS: 'DOWN', KeyA: 'LEFT', KeyD: 'RIGHT'
};
window.addEventListener('keydown', (e) => {
	const dir = KEYS[e.code];
	if (dir) {
		e.preventDefault();
		if (!held.includes(dir)) held.push(dir);
	} else if (e.code === 'KeyF' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
		dropRequest = true;
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

// test hooks for scripted screenshots: ?beacons=n lights n beacons, ?t=s runs the swarm s seconds
const preBeacons = Number(params.get('beacons') ?? 0);
for (let i = 0; i < preBeacons; i += 1) run.progress.collectAt(BEACONS[i].x, BEACONS[i].y);
const warm = Number(params.get('t') ?? 0);
for (let s = 0; s < warm; s += 1 / 30) step(run, 1 / 30);
(window as unknown as { __swarm: () => Run }).__swarm = () => run;

let last = -1;
function frame(now: number): void {
	const dt = last < 0 ? 1 / 60 : Math.min(0.05, (now - last) / 1000);
	last = now;
	step(run, dt);
	draw(run, dt, now);
	requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
