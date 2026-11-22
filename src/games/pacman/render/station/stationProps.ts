// The station's surround props (style B), each telling what happened here: the hull's I-beams,
// the quarantine lab's specimen tanks (one burst), the dead crew, the breach in the hull the
// nest pours out of, and the window in the deck onto the storm of the planet below.
import type { Rng } from '../doom/fleshNoise';
import { blur, edgeOf, mixHex, threshold } from '../doom/fleshNoise';
import { FRAME, MX, T, fill, layer, paintInto, put, sk } from './stationPaint';
import { hexBolt, resinTexture } from './stationMarks';

const R = MX + 24 * T;

/** The window in the deck, right of the maze (scene units). */
export const VIEWPORT = { x: R + 300, y: 560, r: 165 } as const;

/** A massive straight I-beam of the hull, cross-braced, rusted at its rivets. */
export function iBeam(c: CanvasRenderingContext2D, x: number, w: number, r: Rng): void {
	c.save();
	c.fillStyle = 'rgba(0,0,0,.6)';
	c.filter = 'blur(10px)';
	c.fillRect(x - w / 2 + 14, -40, w, FRAME.h + 80);
	c.filter = 'none';
	c.fillStyle = '#050606';
	c.fillRect(x - w / 2 - 3, -40, w + 6, FRAME.h + 80);
	const g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
	g.addColorStop(0, '#3c4340');
	g.addColorStop(0.18, '#2a2f2d');
	g.addColorStop(0.5, '#1a1d1c');
	g.addColorStop(0.82, '#2a2f2d');
	g.addColorStop(1, '#121413');
	c.fillStyle = g;
	c.fillRect(x - w / 2, -40, w, FRAME.h + 80);
	// flanges
	c.fillStyle = 'rgba(200,210,205,.10)';
	c.fillRect(x - w / 2, -40, 2, FRAME.h + 80);
	c.fillStyle = 'rgba(0,0,0,.6)';
	c.fillRect(x - w / 2 + w * 0.2, -40, 2, FRAME.h + 80);
	c.fillRect(x + w / 2 - w * 0.2 - 2, -40, 2, FRAME.h + 80);
	// web holes and rivet rows
	for (let y = 20; y < FRAME.h; y += 120) {
		c.fillStyle = '#030404';
		c.beginPath();
		c.roundRect(x - w * 0.18, y, w * 0.36, 60, w * 0.18);
		c.fill();
		c.strokeStyle = 'rgba(150,160,155,.12)';
		c.lineWidth = 1.5;
		c.stroke();
	}
	for (let y = 0; y < FRAME.h; y += 16) {
		for (const fx of [x - w / 2 + w * 0.1, x + w / 2 - w * 0.1]) {
			c.fillStyle = 'rgba(0,0,0,.6)';
			c.beginPath();
			c.arc(fx + 0.6, y + 0.8, 2.2, 0, Math.PI * 2);
			c.fill();
			c.fillStyle = '#4a514d';
			c.beginPath();
			c.arc(fx, y, 2, 0, Math.PI * 2);
			c.fill();
			if (r() < 0.12) {
				c.strokeStyle = `rgba(90,48,20,${0.3 + r() * 0.3})`;
				c.lineWidth = 1.5;
				c.beginPath();
				c.moveTo(fx, y);
				c.lineTo(fx, y + 8 + r() * 26);
				c.stroke();
			}
		}
	}
	c.restore();
}

export function specimenTank(
	c: CanvasRenderingContext2D,
	glow: CanvasRenderingContext2D,
	x: number,
	y: number,
	rad: number,
	kind: 'full' | 'burst' | 'empty',
	r: Rng
): void {
	c.save();
	c.fillStyle = 'rgba(0,0,0,.65)';
	c.filter = 'blur(8px)';
	c.beginPath();
	c.arc(x + 10, y + 12, rad + 8, 0, Math.PI * 2);
	c.fill();
	c.filter = 'none';
	// the base ring
	c.fillStyle = '#050606';
	c.beginPath();
	c.arc(x, y, rad + 9, 0, Math.PI * 2);
	c.fill();
	const ring = c.createLinearGradient(x - rad, y - rad, x + rad, y + rad);
	ring.addColorStop(0, '#525a56');
	ring.addColorStop(1, '#191c1b');
	c.fillStyle = ring;
	c.beginPath();
	c.arc(x, y, rad + 7, 0, Math.PI * 2);
	c.fill();
	for (let k = 0; k < 10; k += 1) {
		const a = (k / 10) * Math.PI * 2;
		hexBolt(c, x + Math.cos(a) * (rad + 3.5), y + Math.sin(a) * (rad + 3.5), 2.2);
	}
	// the fluid
	const fl = c.createRadialGradient(x - rad * 0.3, y - rad * 0.3, 0, x, y, rad);
	if (kind === 'full') {
		fl.addColorStop(0, '#2d4a35');
		fl.addColorStop(1, '#08130c');
	} else {
		fl.addColorStop(0, '#141816');
		fl.addColorStop(1, '#050706');
	}
	c.fillStyle = fl;
	c.beginPath();
	c.arc(x, y, rad, 0, Math.PI * 2);
	c.fill();
	if (kind === 'full') {
		// the thing inside, curled
		c.save();
		c.beginPath();
		c.arc(x, y, rad, 0, Math.PI * 2);
		c.clip();
		c.fillStyle = 'rgba(4,8,5,.85)';
		c.beginPath();
		c.ellipse(x + rad * 0.05, y, rad * 0.42, rad * 0.32, 0.6, 0, Math.PI * 2);
		c.fill();
		c.strokeStyle = 'rgba(4,8,5,.85)';
		c.lineCap = 'round';
		for (let i = 0; i < 5; i += 1) {
			const a = i * 1.25 + 0.4;
			c.lineWidth = 3.5 - i * 0.4;
			c.beginPath();
			c.moveTo(x + Math.cos(a) * rad * 0.25, y + Math.sin(a) * rad * 0.2);
			c.quadraticCurveTo(
				x + Math.cos(a + 0.6) * rad * 0.6,
				y + Math.sin(a + 0.6) * rad * 0.6,
				x + Math.cos(a + 1.1) * rad * 0.75,
				y + Math.sin(a + 1.1) * rad * 0.7
			);
			c.stroke();
		}
		// bubbles
		for (let i = 0; i < 12; i += 1) {
			c.strokeStyle = 'rgba(160,220,170,.25)';
			c.lineWidth = 0.8;
			c.beginPath();
			c.arc(
				x + (r() - 0.5) * rad * 1.5,
				y + (r() - 0.5) * rad * 1.5,
				1 + r() * 2.5,
				0,
				Math.PI * 2
			);
			c.stroke();
		}
		c.restore();
		const g = glow.createRadialGradient(x, y, 0, x, y, rad);
		g.addColorStop(0, 'rgba(110,200,120,.35)');
		g.addColorStop(1, 'rgba(110,200,120,0)');
		glow.fillStyle = g;
		glow.fillRect(x - rad, y - rad, rad * 2, rad * 2);
	}
	// glass: a reflection, and for the burst one jagged shards round the rim
	c.strokeStyle = 'rgba(210,235,225,.22)';
	c.lineWidth = 3;
	c.beginPath();
	c.arc(x, y, rad * 0.82, Math.PI * 1.1, Math.PI * 1.5);
	c.stroke();
	if (kind === 'burst') {
		c.fillStyle = 'rgba(190,220,210,.35)';
		for (let i = 0; i < 14; i += 1) {
			const a = r() * Math.PI * 2;
			const rr = rad * (0.85 + r() * 0.15);
			c.beginPath();
			c.moveTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
			c.lineTo(x + Math.cos(a + 0.05) * rr * 0.7, y + Math.sin(a + 0.05) * rr * 0.7);
			c.lineTo(x + Math.cos(a + 0.12) * rad, y + Math.sin(a + 0.12) * rad);
			c.fill();
		}
		// shards on the deck
		for (let i = 0; i < 24; i += 1) {
			const a = r() * Math.PI * 2;
			const d = rad + 10 + r() * 70;
			c.save();
			c.translate(x + Math.cos(a) * d, y + Math.sin(a) * d);
			c.rotate(r() * 6);
			c.fillStyle = `rgba(190,220,210,${0.15 + r() * 0.2})`;
			c.beginPath();
			c.moveTo(0, 0);
			c.lineTo(3 + r() * 6, 1);
			c.lineTo(1, 3 + r() * 5);
			c.fill();
			c.restore();
		}
	}
	c.restore();
}

/** A dead crew member, face down, seen from above. */
export function body(c: CanvasRenderingContext2D, x: number, y: number, a: number, r: Rng): void {
	c.save();
	c.translate(x, y);
	c.rotate(a);
	// the pool
	const pool = c.createRadialGradient(4, -6, 0, 4, -6, 52);
	pool.addColorStop(0, 'rgba(48,6,6,.85)');
	pool.addColorStop(0.7, 'rgba(34,4,4,.6)');
	pool.addColorStop(1, 'rgba(30,4,4,0)');
	c.fillStyle = pool;
	c.beginPath();
	c.ellipse(4, -6, 50, 38, 0.3, 0, Math.PI * 2);
	c.fill();
	c.fillStyle = 'rgba(255,200,190,.08)';
	c.beginPath();
	c.ellipse(-6, -16, 14, 4, 0.3, 0, Math.PI * 2);
	c.fill();
	const suit = '#3b3f37';
	const dark = '#16181a';
	c.lineCap = 'round';
	c.strokeStyle = 'rgba(0,0,0,.6)';
	c.lineWidth = 13;
	for (const [x0, y0, x1, y1] of [
		[-10, 6, -24, 34],
		[10, 6, 18, 36],
		[-12, -18, -34, -8],
		[12, -18, 26, -36]
	]) {
		c.beginPath();
		c.moveTo(x0 + 2, y0 + 3);
		c.lineTo(x1 + 2, y1 + 3);
		c.stroke();
	}
	c.strokeStyle = suit;
	c.lineWidth = 10;
	for (const [x0, y0, x1, y1] of [
		[-8, 6, -22, 33],
		[8, 6, 16, 35],
		[-11, -18, -32, -8],
		[11, -18, 24, -35]
	]) {
		c.beginPath();
		c.moveTo(x0, y0);
		c.lineTo(x1, y1);
		c.stroke();
	}
	c.fillStyle = dark;
	c.beginPath();
	c.roundRect(-15, -24, 30, 36, 9);
	c.fill();
	c.fillStyle = suit;
	c.beginPath();
	c.roundRect(-14, -23, 28, 34, 8);
	c.fill();
	c.fillStyle = 'rgba(201,162,39,.5)';
	c.fillRect(-14, -12, 28, 3);
	// head (a helmet, cracked)
	c.fillStyle = dark;
	c.beginPath();
	c.arc(0, -32, 10, 0, Math.PI * 2);
	c.fill();
	c.fillStyle = '#2a2e2c';
	c.beginPath();
	c.arc(0, -32, 9, 0, Math.PI * 2);
	c.fill();
	c.strokeStyle = 'rgba(200,210,205,.3)';
	c.lineWidth = 0.8;
	c.beginPath();
	c.moveTo(-4, -36);
	c.lineTo(0, -31);
	c.lineTo(5, -34);
	c.stroke();
	// the wound: torn open across the back
	c.fillStyle = '#1a0303';
	c.beginPath();
	c.ellipse(2, -6, 7, 11, 0.4, 0, Math.PI * 2);
	c.fill();
	c.strokeStyle = 'rgba(120,20,16,.7)';
	c.lineWidth = 1.5;
	c.stroke();
	c.restore();
	void r;
}

/** A round window in the deck onto the storm of the planet below. */
export function viewport(
	c: CanvasRenderingContext2D,
	glow: CanvasRenderingContext2D,
	r: Rng
): void {
	const { x, y, r: rad } = VIEWPORT;
	c.save();
	c.fillStyle = 'rgba(0,0,0,.7)';
	c.filter = 'blur(12px)';
	c.beginPath();
	c.arc(x + 12, y + 14, rad + 30, 0, Math.PI * 2);
	c.fill();
	c.filter = 'none';
	// heavy frame and hazard ring
	c.fillStyle = '#040505';
	c.beginPath();
	c.arc(x, y, rad + 30, 0, Math.PI * 2);
	c.fill();
	const fr = c.createLinearGradient(x - rad, y - rad, x + rad, y + rad);
	fr.addColorStop(0, '#4b524f');
	fr.addColorStop(1, '#131615');
	c.fillStyle = fr;
	c.beginPath();
	c.arc(x, y, rad + 27, 0, Math.PI * 2);
	c.fill();
	for (let i = 0; i < 40; i += 1) {
		c.fillStyle = i % 2 ? '#141615' : 'rgba(170,135,30,.75)';
		c.beginPath();
		c.arc(x, y, rad + 14, (i / 40) * Math.PI * 2, ((i + 1) / 40) * Math.PI * 2);
		c.arc(x, y, rad + 6, ((i + 1) / 40) * Math.PI * 2, (i / 40) * Math.PI * 2, true);
		c.closePath();
		c.fill();
	}
	for (let k = 0; k < 24; k += 1) {
		const a = (k / 24) * Math.PI * 2;
		hexBolt(c, x + Math.cos(a) * (rad + 21), y + Math.sin(a) * (rad + 21), 3);
	}
	c.fillStyle = '#020303';
	c.beginPath();
	c.arc(x, y, rad + 4, 0, Math.PI * 2);
	c.fill();
	// the void and the planet's limb
	c.beginPath();
	c.arc(x, y, rad, 0, Math.PI * 2);
	c.clip();
	c.fillStyle = '#020306';
	c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
	for (let i = 0; i < 90; i += 1) {
		c.fillStyle = `rgba(220,230,255,${0.2 + r() * 0.6})`;
		c.fillRect(x - rad + r() * rad * 2, y - rad + r() * rad, 1, 1);
	}
	const px = x + rad * 0.9;
	const py = y + rad * 1.55;
	const pr = rad * 1.55;
	const planet = c.createRadialGradient(px - pr * 0.3, py - pr * 0.5, pr * 0.2, px, py, pr);
	planet.addColorStop(0, '#3a2a18');
	planet.addColorStop(0.75, '#1d150d');
	planet.addColorStop(0.97, '#5c3a1a');
	planet.addColorStop(1, 'rgba(200,120,50,.0)');
	c.fillStyle = planet;
	c.beginPath();
	c.arc(px, py, pr, 0, Math.PI * 2);
	c.fill();
	// storm bands
	c.save();
	c.beginPath();
	c.arc(px, py, pr, 0, Math.PI * 2);
	c.clip();
	for (let i = 0; i < 260; i += 1) {
		const a = -Math.PI * 0.95 + r() * Math.PI * 0.6;
		const d = pr * (0.55 + r() * 0.45);
		const sx = px + Math.cos(a) * d;
		const sy = py + Math.sin(a) * d;
		c.strokeStyle = `rgba(${150 + r() * 60},${90 + r() * 40},${40 + r() * 20},${0.06 + r() * 0.1})`;
		c.lineWidth = 2 + r() * 5;
		c.beginPath();
		c.arc(px, py, d, a, a + 0.05 + r() * 0.2);
		c.stroke();
		void sx;
		void sy;
	}
	c.restore();
	// atmosphere rim
	c.strokeStyle = 'rgba(230,150,70,.35)';
	c.lineWidth = 3;
	c.beginPath();
	c.arc(px, py, pr, Math.PI * 1.05, Math.PI * 1.6);
	c.stroke();
	// cracks in the glass
	c.strokeStyle = 'rgba(220,235,230,.4)';
	c.lineWidth = 0.9;
	const cx0 = x - rad * 0.35;
	const cy0 = y - rad * 0.2;
	for (let i = 0; i < 9; i += 1) {
		let a = (i / 9) * Math.PI * 2 + r() * 0.3;
		let qx = cx0;
		let qy = cy0;
		c.beginPath();
		c.moveTo(qx, qy);
		for (let s = 0; s < 6; s += 1) {
			a += (r() - 0.5) * 0.5;
			qx += Math.cos(a) * (12 + r() * 16);
			qy += Math.sin(a) * (12 + r() * 16);
			c.lineTo(qx, qy);
		}
		c.stroke();
	}
	for (const rr of [10, 22]) {
		c.beginPath();
		for (let i = 0; i <= 12; i += 1) {
			const a = (i / 12) * Math.PI * 2;
			c.lineTo(
				cx0 + Math.cos(a) * rr * (0.8 + r() * 0.4),
				cy0 + Math.sin(a) * rr * (0.8 + r() * 0.4)
			);
		}
		c.stroke();
	}
	c.strokeStyle = 'rgba(200,220,255,.2)';
	c.lineWidth = 6;
	c.beginPath();
	c.arc(x, y, rad * 0.86, Math.PI * 1.12, Math.PI * 1.38);
	c.stroke();
	c.restore();
	// the planet's light
	const g = glow.createRadialGradient(px, py - pr * 0.6, 0, px, py - pr * 0.6, rad * 1.2);
	g.addColorStop(0, 'rgba(200,120,50,.22)');
	g.addColorStop(1, 'rgba(200,120,50,0)');
	glow.save();
	glow.beginPath();
	glow.arc(x, y, rad, 0, Math.PI * 2);
	glow.clip();
	glow.fillStyle = g;
	glow.fillRect(x - rad, y - rad, rad * 2, rad * 2);
	glow.restore();
}

/** A breach torn in the hull: the plating peeled back, the nest pouring out of the dark. */
export function breach(c: CanvasRenderingContext2D, x: number, y: number, r: Rng): void {
	// resin spilling over the deck around it
	const [mask, m] = layer();
	m.fillStyle = '#fff';
	for (let i = 0; i < 14; i += 1) {
		m.beginPath();
		m.ellipse(
			x + (r() - 0.3) * 200,
			y + (r() - 0.5) * 200,
			30 + r() * 60,
			20 + r() * 40,
			r() * 3,
			0,
			Math.PI * 2
		);
		m.fill();
	}
	m.strokeStyle = '#fff';
	m.lineCap = 'round';
	for (let i = 0; i < 30; i += 1) {
		let a = r() * Math.PI * 2;
		let px = x;
		let py = y;
		m.lineWidth = 3 + r() * 6;
		m.beginPath();
		m.moveTo(px, py);
		for (let s = 0; s < 18; s += 1) {
			a += (r() - 0.5) * 0.6;
			px += Math.cos(a) * 12;
			py += Math.sin(a) * 12;
			m.lineTo(px, py);
		}
		m.stroke();
	}
	const soft = threshold(blur(mask, 3, true), 5);
	put(c, paintInto(blur(soft, 3, false), fill('rgba(0,0,0,.8)')), 4, 6);
	put(
		c,
		paintInto(soft, (p) => {
			p.fillStyle = '#0d0f0b';
			p.fillRect(0, 0, FRAME.w, FRAME.h);
			resinTexture(p, x - 300, y - 300, 600, 600, r, 1.3);
		})
	);
	put(c, paintInto(edgeOf(soft, 2 * sk(), 2 * sk()), fill('rgba(170,185,150,.45)')));
	// the hole
	c.save();
	c.translate(x, y);
	c.fillStyle = '#000';
	c.beginPath();
	for (let i = 0; i <= 18; i += 1) {
		const a = (i / 18) * Math.PI * 2;
		const rr = 48 + r() * 26;
		c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.75);
	}
	c.closePath();
	c.fill();
	// peeled plates round the hole
	for (let i = 0; i < 9; i += 1) {
		const a = (i / 9) * Math.PI * 2 + r() * 0.3;
		c.save();
		c.rotate(a);
		c.translate(62, 0);
		c.fillStyle = '#050606';
		c.beginPath();
		c.moveTo(-14, -14);
		c.lineTo(18 + r() * 12, -4);
		c.lineTo(16 + r() * 10, 10);
		c.lineTo(-14, 14);
		c.fill();
		c.fillStyle = mixHex('#2d3330', '#454c48', r());
		c.beginPath();
		c.moveTo(-12, -12);
		c.lineTo(15 + r() * 10, -3);
		c.lineTo(13 + r() * 8, 8);
		c.lineTo(-12, 12);
		c.fill();
		c.restore();
	}
	// ribs of the hull showing in the dark
	c.strokeStyle = 'rgba(70,78,74,.5)';
	c.lineWidth = 5;
	for (let k = -2; k <= 2; k += 1) {
		c.beginPath();
		c.moveTo(k * 18, -40);
		c.quadraticCurveTo(k * 22, 0, k * 18, 40);
		c.stroke();
	}
	c.restore();
}
