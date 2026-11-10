// Prototype: the death transition (part I, step 6) on the real season worlds, played by the
// game's own `LevelDecay`. Click the board to die there; the slider scrubs the whole 4 s.
// Only the controls and the hero's stand-in (a yellow disc) are local.
import { GRID_CLASSIC } from '../../../src/games/pacman/config/mazes';
import { FLOW } from '../../../src/games/pacman/config/flowConfig';
import { LevelDecay } from '../../../src/games/pacman/render/transitions/decay/LevelDecay';
import { MeadowWorld } from '../../../src/games/pacman/render/seasons/meadow/MeadowWorld';
import { meadowThemeFor } from '../../../src/games/pacman/render/seasons/meadow/meadowThemes';
import type { MeadowTheme } from '../../../src/games/pacman/render/seasons/meadow/MeadowTheme';

type Season = 'summer' | 'autumn' | 'winter' | 'spring';

const TOTAL = FLOW.death.shatter + FLOW.death.void + FLOW.death.rebuild;
const SPAWN = { x: 12, y: 19 };
const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const view = $<HTMLCanvasElement>('view');
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);
const decay = new LevelDecay();
const slider = $<HTMLInputElement>('ts');

let season: Season = 'summer';
let night = false;
let slow = true;
let playing = true;
let elapsed = 0;
let hold = 0;
let death = { x: 17.5, y: 9.5 };
let world: MeadowWorld;
let theme: MeadowTheme;

function build(): void {
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	view.width = Math.round(vw * D);
	view.height = Math.round(vh * D);
	view.style.width = `${vw}px`;
	view.style.height = `${vh}px`;
	theme = meadowThemeFor(season) as MeadowTheme;
	world = new MeadowWorld(GRID_CLASSIC, theme);
	world.resize(vw, vh, D);
	world.setMood(0, night ? 1 : 0);
	for (let i = 0; i < 80; i += 1) {
		world.update(0.1);
	}
	for (const b of document.querySelectorAll<HTMLButtonElement>('[data-season]')) {
		b.setAttribute('aria-pressed', String(b.dataset.season === season));
	}
	$('night').setAttribute('aria-pressed', String(night));
	$('slow').setAttribute('aria-pressed', String(slow));
}

function replay(): void {
	elapsed = 0;
	hold = 0;
	playing = true;
}

function hero(x: number, y: number, r: number, alpha: number): void {
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.fillStyle = '#ffd23a';
	ctx.beginPath();
	ctx.moveTo(x, y);
	ctx.arc(x, y, r, 0.4, Math.PI * 2 - 0.4);
	ctx.closePath();
	ctx.fill();
	ctx.strokeStyle = 'rgba(60,30,0,.7)';
	ctx.lineWidth = 1.5;
	ctx.stroke();
	ctx.restore();
}

let last = performance.now();
function frame(now: number): void {
	const dt = Math.min(0.1, (now - last) / 1000) * (slow ? 0.5 : 1);
	last = now;
	if (playing) {
		if (elapsed >= TOTAL) {
			hold += dt;
			if (hold > 0.9) {
				replay();
			}
		} else {
			elapsed = Math.min(TOTAL, elapsed + dt);
		}
	}
	slider.value = String(Math.round(elapsed * 1000));
	$('tt').textContent = `${elapsed.toFixed(2)} с`;

	world.update(0);
	const { layout } = world;
	const shake = decay.shake(elapsed);
	const scene = decay.begin(view.width, view.height);
	scene.setTransform(D, 0, 0, D, D * shake.x, D * shake.y);
	scene.globalAlpha = 1;
	scene.globalCompositeOperation = 'source-over';
	world.drawWorld(scene);
	world.drawMood(scene);
	world.drawFood(scene, () => false);

	ctx.setTransform(D, 0, 0, D, 0, 0);
	decay.compose(ctx, window.innerWidth, window.innerHeight, D, layout, shake, performance.now() / 1000, {
		grid: GRID_CLASSIC,
		deathX: death.x,
		deathY: death.y,
		spawnX: SPAWN.x,
		spawnY: SPAWN.y,
		elapsed,
		palette: theme.decay
	});
	// the hero's own death is drawn by the game; here a disc stands in for it
	if (elapsed < 1.3) {
		const k = elapsed / 1.3;
		hero(
			layout.offsetX + death.x * layout.tileSize,
			layout.offsetY + death.y * layout.tileSize,
			layout.tileSize * 0.42 * (1 - 0.25 * k),
			1
		);
	}
	requestAnimationFrame(frame);
}

view.addEventListener('pointerdown', (e) => {
	const { layout } = world;
	death = {
		x: Math.floor((e.clientX - layout.offsetX) / layout.tileSize) + 0.5,
		y: Math.floor((e.clientY - layout.offsetY) / layout.tileSize) + 0.5
	};
	replay();
});
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-season]')) {
	b.addEventListener('click', () => {
		season = b.dataset.season as Season;
		build();
		replay();
	});
}
$('night').addEventListener('click', () => {
	night = !night;
	build();
});
$('replay').addEventListener('click', replay);
$('slow').addEventListener('click', () => {
	slow = !slow;
	$('slow').setAttribute('aria-pressed', String(slow));
});
slider.addEventListener('input', () => {
	playing = false;
	elapsed = Number(slider.value) / 1000;
});
window.addEventListener('resize', build);
build();
requestAnimationFrame(frame);
