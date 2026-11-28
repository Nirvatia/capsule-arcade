// The hell's finale and its phase-3 slow (the owner's picks of the `hell-weapons` prototype,
// 2026-11-28): the boss's death (he swells under turning beams, bursts white with two shock rings,
// flesh flung far, his horns thrown high, blood rain, a pool with his horns and embers), the heart he
// leaves (+1 life, a red heart in a white bone frame), the exit (an iron hatch whose iris opens on
// gold light), and the slow tiles as pale hands of the damned reaching out of a crack (in place of
// the tar). In the «Плоть» language (`fleshPaint`). (x, y) is a centre in px, S the tile in px.
import { TAU, bloom, cel, ink, linear, radial } from './fleshPaint';
import type { Ctx, Tones } from './fleshPaint';
import type { Tile } from './attackArt';

const BONE: Tones = { light: '#fff4dc', mid: '#e2cba2', shade: '#9a7c58' };
const BLOOD: Tones = { light: '#ff8a70', mid: '#d0281e', shade: '#6a0810' };
const HEART: Tones = { light: '#ffb09a', mid: '#e0302a', shade: '#5a0610' };
const IRON: Tones = { light: '#9aa2aa', mid: '#4a5058', shade: '#1e2228' };

/** A curved horn lying (or flying), pointing along `a`. */
function horn(c: Ctx, x: number, y: number, S: number, a: number): void {
	c.save();
	c.translate(x, y);
	c.rotate(a);
	cel(
		c,
		() => {
			c.beginPath();
			c.moveTo(-S * 0.12, S * 0.06);
			c.quadraticCurveTo(-S * 0.02, -S * 0.1, S * 0.16, -S * 0.12);
			c.quadraticCurveTo(S * 0.02, -S * 0.02, S * 0.0, S * 0.08);
			c.closePath();
		},
		BONE,
		0,
		0,
		S * 0.1,
		S,
		0.6
	);
	c.restore();
}

/**
 * The boss's death, `f` 0..1 over about 3 s. He swells and shakes while beams of light break out of
 * him and turn (0..0.4); he bursts: a white disc, two shock rings over three tiles, flesh flung far
 * with blood trails, his horns thrown high (0.4..0.7); blood rains back, the pool spreads with his
 * horns in it, embers rise from it (to the end; the pool stays).
 */
export function bossDeath(
	c: Ctx,
	x: number,
	y: number,
	S: number,
	f: number,
	t: number,
	drawBoss: (dx: number) => void
): void {
	const pool = Math.max(0, Math.min(1, (f - 0.42) / 0.35));
	if (pool > 0) bloodPool(c, x, y, S, pool, t, f);
	if (f < 0.4) {
		const k = f / 0.4;
		// the beams: eight long rays turning, longer and brighter as he swells
		c.save();
		c.globalCompositeOperation = 'lighter';
		for (let i = 0; i < 8; i += 1) {
			const a = (i * TAU) / 8 + t * 0.8;
			const len = S * (0.6 + 2.2 * k);
			const w = S * (0.05 + 0.1 * k);
			const g = c.createLinearGradient(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len);
			g.addColorStop(0, `rgba(255,240,210,${0.3 + 0.6 * k})`);
			g.addColorStop(1, 'rgba(255,120,60,0)');
			c.fillStyle = g;
			c.beginPath();
			c.moveTo(x + Math.cos(a + Math.PI / 2) * w, y + Math.sin(a + Math.PI / 2) * w);
			c.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
			c.lineTo(x + Math.cos(a - Math.PI / 2) * w, y + Math.sin(a - Math.PI / 2) * w);
			c.closePath();
			c.fill();
		}
		c.restore();
		c.save();
		const swell = 1 + 0.25 * k;
		c.translate(x, y);
		c.scale(swell, swell);
		c.translate(-x, -y);
		drawBoss(Math.sin(t * 70) * 0.05 * k);
		c.restore();
		bloom(c, x, y, S * (0.8 + 1.0 * k), '255,220,180', 0.3 + 0.6 * k);
		return;
	}
	const fly = Math.min(1, (f - 0.4) / 0.3);
	const a = 1 - fly;
	if (fly < 1) {
		// the white disc and two shock rings
		bloom(c, x, y, S * 3, '255,235,210', 0.9 * a);
		c.fillStyle = `rgba(255,250,235,${a * a})`;
		c.beginPath();
		c.arc(x, y, S * (0.6 + 1.4 * fly), 0, TAU);
		c.fill();
		c.save();
		for (const [d, w] of [
			[3.2, 0.08],
			[2.2, 0.05]
		]) {
			c.strokeStyle = `rgba(255,${d > 3 ? 200 : 240},${d > 3 ? 160 : 220},${a})`;
			c.lineWidth = S * w * a + 1;
			c.beginPath();
			c.arc(x, y, S * (0.4 + d * fly), 0, TAU);
			c.stroke();
		}
		c.restore();
		// flesh flung far, each with a blood trail
		for (let i = 0; i < 18; i += 1) {
			const ang = (i * TAU) / 18 + (i % 3) * 0.15;
			const reach = S * (1.4 + (0.9 * ((i * 7) % 5)) / 4);
			const d = reach * (1 - (1 - fly) ** 2);
			const px = x + Math.cos(ang) * d;
			const py = y + Math.sin(ang) * d + S * 0.5 * fly * fly;
			c.strokeStyle = `rgba(160,10,16,${0.7 * a})`;
			c.lineWidth = Math.max(1, S * 0.04);
			c.beginPath();
			c.moveTo(x + Math.cos(ang) * d * 0.6, y + Math.sin(ang) * d * 0.6);
			c.lineTo(px, py);
			c.stroke();
			c.save();
			c.translate(px, py);
			c.globalAlpha *= Math.min(1, a * 2);
			cel(
				c,
				() => {
					c.beginPath();
					c.ellipse(0, 0, S * 0.09, S * 0.06, ang, 0, TAU);
				},
				BLOOD,
				0,
				0,
				S * 0.09,
				S,
				0.4
			);
			c.restore();
		}
	}
	// the horns: thrown high, spinning, then lying in the pool
	for (const s of [-1, 1]) {
		const k = Math.min(1, (f - 0.4) / 0.45);
		const hx = x + s * S * (0.12 + 0.32 * k);
		const hy = y - S * (1.6 * k - 1.72 * k * k) + S * 0.1;
		horn(c, hx, hy, S * 1.2, s > 0 ? 0.4 + (1 - k) * 9 : Math.PI - 0.4 - (1 - k) * 9);
	}
}

/** What he leaves: a pool of blood spreading, drops raining back into it, embers rising. */
function bloodPool(
	c: Ctx,
	x: number,
	y: number,
	S: number,
	pool: number,
	t: number,
	f: number
): void {
	c.save();
	c.beginPath();
	for (let i = 0; i <= 20; i += 1) {
		const a = (i * TAU) / 20;
		const r = S * 0.7 * pool * (0.78 + 0.22 * Math.sin(i * 2.3));
		const px = x + Math.cos(a) * r * 1.2;
		const py = y + S * 0.15 + Math.sin(a) * r * 0.7;
		if (i === 0) c.moveTo(px, py);
		else c.lineTo(px, py);
	}
	c.closePath();
	c.fillStyle = linear(c, 0, y - S * 0.3, 0, y + S * 0.6, ['#e0281e', '#7a0a10']);
	c.fill();
	ink(c, S, 0.6);
	c.fillStyle = 'rgba(255,210,200,.55)';
	c.beginPath();
	c.ellipse(x - S * 0.2, y + S * 0.02, S * 0.2 * pool, S * 0.035 * pool, -0.2, 0, TAU);
	c.fill();
	c.restore();
	// drops raining back, splashing
	const rain = Math.max(0, Math.min(1, (f - 0.55) / 0.35));
	if (rain > 0 && rain < 1) {
		for (let i = 0; i < 7; i += 1) {
			const u = (rain * 1.6 + i / 7) % 1;
			const px = x + (i - 3) * S * 0.22;
			const py = y - S * 1.4 + u * S * 1.6;
			c.fillStyle = BLOOD.mid;
			c.beginPath();
			c.ellipse(px, py, S * 0.035, S * 0.06, 0, 0, TAU);
			c.fill();
		}
	}
	// embers rising off it
	for (let i = 0; i < 5; i += 1) {
		const u = (t * 0.5 + i / 5) % 1;
		c.fillStyle = `rgba(255,150,70,${(1 - u) * 0.8 * pool})`;
		c.beginPath();
		c.arc(x + Math.sin(i * 1.9 + t) * S * 0.4, y - u * S * 0.9, S * 0.025, 0, TAU);
		c.fill();
	}
}

/** The floating and its shadow, shared by the hearts. */
function floatAt(c: Ctx, x: number, y: number, S: number, t: number): number {
	const bob = Math.sin(t * 2.4) * S * 0.05;
	c.fillStyle = 'rgba(8,1,3,.5)';
	c.beginPath();
	c.ellipse(x + S * 0.04, y + S * 0.38, S * 0.28, S * 0.08, 0, 0, TAU);
	c.fill();
	return bob;
}

function heartPath(c: Ctx, S: number, k: number): void {
	c.beginPath();
	c.moveTo(0, S * 0.32 * k);
	c.bezierCurveTo(-S * 0.46 * k, S * 0.04 * k, -S * 0.32 * k, -S * 0.36 * k, 0, -S * 0.14 * k);
	c.bezierCurveTo(S * 0.32 * k, -S * 0.36 * k, S * 0.46 * k, S * 0.04 * k, 0, S * 0.32 * k);
	c.closePath();
}

/**
 * The heart he leaves (+1 life), the reliquary: a red heart set in a white bone frame (a light disc with a dark
 * ink edge reads on the dark floor), a soft gold glow behind it.
 */
export function drawHellHeart(c: Ctx, x: number, y: number, S: number, t: number): void {
	const bob = floatAt(c, x, y, S, t);
	const beat = 1 + 0.12 * Math.max(0, Math.sin(t * 5)) ** 3;
	const cy = y - S * 0.06 + bob;
	bloom(c, x, cy, S * 1.2, '255,226,150', 0.6);
	cel(
		c,
		() => {
			c.beginPath();
			c.arc(x, cy, S * 0.44, 0, TAU);
		},
		{ light: '#ffffff', mid: '#f0e4cc', shade: '#b09a78' },
		x,
		cy,
		S * 0.44,
		S,
		1.2
	);
	c.save();
	c.translate(x, cy + S * 0.02);
	c.scale(beat, beat);
	cel(c, () => heartPath(c, S, 0.78), HEART, 0, 0, S * 0.25, S, 1);
	c.fillStyle = 'rgba(255,255,255,.85)';
	c.beginPath();
	c.ellipse(-S * 0.12, -S * 0.08, S * 0.05, S * 0.02, -0.6, 0, TAU);
	c.fill();
	c.restore();
}

/**
 * The exit: a round iron hatch in the floor, riveted with skulls, its iris opening onto a gold light
 * rising from below. `open` 0..1.
 */
export function drawHellExit(
	c: Ctx,
	x: number,
	y: number,
	S: number,
	t: number,
	open: number
): void {
	const R = S * 0.44;
	c.fillStyle = 'rgba(8,1,3,.5)';
	c.beginPath();
	c.arc(x + S * 0.03, y + S * 0.05, R * 1.05, 0, TAU);
	c.fill();
	cel(
		c,
		() => {
			c.beginPath();
			c.arc(x, y, R, 0, TAU);
		},
		IRON,
		x,
		y,
		R,
		S,
		1
	);
	// the light below, through the iris
	const hole = R * 0.7 * open;
	if (hole > 0) {
		c.save();
		c.beginPath();
		c.arc(x, y, hole, 0, TAU);
		c.clip();
		c.fillStyle = radial(c, x, y, 0, hole, ['#fff8e0', '#ffd27a', '#c07a20']);
		c.fillRect(x - hole, y - hole, hole * 2, hole * 2);
		c.restore();
		bloom(c, x, y, S * (0.8 + 0.3 * Math.sin(t * 3)), '255,214,130', 0.6 * open);
	}
	// the iris blades
	for (let k = 0; k < 6; k += 1) {
		const a = (k * TAU) / 6 + open * 0.9;
		c.save();
		c.translate(x, y);
		c.rotate(a);
		c.beginPath();
		c.moveTo(hole, 0);
		c.arc(0, 0, R * 0.78, 0, TAU / 6 + 0.05);
		c.lineTo(Math.cos(TAU / 6) * hole, Math.sin(TAU / 6) * hole);
		c.closePath();
		c.fillStyle = k % 2 ? '#3a3e44' : '#4a5058';
		c.fill();
		ink(c, S, 0.4);
		c.restore();
	}
	// four bone skull rivets on the rim
	for (let k = 0; k < 4; k += 1) {
		const a = (k * TAU) / 4 + Math.PI / 4;
		const rx = x + Math.cos(a) * R * 0.88;
		const ry = y + Math.sin(a) * R * 0.88;
		cel(
			c,
			() => {
				c.beginPath();
				c.arc(rx, ry, S * 0.05, 0, TAU);
			},
			BONE,
			rx,
			ry,
			S * 0.05,
			S,
			0.4
		);
	}
	// gold motes rising out of it
	for (let k = 0; k < 4 * open; k += 1) {
		const u = (t * 0.6 + k / 4) % 1;
		c.fillStyle = `rgba(255,230,160,${(1 - u) * open})`;
		c.beginPath();
		c.arc(x + Math.sin(k * 2.1 + t) * hole * 0.6, y - u * S * 0.7, S * 0.03, 0, TAU);
		c.fill();
	}
}

/** The hero, in tile coordinates, or null. */
export type HeroAt = { readonly x: number; readonly y: number } | null;

/** How strongly the hero is on tile `q`: 1 at its centre, 0 from 0.75 of a tile away. */
function grip(q: Tile, hero: HeroAt): number {
	if (!hero) return 0;
	const d = Math.hypot(hero.x - (q.c + 0.5), hero.y - (q.r + 0.5));
	return Math.max(0, Math.min(1, (0.75 - d) / 0.45));
}

const SKIN: Tones = { light: '#e8ddd4', mid: '#b4a49c', shade: '#6a5a56' };

/** One pale hand on its arm, from (bx, by) toward (hx, hy); `close` 0..1 curls its fingers. */
function hand(
	c: Ctx,
	bx: number,
	by: number,
	hx: number,
	hy: number,
	s: number,
	close: number
): void {
	c.lineCap = 'round';
	c.strokeStyle = '#1a0a08';
	c.lineWidth = s * 0.13;
	c.beginPath();
	c.moveTo(bx, by);
	c.lineTo(hx, hy);
	c.stroke();
	c.strokeStyle = SKIN.mid;
	c.lineWidth = s * 0.08;
	c.stroke();
	const a = Math.atan2(hy - by, hx - bx);
	c.save();
	c.translate(hx, hy);
	c.rotate(a);
	for (let k = -1.5; k <= 1.5; k += 1) {
		const fa = k * 0.35 * (1 - 0.7 * close);
		const len = s * 0.13 * (1 - 0.45 * close);
		c.strokeStyle = '#1a0a08';
		c.lineWidth = s * 0.06;
		c.beginPath();
		c.moveTo(0, 0);
		c.lineTo(Math.cos(fa) * len, Math.sin(fa) * len);
		c.stroke();
		c.strokeStyle = SKIN.light;
		c.lineWidth = s * 0.03;
		c.stroke();
	}
	cel(
		c,
		() => {
			c.beginPath();
			c.ellipse(0, 0, s * 0.07, s * 0.06, 0, 0, TAU);
		},
		SKIN,
		0,
		0,
		s * 0.07,
		s,
		0.4
	);
	c.restore();
}

/**
 * Where the three hands of slow tile `q` rise from and where their palms are now, in px: at rest they
 * sway over their crack inside the tile; with the hero on it they reach for him.
 */
export function handPoints(
	q: Tile,
	ox: number,
	oy: number,
	s: number,
	t: number,
	hero: HeroAt
): Array<{ bx: number; by: number; hx: number; hy: number }> {
	const cx = ox + (q.c + 0.5) * s;
	const cy = oy + (q.r + 0.5) * s;
	const g = grip(q, hero);
	const out: Array<{ bx: number; by: number; hx: number; hy: number }> = [];
	for (let k = 0; k < 3; k += 1) {
		const bx = cx + (k - 1) * s * 0.2;
		const by = cy + s * 0.04;
		const sway = Math.sin(t * 2.2 + k * 2 + q.c) * s * 0.08;
		let hx = bx + sway * (1 - g);
		let hy = by - s * (0.22 + 0.06 * Math.sin(t * 3 + k));
		if (hero && g > 0) {
			const tx = ox + hero.x * s + (k - 1) * s * 0.12;
			const ty = oy + hero.y * s + s * 0.15;
			hx += (tx - hx) * g;
			hy += (ty - hy) * g;
		}
		out.push({ bx, by, hx, hy });
	}
	return out;
}

/**
 * The slow tiles of phase 3, the hands: a crack in each tile with three pale hands of the damned reaching out of it,
 * swaying; on the hero they reach for him and close.
 */
export function slowHands(
	c: Ctx,
	tiles: readonly Tile[],
	ox: number,
	oy: number,
	s: number,
	t: number,
	hero: HeroAt
): void {
	for (const q of tiles) {
		const cx = ox + (q.c + 0.5) * s;
		const cy = oy + (q.r + 0.5) * s;
		const g = grip(q, hero);
		// the crack they come out of
		c.beginPath();
		c.moveTo(cx - s * 0.34, cy + s * 0.05);
		c.lineTo(cx - s * 0.12, cy - s * 0.06);
		c.lineTo(cx + s * 0.06, cy + s * 0.08);
		c.lineTo(cx + s * 0.34, cy - s * 0.04);
		c.lineTo(cx + s * 0.1, cy + s * 0.16);
		c.lineTo(cx - s * 0.14, cy + s * 0.1);
		c.closePath();
		c.fillStyle = '#080203';
		c.fill();
		c.strokeStyle = 'rgba(200,120,90,.6)';
		c.lineWidth = Math.max(1, s * 0.025);
		c.stroke();
		for (const h of handPoints(q, ox, oy, s, t, hero)) {
			hand(c, h.bx, h.by, h.hx, h.hy, s, g);
		}
	}
}
