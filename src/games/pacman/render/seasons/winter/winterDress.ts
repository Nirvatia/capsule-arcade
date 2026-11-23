// Winter's surfaces on the shared season base (the owner's answers, 2026-11-23): the corridor is
// one dark blue-grey of trodden snow with the shared contact shadow; a soft snow bank runs along
// the walls' feet as one band (no blades); the walls wear a full snow blanket, the stone showing
// as a thin rim, the rounded corners kept; a rare icicle hangs off a long wall's lower edge. Light
// from the upper left, like every season.
import type { MeadowFrame } from '../meadow/MeadowBake';
import type { MeadowPathCell } from '../meadow/MeadowTheme';
import { TAU, hash, nearCorner, rng, sceneFloor, wallClip } from '../meadow/seasonScene';
import { WORLD_TILE } from '../../common/worldDecor';

const T = WORLD_TILE;

/** Snow, its shade (the side away from the light) and its sparkle. */
const SNOW = '#eef3f9';
const SNOW_SHADE = 'rgba(112,138,180,';
const BANK = '#d9e3ee';

/** The corridor: trodden snow, one dark blue-grey, a barely visible grain. */
export const winterFloor: (f: MeadowFrame, cell: MeadowPathCell) => void = sceneFloor(
	{ base: '#465166', grain: ['#6b7890', '#323a4a'], ao: 0.36 },
	null
);

/** The open sides of a wall tile: [left, up, right, down]. */
function openSides(f: MeadowFrame, r: number, c: number): [boolean, boolean, boolean, boolean] {
	return [!f.isW(r, c - 1), !f.isW(r - 1, c), !f.isW(r, c + 1), !f.isW(r + 1, c)];
}

/**
 * The snow bank at the walls' feet: one band round the walls' silhouette, lumpy on its outer
 * edge, a cool shade where it meets the floor. Painted under the stones (`paintWalls`'s `foot`),
 * so the stones and their drop shadow lie over its inner half.
 */
export function snowBank(f: MeadowFrame): void {
	const { b } = f;
	const edge = wallClip(f, 0.6);
	const r = rng(41);
	b.save();
	b.lineJoin = 'round';
	// the shade the bank throws on the floor, then the bank
	b.strokeStyle = 'rgba(20,28,44,.28)';
	b.lineWidth = 9.5;
	b.stroke(edge);
	b.strokeStyle = BANK;
	b.lineWidth = 7;
	b.stroke(edge);
	// lumps along the open edges: the band's outer line is soft, not ruled
	for (let rr = 0; rr < f.R; rr += 1) {
		for (let c = 0; c < f.C; c += 1) {
			if (!f.isW(rr, c)) continue;
			const [oL, oU, oR, oD] = openSides(f, rr, c);
			const x = c * T;
			const y = rr * T;
			const lump = (lx: number, ly: number, w: number, h: number) => {
				if (nearCorner(f, lx, ly, 9)) return;
				b.fillStyle = BANK;
				b.beginPath();
				b.ellipse(lx, ly, w, h, 0, 0, TAU);
				b.fill();
			};
			for (let i = 0; i < 3; i += 1) {
				const t = 4 + i * 8.5 + r() * 3;
				const s = 2.2 + r() * 1.6;
				if (oU) lump(x + t, y - 1.5, s * 1.6, s * 0.7);
				if (oD) lump(x + t, y + T + 1.5, s * 1.6, s * 0.7);
				if (oL) lump(x - 1.5, y + t, s * 0.7, s * 1.6);
				if (oR) lump(x + T + 1.5, y + t, s * 0.7, s * 1.6);
			}
		}
	}
	// the bank's lit crest: a thin bright line just off the stone on the up/left sides
	b.strokeStyle = 'rgba(255,255,255,.55)';
	b.lineWidth = 1;
	b.setLineDash([5, 3]);
	b.lineDashOffset = 1;
	b.translate(-1.4, -1.4);
	b.stroke(edge);
	b.restore();
}

/**
 * The snow blanket over the walls (the scene's wall dress, clipped to the silhouette): the whole
 * top under snow, the stone a thin rim, the corners' rounding kept (the rim stays wider there),
 * soft overhangs on the open edges, a cool shade on the lower/right edges, a few dimples and
 * sparkles. Nothing goes near an outer corner's curve.
 */
export function snowBlanket(f: MeadowFrame, r: () => number): void {
	const { b } = f;
	const cover = wallClip(f, 2.3);
	for (let rr = 0; rr < f.R; rr += 1) {
		for (let c = 0; c < f.C; c += 1) {
			if (!f.isW(rr, c)) continue;
			const [oL, oU, oR, oD] = openSides(f, rr, c);
			const x = c * T;
			const y = rr * T;
			// overhangs: a lump of snow reaching over the rim, now and then
			const over = (ox: number, oy: number, w: number, h: number) => {
				// the lump's own reach plus the corner's 10 units: its curve keeps the stone rim
				if (nearCorner(f, ox, oy, 16)) return;
				cover.moveTo(ox + w, oy); // a subpath of its own, no line from the last shape
				cover.ellipse(ox, oy, w, h, 0, 0, TAU);
			};
			if (oU && r() < 0.35) over(x + 5 + r() * (T - 10), y + 2.4, 3 + r() * 2, 1.7);
			if (oL && r() < 0.35) over(x + 2.4, y + 5 + r() * (T - 10), 1.7, 3 + r() * 2);
			if (oD && r() < 0.45) over(x + 5 + r() * (T - 10), y + T - 2.2, 3.5 + r() * 2, 1.8);
			if (oR && r() < 0.45) over(x + T - 2.2, y + 5 + r() * (T - 10), 1.8, 3.5 + r() * 2);
		}
	}
	b.save();
	b.fillStyle = SNOW;
	b.fill(cover);
	b.clip(cover);
	for (let rr = 0; rr < f.R; rr += 1) {
		for (let c = 0; c < f.C; c += 1) {
			if (!f.isW(rr, c)) continue;
			const [oL, oU, oR, oD] = openSides(f, rr, c);
			const x = c * T;
			const y = rr * T;
			const band = (x0: number, y0: number, x1: number, y1: number, a: number) => {
				const g = b.createLinearGradient(x0, y0, x1, y1);
				g.addColorStop(0, `${SNOW_SHADE}${a})`);
				g.addColorStop(1, `${SNOW_SHADE}0)`);
				b.fillStyle = g;
				b.fillRect(
					Math.min(x0, x1) - 0.5,
					Math.min(y0, y1) - 0.5,
					Math.abs(x1 - x0) || T + 1,
					Math.abs(y1 - y0) || T + 1
				);
			};
			// the shade side: lower and right edges; a whisper on the lit ones
			if (oD) band(x, y + T, x, y + T - 7, 0.42);
			if (oR) band(x + T, y, x + T - 7, y, 0.36);
			if (oU) band(x, y, x, y + 3, 0.1);
			if (oL) band(x, y, x + 3, y, 0.08);
			// dimples: soft cool hollows in the snow
			const k = rng(hash(rr * 57 + c * 13, 9) * 1e6);
			if (k() < 0.55) {
				b.fillStyle = `${SNOW_SHADE}.13)`;
				b.beginPath();
				b.ellipse(
					x + 5 + k() * (T - 10),
					y + 5 + k() * (T - 10),
					3 + k() * 3,
					1.6 + k() * 1.4,
					k() * 3,
					0,
					TAU
				);
				b.fill();
			}
			// sparkles: one or two pin points of frost
			b.fillStyle = 'rgba(255,255,255,.95)';
			for (let i = 0; i < 2; i += 1) {
				if (k() < 0.5) continue;
				b.beginPath();
				b.arc(x + 4 + k() * (T - 8), y + 4 + k() * (T - 8), 0.45, 0, TAU);
				b.fill();
			}
		}
	}
	b.restore();
}

/**
 * Icicles, rare: only under the lower edge of a long horizontal wall run (3+ tiles), never by a
 * corner, short enough to leave the corridor and the food clear.
 */
export function icicles(f: MeadowFrame): void {
	const { b } = f;
	for (let rr = 0; rr < f.R; rr += 1) {
		let run = 0;
		for (let c = 0; c <= f.C; c += 1) {
			const lower = c < f.C && f.isW(rr, c) && !f.isW(rr + 1, c);
			if (lower) {
				run += 1;
				continue;
			}
			if (run >= 3) {
				for (let i = c - run + 1; i < c - 1; i += 1) {
					if (hash(rr * 31 + i * 17, 77) > 0.34) continue;
					const k = rng(hash(rr * 7 + i, 3) * 1e6);
					const n = 1 + (k() < 0.5 ? 1 : 0);
					for (let j = 0; j < n; j += 1) {
						const ix = i * T + 6 + k() * (T - 12) + j * 4;
						const iy = (rr + 1) * T - 1.6;
						const len = 2.6 + k() * 1.6;
						b.fillStyle = '#d4ecfb';
						b.strokeStyle = 'rgba(70,100,140,.55)';
						b.lineWidth = 0.5;
						b.beginPath();
						b.moveTo(ix - 1.1, iy);
						b.lineTo(ix + 1.1, iy);
						b.lineTo(ix + 0.1, iy + len);
						b.closePath();
						b.fill();
						b.stroke();
						b.fillStyle = 'rgba(255,255,255,.9)';
						b.fillRect(ix - 0.6, iy + 0.2, 0.45, len * 0.5);
					}
				}
			}
			run = 0;
		}
	}
}
