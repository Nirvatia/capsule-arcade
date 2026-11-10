// The boss-level exit, in the hell's look (the owner's mock-up
// `prototypes/pacman/art/hell-flesh-items.html`, painted with the kit in
// `render/common/itemPaint`): an arched doorway in a bone frame on a bone step, pale light
// pouring out of it in rays, outlined in dark ink. The light is the only cold thing in the
// flesh, so it reads as the way out.
import type { CollectibleArt, CollectibleMotion } from './collectibleSprite';
import { drawCollectible, FRUIT_BLOOMS } from './collectibleSprite';
import { beginItem } from '../common/itemPaint';

const INK = 'rgba(20,6,8,0.96)';
/** The mock-up is drawn in a 100-unit box; the item kit has 256. */
const SCALE = 2.3;

function paint(ctx: CanvasRenderingContext2D, size: number): void {
	beginItem(ctx, size);
	ctx.scale(SCALE, SCALE);

	const arch = (grow: number) => () => {
		ctx.beginPath();
		ctx.moveTo(-30 + grow, 42);
		ctx.lineTo(-30 + grow, -20);
		ctx.arc(0, -20, 30 - grow, Math.PI, 0);
		ctx.lineTo(30 - grow, 42);
		ctx.closePath();
	};
	const step = () => {
		ctx.beginPath();
		ctx.roundRect(-38, 40, 76, 11, 3);
	};
	const part = (path: () => void, fill: string | CanvasGradient, width: number) => {
		path();
		ctx.fillStyle = fill;
		ctx.fill();
		ctx.lineWidth = width;
		ctx.strokeStyle = INK;
		ctx.stroke();
	};

	// the bone frame and step
	const bone = ctx.createLinearGradient(-30, 0, 30, 0);
	bone.addColorStop(0, '#efe2c8');
	bone.addColorStop(0.5, '#d3c3a4');
	bone.addColorStop(1, '#9c8a72');
	part(arch(0), bone, 6);
	part(step, '#cdbca2', 5);

	// the opening: light pouring out from the far side, in rays
	const light = ctx.createLinearGradient(0, -40, 0, 42);
	light.addColorStop(0, '#ffffff');
	light.addColorStop(0.6, '#bfe2ff');
	light.addColorStop(1, '#6aa8f0');
	part(arch(10), light, 4);
	ctx.save();
	arch(10)();
	ctx.clip();
	ctx.globalCompositeOperation = 'lighter';
	ctx.strokeStyle = 'rgba(255,255,255,0.55)';
	ctx.lineWidth = 3;
	for (let i = -2; i <= 2; i += 1) {
		ctx.beginPath();
		ctx.moveTo(i * 3, -20);
		ctx.lineTo(i * 12, 44);
		ctx.stroke();
	}
	ctx.restore();

	ctx.restore();
}

/** A steady doorway: it breathes and its light pulses, it does not sway. */
function exitMotion(time: number): CollectibleMotion {
	return {
		scale: 1 + Math.sin(time * 2.2) * 0.04,
		rotation: 0,
		alpha: 1,
		bloomAlpha: [0.2 + Math.sin(time * 3) * 0.05, 0.1 + Math.sin(time * 2) * 0.03]
	};
}

export const EXIT_ART: CollectibleArt = {
	size: 256,
	paint,
	sprite: 240,
	blooms: FRUIT_BLOOMS,
	motion: exitMotion
};

export function drawExit(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	tile: number,
	time: number
): void {
	drawCollectible(ctx, EXIT_ART, x, y, tile, time);
}
