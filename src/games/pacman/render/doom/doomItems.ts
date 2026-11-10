// The hell's pickup icons (the owner's mock-up `prototypes/pacman/art/hell-flesh-items.html`):
// BFG, barrel, berserk gauntlet and medkit in the heroes' style, a wide dark outline, a light
// top, a gloss. Each is painted in a box of -50..50 round the origin, light from the upper
// left, and baked once by `DoomSprites`; the animated bits of the mock-up (the pulsing lens,
// the flickering fuse, the burning cracks) are the pickup's glow in `DoomCombatView`.

const INK = '#140608';

type Painter = (ctx: CanvasRenderingContext2D) => void;

function linear(
	ctx: CanvasRenderingContext2D,
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	stops: readonly string[]
): CanvasGradient {
	const g = ctx.createLinearGradient(x0, y0, x1, y1);
	stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s));
	return g;
}

/** A part of the item: its fill, then the dark line round it. */
function part(
	ctx: CanvasRenderingContext2D,
	path: () => void,
	fill: string | CanvasGradient,
	width = 6
): void {
	path();
	ctx.fillStyle = fill;
	ctx.fill();
	ctx.lineWidth = width;
	ctx.strokeStyle = INK;
	ctx.lineJoin = 'round';
	ctx.stroke();
}

/** A soft additive glow baked into the icon. */
function bloom(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	r: number,
	rgb: string,
	a: number
): void {
	const g = ctx.createRadialGradient(x, y, 0, x, y, r);
	g.addColorStop(0, `rgba(${rgb},${a})`);
	g.addColorStop(0.4, `rgba(${rgb},${a * 0.4})`);
	g.addColorStop(1, `rgba(${rgb},0)`);
	ctx.save();
	ctx.globalCompositeOperation = 'lighter';
	ctx.fillStyle = g;
	ctx.fillRect(x - r, y - r, r * 2, r * 2);
	ctx.restore();
}

/** A steel cannon with a green lens. */
export const paintBfg: Painter = (ctx) => {
	part(
		ctx,
		() => {
			ctx.beginPath();
			ctx.moveTo(-26, 14);
			ctx.lineTo(-10, 14);
			ctx.lineTo(-4, 42);
			ctx.lineTo(-22, 42);
			ctx.closePath();
		},
		linear(ctx, 0, 14, 0, 42, ['#4a525c', '#272c33'])
	);
	part(
		ctx,
		() => {
			ctx.beginPath();
			ctx.roundRect(-44, -18, 60, 36, 9);
		},
		linear(ctx, 0, -18, 0, 18, ['#8a939e', '#58616c', '#323840'])
	);
	part(
		ctx,
		() => {
			ctx.beginPath();
			ctx.moveTo(12, -16);
			ctx.lineTo(40, -32);
			ctx.lineTo(40, 34);
			ctx.lineTo(12, 18);
			ctx.closePath();
		},
		linear(ctx, 12, 0, 40, 0, ['#69727d', '#3b424b'])
	);
	ctx.fillStyle = '#40ff50';
	for (let i = 0; i < 3; i += 1) {
		ctx.beginPath();
		ctx.roundRect(-34 + i * 11, -6, 5, 14, 2);
		ctx.fill();
	}
	const lens = ctx.createRadialGradient(36, 1, 1, 36, 1, 26);
	lens.addColorStop(0, '#f4fff0');
	lens.addColorStop(0.35, '#58ff66');
	lens.addColorStop(1, '#0a7a22');
	part(
		ctx,
		() => {
			ctx.beginPath();
			ctx.ellipse(38, 1, 11, 27, 0, 0, Math.PI * 2);
		},
		lens,
		5
	);
	ctx.fillStyle = 'rgba(255,255,255,.55)';
	ctx.beginPath();
	ctx.ellipse(-26, -11, 12, 3.5, -0.1, 0, Math.PI * 2);
	ctx.fill();
	bloom(ctx, 38, 1, 30, '64,255,80', 0.6);
};

/** An acid-green barrel with a flame mark and a lit fuse. */
export const paintBarrel: Painter = (ctx) => {
	const body = () => {
		ctx.beginPath();
		ctx.roundRect(-27, -34, 54, 76, 11);
	};
	part(
		ctx,
		body,
		linear(ctx, -27, 0, 27, 0, ['#4f7a1a', '#b8ee3e', '#d6ff74', '#7fb020', '#33570d'])
	);
	ctx.save();
	body();
	ctx.clip();
	ctx.strokeStyle = INK;
	ctx.lineWidth = 5;
	for (const y of [-14, 22]) {
		ctx.beginPath();
		ctx.moveTo(-30, y);
		ctx.quadraticCurveTo(0, y + 7, 30, y);
		ctx.stroke();
	}
	ctx.restore();
	part(
		ctx,
		() => {
			ctx.beginPath();
			ctx.ellipse(0, -34, 27, 9, 0, 0, Math.PI * 2);
		},
		'#cbf26a',
		5
	);
	part(
		ctx,
		() => {
			ctx.beginPath();
			ctx.arc(0, 4, 15, 0, Math.PI * 2);
		},
		'#ffd23f',
		4
	);
	ctx.fillStyle = INK;
	ctx.beginPath();
	ctx.moveTo(0, -8);
	ctx.quadraticCurveTo(10, 4, 3, 14);
	ctx.quadraticCurveTo(-1, 8, -5, 14);
	ctx.quadraticCurveTo(-10, 2, 0, -8);
	ctx.fill();
	ctx.strokeStyle = INK;
	ctx.lineWidth = 4;
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.moveTo(4, -36);
	ctx.quadraticCurveTo(16, -48, 24, -40);
	ctx.stroke();
	bloom(ctx, 24, -40, 12, '255,170,60', 0.9);
	ctx.fillStyle = 'rgba(255,255,230,.5)';
	ctx.beginPath();
	ctx.ellipse(-16, -14, 3.5, 12, 0, 0, Math.PI * 2);
	ctx.fill();
};

/** Berserk: a black iron gauntlet with bone spikes and burning cracks (the hero's own look). */
export const paintFist: Painter = (ctx) => {
	part(
		ctx,
		() => {
			ctx.beginPath();
			ctx.roundRect(-28, 16, 56, 26, 6);
		},
		linear(ctx, -28, 0, 28, 0, ['#2c2824', '#6a625a', '#2c2824'])
	);
	ctx.fillStyle = 'rgba(255,150,50,.85)';
	ctx.fillRect(-26, 26, 52, 6);
	part(
		ctx,
		() => {
			ctx.beginPath();
			ctx.roundRect(-36, -20, 72, 42, 13);
		},
		linear(ctx, 0, -20, 0, 22, ['#5a4f47', '#2e2824', '#161210'])
	);
	for (let i = 0; i < 4; i += 1) {
		const fx = -36 + i * 18;
		part(
			ctx,
			() => {
				ctx.beginPath();
				ctx.roundRect(fx, -26, 18, 24, 7);
			},
			linear(ctx, 0, -26, 0, -2, ['#6a5e54', '#2e2824']),
			5
		);
		ctx.fillStyle = '#f2e8d4';
		ctx.beginPath();
		ctx.moveTo(fx + 3, -26);
		ctx.lineTo(fx + 9, -44);
		ctx.lineTo(fx + 15, -26);
		ctx.closePath();
		ctx.fill();
		ctx.lineWidth = 3;
		ctx.strokeStyle = INK;
		ctx.stroke();
	}
	part(
		ctx,
		() => {
			ctx.beginPath();
			ctx.roundRect(-36, 2, 46, 18, 9);
		},
		linear(ctx, 0, 2, 0, 20, ['#4a4038', '#1c1714']),
		5
	);
	const cracks = () => {
		ctx.beginPath();
		ctx.moveTo(-22, -6);
		ctx.lineTo(-10, 4);
		ctx.lineTo(-16, 14);
		ctx.moveTo(12, -8);
		ctx.lineTo(20, 2);
		ctx.lineTo(10, 10);
		ctx.lineTo(16, 16);
	};
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	ctx.strokeStyle = 'rgba(255,150,50,.9)';
	ctx.lineWidth = 4;
	cracks();
	ctx.stroke();
	ctx.strokeStyle = '#fff0b0';
	ctx.lineWidth = 1.6;
	cracks();
	ctx.stroke();
	bloom(ctx, 0, 6, 34, '255,140,40', 0.35);
};

/** A white first-aid box with a raised red cross. */
export const paintMedkit: Painter = (ctx) => {
	const strap = () => {
		ctx.beginPath();
		ctx.moveTo(-15, -26);
		ctx.quadraticCurveTo(-15, -44, 0, -44);
		ctx.quadraticCurveTo(15, -44, 15, -26);
	};
	ctx.lineCap = 'round';
	ctx.strokeStyle = INK;
	ctx.lineWidth = 12;
	strap();
	ctx.stroke();
	ctx.strokeStyle = '#8a7e6a';
	ctx.lineWidth = 5;
	strap();
	ctx.stroke();
	part(
		ctx,
		() => {
			ctx.beginPath();
			ctx.roundRect(-42, -28, 84, 66, 11);
		},
		linear(ctx, 0, -28, 0, 38, ['#ffffff', '#f1ecde', '#c9c2ae'])
	);
	ctx.fillStyle = 'rgba(60,30,20,.16)';
	ctx.beginPath();
	ctx.roundRect(-42, 24, 84, 14, [0, 0, 11, 11]);
	ctx.fill();
	part(
		ctx,
		() => {
			ctx.beginPath();
			ctx.moveTo(-9, -22);
			ctx.lineTo(9, -22);
			ctx.lineTo(9, -7);
			ctx.lineTo(24, -7);
			ctx.lineTo(24, 11);
			ctx.lineTo(9, 11);
			ctx.lineTo(9, 26);
			ctx.lineTo(-9, 26);
			ctx.lineTo(-9, 11);
			ctx.lineTo(-24, 11);
			ctx.lineTo(-24, -7);
			ctx.lineTo(-9, -7);
			ctx.closePath();
		},
		linear(ctx, 0, -22, 0, 26, ['#f2493a', '#c4160e']),
		5
	);
	ctx.fillStyle = 'rgba(255,255,255,.7)';
	ctx.beginPath();
	ctx.ellipse(-30, -20, 8, 3, -0.2, 0, Math.PI * 2);
	ctx.fill();
};
