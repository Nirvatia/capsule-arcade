// The hell's lair gate, drawn live (it used to be baked into the walls, so it never opened), in
// the walls' own material: two riveted leaves of charred iron between two iron posts, each leaf
// cut with upright slots through which the lit lair glows. Opening, each leaf slides into its
// post; the glow shows through the slots and the widening gap only, never over the iron.
/** The gate in scene units: the run of `LE` tiles of the lair's top row. */
export interface Gate {
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
}

const POST = 5;
const PIT = '#12030a';
/** The walls' iron (`fleshBake` WALL): body, rim light, shade, outline, rivets. */
const IRON = '#4d4346';
const IRON_DARK = '#40373a';
const RIM = 'rgba(255,214,180,.34)';
const SHADE = 'rgba(6,2,3,.6)';
const OUTLINE = 'rgba(14,8,10,.97)';
const RIVET = '#8f8280';
/** Upright slots in a leaf: width, and the step from the leaf's inner edge. */
const SLOT_W = 3;
const SLOT_STEP = 8;

interface Rect {
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
}

/** The two leaves this moment: their rects (each slides into its post as `open` grows). */
function leaves(g: Gate, open: number): Rect[] {
	const half = (g.w / 2 - POST) * (1 - open);
	if (half < 0.5) {
		return [];
	}
	return [
		{ x: g.x + POST, y: g.y, w: half, h: g.h },
		{ x: g.x + g.w - POST - half, y: g.y, w: half, h: g.h }
	];
}

/** The slots of a leaf, laid out from its inner (moving) edge so they slide with it. */
function slots(leaf: Rect, inner: 'left' | 'right'): Rect[] {
	const out: Rect[] = [];
	for (let d = 5; d + SLOT_W <= leaf.w - 2; d += SLOT_STEP) {
		const x = inner === 'right' ? leaf.x + leaf.w - d - SLOT_W : leaf.x + d;
		out.push({ x, y: leaf.y + 4, w: SLOT_W, h: leaf.h - 8 });
	}
	return out;
}

/** What of the lit lair is seen through the gate: the slots and the gap between the leaves. */
function openings(g: Gate, open: number): Rect[] {
	const ls = leaves(g, open);
	if (ls.length === 0) {
		return [{ x: g.x + POST, y: g.y + 2, w: g.w - 2 * POST, h: g.h - 4 }];
	}
	const [a, b] = ls;
	const out = [...slots(a, 'right'), ...slots(b, 'left')];
	const gap = b.x - (a.x + a.w);
	if (gap > 0.5) {
		out.push({ x: a.x + a.w, y: g.y + 2, w: gap, h: g.h - 4 });
	}
	return out;
}

/** A block of the walls' iron: body, rim light on top, shade below, dark outline. */
function ironBlock(ctx: CanvasRenderingContext2D, r: Rect): void {
	ctx.fillStyle = OUTLINE;
	ctx.fillRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2);
	ctx.fillStyle = IRON;
	ctx.fillRect(r.x, r.y, r.w, r.h);
	ctx.fillStyle = IRON_DARK;
	ctx.fillRect(r.x, r.y + r.h * 0.55, r.w, r.h * 0.45);
	ctx.fillStyle = RIM;
	ctx.fillRect(r.x, r.y, r.w, 1.2);
	ctx.fillStyle = SHADE;
	ctx.fillRect(r.x, r.y + r.h - 1.5, r.w, 1.5);
}

function rivet(ctx: CanvasRenderingContext2D, x: number, y: number): void {
	ctx.fillStyle = OUTLINE;
	ctx.beginPath();
	ctx.arc(x, y + 0.4, 1.6, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = RIVET;
	ctx.beginPath();
	ctx.arc(x, y, 1.2, 0, Math.PI * 2);
	ctx.fill();
}

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

/** The lit lair seen through the gate (drawn additively): only through the slots and the gap. */
export function paintGateGlow(ctx: CanvasRenderingContext2D, g: Gate, open: number): void {
	ctx.fillStyle = '#ff4a32';
	ctx.globalAlpha *= 0.85;
	for (const r of openings(g, open)) {
		ctx.fillRect(r.x, r.y, r.w, r.h);
	}
}

/** The posts and the leaves; `open` 0 (shut) .. 1 (slid into the posts). */
export function paintGateBars(ctx: CanvasRenderingContext2D, g: Gate, open: number): void {
	// the lair's dark through the openings, under the glow
	ctx.fillStyle = PIT;
	for (const r of openings(g, open)) {
		ctx.fillRect(r.x, r.y, r.w, r.h);
	}
	const ls = leaves(g, open);
	ls.forEach((leaf, i) => {
		ironBlock(ctx, leaf);
		ctx.fillStyle = PIT;
		for (const r of slots(leaf, i === 0 ? 'right' : 'left')) {
			ctx.fillRect(r.x, r.y, r.w, r.h);
		}
		const edge = i === 0 ? leaf.x + leaf.w - 2.5 : leaf.x + 2.5;
		if (leaf.w > 5) {
			rivet(ctx, edge, leaf.y + 2.4);
			rivet(ctx, edge, leaf.y + leaf.h - 2.4);
		}
	});
	// the posts: narrow iron plates a little taller than the leaves, a rivet each
	for (const x of [g.x - 1, g.x + g.w - POST]) {
		const post = { x, y: g.y - 3, w: POST + 1, h: g.h + 6 };
		ironBlock(ctx, post);
		rivet(ctx, x + (POST + 1) / 2, g.y + g.h / 2);
	}
}
