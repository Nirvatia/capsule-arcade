import type { DoomDirection } from '../../logic/doom/DoomGraph';
import type { DoomMinionKind } from '../../logic/doom/DoomMinions';
import { drawImp as paintImp } from './hellActors';

const KIND: Record<DoomMinionKind, 0 | 1 | 2> = { pinky: 0, inky: 1, clyde: 2 };

/**
 * A minion: a small horned imp in Pinky, Inky or Clyde colours (`hellActors.drawImp`, the owner's
 * pick of the `hell-actors` prototype): it hops along on its own beat (seeded by where it is, so a
 * pack does not hop in step), whips its tail, grins; its eyes show where it runs. (x, y) is the tile
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
	ctx.save();
	ctx.globalAlpha *= alpha;
	paintImp(ctx, x, y, tileSize, time, {
		dir: facing ?? 'DOWN',
		mode: 'walk',
		k: 0,
		kind: KIND[kind],
		seed: KIND[kind] * 0.37 + ((x * 0.013 + y * 0.007) % 1)
	});
	ctx.restore();
}
