// Throwaway: season animals for the ghosts, live. Two blocks (spring, winter); in each, a row
// per animal (the current one first): the four ghosts large in their colours, walking and
// looking round; a scared one; and the four at game scale ×1.5 on the real season corridor.
// Drawn by the game's own cuteGhost painter; the candidates are shapes in `shapes.ts`.
//   node prototypes/pacman/build.mjs animals   →   prototypes/pacman/animals.html
import { GRID_01 } from '../../../src/games/pacman/config/mazes';
import {
	GHOST_SHAPES,
	drawCuteGhost,
	type GhostShape
} from '../../../src/games/pacman/render/actors/cuteGhost';
import { MeadowWorld } from '../../../src/games/pacman/render/seasons/meadow/MeadowWorld';
import type { MeadowTheme } from '../../../src/games/pacman/render/seasons/meadow/MeadowTheme';
import { meadowThemeFor } from '../../../src/games/pacman/render/seasons/meadow/meadowThemes';
import { BUNNY_SHORT, CHICK, FOX, FROG, LADYBUG, OWL, PENGUIN } from './shapes';

type Kind = 'BLINKY' | 'PINKY' | 'INKY' | 'CLYDE';
const KINDS: Kind[] = ['BLINKY', 'PINKY', 'INKY', 'CLYDE'];

// the candidates join the game's shapes under their own names
const SHAPES = GHOST_SHAPES as unknown as Record<string, GhostShape>;
Object.assign(SHAPES, { frog: FROG, chick: CHICK, ladybug: LADYBUG, penguin: PENGUIN, owl: OWL, fox: FOX, bunnyShort: BUNNY_SHORT });

const BLOCKS: Array<{ season: 'spring' | 'winter'; title: string; rows: Array<[string, string]> }> = [
	{
		season: 'spring',
		title: 'Весна — вместо тюльпана',
		rows: [
			['tulip', 'тюльпан (сейчас)'],
			['frog', 'лягушонок'],
			['chick', 'цыплёнок'],
			['ladybug', 'божья коровка']
		]
	},
	{
		season: 'winter',
		title: 'Зима — вместо зайца',
		rows: [
			['bunny', 'заяц (сейчас)'],
			['bunnyShort', 'заяц, уши короче'],
			['penguin', 'пингвин'],
			['owl', 'совёнок'],
			['fox', 'лисёнок']
		]
	}
];

const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);
const W = 1180;
const ROW = 104;
const HEAD = 40;
const H = BLOCKS.reduce((h, b) => h + HEAD + ROW * b.rows.length, 0) + 16;
view.width = W * D;
view.height = H * D;
view.style.width = `${W}px`;
view.style.height = `${H}px`;

// the season's corridor, baked once (like hero-art)
const WV = { w: 900, h: 1000 };
const BAKE = 2;
const worlds = new Map<string, { canvas: HTMLCanvasElement; world: MeadowWorld }>();
function worldOf(season: string) {
	let w = worlds.get(season);
	if (w) return w;
	const world = new MeadowWorld(GRID_01, meadowThemeFor(season) as MeadowTheme);
	world.resize(WV.w, WV.h, BAKE);
	world.setMood(0, 0);
	for (let i = 0; i < 30; i += 1) world.update(0.1);
	const canvas = document.createElement('canvas');
	canvas.width = WV.w * BAKE;
	canvas.height = WV.h * BAKE;
	const g = canvas.getContext('2d') as CanvasRenderingContext2D;
	g.setTransform(BAKE, 0, 0, BAKE, 0, 0);
	world.drawWorld(g);
	world.drawFood(g, (x, y) => y === 24 && x <= 17);
	w = { canvas, world };
	worlds.set(season, w);
	return w;
}

function label(text: string, x: number, y: number, size: number, color = '#e9e2d4'): void {
	ctx.font = `600 ${size}px Fredoka, 'Trebuchet MS', sans-serif`;
	ctx.fillStyle = color;
	ctx.fillText(text, x, y);
}

const look = (t: number, k: number) => {
	const a = Math.floor(t * 0.6 + k * 0.7) % 4;
	return [
		[1, 0],
		[0, 1],
		[-1, 0],
		[0, -1]
	][a];
};

function frame(now: number): void {
	const t = now / 1000;
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.fillStyle = '#171310';
	ctx.fillRect(0, 0, W, H);
	let y = 8;
	for (const block of BLOCKS) {
		label(block.title, 16, y + 26, 20, '#ffd98a');
		y += HEAD;
		const { canvas, world } = worldOf(block.season);
		const lay = world.layout;
		const S = lay.tileSize;
		for (const [shape, name] of block.rows) {
			ctx.fillStyle = 'rgba(255,255,255,.04)';
			ctx.fillRect(8, y + 2, W - 16, ROW - 4);
			label(name, 18, y + ROW / 2 + 6, 15);
			// the four, large, walking on the spot and looking round
			KINDS.forEach((kind, i) => {
				const [lx, ly] = look(t, i);
				drawCuteGhost(ctx, 210 + i * 86, y + ROW / 2 + 4, 3.2, {
					shape: shape as never,
					kind,
					state: 'normal',
					lookX: lx,
					lookY: ly,
					time: t,
					step: t * 9 + i,
					chasing: i % 2 === 0
				});
			});
			// scared
			drawCuteGhost(ctx, 570, y + ROW / 2 + 4, 3.2, {
				shape: shape as never,
				kind: 'BLINKY',
				state: 'scared',
				lookX: 0,
				lookY: 0,
				time: t,
				step: t * 9
			});
			label('испуг', 548, y + ROW - 8, 11, '#9fb4ff');
			// game scale ×1.5 on the season's corridor (row 24), the four walking along it
			const zoom = 1.5;
			const dx = 640;
			const dw = W - dx - 16;
			const dh = ROW - 12;
			const cx = lay.offsetX + 9.5 * S;
			const cy = lay.offsetY + 24.5 * S;
			const sx = cx - dw / zoom / 2;
			const sy = cy - dh / zoom / 2;
			ctx.save();
			ctx.beginPath();
			ctx.rect(dx, y + 6, dw, dh);
			ctx.clip();
			ctx.drawImage(canvas, sx * BAKE, sy * BAKE, (dw / zoom) * BAKE, (dh / zoom) * BAKE, dx, y + 6, dw, dh);
			KINDS.forEach((kind, i) => {
				const run = ((t * 2.2 + i * 2.6) % 12) - 6; // tiles, along the corridor
				const dir = Math.sin(t * 0.5 + i) > 0 ? 1 : -1;
				const gx = dx + (lay.offsetX + (9.5 + run * dir * 0.8) * S - sx) * zoom;
				const gy = y + 6 + (cy - sy) * zoom;
				drawCuteGhost(ctx, gx, gy, (S / 25) * 0.78 * zoom, {
					shape: shape as never,
					kind,
					state: 'normal',
					lookX: dir,
					lookY: 0,
					time: t,
					step: t * 9 + i
				});
			});
			ctx.restore();
			y += ROW;
		}
	}
	label('игра ×1.5', W - 90, 30, 12, '#9a917f');
	requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
