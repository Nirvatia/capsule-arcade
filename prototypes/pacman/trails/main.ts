// Prototype: variations of today's hero trail (the season's particles, never wider than the
// hero, a gauge of his power) side by side with it on the real season world (grid_01), the hero
// running a loop round a block so every trail has to turn. Buttons: Pac-Man / Ms. Pac-Man, the
// four seasons, the energizer (6 s, the trail shows what is left), quarter speed.
// Query: ?season=autumn&ms&power&left=0.3&capture (capture: window.__advance(seconds) steps 1/60 s;
// `power` holds the energizer, `left` its share left).
import type { Hero } from '../../../src/games/pacman/render/actors/hero/Hero';
import { PacmanHero } from '../../../src/games/pacman/render/actors/hero/PacmanHero';
import { MsPacmanHero } from '../../../src/games/pacman/render/actors/hero/MsPacmanHero';
import type { TrailVariant } from '../../../src/games/pacman/render/actors/hero/Hero';
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

/** The hero's radius in tiles, tiles per second, the zoom of a panel, as in the game. */
const RADIUS = 0.39;
const SPEED = 6;
const ZOOM = 1.5;
const POWER_TIME = 6;
/** The loop round a block of grid_01, tile corners in order (col, row). */
const LOOP: ReadonlyArray<readonly [number, number]> = [
	[2, 2],
	[6, 2],
	[6, 8],
	[2, 8]
];
const VARIANTS: readonly TrailVariant[] = ['now', 'line', 'gauge', 'pulse'];
const NAMES: Record<TrailVariant, string> = {
	now: 'Сейчас',
	line: 'A. Узкая лента',
	gauge: 'B. Шкала силы',
	pulse: 'C. Пульс'
};

let ms = q.has('ms');
let season: Season = (['summer', 'autumn', 'winter', 'spring'] as const).includes(
	q.get('season') as Season
)
	? (q.get('season') as Season)
	: 'summer';
let world: MeadowWorld;
let vw = 0;
let vh = 0;
let slow = false;
let powerTimer = q.has('power') ? 1e9 : 0;
const heldLeft = q.has('left') ? Number(q.get('left')) : null;
let dist = 0;

interface Panel {
	readonly style: TrailVariant;
	hero: Hero;
}
const panels: Panel[] = [];

function makePanels(): void {
	panels.length = 0;
	for (const style of VARIANTS) {
		const hero = ms ? new MsPacmanHero() : new PacmanHero();
		hero.setTrailVariant(style);
		panels.push({ style, hero });
	}
}

const loopLength = (): number => {
	let n = 0;
	for (let i = 0; i < LOOP.length; i++) {
		const a = LOOP[i];
		const b = LOOP[(i + 1) % LOOP.length];
		n += Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
	}
	return n;
};

/** Where the hero is after `d` tiles round the loop: tile-centre coordinates and heading. */
function along(d: number): { x: number; y: number; angle: number } {
	let left = d % loopLength();
	for (let i = 0; i < LOOP.length; i++) {
		const a = LOOP[i];
		const b = LOOP[(i + 1) % LOOP.length];
		const len = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
		if (left <= len) {
			const k = left / len;
			return {
				x: a[0] + (b[0] - a[0]) * k + 0.5,
				y: a[1] + (b[1] - a[1]) * k + 0.5,
				angle: Math.atan2(b[1] - a[1], b[0] - a[0])
			};
		}
		left -= len;
	}
	return { x: LOOP[0][0] + 0.5, y: LOOP[0][1] + 0.5, angle: 0 };
}

function buildWorld(): void {
	world = new MeadowWorld(GRID_01, meadowThemeFor(season) as MeadowTheme);
	world.resize(vw, vh, D);
	world.setMood(0, 0);
	for (let i = 0; i < 40; i++) world.update(0.1);
	for (const b of document.querySelectorAll<HTMLButtonElement>('[data-season]')) {
		b.setAttribute('aria-pressed', String(b.dataset.season === season));
	}
	for (const p of panels) {
		p.hero.reset();
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
}

for (const b of document.querySelectorAll<HTMLButtonElement>('[data-season]')) {
	b.addEventListener('click', () => {
		season = b.dataset.season as Season;
		buildWorld();
	});
}
$('who').addEventListener('click', () => {
	ms = !ms;
	makePanels();
	$('who').textContent = ms ? 'Ms. Pac-Man' : 'Pac-Man';
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
	const powerLeft = heldLeft ?? Math.min(1, powerTimer / POWER_TIME);
	const ending = power && powerLeft < 0.27;
	dist += dt * SPEED;
	const L = world.layout;
	const S = L.tileSize;
	const at = along(dist);
	// the loop's middle, in world px: every panel is centred on it
	const cx = L.offsetX + 4.5 * S;
	const cy = L.offsetY + 5.5 * S;

	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = 'source-over';
	ctx.fillStyle = '#0c0a10';
	ctx.fillRect(0, 0, vw, vh);

	const gap = 12;
	const top = 12;
	const pw = (vw - gap * 3) / 2;
	const ph = (vh - 70 - top - gap) / 2;
	panels.forEach((p, i) => {
		const rx = gap + (i % 2) * (pw + gap);
		const ry = top + Math.floor(i / 2) * (ph + gap);
		ctx.save();
		ctx.beginPath();
		ctx.roundRect(rx, ry, pw, ph, 12);
		ctx.clip();
		ctx.translate(rx + pw / 2, ry + ph / 2);
		ctx.scale(ZOOM, ZOOM);
		ctx.translate(-cx, -cy);
		world.drawWorld(ctx);
		world.drawFood(ctx, () => false);
		const state = {
			x: L.offsetX + at.x * S,
			y: L.offsetY + at.y * S,
			angle: at.angle,
			moving: true,
			power,
			season
		};
		p.hero.setRadius(S * RADIUS);
		p.hero.update(dt, { ...state, ending, dying: false, powerLeft });
		p.hero.draw(ctx);
		ctx.restore();
		ctx.fillStyle = 'rgba(0,0,0,.55)';
		ctx.fillRect(rx + 8, ry + 8, 230, 24);
		ctx.fillStyle = '#fff';
		ctx.font = '600 14px "Trebuchet MS", system-ui, sans-serif';
		ctx.fillText(NAMES[p.style], rx + 16, ry + 25);
		ctx.strokeStyle = 'rgba(255,255,255,.35)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.roundRect(rx, ry, pw, ph, 12);
		ctx.stroke();
	});
}

makePanels();
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
