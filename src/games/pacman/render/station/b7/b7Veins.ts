// The station's infestation (the owner's pick, 2026-11-25, in place of the mock-up's roots): the
// infection lives inside the bulkheads. Veins run under the wall plates from module to module
// (continuous across tiles: they meet at each edge's midpoint), the walls' edges along the
// corridors turn a sick amber, clusters of spores sit on a few crests, veins drip down the south
// facades; the floor stays clean but for a thin dark stain at the walls' feet. Baked once at its
// fullest; the game reveals it from the lair out like the mock-up's (`B7World`).
import type { createB7Scene } from './b7Scene';

type Scene = ReturnType<typeof createB7Scene>;
const SCALE = 1.5;
const FACADE = 7;

function rng(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
const hash = (x: number, y: number) => (Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0;

export function bakeVeins(scene: Scene, rows: readonly (readonly string[])[]): HTMLCanvasElement {
	const { STAGE_W, STAGE_H, TILE, COLS, ROWS, tx, ty } = scene;
	const c = document.createElement('canvas');
	c.width = Math.ceil(STAGE_W * SCALE);
	c.height = Math.ceil(STAGE_H * SCALE);
	const g = c.getContext('2d') as CanvasRenderingContext2D;
	g.scale(SCALE, SCALE);
	const at = (x: number, y: number) => rows[y]?.[x] ?? 'ES';
	const wall = (x: number, y: number) => at(x, y) === 'WL';
	const open = (x: number, y: number) => !['WL', 'ES'].includes(at(x, y));
	g.lineCap = 'round';
	g.lineJoin = 'round';

	// the floor: a thin dark stain at the walls' feet
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
				const ex = dx === 1 ? tx(x + 1) : dx === -1 ? tx(x) : tx(x);
				const ey = dy === 1 ? ty(y + 1) : dy === -1 ? ty(y) : ty(y);
				const w = dx === 0 ? TILE : 4;
				const h = dy === 0 ? TILE : 4;
				const gx = dx === -1 ? ex - 4 : ex;
				const gy = dy === -1 ? ey - 4 : ey;
				const gr =
					dx !== 0
						? g.createLinearGradient(ex, 0, ex + dx * 4, 0)
						: g.createLinearGradient(0, ey, 0, ey + dy * 4);
				gr.addColorStop(0, 'rgba(26, 8, 12, 0.55)');
				gr.addColorStop(1, 'rgba(26, 8, 12, 0)');
				g.fillStyle = gr;
				g.fillRect(gx, gy, w, h);
			}
		}
	}

	// the veins: through each wall tile's centre to the midpoints of the edges it shares with walls
	const mid = (x: number, y: number, dx: number, dy: number) => {
		// the edge's own wobble, the same from both sides
		const ex = x + (dx === 1 ? 1 : 0);
		const ey = y + (dy === 1 ? 1 : 0);
		const r = rng(hash(ex * 2 + (dx !== 0 ? 1 : 0), ey * 2 + (dy !== 0 ? 1 : 0)))();
		const w = (r - 0.5) * 8;
		return dx !== 0
			? { x: tx(ex), y: ty(y) + TILE / 2 + w }
			: { x: tx(x) + TILE / 2 + w, y: ty(ey) };
	};
	const stroke = (path: () => void) => {
		for (const [w, col] of [
			[3.4, 'rgba(34, 10, 18, 0.9)'],
			[2.1, 'rgba(118, 30, 44, 0.95)']
		] as const) {
			g.strokeStyle = col;
			g.lineWidth = w;
			path();
			g.stroke();
		}
		g.save();
		g.globalCompositeOperation = 'lighter';
		g.strokeStyle = 'rgba(255, 158, 84, 0.55)';
		g.lineWidth = 0.9;
		path();
		g.stroke();
		g.restore();
	};
	for (let y = 1; y < ROWS - 1; y += 1) {
		for (let x = 1; x < COLS - 1; x += 1) {
			if (!wall(x, y)) continue;
			const rand = rng(hash(x, y));
			const southOpen = open(x, y + 1);
			const cx = tx(x) + TILE / 2 + (rand() - 0.5) * 8;
			const cy = ty(y) + (TILE - (southOpen ? FACADE : 0)) / 2 + (rand() - 0.5) * 6;
			const ends: Array<{ x: number; y: number }> = [];
			for (const [dx, dy] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1]
			] as const) {
				if (wall(x + dx, y + dy)) ends.push(mid(x, y, dx, dy));
			}
			for (const e of ends) {
				const kx = (cx + e.x) / 2 + (rand() - 0.5) * 7;
				const ky = (cy + e.y) / 2 + (rand() - 0.5) * 7;
				stroke(() => {
					g.beginPath();
					g.moveTo(cx, cy);
					g.quadraticCurveTo(kx, ky, e.x, e.y);
				});
			}
			// a twig or two off the trunk
			const twigs = ends.length === 0 ? 3 : rand() < 0.6 ? 1 : 2;
			for (let i = 0; i < twigs; i += 1) {
				const a = rand() * Math.PI * 2;
				const len = 5 + rand() * 7;
				stroke(() => {
					g.beginPath();
					g.moveTo(cx, cy);
					g.quadraticCurveTo(
						cx + Math.cos(a + 0.6) * len * 0.6,
						cy + Math.sin(a + 0.6) * len * 0.6,
						cx + Math.cos(a) * len,
						cy + Math.sin(a) * len
					);
				});
			}
			// the knot where they meet, swollen
			g.fillStyle = 'rgba(96, 22, 36, 1)';
			g.beginPath();
			g.arc(cx, cy, 2.6, 0, Math.PI * 2);
			g.fill();
			g.fillStyle = 'rgba(255, 170, 96, 0.8)';
			g.beginPath();
			g.arc(cx - 0.6, cy - 0.6, 1, 0, Math.PI * 2);
			g.fill();
			// veins drip down the south facade
			if (southOpen && rand() < 0.55) {
				const fx = tx(x) + 6 + rand() * (TILE - 12);
				const top = ty(y + 1) - FACADE;
				stroke(() => {
					g.beginPath();
					g.moveTo(fx, top - 2);
					g.lineTo(fx + (rand() - 0.5) * 2, top + FACADE - 1);
				});
			}
			// a cluster of spores on a few crests
			if (rand() < 0.16) {
				const n = 3 + Math.floor(rand() * 3);
				for (let i = 0; i < n; i += 1) {
					const sx = cx + (rand() - 0.5) * 14;
					const sy = cy + (rand() - 0.5) * 10;
					const r = 1.5 + rand() * 1.2;
					g.fillStyle = '#2a0c14';
					g.beginPath();
					g.arc(sx, sy, r + 0.7, 0, Math.PI * 2);
					g.fill();
					const sg = g.createRadialGradient(sx - r * 0.3, sy - r * 0.3, 0, sx, sy, r);
					sg.addColorStop(0, '#ffe2c0');
					sg.addColorStop(1, '#d0605a');
					g.fillStyle = sg;
					g.beginPath();
					g.arc(sx, sy, r, 0, Math.PI * 2);
					g.fill();
				}
			}
		}
	}

	// the walls' edges along the corridors: a sick amber line where the cold edge was
	g.save();
	g.globalCompositeOperation = 'lighter';
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
			for (const [a, b, cc, d] of edges) {
				g.strokeStyle = 'rgba(255, 140, 60, 0.16)';
				g.lineWidth = 4;
				g.beginPath();
				g.moveTo(a, b);
				g.lineTo(cc, d);
				g.stroke();
				g.strokeStyle = 'rgba(255, 184, 96, 0.5)';
				g.lineWidth = 1.2;
				g.beginPath();
				g.moveTo(a, b);
				g.lineTo(cc, d);
				g.stroke();
			}
		}
	}
	g.restore();
	return c;
}
