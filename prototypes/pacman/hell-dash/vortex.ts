// Candidates for the boss's dash in the hell: a hellish whirlwind with a trail of its own, in place
// of four afterimages, a black straight skid and six straight lines. The body is the game's
// (`HellBlinkyView`, drawn as a ghost: body only); here is what goes round it and behind it.
// All in screen pixels, `S` a tile. The trail is built from the boss's recent positions by
// `tailPath`, a pure function (same input, same output), so it can be tested when it goes in.
//   A  dust devil: three helices of ash and embers that open up behind him, the near side of
//      every turn brighter than the far side (that reads as a turning rope, not as noise), a
//      collar of smoke arcs round the body, spiral scorch marks on the floor
//   B  fire cyclone: a soot ribbon that tapers to nothing, a hot twisting flame inside it, thin
//      white-hot strands winding round it, flame tongues peeling off the end
//   C  ash funnel: a stack of discs that widens behind him like a tornado lying on its side,
//      lit orange at the rims, embers inside
// Hell rules kept: nothing flashes (every motion is a slow turn, under ~2 turns a second),
// nothing bright jumps forward (additive light is low), and a few bold things, not many small.

export interface Pt {
	x: number;
	y: number;
	/** Seconds ago. */
	age: number;
}
export interface TailPoint {
	x: number;
	y: number;
	/** Unit direction of travel at this point (towards the head). */
	dx: number;
	dy: number;
	/** 0 at the head .. 1 at the end of the tail. */
	u: number;
}

const TAU = Math.PI * 2;
const hash = (i: number, j = 0): number => {
	const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
	return s - Math.floor(s);
};

/**
 * The centreline of the trail: the boss's positions, newest first, cut to `length` px of path and
 * resampled at even steps. Pure.
 */
export function tailPath(hist: readonly Pt[], length: number, steps: number): TailPoint[] {
	if (hist.length < 2 || length <= 0) return [];
	const pts = [...hist].sort((a, b) => a.age - b.age);
	const out: TailPoint[] = [];
	let acc = 0;
	let target = 0;
	const step = length / steps;
	let hx = pts[0].x - pts[1].x;
	let hy = pts[0].y - pts[1].y;
	const hl = Math.hypot(hx, hy) || 1;
	hx /= hl;
	hy /= hl;
	out.push({ x: pts[0].x, y: pts[0].y, dx: hx, dy: hy, u: 0 });
	target = step;
	for (let i = 1; i < pts.length && out.length <= steps; i += 1) {
		const a = pts[i - 1];
		const b = pts[i];
		const seg = Math.hypot(a.x - b.x, a.y - b.y);
		if (seg < 1e-6) continue;
		const dx = (a.x - b.x) / seg;
		const dy = (a.y - b.y) / seg;
		while (acc + seg >= target && out.length <= steps) {
			const k = (target - acc) / seg;
			out.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, dx, dy, u: Math.min(1, target / length) });
			target += step;
		}
		acc += seg;
	}
	return out;
}

/** Fades the whole trail out once the boss has stopped: 1 while he moves, 0 after `hold` s. */
export function tailFade(hist: readonly Pt[], moving: boolean, hold = 0.9): number {
	if (moving) return 1;
	let newestMoving = hist.length ? hist[hist.length - 1].age : 0;
	for (const p of hist) newestMoving = Math.min(newestMoving, p.age);
	return Math.max(0, 1 - newestMoving / hold);
}

// ------------------------------------------------------------------------------- helpers

function glowDot(c: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, a: number): void {
	const g = c.createRadialGradient(x, y, 0, x, y, r);
	g.addColorStop(0, `rgba(${rgb},${a})`);
	g.addColorStop(1, `rgba(${rgb},0)`);
	c.fillStyle = g;
	c.fillRect(x - r, y - r, r * 2, r * 2);
}

/** A point on the helix `strand` of the trail: the centreline's point, pushed sideways. */
function helix(p: TailPoint, S: number, time: number, strand: number, strands: number, spread: number) {
	const phase = (strand / strands) * TAU + time * 3.2 - p.u * 11;
	const r = S * (0.05 + spread * (1 - p.u));
	const side = Math.sin(phase) * r;
	const near = Math.cos(phase);
	return { x: p.x - p.dy * side, y: p.y + p.dx * side, near, r };
}

// ----------------------------------------------------------------------- A: the dust devil

export function floorSwirls(c: CanvasRenderingContext2D, S: number, hist: readonly Pt[], fade: number): void {
	c.save();
	for (const p of hist) {
		if (p.age > 1.6 || Math.round(p.age * 60) % 7 !== 0) continue;
		const a = (1 - p.age / 1.6) * fade;
		c.strokeStyle = `rgba(8,2,2,${0.5 * a})`;
		c.lineWidth = S * 0.09;
		c.lineCap = 'round';
		for (let k = 0; k < 2; k += 1) {
			c.beginPath();
			c.arc(p.x, p.y + S * 0.22, S * (0.16 + 0.07 * k), k * 2.4, k * 2.4 + 3.6);
			c.stroke();
		}
		c.globalCompositeOperation = 'lighter';
		glowDot(c, p.x, p.y + S * 0.22, S * 0.3, '255,110,40', 0.16 * a);
		c.globalCompositeOperation = 'source-over';
	}
	c.restore();
}

export function dustDevil(c: CanvasRenderingContext2D, S: number, tail: readonly TailPoint[], time: number, fade: number): void {
	if (tail.length < 3) return;
	const STR = 3;
	c.save();
	c.lineCap = 'round';
	for (let s = 0; s < STR; s += 1) {
		// the far side first, the near side over it
		for (const pass of [0, 1]) {
			for (let i = tail.length - 1; i >= 0; i -= 1) {
				const p = tail[i];
				if (i % 2) continue;
				const h = helix(p, S, time, s, STR, 0.44);
				if ((h.near > 0 ? 1 : 0) !== pass) continue;
				const age = 1 - p.u;
				const a = Math.pow(age, 0.8) * fade * (h.near > 0 ? 1 : 0.4);
				if (a < 0.02) continue;
				const size = S * (0.07 + 0.05 * age) * (h.near > 0 ? 1.2 : 0.8);
				// hot at the head, cooling to ember, then to ash
				const heat = Math.max(0, 1 - p.u * 1.7);
				c.globalCompositeOperation = 'lighter';
				glowDot(c, h.x, h.y, size * 2.6, '255,100,30', 0.2 * a * heat);
				c.globalCompositeOperation = 'source-over';
				c.fillStyle =
					heat > 0.45
						? `rgba(255,${Math.round(150 + 90 * heat)},${Math.round(70 + 120 * heat)},${a})`
						: heat > 0.1
							? `rgba(${Math.round(190 + 60 * heat)},70,28,${a})`
							: `rgba(88,74,68,${a * 0.8})`;
				c.beginPath();
				c.arc(h.x, h.y, size, 0, TAU);
				c.fill();
			}
		}
	}
	// loose motes thrown clear of the whirl
	for (let k = 0; k < 26; k += 1) {
		const p = tail[Math.min(tail.length - 1, Math.floor(hash(k, 1) * tail.length))];
		const ang = hash(k, 2) * TAU + time * 0.8;
		const d = S * (0.5 + 0.9 * p.u) * (0.6 + hash(k, 3));
		const a = (1 - p.u) * 0.7 * fade;
		c.fillStyle = `rgba(170,148,136,${a})`;
		c.fillRect(p.x + Math.cos(ang) * d, p.y + Math.sin(ang) * d * 0.7, 3, 3);
	}
	c.restore();
}

/** Smoke arcs turning round the body while he dashes. */
export function smokeCollar(c: CanvasRenderingContext2D, S: number, x: number, y: number, time: number, k: number): void {
	c.save();
	c.lineCap = 'round';
	for (let i = 0; i < 3; i += 1) {
		const a0 = time * 4.6 + (i / 3) * TAU;
		c.strokeStyle = `rgba(20,8,6,${0.55 * k})`;
		c.lineWidth = S * 0.12;
		c.beginPath();
		c.arc(x, y, S * 0.6, a0, a0 + 1.35);
		c.stroke();
		c.globalCompositeOperation = 'lighter';
		c.strokeStyle = `rgba(255,120,40,${0.4 * k})`;
		c.lineWidth = S * 0.035;
		c.beginPath();
		c.arc(x, y, S * 0.64, a0 + 0.15, a0 + 1.2);
		c.stroke();
		c.globalCompositeOperation = 'source-over';
	}
	c.restore();
}

// ---------------------------------------------------------------------- B: the fire cyclone

export function fireCyclone(c: CanvasRenderingContext2D, S: number, tail: readonly TailPoint[], time: number, fade: number): void {
	if (tail.length < 3) return;
	const half = (p: TailPoint) => S * 0.5 * Math.pow(1 - p.u, 0.8);
	const wob = (p: TailPoint, k: number) => Math.sin(time * 5.2 - p.u * 13 + k) * S * 0.06 * (1 - p.u);
	const edge = (k: number, scale: number) =>
		tail.map((p) => {
			const w = (half(p) * scale + wob(p, 0)) * k;
			return { x: p.x - p.dy * w, y: p.y + p.dx * w };
		});
	const ribbon = (scale: number, fill: string | CanvasGradient, add: boolean): void => {
		const up = edge(1, scale);
		const dn = edge(-1, scale);
		c.save();
		if (add) c.globalCompositeOperation = 'lighter';
		c.fillStyle = fill;
		c.beginPath();
		c.moveTo(up[0].x, up[0].y);
		for (const q of up) c.lineTo(q.x, q.y);
		for (let i = dn.length - 1; i >= 0; i -= 1) c.lineTo(dn[i].x, dn[i].y);
		c.closePath();
		c.fill();
		c.restore();
	};
	const head = tail[0];
	const end = tail[tail.length - 1];
	const mk = (rgb: string, a0: number, a1: number): CanvasGradient => {
		const g = c.createLinearGradient(head.x, head.y, end.x, end.y);
		g.addColorStop(0, `rgba(${rgb},${a0 * fade})`);
		g.addColorStop(1, `rgba(${rgb},${a1 * fade})`);
		return g;
	};
	ribbon(1.08, mk('16,4,3', 0.7, 0), false);
	ribbon(0.82, mk('255,96,26', 0.5, 0), true);
	ribbon(0.42, mk('255,190,110', 0.55, 0), true);
	// strands winding round it
	c.save();
	c.lineCap = 'round';
	c.lineJoin = 'round';
	for (let s = 0; s < 2; s += 1) {
		for (const [w, rgb, a] of [
			[S * 0.09, '255,70,20', 0.5],
			[S * 0.03, '255,235,190', 0.85]
		] as const) {
			c.globalCompositeOperation = 'lighter';
			c.strokeStyle = `rgba(${rgb},${a * fade})`;
			c.lineWidth = w;
			c.beginPath();
			tail.forEach((p, i) => {
				const h = helix(p, S, time, s, 2, 0.4);
				const x = h.x;
				const y = h.y;
				if (i === 0) c.moveTo(x, y);
				else c.lineTo(x, y);
			});
			c.stroke();
		}
	}
	// flame tongues peeling off the tail
	for (let k = 0; k < 7; k += 1) {
		const p = tail[Math.min(tail.length - 1, 3 + Math.floor(hash(k, 4) * (tail.length - 3)))];
		const side = hash(k, 5) < 0.5 ? -1 : 1;
		const len = S * (0.25 + 0.4 * hash(k, 6));
		c.strokeStyle = `rgba(255,120,40,${0.5 * (1 - p.u) * fade})`;
		c.lineWidth = S * 0.045;
		c.beginPath();
		c.moveTo(p.x, p.y);
		c.quadraticCurveTo(
			p.x - p.dx * len * 0.5 - p.dy * side * len * 0.8,
			p.y - p.dy * len * 0.5 + p.dx * side * len * 0.8,
			p.x - p.dx * len - p.dy * side * len * 0.2,
			p.y - p.dy * len + p.dx * side * len * 0.2
		);
		c.stroke();
	}
	c.restore();
}

// ------------------------------------------------------------------------- C: the ash funnel

export function ashFunnel(c: CanvasRenderingContext2D, S: number, tail: readonly TailPoint[], time: number, fade: number): void {
	if (tail.length < 3) return;
	c.save();
	const n = Math.min(tail.length - 1, 9);
	for (let j = n; j >= 1; j -= 1) {
		const p = tail[Math.floor((j / n) * (tail.length - 1))];
		const u = p.u;
		const ry = S * (0.12 + 0.38 * (1 - u));
		const rx = S * 0.1;
		const swing = Math.sin(time * 4 - u * 9 + j) * S * 0.1 * u;
		const x = p.x - p.dy * swing;
		const y = p.y + p.dx * swing;
		const rot = Math.atan2(p.dy, p.dx);
		c.save();
		c.translate(x, y);
		c.rotate(rot);
		c.beginPath();
		c.ellipse(0, 0, rx, ry, 0, 0, TAU);
		c.fillStyle = `rgba(40,26,24,${0.75 * (1 - u * 0.6) * fade})`;
		c.fill();
		c.lineWidth = S * 0.05;
		c.strokeStyle = `rgba(170,156,146,${0.42 * (1 - u) * fade})`;
		c.stroke();
		c.globalCompositeOperation = 'lighter';
		c.strokeStyle = `rgba(255,110,36,${0.85 * (1 - u * 0.7) * fade})`;
		c.lineWidth = S * 0.06;
		c.beginPath();
		c.ellipse(0, 0, rx, ry, 0, -1.2, 1.2);
		c.stroke();
		c.restore();
	}
	for (let k = 0; k < 34; k += 1) {
		const p = tail[Math.min(tail.length - 1, Math.floor(hash(k, 7) * tail.length))];
		const o = (hash(k, 8) - 0.5) * 2 * S * (0.08 + 0.36 * (1 - p.u));
		const a = (1 - p.u) * fade;
		c.fillStyle = `rgba(255,${130 + 60 * hash(k, 9)},60,${0.8 * a})`;
		c.fillRect(p.x - p.dy * o, p.y + p.dx * o, 3.2, 3.2);
	}
	c.restore();
}

/** The windup, all variants: embers drawn in towards the crouching body, then let go. */
export function windupPull(c: CanvasRenderingContext2D, S: number, x: number, y: number, p: number, time: number): void {
	c.save();
	c.globalCompositeOperation = 'lighter';
	for (let i = 0; i < 14; i += 1) {
		const q = (time * 1.4 + hash(i, 1)) % 1;
		const a = hash(i, 2) * TAU + time * 1.2;
		const r = S * (1.15 - 0.95 * q);
		c.fillStyle = `rgba(255,${140 + 60 * q},60,${0.75 * p * q})`;
		c.fillRect(x + Math.cos(a) * r - 1.2, y + Math.sin(a) * r * 0.8 - 1.2, 2.6, 2.6);
	}
	glowDot(c, x, y + S * 0.1, S * 0.9, '255,70,30', 0.16 * p);
	c.restore();
}
