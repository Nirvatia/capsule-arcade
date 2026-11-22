// The station's hunter and cocoon (DESIGN.md §7a, style B). The hunter is made for the top-down
// view and one tile in size, not a humanoid: a wide, flat head-shield with a slit of the ghost's
// colour across its leading edge (its eyes and its heading) and hooked mandibles, two raptorial
// forelimbs folded under the shield, three pairs of thin jointed legs in a scuttling gait, a
// segmented abdomen with a ridge of bone spines and a whip of a tail ending in a barb. Wet black
// chitin, an oily rim light, no toy outline. It turns to its heading; drawn under the dark, the
// light finds it. In the dark only the slit shows (`drawHunterGlints`).
import type { GhostKind } from '../../logic/actors/GhostModel';
import { GHOST_TINT, rgba, stationGlow } from './stationColors';

const TAU = Math.PI * 2;

const HC = {
	deep: '#030304',
	base: '#0d0f12',
	mid: '#1d2128',
	plate: '#2a3039',
	oil: '#7d97b3',
	bone: '#b9ad94'
} as const;

export interface HunterLook {
	/** 0..1: the lunge (forelimbs out, mandibles open). */
	readonly bite?: number;
	/** 0..1: how lit it is (the sheen reads stronger). */
	readonly lit?: number;
}

function strokePath(
	c: CanvasRenderingContext2D,
	pts: ReadonlyArray<readonly [number, number]>
): void {
	c.beginPath();
	pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
	c.stroke();
}

/** A thin chitin limb: a dark core, the mid tone, an oily line of light. */
function limb(
	c: CanvasRenderingContext2D,
	pts: ReadonlyArray<readonly [number, number]>,
	w: number,
	lit: number
): void {
	c.strokeStyle = HC.deep;
	c.lineWidth = w * 1.7;
	strokePath(c, pts);
	c.strokeStyle = HC.mid;
	c.lineWidth = w;
	strokePath(c, pts);
	c.strokeStyle = rgba(HC.oil, 0.25 + lit * 0.4);
	c.lineWidth = w * 0.3;
	strokePath(c, pts);
}

export function drawHunter(
	c: CanvasRenderingContext2D,
	x: number,
	y: number,
	S: number,
	kind: GhostKind,
	angle: number,
	t: number,
	look: HunterLook = {}
): void {
	const col = GHOST_TINT[kind];
	const u = S;
	const bite = look.bite ?? 0;
	const lit = look.lit ?? 0;
	const gait = t * 10;
	c.save();
	c.translate(x, y);
	c.rotate(angle);
	c.lineCap = 'round';
	c.lineJoin = 'round';

	// its shadow on the deck
	c.fillStyle = 'rgba(0,0,0,.5)';
	c.beginPath();
	c.ellipse(-u * 0.04, u * 0.05, u * 0.48, u * 0.3, 0, 0, TAU);
	c.fill();

	// the tail: a whip trailing behind, swaying, ending in a hooked barb
	const tail: Array<[number, number]> = [];
	for (let i = 0; i <= 16; i += 1) {
		const k = i / 16;
		tail.push([-u * (0.36 + k * 0.62), Math.sin(t * 3 - k * 4) * u * 0.08 * k]);
	}
	for (const [grow, colr] of [
		[u * 0.03, HC.deep],
		[0, HC.base]
	] as const) {
		c.strokeStyle = colr;
		for (let i = 1; i < tail.length; i += 1) {
			c.lineWidth = u * (0.09 - (i / tail.length) * 0.065) + grow;
			c.beginPath();
			c.moveTo(tail[i - 1][0], tail[i - 1][1]);
			c.lineTo(tail[i][0], tail[i][1]);
			c.stroke();
		}
	}
	for (let i = 2; i < tail.length; i += 2) {
		const w = u * (0.09 - (i / tail.length) * 0.065) * 0.5;
		c.strokeStyle = HC.deep;
		c.lineWidth = u * 0.012;
		c.beginPath();
		c.moveTo(tail[i][0], tail[i][1] - w);
		c.lineTo(tail[i][0], tail[i][1] + w);
		c.stroke();
		c.fillStyle = rgba(HC.oil, 0.3 + lit * 0.35);
		c.fillRect(tail[i][0] - u * 0.008, tail[i][1] - w * 0.6, u * 0.016, u * 0.01);
	}
	{
		const [ex, ey] = tail[tail.length - 1];
		const [px, py] = tail[tail.length - 3];
		const side = Math.sin(t * 3 - 4) >= 0 ? 1 : -1;
		c.save();
		c.translate(ex, ey);
		c.rotate(Math.atan2(ey - py, ex - px));
		for (const [grow, fill] of [
			[u * 0.022, HC.deep],
			[0, HC.bone]
		] as const) {
			c.fillStyle = fill;
			c.beginPath();
			c.moveTo(-u * 0.03 - grow, -u * 0.035 - grow);
			c.quadraticCurveTo(u * 0.1, -u * 0.04, u * 0.17 + grow, side * u * 0.06);
			c.quadraticCurveTo(u * 0.07, 0, -u * 0.03 - grow, u * 0.035 + grow);
			c.closePath();
			c.fill();
		}
		c.restore();
	}

	// three pairs of legs, a tripod gait: knees raised out to the side, claws on the deck
	const legs: Array<[number, number]> = [
		[u * 0.12, 0.6],
		[-u * 0.02, 0],
		[-u * 0.16, -0.6]
	];
	for (const side of [-1, 1]) {
		legs.forEach(([hx, splay], i) => {
			const ph = gait + (i % 2 === (side > 0 ? 0 : 1) ? 0 : Math.PI);
			const step = Math.sin(ph) * u * 0.07;
			const lift = Math.max(0, Math.cos(ph)) * u * 0.03;
			const hip: [number, number] = [hx, side * u * 0.1];
			const knee: [number, number] = [hx + splay * u * 0.1 + step * 0.5, side * (u * 0.36 + lift)];
			const foot: [number, number] = [hx + splay * u * 0.22 + step, side * u * 0.54];
			limb(c, [hip, knee, foot], u * 0.04, lit);
			c.fillStyle = HC.bone;
			c.beginPath();
			c.moveTo(foot[0] - u * 0.012, foot[1]);
			c.lineTo(foot[0] + splay * u * 0.04, foot[1] + side * u * 0.05);
			c.lineTo(foot[0] + u * 0.012, foot[1]);
			c.fill();
		});
	}

	// the raptorial forelimbs, folded forward under the shield, flung out on a lunge
	for (const side of [-1, 1]) {
		const out = bite;
		const sh: [number, number] = [u * 0.16, side * u * 0.12];
		const el: [number, number] = [u * (0.3 + out * 0.08), side * u * (0.27 - out * 0.05)];
		const tip: [number, number] = [u * (0.44 + out * 0.22), side * u * (0.1 - out * 0.04)];
		limb(c, [sh, el, tip], u * 0.045, lit);
		// spines along the inner edge of the forearm
		c.fillStyle = HC.bone;
		for (let k = 1; k <= 3; k += 1) {
			const f = k / 4;
			const px = el[0] + (tip[0] - el[0]) * f;
			const py = el[1] + (tip[1] - el[1]) * f;
			c.beginPath();
			c.moveTo(px - u * 0.012, py);
			c.lineTo(px + u * 0.01, py - side * u * 0.05);
			c.lineTo(px + u * 0.012, py);
			c.fill();
		}
	}

	// the abdomen: overlapping plates tapering back, a ridge of bone spines down the middle
	const abdomen = (grow: number) => {
		c.beginPath();
		c.moveTo(-u * 0.04, -u * 0.13 - grow);
		c.bezierCurveTo(-u * 0.22, -u * 0.16 - grow, -u * 0.38 - grow, -u * 0.08, -u * 0.42 - grow, 0);
		c.bezierCurveTo(
			-u * 0.38 - grow,
			u * 0.08,
			-u * 0.22,
			u * 0.16 + grow,
			-u * 0.04,
			u * 0.13 + grow
		);
		c.closePath();
	};
	abdomen(u * 0.03);
	c.fillStyle = HC.deep;
	c.fill();
	abdomen(0);
	const ag = c.createLinearGradient(0, -u * 0.16, 0, u * 0.16);
	ag.addColorStop(0, HC.plate);
	ag.addColorStop(0.5, HC.mid);
	ag.addColorStop(1, HC.base);
	c.fillStyle = ag;
	c.fill();
	c.save();
	abdomen(0);
	c.clip();
	for (let i = 0; i < 4; i += 1) {
		const px = -u * (0.08 + i * 0.085);
		c.strokeStyle = HC.deep;
		c.lineWidth = u * 0.025;
		c.beginPath();
		c.ellipse(px + u * 0.06, 0, u * 0.07, u * 0.2, 0, Math.PI * 0.55, Math.PI * 1.45);
		c.stroke();
		c.strokeStyle = rgba(col, 0.28 + lit * 0.25);
		c.lineWidth = u * 0.007;
		c.stroke();
	}
	c.restore();
	for (let i = 0; i < 4; i += 1) {
		const sx = -u * (0.08 + i * 0.08);
		c.fillStyle = HC.deep;
		c.beginPath();
		c.moveTo(sx + u * 0.025, -u * 0.024);
		c.lineTo(sx - u * 0.07, 0);
		c.lineTo(sx + u * 0.025, u * 0.024);
		c.fill();
		c.fillStyle = HC.bone;
		c.beginPath();
		c.moveTo(sx + u * 0.018, -u * 0.012);
		c.lineTo(sx - u * 0.055, 0);
		c.lineTo(sx + u * 0.018, u * 0.012);
		c.fill();
	}

	// the head-shield: wide and flat, swept back at the edges; mandibles at its front
	const open = 0.15 + bite * 0.5 + Math.max(0, Math.sin(t * 1.7)) * 0.06;
	for (const side of [-1, 1]) {
		c.save();
		c.translate(u * 0.36, side * u * 0.06);
		c.rotate(side * open);
		limb(
			c,
			[
				[0, 0],
				[u * 0.1, side * u * 0.02],
				[u * 0.14, -side * u * 0.05]
			],
			u * 0.035,
			lit
		);
		c.restore();
	}
	const shield = (grow: number) => {
		c.beginPath();
		c.moveTo(u * 0.4 + grow, 0);
		c.bezierCurveTo(
			u * 0.38 + grow,
			-u * 0.14,
			u * 0.26,
			-u * 0.27 - grow,
			u * 0.06,
			-u * 0.25 - grow
		);
		c.quadraticCurveTo(u * 0.12, -u * 0.12, u * 0.02 - grow, -u * 0.05);
		c.lineTo(u * 0.02 - grow, u * 0.05);
		c.quadraticCurveTo(u * 0.12, u * 0.12, u * 0.06, u * 0.25 + grow);
		c.bezierCurveTo(u * 0.26, u * 0.27 + grow, u * 0.38 + grow, u * 0.14, u * 0.4 + grow, 0);
		c.closePath();
	};
	shield(u * 0.03);
	c.fillStyle = HC.deep;
	c.fill();
	shield(0);
	const sg = c.createRadialGradient(u * 0.16, -u * 0.08, 0, u * 0.2, 0, u * 0.3);
	sg.addColorStop(0, '#3d4758');
	sg.addColorStop(0.55, HC.mid);
	sg.addColorStop(1, HC.deep);
	c.fillStyle = sg;
	c.fill();
	// ridges fanning back over the shield
	c.save();
	shield(0);
	c.clip();
	c.strokeStyle = 'rgba(0,0,0,.6)';
	c.lineWidth = u * 0.012;
	for (const a of [-0.9, -0.45, 0, 0.45, 0.9]) {
		c.beginPath();
		c.moveTo(u * 0.34, a * u * 0.06);
		c.lineTo(u * 0.06, a * u * 0.26);
		c.stroke();
	}
	c.restore();
	// the sensor slit across the leading edge: the ghost's colour, its eyes and its heading
	c.fillStyle = '#000';
	c.beginPath();
	c.ellipse(u * 0.33, 0, u * 0.028, u * 0.15, 0, 0, TAU);
	c.fill();
	c.save();
	c.globalCompositeOperation = 'lighter';
	c.fillStyle = rgba(col, 0.8 + lit * 0.2);
	c.beginPath();
	c.ellipse(u * 0.335, 0, u * 0.01, u * 0.12, 0, 0, TAU);
	c.fill();
	stationGlow(c, u * 0.34, 0, u * 0.16, col, 0.35 + bite * 0.3);
	c.restore();
	// the wet sheen: a hard rim along the shield and one glint
	c.strokeStyle = rgba('#cfe0f2', 0.3 + lit * 0.5);
	c.lineWidth = Math.max(0.7, u * 0.012);
	c.beginPath();
	c.moveTo(u * 0.08, -u * 0.22);
	c.bezierCurveTo(u * 0.24, -u * 0.25, u * 0.35, -u * 0.13, u * 0.37, -u * 0.04);
	c.stroke();
	c.fillStyle = rgba('#e8f2ff', 0.35 + lit * 0.45);
	c.beginPath();
	c.ellipse(u * 0.18, -u * 0.12, u * 0.06, u * 0.016, 0.5, 0, TAU);
	c.fill();
	c.restore();
}

/** In the dark only the hunter's slit shows. */
export function drawHunterGlints(
	c: CanvasRenderingContext2D,
	x: number,
	y: number,
	S: number,
	kind: GhostKind,
	angle: number,
	a: number
): void {
	const col = GHOST_TINT[kind];
	c.save();
	c.translate(x, y);
	c.rotate(angle);
	c.globalCompositeOperation = 'lighter';
	c.fillStyle = rgba(col, 0.85 * a);
	c.beginPath();
	c.ellipse(S * 0.335, 0, S * 0.01 + 0.4, S * 0.12, 0, 0, TAU);
	c.fill();
	stationGlow(c, S * 0.34, 0, S * 0.2, col, 0.45 * a);
	c.restore();
}

/** The cocoon a ghost wraps itself in: a husk with its face pressed against it from inside. */
export function drawCocoon(
	c: CanvasRenderingContext2D,
	x: number,
	y: number,
	S: number,
	kind: GhostKind,
	t: number
): void {
	const col = GHOST_TINT[kind];
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
		c.quadraticCurveTo(
			Math.cos(a + 0.5) * l * 0.5,
			Math.sin(a + 0.5) * l * 0.5,
			Math.cos(a) * l,
			Math.sin(a) * l
		);
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
	stationGlow(c, 0, -h * 0.15, h * 1.1, col, 0.22 + beat * 0.4);
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
		c.bezierCurveTo(
			-w * 0.5 + i * w * 0.12,
			-h * 0.2,
			w * 0.4 - i * w * 0.1,
			h * 0.2,
			-w + ((i + 2) / 8) * w * 2,
			h
		);
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
