// The station's infestation (the owner, 2026-11-26: "total takeover, as if alien organics were
// seizing the station"; the `station-b7` prototype's candidate C), in place of the earlier veins.
// Baked once at its fullest in stage space and revealed from the lair out with the infection:
//   veins  volumetric tubes under a wet skin (a dark rim, a lit top, swollen nodes and knots), each
//          wall tile's centre to the edges it shares with walls; the sick amber edges kept so the
//          maze reads; they reach the farthest wall at 90% infection;
//   flesh  tissue over the wall plates in lobes (denser near the lair, steel showing in its holes),
//          lips over the walls' edges into the corridor's margin (its middle stays clean), wet
//          glints, egg cysts on some crests, tongues over the south facades; it trails the veins
//          and covers every wall at 100% (the escape);
//   pulse  a heartbeat (lub-dub every 6 s, soft) running out of the lair along the veins, the
//          cysts flaring with it (drawn over the light, not on Low);
//   lair   massive blast doors torn apart from inside (a breach a tile wide, the ends bent outward,
//          petals of steel, claw marks, flesh oozing through), lips over the pit's rim; the
//          scene's own grate and cocoons kept (`createB7Scene`'s `lairDoors: false`).
import type { createB7Scene } from './b7Scene';

type Scene = ReturnType<typeof createB7Scene>;
type Ctx = CanvasRenderingContext2D;

/** The hive's material (the owner, 2026-11-26: alien organics are black and parasitic, the red
 *  flesh read as the hell): black glossy organics, cold wet glints, a lime life in the nodes,
 *  the cysts and the pulse. */
const P = {
	ink: '#030405',
	body: '#15181e',
	body2: '#252a33',
	lit: '#3c4452',
	glint: 'rgba(214, 230, 248, 0.75)',
	glint2: 'rgba(214, 230, 248, 0.6)',
	cystCore: '#efffb0',
	cystMid: 'rgb(170, 240, 60)',
	cystEdge: '#1c2a0c',
	stain: 'rgba(3, 5, 4, 0.6)',
	stain0: 'rgba(3, 5, 4, 0)',
	vein: '#181b21',
	veinLit: '#3d4552',
	veinTop: 'rgba(210, 228, 246, 0.7)',
	veinTop2: 'rgba(210, 228, 246, 0.6)',
	node: '#c2ff4c',
	nodeEdge: '#16220a',
	nodeGlint: 'rgba(226, 255, 170, 0.85)',
	glowLine: 'rgba(150, 255, 70, 1)',
	glowNode: 'rgba(220, 255, 150, 1)',
	breach: '#020303',
	under0: 'rgba(30, 50, 10, 0)',
	under1: 'rgba(30, 50, 10, 0.6)'
} as const;
const SCALE = 1.25;
const GLOW_SCALE = 0.75;
const FACADE = 7;
const TAU = Math.PI * 2;
/** The reveal: the veins reach the farthest wall at 90% infection, the flesh trails them and
 *  covers every wall at 100% (the total takeover of the escape). `far` the farthest wall, tiles. */
const veinReach = (inf: number, far: number) => (inf / 0.9) * (far + 1);
const fleshReach = (inf: number, far: number) => inf * (far + 5) - 4;
const BEAT = { period: 6, speed: 9, width: 1.2, dub: 0.3 } as const;
/** The reveal's soft edge, tiles, and how fast a tile's alpha follows it, per second. */
const SOFT = 2.4;
const REVEAL_RATE = 1.6;

/** The heartbeat's swell at `time` (0..1, lub-dub), for whatever beats with the hive (the lamps
 *  under its film); `delay` the wave's way out from the lair, tiles. */
export function heartbeat(time: number, delay = 0): number {
	const u = (((time - delay / BEAT.speed) % BEAT.period) + BEAT.period) % BEAT.period;
	const one = (t: number) => (t < 0 ? 0 : Math.exp(-((t / 0.22) ** 2)));
	return Math.min(1, one(u) + 0.7 * one(u - BEAT.dub));
}

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

interface HiveLayers {
	readonly veins: HTMLCanvasElement;
	readonly flesh: HTMLCanvasElement;
	readonly glow: HTMLCanvasElement;
}

function bakeHive(scene: Scene, rows: readonly (readonly string[])[]): HiveLayers {
	const { STAGE_W, STAGE_H, TILE, COLS, ROWS, tx, ty } = scene;
	const at = (x: number, y: number) => rows[y]?.[x] ?? 'ES';
	const wall = (x: number, y: number) => at(x, y) === 'WL';
	const open = (x: number, y: number) => !['WL', 'ES'].includes(at(x, y));
	/** How thick the takeover is on a wall: 1 by the lair, about 0.45 at the far edge. */
	const dense = (x: number, y: number) =>
		Math.max(0.45, Math.min(1, 1 - scene.infectionDistance(x, y) / 20));

	// the veins' paths, shared by the skin and the glow
	const segs: Seg[] = [];
	const nodes: Node[] = [];
	const mid = (x: number, y: number, dx: number, dy: number) => {
		const ex = x + (dx === 1 ? 1 : 0);
		const ey = y + (dy === 1 ? 1 : 0);
		const w = (rng(hash(ex * 2 + (dx !== 0 ? 1 : 0), ey * 2 + (dy !== 0 ? 1 : 0)))() - 0.5) * 8;
		return dx !== 0
			? { x: tx(ex), y: ty(y) + TILE / 2 + w }
			: { x: tx(x) + TILE / 2 + w, y: ty(ey) };
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
					if (n < cover)
						pts.push({ x: px, y: py, r: Math.min(5.6, 3 + (cover - n) * 9), t: cover - n });
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
			pass(P.ink, 1.3);
			pass(P.body, 0);
			pass(P.body2, -1.6, -0.7, -0.9, 0.08);
			pass(P.lit, -3.0, -1.1, -1.4, 0.2);
			// wet glints
			fg.fillStyle = P.glint;
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
					fg.fillStyle = P.ink;
					fg.beginPath();
					fg.ellipse(sx, sy, r + 1, r * 0.86 + 1, rand() * TAU, 0, TAU);
					fg.fill();
					const cg = fg.createRadialGradient(sx - r * 0.35, sy - r * 0.35, 0, sx, sy, r);
					cg.addColorStop(0, P.cystCore);
					cg.addColorStop(0.45, P.cystMid);
					cg.addColorStop(1, P.cystEdge);
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
					[1.1, P.ink, 0, 0],
					[0, P.body, 0, 0],
					[-1.3, P.body2, -0.6, -0.7]
				] as const) {
					fg.fillStyle = col;
					fg.beginPath();
					fg.ellipse(lx + ox, ly + oy, rx + grow, ry + grow, 0, 0, TAU);
					fg.fill();
				}
				fg.fillStyle = P.glint;
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
					fg.fillStyle = P.body;
					fg.fill();
					fg.strokeStyle = P.ink;
					fg.lineWidth = 1;
					fg.stroke();
					fg.fillStyle = P.glint2;
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
				gr.addColorStop(0, P.stain);
				gr.addColorStop(1, P.stain0);
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
			[5.4, P.ink, 0, 0],
			[3.9, P.vein, 0, 0],
			[2.2, P.veinLit, -0.4, -0.5],
			[0.8, P.veinTop, -0.8, -1.0]
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
		vg.fillStyle = P.ink;
		vg.beginPath();
		vg.arc(n.x, n.y, n.r + 1.1, 0, TAU);
		vg.fill();
		const ng = vg.createRadialGradient(n.x - n.r * 0.35, n.y - n.r * 0.4, 0, n.x, n.y, n.r);
		ng.addColorStop(0, P.node);
		ng.addColorStop(1, P.nodeEdge);
		vg.fillStyle = ng;
		vg.beginPath();
		vg.arc(n.x, n.y, n.r, 0, TAU);
		vg.fill();
		vg.fillStyle = P.nodeGlint;
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
	gg.strokeStyle = P.glowLine;
	for (const s of segs) {
		gg.lineWidth = 3.6 * s.k;
		path(gg, s);
		gg.stroke();
	}
	gg.fillStyle = P.glowNode;
	for (const n of [...nodes, ...cysts]) {
		gg.beginPath();
		gg.arc(n.x, n.y, n.r * 0.9, 0, TAU);
		gg.fill();
	}
	return { veins, flesh, glow };
}

/** The infestation in stage space: the layers revealed from the lair, the lair, the heartbeat. */
/**
 * The infestation in stage space. The reveal goes tile by tile (the owner felt the old way stall
 * the frame while he ate: every step of its front masked two stage-sized layers into new
 * canvases): each tile's share of the baked layers is copied into one standing canvas at its own
 * alpha (soft over `SOFT` tiles from the front, eased in time), so a frame repaints only the few
 * tiles on the front and nothing large is ever allocated again. The lair is baked once.
 */
export class B7Hive {
	private readonly hive: HiveLayers;
	/** The farthest wall from the lair, tiles. */
	private far = 0;
	/** The revealed infestation, the layers' size. */
	private readonly acc: HTMLCanvasElement;
	private readonly accG: Ctx;
	/** The lair (doors, lips), baked once over its tiles. */
	private readonly lair: HTMLCanvasElement;
	/** Each tile's distance from the lair, and the veins' and the flesh's alpha shown on it. */
	private readonly dist: Float32Array;
	private readonly shownV: Float32Array;
	private readonly shownF: Float32Array;
	private readonly scratch: HTMLCanvasElement;
	private readonly beat: HTMLCanvasElement;

	constructor(
		private readonly scene: Scene,
		rows: readonly (readonly string[])[]
	) {
		this.hive = bakeHive(scene, rows);
		this.scratch = canvas(this.hive.glow.width, this.hive.glow.height);
		this.beat = canvas(scene.COLS, scene.ROWS);
		const n = scene.COLS * scene.ROWS;
		this.dist = new Float32Array(n);
		this.shownV = new Float32Array(n);
		this.shownF = new Float32Array(n);
		for (let y = 0; y < scene.ROWS; y += 1)
			for (let x = 0; x < scene.COLS; x += 1) {
				const d = scene.infectionDistance(x, y);
				this.dist[y * scene.COLS + x] = Number.isFinite(d) ? d : 1e9;
				// walls no way reaches (the outer hull) count as nothing
				if (rows[y]?.[x] === 'WL' && Number.isFinite(d)) this.far = Math.max(this.far, d);
			}
		this.acc = canvas(this.hive.veins.width, this.hive.veins.height);
		this.accG = ctx2d(this.acc);
		const { tx, ty } = scene;
		this.lair = canvas((tx(16) - tx(9)) * SCALE, (ty(16) - ty(9)) * SCALE);
		const lg = ctx2d(this.lair);
		lg.scale(SCALE, SCALE);
		lg.translate(-tx(9), -ty(9));
		this.drawLair(lg);
	}

	/** The reveal at this infection, eased over `dt` (a jump, as on a new level, eases in too). */
	update(infection: number, dt: number): void {
		const s = this.scene;
		const vr = veinReach(infection, this.far);
		const fr = fleshReach(infection, this.far);
		const step = Math.max(0, dt) * REVEAL_RATE;
		const q = (a: number) => Math.round(a * 24);
		for (let i = 0; i < this.dist.length; i += 1) {
			const d = this.dist[i];
			const tv = Math.max(0, Math.min(1, (vr - d) / SOFT + 0.5));
			const tf = Math.max(0, Math.min(1, (fr - d) / SOFT + 0.5));
			const v0 = this.shownV[i];
			const f0 = this.shownF[i];
			const v1 = v0 + Math.max(-step, Math.min(step, tv - v0));
			const f1 = f0 + Math.max(-step, Math.min(step, tf - f0));
			this.shownV[i] = v1;
			this.shownF[i] = f1;
			if (q(v1) !== q(v0) || q(f1) !== q(f0)) this.paintTile(i % s.COLS, Math.floor(i / s.COLS));
		}
	}

	/** One tile's share of the layers, at its alphas, into the standing canvas. */
	private paintTile(x: number, y: number): void {
		const s = this.scene;
		const i = y * s.COLS + x;
		const x0 = Math.floor(s.tx(x) * SCALE);
		const y0 = Math.floor(s.ty(y) * SCALE);
		const w = Math.floor(s.tx(x + 1) * SCALE) - x0;
		const h = Math.floor(s.ty(y + 1) * SCALE) - y0;
		const g = this.accG;
		g.clearRect(x0, y0, w, h);
		const f = Math.round(this.shownF[i] * 24) / 24;
		const v = Math.round(this.shownV[i] * 24) / 24;
		if (f > 0) {
			g.globalAlpha = f;
			g.drawImage(this.hive.flesh, x0, y0, w, h, x0, y0, w, h);
		}
		if (v > 0) {
			g.globalAlpha = v;
			g.drawImage(this.hive.veins, x0, y0, w, h, x0, y0, w, h);
		}
		g.globalAlpha = 1;
	}

	/** The revealed flesh and veins, then the lair (stage space, under the light). */
	draw(ctx: Ctx): void {
		const s = this.scene;
		ctx.drawImage(this.acc, 0, 0, s.STAGE_W, s.STAGE_H);
		ctx.drawImage(this.lair, s.tx(9), s.ty(9), s.tx(16) - s.tx(9), s.ty(16) - s.ty(9));
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
		ctx.globalAlpha = 0.34;
		ctx.drawImage(this.scratch, 0, 0, s.STAGE_W, s.STAGE_H);
		ctx.globalAlpha = 0.12;
		ctx.drawImage(this.scratch, -3, -3, s.STAGE_W + 6, s.STAGE_H + 6);
		ctx.restore();
	}

	/** The lair: its torn blast doors and lips over the pit's rim (stage space). */
	private drawLair(ctx: Ctx): void {
		const { tx, ty, TILE } = this.scene;
		const blob = (x: number, y: number, rx: number, ry: number, rot = 0) => {
			for (const [grow, col, ox, oy] of [
				[1.2, P.ink, 0, 0],
				[0, P.body, 0, 0],
				[-1.4, P.body2, -0.7, -0.8],
				[-2.8, P.lit, -1.1, -1.3]
			] as const) {
				if (rx + grow <= 0.4 || ry + grow <= 0.4) continue;
				ctx.fillStyle = col;
				ctx.beginPath();
				ctx.ellipse(x + ox, y + oy, rx + grow, ry + grow, rot, 0, TAU);
				ctx.fill();
			}
		};
		const cord = (
			x0: number,
			y0: number,
			cx: number,
			cy: number,
			x1: number,
			y1: number,
			w: number
		) => {
			for (const [lw, col, ox, oy] of [
				[w + 1.6, P.ink, 0, 0],
				[w, P.vein, 0, 0],
				[w * 0.5, P.veinLit, -0.4, -0.5],
				[0.8, P.veinTop2, -0.7, -0.9]
			] as const) {
				ctx.strokeStyle = col;
				ctx.lineWidth = lw;
				ctx.beginPath();
				ctx.moveTo(x0 + ox, y0 + oy);
				ctx.quadraticCurveTo(cx + ox, cy + oy, x1 + ox, y1 + oy);
				ctx.stroke();
			}
		};
		ctx.save();
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';

		// lips of flesh over the pit's rim
		for (const [x, y, rx, ry] of [
			[tx(10) + 3, ty(12) + 2, 6, 4],
			[tx(10) + 2, ty(13) + 10, 3.5, 7],
			[tx(15) - 3, ty(12) + 3, 6, 4.5],
			[tx(15) - 2, ty(14) + 4, 3.5, 6.5],
			[tx(12) - 4, ty(15) - 2, 8, 3.5],
			[tx(14) - 6, ty(15) - 2, 6, 3]
		]) {
			blob(x, y, rx, ry);
		}

		// the blast doors: two massive steel leaves (row 11), torn apart from inside: a breach a
		// tile wide, each leaf's inner end bent outward toward the corridor, petals of torn steel,
		// flesh oozing through
		const cy = ty(11) + TILE * 0.5;
		const top = cy - 12;
		const face = cy + 6;
		const foot = cy + 13;
		const mid = tx(12.5);
		const L0 = tx(11) - 6;
		const R1 = tx(14) + 6;
		const steel = (pts: Array<[number, number]>, fill: string) => {
			ctx.beginPath();
			pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
			ctx.closePath();
			ctx.fillStyle = fill;
			ctx.fill();
			ctx.strokeStyle = '#0b0f0e';
			ctx.lineWidth = 1.5;
			ctx.stroke();
		};
		// the tracks in the side walls
		ctx.fillStyle = '#060908';
		ctx.fillRect(L0 - 1, top + 1, 8, foot - top - 1);
		ctx.fillRect(R1 - 7, top + 1, 8, foot - top - 1);
		// the breach: dark, flesh pushing through
		ctx.fillStyle = P.breach;
		ctx.fillRect(mid - 20, top - 3, 40, foot - top + 5);
		blob(mid - 3, cy + 3, 9, 8);
		blob(mid + 8, cy - 6, 5.5, 5);
		blob(mid - 11, cy + 8, 5, 4);
		blob(mid + 12, cy + 7, 4, 3.5);
		for (const side of [-1, 1]) {
			const outer = side < 0 ? L0 : R1;
			const hinge = mid + side * 30; // where the steel bends
			const end = mid + side * 17; // the torn end, before it is bent
			// the straight part: front face, top face, bevel, rivets
			steel(
				[
					[outer, face],
					[hinge, face],
					[hinge, foot],
					[outer, foot]
				],
				'#1d2422'
			);
			steel(
				[
					[outer, top],
					[hinge, top],
					[hinge, face],
					[outer, face]
				],
				'#414c49'
			);
			ctx.strokeStyle = 'rgba(200, 222, 214, 0.3)';
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(outer, top + 1.6);
			ctx.lineTo(hinge, top + 1.6);
			ctx.stroke();
			ctx.fillStyle = 'rgba(150, 168, 160, 0.6)';
			for (let i = 1; i <= 3; i++) {
				const rx = outer + ((hinge - outer) * i) / 4;
				for (const ry of [top + 4, face - 3]) {
					ctx.beginPath();
					ctx.arc(rx, ry, 1.1, 0, TAU);
					ctx.fill();
				}
			}
			// a worn hazard band by the bend
			ctx.save();
			ctx.beginPath();
			ctx.rect(Math.min(outer, hinge), top, Math.abs(hinge - outer), face - top);
			ctx.clip();
			for (let i = 0; i < 4; i++) {
				const x = hinge - side * (4 + i * 5);
				ctx.fillStyle = i % 2 ? 'rgba(20, 18, 12, 0.5)' : 'rgba(176, 138, 52, 0.38)';
				ctx.beginPath();
				ctx.moveTo(x, top);
				ctx.lineTo(x - side * 5, top);
				ctx.lineTo(x - side * 5 - 5, face);
				ctx.lineTo(x - 5, face);
				ctx.fill();
			}
			ctx.restore();
			// the bent end: a plate turned up about the hinge, its underside lit, its edge torn
			ctx.save();
			ctx.translate(hinge, top);
			ctx.rotate(side * 0.55);
			const len = Math.abs(end - hinge);
			const d = -side;
			steel(
				[
					[0, 0],
					[d * len * 0.55, -1],
					[d * len * 0.75, 4],
					[d * len, 1],
					[d * len * 0.9, 9],
					[d * len * 1.05, 14],
					[d * len * 0.7, face - top],
					[0, face - top]
				],
				'#5d6864'
			);
			const sg = ctx.createLinearGradient(0, 0, d * len, 0);
			sg.addColorStop(0, P.under0);
			sg.addColorStop(1, P.under1);
			ctx.fillStyle = sg;
			ctx.fillRect(Math.min(0, d * len), 0, len, face - top);
			ctx.restore();
			// petals of torn steel curling up from the breach
			for (const [px, ln, w] of [
				[end - side * 2, 13, 6],
				[end + side * 4, 9, 4.5]
			]) {
				steel(
					[
						[px - w / 2, top + 3],
						[px + side * 3, top - ln],
						[px + w / 2, top + 3]
					],
					'#77827d'
				);
			}
		}
		// claw gouges on the left leaf
		ctx.strokeStyle = 'rgba(8, 10, 10, 0.85)';
		ctx.lineWidth = 1.3;
		for (let i = 0; i < 3; i++) {
			ctx.beginPath();
			ctx.moveTo(L0 + 12 + i * 3.4, top + 2);
			ctx.lineTo(L0 + 19 + i * 3.4, face - 1);
			ctx.stroke();
		}
		// tendrils gripping the torn ends
		cord(mid - 4, cy + 2, mid - 14, top - 4, mid - 26, top + 2, 2.6);
		cord(mid + 4, cy, mid + 14, top - 5, mid + 24, top + 3, 2.4);
		ctx.restore();
	}
}
