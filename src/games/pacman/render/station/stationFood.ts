// The station's food and pickups (DESIGN.md §7a, style B): the nest's spores, glowing faintly,
// drawn from cached sprites (hundreds a frame), and the flares lying where the energizers are.
import { stationGlow } from './stationColors';

const TAU = Math.PI * 2;

// sprites cached by size: the food is drawn hundreds of times a frame
const sporeCache = new Map<number, HTMLCanvasElement>();
function sporeSprite(S: number, variant: number): HTMLCanvasElement {
	const key = Math.round(S * 4) * 8 + variant;
	const hit = sporeCache.get(key);
	if (hit) return hit;
	const D = 2;
	const size = Math.ceil(S * 0.8 * D);
	const cv = document.createElement('canvas');
	cv.width = size;
	cv.height = size;
	const c = cv.getContext('2d') as CanvasRenderingContext2D;
	c.scale(D, D);
	const m = size / D / 2;
	c.globalCompositeOperation = 'lighter';
	stationGlow(c, m, m, S * 0.32, '#b8e07a', 0.26);
	c.globalCompositeOperation = 'source-over';
	const specks: Array<[number, number, number]> = [
		[0, 0, 0.055],
		[0.08, -0.05, 0.03],
		[-0.06, 0.06, 0.035],
		[0.05, 0.07, 0.022]
	];
	const rot = variant * 1.3;
	for (const [dx, dy, r] of specks) {
		const x = m + (Math.cos(rot) * dx - Math.sin(rot) * dy) * S;
		const y = m + (Math.sin(rot) * dx + Math.cos(rot) * dy) * S;
		const g = c.createRadialGradient(x - r * S * 0.3, y - r * S * 0.3, 0, x, y, r * S);
		g.addColorStop(0, '#f4ffe0');
		g.addColorStop(0.6, '#b9d98a');
		g.addColorStop(1, 'rgba(90,120,60,.6)');
		c.fillStyle = g;
		c.beginPath();
		c.arc(x, y, r * S, 0, TAU);
		c.fill();
	}
	sporeCache.set(key, cv);
	return cv;
}

/** The food: a little cluster of the nest's spores, glowing faintly. */
export function drawSpore(
	c: CanvasRenderingContext2D,
	x: number,
	y: number,
	S: number,
	t: number,
	seed: number
): void {
	const sp = sporeSprite(S, Math.floor(seed * 7.99));
	const w = sp.width / 2;
	c.globalAlpha = 0.8 + 0.2 * Math.sin(t * 1.7 + seed * 9);
	c.drawImage(sp, x - w / 2, y - w / 2, w, w);
	c.globalAlpha = 1;
}

/** A flare: a thin, worn stick; lit, a harsh red burn with heavy smoke. */
export function drawFlare(
	c: CanvasRenderingContext2D,
	x: number,
	y: number,
	S: number,
	t: number,
	lit: boolean
): void {
	const a = -0.5;
	const L = S * 0.48;
	const R = S * 0.055;
	c.save();
	c.translate(x, y);
	if (!lit) {
		c.globalCompositeOperation = 'lighter';
		stationGlow(
			c,
			L * 0.4 * Math.cos(a),
			L * 0.4 * Math.sin(a),
			S * 0.3,
			'#ff2a1a',
			0.18 + 0.12 * Math.max(0, Math.sin(t * 4))
		);
		c.globalCompositeOperation = 'source-over';
	}
	c.rotate(a);
	c.fillStyle = 'rgba(0,0,0,.6)';
	c.fillRect(-L / 2 + 2, -R + 2, L, R * 2);
	const g = c.createLinearGradient(0, -R, 0, R);
	g.addColorStop(0, '#9a3a30');
	g.addColorStop(0.5, '#6e1712');
	g.addColorStop(1, '#2a0807');
	c.fillStyle = g;
	c.beginPath();
	c.roundRect(-L / 2, -R, L, R * 2, R * 0.6);
	c.fill();
	c.fillStyle = 'rgba(200,190,170,.5)';
	c.fillRect(-L * 0.12, -R, L * 0.08, R * 2);
	c.fillStyle = '#25282a';
	c.fillRect(-L / 2, -R, L * 0.16, R * 2);
	c.fillStyle = 'rgba(255,255,255,.18)';
	c.fillRect(-L / 2, -R * 0.7, L, R * 0.3);
	if (lit) {
		const tip = L / 2;
		const fl = 0.8 + 0.2 * Math.sin(t * 41) * Math.sin(t * 27);
		c.globalCompositeOperation = 'lighter';
		stationGlow(c, tip, 0, S * 1.6 * fl, '#ff1a0a', 0.5);
		stationGlow(c, tip, 0, S * 0.35 * fl, '#ffd2c0', 0.95);
		for (let i = 0; i < 18; i += 1) {
			const ph = (t * 2.2 + i * 0.137) % 1;
			const ang = i * 2.39 + Math.floor(t * 2.2 + i * 0.137) * 1.7;
			const d = ph * S * 0.75;
			c.fillStyle = `rgba(255,${180 + (i % 3) * 25},${120 + (i % 2) * 50},${(1 - ph) * 0.9})`;
			c.fillRect(
				tip + Math.cos(ang) * d,
				Math.sin(ang) * d - ph * ph * S * 0.2,
				S * 0.02,
				S * 0.02
			);
		}
	}
	c.restore();
	if (lit) {
		const tx = x + Math.cos(a) * L * 0.5;
		const ty = y + Math.sin(a) * L * 0.5;
		for (let i = 0; i < 10; i += 1) {
			const ph = (t * 0.3 + i / 10) % 1;
			const sx = tx + Math.sin(t * 0.6 + i) * S * 0.3 * ph + ph * S * 0.8;
			const sy = ty - ph * S * 1.2;
			const sr = S * (0.15 + ph * 0.7);
			const g2 = c.createRadialGradient(sx, sy, 0, sx, sy, sr);
			g2.addColorStop(0, `rgba(120,40,40,${0.28 * (1 - ph)})`);
			g2.addColorStop(1, 'rgba(40,10,10,0)');
			c.fillStyle = g2;
			c.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
		}
	}
}
