// The art pass's second group (ROADMAP Part II.1, the hell): the boss and the split. Overlays drawn
// over the game's own boss (`HellBlinkyView`) and flayed ghosts, in the «Плоть» language.
// (x, y) is the boss's or a ghost's centre in px, S the tile in px.
import { TAU, bloom, cel, ink, radial } from '../hell-kit/paint';
import type { Ctx, Tones } from '../hell-kit/paint';

const BONE: Tones = { light: '#fff4dc', mid: '#e2cba2', shade: '#9a7c58' };
const BLOOD: Tones = { light: '#ff8a70', mid: '#d0281e', shade: '#6a0810' };
const HEART: Tones = { light: '#ff9a7a', mid: '#c0241e', shade: '#4a0408' };
const GOLD = '255,206,90';

/** A tiny bone skull, `r` its radius. */
function skull(c: Ctx, x: number, y: number, r: number, S: number): void {
	cel(c, () => { c.beginPath(); c.arc(x, y - r * 0.1, r, 0, TAU); c.rect(x - r * 0.55, y + r * 0.5, r * 1.1, r * 0.5); }, BONE, x, y, r, S, 0.5);
	c.fillStyle = '#2a0a08';
	for (const s of [-1, 1]) {
		c.beginPath();
		c.arc(x + s * r * 0.38, y - r * 0.1, r * 0.26, 0, TAU);
		c.fill();
	}
}

/** The stunned boss: three little skulls orbit over his horns, a timer ring under him runs down. */
export function stunOverlay(c: Ctx, x: number, y: number, S: number, t: number, left: number): void {
	// the timer: a thin bone-white arc on the floor under him, what is left of the stun
	c.save();
	c.strokeStyle = 'rgba(255,240,220,.75)';
	c.lineWidth = Math.max(1.5, S * 0.05);
	c.lineCap = 'round';
	c.beginPath();
	c.ellipse(x, y + S * 0.42, S * 0.5, S * 0.16, 0, -Math.PI / 2, -Math.PI / 2 + TAU * left);
	c.stroke();
	c.restore();
	// the skulls, behind him on the far half of the orbit, in front on the near half
	for (let k = 0; k < 3; k += 1) {
		const a = t * 4 + (k * TAU) / 3;
		const ox = Math.cos(a) * S * 0.42;
		const oy = Math.sin(a) * S * 0.12;
		skull(c, x + ox, y - S * 0.62 + oy, S * (0.085 + 0.02 * Math.sin(a)), S);
	}
}

/**
 * The split's window (all four eaten: he formed stunned, the rush and the Sting ×3, the Maw full):
 * four gold brackets close in round him and pulse, a gold timer ring, so the hero sees "hit now".
 */
export function windowMark(c: Ctx, x: number, y: number, S: number, t: number, left: number): void {
	const p = 0.5 + 0.5 * Math.sin(t * 9);
	bloom(c, x, y, S * 1.1, GOLD, 0.25 + 0.2 * p);
	const r = S * (0.62 + 0.06 * p);
	const L = S * 0.22;
	c.save();
	c.strokeStyle = `rgba(${GOLD},${0.75 + 0.25 * p})`;
	c.lineWidth = Math.max(2, S * 0.07);
	c.lineCap = 'round';
	for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
		c.beginPath();
		c.moveTo(x + sx * r, y + sy * (r - L));
		c.lineTo(x + sx * r, y + sy * r);
		c.lineTo(x + sx * (r - L), y + sy * r);
		c.stroke();
	}
	c.strokeStyle = `rgba(255,246,216,.85)`;
	c.lineWidth = Math.max(1.5, S * 0.045);
	c.beginPath();
	c.arc(x, y, S * 0.78, -Math.PI / 2, -Math.PI / 2 + TAU * left);
	c.stroke();
	c.restore();
}

/** Flesh chips thrown off the boss by a hit: `strength` 1 the Sting, 2 a rush or a glance, 3 the full hit. */
export function hitChips(c: Ctx, x: number, y: number, S: number, f: number, strength: number): void {
	const n = strength * 4;
	const a = 1 - f;
	for (let k = 0; k < n; k += 1) {
		const ang = (k * TAU) / n + strength;
		const d = S * (0.2 + (0.25 + 0.2 * strength) * f);
		c.save();
		c.translate(x + Math.cos(ang) * d, y + Math.sin(ang) * d + S * 0.3 * f * f);
		c.rotate(ang + f * 4);
		c.globalAlpha *= a;
		cel(c, () => { c.beginPath(); c.ellipse(0, 0, S * 0.035 * strength * 0.7 + 1, S * 0.025 * strength * 0.7 + 1, 0, 0, TAU); }, BLOOD, 0, 0, S * 0.05, S, 0.35);
		c.restore();
	}
}

/** The split's omen: cracks glowing through him as he shakes, a red pulse, drops falling. */
export function omen(c: Ctx, x: number, y: number, S: number, t: number, k: number): void {
	bloom(c, x, y, S * (0.8 + 0.3 * k), '255,70,40', 0.3 + 0.35 * k * (0.5 + 0.5 * Math.sin(t * 18)));
	c.save();
	c.strokeStyle = `rgba(255,200,120,${0.4 + 0.6 * k})`;
	c.lineWidth = Math.max(1, S * 0.03);
	c.lineCap = 'round';
	for (let i = 0; i < 6; i += 1) {
		const a = (i * TAU) / 6 + 0.3;
		const len = S * (0.12 + 0.3 * k);
		c.beginPath();
		c.moveTo(x, y);
		c.lineTo(x + Math.cos(a) * len * 0.5, y + Math.sin(a) * len * 0.5 + S * 0.02);
		c.lineTo(x + Math.cos(a + 0.2) * len, y + Math.sin(a + 0.2) * len);
		c.stroke();
	}
	c.restore();
	for (let i = 0; i < 3; i += 1) {
		const u = (t * 1.5 + i / 3) % 1;
		c.fillStyle = BLOOD.mid;
		c.beginPath();
		c.ellipse(x + (i - 1) * S * 0.2, y + S * (0.3 + 0.3 * u), S * 0.03, S * 0.045, 0, 0, TAU);
		c.fill();
	}
}

/**
 * The core the boss burst from: a raw heart beating in a cage of six ribs, veins on it, a red glow.
 * It sits on its corridor tile all through the split.
 */
export function core(c: Ctx, x: number, y: number, S: number, t: number): void {
	const beat = 1 + 0.12 * Math.max(0, Math.sin(t * 5)) ** 3;
	bloom(c, x, y, S * 1.1, '255,70,40', 0.55 + 0.35 * (beat - 1) * 8);
	// the ribs behind
	for (const s of [-1, 1]) {
		for (let k = 0; k < 3; k += 1) {
			const yy = y - S * 0.22 + k * S * 0.2;
			c.beginPath();
			c.moveTo(x + s * S * 0.04, yy - S * 0.06);
			c.quadraticCurveTo(x + s * S * 0.5, yy - S * 0.1, x + s * S * 0.38, yy + S * 0.12);
			c.lineWidth = Math.max(2, S * 0.07);
			c.strokeStyle = '#2a0a08';
			c.lineCap = 'round';
			c.stroke();
			c.lineWidth = Math.max(1.2, S * 0.045);
			c.strokeStyle = BONE.mid;
			c.stroke();
		}
	}
	// the heart
	c.save();
	c.translate(x, y + S * 0.02);
	c.scale(beat, beat);
	const heart = (): void => {
		c.beginPath();
		c.moveTo(0, S * 0.3);
		c.bezierCurveTo(-S * 0.42, S * 0.04, -S * 0.3, -S * 0.32, 0, -S * 0.13);
		c.bezierCurveTo(S * 0.3, -S * 0.32, S * 0.42, S * 0.04, 0, S * 0.3);
		c.closePath();
	};
	cel(c, heart, HEART, 0, 0, S * 0.3, S, 1);
	c.strokeStyle = 'rgba(60,0,10,.7)';
	c.lineWidth = Math.max(1, S * 0.02);
	c.beginPath();
	c.moveTo(-S * 0.08, -S * 0.08);
	c.quadraticCurveTo(-S * 0.02, S * 0.02, -S * 0.06, S * 0.12);
	c.moveTo(S * 0.06, -S * 0.1);
	c.quadraticCurveTo(S * 0.1, 0, S * 0.03, S * 0.1);
	c.stroke();
	c.restore();
}

/** The four running back into the core, then his forming on it: a flash and a ring, `f` 0..1. */
export function formFlash(c: Ctx, x: number, y: number, S: number, f: number): void {
	const a = 1 - f;
	bloom(c, x, y, S * 1.4, '255,120,70', 0.7 * a);
	c.save();
	c.strokeStyle = `rgba(255,200,160,${a})`;
	c.lineWidth = S * 0.06 * a + 1;
	c.beginPath();
	c.arc(x, y, S * (0.3 + 0.8 * f), 0, TAU);
	c.stroke();
	c.restore();
}

/**
 * A flayed ghost eaten in the split: it bursts into flesh, its two eyes fly, and the score rises in
 * bone-white with a dark edge, `f` 0..1.
 */
export function ghostEaten(c: Ctx, x: number, y: number, S: number, f: number, points: number): void {
	const a = 1 - f;
	if (f < 0.25) bloom(c, x, y, S * 0.9, '255,230,210', 0.6 * (1 - f / 0.25));
	for (let k = 0; k < 9; k += 1) {
		const ang = (k * TAU) / 9 + 0.2;
		const d = S * (0.1 + 0.6 * f);
		c.save();
		c.translate(x + Math.cos(ang) * d, y + Math.sin(ang) * d + S * 0.35 * f * f);
		c.rotate(ang + f * 5);
		c.globalAlpha *= a;
		cel(c, () => { c.beginPath(); c.ellipse(0, 0, S * 0.07, S * 0.045, 0, 0, TAU); }, BLOOD, 0, 0, S * 0.07, S, 0.4);
		c.restore();
	}
	// the two eyes
	for (const s of [-1, 1]) {
		const ex = x + s * S * (0.1 + 0.4 * f);
		const ey = y - S * (0.1 + 0.5 * f - 0.6 * f * f);
		c.save();
		c.globalAlpha *= a;
		c.fillStyle = radial(c, ex, ey, 0, S * 0.08, ['#ffffff', '#e8e0d8']);
		c.beginPath();
		c.arc(ex, ey, S * 0.08, 0, TAU);
		c.fill();
		ink(c, S, 0.4);
		c.fillStyle = '#1a0a08';
		c.beginPath();
		c.arc(ex + s * S * 0.02, ey, S * 0.035, 0, TAU);
		c.fill();
		c.restore();
	}
	// the score
	const ty = y - S * (0.3 + 0.6 * f);
	c.save();
	c.globalAlpha *= Math.min(1, a * 2);
	c.font = `700 ${Math.round(S * 0.42)}px "PT Sans Narrow","Arial Narrow",sans-serif`;
	c.textAlign = 'center';
	c.textBaseline = 'middle';
	c.lineWidth = Math.max(2, S * 0.08);
	c.strokeStyle = '#1a0406';
	c.strokeText(`${points}`, x, ty);
	c.fillStyle = '#fff0d8';
	c.fillText(`${points}`, x, ty);
	c.restore();
}
