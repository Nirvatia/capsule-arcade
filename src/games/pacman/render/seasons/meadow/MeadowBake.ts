// Static meadow world, ported 1:1 from the owner's CLAUDE_GRID_<SEASON> canvas mock-ups:
// the bake is the same code in every season, the colours and three decorations come from
// the season's theme. World units: one maze tile is MEADOW_TILE wide, the maze's top-left
// corner is the origin; cabins, pond, trees and the stream live in the meadow around it.
import type { GridMatrix } from '../../../config/gridConfig';
import { isTeleportToken } from '../../../config/gridConfig';
import { canvasContext, makeCanvas } from '../../common/textures';
import type { BakeKit, MeadowBakeTheme } from './MeadowTheme';
import { WORLD_TILE, streamY, tileRandom, tunnelRowOf, worldDecor } from '../../common/worldDecor';
import { paintDecor } from './meadowBakeDecor';
import { paintWalls } from './meadowBakeWalls';

export const MEADOW_TILE = WORLD_TILE;

export const T = MEADOW_TILE;
export const LAIR: ReadonlySet<string> = new Set(['LT', 'BY', 'IY', 'PY', 'CE', 'DB']);

/**
 * Bakes the static world inside the world-space rect (x0, y0, w, h) at RS canvas pixels
 * per world unit: meadow, stream, decorations, path cells, lair, portals, walls and tree
 * crowns, faded into the background colour at the edge of the world.
 */
export function bakeMeadow(
	S: GridMatrix,
	P: MeadowBakeTheme,
	x0: number,
	y0: number,
	w: number,
	h: number,
	RS: number
): HTMLCanvasElement {
	const f = makeMeadowFrame(S, P, x0, y0, w, h, RS);
	paintGround(f);
	paintStream(f);
	paintDecor(f);
	paintMazeFloor(f);
	paintWalls(f);
	paintTreeCrowns(f);
	paintWorldEdge(f);
	return f.cv;
}

function makeMeadowFrame(
	S: GridMatrix,
	P: MeadowBakeTheme,
	x0: number,
	y0: number,
	w: number,
	h: number,
	RS: number
) {
	const R = S.length;
	const C = S[0].length;
	const BG = P.bg;
	const DEC = worldDecor(R, C, P.landmark.ex, tunnelRowOf(S));
	const isW = (r: number, c: number) => !!S[r] && S[r][c] === 'WL';
	const cv = makeCanvas(Math.ceil(w * RS), Math.ceil(h * RS));
	const b = canvasContext(cv);
	b.scale(RS, RS);
	b.translate(-x0, -y0);
	const X1 = x0 + w;
	const Y1 = y0 + h;
	const vis = (x: number, y: number, m = 70) =>
		x > x0 - m && x < X1 + m && y > y0 - m && y < Y1 + m;
	let sd = 11;
	const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
	const rr = (a: number, c: number) => a + rnd() * (c - a);
	const pick = <V>(a: readonly V[]): V => a[(rnd() * a.length) | 0];
	const shade = (alpha: number) => `rgba(${P.shadow},${alpha})`;
	const lin = (a: number, c: number, d: number, e: number, f: string, g: string) => {
		const q = b.createLinearGradient(a, c, d, e);
		q.addColorStop(0, f);
		q.addColorStop(1, g);
		return q;
	};
	const blob = (x: number, y: number, rx: number, ry: number, col: string, rot?: number) => {
		b.fillStyle = col;
		b.beginPath();
		b.ellipse(x, y, rx, ry, rot ?? rnd() * 3, 0, 7);
		b.fill();
	};
	const rp = (
		x: number,
		y: number,
		w2: number,
		h2: number,
		[a, c, d, e]: readonly [number, number, number, number]
	) => {
		b.beginPath();
		b.moveTo(x + a, y);
		b.lineTo(x + w2 - c, y);
		b.arcTo(x + w2, y, x + w2, y + c, c);
		b.lineTo(x + w2, y + h2 - d);
		b.arcTo(x + w2, y + h2, x + w2 - d, y + h2, d);
		b.lineTo(x + e, y + h2);
		b.arcTo(x, y + h2, x, y + h2 - e, e);
		b.lineTo(x, y + a);
		b.arcTo(x, y, x + a, y, a);
	};
	const fl5 = (x: number, y: number, r: number, col: string, mid: string) => {
		for (let k = 0; k < 5; k++) {
			const a = k * 1.2566 + 0.3;
			blob(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, r * 0.6, r * 0.6, col, 0);
		}
		blob(x, y, r * 0.38, r * 0.38, mid, 0);
	};
	const sph = (x: number, y: number, r: number, c0: string, c1: string) => {
		const g = b.createRadialGradient(x - r * 0.35, y - r * 0.35, 0.5, x, y, r);
		g.addColorStop(0, c0);
		g.addColorStop(1, c1);
		b.fillStyle = g;
		b.beginPath();
		b.arc(x, y, r, 0, 7);
		b.fill();
	};
	const kit: BakeKit = { b, rnd, rr, pick, blob, fl5, sph, lin, shade };

	return {
		S,
		P,
		x0,
		y0,
		w,
		h,
		RS,
		R,
		C,
		BG,
		DEC,
		isW,
		cv,
		b,
		X1,
		Y1,
		vis,
		sd,
		rnd,
		rr,
		pick,
		shade,
		lin,
		blob,
		rp,
		fl5,
		sph,
		kit
	};
}

export type MeadowFrame = ReturnType<typeof makeMeadowFrame>;

/** Ground: one meadow for the whole screen. */
function paintGround(f: MeadowFrame): void {
	const { P, x0, y0, w, h, R, C, BG, b, rnd, rr, pick } = f;
	const q = b.createRadialGradient((C * T) / 2, (R * T) / 2, 0, (C * T) / 2, (R * T) / 2, 38 * T);
	q.addColorStop(0, P.groundCenter);
	q.addColorStop(1, BG);
	b.fillStyle = q;
	b.fillRect(x0, y0, w, h);
	const A = w * h;
	for (let i = 0; i < A / 50000; i++) {
		const x = x0 + rnd() * w;
		const y = y0 + rnd() * h;
		const r = rr(70, 130);
		const g = b.createRadialGradient(x, y, 0, x, y, r);
		const d = i % 2;
		g.addColorStop(0, d ? P.groundBlobs[0] : P.groundBlobs[1]);
		g.addColorStop(1, 'rgba(0,0,0,0)');
		b.fillStyle = g;
		b.fillRect(x - r, y - r, 2 * r, 2 * r);
	}
	for (let i = 0; i < A / 1100; i++) {
		b.strokeStyle = pick(P.grass);
		const x = x0 + rnd() * w;
		const y = y0 + rnd() * h;
		b.lineWidth = 1;
		b.beginPath();
		b.moveTo(x, y);
		b.lineTo(x + rr(-2, 2), y - rr(3, 7));
		b.stroke();
	}
	for (let i = 0; i < A / 8000; i++) {
		const x = x0 + rnd() * w;
		const y = y0 + rnd() * h;
		const L = rr(14, 40);
		b.strokeStyle = P.curls;
		b.lineWidth = 1.4;
		b.beginPath();
		b.moveTo(x, y);
		b.quadraticCurveTo(x + L / 2, y - rr(2, 6), x + L, y);
		b.stroke();
	}
}

/** Stream. */
function paintStream(f: MeadowFrame): void {
	const { P, x0, y0, R, b, X1, Y1, rr } = f;
	const sy = (x: number) => streamY(R, x);
	if (Y1 > sy(x0) - 40 && y0 < sy(x0) + 60) {
		const line = () => {
			b.beginPath();
			for (let x = x0 - 20; x <= X1 + 20; x += 12) {
				if (x === x0 - 20) {
					b.moveTo(x, sy(x));
				} else {
					b.lineTo(x, sy(x));
				}
			}
		};
		b.lineCap = b.lineJoin = 'round';
		for (const [lw, c] of [
			[40, P.stream[0]],
			[32, P.stream[1]],
			[27, P.stream[2]],
			[13, P.stream[3]]
		] as const) {
			b.lineWidth = lw;
			b.strokeStyle = c;
			line();
			b.stroke();
		}
		for (let x = x0; x < X1; x += 16) {
			const y = sy(x) + rr(-9, 9);
			b.strokeStyle = 'rgba(255,255,255,.4)';
			b.lineWidth = 1;
			b.beginPath();
			b.moveTo(x, y);
			b.lineTo(x + rr(6, 14), y);
			b.stroke();
		}
	}
}

/** Path cells, lair floor, gate, portal rings. */
function paintMazeFloor(f: MeadowFrame): void {
	const { S, P, R, C, b, vis, rnd, rr, pick, shade, lin, blob, rp } = f;
	const TP: Array<[number, number, number]> = [];
	for (let r = 0; r < R; r++) {
		for (let c = 0; c < C; c++) {
			const t = S[r][c];
			const x = c * T;
			const y = r * T;
			if (t === 'ES' || t === 'WL' || !vis(x + T / 2, y + T / 2, T)) {
				continue;
			}
			const k = tileRandom(r, c);
			if (LAIR.has(t)) {
				b.fillStyle = P.lair.base;
				b.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
				for (let i = 0; i < 2; i++) {
					for (let j = 0; j < 2; j++) {
						b.fillStyle = P.lair.tiles[(k() * 3) | 0];
						rp(x + (i * T) / 2 + 1, y + (j * T) / 2 + 1, T / 2 - 2, T / 2 - 2, [3, 3, 3, 3]);
						b.fill();
					}
				}
				// a faint sheen only: a bright spot would hide what stands in the lair
				blob(x + k() * T, y + k() * T, 3, 1.4, 'rgba(255,255,255,.18)', 0);
				continue;
			}
			b.fillStyle = P.floor.tiles[(k() * 3) | 0];
			b.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
			for (let i = 0; i < 3; i++) {
				blob(
					x + k() * T,
					y + k() * T,
					0.6 + k() * 1.4,
					0.5 + k(),
					P.floor.specks[(k() * 3) | 0],
					k() * 3
				);
			}
			// the lair gate is live (MeadowWorld.drawGates): it slides open for the Easter egg
			if (isTeleportToken(t)) {
				TP.push([x, y, c]);
			}
		}
	}

	for (const [x, y, c] of TP) {
		const dir = c < C / 2 ? -1 : 1;
		const L = 11 * T;
		const px = x + T / 2;
		const py = y + T / 2;
		for (let i = 0; i < 240; i++) {
			const u = i / 240;
			const xx = px + dir * u * L;
			const yy = py + Math.sin(u * 6 + dir) * 5 * u + rr(-1.2, 1.2);
			const a = u < 0.1 ? 1 : Math.pow(1 - (u - 0.1) / 0.9, 1.5);
			if (vis(xx, yy, 30)) {
				blob(xx, yy, 11 - 5 * u + rr(0, 2), 10 - 4 * u, P.portal.trail(a));
			}
		}
		for (let i = 0; i < 260; i++) {
			const u = rnd();
			const xx = px + dir * u * L;
			const yy = py + Math.sin(u * 6 + dir) * 5 * u + (rnd() < 0.5 ? 1 : -1) * (rr(9, 14) - 5 * u);
			if (u > 0.1 && vis(xx, yy, 10)) {
				b.strokeStyle = pick(P.portal.grass);
				b.lineWidth = 1.2;
				b.beginPath();
				b.moveTo(xx, yy);
				b.lineTo(xx + rr(-3, 3), yy - rr(3, 7));
				b.stroke();
			}
		}
		blob(px + 1.5, py + 2, 10, 9.5, shade(0.38), 0);
		b.fillStyle = lin(x, y, x + T, y + T, P.portal.plate[0], P.portal.plate[1]);
		rp(x + 1.5, y + 1.5, T - 3, T - 3, [6, 6, 6, 6]);
		b.fill();
		b.strokeStyle = 'rgba(255,255,255,.55)';
		b.lineWidth = 1;
		rp(x + 2.5, y + 2.5, T - 5, T - 5, [5, 5, 5, 5]);
		b.stroke();
		const q2 = b.createRadialGradient(px, py, 1, px, py, 8.5);
		q2.addColorStop(0, P.portal.core[0]);
		q2.addColorStop(0.45, P.portal.core[1]);
		q2.addColorStop(1, P.portal.core[2]);
		b.fillStyle = q2;
		b.beginPath();
		b.arc(px, py, 8.5, 0, 7);
		b.fill();
		b.strokeStyle = P.portal.ring;
		b.lineWidth = 1.2;
		b.stroke();
		for (const [dx, dy] of [
			[5, 5],
			[T - 5, 5],
			[5, T - 5],
			[T - 5, T - 5]
		]) {
			blob(x + dx, y + dy, 1.5, 1.2, P.portal.corners, 0);
		}
	}
}

/** Trees: top-down crowns, drawn last so they overhang the meadow. */
function paintTreeCrowns(f: MeadowFrame): void {
	const { P, DEC, b, vis, rr, shade, blob } = f;
	const TR = P.trees;
	for (const o of DEC) {
		const r = o.r ?? 0;
		if (o.k !== 'tree' || !vis(o.x, o.y, r * 2)) {
			continue;
		}
		const k = tileRandom(o.s ?? 0, 7);
		const pal = o.pk ? TR.accent : TR.plain;
		blob(o.x + r * 0.3, o.y + r * 0.4, r * 1.3, r, shade(0.34), 0);
		for (let i = 0; i < 11; i++) {
			const a = i * 0.62 + k() * 2;
			const d = i ? r * (0.3 + k() * 0.45) : 0;
			const px = o.x + Math.cos(a) * d;
			const py = o.y + Math.sin(a) * d;
			const pr = r * (0.36 + k() * 0.2);
			const g = b.createRadialGradient(px - pr * 0.35, py - pr * 0.35, 1, px, py, pr);
			g.addColorStop(0, pal[0]);
			g.addColorStop(0.55, pal[1]);
			g.addColorStop(1, pal[2]);
			b.fillStyle = g;
			b.beginPath();
			b.arc(px, py, pr, 0, 7);
			b.fill();
		}
		for (let i = 0; i < 24; i++) {
			const a = k() * 6.28;
			const d = Math.sqrt(k()) * r * 0.85;
			// same order of draws from k() as the mock-up's argument list: rx, ry, colour
			const rx = 1.2 + k() * 1.4;
			const ry = 1 + k();
			const dots = o.pk ? TR.accentDots : TR.plainDots;
			const light = o.pk ? k() < 0.6 : k() < 0.5;
			blob(
				o.x + Math.cos(a) * d - r * 0.1,
				o.y + Math.sin(a) * d - r * 0.1,
				rx,
				ry,
				light ? dots[0] : dots[1],
				0
			);
		}
		for (let i = 0; i < 8; i++) {
			blob(o.x + rr(0.4, 1.9) * r, o.y + rr(0.2, 1.7) * r, rr(3, 6), rr(1.5, 3), TR.drifts);
		}
	}
}

/** Seamless edge of the world. */
function paintWorldEdge(f: MeadowFrame): void {
	const { x0, y0, w, h, R, C, BG, b, X1, Y1 } = f;
	const X0 = -36 * T;
	const X2 = (C + 36) * T;
	const Y0 = -27 * T;
	const Y2 = (R + 27) * T;
	const F = 6 * T;
	b.fillStyle = BG;
	if (x0 < X0) {
		b.fillRect(x0, y0, X0 - x0, h);
	}
	if (X1 > X2) {
		b.fillRect(X2, y0, X1 - X2, h);
	}
	if (y0 < Y0) {
		b.fillRect(x0, y0, w, Y0 - y0);
	}
	if (Y1 > Y2) {
		b.fillRect(x0, Y2, w, Y1 - Y2);
	}
	for (const [a, c, d, e, f, g, i, j] of [
		[X0, 0, X0 + F, 0, X0, y0, F, h],
		[X2, 0, X2 - F, 0, X2 - F, y0, F, h],
		[0, Y0, 0, Y0 + F, x0, Y0, w, F],
		[0, Y2, 0, Y2 - F, x0, Y2 - F, w, F]
	]) {
		const gr = b.createLinearGradient(a, c, d, e);
		gr.addColorStop(0, BG);
		gr.addColorStop(1, BG + '00');
		b.fillStyle = gr;
		b.fillRect(f, g, i, j);
	}
}
