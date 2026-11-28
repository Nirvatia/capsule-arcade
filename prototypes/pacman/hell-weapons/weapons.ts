// The weapons' art pass (ROADMAP Part II.1, the hell): candidates drawn in the «Плоть» language
// (`hell-kit/paint.ts`) as frame series, beside what the game draws now. Static frames, nothing plays.
// (x, y) is a centre in px, S the tile in px; icons are painted in a -50..50 box.
import { drawFleshFood, drawRushWhirl, drawStingBolt, paintSting } from '../../../src/games/pacman/render/doom/fleshKit';
import { TAU, VEC, bloom, cel, gloss, ink, linear, part, radial, shadow } from '../hell-kit/paint';
import type { Ctx, Dir, Tones } from '../hell-kit/paint';

const BONE: Tones = { light: '#fff4dc', mid: '#e2cba2', shade: '#9a7c58' };
const IRON: Tones = { light: '#c4ccd4', mid: '#7a848e', shade: '#3a4048' };
const CHITIN: Tones = { light: '#ffcf7a', mid: '#c07a24', shade: '#5a2c0a' };
const VENOM = { light: '#e8fcff', mid: '#46d2f6', shade: '#10709a', glow: '80,210,255' };
const BLOOD = { light: '#ff8a70', mid: '#d0281e', shade: '#6a0810' };
const GOLD = '255,206,90';

/** Paints `paint` (in a -50..50 box) at (x, y), `size` px across. */
function icon(c: Ctx, x: number, y: number, size: number, paint: (c: Ctx) => void): void {
	c.save();
	c.translate(x, y);
	c.scale(size / 100, size / 100);
	paint(c);
	c.restore();
}

// ── the Sting's icon ─────────────────────────────────────────────────────────────────────────────

const WASP = { light: '#ffe08a', mid: '#f0a828', shade: '#8a4a08', dark: '#1c0c08' };

/**
 * Candidate C, the wasp: a wasp's abdomen as the gun, banded amber and black (bands read at any
 * size), a black sting with a drop of venom at its tip, on a short iron grip.
 */
export function paintStingWasp(c: Ctx): void {
	const S = 60;
	part(c, () => { c.beginPath(); c.moveTo(-26, 8); c.lineTo(-12, 8); c.lineTo(-18, 34); c.lineTo(-32, 34); c.closePath(); }, linear(c, 0, 8, 0, 34, [IRON.mid, IRON.shade]), S, 0.9);
	const body = (): void => { c.beginPath(); c.ellipse(-4, -2, 34, 20, 0, 0, TAU); };
	body();
	c.fillStyle = WASP.mid;
	c.fill();
	c.save();
	body();
	c.clip();
	c.fillStyle = WASP.dark;
	for (const bx of [-28, -12, 4, 20]) {
		c.beginPath();
		c.moveTo(bx, -24);
		c.quadraticCurveTo(bx + 5, -2, bx, 22);
		c.lineTo(bx + 7, 22);
		c.quadraticCurveTo(bx + 12, -2, bx + 7, -24);
		c.closePath();
		c.fill();
	}
	c.fillStyle = 'rgba(255,240,200,.35)';
	c.beginPath();
	c.ellipse(-10, -12, 24, 7, -0.1, 0, TAU);
	c.fill();
	c.fillStyle = 'rgba(40,10,0,.35)';
	c.beginPath();
	c.ellipse(-4, 14, 34, 8, 0, 0, TAU);
	c.fill();
	c.restore();
	body();
	ink(c, S, 1.1);
	part(c, () => { c.beginPath(); c.moveTo(28, -7); c.lineTo(48, -1); c.lineTo(28, 5); c.closePath(); }, '#1c0c08', S, 0.8);
	bloom(c, 48, -1, 14, VENOM.glow, 0.9);
	part(c, () => { c.beginPath(); c.arc(48, 3, 4, 0, TAU); }, VENOM.mid, S, 0.5);
	gloss(c, -16, -12, 9, 2.6, 0.8, -0.1);
}

/**
 * Candidate D, the sting itself: one big curved thorn of bone, its hollow lit with venom, the tip
 * glowing. Nothing but the silhouette, as bold as the fist.
 */
export function paintStingThorn(c: Ctx): void {
	const S = 60;
	const thorn = (): void => {
		c.beginPath();
		c.moveTo(-40, 26);
		c.quadraticCurveTo(-36, -18, 6, -30);
		c.quadraticCurveTo(34, -36, 48, -10);
		c.quadraticCurveTo(26, -20, 8, -12);
		c.quadraticCurveTo(-18, -2, -22, 30);
		c.closePath();
	};
	bloom(c, 40, -14, 18, VENOM.glow, 0.9);
	cel(c, thorn, BONE, -4, -4, 30, S, 1.2);
	// the venom channel along its inside
	c.save();
	c.strokeStyle = VENOM.mid;
	c.lineWidth = 5;
	c.lineCap = 'round';
	c.beginPath();
	c.moveTo(-30, 22);
	c.quadraticCurveTo(-24, -10, 8, -20);
	c.quadraticCurveTo(28, -26, 42, -14);
	c.stroke();
	c.strokeStyle = VENOM.light;
	c.lineWidth = 1.8;
	c.stroke();
	c.restore();
	// segments of the shaft
	c.strokeStyle = 'rgba(80,50,30,.7)';
	c.lineWidth = 1.8;
	for (const [x0, y0, x1, y1] of [[-38, 8, -24, 12], [-30, -10, -16, -2], [-12, -24, -4, -12]]) {
		c.beginPath();
		c.moveTo(x0, y0);
		c.lineTo(x1, y1);
		c.stroke();
	}
	part(c, () => { c.beginPath(); c.arc(48, -10, 4, 0, TAU); }, VENOM.light, S, 0.5);
}

/**
 * Candidate E, the venom gland: a translucent sac of glowing venom on a bone grip, held by sinews,
 * a bone sting jutting out of its front.
 */
export function paintStingGland(c: Ctx): void {
	const S = 60;
	cel(c, () => { c.beginPath(); c.moveTo(-30, 4); c.lineTo(-16, 4); c.lineTo(-22, 34); c.lineTo(-36, 34); c.closePath(); }, BONE, -26, 18, 14, S, 0.9);
	bloom(c, -2, -4, 46, VENOM.glow, 0.6);
	part(c, () => { c.beginPath(); c.ellipse(-4, -4, 28, 22, 0, 0, TAU); }, radial(c, -12, -12, 2, 32, [VENOM.light, VENOM.mid, VENOM.shade]), S, 1.1);
	// the sinews that hold it
	c.strokeStyle = '#a83a34';
	c.lineWidth = 4;
	c.lineCap = 'round';
	for (const s of [-1, 1]) {
		c.beginPath();
		c.moveTo(-28, 6);
		c.quadraticCurveTo(-6, s * 26 - 4, 22, s * 10 - 4);
		c.stroke();
	}
	gloss(c, -14, -16, 10, 4, 0.85, -0.4);
	cel(c, () => { c.beginPath(); c.moveTo(22, -12); c.lineTo(50, -4); c.lineTo(22, 4); c.closePath(); }, BONE, 34, -4, 10, S, 0.8);
	bloom(c, 49, -4, 9, VENOM.glow, 0.9);
}

// ── the Sting's fire ─────────────────────────────────────────────────────────────────────────────

/** The muzzle at the hero's front: a venom spit, `f` 0..1 through a shot. */
export function stingMuzzle(c: Ctx, x: number, y: number, S: number, dir: Dir, f: number): void {
	const [dx, dy] = VEC[dir];
	const mx = x + dx * S * 0.45;
	const my = y + dy * S * 0.45;
	const a = 1 - f;
	bloom(c, mx, my, S * (0.35 + 0.25 * a), VENOM.glow, 0.7 * a + 0.15);
	c.save();
	c.translate(mx, my);
	c.rotate(Math.atan2(dy, dx));
	// a cone of three venom tongues
	for (let k = -1; k <= 1; k += 1) {
		const len = S * (0.28 + 0.12 * (1 - Math.abs(k))) * (0.6 + 0.4 * a);
		c.beginPath();
		c.moveTo(0, 0);
		c.quadraticCurveTo(len * 0.5, k * S * 0.12, len, k * S * 0.08);
		c.quadraticCurveTo(len * 0.5, k * S * 0.04, 0, 0);
		c.fillStyle = k === 0 ? VENOM.light : VENOM.mid;
		c.fill();
	}
	c.restore();
	// spray drops
	for (let k = 0; k < 3; k += 1) {
		const sp = (k - 1) * 0.5;
		const d = S * (0.2 + 0.25 * f + k * 0.05);
		c.fillStyle = VENOM.mid;
		c.beginPath();
		c.arc(mx + (dx * Math.cos(sp) - dy * Math.sin(sp)) * d, my + (dy * Math.cos(sp) + dx * Math.sin(sp)) * d, S * 0.03 * a + 0.6, 0, TAU);
		c.fill();
	}
}

/** A bolt hitting the boss: a venom splash that eats in and smokes, `f` 0..1. */
export function stingHitBoss(c: Ctx, x: number, y: number, S: number, f: number): void {
	const a = 1 - f;
	bloom(c, x, y, S * (0.3 + 0.2 * f), VENOM.glow, 0.6 * a);
	// the splash: a star of drops flung back from the wound
	for (let k = 0; k < 7; k += 1) {
		const ang = Math.PI + (k - 3) * 0.38;
		const d = S * (0.08 + 0.32 * f);
		c.fillStyle = k % 2 ? VENOM.mid : VENOM.light;
		c.beginPath();
		c.ellipse(x + Math.cos(ang) * d, y + Math.sin(ang) * d, S * 0.05 * (0.4 + a), S * 0.028 * (0.4 + a), ang, 0, TAU);
		c.fill();
	}
	// the wound: a hissing stain on the flesh, then smoke rising
	c.fillStyle = `rgba(20,90,70,${0.75 * (0.4 + a * 0.6)})`;
	c.beginPath();
	c.ellipse(x, y, S * 0.1, S * 0.08, 0.3, 0, TAU);
	c.fill();
	c.fillStyle = `rgba(160,255,220,${0.5 * a})`;
	c.beginPath();
	c.ellipse(x - S * 0.02, y - S * 0.02, S * 0.05, S * 0.03, 0.3, 0, TAU);
	c.fill();
	for (let k = 0; k < 3; k += 1) {
		c.fillStyle = `rgba(150,170,160,${0.35 * f * (1 - k * 0.25)})`;
		c.beginPath();
		c.arc(x + (k - 1) * S * 0.06, y - S * (0.1 + 0.18 * f + k * 0.05), S * (0.05 + 0.03 * k), 0, TAU);
		c.fill();
	}
}

/** A bolt on a wall: a flat splat that runs down, `f` 0..1. */
export function stingHitWall(c: Ctx, x: number, y: number, S: number, f: number): void {
	const a = 1 - f * 0.7;
	c.save();
	c.globalAlpha *= a;
	c.fillStyle = VENOM.mid;
	c.beginPath();
	for (let k = 0; k < 10; k += 1) {
		const ang = (k / 10) * TAU;
		const r = S * (0.1 + (k % 2 ? 0.05 : 0.11)) * (0.5 + 0.5 * Math.min(1, f * 3));
		const px = x + Math.cos(ang) * r;
		const py = y + Math.sin(ang) * r * 0.8;
		if (k === 0) c.moveTo(px, py);
		else c.lineTo(px, py);
	}
	c.closePath();
	c.fill();
	ink(c, S, 0.4);
	// two runs down the wall
	for (const ox of [-0.05, 0.06]) {
		c.fillStyle = VENOM.shade;
		c.beginPath();
		c.roundRect(x + ox * S - S * 0.018, y, S * 0.036, S * (0.04 + 0.22 * f), S * 0.018);
		c.fill();
	}
	c.fillStyle = 'rgba(232,252,255,.8)';
	c.beginPath();
	c.ellipse(x - S * 0.04, y - S * 0.04, S * 0.03, S * 0.014, -0.4, 0, TAU);
	c.fill();
	c.restore();
}

/** An imp killed by a bolt: it pops into a puff of soot and venom with its horns flying. */
export function stingKillImp(c: Ctx, x: number, y: number, S: number, f: number): void {
	const a = 1 - f;
	bloom(c, x, y, S * 0.4, VENOM.glow, 0.5 * a);
	for (let k = 0; k < 6; k += 1) {
		const ang = k * (TAU / 6) + 0.3;
		const d = S * (0.05 + 0.3 * f);
		c.fillStyle = `rgba(40,20,24,${0.7 * a})`;
		c.beginPath();
		c.arc(x + Math.cos(ang) * d, y + Math.sin(ang) * d, S * (0.07 + 0.05 * f), 0, TAU);
		c.fill();
	}
	// the two horns spinning off
	for (const s of [-1, 1]) {
		c.save();
		c.translate(x + s * S * (0.1 + 0.28 * f), y - S * (0.1 + 0.2 * f - 0.25 * f * f));
		c.rotate(s * f * 4);
		cel(c, () => { c.beginPath(); c.moveTo(-S * 0.05, S * 0.04); c.lineTo(0, -S * 0.09); c.lineTo(S * 0.05, S * 0.04); c.closePath(); }, BONE, 0, 0, S * 0.06, S, 0.4);
		c.restore();
	}
	c.fillStyle = `rgba(232,252,255,${a})`;
	c.beginPath();
	c.arc(x, y, S * 0.08 * a, 0, TAU);
	c.fill();
}

// ── the rush ─────────────────────────────────────────────────────────────────────────────────────

/** The rush's trail: speed streaks and drops left behind the object along its heading. */
export function rushTrail(c: Ctx, x: number, y: number, S: number, dir: Dir, amount: number, counter: boolean): void {
	const [dx, dy] = VEC[dir];
	const g = Math.max(0, Math.min(1, amount));
	c.save();
	c.lineCap = 'round';
	for (let k = 0; k < 5; k += 1) {
		const off = (k - 2) * S * 0.11;
		const len = S * (0.5 + 0.3 * ((k * 7) % 3) / 2) * g;
		const sx = x - dx * S * 0.35 - dy * off;
		const sy = y - dy * S * 0.35 + dx * off;
		c.strokeStyle = counter ? `rgba(${GOLD},${0.6 * g})` : `rgba(200,30,26,${0.6 * g})`;
		c.lineWidth = S * (k === 2 ? 0.07 : 0.035);
		c.beginPath();
		c.moveTo(sx, sy);
		c.lineTo(sx - dx * len, sy - dy * len);
		c.stroke();
	}
	c.restore();
	for (let k = 0; k < 4; k += 1) {
		const d = S * (0.5 + k * 0.22) * g;
		c.fillStyle = counter ? '#ffcf5a' : BLOOD.mid;
		c.beginPath();
		c.arc(x - dx * d + dy * (k % 2 ? 1 : -1) * S * 0.12, y - dy * d + dx * (k % 2 ? 1 : -1) * S * 0.12, S * 0.03 * (1 - k * 0.15), 0, TAU);
		c.fill();
	}
}

const HOT: Tones = { light: '#fff6d8', mid: '#ffcf5a', shade: '#a86a10' };
const FLESH: Tones = { light: '#e05a4a', mid: '#8a1a1c', shade: '#3a0408' };

/**
 * Rush candidate 1, the fang saw: a disc of dark flesh ringed with ten bone fangs, spinning fast.
 * `t` turns it; `counter` makes the fangs white-hot gold.
 */
export function rushSaw(c: Ctx, x: number, y: number, S: number, t: number, counter: boolean): void {
	const R = S * 0.26;
	const spin = t * 14;
	if (counter) bloom(c, x, y, S * 0.8, GOLD, 0.5);
	shadow(c, x, y, R * 1.2, R * 0.5, 0.45);
	const teeth = counter ? HOT : BONE;
	// the blade: a ring of bone with eight hooked teeth, the flesh hub inside
	const N = 8;
	const blade = (): void => {
		c.beginPath();
		for (let k = 0; k < N; k += 1) {
			const a = spin + (k * TAU) / N;
			const b = a + TAU / N;
			c[k === 0 ? 'moveTo' : 'lineTo'](x + Math.cos(a) * R * 1.05, y + Math.sin(a) * R * 1.05);
			c.lineTo(x + Math.cos(a + 0.12) * R * 1.55, y + Math.sin(a + 0.12) * R * 1.55);
			c.lineTo(x + Math.cos(b) * R * 1.05, y + Math.sin(b) * R * 1.05);
		}
		c.closePath();
	};
	cel(c, blade, teeth, x, y, R * 1.4, S, 0.8);
	cel(c, () => { c.beginPath(); c.arc(x, y, R * 0.92, 0, TAU); }, FLESH, x, y, R, S, 0.9);
	// the motion rings and the hub
	c.save();
	c.strokeStyle = counter ? 'rgba(255,230,170,.7)' : 'rgba(255,150,130,.45)';
	c.lineWidth = Math.max(1, S * 0.02);
	for (let k = 0; k < 2; k += 1) {
		c.beginPath();
		c.arc(x, y, R * (0.45 + k * 0.25), spin + k, spin + k + 2.2);
		c.stroke();
	}
	c.restore();
	cel(c, () => { c.beginPath(); c.arc(x, y, R * 0.24, 0, TAU); }, teeth, x, y, R * 0.24, S, 0.6);
}

/**
 * Rush candidate 2, the drill: a cone of flesh pointing along the heading, its spiral grooves turning,
 * a bone tip. `t` turns the grooves.
 */
export function rushDrill(c: Ctx, x: number, y: number, S: number, dir: Dir, t: number, counter: boolean): void {
	const [dx, dy] = VEC[dir];
	if (counter) bloom(c, x + dx * S * 0.2, y + dy * S * 0.2, S * 0.8, GOLD, 0.5);
	shadow(c, x, y, S * 0.4, S * 0.18, 0.45);
	c.save();
	c.translate(x, y);
	c.rotate(Math.atan2(dy, dx));
	const cone = (): void => {
		c.beginPath();
		c.moveTo(-S * 0.36, -S * 0.32);
		c.quadraticCurveTo(-S * 0.44, 0, -S * 0.36, S * 0.32);
		c.lineTo(S * 0.36, S * 0.05);
		c.lineTo(S * 0.36, -S * 0.05);
		c.closePath();
	};
	cone();
	c.fillStyle = linear(c, 0, -S * 0.32, 0, S * 0.32, counter ? [HOT.light, HOT.mid, HOT.shade] : [FLESH.light, FLESH.mid, FLESH.shade]);
	c.fill();
	c.save();
	cone();
	c.clip();
	c.strokeStyle = counter ? 'rgba(120,60,0,.55)' : 'rgba(30,0,4,.6)';
	c.lineWidth = S * 0.06;
	const phase = (t * 3) % 1;
	for (let k = -1; k < 6; k += 1) {
		const gx = -S * 0.4 + (k + phase) * S * 0.16;
		c.beginPath();
		c.moveTo(gx, -S * 0.4);
		c.lineTo(gx + S * 0.12, S * 0.4);
		c.stroke();
	}
	c.restore();
	cone();
	ink(c, S, 0.9);
	cel(c, () => { c.beginPath(); c.moveTo(S * 0.3, -S * 0.09); c.lineTo(S * 0.52, 0); c.lineTo(S * 0.3, S * 0.09); c.closePath(); }, counter ? HOT : BONE, S * 0.4, 0, S * 0.1, S, 0.6);
	c.restore();
}

/**
 * Rush candidate 3, the thorn ball: a knot of dark flesh bristling with eight bone thorns, rolling
 * along the heading. `t` rolls it.
 */
export function rushThorns(c: Ctx, x: number, y: number, S: number, t: number, counter: boolean): void {
	const R = S * 0.24;
	const roll = t * 9;
	if (counter) bloom(c, x, y, S * 0.8, GOLD, 0.5);
	shadow(c, x, y, R * 1.3, R * 0.5, 0.45);
	const thorn = counter ? HOT : BONE;
	for (let k = 0; k < 6; k += 1) {
		const a = roll + (k * TAU) / 6;
		const len = S * 0.27;
		c.save();
		c.translate(x + Math.cos(a) * R * 0.8, y + Math.sin(a) * R * 0.8);
		c.rotate(a);
		cel(c, () => { c.beginPath(); c.moveTo(0, -S * 0.07); c.lineTo(len, 0); c.lineTo(0, S * 0.07); c.closePath(); }, thorn, len * 0.3, 0, S * 0.07, S, 0.55);
		c.restore();
	}
	cel(c, () => { c.beginPath(); c.arc(x, y, R, 0, TAU); }, FLESH, x, y, R, S, 0.9);
	c.strokeStyle = 'rgba(30,0,4,.55)';
	c.lineWidth = Math.max(1, S * 0.025);
	c.beginPath();
	c.arc(x, y, R * 0.6, roll, roll + 2);
	c.stroke();
}

/** The rush's hit on the boss: three claw cuts across him and a spray, bigger and gold for a counter. */
export function rushHit(c: Ctx, x: number, y: number, S: number, f: number, counter: boolean): void {
	const a = 1 - f;
	const k = counter ? 1.35 : 1;
	if (counter) {
		c.save();
		c.strokeStyle = `rgba(${GOLD},${0.9 * a})`;
		c.lineWidth = S * 0.06 * a + 1;
		c.beginPath();
		c.arc(x, y, S * (0.3 + 0.55 * f), 0, TAU);
		c.stroke();
		c.restore();
		bloom(c, x, y, S * 0.9, GOLD, 0.5 * a);
	} else {
		bloom(c, x, y, S * 0.6, '255,70,50', 0.35 * a);
	}
	// the cuts: three parallel slashes, drawn on fast and fading
	const len = S * 0.62 * k * Math.min(1, f * 4);
	for (let i = -1; i <= 1; i += 1) {
		const ox = i * S * 0.12;
		c.save();
		c.translate(x + ox, y);
		c.rotate(-0.7);
		c.beginPath();
		c.moveTo(-len / 2, -S * 0.04);
		c.quadraticCurveTo(0, S * 0.03, len / 2, -S * 0.04);
		c.quadraticCurveTo(0, S * 0.07, -len / 2, -S * 0.04);
		c.fillStyle = counter ? `rgba(255,246,216,${a})` : `rgba(255,220,200,${a})`;
		c.fill();
		c.restore();
	}
	// the spray
	for (let i = 0; i < 9; i += 1) {
		const ang = -0.7 + (i - 4) * 0.32 + Math.PI * (i % 2);
		const d = S * (0.15 + 0.5 * f) * k;
		c.fillStyle = i % 3 === 0 ? BLOOD.light : BLOOD.mid;
		c.beginPath();
		c.arc(x + Math.cos(ang) * d, y + Math.sin(ang) * d, S * 0.035 * (0.5 + a) * k, 0, TAU);
		c.fill();
	}
}

/** "A rush now is a counter": a gold ring round the hero, its four sparks running round. */
export function counterReady(c: Ctx, x: number, y: number, S: number, t: number): void {
	const p = 0.5 + 0.5 * Math.sin(t * 7);
	bloom(c, x, y, S * 0.8, GOLD, 0.25 + 0.15 * p);
	c.save();
	c.strokeStyle = `rgba(${GOLD},${0.6 + 0.3 * p})`;
	c.lineWidth = Math.max(1.2, S * 0.035);
	c.setLineDash([S * 0.16, S * 0.08]);
	c.lineDashOffset = -t * S;
	c.beginPath();
	c.arc(x, y, S * 0.56, 0, TAU);
	c.stroke();
	c.setLineDash([]);
	for (let k = 0; k < 4; k += 1) {
		const a = t * 3 + (k * TAU) / 4;
		c.fillStyle = '#fff6d8';
		c.beginPath();
		c.arc(x + Math.cos(a) * S * 0.56, y + Math.sin(a) * S * 0.56, S * 0.04, 0, TAU);
		c.fill();
	}
	c.restore();
}

// ── the Maw ──────────────────────────────────────────────────────────────────────────────────────

/** The Maw's charge at the hero's front: fire gathering into a ball, `f` 0..1 of the 0.8 s. */
export function mawCharge(c: Ctx, x: number, y: number, S: number, dir: Dir, f: number): void {
	const [dx, dy] = VEC[dir];
	const mx = x + dx * S * 0.5;
	const my = y + dy * S * 0.5;
	// embers drawn in from round the hero
	for (let k = 0; k < 8; k += 1) {
		const a = (k * TAU) / 8 + f * 2;
		const d = S * (0.7 - 0.55 * f);
		c.fillStyle = `rgba(255,${150 + k * 10},60,${0.4 + 0.5 * f})`;
		c.beginPath();
		c.arc(mx + Math.cos(a) * d, my + Math.sin(a) * d, S * 0.03, 0, TAU);
		c.fill();
	}
	bloom(c, mx, my, S * (0.25 + 0.5 * f), '255,150,60', 0.4 + 0.4 * f);
	c.fillStyle = radial(c, mx, my, 0, S * 0.22 * f + 1, ['#fff6d8', '#ffb43a', 'rgba(220,60,10,0)']);
	c.beginPath();
	c.arc(mx, my, S * 0.22 * f + 1, 0, TAU);
	c.fill();
	// the ring that closes as it fills
	c.save();
	c.strokeStyle = `rgba(255,190,90,${0.4 + 0.5 * f})`;
	c.lineWidth = Math.max(1, S * 0.03);
	c.beginPath();
	c.arc(mx, my, S * (0.5 - 0.25 * f), -Math.PI / 2, -Math.PI / 2 + TAU * f);
	c.stroke();
	c.restore();
}

/** The Maw's orb in flight. */
export function mawOrb(c: Ctx, x: number, y: number, S: number, t: number): void {
	bloom(c, x, y, S * 0.9, '255,150,60', 0.6);
	c.fillStyle = radial(c, x, y, 0, S * 0.26, ['#fffbe8', '#ffc04a', '#e0501a']);
	c.beginPath();
	c.arc(x, y, S * 0.24 + Math.sin(t * 30) * S * 0.01, 0, TAU);
	c.fill();
	ink(c, S, 0.5);
}

/** The orb on a boss who is not stunned: it breaks on him, sparks thrown aside, a dull small mark. */
export function mawGlance(c: Ctx, x: number, y: number, S: number, f: number): void {
	const a = 1 - f;
	bloom(c, x, y, S * 0.6, '255,150,60', 0.35 * a);
	for (let k = 0; k < 8; k += 1) {
		const side = k % 2 ? 1 : -1;
		const ang = Math.PI + side * (0.9 + (k >> 1) * 0.18);
		const d = S * (0.2 + 0.55 * f);
		c.strokeStyle = `rgba(255,${170 + k * 8},90,${a})`;
		c.lineWidth = Math.max(1, S * 0.025);
		c.beginPath();
		c.moveTo(x + Math.cos(ang) * d * 0.6, y + Math.sin(ang) * d * 0.6);
		c.lineTo(x + Math.cos(ang) * d, y + Math.sin(ang) * d);
		c.stroke();
	}
	// a grey puff: the orb did not get in
	c.fillStyle = `rgba(120,100,96,${0.5 * a})`;
	c.beginPath();
	c.arc(x - S * 0.1, y, S * (0.12 + 0.1 * f), 0, TAU);
	c.fill();
}

/** The orb on a stunned boss: the real hit, a white-hot core, a fire burst and flesh flying. */
export function mawFull(c: Ctx, x: number, y: number, S: number, f: number): void {
	const a = 1 - f;
	bloom(c, x, y, S * 1.6, '255,170,70', 0.7 * a);
	c.fillStyle = radial(c, x, y, 0, S * (0.4 + 0.5 * f), ['rgba(255,250,230,' + a + ')', 'rgba(255,170,60,' + 0.8 * a + ')', 'rgba(200,40,10,0)']);
	c.beginPath();
	c.arc(x, y, S * (0.4 + 0.5 * f), 0, TAU);
	c.fill();
	// the shock ring
	c.save();
	c.strokeStyle = `rgba(255,230,180,${a})`;
	c.lineWidth = S * 0.05 * a + 1;
	c.beginPath();
	c.arc(x, y, S * (0.3 + 1.0 * f), 0, TAU);
	c.stroke();
	c.restore();
	// chunks of flesh flung out
	for (let k = 0; k < 7; k += 1) {
		const ang = (k * TAU) / 7 + 0.4;
		const d = S * (0.2 + 0.8 * f);
		c.save();
		c.translate(x + Math.cos(ang) * d, y + Math.sin(ang) * d + S * 0.2 * f * f);
		c.rotate(ang + f * 5);
		cel(c, () => { c.beginPath(); c.ellipse(0, 0, S * 0.07, S * 0.045, 0, 0, TAU); }, BLOOD, 0, 0, S * 0.07, S, 0.4);
		c.restore();
	}
}

// ── spent, arriving, refused ─────────────────────────────────────────────────────────────────────

/** The weapon in hand spent: its icon cracks over the hero and falls apart into ash, `f` 0..1. */
export function spent(c: Ctx, x: number, y: number, S: number, f: number, paint: (c: Ctx) => void): void {
	const size = S * 0.7;
	if (f < 0.45) {
		const k = f / 0.45;
		c.save();
		c.globalAlpha *= 1 - 0.3 * k;
		c.filter = `grayscale(${k}) brightness(${1 - 0.4 * k})`;
		icon(c, x, y - S * 0.6 - k * S * 0.1, size, paint);
		c.restore();
		// the crack
		c.save();
		c.strokeStyle = `rgba(255,240,220,${k})`;
		c.lineWidth = Math.max(1, S * 0.03);
		c.beginPath();
		c.moveTo(x - size * 0.2, y - S * 0.6 - size * 0.3);
		c.lineTo(x, y - S * 0.6);
		c.lineTo(x - size * 0.06, y - S * 0.55);
		c.lineTo(x + size * 0.18, y - S * 0.6 + size * 0.3);
		c.stroke();
		c.restore();
		return;
	}
	const k = (f - 0.45) / 0.55;
	for (let i = 0; i < 12; i += 1) {
		const px = x + ((i % 4) - 1.5) * size * 0.22 + Math.sin(i * 1.7) * S * 0.08 * k;
		const py = y - S * 0.65 + Math.floor(i / 4) * size * 0.2 + S * 0.5 * k * (0.6 + (i % 3) * 0.2);
		c.fillStyle = `rgba(${110 + (i % 3) * 20},${100 + (i % 3) * 15},96,${1 - k})`;
		c.beginPath();
		c.rect(px, py, S * 0.06 * (1 - k * 0.5), S * 0.05 * (1 - k * 0.5));
		c.fill();
	}
}

/** A weapon arriving on its spot: a blister of flesh swells, bursts, and the icon rises out lit. */
export function arrive(c: Ctx, x: number, y: number, S: number, f: number, paint: (c: Ctx) => void, glow: string): void {
	if (f < 0.5) {
		const k = f / 0.5;
		shadow(c, x, y, S * 0.3 * k, S * 0.12 * k, 0.5);
		cel(c, () => { c.beginPath(); c.ellipse(x, y + S * 0.05, S * 0.3 * k + 1, S * 0.24 * k + 1, 0, 0, TAU); }, { light: '#e88a7a', mid: '#a83a34', shade: '#4a0c12' }, x, y, S * 0.3 * k + 1, S, 0.7);
		bloom(c, x, y, S * 0.5 * k, glow, 0.3 * k);
		return;
	}
	const k = (f - 0.5) / 0.5;
	// the torn lips of the blister
	for (const s of [-1, 1]) {
		cel(c, () => { c.beginPath(); c.ellipse(x + s * S * (0.2 + 0.08 * k), y + S * 0.12, S * 0.14, S * 0.08, s * 0.5, 0, TAU); }, { light: '#e88a7a', mid: '#a83a34', shade: '#4a0c12' }, x + s * S * 0.2, y + S * 0.12, S * 0.14, S, 0.6);
	}
	bloom(c, x, y - S * 0.1 * k, S * 0.7, glow, 0.6 * (1 - k * 0.4));
	icon(c, x, y + S * 0.1 * (1 - k), S * 0.9 * (0.5 + 0.5 * k), paint);
	for (let i = 0; i < 5; i += 1) {
		const ang = -Math.PI / 2 + (i - 2) * 0.5;
		const d = S * (0.2 + 0.35 * k);
		c.fillStyle = BLOOD.mid;
		c.beginPath();
		c.arc(x + Math.cos(ang) * d, y + Math.sin(ang) * d + S * 0.3 * k * k, S * 0.035 * (1 - k * 0.5), 0, TAU);
		c.fill();
	}
}

/** The refused press: a dull grey puff at the hero's front and a short shake mark. */
export function refused(c: Ctx, x: number, y: number, S: number, dir: Dir): void {
	const [dx, dy] = VEC[dir];
	const mx = x + dx * S * 0.5;
	const my = y + dy * S * 0.5;
	for (let k = 0; k < 4; k += 1) {
		c.fillStyle = `rgba(130,118,112,${0.55 - k * 0.1})`;
		c.beginPath();
		c.arc(mx + dx * S * 0.06 * k + (k - 1.5) * S * 0.05 * dy, my + dy * S * 0.06 * k + (k - 1.5) * S * 0.05 * dx, S * (0.07 + k * 0.02), 0, TAU);
		c.fill();
	}
	c.save();
	c.strokeStyle = 'rgba(220,200,190,.7)';
	c.lineWidth = Math.max(1, S * 0.025);
	for (const s of [-1, 1]) {
		c.beginPath();
		c.moveTo(x + s * S * 0.55, y - S * 0.12);
		c.lineTo(x + s * S * 0.62, y);
		c.lineTo(x + s * S * 0.55, y + S * 0.12);
		c.stroke();
	}
	c.restore();
}

/**
 * The medkit in the «Плоть» style, kept light against the dark floor: a casket of white bone with
 * a bright blood-red cross, bone clasps and a stitched strap.
 */
export function paintMedkit(c: Ctx): void {
	const S = 60;
	part(c, () => { c.beginPath(); c.roundRect(-14, -36, 28, 12, 5); c.roundRect(-8, -32, 16, 6, 2); }, linear(c, 0, -36, 0, -24, [BONE.mid, BONE.shade]), S, 0.8);
	cel(c, () => { c.beginPath(); c.roundRect(-38, -26, 76, 58, 10); }, { light: '#fffaf0', mid: '#ecdcc0', shade: '#a8906a' }, -2, 0, 40, S, 1.2);
	// the lid's seam with its stitches
	c.strokeStyle = 'rgba(80,50,30,.7)';
	c.lineWidth = 2;
	c.beginPath();
	c.moveTo(-36, -12);
	c.lineTo(36, -12);
	c.stroke();
	for (let k = -3; k <= 3; k += 1) {
		c.beginPath();
		c.moveTo(k * 10 - 2, -15);
		c.lineTo(k * 10 + 2, -9);
		c.stroke();
	}
	// the cross
	part(c, () => { c.beginPath(); c.roundRect(-7, -6, 14, 34, 3); c.roundRect(-18, 4, 36, 13, 3); }, linear(c, 0, -6, 0, 28, ['#ff5a40', '#e8281e', '#9a0c10']), S, 0.9);
	gloss(c, -2, -2, 3, 6, 0.6, 0);
	gloss(c, -24, -20, 10, 3, 0.8, -0.1);
}

// ── the dial ─────────────────────────────────────────────────────────────────────────────────────

export type Seg = 'charged' | 'chargeable' | 'burnt';

/**
 * The HUD's dial ring, the way the candidate draws it: per segment charged (bright), chargeable (dim)
 * or burnt (charred, cracked: used for good). `fill` (0..1) is the charge of a whole meter (the guns).
 */
export function dial(c: Ctx, x: number, y: number, r: number, segs: readonly Seg[], fill: number[], full: boolean, gapless = false): void {
	c.fillStyle = radial(c, x, y, 0, r, ['#3a0c10', '#1a0406']);
	c.beginPath();
	c.arc(x, y, r, 0, TAU);
	c.fill();
	c.strokeStyle = '#d9b88a';
	c.lineWidth = 2;
	c.stroke();
	const n = segs.length;
	const gap = n > 1 && !gapless ? 0.12 : 0;
	const R = r - 6;
	for (let i = 0; i < n; i += 1) {
		const a0 = -Math.PI / 2 + (i * TAU) / n + gap / 2;
		const a1 = -Math.PI / 2 + ((i + 1) * TAU) / n - gap / 2;
		const s = segs[i];
		c.lineCap = 'butt';
		if (s === 'burnt') {
			c.strokeStyle = '#4a3632';
			c.lineWidth = 7;
			c.beginPath();
			c.arc(x, y, R, a0, a1);
			c.stroke();
			// cracks and a few dying embers
			c.strokeStyle = '#160606';
			c.lineWidth = 1.6;
			for (let k = 1; k < 4; k += 1) {
				const a = a0 + ((a1 - a0) * k) / 4;
				c.beginPath();
				c.moveTo(x + Math.cos(a) * (R - 3), y + Math.sin(a) * (R - 3));
				c.lineTo(x + Math.cos(a + 0.05) * (R + 3), y + Math.sin(a + 0.05) * (R + 3));
				c.stroke();
			}
			c.fillStyle = 'rgba(255,120,40,.8)';
			c.beginPath();
			c.arc(x + Math.cos((a0 + a1) / 2) * R, y + Math.sin((a0 + a1) / 2) * R, 1.2, 0, TAU);
			c.fill();
			continue;
		}
		c.strokeStyle = 'rgba(125,255,90,.2)';
		c.lineWidth = 6;
		c.beginPath();
		c.arc(x, y, R, a0, a1);
		c.stroke();
		const part1 = s === 'charged' ? 1 : fill[i] ?? 0;
		if (part1 > 0) {
			c.strokeStyle = full ? '#7dff5a' : '#4f9a3c';
			c.beginPath();
			c.arc(x, y, R, a0, a0 + (a1 - a0) * part1);
			c.stroke();
		}
	}
	if (full) bloom(c, x, y, r * 1.2, '125,255,90', 0.18);
}

/** A piece of food the hero cannot eat now (the meter full, or the hand empty): faded and still. */
export function foodWaiting(c: Ctx, x: number, y: number, S: number): void {
	c.save();
	c.globalAlpha *= 0.45;
	c.filter = 'grayscale(.8)';
	drawFleshFood(c, x, y, S);
	c.restore();
}

export { drawFleshFood, drawRushWhirl, drawStingBolt, paintSting, icon };
