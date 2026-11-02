// Static hell world, ported 1:1 from the CLAUDE_GRID_DOOM_v3 canvas prototype.
// Everything is laid out in world units where one maze tile is DOOM_TILE wide and the
// maze's top-left corner is the origin; decorations live in the meadow around it.
import type { GridMatrix } from '../../config/gridConfig';
import type { Rng } from '../common/worldDecor';
import { WORLD_TILE, streamY, tileRandom, worldDecor } from '../common/worldDecor';
import { paintDecor } from './doomBakeDecor';
import { paintWalls } from './doomBakeWalls';

/** The hell's two landmarks (pentagrams) and how far they keep the scatter away, in tiles. */
export const PENTAGRAM_EX: readonly [number, number] = [2.4, 2.2];

export const DOOM_TILE = WORLD_TILE;
export const DOOM_BG = '#3a1f16';

export const T = DOOM_TILE;
export const LAIR: ReadonlySet<string> = new Set(['LT', 'BY', 'IY', 'PY', 'CE', 'DB']);

/**
 * Paints the world rectangle [x0, x0+w] × [y0, y0+h] (world units) into a new canvas
 * at RS device pixels per world unit.
 */
export function bakeDoomWorld(
	S: GridMatrix,
	x0: number,
	y0: number,
	w: number,
	h: number,
	RS: number
): HTMLCanvasElement {
	const f = makeDoomFrame(S, x0, y0, w, h, RS);
	paintGround(f);
	paintStream(f);
	paintDecor(f);
	paintMazeFloor(f);
	paintWalls(f);
	paintTreeCrowns(f);
	paintWorldEdge(f);
	return f.cv;
}

function makeDoomFrame(S: GridMatrix, x0: number, y0: number, w: number, h: number, RS: number) {
	const R = S.length;
	const C = S[0].length;
	const DEC = worldDecor(R, C, PENTAGRAM_EX);
	const isW = (r: number, c: number): boolean => !!S[r] && S[r][c] === 'WL';
	const cv = document.createElement('canvas');
	cv.width = Math.max(1, Math.ceil(w * RS));
	cv.height = Math.max(1, Math.ceil(h * RS));
	const b = cv.getContext('2d');
	if (!b) {
		throw new Error('bakeDoomWorld: 2d context unavailable');
	}
	b.scale(RS, RS);
	b.translate(-x0, -y0);
	const X1 = x0 + w;
	const Y1 = y0 + h;
	const vis = (x: number, y: number, m = 70): boolean =>
		x > x0 - m && x < X1 + m && y > y0 - m && y < Y1 + m;
	let sd = 11;
	const rnd: Rng = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
	const rr = (a: number, c: number): number => a + rnd() * (c - a);
	const pick = <V>(a: readonly V[]): V => a[(rnd() * a.length) | 0];
	const lin = (a: number, c: number, d: number, e: number, f: string, gg: string) => {
		const q = b.createLinearGradient(a, c, d, e);
		q.addColorStop(0, f);
		q.addColorStop(1, gg);
		return q;
	};
	const blob = (x: number, y: number, rx: number, ry: number, col: string, rot?: number): void => {
		b.fillStyle = col;
		b.beginPath();
		b.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot ?? rnd() * 3, 0, 7);
		b.fill();
	};
	const rp = (
		x: number,
		y: number,
		w2: number,
		h2: number,
		[a, c, d, e]: readonly [number, number, number, number]
	): void => {
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
	const fl5 = (x: number, y: number, r: number, col: string, mid: string): void => {
		for (let k = 0; k < 5; k++) {
			const a = k * 1.2566 + 0.3;
			blob(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, r * 0.6, r * 0.6, col, 0);
		}
		blob(x, y, r * 0.38, r * 0.38, mid, 0);
	};
	const sph = (x: number, y: number, r: number, c0: string, c1: string): void => {
		const gr = b.createRadialGradient(x - r * 0.35, y - r * 0.35, 0.5, x, y, r);
		gr.addColorStop(0, c0);
		gr.addColorStop(1, c1);
		b.fillStyle = gr;
		b.beginPath();
		b.arc(x, y, r, 0, 7);
		b.fill();
	};

	return {
		S,
		x0,
		y0,
		w,
		h,
		RS,
		R,
		C,
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
		lin,
		blob,
		rp,
		fl5,
		sph
	};
}

export type DoomFrame = ReturnType<typeof makeDoomFrame>;

/** Ground: one meadow for the whole screen. */
function paintGround(f: DoomFrame): void {
	const { x0, y0, w, h, R, C, b, rnd, rr, pick } = f;
	const q = b.createRadialGradient((C * T) / 2, (R * T) / 2, 0, (C * T) / 2, (R * T) / 2, 38 * T);
	q.addColorStop(0, '#5a3022');
	q.addColorStop(1, DOOM_BG);
	b.fillStyle = q;
	b.fillRect(x0, y0, w, h);
	const A = w * h;
	for (let i = 0; i < A / 50000; i++) {
		const x = x0 + rnd() * w;
		const y = y0 + rnd() * h;
		const r = rr(70, 130);
		const gr = b.createRadialGradient(x, y, 0, x, y, r);
		const d = i % 2;
		gr.addColorStop(0, d ? 'rgba(255,120,60,.08)' : 'rgba(0,0,0,.12)');
		gr.addColorStop(1, 'rgba(0,0,0,0)');
		b.fillStyle = gr;
		b.fillRect(x - r, y - r, 2 * r, 2 * r);
	}
	for (let i = 0; i < A / 1100; i++) {
		b.strokeStyle = pick(['#2a1208cc', '#5a2a18aa', '#1a0a06cc', '#7a3a22aa']);
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
		b.strokeStyle = 'rgba(255,100,40,.12)';
		b.lineWidth = 1.4;
		b.beginPath();
		b.moveTo(x, y);
		b.quadraticCurveTo(x + L / 2, y - rr(2, 6), x + L, y);
		b.stroke();
	}
}

/** Stream. */
function paintStream(f: DoomFrame): void {
	const { x0, y0, R, b, X1, Y1, rr } = f;
	if (Y1 > streamY(R, x0) - 40 && y0 < streamY(R, x0) + 60) {
		const line = (): void => {
			b.beginPath();
			for (let x = x0 - 20; x <= X1 + 20; x += 12) {
				if (x === x0 - 20) {
					b.moveTo(x, streamY(R, x));
				} else {
					b.lineTo(x, streamY(R, x));
				}
			}
		};
		b.lineCap = 'round';
		b.lineJoin = 'round';
		const layers: ReadonlyArray<readonly [number, string]> = [
			[40, 'rgba(10,2,0,.6)'],
			[32, '#3a1208'],
			[27, '#ff5a1a'],
			[13, 'rgba(255,220,100,.75)']
		];
		for (const [lw, c] of layers) {
			b.lineWidth = lw;
			b.strokeStyle = c;
			line();
			b.stroke();
		}
		for (let x = x0; x < X1; x += 16) {
			const y = streamY(R, x) + rr(-9, 9);
			b.strokeStyle = 'rgba(255,255,255,.4)';
			b.lineWidth = 1;
			b.beginPath();
			b.moveTo(x, y);
			b.lineTo(x + rr(6, 14), y);
			b.stroke();
		}
	}
}

/** Path cells, lair floor, gate, portal pads. */
function paintMazeFloor(f: DoomFrame): void {
	const { S, R, C, b, vis, rnd, rr, pick, lin, blob, rp, fl5 } = f;
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
				b.fillStyle = '#0e0d0d';
				b.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
				for (let i = 0; i < 2; i++) {
					for (let j = 0; j < 2; j++) {
						b.fillStyle = ['#4a4f58', '#454a52', '#50555e'][(k() * 3) | 0];
						rp(x + (i * T) / 2 + 1, y + (j * T) / 2 + 1, T / 2 - 2, T / 2 - 2, [3, 3, 3, 3]);
						b.fill();
					}
				}
				blob(x + k() * T, y + k() * T, 3, 1.4, 'rgba(255,255,255,.9)', 0);
				continue;
			}
			b.fillStyle = ['#211d1b', '#1e1a18', '#252120'][(k() * 3) | 0];
			b.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
			for (let i = 0; i < 3; i++) {
				blob(
					x + k() * T,
					y + k() * T,
					0.6 + k() * 1.4,
					0.5 + k(),
					['#2e2927', '#0f0d0c', '#3a3532'][(k() * 3) | 0],
					k() * 3
				);
			}
			if (t === 'LE') {
				const lf = S[r][c - 1] !== 'LE';
				const rt = S[r][c + 1] !== 'LE';
				b.fillStyle = '#7a5636';
				b.fillRect(x, y + T / 2 - 5, T, 10);
				b.fillStyle = '#a07848';
				for (let i = 0; i < 3; i++) {
					b.fillRect(x, y + T / 2 - 4 + i * 3.3, T, 1.2);
				}
				b.fillStyle = '#4f3622';
				if (lf) {
					b.fillRect(x, y + T / 2 - 6, 4, 12);
				}
				if (rt) {
					b.fillRect(x + T - 4, y + T / 2 - 6, 4, 12);
				}
				if (!lf && !rt) {
					fl5(x + T / 2, y + T / 2 - 5, 2.6, '#d9333a', '#ffffff');
				}
			}
			if (t[0] === '0') {
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
				blob(xx, yy, 11 - 5 * u + rr(0, 2), 10 - 4 * u, `rgba(10,6,6,${a * 0.7})`);
			}
		}
		for (let i = 0; i < 260; i++) {
			const u = rnd();
			const xx = px + dir * u * L;
			const yy = py + Math.sin(u * 6 + dir) * 5 * u + (rnd() < 0.5 ? 1 : -1) * (rr(9, 14) - 5 * u);
			if (u > 0.1 && vis(xx, yy, 10)) {
				b.strokeStyle = pick(['#6a3a28', '#8a4a2a', '#3a2418']);
				b.lineWidth = 1.2;
				b.beginPath();
				b.moveTo(xx, yy);
				b.lineTo(xx + rr(-3, 3), yy - rr(3, 7));
				b.stroke();
			}
		}
		drawTeleporterPad(b, x, y, dir, blob, rp, lin);
	}
}

/** Trees: top-down crowns, drawn last so they overhang the meadow. */
function paintTreeCrowns(f: DoomFrame): void {
	const { DEC, b, vis, rr, blob } = f;
	for (const o of DEC) {
		const r = o.r ?? 0;
		if (o.k !== 'tree' || !vis(o.x, o.y, r * 2)) {
			continue;
		}
		const k = tileRandom(o.s ?? 0, 7);
		const pal = o.pk ? ['#8a2a1a', '#4a1410', '#1a0604'] : ['#4a4038', '#2a2420', '#12100e'];
		blob(o.x + r * 0.3, o.y + r * 0.4, r * 1.3, r, 'rgba(0,0,0,.34)', 0);
		for (let i = 0; i < 11; i++) {
			const a = i * 0.62 + k() * 2;
			const d = i ? r * (0.3 + k() * 0.45) : 0;
			const px = o.x + Math.cos(a) * d;
			const py = o.y + Math.sin(a) * d;
			const pr = r * (0.36 + k() * 0.2);
			const gr = b.createRadialGradient(px - pr * 0.35, py - pr * 0.35, 1, px, py, pr);
			gr.addColorStop(0, pal[0]);
			gr.addColorStop(0.55, pal[1]);
			gr.addColorStop(1, pal[2]);
			b.fillStyle = gr;
			b.beginPath();
			b.arc(px, py, pr, 0, 7);
			b.fill();
		}
		for (let i = 0; i < 24; i++) {
			const a = k() * 6.28;
			const d = Math.sqrt(k()) * r * 0.85;
			blob(
				o.x + Math.cos(a) * d - r * 0.1,
				o.y + Math.sin(a) * d - r * 0.1,
				1.2 + k() * 1.4,
				1 + k(),
				o.pk
					? k() < 0.6
						? 'rgba(255,120,40,.85)'
						: 'rgba(10,0,0,.5)'
					: k() < 0.5
						? 'rgba(120,110,100,.6)'
						: 'rgba(5,5,5,.5)',
				0
			);
		}
		for (let i = 0; i < 8; i++) {
			blob(o.x + rr(0.4, 1.9) * r, o.y + rr(0.2, 1.7) * r, rr(3, 6), rr(1.5, 3), 'rgba(0,0,0,.3)');
		}
	}
}

/** Seamless edge of the world. */
function paintWorldEdge(f: DoomFrame): void {
	const { x0, y0, w, h, R, C, b, X1, Y1 } = f;
	const X0 = -36 * T;
	const X2 = (C + 36) * T;
	const Y0 = -27 * T;
	const Y2 = (R + 27) * T;
	const F = 6 * T;
	b.fillStyle = DOOM_BG;
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
	const edges: ReadonlyArray<readonly number[]> = [
		[X0, 0, X0 + F, 0, X0, y0, F, h],
		[X2, 0, X2 - F, 0, X2 - F, y0, F, h],
		[0, Y0, 0, Y0 + F, x0, Y0, w, F],
		[0, Y2, 0, Y2 - F, x0, Y2 - F, w, F]
	];
	for (const [a, c, d, e, f, gg, i, j] of edges) {
		const gr = b.createLinearGradient(a, c, d, e);
		gr.addColorStop(0, DOOM_BG);
		gr.addColorStop(1, DOOM_BG + '00');
		b.fillStyle = gr;
		b.fillRect(f, gg, i, j);
	}
}

/**
 * Doom-style teleporter pad: a riveted iron frame around a recessed plate with an
 * engraved pentagram, and a chevron pointing into the tunnel. The live layer makes the
 * engraving glow; this is the cold, baked part.
 */
function drawTeleporterPad(
	b: CanvasRenderingContext2D,
	x: number,
	y: number,
	dir: number,
	blob: (x: number, y: number, rx: number, ry: number, col: string, rot?: number) => void,
	rp: (
		x: number,
		y: number,
		w: number,
		h: number,
		r: readonly [number, number, number, number]
	) => void,
	lin: (a: number, c: number, d: number, e: number, f: string, g: string) => CanvasGradient
): void {
	const px = x + T / 2;
	const py = y + T / 2;
	blob(px + 1.5, py + 2.5, 12, 11, 'rgba(0,0,0,.45)', 0);
	// iron frame with a bevel
	b.fillStyle = lin(x, y, x + T, y + T, '#4a4e56', '#141518');
	rp(x + 0.5, y + 0.5, T - 1, T - 1, [2.5, 2.5, 2.5, 2.5]);
	b.fill();
	b.strokeStyle = 'rgba(255,255,255,.35)';
	b.lineWidth = 0.8;
	b.beginPath();
	b.moveTo(x + 1.2, y + T - 2);
	b.lineTo(x + 1.2, y + 1.2);
	b.lineTo(x + T - 2, y + 1.2);
	b.stroke();
	b.strokeStyle = 'rgba(0,0,0,.6)';
	b.beginPath();
	b.moveTo(x + T - 1.2, y + 2);
	b.lineTo(x + T - 1.2, y + T - 1.2);
	b.lineTo(x + 2, y + T - 1.2);
	b.stroke();
	// recessed plate, warm from below
	const inset = 3.6;
	const plate = b.createRadialGradient(px, py, 1, px, py, T / 2);
	plate.addColorStop(0, '#4a0a04');
	plate.addColorStop(0.6, '#1c0503');
	plate.addColorStop(1, '#0a0404');
	b.fillStyle = plate;
	b.fillRect(x + inset, y + inset, T - inset * 2, T - inset * 2);
	b.strokeStyle = 'rgba(0,0,0,.8)';
	b.lineWidth = 1;
	b.strokeRect(x + inset, y + inset, T - inset * 2, T - inset * 2);
	// engraving
	const r = 6.6;
	b.strokeStyle = '#6a160a';
	b.lineWidth = 1.1;
	b.beginPath();
	b.arc(px, py, r, 0, 7);
	b.stroke();
	b.lineWidth = 0.8;
	b.beginPath();
	for (let i = 0; i <= 5; i++) {
		const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
		const ex = px + Math.cos(a) * r * 0.93;
		const ey = py + Math.sin(a) * r * 0.93;
		if (i) {
			b.lineTo(ex, ey);
		} else {
			b.moveTo(ex, ey);
		}
	}
	b.stroke();
	// rivets
	for (const [dx, dy] of [
		[2.2, 2.2],
		[T - 2.2, 2.2],
		[2.2, T - 2.2],
		[T - 2.2, T - 2.2]
	]) {
		blob(x + dx, y + dy, 1.2, 1.2, '#8a9098', 0);
		blob(x + dx - 0.35, y + dy - 0.4, 0.5, 0.4, '#e0e4ea', 0);
	}
	// chevron toward the tunnel
	const cx = dir < 0 ? x + 1.8 : x + T - 1.8;
	b.fillStyle = '#d9a020';
	b.beginPath();
	b.moveTo(cx + dir * 1.4, py);
	b.lineTo(cx - dir * 0.6, py - 2.6);
	b.lineTo(cx - dir * 0.6, py + 2.6);
	b.closePath();
	b.fill();
}
