// The station, style B (the owner asked for a brutal, frightening alternative to style A):
// not a service deck but a quarantine lab that something got out of. Massive scorched bulkheads
// with claw gouges and blood, heavy deck plates with drag trails, light strips that mostly died;
// round the maze a story: specimen tanks (one burst), a hull breach the nest pours out of, the
// dead crew, and a floor viewport onto the storm of the planet below. Baked once per phase like
// style A, in the same scene units and with the same `StationBake` shape.
import type { GridMatrix } from '../../../src/games/pacman/config/gridConfig';
import type { Rng } from '../../../src/games/pacman/render/doom/fleshNoise';
import { blur, context, edgeOf, fbm, makeCanvas, mixHex, rgbaOf, rng, threshold } from '../../../src/games/pacman/render/doom/fleshNoise';
import type { Phase, StationBake } from './stationScene';
import {
	FRAME,
	K,
	MX,
	MY,
	T,
	floorMask,
	hazardBand,
	isLair,
	isVoid,
	isWall,
	layer,
	minus,
	morph,
	paintInto,
	paintNest,
	paintResin,
	paintVents,
	put,
	resinTexture,
	stationLamps,
	stencil,
	wallMask
} from './stationScene';

const L = MX + T;
const R = MX + 24 * T;
const TOP = MY + T;
const BOT = MY + 26 * T;

export const VIEWPORT = { x: R + 300, y: 560, r: 165 } as const;

const fill = (color: string) => (p: CanvasRenderingContext2D) => {
	p.fillStyle = color;
	p.fillRect(0, 0, FRAME.w, FRAME.h);
};

function hexBolt(c: CanvasRenderingContext2D, x: number, y: number, s: number): void {
	c.fillStyle = 'rgba(0,0,0,.7)';
	c.beginPath();
	for (let i = 0; i < 6; i += 1) {
		const a = (i / 6) * Math.PI * 2 + 0.3;
		c.lineTo(x + s * 0.5 + Math.cos(a) * s * 1.1, y + s * 0.6 + Math.sin(a) * s * 1.1);
	}
	c.fill();
	const g = c.createLinearGradient(x - s, y - s, x + s, y + s);
	g.addColorStop(0, '#5f6662');
	g.addColorStop(1, '#1b1e1d');
	c.fillStyle = g;
	c.beginPath();
	for (let i = 0; i < 6; i += 1) {
		const a = (i / 6) * Math.PI * 2 + 0.3;
		c.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s);
	}
	c.fill();
	c.fillStyle = 'rgba(0,0,0,.5)';
	c.beginPath();
	c.arc(x, y, s * 0.35, 0, Math.PI * 2);
	c.fill();
}

/** Dried and fresh blood: a smear with a dark rim and drips. */
function bloodSmear(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, a: number, r: Rng): void {
	c.save();
	c.translate(x, y);
	c.rotate(a);
	for (let i = 0; i < 9; i += 1) {
		const px = (r() - 0.5) * w;
		const py = (r() - 0.5) * h;
		const g = c.createRadialGradient(px, py, 0, px, py, Math.max(w, h) * (0.2 + r() * 0.25));
		g.addColorStop(0, `rgba(58,9,8,${0.55 + r() * 0.3})`);
		g.addColorStop(0.7, `rgba(40,6,6,${0.35 + r() * 0.2})`);
		g.addColorStop(1, 'rgba(30,4,4,0)');
		c.fillStyle = g;
		c.beginPath();
		c.ellipse(px, py, w * (0.2 + r() * 0.3), h * (0.2 + r() * 0.3), r() * 3, 0, Math.PI * 2);
		c.fill();
	}
	c.strokeStyle = 'rgba(70,10,9,.6)';
	c.lineCap = 'round';
	for (let i = 0; i < 5; i += 1) {
		const px = (r() - 0.5) * w * 0.8;
		c.lineWidth = 0.8 + r() * 1.6;
		c.beginPath();
		c.moveTo(px, 0);
		c.lineTo(px + (r() - 0.5) * 2, h * 0.5 + r() * h * 0.8);
		c.stroke();
	}
	c.restore();
}

/** Three gouges torn through paint into bright metal. */
function clawMarks(c: CanvasRenderingContext2D, x: number, y: number, len: number, a: number, r: Rng): void {
	c.save();
	c.translate(x, y);
	c.rotate(a);
	c.lineCap = 'round';
	for (let k = -1; k <= 1; k += 1) {
		const off = k * 4.2 + (r() - 0.5);
		const l = len * (0.8 + r() * 0.3);
		c.strokeStyle = 'rgba(0,0,0,.8)';
		c.lineWidth = 2.6;
		c.beginPath();
		c.moveTo(-l / 2, off + 0.6);
		c.quadraticCurveTo(0, off - 2 + 0.6, l / 2, off + 1.5 + 0.6);
		c.stroke();
		c.strokeStyle = 'rgba(190,200,196,.55)';
		c.lineWidth = 1;
		c.beginPath();
		c.moveTo(-l / 2 + 2, off);
		c.quadraticCurveTo(0, off - 2, l / 2 - 1, off + 1.5);
		c.stroke();
	}
	c.restore();
}

function scorch(c: CanvasRenderingContext2D, x: number, y: number, rad: number, a: number): void {
	const g = c.createRadialGradient(x, y, 0, x, y, rad);
	g.addColorStop(0, `rgba(5,4,3,${a})`);
	g.addColorStop(0.6, `rgba(20,12,6,${a * 0.5})`);
	g.addColorStop(1, 'rgba(20,12,6,0)');
	c.fillStyle = g;
	c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
}

// ---------------------------------------------------------------------------------------------
// The surround

function paintDeckB(c: CanvasRenderingContext2D): void {
	const r = rng(211);
	c.fillStyle = '#0c0e0d';
	c.fillRect(0, 0, FRAME.w, FRAME.h);
	const P = 96;
	for (let py = -40; py < FRAME.h; py += P) {
		for (let px = -20; px < FRAME.w; px += P) {
			const n = fbm(px / 400, py / 400);
			const g = c.createLinearGradient(px, py, px + P, py + P);
			g.addColorStop(0, mixHex('#191d1b', '#252a27', n));
			g.addColorStop(1, mixHex('#101311', '#1a1e1c', n));
			c.fillStyle = g;
			c.fillRect(px + 2, py + 2, P - 4, P - 4);
			// a heavy chamfer and deep seam
			c.fillStyle = 'rgba(160,172,166,.07)';
			c.fillRect(px + 2, py + 2, P - 4, 2);
			c.fillRect(px + 2, py + 2, 2, P - 4);
			c.fillStyle = 'rgba(0,0,0,.5)';
			c.fillRect(px + 2, py + P - 4, P - 4, 2);
			c.fillRect(px + P - 4, py + 2, 2, P - 4);
			for (const [bx, by] of [
				[9, 9],
				[P - 9, 9],
				[9, P - 9],
				[P - 9, P - 9]
			]) {
				hexBolt(c, px + bx, py + by, 3.2);
			}
			// tread plate on a few
			if (r() < 0.3) {
				c.fillStyle = 'rgba(150,160,155,.045)';
				for (let k = 10; k < P - 8; k += 9) {
					for (let j = 10; j < P - 8; j += 9) {
						c.save();
						c.translate(px + j, py + k);
						c.rotate(((k + j) / 9) % 2 ? 0.8 : -0.8);
						c.fillRect(-3, -0.8, 6, 1.6);
						c.restore();
					}
				}
			}
		}
	}
	// grime, rust blooms, wet patches
	for (let i = 0; i < 90; i += 1) {
		const x = r() * FRAME.w;
		const y = r() * FRAME.h;
		const rad = 30 + r() * 160;
		const g = c.createRadialGradient(x, y, 0, x, y, rad);
		const rust = r() < 0.25;
		g.addColorStop(0, rust ? `rgba(70,38,18,${0.2 + r() * 0.2})` : `rgba(2,3,3,${0.3 + r() * 0.3})`);
		g.addColorStop(1, 'rgba(2,3,3,0)');
		c.fillStyle = g;
		c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
	}
	// scratches and boot scuffs
	c.lineCap = 'round';
	for (let i = 0; i < 400; i += 1) {
		const x = r() * FRAME.w;
		const y = r() * FRAME.h;
		const a = r() * Math.PI;
		const l = 3 + r() * 30;
		c.strokeStyle = r() < 0.5 ? 'rgba(150,160,156,.06)' : 'rgba(0,0,0,.3)';
		c.lineWidth = 0.5 + r();
		c.beginPath();
		c.moveTo(x, y);
		c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
		c.stroke();
	}
	// papers and debris
	for (let i = 0; i < 40; i += 1) {
		const x = r() * FRAME.w;
		const y = r() * FRAME.h;
		if (x > L - 40 && x < R + 40 && y > TOP - 40 && y < BOT + 40) continue;
		c.save();
		c.translate(x, y);
		c.rotate(r() * 6);
		c.fillStyle = 'rgba(0,0,0,.4)';
		c.fillRect(-5, -7, 12, 16);
		c.fillStyle = `rgba(150,150,138,${0.18 + r() * 0.15})`;
		c.fillRect(-6, -8, 11, 15);
		c.fillStyle = 'rgba(40,40,36,.3)';
		for (let k = -5; k < 6; k += 3) c.fillRect(-4, k, 7, 0.8);
		c.restore();
	}
}

/** A massive straight I-beam of the hull, cross-braced, rusted at its rivets. */
function iBeam(c: CanvasRenderingContext2D, x: number, w: number, r: Rng): void {
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

function specimenTank(c: CanvasRenderingContext2D, glow: CanvasRenderingContext2D, x: number, y: number, rad: number, kind: 'full' | 'burst' | 'empty', r: Rng): void {
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
			c.quadraticCurveTo(x + Math.cos(a + 0.6) * rad * 0.6, y + Math.sin(a + 0.6) * rad * 0.6, x + Math.cos(a + 1.1) * rad * 0.75, y + Math.sin(a + 1.1) * rad * 0.7);
			c.stroke();
		}
		// bubbles
		for (let i = 0; i < 12; i += 1) {
			c.strokeStyle = 'rgba(160,220,170,.25)';
			c.lineWidth = 0.8;
			c.beginPath();
			c.arc(x + (r() - 0.5) * rad * 1.5, y + (r() - 0.5) * rad * 1.5, 1 + r() * 2.5, 0, Math.PI * 2);
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
function body(c: CanvasRenderingContext2D, x: number, y: number, a: number, r: Rng): void {
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

/** A blood trail dragged along a path of scene points. */
function dragTrail(c: CanvasRenderingContext2D, pts: ReadonlyArray<readonly [number, number]>, r: Rng): void {
	c.save();
	c.lineCap = 'round';
	c.lineJoin = 'round';
	for (let pass = 0; pass < 3; pass += 1) {
		for (let i = 1; i < pts.length; i += 1) {
			const k = i / pts.length;
			c.strokeStyle = pass === 0 ? `rgba(30,4,4,${0.5 * (1 - k * 0.6)})` : pass === 1 ? `rgba(62,8,7,${0.55 * (1 - k * 0.7)})` : `rgba(110,18,14,${0.25 * (1 - k)})`;
			c.lineWidth = (pass === 0 ? 16 : pass === 1 ? 10 : 2) * (1 - k * 0.5) * (0.8 + r() * 0.4);
			c.beginPath();
			c.moveTo(pts[i - 1][0] + (r() - 0.5) * 2, pts[i - 1][1] + (r() - 0.5) * 2);
			c.lineTo(pts[i][0], pts[i][1]);
			c.stroke();
		}
	}
	// streaks inside the smear (fingers, cloth)
	c.strokeStyle = 'rgba(20,2,2,.45)';
	c.lineWidth = 1;
	for (let i = 1; i < pts.length; i += 1) {
		for (const o of [-4, 0, 3]) {
			c.beginPath();
			c.moveTo(pts[i - 1][0] + o, pts[i - 1][1] + o * 0.4);
			c.lineTo(pts[i][0] + o, pts[i][1] + o * 0.4);
			c.stroke();
		}
	}
	c.restore();
}

/** A round window in the deck onto the storm of the planet below. */
function viewport(c: CanvasRenderingContext2D, glow: CanvasRenderingContext2D, r: Rng): void {
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
			c.lineTo(cx0 + Math.cos(a) * rr * (0.8 + r() * 0.4), cy0 + Math.sin(a) * rr * (0.8 + r() * 0.4));
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
function breach(c: CanvasRenderingContext2D, x: number, y: number, r: Rng): void {
	// resin spilling over the deck around it
	const [mask, m] = layer();
	m.fillStyle = '#fff';
	for (let i = 0; i < 14; i += 1) {
		m.beginPath();
		m.ellipse(x + (r() - 0.3) * 200, y + (r() - 0.5) * 200, 30 + r() * 60, 20 + r() * 40, r() * 3, 0, Math.PI * 2);
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
	put(c, paintInto(edgeOf(soft, 2 * K, 2 * K), fill('rgba(170,185,150,.45)')));
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

function paintSurroundB(c: CanvasRenderingContext2D, glow: CanvasRenderingContext2D, g: GridMatrix): void {
	const r = rng(223);
	iBeam(c, L - 130, 54, r);
	iBeam(c, R + 112, 54, r);
	// cross braces between the beams and the platform
	c.strokeStyle = '#090a0a';
	c.lineWidth = 16;
	for (const [x0, x1] of [
		[L - 104, L - 30],
		[R + 86, R + 30]
	]) {
		for (let y = 60; y < FRAME.h; y += 240) {
			c.beginPath();
			c.moveTo(x0, y);
			c.lineTo(x1, y + 120);
			c.stroke();
		}
	}
	c.strokeStyle = '#2c3230';
	c.lineWidth = 11;
	for (const [x0, x1] of [
		[L - 104, L - 30],
		[R + 86, R + 30]
	]) {
		for (let y = 60; y < FRAME.h; y += 240) {
			c.beginPath();
			c.moveTo(x0, y);
			c.lineTo(x1, y + 120);
			c.stroke();
		}
	}
	// the quarantine lab on the left: specimen tanks, one burst
	specimenTank(c, glow, L - 330, 210, 52, 'full', r);
	specimenTank(c, glow, L - 330, 350, 52, 'burst', r);
	specimenTank(c, glow, L - 460, 280, 52, 'full', r);
	specimenTank(c, glow, L - 460, 140, 44, 'empty', r);
	// the burst tank's fluid and what crawled out of it
	dragTrail(c, [
		[L - 330, 400],
		[L - 300, 460],
		[L - 250, 520],
		[L - 190, 560],
		[L - 120, 600],
		[L - 40, 620]
	], r);
	// the breach, low on the left
	breach(c, L - 330, 860, r);
	// the dead
	body(c, R + 250, 960, 0.6, r);
	body(c, L - 220, 650, -2.2, r);
	dragTrail(c, [
		[R + 250, 960],
		[R + 200, 930],
		[R + 140, 900],
		[R + 70, 890],
		[R + 20, 880]
	], r);
	// the landmark: a window in the deck onto the storm below
	viewport(c, glow, r);
	// stencils, big and worn
	stencil(c, 'QUARANTINE', MX + 12.5 * T, TOP - 52, 44, 0, 0.16);
	stencil(c, 'B-7', L - 330, 560, 70, 0, 0.1);
	stencil(c, 'BIOLAB', R + 300, 340, 28, 0, 0.14);
	stencil(c, 'DO NOT OPEN', R + 300, 790, 18, 0, 0.13);
	// hazard bands round the platform, worn almost away
	const B = 12;
	const gap = 10;
	c.save();
	c.globalAlpha = 0.55;
	hazardBand(c, L - gap - B, TOP - gap - B, R - L + 2 * (gap + B), B, r);
	hazardBand(c, L - gap - B, BOT + gap, R - L + 2 * (gap + B), B, r);
	hazardBand(c, L - gap - B, TOP - gap, B, BOT - TOP + 2 * gap, r);
	hazardBand(c, R + gap, TOP - gap, B, BOT - TOP + 2 * gap, r);
	c.restore();
	// the side vents' ducts
	const vy = MY + 13.5 * T;
	for (const [x0, x1] of [
		[L - 104, L - 4],
		[R + 4, R + 86]
	]) {
		c.fillStyle = '#060707';
		c.fillRect(x0, vy - 20, x1 - x0, 40);
		c.fillStyle = '#262b29';
		c.fillRect(x0, vy - 17, x1 - x0, 34);
		c.fillStyle = 'rgba(0,0,0,.5)';
		for (let x = x0 + 6; x < x1; x += 14) c.fillRect(x, vy - 17, 2, 34);
	}
	// torn cables hanging off the beams (their sparks are live)
	for (const [x0, y0, x1, y1] of [
		[L - 130, 300, L - 60, 360],
		[R + 112, 200, R + 180, 260],
		[R + 112, 720, R + 40, 780]
	]) {
		c.strokeStyle = 'rgba(0,0,0,.6)';
		c.lineWidth = 6;
		c.beginPath();
		c.moveTo(x0 + 3, y0 + 4);
		c.quadraticCurveTo((x0 + x1) / 2 + 3, y1 + 34, x1 + 3, y1 + 4);
		c.stroke();
		c.strokeStyle = '#1b1d1c';
		c.lineWidth = 4;
		c.beginPath();
		c.moveTo(x0, y0);
		c.quadraticCurveTo((x0 + x1) / 2, y1 + 30, x1, y1);
		c.stroke();
		c.strokeStyle = '#a8752d';
		c.lineWidth = 1;
		for (let k = -1; k <= 1; k += 1) {
			c.beginPath();
			c.moveTo(x1, y1);
			c.lineTo(x1 + 5 + k * 2, y1 + 4 + k * 3);
			c.stroke();
		}
	}
	// wall lamp cages (most dead)
	for (const l of stationLamps(g)) {
		if (l.kind !== 'wall') continue;
		const x = MX + l.x * T;
		const y = MY + l.y * T;
		c.fillStyle = '#050606';
		c.beginPath();
		c.roundRect(x - 14, y - 9, 28, 18, 3);
		c.fill();
		c.fillStyle = '#2a2f2d';
		c.beginPath();
		c.roundRect(x - 12, y - 7, 24, 14, 2);
		c.fill();
		c.strokeStyle = '#050606';
		c.lineWidth = 1.6;
		for (let k = -8; k <= 8; k += 4) {
			c.beginPath();
			c.moveTo(x + k, y - 7);
			c.lineTo(x + k, y + 7);
			c.stroke();
		}
		glow.fillStyle = l.seed < 0.5 ? 'rgba(255,210,150,.7)' : 'rgba(255,210,150,.12)';
		glow.fillRect(x - 10, y - 5, 20, 10);
	}
}

// ---------------------------------------------------------------------------------------------
// The maze

function paintCorridorsB(c: CanvasRenderingContext2D, g: GridMatrix): void {
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
				gr.addColorStop(0, rust ? `rgba(60,32,14,${0.2 + r() * 0.2})` : `rgba(1,2,2,${0.3 + r() * 0.35})`);
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
				pts.push([MX + (ax + ((bx - ax) * k) / n) * T + (r() - 0.5) * 4, MY + (ay + ((by - ay) * k) / n) * T + (r() - 0.5) * 4]);
			}
		}
		dragTrail(c, pts, r);
	}
}

function paintWallsB(c: CanvasRenderingContext2D, glow: CanvasRenderingContext2D, g: GridMatrix): void {
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
			gr.addColorStop(0, '#363c39');
			gr.addColorStop(1, '#222624');
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
					fg.addColorStop(0, 'rgba(70,78,74,.9)');
					fg.addColorStop(1, 'rgba(30,34,32,.9)');
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
	// a heavy chamfer round every island
	put(c, paintInto(edgeOf(mask, 2.5 * K, 2.5 * K), fill('rgba(190,205,198,.28)')));
	put(c, paintInto(edgeOf(mask, -3 * K, -3 * K), fill('rgba(0,0,0,.7)')));
	// the light strip: a dead slot, lit only in broken stretches
	const band = minus(morph(mask, 3, false), morph(mask, 4.4, false));
	put(c, paintInto(band, fill('rgba(4,5,5,.95)')));
	const [segs, sg] = layer();
	sg.fillStyle = '#fff';
	for (let i = 0; i < 260; i += 1) {
		const x = MX + r() * 25 * T;
		const y = MY + r() * 27 * T;
		const len = 20 + r() * 70;
		sg.fillRect(x - len / 2, y - len / 2, len, len);
	}
	const live = paintInto(band, (p) => put(p, segs));
	put(glow, paintInto(live, fill('#dff3e4')));
}

/** Crew cocooned into the nest's walls: shapes of people under the resin. */
function nestVictims(c: CanvasRenderingContext2D, g: GridMatrix): void {
	const r = rng(241);
	const spots: Array<[number, number, number]> = [];
	for (let y = 0; y < g.length; y += 1)
		for (let x = 0; x < (g[0]?.length ?? 0); x += 1)
			if (isLair(g, x, y) && (x === 10 || x === 14) && (y === 12 || y === 14)) spots.push([x, y, x === 10 ? 0.4 : -0.4]);
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

// ---------------------------------------------------------------------------------------------

const cache = new Map<Phase, StationBake>();
let shared: { base: HTMLCanvasElement; glow: HTMLCanvasElement } | null = null;

export function bakeStationB(g: GridMatrix, phase: Phase): StationBake {
	const hit = cache.get(phase);
	if (hit) return hit;
	if (!shared) {
		const base = makeCanvas(FRAME.w * K, FRAME.h * K);
		const glowC = makeCanvas(FRAME.w * K, FRAME.h * K);
		const c = context(base);
		const gl = context(glowC);
		c.scale(K, K);
		gl.scale(K, K);
		paintDeckB(c);
		paintSurroundB(c, gl, g);
		paintCorridorsB(c, g);
		paintWallsB(c, gl, g);
		paintVentsB(c, g);
		paintNestB(c, gl, g);
		shared = { base, glow: glowC };
	}
	const base = makeCanvas(FRAME.w * K, FRAME.h * K);
	const c = context(base);
	c.drawImage(shared.base, 0, 0);
	c.scale(K, K);
	paintResin(c, g, phase);
	const out: StationBake = { base, glow: shared.glow, lamps: stationLamps(g) };
	cache.set(phase, out);
	return out;
}

function paintVentsB(c: CanvasRenderingContext2D, g: GridMatrix): void {
	paintVents(c, g);
	// darken them to the style
	const mask = floorMask(g, (x, y) => (g[y]?.[x] ?? '').startsWith('0'));
	put(c, paintInto(mask, fill('rgba(10,14,12,.45)')));
}

function paintNestB(c: CanvasRenderingContext2D, glow: CanvasRenderingContext2D, g: GridMatrix): void {
	paintNest(c, glow, g);
	nestVictims(c, g);
}
