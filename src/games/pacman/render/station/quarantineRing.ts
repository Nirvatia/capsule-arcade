// The quarantine zone as the game draws it (the owner's picks, 2026-11-27: the bile film, on a
// stepped block of the maze's tiles, walls and all; `StationSquad`'s fence, `QuarantineZone`).
// The black parasite's hive is lime and olive on black, so the zone is the bile's own pale lime:
// the zone's tiles faintly tinted, its outline a thin film along the tile edges through the walls
// with fine veins reaching inward, and where a corridor leaves the zone a brighter curtain stands
// across it (the seal: the one place that holds him). No plugs, no roots in the walls. The thin
// seal is torn in the middle and flickers; his push bulges it, torn wide once he has. The tell:
// the whole coming outline at once, an amber dashed line on the tile edges with the zone faintly
// tinted (the owner, 2026-11-26: a zone growing in pieces did not show what it would hold), then
// the film grows from the seals' roots as the projectors charge and the warning fades.
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

const TAU = Math.PI * 2;
const BILE = {
	dark: '14, 20, 6',
	body: '206, 216, 112',
	light: '250, 252, 204',
	glow: '170, 204, 50',
	zone: '70, 96, 20'
};

/** A seed per position, 0..1. */
const hash = (a: number, b: number) => {
	const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
	return s - Math.floor(s);
};

/** A film across a corridor, in local space: u along it (wall to wall), v the way out. */
function paintSeal(
	c: CanvasRenderingContext2D,
	S: number,
	s: RingSeal,
	broken: boolean,
	ph: RingLook,
	t: number,
	seed: number
): void {
	const grown = ph.lit > 0 ? 1 : ph.charge;
	if (grown <= 0) return;
	const alive = ph.lit > 0 ? ph.lit : 1;
	const h = S * 0.5;
	const hit = ph.pressed === s ? ph.press : 0;
	const bulge = S * (0.06 + 0.3 * hit);
	const flick = s.weak ? 0.7 + 0.3 * Math.sin(t * 9 + seed * 3) * Math.sin(t * 2.3) : 1;
	const gap = s.weak ? (broken ? S * 0.34 : S * 0.1) : 0;
	const reach = h * grown; // it grows from both roots toward the middle
	const pieces = (
		[
			[-h, Math.min(-gap, -h + reach)],
			[Math.max(gap, h - reach), h]
		] as Array<[number, number]>
	).filter(([a, b]) => b > a);
	const v = (u: number) =>
		bulge * (1 - (u / h) ** 2) + Math.sin(u * 0.35 + t * 1.6 + seed) * S * 0.02;
	const w = (s.weak ? 0.07 : 0.1) * S * (1 + 0.1 * Math.sin(t * 2.4 + seed));
	c.save();
	c.globalAlpha *= alive * flick;
	c.lineCap = 'round';
	c.lineJoin = 'round';
	for (const [a, b] of pieces) {
		const path = () => {
			c.beginPath();
			for (let i = 0; i <= 10; i += 1) {
				const u = a + ((b - a) * i) / 10;
				if (i) c.lineTo(u, v(u));
				else c.moveTo(u, v(u));
			}
		};
		// the curtain: a soft glow spilling both ways
		c.globalCompositeOperation = 'lighter';
		path();
		c.strokeStyle = `rgba(${BILE.glow}, ${0.2 + 0.18 * hit})`;
		c.lineWidth = w * 5;
		c.stroke();
		c.globalCompositeOperation = 'source-over';
		path();
		c.strokeStyle = `rgba(${BILE.dark}, 0.9)`;
		c.lineWidth = w * 2.2;
		c.stroke();
		path();
		c.strokeStyle = `rgba(${BILE.body}, 0.9)`;
		c.lineWidth = w * 1.4;
		c.stroke();
		path();
		// the bright core: it must read at once
		c.strokeStyle = `rgba(${BILE.light}, ${0.75 + 0.25 * Math.sin(t * 3.1 + seed) + 0.3 * hit})`;
		c.lineWidth = Math.max(1, w * 0.45);
		c.stroke();
		// fine veins reaching back into the zone
		for (let k = 0; k < 4; k += 1) {
			const u = a + (b - a) * (0.15 + 0.7 * hash(seed * 7 + k, 1));
			const len = S * (0.35 + 0.55 * hash(seed * 7 + k, 2));
			const sway = Math.sin(t * 0.8 + k + seed) * S * 0.07;
			c.beginPath();
			c.moveTo(u, v(u));
			c.quadraticCurveTo(u + sway, v(u) - len * 0.5, u + sway * 1.6, v(u) - len);
			c.strokeStyle = `rgba(${BILE.body}, 0.3)`;
			c.lineWidth = Math.max(1, S * 0.025);
			c.stroke();
		}
	}
	if (s.weak && pieces.length === 2) {
		// the torn edges: frayed strands across the hole
		c.strokeStyle = `rgba(${BILE.light}, 0.55)`;
		c.lineWidth = Math.max(1, S * 0.022);
		for (const e of [-1, 1]) {
			c.beginPath();
			c.moveTo(e * gap, v(0) - S * 0.1);
			c.lineTo(e * gap * 0.35, v(0) + S * 0.06);
			c.stroke();
		}
	}
	c.restore();
}

export function drawRing(
	c: CanvasRenderingContext2D,
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
	const all = [...ring.edges, ...doors];
	const side = (x: number, y: number, dx: number, dy: number) => {
		const ex = px(x + 0.5 + dx * 0.5);
		const ey = py(y + 0.5 + dy * 0.5);
		c.moveTo(ex - dy * S * 0.5, ey + dx * S * 0.5);
		c.lineTo(ex + dy * S * 0.5, ey - dx * S * 0.5);
	};
	const fillTiles = (style: string) => {
		c.fillStyle = style;
		for (const k of ring.zone)
			c.fillRect(px(k % ring.width) - 0.5, py(Math.floor(k / ring.width)) - 0.5, S + 1, S + 1);
	};
	c.save();
	c.lineCap = 'round';
	c.lineJoin = 'round';
	// the warning: the whole coming zone at once, fading as the projectors charge
	if (ph.guide > 0) {
		const pulse = 0.5 + 0.5 * Math.sin(time * TAU * 0.9);
		const fade = ph.guide * (1 - 0.7 * (ph.lit > 0 ? 1 : ph.charge));
		fillTiles(`rgba(150, 120, 40, ${(0.09 + 0.05 * pulse) * fade})`);
		c.setLineDash([S * 0.34, S * 0.22]);
		c.lineDashOffset = -time * S * 0.5;
		c.strokeStyle = `rgba(255, 190, 110, ${(0.5 + 0.35 * pulse) * fade})`;
		c.lineWidth = Math.max(1.5, S * 0.07);
		c.beginPath();
		for (const [x, y, dx, dy] of all) side(x, y, dx, dy);
		c.stroke();
		c.setLineDash([]);
	}
	if (grown > 0) {
		if (ph.lit > 0) {
			// the zone inside: a faint sick tint, the hive's slow beat sweeping through it
			const beat = 0.5 + 0.5 * Math.sin((time / 6) * TAU);
			fillTiles(`rgba(${BILE.zone}, ${(0.2 + 0.06 * beat) * ph.lit})`);
		}
		// the outline through the walls: a soft glow, a thin bright film along the tile edges
		c.globalAlpha = alive * grown;
		c.beginPath();
		for (const [x, y, dx, dy] of ring.edges) side(x, y, dx, dy);
		c.globalCompositeOperation = 'lighter';
		c.strokeStyle = `rgba(${BILE.glow}, 0.22)`;
		c.lineWidth = S * 0.34;
		c.stroke();
		c.globalCompositeOperation = 'source-over';
		c.strokeStyle = `rgba(${BILE.dark}, 0.85)`;
		c.lineWidth = Math.max(2, S * 0.1);
		c.stroke();
		c.strokeStyle = `rgba(${BILE.body}, 0.9)`;
		c.lineWidth = Math.max(1.5, S * 0.06);
		c.stroke();
		c.strokeStyle = `rgba(${BILE.light}, ${0.6 + 0.2 * Math.sin(time * 2.4)})`;
		c.lineWidth = Math.max(1, S * 0.022);
		c.stroke();
		// fine veins reaching inward from the outline
		c.strokeStyle = `rgba(${BILE.body}, 0.26)`;
		c.lineWidth = Math.max(1, S * 0.025);
		ring.edges.forEach(([x, y, dx, dy], i) => {
			if (hash(i, 5) < 0.45) return;
			const ex = px(x + 0.5 + dx * 0.5) - dy * S * (hash(i, 6) - 0.5) * 0.6;
			const ey = py(y + 0.5 + dy * 0.5) + dx * S * (hash(i, 6) - 0.5) * 0.6;
			const len = S * (0.35 + 0.8 * hash(i, 7));
			const sway = Math.sin(time * 0.8 + i) * S * 0.08;
			c.beginPath();
			c.moveTo(ex, ey);
			c.quadraticCurveTo(
				ex - dx * len * 0.5 + dy * sway,
				ey - dy * len * 0.5 - dx * sway,
				ex - dx * len,
				ey - dy * len
			);
			c.stroke();
		});
		c.globalAlpha = 1;
		ring.seals.forEach((s, i) => {
			c.save();
			// local u runs along the film (across the way), +v the way out
			c.translate(px(s.x + 0.5 - s.dx * 0.5), py(s.y + 0.5 - s.dy * 0.5));
			c.rotate(Math.atan2(s.dy, s.dx) - Math.PI / 2);
			paintSeal(c, S, s, ring.broken, ph, time, hash(i, 9));
			c.restore();
		});
	}
	c.restore();
}
