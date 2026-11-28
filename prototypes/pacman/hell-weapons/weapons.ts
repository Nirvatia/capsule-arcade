// The weapons' art pass (ROADMAP Part II.1, the hell): candidates drawn in the «Плоть» language
// (`hell-kit/paint.ts`) as frame series, beside what the game draws now. Static frames, nothing plays.
// (x, y) is a centre in px, S the tile in px; icons are painted in a -50..50 box.
import { drawFleshFood, drawStingBolt } from '../../../src/games/pacman/render/doom/fleshKit';
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

/**
 * Candidate F, the drum gun: a chunky pistol whose middle is a big glass drum of glowing venom (the
 * read at any size), a bone stock, a thick short barrel with a bone sting for a muzzle.
 */
export function paintStingDrum(c: Ctx): void {
	const S = 60;
	cel(c, () => { c.beginPath(); c.moveTo(-48, -8); c.lineTo(-26, -14); c.lineTo(-26, 8); c.lineTo(-46, 16); c.closePath(); }, BONE, -38, 0, 14, S, 1);
	part(c, () => { c.beginPath(); c.moveTo(-18, 6); c.lineTo(-4, 6); c.lineTo(-10, 36); c.lineTo(-26, 36); c.closePath(); }, linear(c, 0, 6, 0, 36, [IRON.mid, IRON.shade]), S, 1.1);
	part(c, () => { c.beginPath(); c.roundRect(-30, -16, 44, 24, 6); }, linear(c, 0, -16, 0, 8, [IRON.light, IRON.mid, IRON.shade]), S, 1.1);
	// the thick barrel and the sting
	part(c, () => { c.beginPath(); c.roundRect(10, -11, 26, 16, 4); }, linear(c, 0, -11, 0, 5, [IRON.light, IRON.mid, IRON.shade]), S, 1.1);
	cel(c, () => { c.beginPath(); c.moveTo(34, -14); c.lineTo(50, -3); c.lineTo(34, 8); c.closePath(); }, BONE, 40, -3, 9, S, 0.9);
	bloom(c, 49, -3, 12, VENOM.glow, 0.9);
	// the drum
	bloom(c, -6, -4, 40, VENOM.glow, 0.6);
	part(c, () => { c.beginPath(); c.arc(-6, -4, 19, 0, TAU); }, radial(c, -12, -10, 2, 20, [VENOM.light, VENOM.mid, VENOM.shade]), S, 1.3);
	c.strokeStyle = 'rgba(10,40,60,.7)';
	c.lineWidth = 2.5;
	for (let k = 0; k < 3; k += 1) {
		const a = (k * TAU) / 3 + 0.3;
		c.beginPath();
		c.moveTo(-6 + Math.cos(a) * 7, -4 + Math.sin(a) * 7);
		c.lineTo(-6 + Math.cos(a) * 17, -4 + Math.sin(a) * 17);
		c.stroke();
	}
	gloss(c, -13, -12, 6, 3, 0.9, -0.5);
}

/**
 * Candidate G, the tank rifle: a thick rifle with a big glass tank of venom on its back, three lit
 * coils round the barrel and a bone sting at the muzzle; longer than the Maw, cyan where it is orange.
 */
export function paintStingTank(c: Ctx): void {
	const S = 60;
	cel(c, () => { c.beginPath(); c.moveTo(-50, -2); c.lineTo(-32, -10); c.lineTo(-32, 10); c.lineTo(-48, 16); c.closePath(); }, BONE, -40, 4, 13, S, 1);
	part(c, () => { c.beginPath(); c.moveTo(-20, 8); c.lineTo(-8, 8); c.lineTo(-13, 34); c.lineTo(-26, 34); c.closePath(); }, linear(c, 0, 8, 0, 34, [IRON.mid, IRON.shade]), S, 1.1);
	part(c, () => { c.beginPath(); c.roundRect(-34, -8, 44, 20, 6); }, linear(c, 0, -8, 0, 12, [IRON.light, IRON.mid, IRON.shade]), S, 1.1);
	// the tank on its back
	bloom(c, -12, -18, 38, VENOM.glow, 0.6);
	part(c, () => { c.beginPath(); c.roundRect(-34, -30, 42, 18, 9); }, linear(c, 0, -30, 0, -12, [VENOM.light, VENOM.mid, VENOM.shade]), S, 1.3);
	gloss(c, -22, -25, 10, 2.6, 0.9, 0);
	// the barrel, its coils, the sting
	part(c, () => { c.beginPath(); c.rect(8, -5, 30, 12); }, linear(c, 0, -5, 0, 7, [IRON.light, IRON.mid, IRON.shade]), S, 1.1);
	bloom(c, 22, 1, 20, VENOM.glow, 0.45);
	for (const cx of [13, 22, 31]) {
		part(c, () => { c.beginPath(); c.roundRect(cx, -9, 5, 20, 2); }, '#7fe6ff', S, 0.8);
	}
	cel(c, () => { c.beginPath(); c.moveTo(36, -10); c.lineTo(50, 1); c.lineTo(36, 12); c.closePath(); }, BONE, 41, 1, 8, S, 0.9);
	bloom(c, 49, 1, 12, VENOM.glow, 0.9);
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
 * The rush, the fang saw (the owner's pick): a disc of dark flesh ringed with ten bone fangs, spinning fast.
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

/**
 * The orb on a boss who is not stunned: a real orange burst, half the full hit's size, sparks thrown
 * aside off his hide, a dark scorch; no white-hot core and no flesh flying (that is the full hit's).
 */
export function mawGlance(c: Ctx, x: number, y: number, S: number, f: number): void {
	const a = 1 - f;
	bloom(c, x, y, S * 1.0, '255,140,50', 0.55 * a);
	c.fillStyle = radial(c, x, y, 0, S * (0.3 + 0.25 * f), [`rgba(255,200,110,${a})`, `rgba(240,110,30,${0.8 * a})`, 'rgba(160,30,10,0)']);
	c.beginPath();
	c.arc(x, y, S * (0.3 + 0.25 * f), 0, TAU);
	c.fill();
	c.save();
	c.strokeStyle = `rgba(255,170,90,${0.8 * a})`;
	c.lineWidth = S * 0.035 * a + 1;
	c.beginPath();
	c.arc(x, y, S * (0.25 + 0.5 * f), 0, TAU);
	c.stroke();
	c.restore();
	for (let k = 0; k < 10; k += 1) {
		const side = k % 2 ? 1 : -1;
		const ang = Math.PI + side * (0.7 + (k >> 1) * 0.16);
		const d = S * (0.25 + 0.6 * f);
		c.strokeStyle = `rgba(255,${180 + k * 6},100,${a})`;
		c.lineWidth = Math.max(1.2, S * 0.035);
		c.beginPath();
		c.moveTo(x + Math.cos(ang) * d * 0.55, y + Math.sin(ang) * d * 0.55);
		c.lineTo(x + Math.cos(ang) * d, y + Math.sin(ang) * d);
		c.stroke();
	}
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

/**
 * The weapon in hand spent, bold enough for the game's scale: its icon pops up over the hero at full
 * tile size with a flash, cracks white, and bursts into grey shards flung out, `f` 0..1.
 */
export function spent(c: Ctx, x: number, y: number, S: number, f: number, paint: (c: Ctx) => void): void {
	const size = S * 1.1;
	const cy = y - S * 0.85;
	if (f < 0.4) {
		const k = f / 0.4;
		bloom(c, x, cy, S * 0.9, '255,240,220', 0.5 * (1 - k));
		c.save();
		c.filter = `grayscale(${k}) brightness(${1 + 0.5 * (1 - k)})`;
		icon(c, x, cy - k * S * 0.12, size * (0.8 + 0.2 * Math.min(1, k * 3)), paint);
		c.restore();
		c.save();
		c.strokeStyle = `rgba(255,255,255,${Math.min(1, k * 2)})`;
		c.lineWidth = Math.max(1.5, S * 0.05);
		c.lineJoin = 'round';
		c.beginPath();
		c.moveTo(x - size * 0.3, cy - size * 0.35);
		c.lineTo(x - size * 0.02, cy - size * 0.02);
		c.lineTo(x - size * 0.12, cy + size * 0.06);
		c.lineTo(x + size * 0.25, cy + size * 0.35);
		c.stroke();
		c.restore();
		return;
	}
	const k = (f - 0.4) / 0.6;
	bloom(c, x, cy, S * 0.7, '200,190,180', 0.4 * (1 - k));
	for (let i = 0; i < 10; i += 1) {
		const ang = (i * TAU) / 10 + 0.2;
		const d = S * (0.1 + 0.75 * k);
		c.save();
		c.translate(x + Math.cos(ang) * d, cy + Math.sin(ang) * d + S * 0.5 * k * k);
		c.rotate(ang + k * 6);
		c.fillStyle = `rgba(${150 + (i % 3) * 25},${140 + (i % 3) * 20},132,${1 - k})`;
		c.beginPath();
		c.moveTo(-S * 0.09, -S * 0.05);
		c.lineTo(S * 0.1, -S * 0.02);
		c.lineTo(-S * 0.02, S * 0.08);
		c.closePath();
		c.fill();
		ink(c, S, 0.4);
		c.restore();
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

/**
 * The refused press, readable at game scale: the hero jolts back and a dull grey burst with a broken
 * ring shows at his front (the dial flashes red in the HUD at the same time).
 */
export function refused(c: Ctx, x: number, y: number, S: number, dir: Dir, f: number): void {
	const [dx, dy] = VEC[dir];
	const mx = x + dx * S * 0.6;
	const my = y + dy * S * 0.6;
	const a = 1 - f;
	c.fillStyle = `rgba(150,140,134,${0.7 * a})`;
	for (let k = 0; k < 5; k += 1) {
		const ang = (k * TAU) / 5;
		c.beginPath();
		c.arc(mx + Math.cos(ang) * S * 0.14 * (0.6 + f), my + Math.sin(ang) * S * 0.14 * (0.6 + f), S * 0.11, 0, TAU);
		c.fill();
	}
	c.save();
	c.strokeStyle = `rgba(255,90,70,${a})`;
	c.lineWidth = Math.max(1.5, S * 0.06);
	c.lineCap = 'round';
	const r = S * (0.28 + 0.15 * f);
	for (let k = 0; k < 4; k += 1) {
		const a0 = (k * TAU) / 4 + 0.3;
		c.beginPath();
		c.arc(mx, my, r, a0, a0 + 0.9);
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

export { drawFleshFood, drawStingBolt, icon };
