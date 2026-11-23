// Three candidate sets for the abilities' icons (echo, mask, shock), each a family: one shape and
// one finish shared, the colour and the sign told apart. Painted centred at (x, y) on a tile of
// `S` px, like `drawAbilityIcon`. The signs are common to all sets: the echo a wisp with three
// copies running off it, the mask a ghost's silhouette, the shock a bolt.
type Ctx = CanvasRenderingContext2D;
export type Kind = 'echo' | 'mask' | 'shock';

const TAU = Math.PI * 2;
const INK = '#1c1426';

/** Each ability's colour: light, mid, deep. */
const HUE: Record<Kind, [string, string, string]> = {
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

/** A: a medallion. A gold rim shared by all three, an enamel field of the ability's colour. */
export function medallion(c: Ctx, kind: Kind, x: number, y: number, S: number): void {
	const [l, m, d] = HUE[kind];
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

/** B: a crystal. One cut for all three (a pointed hexagon, a flat top face), the stone's colour. */
export function crystal(c: Ctx, kind: Kind, x: number, y: number, S: number): void {
	const [l, m, d] = HUE[kind];
	const R = S * 0.4;
	const outer: Array<[number, number]> = [];
	const inner: Array<[number, number]> = [];
	for (let i = 0; i < 6; i += 1) {
		const a = -Math.PI / 2 + (i * TAU) / 6;
		outer.push([x + Math.cos(a) * R, y + Math.sin(a) * R]);
		inner.push([x + Math.cos(a) * R * 0.58, y + Math.sin(a) * R * 0.58 - S * 0.02]);
	}
	const poly = (pts: Array<[number, number]>) => {
		c.beginPath();
		pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
		c.closePath();
	};
	c.save();
	c.lineJoin = 'round';
	c.fillStyle = 'rgba(0,0,0,.28)';
	c.save();
	c.translate(S * 0.03, S * 0.05);
	poly(outer);
	c.fill();
	c.restore();
	// the side facets: lit on the upper left, deep on the lower right
	for (let i = 0; i < 6; i += 1) {
		const j = (i + 1) % 6;
		const lit = i === 4 || i === 5 || i === 0;
		c.fillStyle = lit ? m : d;
		c.beginPath();
		c.moveTo(...outer[i]);
		c.lineTo(...outer[j]);
		c.lineTo(...inner[j]);
		c.lineTo(...inner[i]);
		c.closePath();
		c.fill();
	}
	const face = c.createLinearGradient(x, y - R * 0.6, x, y + R * 0.6);
	face.addColorStop(0, l);
	face.addColorStop(1, m);
	c.fillStyle = face;
	poly(inner);
	c.fill();
	c.strokeStyle = 'rgba(255,255,255,.35)';
	c.lineWidth = Math.max(0.6, S * 0.015);
	for (let i = 0; i < 6; i += 1) {
		c.beginPath();
		c.moveTo(...outer[i]);
		c.lineTo(...inner[i]);
		c.stroke();
	}
	poly(outer);
	c.strokeStyle = INK;
	c.lineWidth = Math.max(1, S * 0.045);
	c.stroke();
	sign(c, kind, x, y - S * 0.015, S * 0.34, '#ffffff', d);
	// a sparkle on the upper right
	const sx = x + R * 0.55;
	const sy = y - R * 0.62;
	c.fillStyle = '#ffffff';
	c.beginPath();
	c.moveTo(sx, sy - S * 0.07);
	c.lineTo(sx + S * 0.018, sy - S * 0.018);
	c.lineTo(sx + S * 0.07, sy);
	c.lineTo(sx + S * 0.018, sy + S * 0.018);
	c.lineTo(sx, sy + S * 0.07);
	c.lineTo(sx - S * 0.018, sy + S * 0.018);
	c.lineTo(sx - S * 0.07, sy);
	c.lineTo(sx - S * 0.018, sy - S * 0.018);
	c.closePath();
	c.fill();
	c.restore();
}

/** C: a key cap. One rounded square with a deep lower edge for all three, the top in the colour. */
export function keycap(c: Ctx, kind: Kind, x: number, y: number, S: number): void {
	const [l, m, d] = HUE[kind];
	const w = S * 0.66;
	const h = S * 0.6;
	const X = x - w / 2;
	const Y = y - h / 2 - S * 0.03;
	const depth = S * 0.08;
	const rad = S * 0.13;
	c.save();
	c.fillStyle = 'rgba(0,0,0,.28)';
	c.beginPath();
	c.roundRect(X + S * 0.03, Y + depth + S * 0.05, w, h, rad);
	c.fill();
	// the cap's side, then its top
	c.fillStyle = d;
	c.beginPath();
	c.roundRect(X, Y + depth, w, h, rad);
	c.fill();
	c.strokeStyle = INK;
	c.lineWidth = Math.max(1, S * 0.045);
	c.stroke();
	const top = c.createLinearGradient(X, Y, X, Y + h);
	top.addColorStop(0, l);
	top.addColorStop(0.6, m);
	c.fillStyle = top;
	c.beginPath();
	c.roundRect(X, Y, w, h, rad);
	c.fill();
	c.stroke();
	// the dished top: a soft inner rim
	c.strokeStyle = 'rgba(255,255,255,.45)';
	c.lineWidth = Math.max(0.6, S * 0.02);
	c.beginPath();
	c.roundRect(X + S * 0.05, Y + S * 0.045, w - S * 0.1, h - S * 0.1, rad * 0.7);
	c.stroke();
	sign(c, kind, x, Y + h / 2, S * 0.4, '#ffffff');
	shine(c, X + w * 0.22, Y + h * 0.16, w * 0.12, h * 0.05, -0.2, 0.75);
	c.restore();
}

export const SETS: Array<{ name: string; paint: typeof medallion }> = [
	{ name: 'А — медальоны: общая золотая оправа, эмаль своего цвета', paint: medallion },
	{ name: 'Б — кристаллы: одна огранка, свой камень, знак на грани', paint: crystal },
	{ name: 'В — клавиши: один колпачок с глубоким краем, свой цвет', paint: keycap }
];
