// The station's actors, style B (brutal and frightening, the owner's alternative to style A's
// toy-like look): no fat ink outline and no candy colours. The food is the nest's spores, the
// ghosts are wraiths of the drowned crew with hollow sockets and open mouths, the cocoon is a
// husk with a face pressed against it from inside, the hunter a gaunt hooded thing with a split
// jaw, long arms and a whip of a tail, lit by hard rim light. Same signatures as style A.
import type { Blip, GhostId, HunterLook } from './stationActors';
import { GHOSTS, rgba, TRACKER } from './stationActors';

const TAU = Math.PI * 2;

function glow(c: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, a: number): void {
	const g = c.createRadialGradient(x, y, 0, x, y, r);
	g.addColorStop(0, rgba(color, a));
	g.addColorStop(0.35, rgba(color, a * 0.3));
	g.addColorStop(1, rgba(color, 0));
	c.fillStyle = g;
	c.fillRect(x - r, y - r, r * 2, r * 2);
}

// sprites cached by size: the food is drawn hundreds of times a frame
const sporeCache = new Map<number, HTMLCanvasElement>();
function sporeSprite(S: number, variant: number): HTMLCanvasElement {
	const key = Math.round(S * 4) * 8 + variant;
	const hit = sporeCache.get(key);
	if (hit) return hit;
	const D = 2;
	const size = Math.ceil(S * 0.8 * D);
	const cv = document.createElement('canvas');
	cv.width = size;
	cv.height = size;
	const c = cv.getContext('2d') as CanvasRenderingContext2D;
	c.scale(D, D);
	const m = size / D / 2;
	c.globalCompositeOperation = 'lighter';
	glow(c, m, m, S * 0.32, '#b8e07a', 0.26);
	c.globalCompositeOperation = 'source-over';
	const specks: Array<[number, number, number]> = [
		[0, 0, 0.055],
		[0.08, -0.05, 0.03],
		[-0.06, 0.06, 0.035],
		[0.05, 0.07, 0.022]
	];
	const rot = variant * 1.3;
	for (const [dx, dy, r] of specks) {
		const x = m + (Math.cos(rot) * dx - Math.sin(rot) * dy) * S;
		const y = m + (Math.sin(rot) * dx + Math.cos(rot) * dy) * S;
		const g = c.createRadialGradient(x - r * S * 0.3, y - r * S * 0.3, 0, x, y, r * S);
		g.addColorStop(0, '#f4ffe0');
		g.addColorStop(0.6, '#b9d98a');
		g.addColorStop(1, 'rgba(90,120,60,.6)');
		c.fillStyle = g;
		c.beginPath();
		c.arc(x, y, r * S, 0, TAU);
		c.fill();
	}
	sporeCache.set(key, cv);
	return cv;
}

/** The food: a little cluster of the nest's spores, glowing faintly. */
export function drawCell(c: CanvasRenderingContext2D, x: number, y: number, S: number, t: number, seed: number): void {
	const sp = sporeSprite(S, Math.floor(seed * 7.99));
	const w = sp.width / 2;
	c.globalAlpha = 0.8 + 0.2 * Math.sin(t * 1.7 + seed * 9);
	c.drawImage(sp, x - w / 2, y - w / 2, w, w);
	c.globalAlpha = 1;
}

/** A flare: a thin, worn stick; lit, a harsh red burn with heavy smoke. */
export function drawFlare(c: CanvasRenderingContext2D, x: number, y: number, S: number, t: number, lit: boolean): void {
	const a = -0.5;
	const L = S * 0.48;
	const R = S * 0.055;
	c.save();
	c.translate(x, y);
	if (!lit) {
		c.globalCompositeOperation = 'lighter';
		glow(c, L * 0.4 * Math.cos(a), L * 0.4 * Math.sin(a), S * 0.3, '#ff2a1a', 0.18 + 0.12 * Math.max(0, Math.sin(t * 4)));
		c.globalCompositeOperation = 'source-over';
	}
	c.rotate(a);
	c.fillStyle = 'rgba(0,0,0,.6)';
	c.fillRect(-L / 2 + 2, -R + 2, L, R * 2);
	const g = c.createLinearGradient(0, -R, 0, R);
	g.addColorStop(0, '#9a3a30');
	g.addColorStop(0.5, '#6e1712');
	g.addColorStop(1, '#2a0807');
	c.fillStyle = g;
	c.beginPath();
	c.roundRect(-L / 2, -R, L, R * 2, R * 0.6);
	c.fill();
	c.fillStyle = 'rgba(200,190,170,.5)';
	c.fillRect(-L * 0.12, -R, L * 0.08, R * 2);
	c.fillStyle = '#25282a';
	c.fillRect(-L / 2, -R, L * 0.16, R * 2);
	c.fillStyle = 'rgba(255,255,255,.18)';
	c.fillRect(-L / 2, -R * 0.7, L, R * 0.3);
	if (lit) {
		const tip = L / 2;
		const fl = 0.8 + 0.2 * Math.sin(t * 41) * Math.sin(t * 27);
		c.globalCompositeOperation = 'lighter';
		glow(c, tip, 0, S * 1.6 * fl, '#ff1a0a', 0.5);
		glow(c, tip, 0, S * 0.35 * fl, '#ffd2c0', 0.95);
		for (let i = 0; i < 18; i += 1) {
			const ph = (t * 2.2 + i * 0.137) % 1;
			const ang = i * 2.39 + Math.floor(t * 2.2 + i * 0.137) * 1.7;
			const d = ph * S * 0.75;
			c.fillStyle = `rgba(255,${180 + (i % 3) * 25},${120 + (i % 2) * 50},${(1 - ph) * 0.9})`;
			c.fillRect(tip + Math.cos(ang) * d, Math.sin(ang) * d - ph * ph * S * 0.2, S * 0.02, S * 0.02);
		}
	}
	c.restore();
	if (lit) {
		const tx = x + Math.cos(a) * L * 0.5;
		const ty = y + Math.sin(a) * L * 0.5;
		for (let i = 0; i < 10; i += 1) {
			const ph = (t * 0.3 + i / 10) % 1;
			const sx = tx + Math.sin(t * 0.6 + i) * S * 0.3 * ph + ph * S * 0.8;
			const sy = ty - ph * S * 1.2;
			const sr = S * (0.15 + ph * 0.7);
			const g2 = c.createRadialGradient(sx, sy, 0, sx, sy, sr);
			g2.addColorStop(0, `rgba(120,40,40,${0.28 * (1 - ph)})`);
			g2.addColorStop(1, 'rgba(40,10,10,0)');
			c.fillStyle = g2;
			c.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
		}
	}
}

// ---------------------------------------------------------------------------------------------
// The ghosts: wraiths of the crew

export function drawGhost(c: CanvasRenderingContext2D, x: number, y: number, S: number, id: GhostId, look: number, t: number, alpha = 1): void {
	const col = GHOSTS[id];
	const u = S;
	const drift = Math.sin(t * 1.6 + x * 0.013) * u * 0.04;
	// a glitch: now and then the wraith slips sideways in slices
	const glitch = Math.sin(t * 7.1 + x) * Math.sin(t * 3.3) > 0.82;
	c.save();
	c.translate(x, y + drift);
	c.globalAlpha = alpha;
	c.globalCompositeOperation = 'lighter';
	glow(c, 0, u * 0.05, u * 0.9, col, 0.16);
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
			c.quadraticCurveTo(x0 + Math.sin(t * 2.4 + i) * u * 0.06, len, x1, u * 0.08 + (i % 2) * u * 0.04);
		}
		c.closePath();
	};
	const slices = glitch ? 3 : 1;
	for (let s = 0; s < slices; s += 1) {
		c.save();
		if (glitch) {
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
			c.fillRect(fx + sd * u * 0.1 - u * 0.012, fy - u * 0.16, u * 0.024, u * (0.12 + 0.04 * Math.sin(t + sd)));
			c.fillStyle = 'rgba(4,6,8,.92)';
		}
		c.beginPath();
		c.ellipse(fx, fy - u * 0.02, u * 0.06, u * (0.11 + 0.02 * Math.sin(t * 2.3)), 0, 0, TAU);
		c.fill();
		// a pinpoint of its colour deep in each socket, toward where it goes
		c.globalCompositeOperation = 'lighter';
		for (const sd of [-1, 1]) {
			glow(c, fx * 1.6 + sd * u * 0.1, fy * 1.6 - u * 0.22, u * 0.07, col, 0.9);
		}
		c.globalCompositeOperation = 'source-over';
		c.restore();
	}
	c.restore();
}

// ---------------------------------------------------------------------------------------------
// The cocoon: a husk, and the ghost's face pressed against it from inside

export function drawCocoon(c: CanvasRenderingContext2D, x: number, y: number, S: number, id: GhostId, t: number): void {
	const col = GHOSTS[id];
	const u = S;
	const beat = Math.pow(Math.max(0, Math.sin(t * 3.2)), 8);
	c.save();
	c.translate(x, y);
	// roots of resin fused into the deck
	c.lineCap = 'round';
	for (let i = 0; i < 12; i += 1) {
		const a = (i / 12) * TAU + 0.2;
		const l = u * (0.5 + (i % 4) * 0.12);
		c.strokeStyle = 'rgba(0,0,0,.7)';
		c.lineWidth = u * 0.07;
		c.beginPath();
		c.moveTo(0, 0);
		c.quadraticCurveTo(Math.cos(a + 0.5) * l * 0.5, Math.sin(a + 0.5) * l * 0.5, Math.cos(a) * l, Math.sin(a) * l);
		c.stroke();
		c.strokeStyle = '#1d2016';
		c.lineWidth = u * 0.045;
		c.stroke();
		c.strokeStyle = 'rgba(180,190,150,.25)';
		c.lineWidth = u * 0.01;
		c.stroke();
	}
	const w = u * 0.36 * (1 + beat * 0.04);
	const h = u * 0.52;
	c.fillStyle = 'rgba(0,0,0,.65)';
	c.beginPath();
	c.ellipse(u * 0.05, u * 0.07, w * 1.08, h * 1.05, 0, 0, TAU);
	c.fill();
	const g = c.createRadialGradient(-w * 0.3, -h * 0.35, 0, 0, 0, h * 1.1);
	g.addColorStop(0, '#5c5a44');
	g.addColorStop(0.5, '#2b2a1e');
	g.addColorStop(1, '#0c0c08');
	c.fillStyle = g;
	c.beginPath();
	c.ellipse(0, 0, w, h, 0, 0, TAU);
	c.fill();
	c.save();
	c.beginPath();
	c.ellipse(0, 0, w, h, 0, 0, TAU);
	c.clip();
	// the light of the ghost inside, beating
	c.globalCompositeOperation = 'lighter';
	glow(c, 0, -h * 0.15, h * 1.1, col, 0.22 + beat * 0.4);
	c.globalCompositeOperation = 'source-over';
	// its face pressed against the membrane: sockets and a mouth, stretched
	c.fillStyle = 'rgba(8,7,5,.75)';
	c.beginPath();
	c.ellipse(-w * 0.32, -h * 0.35, w * 0.16, h * 0.13, -0.2, 0, TAU);
	c.ellipse(w * 0.32, -h * 0.35, w * 0.16, h * 0.13, 0.2, 0, TAU);
	c.fill();
	c.beginPath();
	c.ellipse(0, -h * 0.02, w * 0.18, h * (0.2 + beat * 0.05), 0, 0, TAU);
	c.fill();
	// veins over it
	c.strokeStyle = 'rgba(50,20,16,.6)';
	c.lineWidth = u * 0.012;
	for (let i = 0; i < 8; i += 1) {
		c.beginPath();
		c.moveTo(-w + (i / 8) * w * 2, -h);
		c.bezierCurveTo(-w * 0.5 + i * w * 0.12, -h * 0.2, w * 0.4 - i * w * 0.1, h * 0.2, -w + ((i + 2) / 8) * w * 2, h);
		c.stroke();
	}
	// the membrane's wrinkles
	c.strokeStyle = 'rgba(0,0,0,.45)';
	c.lineWidth = u * 0.02;
	for (let i = 0; i < 6; i += 1) {
		const yy = -h * 0.8 + i * h * 0.32;
		c.beginPath();
		c.moveTo(-w, yy);
		c.quadraticCurveTo(0, yy + h * 0.1, w, yy);
		c.stroke();
	}
	c.restore();
	// wet highlight
	c.strokeStyle = 'rgba(230,235,200,.45)';
	c.lineWidth = u * 0.015;
	c.beginPath();
	c.ellipse(0, 0, w * 0.88, h * 0.9, 0, Math.PI * 1.1, Math.PI * 1.45);
	c.stroke();
	c.restore();
}

// ---------------------------------------------------------------------------------------------
// The hunter

const HC = {
	deep: '#030304',
	base: '#0d0f12',
	mid: '#1b1f25',
	plate: '#262b33',
	oil: '#6f8aa6',
	bone: '#b9ad94',
	drool: 'rgba(200,210,190,.55)'
} as const;

export function drawHunter(c: CanvasRenderingContext2D, x: number, y: number, S: number, id: GhostId, angle: number, t: number, look: HunterLook = {}): void {
	const col = GHOSTS[id];
	const u = S;
	const bite = look.bite ?? 0;
	const lit = look.lit ?? 0;
	const lx = Math.cos(angle);
	const face = lx >= 0 ? 1 : -1;
	const breathe = Math.sin(t * 2.1);
	const step = t * 7;
	c.save();
	c.translate(x, y - u * 0.12);
	c.lineCap = 'round';
	c.lineJoin = 'round';
	// a shadow on the deck
	c.fillStyle = 'rgba(0,0,0,.55)';
	c.beginPath();
	c.ellipse(0, u * 0.62, u * 0.45, u * 0.09, 0, 0, TAU);
	c.fill();

	const limb = (pts: Array<[number, number]>, w: number) => {
		for (const [ww, colr] of [
			[w + u * 0.03, HC.deep],
			[w, HC.mid],
			[w * 0.25, rgba(HC.oil, 0.25 + lit * 0.4)]
		] as const) {
			c.strokeStyle = colr;
			c.lineWidth = ww;
			c.beginPath();
			pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
			c.stroke();
		}
	};

	// the tail: a long whip curling out behind and over, its blade raised
	const tail: Array<[number, number]> = [];
	for (let i = 0; i <= 22; i += 1) {
		const k = i / 22;
		const a = Math.PI * 0.5 + k * Math.PI * 1.25 + Math.sin(t * 1.7 - k * 3) * 0.12;
		const r = u * (0.2 + k * 0.48);
		tail.push([-face * Math.cos(a) * r * 0.95 - face * u * 0.05, u * 0.3 - Math.sin(a) * r * 0.75 - k * u * 0.25]);
	}
	for (const [grow, colr] of [
		[u * 0.03, HC.deep],
		[0, HC.base]
	] as const) {
		c.strokeStyle = colr;
		for (let i = 1; i < tail.length; i += 1) {
			c.lineWidth = u * (0.075 - (i / tail.length) * 0.055) + grow;
			c.beginPath();
			c.moveTo(tail[i - 1][0], tail[i - 1][1]);
			c.lineTo(tail[i][0], tail[i][1]);
			c.stroke();
		}
	}
	for (let i = 2; i < tail.length; i += 2) {
		c.fillStyle = rgba(HC.oil, 0.25 + lit * 0.35);
		c.fillRect(tail[i][0] - u * 0.006, tail[i][1] - u * 0.012, u * 0.012, u * 0.012);
	}
	{
		const [ex, ey] = tail[tail.length - 1];
		const [px, py] = tail[tail.length - 4];
		c.save();
		c.translate(ex, ey);
		c.rotate(Math.atan2(ey - py, ex - px));
		c.fillStyle = HC.deep;
		c.beginPath();
		c.moveTo(-u * 0.04, -u * 0.035);
		c.lineTo(u * 0.22, 0);
		c.lineTo(-u * 0.04, u * 0.035);
		c.fill();
		c.fillStyle = HC.bone;
		c.beginPath();
		c.moveTo(-u * 0.02, -u * 0.02);
		c.lineTo(u * 0.19, 0);
		c.lineTo(-u * 0.02, u * 0.012);
		c.fill();
		c.restore();
	}

	// legs: bent the wrong way, thin, clawed
	for (const sd of [-1, 1]) {
		const ph = step + (sd > 0 ? Math.PI : 0);
		const lift = Math.max(0, Math.sin(ph)) * u * 0.05;
		const sw = Math.cos(ph) * u * 0.05;
		const hip: [number, number] = [sd * u * 0.1, u * 0.12];
		const knee: [number, number] = [sd * u * 0.24 + sw * 0.5, u * 0.28 - lift];
		const hock: [number, number] = [sd * u * 0.16 + sw, u * 0.45 - lift];
		const foot: [number, number] = [sd * u * 0.24 + sw, u * 0.6 - lift * 0.3];
		limb([hip, knee, hock, foot], u * 0.06);
		c.fillStyle = HC.bone;
		for (const k of [-1, 0, 1]) {
			c.beginPath();
			c.moveTo(foot[0], foot[1] - u * 0.01);
			c.lineTo(foot[0] + k * u * 0.05 + sd * u * 0.02, foot[1] + u * 0.05);
			c.lineTo(foot[0] + k * u * 0.01, foot[1]);
			c.fill();
		}
	}

	// the torso: a narrow, hunched thing of plates and ribs
	const torso = (grow: number) => {
		c.beginPath();
		c.moveTo(-u * 0.13 - grow, -u * 0.18);
		c.bezierCurveTo(-u * 0.2 - grow, -u * 0.02, -u * 0.14 - grow, u * 0.12, -u * 0.07, u * 0.18 + grow);
		c.lineTo(u * 0.07, u * 0.18 + grow);
		c.bezierCurveTo(u * 0.14 + grow, u * 0.12, u * 0.2 + grow, -u * 0.02, u * 0.13 + grow, -u * 0.18);
		c.closePath();
	};
	torso(u * 0.03);
	c.fillStyle = HC.deep;
	c.fill();
	torso(0);
	const tg = c.createLinearGradient(-u * 0.2, 0, u * 0.2, 0);
	tg.addColorStop(0, HC.plate);
	tg.addColorStop(0.5, HC.mid);
	tg.addColorStop(1, HC.base);
	c.fillStyle = tg;
	c.fill();
	// exposed ribs
	c.save();
	torso(0);
	c.clip();
	for (let i = 0; i < 5; i += 1) {
		const yy = -u * 0.12 + i * u * 0.06 + breathe * u * 0.004;
		c.strokeStyle = HC.deep;
		c.lineWidth = u * 0.024;
		c.beginPath();
		c.moveTo(-u * 0.2, yy + u * 0.03);
		c.quadraticCurveTo(0, yy - u * 0.03, u * 0.2, yy + u * 0.03);
		c.stroke();
		c.strokeStyle = rgba(HC.bone, 0.32 + lit * 0.25);
		c.lineWidth = u * 0.01;
		c.stroke();
	}
	c.fillStyle = HC.deep;
	c.fillRect(-u * 0.012, -u * 0.2, u * 0.024, u * 0.4);
	c.restore();

	// the arms: long, reaching ahead, three hooked fingers
	const reach = 0.5 + bite * 0.5;
	for (const sd of [-1, 1]) {
		const fw = sd === face ? 1 : 0.6;
		const sh: [number, number] = [sd * u * 0.15, -u * 0.15];
		const el: [number, number] = [sd * u * 0.32, u * 0.02 + Math.sin(t * 2 + sd) * u * 0.02];
		const wr: [number, number] = [sd * u * (0.26 + reach * 0.12 * fw) + lx * u * 0.06, u * (0.2 - reach * 0.1 * fw)];
		limb([sh, el, wr], u * 0.045);
		for (const k of [-1, 0, 1]) {
			const a = Math.PI / 2 + sd * 0.4 + k * 0.35;
			const f1: [number, number] = [wr[0] + Math.cos(a) * u * 0.08, wr[1] + Math.sin(a) * u * 0.08];
			const f2: [number, number] = [f1[0] + Math.cos(a - sd * 0.8) * u * 0.06, f1[1] + Math.sin(a - sd * 0.8) * u * 0.06];
			c.strokeStyle = HC.deep;
			c.lineWidth = u * 0.03;
			c.beginPath();
			c.moveTo(wr[0], wr[1]);
			c.lineTo(f1[0], f1[1]);
			c.lineTo(f2[0], f2[1]);
			c.stroke();
			c.strokeStyle = HC.bone;
			c.lineWidth = u * 0.012;
			c.beginPath();
			c.moveTo(f1[0], f1[1]);
			c.lineTo(f2[0], f2[1]);
			c.stroke();
		}
	}

	// the head: a wide flat hood (the ghost's dome, flattened and hardened), split by a jaw
	const hy = -u * 0.32 + breathe * u * 0.006;
	const hood = (grow: number) => {
		c.beginPath();
		c.moveTo(-u * 0.34 - grow, hy + u * 0.02);
		c.bezierCurveTo(-u * 0.3 - grow, hy - u * 0.2 - grow, u * 0.3 + grow, hy - u * 0.2 - grow, u * 0.34 + grow, hy + u * 0.02);
		c.bezierCurveTo(u * 0.22, hy + u * 0.06, u * 0.1, hy + u * 0.16 + grow, 0, hy + u * 0.22 + grow);
		c.bezierCurveTo(-u * 0.1, hy + u * 0.16 + grow, -u * 0.22, hy + u * 0.06, -u * 0.34 - grow, hy + u * 0.02);
		c.closePath();
	};
	// spines along the hood's rim
	for (let i = 0; i < 9; i += 1) {
		const k = i / 8;
		const bx = (-0.3 + k * 0.6) * u;
		const by = hy - u * (0.14 - Math.abs(k - 0.5) * 0.2);
		const a = -Math.PI / 2 + (k - 0.5) * 1.6;
		const len = u * (0.07 + (1 - Math.abs(k - 0.5) * 2) * 0.06);
		c.fillStyle = HC.deep;
		c.beginPath();
		c.moveTo(bx - u * 0.025, by);
		c.lineTo(bx + Math.cos(a) * len, by + Math.sin(a) * len);
		c.lineTo(bx + u * 0.025, by);
		c.fill();
		c.fillStyle = rgba(HC.bone, 0.7);
		c.beginPath();
		c.moveTo(bx - u * 0.01, by);
		c.lineTo(bx + Math.cos(a) * len * 0.9, by + Math.sin(a) * len * 0.9);
		c.lineTo(bx + u * 0.01, by);
		c.fill();
	}
	hood(u * 0.03);
	c.fillStyle = HC.deep;
	c.fill();
	hood(0);
	const hg = c.createRadialGradient(-u * 0.1, hy - u * 0.12, 0, 0, hy, u * 0.4);
	hg.addColorStop(0, '#3a4352');
	hg.addColorStop(0.5, HC.mid);
	hg.addColorStop(1, HC.deep);
	c.fillStyle = hg;
	c.fill();
	// the jaw: the hood splits down the middle, needle teeth on both sides, strands of drool
	const open = u * (0.012 + bite * 0.07 + Math.max(0, Math.sin(t * 1.3)) * 0.008);
	const jx = lx * u * 0.03;
	c.fillStyle = '#000';
	c.beginPath();
	c.moveTo(jx, hy - u * 0.02);
	c.quadraticCurveTo(jx - open * 1.4, hy + u * 0.1, jx, hy + u * 0.22);
	c.quadraticCurveTo(jx + open * 1.4, hy + u * 0.1, jx, hy - u * 0.02);
	c.fill();
	if (bite > 0.2) {
		c.save();
		c.globalCompositeOperation = 'lighter';
		glow(c, jx, hy + u * 0.1, u * 0.16, col, 0.4 * bite);
		c.restore();
	}
	c.fillStyle = HC.bone;
	for (let i = 0; i < 6; i += 1) {
		const yy = hy + u * (0.01 + i * 0.034);
		const w = open * (0.6 + Math.sin(((i + 0.5) / 6) * Math.PI) * 0.8);
		for (const sd of [-1, 1]) {
			c.beginPath();
			c.moveTo(jx + sd * w, yy - u * 0.008);
			c.lineTo(jx + sd * (w - u * 0.03), yy + u * 0.006);
			c.lineTo(jx + sd * w, yy + u * 0.012);
			c.fill();
		}
	}
	c.strokeStyle = HC.drool;
	c.lineWidth = Math.max(0.5, u * 0.006);
	for (const o of [-0.4, 0.3]) {
		const dl = u * (0.1 + 0.04 * Math.sin(t * 1.9 + o * 7));
		c.beginPath();
		c.moveTo(jx + o * open, hy + u * 0.16);
		c.quadraticCurveTo(jx + o * open * 2, hy + u * 0.16 + dl * 0.6, jx + o * open * 1.2, hy + u * 0.16 + dl);
		c.stroke();
	}
	// the sensor slit: one thin line of its colour across the hood, sliding where it looks
	const sx = lx * u * 0.06;
	c.fillStyle = '#000';
	c.beginPath();
	c.ellipse(sx, hy - u * 0.06, u * 0.2, u * 0.022, 0, 0, TAU);
	c.fill();
	c.globalCompositeOperation = 'lighter';
	c.fillStyle = rgba(col, 0.75 + lit * 0.25);
	c.beginPath();
	c.ellipse(sx + lx * u * 0.02, hy - u * 0.06, u * 0.15, u * 0.008, 0, 0, TAU);
	c.fill();
	glow(c, sx + lx * u * 0.04, hy - u * 0.06, u * 0.12, col, 0.35);
	c.globalCompositeOperation = 'source-over';
	// the hard rim light of wet chitin
	c.strokeStyle = rgba('#cfe0f2', 0.35 + lit * 0.5);
	c.lineWidth = Math.max(0.8, u * 0.012);
	c.beginPath();
	c.moveTo(-u * 0.26, hy - u * 0.1);
	c.bezierCurveTo(-u * 0.15, hy - u * 0.17, u * 0.05, hy - u * 0.18, u * 0.18, hy - u * 0.14);
	c.stroke();
	c.fillStyle = rgba('#e8f2ff', 0.4 + lit * 0.45);
	c.beginPath();
	c.ellipse(-u * 0.13, hy - u * 0.11, u * 0.06, u * 0.015, -0.25, 0, TAU);
	c.fill();
	c.restore();
}

export function drawHunterGlints(c: CanvasRenderingContext2D, x: number, y: number, S: number, id: GhostId, angle: number, a: number): void {
	const col = GHOSTS[id];
	const lx = Math.cos(angle);
	const hy = y - S * 0.12 - S * 0.32 - S * 0.06;
	c.save();
	c.globalCompositeOperation = 'lighter';
	c.fillStyle = rgba(col, 0.8 * a);
	c.beginPath();
	c.ellipse(x + lx * S * 0.08, hy, S * 0.15, S * 0.008 + 0.4, 0, 0, TAU);
	c.fill();
	glow(c, x + lx * S * 0.1, hy, S * 0.18, col, 0.4 * a);
	c.restore();
}

// ---------------------------------------------------------------------------------------------
// The way out and the reward, worn

export function drawHatch(c: CanvasRenderingContext2D, x: number, y: number, S: number, t: number, open: boolean): void {
	const R = S * 0.48;
	c.save();
	c.translate(x, y);
	c.fillStyle = '#020303';
	c.beginPath();
	c.arc(0, 0, R + S * 0.03, 0, TAU);
	c.fill();
	for (let i = 0; i < 20; i += 1) {
		c.fillStyle = i % 2 ? '#121413' : 'rgba(160,128,30,.8)';
		c.beginPath();
		c.arc(0, 0, R, (i / 20) * TAU, ((i + 1) / 20) * TAU);
		c.arc(0, 0, R * 0.8, ((i + 1) / 20) * TAU, (i / 20) * TAU, true);
		c.closePath();
		c.fill();
	}
	const ri = R * 0.78;
	if (!open) {
		const g = c.createRadialGradient(-ri * 0.3, -ri * 0.3, 0, 0, 0, ri);
		g.addColorStop(0, '#4d5551');
		g.addColorStop(1, '#141716');
		c.fillStyle = g;
		c.beginPath();
		c.arc(0, 0, ri, 0, TAU);
		c.fill();
		c.strokeStyle = '#020303';
		c.lineWidth = S * 0.05;
		c.beginPath();
		c.arc(0, 0, ri * 0.5, 0, TAU);
		c.stroke();
		c.strokeStyle = '#6a726e';
		c.lineWidth = S * 0.022;
		c.stroke();
	} else {
		const g = c.createRadialGradient(0, 0, 0, 0, 0, ri);
		g.addColorStop(0, '#e9ffe6');
		g.addColorStop(0.4, '#4fbf6a');
		g.addColorStop(1, '#03140a');
		c.fillStyle = g;
		c.beginPath();
		c.arc(0, 0, ri, 0, TAU);
		c.fill();
		c.strokeStyle = 'rgba(2,12,6,.8)';
		c.lineWidth = S * 0.025;
		for (let k = -2; k <= 2; k += 1) {
			c.beginPath();
			c.moveTo(-ri * 0.4, k * ri * 0.28);
			c.lineTo(ri * 0.4, k * ri * 0.28);
			c.stroke();
		}
		c.globalCompositeOperation = 'lighter';
		glow(c, 0, 0, S * 1.5, '#5dff8a', 0.32 + 0.1 * Math.sin(t * 3));
		c.globalCompositeOperation = 'source-over';
	}
	c.restore();
}

export function drawMedPod(c: CanvasRenderingContext2D, x: number, y: number, S: number, t: number): void {
	const R = S * 0.42;
	const beat = 1 + 0.07 * Math.pow(Math.max(0, Math.sin(t * 4.4)), 10);
	c.save();
	c.translate(x, y);
	c.globalCompositeOperation = 'lighter';
	glow(c, 0, 0, S * 0.9, '#ff2a3a', 0.22);
	c.globalCompositeOperation = 'source-over';
	c.fillStyle = '#020303';
	c.beginPath();
	c.arc(0, 0, R + S * 0.03, 0, TAU);
	c.fill();
	const rim = c.createLinearGradient(-R, -R, R, R);
	rim.addColorStop(0, '#6c7471');
	rim.addColorStop(1, '#1b1e1d');
	c.fillStyle = rim;
	c.beginPath();
	c.arc(0, 0, R, 0, TAU);
	c.fill();
	const gl = c.createRadialGradient(0, 0, 0, 0, 0, R * 0.8);
	gl.addColorStop(0, '#3a1a1c');
	gl.addColorStop(1, '#0a0506');
	c.fillStyle = gl;
	c.beginPath();
	c.arc(0, 0, R * 0.8, 0, TAU);
	c.fill();
	c.save();
	c.scale(beat, beat);
	const h = S * 0.2;
	c.beginPath();
	c.moveTo(0, h * 0.85);
	c.bezierCurveTo(-h * 1.15, h * 0.05, -h * 0.75, -h * 0.95, 0, -h * 0.35);
	c.bezierCurveTo(h * 0.75, -h * 0.95, h * 1.15, h * 0.05, 0, h * 0.85);
	const hg = c.createRadialGradient(-h * 0.3, -h * 0.3, 0, 0, 0, h * 1.1);
	hg.addColorStop(0, '#d8505c');
	hg.addColorStop(0.6, '#8c1422');
	hg.addColorStop(1, '#3a050c');
	c.fillStyle = hg;
	c.fill();
	c.strokeStyle = 'rgba(30,4,8,.8)';
	c.lineWidth = S * 0.012;
	c.stroke();
	c.restore();
	c.strokeStyle = 'rgba(220,230,225,.25)';
	c.lineWidth = S * 0.02;
	c.beginPath();
	c.arc(0, 0, R * 0.68, Math.PI * 1.1, Math.PI * 1.4);
	c.stroke();
	c.restore();
}

export function drawTracker(c: CanvasRenderingContext2D, hx: number, hy: number, S: number, t: number, blips: readonly Blip[]): void {
	const u = (t % TRACKER.period) / TRACKER.period;
	const rad = u * TRACKER.reach * S;
	const color = '#9dffbf';
	c.save();
	c.globalCompositeOperation = 'lighter';
	c.strokeStyle = rgba(color, (1 - u) * 0.22);
	c.lineWidth = Math.max(1, S * 0.025);
	c.beginPath();
	c.arc(hx, hy, rad, 0, TAU);
	c.stroke();
	for (const b of blips) {
		const d = Math.hypot(b.x, b.y);
		if (d > TRACKER.reach) continue;
		const passed = u - d / TRACKER.reach;
		if (passed < 0) continue;
		const k = Math.max(0, 1 - (passed * TRACKER.period) / 1.1);
		glow(c, hx + b.x * S, hy + b.y * S, S * 0.45, color, 0.45 * k);
		c.fillStyle = rgba('#efffef', k * 0.9);
		c.fillRect(hx + b.x * S - S * 0.05, hy + b.y * S - S * 0.05, S * 0.1, S * 0.1);
	}
	c.restore();
}
