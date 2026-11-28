// The hell's actors drawn anew (the owner's pick of the `hell-actors` prototype, 2026-11-28): the boss, the imps and the split's flayed
// ghosts, every state and its motion, inside a tile. Character comes from motion and the face (squash
// and stretch, lean, bob, eyes, brows, mouth) and from reactions, not from more detail.
// One language with «Плоть»: an ink outline, cel bands lit from the top left, a rim light.
// (x, y) is the tile's centre in px, S the tile in px, t the time in s.
import { TAU, VEC, bloom, cel, gloss, ink, shadow } from './fleshPaint';
import type { Ctx, Dir, Tones } from './fleshPaint';

const BONE: Tones = { light: '#fff4dc', mid: '#e2cba2', shade: '#8a6c48' };
const INK = '#14080a';

/** A point to look at, relative to the actor's centre, in tiles. */
export interface Look {
	readonly x: number;
	readonly y: number;
}

// ── the face ─────────────────────────────────────────────────────────────────────────────────────

export type Mood =
	'hunt' | 'wind' | 'roar' | 'gloat' | 'hurt' | 'dazed' | 'tired' | 'scared' | 'sly' | 'dopey';

interface EyeSpec {
	readonly x: number;
	readonly y: number;
	readonly rx: number;
	readonly ry: number;
}

/** One eye: its white, the lid that mood lowers, the pupil toward `look`, the brow over it. */
function eye(
	c: Ctx,
	e: EyeSpec,
	S: number,
	side: -1 | 1,
	mood: Mood,
	look: Look,
	t: number,
	pupil = 0.45,
	glowEyes = false
): void {
	const { x, y, rx, ry } = e;
	if (mood === 'hurt') {
		// squeezed shut: a chevron
		c.strokeStyle = INK;
		c.lineWidth = Math.max(1.4, S * 0.05);
		c.lineCap = 'round';
		c.lineJoin = 'round';
		c.beginPath();
		c.moveTo(x - rx * side, y - ry * 0.6);
		c.lineTo(x + rx * 0.6 * side, y);
		c.lineTo(x - rx * side, y + ry * 0.6);
		c.stroke();
		return;
	}
	c.save();
	c.beginPath();
	c.ellipse(x, y, rx, ry, 0, 0, TAU);
	c.fillStyle = mood === 'roar' || glowEyes ? '#ffe08a' : '#ffffff';
	c.fill();
	c.clip();
	if (mood === 'dazed') {
		// a spiral
		c.strokeStyle = INK;
		c.lineWidth = Math.max(1, S * 0.025);
		c.beginPath();
		for (let k = 0; k <= 24; k += 1) {
			const a = k * 0.55 + t * 6 * side;
			const r = (k / 24) * rx * 0.85;
			c[k === 0 ? 'moveTo' : 'lineTo'](x + Math.cos(a) * r, y + Math.sin(a) * r);
		}
		c.stroke();
	} else {
		const pr = rx * (mood === 'scared' ? 0.28 : pupil) * (mood === 'roar' ? 0.75 : 1);
		const len = Math.hypot(look.x, look.y) || 1;
		let px = x + (look.x / len) * (rx - pr) * 0.85;
		let py = y + (look.y / len) * (ry - pr) * 0.85;
		if (mood === 'dopey') {
			// cross-eyed: each pupil toward the nose
			px = x - side * rx * 0.4;
			py = y + ry * 0.2;
		}
		c.fillStyle = mood === 'roar' ? '#c01010' : '#16090c';
		c.beginPath();
		c.arc(px, py, pr, 0, TAU);
		c.fill();
		c.fillStyle = 'rgba(255,255,255,.9)';
		c.beginPath();
		c.arc(px - pr * 0.35, py - pr * 0.35, pr * 0.3, 0, TAU);
		c.fill();
	}
	// the lid: how much of the eye mood hides from the top
	const lid =
		{
			hunt: 0.25,
			wind: 0.45,
			roar: 0,
			gloat: 0.5,
			dazed: 0.1,
			tired: 0.55,
			scared: 0,
			sly: 0.55,
			dopey: 0.45
		}[mood] ?? 0;
	if (lid > 0) {
		c.fillStyle = 'rgba(40,8,12,.92)';
		c.beginPath();
		const tilt =
			mood === 'sly' ? -0.25 * side : mood === 'hunt' || mood === 'wind' ? 0.35 * side : 0;
		c.moveTo(x - rx * 1.2, y - ry * 1.2);
		c.lineTo(x + rx * 1.2, y - ry * 1.2);
		c.lineTo(x + rx * 1.2, y - ry + ry * 2 * lid + tilt * ry * side);
		c.lineTo(x - rx * 1.2, y - ry + ry * 2 * lid - tilt * ry * side);
		c.closePath();
		c.fill();
	}
	c.restore();
	c.beginPath();
	c.ellipse(x, y, rx, ry, 0, 0, TAU);
	ink(c, S, 0.55);
}

/** A brow over each eye: its angle is the mood (anger: inner end down; worry: inner end up). */
function brows(c: Ctx, eyes: readonly EyeSpec[], S: number, mood: Mood, w: number): void {
	const angle =
		{
			hunt: 0.35,
			wind: 0.6,
			roar: 0.75,
			gloat: 0.25,
			hurt: 0.5,
			dazed: -0.45,
			tired: -0.2,
			scared: -0.55,
			sly: 0.1,
			dopey: -0.15
		}[mood] ?? 0;
	const lift = { roar: -0.04, scared: -0.05, dazed: -0.02 }[mood as 'roar'] ?? 0;
	eyes.forEach((e, i) => {
		const side = i === 0 ? -1 : 1;
		c.save();
		c.translate(e.x, e.y - e.ry - S * (0.03 - lift));
		c.rotate(angle * -side);
		c.beginPath();
		c.moveTo(-e.rx * 1.1, -S * w * 0.5);
		c.quadraticCurveTo(0, -S * w * 1.3, e.rx * 1.1, -S * w * 0.5);
		c.lineTo(e.rx * 1.1, S * w * 0.5);
		c.quadraticCurveTo(0, -S * w * 0.2, -e.rx * 1.1, S * w * 0.5);
		c.closePath();
		c.fillStyle = INK;
		c.fill();
		c.restore();
	});
}

/** The mouth: shut, a grin, a roar or a wail; `teeth` for the demon kind. */
function mouth(
	c: Ctx,
	x: number,
	y: number,
	w: number,
	S: number,
	mood: Mood,
	open: number,
	teeth: boolean
): void {
	c.lineCap = 'round';
	c.lineJoin = 'round';
	if (mood === 'scared') {
		// the classic frightened wiggle
		c.strokeStyle = '#ffe8e0';
		c.lineWidth = Math.max(1.2, S * 0.035);
		c.beginPath();
		for (let k = 0; k <= 6; k += 1) {
			const px = x - w + (k / 6) * w * 2;
			const py = y + (k % 2 ? -1 : 1) * S * 0.025;
			c[k === 0 ? 'moveTo' : 'lineTo'](px, py);
		}
		c.stroke();
		return;
	}
	const h = S * 0.16 * open;
	if (h < S * 0.02) {
		c.strokeStyle = INK;
		c.lineWidth = Math.max(1.2, S * 0.035);
		c.beginPath();
		const curl =
			mood === 'gloat' || mood === 'sly'
				? -S * 0.04
				: mood === 'tired' || mood === 'dazed' || mood === 'dopey'
					? S * 0.02
					: S * 0.015;
		c.moveTo(x - w, y + (mood === 'sly' ? 0 : curl * 0.2));
		c.quadraticCurveTo(x, y - curl, x + w, y + (mood === 'sly' ? curl : curl * 0.2));
		c.stroke();
		return;
	}
	// an open mouth: dark, a red tongue, a row of teeth top and bottom
	c.beginPath();
	if (mood === 'gloat') {
		c.moveTo(x - w, y - h * 0.2);
		c.quadraticCurveTo(x, y + h * 1.2, x + w, y - h * 0.2);
		c.quadraticCurveTo(x, y + h * 0.2, x - w, y - h * 0.2);
	} else {
		c.ellipse(x, y + h * 0.3, w, h * 0.65, 0, 0, TAU);
	}
	c.fillStyle = '#2a0408';
	c.fill();
	c.save();
	c.clip();
	c.fillStyle = '#c0303a';
	c.beginPath();
	c.ellipse(x, y + h, w * 0.6, h * 0.4, 0, 0, TAU);
	c.fill();
	if (teeth) {
		c.fillStyle = '#fff4e4';
		const n = 5;
		for (let k = 0; k < n; k += 1) {
			const tx = x - w + ((k + 0.5) / n) * w * 2;
			c.beginPath();
			c.moveTo(tx - w / n, y - h * 0.5);
			c.lineTo(tx, y - h * 0.5 + h * 0.45);
			c.lineTo(tx + w / n, y - h * 0.5);
			c.fill();
		}
	}
	c.restore();
	ink(c, S, 0.55);
}

/** Squash and stretch about the feet, along the heading or upright. */
function squash(c: Ctx, x: number, footY: number, sx: number, sy: number): void {
	c.translate(x, footY);
	c.scale(sx, sy);
	c.translate(-x, -footY);
}

// ── the boss ─────────────────────────────────────────────────────────────────────────────────────

export type BossMode =
	| 'chase'
	| 'windup'
	| 'dash'
	| 'charge'
	| 'cast'
	| 'recover'
	| 'hit'
	| 'stunned'
	| 'gloat'
	| 'omen';

export interface BossState {
	readonly dir: Dir;
	readonly phase: 1 | 2 | 3;
	readonly mode: BossMode;
	/** 0..1 through the mode (the wind-up's crouch, the charge's swell). */
	readonly k: number;
	/** Where the hero is, relative to him, in tiles (his eyes follow it always). */
	readonly look: Look;
}

const BOSS_SKIN: Record<1 | 2 | 3, Tones> = {
	1: { light: '#ff7a5a', mid: '#d8241e', shade: '#6a0810' },
	2: { light: '#ec5a40', mid: '#ae161a', shade: '#4a040c' },
	// charred but not black, so the outline still parts him from the floor
	3: { light: '#c8402e', mid: '#7c1418', shade: '#2c0408' }
};
const HORN_TIP: Tones = { light: '#6a5a50', mid: '#2a2020', shade: '#0a0606' };

/** The boss's body: a dome, its sides, a ragged skirt of five points waving back against his way. */
function bossBody(c: Ctx, S: number, t: number, drag: number, wave: number): void {
	const top = -S * 0.36;
	const r = S * 0.34;
	const foot = S * 0.36;
	c.beginPath();
	c.moveTo(-r, -S * 0.02);
	c.arc(0, -S * 0.02, r, Math.PI, 0);
	c.lineTo(r, foot - S * 0.08);
	const N = 5;
	for (let i = N; i >= 0; i -= 1) {
		const u = i / N;
		const px = -r + u * r * 2;
		const tip = i % 2 === 0;
		const sway = Math.sin(t * wave + u * 5) * S * 0.035 + drag * S * 0.08 * (tip ? 1 : 0.5);
		c.lineTo(px + sway * 0.4, (tip ? foot + S * 0.06 : foot - S * 0.04) + (tip ? sway * 0.6 : 0));
	}
	c.closePath();
	void top;
}

/**
 * A horn of bone from the side of his head, curling up and out; `len` grows with the phase, from
 * phase 2 ringed with ridges and dark at the tip, in phase 3 its tip glowing like an ember.
 */
function bossHorn(
	c: Ctx,
	side: -1 | 1,
	S: number,
	len: number,
	phase: number,
	t: number,
	hurt: number
): void {
	c.save();
	c.translate(side * S * 0.2, -S * 0.2);
	c.rotate(side * (0.12 * hurt) + Math.sin(t * 2) * 0.03);
	// a bull's horn: out to the side first, then curling up to its point
	const w = S * (0.085 + 0.02 * phase);
	const tipX = side * len * 0.95;
	const tipY = -len * 0.75;
	const path = (): void => {
		c.beginPath();
		// the lower, outer edge bows out; the upper, inner one curls up harder: a thick crescent
		c.moveTo(0, w);
		c.quadraticCurveTo(side * len * 0.85, w * 0.6, tipX, tipY);
		c.quadraticCurveTo(side * len * 0.4, -len * 0.38, 0, -w);
		c.closePath();
	};
	cel(c, path, BONE, side * len * 0.4, -len * 0.3, len * 0.5, S, 0.9);
	if (phase >= 2) {
		c.save();
		path();
		c.clip();
		// the ridges
		c.strokeStyle = 'rgba(90,60,40,.75)';
		c.lineWidth = Math.max(1, S * 0.022);
		for (let k = 1; k <= 3; k += 1) {
			const u = k / 4.2;
			const rx = side * len * 0.75 * u;
			const ry = -len * 0.2 * u * u * 3;
			c.beginPath();
			c.moveTo(rx - side * w * 0.3, ry - w);
			c.lineTo(rx + side * w * 0.3, ry + w);
			c.stroke();
		}
		// the dark tip, glowing in phase 3
		c.fillStyle = phase === 3 ? `rgba(255,${110 + 40 * Math.sin(t * 4)},40,.95)` : HORN_TIP.mid;
		c.beginPath();
		c.arc(tipX, tipY, len * 0.22, 0, TAU);
		c.fill();
		c.restore();
		path();
		ink(c, S, 0.8);
	}
	c.restore();
}

/**
 * The lit mask the face sits on (the owner's pick, 2026-11-28: the face reads in every phase): a
 * paler muzzle in phase 1, a warm glow in 2, in 3 his inner fire lighting the face from below.
 */
function faceMask(c: Ctx, S: number, fx: number, fy: number, phase: number, t: number): void {
	c.save();
	bossBody(c, S, t, 0, 7);
	c.clip();
	const r = S * 0.3;
	const g = c.createRadialGradient(fx, fy + S * 0.06, 0, fx, fy + S * 0.02, r);
	if (phase === 1) {
		g.addColorStop(0, 'rgba(255,170,140,.42)');
		g.addColorStop(1, 'rgba(255,170,140,0)');
	} else if (phase === 2) {
		g.addColorStop(0, 'rgba(255,150,90,.42)');
		g.addColorStop(1, 'rgba(255,150,90,0)');
	} else {
		const beat = 0.85 + 0.15 * Math.sin(t * 3);
		g.addColorStop(0, `rgba(255,190,90,${0.85 * beat})`);
		g.addColorStop(0.55, `rgba(240,90,40,${0.55 * beat})`);
		g.addColorStop(1, 'rgba(200,40,20,0)');
	}
	c.fillStyle = g;
	c.beginPath();
	c.ellipse(fx, fy + S * 0.02, r, r * 0.8, 0, 0, TAU);
	c.fill();
	c.restore();
}

/** Phase 2 on: glowing cracks down his sides and over the skirt, never across the face. */
function bossCracks(c: Ctx, S: number, t: number, phase: number, glow: number): void {
	const lava = phase === 3;
	c.strokeStyle = lava
		? `rgba(255,${160 + 50 * Math.sin(t * 3)},70,${Math.min(1, glow + 0.3)})`
		: `rgba(255,170,70,${glow})`;
	c.lineWidth = Math.max(1, S * (lava ? 0.032 : 0.024));
	c.lineCap = 'round';
	c.lineJoin = 'round';
	c.beginPath();
	for (const side of [-1, 1]) {
		c.moveTo(side * S * 0.33, S * 0.04);
		c.lineTo(side * S * 0.27, S * 0.14);
		c.lineTo(side * S * 0.31, S * 0.26);
		if (lava) {
			c.moveTo(side * S * 0.34, -S * 0.18);
			c.lineTo(side * S * 0.3, -S * 0.08);
			c.moveTo(side * S * 0.14, S * 0.32);
			c.lineTo(side * S * 0.19, S * 0.38);
		}
	}
	c.stroke();
}

/** Phase 3's brows: ridges of bone low over the eyes, a short spike at the outer end. */
function boneBrows(c: Ctx, eyes: readonly EyeSpec[], S: number, mood: Mood): void {
	const angles: Partial<Record<Mood, number>> = {
		hunt: 0.35,
		wind: 0.6,
		roar: 0.75,
		gloat: 0.25,
		hurt: 0.5,
		dazed: -0.45,
		tired: -0.2
	};
	const angle = angles[mood] ?? 0.3;
	eyes.forEach((e, i) => {
		const side = i === 0 ? -1 : 1;
		c.save();
		c.translate(e.x, e.y - e.ry * 0.82);
		c.rotate(angle * -side);
		const w = S * 0.085;
		const path = (): void => {
			c.beginPath();
			c.moveTo(-side * e.rx * 1.1, w * 0.4);
			c.quadraticCurveTo(0, -w * 1.1, side * e.rx * 1.05, -w * 0.5);
			c.lineTo(side * e.rx * 1.55, -w * 1.9);
			c.lineTo(side * e.rx * 1.2, w * 0.45);
			c.quadraticCurveTo(0, -w * 0.1, -side * e.rx * 1.1, w * 0.4);
			c.closePath();
		};
		cel(c, path, BONE, 0, -w * 0.3, e.rx, S, 0.55);
		c.restore();
	});
}

/** Two tusks at the mouth's corners (phase 2 on), bone, curving up and out. */
function cornerTusks(c: Ctx, x: number, y: number, w: number, S: number, phase: number): void {
	const h = S * (phase === 3 ? 0.1 : 0.075);
	for (const side of [-1, 1] as const) {
		const bx = x + side * (w + S * 0.01);
		cel(
			c,
			() => {
				c.beginPath();
				c.moveTo(bx - side * S * 0.03, y + S * 0.03);
				c.quadraticCurveTo(bx + side * S * 0.04, y - h * 0.3, bx + side * S * 0.05, y - h);
				c.lineTo(bx + side * S * 0.025, y + S * 0.035);
				c.closePath();
			},
			BONE,
			bx,
			y - h * 0.4,
			S * 0.04,
			S,
			0.5
		);
	}
}

/**
 * The boss, Blinky lord of hell, in any state. He breathes, leans into his way, his eyes never leave
 * the hero, his brows and mouth carry his mood; the wind-up crouches him before a dash, the charge
 * swells him before a cast; a hit squeezes him, the stun slumps him.
 */
export function drawBoss(c: Ctx, x: number, y: number, S: number, t: number, st: BossState): void {
	const [dx, dy] = VEC[st.dir];
	const m = st.mode;
	const k = st.k;
	const breath = Math.sin(t * 2.5) * 0.025;
	let sx = 1 - breath;
	let sy = 1 + breath;
	let ox = 0;
	let oy = Math.sin(t * 5) * S * 0.015;
	let lean = dx * 0.08;
	let drag = dx === 0 ? 0 : -dx * 0.4;
	let mood: Mood = 'hunt';
	let open = 0;
	let wave = 7;
	if (m === 'windup') {
		// he crouches, low and wide, his eyes narrowing on the hero
		sx = 1 + 0.18 * k;
		sy = 1 - 0.2 * k;
		ox = -dx * S * 0.06 * k;
		oy = -dy * S * 0.06 * k;
		mood = 'wind';
		open = 0.35 * k;
		lean = -dx * 0.12 * k;
	} else if (m === 'dash') {
		// stretched along his way, the skirt streaming back
		const along = dx !== 0;
		sx = along ? 1.3 : 0.8;
		sy = along ? 0.8 : 1.3;
		mood = 'roar';
		open = 0.8;
		drag = -dx * 1.2;
		wave = 18;
		lean = dx * 0.15;
	} else if (m === 'charge') {
		// he swells, his eyes burning
		sx = sy = 1 + 0.12 * k;
		mood = 'wind';
		open = 0.25 + 0.3 * k;
	} else if (m === 'cast') {
		sx = sy = 1.12 - 0.12 * k;
		mood = 'roar';
		open = 1 - 0.4 * k;
		ox = Math.sin(t * 60) * S * 0.01;
	} else if (m === 'recover') {
		sy = 0.95 + Math.sin(t * 7) * 0.025;
		sx = 1.04;
		mood = 'tired';
		open = 0.3 + 0.15 * Math.sin(t * 7);
	} else if (m === 'hit') {
		const p = Math.sin(Math.min(1, k * 2) * Math.PI);
		sx = 1 + 0.12 * p;
		sy = 1 - 0.14 * p;
		ox = -dx * S * 0.08 * p;
		mood = 'hurt';
		open = 0.5 * p;
	} else if (m === 'stunned') {
		sy = 0.9;
		sx = 1.08;
		oy = S * 0.04;
		lean = Math.sin(t * 2) * 0.08;
		mood = 'dazed';
		open = 0.25;
	} else if (m === 'gloat') {
		sy = 1 + 0.04 * Math.abs(Math.sin(t * 9));
		mood = 'gloat';
		open = 0.55;
	} else if (m === 'omen') {
		ox = Math.sin(t * 70) * S * 0.035 * (0.4 + 0.6 * k);
		sx = sy = 1 + 0.06 * k;
		mood = 'roar';
		open = 0.6;
	}
	const skin = BOSS_SKIN[st.phase];
	const foot = y + S * 0.4;
	shadow(c, x, y + S * 0.3, S * 0.36 * sx, S * 0.1, 0.5);
	if (m === 'charge' || m === 'cast' || m === 'omen')
		bloom(c, x, y, S * 0.9, '255,90,40', 0.25 + 0.35 * k);
	c.save();
	c.translate(ox, oy);
	squash(c, x, foot, sx, sy);
	c.translate(x, y);
	c.rotate(lean);
	// the horns behind the dome: bigger every phase
	const hornLen = S * (st.phase === 1 ? 0.26 : st.phase === 2 ? 0.31 : 0.36);
	bossHorn(c, -1, S, hornLen, st.phase, t, m === 'hit' ? 1 : 0);
	bossHorn(c, 1, S, hornLen, st.phase, t, m === 'hit' ? 1 : 0);
	cel(c, () => bossBody(c, S, t, drag, wave), skin, 0, 0, S * 0.36, S, 1.15);
	const fx = dx * S * 0.04;
	const fy = dy * S * 0.03;
	faceMask(c, S, fx, fy - S * 0.02, st.phase, t);
	if (st.phase >= 2) {
		c.save();
		bossBody(c, S, t, drag, wave);
		c.clip();
		bossCracks(c, S, t, st.phase, 0.55 + 0.25 * Math.sin(t * 2.5) + (m === 'omen' ? 0.4 * k : 0));
		c.restore();
	}
	// the face: big eyes looking at the hero, brows, the mouth
	const eyes: EyeSpec[] = [
		{ x: -S * 0.13 + fx, y: -S * 0.08 + fy, rx: S * 0.1, ry: S * 0.115 },
		{ x: S * 0.13 + fx, y: -S * 0.08 + fy, rx: S * 0.1, ry: S * 0.115 }
	];
	if (st.phase === 3 && mood !== 'hurt') {
		// dark sockets round the blazing eyes: the shape reads at any size
		for (const e of eyes) {
			c.fillStyle = '#1c0306';
			c.beginPath();
			c.ellipse(e.x, e.y + S * 0.005, e.rx * 1.28, e.ry * 1.22, 0, 0, TAU);
			c.fill();
		}
	}
	eyes.forEach((e, i) => eye(c, e, S, i === 0 ? -1 : 1, mood, st.look, t, 0.45, st.phase === 3));
	if (st.phase === 3) boneBrows(c, eyes, S, mood);
	else brows(c, eyes, S, mood, st.phase === 2 ? 0.06 : 0.05);
	const mx = fx;
	const my = S * 0.14 + dy * S * 0.02;
	const mw = S * 0.13;
	mouth(c, mx, my, mw, S, mood, open, true);
	if (st.phase === 3 && open > 0.15) {
		// the fire inside him shows through the open mouth
		const h = S * 0.16 * open;
		c.save();
		c.beginPath();
		c.ellipse(mx, my + h * 0.3, mw * 0.92, h * 0.6, 0, 0, TAU);
		c.clip();
		c.globalCompositeOperation = 'lighter';
		bloom(c, mx, my + h * 0.55, mw * 1.1, '255,150,50', 0.75);
		c.restore();
	}
	if (st.phase >= 2) cornerTusks(c, mx, my, mw, S, st.phase);
	gloss(c, -S * 0.2, -S * 0.26, S * 0.06, S * 0.025, 0.5, -0.6);
	c.restore();
	// phase 3: smoke rising off his horns
	if (st.phase === 3) {
		for (let i = 0; i < 4; i += 1) {
			const u = (t * 0.6 + i / 4) % 1;
			const side = i % 2 ? 1 : -1;
			c.fillStyle = `rgba(60,40,40,${0.45 * (1 - u)})`;
			c.beginPath();
			c.arc(
				x + side * S * (0.42 - 0.04 * u) + Math.sin(u * 6 + i) * S * 0.02,
				y - S * (0.44 + 0.04 * u),
				S * (0.025 + 0.03 * u),
				0,
				TAU
			);
			c.fill();
		}
	}
}

// ── the imps ─────────────────────────────────────────────────────────────────────────────────────

export type ImpMode = 'walk' | 'scared' | 'spawn' | 'die';

export interface ImpState {
	readonly dir: Dir;
	readonly mode: ImpMode;
	/** 0..1 through spawn or death. */
	readonly k: number;
	/** 0 Pinky, 1 Inky, 2 Clyde. */
	readonly kind: 0 | 1 | 2;
	/** Its own phase, so a pack does not hop in step. */
	readonly seed: number;
}

const IMP_SKIN: readonly Tones[] = [
	{ light: '#ffc8e4', mid: '#f070b4', shade: '#7a2058' },
	{ light: '#c8fbff', mid: '#30c8e8', shade: '#105a78' },
	{ light: '#ffe0a8', mid: '#f09a30', shade: '#7a3e08' }
];

/**
 * An imp: a small horned devil a half tile across that hops along (each on its own beat), a whip of a
 * tail behind, a sly grin; scared, it backs away wide-eyed and shaking; it pops out of the floor.
 */
export function drawImp(c: Ctx, x: number, y: number, S: number, t: number, st: ImpState): void {
	const [dx, dy] = VEC[st.dir];
	const skin = IMP_SKIN[st.kind];
	const R = S * 0.21;
	const beat = (t * 3.2 + st.seed) % 1;
	let hop = st.mode === 'walk' ? Math.sin(beat * Math.PI) : 0;
	let sx = 1;
	let sy = 1;
	let ox = 0;
	let scale = 1;
	let alpha = 1;
	if (st.mode === 'walk') {
		// squash on landing, stretch in the air
		const land = beat < 0.15 ? 1 - beat / 0.15 : 0;
		sx = 1 + 0.2 * land - 0.06 * hop;
		sy = 1 - 0.2 * land + 0.1 * hop;
	} else if (st.mode === 'scared') {
		ox = Math.sin(t * 50) * S * 0.02 - dx * S * 0.08;
		sy = 0.92;
		hop = 0.15 * Math.abs(Math.sin(t * 12));
	} else if (st.mode === 'spawn') {
		// out of the floor with an overshoot
		const e = st.k;
		scale = e < 0.7 ? (e / 0.7) * 1.2 : 1.2 - 0.2 * ((e - 0.7) / 0.3);
		hop = Math.sin(Math.min(1, e / 0.7) * Math.PI) * 1.4;
	} else if (st.mode === 'die') {
		scale = 1 + 0.4 * st.k;
		alpha = 1 - st.k;
	}
	const cy = y + S * 0.08 - hop * S * 0.14;
	shadow(c, x, y + S * 0.2, R * (1 - 0.3 * hop) * scale, R * 0.35 * scale, 0.45);
	if (st.mode === 'spawn' && st.k < 0.5) {
		// the crack it climbs out of
		c.strokeStyle = 'rgba(255,140,80,.8)';
		c.lineWidth = Math.max(1, S * 0.03);
		c.beginPath();
		c.moveTo(x - S * 0.2, y + S * 0.22);
		c.lineTo(x - S * 0.05, y + S * 0.18);
		c.lineTo(x + S * 0.05, y + S * 0.24);
		c.lineTo(x + S * 0.2, y + S * 0.2);
		c.stroke();
	}
	c.save();
	c.globalAlpha *= alpha;
	c.translate(ox, 0);
	c.translate(x, cy);
	c.scale(scale, scale);
	c.translate(-x, -cy);
	squash(c, x, cy + R, sx, sy);
	// the tail: whipping behind it
	const tb = st.dir === 'LEFT' ? 1 : st.dir === 'RIGHT' ? -1 : 0.6;
	const whip = Math.sin(t * 9 + st.seed * 6) * 0.6;
	const tx0 = x + tb * R * 0.8;
	const ty0 = cy + R * 0.4;
	const tx1 = tx0 + tb * S * 0.16 + Math.cos(whip) * S * 0.02;
	const ty1 = ty0 - S * 0.12 + Math.sin(whip) * S * 0.06;
	c.strokeStyle = INK;
	c.lineWidth = Math.max(1.6, S * 0.06);
	c.lineCap = 'round';
	c.beginPath();
	c.moveTo(tx0, ty0);
	c.quadraticCurveTo(tx0 + tb * S * 0.12, ty0 + S * 0.04, tx1, ty1);
	c.stroke();
	c.strokeStyle = skin.shade;
	c.lineWidth = Math.max(0.8, S * 0.03);
	c.stroke();
	c.save();
	c.translate(tx1, ty1);
	c.rotate(Math.atan2(ty1 - ty0, tx1 - tx0));
	cel(
		c,
		() => {
			c.beginPath();
			c.moveTo(-S * 0.02, -S * 0.04);
			c.lineTo(S * 0.06, 0);
			c.lineTo(-S * 0.02, S * 0.04);
			c.closePath();
		},
		skin,
		0,
		0,
		S * 0.04,
		S,
		0.5
	);
	c.restore();
	// the horns
	for (const side of [-1, 1] as const) {
		cel(
			c,
			() => {
				c.beginPath();
				c.moveTo(x + side * R * 0.35, cy - R * 0.75);
				c.lineTo(x + side * R * 0.75, cy - R * 1.35);
				c.lineTo(x + side * R * 0.8, cy - R * 0.55);
				c.closePath();
			},
			BONE,
			x + side * R * 0.6,
			cy - R,
			R * 0.3,
			S,
			0.5
		);
	}
	// the body: a round devil with a three-point skirt
	cel(
		c,
		() => {
			c.beginPath();
			c.arc(x, cy - R * 0.1, R, Math.PI, 0);
			c.lineTo(x + R, cy + R * 0.7);
			c.lineTo(x + R * 0.5, cy + R * 0.95);
			c.lineTo(x, cy + R * 0.7);
			c.lineTo(x - R * 0.5, cy + R * 0.95);
			c.lineTo(x - R, cy + R * 0.7);
			c.closePath();
		},
		skin,
		x,
		cy,
		R,
		S,
		0.8
	);
	const mood: Mood = st.mode === 'scared' ? 'scared' : 'sly';
	const eyes: EyeSpec[] = [
		{
			x: x - R * 0.38 + dx * R * 0.2,
			y: cy - R * 0.15 + dy * R * 0.15,
			rx: R * 0.3,
			ry: R * (mood === 'scared' ? 0.42 : 0.34)
		},
		{
			x: x + R * 0.38 + dx * R * 0.2,
			y: cy - R * 0.15 + dy * R * 0.15,
			rx: R * 0.3,
			ry: R * (mood === 'scared' ? 0.42 : 0.34)
		}
	];
	eyes.forEach((e, i) => eye(c, e, S, i === 0 ? -1 : 1, mood, { x: dx, y: dy }, t, 0.5));
	if (mood === 'scared') {
		mouth(c, x + dx * R * 0.2, cy + R * 0.45, R * 0.35, S, 'scared', 0, false);
	} else {
		// a sly grin with one fang
		c.strokeStyle = INK;
		c.lineWidth = Math.max(1, S * 0.03);
		c.beginPath();
		c.moveTo(x - R * 0.4 + dx * R * 0.2, cy + R * 0.35);
		c.quadraticCurveTo(x + dx * R * 0.2, cy + R * 0.6, x + R * 0.45 + dx * R * 0.2, cy + R * 0.28);
		c.stroke();
		c.fillStyle = '#fff4e4';
		c.beginPath();
		c.moveTo(x + R * 0.15 + dx * R * 0.2, cy + R * 0.45);
		c.lineTo(x + R * 0.22 + dx * R * 0.2, cy + R * 0.62);
		c.lineTo(x + R * 0.29 + dx * R * 0.2, cy + R * 0.42);
		c.fill();
	}
	c.restore();
}

// ── the split's flayed ghosts ────────────────────────────────────────────────────────────────────

export type GhostMode = 'walk' | 'fright' | 'blink' | 'merge';

export interface GhostState {
	readonly dir: Dir;
	readonly mode: GhostMode;
	/** 0 Blinky, 1 Pinky, 2 Inky, 3 Clyde. */
	readonly kind: 0 | 1 | 2 | 3;
	/** 0..1 through the merge. */
	readonly k: number;
}

const GHOST_SKIN: readonly Tones[] = [
	{ light: '#ff8a78', mid: '#d82a24', shade: '#5e0a10' },
	{ light: '#ffc0d8', mid: '#f07aa8', shade: '#7a2450' },
	{ light: '#b8f4ff', mid: '#38bcd8', shade: '#0e5470' },
	{ light: '#ffd09a', mid: '#f0942c', shade: '#7a3a08' }
];
const FRIGHT: Tones = { light: '#8a9aff', mid: '#2a38c8', shade: '#0e1460' };
const FRIGHT_WHITE: Tones = { light: '#ffffff', mid: '#e8e4f4', shade: '#9a94b8' };

/** Each ghost's character, in its eyes only (as the arcade's four): mood, how far its pupils go. */
const GHOST_MOOD: readonly Mood[] = ['hunt', 'sly', 'hunt', 'dopey'];

/**
 * A flayed ghost of the split: the classic dome and wavy feet, skinned (raw, the muscle's fibres
 * showing), its feet stepping; each one its character by its eyes (Blinky's frown, Pinky's sly lid,
 * Inky's darting eyes, Clyde's crossed ones); frightened it shivers blue, eyes small, mouth wavering,
 * blinking white at the end; merging, it stretches toward the core.
 */
export function drawGhost(
	c: Ctx,
	x: number,
	y: number,
	S: number,
	t: number,
	st: GhostState
): void {
	const [dx, dy] = VEC[st.dir];
	const fright = st.mode === 'fright' || st.mode === 'blink';
	const white = st.mode === 'blink' && Math.floor(t * 8) % 2 === 0;
	const skin = fright ? (white ? FRIGHT_WHITE : FRIGHT) : GHOST_SKIN[st.kind];
	const R = S * 0.36;
	const bob = Math.sin(t * 8 + st.kind) * S * 0.02;
	const shiver = fright ? Math.sin(t * 45) * S * 0.012 : 0;
	let sx = 1;
	let sy = 1;
	let alpha = 1;
	if (st.mode === 'merge') {
		sy = 1 + 0.5 * st.k;
		sx = 1 - 0.35 * st.k;
		alpha = 1 - 0.4 * st.k;
	}
	const cy = y + bob;
	shadow(c, x, y + S * 0.32, R * 0.9, S * 0.08, 0.45);
	c.save();
	c.globalAlpha *= alpha;
	c.translate(shiver, 0);
	squash(c, x, cy + R, sx, sy);
	const body = (): void => {
		c.beginPath();
		c.arc(x, cy - R * 0.1, R, Math.PI, 0);
		c.lineTo(x + R, cy + R * 0.78);
		const N = 4;
		const step = Math.floor(t * 8) % 2;
		for (let i = N; i >= 0; i -= 1) {
			const px = x - R + (i / N) * R * 2;
			const down = (i + step) % 2 === 0;
			c.lineTo(px, cy + R * (down ? 0.98 : 0.74));
		}
		c.closePath();
	};
	cel(c, body, skin, x, cy, R, S, 1);
	if (!fright) {
		// the flaying: pale fibres of muscle down the body
		c.save();
		body();
		c.clip();
		c.strokeStyle = 'rgba(255,230,220,.35)';
		c.lineWidth = Math.max(1, S * 0.018);
		for (const fx of [-0.55, -0.2, 0.2, 0.55]) {
			c.beginPath();
			c.moveTo(x + fx * R, cy - R * 0.85);
			c.quadraticCurveTo(x + fx * R * 1.2, cy, x + fx * R * 0.9, cy + R);
			c.stroke();
		}
		c.restore();
	}
	if (fright) {
		// small worried eyes and the wavering mouth
		for (const side of [-1, 1]) {
			c.fillStyle = white ? '#e02020' : '#ffe8d8';
			c.beginPath();
			c.arc(x + side * R * 0.35, cy - R * 0.2, S * 0.04, 0, TAU);
			c.fill();
		}
		c.save();
		c.strokeStyle = white ? '#e02020' : '#ffe8d8';
		c.lineWidth = Math.max(1.2, S * 0.035);
		c.beginPath();
		for (let k = 0; k <= 6; k += 1) {
			const px = x - R * 0.5 + (k / 6) * R;
			c[k === 0 ? 'moveTo' : 'lineTo'](px, cy + R * 0.3 + (k % 2 ? -1 : 1) * S * 0.02);
		}
		c.stroke();
		c.restore();
	} else {
		const mood = GHOST_MOOD[st.kind];
		let look: Look = { x: dx, y: dy };
		if (st.kind === 2) {
			// Inky's eyes dart about
			const j = Math.floor(t * 1.7);
			const a = Math.sin(j * 12.9898) * 43758.5453;
			const ang = (a - Math.floor(a)) * TAU;
			look = { x: Math.cos(ang), y: Math.sin(ang) };
		}
		const big = st.kind === 2 ? [1.12, 0.92] : [1, 1];
		const eyes: EyeSpec[] = [-1, 1].map((side, i) => ({
			x: x + side * R * 0.38 + dx * R * 0.18,
			y: cy - R * 0.18 + dy * R * 0.12,
			rx: R * 0.27 * big[i],
			ry: R * 0.33 * big[i]
		}));
		eyes.forEach((e, i) => eye(c, e, S, i === 0 ? -1 : 1, mood, look, t, 0.48));
		if (st.kind === 0) brows(c, eyes, S, 'hunt', 0.04);
		if (st.kind === 3) mouth(c, x + dx * R * 0.15, cy + R * 0.38, R * 0.22, S, 'dopey', 0.3, false);
		if (st.kind === 1) mouth(c, x + dx * R * 0.15, cy + R * 0.36, R * 0.25, S, 'sly', 0, false);
	}
	gloss(c, x - R * 0.45, cy - R * 0.7, R * 0.16, R * 0.07, 0.55, -0.6);
	c.restore();
	// now and then a drop of blood left behind (not when frightened)
	if (!fright && st.mode === 'walk') {
		const u = (t * 0.5 + st.kind * 0.25) % 1;
		if (u < 0.35) {
			c.fillStyle = `rgba(160,10,16,${0.8 * (1 - u / 0.35)})`;
			c.beginPath();
			c.ellipse(
				x - dx * S * (0.3 + u),
				y + S * 0.38 - dy * S * (0.3 + u),
				S * 0.035,
				S * 0.025,
				0,
				0,
				TAU
			);
			c.fill();
		}
	}
}
