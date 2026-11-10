// Prototype: the hell's wall material. Four flesh worlds on `grid_doom`, one per candidate
// material (`WALL_STYLES`), each with the hero in his armor and Blinky standing in a corridor.
import { GRID_DOOM } from '../../../src/games/pacman/config/mazes';
import { DoomWorld } from '../../../src/games/pacman/render/doom/DoomWorld';
import { WALL_STYLES } from '../../../src/games/pacman/render/doom/fleshBake';
import type { WallStyleId } from '../../../src/games/pacman/render/doom/fleshBake';
import { HellBlinkyView } from '../../../src/games/pacman/render/doom/HellBlinkyView';
import { PacmanHero } from '../../../src/games/pacman/render/actors/hero/PacmanHero';
import { armorPainter } from '../../../src/games/pacman/render/actors/hero/heroArmor';

const ORDER: readonly WallStyleId[] = ['muscle', 'bone', 'crust', 'scar'];
const q = new URLSearchParams(location.search);
const D = Math.min(window.devicePixelRatio || 1, 2);
const grid = document.getElementById('grid') as HTMLElement;

interface Cell {
	id: WallStyleId;
	fig: HTMLElement;
	cv: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	world: DoomWorld;
	boss: HellBlinkyView;
	hero: PacmanHero;
	w: number;
	h: number;
}

const cells: Cell[] = ORDER.map((id) => {
	const fig = document.createElement('figure');
	const cv = document.createElement('canvas');
	const cap = document.createElement('figcaption');
	cap.textContent = WALL_STYLES[id].name;
	fig.append(cv, cap);
	grid.append(fig);
	const hero = new PacmanHero();
	hero.setOver(armorPainter('pacman'));
	const cell: Cell = {
		id,
		fig,
		cv,
		ctx: cv.getContext('2d') as CanvasRenderingContext2D,
		world: new DoomWorld(GRID_DOOM, [], id),
		boss: new HellBlinkyView(),
		hero,
		w: 0,
		h: 0
	};
	fig.addEventListener('click', () => {
		const single = grid.classList.toggle('single');
		for (const c of cells) {
			c.fig.classList.toggle('hidden', single && c !== cell);
		}
		layout();
	});
	return cell;
});

function layout(): void {
	for (const c of cells) {
		const w = c.cv.clientWidth;
		const h = c.cv.clientHeight;
		if (w === 0 || h === 0) continue;
		c.w = w;
		c.h = h;
		c.cv.width = Math.round(w * D);
		c.cv.height = Math.round(h * D);
		c.world.resize(w, h, D);
	}
}
window.addEventListener('resize', layout);
layout();

function frame(time: number, dt: number): void {
	for (const c of cells) {
		if (c.w === 0 || c.fig.classList.contains('hidden')) continue;
		const { ctx, world } = c;
		world.update(dt);
		ctx.setTransform(D, 0, 0, D, 0, 0);
		world.drawWorld(ctx);
		const L = world.layout;
		const S = L.tileSize;
		c.boss.draw(
			ctx,
			{
				x: 13.5,
				y: 8.5,
				phase: 2,
				state: 'CHASE',
				shape: 'normal',
				dir: 'LEFT',
				progress: 0,
				alpha: 1,
				intro: 1,
				look: Math.PI,
				hit: 0,
				echo: false
			},
			L,
			time
		);
		c.hero.setRadius(S * 0.39);
		c.hero.update(dt, {
			x: L.offsetX + 6.5 * S,
			y: L.offsetY + 8.5 * S,
			angle: 0,
			moving: false,
			power: false,
			ending: false,
			season: 'hell'
		});
		c.hero.draw(ctx);
		world.drawOverlay(ctx);
	}
}

if (q.has('capture')) {
	(window as unknown as { __advance: (s: number) => void }).__advance = (seconds: number) => {
		for (let i = 0; i < Math.round(seconds * 60); i += 1) frame(i / 60, 1 / 60);
	};
	frame(0, 0);
} else {
	let last = performance.now();
	const loop = (now: number) => {
		frame(now / 1000, Math.min(0.1, Math.max(0, (now - last) / 1000)));
		last = now;
		requestAnimationFrame(loop);
	};
	requestAnimationFrame(loop);
}
