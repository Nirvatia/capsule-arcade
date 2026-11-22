// The station's maze (style B): deck-plate corridors with blood dragged toward the nest, vent
// grilles, the nest in the lair (living resin, a torn blast door, crew under the resin) and the
// resin spreading from it phase by phase.
import type { GridMatrix } from '../../config/gridConfig';
import { isTeleportToken } from '../../config/gridConfig';
import { blur, edgeOf, fbm, mixHex, rgbaOf, rng, threshold } from '../doom/fleshNoise';
import type { Phase } from './stationPaint';
import {
	FRAME,
	MX,
	MY,
	T,
	floorMask,
	isLair,
	isVoid,
	isWall,
	layer,
	paintInto,
	put,
	sk
} from './stationPaint';
import { RESIN, clawMarks, dragTrail, hazardBand, resinTexture, rivet } from './stationMarks';

export function paintCorridors(c: CanvasRenderingContext2D, g: GridMatrix): void {
	const r = rng(205);
	const mask = floorMask(g, (x, y) => !isWall(g, x, y) && !isVoid(g, x, y));
	put(
		c,
		paintInto(mask, (p) => {
			p.fillStyle = '#0d0f0e';
			p.fillRect(0, 0, FRAME.w, FRAME.h);
			for (let y = 0; y < g.length; y += 1) {
				for (let x = 0; x < (g[0]?.length ?? 0); x += 1) {
					if (isWall(g, x, y) || isVoid(g, x, y)) continue;
					const px = MX + x * T;
					const py = MY + y * T;
					const n = fbm(x / 5, y / 5);
					const gr = p.createLinearGradient(px, py, px + T, py + T);
					gr.addColorStop(0, mixHex('#1a1e1c', '#232825', n));
					gr.addColorStop(1, mixHex('#121514', '#1a1e1c', n));
					p.fillStyle = gr;
					p.fillRect(px + 1, py + 1, T - 2, T - 2);
					p.fillStyle = 'rgba(0,0,0,.7)';
					p.fillRect(px, py + T - 1.2, T, 1.2);
					p.fillRect(px + T - 1.2, py, 1.2, T);
					p.fillStyle = 'rgba(160,170,165,.05)';
					p.fillRect(px + 1, py + 1, T - 2, 0.8);
					// a faint tread, worn smooth down the middle
					p.fillStyle = 'rgba(150,160,155,.035)';
					for (let k = 5; k < T - 3; k += 6) {
						for (let j = 5; j < T - 3; j += 6) {
							p.fillRect(px + j, py + k, 2.4, 0.8);
						}
					}
				}
			}
			// grime pooled at the walls' feet, wet patches, rust
			for (let i = 0; i < 160; i += 1) {
				const x = MX + r() * 25 * T;
				const y = MY + r() * 27 * T;
				const rad = 8 + r() * 45;
				const gr = p.createRadialGradient(x, y, 0, x, y, rad);
				const rust = r() < 0.2;
				gr.addColorStop(
					0,
					rust ? `rgba(60,32,14,${0.2 + r() * 0.2})` : `rgba(1,2,2,${0.3 + r() * 0.35})`
				);
				gr.addColorStop(1, 'rgba(1,2,2,0)');
				p.fillStyle = gr;
				p.fillRect(x - rad, y - rad, rad * 2, rad * 2);
			}
			// claw gouges in the deck
			for (let i = 0; i < 26; i += 1) {
				const x = MX + (2 + r() * 21) * T;
				const y = MY + (2 + r() * 23) * T;
				clawMarks(p, x, y, 14 + r() * 10, r() * Math.PI, r);
			}
		})
	);
	// blood dragged along corridors toward the nest
	for (const path of [
		[
			[2.5, 2.5],
			[2.5, 6.5],
			[4.5, 6.5],
			[4.5, 10.5],
			[6.5, 10.5],
			[6.5, 13.5],
			[8.5, 13.5]
		],
		[
			[22.5, 24.5],
			[18.5, 24.5],
			[18.5, 22.5],
			[16.5, 22.5],
			[16.5, 16.5]
		],
		[
			[12.5, 2.5],
			[11.5, 2.5],
			[11.5, 4.5],
			[12.5, 4.5]
		]
	]) {
		const pts: Array<[number, number]> = [];
		for (let i = 1; i < path.length; i += 1) {
			const [ax, ay] = path[i - 1];
			const [bx, by] = path[i];
			const n = Math.max(2, Math.round(Math.hypot(bx - ax, by - ay) * 3));
			for (let k = 0; k < n; k += 1) {
				pts.push([
					MX + (ax + ((bx - ax) * k) / n) * T + (r() - 0.5) * 4,
					MY + (ay + ((by - ay) * k) / n) * T + (r() - 0.5) * 4
				]);
			}
		}
		dragTrail(c, pts, r);
	}
}

export function paintVents(c: CanvasRenderingContext2D, g: GridMatrix): void {
	for (let y = 0; y < g.length; y += 1) {
		for (let x = 0; x < (g[0]?.length ?? 0); x += 1) {
			const t = g[y]?.[x] ?? 'ES';
			if (!isTeleportToken(t)) continue;
			const cx = MX + (x + 0.5) * T;
			const cy = MY + (y + 0.5) * T;
			const s = T * 0.46;
			c.save();
			c.fillStyle = '#060708';
			c.beginPath();
			c.roundRect(cx - s - 3, cy - s - 3, (s + 3) * 2, (s + 3) * 2, 5);
			c.fill();
			const gr = c.createLinearGradient(cx - s, cy - s, cx + s, cy + s);
			gr.addColorStop(0, '#6a757f');
			gr.addColorStop(1, '#2f363d');
			c.fillStyle = gr;
			c.beginPath();
			c.roundRect(cx - s, cy - s, s * 2, s * 2, 4);
			c.fill();
			// the dark duct under the louvres
			const inner = s - 4;
			const dg = c.createRadialGradient(cx, cy, 0, cx, cy, inner * 1.4);
			dg.addColorStop(0, '#000');
			dg.addColorStop(1, '#0b0e11');
			c.fillStyle = dg;
			c.fillRect(cx - inner, cy - inner, inner * 2, inner * 2);
			// louvres
			for (let k = -inner + 2.5; k < inner; k += 5) {
				c.fillStyle = '#4c5660';
				c.fillRect(cx - inner, cy + k, inner * 2, 2);
				c.fillStyle = 'rgba(220,235,250,.25)';
				c.fillRect(cx - inner, cy + k, inner * 2, 0.7);
			}
			for (const [bx, by] of [
				[-s + 3, -s + 3],
				[s - 3, -s + 3],
				[-s + 3, s - 3],
				[s - 3, s - 3]
			]) {
				rivet(c, cx + bx, cy + by, 1.6);
			}
			c.restore();
		}
	}
}

/** The nest: the lair filled with living resin, its gate a torn blast door. */
export function paintNest(
	c: CanvasRenderingContext2D,
	glow: CanvasRenderingContext2D,
	g: GridMatrix
): void {
	const r = rng(41);
	const lair = floorMask(g, (x, y) => isLair(g, x, y));
	const nest = paintInto(lair, (p) => {
		const cx = MX + 12.5 * T;
		const cy = MY + 13 * T;
		const gr = p.createRadialGradient(cx, cy, 0, cx, cy, 3 * T);
		gr.addColorStop(0, '#2d3420');
		gr.addColorStop(1, '#0c0e0a');
		p.fillStyle = gr;
		p.fillRect(0, 0, FRAME.w, FRAME.h);
		resinTexture(p, cx - 3 * T, cy - 2 * T, 6 * T, 4 * T, r, 1.4);
	});
	put(c, nest);
	// the nest's own sickly glow from deep inside
	const cx = MX + 12.5 * T;
	const cy = MY + 13 * T;
	const ng = glow.createRadialGradient(cx, cy, 0, cx, cy, 2.6 * T);
	ng.addColorStop(0, 'rgba(155,211,74,.32)');
	ng.addColorStop(1, 'rgba(155,211,74,0)');
	glow.fillStyle = ng;
	glow.fillRect(cx - 3 * T, cy - 3 * T, 6 * T, 6 * T);
	// the torn blast door over the LE tiles
	const les: number[] = [];
	for (let x = 0; x < (g[0]?.length ?? 0); x += 1) if (g[11]?.[x] === 'LE') les.push(x);
	if (les.length) {
		const x0 = MX + les[0] * T;
		const x1 = MX + (les[les.length - 1] + 1) * T;
		const y0 = MY + 11 * T + 6;
		const h = T - 12;
		const half = (x1 - x0) / 2;
		for (const side of [-1, 1]) {
			c.save();
			const hinge = side < 0 ? x0 : x1;
			c.translate(hinge, y0 + h / 2);
			c.rotate(side * 0.12);
			const w = half - 10;
			const x = side < 0 ? 0 : -w;
			c.fillStyle = '#080a0c';
			c.fillRect(x - 2, -h / 2 - 2, w + 4, h + 4);
			c.save();
			c.beginPath();
			c.rect(x, -h / 2, w, h);
			c.clip();
			hazardBand(c, x, -h / 2, w, h, r);
			c.restore();
			// the torn edge
			c.fillStyle = '#080a0c';
			const ex = side < 0 ? x + w : x;
			c.beginPath();
			c.moveTo(ex, -h / 2 - 2);
			for (let k = 0; k <= 6; k += 1) {
				c.lineTo(ex - side * (2 + r() * 6), -h / 2 + (k / 6) * h);
			}
			c.lineTo(ex, h / 2 + 2);
			c.closePath();
			c.fill();
			c.restore();
		}
	}
}

/** Crew cocooned into the nest's walls: shapes of people under the resin. */
export function nestVictims(c: CanvasRenderingContext2D, g: GridMatrix): void {
	const r = rng(241);
	const spots: Array<[number, number, number]> = [];
	for (let y = 0; y < g.length; y += 1)
		for (let x = 0; x < (g[0]?.length ?? 0); x += 1)
			if (isLair(g, x, y) && (x === 10 || x === 14) && (y === 12 || y === 14))
				spots.push([x, y, x === 10 ? 0.4 : -0.4]);
	for (const [x, y, a] of spots) {
		const px = MX + (x + 0.5) * T;
		const py = MY + (y + 0.5) * T;
		c.save();
		c.translate(px, py);
		c.rotate(a);
		c.fillStyle = 'rgba(0,0,0,.6)';
		c.beginPath();
		c.ellipse(3, 4, 12, 20, 0, 0, Math.PI * 2);
		c.fill();
		const gr = c.createLinearGradient(-10, -18, 10, 18);
		gr.addColorStop(0, '#4a4c38');
		gr.addColorStop(1, '#161812');
		c.fillStyle = gr;
		c.beginPath();
		c.ellipse(0, 0, 11, 19, 0, 0, Math.PI * 2);
		c.fill();
		// the face under it, mouth open
		c.fillStyle = 'rgba(10,10,8,.85)';
		c.beginPath();
		c.ellipse(-3, -11, 1.8, 2.2, 0, 0, Math.PI * 2);
		c.ellipse(3, -11, 1.8, 2.2, 0, 0, Math.PI * 2);
		c.fill();
		c.beginPath();
		c.ellipse(0, -5, 2.5, 3.6, 0, 0, Math.PI * 2);
		c.fill();
		c.strokeStyle = 'rgba(8,9,6,.8)';
		c.lineWidth = 1.6;
		for (let k = 0; k < 7; k += 1) {
			const yy = -16 + k * 5.5;
			c.beginPath();
			c.moveTo(-12, yy + r() * 2);
			c.quadraticCurveTo(0, yy - 3, 12, yy + r() * 2);
			c.stroke();
		}
		c.fillStyle = 'rgba(210,220,190,.5)';
		c.beginPath();
		c.ellipse(-5, -14, 3, 1.2, -0.6, 0, Math.PI * 2);
		c.fill();
		c.restore();
	}
	void rgbaOf;
}

/** The nest's resin over the station: from the lair along the corridors and over the walls. */
/** How far the nest's resin has spread, by phase (tiles of path from the lair). */
const RESIN_REACH: Readonly<Record<Phase, number>> = { 1: 1.2, 2: 6.5, 3: 15 };

export function paintResin(c: CanvasRenderingContext2D, g: GridMatrix, phase: Phase): void {
	const reach = RESIN_REACH[phase];
	const W = g[0]?.length ?? 0;
	// path distance from the lair, through floors and walls (resin creeps over both)
	const dist: number[] = new Array(W * g.length).fill(Infinity);
	const q: Array<[number, number]> = [];
	for (let y = 0; y < g.length; y += 1)
		for (let x = 0; x < W; x += 1)
			if (isLair(g, x, y) || g[y]?.[x] === 'LE') {
				dist[y * W + x] = 0;
				q.push([x, y]);
			}
	while (q.length) {
		const [x, y] = q.shift() as [number, number];
		for (const [dx, dy] of [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1]
		]) {
			const nx = x + dx;
			const ny = y + dy;
			if (isVoid(g, nx, ny)) continue;
			const cost = isWall(g, nx, ny) ? 1.6 : 1;
			const d = dist[y * W + x] + cost;
			if (d < dist[ny * W + nx]) {
				dist[ny * W + nx] = d;
				q.push([nx, ny]);
			}
		}
	}
	const [mask, m] = layer();
	m.fillStyle = '#fff';
	const r = rng(53 + phase);
	for (let y = 0; y < g.length; y += 1) {
		for (let x = 0; x < W; x += 1) {
			const d = dist[y * W + x];
			if (!Number.isFinite(d) || isLair(g, x, y)) continue;
			const jitter = (fbm(x / 2.3, y / 2.3) - 0.5) * 5;
			const cover = reach - (d + jitter);
			if (cover <= 0) continue;
			const k = Math.min(1, cover / 2.5);
			for (let i = 0; i < 3; i += 1) {
				m.beginPath();
				m.ellipse(
					MX + (x + 0.2 + r() * 0.6) * T,
					MY + (y + 0.2 + r() * 0.6) * T,
					T * (0.25 + k * 0.45) * (0.7 + r() * 0.5),
					T * (0.25 + k * 0.45) * (0.7 + r() * 0.5),
					r() * 3,
					0,
					Math.PI * 2
				);
				m.fill();
			}
		}
	}
	// tendrils reaching ahead of the sheet
	m.strokeStyle = '#fff';
	m.lineCap = 'round';
	for (let i = 0; i < 40 * phase; i += 1) {
		const a = r() * Math.PI * 2;
		const d0 = r() * reach * T * 0.9;
		let x = MX + 12.5 * T + Math.cos(a) * d0;
		let y = MY + 13 * T + Math.sin(a) * d0 * 0.9;
		let h = a + (r() - 0.5);
		m.lineWidth = 2 + r() * 3;
		m.beginPath();
		m.moveTo(x, y);
		for (let s = 0; s < 8 + r() * 10; s += 1) {
			h += (r() - 0.5) * 0.7;
			x += Math.cos(h) * 9;
			y += Math.sin(h) * 9;
			m.lineTo(x, y);
		}
		m.stroke();
	}
	const soft = threshold(blur(mask, 3, true), 5);
	// keep it off the void and the lair (the lair is the nest already)
	const keep = floorMask(g, (x, y) => !isVoid(g, x, y));
	const shaped = paintInto(keep, (p) => put(p, soft));
	// a dark wet halo under it, then the resin, then its glossy rim
	c.save();
	c.globalAlpha = 0.7;
	put(
		c,
		paintInto(
			blur(shaped, 2, false),
			(p) => ((p.fillStyle = 'rgba(0,0,0,1)'), p.fillRect(0, 0, FRAME.w, FRAME.h))
		),
		3,
		4
	);
	c.restore();
	const rr = rng(97 + phase);
	put(
		c,
		paintInto(shaped, (p) => {
			p.fillStyle = RESIN.dark;
			p.fillRect(0, 0, FRAME.w, FRAME.h);
			resinTexture(p, MX - T, MY - T, 27 * T, 29 * T, rr, 0.9);
		})
	);
	put(
		c,
		paintInto(
			edgeOf(shaped, 2 * sk(), 2 * sk()),
			(p) => ((p.fillStyle = rgbaOf(RESIN.hi, 0.55)), p.fillRect(0, 0, FRAME.w, FRAME.h))
		)
	);
}
