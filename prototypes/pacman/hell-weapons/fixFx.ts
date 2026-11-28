// The weapon thrown away when spent, and the rush that fizzles without a charge: lighter candidates
// in place of the game's (the owner found them clumsy). (x, y) is the hero's centre in px, S the tile.
import { TAU, VEC } from '../hell-kit/paint';
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

