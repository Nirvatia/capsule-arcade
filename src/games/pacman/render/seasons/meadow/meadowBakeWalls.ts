import { tileRandom } from '../../common/worldDecor';
import type { MeadowFrame } from './MeadowBake';
import { T, LAIR } from './MeadowBake';

/** Walls: seen strictly from above. A rounded moss bed with loose stone blocks set into it. */
export function paintWalls(f: MeadowFrame): void {
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
	b.shadowBlur = 7 * RS;
	b.shadowOffsetX = 2 * RS;
	b.shadowOffsetY = 3 * RS;
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
