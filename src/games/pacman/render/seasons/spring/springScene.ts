// Spring's holiday scene, a hanami (the owner's pick of the `season-dress` prototype): every tree
// on the meadow in blossom (the theme's palettes), petal carpets under them, blankets at their
// feet, paper lanterns strung between neighbouring trees and two long strings of them from lamp
// to lamp, one each side of the maze, two by the picnic blanket; fallen petals on the walls'
// tops (deep pink, off the outer corners: a light speck there reads as a white corner). The
// lanterns glow at night.
import type { MeadowFrame } from '../meadow/MeadowBake';
import { blanket, paperLantern } from '../meadow/sceneProps';
import type { FloorTone, SeasonScene } from '../meadow/seasonScene';
import { TAU, addLight, hash, nearCorner, rng, sceneFloor, spot } from '../meadow/seasonScene';
import { WORLD_TILE } from '../../common/worldDecor';

const T = WORLD_TILE;
const SPRING_TONE: FloorTone = { base: '#7b5a3d', grain: ['#a47e55', '#4d3623'], ao: 0.32 };

/** The corridor: one opaque tone, a contact shadow, grass at the walls' feet. */
export const springFloor = sceneFloor(SPRING_TONE, null);

/** Trees near the maze that show (the meadow's strips and the bands above and below it). */
const nearTrees = (f: MeadowFrame) =>
	f.DEC.filter(
		(o) =>
			o.k === 'tree' && o.x > -13 * T && o.x < (f.C + 13) * T && o.y > -2 * T && o.y < (f.R + 2) * T
	);

export const hanamiScene: SeasonScene = {
	wallDress(f, r) {
		// fallen petals on the walls' tops: a few, pink, lying flat
		for (let row = 0; row < f.R; row += 1) {
			for (let c = 0; c < f.C; c += 1) {
				if (!f.isW(row, c) || hash(row * 41 + c, 5) > 0.35) continue;
				for (let i = 0; i < 2; i += 1) {
					const x = c * T + 4 + r() * (T - 8);
					const y = row * T + 4 + r() * (T - 8);
					// deep enough not to read as a light speck, and never on an outer corner
					if (nearCorner(f, x, y, 10)) continue;
					f.b.fillStyle = r() < 0.5 ? 'rgba(236,128,170,.9)' : 'rgba(244,156,188,.9)';
					f.b.beginPath();
					f.b.ellipse(x, y, 2.1, 1.2, r() * 3, 0, TAU);
					f.b.fill();
				}
			}
		}
	},
	landmark(k, o, lit) {
		for (const [dx, dy] of [
			[-1.4, -0.9],
			[1.5, 0.8]
		]) {
			const x = o.x + dx * T;
			const y = o.y + dy * T;
			paperLantern(k.b, x, y, 0.32 * T, '#ff9a6a');
			addLight(lit, x, y, T * 1.0, '255,170,110', 0.5);
		}
	},
	props(f, lit) {
		const b = f.b;
		const r = rng(12);
		const trees = nearTrees(f);
		// petal carpets under the blossoming trees (the crowns are baked after, over them)
		for (const o of trees) {
			const R = (o.r ?? T) * 1.5;
			for (let i = 0; i < 70; i += 1) {
				const a = r() * TAU;
				const d = Math.sqrt(r()) * R;
				b.fillStyle = r() < 0.5 ? 'rgba(255,196,218,.85)' : 'rgba(255,226,236,.85)';
				b.beginPath();
				b.ellipse(
					o.x + Math.cos(a) * d + R * 0.2,
					o.y + Math.sin(a) * d + R * 0.25,
					1.8,
					1,
					r() * 3,
					0,
					TAU
				);
				b.fill();
			}
		}
		// blankets at the lower right of some, lantern strings between neighbours
		const taken: Array<[number, number, number]> = [];
		trees.slice(0, 10).forEach((o, i) => {
			const [x, y] = spot(f, o.x / T + 1.6, o.y / T + 1.4, 0.9, taken);
			blanket(
				b,
				x,
				y,
				1.5 * T,
				1.1 * T,
				(hash(i) - 0.5) * 0.6,
				i % 2 ? '#e8e4f6' : '#f6e8e0',
				i % 2 ? '#8a7ec8' : '#d86a6a'
			);
		});
		// two long strings of paper lanterns from lamp to lamp, one each side of the maze
		const lamps = f.DEC.filter((o) => o.k === 'lamp');
		for (const side of [-1, 1]) {
			const ends = lamps.filter((o) => (side < 0 ? o.x < 0 : o.x > 0)).sort((p, q2) => p.y - q2.y);
			if (ends.length < 2) continue;
			const [a, c] = [ends[0], ends[ends.length - 1]];
			b.strokeStyle = 'rgba(40,30,20,.55)';
			b.lineWidth = 0.6;
			b.beginPath();
			b.moveTo(a.x, a.y);
			b.lineTo(c.x, c.y);
			b.stroke();
			const n = Math.round(Math.hypot(c.x - a.x, c.y - a.y) / (1.7 * T));
			for (let j = 1; j < n; j += 1) {
				const x = a.x + ((c.x - a.x) * j) / n;
				const y = a.y + ((c.y - a.y) * j) / n;
				paperLantern(b, x, y, 0.3 * T, j % 2 ? '#ff7a5a' : '#ffb05a');
				addLight(lit, x, y, T * 0.85, '255,170,110', 0.45);
			}
		}
		const pairs = [...trees].sort((p, q2) => p.x - q2.x || p.y - q2.y);
		for (let i = 1; i < pairs.length; i += 1) {
			const a = pairs[i - 1];
			const c = pairs[i];
			if (Math.hypot(a.x - c.x, a.y - c.y) > 9 * T) continue;
			const n = 5;
			for (let j = 1; j < n; j += 1) {
				const x = a.x + ((c.x - a.x) * j) / n;
				const y = a.y + ((c.y - a.y) * j) / n;
				paperLantern(b, x, y, 0.3 * T, j % 2 ? '#ff7a5a' : '#ffb05a');
				addLight(lit, x, y, T * 0.8, '255,170,110', 0.45);
			}
			b.strokeStyle = 'rgba(40,30,20,.5)';
			b.lineWidth = 0.5;
			b.beginPath();
			b.moveTo(a.x, a.y);
			b.lineTo(c.x, c.y);
			b.stroke();
		}
	}
};
