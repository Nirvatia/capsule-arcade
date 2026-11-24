// Prototype: the echo bonus in its own look (echo wisps, `render/actors/EchoCloneView`), played
// by the real services on a real season world at game scale: a riot set off again and again
// from above the hero's start (`AbilityService.echo`), with the season's ghosts. Buttons: the four seasons, quarter
// speed. Query: ?season=winter&capture (capture: window.__advance(seconds) steps 1/60 s), ?look=<candidate> (`looks.ts`).
import { EventBus } from '../../../src/games/pacman/engine/EventBus';
import type { PacmanEventMap } from '../../../src/games/pacman/core/Events';
import { buildLevelSession } from '../../../src/games/pacman/logic/level/LevelSession';
import type { LevelSession } from '../../../src/games/pacman/logic/level/LevelSession';
import { seasonForLevel } from '../../../src/games/pacman/logic/level/SeasonCatalog';
import { EchoCloneView } from '../../../src/games/pacman/render/actors/EchoCloneView';
import { PacmanHero } from '../../../src/games/pacman/render/actors/hero/PacmanHero';
import { GhostView } from '../../../src/games/pacman/render/actors/GhostView';
import { SEASON_GHOST } from '../../../src/games/pacman/render/actors/cuteGhost';
import { applyLook } from './looks';
import { MeadowWorld } from '../../../src/games/pacman/render/seasons/meadow/MeadowWorld';
import { meadowThemeFor } from '../../../src/games/pacman/render/seasons/meadow/meadowThemes';
import type { MeadowTheme } from '../../../src/games/pacman/render/seasons/meadow/MeadowTheme';

const SEASONS = ['summer', 'autumn', 'winter', 'spring'] as const;
type Season = (typeof SEASONS)[number];

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const view = $<HTMLCanvasElement>('view');
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);
const q = new URLSearchParams(location.search);

let season: Season = SEASONS.includes(q.get('season') as Season) ? (q.get('season') as Season) : 'summer';
let slow = false;
let vw = 0;
let vh = 0;
let world: MeadowWorld;
let riot: LevelSession;
let pause = 0;
let time = 0;
applyLook(EchoCloneView, q.get('look'));
const riotView = new EchoCloneView();
const ghostView = new GhostView();
const hero = new PacmanHero();

function session(): LevelSession {
	const level = SEASONS.indexOf(season) + 1;
	return buildLevelSession({
		events: new EventBus<PacmanEventMap>(),
		level,
		profile: 'pacman',
		season: seasonForLevel(level),
		hell: false,
		secret: false,
		godMode: true
	});
}

function startRiot(): void {
	riot = session();
	const s = riot.grid.playerSpawn;
	const up = riot.grid.isWalkable(s.x, s.y - 2);
	riot.abilities.echo.start({ x: s.x, y: up ? s.y - 2 : s.y });
}

function build(): void {
	const level = SEASONS.indexOf(season) + 1;
	world = new MeadowWorld(seasonForLevel(level).grid, meadowThemeFor(season) as MeadowTheme);
	world.resize(vw, vh, D);
	world.setMood(0, 0);
	for (let i = 0; i < 40; i++) world.update(0.1);
	startRiot();
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
	build();
}

for (const b of document.querySelectorAll<HTMLButtonElement>('[data-season]')) {
	b.addEventListener('click', () => {
		season = b.dataset.season as Season;
		build();
	});
}
$('slow').addEventListener('click', () => {
	slow = !slow;
	$('slow').setAttribute('aria-pressed', String(slow));
});

function frame(realDt: number): void {
	const dt = realDt * (slow ? 0.25 : 1);
	time += dt;
	world.update(dt);
	if (riot.abilities.echo.phase === 'riot') {
		riot.ghosts.update(dt);
		riot.abilities.echo.update(dt, { ghosts: riot.ghosts, fruit: riot.fruit });
	} else {
		pause += dt;
		if (pause > 0.8) {
			pause = 0;
			startRiot();
		}
	}
	const L = world.layout;
	const S = L.tileSize;
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = 'source-over';
	world.drawWorld(ctx);
	world.drawMood(ctx);
	world.drawFood(ctx, (x, y) => riot.progress.isCollected(x, y));
	ghostView.style = SEASON_GHOST[season] ?? 'disc';
	ghostView.time = time;
	ghostView.draw(ctx, riot.ghosts, L, 0, false);
	riotView.draw(ctx, riot.abilities.echo, L, time);
	const s = riot.grid.playerSpawn;
	hero.setRadius(S * 0.39);
	hero.update(dt, {
		x: L.offsetX + (s.x + 0.5) * S,
		y: L.offsetY + (s.y + 0.5) * S,
		angle: Math.PI,
		moving: false,
		power: false,
		ending: false,
		season
	});
	hero.draw(ctx);
	world.drawOverlay(ctx);
	if (q.has('portrait')) {
		// the wisp large: four headings, the mouth shut to open (?portrait)
		const R = 30;
		ctx.fillStyle = '#c9a874';
		ctx.fillRect(0, 0, 8 * R * 2.4, R * 3.4);
		const body = (riotView as unknown as { body: (...a: unknown[]) => void }).body.bind(riotView);
		[0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach((a, i) => {
			body(ctx, R * 1.6 + i * R * 2.6, R * 1.7, R, a, 0.12 + 0.1 * i);
		});
	}
}

window.addEventListener('resize', layout);
layout();
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
