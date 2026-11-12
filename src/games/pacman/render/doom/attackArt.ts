// The boss's attacks in one visual language (the owner's picks from a comparison page): danger must
// read at a glance against the plates and the dark floor, a warning must differ from a blow, and a
// slowing tile must not look like burning damage.
//  - damage: the warning is amber hazard hatching and a marching dashed edge (no glow, no fill),
//    the blow a white-hot core with an orange edge and a dark outline (`warnTile`, `liveTile`;
//    the rift and the cross use the same colours along a whole lane, `doomRift`).
//  - the seal: its ring and pentagram, outlined in ink and lit pale so it parts from the red floor
//    (`sealWarn` while it burns, `sealLocked` once it is a wall).
//  - block (a void cell left by the boss): an iron shutter, a temporary wall that does no harm.
//  - slow (the corrupted tiles of phase 3): black tar, glossy, with bubbles, clipped to its tiles.
// Everything is drawn in screen pixels, `s` the tile size, `x, y` a tile's top-left corner.
type Ctx = CanvasRenderingContext2D;

/** A tile by its column and row. */
export interface Tile {
	readonly c: number;
	readonly r: number;
}

const INK = '#14080a';

function noise(a: number, b: number): number {
	const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
	return v - Math.floor(v);
}

/** One warning tile: amber hatching that marches, a dashed edge, a faint dark floor under it. */
export function warnTile(ctx: Ctx, x: number, y: number, s: number, p: number, t: number): void {
	const soon = p > 0.8 ? 0.55 + 0.45 * Math.sin(t * 40) : 1;
	ctx.save();
	ctx.beginPath();
	ctx.rect(x + 1, y + 1, s - 2, s - 2);
	ctx.clip();
	ctx.fillStyle = `rgba(24,8,2,${0.3 + 0.25 * p})`;
	ctx.fillRect(x, y, s, s);
	ctx.strokeStyle = `rgba(255,200,70,${(0.4 + 0.5 * p) * soon})`;
	ctx.lineWidth = s * 0.11;
	const step = s * 0.3;
	const off = (t * s * 0.5) % step;
	ctx.beginPath();
	for (let k = -s; k < s * 2; k += step) {
		ctx.moveTo(x + k + off, y + s);
		ctx.lineTo(x + k + off + s, y);
	}
	ctx.stroke();
	ctx.restore();
	ctx.save();
	ctx.strokeStyle = `rgba(255,214,110,${0.9 * soon})`;
	ctx.lineWidth = Math.max(1.2, s * 0.06);
	ctx.setLineDash([s * 0.18, s * 0.12]);
	ctx.lineDashOffset = -t * s * 0.5;
	ctx.strokeRect(x + 1.5, y + 1.5, s - 3, s - 3);
	ctx.restore();
}

/** One live tile: a white-hot core, an orange edge, a dark outline round the tile. */
export function liveTile(ctx: Ctx, x: number, y: number, s: number, k: number): void {
	const cx = x + s / 2;
	const cy = y + s / 2;
	ctx.save();
	ctx.beginPath();
	ctx.rect(x, y, s, s);
	ctx.clip();
	ctx.fillStyle = `rgba(40,6,0,${0.7 * k})`;
	ctx.fillRect(x, y, s, s);
	ctx.globalCompositeOperation = 'lighter';
	const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.75);
	g.addColorStop(0, `rgba(255,252,236,${k})`);
	g.addColorStop(0.35, `rgba(255,190,80,${0.95 * k})`);
	g.addColorStop(0.75, `rgba(255,90,20,${0.7 * k})`);
	g.addColorStop(1, 'rgba(255,60,10,0)');
	ctx.fillStyle = g;
	ctx.fillRect(x, y, s, s);
	ctx.restore();
	ctx.save();
	ctx.strokeStyle = `rgba(20,6,2,${0.95 * k})`;
	ctx.lineWidth = Math.max(1.6, s * 0.09);
	ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
	ctx.strokeStyle = `rgba(255,240,200,${0.9 * k})`;
	ctx.lineWidth = Math.max(1, s * 0.04);
	ctx.strokeRect(x + s * 0.09, y + s * 0.09, s * 0.82, s * 0.82);
	ctx.restore();
}

/** A temporary wall: an iron shutter with braces, rivets and a dim sigil. */
export function block(ctx: Ctx, x: number, y: number, s: number, t: number, fade = 1): void {
	ctx.save();
	ctx.globalAlpha = fade;
	const m = s * 0.06;
	const g = ctx.createLinearGradient(x, y, x, y + s);
	g.addColorStop(0, '#4a4044');
	g.addColorStop(1, '#241c20');
	ctx.fillStyle = g;
	ctx.strokeStyle = INK;
	ctx.lineWidth = Math.max(1.6, s * 0.09);
	ctx.lineJoin = 'round';
	ctx.beginPath();
	ctx.roundRect(x + m, y + m, s - 2 * m, s - 2 * m, s * 0.06);
	ctx.fill();
	ctx.stroke();
	ctx.fillStyle = 'rgba(255,236,214,.18)';
	ctx.fillRect(x + m * 1.6, y + m * 1.6, s - 3.2 * m, s * 0.07);
	ctx.strokeStyle = 'rgba(8,3,4,.8)';
	ctx.lineWidth = Math.max(1.4, s * 0.1);
	ctx.beginPath();
	ctx.moveTo(x + s * 0.2, y + s * 0.2);
	ctx.lineTo(x + s * 0.8, y + s * 0.8);
	ctx.moveTo(x + s * 0.8, y + s * 0.2);
	ctx.lineTo(x + s * 0.2, y + s * 0.8);
	ctx.stroke();
	ctx.strokeStyle = 'rgba(150,138,144,.85)';
	ctx.lineWidth = Math.max(1, s * 0.045);
	ctx.stroke();
	for (const [rx, ry] of [
		[0.17, 0.17],
		[0.83, 0.17],
		[0.17, 0.83],
		[0.83, 0.83]
	]) {
		ctx.fillStyle = INK;
		ctx.beginPath();
		ctx.arc(x + s * rx, y + s * ry, s * 0.05, 0, Math.PI * 2);
		ctx.fill();
	}
	// the sigil: a dim ring of red light, so it reads as made by the boss and not as a wall of the maze
	const cx = x + s / 2;
	const cy = y + s / 2;
	const pulse = 0.6 + 0.4 * Math.sin(t * 3 + x * 0.1);
	ctx.fillStyle = INK;
	ctx.beginPath();
	ctx.arc(cx, cy, s * 0.15, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = `rgba(255,70,50,${0.6 + 0.4 * pulse})`;
	ctx.lineWidth = Math.max(1.2, s * 0.05);
	ctx.beginPath();
	ctx.arc(cx, cy, s * 0.15, 0, Math.PI * 2);
	ctx.stroke();
	ctx.restore();
}

/** Tar: black glossy pools that merge across neighbouring tiles, with a sheen and bubbles. */
export function tar(
	ctx: Ctx,
	tiles: readonly Tile[],
	ox: number,
	oy: number,
	s: number,
	t: number
): void {
	ctx.save();
	// the pool never leaves its tiles
	ctx.beginPath();
	for (const q of tiles) ctx.rect(ox + q.c * s, oy + q.r * s, s, s);
	ctx.clip();
	const blob = (tile: Tile, grow: number): void => {
		const cx = ox + (tile.c + 0.5) * s;
		const cy = oy + (tile.r + 0.5) * s;
		ctx.beginPath();
		const n = 16;
		for (let i = 0; i <= n; i += 1) {
			const a = (i / n) * Math.PI * 2;
			const r = s * (0.5 + 0.06 * (noise(tile.c * 3 + i, tile.r * 5) - 0.5)) + grow;
			const x = cx + Math.cos(a) * r;
			const y = cy + Math.sin(a) * r;
			if (i) ctx.lineTo(x, y);
			else ctx.moveTo(x, y);
		}
		ctx.closePath();
	};
	// neighbouring tiles are joined by bridges, then one outline round the whole pool and the
	// fill over it, so that the tiles merge into one pool and not a row of beads
	const has = (c: number, r: number): boolean => tiles.some((q) => q.c === c && q.r === r);
	const bridges = (grow: number): void => {
		for (const q of tiles) {
			const x = ox + (q.c + 0.5) * s;
			const y = oy + (q.r + 0.5) * s;
			if (has(q.c + 1, q.r)) ctx.fillRect(x, y - s * 0.34 - grow, s, s * 0.68 + grow * 2);
			if (has(q.c, q.r + 1)) ctx.fillRect(x - s * 0.34 - grow, y, s * 0.68 + grow * 2, s);
		}
	};
	const rim = Math.max(1, s * 0.035);
	ctx.fillStyle = 'rgba(80,50,70,.7)';
	for (const tile of tiles) {
		blob(tile, rim);
		ctx.fill();
	}
	bridges(rim);
	ctx.fillStyle = '#050304';
	for (const tile of tiles) {
		blob(tile, 0);
		ctx.fill();
	}
	bridges(0);
	// the sheen: a hard highlight and a glint on each blob (no tinted disc: it made them read as beads)
	for (const tile of tiles) {
		const cx = ox + (tile.c + 0.5) * s;
		const cy = oy + (tile.r + 0.5) * s;
		ctx.fillStyle = 'rgba(255,255,255,.4)';
		ctx.beginPath();
		ctx.ellipse(cx - s * 0.16, cy - s * 0.18, s * 0.09, s * 0.035, -0.6, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = 'rgba(255,255,255,.22)';
		ctx.beginPath();
		ctx.arc(cx + s * 0.12, cy + s * 0.14, s * 0.035, 0, Math.PI * 2);
		ctx.fill();
		// a bubble that swells and pops
		const u = (t * 0.45 + noise(tile.c, tile.r)) % 1;
		if (u > 0.3) {
			const bx = cx + (noise(tile.r, tile.c) - 0.5) * s * 0.5;
			const by = cy + (noise(tile.c + 4, tile.r) - 0.5) * s * 0.4;
			const br = s * 0.07 * Math.sin(((u - 0.3) / 0.7) * Math.PI);
			ctx.strokeStyle = `rgba(200,180,220,${0.8 * (1 - u)})`;
			ctx.lineWidth = Math.max(1, s * 0.03);
			ctx.beginPath();
			ctx.arc(bx, by, br, 0, Math.PI * 2);
			ctx.stroke();
		}
	}
	ctx.restore();
}

/**
 * The seal's glyph, as before a ring and a pentagram that turn, but outlined in ink and lit pale
 * on a dark disc, so it parts from the red floor. `p` 0..1: how far the warning has come (the ring
 * closes, the pentagram is drawn stroke by stroke); 1 for a locked seal.
 */
export function sigil(
	ctx: Ctx,
	cx: number,
	cy: number,
	r: number,
	t: number,
	p: number,
	fade = 1
): void {
	ctx.save();
	ctx.globalAlpha = fade;
	ctx.translate(cx, cy);
	ctx.fillStyle = `rgba(14,4,8,${0.55 + 0.35 * p})`;
	ctx.beginPath();
	ctx.arc(0, 0, r * 1.08, 0, Math.PI * 2);
	ctx.fill();
	ctx.rotate(t * 0.8);
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	const locked = p >= 1;
	const ring = (): void => {
		ctx.beginPath();
		ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.02, p));
		ctx.stroke();
	};
	ctx.strokeStyle = INK;
	ctx.lineWidth = Math.max(2, r * 0.26);
	ring();
	ctx.strokeStyle = locked ? '#ff4a3a' : '#ffc84a';
	ctx.lineWidth = Math.max(1.2, r * 0.13);
	ring();
	// ticks on the ring
	ctx.strokeStyle = locked ? '#ff7a6a' : '#ffe08a';
	ctx.lineWidth = Math.max(1, r * 0.07);
	for (let i = 0; i < 10; i += 1) {
		if (i / 10 > p) break;
		const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
		ctx.beginPath();
		ctx.moveTo(Math.cos(a) * r * 1.2, Math.sin(a) * r * 1.2);
		ctx.lineTo(Math.cos(a) * r * 1.38, Math.sin(a) * r * 1.38);
		ctx.stroke();
	}
	// the pentagram, one stroke after another as the warning comes
	const star: Array<[number, number]> = [];
	for (let i = 0; i <= 5; i += 1) {
		const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
		star.push([Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9]);
	}
	const strokes = locked ? 5 : p * 5;
	if (!locked) {
		// the whole star dimly first, so the warning reads as a seal from the start
		ctx.globalAlpha = fade * 0.3;
		ctx.strokeStyle = '#ffe08a';
		ctx.lineWidth = Math.max(1, r * 0.06);
		ctx.beginPath();
		star.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
		ctx.stroke();
		ctx.globalAlpha = fade;
	}
	const draw = (): void => {
		ctx.beginPath();
		ctx.moveTo(star[0][0], star[0][1]);
		for (let i = 1; i <= 5; i += 1) {
			const f = Math.max(0, Math.min(1, strokes - (i - 1)));
			if (f <= 0) break;
			ctx.lineTo(
				star[i - 1][0] + (star[i][0] - star[i - 1][0]) * f,
				star[i - 1][1] + (star[i][1] - star[i - 1][1]) * f
			);
		}
		ctx.stroke();
	};
	ctx.strokeStyle = INK;
	ctx.lineWidth = Math.max(2, r * 0.22);
	draw();
	ctx.strokeStyle = locked ? '#ffe0d8' : '#fff0c0';
	ctx.lineWidth = Math.max(1.2, r * 0.1);
	draw();
	ctx.restore();
}

/** A seal about to burn: the tile darkens, the glyph is drawn and the ring closes. */
export function sealWarn(ctx: Ctx, x: number, y: number, s: number, p: number, t: number): void {
	const flicker = p > 0.8 ? 0.65 + 0.35 * Math.sin(t * 40) : 1;
	ctx.save();
	ctx.fillStyle = `rgba(20,4,8,${0.35 + 0.35 * p})`;
	ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
	ctx.strokeStyle = `rgba(255,200,70,${0.75 * flicker})`;
	ctx.lineWidth = Math.max(1.2, s * 0.05);
	ctx.setLineDash([s * 0.18, s * 0.12]);
	ctx.lineDashOffset = -t * s * 0.5;
	ctx.strokeRect(x + 1.5, y + 1.5, s - 3, s - 3);
	ctx.restore();
	sigil(ctx, x + s / 2, y + s / 2, s * 0.3, t, p, flicker);
}

/** A locked seal: a dark plate with the whole glyph lit. */
export function sealLocked(ctx: Ctx, x: number, y: number, s: number, t: number, fade = 1): void {
	ctx.save();
	ctx.globalAlpha = fade;
	ctx.fillStyle = '#10050a';
	ctx.fillRect(x, y, s, s);
	ctx.strokeStyle = 'rgba(255,74,58,.55)';
	ctx.lineWidth = Math.max(1.2, s * 0.05);
	ctx.strokeRect(x + s * 0.06, y + s * 0.06, s * 0.88, s * 0.88);
	ctx.restore();
	sigil(ctx, x + s / 2, y + s / 2, s * 0.32, t, 1, fade);
}
