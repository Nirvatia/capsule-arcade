// Prototype: the quarantine ring (`ringLook.ts`), a candidate for the station's fence, on the
// game's own B-7 station with the hero and the Pretenders standing: two fencers on the rim as its
// projectors, the hunter inside with him, the hero at a seal. A static candidate, no play.
//   `node prototypes/pacman/build.mjs ring`, open the file.
// Keys: A the loop (calm, the tell, lit with a touch, the fade), 1 the tell, 2 lit, 3 a touch,
//   4 the fade.  Query: ?r=<radius in tiles> ?inf=0..1
import { GRID_STATION } from '../../../src/games/pacman/config/mazes';
import { B7World } from '../../../src/games/pacman/render/station/b7/B7World';
import { bakeVeins } from '../../../src/games/pacman/render/station/b7/b7Veins';
import { drawPretender } from '../../../src/games/pacman/render/station/pretender';
import type { PretenderState } from '../../../src/games/pacman/render/station/pretender';
import type { GhostKind } from '../../../src/games/pacman/logic/actors/GhostModel';
import { CinnabarHero } from '../../../src/games/pacman/render/actors/hero/CinnabarHero';
import { CJ_BODY_RATIO } from '../../../src/games/pacman/render/actors/hero/vesselHero';
import { drawRing, ringSeals, type Ring, type RingPhase, type Seal } from './ringLook';

const q = new URLSearchParams(location.search);
const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const legend = document.getElementById('legend') as HTMLDivElement;
const D = Math.min(window.devicePixelRatio || 1, 2);
const inf = Math.min(1, Math.max(0, Number(q.get('inf') ?? 0.3)));
const world = new B7World(GRID_STATION, (s) => bakeVeins(s, GRID_STATION));
world.setQuality('medium');
const hero = new CinnabarHero();

const ROWS = GRID_STATION.length;
const COLS = GRID_STATION[0].length;
const open = (x: number, y: number) => {
	const t = GRID_STATION[y]?.[x];
	return t === 'DT' || t === 'EU' || t === 'FL';
};

// the ring round a point two tiles ahead of where he was at the tell
const cx = 6.5;
const cy = 10.5;
const r = Number(q.get('r') ?? 7.5);
/** The open tile nearest the rim toward `angle`: a projector's post. */
function post(angle: number): { x: number; y: number; a: number } {
	let best = { x: 0, y: 0, a: angle, score: Infinity };
	for (let y = 0; y < ROWS; y++) {
		for (let x = 0; x < COLS; x++) {
			if (!open(x, y)) continue;
			const dx = x + 0.5 - cx;
			const dy = y + 0.5 - cy;
			const a = Math.atan2(dy, dx);
			let da = Math.abs(a - angle);
			if (da > Math.PI) da = Math.PI * 2 - da;
			const score = Math.abs(Math.hypot(dx, dy) - r) * 2 + da * 3;
			if (score < best.score) best = { x, y, a, score };
		}
	}
	return best;
}
const posts = [post(-Math.PI / 3), post((Math.PI * 2) / 3)];
const ring: Ring = { cx, cy, r, from: posts.map((p) => p.a) };
const seals = ringSeals(open, COLS, ROWS, ring);
// one seal grows thin (the way out); he has found it and pushes into it
const near = (s: Seal) => Math.hypot(s.x - 4, s.y - 4);
const touched = seals.reduce((a, b) => (near(b) < near(a) ? b : a));
touched.weak = true;
const heroAt = { x: touched.x - touched.dx, y: touched.y - touched.dy };
const heroDir = { x: touched.dx, y: touched.dy };

type Mode = 'auto' | 'tell' | 'lit' | 'bump' | 'fade';
let mode: Mode = 'auto';
const NAMES: Record<Mode, string> = {
	auto: 'цикл',
	tell: 'сигнал (заряд)',
	lit: 'кольцо',
	bump: 'касание',
	fade: 'гаснет'
};

/** The phase at `t`: the loop is 10 s (calm 1, the tell 1.5, lit 6 with a touch at 2.5, the fade 0.8). */
function phaseAt(t: number): RingPhase & { fencing: boolean } {
	const bumpOf = (age: number) => (age >= 0 && age < 0.7 ? { seal: touched, age } : null);
	if (mode === 'tell') return { charge: 0.6, lit: 0, bump: null, fencing: true };
	if (mode === 'lit') return { charge: 1, lit: 1, bump: null, fencing: true };
	if (mode === 'bump') return { charge: 1, lit: 1, bump: bumpOf(t % 1.4), fencing: true };
	if (mode === 'fade') {
		const k = 0.45 + 0.25 * Math.sin(t * 7);
		return { charge: 1, lit: k, bump: null, fencing: true };
	}
	const u = t % 10;
	if (u < 1) return { charge: 0, lit: 0, bump: null, fencing: false };
	if (u < 2.5) return { charge: (u - 1) / 1.5, lit: 0, bump: null, fencing: true };
	if (u < 8.5) return { charge: 1, lit: 1, bump: bumpOf(u - 5), fencing: true };
	if (u < 9.3) {
		const k = 1 - (u - 8.5) / 0.8;
		return { charge: 1, lit: k * (0.7 + 0.3 * Math.sin(u * 40)), bump: null, fencing: true };
	}
	return { charge: 0, lit: 0, bump: null, fencing: false };
}

function creature(kind: GhostKind, x: number, y: number, st: PretenderState, t: number): void {
	const { tileSize: S, offsetX, offsetY } = world.layout;
	const dx = heroAt.x - x;
	const dy = heroAt.y - y;
	const [lx, ly] = Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
	drawPretender(ctx, offsetX + (x + 0.5) * S, offsetY + (y + 0.5) * S, S, kind, st, {
		lookX: lx,
		lookY: ly,
		faceX: lx,
		faceY: ly,
		time: t,
		step: 0
	});
}

function showLegend(): void {
	legend.textContent =
		`Карантинное кольцо · ${NAMES[mode]}\n` + 'A цикл  1 сигнал  2 кольцо  3 касание  4 гаснет';
}
window.addEventListener('keydown', (e) => {
	const m: Record<string, Mode> = { a: 'auto', '1': 'tell', '2': 'lit', '3': 'bump', '4': 'fade' };
	const next = m[e.key.toLowerCase()];
	if (!next) return;
	mode = next;
	showLegend();
});
showLegend();

let last = 0;
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
	world.scene.setExtraLights([]);
	world.drawScene(ctx, t, dt, inf, true);
	world.drawLight(ctx, t, inf, 'quarantine', true);
	const L = world.layout;
	const ph = phaseAt(t);
	drawRing(ctx, L, ring, seals, ph, t);
	// the fencers on the rim (gold-eyed while they charge), the hunter inside with him
	const fenceState: PretenderState = ph.charge > 0 && ph.charge < 1 ? 'tell' : 'hunt';
	creature('PINKY', posts[0].x, posts[0].y, fenceState, t);
	creature('INKY', posts[1].x, posts[1].y, fenceState, t);
	creature('BLINKY', 8, 12, 'hunt', t);
	const S = L.tileSize;
	hero.setRadius(S * CJ_BODY_RATIO);
	hero.update(dt, {
		x: L.offsetX + (heroAt.x + 0.5) * S,
		y: L.offsetY + (heroAt.y + 0.5) * S,
		angle: Math.atan2(heroDir.y, heroDir.x),
		moving: false,
		power: false,
		ending: false,
		season: 'summer'
	});
	hero.draw(ctx);
	world.drawGrain(ctx, t);
	requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
