// A candidate for the station's light on the maze (the owner, 2026-11-28: a floor lifted flat read
// as badly set light, no balance of light and shadow, the walls not standing on the floor). One
// value plan held by light, not paint: the corridors carry the light, the walls are the dark masses
// that catch it. Drawn in stage space over the scene's base, under the hive and the light map; the
// hull round the maze is untouched.
//   pools    the scene's own corridor lamps (their places and the infection at which each fails,
//            as `b7Scene` has them) and a few more where a corridor stays dark; a pool falls off
//            with the distance, a failed lamp keeps half its light;
//   floor    lifted by the pools (screen keeps its texture), darkened at the walls' feet (contact
//            shadow) and by the walls' cast shadow to the bottom right (the scene's light);
//   walls    the steel darkened under the floor's value, a little less under a lamp;
//   gloss    `at()` gives the hive's gloss the lamps' strength and direction for its highlights.
import type { createB7Scene } from '../../../src/games/pacman/render/station/b7/b7Scene';
import { chamfer, type LightField } from './wallHive';

type Scene = ReturnType<typeof createB7Scene>;
type Ctx = CanvasRenderingContext2D;
type Rows = readonly (readonly string[])[];

/** Bake pixels per stage pixel (the light is smooth; the contact shadow wants ~2 px). */
const HS = 0.5;
/** The scene's corridor lamps (tile units, `b7Scene`'s CORRIDOR_LAMPS). */
const SCENE_LAMPS: ReadonlyArray<readonly [number, number]> = [
	[5.5, 2.5],
	[19.5, 2.5],
	[5.5, 24.5],
	[19.5, 24.5],
	[4.5, 8.5],
	[20.5, 8.5],
	[4.5, 18.5],
	[20.5, 18.5],
	[12.5, 6.5],
	[12.5, 20.5],
	[8.5, 13.5],
	[16.5, 13.5]
];
/** Where on the infection a lamp fails (`b7Scene`'s lampFails). */
const lampFails = (i: number) => 0.3 + 0.62 * ((((Math.sin(i * 12.9898) * 43758.5453) % 1) + 1) % 1);
/** A pool's radius, tiles; the floor's lift at full light; the lamps' colour. */
const POOL_R = 3.3;
const LIFT = 0.36;
const LAMP: readonly [number, number, number] = [228, 236, 242];
const WALLS = new Set(['WL', 'EX', '0C']);
const NOT_FLOOR = new Set(['WL', 'ES', 'EX', '0C', 'LE', 'LT', 'BY', 'IY', 'PY', 'CE']);

const smooth = (e0: number, e1: number, x: number) => {
	const k = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
	return k * k * (3 - 2 * k);
};

interface Lamp {
	x: number;
	y: number;
	fail: number;
	extra: boolean;
	power: number;
}

export class StationLight implements LightField {
	version = 0;
	private readonly W: number;
	private readonly H: number;
	private readonly kind: Uint8Array;
	private readonly dOut: Float32Array;
	private readonly I: Float32Array;
	private readonly DX: Float32Array;
	private readonly DY: Float32Array;
	private readonly lamps: Lamp[];
	private readonly shade: HTMLCanvasElement;
	private readonly lift: HTMLCanvasElement;
	private k = -1;

	constructor(
		private readonly scene: Scene,
		private readonly rows: Rows
	) {
		const { TILE } = scene;
		const ROWS = rows.length;
		const COLS = rows[0].length;
		const W = (this.W = Math.ceil(COLS * TILE * HS));
		const H = (this.H = Math.ceil(ROWS * TILE * HS));
		const at = (x: number, y: number) => rows[y]?.[x] ?? 'ES';
		const open = (x: number, y: number) => !NOT_FLOOR.has(at(x, y));
		// 1 floor, 2 wall (its plate, inset from the corridors), 0 the rest
		this.kind = new Uint8Array(W * H);
		const inset = 2.6;
		for (let y = 0; y < ROWS; y++)
			for (let x = 0; x < COLS; x++) {
				const t = at(x, y);
				const isWall = WALLS.has(t);
				if (!isWall && !open(x, y)) continue;
				const x0 = Math.round((x * TILE + (isWall && open(x - 1, y) ? inset : 0)) * HS);
				const x1 = Math.round(((x + 1) * TILE - (isWall && open(x + 1, y) ? inset : 0)) * HS);
				const y0 = Math.round((y * TILE + (isWall && open(x, y - 1) ? inset : 0)) * HS);
				const y1 = Math.round(((y + 1) * TILE - (isWall && open(x, y + 1) ? inset : 0)) * HS);
				for (let v = y0; v < y1; v++) for (let u = x0; u < x1; u++) this.kind[v * W + u] = isWall ? 2 : 1;
			}
		const wallMask = new Uint8Array(W * H);
		for (let i = 0; i < W * H; i++) wallMask[i] = this.kind[i] === 2 ? 1 : 0;
		this.dOut = chamfer(wallMask, W, H, 0);
		// the lamps: the scene's, then more where a corridor is farther than 5 tiles from any
		this.lamps = SCENE_LAMPS.map(([x, y], i) => ({ x, y, fail: lampFails(i), extra: false, power: 1 }));
		const floorTiles: Array<[number, number]> = [];
		for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (open(x, y)) floorTiles.push([x + 0.5, y + 0.5]);
		for (;;) {
			let best: [number, number] | null = null;
			let far = 5.2;
			for (const [x, y] of floorTiles) {
				let d = Infinity;
				for (const l of this.lamps) d = Math.min(d, Math.hypot(l.x - x, l.y - y));
				if (d > far) {
					far = d;
					best = [x, y];
				}
			}
			if (!best) break;
			this.lamps.push({ x: best[0], y: best[1], fail: lampFails(this.lamps.length), extra: true, power: 1 });
		}
		this.I = new Float32Array(W * H);
		this.DX = new Float32Array(W * H);
		this.DY = new Float32Array(W * H);
		this.shade = document.createElement('canvas');
		this.lift = document.createElement('canvas');
		this.shade.width = this.lift.width = W;
		this.shade.height = this.lift.height = H;
	}

	/** The lamps fail one by one with the infection (each keeps half its light). */
	setInfection(k: number): void {
		if (Math.abs(this.k - k) < 0.002) return;
		this.k = k;
		this.version++;
		for (const l of this.lamps) l.power = 1 - 0.5 * smooth(l.fail, l.fail + 0.04, k);
		const { W, H, scene } = this;
		const T = scene.TILE;
		const shade = new ImageData(W, H);
		const lift = new ImageData(W, H);
		const amb = 0.22;
		// the scene's light map sinks with the infection; the floor's lift grows to keep its place
		const lift0 = LIFT + 0.34 * k;
		for (let v = 0; v < H; v++)
			for (let u = 0; u < W; u++) {
				const i = v * W + u;
				const px = u / HS / T;
				const py = v / HS / T;
				let I = 0;
				let dx = 0;
				let dy = 0;
				for (const l of this.lamps) {
					const ex = l.x - px;
					const ey = l.y - py;
					const d2 = ex * ex + ey * ey;
					if (d2 > 25) continue;
					const w = l.power * Math.exp(-d2 / (POOL_R * POOL_R));
					const d = Math.sqrt(d2) || 1;
					I += w;
					dx += (w * ex) / d;
					dy += (w * ey) / d;
				}
				this.I[i] = I;
				this.DX[i] = I > 0 ? dx / I : 0;
				this.DY[i] = I > 0 ? dy / I : 0;
				const kind = this.kind[i];
				let sh = 1;
				let li = 0;
				if (kind === 1) {
					// the contact shadow at the walls' feet and the walls' cast shadow (to the bottom right)
					const ao = 0.48 + 0.52 * smooth(0, 9 * HS, this.dOut[i]);
					const us = u - Math.round(5 * HS);
					const vs = v - Math.round(7 * HS);
					const ds = us >= 0 && vs >= 0 ? this.dOut[vs * W + us] : 99;
					const cast = 1 - 0.3 * (1 - smooth(0, 3, ds));
					sh = ao * cast;
					li = lift0 * Math.min(1.15, amb + I) * sh;
				} else if (kind === 2) {
					sh = 0.56 + 0.26 * Math.min(1, I);
				}
				shade.data[i * 4] = shade.data[i * 4 + 1] = shade.data[i * 4 + 2] = 255 * sh;
				shade.data[i * 4 + 3] = 255;
				lift.data[i * 4] = LAMP[0] * li;
				lift.data[i * 4 + 1] = LAMP[1] * li;
				lift.data[i * 4 + 2] = LAMP[2] * li;
				lift.data[i * 4 + 3] = 255;
			}
		(this.shade.getContext('2d') as Ctx).putImageData(shade, 0, 0);
		(this.lift.getContext('2d') as Ctx).putImageData(lift, 0, 0);
	}

	/** The lamps' strength and the direction to them at a point, stage px from the maze's origin. */
	at(sx: number, sy: number): readonly [number, number, number] {
		const u = Math.min(this.W - 1, Math.max(0, Math.round(sx * HS)));
		const v = Math.min(this.H - 1, Math.max(0, Math.round(sy * HS)));
		const i = v * this.W + u;
		return [Math.min(1.2, this.I[i]), this.DX[i], this.DY[i]];
	}

	/** The added lamps for the scene's light map (stage space), so its pools match the floor's. */
	extraLights(): Array<{ x: number; y: number; r: number; rgb: string; alpha: number }> {
		const s = this.scene;
		return this.lamps
			.filter((l) => l.extra)
			.map((l) => ({
				x: s.tx(0) + l.x * s.TILE,
				y: s.ty(0) + l.y * s.TILE,
				r: s.TILE * POOL_R * 1.3,
				rgb: '226, 236, 242',
				alpha: 0.55 * l.power
			}));
	}

	/** Over the scene's base, in stage space: the shade (multiply), then the floor's light (screen). */
	drawFloor(ctx: Ctx): void {
		const s = this.scene;
		const w = this.rows[0].length * s.TILE;
		const h = this.rows.length * s.TILE;
		ctx.save();
		ctx.imageSmoothingEnabled = true;
		ctx.globalCompositeOperation = 'multiply';
		ctx.drawImage(this.shade, s.tx(0), s.ty(0), w, h);
		ctx.globalCompositeOperation = 'screen';
		ctx.drawImage(this.lift, s.tx(0), s.ty(0), w, h);
		ctx.restore();
	}
}
