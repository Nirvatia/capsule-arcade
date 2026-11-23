// The food of the four seasons, in one cel style: ink-outlined, flat tones with one highlight,
// like the heroes. An energizer is a seasonal object (never edible, readable by its outline);
// a pellet is a small, quiet bead of the same world. Painted once (`makeTexture`, units of the
// world: a tile is ~25 units, an energizer 26, a pellet 10) and drawn by `MeadowWorld.drawFood`.
import { lazy, makeTexture } from './meadowSprites';

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const INK = '#241418';

function paint(c: Ctx, fill: string | CanvasGradient, width = 1.5): void {
	c.fillStyle = fill;
	c.fill();
	c.strokeStyle = INK;
	c.lineWidth = width;
	c.lineJoin = 'round';
	c.stroke();
}

function circle(c: Ctx, x: number, y: number, r: number): void {
	c.beginPath();
	c.arc(x, y, r, 0, TAU);
}

function stroke(
	c: Ctx,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	color: string,
	width: number
): void {
	c.beginPath();
	c.moveTo(x1, y1);
	c.lineTo(x2, y2);
	c.strokeStyle = color;
	c.lineWidth = width;
	c.lineCap = 'round';
	c.stroke();
}

function shine(c: Ctx, x: number, y: number, rx: number, ry: number, rot: number): void {
	c.fillStyle = 'rgba(255,255,255,.7)';
	c.beginPath();
	c.ellipse(x, y, rx, ry, rot, 0, TAU);
	c.fill();
}

const energizer = (paintIt: (c: Ctx) => void): (() => HTMLCanvasElement) =>
	lazy(() =>
		makeTexture(26, 26, (c) => {
			c.translate(13, 13);
			paintIt(c);
		})
	);

const pellet = (paintIt: (c: Ctx) => void): (() => HTMLCanvasElement) =>
	lazy(() =>
		makeTexture(10, 10, (c) => {
			c.translate(5, 5);
			paintIt(c);
		})
	);

/** Spring: a cherry blossom, five notched petals round a yellow heart. */
export const sakura = energizer((c) => {
	for (let i = 0; i < 5; i++) {
		c.save();
		c.rotate((i * TAU) / 5);
		c.beginPath();
		c.moveTo(0, 0);
		c.bezierCurveTo(-5.4, -3, -6.8, -9.8, -1.7, -11.4);
		c.lineTo(0, -9.6);
		c.lineTo(1.7, -11.4);
		c.bezierCurveTo(6.8, -9.8, 5.4, -3, 0, 0);
		c.closePath();
		paint(c, i % 2 ? '#ffb0cf' : '#ffc6dd');
		stroke(c, 0, -2, 0, -7, '#e0679a', 0.9);
		c.restore();
	}
	circle(c, 0, 0, 2.7);
	paint(c, '#ffd23a', 1.2);
	c.fillStyle = '#d6407c';
	for (let k = 0; k < 5; k++) {
		circle(c, Math.cos((k * TAU) / 5) * 1.3, Math.sin((k * TAU) / 5) * 1.3, 0.45);
		c.fill();
	}
});

/** Spring pellet: a cherry petal, notched at its tip, a darker vein. */
export const springPellet = pellet((c) => {
	// long and narrow, a shallow notch, a little turned: a petal, not a heart
	c.rotate(0.4);
	c.beginPath();
	c.moveTo(0, 3.7);
	c.bezierCurveTo(-2.8, 2, -2.7, -2.5, -0.9, -3.5);
	c.lineTo(0, -2.8);
	c.lineTo(0.9, -3.5);
	c.bezierCurveTo(2.7, -2.5, 2.8, 2, 0, 3.7);
	c.closePath();
	paint(c, '#ffb6d0', 1);
	stroke(c, 0, 2.8, 0, -0.9, '#e2729c', 0.6);
	shine(c, -1.1, -1.4, 0.7, 0.45, -0.4);
});

/** Summer: an orange starfish with pale dots along its arms. */
export const starfish = energizer((c) => {
	c.beginPath();
	for (let i = 0; i < 10; i++) {
		const a = (i * Math.PI) / 5 - Math.PI / 2;
		const r = i % 2 ? 4.6 : 10.8;
		if (i) c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
		else c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
	}
	c.closePath();
	c.lineJoin = 'round';
	c.strokeStyle = INK;
	c.lineWidth = 5.4;
	c.stroke();
	c.fillStyle = '#ff9040';
	c.fill();
	c.strokeStyle = '#ff9040';
	c.lineWidth = 2.6;
	c.stroke();
	c.fillStyle = '#ffe0a8';
	for (let k = 0; k < 5; k++) {
		const b = (k * TAU) / 5 - Math.PI / 2;
		circle(c, Math.cos(b) * 4.6, Math.sin(b) * 4.6, 0.9);
		c.fill();
		circle(c, Math.cos(b) * 7.6, Math.sin(b) * 7.6, 0.8);
		c.fill();
	}
	circle(c, 0, 0, 1.5);
	c.fillStyle = '#d9631a';
	c.fill();
});

/** Summer pellet: a popcorn puff, warm cream with a golden hull at its foot. */
export const summerPellet = pellet((c) => {
	const puffs: Array<[number, number, number]> = [
		[-1.4, 0.5, 1.65],
		[1.4, 0.5, 1.65],
		[0, -1.2, 1.85],
		[0.1, 1.5, 1.3]
	];
	// the ink round the whole cluster: stroke every puff wide, then fill them all over it
	c.strokeStyle = INK;
	c.lineWidth = 2;
	for (const [x, y, r] of puffs) {
		circle(c, x, y, r);
		c.stroke();
	}
	c.fillStyle = '#fbefd2';
	for (const [x, y, r] of puffs) {
		circle(c, x, y, r);
		c.fill();
	}
	c.fillStyle = '#e2a83a';
	c.beginPath();
	c.ellipse(0.1, 2.1, 0.9, 0.55, 0, 0, TAU);
	c.fill();
	stroke(c, -1.9, 0.9, -0.9, 1.3, 'rgba(190,140,70,.55)', 0.5);
});

/** Autumn: a jack-o'-lantern, an orange pumpkin with a lit face. */
export const pumpkin = energizer((c) => {
	c.beginPath();
	c.ellipse(0, 1.6, 10.6, 8.6, 0, 0, TAU);
	paint(c, '#ff8a1f', 1.5);
	c.strokeStyle = 'rgba(150,60,0,.55)';
	c.lineWidth = 0.9;
	for (const rx of [5.6, 9.6]) {
		c.beginPath();
		c.ellipse(0, 1.6, rx, 8.6, 0, 0, TAU);
		c.stroke();
	}
	c.beginPath();
	c.moveTo(-1.8, -6.8);
	c.lineTo(-1.2, -11);
	c.lineTo(2.2, -10.4);
	c.lineTo(1.8, -6.6);
	c.closePath();
	paint(c, '#5c8a2a', 1.2);
	c.save();
	c.shadowColor = '#ffe36a';
	c.shadowBlur = 5;
	c.fillStyle = '#ffe36a';
	c.beginPath();
	c.moveTo(-6, -1.2);
	c.lineTo(-2, -1.2);
	c.lineTo(-4, -4.6);
	c.closePath();
	c.moveTo(2, -1.2);
	c.lineTo(6, -1.2);
	c.lineTo(4, -4.6);
	c.closePath();
	c.moveTo(-6.4, 2.4);
	c.lineTo(-3.2, 4.8);
	c.lineTo(-1.6, 3);
	c.lineTo(0, 5.2);
	c.lineTo(1.6, 3);
	c.lineTo(3.2, 4.8);
	c.lineTo(6.4, 2.4);
	c.lineTo(3.6, 7.2);
	c.lineTo(-3.6, 7.2);
	c.closePath();
	c.fill();
	c.restore();
	c.strokeStyle = INK;
	c.lineWidth = 1;
	c.stroke();
});

/** Autumn pellet: an eyeball candy, a green iris and a black pupil (orange would melt into the walls). */
export const autumnPellet = pellet((c) => {
	circle(c, 0, 0, 3);
	paint(c, '#f6f1ea', 1);
	circle(c, 0.5, 0.4, 1.55);
	c.fillStyle = '#4fb840';
	c.fill();
	circle(c, 0.6, 0.5, 0.72);
	c.fillStyle = INK;
	c.fill();
	shine(c, -1.2, -1.2, 0.7, 0.45, -0.5);
});

/** Winter: a snowman in a scarf and a top hat. */
export const snowman = energizer((c) => {
	stroke(c, -5.6, 3, -10.6, -0.4, INK, 2.6);
	stroke(c, -5.6, 3, -10.6, -0.4, '#8a5a2a', 1.1);
	stroke(c, 5.6, 3, 10.6, -0.4, INK, 2.6);
	stroke(c, 5.6, 3, 10.6, -0.4, '#8a5a2a', 1.1);
	circle(c, 0, 5.4, 6.3);
	paint(c, '#f6faff');
	circle(c, 0, -4.4, 4.9);
	paint(c, '#f6faff');
	c.fillStyle = 'rgba(120,160,220,.28)';
	c.beginPath();
	c.ellipse(3, 6.4, 3, 4.6, 0.2, 0, TAU);
	c.fill();
	c.beginPath();
	c.roundRect(-5.2, -0.8, 10.4, 2.8, 1.3);
	paint(c, '#e8403a', 1.2);
	c.beginPath();
	c.roundRect(1.4, 1, 2.8, 4.8, 1.2);
	paint(c, '#e8403a', 1.1);
	c.beginPath();
	c.roundRect(-3.4, -12.4, 6.8, 4.6, 1.2);
	paint(c, '#2f3040', 1.2);
	c.beginPath();
	c.roundRect(-5.2, -8.8, 10.4, 1.9, 0.9);
	paint(c, '#2f3040', 1.1);
	c.fillStyle = INK;
	circle(c, -1.8, -4.8, 0.85);
	c.fill();
	circle(c, 1.8, -4.8, 0.85);
	c.fill();
	circle(c, 0, 3.6, 0.8);
	c.fill();
	circle(c, 0, 6.8, 0.8);
	c.fill();
	c.beginPath();
	c.moveTo(0, -3.9);
	c.lineTo(4, -3);
	c.lineTo(0, -2.4);
	c.closePath();
	paint(c, '#ff8a1f', 0.9);
});

/** Winter energizer: a red Christmas bauble, a gold cap and loop, a white snowflake painted on it. */
export const bauble = energizer((c) => {
	c.beginPath();
	c.arc(0, -10.3, 1.9, 0, TAU);
	c.strokeStyle = INK;
	c.lineWidth = 1;
	c.stroke();
	c.beginPath();
	c.roundRect(-3.2, -9.4, 6.4, 3.6, 1.2);
	paint(c, '#e3b84e', 1);
	stroke(c, -1.6, -8.6, -1.6, -6.4, 'rgba(150,100,20,.6)', 0.6);
	stroke(c, 1.6, -8.6, 1.6, -6.4, 'rgba(150,100,20,.6)', 0.6);
	circle(c, 0, 1.6, 9.6);
	paint(c, '#d42f3a');
	c.save();
	c.translate(0.6, 2.4);
	for (let i = 0; i < 6; i += 1) {
		const a = (i * TAU) / 6 + 0.26;
		const ex = Math.cos(a) * 4.6;
		const ey = Math.sin(a) * 4.6;
		stroke(c, 0, 0, ex, ey, '#fff6f0', 1.1);
		const bx = Math.cos(a) * 3;
		const by = Math.sin(a) * 3;
		for (const d of [-0.7, 0.7]) {
			stroke(c, bx, by, bx + Math.cos(a + d) * 1.4, by + Math.sin(a + d) * 1.4, '#fff6f0', 0.8);
		}
	}
	c.restore();
	shine(c, -4.2, -2.4, 2, 1.3, -0.5);
});

/** Winter pellet: an ice-blue snowball (white would melt into the snow-covered walls). */
export const winterPellet = pellet((c) => {
	circle(c, 0, 0, 2.9);
	paint(c, '#a6d4f4', 1);
	c.save();
	c.beginPath();
	c.arc(0, 0, 2.4, 0, TAU);
	c.clip();
	c.fillStyle = '#5f9dd2';
	circle(c, -1.1, -1.1, 3);
	c.rect(-5, -5, 10, 10);
	c.fill('evenodd');
	c.restore();
	shine(c, -0.9, -1, 0.8, 0.55, -0.5);
});
