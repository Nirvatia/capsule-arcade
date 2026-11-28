// The weapon thrown away when spent, and the rush that fizzles without a charge: lighter candidates
// in place of the game's (the owner found them clumsy). (x, y) is the hero's centre in px, S the tile.
import { TAU, VEC, bloom } from '../hell-kit/paint';
import type { Ctx, Dir } from '../hell-kit/paint';
import { icon } from './weapons';

/**
 * Spent A, tossed away: the weapon leaves his hand backward in a short arc, tumbling, lands a tile
 * behind him and sinks into the floor with a small dust puff. `f` 0..1 over 0.7 s.
 */
export function spentToss(c: Ctx, x: number, y: number, S: number, dir: Dir, f: number, paint: (c: Ctx) => void): void {
	const [dx, dy] = VEC[dir];
	const fly = Math.min(1, f / 0.55);
	const bx = x - dx * S * 1.0 * fly;
	const by = y - dy * S * 1.0 * fly - S * 0.55 * Math.sin(fly * Math.PI);
	if (f < 0.55) {
		c.save();
		c.translate(bx, by);
		c.rotate(-fly * Math.PI * 1.5 * (dx || 1));
		icon(c, 0, 0, S * 0.62, paint);
		c.restore();
		return;
	}
	const k = (f - 0.55) / 0.45;
	// it sinks: the icon shrinks into a dark slot, a puff round it
	c.save();
	c.globalAlpha *= 1 - k;
	c.beginPath();
	c.rect(bx - S * 0.4, by - S * 0.4, S * 0.8, S * 0.4 + S * 0.25 * (1 - k));
	c.clip();
	icon(c, bx, by + S * 0.2 * k, S * 0.62, paint);
	c.restore();
	for (let i = 0; i < 4; i += 1) {
		const a = Math.PI + (i - 1.5) * 0.5;
		c.fillStyle = `rgba(150,130,124,${0.5 * (1 - k)})`;
		c.beginPath();
		c.arc(bx + Math.cos(a) * S * (0.12 + 0.2 * k), by + S * 0.2 - Math.abs(Math.sin(a)) * S * 0.1 * k, S * (0.06 + 0.04 * k), 0, TAU);
		c.fill();
	}
}

/**
 * Spent B, burnt out: the weapon shows over his head for a moment, goes grey and dark, and blows away
 * sideways as a few flakes of ash. `f` 0..1 over 0.6 s.
 */
export function spentAsh(c: Ctx, x: number, y: number, S: number, f: number, paint: (c: Ctx) => void): void {
	const cy = y - S * 0.72;
	if (f < 0.35) {
		const k = f / 0.35;
		c.save();
		c.globalAlpha *= 0.4 + 0.6 * Math.min(1, k * 4);
		c.filter = `grayscale(${k}) brightness(${1 - 0.55 * k})`;
		icon(c, x, cy, S * 0.62, paint);
		c.restore();
		return;
	}
	const k = (f - 0.35) / 0.65;
	for (let i = 0; i < 9; i += 1) {
		const px = x + ((i % 3) - 1) * S * 0.16 + k * S * (0.3 + 0.12 * i);
		const py = cy + (Math.floor(i / 3) - 1) * S * 0.12 - k * S * 0.15 * (i % 2) + Math.sin(k * 6 + i) * S * 0.04;
		c.fillStyle = `rgba(${90 + (i % 3) * 20},${80 + (i % 3) * 16},76,${1 - k})`;
		c.beginPath();
		c.ellipse(px, py, S * 0.045 * (1 - 0.5 * k), S * 0.025, k * 3 + i, 0, TAU);
		c.fill();
	}
}

/**
 * Refused A, a misfire: two small soft puffs of grey smoke from his front and a short squash of the
 * hero (the caller scales him by `squash`). Returns the squash, 1 at rest. `f` 0..1 over 0.35 s.
 */
export function refusedPuff(c: Ctx, x: number, y: number, S: number, dir: Dir, f: number): number {
	const [dx, dy] = VEC[dir];
	for (let i = 0; i < 2; i += 1) {
		const d = S * (0.5 + 0.18 * i + 0.15 * f);
		const px = x + dx * d + -dy * (i ? 0.1 : -0.08) * S;
		const py = y + dy * d + dx * (i ? 0.1 : -0.08) * S - S * 0.1 * f;
		c.fillStyle = `rgba(190,178,170,${0.9 * (1 - f)})`;
		c.beginPath();
		c.arc(px, py, S * (0.11 + 0.07 * f + i * 0.03), 0, TAU);
		c.fill();
	}
	return 1 - 0.12 * Math.sin(Math.min(1, f * 2.5) * Math.PI);
}

/**
 * Refused B, the rush that fizzles: he lunges a fifth of a tile and snaps back, a faint grey ghost of
 * the saw flickers once at his front and is gone. Returns his offset along the heading, in tiles.
 */
export function refusedLunge(c: Ctx, x: number, y: number, S: number, dir: Dir, f: number): number {
	const [dx, dy] = VEC[dir];
	const lunge = Math.sin(Math.min(1, f * 2) * Math.PI) * 0.2;
	if (f > 0.1 && f < 0.5) {
		const a = 1 - Math.abs(f - 0.3) / 0.2;
		const sx = x + dx * S * 0.55;
		const sy = y + dy * S * 0.55;
		c.save();
		c.globalAlpha *= 0.9 * a;
		c.strokeStyle = '#c8bcb4';
		c.lineWidth = Math.max(1.2, S * 0.05);
		c.setLineDash([S * 0.08, S * 0.06]);
		c.beginPath();
		c.arc(sx, sy, S * 0.26, 0, TAU);
		c.stroke();
		c.restore();
		bloom(c, sx, sy, S * 0.3, '200,190,180', 0.2 * a);
	}
	return lunge;
}
