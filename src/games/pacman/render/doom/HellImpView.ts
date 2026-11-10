import type { DoomDirection } from '../../logic/doom/DoomGraph';
import type { DoomMinionKind } from '../../logic/doom/DoomMinions';
import type { CelTones, EyeStyle, GhostShape } from './hellGhost';
import {
	INK,
	celBands,
	dirAngle,
	drawEyes,
	drawHeading,
	drawHorns,
	ghostPath,
	lightGlow
} from './hellGhost';

interface ImpSkin extends CelTones {
	/** Glow and heading chevron (rgb). */
	readonly tint: string;
}

/** Blinky's brood keeps the arcade colours of the three ghosts that chase like them. */
const IMP_SKINS: Record<DoomMinionKind, ImpSkin> = {
	pinky: { light: '#ffc4e6', mid: '#e0388e', shade: '#8a1050', tint: '255,120,200' },
	inky: { light: '#c4f8ff', mid: '#1fa8d0', shade: '#0c5a82', tint: '90,230,255' },
	clyde: { light: '#ffe0a8', mid: '#ee7a1e', shade: '#a04010', tint: '255,170,70' }
};

const IMP_EYES: EyeStyle = { sclera: '#ffe27a', glow: null };

/**
 * A minion: a small horned ghost in Pinky, Inky or Clyde colours, cel-shaded like the boss,
 * its eyes and the chevron on the tile edge pointing where it runs. (x, y) is the tile
 * centre in pixels.
 */
export function drawImp(
	ctx: CanvasRenderingContext2D,
	kind: DoomMinionKind,
	x: number,
	y: number,
	tileSize: number,
	facing: DoomDirection | null,
	time: number,
	alpha: number
): void {
	if (alpha <= 0.01 || !(tileSize > 0)) {
		return;
	}
	const skin = IMP_SKINS[kind];
	const R = tileSize * 0.5 * 0.66;
	const seed = kind.length * 1.7;
	const bob = Math.sin(time * 6 + seed) * R * 0.05;
	const shape: GhostShape = {
		w: R * 0.72,
		domeY: -R * 0.1 + bob,
		hem: R * 0.72 + bob,
		feet: 3,
		torn: 0.6,
		seed
	};
	const heading = dirAngle(facing);
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';
	lightGlow(ctx, x, y, R * 1.2, skin.tint, 0.24);
	ctx.translate(x, y);
	drawHorns(
		ctx,
		0,
		0,
		shape,
		0.6,
		{ length: 0.42, curl: 0.1, bone: ['#f1e4cc', '#9c8a72'], ember: null },
		0
	);
	ghostPath(ctx, 0, 0, shape, time * 1.3 + seed);
	ctx.fillStyle = skin.mid;
	ctx.fill();
	ctx.save();
	ghostPath(ctx, 0, 0, shape, time * 1.3 + seed);
	ctx.clip();
	celBands(ctx, shape, skin);
	ctx.restore();
	ghostPath(ctx, 0, 0, shape, time * 1.3 + seed);
	ctx.lineWidth = Math.max(1.4, shape.w * 0.15);
	ctx.strokeStyle = INK;
	ctx.stroke();
	drawEyes(ctx, 0, shape.domeY + shape.w * 0.4, shape.w, heading, IMP_EYES, 1, false, time);
	ctx.restore();
	if (facing) {
		ctx.save();
		ctx.globalAlpha = alpha;
		drawHeading(ctx, x, y, tileSize, heading, skin.tint, 1);
		ctx.restore();
	}
}
