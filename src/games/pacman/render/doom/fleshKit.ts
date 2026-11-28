// The hell's «Плоть» kit (the owner's pick in the `hell-kit` prototype, 2026-11-28): the food (a fang in
// a scrap of gum), the split's energizer (a hot heart), its four equal flayed ghosts, the Sting's bolts,
// the weapons' pickup icons (the Maw «Жерло» and the Sting «Жало», painted in the -50..50 box of
// `doomItems`) and the berserk's rush (the hero spun up into a whirlwind of blood). Drawn with
// `fleshPaint`: light from the upper left, cel bands, an ink line; no red in the items.
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
	linear,
	radial,
	rim,
	shadow,
	type Ctx,
	type Dir,
	type GhostShape,
	type Tones
} from './fleshPaint';

const BONE: Tones = { light: '#fff6e4', mid: '#e6d4b0', shade: '#a8916a' };
const GUM: Tones = { light: '#f6a8a4', mid: '#c4545a', shade: '#6a1a22' };
const BILE: Tones = { light: '#dcfbff', mid: '#46c2ee', shade: '#16608e' };
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
	// a little smaller than the hero, a ragged skirt a little longer than the arcade's, not tall
	const w = S * 0.3;
	return { w, domeY: -w * 0.2, hem: w * 1.1, feet: 5, torn: 0.6, seed: 3 + i * 1.7 };
}

/** The flayed ghost: body, ribs in its shade, a stitched seam, bone horns, a fanged grin. */
export function drawFleshGhost(
	c: Ctx,
	i: number,
	x: number,
	y: number,
	S: number,
	dir: Dir,
	fright: boolean,
	t: number
): void {
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
	drawHorns(
		c,
		0,
		0,
		shape,
		0.62,
		{
			length: 0.32,
			curl: 0.16,
			bone: fright ? ['#e4e6f4', '#8a8ea8'] : ['#f1e4cc', '#9c8a72'],
			ember: null
		},
		0
	);
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
		for (let k = 0; k <= 6; k += 1)
			c.lineTo(-w * 0.5 + (k * w) / 6, domeY + w * 0.78 + (k % 2 ? -1 : 1) * w * 0.07);
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
export function drawFleshFood(c: Ctx, x: number, y: number, S: number): void {
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
		c.bezierCurveTo(
			x - r * 1.55,
			y - r * 0.05,
			x - r * 0.85,
			y - r * 1.2,
			x - r * 0.05,
			y - r * 0.5
		);
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
export function drawFleshEnergizer(c: Ctx, x: number, y: number, S: number, t: number): void {
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
		c.bezierCurveTo(
			x + r * 0.25,
			y - r * 0.05,
			x - r * 0.2,
			y + r * 0.3,
			x + r * 0.05,
			y + r * 0.8
		);
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
function celPiece(
	c: Ctx,
	path: () => void,
	t: Tones,
	cx: number,
	cy: number,
	r: number,
	w = 6
): void {
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
/** The weapons' bone: pale, so the pickups stand off the red floor (no red in the items: the owner). */
const HORN: Tones = { light: '#fffaf0', mid: '#e4d4b0', shade: '#8a7452' };
/** The Maw's charge: hell's own fire, not the old green. */
const EMBER: readonly string[] = ['#fff6d0', '#ffb040', '#c84010'];
/** The Sting's venom. */
const VENOM: Tones = { light: '#e8fdff', mid: '#4ed0f4', shade: '#14628e' };

/** Gunmetal, the hell's iron the way the pickups' guns are drawn: a lit top, a dark belly. */
const IRON: readonly string[] = ['#a8b0ba', '#5c6470', '#2a3038'];

/**
 * The Maw (Жерло), the heavy gun: a short, wide cannon. A bone stock and carry handle, a broad iron
 * body with glowing vents, a thick barrel with a bone ring, and the muzzle a flared bone bell with
 * the charge burning in it. It fills its box. Kept inside -46..46.
 */
export function paintMaw(c: Ctx): void {
	// the stock
	celPiece(
		c,
		() => {
			c.beginPath();
			c.moveTo(-46, -6);
			c.lineTo(-30, -12);
			c.lineTo(-30, 14);
			c.lineTo(-44, 20);
			c.closePath();
		},
		HORN,
		-38,
		4,
		14
	);
	// the grip
	piece(
		c,
		() => {
			c.beginPath();
			c.moveTo(-16, 16);
			c.lineTo(-4, 16);
			c.lineTo(-8, 40);
			c.lineTo(-20, 40);
			c.closePath();
		},
		linear(c, 0, 16, 0, 40, [IRON[1], IRON[2]])
	);
	// the carry handle, bone
	celPiece(
		c,
		() => {
			c.beginPath();
			c.moveTo(-24, -16);
			c.quadraticCurveTo(-12, -38, 4, -16);
			c.lineTo(-2, -16);
			c.quadraticCurveTo(-12, -30, -18, -16);
			c.closePath();
		},
		HORN,
		-10,
		-24,
		12,
		5
	);
	// the body
	piece(
		c,
		() => {
			c.beginPath();
			c.roundRect(-32, -18, 46, 36, 9);
		},
		linear(c, 0, -18, 0, 18, IRON)
	);
	// glowing vents
	bloom(c, -12, 2, 22, '255,150,50', 0.45);
	c.fillStyle = '#ffb040';
	for (let k = 0; k < 3; k += 1) {
		c.beginPath();
		c.roundRect(-24 + k * 10, -6, 5, 14, 2);
		c.fill();
	}
	// the barrel and its bone ring
	piece(
		c,
		() => {
			c.beginPath();
			c.rect(12, -12, 18, 24);
		},
		linear(c, 0, -12, 0, 12, IRON)
	);
	celPiece(
		c,
		() => {
			c.beginPath();
			c.roundRect(17, -15, 7, 30, 3);
		},
		HORN,
		20,
		0,
		10,
		4
	);
	// the bell, the maw with its fire
	celPiece(
		c,
		() => {
			c.beginPath();
			c.moveTo(28, -14);
			c.lineTo(44, -26);
			c.lineTo(44, 26);
			c.lineTo(28, 14);
			c.closePath();
		},
		HORN,
		36,
		0,
		18
	);
	bloom(c, 42, 0, 34, '255,150,50', 0.8);
	piece(
		c,
		() => {
			c.beginPath();
			c.ellipse(42, 0, 5, 20, 0, 0, TAU);
		},
		radial(c, 42, 0, 1, 20, EMBER),
		4
	);
	gloss(c, -16, -12, 12, 3, 0.6, 0);
}

/**
 * The Sting (Жало), the middle gun: a slim rifle. A bone stock, a narrow iron body with a canister of
 * venom on top, a long thin barrel wound with glowing coils, and a bone sting for a muzzle. Lighter
 * and longer than the Maw. Kept inside -46..46.
 */
export function paintSting(c: Ctx): void {
	celPiece(
		c,
		() => {
			c.beginPath();
			c.moveTo(-46, -4);
			c.lineTo(-30, -9);
			c.lineTo(-30, 7);
			c.lineTo(-44, 12);
			c.closePath();
		},
		HORN,
		-38,
		2,
		11
	);
	piece(
		c,
		() => {
			c.beginPath();
			c.moveTo(-18, 8);
			c.lineTo(-9, 8);
			c.lineTo(-12, 30);
			c.lineTo(-21, 30);
			c.closePath();
		},
		linear(c, 0, 8, 0, 30, [IRON[1], IRON[2]])
	);
	piece(
		c,
		() => {
			c.beginPath();
			c.roundRect(-32, -10, 34, 20, 6);
		},
		linear(c, 0, -10, 0, 10, IRON)
	);
	// the canister of venom
	bloom(c, -16, -16, 24, '80,220,255', 0.5);
	celPiece(
		c,
		() => {
			c.beginPath();
			c.roundRect(-27, -24, 22, 12, 6);
		},
		VENOM,
		-16,
		-18,
		11,
		5
	);
	gloss(c, -22, -21, 5, 2, 0.9, 0);
	// the barrel and its coils
	piece(
		c,
		() => {
			c.beginPath();
			c.rect(2, -5, 32, 10);
		},
		linear(c, 0, -5, 0, 5, IRON),
		5
	);
	bloom(c, 18, 0, 22, '80,220,255', 0.4);
	for (const cx of [8, 17, 26]) {
		piece(
			c,
			() => {
				c.beginPath();
				c.roundRect(cx, -8, 4, 16, 2);
			},
			'#7fe6ff',
			3
		);
	}
	// the sting
	celPiece(
		c,
		() => {
			c.beginPath();
			c.moveTo(32, -8);
			c.lineTo(46, 0);
			c.lineTo(32, 8);
			c.closePath();
		},
		HORN,
		37,
		0,
		8,
		4
	);
	bloom(c, 45, 0, 12, '80,220,255', 0.8);
	gloss(c, -18, -6, 9, 2, 0.6, 0);
}

/** A bolt of bile: a glowing drop, stretched along its flight, two drips behind. */
export function drawStingBolt(c: Ctx, x: number, y: number, S: number, dir: Dir): void {
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
export function drawRushWhirl(
	c: Ctx,
	x: number,
	y: number,
	S: number,
	dir: Dir,
	morph: number,
	t: number
): void {
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

let foodCache: { size: number; canvas: HTMLCanvasElement } | null = null;

/** One piece of food drawn once per tile size: the maze draws it as an image, not path by path. */
export function fleshFoodSprite(S: number): HTMLCanvasElement {
	const size = Math.max(4, Math.round(S));
	if (foodCache?.size === size) {
		return foodCache.canvas;
	}
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
	drawFleshFood(ctx, size / 2, size / 2, size);
	foodCache = { size, canvas };
	return canvas;
}
