// Throwaway: candidate looks for the echo wisps, swapped into EchoCloneView's painters
// (`body`: the wisp, `tail`: what it leaves behind). The game's language: cel tone bands lit
// from the top left, a dark ink outline, a white glint; the echo's teal (its medallion).
import type { EchoCloneView } from '../../../src/games/pacman/render/actors/EchoCloneView';

type Proto = Record<string, unknown>;
type C = CanvasRenderingContext2D;
interface PathPoint {
	x: number;
	y: number;
	age: number;
}
interface Wisp {
	path: PathPoint[];
	x: number;
	y: number;
	angle: number;
	phase: number;
}

const TEAL = { light: '#d6fff6', mid: '#5fe3cf', dark: '#1d9aa3', deep: '#13707f', ink: '#0d3442' };
const LX = -0.55; // the light, from the top left (unit vector)
const LY = -0.83;
const TAIL_SECONDS = 0.13;

const now = () => performance.now() / 1000;
const ink = (r: number) => Math.max(1.2, r * 0.2);

function pacPath(c: C, x: number, y: number, r: number, angle: number, open: number): void {
	const a = open * 0.9;
	c.beginPath();
	c.moveTo(x, y);
	c.arc(x, y, r, angle + a, angle + Math.PI * 2 - a);
	c.closePath();
}

/** The eye on the upper side of the heading, a little ahead of the centre. */
function eye(c: C, x: number, y: number, r: number, angle: number): void {
	const fx = Math.cos(angle);
	const fy = Math.sin(angle);
	// the side normal that points up the screen
	let nx = -fy;
	let ny = fx;
	if (ny > 0 || (ny === 0 && nx > 0)) {
		nx = -nx;
		ny = -ny;
	}
	const ex = x + fx * r * 0.12 + nx * r * 0.48;
	const ey = y + fy * r * 0.12 + ny * r * 0.48;
	c.fillStyle = TEAL.ink;
	c.beginPath();
	c.ellipse(ex, ey, r * 0.15, r * 0.19, 0, 0, Math.PI * 2);
	c.fill();
	c.fillStyle = '#ffffff';
	c.beginPath();
	c.arc(ex - r * 0.05, ey - r * 0.07, r * 0.06, 0, Math.PI * 2);
	c.fill();
}

/** Cel bands inside the current clip: dark, a mid disc toward the light, a light disc further. */
function celBands(c: C, x: number, y: number, r: number): void {
	c.fillStyle = TEAL.dark;
	c.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
	c.fillStyle = TEAL.mid;
	c.beginPath();
	c.arc(x + LX * r * 0.16, y + LY * r * 0.16, r * 0.96, 0, Math.PI * 2);
	c.fill();
	c.fillStyle = TEAL.light;
	c.beginPath();
	c.arc(x + LX * r * 0.36, y + LY * r * 0.36, r * 0.58, 0, Math.PI * 2);
	c.fill();
}

function glint(c: C, x: number, y: number, r: number): void {
	c.fillStyle = 'rgba(255,255,255,.95)';
	c.beginPath();
	c.ellipse(x + LX * r * 0.5, y + LY * r * 0.5, r * 0.2, r * 0.12, -0.6, 0, Math.PI * 2);
	c.fill();
}

function star(c: C, x: number, y: number, s: number, fill: string): void {
	c.fillStyle = fill;
	c.beginPath();
	c.moveTo(x, y - s);
	c.quadraticCurveTo(x, y, x + s, y);
	c.quadraticCurveTo(x, y, x, y + s);
	c.quadraticCurveTo(x, y, x - s, y);
	c.quadraticCurveTo(x, y, x, y - s);
	c.fill();
}

/** The path point closest to `age` seconds old. */
function pointAt(path: PathPoint[], age: number): PathPoint | null {
	let best: PathPoint | null = null;
	for (const p of path) if (!best || Math.abs(p.age - age) < Math.abs(best.age - age)) best = p;
	return best && Math.abs(best.age - age) < 0.03 ? best : null;
}

/** A: a cel disc with a mouth and an eye; behind it three fading echoes of its silhouette. */
const A: Proto = {
	body(c: C, x: number, y: number, r: number, angle: number, open: number) {
		c.save();
		c.globalCompositeOperation = 'source-over';
		pacPath(c, x, y, r, angle, open);
		c.save();
		c.clip();
		celBands(c, x, y, r);
		glint(c, x, y, r);
		c.restore();
		pacPath(c, x, y, r, angle, open);
		c.strokeStyle = TEAL.ink;
		c.lineWidth = ink(r);
		c.lineJoin = 'round';
		c.stroke();
		eye(c, x, y, r, angle);
		c.restore();
	},
	tail(c: C, w: Wisp, r: number, fade: number) {
		c.save();
		c.globalCompositeOperation = 'source-over';
		const ages = [0.11, 0.075, 0.04];
		ages.forEach((age, i) => {
			const p = pointAt(w.path, age);
			if (!p) return;
			const k = (i + 1) / (ages.length + 1);
			c.globalAlpha = (0.16 + 0.22 * k) * fade;
			const rr = r * (0.72 + 0.22 * k);
			pacPath(c, p.x, p.y, rr, w.angle, 0.25);
			c.fillStyle = i === ages.length - 1 ? TEAL.mid : TEAL.dark;
			c.fill();
			c.globalAlpha *= 0.9;
			c.strokeStyle = TEAL.deep;
			c.lineWidth = Math.max(1, r * 0.1);
			c.stroke();
		});
		c.restore();
	}
};

/** B: a spirit flame, a round head with a face and a tail licking back against its heading. */
const B: Proto = {
	body(c: C, x: number, y: number, r: number, angle: number, open: number) {
		const t = now();
		const bx = -Math.cos(angle);
		const by = -Math.sin(angle);
		const px = -by;
		const py = bx;
		const wob = Math.sin(t * 16 + x * 0.05) * r * 0.28;
		const tip = { x: x + bx * r * 2.1 + px * wob, y: y + by * r * 2.1 + py * wob };
		const flame = () => {
			c.beginPath();
			c.arc(x, y, r, Math.atan2(py, px), Math.atan2(py, px) + Math.PI, false);
			c.quadraticCurveTo(
				x + bx * r * 1.1 - px * r * 0.9 + px * wob * 0.4,
				y + by * r * 1.1 - py * r * 0.9 + py * wob * 0.4,
				tip.x,
				tip.y
			);
			c.quadraticCurveTo(
				x + bx * r * 1.1 + px * r * 0.9 + px * wob * 0.4,
				y + by * r * 1.1 + py * r * 0.9 + py * wob * 0.4,
				x + px * r,
				y + py * r
			);
			c.closePath();
		};
		c.save();
		c.globalCompositeOperation = 'source-over';
		flame();
		c.save();
		c.clip();
		c.fillStyle = TEAL.dark;
		c.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
		// the inner flame: mid, then the light core toward the front
		c.fillStyle = TEAL.mid;
		c.beginPath();
		c.ellipse(x + bx * r * 0.35, y + by * r * 0.35, r * 0.9, r * 1.25, angle, 0, Math.PI * 2);
		c.fill();
		c.fillStyle = TEAL.light;
		c.beginPath();
		c.arc(x + LX * r * 0.25, y + LY * r * 0.25, r * 0.6, 0, Math.PI * 2);
		c.fill();
		glint(c, x, y, r);
		c.restore();
		flame();
		c.strokeStyle = TEAL.ink;
		c.lineWidth = ink(r);
		c.lineJoin = 'round';
		c.stroke();
		// the face looks at the viewer, eyes leaning toward the heading
		const fx = Math.cos(angle) * r * 0.22;
		const fy = Math.sin(angle) * r * 0.22;
		c.fillStyle = TEAL.ink;
		for (const s of [-1, 1]) {
			c.beginPath();
			c.ellipse(x + fx + s * r * 0.34, y + fy - r * 0.12, r * 0.12, r * 0.17, 0, 0, Math.PI * 2);
			c.fill();
		}
		c.beginPath();
		c.ellipse(x + fx, y + fy + r * 0.3, r * 0.2, r * (0.06 + 0.24 * open), 0, 0, Math.PI * 2);
		c.fill();
		c.restore();
	},
	tail(c: C, w: Wisp, r: number, fade: number) {
		c.save();
		c.globalCompositeOperation = 'source-over';
		for (const p of w.path) {
			const u = p.age / TAIL_SECONDS;
			if (((p.x + p.y) | 0) % 3 !== 0 || u > 1) continue;
			c.globalAlpha = (1 - u) * 0.9 * fade;
			const off = Math.sin(p.x * 0.3 + w.phase) * r * 0.6;
			star(c, p.x - Math.sin(w.angle) * off, p.y + Math.cos(w.angle) * off, r * 0.22 * (1 - u * 0.5), TEAL.light);
		}
		c.restore();
	}
};

/** C: a faceted crystal disc with a mouth: light and dark facets, an ink rim, a star glint. */
const C_: Proto = {
	body(c: C, x: number, y: number, r: number, angle: number, open: number) {
		c.save();
		c.globalCompositeOperation = 'source-over';
		pacPath(c, x, y, r, angle, open);
		c.save();
		c.clip();
		c.fillStyle = TEAL.mid;
		c.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
		// facets: wedges from a centre pushed toward the light, shaded by their facing
		const cx = x + LX * r * 0.22;
		const cy = y + LY * r * 0.22;
		const n = 7;
		for (let i = 0; i < n; i++) {
			const a0 = angle + (i / n) * Math.PI * 2 + 0.3;
			const a1 = angle + ((i + 1) / n) * Math.PI * 2 + 0.3;
			const am = (a0 + a1) / 2;
			const lit = Math.cos(am) * LX + Math.sin(am) * LY;
			c.fillStyle = lit > 0.45 ? TEAL.light : lit > -0.2 ? TEAL.mid : lit > -0.7 ? TEAL.dark : TEAL.deep;
			c.beginPath();
			c.moveTo(cx, cy);
			c.lineTo(x + Math.cos(a0) * r * 1.3, y + Math.sin(a0) * r * 1.3);
			c.lineTo(x + Math.cos(a1) * r * 1.3, y + Math.sin(a1) * r * 1.3);
			c.closePath();
			c.fill();
			c.strokeStyle = 'rgba(214,255,246,.55)';
			c.lineWidth = Math.max(0.8, r * 0.06);
			c.stroke();
		}
		// the table: a small light facet at the centre
		c.fillStyle = TEAL.light;
		c.beginPath();
		for (let i = 0; i < 5; i++) {
			const a = (i / 5) * Math.PI * 2 + angle;
			c.lineTo(cx + Math.cos(a) * r * 0.3, cy + Math.sin(a) * r * 0.3);
		}
		c.closePath();
		c.fill();
		c.restore();
		pacPath(c, x, y, r, angle, open);
		c.strokeStyle = TEAL.ink;
		c.lineWidth = ink(r);
		c.lineJoin = 'round';
		c.stroke();
		star(c, x + LX * r * 0.55, y + LY * r * 0.55, r * 0.32, '#ffffff');
		c.restore();
	},
	tail(c: C, w: Wisp, r: number, fade: number) {
		c.save();
		c.globalCompositeOperation = 'source-over';
		let i = 0;
		for (const p of w.path) {
			const u = p.age / TAIL_SECONDS;
			if (u > 1 || i++ % 2) continue;
			c.globalAlpha = (1 - u) * fade;
			const off = Math.sin(i * 2.3 + w.phase) * r * 0.5;
			const sx = p.x - Math.sin(w.angle) * off;
			const sy = p.y + Math.cos(w.angle) * off;
			c.fillStyle = TEAL.ink;
			c.beginPath();
			c.arc(sx, sy, r * 0.17 * (1 - u * 0.5), 0, Math.PI * 2);
			c.fill();
			star(c, sx, sy, r * 0.2 * (1 - u * 0.5), i % 3 ? TEAL.light : '#ffffff');
		}
		c.restore();
	}
};

/**
 * The riot without the old light: no halo, no threads; the tails, then the bodies; a birth is
 * an ink ring popping out, a catch a burst of ink-rimmed shards. The bookkeeping is the game's.
 */
interface RiotWisp extends Wisp {
	born: number;
	caught: number;
}
interface Clone {
	id: number;
	x: number;
	y: number;
	alive: boolean;
	started: boolean;
	facing: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
}
const ANG = { RIGHT: 0, DOWN: Math.PI / 2, LEFT: Math.PI, UP: -Math.PI / 2 };
function drawRiot(
	this: { wisps: Map<number, RiotWisp>; body: (...a: unknown[]) => void; tail: (...a: unknown[]) => void },
	c: C,
	echo: { clones: Clone[]; timer: number },
	layout: { tileSize: number; offsetX: number; offsetY: number },
	dt: number,
	time: number
): void {
	const S = layout.tileSize;
	const r = S * 0.255;
	const fade = echo.timer < 0.5 ? 0.35 + 0.35 * (0.5 + 0.5 * Math.cos(time * 40)) : 1;
	const seen = new Set<number>();
	for (const clone of echo.clones) {
		seen.add(clone.id);
		const x = layout.offsetX + clone.x * S;
		const y = layout.offsetY + clone.y * S;
		let w = this.wisps.get(clone.id);
		if (!w) {
			w = { path: [], born: -1, caught: -1, x, y, angle: 0, phase: clone.id * 1.7 };
			this.wisps.set(clone.id, w);
		}
		if (clone.started && w.born < 0) w.born = 0;
		if (w.born >= 0) w.born += dt;
		if (!clone.alive && w.caught < 0) w.caught = 0;
		if (w.caught >= 0) w.caught += dt;
		for (const p of w.path) p.age += dt;
		if (clone.alive && clone.started && Math.hypot(x - w.x, y - w.y) < S * 2) w.path.push({ x, y, age: 0 });
		else if (Math.hypot(x - w.x, y - w.y) >= S * 2) w.path = [];
		w.path = w.path.filter((p) => p.age < TAIL_SECONDS);
		w.x = x;
		w.y = y;
		w.angle = ANG[clone.facing];
	}
	for (const id of [...this.wisps.keys()]) if (!seen.has(id)) this.wisps.delete(id);
	c.save();
	for (const w of this.wisps.values()) if (w.caught < 0 && w.born >= 0) this.tail(c, w, r, fade);
	for (const w of this.wisps.values()) {
		if (w.caught >= 0) {
			const k = w.caught / 0.35;
			if (k >= 1) continue;
			c.globalAlpha = 1 - k;
			for (let i = 0; i < 6; i++) {
				const a = w.phase + (i * Math.PI) / 3;
				const d = r * (0.5 + 2.2 * k);
				const sx = w.x + Math.cos(a) * d;
				const sy = w.y + Math.sin(a) * d;
				const s = r * 0.42 * (1 - k * 0.6);
				c.save();
				c.translate(sx, sy);
				c.rotate(a);
				c.beginPath();
				c.moveTo(s, 0);
				c.lineTo(-s * 0.6, s * 0.5);
				c.lineTo(-s * 0.6, -s * 0.5);
				c.closePath();
				c.fillStyle = i % 2 ? TEAL.mid : TEAL.light;
				c.fill();
				c.strokeStyle = TEAL.ink;
				c.lineWidth = Math.max(1, r * 0.12);
				c.stroke();
				c.restore();
			}
		} else if (w.born >= 0 && w.born < 0.25) {
			const k = w.born / 0.25;
			c.globalAlpha = 1 - k;
			const rr = r * (1 + 1.4 * k);
			c.lineWidth = Math.max(1.5, r * 0.34 * (1 - k));
			c.strokeStyle = TEAL.ink;
			c.beginPath();
			c.arc(w.x, w.y, rr, 0, Math.PI * 2);
			c.stroke();
			c.lineWidth *= 0.5;
			c.strokeStyle = TEAL.light;
			c.stroke();
		}
	}
	for (const w of this.wisps.values()) {
		if (w.caught >= 0 || w.born < 0) continue;
		c.globalAlpha = fade;
		const chomp = 0.5 + 0.5 * Math.sin(time * 18 + w.phase);
		this.body(c, w.x, w.y, r, w.angle, 0.12 + 0.3 * chomp);
	}
	c.restore();
}
for (const look of [A, B, C_]) look.drawRiot = drawRiot;

export const LOOKS: Record<string, Proto> = { A, B, C: C_ };

export function applyLook(view: typeof EchoCloneView, id: string | null): void {
	const look = id ? LOOKS[id] : undefined;
	if (look) Object.assign(view.prototype as unknown as Proto, look);
}
