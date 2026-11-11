// Prototype: the arcade shift on the real worlds. The season world is the game's `MeadowWorld`
// at its own scale with the Easter egg's lair; the arcade is `ArcadeLevelRenderer.preview`; the
// shift is the game's `ArcadeShift` pass. Only the controls and the hero marker are local.
import { GRID_01 } from '../../../src/games/pacman/config/mazes';
import { MeadowWorld } from '../../../src/games/pacman/render/seasons/meadow/MeadowWorld';
import { meadowThemeFor } from '../../../src/games/pacman/render/seasons/meadow/meadowThemes';
import type { MeadowTheme } from '../../../src/games/pacman/render/seasons/meadow/MeadowTheme';
import { ArcadeLevelRenderer } from '../../../src/games/pacman/render/arcade/ArcadeLevelRenderer';
import { secretSeason } from '../../../src/games/pacman/logic/level/SeasonCatalog';
import { ArcadeShift } from '../../../src/games/pacman/render/transitions/arcadeShift/ArcadeShift';
import {
	SHIFT_DURATION
} from '../../../src/games/pacman/render/transitions/arcadeShift/arcadeShiftTimeline';
import type { ShiftKind } from '../../../src/games/pacman/render/transitions/arcadeShift/arcadeShiftTimeline';

type Season = 'summer' | 'autumn' | 'winter' | 'spring';
const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const view = $<HTMLCanvasElement>('view');
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);
const q = new URLSearchParams(location.search);

let kind: ShiftKind = q.get('kind') === 'leave' ? 'leave' : 'enter';
let season = (q.get('season') as Season) || 'summer';
let progress = Math.min(1, Math.max(0, Number(q.get('t') ?? 0)));
let playing = false;
let speed = 1;
let vw = 0;
let vh = 0;
let world: MeadowWorld;
const arcade = new ArcadeLevelRenderer();
const shift = new ArcadeShift();
const arcadeSeason = secretSeason();
/** The Easter egg's tile: the lair's centre. */
const EGG = { x: 12.5, y: 13.5 };

function buildWorld(): void {
	world = new MeadowWorld(GRID_01, meadowThemeFor(season) as MeadowTheme);
	world.resize(vw, vh, D);
	world.setMood(0, 0);
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

function drawSeason(target: CanvasRenderingContext2D, withHero: boolean): void {
	target.setTransform(D, 0, 0, D, 0, 0);
	world.drawWorld(target);
	world.drawMood(target);
	world.drawFood(target, () => false);
	world.drawOverlay(target);
	if (withHero) {
		const L = world.layout;
		const x = L.offsetX + EGG.x * L.tileSize;
		const y = L.offsetY + EGG.y * L.tileSize;
		target.fillStyle = '#ffd23a';
		target.beginPath();
		target.arc(x, y, L.tileSize * 0.42, 0, Math.PI * 2);
		target.fill();
		target.fillStyle = '#ffd6ec';
		target.beginPath();
		target.ellipse(x + L.tileSize * 0.7, y, L.tileSize * 0.28, L.tileSize * 0.36, 0, 0, Math.PI * 2);
		target.fill();
	}
}

function drawArcade(target: CanvasRenderingContext2D): void {
	target.setTransform(D, 0, 0, D, 0, 0);
	arcade.preview({
		ctx: target,
		width: vw,
		height: vh,
		pixelRatio: D,
		dt: 0,
		paused: true,
		season: arcadeSeason
	});
}

let clock = 0;
let last = performance.now();
function frame(now: number): void {
	const dt = Math.min(0.05, (now - last) / 1000);
	last = now;
	clock += dt;
	world.update(dt);
	if (playing) {
		progress += (dt * speed) / SHIFT_DURATION[kind];
		if (progress >= 1) {
			progress = 1;
			playing = false;
			$('bp').textContent = '▶ Играть';
		}
	}
	const w = view.width;
	const h = view.height;
	const L = world.layout;
	const eggX = L.offsetX + EGG.x * L.tileSize;
	const eggY = L.offsetY + EGG.y * L.tileSize;
	if (kind === 'enter') {
		drawSeason(shift.from(w, h), true);
		drawArcade(shift.to(w, h));
	} else {
		drawArcade(shift.from(w, h));
		drawSeason(shift.to(w, h), false);
	}
	ctx.setTransform(D, 0, 0, D, 0, 0);
	shift.compose(ctx, vw, vh, D, {
		kind,
		progress,
		originX: kind === 'enter' ? eggX : vw / 2,
		originY: kind === 'enter' ? eggY : vh / 2,
		accent: kind === 'enter' ? 0xffd6ec : 0xffe3a0,
		time: clock
	});
	($('ts') as HTMLInputElement).value = String(Math.round(progress * 1000));
	$('tt').textContent = `${(progress * SHIFT_DURATION[kind]).toFixed(2)} / ${SHIFT_DURATION[kind]} s`;
	requestAnimationFrame(frame);
}

function press(attr: 'kind' | 'season'): void {
	for (const b of document.querySelectorAll<HTMLButtonElement>(`[data-${attr}]`)) {
		b.setAttribute('aria-pressed', String(b.dataset[attr] === (attr === 'kind' ? kind : season)));
	}
}
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-kind]')) {
	b.addEventListener('click', () => {
		kind = b.dataset.kind as ShiftKind;
		progress = 0;
		playing = true;
		$('bp').textContent = '❚❚ Пауза';
		press('kind');
	});
}
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-season]')) {
	b.addEventListener('click', () => {
		season = b.dataset.season as Season;
		buildWorld();
		press('season');
	});
}
$('bp').addEventListener('click', () => {
	if (progress >= 1) {
		progress = 0;
	}
	playing = !playing;
	$('bp').textContent = playing ? '❚❚ Пауза' : '▶ Играть';
});
$('bv').addEventListener('click', () => {
	speed = speed === 1 ? 0.25 : 1;
	$('bv').textContent = speed === 1 ? '1×' : '¼×';
});
$('ts').addEventListener('input', (e) => {
	progress = Number((e.target as HTMLInputElement).value) / 1000;
	playing = false;
	$('bp').textContent = '▶ Играть';
});
window.addEventListener('resize', layout);
layout();
press('kind');
press('season');
requestAnimationFrame(frame);
