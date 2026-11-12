// The boss-level exit (the owner's pick of three, in the `hell-exit` prototype), painted with
// the kit in `render/common/itemPaint`: a door of the walls' iron standing ajar in a riveted
// iron frame, cold light pouring out of the doorway onto the floor. The light is the only cold
// thing in the flesh, and the open leaf says door, so it reads as the way out.
import type { CollectibleArt, CollectibleMotion } from './collectibleSprite';
import { drawCollectible, FRUIT_BLOOMS } from './collectibleSprite';
import { beginItem } from '../common/itemPaint';

const INK = 'rgba(20,6,8,0.96)';

/** A door of the walls' iron standing ajar, cold light pouring out of it onto the floor. */
function paintDoor(ctx: CanvasRenderingContext2D, size: number): void {
	beginItem(ctx, size);
	// the light spilling onto the floor, widening towards the viewer
	const spill = ctx.createLinearGradient(0, 70, 0, 118);
	spill.addColorStop(0, 'rgba(220,255,240,0.9)');
	spill.addColorStop(1, 'rgba(160,255,210,0)');
	ctx.fillStyle = spill;
	ctx.beginPath();
	ctx.moveTo(-28, 74);
	ctx.lineTo(48, 74);
	ctx.lineTo(96, 118);
	ctx.lineTo(-60, 118);
	ctx.closePath();
	ctx.fill();
	// the frame: a block of the walls' iron with rivets
	const frame = () => {
		ctx.beginPath();
		ctx.rect(-78, -108, 156, 184);
	};
	frame();
	ctx.lineWidth = 16;
	ctx.strokeStyle = INK;
	ctx.stroke();
	const iron = ctx.createLinearGradient(0, -108, 0, 76);
	iron.addColorStop(0, '#6a5e61');
	iron.addColorStop(1, '#40373a');
	ctx.fillStyle = iron;
	ctx.fill();
	// the doorway: bright, cold light
	const light = ctx.createLinearGradient(0, -86, 0, 76);
	light.addColorStop(0, '#ffffff');
	light.addColorStop(1, '#a8ffd2');
	ctx.fillStyle = light;
	ctx.fillRect(-50, -86, 100, 162);
	// the leaf, swung open into the room: a narrowing slab on the left of the doorway
	ctx.fillStyle = '#2f2729';
	ctx.strokeStyle = INK;
	ctx.lineWidth = 6;
	ctx.beginPath();
	ctx.moveTo(-50, -86);
	ctx.lineTo(-14, -70);
	ctx.lineTo(-14, 62);
	ctx.lineTo(-50, 76);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	ctx.fillStyle = '#8f8280';
	ctx.beginPath();
	ctx.arc(-22, -2, 5, 0, Math.PI * 2);
	ctx.fill();
	// rivets in the frame
	for (const [x, y] of [
		[-64, -94],
		[64, -94],
		[-64, 62],
		[64, 62]
	] as const) {
		ctx.fillStyle = INK;
		ctx.beginPath();
		ctx.arc(x, y + 1.5, 7, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = '#a99c99';
		ctx.beginPath();
		ctx.arc(x, y, 5, 0, Math.PI * 2);
		ctx.fill();
	}
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
	paint: paintDoor,
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
