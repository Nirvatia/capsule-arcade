// The hell's tunnel pads: an iron gateway set in the end of the corridor (the owner's pick from
// a comparison of three: this, a sigil with a column of light, two pylons with lightning). A frame
// of the maze's own iron with rivets and lamps, a cyan field with bands running along it, and
// chevrons that flow from the corridor into it, so it says where it leads. Cyan is a hue the hell
// uses nowhere else, so it cannot be lost against the red. Drawn live in scene units (the bake
// leaves the tunnel tile as bare floor); the pad at the right edge is mirrored.

/** A tunnel pad: its centre in scene units and the side of the corridor (+1: it opens east). */
export interface Tunnel {
	readonly cx: number;
	readonly cy: number;
	readonly dir: 1 | -1;
}

const RGB = '90,230,255';
const IRON = '#5a4f52';
const IRON_DARK = '#2b2427';
const INK = '#14080a';
/** The gateway is drawn a fifth larger than the tile, or it vanishes at game scale. */
const SCALE = 1.22;

function halo(ctx: CanvasRenderingContext2D, x: number, r: number, a: number): void {
	const g = ctx.createRadialGradient(x, 0, 0, x, 0, r);
	g.addColorStop(0, `rgba(${RGB},${a})`);
	g.addColorStop(0.5, `rgba(${RGB},${a * 0.35})`);
	g.addColorStop(1, `rgba(${RGB},0)`);
	ctx.save();
	ctx.globalCompositeOperation = 'lighter';
	ctx.fillStyle = g;
	ctx.fillRect(x - r, -r, r * 2, r * 2);
	ctx.restore();
}

/** The cyan field: a bright plane with bands running along it. */
function field(ctx: CanvasRenderingContext2D, px: number, s: number, t: number): void {
	const f = ctx.createLinearGradient(0, -s * 0.46, 0, s * 0.46);
	f.addColorStop(0, 'rgba(120,240,255,.95)');
	f.addColorStop(0.5, 'rgba(230,255,255,1)');
	f.addColorStop(1, 'rgba(120,240,255,.95)');
	ctx.fillStyle = f;
	ctx.fillRect(px - s * 0.09, -s * 0.46, s * 0.18, s * 0.92);
	ctx.save();
	ctx.beginPath();
	ctx.rect(px - s * 0.09, -s * 0.46, s * 0.18, s * 0.92);
	ctx.clip();
	ctx.fillStyle = 'rgba(0,120,160,.55)';
	for (let i = 0; i < 6; i += 1) {
		const y = ((t * 0.9 + i / 6) % 1) * s * 1.1 - s * 0.55;
		ctx.fillRect(px - s * 0.1, y, s * 0.2, s * 0.06);
	}
	ctx.restore();
}

/** Chevrons that flow from the corridor into the gateway. */
function flow(ctx: CanvasRenderingContext2D, s: number, t: number, planeX: number): void {
	ctx.save();
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	for (let i = 0; i < 3; i += 1) {
		const u = (t * 0.8 + i / 3) % 1;
		const x = s * 0.95 - u * (s * 0.95 - planeX);
		ctx.strokeStyle = `rgba(${RGB},${0.85 * Math.sin(u * Math.PI)})`;
		ctx.lineWidth = s * 0.07;
		ctx.beginPath();
		ctx.moveTo(x + s * 0.07, -s * 0.15);
		ctx.lineTo(x - s * 0.04, 0);
		ctx.lineTo(x + s * 0.07, s * 0.15);
		ctx.stroke();
	}
	ctx.restore();
}

function place(
	ctx: CanvasRenderingContext2D,
	tn: Tunnel,
	tile: number,
	draw: (s: number) => void
): void {
	ctx.save();
	ctx.translate(tn.cx, tn.cy);
	ctx.scale(tn.dir * SCALE, SCALE);
	draw(tile);
	ctx.restore();
}

/** The gateway: the frame, the field, the flow. `t` in seconds. */
export function paintTeleport(
	ctx: CanvasRenderingContext2D,
	tn: Tunnel,
	t: number,
	tile: number
): void {
	place(ctx, tn, tile, (s) => {
		const px = -s * 0.2;
		halo(ctx, px, s * 1.15, 0.42 + 0.08 * Math.sin(t * 3));
		field(ctx, px, s, t);
		for (const sy of [-1, 1]) {
			ctx.fillStyle = IRON;
			ctx.strokeStyle = INK;
			ctx.lineWidth = s * 0.07;
			ctx.lineJoin = 'round';
			ctx.beginPath();
			ctx.roundRect(px - s * 0.3, sy < 0 ? -s * 0.5 : s * 0.37, s * 0.6, s * 0.13, s * 0.03);
			ctx.fill();
			ctx.stroke();
			ctx.fillStyle = `rgba(${RGB},${0.7 + 0.3 * Math.sin(t * 4 + sy)})`;
			ctx.beginPath();
			ctx.arc(px + s * 0.17, sy * s * 0.435, s * 0.04, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = 'rgba(255,230,210,.5)';
			ctx.beginPath();
			ctx.arc(px - s * 0.2, sy * s * 0.435, s * 0.025, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.fillStyle = IRON_DARK;
		ctx.fillRect(px - s * 0.3, -s * 0.37, s * 0.12, s * 0.74);
		flow(ctx, s, t, px + s * 0.12);
	});
}

/**
 * The gateway's own light again, on top of the night: the halo and the field stay lit while the
 * rest is darkened, so a runner can find the tunnel in the dark. `k` 0..1.
 */
export function paintTeleportLight(
	ctx: CanvasRenderingContext2D,
	tn: Tunnel,
	t: number,
	tile: number,
	k: number
): void {
	place(ctx, tn, tile, (s) => {
		const px = -s * 0.2;
		ctx.globalAlpha *= k;
		halo(ctx, px, s * 1.15, 0.42 + 0.08 * Math.sin(t * 3));
		field(ctx, px, s, t);
	});
}
