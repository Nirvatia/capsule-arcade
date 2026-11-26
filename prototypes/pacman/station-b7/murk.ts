// Candidate: the station's infestation as a leak (the owner's direction A, 2026-11-26): the murk of
// the specimen tanks behind the maze seeping out over the station, in place of the hive's red
// flesh. The tops of the walls stay clean steel and the corridors' middles clean: the murk lies
// low, in dark green pools along the walls' feet and in the corners, threads along the plates'
// seams, a wet rim, a few bubbles, drips, a low haze; from the lair out as the infection grows.
// The static part is baked per infection value; only the bubbles, drips and haze move.
import type { createB7Scene } from '../../../src/games/pacman/render/station/b7/b7Scene';

type Scene = ReturnType<typeof createB7Scene>;
type Ctx = CanvasRenderingContext2D;

const TAU = Math.PI * 2;
const hash = (a: number, b: number) => {
	const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
	return v - Math.floor(v);
};
const LAIR = new Set(['LE', 'LT', 'BY', 'PY', 'IY', 'CE', 'DB']);

function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export interface Murk {
	/** The leak's pools at `infection` (0..1), in stage space, under the light map. */
	draw(ctx: Ctx, infection: number): void;
	/** Its wet glints, bubbles, drips and haze over the light map (the murk glows a little). */
	drawGlow(ctx: Ctx, infection: number, time: number): void;
}

export function createMurk(scene: Scene, rows: readonly (readonly string[])[]): Murk {
	const { TILE: T, MAZE_X, MAZE_Y, STAGE_W, STAGE_H } = scene;
	const H = rows.length;
	const W = rows[0].length;
	const at = (x: number, y: number) => rows[y]?.[x] ?? 'ES';
	const wall = (x: number, y: number) => {
		const t = at(x, y);
		return t === 'WL' || t === 'ES' || t === 'EX';
	};
	const floor = (x: number, y: number) => !wall(x, y) && !LAIR.has(at(x, y)) && !/^0/.test(at(x, y));
	let far = 1;
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++) {
			const d = scene.infectionDistance(x, y);
			if (floor(x, y) && Number.isFinite(d)) far = Math.max(far, d);
		}
	/** How far the leak has reached a tile, 0..1 (a soft front from the lair out). */
	const reach = (x: number, y: number, inf: number) => {
		const d = scene.infectionDistance(x, y);
		if (!Number.isFinite(d)) return 0;
		return Math.max(0, Math.min(1, (inf * far * 1.12 - d) / 2.5));
	};
	const px = (x: number) => MAZE_X + x * T;
	const py = (y: number) => MAZE_Y + y * T;
	/**
	 * How deep the pool reaches out from a wall at `u` (0..1) along a tile's edge, 0..1.6: smooth
	 * noise along the whole wall line (it joins across tiles), with gaps and swells.
	 */
	const edgeDepth = (x: number, y: number, dx: number, dy: number, u: number) => {
		// the wall line and the position along it, in quarter tiles
		const line = dx === 0 ? (y + dy * 0.5) * 2 + 101 : (x + dx * 0.5) * 2 + 503;
		const along = (dx === 0 ? x + u : y + u) * 4;
		const i0 = Math.floor(along);
		const f = along - i0;
		const k = (1 - Math.cos(f * Math.PI)) / 2;
		const v = hash(line, i0) * (1 - k) + hash(line, i0 + 1) * k;
		const w = hash(line + 7, Math.floor(along / 4));
		// a wall's stretch is dry, damp or pooled
		const amount = w < 0.25 ? 0 : w < 0.55 ? 0.5 : 1;
		return Math.max(0, (v - 0.25) / 0.75) * 1.6 * amount;
	};

	// --------------------------------------------------------------------------- the static bake

	const baked = new Map<number, { pools: HTMLCanvasElement; glints: HTMLCanvasElement }>();
	function bake(inf: number): { pools: HTMLCanvasElement; glints: HTMLCanvasElement } {
		const c = document.createElement('canvas');
		c.width = STAGE_W;
		c.height = STAGE_H;
		const g = c.getContext('2d') as Ctx;
		const gl = document.createElement('canvas');
		gl.width = STAGE_W;
		gl.height = STAGE_H;
		const h = gl.getContext('2d') as Ctx;
		const rand = mulberry32(7331);
		for (let y = 0; y < H; y++)
			for (let x = 0; x < W; x++) {
				const r = floor(x, y) ? reach(x, y, inf) : 0;
				const seed = rand();
				if (r <= 0) continue;
				const x0 = px(x);
				const y0 = py(y);
				const band = T * (0.16 + 0.2 * inf) * r;
				const sides: Array<[number, number]> = [
					[0, -1],
					[0, 1],
					[-1, 0],
					[1, 0]
				];
				// the pools along the walls' feet, their inner edge wavering
				for (const [dx, dy] of sides) {
					if (!wall(x + dx, y + dy)) continue;
					const n = 14;
					g.beginPath();
					for (let i = 0; i <= n; i++) {
						const u = i / n;
						const depth = band * edgeDepth(x, y, dx, dy, u);
						const ex = dx === 0 ? x0 + u * T : dx < 0 ? x0 + depth : x0 + T - depth;
						const ey = dy === 0 ? y0 + u * T : dy < 0 ? y0 + depth : y0 + T - depth;
						if (i === 0) {
							g.moveTo(dx === 0 ? x0 : dx < 0 ? x0 : x0 + T, dy === 0 ? y0 : dy < 0 ? y0 : y0 + T);
						}
						g.lineTo(ex, ey);
					}
					g.lineTo(dx === 0 ? x0 + T : dx < 0 ? x0 : x0 + T, dy === 0 ? y0 + T : dy < 0 ? y0 : y0 + T);
					g.closePath();
					const lg = g.createLinearGradient(
						dx < 0 ? x0 : dx > 0 ? x0 + T : 0,
						dy < 0 ? y0 : dy > 0 ? y0 + T : 0,
						dx < 0 ? x0 + band : dx > 0 ? x0 + T - band : 0,
						dy < 0 ? y0 + band : dy > 0 ? y0 + T - band : 0
					);
					lg.addColorStop(0, 'rgba(10, 30, 20, 0.95)');
					lg.addColorStop(0.55, 'rgba(34, 86, 58, 0.9)');
					lg.addColorStop(1, 'rgba(70, 150, 100, 0.7)');
					g.fillStyle = lg;
					g.fill();
					// the wet rim along its inner edge (over the light: the murk glows a little)
					h.beginPath();
					for (let i = 0; i <= n; i++) {
						const u = i / n;
						const depth = band * edgeDepth(x, y, dx, dy, u);
						const ex = dx === 0 ? x0 + u * T : dx < 0 ? x0 + depth : x0 + T - depth;
						const ey = dy === 0 ? y0 + u * T : dy < 0 ? y0 + depth : y0 + T - depth;
						if (i === 0) h.moveTo(ex, ey);
						else h.lineTo(ex, ey);
					}
					h.strokeStyle = `rgba(160, 240, 180, ${0.32 * r})`;
					h.lineWidth = 0.9;
					h.stroke();
				}
				// the corners gather more
				for (const [cx, cy] of [
					[-1, -1],
					[1, -1],
					[-1, 1],
					[1, 1]
				]) {
					if (!wall(x + cx, y) || !wall(x, y + cy)) continue;
					const ox = cx < 0 ? x0 : x0 + T;
					const oy = cy < 0 ? y0 : y0 + T;
					const pr = band * (0.8 + 1.2 * seed) * Math.min(1, edgeDepth(x, y, 0, cy, cx < 0 ? 0 : 1) + 0.3);
					const rg = g.createRadialGradient(ox, oy, 0, ox, oy, pr);
					rg.addColorStop(0, 'rgba(10, 30, 20, 0.95)');
					rg.addColorStop(0.7, 'rgba(36, 90, 60, 0.85)');
					rg.addColorStop(1, 'rgba(70, 150, 100, 0)');
					g.fillStyle = rg;
					g.beginPath();
					g.arc(ox, oy, pr, 0, TAU);
					g.fill();
				}
				// threads along the plates' seams (later on)
				if (inf > 0.5 && seed < 0.6) {
					g.strokeStyle = `rgba(30, 80, 52, ${0.45 * r * (inf - 0.4)})`;
					g.lineWidth = 1.2;
					g.beginPath();
					if (seed < 0.3) {
						g.moveTo(x0, y0 + seed * 3);
						g.lineTo(x0 + T * (0.3 + seed), y0);
					} else {
						g.moveTo(x0 + seed * 2, y0);
						g.lineTo(x0, y0 + T * (seed - 0.1));
					}
					g.stroke();
				}
				// a stain or two near a wall
				if (seed > 0.72) {
					g.fillStyle = `rgba(20, 52, 34, ${0.4 * r})`;
					g.beginPath();
					g.ellipse(x0 + T * (0.2 + 0.6 * seed), y0 + T * 0.2, 2 + 3 * seed, 1.4 + 2 * seed, seed * 3, 0, TAU);
					g.fill();
				}
			}
		// the lair: the source, a pool spilling out of the pit through its door
		const gates: Array<[number, number]> = [];
		for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (at(x, y) === 'LE') gates.push([x, y]);
		if (gates.length) {
			const gx = gates.reduce((s, [x]) => s + x, 0) / gates.length;
			const gy = gates.reduce((s, [, y]) => s + y, 0) / gates.length;
			const cx = px(gx + 0.5);
			const cy = py(gy + 0.5);
			const k = Math.min(1, 0.4 + inf);
			for (let i = 0; i < 7; i++) {
				const a = rand() * TAU;
				const d = rand() * T * 1.2 * k;
				const rr = T * (0.6 + rand() * 0.7) * k;
				const rg = g.createRadialGradient(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.5, 0, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.5, rr);
				rg.addColorStop(0, 'rgba(8, 22, 14, 0.85)');
				rg.addColorStop(0.7, 'rgba(26, 64, 42, 0.6)');
				rg.addColorStop(1, 'rgba(40, 96, 64, 0)');
				g.fillStyle = rg;
				g.beginPath();
				g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.5, rr, 0, TAU);
				g.fill();
			}
		}
		return { pools: c, glints: gl };
	}

	// ------------------------------------------------------------------------ the live details

	/** Spots in the pools where bubbles rise and drips land: by a wall, in a tile, its reach. */
	const rand = mulberry32(991);
	const spots: Array<{ x: number; y: number; tx: number; ty: number; ph: number; per: number }> = [];
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++) {
			if (!floor(x, y)) continue;
			for (const [dx, dy] of [
				[0, -1],
				[0, 1],
				[-1, 0],
				[1, 0]
			]) {
				if (!wall(x + dx, y + dy) || rand() > 0.35) continue;
				const u = 0.2 + rand() * 0.6;
				spots.push({
					x: dx === 0 ? px(x) + u * T : dx < 0 ? px(x) + T * 0.1 : px(x) + T * 0.9,
					y: dy === 0 ? py(y) + u * T : dy < 0 ? py(y) + T * 0.1 : py(y) + T * 0.9,
					tx: x,
					ty: y,
					ph: rand(),
					per: 2 + rand() * 3
				});
			}
		}
	const fog = Array.from({ length: 9 }, () => ({
		x: rand(),
		y: rand(),
		r: 2.5 + rand() * 3,
		vx: (rand() - 0.5) * 0.012,
		vy: (rand() - 0.5) * 0.008,
		ph: rand() * TAU
	}));

	function layers(infection: number) {
		const key = Math.round(infection * 100) / 100;
		let layer = baked.get(key);
		if (!layer) {
			layer = bake(key);
			baked.set(key, layer);
		}
		return layer;
	}

	function draw(ctx: Ctx, infection: number): void {
		if (infection <= 0.01) return;
		ctx.drawImage(layers(infection).pools, 0, 0);
	}

	function drawGlow(ctx: Ctx, infection: number, time: number): void {
		if (infection <= 0.01) return;
		ctx.drawImage(layers(infection).glints, 0, 0);
		// bubbles swelling and popping, drips landing with a ring
		for (let i = 0; i < spots.length; i++) {
			const s = spots[i];
			const r = reach(s.tx, s.ty, infection);
			if (r <= 0.2) continue;
			const u = (((time / s.per + s.ph) % 1) + 1) % 1;
			if (i % 3 === 0) {
				// a drip: a bright dot, then a ring spreading
				if (u > 0.7 || infection < 0.3) continue;
				const k = u / 0.7;
				ctx.strokeStyle = `rgba(170, 240, 190, ${0.6 * (1 - k) * r})`;
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.ellipse(s.x, s.y, 1 + k * 7, 0.6 + k * 4.2, 0, 0, TAU);
				ctx.stroke();
				if (k < 0.15) {
					ctx.fillStyle = `rgba(210, 255, 222, ${0.9 * r})`;
					ctx.beginPath();
					ctx.arc(s.x, s.y, 1.3, 0, TAU);
					ctx.fill();
				}
			} else {
				// a bubble
				if (u > 0.6) continue;
				const k = u / 0.6;
				const br = 0.9 + k * 2.6;
				ctx.fillStyle = `rgba(40, 100, 66, ${0.55 * r})`;
				ctx.beginPath();
				ctx.arc(s.x, s.y, br, 0, TAU);
				ctx.fill();
				ctx.strokeStyle = `rgba(190, 242, 188, ${(k > 0.9 ? 0.25 : 0.7) * r})`;
				ctx.lineWidth = 0.8;
				ctx.stroke();
				ctx.fillStyle = `rgba(230, 255, 236, ${0.7 * r})`;
				ctx.beginPath();
				ctx.arc(s.x - br * 0.35, s.y - br * 0.35, br * 0.25, 0, TAU);
				ctx.fill();
			}
		}
		// the low haze, drifting over the maze
		const mw = W * T;
		const mh = H * T;
		for (const f of fog) {
			const fx = MAZE_X + ((((f.x + time * f.vx) % 1) + 1) % 1) * mw;
			const fy = MAZE_Y + ((((f.y + time * f.vy) % 1) + 1) % 1) * mh;
			const fr = f.r * T * (0.8 + 0.2 * Math.sin(time * 0.3 + f.ph));
			const a = 0.14 * Math.max(0, infection - 0.2) * (0.7 + 0.3 * Math.sin(time * 0.4 + f.ph));
			if (a <= 0.003) continue;
			const rg = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
			rg.addColorStop(0, `rgba(90, 170, 120, ${a})`);
			rg.addColorStop(1, 'rgba(90, 170, 120, 0)');
			ctx.fillStyle = rg;
			ctx.beginPath();
			ctx.arc(fx, fy, fr, 0, TAU);
			ctx.fill();
		}
	}

	return { draw, drawGlow };
}
