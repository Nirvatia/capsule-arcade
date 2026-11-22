// The station's actors and items (a mock-up for DESIGN.md §7a), painted in code at any tile size
// S (css px): the food (power cells), the flare, the four ghosts as pale spectres, the cocoon a
// ghost wraps itself in, the hunter it hatches as (grown out of the ghost: its dome is the
// carapace, its scalloped hem the rear plates, its colour a crescent of sensor pits on the
// leading edge), the escape hatch, the med pod with the heart, and the motion tracker's pulse.
// Same ink-outlined, cel-shaded language as the heroes and the hell's actors.

export const GHOSTS = {
	blinky: '#ff4b42',
	pinky: '#ff8fd6',
	inky: '#46e1ff',
	clyde: '#ffad42'
} as const;
export type GhostId = keyof typeof GHOSTS;

const INK = '#07080b';
const TAU = Math.PI * 2;

function rgb(hex: string): [number, number, number] {
	const n = parseInt(hex.slice(1), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgba(hex: string, a: number): string {
	const [r, g, b] = rgb(hex);
	return `rgba(${r},${g},${b},${a})`;
}

function glow(c: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, a: number): void {
	const g = c.createRadialGradient(x, y, 0, x, y, r);
	g.addColorStop(0, rgba(color, a));
	g.addColorStop(0.4, rgba(color, a * 0.35));
	g.addColorStop(1, rgba(color, 0));
	c.fillStyle = g;
	c.fillRect(x - r, y - r, r * 2, r * 2);
}

// ---------------------------------------------------------------------------------------------
// Food and pickups

/** A power cell: a small capsule with a glowing core, lying across the corridor. */
export function drawCell(c: CanvasRenderingContext2D, x: number, y: number, S: number, t: number, seed: number): void {
	const w = S * 0.2;
	const h = S * 0.11;
	const pulse = 0.8 + 0.2 * Math.sin(t * 2.4 + seed * 6);
	c.save();
	c.globalCompositeOperation = 'lighter';
	glow(c, x, y, S * 0.36, '#59e3ff', 0.32 * pulse);
	c.restore();
	c.save();
	c.translate(x, y);
	c.rotate(seed * 0.6 - 0.3);
	c.fillStyle = INK;
	c.beginPath();
	c.roundRect(-w / 2 - 1, -h / 2 - 1, w + 2, h + 2, h / 2 + 1);
	c.fill();
	c.fillStyle = '#8b97a2';
	c.beginPath();
	c.roundRect(-w / 2, -h / 2, w, h, h / 2);
	c.fill();
	const g = c.createLinearGradient(0, -h / 2, 0, h / 2);
	g.addColorStop(0, '#e9fdff');
	g.addColorStop(0.5, '#7fe9ff');
	g.addColorStop(1, '#1f9fc4');
	c.fillStyle = g;
	c.fillRect(-w * 0.28, -h / 2 + 0.6, w * 0.56, h - 1.2);
	c.restore();
}

/** A road flare: a red stick with a white cap; lit, a fierce pink-white tip with sparks and smoke. */
export function drawFlare(c: CanvasRenderingContext2D, x: number, y: number, S: number, t: number, lit: boolean): void {
	const a = -0.55;
	const L = S * 0.56;
	const R = S * 0.085;
	c.save();
	c.translate(x, y);
	if (!lit) {
		c.globalCompositeOperation = 'lighter';
		glow(c, 0, 0, S * 0.55, '#ff3b3b', 0.18 + 0.08 * Math.sin(t * 3));
		c.globalCompositeOperation = 'source-over';
	}
	c.rotate(a);
	c.fillStyle = 'rgba(0,0,0,.45)';
	c.beginPath();
	c.roundRect(-L / 2 + R * 0.6, -R + R * 0.8, L, R * 2, R);
	c.fill();
	c.fillStyle = INK;
	c.beginPath();
	c.roundRect(-L / 2 - 1.5, -R - 1.5, L + 3, R * 2 + 3, R + 1.5);
	c.fill();
	const g = c.createLinearGradient(0, -R, 0, R);
	g.addColorStop(0, '#ff8a7a');
	g.addColorStop(0.45, '#d8261f');
	g.addColorStop(1, '#7c0f12');
	c.fillStyle = g;
	c.beginPath();
	c.roundRect(-L / 2, -R, L, R * 2, R);
	c.fill();
	// label band and cap
	c.fillStyle = 'rgba(255,230,200,.85)';
	c.fillRect(-L * 0.08, -R, L * 0.16, R * 2);
	c.fillStyle = '#f1ece2';
	c.beginPath();
	c.roundRect(-L / 2, -R, L * 0.18, R * 2, R);
	c.fill();
	c.fillStyle = 'rgba(255,255,255,.55)';
	c.fillRect(-L / 2 + R, -R * 0.65, L - R * 2, R * 0.35);
	if (lit) {
		const tip = L / 2;
		const fl = 0.85 + 0.15 * Math.sin(t * 37) * Math.sin(t * 23);
		c.globalCompositeOperation = 'lighter';
		glow(c, tip, 0, S * 1.3 * fl, '#ff2d55', 0.55);
		glow(c, tip, 0, S * 0.45 * fl, '#ffd0dc', 0.9);
		c.fillStyle = '#fff6f8';
		c.beginPath();
		c.arc(tip, 0, R * 1.25 * fl, 0, TAU);
		c.fill();
		// sparks
		for (let i = 0; i < 14; i += 1) {
			const ph = (t * 1.8 + i * 0.137) % 1;
			const ang = i * 2.39 + Math.floor(t * 1.8 + i * 0.137) * 1.7;
			const d = ph * S * 0.6;
			c.fillStyle = `rgba(255,${200 + (i % 3) * 20},${170 + (i % 2) * 60},${(1 - ph) * 0.9})`;
			c.beginPath();
			c.arc(tip + Math.cos(ang) * d, Math.sin(ang) * d - ph * ph * S * 0.15, S * 0.018 * (1.4 - ph), 0, TAU);
			c.fill();
		}
	}
	c.restore();
	if (lit) {
		// smoke drifting off the tip (in world space, not rotated)
		const tx = x + Math.cos(a) * L * 0.5;
		const ty = y + Math.sin(a) * L * 0.5;
		for (let i = 0; i < 7; i += 1) {
			const ph = (t * 0.35 + i / 7) % 1;
			const sx = tx + Math.sin(t * 0.7 + i) * S * 0.2 * ph + ph * S * 0.5;
			const sy = ty - ph * S * 0.9;
			const sr = S * (0.12 + ph * 0.45);
			const g2 = c.createRadialGradient(sx, sy, 0, sx, sy, sr);
			g2.addColorStop(0, `rgba(255,150,170,${0.16 * (1 - ph)})`);
			g2.addColorStop(1, 'rgba(120,60,80,0)');
			c.fillStyle = g2;
			c.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
		}
	}
}

// ---------------------------------------------------------------------------------------------
// The ghosts: pale spectres of the crew, their colour a cold fire inside

export function drawGhost(
	c: CanvasRenderingContext2D,
	x: number,
	y: number,
	S: number,
	id: GhostId,
	look: number,
	t: number,
	alpha = 1
): void {
	const col = GHOSTS[id];
	const r = S * 0.4;
	const bob = Math.sin(t * 2.2 + x * 0.01) * S * 0.035;
	c.save();
	c.translate(x, y + bob);
	c.globalAlpha = alpha;
	// halo
	c.globalCompositeOperation = 'lighter';
	glow(c, 0, 0, S * 0.95, col, 0.22);
	glow(c, 0, 0, S * 0.55, '#d8f3ff', 0.18);
	c.globalCompositeOperation = 'source-over';
	const body = (grow: number) => {
		c.beginPath();
		c.moveTo(-r - grow, r * 0.15);
		c.arc(0, -r * 0.1, r + grow, Math.PI, 0);
		c.lineTo(r + grow, r * 0.62);
		// a torn, drifting hem
		const n = 4;
		for (let i = 0; i < n; i += 1) {
			const x0 = r + grow - ((i + 0.5) / n) * (2 * r + grow * 2);
			const x1 = r + grow - ((i + 1) / n) * (2 * r + grow * 2);
			const dip = r * (0.95 + 0.18 * Math.sin(t * 5 + i * 1.9)) + grow;
			c.quadraticCurveTo(x0 + r * 0.05, dip, x1, r * 0.62 + Math.sin(t * 4 + i) * r * 0.06);
		}
		c.closePath();
	};
	body(S * 0.035);
	c.fillStyle = rgba('#0a0e14', 0.7);
	c.fill();
	body(0);
	const g = c.createRadialGradient(-r * 0.3, -r * 0.45, r * 0.1, 0, 0, r * 1.25);
	g.addColorStop(0, 'rgba(244,252,255,.92)');
	g.addColorStop(0.55, rgba('#bcd6e6', 0.72));
	g.addColorStop(1, rgba(col, 0.55));
	c.fillStyle = g;
	c.fill();
	// the cold fire inside: the ghost's colour shows through its lower body
	c.save();
	c.clip();
	c.globalCompositeOperation = 'lighter';
	glow(c, 0, r * 0.55, r * 1.1, col, 0.45 + 0.15 * Math.sin(t * 3));
	c.restore();
	// cel shadow on the right side
	c.save();
	body(0);
	c.clip();
	c.fillStyle = 'rgba(30,50,80,.22)';
	c.beginPath();
	c.ellipse(r * 0.75, r * 0.2, r * 0.6, r * 1.2, 0, 0, TAU);
	c.fill();
	c.restore();
	// hollow eyes, pupils toward where it heads
	const ex = Math.cos(look) * r * 0.16;
	const ey = Math.sin(look) * r * 0.12;
	for (const s of [-1, 1]) {
		const cx = s * r * 0.36 + ex * 0.4;
		const cy = -r * 0.15 + ey * 0.4;
		c.fillStyle = '#0b0f16';
		c.beginPath();
		c.ellipse(cx, cy, r * 0.2, r * 0.27, s * 0.12, 0, TAU);
		c.fill();
		c.fillStyle = rgba(col, 0.95);
		c.beginPath();
		c.arc(cx + ex * 0.6, cy + ey * 0.6, r * 0.075, 0, TAU);
		c.fill();
		c.fillStyle = 'rgba(255,255,255,.9)';
		c.beginPath();
		c.arc(cx + ex * 0.6 - r * 0.03, cy + ey * 0.6 - r * 0.03, r * 0.028, 0, TAU);
		c.fill();
	}
	// a glint on the dome
	c.fillStyle = 'rgba(255,255,255,.55)';
	c.beginPath();
	c.ellipse(-r * 0.45, -r * 0.58, r * 0.14, r * 0.07, -0.6, 0, TAU);
	c.fill();
	// wisps trailing from the hem
	c.strokeStyle = rgba('#d8f3ff', 0.35);
	c.lineCap = 'round';
	for (let i = 0; i < 3; i += 1) {
		const sx = (i - 1) * r * 0.6;
		c.lineWidth = S * 0.025;
		c.beginPath();
		c.moveTo(sx, r * 0.95);
		c.quadraticCurveTo(sx + Math.sin(t * 3 + i) * r * 0.3, r * 1.25, sx + Math.sin(t * 2 + i * 2) * r * 0.2, r * 1.5);
		c.stroke();
	}
	c.restore();
}

// ---------------------------------------------------------------------------------------------
// The cocoon

export function drawCocoon(c: CanvasRenderingContext2D, x: number, y: number, S: number, id: GhostId, t: number): void {
	const col = GHOSTS[id];
	const beat = Math.pow(Math.max(0, Math.sin(t * 4.2)), 6);
	const w = S * 0.36 * (1 + beat * 0.05);
	const h = S * 0.5 * (1 + beat * 0.04);
	c.save();
	c.translate(x, y);
	// resin roots on the floor
	c.lineCap = 'round';
	for (let i = 0; i < 9; i += 1) {
		const a = (i / 9) * TAU + 0.3;
		const l = S * (0.45 + (i % 3) * 0.12);
		c.strokeStyle = INK;
		c.lineWidth = S * 0.06;
		c.beginPath();
		c.moveTo(0, 0);
		c.quadraticCurveTo(Math.cos(a + 0.4) * l * 0.6, Math.sin(a + 0.4) * l * 0.6, Math.cos(a) * l, Math.sin(a) * l);
		c.stroke();
		c.strokeStyle = '#2a3022';
		c.lineWidth = S * 0.035;
		c.stroke();
		c.strokeStyle = 'rgba(190,205,160,.35)';
		c.lineWidth = S * 0.01;
		c.stroke();
	}
	// the pod
	c.fillStyle = 'rgba(0,0,0,.5)';
	c.beginPath();
	c.ellipse(S * 0.06, S * 0.08, w * 1.05, h * 1.05, 0, 0, TAU);
	c.fill();
	c.fillStyle = INK;
	c.beginPath();
	c.ellipse(0, 0, w + S * 0.035, h + S * 0.035, 0, 0, TAU);
	c.fill();
	const g = c.createRadialGradient(-w * 0.35, -h * 0.4, 0, 0, 0, h * 1.1);
	g.addColorStop(0, '#5b6448');
	g.addColorStop(0.5, '#262b1e');
	g.addColorStop(1, '#0f120c');
	c.fillStyle = g;
	c.beginPath();
	c.ellipse(0, 0, w, h, 0, 0, TAU);
	c.fill();
	// the glow of the ghost inside, through the slits between the strands
	c.save();
	c.beginPath();
	c.ellipse(0, 0, w, h, 0, 0, TAU);
	c.clip();
	c.globalCompositeOperation = 'lighter';
	glow(c, 0, h * 0.1, h * 1.1, col, 0.35 + beat * 0.5);
	c.globalCompositeOperation = 'source-over';
	// the strands wrapping it
	for (let i = 0; i < 9; i += 1) {
		const yy = -h + ((i + 0.5) / 9) * h * 2;
		const tw = Math.sqrt(Math.max(0, 1 - (yy / h) ** 2)) * w;
		c.strokeStyle = INK;
		c.lineWidth = S * 0.05;
		c.beginPath();
		c.moveTo(-tw * 1.1, yy + S * 0.04);
		c.quadraticCurveTo(0, yy - S * 0.07 + (i % 2) * S * 0.05, tw * 1.1, yy + S * 0.02);
		c.stroke();
		c.strokeStyle = '#323a26';
		c.lineWidth = S * 0.03;
		c.stroke();
		c.strokeStyle = 'rgba(200,215,170,.4)';
		c.lineWidth = S * 0.008;
		c.stroke();
	}
	c.restore();
	// wet glints
	c.fillStyle = 'rgba(230,240,210,.7)';
	c.beginPath();
	c.ellipse(-w * 0.45, -h * 0.5, w * 0.16, h * 0.08, -0.7, 0, TAU);
	c.fill();
	c.beginPath();
	c.arc(w * 0.3, -h * 0.2, S * 0.012, 0, TAU);
	c.fill();
	c.restore();
}

// ---------------------------------------------------------------------------------------------
// The hunter

export interface HunterLook {
	/** 0..1: how far the mandibles are open (a lunge). */
	readonly bite?: number;
	/** Seen in light: the sheen and the colour pits read stronger. */
	readonly lit?: number;
}

const CH = {
	deep: '#06070a',
	base: '#161a22',
	mid: '#262d39',
	sheen: '#8ea6bf',
	bone: '#e6dcc6'
} as const;

export function drawHunter(
	c: CanvasRenderingContext2D,
	x: number,
	y: number,
	S: number,
	id: GhostId,
	angle: number,
	t: number,
	look: HunterLook = {}
): void {
	const col = GHOSTS[id];
	const u = S;
	const bite = look.bite ?? 0;
	const lit = look.lit ?? 0;
	const lx = Math.cos(angle);
	const ly = Math.sin(angle);
	const breathe = Math.sin(t * 2.6) * 0.02;
	const scuttle = t * 11;
	c.save();
	c.translate(x, y - u * 0.04);
	c.rotate(lx * 0.07);
	c.lineCap = 'round';
	c.lineJoin = 'round';

	// a shadow on the deck
	c.fillStyle = 'rgba(0,0,0,.45)';
	c.beginPath();
	c.ellipse(u * 0.02, u * 0.52, u * 0.42, u * 0.08, 0, 0, TAU);
	c.fill();

	// the tail: out from under the hem, round the body's side, the barb raised over the shoulder
	const side = lx > 0.2 ? -1 : 1;
	const sway = Math.sin(t * 2.2);
	const ctrl: Array<[number, number]> = [
		[0.12, 0.26],
		[0.5, 0.3],
		[0.66 + sway * 0.03, 0.02],
		[0.6 + sway * 0.05, -0.3],
		[0.42 + sway * 0.07, -0.5]
	];
	const tail: Array<[number, number]> = [];
	for (let i = 0; i < ctrl.length - 1; i += 1) {
		for (let k = 0; k < 6; k += 1) {
			const f = k / 6;
			const [ax, ay] = ctrl[i];
			const [bx, by] = ctrl[i + 1];
			tail.push([side * (ax + (bx - ax) * f) * u, (ay + (by - ay) * f) * u]);
		}
	}
	tail.push([side * ctrl[ctrl.length - 1][0] * u, ctrl[ctrl.length - 1][1] * u]);
	const tw = (i: number) => u * (0.11 - (i / tail.length) * 0.075);
	for (const [grow, colr] of [
		[u * 0.03, CH.deep],
		[0, CH.base]
	] as const) {
		c.strokeStyle = colr;
		for (let i = 1; i < tail.length; i += 1) {
			c.lineWidth = tw(i) + grow;
			c.beginPath();
			c.moveTo(tail[i - 1][0], tail[i - 1][1]);
			c.lineTo(tail[i][0], tail[i][1]);
			c.stroke();
		}
	}
	// segment ridges and a sheen along it
	for (let i = 2; i < tail.length - 1; i += 2) {
		const [ax, ay] = tail[i - 1];
		const [bx, by] = tail[i + 1];
		const a = Math.atan2(by - ay, bx - ax) + Math.PI / 2;
		const w = tw(i) * 0.5;
		c.strokeStyle = CH.deep;
		c.lineWidth = u * 0.014;
		c.beginPath();
		c.moveTo(tail[i][0] + Math.cos(a) * w, tail[i][1] + Math.sin(a) * w);
		c.lineTo(tail[i][0] - Math.cos(a) * w, tail[i][1] - Math.sin(a) * w);
		c.stroke();
		c.fillStyle = rgba(CH.sheen, 0.35 + lit * 0.3);
		c.beginPath();
		c.arc(tail[i][0] - side * w * 0.25, tail[i][1] - w * 0.35, w * 0.28, 0, TAU);
		c.fill();
	}
	{
		const [ex, ey] = tail[tail.length - 1];
		const [px, py] = tail[tail.length - 3];
		const a = Math.atan2(ey - py, ex - px);
		c.save();
		c.translate(ex, ey);
		c.rotate(a);
		for (const [grow, fill] of [
			[u * 0.025, CH.deep],
			[0, CH.bone]
		] as const) {
			c.fillStyle = fill;
			c.beginPath();
			c.moveTo(-u * 0.03 - grow, -u * 0.045 - grow);
			c.quadraticCurveTo(u * 0.1, -u * 0.06 - grow, u * 0.19 + grow, side * u * 0.05);
			c.quadraticCurveTo(u * 0.08, u * 0.0, -u * 0.03 - grow, u * 0.04 + grow);
			c.closePath();
			c.fill();
		}
		c.restore();
	}

	// the legs: the ghost's hem split into four clawed legs that scuttle
	for (let i = 0; i < 4; i += 1) {
		const hx = (-0.27 + i * 0.18) * u;
		const out = hx < 0 ? -1 : 1;
		const ph = scuttle + i * Math.PI * 0.5 + (i % 2) * Math.PI;
		const lift = Math.max(0, Math.sin(ph)) * u * 0.05;
		const reach = Math.cos(ph) * u * 0.03;
		const knee: [number, number] = [hx + out * u * (0.14 + Math.abs(hx) / u * 0.35) + reach, u * 0.3 - lift];
		const foot: [number, number] = [hx + out * u * (0.1 + Math.abs(hx) / u * 0.6) + reach * 1.6, u * 0.5 - lift * 0.4];
		for (const [w, colr] of [
			[u * 0.09, CH.deep],
			[u * 0.052, CH.mid],
			[u * 0.016, rgba(CH.sheen, 0.4 + lit * 0.35)]
		] as const) {
			c.strokeStyle = colr;
			c.lineWidth = w;
			c.beginPath();
			c.moveTo(hx, u * 0.16);
			c.quadraticCurveTo(knee[0], u * 0.18, knee[0], knee[1]);
			c.lineTo(foot[0], foot[1]);
			c.stroke();
		}
		// the claw
		c.fillStyle = CH.deep;
		c.beginPath();
		c.moveTo(foot[0] - u * 0.03, foot[1] - u * 0.02);
		c.lineTo(foot[0] + out * u * 0.04, foot[1] + u * 0.08);
		c.lineTo(foot[0] + u * 0.03, foot[1] - u * 0.01);
		c.fill();
		c.fillStyle = CH.bone;
		c.beginPath();
		c.moveTo(foot[0] - u * 0.015, foot[1]);
		c.lineTo(foot[0] + out * u * 0.035, foot[1] + u * 0.065);
		c.lineTo(foot[0] + u * 0.015, foot[1]);
		c.fill();
	}

	// the body: the ghost's own silhouette hardened into chitin, its hem sharpened into plates
	const R = u * 0.4 * (1 + breathe);
	const body = (grow: number) => {
		c.beginPath();
		c.moveTo(-R - grow, u * 0.02);
		c.arc(0, -u * 0.06, R + grow, Math.PI * 1.02, -Math.PI * 0.02);
		c.lineTo(R + grow, u * 0.2);
		const n = 5;
		for (let i = 0; i < n; i += 1) {
			const x0 = R + grow - (i / n) * 2 * (R + grow);
			const x1 = R + grow - ((i + 1) / n) * 2 * (R + grow);
			const xm = (x0 + x1) / 2;
			c.lineTo(xm, u * 0.34 + grow + (i % 2) * u * 0.03);
			c.lineTo(x1, u * 0.2);
		}
		c.closePath();
	};
	// the crest of spines along the dome
	for (let i = 0; i < 7; i += 1) {
		const a = Math.PI * 1.12 + (i / 6) * Math.PI * 0.76;
		const bx = Math.cos(a) * R * 0.98;
		const by = -u * 0.06 + Math.sin(a) * R * 0.98;
		const len = u * (0.09 + (i === 3 ? 0.05 : i % 2 ? 0.02 : 0.035));
		const tipx = bx + Math.cos(a - 0.35) * len;
		const tipy = by + Math.sin(a - 0.35) * len;
		for (const [w, fill] of [
			[u * 0.022, CH.deep],
			[0, CH.bone]
		] as const) {
			c.fillStyle = fill;
			c.beginPath();
			c.moveTo(bx + Math.cos(a + Math.PI / 2) * (u * 0.035 + w), by + Math.sin(a + Math.PI / 2) * (u * 0.035 + w));
			c.lineTo(tipx + Math.cos(a) * w, tipy + Math.sin(a) * w);
			c.lineTo(bx - Math.cos(a + Math.PI / 2) * (u * 0.035 + w), by - Math.sin(a + Math.PI / 2) * (u * 0.035 + w));
			c.fill();
		}
	}
	body(u * 0.035);
	c.fillStyle = CH.deep;
	c.fill();
	body(0);
	const g = c.createRadialGradient(-R * 0.35, -R * 0.55, R * 0.05, 0, 0, R * 1.3);
	g.addColorStop(0, '#46526a');
	g.addColorStop(0.45, CH.mid);
	g.addColorStop(1, '#0c0e13');
	c.fillStyle = g;
	c.fill();
	c.save();
	body(0);
	c.clip();
	// carapace bands with seams of the ghost's colour
	for (let i = 0; i < 3; i += 1) {
		const yy = -u * 0.2 + i * u * 0.16;
		c.strokeStyle = CH.deep;
		c.lineWidth = u * 0.03;
		c.beginPath();
		c.moveTo(-R * 1.1, yy + u * 0.07);
		c.quadraticCurveTo(0, yy - u * 0.05, R * 1.1, yy + u * 0.07);
		c.stroke();
		c.strokeStyle = rgba(col, 0.4 + lit * 0.3);
		c.lineWidth = u * 0.009;
		c.stroke();
	}
	// cel shadow down the right side, a cold rim on its edge
	c.fillStyle = 'rgba(2,3,6,.45)';
	c.beginPath();
	c.ellipse(R * 0.85, u * 0.05, R * 0.55, R * 1.3, 0, 0, TAU);
	c.fill();
	c.restore();
	c.strokeStyle = rgba(CH.sheen, 0.35 + lit * 0.35);
	c.lineWidth = u * 0.014;
	c.beginPath();
	c.arc(0, -u * 0.06, R * 0.93, -Math.PI * 0.42, -Math.PI * 0.05);
	c.stroke();

	// the face: no eyes, a crescent of sensor pits in the ghost's colour that turns where it goes
	const fx = lx * u * 0.09;
	const fy = ly * u * 0.05;
	for (let i = 0; i < 6; i += 1) {
		const a = Math.PI * 1.2 + (i / 5) * Math.PI * 0.6;
		const px = fx + Math.cos(a) * u * 0.22;
		const py = fy - u * 0.02 + Math.sin(a) * u * 0.13 + u * 0.02;
		c.fillStyle = '#010102';
		c.beginPath();
		c.arc(px, py, u * 0.038, 0, TAU);
		c.fill();
		c.fillStyle = rgba(col, 0.8 + lit * 0.2);
		c.beginPath();
		c.arc(px + lx * u * 0.008, py + ly * u * 0.008, u * 0.021, 0, TAU);
		c.fill();
	}
	// the maw: a wide dark crescent with needle teeth, opening on a lunge
	const mw = u * 0.25;
	const mo = u * (0.035 + bite * 0.09);
	const my = u * 0.09 + fy;
	c.fillStyle = '#020203';
	c.beginPath();
	c.moveTo(fx - mw, my - u * 0.02);
	c.quadraticCurveTo(fx, my + mo * 0.2, fx + mw, my - u * 0.02);
	c.quadraticCurveTo(fx, my + mo * 2.2, fx - mw, my - u * 0.02);
	c.closePath();
	c.fill();
	if (bite > 0.2) {
		c.save();
		c.globalCompositeOperation = 'lighter';
		glow(c, fx, my + mo, u * 0.2, col, 0.35 * bite);
		c.restore();
	}
	c.fillStyle = CH.bone;
	for (let i = 0; i < 9; i += 1) {
		const k = (i + 0.5) / 9;
		const tx = fx - mw * 0.9 + k * mw * 1.8;
		const curve = Math.sin(k * Math.PI);
		const top = my - u * 0.015 + curve * mo * 0.2;
		const bot = my - u * 0.01 + curve * mo * 2.0;
		const tl = u * (0.03 + curve * 0.025);
		c.beginPath();
		c.moveTo(tx - u * 0.012, top);
		c.lineTo(tx, top + tl);
		c.lineTo(tx + u * 0.012, top);
		c.fill();
		c.beginPath();
		c.moveTo(tx - u * 0.012, bot);
		c.lineTo(tx, bot - tl * 0.8);
		c.lineTo(tx + u * 0.012, bot);
		c.fill();
	}
	// one hard glint of wet chitin
	c.fillStyle = rgba('#e6f0fa', 0.5 + lit * 0.4);
	c.beginPath();
	c.ellipse(-R * 0.42, -R * 0.72, R * 0.2, R * 0.08, -0.55, 0, TAU);
	c.fill();
	c.restore();
}

/** What of the hunter shows in the dark: the crescent of its colour pits. */
export function drawHunterGlints(c: CanvasRenderingContext2D, x: number, y: number, S: number, id: GhostId, angle: number, a: number): void {
	const col = GHOSTS[id];
	const lx = Math.cos(angle);
	const ly = Math.sin(angle);
	c.save();
	c.translate(x, y - S * 0.04);
	c.rotate(lx * 0.07);
	c.globalCompositeOperation = 'lighter';
	for (let i = 0; i < 6; i += 1) {
		const ang = Math.PI * 1.2 + (i / 5) * Math.PI * 0.6;
		const px = lx * S * 0.09 + Math.cos(ang) * S * 0.22;
		const py = ly * S * 0.05 + Math.sin(ang) * S * 0.13;
		glow(c, px, py, S * 0.09, col, 0.8 * a);
	}
	c.restore();
}

// ---------------------------------------------------------------------------------------------
// The way out and the reward

export function drawHatch(c: CanvasRenderingContext2D, x: number, y: number, S: number, t: number, open: boolean): void {
	const R = S * 0.47;
	c.save();
	c.translate(x, y);
	c.fillStyle = INK;
	c.beginPath();
	c.arc(0, 0, R + S * 0.03, 0, TAU);
	c.fill();
	// hazard ring
	for (let i = 0; i < 16; i += 1) {
		c.fillStyle = i % 2 ? '#15171a' : '#d2a62a';
		c.beginPath();
		c.moveTo(0, 0);
		c.arc(0, 0, R, (i / 16) * TAU, ((i + 1) / 16) * TAU);
		c.closePath();
		c.fill();
	}
	const ri = R * 0.78;
	c.fillStyle = INK;
	c.beginPath();
	c.arc(0, 0, ri + S * 0.015, 0, TAU);
	c.fill();
	if (!open) {
		const g = c.createRadialGradient(-ri * 0.3, -ri * 0.3, 0, 0, 0, ri);
		g.addColorStop(0, '#7b8792');
		g.addColorStop(1, '#2c333a');
		c.fillStyle = g;
		c.beginPath();
		c.arc(0, 0, ri, 0, TAU);
		c.fill();
		// the wheel
		c.strokeStyle = INK;
		c.lineWidth = S * 0.06;
		c.beginPath();
		c.arc(0, 0, ri * 0.55, 0, TAU);
		c.stroke();
		c.strokeStyle = '#a4b0bb';
		c.lineWidth = S * 0.032;
		c.stroke();
		for (let k = 0; k < 4; k += 1) {
			const a = k * (Math.PI / 2) + 0.4;
			c.strokeStyle = INK;
			c.lineWidth = S * 0.05;
			c.beginPath();
			c.moveTo(0, 0);
			c.lineTo(Math.cos(a) * ri * 0.55, Math.sin(a) * ri * 0.55);
			c.stroke();
			c.strokeStyle = '#a4b0bb';
			c.lineWidth = S * 0.025;
			c.stroke();
		}
		c.fillStyle = '#c8d2db';
		c.beginPath();
		c.arc(0, 0, S * 0.05, 0, TAU);
		c.fill();
	} else {
		// open: a shaft of light from below and the rungs of a ladder
		const g = c.createRadialGradient(0, 0, 0, 0, 0, ri);
		g.addColorStop(0, '#d9ffe9');
		g.addColorStop(0.5, '#3dd68a');
		g.addColorStop(1, '#0b2a1a');
		c.fillStyle = g;
		c.beginPath();
		c.arc(0, 0, ri, 0, TAU);
		c.fill();
		c.strokeStyle = 'rgba(5,20,12,.75)';
		c.lineWidth = S * 0.03;
		for (let k = -2; k <= 2; k += 1) {
			c.beginPath();
			c.moveTo(-ri * 0.45, k * ri * 0.3);
			c.lineTo(ri * 0.45, k * ri * 0.3);
			c.stroke();
		}
		c.globalCompositeOperation = 'lighter';
		glow(c, 0, 0, S * 1.2, '#4dff9a', 0.35 + 0.1 * Math.sin(t * 4));
		c.globalCompositeOperation = 'source-over';
	}
	// status lamp
	const on = open ? '#4dff9a' : Math.sin(t * 5) > 0 ? '#ffb02e' : '#5a3a10';
	c.fillStyle = INK;
	c.beginPath();
	c.arc(R * 0.72, -R * 0.72, S * 0.07, 0, TAU);
	c.fill();
	c.fillStyle = on;
	c.beginPath();
	c.arc(R * 0.72, -R * 0.72, S * 0.045, 0, TAU);
	c.fill();
	c.restore();
}

/** The reward: a heart, beating, in a med pod's glass. */
export function drawMedPod(c: CanvasRenderingContext2D, x: number, y: number, S: number, t: number): void {
	const R = S * 0.42;
	const beat = 1 + 0.08 * Math.pow(Math.max(0, Math.sin(t * 5)), 8);
	c.save();
	c.translate(x, y);
	c.globalCompositeOperation = 'lighter';
	glow(c, 0, 0, S * 0.9, '#ff3b5c', 0.3);
	c.globalCompositeOperation = 'source-over';
	c.fillStyle = INK;
	c.beginPath();
	c.arc(0, 0, R + S * 0.04, 0, TAU);
	c.fill();
	const rim = c.createLinearGradient(-R, -R, R, R);
	rim.addColorStop(0, '#aeb9c3');
	rim.addColorStop(1, '#3a424a');
	c.fillStyle = rim;
	c.beginPath();
	c.arc(0, 0, R, 0, TAU);
	c.fill();
	const gl = c.createRadialGradient(0, 0, 0, 0, 0, R * 0.8);
	gl.addColorStop(0, '#2b5e66');
	gl.addColorStop(1, '#0b1f24');
	c.fillStyle = gl;
	c.beginPath();
	c.arc(0, 0, R * 0.8, 0, TAU);
	c.fill();
	// the heart
	c.save();
	c.scale(beat, beat);
	const h = S * 0.22;
	const heart = () => {
		c.beginPath();
		c.moveTo(0, h * 0.85);
		c.bezierCurveTo(-h * 1.2, h * 0.05, -h * 0.75, -h * 0.95, 0, -h * 0.35);
		c.bezierCurveTo(h * 0.75, -h * 0.95, h * 1.2, h * 0.05, 0, h * 0.85);
		c.closePath();
	};
	c.lineWidth = S * 0.04;
	c.strokeStyle = INK;
	heart();
	c.stroke();
	const hg = c.createRadialGradient(-h * 0.3, -h * 0.3, 0, 0, 0, h * 1.1);
	hg.addColorStop(0, '#ff8a9a');
	hg.addColorStop(0.6, '#e0203f');
	hg.addColorStop(1, '#7a0a1d');
	c.fillStyle = hg;
	heart();
	c.fill();
	c.fillStyle = 'rgba(255,255,255,.7)';
	c.beginPath();
	c.ellipse(-h * 0.4, -h * 0.3, h * 0.18, h * 0.1, -0.6, 0, TAU);
	c.fill();
	c.restore();
	// bubbles, glass glint, bolts
	for (let i = 0; i < 5; i += 1) {
		const ph = (t * 0.5 + i / 5) % 1;
		c.strokeStyle = `rgba(190,250,255,${0.5 * (1 - ph)})`;
		c.lineWidth = 1;
		c.beginPath();
		c.arc((i - 2) * R * 0.22, R * 0.6 - ph * R * 1.2, S * 0.018, 0, TAU);
		c.stroke();
	}
	c.strokeStyle = 'rgba(220,250,255,.45)';
	c.lineWidth = S * 0.025;
	c.beginPath();
	c.arc(0, 0, R * 0.68, Math.PI * 1.1, Math.PI * 1.45);
	c.stroke();
	for (let k = 0; k < 6; k += 1) {
		const a = (k / 6) * TAU;
		c.fillStyle = '#2a3036';
		c.beginPath();
		c.arc(Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9, S * 0.022, 0, TAU);
		c.fill();
	}
	c.restore();
}

// ---------------------------------------------------------------------------------------------
// The motion tracker: a pulse from the hero; what moves within reach blips as the ring passes

export interface Blip {
	readonly x: number;
	readonly y: number;
}

export const TRACKER = { period: 1.5, reach: 10, color: '#62f5c8' } as const;

export function drawTracker(
	c: CanvasRenderingContext2D,
	hx: number,
	hy: number,
	S: number,
	t: number,
	blips: readonly Blip[]
): void {
	const u = (t % TRACKER.period) / TRACKER.period;
	const rad = u * TRACKER.reach * S;
	c.save();
	c.globalCompositeOperation = 'lighter';
	// the ring: a thin front with a faint wake behind it
	const a = (1 - u) * 0.38;
	c.strokeStyle = rgba(TRACKER.color, a);
	c.lineWidth = Math.max(1, S * 0.04);
	c.setLineDash([S * 0.22, S * 0.12]);
	c.beginPath();
	c.arc(hx, hy, rad, 0, TAU);
	c.stroke();
	c.setLineDash([]);
	c.strokeStyle = rgba(TRACKER.color, a * 0.14);
	c.lineWidth = S * 0.35;
	c.beginPath();
	c.arc(hx, hy, Math.max(0, rad - S * 0.2), 0, TAU);
	c.stroke();
	// blips: lit when the front passed them, fading until the next pulse
	for (const b of blips) {
		const bx = hx + b.x * S;
		const by = hy + b.y * S;
		const d = Math.hypot(b.x, b.y);
		if (d > TRACKER.reach) continue;
		const passed = u - d / TRACKER.reach;
		if (passed < 0) continue;
		const age = passed * TRACKER.period;
		const k = Math.max(0, 1 - age / 1.1);
		glow(c, bx, by, S * 0.7, TRACKER.color, 0.55 * k);
		c.fillStyle = rgba('#e8fff6', k);
		c.beginPath();
		c.arc(bx, by, S * 0.1, 0, TAU);
		c.fill();
		c.strokeStyle = rgba(TRACKER.color, k * 0.8);
		c.lineWidth = Math.max(1, S * 0.03);
		c.beginPath();
		c.arc(bx, by, S * (0.18 + age * 0.5), 0, TAU);
		c.stroke();
	}
	c.restore();
}
