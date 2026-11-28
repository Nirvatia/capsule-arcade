// A candidate for the station's maze look (the owner, 2026-11-28: the creatures get lost; the
// infestation's feel is loved and must stay, with far less detail for the eyes). Painted over the
// game's scene inside the maze only (the hull round it untouched), in one pass:
//   metal  flat: the floor one tone with faint seams, the walls flat blocks with a cast shadow and
//          one crisp edge, no panels, labels, fans or rivets in the maze;
//   hive   bold shapes, few: veins as thick tubes growing as a tree inside each wall island from
//          its tile nearest the lair (trunks thick, branches thin), clusters of 3 bulbs at some
//          forks, flat black flesh in lobes over the wall tops with one glint each, a lip over a
//          wall's face now and then; revealed from the lair out (the veins by 90%, the flesh from
//          45% to 100%);
//   life   motion, not texture: the heartbeat's lime runs out of the lair along the veins, the
//          bulbs' cores beat;
//   edge   the walls' edge drawn over everything, so the maze's outline never breaks;
//   food   small cool capsules with a faint glow (the amber left to the signals), the power cell
//          hot coral; the light is the station's state: act I bright cold steel, the emergency
//          warmer, the hive olive, the floor within about 20% of act I.
import type { GridLayout } from '../../../src/games/pacman/render/maze/GridView';
import { heartbeat } from '../../../src/games/pacman/render/station/b7/b7Hive';

type Ctx = CanvasRenderingContext2D;
type Rows = readonly (readonly string[])[];
interface SceneLike {
	infectionDistance(x: number, y: number): number;
}

const WALLS = new Set(['WL', 'EX', '0C']);
const LAIR = new Set(['LE', 'LT', 'BY', 'IY', 'PY', 'CE']);
/** The wall's face sits this far into its tile from the corridor (of the tile). */
const INSET = 0.2;
const LIME = '168, 250, 66';

const hash = (a: number, b: number, s = 0) => {
	const v = Math.sin(a * 127.1 + b * 311.7 + s * 74.7) * 43758.5453;
	return v - Math.floor(v);
};
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
function key3(a: number[], b: number[], c: number[], k: number): string {
	const p = k < 0.5 ? a : b;
	const q = k < 0.5 ? b : c;
	const u = k < 0.5 ? k * 2 : k * 2 - 1;
	return p.map((v, i) => Math.round(lerp(v, q[i], u))).join(', ');
}

interface Seg {
	ax: number;
	ay: number;
	bx: number;
	by: number;
	/** The perpendicular bend of its curve, tiles. */
	bend: number;
	w: number;
	d: number;
}
interface Node {
	x: number;
	y: number;
	d: number;
	seed: number;
}
interface Plan {
	segs: Seg[];
	nodes: Node[];
	dist: number[][];
	maxD: number;
}

let plan: Plan | null = null;

/** The veins' trees: each wall island grows from its tile nearest the lair (BFS inside it). */
function makePlan(rows: Rows, scene: SceneLike): Plan {
	const H = rows.length;
	const W = rows[0].length;
	const wall = (x: number, y: number) => y >= 0 && y < H && x >= 0 && x < W && WALLS.has(rows[y][x]);
	const dist: number[][] = [];
	let maxD = 0;
	for (let y = 0; y < H; y++) {
		dist.push([]);
		for (let x = 0; x < W; x++) {
			const d = wall(x, y) ? scene.infectionDistance(x, y) : Infinity;
			dist[y].push(d);
			if (Number.isFinite(d)) maxD = Math.max(maxD, d);
		}
	}
	const seen = dist.map((r) => r.map(() => false));
	const parent: Array<Array<[number, number] | null>> = dist.map((r) => r.map(() => null));
	const order: Array<[number, number]> = [];
	const D4 = [
		[1, 0],
		[-1, 0],
		[0, 1],
		[0, -1]
	];
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++) {
			if (!wall(x, y) || seen[y][x]) continue;
			// the island: find it, then grow from its tile nearest the lair
			const isl: Array<[number, number]> = [];
			const st: Array<[number, number]> = [[x, y]];
			seen[y][x] = true;
			while (st.length) {
				const [cx, cy] = st.pop() as [number, number];
				isl.push([cx, cy]);
				for (const [dx, dy] of D4)
					if (wall(cx + dx, cy + dy) && !seen[cy + dy][cx + dx]) {
						seen[cy + dy][cx + dx] = true;
						st.push([cx + dx, cy + dy]);
					}
			}
			const root = isl.reduce((a, b) => (dist[b[1]][b[0]] < dist[a[1]][a[0]] ? b : a));
			const inTree = new Set([root.join()]);
			const q = [root];
			for (let h = 0; h < q.length; h++) {
				const [cx, cy] = q[h];
				order.push([cx, cy]);
				for (const [dx, dy] of D4) {
					const k = `${cx + dx},${cy + dy}`;
					if (wall(cx + dx, cy + dy) && !inTree.has(k)) {
						inTree.add(k);
						parent[cy + dy][cx + dx] = [cx, cy];
						q.push([cx + dx, cy + dy]);
					}
				}
			}
		}
	// the subtree sizes, leaves up, for the trunks' thickness
	const size = dist.map((r) => r.map(() => 1));
	const kids = dist.map((r) => r.map(() => 0));
	for (let i = order.length - 1; i >= 0; i--) {
		const [x, y] = order[i];
		const p = parent[y][x];
		if (p) {
			size[p[1]][p[0]] += size[y][x];
			kids[p[1]][p[0]]++;
		}
	}
	const segs: Seg[] = [];
	const nodes: Node[] = [];
	for (const [x, y] of order) {
		const p = parent[y][x];
		if (p)
			segs.push({
				ax: p[0] + 0.5,
				ay: p[1] + 0.5,
				bx: x + 0.5,
				by: y + 0.5,
				bend: (hash(x, y, 3) - 0.5) * 0.36,
				w: 0.07 + 0.11 * Math.min(1, Math.sqrt(size[y][x]) / 5),
				d: dist[y][x]
			});
		if (kids[y][x] >= 2 && hash(x, y, 9) < 0.45) nodes.push({ x: x + 0.5, y: y + 0.5, d: dist[y][x], seed: hash(x, y, 1) });
	}
	return { segs, nodes, dist, maxD };
}

function veinPath(c: Ctx, s: Seg, S: number): void {
	const mx = (s.ax + s.bx) / 2 - (s.by - s.ay) * s.bend;
	const my = (s.ay + s.by) / 2 + (s.bx - s.ax) * s.bend;
	c.beginPath();
	c.moveTo(s.ax * S, s.ay * S);
	c.quadraticCurveTo(mx * S, my * S, s.bx * S, s.by * S);
}

/** The fronts: the veins reach the farthest wall at 90%, the flesh grows from 45% to 100%. */
function fronts(inf: number, maxD: number) {
	return { vein: (inf / 0.9) * maxD, flesh: ((inf - 0.45) / 0.55) * maxD };
}

let bake: { canvas: HTMLCanvasElement; key: string } | null = null;

function paintStatic(g: Ctx, rows: Rows, S: number, inf: number, p: Plan): void {
	const H = rows.length;
	const W = rows[0].length;
	const tok = (x: number, y: number) => (y >= 0 && y < H && x >= 0 && x < W ? rows[y][x] : 'ES');
	const wall = (x: number, y: number) => WALLS.has(tok(x, y));
	const paint = (x: number, y: number) => tok(x, y) !== 'ES' && !LAIR.has(tok(x, y));
	const floor = key3([96, 104, 110], [94, 92, 86], [84, 90, 82], inf);
	const wallFill = key3([152, 162, 170], [150, 146, 136], [134, 138, 126], inf);
	const edge = '26, 30, 34';
	const m = INSET * S;
	// the floor: one tone, a faint seam every two tiles
	g.fillStyle = `rgb(${floor})`;
	for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (paint(x, y)) g.fillRect(x * S, y * S, S, S);
	g.strokeStyle = 'rgba(0, 0, 0, 0.07)';
	g.lineWidth = 1;
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++) {
			if (!paint(x, y) || wall(x, y)) continue;
			if (x % 2 === 0) {
				g.beginPath();
				g.moveTo(x * S + 0.5, y * S);
				g.lineTo(x * S + 0.5, y * S + S);
				g.stroke();
			}
			if (y % 2 === 0) {
				g.beginPath();
				g.moveTo(x * S, y * S + 0.5);
				g.lineTo(x * S + S, y * S + 0.5);
				g.stroke();
			}
		}
	// each wall tile's block: inset on the sides that face the corridor, its concave corner cut
	// the void outside the maze counts as wall: the outer ring has no inset toward it
	const solid = (x: number, y: number) => wall(x, y) || tok(x, y) === 'ES';
	const block = (x: number, y: number) => {
		const l = solid(x - 1, y) ? 0 : m;
		const r = solid(x + 1, y) ? 0 : m;
		const t = solid(x, y - 1) ? 0 : m;
		const b = solid(x, y + 1) ? 0 : m;
		return { l, r, t, b };
	};
	const blockPath = (x: number, y: number, grow = 0) => {
		const k = block(x, y);
		g.rect(x * S + k.l - grow, y * S + k.t - grow, S - k.l - k.r + grow * 2, S - k.t - k.b + grow * 2);
	};
	const cuts = (x: number, y: number): Array<[number, number]> => {
		const out: Array<[number, number]> = [];
		for (const [dx, dy] of [
			[1, 1],
			[-1, 1],
			[1, -1],
			[-1, -1]
		])
			if (solid(x + dx, y) && solid(x, y + dy) && !solid(x + dx, y + dy)) out.push([dx, dy]);
		return out;
	};
	const cutRect = (x: number, y: number, dx: number, dy: number) =>
		[dx > 0 ? x * S + S - m : x * S, dy > 0 ? y * S + S - m : y * S, m, m] as const;
	// the cast shadow (light from the top left)
	g.save();
	g.fillStyle = 'rgba(0, 0, 0, 0.26)';
	g.translate(S * 0.07, S * 0.09);
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++)
			if (wall(x, y)) {
				g.beginPath();
				blockPath(x, y);
				g.fill();
			}
	g.restore();
	g.fillStyle = `rgb(${wallFill})`;
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++)
			if (wall(x, y)) {
				g.beginPath();
				blockPath(x, y);
				g.fill();
			}
	g.fillStyle = `rgb(${floor})`;
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++) if (wall(x, y)) for (const [dx, dy] of cuts(x, y)) g.fillRect(...cutRect(x, y, dx, dy));
	// a whole-block mask for the hive (the walls' tops only)
	const clipWalls = () => {
		g.beginPath();
		for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (wall(x, y)) blockPath(x, y);
		g.clip();
	};
	const f = fronts(inf, p.maxD);
	// the flesh: one black mass along the veins' tree (the steel shows where it has not gone),
	// lumps at some tiles, one wet glint line along its top-left
	if (f.flesh > 0) {
		const fleshSegs = p.segs.filter((s) => s.d <= f.flesh);
		g.save();
		clipWalls();
		g.lineCap = 'round';
		g.lineJoin = 'round';
		g.strokeStyle = 'rgb(13, 15, 14)';
		g.fillStyle = 'rgb(13, 15, 14)';
		for (const s of fleshSegs) {
			veinPath(g, s, S);
			g.lineWidth = S * (0.3 + 0.6 * s.w);
			g.stroke();
		}
		for (const s of fleshSegs) {
			if (hash(s.bx, s.by, 21) > 0.35) continue;
			g.beginPath();
			g.arc(s.bx * S, s.by * S, S * (0.27 + 0.1 * hash(s.bx, s.by, 22)), 0, Math.PI * 2);
			g.fill();
		}
		g.translate(-S * 0.07, -S * 0.07);
		g.strokeStyle = 'rgba(214, 230, 226, 0.3)';
		g.lineWidth = Math.max(1, S * 0.03);
		for (const s of fleshSegs) {
			if (hash(s.bx, s.by, 23) > 0.6) continue;
			veinPath(g, s, S);
			g.stroke();
		}
		g.restore();
		// a lip over a wall's face now and then: a black bulge into the corridor's margin
		for (let y = 0; y < H; y++)
			for (let x = 0; x < W; x++) {
				if (!wall(x, y) || p.dist[y][x] > f.flesh || hash(x, y, 11) > 0.22) continue;
				for (const [dx, dy] of [
					[1, 0],
					[-1, 0],
					[0, 1],
					[0, -1]
				]) {
					const t = tok(x + dx, y + dy);
					if (WALLS.has(t) || t === 'ES' || LAIR.has(t)) continue;
					const fx = (x + 0.5 + dx * (0.5 - INSET)) * S;
					const fy = (y + 0.5 + dy * (0.5 - INSET)) * S;
					g.fillStyle = 'rgb(13, 15, 14)';
					g.beginPath();
					g.ellipse(fx, fy, S * (dx ? 0.1 : 0.26), S * (dx ? 0.26 : 0.1), 0, 0, Math.PI * 2);
					g.fill();
					break;
				}
			}
	}
	// the veins: thick dark tubes with a cold glint along the top, over the flesh
	if (f.vein > 0) {
		g.save();
		clipWalls();
		g.lineCap = 'round';
		for (const s of p.segs) {
			if (s.d > f.vein) continue;
			veinPath(g, s, S);
			g.strokeStyle = 'rgb(10, 12, 11)';
			g.lineWidth = s.w * S;
			g.stroke();
		}
		for (const s of p.segs) {
			if (s.d > f.vein) continue;
			veinPath(g, s, S);
			g.strokeStyle = `rgba(${LIME}, 0.32)`;
			g.lineWidth = Math.max(1, s.w * S * 0.28);
			g.stroke();
		}
		for (const s of p.segs) {
			if (s.d > f.vein || s.w < 0.11) continue;
			g.save();
			g.translate(-s.w * S * 0.18, -s.w * S * 0.18);
			veinPath(g, s, S);
			g.strokeStyle = 'rgba(200, 222, 218, 0.3)';
			g.lineWidth = Math.max(1, s.w * S * 0.18);
			g.stroke();
			g.restore();
		}
		g.restore();
		// the bulbs' clusters at some forks (their lime cores beat live)
		for (const n of p.nodes) {
			if (n.d > f.vein) continue;
			for (const [ox, oy, r] of bulbs(n)) {
				const bx = (n.x + ox) * S;
				const by = (n.y + oy) * S;
				const core = g.createRadialGradient(bx, by, 0, bx, by, r * S);
				core.addColorStop(0, `rgb(${LIME})`);
				core.addColorStop(0.45, 'rgb(70, 110, 30)');
				core.addColorStop(1, 'rgb(9, 11, 10)');
				g.fillStyle = core;
				g.beginPath();
				g.arc(bx, by, r * S, 0, Math.PI * 2);
				g.fill();
				g.fillStyle = 'rgba(225, 240, 235, 0.6)';
				g.beginPath();
				g.arc((n.x + ox - r * 0.35) * S, (n.y + oy - r * 0.35) * S, r * S * 0.22, 0, Math.PI * 2);
				g.fill();
			}
		}
	}
	// the edge over everything: the maze's outline never breaks
	g.strokeStyle = `rgb(${edge})`;
	g.lineWidth = Math.max(1.5, S * 0.055);
	g.lineCap = 'square';
	g.beginPath();
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++) {
			if (!wall(x, y)) continue;
			const k = block(x, y);
			const x0 = x * S + k.l;
			const x1 = x * S + S - k.r;
			const y0 = y * S + k.t;
			const y1 = y * S + S - k.b;
			const face = (t: string) => !WALLS.has(t) && t !== 'ES';
			if (k.l && face(tok(x - 1, y))) (g.moveTo(x0, y0), g.lineTo(x0, y1));
			if (k.r && face(tok(x + 1, y))) (g.moveTo(x1, y0), g.lineTo(x1, y1));
			if (k.t && face(tok(x, y - 1))) (g.moveTo(x0, y0), g.lineTo(x1, y0));
			if (k.b && face(tok(x, y + 1))) (g.moveTo(x0, y1), g.lineTo(x1, y1));
			for (const [dx, dy] of cuts(x, y)) {
				const cx = dx > 0 ? x * S + S - m : x * S + m;
				const cy = dy > 0 ? y * S + S - m : y * S + m;
				g.moveTo(cx, cy);
				g.lineTo(dx > 0 ? x * S + S : x * S, cy);
				g.moveTo(cx, cy);
				g.lineTo(cx, dy > 0 ? y * S + S : y * S);
			}
		}
	g.stroke();
	// the marks of the matrix: the hatch (a hazard band), the vents (a grille), the console
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++) {
			const t = tok(x, y);
			if (t === 'EX') {
				g.save();
				g.beginPath();
				g.rect(x * S + S * 0.12, y * S + S * 0.3, S * 0.76, S * 0.4);
				g.clip();
				for (let i = -2; i < 6; i++) {
					g.fillStyle = i % 2 ? 'rgb(30, 30, 30)' : 'rgb(232, 190, 60)';
					g.beginPath();
					g.moveTo(x * S + i * S * 0.18, y * S + S * 0.7);
					g.lineTo(x * S + i * S * 0.18 + S * 0.18, y * S + S * 0.7);
					g.lineTo(x * S + i * S * 0.18 + S * 0.36, y * S + S * 0.3);
					g.lineTo(x * S + i * S * 0.18 + S * 0.18, y * S + S * 0.3);
					g.fill();
				}
				g.restore();
			} else if (t === '0C') {
				g.fillStyle = 'rgb(16, 18, 20)';
				g.fillRect(x * S + S * 0.2, y * S + S * 0.22, S * 0.6, S * 0.56);
				g.fillStyle = `rgb(${wallFill})`;
				for (let i = 0; i < 3; i++) g.fillRect(x * S + S * 0.2, y * S + S * (0.3 + i * 0.16), S * 0.6, S * 0.05);
			} else if (t === 'CN') {
				g.fillStyle = 'rgb(28, 34, 40)';
				g.fillRect(x * S + S * 0.22, y * S + S * 0.22, S * 0.56, S * 0.56);
				g.fillStyle = 'rgb(120, 230, 255)';
				g.fillRect(x * S + S * 0.3, y * S + S * 0.32, S * 0.4, S * 0.14);
			}
		}
	// the food: small cool capsules, a faint glow; the power cells hot coral
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++) {
			const t = tok(x, y);
			const cx = (x + 0.5) * S;
			const cy = (y + 0.5) * S;
			if (t === 'DT') {
				const gl = g.createRadialGradient(cx, cy, 0, cx, cy, S * 0.17);
				gl.addColorStop(0, 'rgba(210, 240, 255, 0.28)');
				gl.addColorStop(1, 'rgba(210, 240, 255, 0)');
				g.fillStyle = gl;
				g.fillRect(cx - S * 0.17, cy - S * 0.17, S * 0.34, S * 0.34);
				g.fillStyle = 'rgb(232, 246, 255)';
				g.beginPath();
				g.ellipse(cx, cy, S * 0.075, S * 0.05, -0.6, 0, Math.PI * 2);
				g.fill();
			} else if (t === 'EU') {
				const gl = g.createRadialGradient(cx, cy, 0, cx, cy, S * 0.42);
				gl.addColorStop(0, 'rgba(255, 112, 88, 0.55)');
				gl.addColorStop(1, 'rgba(255, 112, 88, 0)');
				g.fillStyle = gl;
				g.fillRect(cx - S * 0.42, cy - S * 0.42, S * 0.84, S * 0.84);
				g.fillStyle = 'rgb(255, 120, 96)';
				g.beginPath();
				g.arc(cx, cy, S * 0.17, 0, Math.PI * 2);
				g.fill();
				g.fillStyle = 'rgba(255, 236, 226, 0.9)';
				g.beginPath();
				g.arc(cx - S * 0.05, cy - S * 0.05, S * 0.06, 0, Math.PI * 2);
				g.fill();
			}
		}
}

function bulbs(n: Node): Array<[number, number, number]> {
	const a = n.seed * Math.PI * 2;
	return [0, 1, 2].map((i) => {
		const ang = a + (i * Math.PI * 2) / 3;
		return [Math.cos(ang) * 0.12, Math.sin(ang) * 0.1, [0.13, 0.1, 0.08][i]] as [number, number, number];
	});
}

/** Paints the candidate over the maze (after the game's scene and its light). */
export function drawSimpleMaze(c: Ctx, L: GridLayout, rows: Rows, scene: SceneLike, inf: number, time: number): void {
	plan ??= makePlan(rows, scene);
	const S = L.tileSize;
	const H = rows.length;
	const W = rows[0].length;
	const z = c.getTransform().a;
	const key = `${S.toFixed(2)}|${z}|${inf.toFixed(3)}`;
	if (!bake || bake.key !== key) {
		const cv = document.createElement('canvas');
		cv.width = Math.ceil(W * S * z);
		cv.height = Math.ceil(H * S * z);
		const g = cv.getContext('2d') as Ctx;
		g.scale(z, z);
		paintStatic(g, rows, S, inf, plan);
		bake = { canvas: cv, key };
	}
	c.drawImage(bake.canvas, L.offsetX, L.offsetY, W * S, H * S);
	// the life: the heartbeat's lime out of the lair along the veins, the bulbs' cores beating
	const f = fronts(inf, plan.maxD);
	if (f.vein <= 0) return;
	c.save();
	c.translate(L.offsetX, L.offsetY);
	c.globalCompositeOperation = 'lighter';
	c.lineCap = 'round';
	for (const s of plan.segs) {
		if (s.d > f.vein) continue;
		const b = heartbeat(time, s.d);
		if (b < 0.03) continue;
		veinPath(c, s, S);
		c.strokeStyle = `rgba(${LIME}, ${0.75 * b})`;
		c.lineWidth = s.w * S * 0.4;
		c.stroke();
	}
	for (const n of plan.nodes) {
		if (n.d > f.vein) continue;
		const b = 0.45 + 0.55 * heartbeat(time, n.d);
		for (const [ox, oy, r] of bulbs(n)) {
			const x = (n.x + ox) * S;
			const y = (n.y + oy) * S;
			const gl = c.createRadialGradient(x, y, 0, x, y, r * S * 1.3);
			gl.addColorStop(0, `rgba(${LIME}, ${0.95 * b})`);
			gl.addColorStop(0.5, `rgba(${LIME}, ${0.45 * b})`);
			gl.addColorStop(1, `rgba(${LIME}, 0)`);
			c.fillStyle = gl;
			c.fillRect(x - r * S * 1.3, y - r * S * 1.3, r * S * 2.6, r * S * 2.6);
		}
	}
	c.restore();
}
