// Summer's holiday scene, a fair (the owner's pick of the `season-dress` prototype): striped tents
// on the meadow strips, festoons of warm bulbs on poles between them, bunches of balloons whose
// shadows lie far off (they float high), a carousel beside each beach umbrella (its striped roof
// with a scalloped valance and lights turns live, slowly), bunting laid along the top of the
// maze's frame (no white flag and none on the corners: light specks there read as white
// corners). The festoons glow at night.
import { lianas } from '../meadow/wallFlora';
import { balloons, lights, shadow, tent } from '../meadow/sceneProps';
import type { FloorTone, SeasonScene } from '../meadow/seasonScene';
import { TAU, addBulbs, addMark, sceneFloor, spot } from '../meadow/seasonScene';
import { WORLD_TILE } from '../../common/worldDecor';

const T = WORLD_TILE;
const SUMMER_TONE: FloorTone = { base: '#a68b58', grain: ['#cdb27a', '#7a6238'], ao: 0.3 };

/** The corridor: one opaque tone, a contact shadow, grass at the walls' feet. */
export const summerFloor = sceneFloor(SUMMER_TONE, null);

export const fairScene: SeasonScene = {
	wallDress(f) {
		// Jumanji-like lianas: few thick stems along the edges and round the corners, big leaves
		// (the bunting moved to the festoons on the meadow: on the walls it made a mess)
		lianas(f, {
			seed: 29,
			cover: 0.3,
			stem: '#5a4a22',
			stemLight: 'rgba(170,150,90,.6)',
			leaves: ['#2c7032', '#3d8a3a', '#256a2c'],
			leaf: 6
		});
	},
	landmark(k, o, lit, i) {
		// a carousel's base beside the umbrella (its roof turns live)
		const x = o.x + (i ? -1 : 1) * 2.0 * T;
		const y = o.y + 0.2 * T;
		shadow(k.b, x, y, 1.25 * T, 1.15 * T, 0.35);
		k.b.fillStyle = '#7a5a3a';
		k.b.beginPath();
		k.b.arc(x, y, 1.15 * T, 0, TAU);
		k.b.fill();
		addMark(lit, 'carousel', x, y, i);
	},
	props(f, lit) {
		const b = f.b;
		const taken: Array<[number, number, number]> = [];
		const tents: Array<[number, number]> = [];
		for (const [tx, ty, c0] of [
			[-4.6, 12.5, '#e04a5a'],
			[-4.8, 19.5, '#2a8ad0'],
			[29.6, 8, '#3ab070'],
			[29.8, 14.5, '#e04a5a']
		] as const) {
			const [x, y] = spot(f, tx, ty, 1.1, taken);
			tent(b, x, y, 1.8 * T, c0, '#ffffff');
			tents.push([x, y]);
		}
		// festoons of warm bulbs between the tents, on poles
		for (let i = 1; i < tents.length; i += 1) {
			const [x0, y0] = tents[i - 1];
			const [x1, y1] = tents[i];
			if (Math.hypot(x1 - x0, y1 - y0) > 10 * T) continue;
			for (const [px, py] of [
				[x0, y0 + 1.2 * T],
				[x1, y1 - 1.2 * T]
			]) {
				shadow(b, px, py, 2, 2, 0.4);
				b.fillStyle = '#4a3622';
				b.beginPath();
				b.arc(px, py, 1.6, 0, TAU);
				b.fill();
			}
			const pts: Array<[number, number]> = [];
			for (let j = 0; j <= 10; j += 1) {
				const q = j / 10;
				pts.push([
					x0 + (x1 - x0) * q + Math.sin(q * Math.PI) * 6,
					y0 + 1.2 * T + (y1 - 1.2 * T - (y0 + 1.2 * T)) * q
				]);
			}
			addBulbs(lit, lights(b, pts, 7, i, true));
			// pennants along the festoon, between the bulbs
			const cols = ['#e04a5a', '#e8b828', '#2a8ad0', '#3ab070', '#c060c0'];
			for (let j = 0; j < pts.length - 1; j += 1) {
				const [ax, ay] = pts[j];
				const [bx, by] = pts[j + 1];
				const mx = (ax + bx) / 2;
				const my = (ay + by) / 2;
				const nx = -(by - ay);
				const ny = bx - ax;
				const nl = Math.hypot(nx, ny) || 1;
				b.fillStyle = cols[(j + i) % cols.length];
				b.beginPath();
				b.moveTo(mx - (bx - ax) * 0.22, my - (by - ay) * 0.22);
				b.lineTo(mx + (bx - ax) * 0.22, my + (by - ay) * 0.22);
				b.lineTo(mx + (nx / nl) * 4, my + (ny / nl) * 4);
				b.closePath();
				b.fill();
			}
		}
		for (const [tx, ty] of [
			[-2.8, 9],
			[28, 18],
			[-3.2, 23]
		] as const) {
			const [x, y] = spot(f, tx, ty, 0.6, taken);
			balloons(b, x, y, 0.6 * T, tx);
		}
	},
	live(ctx, t, v) {
		// the carousel's roof: striped, turning slowly (0.04 turns a second, the owner's review)
		const k = v.k;
		for (const g of v.lit.marks.values()) {
			if (g.kind !== 'carousel') continue;
			const x = v.ox + g.x * k;
			const y = v.oy + g.y * k;
			const R = 1.05 * T * k;
			const n = 12;
			const spin = t * 0.25;
			// the canopy's scalloped valance, then the striped roof
			for (let i = 0; i < n; i += 1) {
				const a = spin + ((i + 0.5) / n) * TAU;
				ctx.fillStyle = i % 2 ? '#ffd23a' : '#e04a5a';
				ctx.beginPath();
				ctx.arc(x + Math.cos(a) * R, y + Math.sin(a) * R, R * 0.2, 0, TAU);
				ctx.fill();
			}
			for (let i = 0; i < n; i += 1) {
				const a0 = spin + (i / n) * TAU;
				ctx.fillStyle = i % 2 ? '#fff4e0' : '#e04a5a';
				ctx.beginPath();
				ctx.moveTo(x, y);
				ctx.arc(x, y, R, a0, a0 + TAU / n);
				ctx.closePath();
				ctx.fill();
			}
			// lights on the valance, steady, warm
			for (let i = 0; i < n * 2; i += 1) {
				const a = spin + (i / (n * 2)) * TAU;
				ctx.fillStyle = 'rgba(255,240,190,.95)';
				ctx.beginPath();
				ctx.arc(
					x + Math.cos(a) * R * 1.05,
					y + Math.sin(a) * R * 1.05,
					Math.max(0.8, 0.9 * k),
					0,
					TAU
				);
				ctx.fill();
			}
			ctx.strokeStyle = 'rgba(60,30,20,.6)';
			ctx.lineWidth = Math.max(0.6, 0.6 * k);
			ctx.beginPath();
			ctx.arc(x, y, R, 0, TAU);
			ctx.stroke();
			ctx.fillStyle = '#ffd23a';
			ctx.beginPath();
			ctx.arc(x, y, R * 0.14, 0, TAU);
			ctx.fill();
		}
	}
};
