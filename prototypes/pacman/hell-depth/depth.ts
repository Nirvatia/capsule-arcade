// The flesh hell's depth, the owner's pick A: the baked maze layer (`bakeFlesh(...).maze`) gets a
// pass that grounds the walls. Same coordinates as the bake (a layer pixel is the scene point
// `local + pixel`), so a candidate can be swapped in for `maze` without touching the game.
import type { GridMatrix } from '../../../src/games/pacman/config/gridConfig';
import { MX, MY, SCENE_TILE } from '../../../src/games/pacman/render/doom/fleshBake';
import type { FleshBake } from '../../../src/games/pacman/render/doom/fleshBake';
import {
	blur,
	clipTo,
	context,
	edgeOf,
	makeCanvas,
	threshold,
	tint
} from '../../../src/games/pacman/render/doom/fleshNoise';

type Cv = HTMLCanvasElement;
const T = SCENE_TILE;

const isWall = (S: GridMatrix, c: number, r: number): boolean => S[r]?.[c] === 'WL';

/** Tiles of one kind as a rounded white mask, grown by `grow` px (as the bake builds its masks). */
function maskOf(bake: FleshBake, pred: (c: number, r: number) => boolean, grow: number, S: GridMatrix): Cv {
	const m = makeCanvas(bake.maze.width, bake.maze.height);
	const x = context(m);
	x.fillStyle = '#fff';
	for (let r = 0; r < S.length; r += 1) {
		for (let c = 0; c < S[0].length; c += 1) {
			if (pred(c, r)) {
				x.fillRect(MX + c * T - bake.local.x - grow, MY + r * T - bake.local.y - grow, T + 2 * grow, T + 2 * grow);
			}
		}
	}
	return threshold(blur(m, 3, true), 5);
}

/** `a` without the part under `b`. */
function minus(a: Cv, b: Cv): Cv {
	const c = makeCanvas(a.width, a.height);
	const x = context(c);
	x.drawImage(a, 0, 0);
	x.globalCompositeOperation = 'destination-out';
	x.drawImage(b, 0, 0);
	return c;
}

/** A soft shadow of `mask` pushed by (dx, dy), kept off `keep` (the walls), drawn at `alpha`. */
function cast(out: CanvasRenderingContext2D, mask: Cv, dx: number, dy: number, steps: number, alpha: number, keep: Cv): void {
	const s = makeCanvas(mask.width, mask.height);
	context(s).drawImage(tint(mask, '#06010a'), dx, dy);
	out.globalAlpha = alpha;
	out.drawImage(minus(blur(s, steps, true), keep), 0, 0);
	out.globalAlpha = 1;
}

/** `m` grown by `r` px (drawn eight ways round). */
function dilate(m: Cv, r: number): Cv {
	const c = makeCanvas(m.width, m.height);
	const x = context(c);
	x.drawImage(m, 0, 0);
	for (let k = 0; k < 8; k += 1) {
		x.drawImage(m, Math.cos((k / 8) * 6.2832) * r, Math.sin((k / 8) * 6.2832) * r);
	}
	return c;
}

/** The light falls from the top left: a warm glow on the floor at the foot, the far side in shadow. */
function lighting(o: CanvasRenderingContext2D, wallM: Cv): void {
	const warm = minus(blur(tint(dilate(wallM, 5), '#c8401f'), 2, true), wallM);
	o.globalAlpha = 0.34;
	o.drawImage(warm, 0, 0);
	o.globalAlpha = 1;
	cast(o, wallM, 6, 8, 3, 0.78, wallM);
	cast(o, wallM, 0, 0, 2, 0.6, wallM);
}

/** The cord no longer rings the plate: it is a hot seam on the floor at the foot, on the lit side only. */
function reseam(bake: FleshBake, wallM: Cv): { emis: Cv; glow: Cv } {
	const e = makeCanvas(bake.emis.width, bake.emis.height);
	const x = context(e);
	x.drawImage(bake.emis, 0, 0);
	// the old ring lies inside the plate along its edge: take it out
	x.globalCompositeOperation = 'destination-out';
	const band = makeCanvas(wallM.width, wallM.height);
	const bx = context(band);
	for (let k = 0; k < 8; k += 1) {
		bx.drawImage(edgeOf(wallM, Math.cos((k / 8) * 6.2832) * 4, Math.sin((k / 8) * 6.2832) * 4), 0, 0);
	}
	x.drawImage(clipTo(band, wallM), 0, 0);
	x.globalCompositeOperation = 'source-over';
	const seam = minus(minus(dilate(wallM, 2.6), wallM), blur(dilate(shift(wallM, 3, 4), 3), 2, true));
	x.drawImage(tint(seam, 'rgba(255,120,60,.9)'), 0, 0);
	return { emis: e, glow: blur(e, 3, true) };
}

function shift(m: Cv, dx: number, dy: number): Cv {
	const c = makeCanvas(m.width, m.height);
	context(c).drawImage(m, dx, dy);
	return c;
}

/** The bake with the sitting-walls pass over its maze layer and the cord moved to the floor. */
export function depthBake(bake: FleshBake, S: GridMatrix): FleshBake {
	const out = makeCanvas(bake.maze.width, bake.maze.height);
	const o = context(out);
	o.drawImage(bake.maze, 0, 0);
	const wallM = maskOf(bake, (c, r) => isWall(S, c, r), 0, S);
	lighting(o, wallM);
	return { ...bake, maze: out, ...reseam(bake, wallM) };
}
