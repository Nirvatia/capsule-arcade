// Throwaway candidates for the station's hounds and its heroes (DESIGN.md §7a). The hound's
// behaviour (`logic/station/HoundPack`) stays; only the body is up for choice. Rejected by the
// owner: insects with legs or wings and drones. Now: a void jellyfish whose pulses are its gait
// and whose rim eye shows where it goes. Every painter has `drawHound`'s signature, fits about
// one tile and shows stalk, windup (a held breath before the dash), lunge and flee. Nothing
// flashes faster than ~3 times a second.
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

// ---------------------------------------------------------------- the jellyfish of the void

const VIOLET = '#8a4dff';
const TEAL = '#5dffd8';

/**
 * A void jellyfish: a translucent scalloped bell with glowing canals and a ring of four pale
 * gonads, soft frills trailing behind. It moves the way a jellyfish does, by pulses: slow ones
 * when it creeps, the bell held squeezed in the windup, one hard stroke in the dash. The movement
 * indicator is one eye on the bell's front rim, a bright iris with a dark slit across the heading;
 * it swells in the windup. Everything stays inside about one tile; nothing pulses over ~2 Hz.
 */
const jelly: DrawHound = (c, h, x, y, heading, _stride, S, t) => {
	const s = st(h);
	const u = S * 0.98;
	const rate = s.flee ? 1.5 : 0.85;
	const ph = (t * rate + s.id * 0.37) % 1;
	// 0 relaxed .. 1 squeezed
	const k = s.dash ? 1 : s.w > 0 ? 0.78 + 0.05 * Math.sin(t * 8) : 0.55 * Math.pow(0.5 + 0.5 * Math.sin(ph * Math.PI * 2), 2);
	const across = u * 0.36 * (1 + 0.16 * (1 - k)) * (s.dash ? 0.82 : 1);
	const along = u * 0.34 * (1 - 0.2 * k) * (s.dash ? 1.22 : 1);
	c.save();
	c.translate(x, y);
	glowAt(c, 0, 0, u * (0.85 + s.w * 0.4), VIOLET, 0.2 * s.fire + s.w * 0.14);
	c.rotate(heading);
	shadow(c, -u * 0.04, u * 0.1, along * 1.05, across * 0.8, 0.35);
	if (s.dash) streak(c, u, TEAL, 1.1, 0.35);
	// the frills: four ribbons streaming back, longer and straighter the harder the stroke
	for (let i = 0; i < 4; i += 1) {
		const side = (i - 1.5) / 1.5;
		const len = u * (0.42 + 0.3 * k + (s.dash ? 0.18 : 0));
		c.beginPath();
		c.moveTo(-along * 0.35, side * across * 0.35);
		for (let j = 1; j <= 10; j += 1) {
			const f = j / 10;
			c.lineTo(
				-along * 0.35 - f * len,
				side * across * (0.35 + f * 0.25) + Math.sin(t * 2.2 - f * 5 + i * 1.7 + s.id) * u * 0.05 * f
			);
		}
		c.strokeStyle = rgba(VIOLET, 0.55 * s.fire);
		c.lineWidth = u * 0.06;
		c.lineCap = 'round';
		c.stroke();
		c.strokeStyle = rgba(TEAL, 0.5 * s.fire);
		c.lineWidth = u * 0.022;
		c.stroke();
	}
	// the bell: eight soft scallops round an oval
	const bell = (): void => {
		c.beginPath();
		for (let j = 0; j <= 64; j += 1) {
			const a = (j / 64) * TAU;
			const scal = 1 + 0.045 * Math.cos(a * 8);
			const px = Math.cos(a) * along * scal;
			const py = Math.sin(a) * across * scal;
			if (j === 0) c.moveTo(px, py);
			else c.lineTo(px, py);
		}
		c.closePath();
	};
	bell();
	const g = c.createRadialGradient(0, 0, 0, 0, 0, across);
	g.addColorStop(0, 'rgba(46,22,96,.92)');
	g.addColorStop(0.7, 'rgba(90,48,176,.7)');
	g.addColorStop(1, 'rgba(140,90,255,.45)');
	c.fillStyle = g;
	c.fill();
	c.save();
	c.clip();
	c.globalCompositeOperation = 'lighter';
	// radial canals and the ring canal: it lives from inside
	c.strokeStyle = rgba(TEAL, 0.5 * s.fire + s.w * 0.2);
	c.lineWidth = Math.max(0.8, u * 0.022);
	for (let j = 0; j < 8; j += 1) {
		const a = (j / 8) * TAU + 0.2;
		c.beginPath();
		c.moveTo(Math.cos(a) * along * 0.18, Math.sin(a) * across * 0.18);
		c.lineTo(Math.cos(a) * along * 0.9, Math.sin(a) * across * 0.9);
		c.stroke();
	}
	c.beginPath();
	c.ellipse(0, 0, along * 0.84, across * 0.84, 0, 0, TAU);
	c.stroke();
	// four pale gonads
	c.strokeStyle = rgba('#ffb6f0', 0.8 * s.fire);
	c.lineWidth = Math.max(1, u * 0.04);
	for (let j = 0; j < 4; j += 1) {
		const a = (j / 4) * TAU + Math.PI / 4;
		c.beginPath();
		c.arc(Math.cos(a) * along * 0.26, Math.sin(a) * across * 0.26, u * 0.065, 0, TAU);
		c.stroke();
	}
	stationGlow(c, 0, 0, across * 0.7, VIOLET, 0.35 * s.fire);
	c.restore();
	bell();
	c.strokeStyle = rgba(TEAL, 0.75 * s.fire);
	c.lineWidth = Math.max(1, u * 0.03);
	c.stroke();
	// the eye on the front rim: the movement indicator
	const ex = along * 0.93;
	const er = u * (0.075 + s.w * 0.05);
	glowAt(c, ex, 0, u * (0.24 + s.w * 0.18), TEAL, 0.75 * s.fire);
	c.fillStyle = rgba('#e6fff8', s.fire);
	c.beginPath();
	c.ellipse(ex, 0, er * 1.1, er, 0, 0, TAU);
	c.fill();
	c.fillStyle = '#0a0418';
	c.beginPath();
	c.ellipse(ex + er * 0.1, 0, er * (s.w > 0 ? 0.22 : 0.3), er * 0.95, 0, 0, TAU);
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
	{
		id: 'jelly',
		name: 'void jellyfish',
		kind: 'insect',
		note: 'pulses, a slit-pupil eye on the rim',
		draw: jelly
	}
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
