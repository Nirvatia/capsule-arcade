import { tileRandom } from '../../common/worldDecor';
import type { MeadowFrame } from './MeadowBake';
import { T, LAIR } from './MeadowBake';

/**
 * Where the snow lies on the wall blocks. `drifts` (every season today): random patches
 * anywhere on the block face. `caps` (winter): a trim on the lit top/left rim of the
 * silhouette, full caps on lone blocks, base drifts on the lee side — never on the face.
 */
export type WallSnow = 'drifts' | 'caps';

export interface WallPaintOpts {
	readonly snow?: WallSnow;
	/** The soft drop shadow under the blocks as [blur, dx, dy] in world units. */
	readonly shadow?: readonly [number, number, number];
}

/** Walls: seen strictly from above. A rounded moss bed with loose stone blocks set into it. */
export function paintWalls(f: MeadowFrame, opts: WallPaintOpts = {}): void {
	const snow = opts.snow ?? 'drifts';
	const [shBlur, shDx, shDy] = opts.shadow ?? [7, 2, 3];
	const { S, P, RS, R, C, isW, b, vis, lin, blob, rp } = f;
	const WL: Array<[number, number]> = [];
	for (let r = 0; r < R; r++) {
		for (let c = 0; c < C; c++) {
			if (isW(r, c) && vis(c * T + T / 2, r * T + T / 2, T)) {
				WL.push([r, c]);
			}
		}
	}
	const wsh = (r: number, c: number, i: number, j: number, k: number, all: boolean) => {
		const oL = !isW(r, c - 1);
		const oU = !isW(r - 1, c);
		const oR = !isW(r, c + 1);
		const oD = !isW(r + 1, c);
		const L = oL ? i : j;
		const U = oU ? i : j;
		const Rr = oR ? i : j;
		const Dd = oD ? i : j;
		rp(
			c * T + L,
			r * T + U,
			T - L - Rr,
			T - U - Dd,
			all ? [k, k, k, k] : [oU && oL ? k : 0, oU && oR ? k : 0, oD && oR ? k : 0, oD && oL ? k : 0]
		);
	};
	const SIDES = [
		[0, -1],
		[0, 1],
		[-1, 0],
		[1, 0]
	] as const;
	const W = P.wall;
	for (const [r, c] of WL) {
		for (const [dr, dc] of SIDES) {
			const n = S[r + dr] && S[r + dr][c + dc];
			if (!n || n === 'ES' || n === 'WL') {
				continue;
			}
			b.fillStyle = LAIR.has(n) ? P.lair.base : P.floor.tiles[0];
			const x = c * T;
			const y = r * T;
			b.fillRect(
				dc ? (dc > 0 ? x + T / 2 : x) : x,
				dr ? (dr > 0 ? y + T / 2 : y) : y,
				dc ? T / 2 : T,
				dr ? T / 2 : T
			);
		}
	}
	b.save();
	b.shadowColor = W.shadow;
	b.shadowBlur = shBlur * RS;
	b.shadowOffsetX = shDx * RS;
	b.shadowOffsetY = shDy * RS;
	b.fillStyle = W.base;
	for (const [r, c] of WL) {
		wsh(r, c, 0, -0.4, 8, false);
		b.fill();
	}
	b.restore();
	b.fillStyle = W.base;
	for (const [r, c] of WL) {
		wsh(r, c, 0, -0.4, 8, false);
		b.fill();
	}
	for (const [r, c] of WL) {
		const k = tileRandom(r, c);
		const v = k();
		const x = c * T;
		const y = r * T;
		const hd = v < 0.08;
		b.save();
		b.fillStyle = hd
			? lin(x, y, x + T, y + T, W.moss[0], W.moss[1])
			: lin(x, y, x + T, y + T, W.top[(k() * 3) | 0], W.bottom[(k() * 3) | 0]);
		wsh(r, c, 0.6, 0.6, 8, false);
		b.fill();
		b.restore();
		wsh(r, c, 0.6, 0.6, 8, false);
		b.save();
		b.clip();
		if (hd) {
			for (let i = 0; i < 14; i++) {
				blob(
					x + k() * T,
					y + k() * T,
					1.5 + k() * 1.5,
					0.8 + k() * 0.8,
					W.mossSpecks[(k() * 3) | 0],
					k() * 3
				);
			}
		} else {
			for (let i = 0; i < 8; i++) {
				blob(
					x + k() * T,
					y + k() * T,
					0.5 + k(),
					0.4 + k() * 0.6,
					k() < 0.5 ? W.specks[0] : W.specks[1],
					k() * 3
				);
			}
			b.strokeStyle = W.crack;
			b.lineWidth = 1;
			b.beginPath();
			b.moveTo(x + 4 + k() * (T - 8), y);
			b.lineTo(x + 4 + k() * (T - 8), y + T * 0.6);
			b.lineTo(x + 4 + k() * (T - 8), y + T);
			b.stroke();
			const o1 = (r + c) & 1;
			b.strokeStyle = W.joints;
			b.lineWidth = 0.8;
			b.beginPath();
			b.moveTo(x, y + T / 2);
			b.lineTo(x + T, y + T / 2);
			b.moveTo(x + (o1 ? T * 0.34 : T * 0.66), y);
			b.lineTo(x + (o1 ? T * 0.34 : T * 0.66), y + T / 2);
			b.moveTo(x + (o1 ? T * 0.68 : T * 0.32), y + T / 2);
			b.lineTo(x + (o1 ? T * 0.68 : T * 0.32), y + T);
			b.stroke();
			if (snow === 'drifts') {
				const n = v < 0.3 ? 2 : 1;
				for (let i = 0; i < n; i++) {
					blob(
						x + k() * T * 0.7 + 3,
						y + k() * T * 0.55 + 3,
						5 + k() * 4,
						3 + k() * 2.5,
						W.drifts[0]
					);
					blob(x + k() * T * 0.8, y + k() * T * 0.6, 3 + k() * 3, 1.5 + k() * 1.5, W.drifts[1]);
				}
			} else {
				paintSnowCaps(f, r, c, x, y, k, W);
			}
		}
		b.strokeStyle = W.light;
		b.lineWidth = 2;
		b.save();
		b.translate(-1.2, -1.2);
		wsh(r, c, 0.6, 0.6, 8, false);
		b.stroke();
		b.restore();
		b.strokeStyle = W.dark;
		b.save();
		b.translate(1.2, 1.2);
		wsh(r, c, 0.6, 0.6, 8, false);
		b.stroke();
		b.restore();
		b.restore();
		if (v > 0.96) {
			const px = x + 6 + k() * (T - 12);
			const py = y + 6 + k() * (T - 12);
			for (let i = 0; i < 4; i++) {
				blob(px + k() * 6 - 3, py + k() * 5 - 2.5, 1.8, 1.8, W.flowers[(k() * 3) | 0], 0);
			}
			blob(px, py, 1, 1, '#ffd45e', 0);
		}
	}
	for (const [r, c] of WL) {
		const k = tileRandom(r + 9, c + 9);
		for (const [dr, dc] of SIDES) {
			const n = S[r + dr] && S[r + dr][c + dc];
			if ((n && n !== 'ES') || k() < 0.45) {
				continue;
			}
			for (let i = 0; i < 4; i++) {
				const t = k();
				const x = c * T + (dc ? (dc > 0 ? T : 0) : t * T);
				const y = r * T + (dr ? (dr > 0 ? T : 0) : t * T);
				b.strokeStyle = P.edgeGrass[(k() * 3) | 0];
				b.lineWidth = 1.2;
				b.beginPath();
				b.moveTo(x, y);
				b.lineTo(x + dc * k() * 4 + (k() - 0.5) * 3, y + dr * k() * 4 - 2 - k() * 3);
				b.stroke();
			}
		}
	}
}

/**
 * Winter snow on the wall blocks (runs clipped to the block face): a trim on the lit top/left
 * rim of the silhouette, a full cap on lone blocks and run ends, a small wind-driven drift at
 * the base on the lee (right/down) side. The block face itself stays stone.
 */
function paintSnowCaps(
	f: MeadowFrame,
	r: number,
	c: number,
	x: number,
	y: number,
	k: () => number,
	W: MeadowFrame['P']['wall']
): void {
	const { isW, blob } = f;
	const up = isW(r - 1, c);
	const lf = isW(r, c - 1);
	const dn = isW(r + 1, c);
	const rt = isW(r, c + 1);
	const snow = W.drifts;
	// a trim along the exposed top/left rim: wind from the up-left lays snow there only
	if (!up) {
		for (let i = 0; i < 3; i++) {
			blob(x + 3.5 + i * 7 + k() * 2.5, y + 1.6 + k() * 1.6, 4.5 + k() * 2, 2 + k() * 1, snow[i % 2], 0);
		}
	}
	if (!lf) {
		for (let i = 0; i < 3; i++) {
			blob(x + 1.6 + k() * 1.6, y + 3.5 + i * 7 + k() * 2.5, 2 + k() * 1, 4.5 + k() * 2, snow[(i + 1) % 2], 0);
		}
	}
	// a lone block or a run's end collects a full cap, stone peeking at the bottom-right
	const open = Number(!up) + Number(!dn) + Number(!lf) + Number(!rt);
	if (open >= 3) {
		for (let i = 0; i < 5; i++) {
			blob(x + 2 + k() * T * 0.65, y + 1 + k() * T * 0.45, 6 + k() * 3.5, 4 + k() * 2, snow[0], k());
		}
	}
	// a drift at the base where the lee side meets the floor
	if (!rt && k() < 0.4) {
		blob(x + T - 2 - k() * 2, y + 4 + k() * (T - 8), 3 + k() * 2, 1.4 + k() * 0.8, snow[1], 0);
	}
	if (!dn && k() < 0.4) {
		blob(x + 4 + k() * (T - 8), y + T - 2 - k() * 2, 1.4 + k() * 0.8, 3 + k() * 2, snow[1], 0);
	}
}
