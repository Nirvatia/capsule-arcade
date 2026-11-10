// Prototype: the season levels' gameplay effects (step 5.4) on the real season worlds,
// played by the game's own `LevelFx`. Click the board to fire the chosen event there; the
// slow button plays at a quarter speed to read the frames. Only the controls are local.
import { GRID_CLASSIC } from '../../../src/games/pacman/config/mazes';
import type { PacmanFx } from '../../../src/games/pacman/core/Events';
import { LevelFx } from '../../../src/games/pacman/render/fx/LevelFx';
import { MeadowWorld } from '../../../src/games/pacman/render/seasons/meadow/MeadowWorld';
import { meadowThemeFor } from '../../../src/games/pacman/render/seasons/meadow/meadowThemes';
import type { MeadowTheme } from '../../../src/games/pacman/render/seasons/meadow/MeadowTheme';
import type { GhostKind } from '../../../src/games/pacman/logic/actors/GhostModel';

type Season = 'summer' | 'autumn' | 'winter' | 'spring';
type FxKind = PacmanFx['kind'];

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const view = $<HTMLCanvasElement>('view');
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);
const GHOSTS: GhostKind[] = ['BLINKY', 'PINKY', 'INKY', 'CLYDE'];

let season: Season = 'summer';
let kind: FxKind = 'energizer';
let night = false;
let slow = true;
let ghostIndex = 0;
let world: MeadowWorld;
let theme: MeadowTheme;
const fx = new LevelFx();

const themeOf = (s: Season): MeadowTheme => meadowThemeFor(s) as MeadowTheme;

function build(): void {
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	view.width = Math.round(vw * D);
	view.height = Math.round(vh * D);
	view.style.width = `${vw}px`;
	view.style.height = `${vh}px`;
	theme = themeOf(season);
	world = new MeadowWorld(GRID_CLASSIC, theme);
	world.resize(vw, vh, D);
	world.setMood(0, night ? 1 : 0);
	for (let i = 0; i < 80; i += 1) {
		world.update(0.1);
	}
	fx.reset();
	for (const b of document.querySelectorAll<HTMLButtonElement>('[data-season]')) {
		b.setAttribute('aria-pressed', String(b.dataset.season === season));
	}
	for (const b of document.querySelectorAll<HTMLButtonElement>('[data-event]')) {
		b.setAttribute('aria-pressed', String(b.dataset.event === kind));
	}
	$('night').setAttribute('aria-pressed', String(night));
	$('slow').setAttribute('aria-pressed', String(slow));
}

function fire(x: number, y: number): void {
	const { layout } = world;
	const tx = Math.floor((x - layout.offsetX) / layout.tileSize) + 0.5;
	const ty = Math.floor((y - layout.offsetY) / layout.tileSize) + 0.5;
	const ghost = GHOSTS[ghostIndex++ % GHOSTS.length];
	const at = { x: tx, y: ty };
	const events: Record<FxKind, PacmanFx> = {
		'ghost-eaten': { kind: 'ghost-eaten', ...at, points: 200, ghost },
		energizer: { kind: 'energizer', ...at },
		fruit: { kind: 'fruit', ...at, points: 500 },
		egg: { kind: 'egg', ...at, points: 1000 },
		'extra-life': { kind: 'extra-life', ...at },
		teleport: { kind: 'teleport', ...at, tx: tx + 8, ty },
		'echo-pop': { kind: 'echo-pop', ...at },
		'near-miss': { kind: 'near-miss', ...at, gx: tx - 2, gy: ty, ghost }
	};
	fx.spawn(events[kind], {
		accent: theme.live.energizer.glow,
		particle: (i) => theme.live.drift.texture(i)
	});
}

let last = performance.now();
function frame(now: number): void {
	const dt = Math.min(0.1, (now - last) / 1000) * (slow ? 0.25 : 1);
	last = now;
	world.update(dt);
	fx.update(dt);
	const { layout } = world;
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = 'source-over';
	const amp = fx.shake ** 2 * layout.tileSize * 0.3;
	ctx.save();
	if (amp > 0) {
		ctx.translate((Math.random() - 0.5) * amp, (Math.random() - 0.5) * amp);
	}
	world.drawWorld(ctx);
	world.drawMood(ctx);
	world.drawFood(ctx, () => false);
	fx.drawUnder(ctx, layout);
	fx.drawOver(ctx, layout);
	ctx.restore();
	fx.drawScreen(ctx, window.innerWidth, window.innerHeight);
	requestAnimationFrame(frame);
}

view.addEventListener('pointerdown', (e) => fire(e.clientX, e.clientY));
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-season]')) {
	b.addEventListener('click', () => {
		season = b.dataset.season as Season;
		build();
	});
}
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-event]')) {
	b.addEventListener('click', () => {
		kind = b.dataset.event as FxKind;
		build();
		const { layout } = world;
		fire(layout.offsetX + layout.tileSize * 12.5, layout.offsetY + layout.tileSize * 13.5);
	});
}
$('night').addEventListener('click', () => {
	night = !night;
	build();
});
$('slow').addEventListener('click', () => {
	slow = !slow;
	$('slow').setAttribute('aria-pressed', String(slow));
});
window.addEventListener('resize', build);
build();
requestAnimationFrame(frame);
