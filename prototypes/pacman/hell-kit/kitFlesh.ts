// Kit A, «Плоть»: the hell's own matter. Teeth, gums, a heart, ribs and bone; the ghosts are flayed
// demons (the imps' body, bigger) with a stitched seam, ribs showing in their shade and a fanged grin.
import type { Kit } from './kits';
import {
	INK,
	TAU,
	VEC,
	bloom,
	cel,
	celBands,
	drawEyes,
	drawHorns,
	face,
	fang,
	ghostPath,
	gloss,
	ink,
	lightGlow,
	rim,
	shadow,
	type Ctx,
	type Dir,
	type GhostShape,
	type Tones
} from './paint';

const BONE: Tones = { light: '#fff6e4', mid: '#e6d4b0', shade: '#a8916a' };
const GUM: Tones = { light: '#f6a8a4', mid: '#c4545a', shade: '#6a1a22' };
const HEART: Tones = { light: '#ff8a78', mid: '#c8261e', shade: '#5a080c' };
const BILE: Tones = { light: '#dcfbff', mid: '#46c2ee', shade: '#16608e' };
const PEEL: Tones = { light: '#ffd66a', mid: '#ff8a1a', shade: '#a8400a' };
const SKINS: readonly Tones[] = [
	{ light: '#ff9c86', mid: '#d8392c', shade: '#7a1210' },
	{ light: '#ffc0dc', mid: '#de5a9a', shade: '#7c1a50' },
	{ light: '#a8eef8', mid: '#2fa6c6', shade: '#0f4f68' },
	{ light: '#ffd29a', mid: '#e47a26', shade: '#7a3608' }
];
const FRIGHT: Tones = { light: '#c8d2ff', mid: '#3d4fd8', shade: '#151c6e' };
const TINT = ['255,90,60', '255,120,200', '90,220,255', '255,170,70'];

function ghostShape(S: number, i: number): GhostShape {
	// about the hero's size: in the split they are the enemies, not the boss's small imps
	const w = S * 0.36;
	return { w, domeY: -w * 0.18, hem: w * 1.02, feet: 4, torn: 0.45, seed: 3 + i * 1.7 };
}

/** The flayed ghost: body, ribs in its shade, a stitched seam, bone horns, a fanged grin. */
function ghost(c: Ctx, i: number, x: number, y: number, S: number, dir: Dir, fright: boolean, t: number): void {
	const shape = ghostShape(S, i);
	const { w, domeY, hem } = shape;
	const tones = fright ? FRIGHT : SKINS[i];
	c.save();
	c.lineJoin = 'round';
	c.lineCap = 'round';
	lightGlow(c, x, y, w * 1.9, fright ? '90,110,255' : TINT[i], 0.16);
	c.translate(x, y);
	c.fillStyle = 'rgba(8,1,3,.4)';
	c.beginPath();
	c.ellipse(w * 0.15, hem + w * 0.12, w * 0.95, w * 0.22, 0, 0, TAU);
	c.fill();
	drawHorns(c, 0, 0, shape, 0.62, { length: 0.5, curl: 0.16, bone: fright ? ['#e4e6f4', '#8a8ea8'] : ['#f1e4cc', '#9c8a72'], ember: null }, 0);
	ghostPath(c, 0, 0, shape, t * 1.3 + shape.seed);
	c.fillStyle = tones.mid;
	c.fill();
	c.save();
	ghostPath(c, 0, 0, shape, t * 1.3 + shape.seed);
	c.clip();
	celBands(c, shape, tones);
	// ribs showing through the shade side
	c.strokeStyle = fright ? 'rgba(220,226,255,.55)' : 'rgba(255,236,214,.5)';
	c.lineWidth = Math.max(1, w * 0.07);
	for (let k = 0; k < 3; k += 1) {
		const ry = domeY + w * (0.55 + k * 0.28);
		c.beginPath();
		c.moveTo(w * 0.2, ry);
		c.quadraticCurveTo(w * 0.62, ry - w * 0.12, w * 0.9, ry + w * 0.08);
		c.stroke();
	}
	// the stitched seam down the left
	c.strokeStyle = INK;
	c.lineWidth = Math.max(0.9, w * 0.05);
	c.beginPath();
	c.moveTo(-w * 0.55, domeY + w * 0.5);
	c.quadraticCurveTo(-w * 0.75, domeY + w * 0.95, -w * 0.45, hem - w * 0.1);
	c.stroke();
	for (let k = 0; k < 4; k += 1) {
		const sy = domeY + w * (0.6 + k * 0.26);
		const sx = -w * (0.58 + 0.08 * Math.sin(k));
		c.beginPath();
		c.moveTo(sx - w * 0.1, sy - w * 0.05);
		c.lineTo(sx + w * 0.1, sy + w * 0.05);
		c.stroke();
	}
	c.restore();
	ghostPath(c, 0, 0, shape, t * 1.3 + shape.seed);
	c.lineWidth = Math.max(1.4, w * 0.15);
	c.strokeStyle = INK;
	c.stroke();
	rim(c, 0, domeY, w, S);
	const look = Math.atan2(VEC[dir][1], VEC[dir][0]);
	if (fright) {
		// small blank eyes and a quivering mouth
		for (const side of [-1, 1]) {
			c.fillStyle = '#f4f0ff';
			c.beginPath();
			c.arc(side * w * 0.36, domeY + w * 0.25, w * 0.13, 0, TAU);
			c.fill();
		}
		c.strokeStyle = '#f4f0ff';
		c.lineWidth = Math.max(1, w * 0.09);
		c.beginPath();
		for (let k = 0; k <= 6; k += 1) c.lineTo(-w * 0.5 + (k * w) / 6, domeY + w * 0.78 + (k % 2 ? -1 : 1) * w * 0.07);
		c.stroke();
	} else {
		drawEyes(c, 0, domeY + w * 0.4, w, look, { sclera: '#ffe27a', glow: null }, 1, false, t);
		// the fanged grin
		c.fillStyle = '#2a0406';
		c.beginPath();
		c.ellipse(0, domeY + w * 0.98, w * 0.42, w * 0.16, 0, 0, Math.PI);
		c.fill();
		for (let k = -1; k <= 1; k += 2) {
			c.fillStyle = '#fff2dc';
			c.beginPath();
			c.moveTo(k * w * 0.26 - w * 0.06, domeY + w * 0.98);
			c.lineTo(k * w * 0.26, domeY + w * 1.14);
			c.lineTo(k * w * 0.26 + w * 0.06, domeY + w * 0.98);
			c.closePath();
			c.fill();
		}
		c.lineWidth = Math.max(0.9, w * 0.06);
		c.strokeStyle = INK;
		c.beginPath();
		c.ellipse(0, domeY + w * 0.98, w * 0.42, w * 0.16, 0, 0, Math.PI);
		c.stroke();
	}
	c.restore();
}

/** A fang lying point down, its root in a scrap of gum. */
function food(c: Ctx, x: number, y: number, S: number): void {
	shadow(c, x, y + S * 0.06, S * 0.12, S * 0.05);
	fang(c, x, y - S * 0.1, S * 0.24, S * 0.075, Math.PI / 2, BONE, S, 0.8);
	cel(
		c,
		() => {
			c.beginPath();
			c.ellipse(x, y - S * 0.1, S * 0.1, S * 0.05, 0, 0, TAU);
		},
		GUM,
		x,
		y - S * 0.1,
		S * 0.1,
		S,
		0.7
	);
	gloss(c, x - S * 0.03, y - S * 0.02, S * 0.012, S * 0.045, 0.75, 0.15);
}

function heartPath(c: Ctx, x: number, y: number, r: number): () => void {
	return () => {
		c.beginPath();
		c.moveTo(x, y + r * 1.0);
		c.bezierCurveTo(x - r * 1.55, y - r * 0.05, x - r * 0.85, y - r * 1.2, x - r * 0.05, y - r * 0.5);
		c.bezierCurveTo(x + r * 0.85, y - r * 1.2, x + r * 1.55, y - r * 0.05, x, y + r * 1.0);
		c.closePath();
	};
}

/** The split's energizer: a heart that beats, its torn vessels capped with bone rings. */
function energizer(c: Ctx, x: number, y: number, S: number, t: number): void {
	const beat = 1 + 0.08 * Math.max(0, Math.sin(t * 7)) ** 3;
	const r = S * 0.22 * beat;
	shadow(c, x, y + S * 0.18, S * 0.22, S * 0.07);
	bloom(c, x, y, S * 0.55, '255,60,40', 0.22);
	for (const [vx, vw] of [
		[-0.32, 0.13],
		[0.12, 0.16]
	] as const) {
		cel(
			c,
			() => {
				c.beginPath();
				c.roundRect(x + r * vx, y - r * 1.05, r * vw * 2, r * 0.6, r * 0.1);
			},
			{ light: '#f4b0a8', mid: '#c4605e', shade: '#6a1e22' },
			x + r * (vx + vw),
			y - r * 0.8,
			r * 0.3,
			S,
			0.6
		);
		cel(
			c,
			() => {
				c.beginPath();
				c.ellipse(x + r * (vx + vw), y - r * 1.05, r * vw * 1.1, r * 0.08, 0, 0, TAU);
			},
			BONE,
			x + r * (vx + vw),
			y - r * 1.05,
			r * 0.2,
			S,
			0.5
		);
	}
	cel(c, heartPath(c, x, y, r), HEART, x, y, r, S);
	c.strokeStyle = 'rgba(40,4,8,.6)';
	c.lineWidth = Math.max(1, S * 0.022);
	c.beginPath();
	c.moveTo(x - r * 0.05, y - r * 0.4);
	c.bezierCurveTo(x + r * 0.25, y - r * 0.05, x - r * 0.2, y + r * 0.3, x + r * 0.05, y + r * 0.75);
	c.moveTo(x + r * 0.15, y + r * 0.05);
	c.quadraticCurveTo(x + r * 0.5, y + r * 0.05, x + r * 0.65, y - r * 0.25);
	c.stroke();
	gloss(c, x - r * 0.55, y - r * 0.35, r * 0.2, r * 0.1, 0.8);
}

/** The snare: a gummed maw on the floor, fangs above and below; shut, they interlock. */
function snare(c: Ctx, x: number, y: number, S: number, open: number): void {
	const rx = S * 0.42;
	const ry = S * (0.12 + 0.2 * open);
	shadow(c, x, y + ry * 0.4, rx * 1.02, S * 0.12);
	cel(
		c,
		() => {
			c.beginPath();
			c.ellipse(x, y, rx, ry + S * 0.06, 0, 0, TAU);
		},
		GUM,
		x,
		y,
		rx,
		S
	);
	if (open > 0.05) {
		c.fillStyle = '#240406';
		c.beginPath();
		c.ellipse(x, y + S * 0.01, rx * 0.78, ry * 0.85, 0, 0, TAU);
		c.fill();
		c.fillStyle = 'rgba(120,20,30,.7)';
		c.beginPath();
		c.ellipse(x + rx * 0.1, y + ry * 0.35, rx * 0.3, ry * 0.25, 0, 0, TAU);
		c.fill();
	} else {
		c.strokeStyle = INK;
		c.lineWidth = Math.max(1.2, S * 0.04);
		c.beginPath();
		c.moveTo(x - rx * 0.8, y);
		c.lineTo(x + rx * 0.8, y);
		c.stroke();
	}
	for (const side of [-1, 1]) {
		for (let k = 0; k < 5; k += 1) {
			const u = (k + (side > 0 ? 0.5 : 0)) / 5 - 0.45;
			const fx = x + u * rx * 1.6;
			const edge = ry * Math.sqrt(Math.max(0, 1 - (u * 1.6) ** 2)) * 0.82;
			const fy = y + side * Math.max(edge, S * 0.03);
			const len = S * (0.11 + 0.08 * open) * (k === 2 ? 1.25 : 1);
			fang(c, fx, fy, len, S * 0.035, side < 0 ? Math.PI / 2 : -Math.PI / 2, BONE, S, 0.5);
		}
	}
}

function icon(c: Ctx, item: 'snare' | 'plasma' | 'armour', x: number, y: number, S: number): void {
	if (item === 'snare') {
		snare(c, x, y, S * 0.85, 0.8);
		return;
	}
	if (item === 'plasma') {
		shadow(c, x, y + S * 0.24, S * 0.3, S * 0.07);
		// a bone stock, a sinew grip, a veined bladder of bile, a bone muzzle
		cel(
			c,
			() => {
				c.beginPath();
				c.moveTo(x - S * 0.38, y - S * 0.02);
				c.quadraticCurveTo(x - S * 0.4, y + S * 0.12, x - S * 0.22, y + S * 0.1);
				c.lineTo(x - S * 0.05, y + S * 0.08);
				c.lineTo(x - S * 0.05, y - S * 0.06);
				c.closePath();
			},
			BONE,
			x - S * 0.22,
			y + S * 0.03,
			S * 0.16,
			S
		);
		cel(
			c,
			() => {
				c.beginPath();
				c.roundRect(x - S * 0.24, y + S * 0.06, S * 0.09, S * 0.2, S * 0.03);
			},
			GUM,
			x - S * 0.2,
			y + S * 0.16,
			S * 0.08,
			S,
			0.8
		);
		bloom(c, x + S * 0.1, y, S * 0.34, '70,200,255', 0.32);
		cel(
			c,
			() => {
				c.beginPath();
				c.ellipse(x + S * 0.08, y - S * 0.01, S * 0.18, S * 0.15, 0, 0, TAU);
			},
			BILE,
			x + S * 0.08,
			y - S * 0.01,
			S * 0.16,
			S
		);
		c.strokeStyle = 'rgba(16,50,90,.6)';
		c.lineWidth = Math.max(0.9, S * 0.02);
		c.beginPath();
		c.moveTo(x - S * 0.05, y - S * 0.06);
		c.quadraticCurveTo(x + S * 0.05, y - S * 0.02, x + S * 0.08, y + S * 0.1);
		c.moveTo(x + S * 0.04, y - S * 0.03);
		c.quadraticCurveTo(x + S * 0.14, y - S * 0.1, x + S * 0.2, y - S * 0.06);
		c.stroke();
		gloss(c, x + S * 0.02, y - S * 0.08, S * 0.05, S * 0.025, 0.85);
		cel(
			c,
			() => {
				c.beginPath();
				c.ellipse(x + S * 0.29, y - S * 0.01, S * 0.06, S * 0.09, 0, 0, TAU);
			},
			BONE,
			x + S * 0.29,
			y - S * 0.01,
			S * 0.07,
			S,
			0.8
		);
		c.fillStyle = '#16304a';
		c.beginPath();
		c.ellipse(x + S * 0.3, y - S * 0.01, S * 0.025, S * 0.045, 0, 0, TAU);
		c.fill();
		return;
	}
	// the armour: a bone carapace, three ribbed plates, two spikes, sutures
	shadow(c, x, y + S * 0.28, S * 0.28, S * 0.07);
	for (const side of [-1, 1]) {
		fang(c, x + side * S * 0.16, y - S * 0.2, S * 0.16, S * 0.045, -Math.PI / 2 + side * 0.35, BONE, S, 0.6);
	}
	const shell = (): void => {
		c.beginPath();
		c.moveTo(x, y - S * 0.3);
		c.quadraticCurveTo(x + S * 0.34, y - S * 0.28, x + S * 0.3, y + S * 0.02);
		c.quadraticCurveTo(x + S * 0.22, y + S * 0.26, x, y + S * 0.33);
		c.quadraticCurveTo(x - S * 0.22, y + S * 0.26, x - S * 0.3, y + S * 0.02);
		c.quadraticCurveTo(x - S * 0.34, y - S * 0.28, x, y - S * 0.3);
		c.closePath();
	};
	cel(c, shell, BONE, x, y, S * 0.3, S);
	c.save();
	shell();
	c.clip();
	for (let k = 0; k < 3; k += 1) {
		const py = y - S * 0.12 + k * S * 0.13;
		c.fillStyle = 'rgba(120,96,64,.45)';
		c.beginPath();
		c.ellipse(x + S * 0.02, py + S * 0.05, S * 0.34, S * 0.03, 0, 0, TAU);
		c.fill();
		c.strokeStyle = INK;
		c.lineWidth = Math.max(1, S * 0.025);
		c.beginPath();
		c.moveTo(x - S * 0.32, py);
		c.quadraticCurveTo(x, py + S * 0.06, x + S * 0.32, py);
		c.stroke();
	}
	c.strokeStyle = 'rgba(60,40,20,.7)';
	c.lineWidth = Math.max(0.8, S * 0.015);
	c.beginPath();
	for (let k = 0; k <= 8; k += 1) c.lineTo(x + (k % 2 ? 0.02 : -0.02) * S, y - S * 0.28 + k * S * 0.07);
	c.stroke();
	c.restore();
	gloss(c, x - S * 0.15, y - S * 0.16, S * 0.06, S * 0.03, 0.75);
}

/** A bolt of bile: a glowing drop, stretched along its flight, two drips behind. */
function bolt(c: Ctx, x: number, y: number, S: number, dir: Dir): void {
	bloom(c, x, y, S * 0.5, '60,190,255', 0.5);
	c.save();
	face(c, x, y, dir);
	for (let k = 2; k >= 1; k -= 1) {
		c.fillStyle = k === 2 ? '#2a8ac8' : '#5ad0f8';
		c.beginPath();
		c.arc(-S * 0.17 * k, 0, S * (0.07 - k * 0.015), 0, TAU);
		c.fill();
		c.beginPath();
		c.arc(-S * 0.17 * k, 0, S * (0.07 - k * 0.015), 0, TAU);
		ink(c, S, 0.5);
	}
	cel(
		c,
		() => {
			c.beginPath();
			c.moveTo(S * 0.17, 0);
			c.quadraticCurveTo(S * 0.1, -S * 0.13, -S * 0.08, -S * 0.1);
			c.quadraticCurveTo(-S * 0.16, 0, -S * 0.08, S * 0.1);
			c.quadraticCurveTo(S * 0.1, S * 0.13, S * 0.17, 0);
			c.closePath();
		},
		BILE,
		S * 0.02,
		0,
		S * 0.14,
		S,
		0.8
	);
	gloss(c, S * 0.02, -S * 0.05, S * 0.04, S * 0.018, 0.9, 0);
	c.restore();
}

/** Bone plates grown over the hero's back (opposite his heading), two short spikes. */
function armour(c: Ctx, x: number, y: number, S: number, dir: Dir): void {
	c.save();
	face(c, x, y, dir);
	for (let k = -1; k <= 1; k += 1) {
		const a = Math.PI + k * 0.75;
		const px = Math.cos(a) * S * 0.33;
		const py = Math.sin(a) * S * 0.33;
		c.save();
		c.translate(px, py);
		c.rotate(a + Math.PI / 2);
		cel(
			c,
			() => {
				c.beginPath();
				c.ellipse(0, 0, S * 0.16, S * 0.075, 0, Math.PI, 0);
				c.closePath();
			},
			BONE,
			0,
			0,
			S * 0.12,
			S,
			0.7
		);
		c.restore();
	}
	fang(c, -S * 0.34, -S * 0.18, S * 0.14, S * 0.04, Math.PI + 0.5, BONE, S, 0.6);
	fang(c, -S * 0.34, S * 0.18, S * 0.14, S * 0.04, Math.PI - 0.5, BONE, S, 0.6);
	c.restore();
}

/**
 * The rush: the orange splits open into a maw lined with fangs, horns burst from its back.
 * `morph` 0 is the plain fruit, 1 the beast at full charge.
 */
function form(c: Ctx, x: number, y: number, S: number, dir: Dir, morph: number, t: number): void {
	const m = Math.max(0, Math.min(1, morph));
	const r = S * (0.34 + 0.05 * m);
	const stretch = 1 + 0.18 * m;
	const gape = 0.35 + 0.55 * m;
	c.save();
	face(c, x, y, dir);
	c.scale(stretch, 1 / stretch);
	for (const side of [-1, 1]) {
		fang(c, -r * 0.55, side * r * 0.6, r * (0.4 + 0.9 * m), r * 0.16, Math.PI + side * 0.9, BONE, S, 0.7);
	}
	const body = (): void => {
		c.beginPath();
		c.arc(0, 0, r, gape * 0.5, TAU - gape * 0.5);
		c.lineTo(r * 0.1, 0);
		c.closePath();
	};
	cel(c, body, PEEL, 0, 0, r, S, 1.1);
	c.save();
	body();
	c.clip();
	for (let i = 0; i < 18; i += 1) {
		const a = (i / 18) * TAU;
		c.fillStyle = i % 3 ? 'rgba(170,52,2,0.4)' : 'rgba(255,214,120,0.55)';
		c.beginPath();
		c.arc(Math.cos(a) * r * 0.84, Math.sin(a) * r * 0.84, S * 0.018, 0, TAU);
		c.fill();
	}
	c.restore();
	// the throat and the fangs on both lips
	c.fillStyle = '#2a0406';
	c.beginPath();
	c.moveTo(r * 0.1, 0);
	c.lineTo(Math.cos(gape * 0.5) * r * 0.92, Math.sin(gape * 0.5) * r * 0.92);
	c.lineTo(Math.cos(gape * 0.5) * r * 0.92, -Math.sin(gape * 0.5) * r * 0.92);
	c.closePath();
	c.fill();
	for (const side of [-1, 1]) {
		for (let k = 0; k < 3; k += 1) {
			const u = 0.35 + k * 0.25;
			const lx = Math.cos(gape * 0.5) * r * u + r * 0.06;
			const ly = side * Math.sin(gape * 0.5) * r * u;
			fang(c, lx, ly, S * (0.06 + 0.07 * m), S * 0.03, side > 0 ? -Math.PI / 2 - 0.3 : Math.PI / 2 + 0.3, BONE, S, 0.5);
		}
	}
	// a furious eye
	c.fillStyle = '#fff8e8';
	c.beginPath();
	c.ellipse(-r * 0.05, -r * 0.5, r * 0.2, r * 0.17, 0, 0, TAU);
	c.fill();
	c.lineWidth = Math.max(1, S * 0.03);
	c.strokeStyle = INK;
	c.stroke();
	c.fillStyle = '#1a0000';
	c.beginPath();
	c.arc(r * 0.04, -r * 0.48, r * 0.09, 0, TAU);
	c.fill();
	c.lineWidth = Math.max(1.2, S * 0.045);
	c.beginPath();
	c.moveTo(-r * 0.32, -r * 0.82);
	c.lineTo(r * 0.18, -r * 0.62);
	c.stroke();
	c.restore();
	void t;
}

/** The hit: bone shards and a splash of blood flung from the point. */
function impact(c: Ctx, x: number, y: number, S: number): void {
	for (let k = 0; k < 6; k += 1) {
		const a = -1.2 + k * 0.48;
		const d = S * (0.35 + 0.12 * (k % 2));
		c.fillStyle = '#b81c18';
		c.beginPath();
		c.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, S * 0.09, S * 0.05, a, 0, TAU);
		c.fill();
		c.beginPath();
		c.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, S * 0.09, S * 0.05, a, 0, TAU);
		ink(c, S, 0.5);
	}
	for (let k = 0; k < 4; k += 1) {
		const a = -0.9 + k * 0.6;
		fang(c, x + Math.cos(a) * S * 0.12, y + Math.sin(a) * S * 0.12, S * 0.22, S * 0.04, a, BONE, S, 0.5);
	}
}

export const FLESH_KIT: Kit = {
	id: 'flesh',
	name: 'Плоть',
	idea: 'Материя самого ада, как стены и кисты. Призраки — содранные бесы со швом и проступающими рёбрами, еда — клыки в обрывке десны, энерджайзер — бьющееся сердце, капкан — пасть, плазма — пузырь жёлчи. В рывке апельсин раскрывается пастью с клыками.',
	food,
	energizer,
	ghost,
	snare,
	icon,
	bolt,
	armour,
	form,
	impact
};
