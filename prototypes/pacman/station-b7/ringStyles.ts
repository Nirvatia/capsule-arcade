// Candidate for the quarantine zone (prototype, throwaway): the owner's pick of the ring's look,
// the bile film, on a zone cut out of the maze like a piece of a mosaic instead of a circle.
// The zone is the open tiles within a graph distance of a point; its outline runs along the
// walls (they close it by themselves) and crosses a corridor wherever it leaves the zone: there
// the film stands across the corridor and holds the hero. No plugs, no roots in the walls.
import type { GhostKind } from '../../../src/games/pacman/logic/actors/GhostModel';

const TAU = Math.PI * 2;
const hash = (a: number, b: number) => {
	const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
	return s - Math.floor(s);
};

/** A corridor leaving the zone: the zone's last tile and the way out across the film. */
export interface Door {
	readonly x: number;
	readonly y: number;
	readonly dx: number;
	readonly dy: number;
	/** The thin one: he can push through it. */
	readonly weak: boolean;
}

export interface Zone {
	readonly tiles: ReadonlySet<number>;
	readonly W: number;
	readonly doors: readonly Door[];
	/** Zone tiles whose side is a wall: [x, y, dx, dy]. */
	readonly walls: ReadonlyArray<readonly [number, number, number, number]>;
	posts: Array<{ kind: GhostKind; x: number; y: number; a: number; charge: number }>;
	lit: boolean;
	push: number;
	broken: boolean;
}

export interface ZoneLook {
	readonly guide: number;
	readonly charge: number;
	readonly lit: number;
	readonly pressed: Door | null;
	readonly press: number;
}

export interface ZoneLayout {
	readonly tileSize: number;
	readonly offsetX: number;
	readonly offsetY: number;
}

const DIRS = [
	[0, -1],
	[0, 1],
	[-1, 0],
	[1, 0]
] as const;

/**
 * The zone round a tile: the open tiles within the graph distance that keeps them under `budget`
 * (whole layers), so the shape follows the maze: a piece of it, not a disc.
 */
export function planZone(
	open: (x: number, y: number) => boolean,
	W: number,
	H: number,
	tx: number,
	ty: number,
	budget: number
): Zone {
	const dist = new Map<number, number>([[ty * W + tx, 0]]);
	const order = [ty * W + tx];
	for (let i = 0; i < order.length; i++) {
		const k = order[i];
		const x = k % W;
		const y = Math.floor(k / W);
		for (const [dx, dy] of DIRS) {
			const nx = x + dx;
			const ny = y + dy;
			if (!open(nx, ny) || dist.has(ny * W + nx)) continue;
			dist.set(ny * W + nx, (dist.get(k) as number) + 1);
			order.push(ny * W + nx);
		}
	}
	let reach = 0;
	for (let d = 1; ; d++) {
		const n = order.filter((k) => (dist.get(k) as number) <= d).length;
		if (n > budget || n === order.length) {
			reach = n > budget ? d - 1 : d;
			break;
		}
	}
	const tiles = new Set(order.filter((k) => (dist.get(k) as number) <= reach));
	const doors: Door[] = [];
	const walls: Array<[number, number, number, number]> = [];
	for (const k of tiles) {
		const x = k % W;
		const y = Math.floor(k / W);
		for (const [dx, dy] of DIRS) {
			const nx = x + dx;
			const ny = y + dy;
			if (nx >= 0 && ny >= 0 && nx < W && ny < H && tiles.has(ny * W + nx)) continue;
			if (open(nx, ny)) doors.push({ x, y, dx, dy, weak: false });
			else walls.push([x, y, dx, dy]);
		}
	}
	const thin = doors.length > 1 ? 1 : 0;
	const marked = doors.map((d, i) => (i === thin ? { ...d, weak: true } : d));
	// two projectors at the doors farthest apart
	let best: [Door, Door] | null = null;
	let far = -1;
	for (const a of marked)
		for (const b of marked) {
			const d = Math.hypot(a.x - b.x, a.y - b.y);
			if (d > far) {
				far = d;
				best = [a, b];
			}
		}
	const posts = (['BLINKY', 'PINKY'] as GhostKind[]).map((kind, i) => {
		const d = (best as [Door, Door])[i];
		return { kind, x: d.x, y: d.y, a: 0, charge: 0 };
	});
	return { tiles, W, doors: marked, walls, posts, lit: false, push: 0, broken: false };
}

const BILE = {
	dark: '14,20,6',
	body: '206,216,112',
	light: '250,252,204',
	glow: '170,204,50',
	zone: '70,96,20'
};

/** A film across a corridor, in local space: u along it (wall to wall), v the way out. */
function film(
	c: CanvasRenderingContext2D,
	S: number,
	d: Door,
	broken: boolean,
	ph: ZoneLook,
	t: number,
	seed: number
): void {
	const grown = ph.lit > 0 ? 1 : ph.charge;
	if (grown <= 0) return;
	const alive = ph.lit > 0 ? ph.lit : 1;
	const h = S * 0.5;
	const hit = ph.pressed === d ? ph.press : 0;
	const bulge = S * (0.06 + 0.3 * hit);
	const flick = d.weak ? 0.7 + 0.3 * Math.sin(t * 9 + seed * 3) * Math.sin(t * 2.3) : 1;
	const gap = d.weak ? (broken ? S * 0.34 : S * 0.1) : 0;
	const reach = h * grown;
	const pieces = (
		[
			[-h, Math.min(-gap, -h + reach)],
			[Math.max(gap, h - reach), h]
		] as Array<[number, number]>
	).filter(([a, b]) => b > a);
	const v = (u: number) => bulge * (1 - (u / h) ** 2) + Math.sin(u * 0.35 + t * 1.6 + seed) * S * 0.02;
	const w = (d.weak ? 0.07 : 0.1) * S * (1 + 0.1 * Math.sin(t * 2.4 + seed));
	c.save();
	c.globalAlpha *= alive * flick;
	c.lineCap = 'round';
	c.lineJoin = 'round';
	for (const [a, b] of pieces) {
		const path = () => {
			c.beginPath();
			for (let i = 0; i <= 10; i++) {
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
		c.strokeStyle = `rgba(${BILE.light}, ${0.75 + 0.25 * Math.sin(t * 3.1 + seed) + 0.3 * hit})`;
		c.lineWidth = Math.max(1, w * 0.45);
		c.stroke();
		// fine veins reaching back into the zone
		for (let k = 0; k < 4; k++) {
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
	if (d.weak && pieces.length === 2) {
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

/** The whole zone: the warning, the tint, the glow along its walls, the films across the corridors. */
export function drawZone(
	c: CanvasRenderingContext2D,
	L: ZoneLayout,
	z: Zone,
	ph: ZoneLook,
	t: number
): void {
	const S = L.tileSize;
	const px = (x: number) => L.offsetX + x * S;
	const py = (y: number) => L.offsetY + y * S;
	const grown = ph.lit > 0 ? 1 : ph.charge;
	const alive = ph.lit > 0 ? ph.lit : 1;
	c.save();
	// the warning: the whole coming zone at once, an amber dashed outline, fading as it charges
	if (ph.guide > 0) {
		const pulse = 0.5 + 0.5 * Math.sin(t * TAU * 0.9);
		const fade = ph.guide * (1 - 0.7 * (ph.lit > 0 ? 1 : ph.charge));
		c.fillStyle = `rgba(150, 120, 40, ${(0.08 + 0.05 * pulse) * fade})`;
		for (const k of z.tiles) c.fillRect(px(k % z.W) - 0.5, py(Math.floor(k / z.W)) - 0.5, S + 1, S + 1);
		c.setLineDash([S * 0.34, S * 0.22]);
		c.lineDashOffset = -t * S * 0.5;
		c.strokeStyle = `rgba(255, 190, 110, ${(0.5 + 0.35 * pulse) * fade})`;
		c.lineWidth = Math.max(1.5, S * 0.07);
		c.beginPath();
		for (const [x, y, dx, dy] of [...z.walls, ...z.doors.map((d) => [d.x, d.y, d.dx, d.dy] as const)]) {
			const ex = px(x + 0.5 + dx * 0.5);
			const ey = py(y + 0.5 + dy * 0.5);
			c.moveTo(ex - dy * S * 0.5, ey + dx * S * 0.5);
			c.lineTo(ex + dy * S * 0.5, ey - dx * S * 0.5);
		}
		c.stroke();
		c.setLineDash([]);
	}
	if (grown > 0) {
		if (ph.lit > 0) {
			// the zone inside: a faint sick tint, the hive's slow beat sweeping through it
			const beat = 0.5 + 0.5 * Math.sin((t / 6) * TAU);
			c.fillStyle = `rgba(${BILE.zone}, ${(0.16 + 0.05 * beat) * ph.lit})`;
			for (const k of z.tiles) c.fillRect(px(k % z.W) - 0.5, py(Math.floor(k / z.W)) - 0.5, S + 1, S + 1);
		}
		// the glow along the walls that close the zone, from the wall inward
		for (const [x, y, dx, dy] of z.walls) {
			const ex = px(x + 0.5 + dx * 0.5);
			const ey = py(y + 0.5 + dy * 0.5);
			const g = c.createLinearGradient(ex, ey, ex - dx * S * 0.3, ey - dy * S * 0.3);
			g.addColorStop(0, `rgba(${BILE.glow}, ${0.34 * grown * alive})`);
			g.addColorStop(1, `rgba(${BILE.glow}, 0)`);
			c.fillStyle = g;
			c.fillRect(
				Math.min(ex, ex - dx * S * 0.3) - Math.abs(dy) * S * 0.5,
				Math.min(ey, ey - dy * S * 0.3) - Math.abs(dx) * S * 0.5,
				Math.abs(dx) * S * 0.3 + Math.abs(dy) * S,
				Math.abs(dy) * S * 0.3 + Math.abs(dx) * S
			);
			c.beginPath();
			c.moveTo(ex - dy * S * 0.5, ey + dx * S * 0.5);
			c.lineTo(ex + dy * S * 0.5, ey - dx * S * 0.5);
			c.strokeStyle = `rgba(${BILE.body}, ${0.6 * grown * alive})`;
			c.lineWidth = Math.max(1, S * 0.035);
			c.stroke();
		}
		z.doors.forEach((d, i) => {
			c.save();
			c.translate(px(d.x + 0.5 + d.dx * 0.5), py(d.y + 0.5 + d.dy * 0.5));
			c.rotate(Math.atan2(d.dy, d.dx) - Math.PI / 2);
			film(c, S, d, z.broken, ph, t, hash(i, 9));
			c.restore();
		});
	}
	c.restore();
}
