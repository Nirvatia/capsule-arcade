// The hell's lair gate, drawn live (it used to be baked into the walls, so it never opened):
// three bone bars between two dark posts; opening, each half slides into its post. The lit
// doorway behind the bars stays, a little dimmer.
/** The gate in scene units: the run of `LE` tiles of the lair's top row. */
export interface Gate {
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
}

const POST = 5;
const PIT = '#12030a';
const BONE_DARK = '#8d7a66';
const BONE = '#d9c9ae';

/** The gate of a maze (scene units, given the maze's corner and a tile), or null if it has none. */
export function gateOf(
	S: ReadonlyArray<ReadonlyArray<string>>,
	mx: number,
	my: number,
	T: number
): Gate | null {
	let c0 = Infinity;
	let c1 = -1;
	let r0 = Infinity;
	S.forEach((row, r) =>
		row.forEach((token, c) => {
			if (token === 'LE') {
				c0 = Math.min(c0, c);
				c1 = Math.max(c1, c);
				r0 = Math.min(r0, r);
			}
		})
	);
	if (c1 < 0) {
		return null;
	}
	return { x: mx + c0 * T, y: my + r0 * T + 5, w: (c1 - c0 + 1) * T, h: T - 10 };
}

/** The lit doorway behind the bars (drawn additively). */
export function paintGateGlow(ctx: CanvasRenderingContext2D, g: Gate, open: number): void {
	ctx.fillStyle = '#ff4a32';
	ctx.globalAlpha *= 0.75 * (1 - 0.4 * open);
	ctx.fillRect(g.x + 2, g.y + 2, g.w - 4, g.h - 4);
}

/** The posts and the bars; `open` 0 (shut) .. 1 (slid into the posts). */
export function paintGateBars(ctx: CanvasRenderingContext2D, g: Gate, open: number): void {
	const half = (g.w / 2 - POST) * (1 - open);
	ctx.fillStyle = PIT;
	ctx.fillRect(g.x - 1, g.y - 1, POST + 1, g.h + 2);
	ctx.fillRect(g.x + g.w - POST, g.y - 1, POST + 1, g.h + 2);
	if (half < 0.5) {
		return;
	}
	for (const left of [g.x + POST, g.x + g.w - POST - half]) {
		for (let i = 0; i < 3; i += 1) {
			const by = g.y + 1 + i * 7;
			ctx.fillStyle = PIT;
			ctx.fillRect(left, by - 1, half, 6);
			ctx.fillStyle = BONE_DARK;
			ctx.fillRect(left, by, half, 4);
			ctx.fillStyle = BONE;
			ctx.fillRect(left, by, half, 2);
			ctx.fillStyle = 'rgba(255,246,224,.6)';
			ctx.fillRect(left + 1, by, Math.max(0, half - 2), 1);
		}
	}
}
