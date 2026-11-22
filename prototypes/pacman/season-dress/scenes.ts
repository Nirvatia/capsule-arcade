// The season scenes: each season a finished holiday scene on the same meadow and the same layout
// (the pond and the stream stay where they are; no river), not a recolour or stickers.
//   autumn  Halloween: cobweb fans over the walls' outer corners (inside their silhouette, muted),
//           spiders, carved pumpkins whose lid cuts glow and whose light spills on the ground,
//           candles, two small graveyards, sheet ghosts lying in the grass looking up, bat shadows
//           gliding over the meadow (live), a delicate wet sheen and rain rings (no puddles)
//   winter  New Year: a decorated tree beside each snowman (seen from above: layered branches,
//           baubles, a spiral of lights, the star at the centre) with presents, strings of lights
//           round the cabins' roofs and on the bridge's rails, warm window light on the snow,
//           holly on the lamps, sparklers stuck in the snow (live); the accepted winter walls,
//           floor and bauble are untouched
//   spring  A Hanami: blankets and paper lanterns under the blossoming trees, petal carpets,
//           petals on the walls' tops; B Easter: nests with painted eggs, baskets by the blanket,
//           bunny tracks through the grass, tulips
//   summer  A beach: towels, sandcastles, swim rings and sand round the umbrellas, gull shadows
//           (live); B fair: striped tents, festoon lights on poles, balloons, a carousel (live),
//           bunting along the maze's frame
// Everything sits on a surface and is seen from above. Static things are baked; the live layer is
// small sprites only (glows that breathe slower than 3 times a second, a few moving shadows).
import type { GridMatrix } from '../../../src/games/pacman/config/gridConfig';
import type { MeadowFrame } from '../../../src/games/pacman/render/seasons/meadow/MeadowBake';
import type { BakeKit, MeadowPathCell } from '../../../src/games/pacman/render/seasons/meadow/MeadowTheme';
import type { WorldDecor } from '../../../src/games/pacman/render/common/worldDecor';
import { T, TAU, floorCell, rng } from './common';
import type { FloorTone } from './common';
import type { Bulb, C2 } from './props';
import { balloons, bat, blanket, candle, egg, gift, grassGhost, headstone, lightPool, lights, nest, newYearTree, paperLantern, pumpkin, sandcastle, shadow, spider, swimRing, tent, umbrella, web, windowSpill } from './props';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/** A light the live layer keeps alive: world units, radius, colour, how it breathes. */
export interface Glow {
	readonly x: number;
	readonly y: number;
	readonly r: number;
	readonly rgb: string;
	readonly a: number;
	readonly ph: number;
	/** Breaths per second (<= 1: nothing flashes). */
	readonly hz: number;
}

export interface Lit {
	readonly bulbs: Map<string, Bulb>;
	readonly glows: Map<string, Glow>;
}

export interface LiveView {
	readonly ox: number;
	readonly oy: number;
	/** Screen px per world unit. */
	readonly k: number;
	readonly night: number;
	readonly storm: number;
	readonly vw: number;
	readonly vh: number;
	readonly grid: GridMatrix;
	readonly lit: Lit;
}

export interface Scene {
	readonly id: string;
	readonly season: Season;
	readonly name: string;
	/** The corridor: one opaque tone (season-dress, accepted); none keeps the theme's own (winter). */
	readonly floor?: FloorTone;
	/** Grass at the walls' feet. */
	readonly feet?: readonly [string, string, string];
	/** More on a corridor cell, after the tone. */
	cell?(f: MeadowFrame, cell: MeadowPathCell): void;
	/** On the walls, run inside their silhouette (`onWalls`). */
	wallDress?(f: MeadowFrame, r: () => number): void;
	/** Changes to the theme's bake with the props layer (e.g. every tree in blossom). */
	readonly bake?: Partial<MeadowFrame['P']>;
	/** After the theme's landmark, round it. */
	landmark?(k: BakeKit, o: WorldDecor, lit: Lit, i: number): void;
	/** After the walls: the props on the meadow (never on the maze). */
	props?(f: MeadowFrame, lit: Lit): void;
	/** Over the finished frame, every frame. */
	live?(ctx: C2, t: number, v: LiveView): void;
}

// ------------------------------------------------------------------------- shared helpers

const hash = (i: number, k = 0) => {
	const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
	return v - Math.floor(v);
};
const key = (x: number, y: number) => `${x.toFixed(1)},${y.toFixed(1)}`;
const addGlow = (lit: Lit, g: Glow) => lit.glows.set(key(g.x, g.y), g);
const addBulbs = (lit: Lit, bs: Bulb[]) => bs.forEach((b) => lit.bulbs.set(key(b.x, b.y), b));

/** How much room a decor object takes (world units). */
const roomOf = (o: WorldDecor) => (o.k === 'cabin' ? Math.max(o.w ?? 0, o.h ?? 0) * 0.62 : o.k === 'pond' ? (o.rx ?? 0) * 1.2 : o.k === 'tree' ? (o.r ?? 0) * 1.15 : o.k === 'fl' ? 0 : (o.r ?? T * 0.6) * 1.1);

/**
 * The nearest free place to (tx, ty) (tiles) for a thing of radius `rad` (tiles): off the maze
 * (and a margin round it), off the stream, clear of the decor. World units.
 */
export function spot(f: { DEC: readonly WorldDecor[]; R: number; C: number }, tx: number, ty: number, rad: number, taken: Array<[number, number, number]> = []): [number, number] {
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

/** Draws the glows and bulbs for the live layer: dim by day, bright at night, breathing slowly. */
function glowLayer(ctx: C2, t: number, v: LiveView, day = 0.25): void {
	const k = v.k;
	ctx.save();
	ctx.globalCompositeOperation = 'lighter';
	const vis = day + (1 - day) * v.night;
	for (const g of v.lit.glows.values()) {
		// (markers with no light of their own: the sparklers, the carousel)
		if (g.a <= 0) continue;
		const br = 0.82 + 0.18 * Math.sin(TAU * (g.hz * t + g.ph));
		const r = g.r * k;
		const x = v.ox + g.x * k;
		const y = v.oy + g.y * k;
		const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
		gr.addColorStop(0, `rgba(${g.rgb},${(g.a * vis * br).toFixed(3)})`);
		gr.addColorStop(1, `rgba(${g.rgb},0)`);
		ctx.fillStyle = gr;
		ctx.fillRect(x - r, y - r, r * 2, r * 2);
	}
	for (const b of v.lit.bulbs.values()) {
		// each bulb breathes at half a beat a second, out of step with its neighbours
		const br = 0.55 + 0.45 * Math.sin(TAU * (0.45 * t + b.ph));
		const r = 4.2 * k;
		const x = v.ox + b.x * k;
		const y = v.oy + b.y * k;
		const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
		gr.addColorStop(0, `rgba(${b.rgb},${(0.75 * vis * br).toFixed(3)})`);
		gr.addColorStop(1, `rgba(${b.rgb},0)`);
		ctx.fillStyle = gr;
		ctx.fillRect(x - r, y - r, r * 2, r * 2);
	}
	ctx.restore();
}

/** Grass at the walls' feet: a few short blades on the floor's edge, never in the middle. */
function feetGrass(f: MeadowFrame, cell: MeadowPathCell, cols: readonly [string, string, string]): void {
	const { b, isW } = f;
	const { x, y, r, c, k } = cell;
	b.lineCap = 'round';
	const blade = (bx: number, by: number, dx: number, dy: number) => {
		b.strokeStyle = cols[Math.floor(k() * 3)];
		b.lineWidth = 0.9;
		b.beginPath();
		b.moveTo(bx, by);
		b.lineTo(bx + dx + (k() - 0.5) * 1.5, by + dy);
		b.stroke();
	};
	if (isW(r, c - 1)) for (let i = 0; i < 4; i += 1) blade(x + 0.5, y + k() * T, 2.5 + k() * 2, (k() - 0.5) * 3);
	if (isW(r - 1, c)) for (let i = 0; i < 4; i += 1) blade(x + k() * T, y + 0.5, (k() - 0.5) * 3, 2.5 + k() * 2);
}

/** The cabins of the meadow (world units), with their size. */
const cabins = (DEC: readonly WorldDecor[]) => DEC.filter((o) => o.k === 'cabin');

/** The walls' outer corners: (corner point, the signs pointing into the block), seeded subset. */
function outerCorners(f: MeadowFrame, share: number, seed: number): Array<{ x: number; y: number; sx: number; sy: number; frame: boolean }> {
	const out: Array<{ x: number; y: number; sx: number; sy: number; frame: boolean }> = [];
	for (let r = 0; r < f.R; r += 1) {
		for (let c = 0; c < f.C; c += 1) {
			if (!f.isW(r, c)) continue;
			const oU = !f.isW(r - 1, c);
			const oD = !f.isW(r + 1, c);
			const oL = !f.isW(r, c - 1);
			const oR = !f.isW(r, c + 1);
			const frame = r <= 1 || c <= 1 || r >= f.R - 2 || c >= f.C - 2;
			const cand: Array<[boolean, number, number, number, number]> = [
				[oU && oL, c * T, r * T, 1, 1],
				[oU && oR, (c + 1) * T, r * T, -1, 1],
				[oD && oL, c * T, (r + 1) * T, 1, -1],
				[oD && oR, (c + 1) * T, (r + 1) * T, -1, -1]
			];
			cand.forEach(([ok, x, y, sx, sy], i) => {
				if (!ok) return;
				const h = hash(r * 31 + c * 7 + i, seed);
				// the maze's own four outer corners always; the rest a seeded share
				const big = frame && (r <= 1 || r >= f.R - 2) && (c <= 1 || c >= f.C - 2);
				if (big || h < share) out.push({ x, y, sx, sy, frame: big });
			});
		}
	}
	return out;
}

/** Whether (x, y) lies within `d` of a wall's outer rounded corner (light things stay off them). */
function nearCorner(f: MeadowFrame, x: number, y: number, d: number): boolean {
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

/** A witch's cauldron from above: a black iron rim, a green brew with bubbles, the green light. */
function cauldron(b: C2, x: number, y: number, r: number): void {
	shadow(b, x, y, r * 1.1, r, 0.45);
	lightPool(b, x, y, r * 3.2, '120,255,120', 0.22);
	for (const a of [0.6, 2.7, 4.6]) {
		// three legs peeking out from under it
		b.fillStyle = '#16141a';
		b.beginPath();
		b.arc(x + Math.cos(a) * r * 1.05, y + Math.sin(a) * r * 1.05, r * 0.14, 0, TAU);
		b.fill();
	}
	const g = b.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.2, x, y, r);
	g.addColorStop(0, '#4a4650');
	g.addColorStop(1, '#141218');
	b.fillStyle = g;
	b.beginPath();
	b.arc(x, y, r, 0, TAU);
	b.fill();
	const brew = b.createRadialGradient(x, y, 0, x, y, r * 0.78);
	brew.addColorStop(0, '#c8ff8a');
	brew.addColorStop(0.6, '#5ad04a');
	brew.addColorStop(1, '#1e6a24');
	b.fillStyle = brew;
	b.beginPath();
	b.arc(x, y, r * 0.78, 0, TAU);
	b.fill();
	b.strokeStyle = 'rgba(200,190,210,.35)';
	b.lineWidth = r * 0.06;
	b.beginPath();
	b.arc(x, y, r * 0.9, 3.4, 4.6);
	b.stroke();
}

/** An orb web laid over the meadow between two trees (seen from above it lies flat): spokes and a spiral. */
function groundWeb(b: C2, x: number, y: number, r: number): void {
	b.save();
	b.strokeStyle = 'rgba(232,232,244,.6)';
	b.lineWidth = 0.6;
	const n = 14;
	for (let i = 0; i < n; i += 1) {
		const a = (i / n) * TAU + 0.1;
		b.beginPath();
		b.moveTo(x, y);
		b.lineTo(x + Math.cos(a) * r * (0.92 + 0.08 * Math.sin(i * 3)), y + Math.sin(a) * r * (0.92 + 0.08 * Math.sin(i * 3)));
		b.stroke();
	}
	b.beginPath();
	for (let i = 0; i <= n * 7; i += 1) {
		const a = (i / n) * TAU + 0.1;
		const rr = r * (0.12 + 0.8 * (i / (n * 7)));
		const sag = 0.94 + 0.06 * Math.cos(i * Math.PI);
		if (i === 0) b.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
		else b.lineTo(x + Math.cos(a) * rr * sag, y + Math.sin(a) * rr * sag);
	}
	b.stroke();
	b.restore();
}

// ---------------------------------------------------------------------------------- autumn

const AUTUMN_TONE: FloorTone = { base: '#403c3a', grain: ['#6a625c', '#25211f'], ao: 0.42 };

const halloween: Scene = {
	id: 'autumn',
	season: 'autumn',
	name: 'осень: Хэллоуин',
	floor: AUTUMN_TONE,
	feet: ['#8a7a3a', '#6e6030', '#a08a44'],
	cell(f, cell) {
		// the wet floor holds a faint warm band of the wall above (delicate: the owner's review)
		if (f.isW(cell.r - 1, cell.c)) {
			const g = f.b.createLinearGradient(cell.x, cell.y, cell.x, cell.y + 8);
			g.addColorStop(0, 'rgba(220,130,60,.13)');
			g.addColorStop(1, 'rgba(220,130,60,0)');
			f.b.fillStyle = g;
			f.b.fillRect(cell.x, cell.y, T, 8);
		}
	},
	wallDress(f, r) {
		// cobweb fans over the outer corners: the hub sits where the rounded corner's arc is
		// centred, the spokes run out over the corner; the clip keeps them on the stone
		const cs = outerCorners(f, 0.13, 3);
		cs.forEach((cn, i) => {
			const hx = cn.x + cn.sx * 9;
			const hy = cn.y + cn.sy * 9;
			const toCorner = Math.atan2(-cn.sy, -cn.sx);
			const reach = cn.frame ? 21 : 11;
			web(f.b, hx, hy, reach, toCorner - 0.95, toCorner + 0.95);
			if (cn.frame || i % 4 === 1) spider(f.b, hx + Math.cos(toCorner) * reach * 0.45, hy + Math.sin(toCorner) * reach * 0.45, cn.frame ? 4.4 : 3.4, toCorner + r());
		});
	},
	landmark(k, o, lit) {
		// pumpkins round the hay bale, the nearest one carved
		const pts: Array<[number, number, number, boolean]> = [
			[1.25, 0.95, 0.42, true],
			[-1.3, 1.05, 0.34, false],
			[0.6, -1.35, 0.28, false]
		];
		for (const [dx, dy, r, on] of pts) {
			const x = o.x + dx * T;
			const y = o.y + dy * T;
			pumpkin(k.b, x, y, r * T, on, dx + dy, Math.atan2(dy, dx));
			if (on) addGlow(lit, { x, y, r: r * T * 3.2, rgb: '255,140,40', a: 0.5, ph: hash(x), hz: 0.35 });
		}
	},
	props(f, lit) {
		const b = f.b;
		const taken: Array<[number, number, number]> = [];
		// carved pumpkins on the cabins' doorsteps (the side facing the maze) and their window light
		for (const cb of cabins(f.DEC)) {
			const w = cb.w ?? 0;
			const h = cb.h ?? 0;
			const side = cb.x < 0 ? 1 : -1;
			const ex = cb.x + side * (w / 2 + 0.7 * T);
			for (const [dy, r, on] of [
				[-0.9, 0.42, true],
				[0.95, 0.36, true],
				[0.1, 0.26, false]
			] as const) {
				const y = cb.y + dy * T;
				pumpkin(b, ex + (on ? 0 : side * 0.5 * T), y, r * T, on, dy * 3, side > 0 ? 0 : Math.PI);
				if (on) addGlow(lit, { x: ex, y, r: r * T * 3.2, rgb: '255,140,40', a: 0.5, ph: hash(y), hz: 0.3 });
			}
			for (const dy of [-0.32, 0.32]) windowSpill(b, cb.x - side * (-w / 2), cb.y + dy * h, 8, 1.4 * T, side, 0, '255,170,80', 0.3);
			// a web over the roof's top corner
			web(b, cb.x - side * (w / 2 - 6), cb.y - h / 2 + 6, 13, side > 0 ? Math.PI + 0.2 : -0.2 - Math.PI / 2, side > 0 ? Math.PI * 1.5 - 0.2 : -0.2, 'rgba(210,206,226,.55)');
		}
		// two small graveyards on the meadow strips, candles among them, a ghost lying in the grass
		const yards: ReadonlyArray<readonly [number, number]> = [
			[-5.2, 17.5],
			[29.6, 8.5]
		];
		yards.forEach(([gx, gy], yi) => {
			const stones: ReadonlyArray<readonly [number, number, boolean]> = [
				[-1.2, -0.9, false],
				[0, -1.1, false],
				[1.2, -0.85, false],
				[-0.7, 0.7, true],
				[0.8, 0.75, true]
			];
			for (const [dx, dy, flat] of stones) {
				const [x, y] = spot(f, gx + dx, gy + dy, 0.45, taken);
				headstone(b, x, y, T * (flat ? 0.55 : 0.75), (hash(x, 2) - 0.5) * 0.3, flat);
			}
			for (let i = 0; i < 4; i += 1) {
				const [x, y] = spot(f, gx + (hash(i, yi) - 0.5) * 2.4, gy + 0.1 + (hash(i, yi + 4) - 0.5) * 0.8, 0.15, taken);
				candle(b, x, y, 2.1);
				addGlow(lit, { x, y, r: T * 0.75, rgb: '255,170,70', a: 0.55, ph: hash(i, yi + 9), hz: 0.8 + hash(i) * 0.5 });
			}
			const [x, y] = spot(f, gx + (yi ? -1.6 : 1.9), gy + 2.2, 0.7, taken);
			grassGhost(b, x, y, T * 0.62, yi ? 0.4 : -0.3);
		});
		// a third ghost and pumpkins by the bottom lamps
		{
			const [x, y] = spot(f, -2.4, 11.5, 0.7, taken);
			grassGhost(b, x, y, T * 0.55, 0.2);
		}
		for (const o of f.DEC) {
			if (o.k !== 'lamp' || o.y < 0) continue;
			const x = o.x + (o.x < 0 ? -0.9 : 0.9) * T;
			pumpkin(b, x, o.y - 0.1 * T, 0.36 * T, true, o.x, 0);
			addGlow(lit, { x, y: o.y, r: T * 1.15, rgb: '255,140,40', a: 0.5, ph: hash(o.x), hz: 0.33 });
		}
		// a witch's cauldron by the left graveyard, its brew's light green (bubbles live)
		{
			const [x, y] = spot(f, -3.2, 15.2, 1.0, taken);
			cauldron(b, x, y, 0.75 * T);
			addGlow(lit, { x, y, r: T * 1.6, rgb: '120,255,120', a: 0.45, ph: 0.3, hz: 0.2 });
			addGlow(lit, { x, y, r: 0.001, rgb: 'cauldron', a: 0, ph: 0, hz: 0 });
		}
		// a big orb web lying over the grass on the right, a spider at its heart
		{
			const [x, y] = spot(f, 30.2, 3.2, 1.5, taken);
			groundWeb(b, x, y, 1.45 * T);
			spider(b, x + 2, y + 1, 7, 0.6);
		}
		// small pumpkins among a share of the fallen-leaf patches
		for (const o of f.DEC) {
			if (o.k !== 'fl' || hash(o.x, o.y) > 0.28) continue;
			pumpkin(b, o.x + 6, o.y + 4, (0.2 + 0.08 * hash(o.y)) * T, false, o.x * 0.1);
		}
	},
	live(ctx, t, v) {
		glowLayer(ctx, t, v, 0.3);
		const k = v.k;
		// the cauldron's bubbles: rise (grow) and pop (fade) slowly, out of step
		for (const g of v.lit.glows.values()) {
			if (g.rgb !== 'cauldron') continue;
			for (let i = 0; i < 5; i += 1) {
				const q = (t * 0.6 + i * 0.21) % 1;
				const a = i * 2.3 + Math.floor(t * 0.6 + i * 0.21) * 1.7;
				const d = 0.25 * T * ((i * 0.37) % 1);
				ctx.fillStyle = `rgba(210,255,170,${(0.7 * Math.sin(Math.PI * q)).toFixed(3)})`;
				ctx.beginPath();
				ctx.arc(v.ox + (g.x + Math.cos(a) * d) * k, v.oy + (g.y + Math.sin(a) * d) * k, (0.8 + 2.2 * q) * k, 0, TAU);
				ctx.fill();
			}
		}
		// bat shadows gliding on the meadow strips (never over the maze), slow loops
		const L = v.grid[0].length * T;
		const H = v.grid.length * T;
		for (let i = 0; i < 4; i += 1) {
			const left = i % 2 === 0;
			const cx = left ? -6 * T : L + 6 * T;
			const cy = H * (0.25 + 0.22 * i);
			const a = t * (0.35 + 0.05 * i) * (left ? 1 : -1) + i * 1.7;
			const wx = cx + Math.cos(a) * 3.2 * T;
			const wy = cy + Math.sin(a * 1.3) * 2.2 * T;
			const flap = 0.5 + 0.5 * Math.sin(t * 2.6 + i * 1.3);
			bat(ctx, v.ox + wx * k, v.oy + wy * k, T * 0.62 * k, a + (left ? Math.PI / 2 : -Math.PI / 2), flap, `rgba(12,8,18,${(0.32 + 0.1 * v.night).toFixed(2)})`);
		}
		// rain rings on the corridor floor while it rains: few, small, faint
		if (v.storm > 0.05) {
			ctx.save();
			ctx.strokeStyle = 'rgba(200,214,226,1)';
			ctx.lineWidth = Math.max(0.6, 0.5 * k);
			for (let i = 0; i < 14; i += 1) {
				const life = 1.1;
				const q = (t / life + hash(i, 1)) % 1;
				const gen = Math.floor(t / life + hash(i, 1));
				const r0 = Math.floor(hash(i * 13 + gen, 2) * v.grid.length);
				const c0 = Math.floor(hash(i * 7 + gen, 3) * v.grid[0].length);
				if (v.grid[r0]?.[c0] !== 'DT' && v.grid[r0]?.[c0] !== 'EU') continue;
				const x = v.ox + (c0 + 0.5) * T * k;
				const y = v.oy + (r0 + 0.5) * T * k;
				ctx.globalAlpha = 0.22 * v.storm * (1 - q);
				ctx.beginPath();
				ctx.ellipse(x, y, (2 + 7 * q) * k, (1.4 + 5 * q) * k, 0, 0, TAU);
				ctx.stroke();
			}
			ctx.restore();
		}
	}
};

// ---------------------------------------------------------------------------------- winter

const newYear: Scene = {
	id: 'winter',
	season: 'winter',
	name: 'зима: Новый год',
	landmark(k, o, lit, i) {
		// the tree stands beside the snowman, the presents under its lower branches
		const side = i === 0 ? -1 : 1;
		const tx = o.x + side * 1.75 * T;
		const ty = o.y - 0.5 * T;
		const R = 1.25 * T;
		addBulbs(lit, newYearTree(k.b, tx, ty, R));
		addGlow(lit, { x: tx, y: ty, r: T * 0.9, rgb: '255,220,120', a: 0.6, ph: 0.2, hz: 0.25 });
		const gifts: ReadonlyArray<readonly [number, number, number, number, string, string]> = [
			[0.75, 1.0, 0.55, 0.45, '#c0303a', '#f4d27a'],
			[1.25, 0.45, 0.42, 0.42, '#2e6fb8', '#f4f4f4'],
			[0.15, 1.3, 0.38, 0.48, '#f0c040', '#c0303a'],
			[-0.65, 1.1, 0.45, 0.36, '#2f8a4a', '#f4d27a']
		];
		for (const [dx, dy, w, h, c0, c1] of gifts) gift(k.b, tx + dx * T, ty + dy * T, w * T, h * T, (dx - dy) * 0.4, c0, c1);
		// two sparklers stuck in the snow by the presents (their sparks are live)
		for (const dx of [1.5, -1.3]) {
			const x = tx + dx * T;
			const y = ty + 1.55 * T;
			k.b.fillStyle = '#5a5a60';
			k.b.beginPath();
			k.b.arc(x, y, 0.9, 0, TAU);
			k.b.fill();
			addGlow(lit, { x, y, r: T * 0.01, rgb: '255,255,255', a: 0, ph: dx, hz: 0 });
		}
	},
	props(f, lit) {
		const b = f.b;
		// strings of lights round the cabins' roofs, warm light from their windows on the snow
		for (const cb of cabins(f.DEC)) {
			const w = cb.w ?? 0;
			const h = cb.h ?? 0;
			const X = cb.x - w / 2;
			const Y = cb.y - h / 2;
			const pts: Array<[number, number]> = [];
			const inset = 2.5;
			for (let i = 0; i <= 40; i += 1) {
				const f2 = i / 40;
				// round the roof's rim, sagging a little between the eaves' corners
				const per = 2 * (w + h);
				let s = f2 * per;
				let x = 0;
				let y = 0;
				if (s < w) [x, y] = [X + s, Y + inset + Math.sin((s / w) * Math.PI) * 1.4];
				else if ((s -= w) < h) [x, y] = [X + w - inset - Math.sin((s / h) * Math.PI) * 1.4, Y + s];
				else if ((s -= h) < w) [x, y] = [X + w - s, Y + h - inset - Math.sin((s / w) * Math.PI) * 1.4];
				else [x, y] = [X + inset + Math.sin(((s - w) / h) * Math.PI) * 1.4, Y + h - (s - w)];
				pts.push([x, y]);
			}
			addBulbs(lit, lights(b, pts, 6, Math.round(cb.x)));
			for (const [px, py, dx, dy] of [
				[X + w, cb.y - h * 0.25, 1, 0],
				[X + w, cb.y + h * 0.25, 1, 0],
				[X, cb.y - h * 0.25, -1, 0],
				[X, cb.y + h * 0.25, -1, 0],
				[cb.x - w * 0.25, Y + h, 0, 1],
				[cb.x + w * 0.25, Y + h, 0, 1]
			] as const) {
				windowSpill(b, px, py, 9, 1.3 * T, dx, dy);
				addGlow(lit, { x: px + dx * 0.6 * T, y: py + dy * 0.6 * T, r: T * 1.1, rgb: '255,190,100', a: 0.32, ph: hash(px, py), hz: 0.12 });
			}
			// a present on the doorstep
			gift(b, cb.x + (cb.x < 0 ? 1 : -1) * (w / 2 + 0.7 * T), cb.y + 0.4 * T, 0.5 * T, 0.42 * T, 0.3, '#c0303a', '#f4d27a');
		}
		// the bridge's rails carry lights too
		for (const o of f.DEC) {
			if (o.k === 'bridge') {
				for (const rx of [o.x - 24, o.x + 24]) addBulbs(lit, lights(b, [[rx, o.y - 34], [rx, o.y + 34]], 6, 3));
			}
			if (o.k === 'lamp') {
				// holly round the lamp: a green ring, red berries
				b.strokeStyle = '#2c6a36';
				b.lineWidth = 2.2;
				b.beginPath();
				b.arc(o.x, o.y, 6.2, 0, TAU);
				b.stroke();
				for (let i = 0; i < 5; i += 1) {
					const a = i * 1.3 + 0.4;
					b.fillStyle = '#d0262e';
					b.beginPath();
					b.arc(o.x + Math.cos(a) * 6.2, o.y + Math.sin(a) * 6.2, 1, 0, TAU);
					b.fill();
				}
				addGlow(lit, { x: o.x, y: o.y, r: T * 1.3, rgb: '255,214,140', a: 0.4, ph: 0, hz: 0.1 });
			}
		}
	},
	live(ctx, t, v) {
		glowLayer(ctx, t, v, 0.35);
		// sparklers: a white-hot point and short sparks turning round it, shimmering slowly
		const k = v.k;
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		for (const g of v.lit.glows.values()) {
			if (g.a !== 0) continue;
			const x = v.ox + g.x * k;
			const y = v.oy + g.y * k;
			const gr = ctx.createRadialGradient(x, y, 0, x, y, 9 * k);
			gr.addColorStop(0, 'rgba(255,240,200,.85)');
			gr.addColorStop(1, 'rgba(255,200,120,0)');
			ctx.fillStyle = gr;
			ctx.fillRect(x - 9 * k, y - 9 * k, 18 * k, 18 * k);
			ctx.strokeStyle = 'rgba(255,236,190,.8)';
			ctx.lineWidth = Math.max(0.6, 0.35 * k);
			ctx.lineCap = 'round';
			for (let i = 0; i < 12; i += 1) {
				const a = i * 0.524 + t * 0.6 + g.ph;
				const len = (3 + 3 * (0.5 + 0.5 * Math.sin(t * 2 + i * 2.1))) * k;
				ctx.beginPath();
				ctx.moveTo(x + Math.cos(a) * 1.5 * k, y + Math.sin(a) * 1.5 * k);
				ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
				ctx.stroke();
			}
		}
		ctx.restore();
	}
};

// ---------------------------------------------------------------------------------- spring

const SPRING_TONE: FloorTone = { base: '#7b5a3d', grain: ['#a47e55', '#4d3623'], ao: 0.32 };
const SPRING_FEET: readonly [string, string, string] = ['#5f9a3a', '#7fb84a', '#4d8230'];

/** Trees near the maze that show (the meadow's strips and the bands above and below it). */
const nearTrees = (f: MeadowFrame, pinkOnly: boolean) => f.DEC.filter((o) => o.k === 'tree' && (!pinkOnly || o.pk) && o.x > -13 * T && o.x < (f.C + 13) * T && o.y > -2 * T && o.y < (f.R + 2) * T);

const hanami: Scene = {
	id: 'spring-hanami',
	season: 'spring',
	name: 'весна A: ханами',
	floor: SPRING_TONE,
	feet: SPRING_FEET,
	// every tree on the meadow in blossom: the green ones turn white-pink
	bake: {
		trees: {
			accent: ['#ffe6ef', '#f5a6c4', '#c85a88'],
			plain: ['#fff4f7', '#f8cadb', '#d98aa8'],
			accentDots: ['rgba(255,255,255,.85)', 'rgba(150,50,90,.5)'],
			plainDots: ['rgba(255,255,255,.9)', 'rgba(170,80,110,.4)'],
			drifts: 'rgba(255,200,220,.5)'
		}
	},
	wallDress(f, r) {
		// fallen petals on the walls' tops: a few, pink, lying flat
		for (let row = 0; row < f.R; row += 1) {
			for (let c = 0; c < f.C; c += 1) {
				if (!f.isW(row, c) || hash(row * 41 + c, 5) > 0.35) continue;
				for (let i = 0; i < 2; i += 1) {
					const x = c * T + 4 + r() * (T - 8);
					const y = row * T + 4 + r() * (T - 8);
					// deep enough not to read as a light speck, and never on an outer corner
					if (nearCorner(f, x, y, 10)) continue;
					f.b.fillStyle = r() < 0.5 ? 'rgba(236,128,170,.9)' : 'rgba(244,156,188,.9)';
					f.b.beginPath();
					f.b.ellipse(x, y, 2.1, 1.2, r() * 3, 0, TAU);
					f.b.fill();
				}
			}
		}
	},
	landmark(k, o, lit) {
		for (const [dx, dy] of [
			[-1.4, -0.9],
			[1.5, 0.8]
		]) {
			const x = o.x + dx * T;
			const y = o.y + dy * T;
			paperLantern(k.b, x, y, 0.32 * T, '#ff9a6a');
			addGlow(lit, { x, y, r: T * 1.0, rgb: '255,170,110', a: 0.5, ph: hash(x), hz: 0.25 });
		}
	},
	props(f, lit) {
		const b = f.b;
		const r = rng(12);
		const trees = nearTrees(f, false);
		// petal carpets under the blossoming trees (the crowns are baked after, over them)
		for (const o of trees) {
			const R = (o.r ?? T) * 1.5;
			for (let i = 0; i < 70; i += 1) {
				const a = r() * TAU;
				const d = Math.sqrt(r()) * R;
				b.fillStyle = r() < 0.5 ? 'rgba(255,196,218,.85)' : 'rgba(255,226,236,.85)';
				b.beginPath();
				b.ellipse(o.x + Math.cos(a) * d + R * 0.2, o.y + Math.sin(a) * d + R * 0.25, 1.8, 1, r() * 3, 0, TAU);
				b.fill();
			}
		}
		// blankets at the lower right of some, lantern strings between neighbours
		const taken: Array<[number, number, number]> = [];
		trees.slice(0, 10).forEach((o, i) => {
			const [x, y] = spot(f, o.x / T + 1.6, o.y / T + 1.4, 0.9, taken);
			blanket(b, x, y, 1.5 * T, 1.1 * T, (hash(i) - 0.5) * 0.6, i % 2 ? '#e8e4f6' : '#f6e8e0', i % 2 ? '#8a7ec8' : '#d86a6a');
		});
		// two long strings of paper lanterns from lamp to lamp, one each side of the maze
		const lamps = f.DEC.filter((o) => o.k === 'lamp');
		for (const side of [-1, 1]) {
			const ends = lamps.filter((o) => (side < 0 ? o.x < 0 : o.x > 0)).sort((p, q2) => p.y - q2.y);
			if (ends.length < 2) continue;
			const [a, c] = [ends[0], ends[ends.length - 1]];
			b.strokeStyle = 'rgba(40,30,20,.55)';
			b.lineWidth = 0.6;
			b.beginPath();
			b.moveTo(a.x, a.y);
			b.lineTo(c.x, c.y);
			b.stroke();
			const n = Math.round(Math.hypot(c.x - a.x, c.y - a.y) / (1.7 * T));
			for (let j = 1; j < n; j += 1) {
				const x = a.x + ((c.x - a.x) * j) / n;
				const y = a.y + ((c.y - a.y) * j) / n;
				paperLantern(b, x, y, 0.3 * T, j % 2 ? '#ff7a5a' : '#ffb05a');
				addGlow(lit, { x, y, r: T * 0.85, rgb: '255,170,110', a: 0.45, ph: hash(x, y), hz: 0.25 });
			}
		}
		const pairs = [...trees].sort((p, q2) => p.x - q2.x || p.y - q2.y);
		for (let i = 1; i < pairs.length; i += 1) {
			const a = pairs[i - 1];
			const c = pairs[i];
			if (Math.hypot(a.x - c.x, a.y - c.y) > 9 * T) continue;
			const n = 5;
			for (let j = 1; j < n; j += 1) {
				const x = a.x + ((c.x - a.x) * j) / n;
				const y = a.y + ((c.y - a.y) * j) / n;
				paperLantern(b, x, y, 0.3 * T, j % 2 ? '#ff7a5a' : '#ffb05a');
				addGlow(lit, { x, y, r: T * 0.8, rgb: '255,170,110', a: 0.45, ph: hash(x, y), hz: 0.25 });
			}
			b.strokeStyle = 'rgba(40,30,20,.5)';
			b.lineWidth = 0.5;
			b.beginPath();
			b.moveTo(a.x, a.y);
			b.lineTo(c.x, c.y);
			b.stroke();
		}
	},
	live(ctx, t, v) {
		glowLayer(ctx, t, v, 0.15);
	}
};

const easter: Scene = {
	id: 'spring-easter',
	season: 'spring',
	name: 'весна B: Пасха',
	floor: SPRING_TONE,
	feet: SPRING_FEET,
	landmark(k, o) {
		// a basket of eggs on the blanket
		const x = o.x + 0.4 * T;
		const y = o.y + 0.2 * T;
		shadow(k.b, x, y, 0.5 * T, 0.42 * T, 0.3);
		k.b.fillStyle = '#b4884a';
		k.b.beginPath();
		k.b.ellipse(x, y, 0.5 * T, 0.4 * T, 0, 0, TAU);
		k.b.fill();
		k.b.strokeStyle = '#7a5428';
		k.b.lineWidth = 1;
		k.b.stroke();
		const cols = ['#ff9ac0', '#9ad0ff', '#fff09a', '#b8f0a0', '#e0b0ff'];
		for (let i = 0; i < 5; i += 1) egg(k.b, x + (i - 2) * 0.17 * T, y + ((i % 2) - 0.5) * 0.16 * T, 0.2 * T, i * 0.6, cols[i], '#ffffff');
	},
	props(f) {
		const b = f.b;
		const taken: Array<[number, number, number]> = [];
		const nests: Array<[number, number]> = [];
		const cols = ['#ff9ac0', '#9ad0ff', '#fff09a', '#b8f0a0', '#e0b0ff', '#ffc08a'];
		for (const [tx, ty] of [
			[-4.5, 9],
			[-6, 20],
			[29.5, 5.5],
			[30.5, 14],
			[-2.4, 25],
			[27.6, 1.5]
		] as const) {
			const [x, y] = spot(f, tx, ty, 0.7, taken);
			nests.push([x, y]);
			nest(b, x, y, 0.55 * T);
			for (let i = 0; i < 3; i += 1) egg(b, x + (i - 1) * 0.22 * T, y + ((i % 2) - 0.4) * 0.12 * T, 0.22 * T, i * 0.8 + x, cols[(i + Math.round(x)) % cols.length], i % 2 ? '#ffffff' : '#f07090');
		}
		// bunny tracks hopping between the nests: pairs of long hind prints, two small front ones
		for (let i = 1; i < nests.length; i += 1) {
			const [x0, y0] = nests[i - 1];
			const [x1, y1] = nests[i];
			const L = Math.hypot(x1 - x0, y1 - y0);
			// only across the meadow between neighbours: never over the maze
			if (L > 13 * T || Math.sign(x0 - f.C * T * 0.5) !== Math.sign(x1 - f.C * T * 0.5)) continue;
			const a = Math.atan2(y1 - y0, x1 - x0);
			for (let s = 1.2 * T; s < L - 1.2 * T; s += 1.1 * T) {
				const x = x0 + Math.cos(a) * s;
				const y = y0 + Math.sin(a) * s + Math.sin(s / T) * 4;
				b.save();
				b.translate(x, y);
				b.rotate(a);
				b.fillStyle = 'rgba(60,44,30,.35)';
				for (const sy of [-1, 1]) {
					b.beginPath();
					b.ellipse(3, sy * 2.6, 3.2, 1.2, 0, 0, TAU);
					b.fill();
					b.beginPath();
					b.arc(-3.5, sy * 1.1, 1, 0, TAU);
					b.fill();
				}
				b.restore();
			}
		}
		// tulips in small clumps: cups from above (a ring of petals round a dark heart)
		for (const o of f.DEC) {
			if (o.k !== 'fl' || hash(o.x, o.y) > 0.3) continue;
			for (let i = 0; i < 4; i += 1) {
				const x = o.x + (hash(i, o.x) - 0.5) * 14;
				const y = o.y + (hash(i, o.y) - 0.5) * 10;
				const c = ['#e83a5a', '#ffd23a', '#ff7aa8', '#ffffff'][(i + Math.round(o.x)) % 4];
				for (let p = 0; p < 5; p += 1) {
					b.fillStyle = c;
					b.beginPath();
					b.ellipse(x + Math.cos(p * 1.26) * 1.6, y + Math.sin(p * 1.26) * 1.6, 1.9, 1.3, p * 1.26, 0, TAU);
					b.fill();
				}
				b.fillStyle = '#3a2a20';
				b.beginPath();
				b.arc(x, y, 0.8, 0, TAU);
				b.fill();
			}
		}
	}
};

// ---------------------------------------------------------------------------------- summer

const SUMMER_TONE: FloorTone = { base: '#a68b58', grain: ['#cdb27a', '#7a6238'], ao: 0.3 };
const SUMMER_FEET: readonly [string, string, string] = ['#6ea040', '#88b84e', '#5a8a34'];

const beach: Scene = {
	id: 'summer-beach',
	season: 'summer',
	name: 'лето A: пляж',
	floor: SUMMER_TONE,
	feet: SUMMER_FEET,
	landmark(k, o, _lit, i) {
		// sand round the umbrella, towels, a bucket and a sandcastle
		const b = k.b;
		const g = b.createRadialGradient(o.x, o.y, 0, o.x, o.y, 2.6 * T);
		g.addColorStop(0, 'rgba(232,206,146,.95)');
		g.addColorStop(0.7, 'rgba(226,198,136,.8)');
		g.addColorStop(1, 'rgba(226,198,136,0)');
		b.fillStyle = g;
		b.beginPath();
		b.ellipse(o.x, o.y, 2.6 * T, 2.1 * T, 0.3, 0, TAU);
		b.fill();
		const s = i ? -1 : 1;
		blanket(b, o.x + s * 1.3 * T, o.y + 0.9 * T, 1.6 * T, 0.75 * T, 0.2 * s, '#ffffff', i ? '#2a8ad0' : '#e04a5a');
		sandcastle(b, o.x - s * 1.3 * T, o.y + 1.0 * T, 0.55 * T);
		swimRing(b, o.x + s * 0.3 * T, o.y - 1.5 * T, 0.38 * T, i ? '#ff7a3a' : '#3ac0e0');
		umbrella(b, o.x - s * 1.4 * T, o.y - 1.1 * T, 0.75 * T, '#ffd23a', '#ffffff');
	},
	props(f) {
		const b = f.b;
		const taken: Array<[number, number, number]> = [];
		for (const [tx, ty, c0] of [
			[-4.8, 14, '#2a8ad0'],
			[29.8, 11, '#e04a5a'],
			[-6.5, 23, '#3ab070']
		] as const) {
			const [x, y] = spot(f, tx, ty, 1.0, taken);
			umbrella(b, x, y, 0.8 * T, c0, '#ffffff');
			blanket(b, x + 0.6 * T, y + 1.2 * T, 1.5 * T, 0.7 * T, 0.15, '#ffffff', c0);
		}
		for (const [tx, ty] of [
			[-3, 19],
			[28.2, 15.5]
		] as const) {
			const [x, y] = spot(f, tx, ty, 0.6, taken);
			sandcastle(b, x, y, 0.5 * T);
		}
	},
	live(ctx, t, v) {
		// gull shadows crossing the meadow, slow
		const k = v.k;
		const L = v.grid[0].length * T;
		for (let i = 0; i < 2; i += 1) {
			const q = (t * 0.05 + i * 0.5) % 1;
			const x = -14 * T + q * (L + 28 * T);
			const y = (6 + i * 12) * T + Math.sin(t * 0.4 + i) * 1.5 * T;
			if (x > -T && x < L + T) continue;
			bat(ctx, v.ox + x * k, v.oy + y * k, T * 0.8 * k, Math.PI / 2, 0.6 + 0.4 * Math.sin(t * 1.4 + i), 'rgba(20,30,40,.2)');
		}
	}
};

const fair: Scene = {
	id: 'summer-fair',
	season: 'summer',
	name: 'лето B: ярмарка',
	floor: SUMMER_TONE,
	feet: SUMMER_FEET,
	wallDress(f) {
		// bunting laid along the top of the maze's frame: small flags in turn
		// (no white flag: it would read as a light speck on the stone)
		const cols = ['#e04a5a', '#e8b828', '#2a8ad0', '#3ab070', '#c060c0'];
		let n = 0;
		for (let c = 1; c < f.C - 1; c += 1) {
			for (const r of [1, f.R - 2]) {
				if (!f.isW(r, c)) continue;
				for (let j = 0; j < 3; j += 1) {
					const x = c * T + 4 + j * 7;
					const y = r * T + T / 2;
					const dn = r === 1 ? 1 : -1;
					if (nearCorner(f, x, y, 11)) continue;
					f.b.fillStyle = cols[n++ % cols.length];
					f.b.beginPath();
					f.b.moveTo(x - 3, y - dn * 3);
					f.b.lineTo(x + 3, y - dn * 3);
					f.b.lineTo(x, y + dn * 4);
					f.b.closePath();
					f.b.fill();
				}
				f.b.strokeStyle = 'rgba(40,30,20,.6)';
				f.b.lineWidth = 0.5;
				f.b.beginPath();
				f.b.moveTo(c * T, r * T + T / 2 - (r === 1 ? 3 : -3));
				f.b.lineTo((c + 1) * T, r * T + T / 2 - (r === 1 ? 3 : -3));
				f.b.stroke();
			}
		}
	},
	landmark(k, o, lit, i) {
		// a carousel's base beside the umbrella (its roof turns live)
		const x = o.x + (i ? -1 : 1) * 2.0 * T;
		const y = o.y + 0.2 * T;
		shadow(k.b, x, y, 1.25 * T, 1.15 * T, 0.35);
		k.b.fillStyle = '#7a5a3a';
		k.b.beginPath();
		k.b.arc(x, y, 1.15 * T, 0, TAU);
		k.b.fill();
		addGlow(lit, { x, y, r: 0.001, rgb: 'carousel', a: 0, ph: i, hz: 0 });
	},
	props(f, lit) {
		const b = f.b;
		const taken: Array<[number, number, number]> = [];
		const tents: Array<[number, number]> = [];
		for (const [tx, ty, c0] of [
			[-4.6, 12.5, '#e04a5a'],
			[-4.8, 19.5, '#2a8ad0'],
			[29.6, 8, '#3ab070'],
			[29.8, 14.5, '#e04a5a']
		] as const) {
			const [x, y] = spot(f, tx, ty, 1.1, taken);
			tent(b, x, y, 1.8 * T, c0, '#ffffff');
			tents.push([x, y]);
		}
		// festoons of warm bulbs between the tents, on poles
		for (let i = 1; i < tents.length; i += 1) {
			const [x0, y0] = tents[i - 1];
			const [x1, y1] = tents[i];
			if (Math.hypot(x1 - x0, y1 - y0) > 10 * T) continue;
			for (const [px, py] of [
				[x0, y0 + 1.2 * T],
				[x1, y1 - 1.2 * T]
			]) {
				shadow(b, px, py, 2, 2, 0.4);
				b.fillStyle = '#4a3622';
				b.beginPath();
				b.arc(px, py, 1.6, 0, TAU);
				b.fill();
			}
			const pts: Array<[number, number]> = [];
			for (let j = 0; j <= 10; j += 1) {
				const q = j / 10;
				pts.push([x0 + (x1 - x0) * q + Math.sin(q * Math.PI) * 6, y0 + 1.2 * T + (y1 - 1.2 * T - (y0 + 1.2 * T)) * q]);
			}
			addBulbs(lit, lights(b, pts, 7, i, true));
		}
		for (const [tx, ty] of [
			[-2.8, 9],
			[28, 18],
			[-3.2, 23]
		] as const) {
			const [x, y] = spot(f, tx, ty, 0.6, taken);
			balloons(b, x, y, 0.6 * T, tx);
		}
	},
	live(ctx, t, v) {
		glowLayer(ctx, t, v, 0.12);
		// the carousel's roof: striped, turning slowly (0.08 turns a second)
		const k = v.k;
		for (const g of v.lit.glows.values()) {
			if (g.rgb !== 'carousel') continue;
			const x = v.ox + g.x * k;
			const y = v.oy + g.y * k;
			const R = 1.05 * T * k;
			const n = 12;
			const spin = t * 0.5;
			// the canopy's scalloped valance, then the striped roof
			for (let i = 0; i < n; i += 1) {
				const a = spin + ((i + 0.5) / n) * TAU;
				ctx.fillStyle = i % 2 ? '#ffd23a' : '#e04a5a';
				ctx.beginPath();
				ctx.arc(x + Math.cos(a) * R, y + Math.sin(a) * R, R * 0.2, 0, TAU);
				ctx.fill();
			}
			for (let i = 0; i < n; i += 1) {
				const a0 = spin + (i / n) * TAU;
				ctx.fillStyle = i % 2 ? '#fff4e0' : '#e04a5a';
				ctx.beginPath();
				ctx.moveTo(x, y);
				ctx.arc(x, y, R, a0, a0 + TAU / n);
				ctx.closePath();
				ctx.fill();
			}
			// lights on the valance, steady, warm
			for (let i = 0; i < n * 2; i += 1) {
				const a = spin + (i / (n * 2)) * TAU;
				ctx.fillStyle = 'rgba(255,240,190,.95)';
				ctx.beginPath();
				ctx.arc(x + Math.cos(a) * R * 1.05, y + Math.sin(a) * R * 1.05, Math.max(0.8, 0.9 * k), 0, TAU);
				ctx.fill();
			}
			ctx.strokeStyle = 'rgba(60,30,20,.6)';
			ctx.lineWidth = Math.max(0.6, 0.6 * k);
			ctx.beginPath();
			ctx.arc(x, y, R, 0, TAU);
			ctx.stroke();
			ctx.fillStyle = '#ffd23a';
			ctx.beginPath();
			ctx.arc(x, y, R * 0.14, 0, TAU);
			ctx.fill();
		}
	}
};

export const SCENES: readonly Scene[] = [halloween, newYear, hanami, easter, beach, fair];
export const sceneOf = (season: Season, concept: string): Scene => SCENES.find((s) => s.season === season && (s.id === season || s.id.endsWith(concept))) ?? SCENES.find((s) => s.season === season) ?? halloween;

/** The corridor cell of a scene: the opaque tone, its contact shadow (`ao` 0 without the shadows layer), grass at the feet. */
export function sceneCell(sc: Scene, f: MeadowFrame, cell: MeadowPathCell, shadows: boolean): void {
	if (!sc.floor) return;
	floorCell(f, cell, shadows ? sc.floor : { ...sc.floor, ao: 0 });
	if (sc.feet) feetGrass(f, cell, sc.feet);
	sc.cell?.(f, cell);
}
