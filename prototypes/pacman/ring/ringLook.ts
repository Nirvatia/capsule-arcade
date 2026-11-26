// The quarantine ring, a candidate for the station's fence (the owner, 2026-11-26: the beams
// through walls and the cut on the maze graph go; a boundary that does not depend on the maze's
// matrix), in the station's infestation (`b7Veins`' wine veins, sick amber, cream): the fencers
// grow a ring of mycelium round a point, seen from above as a haze of spores and a wavering
// filament that may pass over walls; where it crosses a corridor, a **seal** grows in the
// corridor's throat between its two walls: a membrane of flesh rooted in both walls by nodules,
// veined, a bright cream core so it reads at once, throbbing slowly. One seal of a ring grows
// **thin** (torn in the middle, flickering): the way out for whoever finds it.
// The tell: the filament creeps out of the projectors, the seals grow from their roots; lit, beads
// of light run along it; a touch bulges the membrane; it withers to wine and the spores fall.

export interface Ring {
	/** The centre and radius, tiles (cell centres at x + 0.5). */
	readonly cx: number;
	readonly cy: number;
	readonly r: number;
	/** The projectors' angles on the rim, radians. */
	readonly from: readonly number[];
}

/** A seal: the throat tile it grows in, the way out across it (inside → outside), thin or not. */
export interface Seal {
	readonly x: number;
	readonly y: number;
	readonly dx: number;
	readonly dy: number;
	weak: boolean;
}

export interface RingPhase {
	/** The tell's growth, 0..1 (0 = none). */
	readonly charge: number;
	/** Lit, 0..1 (the fade takes it down). */
	readonly lit: number;
	/** A touch on a seal: which, and its age, s. */
	readonly bump: { readonly seal: Seal; readonly age: number } | null;
}

interface Layout {
	readonly tileSize: number;
	readonly offsetX: number;
	readonly offsetY: number;
}

const TAU = Math.PI * 2;
const WINE = '118, 30, 44';
const WINE_DARK = '42, 12, 20';
const AMBER = '255, 166, 90';
const CREAM = '255, 226, 192';

/** A seed per position, 0..1. */
const hash = (a: number, b: number) => {
	const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
	return s - Math.floor(s);
};

/** Every crossing of the rim by a corridor, its seal moved into the nearest throat (a tile with
 *  walls on both sides across the way), so it grows between two walls, not at a wall's end. */
export function ringSeals(
	open: (x: number, y: number) => boolean,
	cols: number,
	rows: number,
	ring: Ring
): Seal[] {
	const inside = (x: number, y: number) => Math.hypot(x + 0.5 - ring.cx, y + 0.5 - ring.cy) <= ring.r;
	const throat = (x: number, y: number, dx: number, dy: number) =>
		open(x, y) && !open(x + dy, y + dx) && !open(x - dy, y - dx);
	const seals: Seal[] = [];
	const taken = new Set<string>();
	for (let y = 0; y < rows; y++) {
		for (let x = 0; x < cols; x++) {
			if (!open(x, y) || !inside(x, y)) continue;
			for (const [dx, dy] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1]
			]) {
				const bx = x + dx;
				const by = y + dy;
				if (!open(bx, by) || inside(bx, by)) continue;
				// the way through: out to two tiles beyond, in to two tiles back; the first throat
				const line = [
					[bx, by],
					[x, y],
					[bx + dx, by + dy],
					[x - dx, y - dy],
					[bx + 2 * dx, by + 2 * dy],
					[x - 2 * dx, y - 2 * dy]
				];
				const at = line.find(([tx, ty]) => throat(tx, ty, dx, dy)) ?? [bx, by];
				const key = `${at[0]},${at[1]}`;
				if (taken.has(key)) continue;
				taken.add(key);
				seals.push({ x: at[0], y: at[1], dx, dy, weak: false });
			}
		}
	}
	return seals;
}

/** The filament's radius at angle `a`: it wavers, it is alive. */
const rimAt = (R: number, S: number, a: number, t: number) =>
	R + Math.sin(a * 9 + t * 0.8) * S * 0.07 + Math.sin(a * 23 - t * 1.3) * S * 0.035;

function filament(
	c: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	R: number,
	S: number,
	a0: number,
	a1: number,
	t: number
): void {
	const n = Math.max(8, Math.ceil(((a1 - a0) * R) / (S * 0.25)));
	c.beginPath();
	for (let i = 0; i <= n; i++) {
		const a = a0 + ((a1 - a0) * i) / n;
		const r = rimAt(R, S, a, t);
		const px = cx + Math.cos(a) * r;
		const py = cy + Math.sin(a) * r;
		if (i === 0) c.moveTo(px, py);
		else c.lineTo(px, py);
	}
}

/** The rim: the infected zone's faint tint, the haze of spores, the filament. */
function paintRim(
	c: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	R: number,
	S: number,
	ring: Ring,
	ph: RingPhase,
	t: number
): void {
	const grown = ph.lit > 0 ? 1 : ph.charge;
	if (grown <= 0) return;
	const span = Math.PI / ring.from.length;
	const alive = ph.lit > 0 ? ph.lit : 1;
	const arcs = ring.from.map((a) => [a - span * grown, a + span * grown] as const);
	const on = (a: number) =>
		arcs.some(([lo, hi]) => {
			let d = a - (lo + hi) / 2;
			d = Math.atan2(Math.sin(d), Math.cos(d));
			return Math.abs(d) <= (hi - lo) / 2;
		});
	if (ph.lit > 0) {
		// the zone inside: a faint sick tint toward the rim
		const g = c.createRadialGradient(cx, cy, R * 0.6, cx, cy, R);
		g.addColorStop(0, `rgba(${WINE}, 0)`);
		g.addColorStop(1, `rgba(${WINE}, ${0.16 * ph.lit})`);
		c.fillStyle = g;
		c.beginPath();
		c.arc(cx, cy, R, 0, TAU);
		c.fill();
	}
	// the haze: spores drifting along the rim
	const motes = Math.round((R * TAU) / (S * 0.18));
	for (let i = 0; i < motes; i++) {
		const a = (i / motes) * TAU + t * 0.03 * (hash(i, 1) - 0.5) + hash(i, 2) * 0.05;
		if (!on(a)) continue;
		const rr = rimAt(R, S, a, t) + (hash(i, 3) - 0.5) * S * 0.55;
		const tw = 0.5 + 0.5 * Math.sin(t * (0.8 + hash(i, 4)) + i);
		c.fillStyle = `rgba(${hash(i, 5) < 0.7 ? AMBER : CREAM}, ${(0.18 + 0.32 * tw) * alive})`;
		c.beginPath();
		c.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, S * (0.03 + 0.04 * hash(i, 6)), 0, TAU);
		c.fill();
	}
	// the filament: a dark wine strand, an amber glow, a thin cream thread
	for (const [lo, hi] of arcs) {
		filament(c, cx, cy, R, S, lo, hi, t);
		c.strokeStyle = `rgba(${WINE_DARK}, ${0.7 * alive})`;
		c.lineWidth = S * 0.16;
		c.stroke();
		c.strokeStyle = `rgba(${AMBER}, ${0.35 * alive})`;
		c.lineWidth = S * 0.09;
		c.stroke();
		c.strokeStyle = `rgba(${CREAM}, ${0.55 * alive})`;
		c.lineWidth = Math.max(1, S * 0.03);
		c.stroke();
	}
	if (ph.lit > 0) {
		// beads of light out of each projector, both ways
		for (const a0 of ring.from) {
			for (const dir of [1, -1]) {
				for (let k = 0; k < 2; k++) {
					const a = a0 + dir * (((t * 0.35 + k * 0.5) % 1) * span);
					const r = rimAt(R, S, a, t);
					const g = c.createRadialGradient(
						cx + Math.cos(a) * r,
						cy + Math.sin(a) * r,
						0,
						cx + Math.cos(a) * r,
						cy + Math.sin(a) * r,
						S * 0.22
					);
					g.addColorStop(0, `rgba(${CREAM}, ${0.9 * ph.lit})`);
					g.addColorStop(1, `rgba(${AMBER}, 0)`);
					c.fillStyle = g;
					c.beginPath();
					c.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, S * 0.22, 0, TAU);
					c.fill();
				}
			}
		}
	}
}

/** A seal in its throat, in local space: u along the membrane (wall to wall), v the way out. */
function paintSeal(
	c: CanvasRenderingContext2D,
	S: number,
	s: Seal,
	ph: RingPhase,
	t: number,
	seed: number
): void {
	const grown = ph.lit > 0 ? 1 : ph.charge;
	if (grown <= 0) return;
	const alive = ph.lit > 0 ? ph.lit : 1;
	const h = S * 0.5;
	const thin = s.weak ? 0.55 : 1;
	const throb = 1 + 0.12 * Math.sin(t * 2.4 + seed * 6);
	const hit = ph.bump && ph.bump.seal === s ? Math.max(0, 1 - ph.bump.age / 0.7) : 0;
	// a touch bulges it outward, a weak one flickers
	const bulge = S * (0.08 + 0.22 * hit);
	const flick = s.weak ? 0.65 + 0.35 * Math.sin(t * 9 + seed * 3) * Math.sin(t * 2.3) : 1;
	const reach = h * grown; // it grows from both roots toward the middle
	const w = S * 0.15 * thin * throb;
	const v = (u: number) => bulge * (1 - (u / h) ** 2);

	const band = (half: number, from: number, to: number) => {
		c.beginPath();
		const n = 10;
		for (let i = 0; i <= n; i++) {
			const u = from + ((to - from) * i) / n;
			const wob = Math.sin(u * 0.4 + t * 1.7 + seed) * S * 0.015;
			c.lineTo(u, v(u) - half + wob);
		}
		for (let i = n; i >= 0; i--) {
			const u = from + ((to - from) * i) / n;
			const wob = Math.sin(u * 0.5 - t * 1.3 + seed) * S * 0.015;
			c.lineTo(u, v(u) + half + wob);
		}
		c.closePath();
	};
	// the weak one is torn in the middle
	const gap = s.weak ? S * 0.11 : 0;
	const pieces: Array<[number, number]> = [
		[-h, Math.min(-gap, -h + reach)],
		[Math.max(gap, h - reach), h]
	].filter(([a, b]) => b > a) as Array<[number, number]>;
	c.save();
	c.globalAlpha *= alive * flick;
	for (const [a, b] of pieces) {
		// the glow, the flesh, its rim
		c.globalCompositeOperation = 'lighter';
		band(w * 2.2, a, b);
		c.fillStyle = `rgba(${AMBER}, ${0.22 + 0.2 * hit})`;
		c.fill();
		c.globalCompositeOperation = 'source-over';
		band(w, a, b);
		const g = c.createLinearGradient(0, -w, 0, w);
		g.addColorStop(0, `rgba(${WINE}, 0.95)`);
		g.addColorStop(0.5, `rgba(214, 112, 72, 0.92)`);
		g.addColorStop(1, `rgba(${WINE}, 0.95)`);
		c.fillStyle = g;
		c.fill();
		c.strokeStyle = `rgba(${WINE_DARK}, 0.95)`;
		c.lineWidth = Math.max(1, S * 0.035);
		c.stroke();
		// veins along it
		for (const off of [-0.45, 0.4]) {
			c.beginPath();
			for (let i = 0; i <= 8; i++) {
				const u = a + ((b - a) * i) / 8;
				c.lineTo(u, v(u) + w * off + Math.sin(u * 0.9 + seed * 4) * w * 0.25);
			}
			c.strokeStyle = `rgba(${WINE_DARK}, 0.75)`;
			c.lineWidth = Math.max(0.8, S * 0.025);
			c.stroke();
		}
		// the bright core: it must read at once
		c.beginPath();
		for (let i = 0; i <= 8; i++) {
			const u = a + ((b - a) * i) / 8;
			c.lineTo(u, v(u) + Math.sin(u * 0.7 + t * 2 + seed) * w * 0.12);
		}
		c.strokeStyle = `rgba(${CREAM}, ${0.75 + 0.25 * Math.sin(t * 3.1 + seed) + 0.3 * hit})`;
		c.lineWidth = Math.max(1, S * 0.045 * thin);
		c.stroke();
	}
	// the roots in both walls: fleshy nodules, a spore glowing in each
	for (const e of [-1, 1]) {
		const nx = e * h * 1.02;
		c.beginPath();
		c.ellipse(nx, 0, S * 0.13, S * 0.17 * thin + S * 0.03, 0, 0, TAU);
		c.fillStyle = `rgba(${WINE}, 1)`;
		c.fill();
		c.strokeStyle = `rgba(${WINE_DARK}, 1)`;
		c.lineWidth = Math.max(1, S * 0.035);
		c.stroke();
		c.beginPath();
		c.arc(nx - e * S * 0.02, -S * 0.03, S * 0.055, 0, TAU);
		c.fillStyle = `rgba(${CREAM}, 0.95)`;
		c.fill();
	}
	if (s.weak && pieces.length === 2) {
		// the torn edges: frayed strands across the hole
		c.strokeStyle = `rgba(${CREAM}, 0.5)`;
		c.lineWidth = Math.max(0.8, S * 0.02);
		for (const e of [-1, 1]) {
			c.beginPath();
			c.moveTo(e * gap, v(0) - w * 0.4);
			c.lineTo(e * gap * 0.35, v(0) + w * 0.2);
			c.stroke();
		}
	}
	c.restore();
}

export function drawRing(
	c: CanvasRenderingContext2D,
	L: Layout,
	ring: Ring,
	seals: readonly Seal[],
	ph: RingPhase,
	time: number
): void {
	const S = L.tileSize;
	const cx = L.offsetX + ring.cx * S;
	const cy = L.offsetY + ring.cy * S;
	c.save();
	paintRim(c, cx, cy, ring.r * S, S, ring, ph, time);
	seals.forEach((s, i) => {
		c.save();
		c.translate(L.offsetX + (s.x + 0.5) * S, L.offsetY + (s.y + 0.5) * S);
		// local u runs along the membrane (across the way), +v the way out
		c.rotate(Math.atan2(s.dy, s.dx) - Math.PI / 2);
		paintSeal(c, S, s, ph, time, hash(i, 9));
		c.restore();
	});
	c.restore();
}
