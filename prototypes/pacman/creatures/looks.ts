// Throwaway candidates for the station's hounds and its heroes (DESIGN.md §7a). The hound's
// behaviour (`logic/station/HoundPack`: creep, sniff, hold a breath, dash, tire, flee) stays; only
// the body is up for choice. Why new bodies: seen from above, anything with pairs of legs that is
// longer than a tile reads as a cockroach. So: insects WITHOUT walking legs (a wasp, a larva, a
// moth) and drones (a quadcopter, a tracked bot, a delta). Every painter has the game's own
// signature (`drawHound`'s), fits about one tile, and shows the same four states: stalk, windup
// (a held breath before the dash), lunge, flee. Nothing flashes faster than ~3 times a second:
// wings and rotors are drawn as soft fans, not as strobing blades.
import type { Hound } from '../../../src/games/pacman/logic/station/HoundPack';
import { drawHound } from '../../../src/games/pacman/render/station/stationHound';
import { rgba, stationGlow } from '../../../src/games/pacman/render/station/stationColors';
import type { OverPainter } from '../../../src/games/pacman/render/actors/hero/Hero';
import { glow } from '../../../src/games/pacman/render/actors/hero/Hero';
import { SEASON_LOOKS } from '../../../src/games/pacman/render/actors/hero/heroSeasons';
import type { HeroSeason, SeasonLook } from '../../../src/games/pacman/render/actors/hero/heroSeasons';

type Ctx = CanvasRenderingContext2D;
export type DrawHound = (
	c: Ctx,
	h: Hound,
	x: number,
	y: number,
	heading: number,
	stride: number,
	S: number,
	t: number
) => void;

export interface Look {
	readonly id: string;
	readonly name: string;
	readonly kind: 'now' | 'insect' | 'drone';
	readonly note: string;
	readonly draw: DrawHound;
}

const TAU = Math.PI * 2;
const AMBER = '#ff8a2a';
const EYE = '#ffe7a0';
const COLD = '#bfeaff';
const RED = '#ff3030';

interface St {
	dash: boolean;
	flee: boolean;
	w: number;
	fire: number;
	id: number;
}
const st = (h: Hound): St => ({
	dash: h.mode === 'lunge',
	flee: h.mode === 'flee',
	w: h.windup,
	fire: h.mode === 'flee' ? 0.35 : 1,
	id: h.id
});

function glowAt(c: Ctx, x: number, y: number, r: number, color: string, a: number): void {
	c.save();
	c.globalCompositeOperation = 'lighter';
	stationGlow(c, x, y, r, color, a);
	c.restore();
}

function shadow(c: Ctx, x: number, y: number, rx: number, ry: number, a = 0.45): void {
	c.fillStyle = `rgba(0,0,0,${a})`;
	c.beginPath();
	c.ellipse(x, y, rx, ry, 0, 0, TAU);
	c.fill();
}

/** A dash leaves a streak behind it (frame space, facing +x). */
function streak(c: Ctx, u: number, color: string, len = 1.3, a = 0.45): void {
	c.save();
	c.globalCompositeOperation = 'lighter';
	const g = c.createLinearGradient(-u * len, 0, 0, 0);
	g.addColorStop(0, rgba(color, 0));
	g.addColorStop(1, rgba(color, a));
	c.fillStyle = g;
	c.beginPath();
	c.moveTo(0, -u * 0.12);
	c.lineTo(-u * len, 0);
	c.lineTo(0, u * 0.12);
	c.fill();
	c.restore();
}

// ---------------------------------------------------------------- insects (no walking legs)

/** A wasp: head, thorax, a banded abdomen with a lit sting; four soft wings. Hovers. */
const wasp: DrawHound = (c, h, x, y, heading, _stride, S, t) => {
	const s = st(h);
	const u = S * 1.05;
	c.save();
	c.translate(x, y);
	glowAt(c, 0, 0, u * (0.85 + s.w * 0.45), AMBER, 0.2 * s.fire + s.w * 0.22);
	c.rotate(heading);
	shadow(c, -u * 0.05, u * 0.12, u * 0.4, u * 0.16);
	if (s.dash) streak(c, u, AMBER);
	// wings: raised and trembling in the windup, swept flat in the dash; a soft shimmer, no strobe
	const open = s.dash ? 0.38 : 0.95 + s.w * 0.35 + Math.sin(t * 5 + s.id) * 0.06;
	for (const side of [-1, 1]) {
		for (const hind of [false, true]) {
			c.save();
			if (side < 0) c.scale(1, -1);
			c.translate(u * 0.12, u * 0.04);
			c.rotate(Math.PI - open - (hind ? 0.38 : 0));
			const L = u * (hind ? 0.4 : 0.58);
			const wd = u * (hind ? 0.11 : 0.16);
			c.beginPath();
			c.moveTo(0, 0);
			c.quadraticCurveTo(L * 0.45, -wd, L, -wd * 0.1);
			c.quadraticCurveTo(L * 0.62, wd * 0.9, 0, 0);
			c.fillStyle = rgba('#ffc89a', 0.13 + (hind ? 0 : 0.04));
			c.fill();
			c.strokeStyle = rgba(AMBER, 0.55 * s.fire);
			c.lineWidth = Math.max(0.7, u * 0.018);
			c.stroke();
			c.strokeStyle = rgba('#ffc89a', 0.3);
			c.lineWidth = Math.max(0.5, u * 0.01);
			c.beginPath();
			c.moveTo(0, 0);
			c.lineTo(L * 0.85, -wd * 0.25);
			c.moveTo(L * 0.2, -wd * 0.1);
			c.lineTo(L * 0.6, wd * 0.35);
			c.stroke();
			c.restore();
		}
	}
	// abdomen: dark, wet, banded, glowing from inside, ending in a lit sting
	const rise = 1 + s.w * 0.12;
	c.save();
	c.beginPath();
	c.ellipse(-u * 0.2, 0, u * 0.26 * rise, u * 0.125 * rise, 0, 0, TAU);
	c.fillStyle = '#1a0c07';
	c.fill();
	c.clip();
	for (const k of [-0.34, -0.22, -0.1]) {
		c.fillStyle = rgba(AMBER, 0.85 * s.fire);
		c.fillRect(u * k, -u * 0.2, u * 0.065, u * 0.4);
	}
	c.globalCompositeOperation = 'lighter';
	stationGlow(c, -u * 0.22, 0, u * 0.3, AMBER, 0.28 * s.fire);
	c.restore();
	c.fillStyle = rgba(AMBER, s.fire);
	c.beginPath();
	c.moveTo(-u * 0.44, -u * 0.035);
	c.lineTo(-u * 0.56, 0);
	c.lineTo(-u * 0.44, u * 0.035);
	c.fill();
	glowAt(c, -u * 0.56, 0, u * 0.14, EYE, 0.5 * s.fire);
	// thorax, neck, head with two burning eyes and the jaws
	c.fillStyle = '#26110a';
	c.beginPath();
	c.ellipse(u * 0.1, 0, u * 0.15, u * 0.11, 0, 0, TAU);
	c.fill();
	c.strokeStyle = rgba(AMBER, 0.7 * s.fire);
	c.lineWidth = Math.max(0.8, u * 0.022);
	c.stroke();
	c.fillStyle = '#1a0c07';
	c.beginPath();
	c.arc(u * 0.34, 0, u * 0.1, 0, TAU);
	c.fill();
	c.strokeStyle = rgba(AMBER, 0.7 * s.fire);
	c.stroke();
	c.strokeStyle = '#120806';
	c.lineWidth = Math.max(0.8, u * 0.03);
	for (const k of [-1, 1]) {
		c.beginPath();
		c.moveTo(u * 0.42, k * u * 0.035);
		c.lineTo(u * (0.5 + s.w * 0.04), k * u * (0.03 + s.w * 0.04));
		c.stroke();
	}
	for (const k of [-1, 1]) {
		glowAt(c, u * 0.37, k * u * 0.055, u * (0.1 + s.w * 0.1), EYE, 0.8 * s.fire);
		c.fillStyle = rgba(EYE, s.fire);
		c.beginPath();
		c.arc(u * 0.37, k * u * 0.055, u * (0.03 + s.w * 0.015), 0, TAU);
		c.fill();
	}
	c.restore();
};

/** A larva: a segmented leech that undulates, a glowing round maw at the head. */
const larva: DrawHound = (c, h, x, y, heading, stride, S, t) => {
	void t;
	const s = st(h);
	// a little bigger and fatter than the others: a thin worm is lost at one tile
	const u = S * 1.22;
	c.save();
	c.translate(x, y);
	glowAt(c, 0, 0, u * (0.8 + s.w * 0.4), AMBER, 0.18 * s.fire + s.w * 0.22);
	c.rotate(heading);
	shadow(c, -u * 0.05, u * 0.09, u * 0.46, u * 0.17);
	if (s.dash) streak(c, u, AMBER, 1.2, 0.4);
	const n = 7;
	const gap = u * 0.125 * (s.dash ? 1.22 : 1 - s.w * 0.2);
	const amp = u * 0.07 * (s.dash ? 0.25 : 1);
	const pts: Array<{ x: number; y: number; r: number }> = [];
	for (let i = 0; i < n; i += 1) {
		pts.push({
			x: u * 0.36 - i * gap,
			y: Math.sin(stride * 5 - i * 0.85) * amp * (0.25 + i / n),
			r: u * (0.135 - i * 0.0095) * (i === 0 ? 1 + s.w * 0.25 : 1)
		});
	}
	for (let i = n - 1; i >= 0; i -= 1) {
		const p = pts[i];
		c.beginPath();
		c.ellipse(p.x, p.y, p.r * 1.12, p.r, 0, 0, TAU);
		const g = c.createLinearGradient(0, p.y - p.r, 0, p.y + p.r);
		g.addColorStop(0, '#5a2414');
		g.addColorStop(0.5, '#2a100a');
		g.addColorStop(1, '#100503');
		c.fillStyle = g;
		c.fill();
		// the joint between two segments glows: it burns from inside
		c.save();
		c.globalCompositeOperation = 'lighter';
		c.strokeStyle = rgba(AMBER, (0.35 + i * 0.05) * s.fire);
		c.lineWidth = Math.max(0.8, u * 0.022);
		c.beginPath();
		c.arc(p.x, p.y, p.r * 1.05, Math.PI * 0.62, Math.PI * 1.38);
		c.stroke();
		c.restore();
	}
	const hd = pts[0];
	// the maw: a ring of little teeth round a burning throat
	const mr = u * (0.07 + s.w * 0.04);
	c.save();
	c.translate(hd.x + hd.r * 0.55, hd.y);
	c.fillStyle = '#0c0403';
	c.beginPath();
	c.arc(0, 0, mr * 1.15, 0, TAU);
	c.fill();
	c.strokeStyle = rgba(EYE, 0.85 * s.fire);
	c.lineWidth = Math.max(0.8, u * 0.02);
	for (let k = 0; k < 8; k += 1) {
		const a = (k / 8) * TAU;
		c.beginPath();
		c.moveTo(Math.cos(a) * mr * 1.1, Math.sin(a) * mr * 1.1);
		c.lineTo(Math.cos(a) * mr * 0.55, Math.sin(a) * mr * 0.55);
		c.stroke();
	}
	c.restore();
	glowAt(c, hd.x + hd.r * 0.55, hd.y, u * (0.2 + s.w * 0.2), EYE, 0.8 * s.fire);
	c.restore();
};

/** A death's-head moth: broad slow wings with burning eyespots, a pale skull on the back. */
const moth: DrawHound = (c, h, x, y, heading, _stride, S, t) => {
	const s = st(h);
	const u = S * 1.12;
	c.save();
	c.translate(x, y);
	glowAt(c, 0, 0, u * (0.85 + s.w * 0.4), AMBER, 0.16 * s.fire + s.w * 0.2);
	c.rotate(heading);
	shadow(c, -u * 0.05, u * 0.13, u * 0.4, u * 0.17, 0.4);
	if (s.dash) streak(c, u, AMBER, 1.2, 0.35);
	// slow beats (under 1 Hz): lifted and trembling in the windup, swept back in the dash
	const open = s.dash ? 0.32 : 0.78 + Math.sin(t * 4.2 + s.id * 1.3) * 0.16 + s.w * 0.3;
	for (const side of [-1, 1]) {
		c.save();
		if (side < 0) c.scale(1, -1);
		c.translate(u * 0.08, u * 0.05);
		c.rotate(Math.PI - open);
		const L = u * 0.6;
		c.beginPath();
		c.moveTo(0, -u * 0.03);
		c.quadraticCurveTo(L * 0.35, -u * 0.34, L * 0.98, -u * 0.16);
		c.quadraticCurveTo(L * 0.85, u * 0.05, L * 0.55, u * 0.17);
		c.quadraticCurveTo(L * 0.25, u * 0.2, 0, u * 0.07);
		c.closePath();
		const g = c.createLinearGradient(0, 0, L, 0);
		g.addColorStop(0, '#1e0e0e');
		g.addColorStop(1, '#43190f');
		c.fillStyle = g;
		c.fill();
		c.save();
		c.clip();
		c.fillStyle = rgba('#ffc89a', 0.12);
		c.fillRect(L * 0.3, -u * 0.3, L * 0.08, u * 0.6);
		c.fillRect(L * 0.5, -u * 0.3, L * 0.05, u * 0.6);
		c.restore();
		c.strokeStyle = rgba(AMBER, 0.6 * s.fire);
		c.lineWidth = Math.max(0.8, u * 0.02);
		c.stroke();
		// the eyespot
		const ex = L * 0.68;
		const ey = -u * 0.045;
		glowAt(c, ex, ey, u * (0.16 + s.w * 0.08), AMBER, 0.5 * s.fire);
		c.fillStyle = '#1a0a06';
		c.beginPath();
		c.arc(ex, ey, u * 0.065, 0, TAU);
		c.fill();
		c.fillStyle = rgba(EYE, s.fire);
		c.beginPath();
		c.arc(ex, ey, u * (0.032 + s.w * 0.015), 0, TAU);
		c.fill();
		c.restore();
	}
	// body: furry thorax with the skull, a tapering ringed abdomen, a small head, short feathers
	c.fillStyle = '#26110a';
	c.beginPath();
	c.ellipse(-u * 0.2, 0, u * 0.24, u * 0.075, 0, 0, TAU);
	c.fill();
	c.strokeStyle = rgba(AMBER, 0.5 * s.fire);
	c.lineWidth = Math.max(0.7, u * 0.018);
	for (const k of [-0.32, -0.24, -0.16, -0.08]) {
		c.beginPath();
		c.moveTo(u * k, -u * 0.06);
		c.lineTo(u * k, u * 0.06);
		c.stroke();
	}
	c.fillStyle = '#34170d';
	c.beginPath();
	c.ellipse(u * 0.05, 0, u * 0.13, u * 0.1, 0, 0, TAU);
	c.fill();
	c.strokeStyle = rgba(AMBER, 0.7 * s.fire);
	c.stroke();
	c.fillStyle = rgba('#ffe0c0', 0.55);
	c.beginPath();
	c.ellipse(u * 0.04, 0, u * 0.055, u * 0.065, 0, 0, TAU);
	c.fill();
	c.fillStyle = '#26110a';
	for (const k of [-1, 1]) {
		c.beginPath();
		c.arc(u * 0.035, k * u * 0.025, u * 0.014, 0, TAU);
		c.fill();
	}
	c.fillRect(u * 0.02, -u * 0.008, u * 0.045, u * 0.016);
	c.fillStyle = '#1a0c07';
	c.beginPath();
	c.arc(u * 0.22, 0, u * 0.065, 0, TAU);
	c.fill();
	c.strokeStyle = rgba(AMBER, 0.6 * s.fire);
	for (const k of [-1, 1]) {
		c.beginPath();
		c.moveTo(u * 0.25, k * u * 0.03);
		c.quadraticCurveTo(u * 0.36, k * u * 0.05, u * 0.4, k * u * 0.13);
		c.stroke();
		glowAt(c, u * 0.24, k * u * 0.032, u * 0.1, EYE, 0.7 * s.fire);
		c.fillStyle = rgba(EYE, s.fire);
		c.beginPath();
		c.arc(u * 0.24, k * u * 0.032, u * 0.018, 0, TAU);
		c.fill();
	}
	c.restore();
};

// ---------------------------------------------------------------- drones (the station's own)

/** A quadcopter: four soft rotors on arms, a red lens, a cold searchlight that narrows to a stare. */
const quad: DrawHound = (c, h, x, y, heading, _stride, S, t) => {
	const s = st(h);
	const u = S;
	c.save();
	c.translate(x, y);
	// it hovers: a wide soft shadow, offset
	shadow(c, u * 0.06, u * 0.16, u * 0.46, u * 0.3, 0.3);
	c.rotate(heading);
	// the searchlight: wide and cold when it searches, a thin red stare in the windup
	if (!s.dash) {
		const half = 0.3 - s.w * 0.2;
		const col = s.w > 0.05 ? RED : COLD;
		c.save();
		c.globalCompositeOperation = 'lighter';
		const g = c.createRadialGradient(u * 0.2, 0, 0, u * 0.2, 0, u * 1.5);
		g.addColorStop(0, rgba(col, (0.22 + s.w * 0.2) * s.fire));
		g.addColorStop(1, rgba(col, 0));
		c.fillStyle = g;
		c.beginPath();
		c.moveTo(u * 0.2, 0);
		c.arc(u * 0.2, 0, u * 1.5, -half, half);
		c.closePath();
		c.fill();
		c.restore();
	} else {
		streak(c, u, COLD, 1.1, 0.4);
	}
	const arms: ReadonlyArray<readonly [number, number]> = [
		[0.3, -0.3],
		[0.3, 0.3],
		[-0.3, -0.3],
		[-0.3, 0.3]
	];
	c.strokeStyle = '#5b6770';
	c.lineWidth = u * 0.05;
	c.lineCap = 'round';
	for (const [ax, ay] of arms) {
		c.beginPath();
		c.moveTo(0, 0);
		c.lineTo(ax * u, ay * u);
		c.stroke();
	}
	arms.forEach(([ax, ay], i) => {
		c.save();
		c.translate(ax * u, ay * u);
		c.fillStyle = 'rgba(190,225,245,0.1)';
		c.beginPath();
		c.arc(0, 0, u * 0.17, 0, TAU);
		c.fill();
		c.rotate(t * (s.dash ? 8 : 4) * (i % 2 ? 1 : -1) + i);
		c.strokeStyle = 'rgba(200,230,245,0.32)';
		c.lineWidth = u * 0.03;
		c.beginPath();
		c.moveTo(-u * 0.16, 0);
		c.lineTo(u * 0.16, 0);
		c.stroke();
		c.rotate(Math.PI / 2);
		c.beginPath();
		c.moveTo(-u * 0.16, 0);
		c.lineTo(u * 0.16, 0);
		c.stroke();
		c.restore();
		c.strokeStyle = '#8795a0';
		c.lineWidth = Math.max(0.8, u * 0.025);
		c.beginPath();
		c.arc(ax * u, ay * u, u * 0.17, 0, TAU);
		c.stroke();
		c.fillStyle = '#2b343b';
		c.beginPath();
		c.arc(ax * u, ay * u, u * 0.035, 0, TAU);
		c.fill();
	});
	// the body
	c.beginPath();
	for (let k = 0; k < 8; k += 1) {
		const a = (k / 8) * TAU + Math.PI / 8;
		c[k ? 'lineTo' : 'moveTo'](Math.cos(a) * u * 0.18, Math.sin(a) * u * 0.18);
	}
	c.closePath();
	const g = c.createLinearGradient(0, -u * 0.18, 0, u * 0.18);
	g.addColorStop(0, '#6c7a85');
	g.addColorStop(1, '#232b31');
	c.fillStyle = g;
	c.fill();
	c.strokeStyle = rgba(COLD, 0.55 * s.fire);
	c.lineWidth = Math.max(0.8, u * 0.025);
	c.stroke();
	// the red lens, and a slow status light
	const lens = u * (0.06 + s.w * 0.03);
	glowAt(c, u * 0.15, 0, u * (0.22 + s.w * 0.14), RED, 0.8 * s.fire);
	c.fillStyle = '#16090a';
	c.beginPath();
	c.arc(u * 0.15, 0, lens * 1.4, 0, TAU);
	c.fill();
	c.fillStyle = rgba('#ff6a5a', s.fire);
	c.beginPath();
	c.arc(u * 0.15, 0, lens, 0, TAU);
	c.fill();
	c.fillStyle = rgba('#ffb04a', 0.4 + 0.4 * Math.sin(t * 2.2 + s.id));
	c.beginPath();
	c.arc(-u * 0.12, 0, u * 0.02, 0, TAU);
	c.fill();
	c.restore();
};

/** A tracked bot: hull, two treads, a camera bar with a red lens, two headlamps, hazard rear. */
const crawler: DrawHound = (c, h, x, y, heading, stride, S, t) => {
	void t;
	const s = st(h);
	const u = S;
	c.save();
	c.translate(x, y);
	c.rotate(heading);
	const low = 1 - s.w * 0.05;
	c.scale(low, low);
	shadow(c, -u * 0.02, u * 0.05, u * 0.46, u * 0.3, 0.45);
	if (s.dash) streak(c, u, '#9a8f80', 1.0, 0.3);
	// the treads, with ticks that run with the stride
	const tl = u * 0.86;
	for (const side of [-1, 1]) {
		c.fillStyle = '#12171b';
		c.beginPath();
		c.roundRect(-tl / 2, side * u * 0.22 - u * 0.075, tl, u * 0.15, u * 0.05);
		c.fill();
		c.save();
		c.clip();
		c.strokeStyle = 'rgba(150,165,175,0.5)';
		c.lineWidth = Math.max(0.8, u * 0.025);
		const off = (stride * u * 0.35) % (u * 0.09);
		for (let k = -1; k < 11; k += 1) {
			const tx = -tl / 2 + k * u * 0.09 + off;
			c.beginPath();
			c.moveTo(tx, side * u * 0.22 - u * 0.075);
			c.lineTo(tx, side * u * 0.22 + u * 0.075);
			c.stroke();
		}
		c.restore();
	}
	// the hull
	c.beginPath();
	c.roundRect(-u * 0.36, -u * 0.18, u * 0.72, u * 0.36, u * 0.07);
	const g = c.createLinearGradient(0, -u * 0.18, 0, u * 0.18);
	g.addColorStop(0, '#59646d');
	g.addColorStop(1, '#232a30');
	c.fillStyle = g;
	c.fill();
	c.save();
	c.clip();
	// hazard stripes across the rear
	c.fillStyle = '#d9b100';
	for (let k = -4; k < 4; k += 1) {
		c.beginPath();
		c.moveTo(-u * 0.36 + k * u * 0.08, u * 0.2);
		c.lineTo(-u * 0.36 + k * u * 0.08 + u * 0.04, u * 0.2);
		c.lineTo(-u * 0.36 + k * u * 0.08 + u * 0.14, -u * 0.2);
		c.lineTo(-u * 0.36 + k * u * 0.08 + u * 0.1, -u * 0.2);
		c.fill();
	}
	c.fillStyle = '#2a3036';
	c.fillRect(-u * 0.2, -u * 0.2, u * 0.4, u * 0.4);
	c.restore();
	c.strokeStyle = rgba(COLD, 0.4 * s.fire);
	c.lineWidth = Math.max(0.8, u * 0.022);
	c.beginPath();
	c.roundRect(-u * 0.36, -u * 0.18, u * 0.72, u * 0.36, u * 0.07);
	c.stroke();
	// the dome and the camera bar with a red lens
	c.fillStyle = '#10161a';
	c.beginPath();
	c.arc(-u * 0.02, 0, u * 0.1, 0, TAU);
	c.fill();
	c.strokeStyle = '#7e8c96';
	c.stroke();
	c.fillStyle = '#16090a';
	c.fillRect(u * 0.27, -u * 0.13, u * 0.07, u * 0.26);
	glowAt(c, u * 0.33, 0, u * (0.22 + s.w * 0.12), RED, 0.7 * s.fire);
	c.fillStyle = rgba('#ff6a5a', s.fire);
	c.fillRect(u * 0.31, -u * (0.04 + s.w * 0.03), u * 0.03, u * (0.08 + s.w * 0.06));
	// the headlamps: wide, then a narrow white stare as it holds its breath
	if (!s.dash) {
		const half = 0.34 - s.w * 0.22;
		for (const k of [-1, 1]) {
			c.save();
			c.globalCompositeOperation = 'lighter';
			c.translate(u * 0.34, k * u * 0.11);
			const lg = c.createRadialGradient(0, 0, 0, 0, 0, u * 1.2);
			lg.addColorStop(0, rgba(COLD, (0.2 + s.w * 0.15) * s.fire));
			lg.addColorStop(1, rgba(COLD, 0));
			c.fillStyle = lg;
			c.beginPath();
			c.moveTo(0, 0);
			c.arc(0, 0, u * 1.2, -half, half);
			c.closePath();
			c.fill();
			c.restore();
			glowAt(c, u * 0.34, k * u * 0.11, u * 0.1, COLD, 0.7 * s.fire);
		}
	}
	c.restore();
};

/** A delta drone: a flat arrowhead of dark metal, lit edges, a red lens, twin thrusters. */
const delta: DrawHound = (c, h, x, y, heading, stride, S, t) => {
	void stride;
	const s = st(h);
	const u = S * 1.1;
	c.save();
	c.translate(x, y);
	shadow(c, u * 0.05, u * 0.14, u * 0.42, u * 0.22, 0.3);
	c.rotate(heading);
	const fold = 1 - s.w * 0.14;
	const stretch = s.dash ? 1.2 : 1;
	c.scale(stretch, fold);
	// the thrusters: a little flare when it creeps, a long one in the dash
	for (const k of [-1, 1]) {
		const len = u * (s.dash ? 0.9 : 0.18 + s.w * 0.15);
		const gt = c.createLinearGradient(-u * 0.3, 0, -u * 0.3 - len, 0);
		gt.addColorStop(0, rgba(COLD, 0.8 * s.fire));
		gt.addColorStop(1, rgba(COLD, 0));
		c.save();
		c.globalCompositeOperation = 'lighter';
		c.fillStyle = gt;
		c.beginPath();
		c.moveTo(-u * 0.3, k * u * 0.13 - u * 0.04);
		c.lineTo(-u * 0.3 - len, k * u * 0.13);
		c.lineTo(-u * 0.3, k * u * 0.13 + u * 0.04);
		c.fill();
		c.restore();
	}
	const body = () => {
		c.beginPath();
		c.moveTo(u * 0.46, 0);
		c.lineTo(-u * 0.3, -u * 0.32);
		c.lineTo(-u * 0.16, 0);
		c.lineTo(-u * 0.3, u * 0.32);
		c.closePath();
	};
	body();
	const g = c.createLinearGradient(0, -u * 0.3, 0, u * 0.3);
	g.addColorStop(0, '#5d6a74');
	g.addColorStop(0.5, '#2b343b');
	g.addColorStop(1, '#161c21');
	c.fillStyle = g;
	c.fill();
	c.save();
	c.clip();
	c.strokeStyle = 'rgba(10,14,17,0.85)';
	c.lineWidth = Math.max(0.8, u * 0.022);
	c.beginPath();
	c.moveTo(u * 0.4, 0);
	c.lineTo(-u * 0.14, 0);
	c.moveTo(u * 0.1, -u * 0.1);
	c.lineTo(-u * 0.2, -u * 0.26);
	c.moveTo(u * 0.1, u * 0.1);
	c.lineTo(-u * 0.2, u * 0.26);
	c.stroke();
	c.restore();
	// the edges are lit: this is what reads in the dark
	c.save();
	c.globalCompositeOperation = 'lighter';
	body();
	c.strokeStyle = rgba(COLD, (0.7 + s.w * 0.3) * s.fire);
	c.lineWidth = Math.max(1, u * 0.035);
	c.stroke();
	c.restore();
	// the red lens
	glowAt(c, u * 0.2, 0, u * (0.2 + s.w * 0.14), RED, 0.8 * s.fire);
	c.fillStyle = '#16090a';
	c.beginPath();
	c.arc(u * 0.2, 0, u * 0.065, 0, TAU);
	c.fill();
	c.fillStyle = rgba('#ff6a5a', s.fire);
	c.beginPath();
	c.arc(u * 0.2, 0, u * (0.04 + s.w * 0.02), 0, TAU);
	c.fill();
	c.fillStyle = rgba('#ffb04a', 0.4 + 0.4 * Math.sin(t * 2 + s.id));
	c.beginPath();
	c.arc(-u * 0.1, 0, u * 0.02, 0, TAU);
	c.fill();
	c.restore();
};

export const LOOKS: readonly Look[] = [
	{
		id: 'now',
		name: 'now: arrowhead + legs',
		kind: 'now',
		note: 'the prototype hound (reads as a cockroach)',
		draw: drawHound
	},
	{ id: 'wasp', name: 'wasp', kind: 'insect', note: 'wings, a lit sting, hovers', draw: wasp },
	{ id: 'larva', name: 'larva', kind: 'insect', note: 'a segmented leech, a toothed maw', draw: larva },
	{ id: 'moth', name: 'moth', kind: 'insect', note: 'slow wings, burning eyespots', draw: moth },
	{ id: 'quad', name: 'quad drone', kind: 'drone', note: 'rotors, a searchlight, a red lens', draw: quad },
	{ id: 'crawler', name: 'tracked bot', kind: 'drone', note: 'treads, lamps, hazard rear', draw: crawler },
	{ id: 'delta', name: 'delta drone', kind: 'drone', note: 'a lit metal arrowhead', draw: delta }
];

/** The four states every hound shows, as the game's `Hound` carries them. */
export type StateId = 'stalk' | 'windup' | 'lunge' | 'flee';
export function fakeHound(id: number, mode: StateId, windup = 0): Hound {
	const speed = mode === 'lunge' ? 7.8 : mode === 'flee' ? 6.9 : mode === 'windup' ? 0 : 0.8;
	return {
		id,
		role: 'chaser',
		x: 0,
		y: 0,
		heading: 0,
		mode,
		speed,
		windup: mode === 'windup' ? windup : 0
	};
}

// ---------------------------------------------------------------- the heroes on the station

/**
 * A station look for the heroes' rim light, trail and sparks, added at run time so the game's
 * table stays as it is until the owner picks: `station-a` carries the torch (warm rim, embers),
 * `station-b` is the cold steel of the place (a cold rim, welding sparks).
 */
export const STATION_A = 'station-a' as HeroSeason;
export const STATION_B = 'station-b' as HeroSeason;
const looks = SEASON_LOOKS as unknown as Record<string, SeasonLook>;
looks['station-a'] = {
	rim: [255, 150, 84],
	line: [255, 130, 70],
	lineHot: [255, 226, 160],
	particle: 'ember',
	particleFill: [255, 176, 80],
	particleEdge: [150, 40, 12]
};
looks['station-b'] = {
	rim: [168, 214, 236],
	line: [150, 200, 230],
	lineHot: [236, 250, 255],
	particle: 'spark',
	particleFill: [214, 240, 255],
	particleEdge: [80, 140, 190]
};

/**
 * A: the survivor who carries the fire. Soot gathered on the side away from the torch, a scorch,
 * scratches, and the torch's warm light on the near rim. The yellow stays the loudest thing.
 */
export const sootPainter: OverPainter = (ctx, R, cut) => {
	ctx.save();
	cut.outline(ctx);
	ctx.clip();
	const g = ctx.createLinearGradient(-cut.lightX * R, -cut.lightY * R, cut.lightX * R * 0.4, cut.lightY * R * 0.4);
	g.addColorStop(0, 'rgba(24,12,6,0.5)');
	g.addColorStop(1, 'rgba(24,12,6,0)');
	ctx.fillStyle = g;
	ctx.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);
	ctx.fillStyle = 'rgba(20,10,6,0.32)';
	ctx.beginPath();
	ctx.ellipse(-R * 0.42, R * 0.28, R * 0.3, R * 0.17, 0.5, 0, TAU);
	ctx.fill();
	ctx.strokeStyle = 'rgba(30,14,8,0.5)';
	ctx.lineWidth = Math.max(0.7, R * 0.035);
	ctx.lineCap = 'round';
	for (const [x0, y0, x1, y1] of [
		[-0.2, -0.62, 0.08, -0.38],
		[-0.05, -0.7, 0.15, -0.5],
		[-0.55, 0.05, -0.28, 0.2]
	]) {
		ctx.beginPath();
		ctx.moveTo(x0 * R, y0 * R);
		ctx.lineTo(x1 * R, y1 * R);
		ctx.stroke();
	}
	ctx.globalCompositeOperation = 'lighter';
	const flick = 0.9 + 0.1 * Math.sin(cut.time * 3.1);
	const rg = ctx.createRadialGradient(cut.lightX * R * 1.1, cut.lightY * R * 1.1, 0, cut.lightX * R * 1.1, cut.lightY * R * 1.1, R * 1.1);
	rg.addColorStop(0, `rgba(255,150,70,${0.22 * flick})`);
	rg.addColorStop(1, 'rgba(255,150,70,0)');
	ctx.fillStyle = rg;
	ctx.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);
	ctx.restore();
};

/**
 * B: the one in a suit. A glass bubble round the body (a steel ring, a pale tint, two glares),
 * a clip-on lamp at the front with a short cold cone. It stays inside the tile.
 */
export const helmetPainter: OverPainter = (ctx, R, cut) => {
	ctx.save();
	ctx.fillStyle = 'rgba(160,215,240,0.07)';
	ctx.beginPath();
	ctx.arc(0, 0, R * 1.1, 0, TAU);
	ctx.fill();
	ctx.strokeStyle = 'rgba(150,172,186,0.9)';
	ctx.lineWidth = R * 0.075;
	ctx.beginPath();
	ctx.arc(0, 0, R * 1.1, 0, TAU);
	ctx.stroke();
	ctx.strokeStyle = 'rgba(40,52,60,0.7)';
	ctx.lineWidth = R * 0.02;
	ctx.beginPath();
	ctx.arc(0, 0, R * 1.04, 0, TAU);
	ctx.stroke();
	// glares on the side the key light comes from
	const la = Math.atan2(cut.lightY, cut.lightX);
	ctx.strokeStyle = 'rgba(255,255,255,0.55)';
	ctx.lineWidth = R * 0.06;
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.arc(0, 0, R * 0.93, la - 0.5, la + 0.3);
	ctx.stroke();
	ctx.lineWidth = R * 0.035;
	ctx.beginPath();
	ctx.arc(0, 0, R * 0.93, la + 0.55, la + 0.75);
	ctx.stroke();
	// the lamp, at the front and the top
	const lx = R * 1.02;
	const ly = -R * 0.42;
	ctx.globalCompositeOperation = 'lighter';
	const cone = ctx.createRadialGradient(lx, ly, 0, lx, ly, R * 3.2);
	cone.addColorStop(0, 'rgba(190,234,255,0.2)');
	cone.addColorStop(1, 'rgba(190,234,255,0)');
	ctx.fillStyle = cone;
	ctx.beginPath();
	ctx.moveTo(lx, ly);
	ctx.arc(lx, ly, R * 3.2, -0.2, 0.16);
	ctx.closePath();
	ctx.fill();
	ctx.drawImage(glow([190, 234, 255]), lx - R * 0.4, ly - R * 0.4, R * 0.8, R * 0.8);
	ctx.globalCompositeOperation = 'source-over';
	ctx.fillStyle = '#1b242a';
	ctx.beginPath();
	ctx.roundRect(lx - R * 0.14, ly - R * 0.1, R * 0.28, R * 0.2, R * 0.05);
	ctx.fill();
	ctx.fillStyle = '#eaf8ff';
	ctx.fillRect(lx + R * 0.06, ly - R * 0.06, R * 0.07, R * 0.12);
	ctx.restore();
};
