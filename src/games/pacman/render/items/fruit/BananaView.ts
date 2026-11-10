// Banana (Ms. Pac-Man's level-7 fruit), in the painting kit of `render/common/itemPaint`:
// a fat yellow crescent lying on the diagonal, belly down, so it reads as a banana and not as
// a moon or a lemon at tile size. A brown stem at the upper right, a dark blossom tip at the
// lower left, a lighter ridge along the curve, and the dark outline every item has.
import type { CollectibleArt } from '../collectibleSprite';
import { FRUIT_BLOOMS } from '../collectibleSprite';
import { beginItem, gloss, outline, sparkle } from '../../common/itemPaint';

/** Outline: dark brown, wide enough to survive the downscale to a tile. */
const OUTLINE = 'rgba(70,42,6,0.95)';

function paint(ctx: CanvasRenderingContext2D, size: number): void {
	beginItem(ctx, size);
	ctx.rotate(-0.35);

	// the crescent: a deep outer curve below, a shallower inner curve above
	const body = () => {
		ctx.beginPath();
		ctx.moveTo(-92, -18);
		ctx.bezierCurveTo(-86, 70, 30, 100, 92, 10);
		ctx.bezierCurveTo(96, 2, 92, -8, 84, -10);
		ctx.bezierCurveTo(34, 14, -42, 8, -78, -34);
		ctx.bezierCurveTo(-82, -40, -92, -34, -92, -18);
		ctx.closePath();
	};
	const stem = () => {
		ctx.beginPath();
		ctx.moveTo(84, -2);
		ctx.quadraticCurveTo(98, -20, 104, -40);
	};
	const tip = () => {
		ctx.beginPath();
		ctx.ellipse(-88, -22, 8, 10, -0.5, 0, Math.PI * 2);
	};

	// 1. outline under every part
	outline(ctx, [body, tip], OUTLINE);
	ctx.strokeStyle = OUTLINE;
	ctx.lineWidth = 24;
	stem();
	ctx.stroke();

	// 2. stem
	ctx.strokeStyle = 'rgba(150,104,40,1)';
	ctx.lineWidth = 11;
	stem();
	ctx.stroke();
	ctx.fillStyle = 'rgba(90,60,20,1)';
	ctx.beginPath();
	ctx.ellipse(104, -40, 6, 5, -0.4, 0, Math.PI * 2);
	ctx.fill();

	// 3. body: light from above, deeper gold along the belly
	const fill = ctx.createLinearGradient(0, -10, 0, 80);
	fill.addColorStop(0, 'rgba(255,248,160,1)');
	fill.addColorStop(0.4, 'rgba(255,220,60,1)');
	fill.addColorStop(1, 'rgba(222,160,20,1)');
	ctx.fillStyle = fill;
	ctx.shadowBlur = 10;
	ctx.shadowColor = 'rgba(255,230,90,0.9)';
	body();
	ctx.fill();
	ctx.shadowBlur = 0;

	// the ridge along the curve, a shade under it, a few brown freckles
	ctx.save();
	body();
	ctx.clip();
	ctx.strokeStyle = 'rgba(200,140,20,0.55)';
	ctx.lineWidth = 5;
	ctx.beginPath();
	ctx.moveTo(-84, -6);
	ctx.bezierCurveTo(-60, 48, 30, 66, 88, 4);
	ctx.stroke();
	ctx.fillStyle = 'rgba(120,80,10,0.45)';
	for (const [x, y] of [
		[-40, 40],
		[6, 58],
		[44, 44]
	] as const) {
		ctx.beginPath();
		ctx.arc(x, y, 2.6, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.restore();

	// 4. blossom tip
	ctx.fillStyle = 'rgba(80,50,14,1)';
	tip();
	ctx.fill();

	// 5. highlights: a long gloss on the upper curve, one glint
	gloss(ctx, -20, 18, 34, 10, 0.3, 0.85);
	sparkle(ctx, 40, 22, 3, 'rgba(255,245,190,1)');

	ctx.restore();
}

export const BANANA_ART: CollectibleArt = {
	size: 256,
	paint,
	sprite: 240,
	blooms: FRUIT_BLOOMS
};
