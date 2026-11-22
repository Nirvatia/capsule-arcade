// The station's deck and the composition round the maze (style B): heavy plates with grime,
// scuffs and debris; the beams, the lab's tanks, the breach, the dead, the window, stencils, the
// platform's worn hazard band, the side vents' ducts, torn cables and wall lamp cages.
import type { GridMatrix } from '../../config/gridConfig';
import { fbm, mixHex, rng } from '../doom/fleshNoise';
import { FRAME, MX, MY, T, stationLamps } from './stationPaint';
import { dragTrail, hazardBand, hexBolt, stencil } from './stationMarks';
import { body, breach, iBeam, specimenTank, viewport } from './stationProps';

const L = MX + T;
const R = MX + 24 * T;
const TOP = MY + T;
const BOT = MY + 26 * T;

export function paintDeck(c: CanvasRenderingContext2D): void {
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
		g.addColorStop(
			0,
			rust ? `rgba(70,38,18,${0.2 + r() * 0.2})` : `rgba(2,3,3,${0.3 + r() * 0.3})`
		);
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

export function paintSurround(
	c: CanvasRenderingContext2D,
	glow: CanvasRenderingContext2D,
	g: GridMatrix
): void {
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
	dragTrail(
		c,
		[
			[L - 330, 400],
			[L - 300, 460],
			[L - 250, 520],
			[L - 190, 560],
			[L - 120, 600],
			[L - 40, 620]
		],
		r
	);
	// the breach, low on the left
	breach(c, L - 330, 860, r);
	// the dead
	body(c, R + 250, 960, 0.6, r);
	body(c, L - 220, 650, -2.2, r);
	dragTrail(
		c,
		[
			[R + 250, 960],
			[R + 200, 930],
			[R + 140, 900],
			[R + 70, 890],
			[R + 20, 880]
		],
		r
	);
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
