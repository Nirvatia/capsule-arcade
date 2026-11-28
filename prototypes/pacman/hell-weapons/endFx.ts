// The art pass's last group (ROADMAP Part II.1, the hell): the boss's death, the heart he leaves
// (+1 life), the exit, and the tar without round pools. In the «Плоть» language.
// (x, y) is a centre in px, S the tile in px; the tar painters take the game's tile list.
import { TAU, bloom, cel, ink, linear, radial } from '../hell-kit/paint';
import type { Ctx, Tones } from '../hell-kit/paint';

const BONE: Tones = { light: '#fff4dc', mid: '#e2cba2', shade: '#9a7c58' };
const BLOOD: Tones = { light: '#ff8a70', mid: '#d0281e', shade: '#6a0810' };
const HEART: Tones = { light: '#ffb09a', mid: '#e0302a', shade: '#5a0610' };
const IRON: Tones = { light: '#9aa2aa', mid: '#4a5058', shade: '#1e2228' };

/** A curved horn lying (or flying), pointing along `a`. */
function horn(c: Ctx, x: number, y: number, S: number, a: number): void {
	c.save();
	c.translate(x, y);
	c.rotate(a);
	cel(c, () => {
		c.beginPath();
		c.moveTo(-S * 0.12, S * 0.06);
		c.quadraticCurveTo(-S * 0.02, -S * 0.1, S * 0.16, -S * 0.12);
		c.quadraticCurveTo(S * 0.02, -S * 0.02, S * 0.0, S * 0.08);
		c.closePath();
	}, BONE, 0, 0, S * 0.1, S, 0.6);
	c.restore();
}

/**
 * The boss's death, `f` 0..1 over about 2 s: he shakes with light breaking through (0..0.35), bursts
 * (a white flash, flesh and his two horns flung out, 0.35..0.6), and what is left is a pool of blood
 * spreading on the floor with his horns lying in it (to the end; the pool stays).
 */
export function bossDeath(c: Ctx, x: number, y: number, S: number, f: number, t: number, drawBoss: (dx: number) => void): void {
	if (f < 0.35) {
		const k = f / 0.35;
		drawBoss(Math.sin(t * 70) * 0.04 * k);
		bloom(c, x, y, S * (0.8 + 0.6 * k), '255,220,180', 0.3 + 0.5 * k);
		c.save();
		c.strokeStyle = `rgba(255,240,210,${0.5 + 0.5 * k})`;
		c.lineWidth = Math.max(1.2, S * 0.04);
		c.lineCap = 'round';
		for (let i = 0; i < 8; i += 1) {
			const a = (i * TAU) / 8 + 0.2;
			const len = S * (0.2 + 0.35 * k);
			c.beginPath();
			c.moveTo(x, y);
			c.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
			c.stroke();
		}
		c.restore();
		return;
	}
	const pool = Math.min(1, (f - 0.35) / 0.4);
	// the pool, an irregular blob, under everything
	c.save();
	c.beginPath();
	for (let i = 0; i <= 16; i += 1) {
		const a = (i * TAU) / 16;
		const r = S * 0.55 * pool * (0.8 + 0.2 * Math.sin(i * 2.3));
		const px = x + Math.cos(a) * r * 1.2;
		const py = y + S * 0.15 + Math.sin(a) * r * 0.7;
		if (i === 0) c.moveTo(px, py);
		else c.lineTo(px, py);
	}
	c.closePath();
	c.fillStyle = linear(c, 0, y - S * 0.2, 0, y + S * 0.5, ['#d0241e', '#7a0a10']);
	c.fill();
	ink(c, S, 0.5);
	c.fillStyle = 'rgba(255,200,190,.5)';
	c.beginPath();
	c.ellipse(x - S * 0.15, y + S * 0.02, S * 0.14 * pool, S * 0.03 * pool, -0.2, 0, TAU);
	c.fill();
	c.restore();
	const fly = Math.min(1, (f - 0.35) / 0.25);
	if (fly < 1) {
		const a = 1 - fly;
		bloom(c, x, y, S * 1.6, '255,230,200', 0.9 * a);
		for (let i = 0; i < 10; i += 1) {
			const ang = (i * TAU) / 10;
			const d = S * (0.2 + 1.0 * fly);
			c.save();
			c.globalAlpha *= a;
			c.translate(x + Math.cos(ang) * d, y + Math.sin(ang) * d + S * 0.4 * fly * fly);
			cel(c, () => { c.beginPath(); c.ellipse(0, 0, S * 0.08, S * 0.05, ang, 0, TAU); }, BLOOD, 0, 0, S * 0.08, S, 0.4);
			c.restore();
		}
	}
	// the horns: flung up, then lying in the pool
	for (const s of [-1, 1]) {
		const k = Math.min(1, fly);
		const hx = x + s * S * (0.1 + 0.18 * k);
		const hy = y - S * (0.5 * k - 0.62 * k * k) + S * 0.08;
		horn(c, hx, hy, S, s > 0 ? 0.4 + (1 - k) * 3 : Math.PI - 0.4 - (1 - k) * 3);
	}
}

/** The heart he leaves (+1 life): a hot heart floating over its shadow, beating, a crown of glow. */
export function heartReward(c: Ctx, x: number, y: number, S: number, t: number): void {
	const bob = Math.sin(t * 2.4) * S * 0.05;
	const beat = 1 + 0.14 * Math.max(0, Math.sin(t * 5)) ** 3;
	c.fillStyle = 'rgba(8,1,3,.45)';
	c.beginPath();
	c.ellipse(x + S * 0.04, y + S * 0.36, S * 0.26, S * 0.08, 0, 0, TAU);
	c.fill();
	bloom(c, x, y - S * 0.05 + bob, S * 1.2, '255,90,60', 0.55 + 0.4 * (beat - 1) * 7);
	c.save();
	c.translate(x, y - S * 0.06 + bob);
	c.scale(beat, beat);
	const heart = (): void => {
		c.beginPath();
		c.moveTo(0, S * 0.32);
		c.bezierCurveTo(-S * 0.46, S * 0.04, -S * 0.32, -S * 0.36, 0, -S * 0.14);
		c.bezierCurveTo(S * 0.32, -S * 0.36, S * 0.46, S * 0.04, 0, S * 0.32);
		c.closePath();
	};
	cel(c, heart, HEART, 0, 0, S * 0.32, S, 1.1);
	// the veins and the vessels on top
	c.strokeStyle = 'rgba(70,0,10,.7)';
	c.lineWidth = Math.max(1, S * 0.025);
	c.beginPath();
	c.moveTo(-S * 0.12, -S * 0.1);
	c.quadraticCurveTo(-S * 0.04, S * 0.04, -S * 0.1, S * 0.16);
	c.moveTo(S * 0.1, -S * 0.12);
	c.quadraticCurveTo(S * 0.16, 0, S * 0.04, S * 0.14);
	c.stroke();
	for (const vx of [-0.06, 0.06]) {
		cel(c, () => { c.beginPath(); c.roundRect(S * vx - S * 0.035, -S * 0.3, S * 0.07, S * 0.14, S * 0.03); }, BLOOD, S * vx, -S * 0.24, S * 0.05, S, 0.6);
	}
	c.fillStyle = 'rgba(255,255,255,.8)';
	c.beginPath();
	c.ellipse(-S * 0.15, -S * 0.1, S * 0.06, S * 0.025, -0.6, 0, TAU);
	c.fill();
	c.restore();
}

/**
 * The exit: a round iron hatch in the floor, riveted with skulls, its iris opening onto a gold light
 * rising from below. `open` 0..1.
 */
export function exitHatch(c: Ctx, x: number, y: number, S: number, t: number, open: number): void {
	const R = S * 0.44;
	c.fillStyle = 'rgba(8,1,3,.5)';
	c.beginPath();
	c.arc(x + S * 0.03, y + S * 0.05, R * 1.05, 0, TAU);
	c.fill();
	cel(c, () => { c.beginPath(); c.arc(x, y, R, 0, TAU); }, IRON, x, y, R, S, 1);
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
		cel(c, () => { c.beginPath(); c.arc(rx, ry, S * 0.05, 0, TAU); }, BONE, rx, ry, S * 0.05, S, 0.4);
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

export interface Tile {
	readonly c: number;
	readonly r: number;
}

/** A small seeded random per tile, so each tile keeps its cracks. */
function rand(c: number, r: number, k: number): number {
	const v = Math.sin(c * 127.1 + r * 311.7 + k * 74.7) * 43758.5453;
	return v - Math.floor(v);
}

/**
 * Tar candidate A, the crust: the corridor floor under a dry black crust, one sheet across its tiles
 * (no rounds), broken by cracks that glow a dull ember, a dull sheen along it.
 */
export function tarCrust(c: Ctx, tiles: readonly Tile[], ox: number, oy: number, s: number, t: number): void {
	const pad = s * 0.08;
	const keys = new Set(tiles.map((q) => `${q.c},${q.r}`));
	c.save();
	c.beginPath();
	for (const q of tiles) {
		const x0 = ox + q.c * s + pad;
		const y0 = oy + q.r * s + pad;
		// reach into a tarred neighbour so the sheet has no seam
		const w = s - pad * 2 + (keys.has(`${q.c + 1},${q.r}`) ? pad * 2 : 0);
		const h = s - pad * 2 + (keys.has(`${q.c},${q.r + 1}`) ? pad * 2 : 0);
		c.rect(x0, y0, w, h);
	}
	c.fillStyle = '#1c0e0c';
	c.fill();
	c.clip();
	// the crust's plates: a faintly lighter patch per tile
	for (const q of tiles) {
		c.fillStyle = `rgba(80,50,40,${0.25 + 0.2 * rand(q.c, q.r, 1)})`;
		c.beginPath();
		c.moveTo(ox + (q.c + 0.2) * s, oy + (q.r + 0.25) * s);
		c.lineTo(ox + (q.c + 0.75) * s, oy + (q.r + 0.15) * s);
		c.lineTo(ox + (q.c + 0.8) * s, oy + (q.r + 0.7) * s);
		c.lineTo(ox + (q.c + 0.3) * s, oy + (q.r + 0.8) * s);
		c.closePath();
		c.fill();
	}
	// the cracks, glowing a dull ember that breathes
	const glow = 0.5 + 0.2 * Math.sin(t * 2);
	for (const pass of [0, 1]) {
		c.strokeStyle = pass === 0 ? '#060202' : `rgba(255,110,40,${glow})`;
		c.lineWidth = pass === 0 ? Math.max(1.6, s * 0.06) : Math.max(0.8, s * 0.022);
		c.lineCap = 'round';
		c.lineJoin = 'round';
		for (const q of tiles) {
			c.beginPath();
			let px = ox + q.c * s;
			let py = oy + (q.r + 0.2 + 0.6 * rand(q.c, q.r, 2)) * s;
			c.moveTo(px, py);
			for (let k = 1; k <= 3; k += 1) {
				px = ox + (q.c + k / 3) * s;
				py = oy + (q.r + 0.2 + 0.6 * rand(q.c, q.r, 2 + k)) * s;
				c.lineTo(px, py);
			}
			const bx = ox + (q.c + 0.3 + 0.4 * rand(q.c, q.r, 9)) * s;
			c.moveTo(bx, oy + q.r * s);
			c.lineTo(bx + s * 0.08, oy + (q.r + 0.4) * s);
			c.stroke();
		}
	}
	c.restore();
}

/**
 * Tar candidate B, the flow: one glossy black stream filling the corridor, slow ripples running along
 * it (chevrons, no rounds) and a long sheen.
 */
export function tarFlow(c: Ctx, tiles: readonly Tile[], ox: number, oy: number, s: number, t: number): void {
	const pad = s * 0.08;
	const keys = new Set(tiles.map((q) => `${q.c},${q.r}`));
	c.save();
	c.beginPath();
	for (const q of tiles) {
		const x0 = ox + q.c * s + pad;
		const y0 = oy + q.r * s + pad;
		const w = s - pad * 2 + (keys.has(`${q.c + 1},${q.r}`) ? pad * 2 : 0);
		const h = s - pad * 2 + (keys.has(`${q.c},${q.r + 1}`) ? pad * 2 : 0);
		c.rect(x0, y0, w, h);
	}
	c.fillStyle = linear(c, 0, oy, 0, oy + s, ['#16090a', '#060203']);
	c.fill();
	c.clip();
	for (const q of tiles) {
		const horiz = keys.has(`${q.c + 1},${q.r}`) || keys.has(`${q.c - 1},${q.r}`);
		for (let k = 0; k < 3; k += 1) {
			const u = ((t * 0.35 + k / 3 + q.c * 0.33 + q.r * 0.33) % 1) * s;
			c.strokeStyle = 'rgba(150,110,110,.35)';
			c.lineWidth = Math.max(1, s * 0.03);
			c.beginPath();
			if (horiz) {
				const x = ox + q.c * s + u;
				c.moveTo(x - s * 0.08, oy + (q.r + 0.25) * s);
				c.lineTo(x, oy + (q.r + 0.5) * s);
				c.lineTo(x - s * 0.08, oy + (q.r + 0.75) * s);
			} else {
				const y = oy + q.r * s + u;
				c.moveTo(ox + (q.c + 0.25) * s, y - s * 0.08);
				c.lineTo(ox + (q.c + 0.5) * s, y);
				c.lineTo(ox + (q.c + 0.75) * s, y - s * 0.08);
			}
			c.stroke();
		}
		// the long sheen along the stream
		c.fillStyle = 'rgba(255,230,220,.18)';
		if (horiz) c.fillRect(ox + q.c * s, oy + (q.r + 0.28) * s, s, s * 0.05);
		else c.fillRect(ox + (q.c + 0.28) * s, oy + q.r * s, s * 0.05, s);
	}
	c.restore();
}
