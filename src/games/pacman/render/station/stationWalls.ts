// The station's walls (style B): massive bulkheads, one recessed plate to a tile, with bolts,
// stencils, soot, claw gouges, blood and rust. One line round every island, nothing more (the
// owner found a second one hurt the reading): the photoluminescent safety edge, continuous,
// lit in every phase, baked apart so it glows over the dark.
import type { GridMatrix } from '../../config/gridConfig';
import { blur, fbm, rng } from '../doom/fleshNoise';
import {
	FRAME,
	MX,
	MY,
	T,
	fill,
	isWall,
	minus,
	morph,
	paintInto,
	put,
	wallMask
} from './stationPaint';
import { bloodSmear, clawMarks, hexBolt, scorch } from './stationMarks';

/** Paints the walls into `c` and their safety edge into `edge` (drawn over the dark). */
export function paintWalls(
	c: CanvasRenderingContext2D,
	edge: CanvasRenderingContext2D,
	g: GridMatrix
): void {
	const r = rng(231);
	const mask = wallMask(g, 0);
	// a deep shadow round the blocks
	const shadow = blur(wallMask(g, 4), 4, true);
	put(c, paintInto(shadow, fill('rgba(0,0,0,.95)')), 5, 7);
	put(c, paintInto(morph(mask, 2.4, true), fill('#020303')));
	put(
		c,
		paintInto(mask, (p) => {
			const gr = p.createLinearGradient(MX, MY, MX + 25 * T, MY + 27 * T);
			gr.addColorStop(0, '#4a524e');
			gr.addColorStop(1, '#323835');
			p.fillStyle = gr;
			p.fillRect(0, 0, FRAME.w, FRAME.h);
			for (let y = 0; y < g.length; y += 1) {
				for (let x = 0; x < (g[0]?.length ?? 0); x += 1) {
					if (!isWall(g, x, y)) continue;
					const px = MX + x * T;
					const py = MY + y * T;
					const n = fbm(x / 2.7, y / 2.7);
					p.fillStyle = `rgba(${n < 0.5 ? '0,0,0' : '200,210,205'},${Math.abs(n - 0.5) * 0.25})`;
					p.fillRect(px, py, T, T);
					// a recessed panel: deep groove, then the face
					p.fillStyle = 'rgba(0,0,0,.55)';
					p.fillRect(px + 4, py + 4, T - 8, T - 8);
					const fg = p.createLinearGradient(px, py, px + T, py + T);
					fg.addColorStop(0, 'rgba(96,106,101,.92)');
					fg.addColorStop(1, 'rgba(44,50,47,.92)');
					p.fillStyle = fg;
					p.fillRect(px + 5.5, py + 5.5, T - 11, T - 11);
					p.fillStyle = 'rgba(200,210,205,.12)';
					p.fillRect(px + 5.5, py + 5.5, T - 11, 1);
					p.fillRect(px + 5.5, py + 5.5, 1, T - 11);
					// seams between blocks
					p.fillStyle = 'rgba(0,0,0,.85)';
					if (isWall(g, x + 1, y)) p.fillRect(px + T - 1, py, 2, T);
					if (isWall(g, x, y + 1)) p.fillRect(px, py + T - 1, T, 2);
					const k = r();
					if (k < 0.35) {
						hexBolt(p, px + 3, py + 3, 1.9);
						hexBolt(p, px + T - 3, py + T - 3, 1.9);
					} else if (k < 0.43) {
						// a stencilled number, half gone
						p.save();
						p.font = '700 11px "Arial Narrow", Arial, sans-serif';
						p.textAlign = 'center';
						p.textBaseline = 'middle';
						p.fillStyle = 'rgba(190,180,140,.35)';
						p.fillText(String(10 + Math.floor(r() * 80)), px + T / 2, py + T / 2 + 1);
						p.restore();
					} else if (k < 0.5) {
						p.fillStyle = 'rgba(0,0,0,.7)';
						for (let s = 0; s < 3; s += 1) p.fillRect(px + 8, py + 9 + s * 5, T - 16, 2.2);
					}
					// scorch and soot
					if (r() < 0.12) scorch(p, px + r() * T, py + r() * T, 14 + r() * 26, 0.6);
				}
			}
			// gouges and blood on some faces
			for (let i = 0; i < 34; i += 1) {
				let x: number;
				let y: number;
				do {
					x = 1 + Math.floor(r() * 23);
					y = 1 + Math.floor(r() * 25);
				} while (!isWall(g, x, y));
				const px = MX + (x + 0.5) * T;
				const py = MY + (y + 0.5) * T;
				if (r() < 0.55) clawMarks(p, px, py, 20 + r() * 10, -0.6 + r() * 1.2, r);
				else bloodSmear(p, px, py, 18 + r() * 12, 12 + r() * 10, r() * 3, r);
			}
			// rust streaks running down
			for (let i = 0; i < 160; i += 1) {
				const x = MX + r() * 25 * T;
				const y = MY + r() * 27 * T;
				p.strokeStyle = `rgba(80,42,18,${0.12 + r() * 0.2})`;
				p.lineWidth = 0.8 + r() * 1.6;
				p.beginPath();
				p.moveTo(x, y);
				p.lineTo(x + (r() - 0.5) * 2, y + 6 + r() * 18);
				p.stroke();
			}
		})
	);
	// the safety edge: photoluminescent paint on every island's very rim, never broken, glowing
	// without power, so the maze stays readable in every phase
	const rim = minus(morph(mask, 0.5, false), morph(mask, 1.9, false));
	put(edge, paintInto(rim, fill('#bfe9c9')));
}
