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
	// the hero's size, horns included within the tile
	// a little smaller than the hero, a long ragged skirt (the owner, 2026-11-28)
	const w = S * 0.28;
	return { w, domeY: -w * 0.4, hem: w * 1.3, feet: 5, torn: 0.6, seed: 3 + i * 1.7 };
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
	drawHorns(c, 0, 0, shape, 0.62, { length: 0.32, curl: 0.16, bone: fright ? ['#e4e6f4', '#8a8ea8'] : ['#f1e4cc', '#9c8a72'], ember: null }, 0);
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

/** Raw muscle, kept light enough to stand off the red floor. */
const MEAT: Tones = { light: '#ffc8bc', mid: '#e2645e', shade: '#7a1c26' };
/** The Maw's charge: hell's own fire, not the old green. */
const EMBER: readonly string[] = ['#fff6d0', '#ffb040', '#c84010'];

/**
 * The Maw (Жерло), the heavy gun: a thick barrel of flesh bound by two wide bone rings, a bone stock,
 * and the muzzle a round toothed maw with the charge burning inside it. The biggest, heaviest of
 * the three: it fills its box. Kept inside -46..46.
 */
function paintMaw(c: Ctx): void {
	celPiece(
		c,
		() => {
			c.beginPath();
			c.moveTo(-46, -6);
			c.lineTo(-26, -12);
			c.lineTo(-22, 14);
			c.lineTo(-44, 20);
			c.closePath();
		},
		BONE,
		-34,
		4,
		16
	);
	celPiece(
		c,
		() => {
			c.beginPath();
			c.roundRect(-28, -20, 50, 40, 16);
		},
		MEAT,
		-4,
		0,
		30
	);
	for (const bx of [-18, 2]) {
		celPiece(
			c,
			() => {
				c.beginPath();
				c.roundRect(bx, -24, 11, 48, 5);
			},
			JAW,
			bx + 5,
			0,
			16
		);
	}
	// the maw: lips, a ring of teeth, the fire inside
	celPiece(
		c,
		() => {
			c.beginPath();
			c.ellipse(30, 0, 15, 26, 0, 0, TAU);
		},
		MEAT,
		30,
		0,
		22
	);
	bloom(c, 32, 0, 40, '255,150,50', 0.75);
	piece(
		c,
		() => {
			c.beginPath();
			c.ellipse(32, 0, 9, 18, 0, 0, TAU);
		},
		radial(c, 32, 0, 1, 18, EMBER),
		4
	);
	for (const [ty, a] of [
		[-14, 0.5],
		[-4, 0.15],
		[6, -0.15],
		[15, -0.5]
	] as const) {
		piece(
			c,
			() => {
				c.beginPath();
				c.moveTo(22, ty - 4);
				c.lineTo(31, ty + a * 4);
				c.lineTo(22, ty + 4);
				c.closePath();
			},
			'#fff6e4',
			3
		);
	}
	gloss(c, -14, -12, 10, 3.5, 0.75, -0.1);
}

/**
 * The Sting (Жало), the middle gun: a bile sac on a bone grip and a long curved stinger for a barrel,
 * its point glowing. Slimmer and lighter than the Maw. Kept inside -46..46.
 */
function paintSting(c: Ctx): void {
	celPiece(
		c,
		() => {
			c.beginPath();
			c.moveTo(-26, 6);
			c.lineTo(-14, 6);
			c.lineTo(-18, 34);
			c.lineTo(-30, 34);
			c.closePath();
		},
		BONE,
		-22,
		20,
		12
	);
	bloom(c, -22, -4, 26, '70,210,255', 0.5);
	celPiece(
		c,
		() => {
			c.beginPath();
			c.ellipse(-22, -4, 18, 15, 0, 0, TAU);
		},
		BILE,
		-22,
		-4,
		17
	);
	gloss(c, -28, -10, 6, 3, 0.9, -0.3);
	// the stinger: segments narrowing toward the point
	for (let k = 0; k < 4; k += 1) {
		const x0 = -6 + k * 12;
		const h = 10 - k * 2;
		celPiece(
			c,
			() => {
				c.beginPath();
				c.moveTo(x0, -h - k * 1.5);
				c.lineTo(x0 + 13, -h + 2 - (k + 1) * 1.5);
				c.lineTo(x0 + 13, h - 2 - (k + 1) * 1.5);
				c.lineTo(x0, h - k * 1.5);
				c.closePath();
			},
			JAW,
			x0 + 6,
			-k * 1.5,
			10,
			4.5
		);
	}
	bloom(c, 44, -8, 18, '80,220,255', 0.8);
	piece(
		c,
		() => {
			c.beginPath();
			c.moveTo(42, -13);
			c.lineTo(48, -8);
			c.lineTo(42, -3);
			c.closePath();
		},
		'#bff4ff',
		3.5
	);
}

/**
 * The berserk, the light weapon: a raw fist of muscle with bone spikes over its knuckles. Compact,
 * the smallest of the three. Kept inside -46..46.
 */
function paintBerserk(c: Ctx): void {
	c.scale(1.18, 1.18);
	const fist = (): void => {
		c.beginPath();
		c.moveTo(-26, 30);
		c.quadraticCurveTo(-32, 6, -24, -10);
		c.quadraticCurveTo(-4, -22, 22, -14);
		c.quadraticCurveTo(32, -4, 28, 16);
		c.quadraticCurveTo(20, 34, -26, 30);
		c.closePath();
	};
	celPiece(c, fist, MEAT, 0, 6, 28);
	// the finger joints
	c.strokeStyle = INK;
	c.lineWidth = 4;
	for (const fx of [-12, 0, 12]) {
		c.beginPath();
		c.moveTo(fx, -14);
		c.quadraticCurveTo(fx + 3, -2, fx, 8);
		c.stroke();
	}
	// the thumb across the front
	celPiece(
		c,
		() => {
			c.beginPath();
			c.moveTo(-24, 10);
			c.quadraticCurveTo(-4, 4, 12, 14);
			c.quadraticCurveTo(10, 22, -20, 22);
			c.closePath();
		},
		MEAT,
		-6,
		14,
		14,
		5
	);
	// bone spikes over the knuckles
	for (const [kx, a] of [
		[-14, -1.9],
		[-1, -1.62],
		[12, -1.35]
	] as const) {
		fang(c, kx, -16, 20, 5, a, JAW, 100, 0.8);
	}
	gloss(c, -16, -4, 7, 3, 0.7, -0.4);
}

function icon(c: Ctx, item: 'bfg' | 'plasma' | 'berserk', x: number, y: number, S: number): void {
	shadow(c, x, y + S * 0.34, S * 0.3, S * 0.06);
	inBox(c, x, y, S, item === 'bfg' ? paintMaw : item === 'plasma' ? paintSting : paintBerserk);
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

const VORTEX: readonly string[] = ['#ffb4a0', '#e0403a', '#9a1420', '#4a060c'];

/**
 * The rush, the same for both heroes: the hero spins up into a whirlwind of blood, the boss's lava
 * ball's opposite (that one rolls and cools; this one spins and sprays). A disc of crimson spiral
 * bands with bone shards caught in them, a dark eye at the centre, drops flung off its rim, all
 * leaning into the heading. `morph` grows it in (the caller fades the hero out under it); `t` turns
 * it. Kept inside the tile.
 */
function form(c: Ctx, x: number, y: number, S: number, dir: Dir, morph: number, t: number): void {
	const m = Math.max(0, Math.min(1, morph));
	if (m <= 0) return;
	const R = S * 0.42 * (0.5 + 0.5 * m);
	const spin = t * 9;
	const [dx, dy] = VEC[dir];
	c.save();
	c.globalAlpha *= Math.min(1, m * 1.5);
	c.translate(x, y);
	// the dark pool under it and a red bloom
	c.fillStyle = 'rgba(10,0,3,.5)';
	c.beginPath();
	c.ellipse(S * 0.03, S * 0.05, R * 1.02, R * 0.98, 0, 0, TAU);
	c.fill();
	bloom(c, 0, 0, R * 1.5, '255,70,50', 0.35 * m);
	// the disc, squashed a little along the heading as it charges
	c.save();
	c.rotate(Math.atan2(dy, dx));
	c.scale(1 + 0.1 * m, 1 - 0.08 * m);
	const disc = (): void => {
		c.beginPath();
		c.arc(0, 0, R, 0, TAU);
	};
	disc();
	c.fillStyle = VORTEX[2];
	c.fill();
	c.save();
	disc();
	c.clip();
	// spiral bands, light to dark toward the eye
	for (let arm = 0; arm < 3; arm += 1) {
		for (let band = 0; band < 3; band += 1) {
			c.beginPath();
			for (let k = 0; k <= 40; k += 1) {
				const u = k / 40;
				const a = spin + arm * ((Math.PI * 2) / 3) + u * Math.PI * 1.6;
				const rr = R * (1.05 - u * 0.85) - band * R * 0.06;
				const px = Math.cos(a) * rr;
				const py = Math.sin(a) * rr;
				if (k === 0) c.moveTo(px, py);
				else c.lineTo(px, py);
			}
			c.strokeStyle = VORTEX[band];
			c.lineWidth = R * (0.26 - band * 0.06);
			c.lineCap = 'round';
			c.stroke();
		}
	}
	// the lit side and the shade, as every round thing in the hell
	c.fillStyle = 'rgba(255,230,210,.22)';
	c.beginPath();
	c.ellipse(-R * 0.3, -R * 0.35, R * 0.8, R * 0.55, -0.5, 0, TAU);
	c.fill();
	c.fillStyle = 'rgba(30,0,6,.35)';
	c.beginPath();
	c.rect(-R * 2, -R * 2, R * 4, R * 4);
	c.ellipse(-R * 0.15, -R * 0.15, R * 1.1, R * 1.1, 0, 0, TAU);
	c.fill('evenodd');
	// bone shards caught in the flow
	for (let k = 0; k < 5; k += 1) {
		const a = spin * 1.2 + k * 1.26;
		const rr = R * (0.45 + 0.1 * (k % 3));
		c.save();
		c.translate(Math.cos(a) * rr, Math.sin(a) * rr);
		c.rotate(a + Math.PI / 2);
		cel(
			c,
			() => {
				c.beginPath();
				c.moveTo(-R * 0.12, 0);
				c.lineTo(0, -R * 0.06);
				c.lineTo(R * 0.12, 0);
				c.lineTo(0, R * 0.05);
				c.closePath();
			},
			JAW,
			0,
			0,
			R * 0.1,
			S,
			0.45
		);
		c.restore();
	}
	c.restore();
	disc();
	ink(c, S, 1.1);
	// the eye of the storm
	c.beginPath();
	c.arc(0, 0, R * 0.2, 0, TAU);
	c.fillStyle = radial(c, 0, 0, 0, R * 0.2, ['#2a0004', '#120002']);
	c.fill();
	ink(c, S, 0.6);
	c.restore();
	// drops flung off the rim, behind the heading
	for (let k = 0; k < 4; k += 1) {
		const a = Math.atan2(-dy, -dx) + (k - 1.5) * 0.45;
		const d = R * (1.02 + 0.06 * (k % 2));
		c.beginPath();
		c.ellipse(Math.cos(a) * d, Math.sin(a) * d, S * 0.035, S * 0.022, a, 0, TAU);
		c.fillStyle = '#c8241c';
		c.fill();
		ink(c, S, 0.4);
	}
	gloss(c, -R * 0.45, -R * 0.5, R * 0.16, R * 0.06, 0.75);
	c.restore();
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
	idea: 'Материя самого ада, как стены и кисты. Призраки — содранные бесы со швом и проступающими рёбрами, еда — клыки в обрывке десны. Энерджайзер — раскалённое сердце на тёмной подложке, капкан — светлые костяные челюсти над тёмной ямой. Правка 2: подбор капкана — петля из жилы на костяной перекладине, плазма и броня крупнее и проще, рывок — оба героя раскручиваются в кровавый смерч.',
	food,
	energizer,
	ghost,
	icon,
	bolt,
	form,
	impact
};
