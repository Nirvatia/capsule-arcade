// The three seasons of the season-dress prototype. Each is a `Dress`: an opaque one-tone corridor,
// water in view, what is added to the walls (always inside their silhouette), and a live layer.
//   autumn  wet: dark glossy ground, puddles that hold the sky, rings spreading on them in the
//           rain, a wet sheen on the stones' lit edges, floating leaves on the water
//   spring  in bloom: blossoms along the walls' top rims, grass at their feet, lily pads on the
//           pond, butterflies and dew glints
//   summer  vines: a few, growing up from the walls' feet over the face, with leaves and small
//           flowers; sun glints on the water
import type { GridMatrix } from '../../../src/games/pacman/config/gridConfig';
import type { MeadowFrame } from '../../../src/games/pacman/render/seasons/meadow/MeadowBake';
import type { MeadowPathCell } from '../../../src/games/pacman/render/seasons/meadow/MeadowTheme';
import { T, TAU, floorCell, onWalls, paintWaters, puddleSpots, rng, wallClip } from './common';
import type { FloorTone, WaterTone } from './common';

export interface Dress {
	readonly floor: FloorTone;
	readonly water: WaterTone;
	/** Before the walls: puddles and the like, on the ground. */
	pre(f: MeadowFrame, grid: GridMatrix): void;
	/** After the walls: inside their silhouette only. */
	walls(f: MeadowFrame): void;
	cell(f: MeadowFrame, cell: MeadowPathCell): void;
	/** Live, over the finished frame; tile coordinates map through `L`. */
	overlay(ctx: CanvasRenderingContext2D, t: number, L: { tileSize: number; offsetX: number; offsetY: number }, grid: GridMatrix, storm: number): void;
}

const leaf = (b: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot: number, col: string): void => {
	b.fillStyle = col;
	b.beginPath();
	b.ellipse(x, y, rx, ry, rot, 0, TAU);
	b.fill();
};

// ------------------------------------------------------------------------------------ autumn

const AUTUMN_TONE: FloorTone = { base: '#403c3a', grain: ['#6a625c', '#25211f'], ao: 0.42 };

export const autumn: Dress = {
	floor: AUTUMN_TONE,
	water: { bank: '#3b3a2e', water: ['#516a73', '#33474f'], shine: 'rgba(200,216,224,.6)' },
	cell(f, cell) {
		floorCell(f, cell, AUTUMN_TONE);
		// the wall above is mirrored in the wet floor: a warm band that fades with the distance
		if (f.isW(cell.r - 1, cell.c)) {
			const rg = f.b.createLinearGradient(cell.x, cell.y, cell.x, cell.y + 10);
			rg.addColorStop(0, 'rgba(220,120,50,.34)');
			rg.addColorStop(1, 'rgba(220,120,50,0)');
			f.b.fillStyle = rg;
			f.b.fillRect(cell.x, cell.y, T, 10);
		}
	},
	pre(f, grid) {
		const { b } = f;
		paintWaters(f, this.water, (fr, pond) => {
			const r = rng(8);
			for (let i = 0; i < 16; i += 1) {
				const a = r() * TAU;
				const d = r();
				leaf(fr.b, pond.x + Math.cos(a) * pond.rx * 0.8 * d, pond.y + Math.sin(a) * pond.ry * 0.8 * d, 2.6, 1.5, r() * 3, ['#c8641e', '#d9962a', '#a8431a'][i % 3]);
			}
		});
		// puddles on the corridor: they hold a pale sky and, at their near edge, the wall's colour
		for (const p of puddleSpots(grid, 24, 31)) {
			const x = (p.c + p.ox) * T;
			const y = (p.r + p.oy) * T;
			const rx = p.rx * T;
			const ry = p.ry * T;
			const g = b.createRadialGradient(x - rx * 0.2, y - ry * 0.3, 1, x, y, rx);
			g.addColorStop(0, 'rgba(178,196,210,.97)');
			g.addColorStop(0.65, 'rgba(112,130,142,.95)');
			g.addColorStop(1, 'rgba(70,84,94,.9)');
			b.fillStyle = g;
			b.beginPath();
			b.ellipse(x, y, rx, ry, 0, 0, TAU);
			b.fill();
			b.strokeStyle = 'rgba(215,226,232,.45)';
			b.lineWidth = 0.9;
			b.stroke();
			b.strokeStyle = 'rgba(255,255,255,.6)';
			b.lineWidth = 1;
			b.beginPath();
			b.ellipse(x - rx * 0.15, y - ry * 0.2, rx * 0.5, ry * 0.35, 0, 3.4, 5.4);
			b.stroke();
			b.fillStyle = 'rgba(214,116,44,.42)';
			b.beginPath();
			b.ellipse(x + rx * 0.2, y + ry * 0.45, rx * 0.55, ry * 0.22, 0, 0, TAU);
			b.fill();
		}
	},
	walls(f) {
		const b = f.b;
		onWalls(f, (r) => {
			b.fillStyle = 'rgba(24,34,46,.14)';
			b.fillRect(0, 0, f.C * T, f.R * T);
			// the sheen: a thin light line on each stone's lit top and left rim
			const clip = wallClip(f, 1.6);
			b.save();
			b.translate(1.1, 1.1);
			b.strokeStyle = 'rgba(214,228,238,.42)';
			b.lineWidth = 1.5;
			b.stroke(clip);
			b.restore();
			// beads of water
			for (let i = 0; i < f.R * f.C * 2; i += 1) {
				const x = r() * f.C * T;
				const y = r() * f.R * T;
				b.fillStyle = `rgba(225,236,244,${0.25 + r() * 0.3})`;
				b.beginPath();
				b.ellipse(x, y, 0.8 + r() * 0.5, 0.6 + r() * 0.4, 0, 0, TAU);
				b.fill();
			}
		}, 7);
	},
	overlay(ctx, t, L, grid, storm) {
		if (storm <= 0) return;
		const S = L.tileSize;
		for (const p of puddleSpots(grid, 24, 31)) {
			for (let k = 0; k < 2; k += 1) {
				const ph = (t * 0.55 + p.s * 3 + k * 0.5) % 1;
				ctx.strokeStyle = `rgba(225,236,244,${(1 - ph) * 0.55 * storm})`;
				ctx.lineWidth = 1.1;
				ctx.beginPath();
				ctx.ellipse(L.offsetX + (p.c + p.ox) * S, L.offsetY + (p.r + p.oy) * S, p.rx * S * (0.15 + 0.85 * ph), p.ry * S * (0.15 + 0.85 * ph), 0, 0, TAU);
				ctx.stroke();
			}
		}
	}
};

// ------------------------------------------------------------------------------------ spring

const SPRING_TONE: FloorTone = { base: '#7b5a3d', grain: ['#a47e55', '#4d3623'], ao: 0.32 };

export const spring: Dress = {
	floor: SPRING_TONE,
	water: { bank: '#5f8a4a', water: ['#78c3d4', '#3f94b8'], shine: 'rgba(255,255,255,.7)' },
	cell(f, cell) {
		floorCell(f, cell, SPRING_TONE);
		// grass at the walls' feet: a few short blades on the floor edge, never on the middle
		const { b, isW } = f;
		const { x, y, r, c, k } = cell;
		b.lineCap = 'round';
		const blade = (bx: number, by: number, dx: number, dy: number) => {
			b.strokeStyle = ['#5f9a3a', '#7fb84a', '#4d8230'][Math.floor(k() * 3)];
			b.lineWidth = 0.9;
			b.beginPath();
			b.moveTo(bx, by);
			b.lineTo(bx + dx + (k() - 0.5) * 1.5, by + dy);
			b.stroke();
		};
		if (isW(r, c - 1)) for (let i = 0; i < 4; i += 1) blade(x + 0.5, y + k() * T, 2.5 + k() * 2, (k() - 0.5) * 3);
		if (isW(r - 1, c)) for (let i = 0; i < 4; i += 1) blade(x + k() * T, y + 0.5, (k() - 0.5) * 3, 2.5 + k() * 2);
	},
	pre(f) {
		paintWaters(f, this.water, (fr, pond) => {
			const r = rng(9);
			for (let i = 0; i < 7; i += 1) {
				const a = r() * TAU;
				const d = 0.25 + r() * 0.6;
				const x = pond.x + Math.cos(a) * pond.rx * d;
				const y = pond.y + Math.sin(a) * pond.ry * d;
				fr.b.fillStyle = '#4f9a3c';
				fr.b.beginPath();
				fr.b.moveTo(x, y);
				fr.b.arc(x, y, 5 + r() * 2, 0.4, TAU - 0.3);
				fr.b.closePath();
				fr.b.fill();
				if (i % 3 === 0) {
					for (let k = 0; k < 6; k += 1) leaf(fr.b, x + Math.cos(k * 1.05) * 2.2, y + Math.sin(k * 1.05) * 2.2, 1.9, 1, k * 1.05, '#ffc2dc');
					leaf(fr.b, x, y, 1.2, 1.2, 0, '#ffe59a');
				}
			}
		});
	},
	walls(f) {
		const b = f.b;
		onWalls(f, (r) => {
			// blossoms along each stone's top and left rim, in small clusters
			for (let rr = 0; rr < f.R; rr += 1) {
				for (let cc = 0; cc < f.C; cc += 1) {
					if (!f.isW(rr, cc)) continue;
					for (const [open, ax, ay] of [
						[!f.isW(rr - 1, cc), 1, 0],
						[!f.isW(rr, cc - 1), 0, 1]
					] as const) {
						if (!open || r() > 0.3) continue;
						const bx = cc * T + (ax ? 3 + r() * (T - 6) : 3.2);
						const by = rr * T + (ay ? 3 + r() * (T - 6) : 3.2);
						for (let n = 0; n < 3; n += 1) {
							const x = bx + (r() - 0.5) * 6 * (ax ? 1 : 0.3);
							const y = by + (r() - 0.5) * 6 * (ay ? 1 : 0.3);
							const col = ['#ffd0e2', '#ffffff', '#ffb6d2'][n % 3];
							for (let k = 0; k < 5; k += 1) leaf(b, x + Math.cos(k * 1.2566) * 1.5, y + Math.sin(k * 1.2566) * 1.5, 1.3, 0.9, k * 1.2566, col);
							leaf(b, x, y, 0.8, 0.8, 0, '#f2b43a');
						}
					}
				}
			}
		}, 13);
	},
	overlay(ctx, t, L) {
		const S = L.tileSize;
		// three butterflies on slow looping paths over the meadow margins
		for (let i = 0; i < 3; i += 1) {
			const a = t * (0.22 + i * 0.05) + i * 2.1;
			const x = L.offsetX + (i % 2 ? 25 + 6 : -6) * S + Math.cos(a) * 3.5 * S;
			const y = L.offsetY + (6 + i * 7) * S + Math.sin(a * 1.7) * 2.2 * S;
			const flap = 0.35 + 0.65 * Math.abs(Math.sin(t * 5 + i));
			ctx.save();
			ctx.translate(x, y);
			ctx.rotate(Math.cos(a) * 0.5);
			ctx.fillStyle = ['#ffd45a', '#ff8fb8', '#9fd0ff'][i];
			ctx.strokeStyle = 'rgba(60,30,40,.7)';
			ctx.lineWidth = 0.8;
			for (const s of [-1, 1]) {
				ctx.beginPath();
				ctx.ellipse(s * S * 0.13 * flap, -S * 0.05, S * 0.12 * flap, S * 0.17, s * 0.5, 0, TAU);
				ctx.fill();
				ctx.stroke();
			}
			ctx.restore();
		}
	}
};

// ------------------------------------------------------------------------------------ summer

const SUMMER_TONE: FloorTone = { base: '#a68b58', grain: ['#cdb27a', '#7a6238'], ao: 0.3 };

export const summer: Dress = {
	floor: SUMMER_TONE,
	water: { bank: '#9a8a5a', water: ['#62cbdc', '#2f93b8'], shine: 'rgba(255,255,255,.8)' },
	cell(f, cell) {
		floorCell(f, cell, SUMMER_TONE);
	},
	pre(f) {
		paintWaters(f, this.water);
	},
	walls(f) {
		const b = f.b;
		onWalls(f, (r) => {
			const vine = (x0: number, y0: number, up: number, side: number) => {
				let x = x0;
				let y = y0;
				const len = 12 + r() * 20;
				const pts: Array<[number, number]> = [[x, y]];
				for (let s = 0; s < len; s += 1.5) {
					x += side * (0.5 + r() * 0.7) + Math.sin(s * 0.7) * 0.6;
					y -= up * (1.2 + r() * 0.5);
					pts.push([x, y]);
				}
				b.strokeStyle = '#2e5a24';
				b.lineWidth = 1.7;
				b.lineCap = 'round';
				b.beginPath();
				pts.forEach(([px, py], i) => (i ? b.lineTo(px, py) : b.moveTo(px, py)));
				b.stroke();
				pts.forEach(([px, py], i) => {
					if (i % 2) return;
					const s2 = i % 4 === 0 ? 1 : -1;
					leaf(b, px + s2 * 2.4, py, 3.4, 1.9, s2 * 0.7, i % 3 ? '#3f8a2e' : '#5fb23e');
					if (i % 6 === 0) leaf(b, px - s2 * 2, py - 1, 1.6, 1.6, 0, '#f4d03a');
				});
			};
			for (let rr = 0; rr < f.R; rr += 1) {
				for (let cc = 0; cc < f.C; cc += 1) {
					if (!f.isW(rr, cc) || r() > 0.3) continue;
					if (!f.isW(rr + 1, cc)) vine(cc * T + 4 + r() * (T - 8), rr * T + T - 0.5, 1, r() < 0.5 ? -1 : 1);
					else if (!f.isW(rr, cc + 1)) vine(cc * T + T - 0.5, rr * T + T - 4 - r() * 8, 0.35, -1);
				}
			}
		}, 17);
	},
	overlay(ctx, t, L) {
		// sun glints on the pond and the river: a few small stars that swell and fade slowly
		const S = L.tileSize;
		const spots: Array<[number, number]> = [[-4, 3], [-3.2, 8], [-3.6, 16], [-3.4, 22], [30, 15], [31.5, 16.5], [29, 17]];
		spots.forEach(([tx, ty], i) => {
			const k = 0.5 + 0.5 * Math.sin(t * 1.3 + i * 1.7);
			ctx.fillStyle = `rgba(255,255,255,${0.5 * k})`;
			const x = L.offsetX + tx * S;
			const y = L.offsetY + ty * S;
			ctx.beginPath();
			for (let j = 0; j < 8; j += 1) {
				const a = (j / 8) * TAU;
				const r = j % 2 ? S * 0.03 : S * 0.12 * k;
				ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
			}
			ctx.fill();
		});
	}
};

export const DRESSES: Readonly<Record<string, Dress>> = { autumn, spring, summer };
