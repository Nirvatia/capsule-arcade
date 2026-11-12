// Prototype: how the hero feels in motion. The real player logic on a real season level, driven
// by the arrows (or WASD), with every idea of the "feel" brief on its own switch: the gaze that
// leads the move, Pac-Man's minimal eye, cutting a corner, the turn's smear, the bump against a
// wall, the contact shadow, the dots pulled into the mouth, the world kicked up on a turn, the
// rolling sphere. A magnifier (x2) follows the hero. Query: ?ms&season=winter&off&capture
// (capture: window.__advance(seconds) and window.__key(direction) for scripted shots).
import { EventBus } from '../../../src/games/pacman/engine/EventBus';
import type { PacmanEventMap } from '../../../src/games/pacman/core/Events';
import { buildLevelSession } from '../../../src/games/pacman/logic/level/LevelSession';
import type { LevelSession } from '../../../src/games/pacman/logic/level/LevelSession';
import { seasonForLevel } from '../../../src/games/pacman/logic/level/SeasonCatalog';
import type { PlayerDirection } from '../../../src/games/pacman/logic/actors/PlayerModel';
import { HeroView, NO_PLAYER_FEEL } from '../../../src/games/pacman/render/actors/HeroView';
import type { PlayerFeel } from '../../../src/games/pacman/render/actors/HeroView';
import { PacmanHero } from '../../../src/games/pacman/render/actors/hero/PacmanHero';
import { MsPacmanHero } from '../../../src/games/pacman/render/actors/hero/MsPacmanHero';
import { MeadowWorld } from '../../../src/games/pacman/render/seasons/meadow/MeadowWorld';
import { meadowThemeFor } from '../../../src/games/pacman/render/seasons/meadow/meadowThemes';
import type { MeadowTheme } from '../../../src/games/pacman/render/seasons/meadow/MeadowTheme';

const SEASONS = ['summer', 'autumn', 'winter', 'spring'] as const;
type Season = (typeof SEASONS)[number];
type Key = keyof PlayerFeel;

const SWITCHES: ReadonlyArray<{ key: Key; name: string }> = [
	{ key: 'gaze', name: 'Взгляд' },
	{ key: 'eye', name: 'Глаз Пакмана' },
	{ key: 'lean', name: 'Срез угла' },
	{ key: 'smear', name: 'Смаз' },
	{ key: 'bump', name: 'Толчок о стену' },
	{ key: 'shadow', name: 'Тень' },
	{ key: 'suck', name: 'Всасывание' },
	{ key: 'puff', name: 'Пыль' },
	{ key: 'sphere', name: 'Сфера' }
];

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const view = $<HTMLCanvasElement>('view');
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);
const q = new URLSearchParams(location.search);

let season: Season = SEASONS.includes(q.get('season') as Season) ? (q.get('season') as Season) : 'summer';
let ms = q.has('ms');
let zoom = q.has('zoom') ? 2 : 1;
let feel: Record<Key, boolean> = Object.fromEntries(
	SWITCHES.map((s) => [s.key, !q.has('off')])
) as Record<Key, boolean>;
let vw = 0;
let vh = 0;
let time = 0;
let world: MeadowWorld;
let session: LevelSession;
let events: EventBus<PacmanEventMap>;
let hero: HeroView;
let unsubscribe: () => void = () => {};
const held: PlayerDirection[] = [];

function applyFeel(): void {
	hero.setFeel({ ...NO_PLAYER_FEEL, ...feel });
	for (const b of document.querySelectorAll<HTMLButtonElement>('[data-feel]')) {
		b.setAttribute('aria-pressed', String(feel[b.dataset.feel as Key]));
	}
}

function start(): void {
	const level = SEASONS.indexOf(season) + 1;
	unsubscribe();
	events = new EventBus<PacmanEventMap>();
	session = buildLevelSession({
		events,
		level,
		profile: ms ? 'ms-pacman' : 'pacman',
		season: seasonForLevel(level),
		hell: false,
		secret: false,
		godMode: true
	});
	hero = new HeroView(ms ? new MsPacmanHero() : new PacmanHero());
	hero.setSeason(season);
	unsubscribe = events.on('audio:cue', (payload) => hero.trigger(payload.cue));
	world = new MeadowWorld(seasonForLevel(level).grid, meadowThemeFor(season) as MeadowTheme);
	world.resize(vw, vh, D);
	world.setMood(0, 0);
	for (let i = 0; i < 40; i++) world.update(0.1);
	applyFeel();
	for (const b of document.querySelectorAll<HTMLButtonElement>('[data-season]')) {
		b.setAttribute('aria-pressed', String(b.dataset.season === season));
	}
	$('who').textContent = ms ? 'Ms. Pac-Man' : 'Pac-Man';
}

function layout(): void {
	vw = window.innerWidth;
	vh = window.innerHeight;
	view.width = Math.round(vw * D);
	view.height = Math.round(vh * D);
	view.style.width = `${vw}px`;
	view.style.height = `${vh}px`;
	start();
}

const KEYS: Record<string, PlayerDirection> = {
	ArrowUp: 'UP',
	KeyW: 'UP',
	ArrowDown: 'DOWN',
	KeyS: 'DOWN',
	ArrowLeft: 'LEFT',
	KeyA: 'LEFT',
	ArrowRight: 'RIGHT',
	KeyD: 'RIGHT'
};
window.addEventListener('keydown', (e) => {
	const d = KEYS[e.code];
	if (!d) return;
	e.preventDefault();
	if (e.repeat) return;
	held.splice(0, held.length, ...held.filter((x) => x !== d), d);
	session.player.setDesiredDirection(d);
});
window.addEventListener('keyup', (e) => {
	const d = KEYS[e.code];
	if (d) held.splice(0, held.length, ...held.filter((x) => x !== d));
});
window.addEventListener('blur', () => held.splice(0));

for (const s of SWITCHES) {
	const b = document.createElement('button');
	b.className = 'bt';
	b.dataset.feel = s.key;
	b.textContent = s.name;
	b.tabIndex = -1;
	b.addEventListener('mousedown', (e) => e.preventDefault());
	b.addEventListener('click', () => {
		feel = { ...feel, [s.key]: !feel[s.key] };
		applyFeel();
	});
	$('feel').append(b);
}
$('all').addEventListener('click', () => {
	const on = !Object.values(feel).every(Boolean);
	feel = Object.fromEntries(SWITCHES.map((s) => [s.key, on])) as Record<Key, boolean>;
	applyFeel();
});
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-season]')) {
	b.addEventListener('click', () => {
		season = b.dataset.season as Season;
		start();
	});
}
$('who').addEventListener('click', () => {
	ms = !ms;
	start();
});
$('zoom').addEventListener('click', () => {
	zoom = zoom === 1 ? 2 : 1;
	$('zoom').setAttribute('aria-pressed', String(zoom === 2));
});
$('zoom').setAttribute('aria-pressed', String(zoom === 2));
for (const b of document.querySelectorAll<HTMLButtonElement>('#ctl button')) {
	b.tabIndex = -1;
	b.addEventListener('mousedown', (e) => e.preventDefault());
}

function frame(dt: number): void {
	time += dt;
	const last = held[held.length - 1];
	if (last) session.player.setDesiredDirection(last);
	session.player.update(dt);
	if (session.progress.remainingDots <= 0) start();
	world.update(dt);
	const L = world.layout;
	const S = L.tileSize;
	const p = session.player.position;
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.fillStyle = '#000';
	ctx.fillRect(0, 0, vw, vh);
	if (zoom > 1) {
		ctx.translate(vw / 2, vh / 2);
		ctx.scale(zoom, zoom);
		ctx.translate(-(L.offsetX + p.x * S), -(L.offsetY + p.y * S));
	}
	world.drawWorld(ctx);
	world.drawMood(ctx);
	world.drawFood(ctx, (x, y) => session.progress.isCollected(x, y), hero.attract(session.player));
	hero.draw(ctx, session.player, L, time, { look: 'normal', charge: 0, dying: false });
	ctx.setTransform(D, 0, 0, D, 0, 0);
	world.drawOverlay(ctx);
}

window.addEventListener('resize', layout);
layout();
if (q.has('capture')) {
	const w = window as unknown as {
		__advance: (s: number) => void;
		__key: (d: PlayerDirection | null) => void;
	};
	w.__advance = (seconds: number) => {
		for (let i = 0; i < Math.round(seconds * 60); i++) frame(1 / 60);
	};
	w.__key = (d) => {
		held.splice(0);
		if (d) {
			held.push(d);
			session.player.setDesiredDirection(d);
		}
	};
} else {
	let lastT = performance.now();
	const loop = (now: number) => {
		frame(Math.min(0.1, Math.max(0, (now - lastT) / 1000)));
		lastT = now;
		requestAnimationFrame(loop);
	};
	requestAnimationFrame(loop);
}
