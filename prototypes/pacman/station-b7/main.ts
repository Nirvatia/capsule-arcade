// Prototype: the station's squad candidates (`mimicLooks.ts`, the owner's mock-up
// STATION_MIMIC.html) on the game's own B-7 station (render/station/b7), four of them walking the
// rails of `grid_station` like the season ghosts.
// Keys: Q the mock-up's Pretender, W the Pretender for B-7, E the spore hermit;
//   1 hunt, 2 tell, 3 rage, 4 fright, 5 flashing, 6 mimicry (they fold where they stop), 7 eyes;
//   Space a 180 for all; Z the line-up x3 (arrows turn it, A auto); P the mock-up's candy colours.
// Query: ?c=orig|pretender|hermit ?s=<state> ?zoom ?inf=0..1 ?escape=1 ?high
//   ?scene: the station alone, the infestation's candidate C (`hiveC.ts`: the total takeover):
//     keys 1 / 2 / 3 the infection 0.35 / 0.65 / 1.0, P the heartbeat; ?hive=b the game's (B)
//     or a (the mock-up's); also ?cell=gold|ember|rose.
import { GRID_STATION } from '../../../src/games/pacman/config/mazes';
import { B7World } from '../../../src/games/pacman/render/station/b7/B7World';
import { bakeVeins } from '../../../src/games/pacman/render/station/b7/b7Veins';
import type { GhostKind as SquadKind } from '../../../src/games/pacman/logic/actors/GhostModel';
import { drawMimic, type Look, type MOpts, type MState } from './mimicLooks';
import { HiveCView } from './hiveC';

const q = new URLSearchParams(location.search);
const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const legend = document.getElementById('legend') as HTMLDivElement;
const D = Math.min(window.devicePixelRatio || 1, 2);
const sceneOnly = q.has('scene');
let inf = Math.min(1, Math.max(0, Number(q.get('inf') ?? (sceneOnly ? 0.65 : 0.3))));
const escape = q.get('escape') === '1';
const hiveKind = q.get('hive') ?? (sceneOnly ? 'c' : 'b');
const world = new B7World(
	GRID_STATION,
	hiveKind === 'a'
		? undefined
		: hiveKind === 'c'
			? () => document.createElement('canvas')
			: (s) => bakeVeins(s, GRID_STATION)
);
const hiveC = hiveKind === 'c' ? new HiveCView(world.scene, GRID_STATION) : null;
let pulse = true;
world.setQuality(q.has('high') ? 'high' : 'medium');
const scene = world.scene;

/** Warm candidates for the power cell (the earlier static view). */
const CELLS = {
	gold: { aura: '255, 226, 150', halo: '255, 176, 70', rim: '220, 120, 30', core: ['#fff4cc', '#ffc34d', '#c2600f'], ring: 'rgba(255, 236, 180, 0.95)', light: '255, 200, 110' },
	ember: { aura: '255, 200, 170', halo: '255, 110, 70', rim: '200, 50, 30', core: ['#ffe1cf', '#ff7a4a', '#b22a14'], ring: 'rgba(255, 214, 190, 0.95)', light: '255, 130, 90' },
	rose: { aura: '255, 210, 236', halo: '255, 110, 190', rim: '190, 40, 140', core: ['#ffe3f4', '#ff6fbf', '#a3146e'], ring: 'rgba(255, 220, 240, 0.95)', light: '255, 130, 200' }
} as const;
const pick = q.get('cell') as keyof typeof CELLS | null;
if (pick && CELLS[pick]) scene.setCellPalette(CELLS[pick]);

// ---------------------------------------------------------------------------------------------
// The candidates and their states
// ---------------------------------------------------------------------------------------------

type Cand = Look;
const CANDS: Record<string, Cand> = { q: 'orig', w: 'pretender', e: 'hermit' };
const NAMES: Record<Cand, string> = {
	orig: 'Притворщик (макет)',
	pretender: 'Притворщик B-7',
	hermit: 'Споровый отшельник'
};
const STATES: readonly MState[] = ['hunt', 'tell', 'rage', 'fright', 'flash', 'mimic', 'eyes'];
const STATE_NAMES: Record<MState, string> = {
	hunt: 'охота',
	tell: 'сигнал тактики',
	rage: 'ярость (побег)',
	fright: 'испуг',
	flash: 'мигание',
	mimic: 'мимикрия',
	eyes: 'глаза'
};
const KINDS: readonly SquadKind[] = ['BLINKY', 'PINKY', 'INKY', 'CLYDE'];
const DIRS = [
	[1, 0],
	[0, 1],
	[-1, 0],
	[0, -1]
] as const;

let cand: Cand = (Object.values(CANDS) as string[]).includes(q.get('c') ?? '') ? (q.get('c') as Cand) : 'pretender';
let state: MState = STATES.includes(q.get('s') as MState) ? (q.get('s') as MState) : 'hunt';
let zoom = q.has('zoom');
let candy = false;
let lineDir = 0;
let lineAuto = true;
let lineFace = { x: 1, y: 0 };

// ---------------------------------------------------------------------------------------------
// The rails: tile to tile on the corridors, a random turn at a junction, never back by itself
// ---------------------------------------------------------------------------------------------

const ROWS = GRID_STATION.length;
const COLS = GRID_STATION[0].length;
const open = (x: number, y: number) => {
	const t = GRID_STATION[y]?.[x];
	return t === 'DT' || t === 'EU' || t === 'FL';
};
let seed = 7;
const rnd = () => {
	seed = (seed * 1103515245 + 12345) & 0x7fffffff;
	return seed / 0x7fffffff;
};
const tiles: Array<[number, number]> = [];
for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (open(x, y)) tiles.push([x, y]);

interface Walker {
	kind: SquadKind;
	x: number;
	y: number;
	dx: number;
	dy: number;
	p: number;
	dist: number;
	fx: number;
	fy: number;
	fold: number;
}
const walkers: Walker[] = KINDS.map((kind, i) => {
	const [x, y] = tiles[Math.floor(((i + 0.3) * tiles.length) / KINDS.length)];
	const w: Walker = { kind, x, y, dx: 0, dy: 0, p: 0, dist: 0, fx: 1, fy: 0, fold: 0 };
	turn(w);
	w.fx = w.dx;
	w.fy = w.dy;
	return w;
});

function turn(w: Walker): void {
	const ways = DIRS.filter(([dx, dy]) => open(w.x + dx, w.y + dy) && !(dx === -w.dx && dy === -w.dy));
	const [dx, dy] = ways.length ? ways[Math.floor(rnd() * ways.length)] : [-w.dx, -w.dy];
	w.dx = dx;
	w.dy = dy;
}

function reverse(w: Walker): void {
	w.x += w.dx;
	w.y += w.dy;
	w.dx = -w.dx;
	w.dy = -w.dy;
	w.p = 1 - w.p;
}

const SPEED: Record<MState, number> = { hunt: 5.4, tell: 5.4, rage: 6.4, fright: 3.6, flash: 3.6, mimic: 5.4, eyes: 9 };

function update(dt: number): void {
	for (const w of walkers) {
		const hiding = state === 'mimic';
		if (hiding && w.p === 0) {
			w.fold = Math.min(1, w.fold + dt / 1.2);
		} else if (w.fold > 0) {
			w.fold = Math.max(0, w.fold - dt / 0.6);
		} else {
			w.p += SPEED[state] * dt;
			w.dist += SPEED[state] * dt;
			while (w.p >= 1) {
				w.x += w.dx;
				w.y += w.dy;
				w.p -= 1;
				if (hiding) {
					w.p = 0;
					break;
				}
				turn(w);
			}
		}
		const e = Math.min(1, dt * 12);
		w.fx += (w.dx - w.fx) * e;
		w.fy += (w.dy - w.fy) * e;
	}
	const [ldx, ldy] = DIRS[lineDir];
	const e = Math.min(1, dt * 12);
	lineFace = { x: lineFace.x + (ldx - lineFace.x) * e, y: lineFace.y + (ldy - lineFace.y) * e };
}

// ---------------------------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------------------------

/** The level's own spore at the origin (stage space scaled to the tile), out of step with the food. */
function sporeAt(S: number, t: number) {
	return (c: CanvasRenderingContext2D, alpha: number, scale: number) => {
		c.save();
		c.globalAlpha *= alpha;
		c.scale(S / scene.TILE, S / scene.TILE);
		scene.drawSporeAt(c, 0, 0, scale * (1 + 0.04 * Math.sin(t * 2.0 + Math.PI)));
		c.restore();
	};
}

function drawOne(
	c: CanvasRenderingContext2D,
	x: number,
	y: number,
	S: number,
	kind: SquadKind,
	st: MState,
	t: number,
	look: { lx: number; ly: number; fx: number; fy: number; step: number; fold: number }
): void {
	const spore = sporeAt(S, t);
	const o: MOpts = {
		lookX: look.lx,
		lookY: look.ly,
		faceX: look.fx,
		faceY: look.fy,
		time: t,
		step: look.step,
		fold: look.fold,
		candy,
		spore
	};
	drawMimic(c, x, y, S, kind, cand, st === 'mimic' && look.fold <= 0 ? 'hunt' : st, o);
}

function drawWalkers(c: CanvasRenderingContext2D, t: number): void {
	const { tileSize: S, offsetX, offsetY } = world.layout;
	for (const w of walkers) {
		const x = offsetX + (w.x + w.dx * w.p + 0.5) * S;
		const y = offsetY + (w.y + w.dy * w.p + 0.5) * S;
		const st: MState = w.fold > 0 ? 'mimic' : state === 'mimic' ? 'hunt' : state;
		drawOne(c, x, y, S, w.kind, st, t, {
			lx: w.dx,
			ly: w.dy,
			fx: w.fx,
			fy: w.fy,
			step: w.dist * 2.4,
			fold: w.fold
		});
	}
}

function drawLineup(c: CanvasRenderingContext2D, t: number, vw: number, vh: number): void {
	const S = Math.min(vw / 15, vh / 6);
	const big = S * 2.4;
	const w = big * 4 + S * 2;
	const h = big * 1.9;
	const x0 = (vw - w) / 2;
	const y0 = (vh - h) / 2;
	c.save();
	c.fillStyle = 'rgba(8, 11, 11, 0.9)';
	c.strokeStyle = 'rgba(150, 165, 160, 0.4)';
	c.lineWidth = 1;
	c.beginPath();
	c.roundRect(x0, y0, w, h, 6);
	c.fill();
	c.stroke();
	c.restore();
	// the mimicry loops: walk, fold, lie, unfold
	const u = (t % 4.8) / 4.8;
	const fold = state === 'mimic' ? (u < 0.16 ? 0 : u < 0.34 ? (u - 0.16) / 0.18 : u < 0.84 ? 1 : 1 - (u - 0.84) / 0.16) : 0;
	const [dx, dy] = DIRS[lineDir];
	KINDS.forEach((kind, i) => {
		const x = x0 + S + big * (i + 0.5);
		const y = y0 + h * 0.5;
		drawOne(c, x, y, big, kind, fold > 0 ? 'mimic' : state === 'mimic' ? 'hunt' : state, t, {
			lx: dx,
			ly: dy,
			fx: lineFace.x,
			fy: lineFace.y,
			step: fold > 0 ? 0 : t * 6 + i * 0.8,
			fold
		});
	});
}

function showLegend(): void {
	legend.textContent =
		`${NAMES[cand]} · ${STATE_NAMES[state]}${candy ? ' · цвета макета' : ''}\n` +
		'Q макет  W Притворщик B-7  E отшельник\n' +
		'1 охота 2 сигнал 3 ярость 4 испуг 5 мигание 6 мимикрия 7 глаза\n' +
		`Space разворот  Z витрина x3${zoom ? ' (стрелки, A авто)' : ''}  P цвета макета`;
}

window.addEventListener('keydown', (e) => {
	const key = e.key.toLowerCase();
	if (sceneOnly) {
		const level: Record<string, number> = { '1': 0.35, '2': 0.65, '3': 1 };
		if (level[key] !== undefined) inf = level[key];
		else if (key === 'p') pulse = !pulse;
		else return;
		showSceneLegend();
		return;
	}
	if (CANDS[key]) cand = CANDS[key];
	else if (key >= '1' && key <= '7') state = STATES[Number(key) - 1];
	else if (key === ' ') {
		walkers.forEach(reverse);
		lineDir = (lineDir + 2) % 4;
		lineAuto = false;
	} else if (key === 'z') zoom = !zoom;
	else if (key === 'p') candy = !candy;
	else if (key === 'a') lineAuto = true;
	else if (key.startsWith('arrow')) {
		lineDir = { arrowright: 0, arrowdown: 1, arrowleft: 2, arrowup: 3 }[key] ?? lineDir;
		lineAuto = false;
	} else return;
	e.preventDefault();
	showLegend();
});
function showSceneLegend(): void {
	legend.textContent =
		`Заражение ${hiveKind.toUpperCase()} · ${Math.round(inf * 100)}%${hiveC ? (pulse ? ' · пульс' : '') : ''}\n` +
		'1 / 2 / 3 заражение 35 / 65 / 100%' +
		(hiveC ? '  P пульс' : '');
}
if (sceneOnly) showSceneLegend();
else showLegend();

let last = 0;
let autoClock = 0;
function frame(now: number): void {
	const t = now / 1000;
	const dt = last ? Math.min(0.05, t - last) : 1 / 60;
	last = t;
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	if (view.width !== Math.round(vw * D)) {
		view.width = Math.round(vw * D);
		view.height = Math.round(vh * D);
	}
	ctx.setTransform(D, 0, 0, D, 0, 0);
	world.resize(vw, vh, D);
	scene.setExtraLights([]);
	world.drawScene(ctx, t, dt, inf, true);
	if (hiveC) {
		world.enter(ctx);
		hiveC.draw(ctx, inf);
		ctx.restore();
	}
	world.drawLight(ctx, t, inf, escape ? 'alert' : 'quarantine', true);
	if (hiveC && pulse) {
		world.enter(ctx);
		hiveC.drawPulse(ctx, inf, t);
		ctx.restore();
	}
	if (!sceneOnly) {
		update(dt);
		if (lineAuto && (autoClock += dt) > 1.8) {
			autoClock = 0;
			lineDir = [1, 2, 3, 0][lineDir];
		}
		drawWalkers(ctx, t);
		if (zoom) drawLineup(ctx, t, vw, vh);
	}
	world.drawGrain(ctx, t);
	requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
