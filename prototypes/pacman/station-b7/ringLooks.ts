// Prototype: the quarantine zone's warning, outline and seals redrawn (the owner, 2026-11-27: the
// seals are too bulky, and the warning and the zone's highlight want better art). One module, the
// game's `drawRing` stays the reference (`?look` absent). Round one, three seals on one new zone:
//   shared  the zone: a thin crisp outline, a soft band along its inside, a faint tint; no veins;
//           the warning: an amber hatch on the coming zone, a dashed outline, chevrons on the doors
//           where the seals will stand (it shows where the zone will close, not only its shape);
//   laser   the seal as one taut beam wall to wall, a tick at each end, a pulse running along it;
//   shutter two thin steel leaves closing from the walls, a lit seam between them;
//   thread  a hair-thin sagging thread with three beads, anchored at the walls.
// `?look=laser|shutter|thread` on the `station-b7` page; the ring's buttons still pick the phase.
import type { RingSeal } from '../../../src/games/pacman/logic/station/StationSquad';
import type { QuarantineRing } from '../../../src/games/pacman/logic/station/StationSquad';
import type { RingLayout, RingLook } from '../../../src/games/pacman/render/station/quarantineRing';

export type SealLook = 'laser' | 'shutter' | 'thread';

const TAU = Math.PI * 2;
const DARK = '14, 20, 6';
const BODY = '206, 216, 112';
const LIGHT = '250, 252, 204';
const GLOW = '170, 204, 50';
const ZONE = '70, 96, 20';
const AMBER = '255, 190, 110';

type Ctx = CanvasRenderingContext2D;

export function drawRingNew(
	c: Ctx,
	L: RingLayout,
	ring: QuarantineRing,
	ph: RingLook,
	time: number,
	look: SealLook
): void {
	const S = L.tileSize;
	const px = (x: number) => L.offsetX + x * S;
	const py = (y: number) => L.offsetY + y * S;
	const grown = ph.lit > 0 ? 1 : ph.charge;
	const alive = ph.lit > 0 ? ph.lit : 1;
	const doors = ring.seals.map((s) => [s.x - s.dx, s.y - s.dy, s.dx, s.dy] as const);
	const side = (x: number, y: number, dx: number, dy: number) => {
		const ex = px(x + 0.5 + dx * 0.5);
		const ey = py(y + 0.5 + dy * 0.5);
		c.moveTo(ex - dy * S * 0.5, ey + dx * S * 0.5);
		c.lineTo(ex + dy * S * 0.5, ey - dx * S * 0.5);
	};
	const zone = new Path2D();
	let x0 = Infinity;
	let y0 = Infinity;
	let x1 = -Infinity;
	let y1 = -Infinity;
	for (const k of ring.zone) {
		const tx = px(k % ring.width);
		const ty = py(Math.floor(k / ring.width));
		zone.rect(tx - 0.5, ty - 0.5, S + 1, S + 1);
		x0 = Math.min(x0, tx);
		y0 = Math.min(y0, ty);
		x1 = Math.max(x1, tx + S);
		y1 = Math.max(y1, ty + S);
	}
	c.save();
	c.lineCap = 'round';
	c.lineJoin = 'round';

	// ---- the warning: where the zone will be, and where it will close
	if (ph.guide > 0) {
		const pulse = 0.5 + 0.5 * Math.sin(time * TAU * 0.9);
		const fade = ph.guide * (1 - 0.7 * grown);
		c.save();
		c.clip(zone);
		c.fillStyle = `rgba(150, 110, 30, ${(0.07 + 0.03 * pulse) * fade})`;
		c.fillRect(x0, y0, x1 - x0, y1 - y0);
		// a thin diagonal hatch drifting slowly
		const gap = S * 0.3;
		const drift = (time * S * 0.12) % gap;
		c.beginPath();
		for (let k = -(y1 - y0); k < x1 - x0 + gap; k += gap) {
			c.moveTo(x0 + k + drift, y0);
			c.lineTo(x0 + k + drift - (y1 - y0), y1);
		}
		c.strokeStyle = `rgba(${AMBER}, ${0.16 * fade})`;
		c.lineWidth = 1;
		c.stroke();
		c.restore();
		c.setLineDash([S * 0.26, S * 0.16]);
		c.lineDashOffset = -time * S * 0.4;
		c.strokeStyle = `rgba(${AMBER}, ${(0.6 + 0.3 * pulse) * fade})`;
		c.lineWidth = Math.max(1.5, S * 0.05);
		c.beginPath();
		for (const [x, y, dx, dy] of [...ring.edges, ...doors]) side(x, y, dx, dy);
		c.stroke();
		c.setLineDash([]);
		// chevrons run out through each door: here it will close
		for (const s of ring.seals) {
			c.save();
			c.translate(px(s.x + 0.5 - s.dx * 0.5), py(s.y + 0.5 - s.dy * 0.5));
			c.rotate(Math.atan2(s.dy, s.dx));
			for (let j = 0; j < 2; j++) {
				const u = (time * 0.7 + j * 0.5) % 1;
				const cx = -S * 0.3 + u * S * 0.75;
				const a = S * 0.12;
				const b = S * 0.19;
				c.beginPath();
				c.moveTo(cx - a, -b);
				c.lineTo(cx, 0);
				c.lineTo(cx - a, b);
				c.strokeStyle = `rgba(${AMBER}, ${Math.sin(u * Math.PI) * 0.9 * fade})`;
				c.lineWidth = Math.max(2, S * 0.07);
				c.stroke();
			}
			c.restore();
		}
	}

	// ---- the zone
	if (grown > 0) {
		c.globalAlpha = alive * grown;
		if (ph.lit > 0) {
			const beat = 0.5 + 0.5 * Math.sin((time / 6) * TAU);
			c.fillStyle = `rgba(${ZONE}, ${(0.16 + 0.05 * beat) * ph.lit})`;
			c.fill(zone);
		}
		// the soft band along the inside of the outline
		c.save();
		c.clip(zone);
		c.beginPath();
		for (const [x, y, dx, dy] of ring.edges) side(x, y, dx, dy);
		c.strokeStyle = `rgba(${GLOW}, 0.07)`;
		for (const w of [0.18, 0.4, 0.7]) {
			c.lineWidth = S * w * 2;
			c.stroke();
		}
		c.restore();
		// the outline: one crisp line on a dark under-stroke, a thin glow
		c.beginPath();
		for (const [x, y, dx, dy] of ring.edges) side(x, y, dx, dy);
		c.globalCompositeOperation = 'lighter';
		c.strokeStyle = `rgba(${GLOW}, 0.14)`;
		c.lineWidth = S * 0.2;
		c.stroke();
		c.globalCompositeOperation = 'source-over';
		c.strokeStyle = `rgba(${DARK}, 0.8)`;
		c.lineWidth = Math.max(2.5, S * 0.08);
		c.stroke();
		c.strokeStyle = `rgba(${BODY}, 0.95)`;
		c.lineWidth = Math.max(1.5, S * 0.04);
		c.stroke();
		c.strokeStyle = `rgba(${LIGHT}, ${0.55 + 0.15 * Math.sin(time * 2.4)})`;
		c.lineWidth = Math.max(1, S * 0.014);
		c.stroke();
		c.globalAlpha = 1;
		// ---- the seals
		ring.seals.forEach((s, i) => {
			c.save();
			c.translate(px(s.x + 0.5 - s.dx * 0.5), py(s.y + 0.5 - s.dy * 0.5));
			c.rotate(Math.atan2(s.dy, s.dx) - Math.PI / 2);
			const o = { S, s, broken: ring.broken, ph, t: time, seed: i * 1.7, grown, alive };
			if (look === 'laser') laser(c, o);
			else if (look === 'shutter') shutter(c, o);
			else thread(c, o);
			c.restore();
		});
	}
	c.restore();
}

// ------------------------------------------------------------------------------------- seals

interface SealArgs {
	readonly S: number;
	readonly s: RingSeal;
	readonly broken: boolean;
	readonly ph: RingLook;
	readonly t: number;
	readonly seed: number;
	readonly grown: number;
	readonly alive: number;
}

/** The pieces of a seal in local u (wall to wall, ±h): it grows from both roots toward the middle;
 *  the thin one keeps a gap, wide once torn. */
function pieces(a: SealArgs): Array<[number, number]> {
	const h = a.S * 0.5;
	const gap = a.s.weak ? (a.broken ? a.S * 0.3 : a.S * 0.07) : 0;
	const reach = h * a.grown;
	return (
		[
			[-h, Math.min(-gap, -h + reach)],
			[Math.max(gap, h - reach), h]
		] as Array<[number, number]>
	).filter(([p, q]) => q > p);
}
const hitOf = (a: SealArgs) => (a.ph.pressed === a.s ? a.ph.press : 0);
const flickerOf = (a: SealArgs) =>
	a.s.weak ? 0.72 + 0.28 * Math.sin(a.t * 9 + a.seed * 3) * Math.sin(a.t * 2.3) : 1;

/** A taut beam, a tick at each end, a pulse running along it. */
function laser(c: Ctx, a: SealArgs): void {
	const { S } = a;
	const h = S * 0.5;
	const hit = hitOf(a);
	const bulge = S * (0.05 + 0.16 * hit);
	const v = (u: number) => bulge * (1 - (u / h) ** 2);
	c.save();
	c.globalAlpha *= a.alive * flickerOf(a);
	c.lineCap = 'round';
	for (const [p, q] of pieces(a)) {
		const path = () => {
			c.beginPath();
			for (let i = 0; i <= 8; i++) {
				const u = p + ((q - p) * i) / 8;
				if (i) c.lineTo(u, v(u));
				else c.moveTo(u, v(u));
			}
		};
		c.globalCompositeOperation = 'lighter';
		path();
		c.strokeStyle = `rgba(${GLOW}, ${0.28 + 0.16 * hit})`;
		c.lineWidth = S * 0.22;
		c.stroke();
		c.globalCompositeOperation = 'source-over';
		path();
		c.strokeStyle = `rgba(${DARK}, 0.85)`;
		c.lineWidth = Math.max(3.5, S * 0.1);
		c.stroke();
		if (a.s.weak) c.setLineDash([S * 0.14, S * 0.08]);
		path();
		c.strokeStyle = `rgba(${LIGHT}, 1)`;
		c.lineWidth = Math.max(2, S * 0.05);
		c.stroke();
		c.setLineDash([]);
		// the pulse
		const u = p + (q - p) * ((a.t * 0.8 + a.seed) % 1);
		c.beginPath();
		c.moveTo(u - S * 0.07, v(u));
		c.lineTo(u + S * 0.07, v(u));
		c.strokeStyle = 'rgba(255, 255, 255, 1)';
		c.lineWidth = Math.max(2.5, S * 0.075);
		c.stroke();
	}
	// a node at each end, on the wall
	for (const e of [-1, 1]) {
		c.beginPath();
		c.arc(e * h, 0, S * 0.055, 0, TAU);
		c.fillStyle = `rgba(${LIGHT}, 1)`;
		c.fill();
		c.strokeStyle = `rgba(${DARK}, 0.9)`;
		c.lineWidth = Math.max(1.2, S * 0.025);
		c.stroke();
	}
	if (a.s.weak && a.broken) sparks(c, a, v);
	c.restore();
}

/** The torn ends: two small crossed strokes at each lip of the gap. */
function sparks(c: Ctx, a: SealArgs, v: (u: number) => number): void {
	const gap = a.S * 0.3;
	c.strokeStyle = `rgba(${LIGHT}, 0.8)`;
	c.lineWidth = Math.max(1, a.S * 0.022);
	for (const e of [-1, 1]) {
		c.beginPath();
		c.moveTo(e * gap, v(0) - a.S * 0.07);
		c.lineTo(e * gap * 0.7, v(0) + a.S * 0.05);
		c.moveTo(e * gap, v(0) + a.S * 0.07);
		c.lineTo(e * gap * 0.7, v(0) - a.S * 0.05);
		c.stroke();
	}
}

/** Two thin steel leaves closing from the walls, a lit seam between their ends. */
function shutter(c: Ctx, a: SealArgs): void {
	const { S } = a;
	const T = S * 0.13;
	const hit = hitOf(a);
	c.save();
	c.globalAlpha *= a.alive;
	for (const [p, q] of pieces(a)) {
		const shake = hit * Math.sin(a.t * 45) * S * 0.012;
		c.save();
		c.translate(0, shake);
		const w = q - p;
		const wall = p < 0 ? p : q; // the end that sits on the wall
		const lead = p < 0 ? q : p; // the free end
		const lo = Math.min(p, q);
		// the leaf in three flat bands: a pale top, the base, a dark underside, one ink line
		c.fillStyle = '#3a4742';
		c.fillRect(lo, -T / 2, w, T);
		c.fillStyle = '#9fb1aa';
		c.fillRect(lo, -T / 2, w, T * 0.3);
		c.fillStyle = '#121917';
		c.fillRect(lo, T * 0.22, w, T * 0.28);
		// hazard bars on the free end
		const hz = Math.min(S * 0.22, w);
		c.save();
		c.beginPath();
		c.rect(Math.min(lead, lead + (p < 0 ? -hz : hz)), -T / 2, hz, T);
		c.clip();
		c.fillStyle = `rgba(${AMBER}, 0.95)`;
		for (let k = -2; k < 5; k++) {
			const bx = lead + (p < 0 ? -1 : 1) * k * S * 0.05;
			c.beginPath();
			c.moveTo(bx, -T / 2);
			c.lineTo(bx + S * 0.025, -T / 2);
			c.lineTo(bx + S * 0.025 - T, T / 2);
			c.lineTo(bx - T, T / 2);
			c.closePath();
			c.fill();
		}
		c.restore();
		c.strokeStyle = '#0c1110';
		c.lineWidth = Math.max(1, S * 0.02);
		c.strokeRect(lo, -T / 2, w, T);
		// a bolt on the wall end
		c.beginPath();
		c.arc(wall + (p < 0 ? S * 0.05 : -S * 0.05), 0, S * 0.018, 0, TAU);
		c.fillStyle = '#c9d4cf';
		c.fill();
		c.restore();
	}
	// the seam: a lit line across the ends while it is whole; a lit gap through the thin one
	const ps = pieces(a);
	if (ps.length === 2) {
		const g0 = ps[0][1];
		const g1 = ps[1][0];
		c.globalAlpha *= flickerOf(a);
		c.strokeStyle = `rgba(${LIGHT}, 1)`;
		c.lineWidth = Math.max(2, S * 0.05);
		c.lineCap = 'round';
		c.beginPath();
		c.moveTo(g0, 0);
		c.lineTo(g1, 0);
		c.stroke();
		c.globalCompositeOperation = 'lighter';
		c.strokeStyle = `rgba(${GLOW}, 0.4)`;
		c.lineWidth = S * 0.2;
		c.stroke();
	}
	c.restore();
}

/** A hair-thin thread sagging across, three beads on it, anchors at the walls. */
function thread(c: Ctx, a: SealArgs): void {
	const { S } = a;
	const h = S * 0.5;
	const hit = hitOf(a);
	const sag = S * (0.07 + 0.15 * hit);
	const v = (u: number) => sag * (1 - (u / h) ** 2);
	const thin = a.s.weak ? 0.7 : 1;
	c.save();
	c.globalAlpha *= a.alive * flickerOf(a);
	c.lineCap = 'round';
	for (const [p, q] of pieces(a)) {
		const path = () => {
			c.beginPath();
			for (let i = 0; i <= 8; i++) {
				const u = p + ((q - p) * i) / 8;
				if (i) c.lineTo(u, v(u));
				else c.moveTo(u, v(u));
			}
		};
		path();
		c.strokeStyle = `rgba(${DARK}, 0.7)`;
		c.lineWidth = Math.max(2.5, S * 0.075 * thin);
		c.stroke();
		path();
		c.strokeStyle = `rgba(${BODY}, 0.98)`;
		c.lineWidth = Math.max(1.6, S * 0.038 * thin);
		c.stroke();
		// beads along the piece
		const n = Math.max(1, Math.round(((q - p) / S) * 3));
		for (let k = 1; k <= n; k++) {
			const u = p + ((q - p) * k) / (n + 1);
			const r = S * 0.06;
			c.beginPath();
			c.arc(u, v(u), r, 0, TAU);
			c.fillStyle = `rgba(${LIGHT}, 0.95)`;
			c.fill();
			c.strokeStyle = `rgba(${DARK}, 0.85)`;
			c.lineWidth = Math.max(1, S * 0.018);
			c.stroke();
		}
	}
	// the anchors on the walls
	for (const e of [-1, 1]) {
		c.beginPath();
		c.arc(e * h, 0, S * 0.05, 0, TAU);
		c.fillStyle = `rgba(${LIGHT}, 1)`;
		c.fill();
		c.strokeStyle = `rgba(${DARK}, 0.85)`;
		c.lineWidth = Math.max(1, S * 0.018);
		c.stroke();
	}
	if (a.s.weak && a.broken) {
		// two frayed tails curling away from the parted ends
		const gap = S * 0.3;
		c.strokeStyle = `rgba(${BODY}, 0.9)`;
		c.lineWidth = Math.max(1, S * 0.02);
		for (const e of [-1, 1]) {
			c.beginPath();
			c.moveTo(e * gap, v(0));
			c.quadraticCurveTo(e * gap * 0.75, v(0) + S * 0.1, e * gap * 0.45, v(0) + S * 0.07);
			c.stroke();
		}
	}
	c.restore();
}
