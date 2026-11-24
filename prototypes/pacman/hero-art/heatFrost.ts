// Throwaway: "Heat and Frost", a complementary pair of heroes in the game's cel language (the
// owner liked Gemini's pair; this is its rework, drawn in code). Mirrored traits on the same
// places: Heat (Pac-Man) a dark-hot magma body with glowing cracks, a flame crest, an amber eye
// with a bold brow; Frost (Ms. Pac-Man) a light ice body with frost etching, a rowan bow, an
// ice-blue eye with lashes. Rage: a flame crown / an ice-spike crown round the back of the
// head. Trail: embers rising / snowflakes falling. Light from the top left, ink outlines.

type C = CanvasRenderingContext2D;
export type Elem = 'heat' | 'frost';

const LX = -0.55;
const LY = -0.83;

interface Pal {
	shadow: string;
	mid: string;
	light: string;
	ink: string;
	glint: string;
}
const HEAT: Pal = { shadow: '#6e1a10', mid: '#d2461c', light: '#ffa531', ink: '#2a0b05', glint: '#fff1c4' };
const HEAT_RAGE: Pal = { shadow: '#a3260f', mid: '#f0661c', light: '#ffd24a', ink: '#2a0b05', glint: '#ffffff' };
const FROST: Pal = { shadow: '#86b9e6', mid: '#d6edfc', light: '#ffffff', ink: '#163a5f', glint: '#ffffff' };
const FROST_RAGE: Pal = { shadow: '#5d9fe0', mid: '#bfe3fb', light: '#f4fcff', ink: '#163a5f', glint: '#ffffff' };

function rnd(seed: number): () => number {
	let s = seed >>> 0 || 1;
	return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

/** The body's outline: a disc with the mouth cut at +x (local frame). */
function pac(c: C, R: number, open: number): void {
	const a = open;
	c.beginPath();
	c.moveTo(-R * 0.08, 0);
	c.arc(0, 0, R, a, Math.PI * 2 - a);
	c.closePath();
}

/** Cel bands inside the clip: shadow, mid pushed to the light, light pushed further. */
function bands(c: C, R: number, p: Pal, lx: number, ly: number): void {
	c.fillStyle = p.shadow;
	c.fillRect(-R * 2, -R * 2, R * 4, R * 4);
	c.fillStyle = p.mid;
	c.beginPath();
	c.arc(lx * R * 0.16, ly * R * 0.16, R * 0.97, 0, Math.PI * 2);
	c.fill();
	c.fillStyle = p.light;
	c.beginPath();
	c.arc(lx * R * 0.42, ly * R * 0.42, R * 0.6, 0, Math.PI * 2);
	c.fill();
}

/** A flame tongue from (x, y) along `dir`, length `len`, curling by `curl`. */
function tongue(c: C, x: number, y: number, dir: number, len: number, w: number, curl: number, fill: string, ink: string | null, lw: number): void {
	const ux = Math.cos(dir);
	const uy = Math.sin(dir);
	const px = -uy;
	const py = ux;
	const tx = x + ux * len + px * curl;
	const ty = y + uy * len + py * curl;
	c.beginPath();
	c.moveTo(x - px * w, y - py * w);
	c.quadraticCurveTo(x + ux * len * 0.55 - px * w * 0.9 + px * curl * 0.2, y + uy * len * 0.55 - py * w * 0.9 + py * curl * 0.2, tx, ty);
	c.quadraticCurveTo(x + ux * len * 0.5 + px * w * 1.1 + px * curl * 0.6, y + uy * len * 0.5 + py * w * 1.1 + py * curl * 0.6, x + px * w, y + py * w);
	c.closePath();
	c.fillStyle = fill;
	c.fill();
	if (ink) {
		c.strokeStyle = ink;
		c.lineWidth = lw;
		c.lineJoin = 'round';
		c.stroke();
	}
}

/** A crystal spike from (x, y) along `dir`. */
function spike(c: C, x: number, y: number, dir: number, len: number, w: number, p: Pal, lw: number): void {
	const ux = Math.cos(dir);
	const uy = Math.sin(dir);
	const px = -uy;
	const py = ux;
	const pts: Array<[number, number]> = [
		[x - px * w, y - py * w],
		[x + ux * len * 0.72 - px * w * 0.8, y + uy * len * 0.72 - py * w * 0.8],
		[x + ux * len, y + uy * len],
		[x + ux * len * 0.72 + px * w * 0.8, y + uy * len * 0.72 + py * w * 0.8],
		[x + px * w, y + py * w]
	];
	c.beginPath();
	pts.forEach(([a, b], i) => (i ? c.lineTo(a, b) : c.moveTo(a, b)));
	c.closePath();
	c.fillStyle = p.mid;
	c.fill();
	// the lit facet
	c.beginPath();
	c.moveTo(pts[0][0], pts[0][1]);
	c.lineTo(pts[1][0], pts[1][1]);
	c.lineTo(pts[2][0], pts[2][1]);
	c.lineTo(x, y);
	c.closePath();
	c.fillStyle = p.light;
	c.fill();
	c.beginPath();
	pts.forEach(([a, b], i) => (i ? c.lineTo(a, b) : c.moveTo(a, b)));
	c.closePath();
	c.strokeStyle = p.ink;
	c.lineWidth = lw;
	c.lineJoin = 'round';
	c.stroke();
}

function eye(c: C, R: number, elem: Elem, rage: boolean, ink: string): void {
	const ex = R * 0.2;
	const ey = -R * 0.43;
	const w = R * 0.25;
	const h = R * 0.3;
	c.save();
	c.translate(ex, ey);
	// sclera
	c.beginPath();
	c.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
	c.fillStyle = '#ffffff';
	c.fill();
	c.save();
	c.clip();
	c.fillStyle = elem === 'heat' ? (rage ? '#ffcf2a' : '#ff9b1a') : '#3aa2ff';
	c.beginPath();
	c.ellipse(w * 0.28, h * 0.12, w * 0.68, h * 0.72, 0, 0, Math.PI * 2);
	c.fill();
	c.fillStyle = elem === 'heat' ? '#3a0c04' : '#0d2a52';
	c.beginPath();
	c.ellipse(w * 0.36, h * 0.16, w * 0.34, h * 0.42, 0, 0, Math.PI * 2);
	c.fill();
	c.fillStyle = '#ffffff';
	c.beginPath();
	c.arc(w * 0.12, -h * 0.22, w * 0.24, 0, Math.PI * 2);
	c.fill();
	// the upper lid's shade
	c.fillStyle = 'rgba(0,0,0,.18)';
	c.fillRect(-w * 2, -h * 2, w * 4, h * 1.35);
	c.restore();
	c.beginPath();
	c.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
	c.strokeStyle = ink;
	c.lineWidth = R * 0.07;
	c.stroke();
	c.lineCap = 'round';
	if (elem === 'heat') {
		// a bold brow, low toward the front: determined (lower still in the rage)
		c.lineWidth = R * 0.13;
		c.beginPath();
		c.moveTo(-w * 1.15, -h * (rage ? 1.15 : 1.3));
		c.lineTo(w * 1.2, -h * (rage ? 0.62 : 0.82));
		c.stroke();
	} else {
		// lashes at the outer corner
		c.lineWidth = R * 0.055;
		for (let i = 0; i < 3; i++) {
			const a = -2.3 + i * 0.32;
			c.beginPath();
			c.moveTo(Math.cos(a) * w * 0.95, Math.sin(a) * h * 0.95);
			c.lineTo(Math.cos(a) * w * 1.55 - w * 0.15, Math.sin(a) * h * 1.45);
			c.stroke();
		}
	}
	c.restore();
}

/** The flame crest on the crown (Heat): three tongues licking back. */
function crest(c: C, R: number, t: number, rage: boolean, ink: string): void {
	const lw = R * 0.08;
	const base = [
		{ a: -1.95, len: 0.62, w: 0.2 },
		{ a: -2.3, len: 0.5, w: 0.17 },
		{ a: -1.62, len: 0.42, w: 0.15 }
	];
	for (const [i, f] of base.entries()) {
		const k = rage ? 1.25 : 1;
		const fl = Math.sin(t * 11 + i * 2.1) * R * 0.07;
		const x = Math.cos(f.a) * R * 0.86;
		const y = Math.sin(f.a) * R * 0.86;
		const dir = f.a - 0.55;
		tongue(c, x, y, dir, R * f.len * k, R * f.w, -R * 0.18 + fl, rage ? '#ff7a1c' : '#e2521e', ink, lw);
		tongue(c, x, y, dir, R * f.len * k * 0.62, R * f.w * 0.55, -R * 0.1 + fl * 0.6, '#ffc93c', null, 0);
		tongue(c, x, y, dir, R * f.len * k * 0.3, R * f.w * 0.3, fl * 0.3, '#fff3c0', null, 0);
	}
}

/** The rowan bow on the crown (Frost): two loops, a knot of three berries. */
function bow(c: C, R: number, ink: string): void {
	c.save();
	c.translate(-R * 0.3, -R * 0.86);
	c.rotate(-0.35);
	const loop = (s: number) => {
		c.beginPath();
		c.moveTo(0, 0);
		c.bezierCurveTo(s * R * 0.25, -R * 0.42, s * R * 0.62, -R * 0.3, s * R * 0.6, 0);
		c.bezierCurveTo(s * R * 0.62, R * 0.28, s * R * 0.25, R * 0.3, 0, 0);
		c.closePath();
	};
	for (const s of [-1, 1]) {
		loop(s);
		c.fillStyle = '#c71f37';
		c.fill();
		c.save();
		loop(s);
		c.clip();
		c.fillStyle = '#ff5b6e';
		c.beginPath();
		c.ellipse(s * R * 0.28, -R * 0.12, R * 0.22, R * 0.1, 0, 0, Math.PI * 2);
		c.fill();
		c.fillStyle = '#8e1226';
		c.fillRect(-R, R * 0.08, R * 2, R);
		c.restore();
		loop(s);
		c.strokeStyle = ink;
		c.lineWidth = R * 0.075;
		c.lineJoin = 'round';
		c.stroke();
	}
	for (const [bx, by] of [
		[-R * 0.08, -R * 0.02],
		[R * 0.09, -R * 0.04],
		[0, R * 0.12]
	]) {
		c.beginPath();
		c.arc(bx, by, R * 0.1, 0, Math.PI * 2);
		c.fillStyle = '#e0283f';
		c.fill();
		c.strokeStyle = ink;
		c.lineWidth = R * 0.05;
		c.stroke();
		c.fillStyle = '#ffffff';
		c.beginPath();
		c.arc(bx - R * 0.03, by - R * 0.03, R * 0.028, 0, Math.PI * 2);
		c.fill();
	}
	c.restore();
}

/** Lava veins (Heat) or frost etching (Frost) on the shadow side of the body. */
function markings(c: C, R: number, elem: Elem, rage: boolean, t: number): void {
	const r = rnd(elem === 'heat' ? 7 : 3);
	c.lineCap = 'round';
	c.lineJoin = 'round';
	if (elem === 'heat') {
		const glow = rage ? 1 : 0.75 + 0.25 * Math.sin(t * 4);
		for (let i = 0; i < 3; i++) {
			let a = 1.5 + i * 0.95 + r() * 0.3;
			let x = Math.cos(a) * R * 1.05;
			let y = Math.sin(a) * R * 1.05;
			c.beginPath();
			c.moveTo(x, y);
			for (let k = 0; k < 4; k++) {
				const turn = (k % 2 ? 1 : -1) * (0.5 + r() * 0.5);
				x -= Math.cos(a + turn) * R * (0.13 + r() * 0.08);
				y -= Math.sin(a + turn) * R * (0.13 + r() * 0.08);
				c.lineTo(x, y);
				if (k === 1) {
					// a short branch
					c.lineTo(x + Math.cos(a + 1.4) * R * 0.12, y + Math.sin(a + 1.4) * R * 0.12);
					c.moveTo(x, y);
				}
			}
			c.strokeStyle = `rgba(255,${rage ? 225 : 170},70,${glow})`;
			c.lineWidth = R * (rage ? 0.085 : 0.06);
			c.stroke();
			c.strokeStyle = `rgba(255,250,210,${glow * 0.85})`;
			c.lineWidth = R * 0.025;
			c.stroke();
		}
	} else {
		c.strokeStyle = rage ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.75)';
		c.lineWidth = R * 0.045;
		for (let i = 0; i < 2; i++) {
			const cx = Math.cos(1.6 + i * 1.3) * R * 0.62;
			const cy = Math.sin(1.6 + i * 1.3) * R * 0.62;
			const s = R * (0.24 - i * 0.05);
			for (let k = 0; k < 3; k++) {
				const a = (k * Math.PI) / 3 + 0.2;
				c.beginPath();
				c.moveTo(cx - Math.cos(a) * s, cy - Math.sin(a) * s);
				c.lineTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s);
				c.stroke();
			}
		}
	}
}

function mouthInside(c: C, R: number, open: number, elem: Elem, ink: string): void {
	if (open < 0.05) return;
	c.save();
	pac(c, R * 1.001, 0);
	c.beginPath();
	c.moveTo(-R * 0.08, 0);
	c.arc(0, 0, R * 0.98, -open, open);
	c.closePath();
	c.clip();
	if (elem === 'heat') {
		c.fillStyle = '#3d0a05';
		c.fillRect(-R, -R, R * 2, R * 2);
		const g = c.createRadialGradient(R * 0.05, 0, 0, R * 0.05, 0, R * 0.55);
		g.addColorStop(0, 'rgba(255,200,80,1)');
		g.addColorStop(1, 'rgba(255,90,20,0)');
		c.fillStyle = g;
		c.fillRect(-R, -R, R * 2, R * 2);
	} else {
		c.fillStyle = '#132c55';
		c.fillRect(-R, -R, R * 2, R * 2);
		// a soft tongue at the back
		c.fillStyle = '#5a86c8';
		c.beginPath();
		c.ellipse(R * 0.15, 0, R * 0.28, R * 0.13, 0, 0, Math.PI * 2);
		c.fill();
	}
	c.restore();
	void ink;
}

/** The crown of the rage round the back of the head. */
function crown(c: C, R: number, elem: Elem, t: number, p: Pal): void {
	const n = 7;
	for (let i = 0; i < n; i++) {
		const a = Math.PI * 0.55 + (i / (n - 1)) * Math.PI * 0.9;
		const x = Math.cos(a) * R * 0.9;
		const y = Math.sin(a) * R * 0.9;
		const mid = 1 - Math.abs(i - (n - 1) / 2) / ((n - 1) / 2);
		if (elem === 'heat') {
			const fl = Math.sin(t * 12 + i * 1.7) * R * 0.08;
			const len = R * (0.45 + 0.4 * mid) + fl;
			tongue(c, x, y, a, len, R * 0.2, -R * 0.12 + fl, '#ff6a1c', p.ink, R * 0.07);
			tongue(c, x, y, a, len * 0.6, R * 0.11, -R * 0.06 + fl * 0.5, '#ffd24a', null, 0);
		} else {
			spike(c, x, y, a, R * (0.42 + 0.38 * mid), R * 0.13, FROST_RAGE, R * 0.06);
		}
	}
}

/** What the hero leaves behind on the run: embers rising (Heat) or flakes falling (Frost). */
export function drawTrail(c: C, x: number, y: number, R: number, angle: number, elem: Elem, t: number): void {
	const bx = -Math.cos(angle);
	const by = -Math.sin(angle);
	const r = rnd(elem === 'heat' ? 5 : 9);
	for (let i = 0; i < 9; i++) {
		const d = R * (1.1 + i * 0.42);
		const u = i / 9;
		const side = (r() - 0.5) * R * 0.9;
		const drift = elem === 'heat' ? -R * (0.2 + u * 0.9) : R * (0.15 + u * 0.7);
		const px = x + bx * d + -by * side;
		const py = y + by * d + bx * side + drift;
		const a = 1 - u;
		const s = R * (0.2 - u * 0.1) * (0.7 + r() * 0.6);
		c.globalAlpha = a;
		if (elem === 'heat') {
			c.fillStyle = i % 3 === 0 ? '#fff0b0' : i % 3 === 1 ? '#ffb02a' : '#ff6a1c';
			c.beginPath();
			c.moveTo(px, py - s * 1.4);
			c.quadraticCurveTo(px + s, py, px, py + s);
			c.quadraticCurveTo(px - s, py, px, py - s * 1.4);
			c.fill();
		} else {
			c.strokeStyle = i % 2 ? '#ffffff' : '#bfe3fb';
			c.lineWidth = Math.max(1, s * 0.35);
			c.lineCap = 'round';
			for (let k = 0; k < 3; k++) {
				const aa = (k * Math.PI) / 3 + t * 0.6 + i;
				c.beginPath();
				c.moveTo(px - Math.cos(aa) * s, py - Math.sin(aa) * s);
				c.lineTo(px + Math.cos(aa) * s, py + Math.sin(aa) * s);
				c.stroke();
			}
		}
	}
	c.globalAlpha = 1;
}

/** One hero: body radius R at (x, y), heading `angle`, mouth half-angle `open` (radians). */
export function drawHero(c: C, x: number, y: number, R: number, angle: number, open: number, elem: Elem, rage: boolean, t: number): void {
	const p = elem === 'heat' ? (rage ? HEAT_RAGE : HEAT) : rage ? FROST_RAGE : FROST;
	c.save();
	c.translate(x, y);
	c.rotate(angle);
	// heading left: mirror so the crown stays up
	const flip = Math.cos(angle) < -0.01;
	if (flip) c.scale(1, -1);
	// the light in the local frame
	const la = Math.atan2(LY, LX) - angle;
	const lx = Math.cos(la);
	const ly = Math.sin(la) * (flip ? -1 : 1);
	// a soft warm/cold glow under the body
	const glow = c.createRadialGradient(0, 0, R * 0.6, 0, 0, R * 1.7);
	glow.addColorStop(0, elem === 'heat' ? 'rgba(255,120,30,.35)' : 'rgba(150,210,255,.3)');
	glow.addColorStop(1, 'rgba(0,0,0,0)');
	c.fillStyle = glow;
	c.fillRect(-R * 2, -R * 2, R * 4, R * 4);
	if (rage) crown(c, R, elem, t, p);
	if (elem === 'heat') crest(c, R, t, rage, p.ink);
	pac(c, R, open);
	c.save();
	c.clip();
	bands(c, R, p, lx, ly);
	markings(c, R, elem, rage, t);
	c.fillStyle = p.glint;
	c.beginPath();
	c.ellipse(lx * R * 0.55, ly * R * 0.55, R * 0.22, R * 0.12, Math.atan2(ly, lx) + Math.PI / 2, 0, Math.PI * 2);
	c.fill();
	c.restore();
	mouthInside(c, R, open, elem, p.ink);
	pac(c, R, open);
	c.strokeStyle = p.ink;
	c.lineWidth = R * 0.11;
	c.lineJoin = 'round';
	c.stroke();
	if (elem === 'frost') bow(c, R, p.ink);
	eye(c, R, elem, rage, p.ink);
	c.restore();
}
