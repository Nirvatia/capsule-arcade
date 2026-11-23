// The cabins as homes (the owner's review, 2026-11-23: a cozy background; the paths and fences
// were tried and dropped): a bench by the door, a woodpile against the far wall and a small lamp
// by the door that lights the ground as a pool at night. The door is on the side facing the maze.
// Baked after the decor, so the trees overhang it; the scene's props lie over it.
import type { MeadowFrame } from './MeadowBake';
import { TAU, addLight } from './seasonScene';
import { WORLD_TILE } from '../../common/worldDecor';

const T = WORLD_TILE;

export interface HomesteadStyle {
	readonly wood: string;
	/** Snow on the bench and the woodpile (winter). */
	readonly snow?: string;
}

export function homestead(f: MeadowFrame, s: HomesteadStyle): void {
	const { b, DEC, blob, shade } = f;
	for (const o of DEC) {
		if (o.k !== 'cabin') continue;
		const w = o.w ?? 0;
		const h = o.h ?? 0;
		// the door faces the maze: the side of the cabin nearest to it
		const cx = Math.max(-0.6 * T, Math.min((f.C + 0.6) * T, o.x));
		const cy = Math.max(-0.6 * T, Math.min((f.R + 0.6) * T, o.y));
		const dx = cx - o.x;
		const dy = cy - o.y;
		const side = Math.abs(dx / w) > Math.abs(dy / h) ? (dx > 0 ? 'e' : 'w') : dy > 0 ? 's' : 'n';
		const doorX = side === 'e' ? o.x + w / 2 : side === 'w' ? o.x - w / 2 : o.x;
		const doorY = side === 's' ? o.y + h / 2 : side === 'n' ? o.y - h / 2 : o.y;
		const horiz = side === 'n' || side === 's';
		const out = side === 'e' || side === 's' ? 1 : -1;
		// a bench beside the door
		const bx = horiz ? doorX - w * 0.28 : doorX + out * 3;
		const by = horiz ? doorY + out * 3.5 : doorY - h * 0.3;
		blob(bx + 1, by + 1.4, horiz ? 7 : 2.6, horiz ? 2.6 : 7, shade(0.3), 0);
		b.fillStyle = s.wood;
		for (let i = 0; i < 3; i += 1) {
			if (horiz) b.fillRect(bx - 6, by - 1.8 + i * 1.3, 12, 1);
			else b.fillRect(bx - 1.8 + i * 1.3, by - 6, 1, 12);
		}
		if (s.snow) blob(bx, by, horiz ? 5 : 1.6, horiz ? 1.6 : 5, s.snow, 0);
		// a woodpile against the far wall
		const wx = side === 'w' ? o.x + w / 2 + 3 : o.x - w / 2 - 3;
		const wy = o.y + h * 0.2;
		blob(wx + 1, wy + 1.5, 3.2, 7, shade(0.3), 0);
		for (let i = 0; i < 6; i += 1) {
			const lx = wx + (i % 2 ? 1.5 : -1.5);
			const ly = wy - 5 + (i >> 1) * 4.2 + (i % 2 ? 2 : 0);
			b.fillStyle = s.wood;
			b.beginPath();
			b.arc(lx, ly, 1.9, 0, TAU);
			b.fill();
			b.fillStyle = 'rgba(235,200,150,.75)';
			b.beginPath();
			b.arc(lx, ly, 1.1, 0, TAU);
			b.fill();
		}
		if (s.snow) blob(wx, wy - 4, 3, 1.6, s.snow, 0);
		// a small lamp by the door, a warm pool of light at night
		const lx = horiz ? doorX + w * 0.28 : doorX + out * 4;
		const ly = horiz ? doorY + out * 4 : doorY + h * 0.3;
		blob(lx + 1.2, ly + 1.6, 2.4, 1.8, shade(0.35), 0);
		b.fillStyle = '#3a3430';
		b.beginPath();
		b.arc(lx, ly, 2.2, 0, TAU);
		b.fill();
		b.fillStyle = '#ffe2a0';
		b.beginPath();
		b.arc(lx, ly, 1.2, 0, TAU);
		b.fill();
		addLight(f.lit, lx, ly, 1.4 * T, '255,206,130', 0.7, false);
	}
}
