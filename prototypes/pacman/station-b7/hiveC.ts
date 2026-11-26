// A candidate for the station's infestation (the owner, 2026-11-26: "total takeover, as if alien
// organics were seizing the station"), in place of `b7Veins` (B) for his approval. Three layers in
// stage space, baked once at their fullest and revealed from the lair out like the game's:
//   veins  volumetric tubes under a wet skin (a dark rim, a lit top, swollen nodes and knots), the
//          same topology as B's (each wall tile's centre to the edges it shares with walls), the
//          sick amber edges kept so the maze reads;
//   flesh  tissue creeping over the wall plates in lobes (denser near the lair, steel showing in
//          its holes), lips of it bulging over the walls' edges into the corridor's margin (its
//          middle stays clean), wet glints, egg cysts on some crests (they flare with the beat),
//          tongues hanging over the south facades; it trails
//          the veins' front, so the station is veined first and overgrown later;
//   pulse  a heartbeat (lub-dub every 2.6 s) running out of the lair along the walls' veins.
import type { createB7Scene } from '../../../src/games/pacman/render/station/b7/b7Scene';

type Scene = ReturnType<typeof createB7Scene>;
type Ctx = CanvasRenderingContext2D;

const SCALE = 1.5;
const GLOW_SCALE = 0.75;
const FACADE = 7;
const TAU = Math.PI * 2;
/** The reveal: the veins reach the farthest wall at 90% infection, the flesh trails them and
 *  covers every wall at 100% (the total takeover of the escape). `far` the farthest wall, tiles. */
const veinReach = (inf: number, far: number) => (inf / 0.9) * (far + 1);
const fleshReach = (inf: number, far: number) => inf * (far + 5) - 4;
const BEAT = { period: 2.6, speed: 9, width: 1.2, dub: 0.24 } as const;

function canvas(w: number, h: number): HTMLCanvasElement {
	const c = document.createElement('canvas');
	c.width = Math.max(1, Math.ceil(w));
	c.height = Math.max(1, Math.ceil(h));
	return c;
}
const ctx2d = (c: HTMLCanvasElement) => c.getContext('2d') as Ctx;

function hash(a: number, b: number, s = 0): number {
	const v = Math.sin(a * 127.1 + b * 311.7 + s * 74.7) * 43758.5453;
	return v - Math.floor(v);
}
function rng(seed: number): () => number {
	let a = Math.floor(seed * 4294967296) >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
function noise(x: number, y: number, s: number): number {
	const xi = Math.floor(x);
	const yi = Math.floor(y);
	const u = (x - xi) * (x - xi) * (3 - 2 * (x - xi));
	const v = (y - yi) * (y - yi) * (3 - 2 * (y - yi));
	const a = hash(xi, yi, s) + (hash(xi + 1, yi, s) - hash(xi, yi, s)) * u;
	const b = hash(xi, yi + 1, s) + (hash(xi + 1, yi + 1, s) - hash(xi, yi + 1, s)) * u;
	return a + (b - a) * v;
}
const fbm = (x: number, y: number) => 0.65 * noise(x, y, 1) + 0.35 * noise(x * 2.1, y * 2.1, 2);

interface Seg {
	x0: number;
	y0: number;
	cx: number;
	cy: number;
	x1: number;
	y1: number;
	k: number;
}
interface Node {
	x: number;
	y: number;
	r: number;
}

export interface HiveC {
	readonly veins: HTMLCanvasElement;
	readonly flesh: HTMLCanvasElement;
	readonly glow: HTMLCanvasElement;
}

export function bakeHiveC(scene: Scene, rows: readonly (readonly string[])[]): HiveC {
	const { STAGE_W, STAGE_H, TILE, COLS, ROWS, tx, ty } = scene;
	const at = (x: number, y: number) => rows[y]?.[x] ?? 'ES';
	const wall = (x: number, y: number) => at(x, y) === 'WL';
	const open = (x: number, y: number) => !['WL', 'ES'].includes(at(x, y));
	/** How thick the takeover is on a wall: 1 by the lair, about 0.45 at the far edge. */
	const dense = (x: number, y: number) => Math.max(0.45, Math.min(1, 1 - scene.infectionDistance(x, y) / 20));

	// the veins' paths, shared by the skin and the glow
	const segs: Seg[] = [];
	const nodes: Node[] = [];
	const mid = (x: number, y: number, dx: number, dy: number) => {
		const ex = x + (dx === 1 ? 1 : 0);
		const ey = y + (dy === 1 ? 1 : 0);
		const w = (rng(hash(ex * 2 + (dx !== 0 ? 1 : 0), ey * 2 + (dy !== 0 ? 1 : 0)))() - 0.5) * 8;
		return dx !== 0 ? { x: tx(ex), y: ty(y) + TILE / 2 + w } : { x: tx(x) + TILE / 2 + w, y: ty(ey) };
	};
	for (let y = 1; y < ROWS - 1; y += 1) {
		for (let x = 1; x < COLS - 1; x += 1) {
			if (!wall(x, y)) continue;
			const rand = rng(hash(x, y, 5));
			const k = 0.8 + 0.45 * dense(x, y);
			const southOpen = open(x, y + 1);
			const cx = tx(x) + TILE / 2 + (rand() - 0.5) * 8;
			const cy = ty(y) + (TILE - (southOpen ? FACADE : 0)) / 2 + (rand() - 0.5) * 6;
			let ends = 0;
			for (const [dx, dy] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1]
			] as const) {
				if (wall(x + dx, y + dy)) {
					const e = mid(x, y, dx, dy);
					const kx = (cx + e.x) / 2 + (rand() - 0.5) * 8;
					const ky = (cy + e.y) / 2 + (rand() - 0.5) * 8;
					segs.push({ x0: cx, y0: cy, cx: kx, cy: ky, x1: e.x, y1: e.y, k });
					if (rand() < 0.5) {
						nodes.push({ x: (cx + 2 * kx + e.x) / 4, y: (cy + 2 * ky + e.y) / 4, r: 2.3 * k });
					}
					ends += 1;
				}
			}
			const twigs = ends === 0 ? 3 : 1 + Math.floor(rand() * 2);
			for (let i = 0; i < twigs; i += 1) {
				const a = rand() * TAU;
				const len = 6 + rand() * 8;
				segs.push({
					x0: cx,
					y0: cy,
					cx: cx + Math.cos(a + 0.6) * len * 0.6,
					cy: cy + Math.sin(a + 0.6) * len * 0.6,
					x1: cx + Math.cos(a) * len,
					y1: cy + Math.sin(a) * len,
					k: k * 0.7
				});
			}
			nodes.push({ x: cx, y: cy, r: 3.4 * k });
		}
	}
	const path = (g: Ctx, s: Seg) => {
		g.beginPath();
		g.moveTo(s.x0, s.y0);
		g.quadraticCurveTo(s.cx, s.cy, s.x1, s.y1);
	};

	// ── flesh: lobes over the plates, cysts, tongues over the facades ──────────────────────────
	const cysts: Node[] = [];
	const flesh = canvas(STAGE_W * SCALE, STAGE_H * SCALE);
	const fg = ctx2d(flesh);
	fg.scale(SCALE, SCALE);
	for (let y = 1; y < ROWS - 1; y += 1) {
		for (let x = 1; x < COLS - 1; x += 1) {
			if (!wall(x, y)) continue;
			const rand = rng(hash(x, y, 9));
			const d = dense(x, y);
			const cover = 0.2 + 0.56 * d;
			const southOpen = open(x, y + 1);
			const inset = (o: boolean) => (o ? 2.6 : -0.6);
			const x0 = tx(x) + inset(open(x - 1, y));
			const x1 = tx(x + 1) - inset(open(x + 1, y));
			const y0 = ty(y) + inset(open(x, y - 1));
			const y1 = ty(y + 1) - (southOpen ? FACADE + 2.6 : -0.6);
			fg.save();
			fg.beginPath();
			fg.rect(x0, y0, x1 - x0, y1 - y0);
			fg.clip();
			const pts: Array<{ x: number; y: number; r: number; t: number }> = [];
			for (let py = ty(y) - 2; py <= ty(y + 1) + 2; py += 4.2) {
				for (let px = tx(x) - 2; px <= tx(x + 1) + 2; px += 4.2) {
					const n = fbm(px * 0.055, py * 0.055) + (noise(px * 0.16, py * 0.16, 7) - 0.5) * 0.22;
					if (n < cover) pts.push({ x: px, y: py, r: Math.min(5.6, 3 + (cover - n) * 9), t: cover - n });
				}
			}
			const pass = (fill: string, grow: number, dx = 0, dy = 0, only = 0) => {
				fg.fillStyle = fill;
				fg.beginPath();
				for (const p of pts) {
					if (p.t < only) continue;
					fg.moveTo(p.x + dx + p.r + grow, p.y + dy);
					fg.arc(p.x + dx, p.y + dy, Math.max(0.3, p.r + grow), 0, TAU);
				}
				fg.fill();
			};
			pass('#1e080e', 1.3);
			pass('#5e1c2a', 0);
			pass('#7c2c36', -1.6, -0.7, -0.9, 0.08);
			pass('#94413f', -3.0, -1.1, -1.4, 0.2);
			// wet glints
			fg.fillStyle = 'rgba(255, 226, 192, 0.5)';
			for (const p of pts) {
				if (hash(p.x, p.y, 3) < 0.12 && p.t > 0.1) {
					fg.beginPath();
					fg.ellipse(p.x - 1.2, p.y - 1.4, 1.1, 0.6, -0.6, 0, TAU);
					fg.fill();
				}
			}
			// cysts on some crests: egg sacs glowing amber
			if (rand() < 0.42 * d) {
				const n = 2 + Math.floor(rand() * 3);
				const ccx = tx(x) + TILE / 2 + (rand() - 0.5) * 10;
				const ccy = ty(y) + (TILE - (southOpen ? FACADE : 0)) / 2 + (rand() - 0.5) * 8;
				for (let i = 0; i < n; i += 1) {
					const sx = ccx + (rand() - 0.5) * 12;
					const sy = ccy + (rand() - 0.5) * 9;
					const r = 3.2 + rand() * 2.2;
					cysts.push({ x: sx, y: sy, r });
					fg.fillStyle = '#1e080e';
					fg.beginPath();
					fg.ellipse(sx, sy, r + 1, r * 0.86 + 1, rand() * TAU, 0, TAU);
					fg.fill();
					const cg = fg.createRadialGradient(sx - r * 0.35, sy - r * 0.35, 0, sx, sy, r);
					cg.addColorStop(0, '#ffe2c0');
					cg.addColorStop(0.45, 'rgb(255, 160, 86)');
					cg.addColorStop(1, '#7a1e2c');
					fg.fillStyle = cg;
					fg.beginPath();
					fg.ellipse(sx, sy, r, r * 0.86, 0, 0, TAU);
					fg.fill();
					fg.fillStyle = 'rgba(255, 255, 255, 0.7)';
					fg.beginPath();
					fg.arc(sx - r * 0.4, sy - r * 0.45, Math.max(0.5, r * 0.22), 0, TAU);
					fg.fill();
				}
			}
			fg.restore();
			// lips of flesh bulging over the edges into the corridor's margin
			for (const [dx, dy] of [
				[1, 0],
				[-1, 0],
				[0, -1]
			] as const) {
				if (!open(x + dx, y + dy) || rand() > 0.32 * d) continue;
				const along = 7 + rand() * (TILE - 14);
				const lx = dx === 1 ? tx(x + 1) : dx === -1 ? tx(x) : tx(x) + along;
				const ly = dy === -1 ? ty(y) : ty(y) + Math.min(along, TILE - FACADE - 7);
				const rx = dx !== 0 ? 3.2 : 4.5 + rand() * 3;
				const ry = dx !== 0 ? 4.5 + rand() * 3 : 3.2;
				for (const [grow, col, ox, oy] of [
					[1.1, '#1e080e', 0, 0],
					[0, '#5e1c2a', 0, 0],
					[-1.3, '#7c2c36', -0.6, -0.7]
				] as const) {
					fg.fillStyle = col;
					fg.beginPath();
					fg.ellipse(lx + ox, ly + oy, rx + grow, ry + grow, 0, 0, TAU);
					fg.fill();
				}
				fg.fillStyle = 'rgba(255, 226, 192, 0.5)';
				fg.beginPath();
				fg.arc(lx - rx * 0.3, ly - ry * 0.35, 0.75, 0, TAU);
				fg.fill();
			}
			// tongues of tissue hanging over the south facade
			if (southOpen && d > 0.55) {
				const n = rand() < 0.5 ? 1 : 2;
				for (let i = 0; i < n; i += 1) {
					const fx = tx(x) + 6 + rand() * (TILE - 12);
					const top = ty(y + 1) - FACADE - 3;
					const len = FACADE + 1 + rand() * 2;
					const w = 2.4 + rand() * 1.6;
					fg.beginPath();
					fg.moveTo(fx - w, top);
					fg.quadraticCurveTo(fx - w * 0.9, top + len * 0.8, fx, top + len);
					fg.quadraticCurveTo(fx + w * 0.9, top + len * 0.8, fx + w, top);
					fg.closePath();
					fg.fillStyle = '#5e1c2a';
					fg.fill();
					fg.strokeStyle = '#1e080e';
					fg.lineWidth = 1;
					fg.stroke();
					fg.fillStyle = 'rgba(255, 226, 192, 0.45)';
					fg.beginPath();
					fg.arc(fx - w * 0.3, top + len * 0.55, 0.7, 0, TAU);
					fg.fill();
				}
			}
		}
	}

	// ── veins: tubes with a dark rim, a body, a lit top; nodes; the amber edges ────────────────
	const veins = canvas(STAGE_W * SCALE, STAGE_H * SCALE);
	const vg = ctx2d(veins);
	vg.scale(SCALE, SCALE);
	vg.lineCap = 'round';
	vg.lineJoin = 'round';
	// the floor's dark stain at the walls' feet (B's)
	for (let y = 1; y < ROWS - 1; y += 1) {
		for (let x = 1; x < COLS - 1; x += 1) {
			if (!wall(x, y)) continue;
			for (const [dx, dy] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1]
			]) {
				if (!open(x + dx, y + dy)) continue;
				const ex = dx === 1 ? tx(x + 1) : tx(x);
				const ey = dy === 1 ? ty(y + 1) : ty(y);
				const gr =
					dx !== 0
						? vg.createLinearGradient(ex, 0, ex + dx * 6, 0)
						: vg.createLinearGradient(0, ey, 0, ey + dy * 6);
				gr.addColorStop(0, 'rgba(26, 8, 12, 0.65)');
				gr.addColorStop(1, 'rgba(26, 8, 12, 0)');
				vg.fillStyle = gr;
				vg.fillRect(
					dx === -1 ? ex - 6 : ex,
					dy === -1 ? ey - 6 : ey,
					dx === 0 ? TILE : 6,
					dy === 0 ? TILE : 6
				);
			}
		}
	}
	const tube = (list: readonly Seg[], scale: number) => {
		for (const [w, col, ox, oy] of [
			[5.4, '#1e080e', 0, 0],
			[3.9, '#6a1c2a', 0, 0],
			[2.2, '#a2383e', -0.4, -0.5],
			[0.8, 'rgba(255, 206, 176, 0.55)', -0.8, -1.0]
		] as const) {
			vg.strokeStyle = col;
			for (const s of list) {
				vg.lineWidth = w * s.k * scale;
				vg.save();
				vg.translate(ox * s.k, oy * s.k);
				path(vg, s);
				vg.stroke();
				vg.restore();
			}
		}
	};
	tube(segs, 1);
	for (const n of nodes) {
		vg.fillStyle = '#1e080e';
		vg.beginPath();
		vg.arc(n.x, n.y, n.r + 1.1, 0, TAU);
		vg.fill();
		const ng = vg.createRadialGradient(n.x - n.r * 0.35, n.y - n.r * 0.4, 0, n.x, n.y, n.r);
		ng.addColorStop(0, '#c4544c');
		ng.addColorStop(1, '#5e1826');
		vg.fillStyle = ng;
		vg.beginPath();
		vg.arc(n.x, n.y, n.r, 0, TAU);
		vg.fill();
		vg.fillStyle = 'rgba(255, 196, 140, 0.85)';
		vg.beginPath();
		vg.arc(n.x - n.r * 0.35, n.y - n.r * 0.4, Math.max(0.6, n.r * 0.28), 0, TAU);
		vg.fill();
	}
	// the walls' edges along the corridors: B's sick amber line, kept (the maze must read)
	vg.save();
	vg.globalCompositeOperation = 'lighter';
	for (let y = 1; y < ROWS - 1; y += 1) {
		for (let x = 1; x < COLS - 1; x += 1) {
			if (!wall(x, y)) continue;
			const southOpen = open(x, y + 1);
			const x0 = tx(x);
			const y0 = ty(y);
			const h = TILE - (southOpen ? FACADE : 0);
			const edges: Array<[number, number, number, number]> = [];
			if (open(x - 1, y)) edges.push([x0 + 1.5, y0, x0 + 1.5, y0 + h]);
			if (open(x + 1, y)) edges.push([x0 + TILE - 1.5, y0, x0 + TILE - 1.5, y0 + h]);
			if (open(x, y - 1)) edges.push([x0, y0 + 1.5, x0 + TILE, y0 + 1.5]);
			if (southOpen) edges.push([x0, y0 + h - 1.5, x0 + TILE, y0 + h - 1.5]);
			for (const [a, b, c2, d2] of edges) {
				vg.strokeStyle = 'rgba(255, 140, 60, 0.16)';
				vg.lineWidth = 4;
				vg.beginPath();
				vg.moveTo(a, b);
				vg.lineTo(c2, d2);
				vg.stroke();
				vg.strokeStyle = 'rgba(255, 184, 96, 0.5)';
				vg.lineWidth = 1.2;
				vg.beginPath();
				vg.moveTo(a, b);
				vg.lineTo(c2, d2);
				vg.stroke();
			}
		}
	}
	vg.restore();

	// ── the glow: the veins' paths in light, for the heartbeat ─────────────────────────────────
	const glow = canvas(STAGE_W * GLOW_SCALE, STAGE_H * GLOW_SCALE);
	const gg = ctx2d(glow);
	gg.scale(GLOW_SCALE, GLOW_SCALE);
	gg.lineCap = 'round';
	gg.strokeStyle = 'rgba(255, 176, 104, 1)';
	for (const s of segs) {
		gg.lineWidth = 3.6 * s.k;
		path(gg, s);
		gg.stroke();
	}
	gg.fillStyle = 'rgba(255, 214, 160, 1)';
	for (const n of [...nodes, ...cysts]) {
		gg.beginPath();
		gg.arc(n.x, n.y, n.r * 0.9, 0, TAU);
		gg.fill();
	}
	return { veins, flesh, glow };
}

/** Draws the candidate in stage space: the layers revealed from the lair, the heartbeat. */
export class HiveCView {
	private readonly hive: HiveC;
	private cache: { key: string; veins: HTMLCanvasElement; flesh: HTMLCanvasElement } | null = null;
	private readonly scratch: HTMLCanvasElement;
	private readonly beat: HTMLCanvasElement;

	constructor(
		private readonly scene: Scene,
		rows: readonly (readonly string[])[]
	) {
		this.hive = bakeHiveC(scene, rows);
		this.scratch = canvas(this.hive.glow.width, this.hive.glow.height);
		this.beat = canvas(scene.COLS, scene.ROWS);
		for (let y = 0; y < scene.ROWS; y += 1)
			for (let x = 0; x < scene.COLS; x += 1)
				if (rows[y]?.[x] === 'WL') {
					// walls no way reaches (the outer hull) count as nothing
					const d = scene.infectionDistance(x, y);
					if (Number.isFinite(d)) this.far = Math.max(this.far, d);
				}
	}
	/** The farthest wall from the lair, tiles. */
	private far = 0;

	/** A tile mask of the reveal at `reach`, soft at its edge. */
	private mask(reach: number): HTMLCanvasElement {
		const s = this.scene;
		const m = canvas(s.COLS, s.ROWS);
		const mg = ctx2d(m);
		const img = mg.createImageData(s.COLS, s.ROWS);
		for (let y = 0; y < s.ROWS; y += 1) {
			for (let x = 0; x < s.COLS; x += 1) {
				const a = Math.max(0, Math.min(1, (reach - s.infectionDistance(x, y)) / 1.2 + 0.5));
				img.data[(y * s.COLS + x) * 4 + 3] = Math.round(a * 255);
			}
		}
		mg.putImageData(img, 0, 0);
		return m;
	}

	private masked(layer: HTMLCanvasElement, reach: number): HTMLCanvasElement {
		const s = this.scene;
		const out = canvas(layer.width, layer.height);
		const g = ctx2d(out);
		g.drawImage(layer, 0, 0);
		g.globalCompositeOperation = 'destination-in';
		g.imageSmoothingEnabled = true;
		const k = layer.width / s.STAGE_W;
		g.drawImage(this.mask(reach), s.MAZE_X * k, s.MAZE_Y * k, s.COLS * s.TILE * k, s.ROWS * s.TILE * k);
		return out;
	}

	/** The flesh, then the veins over it, as far as the infection has reached (stage space). */
	draw(ctx: Ctx, infection: number): void {
		const s = this.scene;
		const vr = Math.round(veinReach(infection, this.far) * 4) / 4;
		const fr = Math.round(fleshReach(infection, this.far) * 4) / 4;
		const key = `${vr}|${fr}`;
		if (!this.cache || this.cache.key !== key) {
			this.cache = {
				key,
				veins: this.masked(this.hive.veins, vr),
				flesh: this.masked(this.hive.flesh, fr)
			};
		}
		ctx.drawImage(this.cache.flesh, 0, 0, s.STAGE_W, s.STAGE_H);
		ctx.drawImage(this.cache.veins, 0, 0, s.STAGE_W, s.STAGE_H);
	}

	/** The heartbeat over the light: a lub-dub out of the lair along the revealed veins. */
	drawPulse(ctx: Ctx, infection: number, time: number): void {
		const s = this.scene;
		const reach = veinReach(infection, this.far);
		const u = time % BEAT.period;
		const fronts = [u * BEAT.speed, (u - BEAT.dub) * BEAT.speed];
		const bg = ctx2d(this.beat);
		const img = bg.createImageData(s.COLS, s.ROWS);
		let any = false;
		for (let y = 0; y < s.ROWS; y += 1) {
			for (let x = 0; x < s.COLS; x += 1) {
				const d = s.infectionDistance(x, y);
				if (d > reach) continue;
				let a = 0;
				for (const [i, f] of fronts.entries()) {
					if (f < 0) continue;
					const fade = Math.max(0, 1 - f / (this.far + 4));
					a = Math.max(a, Math.exp(-(((d - f) / BEAT.width) ** 2)) * fade * (i === 0 ? 1 : 0.7));
				}
				if (a > 0.01) any = true;
				img.data[(y * s.COLS + x) * 4 + 3] = Math.round(a * 255);
			}
		}
		if (!any) return;
		bg.putImageData(img, 0, 0);
		const g = ctx2d(this.scratch);
		g.globalCompositeOperation = 'copy';
		g.drawImage(this.hive.glow, 0, 0);
		g.globalCompositeOperation = 'destination-in';
		g.imageSmoothingEnabled = true;
		const k = GLOW_SCALE;
		g.drawImage(this.beat, s.MAZE_X * k, s.MAZE_Y * k, s.COLS * s.TILE * k, s.ROWS * s.TILE * k);
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.globalAlpha = 1;
		ctx.drawImage(this.scratch, 0, 0, s.STAGE_W, s.STAGE_H);
		ctx.globalAlpha = 0.45;
		ctx.drawImage(this.scratch, -3, -3, s.STAGE_W + 6, s.STAGE_H + 6);
		ctx.restore();
	}
}
