// The abilities' icons as one family (the owner's pick of the `power-icons` prototype, 2026-11-23:
// the medallions): one gold rim with a coin's notches for all three, an enamel field in the
// ability's colour (echo teal, mask gold, shock blue) and a white sign with an ink outline (the
// echo a wisp with three copies running off it, the mask a ghost, the shock a bolt). Centred at
// (x, y) on a tile of `S` px; the token's breathing halo is `abilityArt`'s.
import type { AbilityKind } from '../../config/abilityConfig';

type Ctx = CanvasRenderingContext2D;
type Kind = AbilityKind;

const TAU = Math.PI * 2;
const INK = '#1c1426';

/** Each ability's colour: light, mid, deep. */
export const ABILITY_HUE: Record<Kind, [string, string, string]> = {
	echo: ['#b8fff0', '#38d6b8', '#0f7a6e'],
	mask: ['#fff2a8', '#ffc83a', '#c8780e'],
	shock: ['#b8d8ff', '#3a7cff', '#1a2f8a']
};

/** The sign, filled `fill` with an ink outline, about `s` across. */
function sign(c: Ctx, kind: Kind, x: number, y: number, s: number, fill: string, ink = INK): void {
	c.save();
	c.lineJoin = 'round';
	c.lineCap = 'round';
	c.fillStyle = fill;
	c.strokeStyle = ink;
	c.lineWidth = Math.max(1, s * 0.09);
	if (kind === 'echo') {
		// a wisp and three copies running off it, each with a short trail
		for (let i = 0; i < 3; i += 1) {
			const a = -Math.PI / 2 + (i * TAU) / 3 + 0.35;
			const px = x + Math.cos(a) * s * 0.36;
			const py = y + Math.sin(a) * s * 0.36;
			c.beginPath();
			c.moveTo(x + Math.cos(a) * s * 0.14, y + Math.sin(a) * s * 0.14);
			c.lineTo(px, py);
			c.strokeStyle = fill;
			c.lineWidth = Math.max(1, s * 0.07);
			c.stroke();
			c.beginPath();
			c.arc(px, py, s * 0.11, 0, TAU);
			c.strokeStyle = ink;
			c.lineWidth = Math.max(1, s * 0.07);
			c.fill();
			c.stroke();
		}
		c.beginPath();
		c.arc(x, y, s * 0.17, 0, TAU);
		c.lineWidth = Math.max(1, s * 0.09);
		c.fill();
		c.stroke();
	} else if (kind === 'mask') {
		const r = s * 0.3;
		const top = y - r * 0.2;
		c.beginPath();
		c.arc(x, top, r, Math.PI, 0);
		c.lineTo(x + r, y + r * 1.05);
		for (let i = 0; i < 3; i += 1) {
			const a = x + r - (i * 2 * r) / 3;
			const b = x + r - ((i + 1) * 2 * r) / 3;
			c.quadraticCurveTo((a + b) / 2, y + r * 0.55, b, y + r * 1.05);
		}
		c.closePath();
		c.fill();
		c.stroke();
		c.fillStyle = ink;
		for (const side of [-1, 1]) {
			c.beginPath();
			c.ellipse(x + side * r * 0.38, top + r * 0.1, r * 0.16, r * 0.25, 0, 0, TAU);
			c.fill();
		}
	} else {
		const k = s * 0.5;
		c.beginPath();
		c.moveTo(x + k * 0.12, y - k * 0.78);
		c.lineTo(x - k * 0.46, y + k * 0.08);
		c.lineTo(x - k * 0.04, y + k * 0.08);
		c.lineTo(x - k * 0.2, y + k * 0.78);
		c.lineTo(x + k * 0.52, y - k * 0.2);
		c.lineTo(x + k * 0.1, y - k * 0.2);
		c.closePath();
		c.fill();
		c.stroke();
	}
	c.restore();
}

function shine(c: Ctx, x: number, y: number, rx: number, ry: number, rot: number, a = 0.8): void {
	c.fillStyle = `rgba(255,255,255,${a})`;
	c.beginPath();
	c.ellipse(x, y, rx, ry, rot, 0, TAU);
	c.fill();
}

/** The medallion: a gold rim shared by all three, an enamel field of the ability's colour. */
export function medallion(c: Ctx, kind: Kind, x: number, y: number, S: number): void {
	const [l, m, d] = ABILITY_HUE[kind];
	const R = S * 0.36;
	c.save();
	c.fillStyle = 'rgba(0,0,0,.28)';
	c.beginPath();
	c.arc(x + S * 0.03, y + S * 0.04, R, 0, TAU);
	c.fill();
	const rim = c.createLinearGradient(x - R, y - R, x + R, y + R);
	rim.addColorStop(0, '#fff0b0');
	rim.addColorStop(0.5, '#e8b43a');
	rim.addColorStop(1, '#9a6416');
	c.fillStyle = rim;
	c.beginPath();
	c.arc(x, y, R, 0, TAU);
	c.fill();
	c.strokeStyle = INK;
	c.lineWidth = Math.max(1, S * 0.045);
	c.stroke();
	const field = c.createRadialGradient(x - R * 0.3, y - R * 0.35, 0, x, y, R * 0.8);
	field.addColorStop(0, l);
	field.addColorStop(0.55, m);
	field.addColorStop(1, d);
	c.fillStyle = field;
	c.beginPath();
	c.arc(x, y, R * 0.78, 0, TAU);
	c.fill();
	c.strokeStyle = 'rgba(80,50,10,.7)';
	c.lineWidth = Math.max(1, S * 0.025);
	c.stroke();
	// the rim's notches, like a coin's
	c.strokeStyle = 'rgba(120,80,20,.55)';
	c.lineWidth = Math.max(0.6, S * 0.015);
	for (let i = 0; i < 16; i += 1) {
		const a = (i / 16) * TAU;
		c.beginPath();
		c.moveTo(x + Math.cos(a) * R * 0.84, y + Math.sin(a) * R * 0.84);
		c.lineTo(x + Math.cos(a) * R * 0.94, y + Math.sin(a) * R * 0.94);
		c.stroke();
	}
	sign(c, kind, x, y + S * 0.01, S * 0.42, '#ffffff');
	shine(c, x - R * 0.5, y - R * 0.55, R * 0.22, R * 0.1, -0.7, 0.7);
	c.restore();
}
