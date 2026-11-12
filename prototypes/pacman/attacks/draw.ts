// The boss's attacks redone as one visual language (the owner: danger must read at a glance
// against the plates and the dark floor; a telegraph differs from a live hazard; a slowing tile
// must not look like burning damage):
//  - damage: the warning is amber hazard hatching and a marching dashed edge (no glow, no fill);
//    the blow is a white-hot core with an orange edge and a dark outline.
//  - block (void cells, locked seals): a dark iron shutter with braces, rivets and a dim sigil,
//    a temporary wall that does no harm.
//  - slow (the corrupted tiles): black tar, glossy, with bubbles; nothing burns.
//  - pull: an iron chain from the boss to the hero with a hook.
// Everything is drawn in screen pixels, `s` the tile size, `x, y` a tile's top-left corner.
type Ctx = CanvasRenderingContext2D;
export interface Tile {
	readonly c: number;
	readonly r: number;
}

const INK = '#14080a';

const noise = (a: number, b: number): number => {
	const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
	return v - Math.floor(v);
};

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

/** A straight run of tiles as a rift or a cross arm: warning, then a continuous beam. */
export function lane(
	ctx: Ctx,
	tiles: readonly Tile[],
	ox: number,
	oy: number,
	s: number,
	live: boolean,
	p: number,
	t: number
): void {
	for (const tile of tiles) {
		const x = ox + tile.c * s;
		const y = oy + tile.r * s;
		if (live) liveTile(ctx, x, y, s, p);
		else warnTile(ctx, x, y, s, p, t);
	}
}

/** The eruption: a disc of tiles; warning rings contract, the blow adds a shock ring. */
export function eruption(
	ctx: Ctx,
	tiles: readonly Tile[],
	centre: Tile,
	ox: number,
	oy: number,
	s: number,
	live: boolean,
	p: number,
	t: number
): void {
	lane(ctx, tiles, ox, oy, s, live, p, t);
	const cx = ox + (centre.c + 0.5) * s;
	const cy = oy + (centre.r + 0.5) * s;
	ctx.save();
	if (live) {
		ctx.strokeStyle = `rgba(255,236,200,${0.85 * p})`;
		ctx.lineWidth = Math.max(2, s * 0.12);
		ctx.beginPath();
		ctx.arc(cx, cy, s * (1 + 1.6 * (1 - p)), 0, Math.PI * 2);
		ctx.stroke();
	} else {
		ctx.strokeStyle = 'rgba(255,214,110,.95)';
		ctx.lineWidth = Math.max(1.4, s * 0.07);
		ctx.setLineDash([s * 0.2, s * 0.14]);
		ctx.lineDashOffset = -t * s;
		ctx.beginPath();
		ctx.arc(cx, cy, s * (2.6 - 1.4 * p), 0, Math.PI * 2);
		ctx.stroke();
	}
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
export function tar(ctx: Ctx, tiles: readonly Tile[], ox: number, oy: number, s: number, t: number): void {
	ctx.save();
	const blob = (tile: Tile, grow: number): void => {
		const cx = ox + (tile.c + 0.5) * s;
		const cy = oy + (tile.r + 0.5) * s;
		ctx.beginPath();
		const n = 16;
		for (let i = 0; i <= n; i += 1) {
			const a = (i / n) * Math.PI * 2;
			const r = s * (0.56 + 0.07 * (noise(tile.c * 3 + i, tile.r * 5) - 0.5)) + grow;
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
	const rim = Math.max(1.2, s * 0.05);
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

/** The pull: an iron chain from the boss to the hero, links sliding towards the boss, a hook. */
export function chain(
	ctx: Ctx,
	a: { x: number; y: number },
	b: { x: number; y: number },
	s: number,
	t: number
): void {
	const len = Math.hypot(b.x - a.x, b.y - a.y);
	const ux = (b.x - a.x) / len;
	const uy = (b.y - a.y) / len;
	const link = s * 0.42;
	const n = Math.floor(len / link);
	const slide = ((t * 0.9) % 1) * link;
	ctx.save();
	for (let i = 0; i < n; i += 1) {
		const d = i * link + (link - slide) - link * 0.5;
		if (d < s * 0.3 || d > len - s * 0.25) continue;
		const sag = Math.sin((d / len) * Math.PI) * s * 0.1;
		const x = a.x + ux * d - uy * sag;
		const y = a.y + uy * d + ux * sag;
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(Math.atan2(uy, ux) + (i % 2 ? Math.PI / 2 : 0));
		ctx.fillStyle = i % 2 ? '#5a5054' : '#8a7f84';
		ctx.strokeStyle = INK;
		ctx.lineWidth = Math.max(1.4, s * 0.07);
		ctx.beginPath();
		ctx.ellipse(0, 0, link * 0.55, link * (i % 2 ? 0.2 : 0.3), 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = 'rgba(255,240,225,.5)';
		ctx.beginPath();
		ctx.ellipse(-link * 0.15, -link * 0.08, link * 0.16, link * 0.05, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}
	// the hook at the hero's end
	ctx.translate(b.x - ux * s * 0.28, b.y - uy * s * 0.28);
	ctx.rotate(Math.atan2(uy, ux));
	ctx.strokeStyle = INK;
	ctx.lineWidth = Math.max(2.4, s * 0.14);
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.moveTo(-s * 0.1, 0);
	ctx.quadraticCurveTo(s * 0.25, 0, s * 0.18, s * 0.2);
	ctx.stroke();
	ctx.strokeStyle = '#cfc4c9';
	ctx.lineWidth = Math.max(1.2, s * 0.07);
	ctx.stroke();
	ctx.restore();
}
