// The station's painting ground (DESIGN.md §7a, the owner's style B): the scene's units and
// frame, the bake scale, the maze predicates, frame-sized layers and mask operations, and the
// lamps. Everything of the station is painted in scene units (a tile is T, the maze's top-left
// corner at (MX, MY)) into layers of FRAME × the bake scale; `StationWorld` draws them scaled.
import type { GridMatrix } from '../../config/gridConfig';
import { context, makeCanvas, rng } from '../doom/fleshNoise';

/** One tile of the scene. */
export const T = 32;
/** The scene's stage: the maze and the station round it. */
export const FRAME = { w: 1900, h: 1100 } as const;
/** The maze's top-left corner in the scene. */
export const MX = 550;
export const MY = 118;

/** The station's three phases (DESIGN.md §7a): power, failure, nest. */
export type Phase = 1 | 2 | 3;

let bakeK = 1;

/** Device pixels per scene unit of the layers being baked. */
export function sk(): number {
	return bakeK;
}

/** Sets the bake scale for the next bake (from the screen: enough pixels, no more). */
export function setBakeScale(k: number): void {
	bakeK = Math.max(0.5, Math.min(2, k));
}

export interface Lamp {
	/** Tile coordinates of the light's centre (may lie outside the maze, on the surround). */
	readonly x: number;
	readonly y: number;
	readonly kind: 'ceiling' | 'emergency' | 'wall';
	readonly seed: number;
}

export const isWall = (g: GridMatrix, x: number, y: number): boolean => g[y]?.[x] === 'WL';
export const isVoid = (g: GridMatrix, x: number, y: number): boolean => {
	const t = g[y]?.[x];
	return t === undefined || t === 'ES';
};
const LAIR = new Set(['LT', 'BY', 'IY', 'PY', 'CE', 'DB']);
export const isLair = (g: GridMatrix, x: number, y: number): boolean => LAIR.has(g[y]?.[x] ?? '');
export const isFloor = (g: GridMatrix, x: number, y: number): boolean =>
	!isWall(g, x, y) && !isVoid(g, x, y) && !isLair(g, x, y) && g[y]?.[x] !== 'LE';

/** A frame-sized canvas at sk() pixels per unit, its context already scaled to scene units. */
export function layer(): [HTMLCanvasElement, CanvasRenderingContext2D] {
	const c = makeCanvas(FRAME.w * sk(), FRAME.h * sk());
	const x = context(c);
	x.scale(sk(), sk());
	return [c, x];
}

/** Draws a frame-sized layer onto a scene-scaled context, pixel for pixel, moved by (dx, dy). */
export function put(c: CanvasRenderingContext2D, src: HTMLCanvasElement, dx = 0, dy = 0): void {
	c.drawImage(src, dx, dy, FRAME.w, FRAME.h);
}

/** Shape helpers: grow / shrink an alpha mask by `d` units (12 shifted copies). */
export function morph(src: HTMLCanvasElement, d: number, grow: boolean): HTMLCanvasElement {
	const c = makeCanvas(src.width, src.height);
	const x = context(c);
	x.drawImage(src, 0, 0);
	x.globalCompositeOperation = grow ? 'source-over' : 'destination-in';
	for (let i = 0; i < 12; i += 1) {
		const a = (i / 12) * Math.PI * 2;
		x.drawImage(src, Math.cos(a) * d * sk(), Math.sin(a) * d * sk());
	}
	return c;
}

export function minus(a: HTMLCanvasElement, b: HTMLCanvasElement): HTMLCanvasElement {
	const c = makeCanvas(a.width, a.height);
	const x = context(c);
	x.drawImage(a, 0, 0);
	x.globalCompositeOperation = 'destination-out';
	x.drawImage(b, 0, 0);
	return c;
}

export function paintInto(mask: HTMLCanvasElement, paint: (c: CanvasRenderingContext2D) => void) {
	const [c, x] = layer();
	paint(x);
	x.setTransform(1, 0, 0, 1, 0, 0);
	x.globalCompositeOperation = 'destination-in';
	x.drawImage(mask, 0, 0);
	return c;
}

export const fill = (color: string) => (p: CanvasRenderingContext2D) => {
	p.fillStyle = color;
	p.fillRect(0, 0, FRAME.w, FRAME.h);
};

export function wallMask(g: GridMatrix, grow: number): HTMLCanvasElement {
	const [m, c] = layer();
	c.fillStyle = '#fff';
	const rad = 7;
	for (let y = 0; y < g.length; y += 1) {
		for (let x = 0; x < (g[0]?.length ?? 0); x += 1) {
			if (!isWall(g, x, y)) continue;
			const up = isWall(g, x, y - 1);
			const dn = isWall(g, x, y + 1);
			const lf = isWall(g, x - 1, y);
			const rt = isWall(g, x + 1, y);
			// reach a unit into a wall neighbour: the tiles overlap, so no antialiased seam is
			// left between them (an eroded mask would open it into a gap)
			const l = lf ? 1 : grow;
			const r = rt ? 1 : grow;
			const u = up ? 1 : grow;
			const d = dn ? 1 : grow;
			const px = MX + x * T - l;
			const py = MY + y * T - u;
			c.beginPath();
			c.roundRect(px, py, T + l + r, T + u + d, [
				!up && !lf ? rad : 0,
				!up && !rt ? rad : 0,
				!dn && !rt ? rad : 0,
				!dn && !lf ? rad : 0
			]);
			c.fill();
		}
	}
	return m;
}

export function floorMask(
	g: GridMatrix,
	pred: (x: number, y: number) => boolean
): HTMLCanvasElement {
	const [m, c] = layer();
	c.fillStyle = '#fff';
	for (let y = 0; y < g.length; y += 1) {
		for (let x = 0; x < (g[0]?.length ?? 0); x += 1) {
			if (pred(x, y)) c.fillRect(MX + x * T, MY + y * T, T, T);
		}
	}
	return m;
}

/** The lamps: ceiling lamps over some corridors, red emergency lamps at some junctions. */
export function stationLamps(g: GridMatrix): Lamp[] {
	const out: Lamp[] = [];
	const r = rng(77);
	for (let y = 0; y < g.length; y += 1) {
		for (let x = 0; x < (g[0]?.length ?? 0); x += 1) {
			if (!isFloor(g, x, y)) continue;
			const n =
				Number(isFloor(g, x + 1, y)) +
				Number(isFloor(g, x - 1, y)) +
				Number(isFloor(g, x, y + 1)) +
				Number(isFloor(g, x, y - 1));
			const straight =
				(isFloor(g, x + 1, y) && isFloor(g, x - 1, y) && n === 2) ||
				(isFloor(g, x, y + 1) && isFloor(g, x, y - 1) && n === 2);
			if (straight && (x * 7 + y * 13) % 11 === 0 && r() < 0.8) {
				out.push({ x: x + 0.5, y: y + 0.5, kind: 'ceiling', seed: r() });
			}
			if (n >= 3 && (x * 5 + y * 3) % 7 === 0) {
				out.push({ x: x + 0.5, y: y + 0.5, kind: 'emergency', seed: r() });
			}
		}
	}
	// wall lamps on the surround (tile coordinates may lie outside the maze)
	for (const [x, y] of [
		[-4.2, 3],
		[-4.2, 22],
		[29.2, 5],
		[29.2, 20],
		[-9, 13.5],
		[34, 12]
	] as const) {
		out.push({ x, y, kind: 'wall', seed: r() });
	}
	return out;
}
