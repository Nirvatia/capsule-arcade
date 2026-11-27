// The heroes' icons for the HUD's lives and the menu's hero choice (the owner, 2026-11-26): a
// simplified version of their real art (`render/actors/hero`: the vessels of `vesselHero`), not
// the old arcade sprites. Pac-Man the cinnabar glass vessel, Ms. Pac-Man the jade one with her red
// bow and gold knot; each: the glass ball with its dark ink rim and the narrow mouth, the glowing
// wedge eye, the big highlight, the line of the liquid with a spark, the ribbon stream behind.
// No particles, aura or motion: it must read at twenty pixels. The mouth is cut through, so the
// icon works on every HUD and menu background. With the fruit look (the owner, 2026-11-27; the
// default, `heroSkin`) the icon is the orange or the watermelon slice instead, drawn the same way:
// peel, flesh, the bite cut through, the eye, the leaf or the gold bow.
import { readHeroSkin } from '../../../render/actors/hero/heroSkin';

const TAU = Math.PI * 2;

interface IconLook {
	readonly light: string;
	readonly mid: string;
	readonly shadow: string;
	readonly deep: string;
	readonly stream: string;
	readonly ink: string;
	readonly eye: string;
	readonly liquid: string;
}

const CINNABAR: IconLook = {
	light: 'rgb(255, 244, 232)',
	mid: 'rgb(236, 44, 62)',
	shadow: 'rgb(176, 14, 38)',
	deep: 'rgb(86, 6, 20)',
	stream: 'rgb(214, 28, 52)',
	ink: 'rgb(42, 10, 18)',
	eye: '#fff1d2',
	liquid: 'rgba(255, 206, 118, 0.85)'
};
const JADE: IconLook = {
	light: 'rgb(244, 255, 250)',
	mid: 'rgb(42, 212, 162)',
	shadow: 'rgb(14, 138, 108)',
	deep: 'rgb(8, 66, 56)',
	stream: 'rgb(36, 190, 146)',
	ink: 'rgb(10, 42, 38)',
	eye: '#effffa',
	liquid: 'rgba(200, 255, 236, 0.8)'
};
const BOW = {
	silk: 'rgb(236, 44, 62)',
	fold: 'rgb(150, 12, 34)',
	ink: 'rgb(42, 10, 18)',
	knot: '#f2c14e'
};

/** The icon baked into a data URL. */
export function heroIcon(ms: boolean): string {
	const scale = 8;
	const size = 80;
	const canvas = document.createElement('canvas');
	canvas.width = canvas.height = size * scale;
	const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
	ctx.scale(scale, scale);
	ctx.translate(size * 0.55, size * (ms ? 0.6 : 0.52));
	if (readHeroSkin() === 'fruit') paintFruitIcon(ctx, size * 0.33, ms);
	else paintHeroIcon(ctx, size * 0.35, ms);
	return canvas.toDataURL();
}

/** The icon centred on the ball at (0, 0), `R` the ball's radius, facing right. */
export function paintHeroIcon(ctx: CanvasRenderingContext2D, R: number, ms: boolean): void {
	const k = ms ? JADE : CINNABAR;
	const mouth = 0.22;
	ctx.save();
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';

	// the ribbon stream behind (left), a crescent past the ball
	ctx.beginPath();
	ctx.ellipse(-R * 0.3, R * 0.1, R * 0.95, R * 0.86, 0, 0, TAU);
	ctx.fillStyle = k.stream;
	ctx.fill();
	ctx.strokeStyle = k.ink;
	ctx.lineWidth = R * 0.08;
	ctx.stroke();

	// the glass ball, lit from the upper left
	const body = ctx.createRadialGradient(-R * 0.38, -R * 0.42, R * 0.08, 0, 0, R * 1.2);
	body.addColorStop(0, k.light);
	body.addColorStop(0.32, k.mid);
	body.addColorStop(0.78, k.shadow);
	body.addColorStop(1, k.deep);
	ctx.beginPath();
	ctx.arc(0, 0, R, 0, TAU);
	ctx.fillStyle = body;
	ctx.fill();

	// the line of the liquid with a spark on it
	ctx.strokeStyle = k.liquid;
	ctx.lineWidth = R * 0.07;
	ctx.beginPath();
	ctx.moveTo(-R * 0.62, R * 0.42);
	ctx.quadraticCurveTo(-R * 0.05, R * 0.24, R * 0.48, R * 0.44);
	ctx.stroke();
	ctx.fillStyle = k.liquid;
	ctx.beginPath();
	ctx.arc(-R * 0.36, R * 0.22, R * 0.07, 0, TAU);
	ctx.fill();

	// the big highlight
	ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
	ctx.beginPath();
	ctx.ellipse(-R * 0.4, -R * 0.52, R * 0.3, R * 0.15, -0.55, 0, TAU);
	ctx.fill();

	// the glowing wedge eye
	const eye = () => {
		ctx.beginPath();
		ctx.moveTo(-R * 0.08, -R * 0.5);
		ctx.quadraticCurveTo(R * 0.18, -R * 0.66, R * 0.44, -R * 0.4);
		ctx.quadraticCurveTo(R * 0.2, -R * 0.36, -R * 0.08, -R * 0.5);
		ctx.closePath();
	};
	ctx.fillStyle = 'rgba(255, 236, 190, 0.35)';
	ctx.beginPath();
	ctx.ellipse(R * 0.18, -R * 0.46, R * 0.36, R * 0.18, 0.2, 0, TAU);
	ctx.fill();
	eye();
	ctx.fillStyle = k.eye;
	ctx.fill();
	ctx.strokeStyle = k.ink;
	ctx.lineWidth = R * 0.05;
	ctx.stroke();

	// the narrow mouth, cut through, its lips inked
	ctx.globalCompositeOperation = 'destination-out';
	ctx.beginPath();
	ctx.moveTo(R * 0.02, 0);
	ctx.lineTo(Math.cos(mouth) * R * 1.3, -Math.sin(mouth) * R * 1.3);
	ctx.lineTo(Math.cos(mouth) * R * 1.3, Math.sin(mouth) * R * 1.3);
	ctx.closePath();
	ctx.fill();
	ctx.globalCompositeOperation = 'source-over';
	ctx.strokeStyle = k.ink;
	ctx.lineWidth = R * 0.09;
	ctx.beginPath();
	ctx.arc(0, 0, R, mouth, TAU - mouth);
	ctx.stroke();
	ctx.lineWidth = R * 0.08;
	ctx.beginPath();
	ctx.moveTo(Math.cos(mouth) * R, -Math.sin(mouth) * R);
	ctx.lineTo(R * 0.06, 0);
	ctx.lineTo(Math.cos(mouth) * R, Math.sin(mouth) * R);
	ctx.stroke();

	if (ms) paintBow(ctx, R);
	ctx.restore();
}

/** Her red silk bow with the gold knot, on the upper left of the ball. */
function paintBow(ctx: CanvasRenderingContext2D, R: number): void {
	ctx.save();
	ctx.translate(-R * 0.28, -R * 0.92);
	ctx.rotate(-0.38);
	// as large as on her art: it is what tells her apart at a glance
	ctx.scale(1.35, 1.35);
	for (const side of [-1, 1]) {
		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.bezierCurveTo(
			side * R * 0.16,
			-R * 0.42,
			side * R * 0.62,
			-R * 0.4,
			side * R * 0.6,
			-R * 0.06
		);
		ctx.bezierCurveTo(side * R * 0.6, R * 0.22, side * R * 0.2, R * 0.2, 0, 0);
		ctx.closePath();
		ctx.fillStyle = BOW.silk;
		ctx.fill();
		ctx.strokeStyle = BOW.ink;
		ctx.lineWidth = R * 0.07;
		ctx.stroke();
		// the fold into the knot
		ctx.strokeStyle = BOW.fold;
		ctx.lineWidth = R * 0.06;
		ctx.beginPath();
		ctx.moveTo(side * R * 0.08, -R * 0.02);
		ctx.quadraticCurveTo(side * R * 0.3, -R * 0.12, side * R * 0.44, -R * 0.06);
		ctx.stroke();
	}
	ctx.beginPath();
	ctx.ellipse(0, -R * 0.02, R * 0.15, R * 0.13, 0, 0, TAU);
	ctx.fillStyle = BOW.knot;
	ctx.fill();
	ctx.strokeStyle = BOW.ink;
	ctx.lineWidth = R * 0.06;
	ctx.stroke();
	ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
	ctx.beginPath();
	ctx.arc(-R * 0.05, -R * 0.07, R * 0.04, 0, TAU);
	ctx.fill();
	ctx.restore();
}

/** The fruit icon centred on the fruit at (0, 0), `R` its radius, facing right. */
export function paintFruitIcon(ctx: CanvasRenderingContext2D, R: number, ms: boolean): void {
	const ink = ms ? 'rgb(10, 44, 22)' : 'rgb(58, 20, 6)';
	const mouth = 0.5;
	ctx.save();
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';
	const disc = (r: number, fill: string) => {
		ctx.beginPath();
		ctx.arc(0, 0, r, 0, TAU);
		ctx.fillStyle = fill;
		ctx.fill();
	};
	// the dark rim, a little larger than the fruit
	disc(R * 1.07, ink);
	if (ms) {
		disc(R, 'rgb(24, 106, 50)');
		ctx.strokeStyle = 'rgb(92, 176, 96)';
		ctx.lineWidth = R * 0.09;
		for (let i = 0; i < 7; i += 1) {
			const a = (i / 7) * TAU + 0.2;
			ctx.beginPath();
			ctx.moveTo(Math.cos(a) * R * 0.82, Math.sin(a) * R * 0.82);
			ctx.lineTo(Math.cos(a + 0.08) * R * 0.98, Math.sin(a + 0.08) * R * 0.98);
			ctx.stroke();
		}
		disc(R * 0.82, 'rgb(224, 244, 206)');
		disc(R * 0.74, 'rgb(238, 58, 94)');
		const g = ctx.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.05, 0, 0, R * 0.74);
		g.addColorStop(0, 'rgba(255, 150, 170, 0.8)');
		g.addColorStop(1, 'rgba(255, 150, 170, 0)');
		ctx.beginPath();
		ctx.arc(0, 0, R * 0.74, 0, TAU);
		ctx.fillStyle = g;
		ctx.fill();
		ctx.fillStyle = 'rgb(28, 18, 18)';
		for (const [a, r] of [
			[0.9, 0.5],
			[2.2, 0.48],
			[3.4, 0.5],
			[4.5, 0.46],
			[5.6, 0.5]
		] as const) {
			ctx.beginPath();
			ctx.ellipse(Math.cos(a) * R * r, Math.sin(a) * R * r, R * 0.1, R * 0.06, a + Math.PI, 0, TAU);
			ctx.fill();
		}
	} else {
		disc(R, 'rgb(246, 122, 12)');
		disc(R * 0.82, 'rgb(255, 238, 196)');
		ctx.strokeStyle = 'rgb(255, 238, 196)';
		disc(R * 0.76, 'rgb(255, 154, 22)');
		ctx.strokeStyle = 'rgb(255, 238, 196)';
		ctx.lineWidth = R * 0.07;
		for (let i = 0; i < 8; i += 1) {
			const a = (i / 8) * TAU + 0.2;
			ctx.beginPath();
			ctx.moveTo(0, 0);
			ctx.lineTo(Math.cos(a) * R * 0.76, Math.sin(a) * R * 0.76);
			ctx.stroke();
		}
		const g = ctx.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.05, 0, 0, R * 0.76);
		g.addColorStop(0, 'rgba(255, 224, 120, 0.85)');
		g.addColorStop(1, 'rgba(255, 224, 120, 0)');
		ctx.beginPath();
		ctx.arc(0, 0, R * 0.76, 0, TAU);
		ctx.fillStyle = g;
		ctx.fill();
	}
	// the bite, cut through; its lips drawn
	ctx.globalCompositeOperation = 'destination-out';
	ctx.beginPath();
	ctx.moveTo(R * 0.04, 0);
	ctx.lineTo(Math.cos(mouth) * R * 1.4, -Math.sin(mouth) * R * 1.4);
	ctx.lineTo(Math.cos(mouth) * R * 1.4, Math.sin(mouth) * R * 1.4);
	ctx.closePath();
	ctx.fill();
	ctx.globalCompositeOperation = 'source-over';
	ctx.strokeStyle = ink;
	ctx.lineWidth = R * 0.11;
	ctx.beginPath();
	ctx.moveTo(Math.cos(mouth) * R * 1.05, -Math.sin(mouth) * R * 1.05);
	ctx.lineTo(R * 0.08, 0);
	ctx.lineTo(Math.cos(mouth) * R * 1.05, Math.sin(mouth) * R * 1.05);
	ctx.stroke();
	// the eye: a white ball, a big pupil, a glint; the orange's brow, the melon's lashes
	const ex = R * 0.2;
	const ey = -R * 0.46;
	ctx.beginPath();
	ctx.arc(ex, ey, R * 0.2, 0, TAU);
	ctx.fillStyle = '#fffbf0';
	ctx.fill();
	ctx.strokeStyle = ink;
	ctx.lineWidth = R * 0.07;
	ctx.stroke();
	ctx.beginPath();
	ctx.arc(ex + R * 0.06, ey, R * 0.115, 0, TAU);
	ctx.fillStyle = '#1c0e0a';
	ctx.fill();
	ctx.beginPath();
	ctx.arc(ex + R * 0.02, ey - R * 0.05, R * 0.04, 0, TAU);
	ctx.fillStyle = '#ffffff';
	ctx.fill();
	ctx.strokeStyle = ink;
	ctx.lineWidth = R * 0.09;
	ctx.beginPath();
	if (ms) {
		ctx.moveTo(ex + R * 0.08, ey - R * 0.2);
		ctx.lineTo(ex + R * 0.12, ey - R * 0.34);
	} else {
		ctx.moveTo(ex - R * 0.2, ey - R * 0.24);
		ctx.lineTo(ex + R * 0.24, ey - R * 0.34);
	}
	ctx.stroke();
	if (ms) paintGoldBow(ctx, R);
	else paintLeaf(ctx, R, ink);
	ctx.restore();
}

/** The orange's leaf, on the upper left. */
function paintLeaf(ctx: CanvasRenderingContext2D, R: number, ink: string): void {
	ctx.save();
	ctx.translate(-R * 0.62, -R * 0.78);
	ctx.rotate(-2.55);
	ctx.beginPath();
	ctx.moveTo(0, 0);
	ctx.quadraticCurveTo(R * 0.24, -R * 0.34, R * 0.62, -R * 0.05);
	ctx.quadraticCurveTo(R * 0.3, R * 0.24, 0, 0);
	ctx.closePath();
	ctx.fillStyle = 'rgb(84, 160, 36)';
	ctx.fill();
	ctx.strokeStyle = ink;
	ctx.lineWidth = R * 0.07;
	ctx.stroke();
	ctx.restore();
}

/** The watermelon's gold bow with the green gem, on the crown. */
function paintGoldBow(ctx: CanvasRenderingContext2D, R: number): void {
	ctx.save();
	ctx.translate(-R * 0.2, -R * 0.98);
	ctx.rotate(-0.22);
	ctx.scale(1.3, 1.3);
	for (const side of [-1, 1]) {
		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.bezierCurveTo(
			side * R * 0.1,
			-R * 0.38,
			side * R * 0.66,
			-R * 0.46,
			side * R * 0.7,
			-R * 0.06
		);
		ctx.bezierCurveTo(side * R * 0.72, R * 0.34, side * R * 0.2, R * 0.28, 0, 0);
		ctx.closePath();
		ctx.fillStyle = 'rgb(255, 206, 52)';
		ctx.fill();
		ctx.strokeStyle = 'rgb(10, 44, 22)';
		ctx.lineWidth = R * 0.07;
		ctx.stroke();
	}
	ctx.beginPath();
	ctx.moveTo(0, -R * 0.2);
	ctx.lineTo(R * 0.17, 0);
	ctx.lineTo(0, R * 0.2);
	ctx.lineTo(-R * 0.17, 0);
	ctx.closePath();
	ctx.fillStyle = 'rgb(38, 192, 128)';
	ctx.fill();
	ctx.stroke();
	ctx.restore();
}
