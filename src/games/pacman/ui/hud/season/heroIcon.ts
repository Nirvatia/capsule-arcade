// Smooth vector versions of the classic arcade icons. Pac-Man keeps the plain yellow silhouette;
// Ms. Pac-Man adds her bow, eye, lips and beauty mark. The transparent mouth works on every HUD
// and menu background; the in-game heroes are untouched.
const TAU = Math.PI * 2;
const YELLOW = '#ffea00';
const RED = '#ed1c24';
const BLUE = '#2545d8';
const INK = '#171326';

/** The classic icon baked into a data URL. */
export function classicIcon(ms: boolean): string {
	const scale = 8;
	const size = 80;
	const canvas = document.createElement('canvas');
	canvas.width = canvas.height = size * scale;
	const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
	ctx.scale(scale, scale);
	ctx.translate(size / 2, size * (ms ? 0.54 : 0.5));
	paintClassic(ctx, size * (ms ? 0.42 : 0.46), ms);
	return canvas.toDataURL();
}

/** The icon centred at (0, 0), `R` the ball's radius. Facing right. */
export function paintClassic(ctx: CanvasRenderingContext2D, R: number, ms: boolean): void {
	const mouth = Math.PI / 4;

	ctx.fillStyle = YELLOW;
	ctx.beginPath();
	ctx.arc(0, 0, R, 0, TAU);
	ctx.fill();

	ctx.globalCompositeOperation = 'destination-out';
	ctx.beginPath();
	ctx.moveTo(0, 0);
	ctx.lineTo(Math.cos(mouth) * R, -Math.sin(mouth) * R);
	ctx.arc(0, 0, R, -mouth, mouth);
	ctx.closePath();
	ctx.fill();
	ctx.globalCompositeOperation = 'source-over';

	if (!ms) return;

	ctx.fillStyle = RED;
	for (const side of [-1, 1]) {
		ctx.save();
		ctx.translate(Math.cos(mouth) * R, side * Math.sin(mouth) * R);
		ctx.rotate(side * (mouth - Math.PI / 2));
		ctx.beginPath();
		ctx.moveTo(-R * 0.12, 0);
		ctx.quadraticCurveTo(R * 0.01, -R * 0.12, R * 0.18, 0);
		ctx.quadraticCurveTo(R * 0.02, R * 0.11, -R * 0.12, 0);
		ctx.fill();
		ctx.restore();
	}

	ctx.strokeStyle = BLUE;
	ctx.lineWidth = R * 0.1;
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.moveTo(R * 0.05, -R * 0.55);
	ctx.quadraticCurveTo(R * 0.18, -R * 0.65, R * 0.32, -R * 0.52);
	ctx.stroke();

	ctx.fillStyle = INK;
	ctx.beginPath();
	ctx.ellipse(R * 0.16, -R * 0.46, R * 0.075, R * 0.105, -0.18, 0, TAU);
	ctx.fill();

	ctx.strokeStyle = INK;
	ctx.lineWidth = R * 0.045;
	ctx.beginPath();
	ctx.moveTo(R * 0.21, -R * 0.54);
	ctx.lineTo(R * 0.3, -R * 0.65);
	ctx.stroke();

	ctx.beginPath();
	ctx.arc(-R * 0.4, R * 0.3, R * 0.06, 0, TAU);
	ctx.fill();

	ctx.save();
	ctx.translate(-R * 0.13, -R * 0.88);
	ctx.rotate(0.08);
	ctx.fillStyle = RED;
	for (const side of [-1, 1]) {
		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.bezierCurveTo(
			side * R * 0.12,
			-R * 0.3,
			side * R * 0.42,
			-R * 0.38,
			side * R * 0.46,
			-R * 0.12
		);
		ctx.bezierCurveTo(side * R * 0.5, R * 0.08, side * R * 0.16, R * 0.13, 0, R * 0.04);
		ctx.closePath();
		ctx.fill();
	}
	ctx.fillStyle = BLUE;
	ctx.beginPath();
	ctx.ellipse(0, -R * 0.01, R * 0.12, R * 0.11, 0, 0, TAU);
	ctx.fill();
	ctx.restore();
}
