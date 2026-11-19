import type { GridMatrix } from '../../../src/games/pacman/config/gridConfig';
import { tileRandom } from '../../../src/games/pacman/render/common/worldDecor';
import { LAIR, T } from '../../../src/games/pacman/render/seasons/meadow/MeadowBake';
import type { MeadowFrame } from '../../../src/games/pacman/render/seasons/meadow/MeadowBake';
import type { MeadowPathCell } from '../../../src/games/pacman/render/seasons/meadow/MeadowTheme';
import { paintWalls } from '../../../src/games/pacman/render/seasons/meadow/meadowBakeWalls';

const FLOOR = '#525d6e';
const SNOW = '#f4f9fd';
const SNOW_LIGHT = '#ffffff';
const SNOW_SHADE = 'rgba(128,164,199,.38)';
const SIDES = [
	[0, -1],
	[0, 1],
	[-1, 0],
	[1, 0]
] as const;

interface IcePatch {
	readonly x: number;
	readonly y: number;
	readonly rx: number;
	readonly ry: number;
	readonly horizontal: boolean;
}

interface SurfaceAnalysis {
	readonly lairDistance: number[][];
	readonly edgeDistance: number[][];
	readonly patches: IcePatch[];
	readonly lairBox: { x0: number; y0: number; x1: number; y1: number };
	readonly cracks: Array<Array<readonly [number, number]>>;
}

const analyses = new WeakMap<GridMatrix, SurfaceAnalysis>();

function open(t: string | undefined): boolean {
	return Boolean(t && t !== 'WL' && t !== 'ES');
}

function distances(S: GridMatrix, sources: (r: number, c: number) => boolean): number[][] {
	const R = S.length;
	const C = S[0].length;
	const d = Array.from({ length: R }, () => Array<number>(C).fill(Infinity));
	const queue: Array<[number, number]> = [];
	for (let r = 0; r < R; r++) {
		for (let c = 0; c < C; c++) {
			if (open(S[r][c]) && sources(r, c)) {
				d[r][c] = 0;
				queue.push([r, c]);
			}
		}
	}
	for (let at = 0; at < queue.length; at++) {
		const [r, c] = queue[at]!;
		for (const [dr, dc] of SIDES) {
			const rr = r + dr;
			const cc = c + dc;
			if (!open(S[rr]?.[cc]) || d[rr][cc] !== Infinity) {
				continue;
			}
			d[rr][cc] = d[r][c] + 1;
			queue.push([rr, cc]);
		}
	}
	return d;
}

function analysis(f: MeadowFrame): SurfaceAnalysis {
	const cached = analyses.get(f.S);
	if (cached) {
		return cached;
	}
	const { S, R, C } = f;
	const lairDistance = distances(S, (r, c) => LAIR.has(S[r][c]));
	const edgeDistance = distances(S, (r, c) => !LAIR.has(S[r][c]));
	const patches: IcePatch[] = [];
	let x0 = Infinity;
	let y0 = Infinity;
	let x1 = -Infinity;
	let y1 = -Infinity;
	for (let r = 0; r < R; r++) {
		for (let c = 0; c < C; c++) {
			const t = S[r][c];
			if (LAIR.has(t)) {
				x0 = Math.min(x0, c * T);
				y0 = Math.min(y0, r * T);
				x1 = Math.max(x1, (c + 1) * T);
				y1 = Math.max(y1, (r + 1) * T);
			}
			if (!open(t) || LAIR.has(t)) {
				continue;
			}
			const k = tileRandom(r + 31, c + 17);
			if (k() > 0.035 || patches.length >= 22) {
				continue;
			}
			const horizontal = open(S[r][c - 1]) || open(S[r][c + 1]);
			const long = T * (0.65 + k() * 0.65);
			const short = T * (0.1 + k() * 0.08);
			patches.push({
				x: (c + 0.5) * T,
				y: (r + 0.5) * T,
				rx: horizontal ? long : short,
				ry: horizontal ? short : long,
				horizontal
			});
		}
	}
	const lairBox = { x0, y0, x1, y1 };
	const X = (u: number) => x0 + (x1 - x0) * u;
	const Y = (u: number) => y0 + (y1 - y0) * u;
	const cracks = [
		[[X(0.02), Y(0.18)], [X(0.2), Y(0.28)], [X(0.28), Y(0.45)], [X(0.43), Y(0.53)]],
		[[X(0.98), Y(0.16)], [X(0.8), Y(0.29)], [X(0.72), Y(0.43)]],
		[[X(0.17), Y(0.98)], [X(0.25), Y(0.78)], [X(0.43), Y(0.68)]],
		[[X(0.85), Y(0.98)], [X(0.76), Y(0.8)], [X(0.61), Y(0.7)]]
	] as Array<Array<readonly [number, number]>>;
	const result = { lairDistance, edgeDistance, patches, lairBox, cracks };
	analyses.set(S, result);
	return result;
}

function clamp01(v: number): number {
	return Math.max(0, Math.min(1, v));
}

function iceInfluence(a: SurfaceAnalysis, r: number, c: number, lair: boolean): number {
	if (lair) {
		const d = a.edgeDistance[r]?.[c] ?? 1;
		return 0.68 + 0.32 * clamp01((d - 1) / 2);
	}
	const d = a.lairDistance[r]?.[c] ?? Infinity;
	return 0.68 * (1 - clamp01((d - 1) / 2.2));
}

function paintIcePatches(f: MeadowFrame, cell: MeadowPathCell, a: SurfaceAnalysis): void {
	const { b } = f;
	const { x, y } = cell;
	for (const p of a.patches) {
		if (Math.abs(p.x - (x + T / 2)) > p.rx + T || Math.abs(p.y - (y + T / 2)) > p.ry + T) {
			continue;
		}
		b.save();
		b.translate(p.x, p.y);
		const radius = Math.max(p.rx, p.ry);
		const g = b.createRadialGradient(0, 0, 0, 0, 0, radius);
		g.addColorStop(0, 'rgba(176,211,235,.10)');
		g.addColorStop(0.65, 'rgba(158,198,226,.055)');
		g.addColorStop(1, 'rgba(158,198,226,0)');
		b.fillStyle = g;
		b.beginPath();
		b.ellipse(0, 0, p.rx, p.ry, 0, 0, Math.PI * 2);
		b.fill();
		b.restore();
	}
}

function paintEdgeFrost(f: MeadowFrame, cell: MeadowPathCell): number {
	const { S, b } = f;
	const { r, c, x, y, k } = cell;
	let walls = 0;
	for (const [dr, dc] of SIDES) {
		if (S[r + dr]?.[c + dc] !== 'WL') {
			continue;
		}
		walls++;
		const reach = 5.5;
		const gx = dc < 0 ? x : dc > 0 ? x + T : x;
		const gy = dr < 0 ? y : dr > 0 ? y + T : y;
		const g = b.createLinearGradient(gx, gy, gx - dc * reach, gy - dr * reach);
		g.addColorStop(0, 'rgba(211,231,246,.13)');
		g.addColorStop(1, 'rgba(211,231,246,0)');
		b.fillStyle = g;
		b.fillRect(dc ? (dc < 0 ? x : x + T - reach) : x, dr ? (dr < 0 ? y : y + T - reach) : y, dc ? reach : T, dr ? T : reach);
		if (k() < 0.55) {
			b.fillStyle = 'rgba(225,239,249,.26)';
			b.beginPath();
			b.ellipse(
				dc ? gx + dc * 1.5 : x + 3 + k() * (T - 6),
				dr ? gy + dr * 1.5 : y + 3 + k() * (T - 6),
				1 + k(),
				0.6 + k() * 0.5,
				0,
				0,
				Math.PI * 2
			);
			b.fill();
		}
	}
	return walls;
}

function paintCrystal(f: MeadowFrame, cell: MeadowPathCell, walls: number): void {
	if (walls < 2 || cell.k() > 0.32) {
		return;
	}
	const { S, b } = f;
	const { r, c, x, y, k } = cell;
	const left = S[r][c - 1] === 'WL';
	const up = S[r - 1]?.[c] === 'WL';
	const ox = left ? x + 1.5 : x + T - 1.5;
	const oy = up ? y + 1.5 : y + T - 1.5;
	const sx = left ? 1 : -1;
	const sy = up ? 1 : -1;
	b.strokeStyle = 'rgba(215,235,248,.22)';
	b.lineWidth = 0.65;
	b.beginPath();
	for (let i = 0; i < 3; i++) {
		const d = 3 + i * 2.2;
		b.moveTo(ox, oy + sy * d);
		b.lineTo(ox + sx * (3.5 + k() * 2), oy + sy * (d + 1.5));
		b.moveTo(ox + sx * d, oy);
		b.lineTo(ox + sx * (d + 1.5), oy + sy * (3.5 + k() * 2));
	}
	b.stroke();
}

function paintLairGlaze(f: MeadowFrame, a: SurfaceAnalysis): void {
	const { b } = f;
	const box = a.lairBox;
	const cx = (box.x0 + box.x1) / 2;
	const cy = (box.y0 + box.y1) / 2;
	b.save();
	b.translate(cx, cy);
	b.scale((box.x1 - box.x0) / 2 + 1.8 * T, (box.y1 - box.y0) / 2 + 1.8 * T);
	const g = b.createRadialGradient(0, 0, 0.42, 0, 0, 1);
	g.addColorStop(0, 'rgba(96,116,138,.98)');
	g.addColorStop(0.62, 'rgba(96,116,138,.94)');
	g.addColorStop(0.82, 'rgba(96,116,138,.68)');
	g.addColorStop(1, 'rgba(96,116,138,0)');
	b.fillStyle = g;
	b.beginPath();
	b.arc(0, 0, 1, 0, Math.PI * 2);
	b.fill();
	b.restore();
}

export function paintWinterFloor(f: MeadowFrame, cell: MeadowPathCell): void {
	const { R, C, b } = f;
	const { r, c, x, y, k } = cell;
	const a = analysis(f);
	const lair = LAIR.has(cell.t);
	const influence = iceInfluence(a, r, c, lair);
	b.save();
	b.beginPath();
	b.rect(x - 0.5, y - 0.5, T + 1, T + 1);
	b.clip();
	b.fillStyle = FLOOR;
	b.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
	const broad = b.createLinearGradient(0, 0, C * T, R * T);
	broad.addColorStop(0, 'rgba(202,224,241,.035)');
	broad.addColorStop(0.48, 'rgba(70,88,111,0)');
	broad.addColorStop(1, 'rgba(30,45,65,.035)');
	b.fillStyle = broad;
	b.fillRect(x, y, T, T);
	if (influence > 0) paintLairGlaze(f, a);
	paintIcePatches(f, cell, a);
	const walls = paintEdgeFrost(f, cell);
	paintCrystal(f, cell, walls);
	if (!lair && influence < 0.25 && k() < 0.09) {
		const horizontal = open(f.S[r][c - 1]) || open(f.S[r][c + 1]);
		b.strokeStyle = 'rgba(201,226,244,.19)';
		b.lineWidth = 0.8;
		b.beginPath();
		if (horizontal) {
			const yy = y + 5 + k() * (T - 10);
			b.moveTo(x + 3 + k() * 4, yy);
			b.lineTo(x + T - 3 - k() * 4, yy + (k() - 0.5) * 1.5);
		} else {
			const xx = x + 5 + k() * (T - 10);
			b.moveTo(xx, y + 3 + k() * 4);
			b.lineTo(xx + (k() - 0.5) * 1.5, y + T - 3 - k() * 4);
		}
		b.stroke();
	}
	b.restore();
}

function paintLairRim(f: MeadowFrame, cell: MeadowPathCell): void {
	const { S, b } = f;
	const { r, c, x, y } = cell;
	for (const [dr, dc] of SIDES) {
		const neighbour = S[r + dr]?.[c + dc];
		if (neighbour && LAIR.has(neighbour)) continue;
		const reach = 7;
		const gx = dc < 0 ? x : dc > 0 ? x + T : x;
		const gy = dr < 0 ? y : dr > 0 ? y + T : y;
		const g = b.createLinearGradient(gx, gy, gx - dc * reach, gy - dr * reach);
		g.addColorStop(0, 'rgba(220,237,248,.18)');
		g.addColorStop(1, 'rgba(220,237,248,0)');
		b.fillStyle = g;
		b.fillRect(dc ? (dc < 0 ? x : x + T - reach) : x, dr ? (dr < 0 ? y : y + T - reach) : y, dc ? reach : T, dr ? T : reach);
	}
}

function paintLairCracks(f: MeadowFrame, a: SurfaceAnalysis): void {
	const { b } = f;
	for (const points of a.cracks) {
		const path = new Path2D();
		points.forEach(([x, y], i) => {
			if (i === 0) path.moveTo(x, y);
			else path.lineTo(x, y);
		});
		const [x, y] = points[1];
		path.moveTo(x, y);
		path.lineTo(x + 5, y - 4);
		b.strokeStyle = 'rgba(35,55,76,.3)';
		b.lineWidth = 0.85;
		b.stroke(path);
		b.save();
		b.translate(0.75, -0.35);
		b.strokeStyle = 'rgba(225,240,250,.16)';
		b.lineWidth = 0.55;
		b.stroke(path);
		b.restore();
	}
}

export function paintWinterLair(f: MeadowFrame, cell: MeadowPathCell): void {
	paintWinterFloor(f, cell);
	const { b } = f;
	const { r, c, x, y, k } = cell;
	const a = analysis(f);
	const box = a.lairBox;
	const depth = a.edgeDistance[r]?.[c] ?? 1;
	b.save();
	b.beginPath();
	b.rect(x - 0.5, y - 0.5, T + 1, T + 1);
	b.clip();
	const sheen = b.createLinearGradient(box.x0, box.y0, box.x1, box.y1);
	sheen.addColorStop(0, 'rgba(230,243,251,0)');
	sheen.addColorStop(0.38, 'rgba(230,243,251,.04)');
	sheen.addColorStop(0.52, 'rgba(230,243,251,.12)');
	sheen.addColorStop(0.66, 'rgba(230,243,251,0)');
	b.fillStyle = sheen;
	b.fillRect(x, y, T, T);
	paintLairRim(f, cell);
	paintLairCracks(f, a);
	if (depth <= 2 && k() < 0.26) {
		const cx = x + T * (0.3 + k() * 0.4);
		const cy = y + T * (0.3 + k() * 0.4);
		const dx = (k() - 0.5) * 15;
		const dy = 5 + k() * 8;
		b.strokeStyle = 'rgba(37,57,77,.28)';
		b.lineWidth = 0.75;
		b.beginPath();
		b.moveTo(cx, cy);
		b.lineTo(cx + dx * 0.45, cy + dy * 0.45);
		b.lineTo(cx + dx, cy + dy);
		b.lineTo(cx + dx + (k() - 0.5) * 6, cy + dy + 4);
		b.stroke();
		b.strokeStyle = 'rgba(226,241,250,.13)';
		b.beginPath();
		b.moveTo(cx + 0.8, cy);
		b.lineTo(cx + dx * 0.45 + 0.8, cy + dy * 0.45);
		b.lineTo(cx + dx + 0.8, cy + dy);
		b.stroke();
	}
	if (depth >= 2 && k() < 0.13) {
		const cx = x + 4 + k() * (T - 8);
		const cy = y + 4 + k() * (T - 8);
		b.fillStyle = 'rgba(231,243,251,.28)';
		for (let i = 0; i < 3; i++) {
			b.beginPath();
			b.ellipse(cx + k() * 5, cy + k() * 4, 0.6 + k() * 0.5, 0.5 + k() * 0.4, 0, 0, Math.PI * 2);
			b.fill();
		}
	}
	b.restore();
}

function snowRun(f: MeadowFrame, horizontal: boolean, fixed: number, from: number, to: number): void {
	const { b } = f;
	const start = from * T;
	const end = (to + 1) * T;
	const edge = fixed * T;
	const path = new Path2D();
	const lower = new Path2D();
	const depth = (at: number) => 4.1 + Math.sin(at * 0.085) * 1.25 + Math.sin(at * 0.23 + 1.4) * 0.65;
	if (horizontal) {
		path.moveTo(start - 0.4, edge + 0.25);
		path.lineTo(end + 0.4, edge + 0.25);
		for (let x = end; x >= start; x -= 3) {
			path.lineTo(x, edge + depth(x));
		}
		path.lineTo(start, edge + depth(start));
		path.closePath();
		for (let x = start; x <= end; x += 3) {
			const y = edge + depth(x);
			if (x === start) lower.moveTo(x, y);
			else lower.lineTo(x, y);
		}
	} else {
		path.moveTo(edge + 0.25, start - 0.4);
		path.lineTo(edge + 0.25, end + 0.4);
		for (let y = end; y >= start; y -= 3) {
			path.lineTo(edge + depth(y), y);
		}
		path.lineTo(edge + depth(start), start);
		path.closePath();
		for (let y = start; y <= end; y += 3) {
			const x = edge + depth(y);
			if (y === start) lower.moveTo(x, y);
			else lower.lineTo(x, y);
		}
	}
	const g = horizontal
		? b.createLinearGradient(0, edge, 0, edge + 5)
		: b.createLinearGradient(edge, 0, edge + 5, 0);
	g.addColorStop(0, SNOW_LIGHT);
	g.addColorStop(1, SNOW);
	b.fillStyle = g;
	b.fill(path);
	b.strokeStyle = SNOW_SHADE;
	b.lineWidth = 0.7;
	b.stroke(lower);
}

function paintContinuousSnow(f: MeadowFrame): void {
	const { R, C, isW, b, blob } = f;
	for (let r = 0; r < R; r++) {
		let start = -1;
		for (let c = 0; c <= C; c++) {
			const on = c < C && isW(r, c) && !isW(r - 1, c);
			if (on && start < 0) start = c;
			if (!on && start >= 0) {
				snowRun(f, true, r, start, c - 1);
				start = -1;
			}
		}
	}
	for (let c = 0; c < C; c++) {
		let start = -1;
		for (let r = 0; r <= R; r++) {
			const on = r < R && isW(r, c) && !isW(r, c - 1);
			if (on && start < 0) start = r;
			if (!on && start >= 0) {
				snowRun(f, false, c, start, r - 1);
				start = -1;
			}
		}
	}
	for (let r = 0; r < R; r++) {
		for (let c = 0; c < C; c++) {
			if (!isW(r, c)) continue;
			const x = c * T;
			const y = r * T;
			const openSides = Number(!isW(r - 1, c)) + Number(!isW(r + 1, c)) + Number(!isW(r, c - 1)) + Number(!isW(r, c + 1));
			const k = tileRandom(r + 9, c + 9);
			if (openSides >= 3) {
				const path = new Path2D();
				for (let i = 0; i < 12; i++) {
					const angle = (i / 12) * Math.PI * 2;
					const variation = 0.88 + k() * 0.18;
					const px = x + T * 0.45 + Math.cos(angle) * T * 0.43 * variation;
					const py = y + T * 0.38 + Math.sin(angle) * T * 0.34 * variation;
					if (i === 0) path.moveTo(px, py);
					else path.lineTo(px, py);
				}
				path.closePath();
				const g = b.createLinearGradient(x, y, x + T, y + T);
				g.addColorStop(0, SNOW_LIGHT);
				g.addColorStop(1, '#dceaf5');
				b.fillStyle = g;
				b.fill(path);
				b.strokeStyle = 'rgba(128,164,199,.32)';
				b.lineWidth = 0.75;
				b.stroke(path);
			}
			if (!isW(r + 1, c) && (openSides >= 2 || k() < 0.12)) {
				blob(x + T * (0.3 + k() * 0.4), y + T - 0.8, 4 + k() * 3, 1.5 + k() * 0.8, SNOW, 0);
			}
			if (!isW(r, c + 1) && k() < 0.16) {
				blob(x + T - 0.8, y + T * (0.3 + k() * 0.4), 1.5 + k() * 0.8, 4 + k() * 3, SNOW, 0);
			}
			if (k() < 0.1 && openSides < 3) {
				b.strokeStyle = 'rgba(230,242,250,.13)';
				b.lineWidth = 1;
				b.beginPath();
				b.moveTo(x + 6, y + 11);
				b.lineTo(x + 14, y + 7);
				b.stroke();
			}
		}
	}
}

export function paintWinterWalls(f: MeadowFrame): void {
	paintWalls(f, { snow: 'caps', shadow: [11, 2.5, 4.5] });
	paintContinuousSnow(f);
}
