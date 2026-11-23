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

/** One puddle: a few overlapping ovals of dark water with a sky sheen and a lit lower rim. */
function puddle(b: C2, x: number, y: number, rx: number, ry: number, k: () => number): void {
	const parts: Array<[number, number, number, number]> = [[x, y, rx, ry]];
	for (let i = 0; i < 2; i += 1) {
		parts.push([
			x + (k() - 0.5) * rx,
			y + (k() - 0.5) * ry,
			rx * (0.45 + k() * 0.3),
			ry * (0.5 + k() * 0.3)
		]);
	}
	const shape = new Path2D();
	for (const [px, py, prx, pry] of parts) {
		shape.moveTo(px + prx, py);
		shape.ellipse(px, py, prx, pry, 0, 0, TAU);
	}
	// the damp rim, then the water
	b.save();
	b.strokeStyle = 'rgba(14,10,8,.4)';
	b.lineWidth = 1.6;
	b.stroke(shape);
	const g = b.createLinearGradient(x - rx, y - ry, x + rx, y + ry);
	// the water holds the overcast sky: lighter and cooler than the ground round it
	g.addColorStop(0, 'rgba(92,106,130,.82)');
	g.addColorStop(1, 'rgba(150,166,190,.72)');
	b.fillStyle = g;
	b.fill(shape);
	b.clip(shape);
	// the sky's sheen along the lower right, a thin bright line where the far bank catches light
	b.strokeStyle = 'rgba(232,240,250,.6)';
	b.lineWidth = 0.8;
	b.beginPath();
	b.ellipse(x - 0.8, y - 0.8, rx, ry, 0, 0.05 * TAU, 0.3 * TAU);
	b.stroke();
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
	// corridor puddles: small, pressed against a wall, beside the dot, never over it
	const isPath = (r: number, c: number) => {
		const t = S[r]?.[c];
		return t !== undefined && t !== 'WL' && t !== 'ES' && !LAIR.has(t);
	};
	for (let r = 0; r < f.R; r += 1) {
		for (let c = 0; c < f.C; c += 1) {
			if (!isPath(r, c) || f.isW(r, c) || hash(r * 53 + c * 11, 21) > 0.13) continue;
			const k = rng(hash(r * 3 + c * 71, 8) * 1e6);
			const x = c * T;
			const y = r * T;
			const sides: Array<[number, number, number, number]> = [];
			if (f.isW(r - 1, c)) sides.push([x + T / 2, y + 3.6, 6 + k() * 3, 2.7]);
			if (f.isW(r + 1, c)) sides.push([x + T / 2, y + T - 3.6, 6 + k() * 3, 2.7]);
			if (f.isW(r, c - 1)) sides.push([x + 3.6, y + T / 2, 2.7, 6 + k() * 3]);
			if (f.isW(r, c + 1)) sides.push([x + T - 3.6, y + T / 2, 2.7, 6 + k() * 3]);
			if (!sides.length) continue;
			const [px, py, rx, ry] = sides[(k() * sides.length) | 0];
			const sx = rx > ry ? (k() - 0.5) * 5 : 0;
			const sy = ry > rx ? (k() - 0.5) * 5 : 0;
			puddle(b, px + sx, py + sy, rx, ry, k);
			out.push([px + sx, py + sy, Math.max(rx, ry)]);
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
		puddle(b, x, y, rad * T * 0.85, rad * T * 0.55, k);
		out.push([x, y, rad * T * 0.8]);
	});
	return out;
}
