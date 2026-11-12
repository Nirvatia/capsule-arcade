// The grid world's arena, baked once per layout: a square platform of black glass over the void,
// a faint tile grid on its floor, the walls as black monoliths. Their light is a strip inset at a
// fixed distance from every island's outline, one width everywhere, its corners exact: the
// outline of all the wall tiles is stroked as one path inside the walls' own clip, wide in light
// and then narrower in black, so only a band at a set depth stays lit (no per-tile pieces, so
// nothing overlaps or breaks at a joint). The strips go to the emissive layer.
import type { GridMatrix } from '../../config/gridConfig';
import { FLOOR, WALL, WORLD } from './gridPalette';

export interface ArenaLayout {
	/** Tile size and the maze's corner, css px. */
	readonly T: number;
	readonly ox: number;
	readonly oy: number;
	/** The viewport, css px, and the pixel ratio. */
	readonly vw: number;
	readonly vh: number;
	readonly dpr: number;
}

export interface ArenaBake {
	/** The platform, its floor and the walls (no light). */
	readonly dark: HTMLCanvasElement;
	/** The walls' light strips and the platform's edge (the emissive layer's part). */
	readonly light: HTMLCanvasElement;
	/** The floor between the walls, css px (the floor's reflection is clipped to it). */
	readonly floor: Path2D;
}

const isWall = (S: GridMatrix, c: number, r: number) => S[r]?.[c] === 'WL';

function layer(L: ArenaLayout): { cv: HTMLCanvasElement; x: CanvasRenderingContext2D } {
	const cv = document.createElement('canvas');
	cv.width = Math.round(L.vw * L.dpr);
	cv.height = Math.round(L.vh * L.dpr);
	const x = cv.getContext('2d') as CanvasRenderingContext2D;
	x.scale(L.dpr, L.dpr);
	return { cv, x };
}

export function bakeArena(S: GridMatrix, L: ArenaLayout): ArenaBake {
	const R = S.length;
	const C = S[0].length;
	const { T, ox, oy } = L;
	const px = (c: number) => ox + c * T;
	const py = (r: number) => oy + r * T;
	const dark = layer(L);
	const light = layer(L);

	// the platform: the maze's own square, a margin of glass round it, sharp corners
	const m = T * 0.5;
	const plat = { x: px(1) - m, y: py(1) - m, w: (C - 2) * T + 2 * m, h: (R - 2) * T + 2 * m };
	dark.x.fillStyle = FLOOR;
	dark.x.fillRect(plat.x, plat.y, plat.w, plat.h);
	// its edge: a bright rail and a faint one inside it
	light.x.lineJoin = 'miter';
	light.x.strokeStyle = WORLD.mid;
	light.x.globalAlpha = 0.5;
	light.x.lineWidth = Math.max(1, T * 0.05);
	light.x.strokeRect(plat.x, plat.y, plat.w, plat.h);
	light.x.globalAlpha = 0.18;
	light.x.lineWidth = 1;
	light.x.strokeRect(plat.x + T * 0.22, plat.y + T * 0.22, plat.w - T * 0.44, plat.h - T * 0.44);
	light.x.globalAlpha = 1;

	// the floor's grid: tile seams, faint
	dark.x.strokeStyle = 'rgba(110,180,240,0.06)';
	dark.x.lineWidth = 1;
	dark.x.beginPath();
	for (let c = 1; c < C; c++) {
		dark.x.moveTo(Math.round(px(c)) + 0.5, py(1));
		dark.x.lineTo(Math.round(px(c)) + 0.5, py(R - 1));
	}
	for (let r = 1; r < R; r++) {
		dark.x.moveTo(px(1), Math.round(py(r)) + 0.5);
		dark.x.lineTo(px(C - 1), Math.round(py(r)) + 0.5);
	}
	dark.x.stroke();

	// the walls, and the floor as what is left of the maze's square
	const walls = new Path2D();
	const floor = new Path2D();
	for (let r = 1; r < R - 1; r++) {
		for (let c = 1; c < C - 1; c++) {
			if (isWall(S, c, r)) walls.rect(px(c), py(r), T, T);
			else floor.rect(px(c), py(r), T, T);
		}
	}
	dark.x.fillStyle = WALL;
	dark.x.fill(walls);

	// the walls' outline: every side of a wall tile that faces the floor, as one path
	const outline = new Path2D();
	for (let r = 1; r < R - 1; r++) {
		for (let c = 1; c < C - 1; c++) {
			if (!isWall(S, c, r)) continue;
			if (!isWall(S, c, r - 1)) {
				outline.moveTo(px(c), py(r));
				outline.lineTo(px(c + 1), py(r));
			}
			if (!isWall(S, c, r + 1)) {
				outline.moveTo(px(c), py(r + 1));
				outline.lineTo(px(c + 1), py(r + 1));
			}
			if (!isWall(S, c - 1, r)) {
				outline.moveTo(px(c), py(r));
				outline.lineTo(px(c), py(r + 1));
			}
			if (!isWall(S, c + 1, r)) {
				outline.moveTo(px(c + 1), py(r));
				outline.lineTo(px(c + 1), py(r + 1));
			}
		}
	}
	// the strip: a band from `inset` to `inset + width` inside every wall's outline
	const inset = T * 0.16;
	const width = Math.max(1.2, T * 0.055);
	light.x.save();
	light.x.clip(walls);
	light.x.lineCap = 'square';
	light.x.lineJoin = 'miter';
	light.x.strokeStyle = WORLD.mid;
	light.x.globalAlpha = 0.6;
	light.x.lineWidth = 2 * (inset + width);
	light.x.stroke(outline);
	light.x.globalAlpha = 1;
	light.x.globalCompositeOperation = 'destination-out';
	light.x.lineWidth = 2 * inset;
	light.x.stroke(outline);
	light.x.restore();

	return { dark: dark.cv, light: light.cv, floor };
}
