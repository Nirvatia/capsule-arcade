// Autumn's surfaces (the owner's answers, 2026-11-23): wet leaf litter along the walls' feet as one
// band (no blades); wet moss on the walls' edges and a few leaves stuck to the stone (the cobwebs
// stay); and the ground after rain (`autumnWet`, the theme's `wet` bake, faded in as the storm
// soaks it): everything a step darker, a wet sheen on the stone's lit rims, the roofs and the
// bridge, small puddles in the corridors against the walls (never over the food) and larger ones
// on the meadow. Light from the upper left.
import { LAIR, type MeadowFrame } from '../meadow/MeadowBake';
import { TAU, hash, nearCorner, rng, spot, wallClip } from '../meadow/seasonScene';
import { WORLD_TILE } from '../../common/worldDecor';

const T = WORLD_TILE;
type C2 = CanvasRenderingContext2D;

const LITTER = ['#6e3f1c', '#8a4a1e', '#5a3a1e', '#9a5a22', '#4a3020'];
const STUCK = ['#b8541e', '#d07a2a', '#8e3a18', '#c9962e'];

/** One leaf from above: a pointed oval with a midrib. */
function leaf(b: C2, x: number, y: number, l: number, rot: number, col: string, rib = true): void {
	b.save();
	b.translate(x, y);
	b.rotate(rot);
	b.fillStyle = col;
	b.beginPath();
	b.moveTo(-l, 0);
	b.quadraticCurveTo(0, -l * 0.55, l, 0);
	b.quadraticCurveTo(0, l * 0.55, -l, 0);
	b.fill();
	if (rib) {
		b.strokeStyle = 'rgba(40,20,10,.45)';
		b.lineWidth = 0.35;
		b.beginPath();
		b.moveTo(-l * 0.8, 0);
		b.lineTo(l * 0.8, 0);
		b.stroke();
	}
	b.restore();
}

/** Calls `at(x, y, along, nx, ny)` every `step` units along every open edge of the walls. */
function alongEdges(
	f: MeadowFrame,
	step: number,
	at: (x: number, y: number, horizontal: boolean, nx: number, ny: number) => void
): void {
	for (let r = 0; r < f.R; r += 1) {
		for (let c = 0; c < f.C; c += 1) {
			if (!f.isW(r, c)) continue;
			const x = c * T;
			const y = r * T;
			for (let s = step / 2; s < T; s += step) {
				if (!f.isW(r - 1, c)) at(x + s, y, true, 0, -1);
				if (!f.isW(r + 1, c)) at(x + s, y + T, true, 0, 1);
				if (!f.isW(r, c - 1)) at(x, y + s, false, -1, 0);
				if (!f.isW(r, c + 1)) at(x + T, y + s, false, 1, 0);
			}
		}
	}
}

/**
 * Wet leaf litter at the walls' feet (`paintWalls`'s `foot`, under the stones): a dark damp band
 * round the silhouette and small leaves packed along it, reaching under 2 units into the corridor.
 */
export function leafLitter(f: MeadowFrame): void {
	const { b } = f;
	const r = rng(23);
	b.save();
	b.lineJoin = 'round';
	b.strokeStyle = 'rgba(28,18,12,.42)';
	b.lineWidth = 4.2;
	b.stroke(wallClip(f, 0.6));
	alongEdges(f, 4.2, (x, y, hz, nx, ny) => {
		const off = 0.4 + r() * 1.1;
		const lx = x + nx * off + (hz ? (r() - 0.5) * 2 : 0);
		const ly = y + ny * off + (hz ? 0 : (r() - 0.5) * 2);
		leaf(
			b,
			lx,
			ly,
			1.5 + r() * 0.9,
			(hz ? 0 : Math.PI / 2) + (r() - 0.5) * 1.2,
			LITTER[(r() * 5) | 0],
			false
		);
	});
	b.restore();
}

/**
 * On the walls (the scene's wall dress, clipped): wet moss creeping in from the open edges in
 * patches, a few leaves stuck flat to the stone. Both stay off the outer corners' curve.
 */
export function mossAndLeaves(f: MeadowFrame, r: () => number): void {
	const { b } = f;
	alongEdges(f, 6, (x, y, hz, nx, ny) => {
		if (r() > 0.22 || nearCorner(f, x - nx * 3, y - ny * 3, 12)) return;
		const n = 2 + ((r() * 3) | 0);
		for (let i = 0; i < n; i += 1) {
			const d = 1 + r() * 2.2;
			const mx = x - nx * d + (hz ? (r() - 0.5) * 5 : 0);
			const my = y - ny * d + (hz ? 0 : (r() - 0.5) * 5);
			b.fillStyle = i % 2 ? 'rgba(74,92,38,.8)' : 'rgba(52,70,30,.75)';
			b.beginPath();
			b.ellipse(mx, my, hz ? 2 + r() * 1.6 : 1.2 + r(), hz ? 1.2 + r() : 2 + r() * 1.6, 0, 0, TAU);
			b.fill();
		}
		b.fillStyle = 'rgba(150,170,80,.55)';
		b.beginPath();
		b.arc(x - nx * 1.6, y - ny * 1.6, 0.5, 0, TAU);
		b.fill();
	});
	for (let rr = 0; rr < f.R; rr += 1) {
		for (let c = 0; c < f.C; c += 1) {
			if (!f.isW(rr, c) || hash(rr * 41 + c * 3, 12) > 0.16) continue;
			const k = rng(hash(rr * 5 + c * 29, 4) * 1e6);
			const x = c * T + 6 + k() * (T - 12);
			const y = rr * T + 6 + k() * (T - 12);
			if (nearCorner(f, x, y, 13)) continue;
			b.fillStyle = 'rgba(30,14,6,.3)';
			b.beginPath();
			b.ellipse(x + 0.6, y + 0.8, 3.4, 2, 0, 0, TAU);
			b.fill();
			leaf(b, x, y, 3.2 + k() * 0.8, k() * TAU, STUCK[(k() * 4) | 0]);
		}
	}
}

/** An uneven outline round (x, y): a smooth loop whose radius wanders with a few slow waves. */
function blobPath(x: number, y: number, rx: number, ry: number, k: () => number): Path2D {
	const n = 22;
	const waves: Array<[number, number, number]> = [
		[2, 0.1 + k() * 0.06, k() * TAU],
		[3, 0.07 + k() * 0.05, k() * TAU],
		[5, 0.04 + k() * 0.03, k() * TAU]
	];
	const pts: Array<[number, number]> = [];
	for (let i = 0; i < n; i += 1) {
		const a = (i / n) * TAU;
		let m = 1;
		for (const [f, amp, ph] of waves) m += amp * Math.sin(a * f + ph);
		pts.push([x + Math.cos(a) * rx * m, y + Math.sin(a) * ry * m]);
	}
	const path = new Path2D();
	const mid = (i: number): [number, number] => {
		const [ax, ay] = pts[i % n];
		const [bx, by] = pts[(i + 1) % n];
		return [(ax + bx) / 2, (ay + by) / 2];
	};
	path.moveTo(...mid(0));
	for (let i = 1; i <= n; i += 1) {
		const [cx, cy] = pts[i % n];
		path.quadraticCurveTo(cx, cy, ...mid(i));
	}
	path.closePath();
	return path;
}

/**
 * One puddle from above, always lying wide: an uneven outline, a damp dark ring in the ground
 * round it, the water holding the overcast sky (lighter than the ground), the bank's shade along
 * its upper edge (the water lies lower than the ground) and a bright line where its lower edge
 * catches the light.
 */
function puddle(b: C2, x: number, y: number, rx: number, ry: number, k: () => number): void {
	const shape = blobPath(x, y, rx, ry, k);
	b.save();
	b.lineJoin = 'round';
	b.strokeStyle = 'rgba(16,11,8,.32)';
	b.lineWidth = 3;
	b.stroke(shape);
	b.strokeStyle = 'rgba(16,11,8,.4)';
	b.lineWidth = 1.2;
	b.stroke(shape);
	const g = b.createLinearGradient(x, y - ry, x, y + ry);
	g.addColorStop(0, 'rgba(70,82,104,.9)');
	g.addColorStop(0.45, 'rgba(118,134,160,.82)');
	g.addColorStop(1, 'rgba(160,176,198,.78)');
	b.fillStyle = g;
	b.fill(shape);
	b.clip(shape);
	// the bank's shade on the water's upper edge
	b.strokeStyle = 'rgba(20,24,34,.45)';
	b.lineWidth = 2.4;
	b.translate(0, 1.2);
	b.stroke(shape);
	b.translate(0, -2.2);
	// the lit lower edge
	b.strokeStyle = 'rgba(236,242,250,.55)';
	b.lineWidth = 0.9;
	b.stroke(shape);
	b.translate(0, 1);
	// a streak or two of reflected sky across the water
	b.strokeStyle = 'rgba(220,230,244,.28)';
	b.lineWidth = 0.7;
	b.lineCap = 'round';
	for (let i = 0; i < 2; i += 1) {
		const sy = y + (k() - 0.3) * ry * 0.8;
		const sx = x + (k() - 0.5) * rx * 0.6;
		b.beginPath();
		b.moveTo(sx - rx * 0.35, sy);
		b.lineTo(sx + rx * 0.35, sy);
		b.stroke();
	}
	b.restore();
}

/**
 * The ground after rain (the theme's `wet`): darker everywhere, the stone's lit rims and the
 * roofs and the bridge glistening, puddles in the corridors against the walls (off the dots) and
 * on the meadow (clear of the scene's props). Returns the puddles for the night's reflections.
 */
export function autumnWet(f: MeadowFrame): Array<readonly [number, number, number]> {
	const { b, S } = f;
	const out: Array<readonly [number, number, number]> = [];
	// the whole ground a step darker, a touch cooler
	b.fillStyle = 'rgba(14,12,16,.26)';
	b.fillRect(f.x0, f.y0, f.w, f.h);
	// wet sheen on the stone's lit (top/left) rims
	b.save();
	b.clip(wallClip(f, 0.6));
	b.strokeStyle = 'rgba(255,226,190,.32)';
	b.lineWidth = 0.9;
	b.translate(1.3, 1.3);
	b.stroke(wallClip(f, 0.6));
	b.restore();
	// roofs and the bridge: darker, a glint along the ridge and the planks
	for (const o of f.DEC) {
		if (o.k === 'cabin') {
			const w = o.w ?? 0;
			const h = o.h ?? 0;
			b.fillStyle = 'rgba(10,8,10,.18)';
			b.beginPath();
			b.roundRect(o.x - w / 2, o.y - h / 2, w, h, 4);
			b.fill();
			b.strokeStyle = 'rgba(255,236,210,.35)';
			b.lineWidth = 0.9;
			b.beginPath();
			b.moveTo(o.x - w / 2 + 4, o.y - 1);
			b.lineTo(o.x + w / 2 - 4, o.y - 1);
			b.stroke();
		} else if (o.k === 'bridge') {
			b.fillStyle = 'rgba(10,8,10,.16)';
			b.fillRect(o.x - 24, o.y - 34, 48, 68);
			b.fillStyle = 'rgba(255,236,210,.14)';
			for (let yy = o.y - 34; yy < o.y + 34; yy += 10) b.fillRect(o.x - 22, yy, 44, 0.8);
		}
	}
	// corridor puddles: one tile each, lying wide across the cell (the dot sits on the water),
	// never on an energizer, a few cells apart
	const isPath = (r: number, c: number) => {
		const t = S[r]?.[c];
		return t !== undefined && t !== 'WL' && t !== 'ES' && t !== 'EU' && !LAIR.has(t);
	};
	const wet: Array<[number, number]> = [];
	for (let r = 0; r < f.R; r += 1) {
		for (let c = 0; c < f.C; c += 1) {
			if (!isPath(r, c) || hash(r * 53 + c * 11, 21) > 0.1) continue;
			if (wet.some(([wr, wc]) => Math.abs(wr - r) + Math.abs(wc - c) < 4)) continue;
			wet.push([r, c]);
			const k = rng(hash(r * 3 + c * 71, 8) * 1e6);
			const x = c * T + T / 2 + (k() - 0.5) * 2;
			const y = r * T + T / 2 + (k() - 0.5) * 1.5;
			// small enough that the uneven edge (up to +35 %) and the damp ring stay in the cell;
			// a clip off the walls' faces as a guard (the owner's review: none may touch a wall)
			const rx = T * (0.3 + k() * 0.05);
			const ry = T * (0.19 + k() * 0.04);
			const m = 1.8;
			const cx0 = c * T + (f.isW(r, c - 1) ? m : -T);
			const cy0 = r * T + (f.isW(r - 1, c) ? m : -T);
			const cx1 = (c + 1) * T - (f.isW(r, c + 1) ? m : -T);
			const cy1 = (r + 1) * T - (f.isW(r + 1, c) ? m : -T);
			b.save();
			b.beginPath();
			b.rect(cx0, cy0, cx1 - cx0, cy1 - cy0);
			b.clip();
			puddle(b, x, y, rx, ry, k);
			b.restore();
			out.push([x, y, rx]);
		}
	}
	// meadow puddles, clear of the decor, the scene's lights and marks
	const taken: Array<[number, number, number]> = [];
	for (const L of f.lit.lights.values()) taken.push([L.x, L.y, 1.1]);
	for (const m of f.lit.marks.values()) taken.push([m.x, m.y, 1.1]);
	const targets: Array<[number, number]> = [
		[-2.6, f.R * 0.32],
		[-3.2, f.R * 0.72],
		[f.C + 2.6, f.R * 0.28],
		[f.C + 3.2, f.R * 0.62],
		[f.C * 0.28, f.R + 2.2],
		[f.C * 0.72, f.R + 2.6],
		[f.C * 0.5, -2.2]
	];
	targets.forEach(([tx, ty], i) => {
		const rad = 1 + hash(i, 31) * 0.5;
		const [x, y] = spot(f, tx, ty, rad, taken);
		const k = rng(i * 977 + 5);
		puddle(b, x, y, rad * T * 0.95, rad * T * 0.5, k);
		out.push([x, y, rad * T * 0.8]);
	});
	return out;
}
