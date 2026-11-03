// Каменная арена, письменность храма, факелы и карниз HUD. Всё статичное запекается один раз.

import { circle, ellipse, hs, type Light } from './paint';

/** Письменность храма: вертикальный ствол и засечки. Координаты в единичном боксе. */
const RUNES: readonly (readonly [number, number, number, number])[][] = [
	[
		[0.5, 0, 0.5, 1],
		[0.5, 0.28, 0.88, 0.05]
	],
	[
		[0.5, 0, 0.5, 1],
		[0.5, 0.28, 0.12, 0.05]
	],
	[
		[0.5, 0, 0.5, 1],
		[0.5, 0.18, 0.88, 0.38],
		[0.5, 0.5, 0.88, 0.7]
	],
	[
		[0.5, 0, 0.5, 1],
		[0.5, 0.42, 0.12, 0.18],
		[0.5, 0.42, 0.88, 0.18]
	],
	[
		[0.5, 0, 0.5, 1],
		[0.5, 0.55, 0.12, 0.8]
	],
	[
		[0.5, 0, 0.5, 1],
		[0.5, 0.16, 0.88, 0.4],
		[0.5, 0.64, 0.12, 0.4]
	],
	[
		[0.5, 0, 0.5, 1],
		[0.15, 0.3, 0.85, 0.62]
	],
	[
		[0.5, 0, 0.5, 1],
		[0.5, 0, 0.85, 0.22],
		[0.85, 0.22, 0.5, 0.44]
	],
	[
		[0.5, 0, 0.5, 1],
		[0.5, 0.2, 0.82, 0.2],
		[0.5, 0.44, 0.82, 0.44],
		[0.5, 0.68, 0.82, 0.68]
	],
	[
		[0.5, 0, 0.5, 1],
		[0.18, 0.3, 0.5, 0.3],
		[0.18, 0.56, 0.5, 0.56]
	],
	[
		[0.5, 0, 0.5, 1],
		[0.5, 0.14, 0.12, 0.4],
		[0.5, 0.14, 0.88, 0.4]
	],
	[
		[0.5, 0, 0.5, 1],
		[0.5, 0.7, 0.88, 0.96],
		[0.5, 0.36, 0.12, 0.14]
	]
];

export function carveRune(
	b: CanvasRenderingContext2D,
	idx: number,
	x: number,
	y: number,
	w: number,
	h: number,
	lwScale = 1
): void {
	const g = RUNES[idx % RUNES.length];
	const lw = Math.max(1, w * 0.13) * lwScale;
	b.lineCap = 'round';
	b.lineJoin = 'round';
	const passes: [string, number, number][] = [
		['rgba(225,240,235,0.13)', 0.7, 0.9],
		['rgba(9,12,12,0.8)', 0, 0]
	];
	for (const [col, dx, dy] of passes) {
		b.strokeStyle = col;
		b.lineWidth = lw;
		b.beginPath();
		for (const [x1, y1, x2, y2] of g) {
			b.moveTo(x + x1 * w + dx, y + y1 * h + dy);
			b.lineTo(x + x2 * w + dx, y + y2 * h + dy);
		}
		b.stroke();
	}
}

export function drawArena(
	b: CanvasRenderingContext2D,
	cols: number,
	rows: number,
	cs: number,
	isWall: (c: number, r: number) => boolean,
	torches: readonly (readonly [number, number])[]
): void {
	const W = cols * cs;
	const H = rows * cs;
	b.fillStyle = '#0b0d0e';
	b.fillRect(0, 0, W, H);
	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < cols; c++) {
			const x0 = c * cs;
			const y0 = r * cs;
			const k = c * 41 + r * 23 + 7;
			if (!isWall(c, r)) {
				const L = Math.round(33 + hs(k) * 9);
				b.fillStyle = `rgb(${L},${L + 6},${L + 5})`;
				b.fillRect(x0 + 1, y0 + 1, cs - 2, cs - 2);
				for (let i = 0; i < 4; i++) {
					b.fillStyle = `rgba(${i % 2 ? '0,0,0' : '190,210,205'},${0.05 + hs(k + i) * 0.05})`;
					circle(
						b,
						x0 + 2 + hs(k + i * 3) * (cs - 4),
						y0 + 2 + hs(k + i * 5) * (cs - 4),
						0.5 + hs(k + i * 7) * 1.1
					);
				}
				b.fillStyle = 'rgba(205,225,220,0.06)';
				b.fillRect(x0 + 1, y0 + 1, cs - 2, 1.2);
				b.fillRect(x0 + 1, y0 + 1, 1.2, cs - 2);
				b.fillStyle = 'rgba(0,0,0,0.3)';
				b.fillRect(x0 + 1, y0 + cs - 2.2, cs - 2, 1.2);
				b.fillRect(x0 + cs - 2.2, y0 + 1, 1.2, cs - 2);
				if (hs(k * 3) > 0.86) {
					b.strokeStyle = 'rgba(0,0,0,0.4)';
					b.lineWidth = 0.8;
					b.beginPath();
					b.moveTo(x0 + 2 + hs(k * 5) * (cs - 4), y0 + 2);
					b.lineTo(x0 + cs * (0.35 + hs(k * 9) * 0.3), y0 + cs * 0.5);
					b.lineTo(x0 + 2 + hs(k * 7) * (cs - 4), y0 + cs - 2);
					b.stroke();
				}
				if (r > 0 && isWall(c, r - 1)) {
					const g = b.createLinearGradient(0, y0, 0, y0 + cs * 0.5);
					g.addColorStop(0, 'rgba(0,0,0,0.55)');
					g.addColorStop(1, 'rgba(0,0,0,0)');
					b.fillStyle = g;
					b.fillRect(x0, y0, cs, cs * 0.5);
				}
				if (c > 0 && isWall(c - 1, r)) {
					const g = b.createLinearGradient(x0, 0, x0 + cs * 0.3, 0);
					g.addColorStop(0, 'rgba(0,0,0,0.4)');
					g.addColorStop(1, 'rgba(0,0,0,0)');
					b.fillStyle = g;
					b.fillRect(x0, y0, cs * 0.3, cs);
				}
				continue;
			}
			const front = r + 1 < rows && !isWall(c, r + 1);
			const topH = front ? cs * 0.72 : cs;
			const g = b.createLinearGradient(0, y0, 0, y0 + topH);
			g.addColorStop(0, '#56605d');
			g.addColorStop(1, '#3f4846');
			b.fillStyle = g;
			b.fillRect(x0, y0, cs, topH);
			b.fillStyle = 'rgba(230,245,240,0.16)';
			b.fillRect(x0, y0, cs, 1.4);
			b.fillStyle = 'rgba(0,0,0,0.35)';
			b.fillRect(x0 + cs - 1, y0, 1, topH);
			if (front) {
				b.fillStyle = '#222827';
				b.fillRect(x0, y0 + topH, cs, cs - topH);
				b.fillStyle = 'rgba(0,0,0,0.5)';
				b.fillRect(x0, y0 + topH, cs, 1.2);
				b.fillStyle = 'rgba(255,255,255,0.04)';
				b.fillRect(x0, y0 + cs - 2, cs, 1);
			}
			if (hs(k * 5) > 0.72) {
				b.fillStyle = 'rgba(63,209,189,0.07)';
				ellipse(b, x0 + cs * hs(k * 11), y0 + topH * 0.6, cs * 0.35, cs * 0.18);
			}
			const isTorch = torches.some(([tc, tr]) => tc === c && tr === r);
			if (r === 0 && c > 0 && c < cols - 1 && !isTorch) {
				const gw = cs * 0.3;
				const gh = topH * 0.56;
				const gy = y0 + topH * 0.22;
				carveRune(b, Math.floor(hs(k * 9) * RUNES.length), x0 + cs * 0.1, gy, gw, gh);
				if (hs(k * 13) > 0.78) {
					b.fillStyle = 'rgba(10,13,13,0.7)';
					circle(b, x0 + cs * 0.72, gy + gh * 0.5, cs * 0.035);
				} else {
					carveRune(b, Math.floor(hs(k * 17) * RUNES.length), x0 + cs * 0.56, gy, gw, gh);
				}
			} else if (r > 0 && hs(k * 2) > 0.9) {
				carveRune(
					b,
					Math.floor(hs(k * 9) * RUNES.length),
					x0 + cs * 0.32,
					y0 + topH * 0.2,
					cs * 0.36,
					topH * 0.6
				);
			}
		}
	}
	// Тёплые пятна факелов — статичные, без мерцания.
	b.save();
	b.globalCompositeOperation = 'lighter';
	for (const [c, r] of torches) {
		const x = (c + 0.5) * cs;
		const y = (r + 0.5) * cs;
		const g = b.createRadialGradient(x, y, 0, x, y, cs * 7);
		g.addColorStop(0, 'rgba(255,140,60,0.22)');
		g.addColorStop(0.45, 'rgba(255,120,50,0.07)');
		g.addColorStop(1, 'rgba(255,120,50,0)');
		b.fillStyle = g;
		b.fillRect(x - cs * 7, y - cs * 7, cs * 14, cs * 14);
	}
	b.restore();
	const v = b.createRadialGradient(
		W / 2,
		H / 2,
		Math.min(W, H) * 0.35,
		W / 2,
		H / 2,
		Math.hypot(W, H) * 0.55
	);
	v.addColorStop(0, 'rgba(0,0,0,0)');
	v.addColorStop(1, 'rgba(0,0,0,0.5)');
	b.fillStyle = v;
	b.fillRect(0, 0, W, H);
}

/** Пламя факела: колышется только язычок, свет вокруг постоянный. */
export function drawTorch(
	c: CanvasRenderingContext2D,
	cs: number,
	col: number,
	row: number,
	t: number,
	seed: number,
	L: Light[]
): void {
	const x = (col + 0.5) * cs;
	const y = (row + 0.45) * cs;
	const n =
		0.5 * Math.sin(t * 2.3 + seed) +
		0.3 * Math.sin(t * 3.9 + seed * 1.7) +
		0.2 * Math.sin(t * 6.1 + seed * 2.3);
	const h = cs * 0.3 * (1 + 0.1 * n);
	const w = cs * 0.1;
	const sway = n * cs * 0.025;
	c.fillStyle = '#6b4f2a';
	c.fillRect(x - cs * 0.09, y + cs * 0.02, cs * 0.18, cs * 0.16);
	c.fillStyle = '#9a7442';
	c.fillRect(x - cs * 0.12, y, cs * 0.24, cs * 0.05);
	c.fillStyle = '#ff8a3a';
	c.beginPath();
	c.moveTo(x + sway, y - h);
	c.quadraticCurveTo(x + w * 1.8, y - h * 0.15, x, y + w * 0.3);
	c.quadraticCurveTo(x - w * 1.8, y - h * 0.15, x + sway, y - h);
	c.fill();
	c.fillStyle = '#ffe2a0';
	c.beginPath();
	c.moveTo(x + sway * 0.6, y - h * 0.6);
	c.quadraticCurveTo(x + w * 0.9, y - h * 0.05, x, y + w * 0.1);
	c.quadraticCurveTo(x - w * 0.9, y - h * 0.05, x + sway * 0.6, y - h * 0.6);
	c.fill();
	L.push([x, y - h * 0.3, cs * 0.9, '#ff9a4a', 0.5]);
}

/** Каменный карниз под HUD: тот же базальт, полоса рун внизу. */
export function drawBand(b: CanvasRenderingContext2D, W: number, H: number, cols: number): void {
	const cs = W / cols;
	const cap = H * 0.15;
	const strip = H * 0.22;
	const mainY = cap;
	const mainH = H - cap - strip;
	b.fillStyle = '#2c3331';
	b.fillRect(0, 0, W, H);
	for (let i = 0; i * cs * 3 < W + cs * 3; i++) {
		const x = i * cs * 3 - cs * 1.2;
		const L = Math.round(74 + hs(i * 7 + 3) * 12);
		const g = b.createLinearGradient(0, mainY, 0, mainY + mainH);
		g.addColorStop(0, `rgb(${L},${L + 10},${L + 7})`);
		g.addColorStop(1, `rgb(${L - 20},${L - 11},${L - 13})`);
		b.fillStyle = g;
		b.fillRect(x, mainY, cs * 3, mainH);
		b.fillStyle = 'rgba(0,0,0,0.55)';
		b.fillRect(x, mainY, 1.2, mainH);
		b.fillStyle = 'rgba(230,240,235,0.08)';
		b.fillRect(x + 1.2, mainY, 1, mainH);
		for (let k = 0; k < 26; k++) {
			b.fillStyle = `rgba(${k % 2 ? '0,0,0' : '200,215,210'},${0.05 + hs(i * 31 + k) * 0.06})`;
			circle(
				b,
				x + hs(i * 13 + k * 3) * cs * 3,
				mainY + hs(i * 17 + k * 5) * mainH,
				0.5 + hs(k + i) * 1.2
			);
		}
		if (hs(i * 5) > 0.6) {
			b.fillStyle = 'rgba(63,209,189,0.06)';
			ellipse(b, x + cs * 1.5, mainY + mainH * 0.7, cs * 1.1, mainH * 0.25);
		}
	}
	const cg = b.createLinearGradient(0, 0, 0, cap);
	cg.addColorStop(0, '#6c7774');
	cg.addColorStop(1, '#4b5452');
	b.fillStyle = cg;
	b.fillRect(0, 0, W, cap);
	b.fillStyle = 'rgba(240,248,245,0.22)';
	b.fillRect(0, 0, W, 1.4);
	b.fillStyle = 'rgba(0,0,0,0.6)';
	b.fillRect(0, cap - 1.5, W, 1.5);
	b.fillStyle = 'rgba(0,0,0,0.35)';
	b.fillRect(0, cap, W, 2.5);
	const sy = H - strip;
	b.fillStyle = '#363e3c';
	b.fillRect(0, sy, W, strip);
	b.fillStyle = 'rgba(0,0,0,0.6)';
	b.fillRect(0, sy, W, 1.4);
	b.fillStyle = 'rgba(230,240,235,0.12)';
	b.fillRect(0, sy + 1.4, W, 1);
	const gh = strip * 0.56;
	const gw = gh * 0.55;
	for (let i = 0, x = cs * 0.4; x < W - gw; i++, x += gw * 1.6) {
		if (hs(i * 3.3) > 0.86) {
			b.fillStyle = 'rgba(9,12,12,0.7)';
			circle(b, x + gw * 0.5, sy + strip * 0.5, gw * 0.14);
			continue;
		}
		carveRune(b, Math.floor(hs(i * 7.1) * RUNES.length), x, sy + strip * 0.22, gw, gh, 0.8);
	}
	b.fillStyle = 'rgba(0,0,0,0.7)';
	b.fillRect(0, H - 1.5, W, 1.5);
}
