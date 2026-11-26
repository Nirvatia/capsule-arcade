// The heroes' icons for the HUD's lives and the menu's hero choice (the owner, 2026-11-26): a
// simplified version of their real art (`render/actors/hero`: the vessels of `vesselHero`), not
// the old arcade sprites. Pac-Man the cinnabar glass vessel, Ms. Pac-Man the jade one with her red
// bow and gold knot; each: the glass ball with its dark ink rim and the narrow mouth, the glowing
// wedge eye, the big highlight, the line of the liquid with a spark, the ribbon stream behind.
// No particles, aura or motion: it must read at twenty pixels. The mouth is cut through, so the
// icon works on every HUD and menu background.
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
	paintHeroIcon(ctx, size * 0.35, ms);
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
