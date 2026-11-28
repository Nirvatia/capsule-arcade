// A candidate for the station's infestation (the owner, 2026-11-28: the walls read by their shape;
// thin lines of organics on them break it, so the hive must take a whole wall as its material,
// like moss or a thicket). It stands in for the game's `B7Hive` layer (stage space, under the
// light); the scene, its floor, lamps, hull and the lair are the game's.
//   the mass   each wall island becomes one mass of tissue in the wall's own outline (its edge
//              wobbles by 2 px at most, an ink line round it); its volume is a height field baked
//              once (rising from the edge, slow lumps, folds) lit from the top left, not detail;
//   materials  `gloss`: black and wet, a cold highlight on the crests, lime glowing deep in the
//              folds in a few patches; `moss`: matte and velvety, black to dark olive by height, a
//              soft fuzzy edge, a little lime on some crests;
//   `lacquer`  a smooth black slab, no texture inside: a rounded edge, one soft sheen from the lamps
//              over it (and a spot under a lamp), the organics only in its wobbling outline; lime only on
//              the growth front;
//   growth     it takes the walls from the lair out, a ragged front (by 98% every wall);
//   life       the lime in the folds swells with the heartbeat, over the light.
import type { createB7Scene } from '../../../src/games/pacman/render/station/b7/b7Scene';
import { heartbeat } from '../../../src/games/pacman/render/station/b7/b7Hive';

type Scene = ReturnType<typeof createB7Scene>;
type Ctx = CanvasRenderingContext2D;
type Rows = readonly (readonly string[])[];
export type WallMaterial = 'gloss' | 'moss' | 'lacquer';

/** The station's light on the maze (`lightPass`): at a point (stage px from the maze's origin) the
 *  lamps' strength and the direction to them, weighted; `version` changes when it does. */
export interface LightField {
	readonly version: number;
	at(sx: number, sy: number): readonly [number, number, number, number];
}

/** Bake pixels per stage pixel. */
const Z = 1.25;
/** The wall plate's inset from a corridor, stage px (the game's hive uses the same). */
const PLATE_INSET = 2.6;
const LIME: readonly [number, number, number] = [168, 250, 66];

// a seeded value noise and its fractal sum
const PERM = (() => {
	const p = new Uint8Array(512);
	const a = Array.from({ length: 256 }, (_, i) => i);
	let s = 1234567;
	for (let i = 255; i > 0; i--) {
		s = (s * 16807) % 2147483647;
		const j = s % (i + 1);
		[a[i], a[j]] = [a[j], a[i]];
	}
	for (let i = 0; i < 512; i++) p[i] = a[i & 255];
	return p;
})();
function vnoise(x: number, y: number): number {
	const xi = Math.floor(x);
	const yi = Math.floor(y);
	const xf = x - xi;
	const yf = y - yi;
	const u = xf * xf * (3 - 2 * xf);
	const v = yf * yf * (3 - 2 * yf);
	const h = (i: number, j: number) => PERM[(PERM[(xi + i) & 255] + yi + j) & 255] / 255;
	const a = h(0, 0) + (h(1, 0) - h(0, 0)) * u;
	const b = h(0, 1) + (h(1, 1) - h(0, 1)) * u;
	return a + (b - a) * v;
}
function fbm(x: number, y: number, oct: number): number {
	let sum = 0;
	let amp = 0.5;
	let norm = 0;
	for (let o = 0; o < oct; o++) {
		sum += vnoise(x, y) * amp;
		norm += amp;
		x = x * 2.03 + 17.1;
		y = y * 2.03 + 9.7;
		amp *= 0.5;
	}
	return sum / norm;
}
const smooth = (e0: number, e1: number, x: number) => {
	const k = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
	return k * k * (3 - 2 * k);
};

export class WallHive {
	private readonly W: number;
	private readonly H: number;
	private readonly ox: number;
	private readonly oy: number;
	/** The fully taken look: colour and alpha, the lime's strength, each pixel's arrival (0..1). */
	private readonly rgba: Uint8ClampedArray;
	private readonly lime: Float32Array;
	private readonly arrival: Float32Array;
	private readonly mass: HTMLCanvasElement;
	private readonly glow: HTMLCanvasElement;
	private shown = -1;
	private inf = 0;
	/** The gloss's normals (x, y, z per pixel): its highlights are the lamps', drawn per update. */
	private readonly norm: Float32Array | null;
	private light: LightField | null = null;
	private readonly lacquer: boolean;
	private lightShown = -1;

	constructor(
		private readonly scene: Scene,
		rows: Rows,
		private readonly lair: CanvasImageSource,
		material: WallMaterial
	) {
		const { TILE, tx, ty } = scene;
		const ROWS = rows.length;
		const COLS = rows[0].length;
		this.ox = tx(0);
		this.oy = ty(0);
		const W = (this.W = Math.ceil(COLS * TILE * Z));
		const H = (this.H = Math.ceil(ROWS * TILE * Z));
		const at = (x: number, y: number) => rows[y]?.[x] ?? 'ES';
		const wall = (x: number, y: number) => at(x, y) === 'WL';
		const open = (x: number, y: number) => !['WL', 'ES'].includes(at(x, y));
		// the walls' mask: each wall tile's plate, inset from the corridors
		const inside = new Uint8Array(W * H);
		for (let y = 0; y < ROWS; y++)
			for (let x = 0; x < COLS; x++) {
				if (!wall(x, y)) continue;
				const x0 = Math.round((x * TILE + (open(x - 1, y) ? PLATE_INSET : 0)) * Z);
				const x1 = Math.round(((x + 1) * TILE - (open(x + 1, y) ? PLATE_INSET : 0)) * Z);
				const y0 = Math.round((y * TILE + (open(x, y - 1) ? PLATE_INSET : 0)) * Z);
				const y1 = Math.round(((y + 1) * TILE - (open(x, y + 1) ? PLATE_INSET : 0)) * Z);
				for (let v = y0; v < y1; v++) for (let u = x0; u < x1; u++) inside[v * W + u] = 1;
			}
		// signed distance to the plate's edge, stage px (two chamfer passes in and out)
		const dIn = chamfer(inside, W, H, 1);
		const dOut = chamfer(inside, W, H, 0);
		const D = new Float32Array(W * H);
		for (let i = 0; i < W * H; i++) D[i] = (inside[i] ? dIn[i] : -dOut[i]) / Z;
		// the arrival: by the tile's distance from the lair, ragged
		let maxD = 0;
		for (let y = 0; y < ROWS; y++)
			for (let x = 0; x < COLS; x++) if (wall(x, y)) maxD = Math.max(maxD, scene.infectionDistance(x, y));
		// the height field
		const Hf = new Float32Array(W * H);
		const lump = new Float32Array(W * H);
		const dm = new Float32Array(W * H).fill(-9);
		const fuzz = new Float32Array(W * H);
		this.arrival = new Float32Array(W * H).fill(2);
		for (let v = 0; v < H; v++)
			for (let u = 0; u < W; u++) {
				const i = v * W + u;
				if (D[i] < -3) continue;
				const sx = u / Z;
				const sy = v / Z;
				const m = D[i] + (vnoise(sx * 0.09, sy * 0.09) - 0.5) * 4;
				dm[i] = m;
				if (m < -1.5) continue;
				const lac = material === 'lacquer';
				const l = lac ? 0.5 : material === 'gloss' ? fbm(sx / 24, sy / 24, 2) : fbm(sx / 15, sy / 15, 3);
				const ridge = material === 'gloss' ? 0 : 1 - Math.abs(2 * fbm(sx / 8 + 31, sy / 8 + 17, 2) - 1);
				const f = material === 'moss' ? fbm(sx / 2.6, sy / 2.6, 2) : 0;
				const h = smooth(0, 9, m);
				lump[i] = l;
				fuzz[i] = f;
				Hf[i] = lac
					? smooth(0, 11, m) * (6 + (vnoise(sx / 70, sy / 70) - 0.5) * 1.4)
					: h * (3 + 7 * l + (material === 'gloss' ? 2.2 : 1) * ridge) + (material === 'moss' ? 0.8 * f : 0);
				const tx0 = Math.min(COLS - 1, Math.floor(sx / TILE));
				const ty0 = Math.min(ROWS - 1, Math.floor(sy / TILE));
				const d = wall(tx0, ty0) ? scene.infectionDistance(tx0, ty0) : nearestWallDist(scene, wall, tx0, ty0);
				this.arrival[i] = Math.max(
					0,
					Math.min(0.98, (d / Math.max(1, maxD)) * 0.9 + (vnoise(sx / 26, sy / 26) - 0.5) * 0.14 + 0.02)
				);
			}
		// shade it: normals from the height field, the light from the top left
		this.rgba = new Uint8ClampedArray(W * H * 4);
		this.lime = new Float32Array(W * H);
		this.norm = material !== 'moss' ? new Float32Array(W * H * 3) : null;
		this.lacquer = material === 'lacquer';
		const L = norm3(-0.55, -0.65, 0.55);
		const Hh = norm3(L[0], L[1], L[2] + 1);
		for (let v = 1; v < H - 1; v++)
			for (let u = 1; u < W - 1; u++) {
				const i = v * W + u;
				const m = dm[i];
				if (m < -1.5) continue;
				const sx = u / Z;
				const sy = v / Z;
				const gx = ((Hf[i + 1] - Hf[i - 1]) * Z) / 2;
				const gy = ((Hf[i + W] - Hf[i - W]) * Z) / 2;
				const N = norm3(-gx, -gy, 1);
				const diff = Math.max(0, N[0] * L[0] + N[1] * L[1] + N[2] * L[2]);
				const nh = Math.max(0, N[0] * Hh[0] + N[1] * Hh[1] + N[2] * Hh[2]);
				let r: number;
				let g: number;
				let b: number;
				let a: number;
				const cavity = smooth(0.55, 0.85, 1 - lump[i]) * smooth(3, 8, m);
				const patch = smooth(0.45, 0.68, vnoise(sx / 42 + 5, sy / 42 + 3));
				let lime: number;
				if (material === 'lacquer') {
					const shade = 0.42 + 1.05 * diff;
					r = 13 * shade;
					g = 15 * shade;
					b = 19 * shade;
					a = smooth(-1.5, 0.6, m);
					lime = 0;
					if (this.norm) {
						this.norm[i * 3] = N[0];
						this.norm[i * 3 + 1] = N[1];
						this.norm[i * 3 + 2] = N[2];
					}
				} else if (material === 'gloss') {
					const shade = 0.38 + 1.35 * diff;
					// a faint key highlight for the form; the lamps' own come in `update`
					const spec = (Math.pow(nh, 40) * 0.95 + Math.pow(nh, 6) * 0.1) * 0.3;
					if (this.norm) {
						this.norm[i * 3] = N[0];
						this.norm[i * 3 + 1] = N[1];
						this.norm[i * 3 + 2] = N[2];
					}
					r = 15 * shade + 205 * spec;
					g = 17 * shade + 226 * spec;
					b = 20 * shade + 232 * spec;
					a = smooth(-1.5, 0.6, m);
					lime = cavity * patch;
				} else {
					const k = smooth(0.15, 0.95, Hf[i] / 11);
					const vel = 0.82 + 0.36 * fuzz[i];
					const shade = (0.5 + 1.05 * diff) * vel;
					r = (10 + 36 * k) * shade;
					g = (12 + 52 * k) * shade;
					b = (10 + 22 * k) * shade;
					const spec = Math.pow(nh, 8) * 0.06;
					r += 120 * spec;
					g += 140 * spec;
					b += 110 * spec;
					a = smooth(-1.5, 1.2, m + (fuzz[i] - 0.5) * 3.2);
					lime = cavity * patch * 0.7 + (k > 0.75 && fuzz[i] > 0.74 ? 0.5 : 0);
				}
				// the ink line round the mass: its silhouette is the wall's
				const ink = 1 - 0.7 * (1 - smooth(0.2, 1.8, m));
				this.rgba[i * 4] = r * ink + LIME[0] * lime * 0.35;
				this.rgba[i * 4 + 1] = g * ink + LIME[1] * lime * 0.35;
				this.rgba[i * 4 + 2] = b * ink + LIME[2] * lime * 0.35;
				this.rgba[i * 4 + 3] = a * 255;
				this.lime[i] = lime;
			}
		this.mass = canvas(W, H);
		this.glow = canvas(W, H);
	}

	/** The lamps the gloss reflects. */
	setLight(light: LightField | null): void {
		this.light = light;
		this.lightShown = -1;
	}

	update(infection: number): void {
		this.inf = infection;
		const lv = this.light?.version ?? -1;
		if (Math.abs(this.shown - infection) < 0.002 && lv === this.lightShown) return;
		this.shown = infection;
		this.lightShown = lv;
		const { W, H } = this;
		const m = new ImageData(W, H);
		const gl = new ImageData(W, H);
		for (let i = 0; i < W * H; i++) {
			const a = this.rgba[i * 4 + 3];
			if (!a) continue;
			const cov = Math.max(0, Math.min(1, (infection - this.arrival[i]) * 90));
			if (cov <= 0) continue;
			let r = this.rgba[i * 4];
			let g = this.rgba[i * 4 + 1];
			let b = this.rgba[i * 4 + 2];
			if (this.norm && this.light) {
				// the lamps' highlight: toward the lamps that light this point, as strong as they are
				const [I, dx, dy, spot] = this.light.at((i % W) / Z, Math.floor(i / W) / Z);
				if (I > 0.02) {
					const L = norm3(dx * 0.8, dy * 0.8, 0.6);
					const Hh = norm3(L[0], L[1], L[2] + 1);
					const nh = Math.max(0, this.norm[i * 3] * Hh[0] + this.norm[i * 3 + 1] * Hh[1] + this.norm[i * 3 + 2] * Hh[2]);
					// the lacquer: one soft sheen over the slab and a spot under a lamp, nothing sharp
					const sp = this.lacquer
						? (Math.pow(nh, 14) * 0.45 + Math.pow(nh, 3) * 0.05) * I + 0.38 * spot
						: (Math.pow(nh, 36) * 0.95 + Math.pow(nh, 6) * 0.12) * I;
					r += 230 * sp;
					g += 238 * sp;
					b += 244 * sp;
				}
			}
			m.data[i * 4] = r;
			m.data[i * 4 + 1] = g;
			m.data[i * 4 + 2] = b;
			m.data[i * 4 + 3] = a * cov;
			// the lacquer's lime: only on its growth front, a soft band where it is taking the steel
			const l = this.lacquer
				? infection < 0.985
					? Math.max(0, 1 - (infection - this.arrival[i]) / 0.035) * 0.8 * (cov > 0 ? 1 : 0)
					: 0
				: this.lime[i] * cov;
			if (l > 0.01) {
				gl.data[i * 4] = LIME[0];
				gl.data[i * 4 + 1] = LIME[1];
				gl.data[i * 4 + 2] = LIME[2];
				gl.data[i * 4 + 3] = 255 * Math.min(1, l);
			}
		}
		(this.mass.getContext('2d') as Ctx).putImageData(m, 0, 0);
		(this.glow.getContext('2d') as Ctx).putImageData(gl, 0, 0);
	}

	/** In place of `B7Hive.draw`: the mass, then the game's lair (stage space, under the light). */
	draw(ctx: Ctx): void {
		const s = this.scene;
		ctx.drawImage(this.mass, this.ox, this.oy, this.W / Z, this.H / Z);
		ctx.drawImage(this.lair, s.tx(9), s.ty(9), s.tx(16) - s.tx(9), s.ty(16) - s.ty(9));
	}

	/** In place of `B7Hive.drawPulse` (over the light): the lime in the folds swells with the beat. */
	drawPulse(ctx: Ctx, _infection: number, time: number): void {
		if (this.inf <= 0) return;
		const beat = heartbeat(time, 0);
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.globalAlpha = 0.28 + 0.6 * beat;
		ctx.drawImage(this.glow, this.ox, this.oy, this.W / Z, this.H / Z);
		ctx.restore();
	}
}

function canvas(w: number, h: number): HTMLCanvasElement {
	const c = document.createElement('canvas');
	c.width = w;
	c.height = h;
	return c;
}

function norm3(x: number, y: number, z: number): [number, number, number] {
	const l = Math.hypot(x, y, z) || 1;
	return [x / l, y / l, z / l];
}

/** Chamfer distance (px) to the nearest pixel whose mask differs from `want`, for pixels = want. */
export function chamfer(mask: Uint8Array, W: number, H: number, want: number): Float32Array {
	const INF = 1e9;
	const d = new Float32Array(W * H);
	for (let i = 0; i < W * H; i++) d[i] = mask[i] === want ? INF : 0;
	const A = 1;
	const B = Math.SQRT2;
	for (let v = 0; v < H; v++)
		for (let u = 0; u < W; u++) {
			const i = v * W + u;
			if (!d[i]) continue;
			let m = d[i];
			if (u > 0) m = Math.min(m, d[i - 1] + A);
			if (v > 0) {
				m = Math.min(m, d[i - W] + A);
				if (u > 0) m = Math.min(m, d[i - W - 1] + B);
				if (u < W - 1) m = Math.min(m, d[i - W + 1] + B);
			}
			d[i] = m;
		}
	for (let v = H - 1; v >= 0; v--)
		for (let u = W - 1; u >= 0; u--) {
			const i = v * W + u;
			if (!d[i]) continue;
			let m = d[i];
			if (u < W - 1) m = Math.min(m, d[i + 1] + A);
			if (v < H - 1) {
				m = Math.min(m, d[i + W] + A);
				if (u < W - 1) m = Math.min(m, d[i + W + 1] + B);
				if (u > 0) m = Math.min(m, d[i + W - 1] + B);
			}
			d[i] = m;
		}
	return d;
}

/** A pixel just outside a wall (its edge wobble): the nearest wall tile's distance. */
function nearestWallDist(scene: Scene, wall: (x: number, y: number) => boolean, x: number, y: number): number {
	let best = Infinity;
	for (const [dx, dy] of [
		[1, 0],
		[-1, 0],
		[0, 1],
		[0, -1]
	])
		if (wall(x + dx, y + dy)) best = Math.min(best, scene.infectionDistance(x + dx, y + dy));
	return Number.isFinite(best) ? best : 99;
}
