// Candidates for the flesh hell's depth: the baked maze layer (`bakeFlesh(...).maze`) gets a
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
	fbm,
	makeCanvas,
	rng,
	threshold,
	tint
} from '../../../src/games/pacman/render/doom/fleshNoise';

export type DepthId = 'now' | 'a' | 'b' | 'c';
type Cv = HTMLCanvasElement;
const T = SCENE_TILE;

const isWall = (S: GridMatrix, c: number, r: number): boolean => S[r]?.[c] === 'WL';
const isDeck = (S: GridMatrix, c: number, r: number): boolean => {
	const t = S[r]?.[c];
	return t !== undefined && t !== 'ES';
};

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

/** B: a side face on every south edge, inside the wall's own tile (the corridor keeps its width). */
function face(out: CanvasRenderingContext2D, bake: FleshBake, S: GridMatrix, wallM: Cv): void {
	const f = makeCanvas(wallM.width, wallM.height);
	const x = context(f);
	const rw = rng(5);
	const H = 12;
	for (let r = 0; r < S.length; r += 1) {
		for (let c = 0; c < S[0].length; c += 1) {
			if (!isWall(S, c, r) || isWall(S, c, r + 1)) {
				continue;
			}
			const X = MX + c * T - bake.local.x;
			const Y = MY + (r + 1) * T - bake.local.y - H - 2;
			const g = x.createLinearGradient(0, Y, 0, Y + H + 2);
			g.addColorStop(0, '#463a3c');
			g.addColorStop(0.15, '#2c2123');
			g.addColorStop(1, '#0e0709');
			x.fillStyle = g;
			x.fillRect(X - 1, Y, T + 2, H + 2);
			x.fillStyle = 'rgba(255,214,180,.24)';
			x.fillRect(X - 1, Y, T + 2, 1.5);
			x.fillStyle = 'rgba(0,0,0,.5)';
			x.fillRect(X + T - 0.6, Y + 1.5, 1.4, H);
			x.fillStyle = 'rgba(255,200,170,.2)';
			for (const rx of [X + 6, X + T - 7]) {
				x.beginPath();
				x.arc(rx, Y + 5.5 + rw() * 0.6, 1.2, 0, 7);
				x.fill();
			}
		}
	}
	out.drawImage(clipTo(f, wallM), 0, 0);
}

/** C: a lumpy ridge of flesh runs along the plates' shadow sides, so the iron is stitched to the floor. */
function overgrowth(out: CanvasRenderingContext2D, bake: FleshBake, S: GridMatrix): void {
	const lx = bake.local.x;
	const ly = bake.local.y;
	const pts: Array<readonly [number, number, number]> = [];
	// the south and east sides carry no hot seam: the flesh closes the joint there
	for (let r = 0; r < S.length; r += 1) {
		for (let c = 0; c < S[0].length; c += 1) {
			if (!isWall(S, c, r)) {
				continue;
			}
			for (const [nx, ny] of [[0, 1], [1, 0]] as const) {
				if (isWall(S, c + nx, r + ny)) {
					continue;
				}
				for (let d = 0; d <= T; d += 1.5) {
					const px = MX + c * T - lx + (nx === 0 ? d : T) + nx * 0.8;
					const py = MY + r * T - ly + (ny === 0 ? d : T) + ny * 0.8;
					const n = fbm((px + lx) / 26, (py + ly) / 26);
					if (n < 0.44) {
						continue;
					}
					pts.push([px, py, 1.6 + (n - 0.44) * 9]);
				}
			}
		}
	}
	out.fillStyle = 'rgba(30,5,9,.7)';
	for (const [x, y, R] of pts) {
		out.beginPath();
		out.arc(x + 0.8, y + 1, R + 1, 0, 7);
		out.fill();
	}
	out.fillStyle = 'rgb(86,23,29)';
	for (const [x, y, R] of pts) {
		out.beginPath();
		out.arc(x, y, R, 0, 7);
		out.fill();
	}
	out.fillStyle = 'rgba(255,185,165,.2)';
	for (const [x, y, R] of pts) {
		out.beginPath();
		out.arc(x - R * 0.28, y - R * 0.3, R * 0.55, 0, 7);
		out.fill();
	}
}

/** The bake with the candidate's maze layer and glow swapped in. */
export function depthBake(bake: FleshBake, S: GridMatrix, id: DepthId): FleshBake {
	if (id === 'now') {
		return bake;
	}
	const out = makeCanvas(bake.maze.width, bake.maze.height);
	const o = context(out);
	o.drawImage(bake.maze, 0, 0);
	const wallM = maskOf(bake, (c, r) => isWall(S, c, r), 0, S);
	lighting(o, wallM);
	if (id === 'b') {
		face(o, bake, S, wallM);
	} else if (id === 'c') {
		overgrowth(o, bake, S);
	}
	return { ...bake, maze: out, ...reseam(bake, wallM) };
}
