// The cabins as homes (the owner's review, 2026-11-23: the background is a cozy place): a path from
// each door toward the maze (trodden, or stepping stones in the Japanese garden), a low fence round
// the plot with a gap for the path, a bench by the door, a woodpile against the wall, two small
// lamps along the path that light the ground as pools at night. Baked after the decor, so the
// trees overhang it; the scene's props lie over it.
import type { MeadowFrame } from './MeadowBake';
import { TAU, addLight, rng } from './seasonScene';
import { WORLD_TILE } from '../../common/worldDecor';

const T = WORLD_TILE;

export interface HomesteadStyle {
	/** The path's ground and its darker edge. */
	readonly path: string;
	readonly pathEdge: string;
	/** Stepping stones instead of a trodden path. */
	readonly stones?: string;
	readonly fence: string;
	/** Snow on the posts and the rails' tops (winter). */
	readonly snow?: string;
	readonly wood: string;
}

export function homestead(f: MeadowFrame, s: HomesteadStyle): void {
	const { b, DEC, blob, shade } = f;
	const r = rng(73);
	const mx0 = -0.6 * T;
	const my0 = -0.6 * T;
	const mx1 = (f.C + 0.6) * T;
	const my1 = (f.R + 0.6) * T;
	for (const o of DEC) {
		if (o.k !== 'cabin') continue;
		const w = o.w ?? 0;
		const h = o.h ?? 0;
		// the door faces the maze: the side of the cabin nearest to it
		const cx = Math.max(mx0, Math.min(mx1, o.x));
		const cy = Math.max(my0, Math.min(my1, o.y));
		const dx = cx - o.x;
		const dy = cy - o.y;
		const side = Math.abs(dx / w) > Math.abs(dy / h) ? (dx > 0 ? 'e' : 'w') : dy > 0 ? 's' : 'n';
		const doorX = side === 'e' ? o.x + w / 2 : side === 'w' ? o.x - w / 2 : o.x;
		const doorY = side === 's' ? o.y + h / 2 : side === 'n' ? o.y - h / 2 : o.y;
		// the path's end: where the meadow meets the maze's margin, toward the door
		const endX =
			side === 'e'
				? Math.min(doorX + 6 * T, mx0)
				: side === 'w'
					? Math.max(doorX - 6 * T, mx1)
					: doorX;
		const endY =
			side === 's'
				? Math.min(doorY + 6 * T, my0)
				: side === 'n'
					? Math.max(doorY - 6 * T, my1)
					: doorY;
		const qx = (doorX + endX) / 2 + (side === 's' || side === 'n' ? T * 0.8 : 0);
		const qy = (doorY + endY) / 2 + (side === 'e' || side === 'w' ? T * 0.8 : 0);
		const at = (t: number): [number, number] => [
			(1 - t) * (1 - t) * doorX + 2 * (1 - t) * t * qx + t * t * endX,
			(1 - t) * (1 - t) * doorY + 2 * (1 - t) * t * qy + t * t * endY
		];
		if (s.stones) {
			for (let t = 0.06; t < 1; t += 0.085) {
				const [px, py] = at(t);
				blob(px + 0.8, py + 1, 4.4, 3.4, shade(0.25), 0);
				blob(px, py, 4.2 + r(), 3.2 + r() * 0.6, s.stones, r() * 3);
			}
		} else {
			for (const [wid, col] of [
				[9, s.pathEdge],
				[7, s.path]
			] as const) {
				b.strokeStyle = col;
				b.lineWidth = wid;
				b.lineCap = 'round';
				b.beginPath();
				b.moveTo(doorX, doorY);
				b.quadraticCurveTo(qx, qy, endX, endY);
				b.stroke();
			}
		}
		// the fence round the plot, a gap where the path leaves it
		const m = 0.9 * T;
		const X0 = o.x - w / 2 - m;
		const Y0 = o.y - h / 2 - m;
		const X1 = o.x + w / 2 + m;
		const Y1 = o.y + h / 2 + m;
		const gap = (x: number, y: number) => Math.hypot(x - at(0.18)[0], y - at(0.18)[1]) < T * 0.9;
		const post = (x: number, y: number) => {
			blob(x + 0.8, y + 1, 1.8, 1.4, shade(0.3), 0);
			b.fillStyle = s.fence;
			b.fillRect(x - 1.3, y - 1.3, 2.6, 2.6);
			if (s.snow) blob(x - 0.3, y - 0.4, 1.3, 1, s.snow, 0);
		};
		const run = (x0: number, y0: number, x1: number, y1: number) => {
			const L = Math.hypot(x1 - x0, y1 - y0);
			const n = Math.max(2, Math.round(L / 7));
			for (let i = 0; i < n; i += 1) {
				const ax = x0 + ((x1 - x0) * i) / n;
				const ay = y0 + ((y1 - y0) * i) / n;
				const bx = x0 + ((x1 - x0) * (i + 1)) / n;
				const by = y0 + ((y1 - y0) * (i + 1)) / n;
				if (gap((ax + bx) / 2, (ay + by) / 2)) continue;
				b.strokeStyle = s.fence;
				b.lineWidth = 1.2;
				b.beginPath();
				b.moveTo(ax, ay);
				b.lineTo(bx, by);
				b.stroke();
				if (s.snow) {
					b.strokeStyle = s.snow;
					b.lineWidth = 0.6;
					b.beginPath();
					b.moveTo(ax, ay - 0.6);
					b.lineTo(bx, by - 0.6);
					b.stroke();
				}
				post(ax, ay);
			}
		};
		run(X0, Y0, X1, Y0);
		run(X1, Y0, X1, Y1);
		run(X1, Y1, X0, Y1);
		run(X0, Y1, X0, Y0);
		// a bench beside the door and a woodpile against the far wall
		const bx = side === 'e' || side === 'w' ? doorX + (side === 'e' ? 3 : -3) : doorX - w * 0.28;
		const by = side === 'n' || side === 's' ? doorY + (side === 's' ? 3.5 : -3.5) : doorY - h * 0.3;
		const horiz = side === 'n' || side === 's';
		blob(bx + 1, by + 1.4, horiz ? 7 : 2.6, horiz ? 2.6 : 7, shade(0.3), 0);
		b.fillStyle = s.wood;
		for (let i = 0; i < 3; i += 1) {
			if (horiz) b.fillRect(bx - 6, by - 1.8 + i * 1.3, 12, 1);
			else b.fillRect(bx - 1.8 + i * 1.3, by - 6, 1, 12);
		}
		if (s.snow) blob(bx, by, horiz ? 5 : 1.6, horiz ? 1.6 : 5, s.snow, 0);
		const wx = side === 'w' ? o.x + w / 2 + 3 : o.x - w / 2 - 3;
		const wy = o.y + h * 0.2;
		blob(wx + 1, wy + 1.5, 3.2, 7, shade(0.3), 0);
		for (let i = 0; i < 6; i += 1) {
			const lx = wx + (i % 2 ? 1.5 : -1.5);
			const ly = wy - 5 + (i >> 1) * 4.2 + (i % 2 ? 2 : 0);
			b.fillStyle = s.wood;
			b.beginPath();
			b.arc(lx, ly, 1.9, 0, TAU);
			b.fill();
			b.fillStyle = 'rgba(235,200,150,.75)';
			b.beginPath();
			b.arc(lx, ly, 1.1, 0, TAU);
			b.fill();
		}
		if (s.snow) blob(wx, wy - 4, 3, 1.6, s.snow, 0);
		// two small lamps along the path, warm pools of light at night
		for (const t of [0.42, 0.82]) {
			const [px, py] = at(t);
			const lx = px + (side === 'e' || side === 'w' ? 0 : 7);
			const ly = py + (side === 'e' || side === 'w' ? 7 : 0);
			blob(lx + 1.2, ly + 1.6, 2.4, 1.8, shade(0.35), 0);
			b.fillStyle = '#3a3430';
			b.beginPath();
			b.arc(lx, ly, 2.2, 0, TAU);
			b.fill();
			b.fillStyle = '#ffe2a0';
			b.beginPath();
			b.arc(lx, ly, 1.2, 0, TAU);
			b.fill();
			addLight(f.lit, lx, ly, 1.3 * T, '255,206,130', 0.7, false);
		}
	}
}
