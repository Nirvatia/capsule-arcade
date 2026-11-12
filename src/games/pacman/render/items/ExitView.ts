// The boss-level exit, painted with the kit in `render/common/itemPaint`. The owner: the old one
// (an arched doorway in a bone frame, pale light in rays, after the mock-up
// `prototypes/pacman/art/hell-flesh-items.html`) is seen but does not read as an exit. Two
// candidates against it, in the `hell-exit` prototype:
// - sign: the emergency exit sign (ISO 7010), a green plate with a white running figure and a
//   door; the only green in the hell;
// - door: a door of the walls' iron standing ajar, cold light pouring out onto the floor.
import type { CollectibleArt, CollectibleMotion } from './collectibleSprite';
import { drawCollectible, FRUIT_BLOOMS } from './collectibleSprite';
import { beginItem } from '../common/itemPaint';

const INK = 'rgba(20,6,8,0.96)';
/** The mock-up is drawn in a 100-unit box; the item kit has 256. */
const SCALE = 2.3;

function paintArch(ctx: CanvasRenderingContext2D, size: number): void {
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

/** The emergency exit sign: a green plate, a white figure running into a white door. */
function paintSign(ctx: CanvasRenderingContext2D, size: number): void {
	beginItem(ctx, size);
	const plate = () => {
		ctx.beginPath();
		ctx.roundRect(-112, -80, 224, 160, 22);
	};
	plate();
	ctx.lineWidth = 16;
	ctx.strokeStyle = INK;
	ctx.stroke();
	const green = ctx.createLinearGradient(0, -80, 0, 80);
	green.addColorStop(0, '#3ee08a');
	green.addColorStop(1, '#0f9a55');
	ctx.fillStyle = green;
	ctx.fill();
	ctx.strokeStyle = 'rgba(210,255,225,0.7)';
	ctx.lineWidth = 5;
	ctx.beginPath();
	ctx.roundRect(-100, -68, 200, 136, 14);
	ctx.stroke();

	ctx.strokeStyle = '#ffffff';
	ctx.fillStyle = '#ffffff';
	// the door: a white frame, the doorway green inside
	ctx.lineWidth = 12;
	ctx.strokeRect(30, -50, 50, 100);
	// the figure, running right into it
	ctx.beginPath();
	ctx.arc(-22, -40, 14, 0, Math.PI * 2);
	ctx.fill();
	ctx.lineWidth = 16;
	ctx.beginPath();
	ctx.moveTo(-28, -20);
	ctx.lineTo(-42, 12);
	ctx.moveTo(-42, 12);
	ctx.lineTo(-22, 30);
	ctx.lineTo(-24, 52);
	ctx.moveTo(-42, 12);
	ctx.lineTo(-62, 30);
	ctx.lineTo(-80, 34);
	ctx.moveTo(-30, -16);
	ctx.lineTo(-8, -2);
	ctx.lineTo(10, -14);
	ctx.moveTo(-30, -16);
	ctx.lineTo(-52, -6);
	ctx.lineTo(-66, -22);
	ctx.stroke();
	ctx.restore();
}

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

export type ExitStyle = 'arch' | 'sign' | 'door';

const art = (paint: CollectibleArt['paint']): CollectibleArt => ({
	size: 256,
	paint,
	sprite: 240,
	blooms: FRUIT_BLOOMS,
	motion: exitMotion
});

export const EXIT_ARTS: Readonly<Record<ExitStyle, CollectibleArt>> = {
	arch: art(paintArch),
	sign: art(paintSign),
	door: art(paintDoor)
};

/** The exit the game draws (the candidates are compared in the `hell-exit` prototype). */
export const EXIT_ART: CollectibleArt = EXIT_ARTS.arch;

export function drawExit(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	tile: number,
	time: number,
	style?: ExitStyle
): void {
	drawCollectible(ctx, style ? EXIT_ARTS[style] : EXIT_ART, x, y, tile, time);
}
