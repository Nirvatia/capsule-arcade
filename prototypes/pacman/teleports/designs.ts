// Three different teleports for the hell's maze, drawn over the pad tile at game scale: not three
// colours of one thing, three things. `s` is the tile in pixels, the origin is the pad tile's
// centre, and +x points into the corridor (the pad at the right edge is mirrored by the caller).
export type Design = 'gate' | 'sigil' | 'tesla';

type Ctx = CanvasRenderingContext2D;

const IRON = '#5a4f52';
const IRON_DARK = '#2b2427';
const INK = '#14080a';

function glow(ctx: Ctx, x: number, y: number, r: number, rgb: string, a: number): void {
	const g = ctx.createRadialGradient(x, y, 0, x, y, r);
	g.addColorStop(0, `rgba(${rgb},${a})`);
	g.addColorStop(0.5, `rgba(${rgb},${a * 0.35})`);
	g.addColorStop(1, `rgba(${rgb},0)`);
	ctx.save();
	ctx.globalCompositeOperation = 'lighter';
	ctx.fillStyle = g;
	ctx.fillRect(x - r, y - r, r * 2, r * 2);
	ctx.restore();
}

/** Chevrons that flow from the corridor into the teleport: where it leads, said by motion. */
function flow(ctx: Ctx, s: number, t: number, rgb: string, planeX: number): void {
	ctx.save();
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	for (let i = 0; i < 3; i += 1) {
		const u = (t * 0.8 + i / 3) % 1;
		const x = s * 0.95 - u * (s * 0.95 - planeX);
		const a = Math.sin(u * Math.PI);
		ctx.strokeStyle = `rgba(${rgb},${0.85 * a})`;
		ctx.lineWidth = s * 0.07;
		ctx.beginPath();
		ctx.moveTo(x + s * 0.07, -s * 0.15);
		ctx.lineTo(x - s * 0.04, 0);
		ctx.lineTo(x + s * 0.07, s * 0.15);
		ctx.stroke();
	}
	ctx.restore();
}

/** 1. An iron gateway: a framed door with a cyan field and chevrons flowing in. */
function gate(ctx: Ctx, s: number, t: number): void {
	const rgb = '90,230,255';
	const px = -s * 0.2;
	glow(ctx, px, 0, s * 1.15, rgb, 0.42 + 0.08 * Math.sin(t * 3));
	// the field: a bright plane with bands running along it
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
	// the frame: two iron jambs with rivets and lamps, a lintel behind the plane
	for (const sy of [-1, 1]) {
		ctx.fillStyle = IRON;
		ctx.strokeStyle = INK;
		ctx.lineWidth = s * 0.07;
		ctx.lineJoin = 'round';
		ctx.beginPath();
		ctx.roundRect(px - s * 0.3, sy < 0 ? -s * 0.5 : s * 0.37, s * 0.6, s * 0.13, s * 0.03);
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = `rgba(${rgb},${0.7 + 0.3 * Math.sin(t * 4 + sy)})`;
		ctx.beginPath();
		ctx.arc(px + s * 0.17, sy * s * 0.435, s * 0.04, 0, 6.3);
		ctx.fill();
		ctx.fillStyle = 'rgba(255,230,210,.5)';
		ctx.beginPath();
		ctx.arc(px - s * 0.2, sy * s * 0.435, s * 0.025, 0, 6.3);
		ctx.fill();
	}
	// the back plate behind the field
	ctx.fillStyle = IRON_DARK;
	ctx.fillRect(px - s * 0.3, -s * 0.37, s * 0.12, s * 0.74);
	flow(ctx, s, t, rgb, px + s * 0.12);
}

/** 2. A violet sigil on the floor with a column of light rising from it. */
function sigil(ctx: Ctx, s: number, t: number): void {
	const rgb = '200,110,255';
	// the column first, behind
	const col = ctx.createLinearGradient(0, 0, 0, -s * 1.4);
	col.addColorStop(0, `rgba(${rgb},.5)`);
	col.addColorStop(1, `rgba(${rgb},0)`);
	ctx.fillStyle = col;
	ctx.fillRect(-s * 0.16, -s * 1.4, s * 0.32, s * 1.4);
	glow(ctx, 0, 0, s * 1.1, rgb, 0.5 + 0.1 * Math.sin(t * 2.4));
	// the disc and the rings
	ctx.fillStyle = 'rgba(30,6,44,.78)';
	ctx.beginPath();
	ctx.arc(0, 0, s * 0.46, 0, 6.3);
	ctx.fill();
	ctx.lineWidth = s * 0.07;
	ctx.strokeStyle = INK;
	ctx.stroke();
	ctx.save();
	ctx.rotate(t * 0.5);
	ctx.strokeStyle = 'rgba(215,150,255,.95)';
	ctx.lineWidth = s * 0.05;
	ctx.setLineDash([s * 0.16, s * 0.07]);
	ctx.beginPath();
	ctx.arc(0, 0, s * 0.4, 0, 6.3);
	ctx.stroke();
	ctx.restore();
	ctx.save();
	ctx.rotate(-t * 0.8);
	ctx.strokeStyle = 'rgba(245,225,255,.95)';
	ctx.lineWidth = s * 0.035;
	ctx.lineJoin = 'round';
	for (const k of [0, 1]) {
		ctx.beginPath();
		for (let i = 0; i < 3; i += 1) {
			const a = (i / 3) * Math.PI * 2 + k * Math.PI - Math.PI / 2;
			ctx.lineTo(Math.cos(a) * s * 0.3, Math.sin(a) * s * 0.3);
		}
		ctx.closePath();
		ctx.stroke();
	}
	ctx.restore();
	glow(ctx, 0, 0, s * 0.3, '255,235,255', 0.8 + 0.2 * Math.sin(t * 5));
	// sparks rising up the column
	ctx.save();
	ctx.globalCompositeOperation = 'lighter';
	for (let i = 0; i < 9; i += 1) {
		const u = (t * 0.55 + i * 0.37) % 1;
		const x = Math.sin(i * 12.9) * s * 0.14;
		ctx.fillStyle = `rgba(235,190,255,${0.9 * Math.sin(u * Math.PI)})`;
		ctx.beginPath();
		ctx.arc(x, -u * s * 1.2, s * 0.03 + s * 0.02 * (1 - u), 0, 6.3);
		ctx.fill();
	}
	ctx.restore();
	flow(ctx, s, t, rgb, s * 0.38);
}

function jag(x0: number, y0: number, x1: number, y1: number, seed: number, amp: number): Array<[number, number]> {
	const pts: Array<[number, number]> = [[x0, y0]];
	const n = 7;
	for (let i = 1; i < n; i += 1) {
		const u = i / n;
		const r = Math.sin(seed * 91.7 + i * 37.1) * 43758.5453;
		const j = (r - Math.floor(r) - 0.5) * 2;
		pts.push([x0 + (x1 - x0) * u + j * amp, y0 + (y1 - y0) * u]);
	}
	pts.push([x1, y1]);
	return pts;
}

/** 3. Two pylons set in the walls and lightning arcing between them across the tile. */
function tesla(ctx: Ctx, s: number, t: number): void {
	const rgb = '120,190,255';
	const seed = Math.floor(t * 14);
	glow(ctx, -s * 0.1, 0, s * 1.15, rgb, 0.4 + 0.15 * Math.abs(Math.sin(t * 17)));
	// the arcs
	const top: [number, number] = [-s * 0.08, -s * 0.4];
	const bot: [number, number] = [-s * 0.08, s * 0.4];
	ctx.save();
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	ctx.globalCompositeOperation = 'lighter';
	const arcs = [jag(top[0], top[1], bot[0], bot[1], seed, s * 0.16), jag(top[0], top[1], bot[0], bot[1], seed + 5, s * 0.22)];
	for (const pts of arcs) {
		for (const [w, a, c] of [
			[s * 0.14, 0.28, rgb],
			[s * 0.06, 0.8, '170,225,255'],
			[s * 0.025, 1, '255,255,255']
		] as const) {
			ctx.strokeStyle = `rgba(${c},${a})`;
			ctx.lineWidth = w;
			ctx.beginPath();
			pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
			ctx.stroke();
		}
	}
	ctx.restore();
	// the pylons
	for (const sy of [-1, 1]) {
		const y = sy * s * 0.4;
		ctx.fillStyle = IRON;
		ctx.strokeStyle = INK;
		ctx.lineWidth = s * 0.07;
		ctx.lineJoin = 'round';
		ctx.beginPath();
		ctx.roundRect(-s * 0.28, sy < 0 ? -s * 0.5 : s * 0.3, s * 0.4, s * 0.2, s * 0.03);
		ctx.fill();
		ctx.stroke();
		ctx.strokeStyle = IRON_DARK;
		ctx.lineWidth = s * 0.03;
		for (let i = 0; i < 3; i += 1) {
			const x = -s * 0.2 + i * s * 0.12;
			ctx.beginPath();
			ctx.moveTo(x, y - s * 0.07);
			ctx.lineTo(x, y + s * 0.07);
			ctx.stroke();
		}
		glow(ctx, -s * 0.08, y, s * 0.3, '200,230,255', 0.9);
		ctx.fillStyle = '#fff';
		ctx.beginPath();
		ctx.arc(-s * 0.08, y, s * 0.05, 0, 6.3);
		ctx.fill();
	}
	flow(ctx, s, t, rgb, s * 0.06);
}

/** The gateway and the pylons are drawn a fifth larger, so they do not vanish at game scale. */
const larger =
	(fn: (ctx: Ctx, s: number, t: number) => void) =>
	(ctx: Ctx, s: number, t: number): void => {
		ctx.save();
		ctx.scale(1.22, 1.22);
		fn(ctx, s, t);
		ctx.restore();
	};

export const DESIGNS: Record<Design, (ctx: Ctx, s: number, t: number) => void> = {
	gate: larger(gate),
	sigil,
	tesla: larger(tesla)
};
