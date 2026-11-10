// Prototype: every season maze in every season, drawn by the game's own meadow world, with the
// order the maze cycle gives for a seed (part I, step 1).
import {
	GRID_01,
	GRID_02,
	GRID_03,
	GRID_04,
	GRID_CLASSIC
} from '../../../src/games/pacman/config/mazes';
import type { GridMatrix } from '../../../src/games/pacman/config/gridConfig';
import { MeadowWorld } from '../../../src/games/pacman/render/seasons/meadow/MeadowWorld';
import { meadowThemeFor } from '../../../src/games/pacman/render/seasons/meadow/meadowThemes';
import type { MeadowTheme } from '../../../src/games/pacman/render/seasons/meadow/MeadowTheme';
import { mazeOrder } from '../../../src/games/pacman/logic/level/MazeCycle';

type Season = 'summer' | 'autumn' | 'winter' | 'spring';

const MAZES: Record<string, GridMatrix> = {
	grid_01: GRID_01,
	grid_02: GRID_02,
	grid_03: GRID_03,
	grid_04: GRID_04,
	classic01: GRID_CLASSIC
};

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const view = $<HTMLCanvasElement>('view');
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);

const params = new URLSearchParams(location.hash.slice(1));
let maze = params.get('maze') && MAZES[params.get('maze') as string] ? (params.get('maze') as string) : 'grid_01';
let season = (params.get('season') as Season | null) ?? 'summer';
let marks = params.get('marks') === '1';
let night = params.get('night') === '1';
let frame0 = params.get('border') !== '0'; // false: the empty ES border is cut off
let world: MeadowWorld;
let vw = 0;
let vh = 0;

function info(): void {
	const seeds = [1, 2, 3]
		.map((s) => `seed ${s}: ${[0, 1, 2].map((c) => mazeOrder(s, c).map((i) => i + 1).join('')).join(' ')}`)
		.join('\n');
	const grid = currentGrid();
	$('info').textContent = `${maze}  ${grid[0].length}×${grid.length}  ·  ${season}\nmaze cycle order, cycles 1-3:\n${seeds}`;
}

/** The maze without its empty ES border (every edge row or column that is only ES). */
function stripBorder(grid: GridMatrix): GridMatrix {
	let rows = grid.map((r) => [...r]);
	const allEs = (line: readonly string[]) => line.every((t) => t === 'ES');
	for (;;) {
		if (rows.length > 0 && allEs(rows[0] as string[])) rows = rows.slice(1);
		else if (rows.length > 0 && allEs(rows[rows.length - 1] as string[])) rows = rows.slice(0, -1);
		else if (rows.length > 0 && allEs(rows.map((r) => r[0] as string))) rows = rows.map((r) => r.slice(1));
		else if (rows.length > 0 && allEs(rows.map((r) => r[r.length - 1] as string))) rows = rows.map((r) => r.slice(0, -1));
		else break;
	}
	return rows as unknown as GridMatrix;
}

function currentGrid(): GridMatrix {
	const grid = MAZES[maze] as GridMatrix;
	return frame0 ? grid : stripBorder(grid);
}

function buildWorld(): void {
	world = new MeadowWorld(currentGrid(), meadowThemeFor(season) as MeadowTheme);
	world.resize(vw, vh, D);
	world.setMood(0, night ? 1 : 0);
	for (let i = 0; i < 60; i++) world.update(0.1);
	for (const b of document.querySelectorAll<HTMLButtonElement>('[data-maze]')) {
		b.setAttribute('aria-pressed', String(b.dataset.maze === maze));
	}
	for (const b of document.querySelectorAll<HTMLButtonElement>('[data-season]')) {
		b.setAttribute('aria-pressed', String(b.dataset.season === season));
	}
	$('night').setAttribute('aria-pressed', String(night));
	$('marks').setAttribute('aria-pressed', String(marks));
	$('border').setAttribute('aria-pressed', String(!frame0));
	info();
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

for (const b of document.querySelectorAll<HTMLButtonElement>('[data-maze]')) {
	b.addEventListener('click', () => {
		maze = b.dataset.maze as string;
		buildWorld();
	});
}
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-season]')) {
	b.addEventListener('click', () => {
		season = b.dataset.season as Season;
		buildWorld();
	});
}
$('night').addEventListener('click', () => {
	night = !night;
	buildWorld();
});
$('border').addEventListener('click', () => {
	frame0 = !frame0;
	buildWorld();
});
$('marks').addEventListener('click', () => {
	marks = !marks;
	buildWorld();
});

const MARK: Record<string, string> = { PM: '#38e060', FT: '#ff3cc8', LE: '#ff9a2a' };

let last = performance.now();
function frame(now: number): void {
	const dt = Math.min(0.1, (now - last) / 1000);
	last = now;
	world.update(dt);
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = 'source-over';
	world.drawWorld(ctx);
	world.drawMood(ctx);
	world.drawFood(ctx, () => false);
	world.drawOverlay(ctx);
	if (marks) {
		const L = world.layout;
		const S = L.tileSize;
		const grid = currentGrid();
		grid.forEach((row, y) =>
			row.forEach((token, x) => {
				const color = token.startsWith('0') ? '#27e0ff' : MARK[token];
				if (!color) return;
				ctx.strokeStyle = color;
				ctx.lineWidth = 3;
				ctx.strokeRect(L.offsetX + x * S + 1.5, L.offsetY + y * S + 1.5, S - 3, S - 3);
			})
		);
	}
	requestAnimationFrame(frame);
}

window.addEventListener('resize', layout);
layout();
requestAnimationFrame(frame);
