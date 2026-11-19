import { EventBus } from '../../../src/games/pacman/engine/EventBus';
import type { PacmanEventMap } from '../../../src/games/pacman/core/Events';
import { buildLevelSession } from '../../../src/games/pacman/logic/level/LevelSession';
import type { LevelSession } from '../../../src/games/pacman/logic/level/LevelSession';
import { seasonForLevel } from '../../../src/games/pacman/logic/level/SeasonCatalog';
import type { PlayerDirection } from '../../../src/games/pacman/logic/actors/PlayerModel';
import { GhostView } from '../../../src/games/pacman/render/actors/GhostView';
import { HeroView } from '../../../src/games/pacman/render/actors/HeroView';
import { MsPacmanHero } from '../../../src/games/pacman/render/actors/hero/MsPacmanHero';
import { PacmanHero } from '../../../src/games/pacman/render/actors/hero/PacmanHero';
import { settle } from '../../../src/games/pacman/render/common/math';
import { MeadowWorld } from '../../../src/games/pacman/render/seasons/meadow/MeadowWorld';
import { winterTheme } from '../../../src/games/pacman/render/seasons/winter/winterTheme';
import { drawWinterDetails, drawWinterEnvironmentDetails, resetWinterDetails } from './winterDetails';
import { drawWinterReadability } from './winterReadability';
import {
	drawWinterFestiveLights,
	updateWinterFrost,
	winterSceneLayers,
	winterSceneTheme
} from './winterSceneTheme';

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const view = $<HTMLCanvasElement>('view');
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const q = new URLSearchParams(location.search);
const D = Math.min(window.devicePixelRatio || 1, 2);
const reducedMotion = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

type Mode = 'scene' | 'details' | 'decor' | 'readability';
type Mood = 'day' | 'storm' | 'night';

let mode: Mode = ['scene', 'details', 'decor', 'readability'].includes(q.get('mode') ?? '') ? (q.get('mode') as Mode) : 'scene';
let mood: Mood = ['day', 'storm', 'night'].includes(q.get('mood') ?? '') ? (q.get('mood') as Mood) : 'day';
let candidate = q.get('candidate') !== '0';
let ms = q.has('ms');
let power = q.has('power');
let vw = 0;
let vh = 0;
let time = 0;
let powerTimer = 0;
let nightV = mood === 'night' ? 1 : 0;
let stormV = mood === 'day' ? 0 : 1;
let gate = 0;
let session: LevelSession;
let world: MeadowWorld;
let hero: HeroView;
let rage: HeroView;
let unsubscribe: () => void = () => {};
const ghostView = new GhostView();
ghostView.style = 'bunny';
const held: PlayerDirection[] = [];
const frameTimes: number[] = [];
let meterAt = 0;
let meterText = '';

function makeHero(): HeroView {
	const result = new HeroView(ms ? new MsPacmanHero() : new PacmanHero());
	result.setSeason('winter');
	return result;
}

function moodTargets(): { storm: number; night: number } {
	return { storm: mood === 'day' ? 0 : 1, night: mood === 'night' ? 1 : 0 };
}

function buildWorld(): void {
	frameTimes.length = 0;
	meterText = 'замер…';
	meterAt = time;
	world = new MeadowWorld(session.season.grid, candidate ? winterSceneTheme : winterTheme);
	world.setQuality('high');
	world.resize(vw, vh, D);
	const target = moodTargets();
	world.setMood(target.storm, target.night);
	if (candidate) updateWinterFrost(vw, vh, session.season.grid, world.layout);
	for (let i = 0; i < 150; i++) world.update(1 / 30);
}

function setPower(active: boolean): void {
	power = active;
	powerTimer = active ? 8 : 0;
	session.ghosts.setMsOverdrive(ms && active);
	if (active) {
		session.ghosts.endFrightened();
		session.ghosts.frightenActive();
	} else {
		session.ghosts.endFrightened();
	}
	session.ghosts.setPowerActive(active);
	updateControls();
}

function startSession(): void {
	unsubscribe();
	const events = new EventBus<PacmanEventMap>();
	session = buildLevelSession({
		events,
		level: 3,
		profile: ms ? 'ms-pacman' : 'pacman',
		season: seasonForLevel(3, 0),
		hell: false,
		secret: false,
		godMode: true
	});
	hero = makeHero();
	rage = makeHero();
	unsubscribe = events.on('audio:cue', ({ cue }) => {
		hero.trigger(cue);
		rage.trigger(cue);
	});
	for (let i = 0; i < 720; i++) session.ghosts.update(1 / 60);
	buildWorld();
	setPower(power);
}

function updateControls(): void {
	document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
	document.querySelectorAll<HTMLButtonElement>('[data-mood]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mood === mood)));
	$('candidate').setAttribute('aria-pressed', String(candidate));
	$('candidate').textContent = candidate ? 'Кандидат' : 'Текущая зима';
	$('who').textContent = ms ? 'Ms. Pac-Man' : 'Pac-Man';
	$('power').setAttribute('aria-pressed', String(power));
	$('hint').textContent =
		mode === 'scene'
			? 'Стрелки / WASD — движение · A/B — без перезапуска сцены'
			: mode === 'details'
				? 'Одинаковые регионы настоящего лабиринта · текущая зима слева'
				: mode === 'decor'
					? 'Ёлка, окна и гирлянды · ночной свет включается кнопкой «Ночь»'
					: 'Настоящие painter-функции · маленькие призраки в игровом масштабе ×1';
}

function fitCanvas(): void {
	vw = window.innerWidth;
	vh = window.innerHeight;
	view.width = Math.round(vw * D);
	view.height = Math.round(vh * D);
	view.style.width = `${vw}px`;
	view.style.height = `${vh}px`;
}

function resize(): void {
	fitCanvas();
	buildWorld();
}

function update(dt: number): void {
	time += dt;
	const target = moodTargets();
	const easing = Math.min(1, 0.04 * dt * 60);
	nightV = settle(nightV, target.night, easing, 0.004);
	stormV = settle(stormV, target.storm, easing, 0.004);
	if (mode === 'scene') {
		const last = held[held.length - 1];
		if (last) session.player.setDesiredDirection(last);
		session.player.update(dt);
		session.ghosts.update(dt);
		if (powerTimer > 0) {
			powerTimer = Math.max(0, powerTimer - dt);
			if (powerTimer === 0) setPower(false);
		}
		world.setMood(target.storm, target.night);
		world.update(dt);
		const gateWanted = session.ghosts.list.some((g) => g.state === 'exiting' || g.state === 'eyes') ? 1 : 0;
		gate += (gateWanted - gate) * Math.min(1, dt * (gateWanted > gate ? 7 : 3));
		world.setLairGate(gate);
	}
	if (dt > 0) {
		frameTimes.push(dt * 1000);
		if (frameTimes.length > 180) frameTimes.shift();
	}
}

function drawMeter(): void {
	if (!q.has('meter')) return;
	if (time - meterAt >= 0.5) {
		meterAt = time;
		const sorted = [...frameTimes].sort((a, b) => a - b);
		const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
		const fps = frameTimes.length ? 1000 / (frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length) : 0;
		meterText = `${fps.toFixed(0)} FPS · p95 ${p95.toFixed(1)} ms · ${candidate ? 'candidate' : 'current'} · High`;
	}
	ctx.fillStyle = 'rgba(7,12,20,.65)';
	ctx.fillRect(10, 96, 270, 22);
	ctx.fillStyle = 'rgba(225,237,249,.85)';
	ctx.font = '11px "Courier New", monospace';
	ctx.textAlign = 'left';
	ctx.fillText(meterText, 17, 111);
}

function drawScene(): void {
	ctx.fillStyle = '#0b0e14';
	ctx.fillRect(0, 0, vw, vh);
	world.drawWorld(ctx);
	world.drawMood(ctx);
	if (candidate && winterSceneLayers.decor && winterSceneLayers.lights) {
		drawWinterFestiveLights(ctx, session.season.grid, world.layout, time, nightV, reducedMotion ? 0 : 1);
	}
	world.drawFood(ctx, (x, y) => session.progress.isCollected(x, y), hero.attract(session.player));
	ghostView.time = time;
	ghostView.draw(ctx, session.ghosts, world.layout, powerTimer, ms && powerTimer > 0);
	hero.draw(ctx, session.player, world.layout, time, {
		look: powerTimer > 0 ? 'energized' : 'normal',
		charge: 0,
		dying: false,
		ending: powerTimer > 0 && powerTimer < 2
	});
	if (!candidate || winterSceneLayers.weather) world.drawOverlay(ctx);
	drawMeter();
}

function frame(dt: number): void {
	update(dt);
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = 'source-over';
	if (mode === 'details') {
		drawWinterDetails(ctx, vw, vh);
	} else if (mode === 'decor') {
		drawWinterEnvironmentDetails(ctx, vw, vh, time, nightV);
	} else if (mode === 'readability') {
		drawWinterReadability(ctx, vw, vh, session, hero, rage, time, nightV, world.layout.tileSize);
	} else {
		drawScene();
	}
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
	const direction = KEYS[e.code];
	if (!direction || mode !== 'scene') return;
	e.preventDefault();
	if (e.repeat) return;
	held.splice(0, held.length, ...held.filter((d) => d !== direction), direction);
	session.player.setDesiredDirection(direction);
});
window.addEventListener('keyup', (e) => {
	const direction = KEYS[e.code];
	if (direction) held.splice(0, held.length, ...held.filter((d) => d !== direction));
});
window.addEventListener('blur', () => held.splice(0));
window.addEventListener('resize', resize);

for (const b of document.querySelectorAll<HTMLButtonElement>('button')) {
	b.addEventListener('mousedown', (e) => e.preventDefault());
}
document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((b) => {
	b.addEventListener('click', () => {
		mode = b.dataset.mode as Mode;
		updateControls();
	});
});
document.querySelectorAll<HTMLButtonElement>('[data-mood]').forEach((b) => {
	b.addEventListener('click', () => {
		mood = b.dataset.mood as Mood;
		updateControls();
	});
});
$('candidate').addEventListener('click', () => {
	candidate = !candidate;
	buildWorld();
	updateControls();
});
$('who').addEventListener('click', () => {
	ms = !ms;
	startSession();
	updateControls();
});
$('power').addEventListener('click', () => setPower(!power));
$('layers').addEventListener('click', () => $('layerPanel').classList.toggle('open'));
document.querySelectorAll<HTMLInputElement>('[data-layer]').forEach((input) => {
	input.addEventListener('change', () => {
		const key = input.dataset.layer as keyof typeof winterSceneLayers;
		winterSceneLayers[key] = input.checked;
		resetWinterDetails();
		buildWorld();
	});
});

fitCanvas();
startSession();
updateControls();
if (q.has('capture')) {
	for (let i = 0; i < 240; i++) frame(1 / 60);
	(window as unknown as { __advance: (seconds: number) => void }).__advance = (seconds: number) => {
		for (let i = 0; i < Math.round(seconds * 60); i++) frame(1 / 60);
	};
} else {
	let last = performance.now();
	const loop = (now: number) => {
		const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
		last = now;
		frame(dt);
		requestAnimationFrame(loop);
	};
	requestAnimationFrame(loop);
}
