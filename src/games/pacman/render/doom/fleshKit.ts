// The hell's «Плоть» kit (the owner's pick in the `hell-kit` prototype, 2026-11-28): the food (a fang in
// a scrap of gum), the split's energizer (a hot heart), the Sting's bolts,
// the weapons' pickup icons (the Maw «Жерло» and the Sting «Жало», painted in the -50..50 box of
// `doomItems`; the Sting's and the ghosts' now in `weaponArt` and `hellActors`). Drawn with
// `fleshPaint`: light from the upper left, cel bands, an ink line; no red in the items.
import {
	INK,
	TAU,
	bloom,
	cel,
	face,
	fang,
	gloss,
	ink,
	linear,
	radial,
	shadow,
	type Ctx,
	type Dir,
	type Tones
} from './fleshPaint';

const BONE: Tones = { light: '#fff6e4', mid: '#e6d4b0', shade: '#a8916a' };
const GUM: Tones = { light: '#f6a8a4', mid: '#c4545a', shade: '#6a1a22' };
const BILE: Tones = { light: '#dcfbff', mid: '#46c2ee', shade: '#16608e' };
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
