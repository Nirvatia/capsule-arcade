// Autumn's holiday scene, Halloween (the owner's pick of the `season-dress` prototype): cobweb
// fans over the walls' outer corners (inside their silhouette, muted, never a light speck) with
// spiders; carved pumpkins whose lid cuts glow and whose light spills on the ground, round the
// hay bales, on the cabins' doorsteps, by the bottom lamps, small ones among the fallen leaves;
// candles; two small graveyards; sheet ghosts lying in the grass looking up; a witch's cauldron
// with a green brew; a big orb web lying over the grass. Live: bat shadows gliding over the
// meadow strips (never over the maze), the brew's bubbles, faint rain rings on the corridor while
// it rains. The rain stays the season's weather; no puddles (the owner's review). The corridor:
// one opaque tone with a contact shadow and grass at the walls' feet, the wet floor holding a
// faint warm band of the wall above.
import {
	bat,
	candle,
	grassGhost,
	headstone,
	lightPool,
	pumpkin,
	shadow,
	spider,
	web,
	windowSpill
} from '../meadow/sceneProps';
import type { C2 } from '../meadow/sceneProps';
import type { FloorTone, SeasonScene } from '../meadow/seasonScene';
import {
	TAU,
	addLight,
	addMark,
	cabinsOf,
	hash,
	outerCorners,
	sceneFloor,
	spot
} from '../meadow/seasonScene';
import { mossAndLeaves } from './autumnDress';
import { WORLD_TILE } from '../../common/worldDecor';

const T = WORLD_TILE;
export const AUTUMN_TONE: FloorTone = { base: '#403c3a', grain: ['#6a625c', '#25211f'], ao: 0.42 };

/** The corridor: the one tone; the wet floor holds a faint warm band of the wall above. */
export const autumnFloor = sceneFloor(AUTUMN_TONE, null, (f, cell) => {
	if (f.isW(cell.r - 1, cell.c)) {
		const g = f.b.createLinearGradient(cell.x, cell.y, cell.x, cell.y + 8);
		g.addColorStop(0, 'rgba(220,130,60,.13)');
		g.addColorStop(1, 'rgba(220,130,60,0)');
		f.b.fillStyle = g;
		f.b.fillRect(cell.x, cell.y, T, 8);
	}
});

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
		b.lineTo(
			x + Math.cos(a) * r * (0.92 + 0.08 * Math.sin(i * 3)),
			y + Math.sin(a) * r * (0.92 + 0.08 * Math.sin(i * 3))
		);
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

export const halloweenScene: SeasonScene = {
	wallDress(f, r) {
		// wet moss on the edges and a few stuck leaves first, the cobwebs over them
		mossAndLeaves(f, r);
		// cobweb fans over the outer corners: the hub sits where the rounded corner's arc is
		// centred, the spokes run out over the corner; the clip keeps them on the stone
		const cs = outerCorners(f, 0.13, 3);
		cs.forEach((cn, i) => {
			const hx = cn.x + cn.sx * 9;
			const hy = cn.y + cn.sy * 9;
			const toCorner = Math.atan2(-cn.sy, -cn.sx);
			const reach = cn.frame ? 21 : 11;
			web(f.b, hx, hy, reach, toCorner - 0.95, toCorner + 0.95);
			if (cn.frame || i % 4 === 1)
				spider(
					f.b,
					hx + Math.cos(toCorner) * reach * 0.45,
					hy + Math.sin(toCorner) * reach * 0.45,
					cn.frame ? 4.4 : 3.4,
					toCorner + r()
				);
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
			if (on) addLight(lit, x, y, r * T * 3.2, '255,140,40', 0.5, true);
		}
	},
	props(f, lit) {
		const b = f.b;
		const taken: Array<[number, number, number]> = [];
		// carved pumpkins on the cabins' doorsteps (the side facing the maze) and their window light
		for (const cb of cabinsOf(f.DEC)) {
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
				if (on) addLight(lit, ex, y, r * T * 3.2, '255,140,40', 0.5, true);
			}
			for (const dy of [-0.32, 0.32])
				windowSpill(
					b,
					cb.x - side * (-w / 2),
					cb.y + dy * h,
					8,
					1.4 * T,
					side,
					0,
					'255,170,80',
					0.3
				);
			// a web over the roof's top corner
			web(
				b,
				cb.x - side * (w / 2 - 6),
				cb.y - h / 2 + 6,
				13,
				side > 0 ? Math.PI + 0.2 : -0.2 - Math.PI / 2,
				side > 0 ? Math.PI * 1.5 - 0.2 : -0.2,
				'rgba(210,206,226,.55)'
			);
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
				const [x, y] = spot(
					f,
					gx + (hash(i, yi) - 0.5) * 2.4,
					gy + 0.1 + (hash(i, yi + 4) - 0.5) * 0.8,
					0.15,
					taken
				);
				candle(b, x, y, 2.1);
				addLight(lit, x, y, T * 0.75, '255,170,70', 0.55, true);
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
			addLight(lit, x, o.y, T * 1.15, '255,140,40', 0.5, true);
		}
		// a witch's cauldron by the left graveyard, its brew's light green (bubbles live)
		{
			const [x, y] = spot(f, -3.2, 15.2, 1.0, taken);
			cauldron(b, x, y, 0.75 * T);
			addLight(lit, x, y, T * 1.6, '120,255,120', 0.45);
			addMark(lit, 'cauldron', x, y, 0);
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
		const k = v.k;
		// the cauldron's bubbles: rise (grow) and pop (fade) slowly, out of step
		for (const g of v.lit.marks.values()) {
			if (g.kind !== 'cauldron') continue;
			for (let i = 0; i < 5; i += 1) {
				const q = (t * 0.6 + i * 0.21) % 1;
				const a = i * 2.3 + Math.floor(t * 0.6 + i * 0.21) * 1.7;
				const d = 0.25 * T * ((i * 0.37) % 1);
				ctx.fillStyle = `rgba(210,255,170,${(0.7 * Math.sin(Math.PI * q)).toFixed(3)})`;
				ctx.beginPath();
				ctx.arc(
					v.ox + (g.x + Math.cos(a) * d) * k,
					v.oy + (g.y + Math.sin(a) * d) * k,
					(0.8 + 2.2 * q) * k,
					0,
					TAU
				);
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
			bat(
				ctx,
				v.ox + wx * k,
				v.oy + wy * k,
				T * 0.62 * k,
				a + (left ? Math.PI / 2 : -Math.PI / 2),
				flap,
				`rgba(12,8,18,${(0.32 + 0.1 * v.night).toFixed(2)})`
			);
		}
		// rain rings on the corridor floor while it rains: few, small, faint
		if (v.storm > 0.05) {
			ctx.save();
			ctx.strokeStyle = 'rgba(200,214,226,1)';
			ctx.lineWidth = Math.max(0.6, 0.5 * k);
			for (let i = 0; i < 26; i += 1) {
				const life = 1.1;
				const q = (t / life + hash(i, 1)) % 1;
				const gen = Math.floor(t / life + hash(i, 1));
				const r0 = Math.floor(hash(i * 13 + gen, 2) * v.grid.length);
				const c0 = Math.floor(hash(i * 7 + gen, 3) * v.grid[0].length);
				if (v.grid[r0]?.[c0] !== 'DT' && v.grid[r0]?.[c0] !== 'EU') continue;
				const x = v.ox + (c0 + 0.5) * T * k;
				const y = v.oy + (r0 + 0.5) * T * k;
				ctx.globalAlpha = 0.3 * v.storm * (1 - q);
				ctx.beginPath();
				ctx.ellipse(x, y, (2 + 7 * q) * k, (1.4 + 5 * q) * k, 0, 0, TAU);
				ctx.stroke();
			}
			ctx.restore();
		}
	}
};
