// Candidate: the station taken by a living black metal, a ferrofluid (the owner's pick of three
// directions, 2026-11-26, after the tanks' murk was dropped). Black as chrome with an oily rainbow
// sheen, it takes the walls from the lair out: it covers their tops, bulges over their edges and
// stands in rows of spikes along them, like a ferrofluid by a magnet; its flat tops pebbled with
// small cones. The corridors stay clean. It senses the hero: the spikes rise in a wave as he
// passes and sink slowly behind him. The squad is the same fluid sculpting a fake of a face out
// of itself (the Pretenders, the mask no longer worn but made), a crown of spikes per kind, its
// sheen in its kind's colour. The rage stays the acid overheat.
import type { GhostKind } from '../../../src/games/pacman/logic/actors/GhostModel';
import type { createB7Scene } from '../../../src/games/pacman/render/station/b7/b7Scene';
import {
	INK,
	PHASE,
	SCALE,
	drawPretender,
	ellipse,
	glow,
	type PretenderOpts
} from '../../../src/games/pacman/render/station/pretender';

type Scene = ReturnType<typeof createB7Scene>;
type Ctx = CanvasRenderingContext2D;

const TAU = Math.PI * 2;
const hash = (a: number, b: number) => {
	const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
	return v - Math.floor(v);
};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (e0: number, e1: number, x: number) => {
	const k = clamp((x - e0) / (e1 - e0), 0, 1);
	return k * k * (3 - 2 * k);
};

// =============================================================================== the walls

export interface Ferro {
	/** The fluid over the walls, under the light map. */
	draw(ctx: Ctx, infection: number, time: number): void;
	/** Its sheen, glints and the spikes (they rise for the hero), over the light map. */
	drawGlow(ctx: Ctx, infection: number, time: number, dt: number, hero: { x: number; y: number } | null): void;
}

export function createFerro(scene: Scene, rows: readonly (readonly string[])[]): Ferro {
	const { TILE: T, MAZE_X, MAZE_Y, STAGE_W, STAGE_H } = scene;
	const H = rows.length;
	const W = rows[0].length;
	const at = (x: number, y: number) => rows[y]?.[x] ?? 'ES';
	const isWall = (x: number, y: number) => at(x, y) === 'WL';
	const corridor = (x: number, y: number) => {
		const t = at(x, y);
		return t !== 'WL' && t !== 'ES' && t !== 'EX';
	};
	const px = (x: number) => MAZE_X + x * T;
	const py = (y: number) => MAZE_Y + y * T;
	let far = 1;
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++) {
			const d = scene.infectionDistance(x, y);
			if (isWall(x, y) && Number.isFinite(d)) far = Math.max(far, d);
		}
	const taken = (x: number, y: number, inf: number) => {
		if (!isWall(x, y)) return 0;
		const d = scene.infectionDistance(x, y);
		if (!Number.isFinite(d)) return inf >= 0.99 ? 1 : 0;
		return clamp((inf * (far + 1.5) - d) / 1.5, 0, 1);
	};
	const SIDES = [
		[0, -1],
		[0, 1],
		[-1, 0],
		[1, 0]
	] as const;

	/** Every wall edge facing a corridor, with its spikes. */
	interface Spike {
		x: number;
		y: number;
		nx: number;
		ny: number;
		tx: number;
		ty: number;
		len: number;
		tilt: number;
		up: number;
	}
	const spikes: Spike[] = [];
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++) {
			if (!isWall(x, y)) continue;
			for (const [dx, dy] of SIDES) {
				if (!corridor(x + dx, y + dy)) continue;
				for (let k = 0; k < 3; k++) {
					const u = (k + 0.5) / 3 + (hash(x * 7 + k, y * 3 + dx + dy * 2) - 0.5) * 0.12;
					spikes.push({
						x: dx === 0 ? px(x) + u * T : dx > 0 ? px(x) + T : px(x),
						y: dy === 0 ? py(y) + u * T : dy > 0 ? py(y) + T : py(y),
						nx: dx,
						ny: dy,
						tx: x,
						ty: y,
						len: 0.7 + hash(x + k, y * 5 + dx) * 0.6,
						tilt: (hash(y + k * 3, x + dy) - 0.5) * 0.5,
						up: 0
					});
				}
			}
		}

	interface Layers {
		mass: HTMLCanvasElement;
		walls: Path2D;
	}
	const baked = new Map<number, Layers>();
	function bake(inf: number): Layers {
		const c = document.createElement('canvas');
		c.width = STAGE_W;
		c.height = STAGE_H;
		const g = c.getContext('2d') as Ctx;
		const walls = new Path2D();
		const body = new Path2D();
		for (let y = 0; y < H; y++)
			for (let x = 0; x < W; x++) {
				const r = taken(x, y, inf);
				if (r <= 0) continue;
				const x0 = px(x);
				const y0 = py(y);
				if (r >= 1) {
					body.rect(x0 - 0.3, y0 - 0.3, T + 0.6, T + 0.6);
					walls.rect(x0, y0, T, T);
					// it bulges over the edges into the corridors a little
					for (const [dx, dy] of SIDES) {
						if (!corridor(x + dx, y + dy)) continue;
						for (let k = 0; k < 3; k++) {
							const u = (k + 0.5) / 3;
							const bx = dx === 0 ? x0 + u * T : dx > 0 ? x0 + T : x0;
							const by = dy === 0 ? y0 + u * T : dy > 0 ? y0 + T : y0;
							const br = T * (0.07 + hash(x * 3 + k, y + dx * 5 + dy) * 0.07);
							body.moveTo(bx + br, by);
							body.arc(bx, by, br, 0, TAU);
						}
					}
				} else {
					// the front: blobs of it creeping over the steel from the taken side
					let sx = 0;
					let sy = 0;
					for (const [dx, dy] of SIDES)
						if (taken(x + dx, y + dy, inf) >= 1) {
							sx += dx;
							sy += dy;
						}
					const n = 4;
					for (let k = 0; k < n; k++) {
						const a = hash(x * 5 + k, y * 9);
						const bx = x0 + T * (0.5 + sx * 0.32 * (1 - r) + (a - 0.5) * 0.7);
						const by = y0 + T * (0.5 + sy * 0.32 * (1 - r) + (hash(y + k, x) - 0.5) * 0.7);
						const br = T * (0.12 + 0.3 * r) * (0.6 + a * 0.6);
						body.moveTo(bx + br, by);
						body.arc(bx, by, br, 0, TAU);
					}
				}
			}
		// the fluid: black chrome, lit from the upper left
		g.save();
		g.clip(body);
		const lg = g.createLinearGradient(MAZE_X, MAZE_Y, MAZE_X + W * T, MAZE_Y + H * T);
		lg.addColorStop(0, '#20232b');
		lg.addColorStop(0.5, '#0b0c10');
		lg.addColorStop(1, '#050608');
		g.fillStyle = lg;
		g.fillRect(0, 0, STAGE_W, STAGE_H);
		// its flat tops pebbled with small cones (the field's pattern)
		for (let y = 0; y < H; y++)
			for (let x = 0; x < W; x++) {
				if (taken(x, y, inf) < 1) continue;
				for (let j = 0; j < 4; j++)
					for (let i = 0; i < 4; i++) {
						const jx = (hash(x * 4 + i, y * 4 + j) - 0.5) * 3;
						const jy = (hash(y * 4 + j, x * 4 + i) - 0.5) * 3;
						const cx = px(x) + (i + 0.5 + (j % 2) * 0.5) * (T / 4.4) + jx;
						const cy = py(y) + (j + 0.5) * (T / 4.2) + jy;
						ellipse(g, cx, cy, 1.5, 1.3, 'rgba(0, 0, 0, 0.5)');
						ellipse(g, cx - 0.5, cy - 0.6, 0.55, 0.45, 'rgba(190, 200, 230, 0.22)');
					}
			}
		g.restore();
		// the chrome rim on the silhouette's upper-left edges: the shape less itself moved down-right
		const rim = document.createElement('canvas');
		rim.width = STAGE_W;
		rim.height = STAGE_H;
		const rg = rim.getContext('2d') as Ctx;
		rg.fillStyle = 'rgba(215, 225, 250, 0.7)';
		rg.fill(body);
		rg.globalCompositeOperation = 'destination-out';
		rg.translate(1.4, 1.4);
		rg.fill(body);
		g.drawImage(rim, 0, 0);
		return { mass: c, walls: body };
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

	function draw(ctx: Ctx, infection: number): void {
		if (infection <= 0.01) return;
		ctx.drawImage(layers(infection).mass, 0, 0);
	}

	function drawGlow(
		ctx: Ctx,
		infection: number,
		time: number,
		dt: number,
		hero: { x: number; y: number } | null
	): void {
		if (infection <= 0.01) return;
		const l = layers(infection);
		// the oily sheen: rainbow bands drifting over it
		ctx.save();
		ctx.clip(l.walls);
		ctx.globalCompositeOperation = 'lighter';
		const sh = (time * 18) % (T * 12);
		const sg = ctx.createLinearGradient(MAZE_X - sh, MAZE_Y, MAZE_X - sh + T * 12, MAZE_Y + T * 7);
		const bands: Array<[number, string]> = [
			[0, 'rgba(0, 0, 0, 0)'],
			[0.18, 'rgba(140, 80, 220, 0.1)'],
			[0.24, 'rgba(0, 0, 0, 0)'],
			[0.5, 'rgba(0, 0, 0, 0)'],
			[0.56, 'rgba(40, 190, 200, 0.09)'],
			[0.62, 'rgba(230, 180, 70, 0.07)'],
			[0.7, 'rgba(0, 0, 0, 0)'],
			[1, 'rgba(0, 0, 0, 0)']
		];
		for (const [o, b] of bands) sg.addColorStop(o, b);
		ctx.fillStyle = sg;
		for (let k = -1; k < Math.ceil((W * T) / (T * 12)) + 2; k++) {
			ctx.save();
			ctx.translate(k * T * 12, 0);
			ctx.fillRect(MAZE_X - T * 12, MAZE_Y - T, T * 12, H * T + T * 2);
			ctx.restore();
		}
		ctx.restore();
		// the spikes along the edges: they rise for him and sink slowly behind
		const shiver = ((time % 5) / 5) * (far + 6) - 3;
		for (const s of spikes) {
			const r = taken(s.tx, s.ty, infection);
			if (r < 1) continue;
			let want = 0;
			if (hero) {
				const d = Math.hypot(hero.x - (s.x - MAZE_X) / T, hero.y - (s.y - MAZE_Y) / T);
				want = Math.exp(-(d * d) / (2 * 1.5 * 1.5));
			}
			const rate = want > s.up ? 10 : 1.6;
			s.up += (want - s.up) * Math.min(1, dt * rate);
			const dist = scene.infectionDistance(s.tx, s.ty);
			const wave = Math.exp(-(((dist - shiver) / 1.2) ** 2)) * 0.25;
			const h = T * (0.12 + 0.08 * s.len + 0.2 * s.up + 0.05 * wave);
			const w = T * (0.07 + 0.02 * s.up);
			// the spike: along the edge's normal, a little tilted
			const ax = s.nx + (s.nx === 0 ? s.tilt : 0);
			const ay = s.ny + (s.ny === 0 ? s.tilt : 0);
			const al = Math.hypot(ax, ay);
			const ux = ax / al;
			const uy = ay / al;
			const tx = s.x + ux * h;
			const ty = s.y + uy * h;
			const ex = -uy * w;
			const ey = ux * w;
			ctx.beginPath();
			ctx.moveTo(s.x + ex, s.y + ey);
			ctx.lineTo(tx, ty);
			ctx.lineTo(s.x - ex, s.y - ey);
			ctx.closePath();
			ctx.fillStyle = '#07080b';
			ctx.fill();
			// its lit side and a glint at the tip
			ctx.beginPath();
			ctx.moveTo(s.x + ex * 0.6, s.y + ey * 0.6);
			ctx.lineTo(tx, ty);
			ctx.strokeStyle = `rgba(200, 210, 240, ${0.35 + 0.4 * s.up})`;
			ctx.lineWidth = 0.8;
			ctx.stroke();
			if (s.up > 0.3) {
				ctx.fillStyle = `rgba(200, 150, 255, ${0.6 * s.up})`;
				ctx.beginPath();
				ctx.arc(tx, ty, 0.9, 0, TAU);
				ctx.fill();
			}
		}
	}

	return { draw, drawGlow };
}

// =============================================================================== the squad

export type CandState = 'hunt' | 'tell' | 'fright' | 'eyes' | 'mimic';
const CALM = 1.075;
/** Its sheen per kind. */
const SHEEN: Record<GhostKind, string> = {
	BLINKY: '255, 96, 72',
	PINKY: '255, 120, 230',
	INKY: '80, 230, 255',
	CLYDE: '255, 190, 70'
};
const FRIGHT_RGB = '96, 120, 255';

function stroke(c: Ctx, color: string, w: number): void {
	c.strokeStyle = color;
	c.lineWidth = w;
	c.lineCap = 'round';
	c.lineJoin = 'round';
	c.stroke();
}

/** The body: a drop of the fluid, its bottom rippling where it flows. */
function traceBlob(c: Ctx, t: number, ph: number): void {
	c.beginPath();
	for (let i = 0; i <= 36; i++) {
		const a = (i / 36) * TAU;
		const bottom = Math.max(0, Math.sin(a));
		const r = 9.4 + Math.sin(a * 5 + t * 6 + ph) * 0.45 * bottom + Math.sin(a * 2 + t * 1.5 + ph) * 0.25;
		const x = Math.cos(a) * r;
		const y = Math.sin(a) * r * (bottom > 0 ? 0.92 : 1) + 0.8;
		if (i === 0) c.moveTo(x, y);
		else c.lineTo(x, y);
	}
	c.closePath();
}

/** Its crown of spikes, per kind; `ext` how far they stand out (1 calm, more in the tell). */
function crown(c: Ctx, kind: GhostKind, o: PretenderOpts, ext: number, ph: number): void {
	const shape: Record<GhostKind, { n: number; len: number; w: number; sweep: number; span: number }> = {
		BLINKY: { n: 5, len: 8.0, w: 1.7, sweep: 0, span: 0.55 },
		PINKY: { n: 6, len: 6.8, w: 1.5, sweep: 0.6, span: 0.6 },
		INKY: { n: 11, len: 4.6, w: 1.0, sweep: 0, span: 0.95 },
		CLYDE: { n: 3, len: 6.4, w: 2.8, sweep: 0, span: 0.45 }
	};
	const s = shape[kind];
	for (let i = 0; i < s.n; i++) {
		const u = s.n === 1 ? 0.5 : i / (s.n - 1);
		const a = -Math.PI / 2 + (u - 0.5) * Math.PI * s.span * 2;
		const sway = Math.sin(o.time * (ext > 1 ? 18 : 2.4) + i * 1.3 + ph) * (ext > 1 ? 0.12 : 0.05);
		const bx = Math.cos(a) * 8.6;
		const by = Math.sin(a) * 8.6 + 0.8;
		const dir = a + s.sweep * -Math.sign(o.lookX || 0.0001) * 0.6 + sway;
		const len = s.len * ext * (0.85 + hash(i, PHASE[kind]) * 0.3);
		const tx = bx + Math.cos(dir) * len;
		const ty = by + Math.sin(dir) * len;
		const ex = -Math.sin(dir) * s.w;
		const ey = Math.cos(dir) * s.w;
		c.beginPath();
		c.moveTo(bx + ex, by + ey);
		c.lineTo(tx, ty);
		c.lineTo(bx - ex, by - ey);
		c.closePath();
		c.fillStyle = '#07080b';
		c.fill();
		stroke(c, INK, 0.6);
		c.beginPath();
		c.moveTo(bx + ex * 0.5, by + ey * 0.5);
		c.lineTo(tx, ty);
		stroke(c, 'rgba(210, 220, 245, 0.55)', 0.45);
	}
}

/** The fake face it sculpts of itself: two dimples for eyes, a carved smile, not quite right. */
function fakeFace(c: Ctx, o: PretenderOpts, rgb: string, tell: boolean, scared: boolean): void {
	const fx = o.lookX * 1.8;
	const fy = o.lookY * 1.4;
	c.save();
	c.translate(fx, fy);
	if (scared) {
		for (const side of [-1, 1]) {
			ellipse(c, side * 3.4, -1.2, 2.3, 2.3, '#e8eeff', 1.0);
			ellipse(c, side * 3.4 + o.lookX * 0.7, -1.2 + o.lookY * 0.7, 0.9, 0.9, INK);
		}
		c.beginPath();
		c.moveTo(-3.4, 4.6);
		for (let i = 1; i <= 6; i++) c.lineTo(-3.4 + i * 1.13, 3.4 + (i % 2 ? 0 : 1.3));
		stroke(c, '#e8eeff', 0.9);
		c.restore();
		return;
	}
	// it does not quite get a face right: the eyes unequal and not level, the smile too wide
	for (const [side, rx, ry, dy] of [
		[-1, 2.7, 3.0, -0.3],
		[1, 1.8, 2.0, 0.6]
	] as const) {
		const ex = side * 3.6;
		const ey = -1.4 + dy;
		// the dimple: dark inside, its lower rim catching the light (it is carved in)
		ellipse(c, ex, ey, rx, ry, 'rgba(0, 0, 0, 0.85)');
		c.beginPath();
		c.ellipse(ex, ey, rx, ry, 0, Math.PI * 0.1, Math.PI * 0.9);
		stroke(c, 'rgba(210, 220, 245, 0.75)', 0.6);
		// a small light deep in it, toward the way it goes
		const lx = ex + o.lookX * 0.8;
		const ly = ey + o.lookY * 0.8;
		glow(c, lx, ly, tell ? 3 : 2.2, `rgba(${tell ? '255, 200, 71' : rgb}, 0.95)`, `rgba(${tell ? '255, 200, 71' : rgb}, 0.3)`);
		ellipse(c, lx, ly, tell ? 0.9 : 0.6, tell ? 0.9 : 0.6, '#fffbe8');
	}
	// the smile, carved: a groove, its lower lip lit; it sags a little, as if melting
	const wide = tell ? 7.4 : 6.4;
	c.beginPath();
	c.moveTo(-wide, 1.8);
	c.bezierCurveTo(-wide * 0.4, tell ? 8.4 : 7.2, wide * 0.5, tell ? 7.0 : 6.0, wide, 3.6);
	stroke(c, 'rgba(0, 0, 0, 0.92)', 1.5);
	c.beginPath();
	c.moveTo(-wide + 0.8, 2.8);
	c.bezierCurveTo(-wide * 0.4, tell ? 9.2 : 8.0, wide * 0.5, tell ? 7.8 : 6.8, wide - 0.6, 4.4);
	stroke(c, 'rgba(210, 220, 245, 0.5)', 0.5);
	// teeth pressed into the groove, as it imagines teeth
	for (let i = 0; i < 6; i++) {
		const u = (i + 0.5) / 6;
		const tx = lerp(-wide + 1.2, wide - 1.2, u);
		const ty = 2.4 + Math.sin(u * Math.PI) * (tell ? 4.2 : 3.4) + u * 0.8;
		ellipse(c, tx, ty, 0.45, 0.6, 'rgba(200, 210, 235, 0.55)');
	}
	const drip = (o.time * 0.6) % 1;
	ellipse(c, 2.2, 5.6 + drip * 2.2, 0.5, 0.7 + drip * 0.5, `rgba(20, 22, 28, ${1 - drip})`);
	c.restore();
}

function blobWalker(c: Ctx, kind: GhostKind, st: CandState, o: PretenderOpts, unit: number, k: number): void {
	const ph = PHASE[kind];
	c.scale(unit * SCALE * CALM, unit * SCALE * CALM);
	const scared = st === 'fright';
	const white = scared && Boolean(o.white);
	const tell = st === 'tell';
	if (scared && !o.flashing) c.translate(Math.sin(o.time * 38 + ph) * 0.4, 0);
	c.translate(0, Math.sin(o.time * 2.4 + ph) * 0.4 * (1 - k) - 0.6);
	const breath = Math.sin(o.time * 2.2 + ph);
	c.scale(1 + 0.03 * breath, 1 - 0.03 * breath);
	const rgb = SHEEN[kind];
	if (!scared) crown(c, kind, o, tell ? 1.5 : 1, ph);
	traceBlob(c, o.time, ph);
	stroke(c, INK, 2.2);
	const g = c.createRadialGradient(-3.4, -3.8, 0.5, 0, 1, 11);
	if (scared) {
		g.addColorStop(0, white ? '#ffffff' : '#8d9fff');
		g.addColorStop(0.5, white ? '#dfe6ff' : '#3a4fd0');
		g.addColorStop(1, white ? '#aebde0' : '#141c60');
	} else {
		g.addColorStop(0, '#3a3f4c');
		g.addColorStop(0.45, '#121419');
		g.addColorStop(1, '#040506');
	}
	traceBlob(c, o.time, ph);
	c.fillStyle = g;
	c.fill();
	c.save();
	traceBlob(c, o.time, ph);
	c.clip();
	if (!scared) {
		// the oily sheen in its kind's colour, sliding over it
		const s = Math.sin(o.time * 0.8 + ph) * 4;
		const sg = c.createLinearGradient(-10 + s, -10, 10 + s, 10);
		sg.addColorStop(0, 'rgba(0, 0, 0, 0)');
		sg.addColorStop(0.45, `rgba(${rgb}, 0.28)`);
		sg.addColorStop(0.6, 'rgba(60, 200, 220, 0.12)');
		sg.addColorStop(1, 'rgba(0, 0, 0, 0)');
		c.fillStyle = sg;
		c.fillRect(-12, -12, 24, 24);
	}
	c.restore();
	// the rim light in its colour and a chrome glint
	c.beginPath();
	c.arc(0, 0.8, 8.8, Math.PI * 0.05, Math.PI * 0.95);
	stroke(c, scared ? 'rgba(200, 210, 255, 0.6)' : `rgba(${rgb}, 0.8)`, 1.1);
	ellipse(c, -4.8, -4.6, 1.8, 1.0, 'rgba(235, 240, 255, 0.85)');
	ellipse(c, -2.6, -6.2, 0.6, 0.4, 'rgba(235, 240, 255, 0.7)');
	fakeFace(c, o, rgb, tell, scared);
}

function halo(c: Ctx, x: number, y: number, tile: number, rgb: string, a: number): void {
	if (a <= 0.01) return;
	const r = tile * 0.8;
	const g = c.createRadialGradient(x, y, 0, x, y, r);
	g.addColorStop(0, `rgba(${rgb}, ${a})`);
	g.addColorStop(0.55, `rgba(${rgb}, ${a * 0.4})`);
	g.addColorStop(1, `rgba(${rgb}, 0)`);
	c.save();
	c.globalCompositeOperation = 'lighter';
	c.fillStyle = g;
	c.beginPath();
	c.arc(x, y, r, 0, TAU);
	c.fill();
	c.restore();
}

/** A ferrofluid Pretender at (x, y), `tile` the tile's size in px. */
export function drawFerroMimic(
	c: Ctx,
	x: number,
	y: number,
	tile: number,
	kind: GhostKind,
	st: CandState,
	o: PretenderOpts
): void {
	if (st === 'eyes') {
		drawPretender(c, x, y, tile, kind, 'eyes', o);
		return;
	}
	const unit = (tile / 25) * 0.78;
	if (st === 'mimic') {
		const k = clamp(o.fold ?? 0, 0, 1);
		halo(c, x, y, tile, SHEEN[kind], 0.3 * (1 - k));
		if (k > 0.55 && o.spore) {
			c.save();
			c.translate(x, y);
			o.spore(c, smooth(0.6, 0.95, k), lerp(0.8, 1, k));
			c.restore();
		}
		if (k > 0.97) return;
		c.save();
		c.globalAlpha *= 1 - smooth(0.72, 0.97, k);
		c.translate(x, y + k * tile * 0.06);
		c.scale(lerp(1, 0.4, k), lerp(1, 0.4, k));
		blobWalker(c, kind, 'hunt', o, unit, k);
		c.restore();
		return;
	}
	halo(c, x, y, tile, st === 'fright' ? FRIGHT_RGB : SHEEN[kind], 0.34);
	c.save();
	c.translate(x, y);
	blobWalker(c, kind, st, o, unit, 0);
	c.restore();
}
