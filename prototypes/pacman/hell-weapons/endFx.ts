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
 * The boss's death, `f` 0..1 over about 3 s. He swells and shakes while beams of light break out of
 * him and turn (0..0.4); he bursts: a white disc, two shock rings over three tiles, flesh flung far
 * with blood trails, his horns thrown high (0.4..0.7); blood rains back, the pool spreads with his
 * horns in it, embers rise from it (to the end; the pool stays).
 */
export function bossDeath(c: Ctx, x: number, y: number, S: number, f: number, t: number, drawBoss: (dx: number) => void): void {
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
		for (const [d, w] of [[3.2, 0.08], [2.2, 0.05]]) {
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
			const reach = S * (1.4 + 0.9 * ((i * 7) % 5) / 4);
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
			cel(c, () => { c.beginPath(); c.ellipse(0, 0, S * 0.09, S * 0.06, ang, 0, TAU); }, BLOOD, 0, 0, S * 0.09, S, 0.4);
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
function bloodPool(c: Ctx, x: number, y: number, S: number, pool: number, t: number, f: number): void {
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
 * Heart candidate 1, the reliquary: a red heart set in a white bone frame (a light disc with a dark
 * ink edge reads on the dark floor), gold rays behind it.
 */
export function heartReliquary(c: Ctx, x: number, y: number, S: number, t: number): void {
	const bob = floatAt(c, x, y, S, t);
	const beat = 1 + 0.12 * Math.max(0, Math.sin(t * 5)) ** 3;
	const cy = y - S * 0.06 + bob;
	bloom(c, x, cy, S * 1.2, '255,226,150', 0.6);
	c.save();
	c.strokeStyle = 'rgba(255,230,160,.8)';
	c.lineWidth = Math.max(1.2, S * 0.04);
	c.lineCap = 'round';
	for (let i = 0; i < 8; i += 1) {
		const a = (i * TAU) / 8 + t * 0.6;
		c.beginPath();
		c.moveTo(x + Math.cos(a) * S * 0.48, cy + Math.sin(a) * S * 0.48);
		c.lineTo(x + Math.cos(a) * S * 0.62, cy + Math.sin(a) * S * 0.62);
		c.stroke();
	}
	c.restore();
	cel(c, () => { c.beginPath(); c.arc(x, cy, S * 0.44, 0, TAU); }, { light: '#ffffff', mid: '#f0e4cc', shade: '#b09a78' }, x, cy, S * 0.44, S, 1.2);
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
 * Heart candidate 2, the white-hot heart: the heart itself burning gold-white at its heart and red at
 * its rim, a strong halo and a ring of flame round it.
 */
export function heartHot(c: Ctx, x: number, y: number, S: number, t: number): void {
	const bob = floatAt(c, x, y, S, t);
	const beat = 1 + 0.14 * Math.max(0, Math.sin(t * 5)) ** 3;
	const cy = y - S * 0.06 + bob;
	bloom(c, x, cy, S * 1.5, '255,200,120', 0.75);
	c.save();
	c.translate(x, cy);
	c.scale(beat, beat);
	heartPath(c, S, 1.05);
	c.fillStyle = radial(c, -S * 0.04, -S * 0.04, 0, S * 0.38, ['#fffbe8', '#ffd27a', '#ff6a2a', '#b0141a']);
	c.fill();
	heartPath(c, S, 1.05);
	ink(c, S, 1.2);
	c.restore();
	// a ring of small flames
	for (let i = 0; i < 10; i += 1) {
		const a = (i * TAU) / 10 + t * 1.2;
		const fx = x + Math.cos(a) * S * 0.5;
		const fy = cy + Math.sin(a) * S * 0.45;
		const h = S * (0.08 + 0.04 * Math.sin(t * 9 + i));
		c.fillStyle = 'rgba(255,170,70,.85)';
		c.beginPath();
		c.moveTo(fx - S * 0.03, fy);
		c.quadraticCurveTo(fx, fy - h * 1.6, fx + S * 0.03, fy);
		c.closePath();
		c.fill();
	}
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

/** The tar's inner box on a tile: it never leaves the tile and keeps a margin from its edge. */
function inner(q: Tile, ox: number, oy: number, s: number): [number, number, number] {
	const pad = s * 0.1;
	return [ox + q.c * s + pad, oy + q.r * s + pad, s - pad * 2];
}

/**
 * Tar candidate C, the slab: each tile its own square slab of glossy black tar, its corners softened
 * (not round), its edges sagging into two drips, a long sheen along its top.
 */
export function tarSlab(c: Ctx, tiles: readonly Tile[], ox: number, oy: number, s: number, t: number): void {
	for (const q of tiles) {
		const [x0, y0, w] = inner(q, ox, oy, s);
		const sag = s * 0.06;
		c.beginPath();
		c.moveTo(x0 + w * 0.12, y0);
		c.lineTo(x0 + w * 0.88, y0);
		c.lineTo(x0 + w, y0 + w * 0.12);
		c.lineTo(x0 + w, y0 + w * 0.82);
		c.lineTo(x0 + w * 0.78, y0 + w + sag);
		c.lineTo(x0 + w * 0.6, y0 + w);
		c.lineTo(x0 + w * 0.3, y0 + w + sag * 1.4);
		c.lineTo(x0 + w * 0.12, y0 + w);
		c.lineTo(x0, y0 + w * 0.86);
		c.lineTo(x0, y0 + w * 0.12);
		c.closePath();
		c.fillStyle = linear(c, 0, y0, 0, y0 + w, ['#2a1416', '#0a0405']);
		c.fill();
		ink(c, s, 0.6);
		c.fillStyle = 'rgba(255,230,220,.28)';
		c.fillRect(x0 + w * 0.16, y0 + w * 0.14, w * 0.5, Math.max(1, s * 0.04));
		// one slow bubble rising and bursting, its spot seeded per tile
		const u = (t * 0.4 + rand(q.c, q.r, 3)) % 1;
		c.strokeStyle = `rgba(160,120,120,${0.5 * (1 - u)})`;
		c.lineWidth = Math.max(1, s * 0.025);
		c.beginPath();
		c.arc(x0 + w * (0.3 + 0.4 * rand(q.c, q.r, 4)), y0 + w * (0.4 + 0.3 * rand(q.c, q.r, 5)), s * 0.05 * u, 0, TAU);
		c.stroke();
	}
}

/**
 * Tar candidate D, the splat: each tile an irregular star-shaped splat of black tar (seeded per tile,
 * so no two match), drips running out of its points, a sheen.
 */
export function tarSplat(c: Ctx, tiles: readonly Tile[], ox: number, oy: number, s: number, _t: number): void {
	for (const q of tiles) {
		const [x0, y0, w] = inner(q, ox, oy, s);
		const cx = x0 + w / 2;
		const cy = y0 + w / 2;
		c.beginPath();
		const N = 9;
		for (let i = 0; i <= N; i += 1) {
			const a = (i * TAU) / N + rand(q.c, q.r, 1);
			const r = w * (i % 2 ? 0.36 : 0.56) * (0.85 + 0.15 * rand(q.c, q.r, i + 2));
			const px = cx + Math.cos(a) * r;
			const py = cy + Math.sin(a) * r;
			if (i === 0) c.moveTo(px, py);
			else c.lineTo(px, py);
		}
		c.closePath();
		c.fillStyle = linear(c, 0, y0, 0, y0 + w, ['#2a1416', '#0a0405']);
		c.fill();
		ink(c, s, 0.5);
		c.fillStyle = 'rgba(255,230,220,.3)';
		c.beginPath();
		c.moveTo(cx - w * 0.2, cy - w * 0.12);
		c.lineTo(cx + w * 0.05, cy - w * 0.2);
		c.lineTo(cx - w * 0.12, cy - w * 0.08);
		c.closePath();
		c.fill();
	}
}

/**
 * Tar candidate E, the crust tile: each tile its own plate of dry black crust (square, softened
 * corners), its cracks glowing a dull ember that breathes.
 */
export function tarCrustTile(c: Ctx, tiles: readonly Tile[], ox: number, oy: number, s: number, t: number): void {
	const glow = 0.5 + 0.2 * Math.sin(t * 2);
	for (const q of tiles) {
		const [x0, y0, w] = inner(q, ox, oy, s);
		c.beginPath();
		c.roundRect(x0, y0, w, w, w * 0.14);
		c.fillStyle = '#1c0e0c';
		c.fill();
		ink(c, s, 0.6);
		c.save();
		c.beginPath();
		c.roundRect(x0, y0, w, w, w * 0.14);
		c.clip();
		for (const pass of [0, 1]) {
			c.strokeStyle = pass === 0 ? '#060202' : `rgba(255,110,40,${glow})`;
			c.lineWidth = pass === 0 ? Math.max(1.6, s * 0.06) : Math.max(0.8, s * 0.022);
			c.lineCap = 'round';
			c.lineJoin = 'round';
			const mx = x0 + w * (0.35 + 0.3 * rand(q.c, q.r, 1));
			const my = y0 + w * (0.35 + 0.3 * rand(q.c, q.r, 2));
			c.beginPath();
			for (const [ex, ey] of [[0, 0.2], [1, 0.3], [0.6, 1], [0.15, 0.9]]) {
				c.moveTo(mx, my);
				c.lineTo(x0 + w * (ex + (rand(q.c, q.r, ex * 7 + ey) - 0.5) * 0.2), y0 + w * ey);
			}
			c.stroke();
		}
		c.restore();
	}
}
