// Candidate: the station's infestation as an engulfing (the owner, 2026-11-26, after the leak read
// as a maze in green waste, a mess at 100%, no threat). The tanks' murk takes the walls, not the
// floor: wall by wall from the lair out the steel goes under a dark green translucent mass (the
// steel still showing, drowned), its edge lit like the tanks' glass; the corridors stay clean and
// dark, so at any infection the maze is two masses, the glowing walls and the dark ways. Where the
// mass meets clean steel a lit front creeps with tendrils. Specimens drift inside some walls, as in
// the tanks; when the hero passes, the nearest turns, opens its eyes and presses to the surface.
// A slow wave of light runs out of the lair over the taken walls (its breath). The lair spills a
// pool. Baked per infection value; the specimens, the eyes, the front's glow and the wave move.
import type { createB7Scene } from '../../../src/games/pacman/render/station/b7/b7Scene';

type Scene = ReturnType<typeof createB7Scene>;
type Ctx = CanvasRenderingContext2D;

const TAU = Math.PI * 2;
const FACADE_H = 7;
const hash = (a: number, b: number) => {
	const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
	return v - Math.floor(v);
};

export interface Engulf {
	/** The mass over the walls and what drifts in it, under the light map. */
	draw(ctx: Ctx, infection: number, time: number, hero: { x: number; y: number } | null): void;
	/** Its lit edges, the front, the breath and the eyes, over the light map. */
	drawGlow(ctx: Ctx, infection: number, time: number, hero: { x: number; y: number } | null): void;
}

export function createEngulf(scene: Scene, rows: readonly (readonly string[])[]): Engulf {
	const { TILE: T, MAZE_X, MAZE_Y, STAGE_W, STAGE_H } = scene;
	const H = rows.length;
	const W = rows[0].length;
	const at = (x: number, y: number) => rows[y]?.[x] ?? 'ES';
	const isWall = (x: number, y: number) => at(x, y) === 'WL';
	const px = (x: number) => MAZE_X + x * T;
	const py = (y: number) => MAZE_Y + y * T;
	let far = 1;
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++) {
			const d = scene.infectionDistance(x, y);
			if (isWall(x, y) && Number.isFinite(d)) far = Math.max(far, d);
		}
	/** How far the mass has taken a wall tile, 0..1 (every wall by 100%). */
	const taken = (x: number, y: number, inf: number) => {
		if (!isWall(x, y)) return 0;
		const d = scene.infectionDistance(x, y);
		if (!Number.isFinite(d)) return inf >= 0.99 ? 1 : 0;
		return Math.max(0, Math.min(1, (inf * (far + 1.5) - d) / 1.5));
	};
	let lairX = 0;
	let lairY = 0;
	let lairN = 0;
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++)
			if (at(x, y) === 'LT' || at(x, y) === 'LE') {
				lairX += x + 0.5;
				lairY += y + 0.5;
				lairN += 1;
			}
	const LX = px(lairN ? lairX / lairN : W / 2);
	const LY = py(lairN ? lairY / lairN : H / 2);
	const SIDES = [
		[0, -1],
		[0, 1],
		[-1, 0],
		[1, 0]
	] as const;

	// --------------------------------------------------------------------------- the static bake

	interface Layers {
		mass: HTMLCanvasElement;
		edges: HTMLCanvasElement;
		/** The taken walls as one path (the breath runs inside it). */
		walls: Path2D;
		/** The front: segments where taken meets clean steel. */
		front: Array<{ x0: number; y0: number; x1: number; y1: number; nx: number; ny: number }>;
	}
	const baked = new Map<number, Layers>();
	const stage = () => {
		const c = document.createElement('canvas');
		c.width = STAGE_W;
		c.height = STAGE_H;
		return [c, c.getContext('2d') as Ctx] as const;
	};

	function bake(inf: number): Layers {
		const [mask, m] = stage();
		const [mass, g] = stage();
		const [edges, e] = stage();
		const front: Layers['front'] = [];
		const walls = new Path2D();
		// the mask: every taken wall tile, its alpha the take
		for (let y = 0; y < H; y++)
			for (let x = 0; x < W; x++) {
				const r = taken(x, y, inf);
				if (r <= 0) continue;
				m.fillStyle = `rgba(255, 255, 255, ${0.8 * r})`;
				m.fillRect(px(x) - 0.3, py(y) - 0.3, T + 0.6, T + 0.6);
				if (r > 0.3) walls.rect(px(x) - 0.3, py(y) - 0.3, T + 0.6, T + 0.6);
			}
		// the mass: a dark green body with lighter clouds and darker depths inside, cut to the mask
		g.fillStyle = '#17402d';
		g.fillRect(0, 0, STAGE_W, STAGE_H);
		for (let i = 0; i < 90; i++) {
			const cx = MAZE_X + hash(i, 1) * W * T;
			const cy = MAZE_Y + hash(i, 2) * H * T;
			const r = T * (0.8 + hash(i, 3) * 2.2);
			const light = hash(i, 4) < 0.55;
			const rg = g.createRadialGradient(cx, cy, 0, cx, cy, r);
			rg.addColorStop(0, light ? 'rgba(70, 150, 104, 0.55)' : 'rgba(4, 16, 10, 0.6)');
			rg.addColorStop(1, light ? 'rgba(70, 150, 104, 0)' : 'rgba(4, 16, 10, 0)');
			g.fillStyle = rg;
			g.beginPath();
			g.arc(cx, cy, r, 0, TAU);
			g.fill();
		}
		// the faces of the walls (their south skirt) sit deeper in it
		for (let y = 0; y < H; y++)
			for (let x = 0; x < W; x++) {
				if (!isWall(x, y) || isWall(x, y + 1) || at(x, y + 1) === 'ES') continue;
				g.fillStyle = 'rgba(2, 10, 6, 0.55)';
				g.fillRect(px(x), py(y) + T - FACADE_H, T, FACADE_H);
			}
		g.globalCompositeOperation = 'destination-in';
		g.drawImage(mask, 0, 0);
		g.globalCompositeOperation = 'source-over';
		// the lit edges where the mass meets the corridors, brighter to the upper left
		for (let y = 0; y < H; y++)
			for (let x = 0; x < W; x++) {
				const r = taken(x, y, inf);
				if (r <= 0.05) continue;
				for (const [dx, dy] of SIDES) {
					const nx = x + dx;
					const ny = y + dy;
					const x0 = dx > 0 ? px(x) + T : px(x);
					const y0 = dy > 0 ? py(y) + T : py(y);
					const x1 = dx === 0 ? x0 + T : x0;
					const y1 = dy === 0 ? y0 + T : y0;
					if (isWall(nx, ny)) {
						// the front: taken against clean steel
						const rn = taken(nx, ny, inf);
						if (r >= 0.5 && rn < 0.5) front.push({ x0, y0, x1, y1, nx: dx, ny: dy });
						continue;
					}
					if (at(nx, ny) === 'ES') continue;
					const lit = dx < 0 || dy < 0 ? 0.55 : 0.3;
					e.strokeStyle = `rgba(170, 240, 196, ${lit * r})`;
					e.lineWidth = 1.2;
					e.beginPath();
					e.moveTo(x0, y0);
					e.lineTo(x1, y1);
					e.stroke();
				}
			}
		// the front's tendrils, reaching over the clean steel
		for (const f of front) {
			for (let k = 0; k < 3; k++) {
				const u = 0.2 + k * 0.3 + (hash(f.x0 + k, f.y0) - 0.5) * 0.15;
				const sx = f.x0 + (f.x1 - f.x0) * u;
				const sy = f.y0 + (f.y1 - f.y0) * u;
				const len = T * (0.25 + hash(f.y0 + k, f.x0) * 0.4);
				const side = (hash(f.x0, f.y0 + k) - 0.5) * T * 0.3;
				e.strokeStyle = 'rgba(40, 110, 74, 0.85)';
				e.lineWidth = 2.2 - k * 0.4;
				e.lineCap = 'round';
				e.beginPath();
				e.moveTo(sx, sy);
				e.quadraticCurveTo(
					sx + f.nx * len * 0.5 + (f.nx === 0 ? side : 0),
					sy + f.ny * len * 0.5 + (f.ny === 0 ? side : 0),
					sx + f.nx * len + (f.nx === 0 ? side * 1.6 : 0),
					sy + f.ny * len + (f.ny === 0 ? side * 1.6 : 0)
				);
				e.stroke();
			}
		}
		return { mass, edges, front, walls };
	}

	const layers = (inf: number) => {
		const key = Math.round(inf * 100) / 100;
		let l = baked.get(key);
		if (!l) {
			l = bake(key);
			baked.set(key, l);
		}
		return l;
	};

	// ------------------------------------------------------------------------- the live parts

	/** The walls that hold a specimen: inside thicker stretches, about one wall in eight. */
	const hosts: Array<{ x: number; y: number; ph: number; kind: number }> = [];
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++) {
			if (!isWall(x, y)) continue;
			const n = SIDES.filter(([dx, dy]) => isWall(x + dx, y + dy)).length;
			if (n >= 2 && hash(x * 3.1, y * 1.7) < 0.14 && x > 1 && y > 1 && x < W - 2 && y < H - 2)
				hosts.push({ x, y, ph: hash(x, y) * TAU, kind: Math.floor(hash(y, x) * 3) });
		}
	/** How awake a host is: its eyes open as the hero comes within three tiles. */
	const awake = new Map<number, number>();

	function specimenIn(c: Ctx, cx: number, cy: number, s: number, t: number, ph: number, kind: number, lean: [number, number]): void {
		c.save();
		c.translate(cx + lean[0] * s * 0.18, cy + lean[1] * s * 0.18);
		c.rotate(Math.sin(t * 0.35 + ph) * 0.4);
		c.fillStyle = 'rgba(3, 9, 6, 0.85)';
		c.strokeStyle = 'rgba(3, 9, 6, 0.85)';
		c.lineCap = 'round';
		c.beginPath();
		c.ellipse(0, 0, s * 0.18, s * 0.14, 0, 0, TAU);
		c.fill();
		const limbs = kind === 0 ? 5 : kind === 1 ? 3 : 7;
		for (let i = 0; i < limbs; i++) {
			const a = (i / limbs) * TAU + Math.sin(t * 0.8 + i + ph) * 0.25;
			c.lineWidth = s * (kind === 2 ? 0.035 : 0.06);
			c.beginPath();
			c.moveTo(Math.cos(a) * s * 0.1, Math.sin(a) * s * 0.1);
			c.quadraticCurveTo(
				Math.cos(a + 0.6) * s * 0.26,
				Math.sin(a + 0.6) * s * 0.26,
				Math.cos(a + 1.1) * s * (kind === 2 ? 0.3 : 0.36),
				Math.sin(a + 1.1) * s * (kind === 2 ? 0.3 : 0.36)
			);
			c.stroke();
		}
		c.restore();
	}

	function draw(ctx: Ctx, infection: number, time: number, hero: { x: number; y: number } | null): void {
		if (infection <= 0.01) return;
		const l = layers(infection);
		ctx.drawImage(l.mass, 0, 0);
		for (let i = 0; i < hosts.length; i++) {
			const h = hosts[i];
			const r = taken(h.x, h.y, infection);
			if (r < 0.9) continue;
			const cx = px(h.x) + T / 2;
			const cy = py(h.y) + T / 2 - 2;
			let lean: [number, number] = [Math.sin(time * 0.3 + h.ph) * 0.3, Math.cos(time * 0.27 + h.ph) * 0.3];
			const a = awake.get(i) ?? 0;
			if (hero && a > 0) {
				const dx = hero.x - (h.x + 0.5);
				const dy = hero.y - (h.y + 0.5);
				const d = Math.hypot(dx, dy) || 1;
				lean = [lean[0] * (1 - a) + (dx / d) * a, lean[1] * (1 - a) + (dy / d) * a];
			}
			specimenIn(ctx, cx, cy, T * (1 + 0.15 * a), time, h.ph, h.kind, lean);
		}
	}

	function drawGlow(ctx: Ctx, infection: number, time: number, hero: { x: number; y: number } | null): void {
		if (infection <= 0.01) return;
		const l = layers(infection);
		ctx.drawImage(l.edges, 0, 0);
		// the breath: a slow ring of light out of the lair, inside the taken walls only
		const period = 7 - 2.5 * infection;
		const reachPx = Math.hypot(W, H) * T * 0.6;
		const ringR = ((time % period) / period) * reachPx;
		ctx.save();
		ctx.clip(l.walls);
		ctx.globalCompositeOperation = 'lighter';
		const w = T * 2.2;
		const rg = ctx.createRadialGradient(LX, LY, Math.max(0, ringR - w), LX, LY, ringR + w);
		rg.addColorStop(0, 'rgba(70, 170, 110, 0)');
		rg.addColorStop(0.5, `rgba(80, 190, 124, ${0.26 * (1 - ringR / reachPx)})`);
		rg.addColorStop(1, 'rgba(70, 170, 110, 0)');
		ctx.fillStyle = rg;
		ctx.fillRect(LX - ringR - w, LY - ringR - w, (ringR + w) * 2, (ringR + w) * 2);
		ctx.restore();
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		// the front glows, unevenly
		for (const f of l.front) {
			const p = 0.55 + 0.45 * Math.sin(time * 1.6 + f.x0 * 0.05 + f.y0 * 0.07);
			ctx.strokeStyle = `rgba(150, 255, 190, ${0.75 * p})`;
			ctx.lineWidth = 1.6;
			ctx.beginPath();
			ctx.moveTo(f.x0, f.y0);
			ctx.lineTo(f.x1, f.y1);
			ctx.stroke();
		}
		ctx.restore();
		// the eyes of the specimens in the walls, opening for the hero
		for (let i = 0; i < hosts.length; i++) {
			const h = hosts[i];
			if (taken(h.x, h.y, infection) < 0.9) continue;
			const near = hero ? Math.hypot(hero.x - (h.x + 0.5), hero.y - (h.y + 0.5)) : 99;
			const want = near < 3 ? 1 : 0;
			const a0 = awake.get(i) ?? 0;
			const a = a0 + (want - a0) * 0.06;
			awake.set(i, a);
			// now and then one blinks open by itself
			const idle = Math.max(0, Math.sin(time * 0.5 + h.ph * 3) - 0.92) * 8;
			const open = Math.max(a, idle);
			if (open < 0.05) continue;
			let dx = 0;
			let dy = 0;
			if (hero) {
				const d = Math.hypot(hero.x - (h.x + 0.5), hero.y - (h.y + 0.5)) || 1;
				dx = (hero.x - (h.x + 0.5)) / d;
				dy = (hero.y - (h.y + 0.5)) / d;
			}
			const cx = px(h.x) + T / 2 + dx * T * 0.16 * a;
			const cy = py(h.y) + T / 2 - 2 + dy * T * 0.16 * a;
			for (const side of [-1, 1]) {
				const ex = cx + side * T * 0.08 + dx * T * 0.05;
				const ey = cy - T * 0.02 + dy * T * 0.05;
				const rg = ctx.createRadialGradient(ex, ey, 0, ex, ey, T * 0.16);
				rg.addColorStop(0, `rgba(214, 255, 150, ${0.9 * open})`);
				rg.addColorStop(1, 'rgba(214, 255, 150, 0)');
				ctx.fillStyle = rg;
				ctx.beginPath();
				ctx.arc(ex, ey, T * 0.16, 0, TAU);
				ctx.fill();
				ctx.fillStyle = `rgba(250, 255, 230, ${open})`;
				ctx.beginPath();
				ctx.ellipse(ex, ey, T * 0.035, T * 0.035 * open + 0.3, 0, 0, TAU);
				ctx.fill();
			}
		}
	}

	return { draw, drawGlow };
}
