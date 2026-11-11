// Prototype: the hell's night and ash storm for the cord maze. Three worlds on `grid_doom`, one
// per `MOOD_STYLES` entry; the hero walks along a corridor so the light can be judged in motion.
import { GRID_DOOM } from '../../../src/games/pacman/config/mazes';
import { DoomWorld, MOOD_STYLES } from '../../../src/games/pacman/render/doom/DoomWorld';
import type { DoomLight, MoodStyleId } from '../../../src/games/pacman/render/doom/DoomWorld';
import { HellBlinkyView } from '../../../src/games/pacman/render/doom/HellBlinkyView';
import { PacmanHero } from '../../../src/games/pacman/render/actors/hero/PacmanHero';
import { chargePainter } from '../../../src/games/pacman/render/actors/hero/heroCharge';

const ORDER: readonly MoodStyleId[] = ['cord', 'torch', 'pulse'];
const q = new URLSearchParams(location.search);
const D = Math.min(window.devicePixelRatio || 1, 2);
const grid = document.getElementById('grid') as HTMLElement;
let mood: '2' | '3' | 'n' = (q.get('m') as '2' | '3' | 'n') || '3';

interface Cell {
	id: MoodStyleId;
	cv: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	world: DoomWorld;
	hero: PacmanHero;
	boss: HellBlinkyView;
	w: number;
	h: number;
}

const cells: Cell[] = ORDER.map((id) => {
	const fig = document.createElement('figure');
	const cv = document.createElement('canvas');
	const cap = document.createElement('figcaption');
	cap.textContent = MOOD_STYLES[id].name;
	fig.append(cv, cap);
	grid.append(fig);
	const world = new DoomWorld(GRID_DOOM, []);
	world.setMoodStyle(id);
	const hero = new PacmanHero();
	hero.setOver(chargePainter);
	return {
		id,
		cv,
		ctx: cv.getContext('2d') as CanvasRenderingContext2D,
		world,
		hero,
		boss: new HellBlinkyView(),
		w: 0,
		h: 0
	};
});

function setMood(m: '2' | '3' | 'n'): void {
	mood = m;
	for (const b of document.querySelectorAll<HTMLButtonElement>('#bar button')) {
		b.setAttribute('aria-pressed', String(b.dataset.m === m));
	}
	for (const c of cells) {
		c.world.setMood(m !== 'n', m !== '2');
	}
}
for (const b of document.querySelectorAll<HTMLButtonElement>('#bar button')) {
	b.addEventListener('click', () => setMood(b.dataset.m as '2' | '3' | 'n'));
}

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
setMood(mood);

/** The hero's position on row 8, walking from tile 3 to tile 21 and back at six tiles a second. */
function walker(t: number): { x: number; dir: 1 | -1 } {
	const span = 18;
	const u = (t * 6) % (2 * span);
	return u < span ? { x: 3.5 + u, dir: 1 } : { x: 3.5 + 2 * span - u, dir: -1 };
}

function frame(time: number, dt: number): void {
	const walk = walker(time);
	for (const c of cells) {
		if (c.w === 0) continue;
		const { ctx, world } = c;
		world.update(dt);
		ctx.setTransform(D, 0, 0, D, 0, 0);
		world.drawWorld(ctx);
		const L = world.layout;
		const S = L.tileSize;
		c.boss.draw(
			ctx,
			{
				x: 12.5,
				y: 18.5,
				phase: 3,
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
		const lights: DoomLight[] = [
			{ x: walk.x, y: 8.5, r: 6.5, tint: 0xffe2b0, a: 1 },
			{ x: 12.5, y: 18.5, r: 3.2, tint: 0xff3a2a, a: 0.85 }
		];
		const ahead = world.moodStyle.headlight;
		if (ahead > 0) {
			lights.push({ x: walk.x + walk.dir * ahead, y: 8.5, r: 4.5, tint: 0xffd8a0, a: 0.8 });
		}
		world.drawMood(ctx, lights);
		c.hero.setRadius(S * 0.39);
		c.hero.update(dt, {
			x: L.offsetX + walk.x * S,
			y: L.offsetY + 8.5 * S,
			angle: walk.dir > 0 ? 0 : Math.PI,
			moving: true,
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
