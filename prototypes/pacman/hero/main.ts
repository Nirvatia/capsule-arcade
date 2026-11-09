// Prototype: the hero stage (part I, step 2). One hero large on a dark panel (the mock-up's top
// half), and the same hero running along a corridor of the real season world, magnified and at
// game scale (the mock-up's season rows). Buttons: Pac-Man / Ms. Pac-Man, the four seasons,
// run / rest, a bite, the energizer (6 s, the last 1.6 s calm down), death, quarter speed.
// Query: ?season=winter&ms&power&rest&capture (capture: window.__advance(seconds) steps 1/60 s).
import type { Hero } from '../../../src/games/pacman/render/actors/hero/Hero';
import { PacmanHero } from '../../../src/games/pacman/render/actors/hero/PacmanHero';
import { MsPacmanHero } from '../../../src/games/pacman/render/actors/hero/MsPacmanHero';
import type { HeroSeason } from '../../../src/games/pacman/render/actors/hero/heroSeasons';
import { GRID_01 } from '../../../src/games/pacman/config/mazes';
import { MeadowWorld } from '../../../src/games/pacman/render/seasons/meadow/MeadowWorld';
import { meadowThemeFor } from '../../../src/games/pacman/render/seasons/meadow/meadowThemes';
import type { MeadowTheme } from '../../../src/games/pacman/render/seasons/meadow/MeadowTheme';

type Season = 'summer' | 'autumn' | 'winter' | 'spring';

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const view = $<HTMLCanvasElement>('view');
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);
const q = new URLSearchParams(location.search);

const POWER_TIME = 6;
const POWER_ENDING = 1.6;
/** The hero's body radius in tiles, as in the game (`HeroView`). */
const RADIUS = 0.39;
const ZOOM = 2.4;
/** Tiles per second along the corridor. */
const SPEED = 6;

let ms = q.has('ms');
let season: Season = (['summer', 'autumn', 'winter', 'spring'] as const).includes(
	q.get('season') as Season
)
	? (q.get('season') as Season)
	: 'spring';
const make = (): Hero => (ms ? new MsPacmanHero() : new PacmanHero());
let big = make();
let mid = make();
let small = make();
let world: MeadowWorld;
let deathTimer = -1;
let vw = 0;
let vh = 0;
let running = !q.has('rest');
let slow = false;
let powerTimer = q.has('power') ? POWER_TIME : 0;
let phase = 0;
let gulpClock = 0;

/** The longest straight run of dot tiles in a row of the maze: where the strips run. */
function corridor(): { row: number; from: number; to: number } {
	let best = { row: 1, from: 1, to: 2 };
	GRID_01.forEach((line, row) => {
		let start = -1;
		line.forEach((token, col) => {
			const open = token === 'DT' || token === 'EU';
			if (open && start < 0) start = col;
			if ((!open || col === line.length - 1) && start >= 0) {
				const end = open ? col : col - 1;
				if (end - start > best.to - best.from) best = { row, from: start, to: end };
				start = -1;
			}
		});
	});
	return best;
}
const run = corridor();

function buildWorld(): void {
	world = new MeadowWorld(GRID_01, meadowThemeFor(season) as MeadowTheme);
	world.resize(vw, vh, D);
	world.setMood(0, 0);
	for (let i = 0; i < 40; i++) world.update(0.1);
	for (const b of document.querySelectorAll<HTMLButtonElement>('[data-season]')) {
		b.setAttribute('aria-pressed', String(b.dataset.season === season));
	}
}

function layout(): void {
	vw = window.innerWidth;
	vh = window.innerHeight;
	view.width = Math.round(vw * D);
	view.height = Math.round(vh * D);
	view.style.width = `${vw}px`;
	view.style.height = `${vh}px`;
	buildWorld();
	const S = world.layout.tileSize;
	big.setRadius(Math.min(vw * 0.5, vh) * 0.22);
	mid.setRadius(S * RADIUS * ZOOM);
	small.setRadius(S * RADIUS);
	for (const h of [big, mid, small]) h.reset();
}

function pickHero(): void {
	big = make();
	mid = make();
	small = make();
	layout();
	$('who').textContent = ms ? 'Ms. Pac-Man' : 'Pac-Man';
}

for (const b of document.querySelectorAll<HTMLButtonElement>('[data-season]')) {
	b.addEventListener('click', () => {
		season = b.dataset.season as Season;
		buildWorld();
	});
}
$('who').addEventListener('click', () => {
	ms = !ms;
	pickHero();
});
$('die').addEventListener('click', () => {
	if (deathTimer < 0) deathTimer = 0;
});
$('run').addEventListener('click', () => {
	running = !running;
	$('run').setAttribute('aria-pressed', String(running));
	$('run').textContent = running ? 'Бег' : 'Покой';
});
$('bite').addEventListener('click', () => {
	for (const h of [big, mid, small]) h.eat();
});
$('power').addEventListener('click', () => {
	powerTimer = POWER_TIME;
});
$('slow').addEventListener('click', () => {
	slow = !slow;
	$('slow').setAttribute('aria-pressed', String(slow));
});

function frame(realDt: number): void {
	const dt = realDt * (slow ? 0.25 : 1);
	powerTimer = Math.max(0, powerTimer - dt);
	const power = powerTimer > 0;
	const ending = power && powerTimer < POWER_ENDING;
	if (deathTimer >= 0) {
		deathTimer += dt;
		if (deathTimer > 2.4) deathTimer = -1;
	}
	const dying = deathTimer >= 0;
	const moving = running && !dying;
	if (moving) phase += dt;
	const heroSeason: HeroSeason = season;
	const S = world.layout.tileSize;

	// the dark panel (left) and the two strips (right)
	const panel = { x: 16, y: 16, w: vw * 0.5 - 24, h: vh - 112 };
	const sx = vw * 0.5 + 8;
	const sw = vw - sx - 16;
	const zoomStrip = { x: sx, y: 16, w: sw, h: Math.min(S * 3 * ZOOM, (vh - 112) * 0.62) };
	const smallStrip = { x: sx, y: zoomStrip.y + zoomStrip.h + 16, w: sw, h: S * 3 };

	// the big hero runs across the panel and wraps round, so his trail and particles show
	const bigSpan = panel.w * 0.12;
	const bigX = panel.x + panel.w * 0.6 + (moving ? (phase * panel.w * 0.1) % bigSpan : 0);
	big.update(dt, {
		x: bigX,
		y: panel.y + panel.h * 0.52,
		angle: 0,
		moving,
		power,
		ending,
		dying,
		season: heroSeason
	});

	// the corridor: world px of the run, the hero loops along its middle stretch
	const L = world.layout;
	const x0 = L.offsetX + (run.from + 1.5) * S;
	const x1 = L.offsetX + (run.to - 0.5) * S;
	const yw = L.offsetY + (run.row + 0.5) * S;
	const t = moving ? (phase * SPEED * S) % (x1 - x0) : (x1 - x0) * 0.5;
	const xw = x0 + t;
	if (moving) {
		gulpClock += dt * SPEED;
		if (gulpClock > 1) {
			gulpClock -= 1;
			mid.gulp();
			small.gulp();
		}
	}

	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = 'source-over';
	ctx.fillStyle = '#0c0a10';
	ctx.fillRect(0, 0, vw, vh);

	// the big hero on the panel
	ctx.save();
	ctx.beginPath();
	ctx.roundRect(panel.x, panel.y, panel.w, panel.h, 16);
	ctx.clip();
	const bg = ctx.createRadialGradient(
		panel.x + panel.w * 0.55,
		panel.y + panel.h * 0.5,
		0,
		panel.x + panel.w * 0.55,
		panel.y + panel.h * 0.5,
		panel.w * 0.8
	);
	bg.addColorStop(0, '#221b2c');
	bg.addColorStop(1, '#14101b');
	ctx.fillStyle = bg;
	ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
	big.draw(ctx);
	ctx.restore();

	// a strip of the real world: `zoom` magnifies the world, the hero is drawn at that size
	const strip = (
		rect: { x: number; y: number; w: number; h: number },
		zoom: number,
		hero: Hero,
		label: string
	) => {
		ctx.save();
		ctx.beginPath();
		ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 12);
		ctx.clip();
		ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
		ctx.scale(zoom, zoom);
		ctx.translate(-(x0 + x1) / 2, -yw);
		world.drawWorld(ctx);
		world.drawFood(ctx, () => false);
		ctx.restore();
		ctx.save();
		ctx.beginPath();
		ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 12);
		ctx.clip();
		hero.update(dt, {
			x: rect.x + rect.w / 2 + (xw - (x0 + x1) / 2) * zoom,
			y: rect.y + rect.h / 2,
			angle: 0,
			moving,
			power,
			ending,
			dying,
			season: heroSeason
		});
		hero.draw(ctx);
		ctx.restore();
		ctx.fillStyle = 'rgba(255,255,255,.75)';
		ctx.font = '11px "Courier New", monospace';
		ctx.textAlign = 'left';
		ctx.fillText(label, rect.x + 8, rect.y - 4);
		ctx.strokeStyle = 'rgba(255,255,255,.35)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 12);
		ctx.stroke();
	};
	strip(zoomStrip, ZOOM, mid, `${season}, ×${ZOOM}`);
	strip(smallStrip, 1, small, `${season}, 1:1 (tile ${Math.round(S)} px)`);
}

window.addEventListener('resize', layout);
layout();
$('who').textContent = ms ? 'Ms. Pac-Man' : 'Pac-Man';
if (q.has('capture')) {
	(window as unknown as { __advance: (s: number) => void }).__advance = (seconds: number) => {
		for (let i = 0; i < Math.round(seconds * 60); i++) frame(1 / 60);
	};
} else {
	let last = performance.now();
	const loop = (now: number) => {
		frame(Math.min(0.1, Math.max(0, (now - last) / 1000)));
		last = now;
		requestAnimationFrame(loop);
	};
	requestAnimationFrame(loop);
}
