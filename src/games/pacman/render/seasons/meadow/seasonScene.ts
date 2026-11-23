// A season's holiday scene (the owner's picks of the `season-dress` prototype: autumn Halloween,
// winter New Year, spring hanami, summer fair) laid over the same meadow and the same layout.
// Everything but a few moving things is baked (`bakeMeadow` runs the scene's painters):
//   - `wallDress`: what lies on the walls, painted after the shared wall painter (which runs
//     unchanged) and clipped to the walls' silhouette, so nothing can leave the stone (no white
//     corners behind the rounded ones, no stripes across the floor); the prototype's pixel
//     guard (`prototypes/pacman/season-dress/guard.mjs`) checks it;
//   - `landmark`: round each of the two landmarks; `props`: on the meadow, never on the maze;
//   - lights: what glows at night (windows, lanterns, bulbs, pumpkins) is collected while baking
//     into `SceneLit` and the world draws it with its own night lights (`MeadowWorld.drawMood`);
//   - `live`: the few moving things (bat shadows, bubbles, sparks, a carousel), drawn over the
//     mood, small sprites only, nothing faster than 3 times a second.
// The corridor floor of autumn, spring and summer is one opaque tone with a contact shadow at the
// walls' feet and grass there (`sceneFloor`); winter keeps its own.
import type { GridMatrix } from '../../../config/gridConfig';
import type { WorldDecor } from '../../common/worldDecor';
import { WORLD_TILE } from '../../common/worldDecor';
import type { MeadowFrame } from './MeadowBake';
import type { BakeKit, MeadowPathCell } from './MeadowTheme';

const T = WORLD_TILE;
export const TAU = Math.PI * 2;

/** A light the world draws at night: world units, colour as 0xRRGGBB. */
export interface SceneLight {
	readonly x: number;
	readonly y: number;
	readonly r: number;
	readonly tint: number;
	readonly a: number;
	readonly flicker: boolean;
}

/** A place the live layer animates (a cauldron's bubbles, sparklers, a carousel). */
export interface SceneMark {
	readonly kind: string;
	readonly x: number;
	readonly y: number;
	readonly ph: number;
}

/** What the bake found to light and to animate (keyed by place: rebakes repeat them). */
export interface SceneLit {
	readonly lights: Map<string, SceneLight>;
	readonly marks: Map<string, SceneMark>;
}

export const newSceneLit = (): SceneLit => ({ lights: new Map(), marks: new Map() });

/** The world's state for the live layer: screen = origin + world units x `k`. */
export interface SceneView {
	readonly ox: number;
	readonly oy: number;
	readonly k: number;
	readonly night: number;
	readonly storm: number;
	readonly grid: GridMatrix;
	readonly lit: SceneLit;
}

export interface SeasonScene {
	/** On the walls, run inside their silhouette (`r` a seeded random). */
	readonly wallDress?: (f: MeadowFrame, r: () => number) => void;
	/** After the theme's landmark, round it; `i` 0 for the left one, 1 for the right. */
	readonly landmark?: (k: BakeKit, o: WorldDecor, lit: SceneLit, i: number) => void;
	/** After the walls: the props on the meadow. */
	readonly props?: (f: MeadowFrame, lit: SceneLit) => void;
	/** Every frame, over the mood. */
	readonly live?: (ctx: CanvasRenderingContext2D, t: number, v: SceneView) => void;
}

export const hash = (i: number, k = 0): number => {
	const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
	return v - Math.floor(v);
};

const key = (x: number, y: number): string => `${x.toFixed(1)},${y.toFixed(1)}`;

/** `rgb` 'r,g,b' to 0xRRGGBB. */
const tintOf = (rgb: string): number => {
	const [r, g, b] = rgb.split(',').map(Number);
	return (r << 16) | (g << 8) | b;
};

export function addLight(
	lit: SceneLit,
	x: number,
	y: number,
	r: number,
	rgb: string,
	a: number,
	flicker = false
): void {
	lit.lights.set(key(x, y), { x, y, r, tint: tintOf(rgb), a, flicker });
}

export function addMark(lit: SceneLit, kind: string, x: number, y: number, ph = 0): void {
	lit.marks.set(`${kind}:${key(x, y)}`, { kind, x, y, ph });
}

/** Bulbs of a string of lights: every other one glows at night (the bulbs themselves are baked). */
export function addBulbs(
	lit: SceneLit,
	bulbs: ReadonlyArray<{ x: number; y: number; rgb: string }>
): void {
	bulbs.forEach((b, i) => {
		if (i % 2 === 0) addLight(lit, b.x, b.y, 5, b.rgb, 0.7);
	});
}

export function rng(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * The wall faces' silhouette as one clip path: every wall tile inset by `inset` on the sides that
 * open to a path, 8 units round on the outer corners: the shape `paintWalls` fills.
 */
export function wallClip(f: MeadowFrame, inset = 0.6): Path2D {
	const path = new Path2D();
	for (let r = 0; r < f.R; r += 1) {
		for (let c = 0; c < f.C; c += 1) {
			if (!f.isW(r, c)) continue;
			const oL = !f.isW(r, c - 1);
			const oU = !f.isW(r - 1, c);
			const oR = !f.isW(r, c + 1);
			const oD = !f.isW(r + 1, c);
			const L = oL ? inset : -0.4;
			const U = oU ? inset : -0.4;
			const Rr = oR ? inset : -0.4;
			const Dd = oD ? inset : -0.4;
			path.roundRect(c * T + L, r * T + U, T - L - Rr, T - U - Dd, [
				oU && oL ? 8 : 0,
				oU && oR ? 8 : 0,
				oD && oR ? 8 : 0,
				oD && oL ? 8 : 0
			]);
		}
	}
	return path;
}

/** Runs `paint` with the bake clipped to the walls' silhouette. */
export function onWalls(f: MeadowFrame, paint: (r: () => number) => void, seed = 5): void {
	f.b.save();
	f.b.clip(wallClip(f));
	paint(rng(seed));
	f.b.restore();
}

/** Whether (x, y) lies within `d` of a wall's outer rounded corner (light things stay off them). */
export function nearCorner(f: MeadowFrame, x: number, y: number, d: number): boolean {
	const c = Math.floor(x / T);
	const r = Math.floor(y / T);
	if (!f.isW(r, c)) return false;
	const oU = !f.isW(r - 1, c);
	const oD = !f.isW(r + 1, c);
	const oL = !f.isW(r, c - 1);
	const oR = !f.isW(r, c + 1);
	const lx = x - c * T;
	const ly = y - r * T;
	return (
		(oU && oL && lx < d && ly < d) ||
		(oU && oR && lx > T - d && ly < d) ||
		(oD && oL && lx < d && ly > T - d) ||
		(oD && oR && lx > T - d && ly > T - d)
	);
}

/** The walls' outer corners: the corner point and the signs pointing into the block; a seeded share. */
export function outerCorners(
	f: MeadowFrame,
	share: number,
	seed: number
): Array<{ x: number; y: number; sx: number; sy: number; frame: boolean }> {
	const out: Array<{ x: number; y: number; sx: number; sy: number; frame: boolean }> = [];
	for (let r = 0; r < f.R; r += 1) {
		for (let c = 0; c < f.C; c += 1) {
			if (!f.isW(r, c)) continue;
			const oU = !f.isW(r - 1, c);
			const oD = !f.isW(r + 1, c);
			const oL = !f.isW(r, c - 1);
			const oR = !f.isW(r, c + 1);
			const edge = r <= 1 || c <= 1 || r >= f.R - 2 || c >= f.C - 2;
			const cand: Array<[boolean, number, number, number, number]> = [
				[oU && oL, c * T, r * T, 1, 1],
				[oU && oR, (c + 1) * T, r * T, -1, 1],
				[oD && oL, c * T, (r + 1) * T, 1, -1],
				[oD && oR, (c + 1) * T, (r + 1) * T, -1, -1]
			];
			cand.forEach(([ok, x, y, sx, sy], i) => {
				if (!ok) return;
				// the maze's own four outer corners always; the rest a seeded share
				const big = edge && (r <= 1 || r >= f.R - 2) && (c <= 1 || c >= f.C - 2);
				if (big || hash(r * 31 + c * 7 + i, seed) < share) out.push({ x, y, sx, sy, frame: big });
			});
		}
	}
	return out;
}

/** How much room a decor object takes (world units). */
const roomOf = (o: WorldDecor): number =>
	o.k === 'cabin'
		? Math.max(o.w ?? 0, o.h ?? 0) * 0.62
		: o.k === 'pond'
			? (o.rx ?? 0) * 1.2
			: o.k === 'tree'
				? (o.r ?? 0) * 1.15
				: o.k === 'fl'
					? 0
					: (o.r ?? T * 0.6) * 1.1;

/**
 * The nearest free place to (tx, ty) (tiles) for a thing of radius `rad` (tiles): off the maze and
 * a margin round it, clear of the decor and of what was `taken`. World units. Deterministic.
 */
export function spot(
	f: { readonly DEC: readonly WorldDecor[]; readonly R: number; readonly C: number },
	tx: number,
	ty: number,
	rad: number,
	taken: Array<[number, number, number]> = []
): [number, number] {
	for (let i = 0; i < 400; i += 1) {
		const a = i * 2.39996;
		const d = 0.25 * Math.sqrt(i);
		const x = (tx + Math.cos(a) * d) * T;
		const y = (ty + Math.sin(a) * d) * T;
		const m = (rad + 0.7) * T;
		if (x > -m && x < f.C * T + m && y > -m && y < f.R * T + m) continue;
		if (f.DEC.some((o) => Math.hypot(o.x - x, o.y - y) < roomOf(o) + rad * T)) continue;
		if (taken.some(([px, py, pr]) => Math.hypot(px - x, py - y) < (pr + rad) * T)) continue;
		taken.push([x, y, rad]);
		return [x, y];
	}
	return [tx * T, ty * T];
}

export const cabinsOf = (DEC: readonly WorldDecor[]): WorldDecor[] =>
	DEC.filter((o) => o.k === 'cabin');

// ------------------------------------------------------------------------------- the floor

export interface FloorTone {
	/** One flat opaque colour for the whole corridor. */
	readonly base: string;
	/** Two grain colours (light, dark), laid at a low alpha. */
	readonly grain: readonly [string, string];
	/** How dark the contact shadow at the walls' feet is, 0..1. */
	readonly ao: number;
}

/**
 * One corridor cell: opaque, one tone, a faint grain, the contact shadow where a wall stands (the
 * light comes from the upper left: deeper on a cell's left and top edge, a thin line on its right
 * and bottom), short grass blades at the walls' feet, never in the middle.
 */
export function sceneFloor(
	tone: FloorTone,
	feet: readonly [string, string, string],
	extra?: (f: MeadowFrame, cell: MeadowPathCell) => void
): (f: MeadowFrame, cell: MeadowPathCell) => void {
	return (f, cell) => {
		const { b, isW } = f;
		const { x, y, r, c, k } = cell;
		b.fillStyle = tone.base;
		b.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
		for (let i = 0; i < 7; i += 1) {
			b.fillStyle = tone.grain[i % 2];
			b.globalAlpha = 0.1 + k() * 0.1;
			b.beginPath();
			b.ellipse(x + k() * T, y + k() * T, 0.5 + k() * 1.3, 0.4 + k() * 0.8, k() * 3, 0, TAU);
			b.fill();
		}
		b.globalAlpha = 1;
		const strip = (
			x0: number,
			y0: number,
			x1: number,
			y1: number,
			rw: number,
			rh: number,
			depth: number
		) => {
			const g = b.createLinearGradient(x0, y0, x1, y1);
			g.addColorStop(0, `rgba(0,0,0,${tone.ao * depth})`);
			g.addColorStop(1, 'rgba(0,0,0,0)');
			b.fillStyle = g;
			b.fillRect(x0 < x1 || y0 < y1 ? x0 : x1, x0 < x1 || y0 < y1 ? y0 : y1, rw, rh);
		};
		if (isW(r, c - 1)) strip(x, y, x + 9, y, 9, T, 1);
		if (isW(r - 1, c)) strip(x, y, x, y + 9, T, 9, 1);
		if (isW(r, c + 1)) strip(x + T, y, x + T - 4, y, 4, T, 0.5);
		if (isW(r + 1, c)) strip(x, y + T, x, y + T - 4, T, 4, 0.5);
		b.lineCap = 'round';
		const blade = (bx: number, by: number, dx: number, dy: number) => {
			b.strokeStyle = feet[Math.floor(k() * 3)];
			b.lineWidth = 0.9;
			b.beginPath();
			b.moveTo(bx, by);
			b.lineTo(bx + dx + (k() - 0.5) * 1.5, by + dy);
			b.stroke();
		};
		if (isW(r, c - 1))
			for (let i = 0; i < 4; i += 1) blade(x + 0.5, y + k() * T, 2.5 + k() * 2, (k() - 0.5) * 3);
		if (isW(r - 1, c))
			for (let i = 0; i < 4; i += 1) blade(x + k() * T, y + 0.5, (k() - 0.5) * 3, 2.5 + k() * 2);
		extra?.(f, cell);
	};
}
