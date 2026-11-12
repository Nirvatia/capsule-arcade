// Candidate icons for the berserk pickup lying in the maze, painted in a box of -50..50 like
// `doomItems`, in the family of the HUD's fist in flame (the owner's pick).
type Painter = (ctx: CanvasRenderingContext2D) => void;

const INK = '#140608';
const FLAME = 'M-26 22 C-34 4 -22 -6 -20 -22 C-14 -12 -10 -16 -8 -30 C-2 -20 2 -22 4 -34 C8 -22 14 -18 14 -8 C20 -14 22 -6 24 -2 C34 8 30 20 26 24 C16 32 -16 32 -26 22Z';
const FLAME_IN = 'M-17 22 C-21 10 -13 4 -11 -8 C-7 -2 -3 -6 -1 -18 C3 -8 10 -4 10 4 C16 0 18 10 14 20 C8 28 -10 28 -17 22Z';

function outlined(ctx: CanvasRenderingContext2D, fill: string, w = 3.6): void {
	ctx.fillStyle = fill;
	ctx.fill();
	ctx.lineWidth = w;
	ctx.strokeStyle = INK;
	ctx.lineJoin = 'round';
	ctx.stroke();
}

function bloom(ctx: CanvasRenderingContext2D, r: number, rgb: string, a: number): void {
	const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
	g.addColorStop(0, `rgba(${rgb},${a})`);
	g.addColorStop(0.45, `rgba(${rgb},${a * 0.4})`);
	g.addColorStop(1, `rgba(${rgb},0)`);
	ctx.save();
	ctx.globalCompositeOperation = 'lighter';
	ctx.fillStyle = g;
	ctx.fillRect(-r, -r, r * 2, r * 2);
	ctx.restore();
}

function fist(ctx: CanvasRenderingContext2D): void {
	const cream = '#fbe6c4';
	ctx.beginPath();
	ctx.roundRect(-18, -4, 36, 27, 9);
	outlined(ctx, cream);
	for (const [x, y] of [
		[-13.5, -4],
		[-4.5, -5],
		[4.5, -5],
		[13.5, -4]
	]) {
		ctx.beginPath();
		ctx.arc(x, y, 6.2, 0, 6.3);
		outlined(ctx, cream, 3.2);
	}
	ctx.beginPath();
	ctx.roundRect(-17, -3, 34, 25, 8);
	ctx.fillStyle = cream;
	ctx.fill();
	ctx.strokeStyle = INK;
	ctx.lineWidth = 2.4;
	ctx.lineCap = 'round';
	ctx.beginPath();
	for (const x of [-9, 0, 9]) {
		ctx.moveTo(x, -2);
		ctx.lineTo(x, 9);
	}
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(-18, 11);
	ctx.quadraticCurveTo(-6, 7, 7, 13);
	ctx.quadraticCurveTo(11, 17, 5, 21);
	ctx.quadraticCurveTo(-8, 25, -18, 21);
	ctx.closePath();
	outlined(ctx, '#f0cf9c', 3);
	ctx.strokeStyle = 'rgba(255,255,255,.8)';
	ctx.lineWidth = 2.6;
	ctx.beginPath();
	ctx.moveTo(-14, -9);
	ctx.quadraticCurveTo(-8, -13, -3, -11);
	ctx.stroke();
}

/** 1. The HUD's icon as it is, bigger, with an ember glow. */
export const paintFlameFist: Painter = (ctx) => {
	bloom(ctx, 54, '255,120,40', 0.5);
	ctx.save();
	ctx.scale(1.38, 1.38);
	ctx.translate(0, 2);
	ctx.fillStyle = '#ff5a1a';
	const p = new Path2D(FLAME);
	ctx.fill(p);
	ctx.lineWidth = 3.6;
	ctx.strokeStyle = INK;
	ctx.lineJoin = 'round';
	ctx.stroke(p);
	ctx.fillStyle = '#ffb040';
	ctx.fill(new Path2D(FLAME_IN));
	fist(ctx);
	ctx.restore();
};

/** 2. A round medallion: pale gold rim with rays, a red field, the fist in it. */
export const paintMedallion: Painter = (ctx) => {
	bloom(ctx, 56, '255,200,100', 0.45);
	ctx.fillStyle = '#ffe08a';
	ctx.strokeStyle = INK;
	ctx.lineWidth = 3;
	ctx.lineJoin = 'round';
	ctx.beginPath();
	for (let i = 0; i < 12; i += 1) {
		const a = (i / 12) * Math.PI * 2;
		const b = a + Math.PI / 12;
		ctx.lineTo(Math.cos(a) * 49, Math.sin(a) * 49);
		ctx.lineTo(Math.cos(b) * 42, Math.sin(b) * 42);
	}
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	ctx.beginPath();
	ctx.arc(0, 0, 41, 0, 6.3);
	outlined(ctx, '#ffe08a', 4);
	const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 36);
	g.addColorStop(0, '#c8281c');
	g.addColorStop(1, '#5a0a10');
	ctx.beginPath();
	ctx.arc(0, 0, 35, 0, 6.3);
	outlined(ctx, g, 3);
	ctx.save();
	ctx.scale(0.95, 0.95);
	ctx.translate(0, 2);
	const p = new Path2D(FLAME);
	ctx.fillStyle = '#ff5a1a';
	ctx.fill(p);
	ctx.lineWidth = 3.2;
	ctx.strokeStyle = INK;
	ctx.stroke(p);
	ctx.fillStyle = '#ffb040';
	ctx.fill(new Path2D(FLAME_IN));
	fist(ctx);
	ctx.restore();
};

/** 3. A rune ring on the floor with a taller flame: the pickup reads as a spot, not a tile item. */
export const paintRuneFist: Painter = (ctx) => {
	bloom(ctx, 58, '255,90,40', 0.45);
	ctx.save();
	ctx.beginPath();
	ctx.arc(0, 6, 46, 0, 6.3);
	ctx.fillStyle = 'rgba(60,4,8,.78)';
	ctx.fill();
	ctx.lineWidth = 8;
	ctx.strokeStyle = INK;
	ctx.stroke();
	ctx.lineWidth = 4.5;
	ctx.strokeStyle = '#ffd27a';
	ctx.setLineDash([16, 7]);
	ctx.stroke();
	ctx.setLineDash([]);
	ctx.restore();
	ctx.save();
	ctx.translate(0, 6);
	ctx.scale(1.05, 1.05);
	const p = new Path2D(FLAME);
	ctx.save();
	ctx.scale(1, 1.3);
	ctx.translate(0, -3);
	ctx.fillStyle = '#ff5a1a';
	ctx.fill(p);
	ctx.lineWidth = 3.2;
	ctx.strokeStyle = INK;
	ctx.lineJoin = 'round';
	ctx.stroke(p);
	ctx.fillStyle = '#ffb040';
	ctx.fill(new Path2D(FLAME_IN));
	ctx.restore();
	fist(ctx);
	ctx.restore();
};

export const VARIANT_PAINTERS = {
	flame: paintFlameFist,
	medallion: paintMedallion,
	rune: paintRuneFist
} as const;
export type PickupVariant = keyof typeof VARIANT_PAINTERS;

/** Bakes a painter the way `DoomSprites` does: 26 units at 3x. */
export function bake(paint: Painter, size = 26): HTMLCanvasElement {
	const px = size * 3;
	const c = document.createElement('canvas');
	c.width = px;
	c.height = px;
	const x = c.getContext('2d') as CanvasRenderingContext2D;
	x.translate(px / 2, px / 2);
	x.scale(px / 104, px / 104);
	paint(x);
	return c;
}
