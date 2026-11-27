// The quarantine zone as the game draws it (the owner's picks, 2026-11-27: the bile film's colours on
// a stepped block of the maze's tiles, walls and all, redrawn the same day: clean, thin and exact,
// with steel shutters for the seals; `StationSquad`'s fence, `QuarantineZone`).
//   The warning: the whole coming zone at once (the owner, 2026-11-26: a zone growing in pieces did
//   not show what it would hold): an amber hatch on its tiles, a dashed amber outline on the tile
//   edges, and chevrons running out through every door, where a seal will stand. Then the zone
//   grows from the seals' roots as the projectors charge and the warning fades.
//   The zone: its tiles faintly tinted, a soft band along the inside of the outline, one crisp pale
//   lime line on a dark under-stroke along the tile edges (through the walls). No veins, no plugs.
//   The seal (the one place that holds him): two thin steel leaves closing from the walls across
//   the corridor, hazard bars on their free ends, a lit seam between them. The thin seal keeps a
//   gap in the middle that flickers, shudders when he pushes into it and is torn wide once he has.
import type { QuarantineRing, RingSeal } from '../../logic/station/StationSquad';

export interface RingLook {
	/** The warning contour, 0..1: shown while the projectors walk and charge. */
	readonly guide: number;
	/** The projectors' charge, 0..1 (the tell); lit 0..1. */
	readonly charge: number;
	readonly lit: number;
	/** The seal he presses into, and how hard (0..1). */
	readonly pressed: RingSeal | null;
	readonly press: number;
}

export interface RingLayout {
	readonly tileSize: number;
	readonly offsetX: number;
	readonly offsetY: number;
}

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const DARK = '14, 20, 6';
const BODY = '206, 216, 112';
const LIGHT = '250, 252, 204';
const GLOW = '170, 204, 50';
const ZONE = '70, 96, 20';
const AMBER = '255, 190, 110';

/** The zone's tiles as one path, with its bounds, kept while the zone and the layout stay. */
interface ZoneShape {
	readonly path: Path2D;
	readonly x0: number;
	readonly y0: number;
	readonly x1: number;
	readonly y1: number;
}
let cached: { zone: ReadonlySet<number>; key: string; shape: ZoneShape } | null = null;

function zoneShape(ring: QuarantineRing, L: RingLayout): ZoneShape {
	const S = L.tileSize;
	const key = `${S}|${L.offsetX}|${L.offsetY}|${ring.width}`;
	if (cached && cached.zone === ring.zone && cached.key === key) return cached.shape;
	const path = new Path2D();
	let x0 = Infinity;
	let y0 = Infinity;
	let x1 = -Infinity;
	let y1 = -Infinity;
	for (const k of ring.zone) {
		const tx = L.offsetX + (k % ring.width) * S;
		const ty = L.offsetY + Math.floor(k / ring.width) * S;
		path.rect(tx - 0.5, ty - 0.5, S + 1, S + 1);
		x0 = Math.min(x0, tx);
		y0 = Math.min(y0, ty);
		x1 = Math.max(x1, tx + S);
		y1 = Math.max(y1, ty + S);
	}
	const shape = { path, x0, y0, x1, y1 };
	cached = { zone: ring.zone, key, shape };
	return shape;
}

export function drawRing(
	c: Ctx,
	L: RingLayout,
	ring: QuarantineRing,
	ph: RingLook,
	time: number
): void {
	const S = L.tileSize;
	const px = (x: number) => L.offsetX + x * S;
	const py = (y: number) => L.offsetY + y * S;
	const grown = ph.lit > 0 ? 1 : ph.charge;
	const alive = ph.lit > 0 ? ph.lit : 1;
	// a seal's own edge: its last tile inside and the way out across it
	const doors = ring.seals.map((s) => [s.x - s.dx, s.y - s.dy, s.dx, s.dy] as const);
	const side = (x: number, y: number, dx: number, dy: number) => {
		const ex = px(x + 0.5 + dx * 0.5);
		const ey = py(y + 0.5 + dy * 0.5);
		c.moveTo(ex - dy * S * 0.5, ey + dx * S * 0.5);
		c.lineTo(ex + dy * S * 0.5, ey - dx * S * 0.5);
	};
	const zone = zoneShape(ring, L);
	c.save();
	c.lineCap = 'round';
	c.lineJoin = 'round';
	if (ph.guide > 0)
		paintWarning(c, S, ring, doors, zone, side, ph.guide * (1 - 0.7 * grown), time, px, py);
	if (grown > 0) {
		c.globalAlpha = alive * grown;
		if (ph.lit > 0) {
			// the zone inside: a faint sick tint, the hive's slow beat sweeping through it
			const beat = 0.5 + 0.5 * Math.sin((time / 6) * TAU);
			c.fillStyle = `rgba(${ZONE}, ${(0.16 + 0.05 * beat) * ph.lit})`;
			c.fill(zone.path);
		}
		// a soft band along the inside of the outline
		c.save();
		c.clip(zone.path);
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
		ring.seals.forEach((s, i) => {
			c.save();
			// local u runs along the leaves (across the way), +v the way out
			c.translate(px(s.x + 0.5 - s.dx * 0.5), py(s.y + 0.5 - s.dy * 0.5));
			c.rotate(Math.atan2(s.dy, s.dx) - Math.PI / 2);
			paintSeal(c, S, s, ring.broken, ph, time, i * 1.7, grown, alive);
			c.restore();
		});
	}
	c.restore();
}

/** The whole coming zone at once, fading as the projectors charge. */
function paintWarning(
	c: Ctx,
	S: number,
	ring: QuarantineRing,
	doors: ReadonlyArray<readonly [number, number, number, number]>,
	zone: ZoneShape,
	side: (x: number, y: number, dx: number, dy: number) => void,
	fade: number,
	time: number,
	px: (x: number) => number,
	py: (y: number) => number
): void {
	const pulse = 0.5 + 0.5 * Math.sin(time * TAU * 0.9);
	const { x0, y0, x1, y1 } = zone;
	c.save();
	c.clip(zone.path);
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

/** Two thin steel leaves closing from the walls across a corridor, in local space: u along them
 *  (wall to wall), v the way out. They grow from both roots toward the middle; the thin seal keeps
 *  a gap, wide once torn. A lit seam shows through the gap, or at the join. */
function paintSeal(
	c: Ctx,
	S: number,
	s: RingSeal,
	broken: boolean,
	ph: RingLook,
	t: number,
	seed: number,
	grown: number,
	alive: number
): void {
	const h = S * 0.5;
	const T = S * 0.13;
	const hit = ph.pressed === s ? ph.press : 0;
	const flick = s.weak ? 0.72 + 0.28 * Math.sin(t * 9 + seed * 3) * Math.sin(t * 2.3) : 1;
	const gap = s.weak ? (broken ? S * 0.3 : S * 0.07) : 0;
	const reach = h * grown;
	const leaves = (
		[
			[-h, Math.min(-gap, -h + reach)],
			[Math.max(gap, h - reach), h]
		] as Array<[number, number]>
	).filter(([a, b]) => b > a);
	c.save();
	c.globalAlpha *= alive;
	c.translate(0, hit * Math.sin(t * 45) * S * 0.012);
	for (const [a, b] of leaves) {
		const lo = a;
		const w = b - a;
		const fromLeft = a <= -h + 0.5; // this leaf stands on the left wall
		const free = fromLeft ? b : a; // its free end
		// three flat bands (a pale top, the base, a dark underside) and one ink line
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
		c.rect(fromLeft ? free - hz : free, -T / 2, hz, T);
		c.clip();
		c.fillStyle = `rgba(${AMBER}, 0.95)`;
		for (let k = -2; k < 5; k++) {
			const bx = free + (fromLeft ? -1 : 1) * k * S * 0.05;
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
		c.arc(fromLeft ? lo + S * 0.05 : b - S * 0.05, 0, S * 0.018, 0, TAU);
		c.fillStyle = '#c9d4cf';
		c.fill();
	}
	// the seam: a lit line through the gap, or across the join while it is whole
	if (leaves.length === 2) {
		const g0 = leaves[0][1];
		const g1 = leaves[1][0];
		c.globalAlpha *= flick;
		c.lineCap = 'round';
		const seam = () => {
			c.beginPath();
			if (g1 - g0 < 1) {
				c.moveTo(g0, -T / 2);
				c.lineTo(g0, T / 2);
			} else {
				c.moveTo(g0, 0);
				c.lineTo(g1, 0);
			}
		};
		seam();
		c.strokeStyle = `rgba(${LIGHT}, 1)`;
		c.lineWidth = Math.max(2, S * 0.05);
		c.stroke();
		c.globalCompositeOperation = 'lighter';
		seam();
		c.strokeStyle = `rgba(${GLOW}, ${0.4 + 0.2 * hit})`;
		c.lineWidth = S * 0.2;
		c.stroke();
	}
	c.restore();
}
