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
	radial,
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

/** The energizer's heart: hot and pale enough to stand off the red floor. */
const HOT_HEART: Tones = { light: '#ffe2d6', mid: '#ff4d4a', shade: '#a01020' };

/**
 * The split's energizer: a hot heart that beats, its veins glowing, its torn vessels capped with
 * bone rings, set on a dark pool of its own so it never sinks into the flesh of the floor.
 */
function energizer(c: Ctx, x: number, y: number, S: number, t: number): void {
	const beat = 1 + 0.09 * Math.max(0, Math.sin(t * 7)) ** 3;
	const r = S * 0.27 * beat;
	c.fillStyle = 'rgba(10,0,3,.6)';
	c.beginPath();
	c.ellipse(x + S * 0.03, y + S * 0.05, r * 1.25, r * 1.15, 0, 0, TAU);
	c.fill();
	bloom(c, x, y, S * 0.78, '255,130,90', 0.55);
	for (const [vx, vw] of [
		[-0.34, 0.14],
		[0.1, 0.17]
	] as const) {
		cel(
			c,
			() => {
				c.beginPath();
				c.roundRect(x + r * vx, y - r * 1.08, r * vw * 2, r * 0.62, r * 0.1);
			},
			{ light: '#ffd0c8', mid: '#e0706a', shade: '#7a1e26' },
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
				c.ellipse(x + r * (vx + vw), y - r * 1.08, r * vw * 1.15, r * 0.09, 0, 0, TAU);
			},
			BONE,
			x + r * (vx + vw),
			y - r * 1.08,
			r * 0.2,
			S,
			0.5
		);
	}
	cel(c, heartPath(c, x, y, r), HOT_HEART, x, y, r, S, 1.1);
	// glowing veins
	c.save();
	heartPath(c, x, y, r)();
	c.clip();
	c.strokeStyle = 'rgba(120,10,20,.7)';
	c.lineWidth = Math.max(2, S * 0.05);
	const veins = (): void => {
		c.beginPath();
		c.moveTo(x - r * 0.05, y - r * 0.45);
		c.bezierCurveTo(x + r * 0.25, y - r * 0.05, x - r * 0.2, y + r * 0.3, x + r * 0.05, y + r * 0.8);
		c.moveTo(x + r * 0.12, y + r * 0.05);
		c.quadraticCurveTo(x + r * 0.5, y + r * 0.05, x + r * 0.7, y - r * 0.3);
		c.moveTo(x - r * 0.1, y + r * 0.2);
		c.quadraticCurveTo(x - r * 0.5, y + r * 0.15, x - r * 0.75, y - r * 0.25);
	};
	veins();
	c.stroke();
	c.strokeStyle = '#ffe48a';
	c.lineWidth = Math.max(0.9, S * 0.022);
	veins();
	c.stroke();
	c.restore();
	gloss(c, x - r * 0.55, y - r * 0.38, r * 0.22, r * 0.11, 0.9);
	gloss(c, x - r * 0.25, y - r * 0.62, r * 0.06, r * 0.04, 0.8);
}

/** The trap's bone: brighter than the food's, it must read on the floor in every state. */
const JAW: Tones = { light: '#fffaf0', mid: '#ecdcbc', shade: '#9a8462' };

/**
 * The snare: two bone jaws on sinew hinges round a dark pit. Open, the jaws stand wide with their
 * fangs over the pit's pale rim; shut, they meet and the fangs interlock. A dark pool under all of
 * it parts it from the floor.
 */
function snare(c: Ctx, x: number, y: number, S: number, open: number): void {
	const R = S * 0.44;
	const ry = R * (0.16 + 0.62 * open);
	c.fillStyle = 'rgba(10,0,3,.55)';
	c.beginPath();
	c.ellipse(x + S * 0.03, y + S * 0.05, R * 1.12, ry + S * 0.16, 0, 0, TAU);
	c.fill();
	// the pit with its pale rim
	if (open > 0.05) {
		c.beginPath();
		c.ellipse(x, y, R * 0.74, ry * 0.8, 0, 0, TAU);
		c.fillStyle = radial(c, x, y + ry * 0.2, 0, R * 0.8, ['#4a0a10', '#120204']);
		c.fill();
		c.lineWidth = Math.max(1.6, S * 0.05);
		c.strokeStyle = '#d8b8a0';
		c.stroke();
	}
	// the sinew hinges
	for (const sx of [-1, 1]) {
		cel(
			c,
			() => {
				c.beginPath();
				c.ellipse(x + sx * R * 0.96, y, S * 0.1, S * 0.08, 0, 0, TAU);
			},
			GUM,
			x + sx * R * 0.96,
			y,
			S * 0.08,
			S,
			0.8
		);
	}
	for (const side of [-1, 1]) {
		// a jaw: a thick bone bow
		const bow = (): void => {
			c.beginPath();
			c.ellipse(x, y, R, ry + S * 0.05, 0, side < 0 ? Math.PI : 0, side < 0 ? TAU : Math.PI);
			c.ellipse(x, y, R * 0.76, ry * 0.8, 0, side < 0 ? TAU : Math.PI, side < 0 ? Math.PI : 0, true);
			c.closePath();
		};
		cel(c, bow, JAW, x, y + side * ry * 0.7, R * 0.7, S, 1.1);
		for (let k = 0; k < 6; k += 1) {
			const u = (k + (side > 0 ? 0.5 : 0) + 0.25) / 6.5;
			const a = side < 0 ? Math.PI + u * Math.PI : u * Math.PI;
			const fx = x + Math.cos(a) * R * 0.78;
			const fy = y + Math.sin(a) * ry * 0.82;
			const toward = Math.atan2(y - fy, x - fx);
			const len = S * (0.1 + 0.08 * open) * (0.75 + 0.25 * Math.sin(u * Math.PI));
			fang(c, fx, fy, len, S * 0.032, toward, JAW, S, 0.55);
		}
	}
	gloss(c, x - R * 0.55, y - ry - S * 0.02, S * 0.07, S * 0.02, 0.8, 0.2);
}

/** Pickup icons in the -50..50 box of `doomItems`, ink 6: drawn at the size of the current ones. */
function inBox(c: Ctx, x: number, y: number, S: number, paint: (c: Ctx) => void): void {
	c.save();
	c.translate(x, y);
	const k = (S * 0.9) / 100;
	c.scale(k, k);
	c.lineJoin = 'round';
	c.lineCap = 'round';
	paint(c);
	c.restore();
}

/** A part in the icon box: its fill, then a 6-unit ink line, as `doomItems` does. */
function piece(c: Ctx, path: () => void, fill: string | CanvasGradient, w = 6): void {
	path();
	c.fillStyle = fill;
	c.fill();
	path();
	c.lineWidth = w;
	c.strokeStyle = INK;
	c.stroke();
}

/** A cel part in the icon box. */
function celPiece(c: Ctx, path: () => void, t: Tones, cx: number, cy: number, r: number, w = 6): void {
	path();
	c.fillStyle = t.mid;
	c.fill();
	c.save();
	path();
	c.clip();
	c.fillStyle = t.light;
	c.beginPath();
	c.ellipse(cx - r * 0.3, cy - r * 0.4, r * 0.9, r * 0.55, -0.3, 0, TAU);
	c.fill();
	c.fillStyle = t.shade;
	c.beginPath();
	c.rect(cx - r * 3, cy - r * 3, r * 6, r * 6);
	c.ellipse(cx - r * 0.2, cy - r * 0.25, r * 1.15, r * 1.1, 0, 0, TAU);
	c.fill('evenodd');
	c.restore();
	path();
	c.lineWidth = w;
	c.strokeStyle = INK;
	c.stroke();
}

/**
 * The plasma: a bile cannon as heavy as the BFG. A flesh body bound by bone ribs, a vertebra grip,
 * a swollen bladder of glowing bile on its back, a ringed bone barrel ending in a fanged mouth that
 * holds the charge.
 */
function paintPlasma(c: Ctx): void {
	// the grip: three vertebrae
	for (let k = 0; k < 3; k += 1) {
		celPiece(
			c,
			() => {
				c.beginPath();
				c.roundRect(-30 + k * 2, 12 + k * 10, 16, 11, 4);
			},
			BONE,
			-22 + k * 2,
			17 + k * 10,
			9,
			5
		);
	}
	// the body
	const body = (): void => {
		c.beginPath();
		c.moveTo(-46, -4);
		c.quadraticCurveTo(-46, -20, -28, -20);
		c.lineTo(10, -18);
		c.quadraticCurveTo(20, -16, 20, -2);
		c.lineTo(20, 10);
		c.quadraticCurveTo(18, 20, 6, 20);
		c.lineTo(-30, 20);
		c.quadraticCurveTo(-46, 20, -46, -4);
		c.closePath();
	};
	celPiece(c, body, { light: '#f08a86', mid: '#b23c44', shade: '#4e0c16' }, -12, 0, 30);
	// bone ribs binding it
	for (const bx of [-30, -14, 2]) {
		celPiece(
			c,
			() => {
				c.beginPath();
				c.moveTo(bx - 4, -22);
				c.quadraticCurveTo(bx + 6, 0, bx - 4, 22);
				c.lineTo(bx + 4, 22);
				c.quadraticCurveTo(bx + 14, 0, bx + 4, -22);
				c.closePath();
			},
			BONE,
			bx + 3,
			0,
			10,
			4.5
		);
	}
	// the bladder of bile on its back
	bloom(c, -14, -30, 34, '70,210,255', 0.55);
	const sac = (): void => {
		c.beginPath();
		c.ellipse(-14, -30, 24, 15, -0.08, 0, TAU);
	};
	celPiece(c, sac, BILE, -14, -30, 22);
	c.save();
	sac();
	c.clip();
	c.fillStyle = 'rgba(240,255,255,.85)';
	c.beginPath();
	c.arc(-6, -28, 6, 0, TAU);
	c.fill();
	c.strokeStyle = 'rgba(20,70,120,.7)';
	c.lineWidth = 2.4;
	c.beginPath();
	c.moveTo(-34, -26);
	c.quadraticCurveTo(-20, -36, -8, -24);
	c.moveTo(-22, -42);
	c.quadraticCurveTo(-14, -32, 2, -40);
	c.stroke();
	c.restore();
	gloss(c, -24, -38, 7, 3, 0.9, -0.2);
	// the barrel: bone rings widening to the muzzle
	for (let k = 0; k < 3; k += 1) {
		const bx = 20 + k * 8;
		const h = 12 + k * 2;
		celPiece(
			c,
			() => {
				c.beginPath();
				c.roundRect(bx, -h, 9, h * 2, 3);
			},
			BONE,
			bx + 4,
			0,
			h,
			5
		);
	}
	// the mouth: lips, fangs, the charge
	celPiece(
		c,
		() => {
			c.beginPath();
			c.ellipse(46, 0, 9, 23, 0, 0, TAU);
		},
		{ light: '#f08a86', mid: '#b23c44', shade: '#4e0c16' },
		46,
		0,
		16,
		5
	);
	bloom(c, 47, 0, 34, '80,220,255', 0.75);
	piece(
		c,
		() => {
			c.beginPath();
			c.ellipse(47, 0, 5.5, 15, 0, 0, TAU);
		},
		radial(c, 47, 0, 1, 16, ['#f4ffff', '#5ae0ff', '#0a5a8a']),
		4
	);
	for (const fy of [-13, -5, 5, 13]) {
		piece(
			c,
			() => {
				c.beginPath();
				c.moveTo(42, fy - 3);
				c.lineTo(50, fy);
				c.lineTo(42, fy + 3);
				c.closePath();
			},
			'#fff6e4',
			2.5
		);
	}
	gloss(c, -32, -10, 9, 3, 0.7, -0.1);
}

/**
 * The armour: a cuirass of bone. A sternum down the middle, ribs curving to the sides over dark
 * leather, shoulder blades for pauldrons, straps with bone buckles; a piece of war gear, not a shell.
 */
function paintArmour(c: Ctx): void {
	const leather = (): void => {
		c.beginPath();
		c.moveTo(-30, -30);
		c.quadraticCurveTo(-12, -22, -10, -36);
		c.lineTo(10, -36);
		c.quadraticCurveTo(12, -22, 30, -30);
		c.lineTo(34, 6);
		c.quadraticCurveTo(30, 34, 0, 44);
		c.quadraticCurveTo(-30, 34, -34, 6);
		c.closePath();
	};
	celPiece(c, leather, { light: '#8a5a44', mid: '#5a3424', shade: '#2a140c' }, 0, 4, 34);
	// the ribs over it
	for (let k = 0; k < 4; k += 1) {
		const y0 = -18 + k * 13;
		for (const side of [-1, 1]) {
			celPiece(
				c,
				() => {
					c.beginPath();
					c.moveTo(side * 5, y0);
					c.quadraticCurveTo(side * 26, y0 - 4, side * (31 - k * 2), y0 + 9);
					c.lineTo(side * (27 - k * 2), y0 + 12);
					c.quadraticCurveTo(side * 22, y0 + 4, side * 5, y0 + 6);
					c.closePath();
				},
				JAW,
				side * 18,
				y0 + 5,
				12,
				4
			);
		}
	}
	// the sternum
	celPiece(
		c,
		() => {
			c.beginPath();
			c.roundRect(-6, -28, 12, 62, 5);
		},
		JAW,
		0,
		2,
		16,
		5
	);
	// the shoulder blades and their spikes
	for (const side of [-1, 1]) {
		fang(c, side * 40, -38, 16, 4, -Math.PI / 2 + side * 0.5, JAW, 100, 0.9);
		celPiece(
			c,
			() => {
				c.beginPath();
				c.moveTo(side * 16, -40);
				c.quadraticCurveTo(side * 46, -48, side * 48, -26);
				c.quadraticCurveTo(side * 40, -12, side * 24, -20);
				c.closePath();
			},
			JAW,
			side * 34,
			-32,
			16,
			5
		);
	}
	// straps and buckles
	for (const side of [-1, 1]) {
		piece(
			c,
			() => {
				c.beginPath();
				c.rect(side * 34 - 4, 4, 8, 16);
			},
			'#3a1c10',
			4
		);
		celPiece(
			c,
			() => {
				c.beginPath();
				c.roundRect(side * 34 - 6, 8, 12, 8, 2);
			},
			JAW,
			side * 34,
			12,
			6,
			3
		);
	}
	gloss(c, -2, -20, 2.5, 8, 0.85, 0);
}

function icon(c: Ctx, item: 'snare' | 'plasma' | 'armour', x: number, y: number, S: number): void {
	if (item === 'snare') {
		snare(c, x, y, S * 0.82, 0.85);
		return;
	}
	shadow(c, x, y + S * 0.32, S * 0.32, S * 0.07);
	inBox(c, x, y, S, item === 'plasma' ? paintPlasma : paintArmour);
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

/**
 * The armour on the hero: the cuirass's ribs closing round his back (opposite his heading) and a
 * shoulder blade with its spike on top, the same pieces as the pickup.
 */
function armour(c: Ctx, x: number, y: number, S: number, dir: Dir): void {
	c.save();
	c.translate(x, y);
	if (dir === 'LEFT') c.scale(-1, 1);
	else c.rotate(dir === 'UP' ? -Math.PI / 2 : dir === 'DOWN' ? Math.PI / 2 : 0);
	const R = S * 0.36;
	// the ribs: bone bands hugging the back half
	for (let k = -2; k <= 2; k += 1) {
		const a = Math.PI + k * 0.42;
		const a0 = a - 0.16;
		const a1 = a + 0.16;
		cel(
			c,
			() => {
				c.beginPath();
				c.arc(0, 0, R * 1.06, a0, a1);
				c.arc(0, 0, R * 0.86, a1, a0, true);
				c.closePath();
			},
			JAW,
			Math.cos(a) * R * 0.96,
			Math.sin(a) * R * 0.96,
			S * 0.08,
			S,
			0.75
		);
	}
	// the spine strap joining them
	c.beginPath();
	c.arc(0, 0, R * 1.08, Math.PI - 0.95, Math.PI + 0.95);
	c.strokeStyle = INK;
	c.lineWidth = Math.max(1.4, S * 0.05);
	c.stroke();
	c.strokeStyle = '#5a3424';
	c.lineWidth = Math.max(0.8, S * 0.025);
	c.stroke();
	// the shoulder blade on top, its spike up and back
	fang(c, -R * 0.55, -R * 1.02, S * 0.17, S * 0.045, -Math.PI / 2 - 0.55, JAW, S, 0.7);
	cel(
		c,
		() => {
			c.beginPath();
			c.moveTo(-R * 0.05, -R * 0.98);
			c.quadraticCurveTo(-R * 0.6, -R * 1.32, -R * 1.02, -R * 0.75);
			c.quadraticCurveTo(-R * 0.7, -R * 0.62, -R * 0.1, -R * 0.82);
			c.closePath();
		},
		JAW,
		-R * 0.55,
		-R * 0.95,
		S * 0.14,
		S,
		0.8
	);
	c.restore();
}

/**
 * The rush, the same for both heroes: the hero becomes a horned bone skull, a ram that charges with
 * its jaw open and its eye burning. `morph` grows it in (0 nothing, 1 whole); the caller fades the
 * hero out under it. Facing left it is mirrored, never upside down.
 */
function form(c: Ctx, x: number, y: number, S: number, dir: Dir, morph: number, t: number): void {
	const m = Math.max(0, Math.min(1, morph));
	if (m <= 0) return;
	const r = S * 0.4;
	c.save();
	c.globalAlpha *= Math.min(1, m * 1.4);
	c.translate(x, y);
	if (dir === 'LEFT') c.scale(-1, 1);
	else c.rotate(dir === 'UP' ? -Math.PI / 2 : dir === 'DOWN' ? Math.PI / 2 : 0);
	const k = 0.55 + 0.45 * m;
	c.scale(k, k);
	bloom(c, r * 0.2, -r * 0.15, S * 0.6, '255,120,60', 0.35 * m);
	// the far horn behind the skull
	const horn = (side: number, len: number, w: number, tone: Tones): void => {
		const path = (): void => {
			c.beginPath();
			c.moveTo(-r * 0.35, side * r * 0.2 - r * 0.45 + w);
			c.bezierCurveTo(-r * 1.1, -r * 1.25, r * 0.4, -r * 1.55, r * (0.5 + len), -r * (0.75 - side * 0.1));
			c.bezierCurveTo(r * 0.2, -r * 1.2, -r * 0.8, -r * 0.95, -r * 0.05, side * r * 0.2 - r * 0.45);
			c.closePath();
		};
		cel(c, path, tone, 0, -r * 1.05, r * 0.7, S, 0.9);
		// the horn's ridges
		c.strokeStyle = 'rgba(90,70,40,.55)';
		c.lineWidth = Math.max(0.8, S * 0.02);
		for (let j = 1; j <= 3; j += 1) {
			const u = j / 4;
			c.beginPath();
			c.arc(-r * 0.5 + u * r * 1.2, -r * 1.05 - Math.sin(u * Math.PI) * r * 0.2, r * 0.12, 0.3, 2.6);
			c.stroke();
		}
	};
	horn(-1, 0.45, r * 0.15, { light: '#d8c8a8', mid: '#b4a07c', shade: '#6a5838' });
	// the jaw, hinged under the skull, open as it charges
	const gape = 0.15 + 0.35 * m;
	c.save();
	c.translate(-r * 0.25, r * 0.35);
	c.rotate(gape);
	cel(
		c,
		() => {
			c.beginPath();
			c.moveTo(-r * 0.25, -r * 0.05);
			c.lineTo(r * 0.95, r * 0.0);
			c.quadraticCurveTo(r * 1.0, r * 0.3, r * 0.75, r * 0.32);
			c.lineTo(-r * 0.15, r * 0.28);
			c.closePath();
		},
		JAW,
		r * 0.35,
		r * 0.15,
		r * 0.55,
		S
	);
	for (let j = 0; j < 4; j += 1) fang(c, r * (0.25 + j * 0.2), r * 0.02, S * 0.08, S * 0.025, -Math.PI / 2, JAW, S, 0.5);
	c.restore();
	// the cranium and the snout
	const skull = (): void => {
		c.beginPath();
		c.moveTo(-r * 0.95, r * 0.05);
		c.bezierCurveTo(-r * 1.0, -r * 0.85, r * 0.2, -r * 0.95, r * 0.55, -r * 0.45);
		c.lineTo(r * 1.05, -r * 0.2);
		c.quadraticCurveTo(r * 1.15, r * 0.15, r * 0.9, r * 0.3);
		c.lineTo(-r * 0.2, r * 0.42);
		c.quadraticCurveTo(-r * 0.85, r * 0.5, -r * 0.95, r * 0.05);
		c.closePath();
	};
	cel(c, skull, JAW, 0, -r * 0.15, r * 0.9, S, 1.1);
	c.save();
	skull();
	c.clip();
	// cracks and the nasal hollow
	c.strokeStyle = 'rgba(80,60,30,.7)';
	c.lineWidth = Math.max(0.9, S * 0.022);
	c.beginPath();
	c.moveTo(-r * 0.4, -r * 0.75);
	c.lineTo(-r * 0.25, -r * 0.45);
	c.lineTo(-r * 0.4, -r * 0.3);
	c.stroke();
	c.fillStyle = '#2a0608';
	c.beginPath();
	c.moveTo(r * 0.78, -r * 0.12);
	c.lineTo(r * 0.92, r * 0.02);
	c.lineTo(r * 0.72, r * 0.06);
	c.closePath();
	c.fill();
	c.restore();
	// the upper teeth
	for (let j = 0; j < 4; j += 1) fang(c, r * (0.1 + j * 0.22), r * 0.36, S * 0.09, S * 0.028, Math.PI / 2, JAW, S, 0.5);
	// the eye socket and its burning eye
	c.fillStyle = '#1a0204';
	c.beginPath();
	c.ellipse(r * 0.22, -r * 0.3, r * 0.24, r * 0.19, -0.2, 0, TAU);
	c.fill();
	ink(c, S, 0.6);
	bloom(c, r * 0.25, -r * 0.3, S * 0.3, '255,170,60', 0.8 * m);
	c.fillStyle = '#ffe48a';
	c.beginPath();
	c.ellipse(r * 0.27, -r * 0.3, r * 0.1, r * 0.08, 0, 0, TAU);
	c.fill();
	// the near horn over all of it
	horn(1, 0.6, r * 0.2, JAW);
	gloss(c, -r * 0.45, -r * 0.55, r * 0.18, r * 0.07, 0.8, -0.5);
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
	idea: 'Материя самого ада, как стены и кисты. Призраки — содранные бесы со швом и проступающими рёбрами, еда — клыки в обрывке десны. Правка 1: энерджайзер — раскалённое сердце на тёмной подложке, капкан — светлые костяные челюсти над тёмной ямой, плазма — жёлчемёт весом с BFG, броня — костяная кираса, рывок — оба героя становятся рогатым черепом-тараном.',
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
