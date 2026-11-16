// The three directions for the heroes, each a nimble form and a rage form (the energizer, her
// overdrive) and every step between (`pose.rage`). All drawn in code, ink-outlined, cel-shaded,
// about 0.31 of a tile across in the nimble form (the old heroes were 0.39), ~0.37 in rage.
import {
	TAU,
	bow,
	celFill,
	clamp01,
	colorsOf,
	eye,
	fangs,
	hash,
	lerp,
	mouthBody,
	mouthOf,
	orient,
	rageBurst,
	ribbon,
	smooth
} from './common';
import type { Ctx, HeroPainter, HeroPose } from './common';

/** The nimble radius and the rage one, of a tile. */
const R_CALM = 0.31;
const R_RAGE = 0.37;

const radiusOf = (S: number, p: HeroPose, rage = R_RAGE) => S * lerp(R_CALM, rage, smooth(p.rage));

// ── A · the ninja ball ───────────────────────────────────────────────────────────

/**
 * A: a small smooth ball with a headband; the band's tails stream behind and tell the speed
 * (long and flat on a straight, whipping on a turn). Her: the bow, with two long ribbons. In
 * rage his band catches fire (the tails turn to flames), the eye narrows to a glowing slit,
 * fangs, speed lines; hers: the ribbons glow, the eye spirals.
 */
export const ninja: HeroPainter = (c, x, y, S, p) => {
	const R = radiusOf(S, p);
	const col = colorsOf(p);
	const k = smooth(p.rage);
	const ink = col.ink;
	const inkW = Math.max(1, S * 0.045);
	c.save();
	orient(c, x, y, p.angle);
	const mouth = mouthOf(p);
	const speed = p.speed;
	// speed lines behind, in rage
	if (k > 0.05) {
		c.save();
		c.globalAlpha = k * (0.4 + 0.6 * speed);
		c.strokeStyle = `rgba(255,248,230,.9)`;
		c.lineCap = 'round';
		c.lineWidth = S * 0.035;
		for (const [dy, l] of [
			[-0.45, 1.2],
			[0.05, 1.6],
			[0.5, 1.1]
		] as const) {
			const off = ((p.time * 9 + dy * 7) % 1) * R * 0.3;
			c.beginPath();
			c.moveTo(-R * 1.15 - off, dy * R);
			c.lineTo(-R * (1.15 + l * (0.6 + speed)) - off, dy * R);
			c.stroke();
		}
		c.restore();
	}
	// the tails (behind the body)
	const knotX = -R * 0.62;
	const knotY = -R * 0.55;
	const len = R * (0.8 + 1.2 * speed + 0.5 * k);
	const wave = (amp: number, ph: number) => (u: number) =>
		Math.sin(p.time * (12 + 6 * k) - u * 5 + ph) * R * amp * u * (0.35 + speed) +
		p.turn * R * 0.9 * u * u;
	if (p.ms) {
		const g = c.createLinearGradient(knotX, 0, knotX - len, 0);
		g.addColorStop(0, k > 0.5 ? '#ff4fd0' : '#e41c46');
		g.addColorStop(1, k > 0.5 ? '#b78cff' : '#ff6a8a');
		ribbon(c, knotX, knotY, len, R * 0.24, wave(0.3, 0), g, ink, inkW * 0.8);
		ribbon(c, knotX, knotY + R * 0.1, len * 0.85, R * 0.2, wave(0.34, 1.7), g, ink, inkW * 0.8);
		if (k > 0.1) {
			c.save();
			c.globalCompositeOperation = 'lighter';
			for (let i = 0; i < 4; i++) {
				const u = ((p.time * 1.4 + i / 4) % 1);
				c.globalAlpha = k * (1 - u);
				c.fillStyle = '#ffe0ff';
				c.beginPath();
				c.arc(knotX - len * u, knotY + wave(0.3, 0)(u), S * 0.03, 0, TAU);
				c.fill();
			}
			c.restore();
		}
	} else {
		const calmFill = '#d8262f';
		for (const [ph, w, l] of [
			[0, 0.24, 1],
			[1.9, 0.2, 0.82]
		] as const) {
			if (k < 0.99) {
				c.save();
				c.globalAlpha = 1 - k;
				ribbon(c, knotX, knotY + ph * R * 0.05, len * l, R * w, wave(0.32, ph), calmFill, ink, inkW * 0.8);
				c.restore();
			}
			if (k > 0.01) {
				// the band on fire: tails of flame, yellow inside
				c.save();
				c.globalAlpha = k;
				const g = c.createLinearGradient(knotX, 0, knotX - len * l * 1.3, 0);
				g.addColorStop(0, '#fff2a0');
				g.addColorStop(0.4, '#ffb02e');
				g.addColorStop(1, '#e4321a');
				const flick = (u: number) => wave(0.32, ph)(u) + Math.sin(p.time * 40 + u * 9) * R * 0.05 * u;
				ribbon(c, knotX, knotY + ph * R * 0.05, len * l * 1.3, R * w * 1.5, flick, g, ink, inkW * 0.8);
				c.restore();
			}
		}
	}
	// the body
	mouthBody(c, R, R, mouth);
	celFill(c, R, col.mix('body'), col.mix('shade'), col.mix('light'), ink, inkW);
	// the headband across the top (his), the bow (hers)
	if (p.ms) {
		bow(c, -R * 0.45, -R * 0.72, R, -0.55 + p.turn * 0.2, p.season, p.dpr, 0.7);
	} else {
		c.save();
		mouthBody(c, R, R, mouth);
		c.clip();
		c.beginPath();
		c.arc(0, R * 0.55, R * 1.25, -2.45, -0.62);
		c.strokeStyle = ink;
		c.lineWidth = R * 0.34;
		c.stroke();
		c.strokeStyle = k > 0.5 ? '#ff7a1e' : '#d8262f';
		c.lineWidth = R * 0.22;
		c.stroke();
		c.restore();
		c.beginPath();
		c.ellipse(knotX, knotY, R * 0.16, R * 0.12, -0.5, 0, TAU);
		c.fillStyle = k > 0.5 ? '#ff7a1e' : '#b81c26';
		c.fill();
		c.strokeStyle = ink;
		c.lineWidth = inkW * 0.8;
		c.stroke();
	}
	if (k > 0.3) fangs(c, R, mouth, R * 0.28 * k, ink);
	const mood = k > 0.5 ? (p.ms ? 'spiral' : 'fierce') : 'calm';
	eye(c, R * 0.14, -R * 0.4, R * 0.22, mood, ink, p.time, col.glow);
	c.restore();
	rageBurst(c, x, y, R, p.burst, col.glow);
};

// ── B · the jelly ─────────────────────────────────────────────────────────────────

/**
 * B: a springy, see-through jelly. Running stretches it into a drop, a turn squashes it and it
 * springs back; bubbles drift inside, two dot eyes. In rage his jelly darkens to hot amber, spikes
 * rise along its back, the mouth splits wide with teeth and a core glows inside; hers turns pearl
 * with hypnotic rings inside and spiral eyes.
 */
export const jelly: HeroPainter = (c, x, y, S, p) => {
	const R = radiusOf(S, p, 0.36);
	const col = colorsOf(p);
	const k = smooth(p.rage);
	const ink = p.ms ? '#7a1450' : '#7a4306';
	const inkW = Math.max(1, S * 0.04);
	c.save();
	orient(c, x, y, p.angle);
	const stretch = 1 + 0.3 * p.speed - 0.18 * Math.abs(p.turn);
	const sx = stretch;
	const sy = 1 / Math.sqrt(stretch) * (1 + 0.12 * Math.abs(p.turn));
	const mouth = mouthOf(p);
	const spikes = k;
	// the outline: a wobbling round, spikes along the back in rage
	const path = () => {
		c.beginPath();
		const n = 96;
		c.moveTo(-R * 0.1, 0);
		for (let i = 0; i <= n; i++) {
			const a = mouth + (i / n) * (TAU - 2 * mouth);
			const back = clamp01((-Math.cos(a) + 0.35) / 1.0);
			const tri = 1 - Math.abs(((a * 9) / TAU) % 1 * 2 - 1);
			const r =
				R *
				(1 +
					0.035 * Math.sin(3 * a + p.time * 7) +
					spikes * back * 0.38 * Math.pow(tri, 2.2) +
					(1 - back) * 0.02 * Math.sin(a * 2 + p.time * 5));
			c.lineTo(Math.cos(a) * r * sx, Math.sin(a) * r * sy);
		}
		c.closePath();
	};
	// the body: see-through in the nimble form, opaque in rage
	path();
	c.save();
	c.globalAlpha = lerp(0.82, 1, k);
	const g = c.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.1, 0, 0, R * 1.2);
	g.addColorStop(0, col.mix('light'));
	g.addColorStop(0.55, col.mix('body'));
	g.addColorStop(1, col.mix('shade'));
	c.fillStyle = g;
	c.fill();
	c.restore();
	c.save();
	path();
	c.clip();
	// what drifts inside: bubbles, then a glowing core (his) or hypnotic rings (hers)
	for (let i = 0; i < 4; i++) {
		const u = (p.time * 0.4 + hash(i, 1)) % 1;
		const bx = lerp(-R * 0.6, R * 0.2, hash(i, 2)) * sx;
		const by = lerp(R * 0.6, -R * 0.5, u) * sy;
		c.beginPath();
		c.arc(bx, by, R * (0.06 + 0.05 * hash(i, 3)), 0, TAU);
		c.strokeStyle = `rgba(255,255,255,${0.6 * (1 - k)})`;
		c.lineWidth = R * 0.03;
		c.stroke();
	}
	if (k > 0.05) {
		c.save();
		c.globalCompositeOperation = 'lighter';
		if (p.ms) {
			for (let i = 0; i < 4; i++) {
				const rr = ((p.time * 0.6 + i / 4) % 1) * R * 0.95;
				c.strokeStyle = `rgba(190,140,255,${0.6 * k * (1 - rr / R)})`;
				c.lineWidth = R * 0.07;
				c.beginPath();
				c.arc(-R * 0.15, R * 0.05, rr, 0, TAU);
				c.stroke();
			}
		} else {
			const pulse = 0.75 + 0.25 * Math.sin(p.time * 14);
			const core = c.createRadialGradient(-R * 0.2, R * 0.05, 0, -R * 0.2, R * 0.05, R * 0.75 * pulse);
			core.addColorStop(0, `rgba(255,255,220,${0.95 * k})`);
			core.addColorStop(0.4, `rgba(255,190,60,${0.7 * k})`);
			core.addColorStop(1, 'rgba(255,90,20,0)');
			c.fillStyle = core;
			c.fillRect(-R * 1.5, -R * 1.5, R * 3, R * 3);
		}
		c.restore();
	}
	// the gloss
	c.beginPath();
	c.ellipse(-R * 0.35 * sx, -R * 0.5 * sy, R * 0.32, R * 0.14, -0.45, 0, TAU);
	c.fillStyle = `rgba(255,255,255,${0.75 - 0.35 * k})`;
	c.fill();
	c.restore();
	path();
	c.strokeStyle = ink;
	c.lineWidth = inkW;
	c.lineJoin = 'round';
	c.stroke();
	// teeth along the split mouth, in rage
	if (k > 0.2) {
		c.save();
		c.scale(sx, sy);
		for (const side of [-1, 1]) {
			for (let t = 0; t < 3; t++) {
				const d = R * (0.35 + t * 0.22);
				const a = side * mouth;
				const ex = Math.cos(a) * d;
				const ey = Math.sin(a) * d;
				const nx = side * Math.sin(a);
				const ny = -side * Math.cos(a);
				const s = R * 0.13 * k;
				c.beginPath();
				c.moveTo(ex - Math.cos(a) * s * 0.5, ey - Math.sin(a) * s * 0.5);
				c.lineTo(ex + Math.cos(a) * s * 0.5, ey + Math.sin(a) * s * 0.5);
				c.lineTo(ex + nx * s, ey + ny * s);
				c.closePath();
				c.fillStyle = '#fffaf0';
				c.fill();
				c.strokeStyle = ink;
				c.lineWidth = inkW * 0.6;
				c.stroke();
			}
		}
		c.restore();
	}
	if (p.ms) bow(c, -R * 0.3 * sx, -R * 0.82 * sy, R, -0.4, p.season, p.dpr, 0.66);
	// the eyes: two dots (calm), slits (his rage), spirals (hers)
	if (k < 0.5) {
		for (const [ex, ey] of [
			[0.06, -0.42],
			[0.38, -0.36]
		] as const) {
			c.beginPath();
			c.ellipse(ex * R * sx, ey * R * sy, R * 0.085, R * 0.12, 0, 0, TAU);
			c.fillStyle = p.ms ? '#3a0820' : '#3a1a04';
			c.fill();
			c.beginPath();
			c.arc(ex * R * sx - R * 0.025, ey * R * sy - R * 0.04, R * 0.03, 0, TAU);
			c.fillStyle = '#ffffff';
			c.fill();
		}
		if (p.ms) {
			c.strokeStyle = '#3a0820';
			c.lineWidth = R * 0.04;
			c.beginPath();
			c.moveTo(-0.04 * R * sx, -0.56 * R * sy);
			c.lineTo(-0.1 * R * sx, -0.64 * R * sy);
			c.stroke();
		}
	} else {
		eye(c, R * 0.18 * sx, -R * 0.4 * sy, R * 0.2, p.ms ? 'spiral' : 'fierce', '#2a0a04', p.time, col.glow);
	}
	c.restore();
	rageBurst(c, x, y, R, p.burst, col.glow);
};

// ── C · the predator ──────────────────────────────────────────────────────────────

/**
 * C: the season's ghosts are small animals; the hero is their predator. The nimble form is a
 * round cub with pointed ears, a white chin, a bushy tail that swings with the run. In rage it
 * becomes the beast: a spiked mane, swept-back ears, war stripes, a wide maw with fangs, burning
 * eyes, a flame of a tail. Hers: a fox with the bow between her ears; in her overdrive three
 * glowing tails fan out (a kitsune) and her eyes spiral.
 */
export const beast: HeroPainter = (c, x, y, S, p) => {
	const R = radiusOf(S, p, 0.38);
	const col = colorsOf(p);
	const k = smooth(p.rage);
	const ink = col.ink;
	const inkW = Math.max(1, S * 0.045);
	c.save();
	orient(c, x, y, p.angle);
	const mouth = mouthOf(p);
	const swing = Math.sin(p.time * (8 + 6 * p.speed)) * (0.15 + 0.3 * p.speed) + p.turn * 0.6;
	// the tail(s), behind
	const tails = p.ms ? Math.round(lerp(1, 3, k)) : 1;
	for (let t = 0; t < tails; t++) {
		const spread = tails === 1 ? 0 : (t - (tails - 1) / 2) * 0.55;
		c.save();
		c.translate(-R * 0.8, R * 0.15);
		c.rotate(Math.PI + swing + spread - 0.25);
		const L = R * lerp(0.95, 1.25, k);
		const W = R * lerp(0.42, 0.36, k);
		c.beginPath();
		c.moveTo(0, 0);
		if (!p.ms && k > 0.5) {
			// a flame of a tail: jagged
			const n = 7;
			c.quadraticCurveTo(L * 0.4, -W, L, 0);
			for (let i = n; i >= 0; i--) {
				const u = i / n;
				const jag = i % 2 ? 0.55 : 1;
				c.lineTo(L * u, W * jag * Math.sin(Math.PI * u) * (0.8 + 0.2 * Math.sin(p.time * 30 + i)));
			}
		} else {
			c.bezierCurveTo(L * 0.3, -W * 1.1, L * 0.85, -W * 0.9, L, 0);
			c.bezierCurveTo(L * 0.85, W * 0.9, L * 0.3, W * 1.1, 0, 0);
		}
		c.closePath();
		const g = c.createLinearGradient(0, 0, L, 0);
		g.addColorStop(0, col.mix('body'));
		g.addColorStop(0.65, col.mix('shade'));
		g.addColorStop(0.66, p.ms && k > 0.5 ? '#f3d6ff' : '#fff8ea');
		g.addColorStop(1, p.ms && k > 0.5 ? '#ffffff' : '#fff8ea');
		c.fillStyle = g;
		c.fill();
		c.strokeStyle = ink;
		c.lineWidth = inkW;
		c.lineJoin = 'round';
		c.stroke();
		if (p.ms && k > 0.3) {
			c.globalCompositeOperation = 'lighter';
			const tip = c.createRadialGradient(L, 0, 0, L, 0, R * 0.5);
			tip.addColorStop(0, `rgba(${col.glow},${0.8 * k})`);
			tip.addColorStop(1, `rgba(${col.glow},0)`);
			c.fillStyle = tip;
			c.beginPath();
			c.arc(L, 0, R * 0.5, 0, TAU);
			c.fill();
		}
		c.restore();
	}
	// the mane (his rage): zigzag spikes round the back and the top
	if (!p.ms && k > 0.02) {
		c.beginPath();
		const n = 13;
		for (let i = 0; i <= n * 2; i++) {
			const a = lerp(-0.45 * Math.PI - 0.2, 0.62 * Math.PI + 0.35, 1 - i / (n * 2)) + Math.PI * 0.5;
			const rr = R * (i % 2 === 0 ? 1.0 + 0.42 * k : 0.92);
			const px = Math.cos(a) * rr;
			const py = Math.sin(a) * rr;
			if (i === 0) c.moveTo(px, py);
			else c.lineTo(px, py);
		}
		c.closePath();
		c.fillStyle = '#c8321a';
		c.fill();
		c.strokeStyle = ink;
		c.lineWidth = inkW;
		c.lineJoin = 'round';
		c.stroke();
	}
	// the ears: up and pricked; in rage swept back and sharp
	const ear = (side: number) => {
		const base = side < 0 ? -2.05 : -1.3;
		const sweep = lerp(0, -0.55, k);
		const a = base + sweep;
		const bx = Math.cos(a) * R * 0.8;
		const by = Math.sin(a) * R * 0.8;
		const h = R * lerp(0.62, 0.78, k);
		const tipA = a - lerp(0.05, 0.35, k);
		const tx = bx + Math.cos(tipA) * h;
		const ty = by + Math.sin(tipA) * h;
		const w = R * 0.32;
		const px = -Math.sin(a) * w;
		const py = Math.cos(a) * w;
		c.beginPath();
		c.moveTo(bx + px, by + py);
		c.lineTo(tx, ty);
		c.lineTo(bx - px, by - py);
		c.closePath();
		c.fillStyle = col.mix('body');
		c.fill();
		c.strokeStyle = ink;
		c.lineWidth = inkW;
		c.lineJoin = 'round';
		c.stroke();
		c.beginPath();
		c.moveTo(bx + px * 0.5, by + py * 0.5);
		c.lineTo(lerp(bx, tx, 0.7), lerp(by, ty, 0.7));
		c.lineTo(bx - px * 0.5, by - py * 0.5);
		c.closePath();
		c.fillStyle = p.ms ? '#ffd0ea' : '#ffb0a0';
		c.fill();
		// a dark tip
		c.beginPath();
		c.moveTo(lerp(bx + px, tx, 0.62), lerp(by + py, ty, 0.62));
		c.lineTo(tx, ty);
		c.lineTo(lerp(bx - px, tx, 0.62), lerp(by - py, ty, 0.62));
		c.closePath();
		c.fillStyle = p.ms ? '#8a1a5a' : '#7a3410';
		c.fill();
	};
	ear(-1);
	// the body (a touch wider than tall: a cub, not a ball)
	mouthBody(c, R * 1.03, R * 0.97, mouth);
	celFill(c, R, col.mix('body'), col.mix('shade'), col.mix('light'), ink, inkW);
	// the white chin and cheek, under the mouth
	c.save();
	mouthBody(c, R * 1.03, R * 0.97, mouth);
	c.clip();
	c.beginPath();
	c.ellipse(R * 0.42, R * 0.55, R * 0.52, R * 0.36, -0.2, 0, TAU);
	c.fillStyle = '#fff8ea';
	c.fill();
	if (k > 0.2) {
		// war stripes
		c.strokeStyle = `rgba(120,20,10,${k})`;
		c.lineWidth = R * 0.09;
		c.lineCap = 'round';
		for (const [ax, ay, bx2, by2] of [
			[-0.5, -0.1, -0.15, -0.02],
			[-0.55, 0.12, -0.2, 0.16]
		] as const) {
			c.beginPath();
			c.moveTo(ax * R, ay * R);
			c.lineTo(bx2 * R, by2 * R);
			c.stroke();
		}
	}
	c.restore();
	mouthBody(c, R * 1.03, R * 0.97, mouth);
	c.strokeStyle = ink;
	c.lineWidth = inkW;
	c.stroke();
	ear(1);
	// the nose, on the mouth's upper lip
	const na = -mouth - 0.12;
	c.beginPath();
	c.ellipse(Math.cos(na) * R * 0.98, Math.sin(na) * R * 0.95, R * 0.09, R * 0.065, 0, 0, TAU);
	c.fillStyle = ink;
	c.fill();
	if (p.ms) bow(c, -R * 0.05, -R * 0.95, R, -0.15 + p.turn * 0.15, p.season, p.dpr, 0.55);
	if (k > 0.3) fangs(c, R, mouth, R * 0.3 * k, ink);
	const mood = k > 0.5 ? (p.ms ? 'spiral' : 'fierce') : 'calm';
	eye(c, R * 0.2, -R * 0.32, R * 0.21, mood, ink, p.time, col.glow);
	if (p.ms && mood === 'calm') {
		c.strokeStyle = ink;
		c.lineWidth = R * 0.045;
		c.lineCap = 'round';
		for (let i = 0; i < 3; i++) {
			c.beginPath();
			c.moveTo(R * (0.05 + i * 0.07), -R * 0.53);
			c.lineTo(R * (-0.02 + i * 0.08), -R * 0.66);
			c.stroke();
		}
	}
	c.restore();
	rageBurst(c, x, y, R, p.burst, col.glow);
};

export const DESIGNS: ReadonlyArray<{ id: 'a' | 'b' | 'c'; name: string; paint: HeroPainter }> = [
	{ id: 'a', name: 'A · ниндзя-колобок', paint: ninja },
	{ id: 'b', name: 'B · желе', paint: jelly },
	{ id: 'c', name: 'C · хищник', paint: beast }
];

export type { Ctx };
