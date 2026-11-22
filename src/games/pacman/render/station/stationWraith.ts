// The station's ghosts (DESIGN.md §7a, style B): wraiths of the drowned crew, translucent, with
// long weeping sockets and a mouth stretched open, a pinpoint of the ghost's colour deep in each
// socket turned where it goes. Now and then the wraith glitches: by default the whole body slips
// and splits its colour for a moment; `cut` is the prototype's sliced look (the head seems cut
// off), kept for the owner to compare.
import type { GhostKind } from '../../logic/actors/GhostModel';
import { GHOST_TINT, rgba, stationGlow } from './stationColors';

export type WraithGlitch = 'whole' | 'cut';
export const WRAITH_GLITCH: WraithGlitch = 'whole';

const TAU = Math.PI * 2;

export function drawWraith(
	c: CanvasRenderingContext2D,
	x: number,
	y: number,
	S: number,
	kind: GhostKind,
	look: number,
	t: number,
	alpha = 1,
	glitchMode: WraithGlitch = WRAITH_GLITCH
): void {
	const col = GHOST_TINT[kind];
	const u = S;
	const drift = Math.sin(t * 1.6 + x * 0.013) * u * 0.04;
	// a glitch: now and then the wraith slips sideways in slices
	const glitch = Math.sin(t * 7.1 + x) * Math.sin(t * 3.3) > 0.82;
	c.save();
	c.translate(x, y + drift);
	c.globalAlpha = alpha;
	c.globalCompositeOperation = 'lighter';
	stationGlow(c, 0, u * 0.05, u * 0.9, col, 0.16);
	c.globalCompositeOperation = 'source-over';
	const shape = (sh: number) => {
		c.beginPath();
		c.moveTo(-u * 0.3, u * 0.02);
		c.bezierCurveTo(-u * 0.36, -u * 0.32, -u * 0.18, -u * 0.48, 0, -u * 0.48);
		c.bezierCurveTo(u * 0.18, -u * 0.48, u * 0.36, -u * 0.32, u * 0.3, u * 0.02);
		// the tatters, streaming down and away
		const n = 6;
		for (let i = 0; i < n; i += 1) {
			const x0 = u * 0.3 - ((i + 0.5) / n) * u * 0.6;
			const x1 = u * 0.3 - ((i + 1) / n) * u * 0.6;
			const len = u * (0.42 + 0.14 * Math.sin(t * 3 + i * 1.7 + sh));
			c.quadraticCurveTo(
				x0 + Math.sin(t * 2.4 + i) * u * 0.06,
				len,
				x1,
				u * 0.08 + (i % 2) * u * 0.04
			);
		}
		c.closePath();
	};
	const cut = glitch && glitchMode === 'cut';
	if (glitch && !cut) {
		// the whole body slips, and its colour splits off to the other side for a moment
		const jx = Math.sin(t * 61 + x) * u * 0.05;
		c.translate(jx, 0);
		c.save();
		c.translate(-jx * 1.6, 0);
		shape(0);
		c.fillStyle = rgba(col, 0.22);
		c.fill();
		c.restore();
	}
	const slices = cut ? 3 : 1;
	for (let s = 0; s < slices; s += 1) {
		c.save();
		if (cut) {
			c.beginPath();
			c.rect(-u, -u + (s * 2 * u) / 3, u * 2, (2 * u) / 3);
			c.clip();
			c.translate((s - 1) * u * 0.06, 0);
		}
		shape(0);
		const g = c.createLinearGradient(0, -u * 0.5, 0, u * 0.5);
		g.addColorStop(0, 'rgba(205,220,225,.62)');
		g.addColorStop(0.5, 'rgba(150,170,180,.38)');
		g.addColorStop(1, rgba(col, 0));
		c.fillStyle = g;
		c.fill();
		c.strokeStyle = 'rgba(220,235,240,.25)';
		c.lineWidth = Math.max(0.6, u * 0.012);
		c.stroke();
		// the face: long dark sockets that weep, a mouth stretched open
		const fx = Math.cos(look) * u * 0.05;
		const fy = Math.sin(look) * u * 0.03;
		c.fillStyle = 'rgba(4,6,8,.92)';
		for (const sd of [-1, 1]) {
			c.beginPath();
			c.ellipse(fx + sd * u * 0.1, fy - u * 0.22, u * 0.055, u * 0.09, sd * 0.25, 0, TAU);
			c.fill();
			c.fillStyle = 'rgba(4,6,8,.5)';
			c.fillRect(
				fx + sd * u * 0.1 - u * 0.012,
				fy - u * 0.16,
				u * 0.024,
				u * (0.12 + 0.04 * Math.sin(t + sd))
			);
			c.fillStyle = 'rgba(4,6,8,.92)';
		}
		c.beginPath();
		c.ellipse(fx, fy - u * 0.02, u * 0.06, u * (0.11 + 0.02 * Math.sin(t * 2.3)), 0, 0, TAU);
		c.fill();
		// a pinpoint of its colour deep in each socket, toward where it goes
		c.globalCompositeOperation = 'lighter';
		for (const sd of [-1, 1]) {
			stationGlow(c, fx * 1.6 + sd * u * 0.1, fy * 1.6 - u * 0.22, u * 0.07, col, 0.9);
		}
		c.globalCompositeOperation = 'source-over';
		c.restore();
	}
	c.restore();
}
