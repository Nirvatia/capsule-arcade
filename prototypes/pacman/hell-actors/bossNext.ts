// The boss redrawn for a face that reads in every phase (candidate, beside the current `drawBoss`).
// The horns, the body and the motion stay as they are; what changes is the face:
// - the face sits on a lit mask: in phase 1 a paler muzzle, in 2 a warm glow, in 3 his inner fire
//   lighting the face from below, so the dark features read on a warm ground, not on dark skin;
// - the cracks keep off the face (they run down his sides and over the skirt);
// - phase 3's eyes are blazing yellow in dark sockets, with no haze over them; the brows turn to
//   bone ridges with a short spike at the outer end (in place of the second pair of horns over the
//   brow, which hid them); the open mouth glows inside; the tusks stand at the mouth's corners.
import { BONE_TONES, bossBody, bossHorn, brows, eye, mouth, squash } from './actors';
import type { BossState, EyeSpec, Mood } from './actors';
import { TAU, VEC, bloom, cel, gloss, ink, shadow } from '../hell-kit/paint';
import type { Ctx, Tones } from '../hell-kit/paint';

/** The skin: phase 3 is charred but not black, so the outline still parts him from the floor. */
const SKIN: Record<1 | 2 | 3, Tones> = {
	1: { light: '#ff7a5a', mid: '#d8241e', shade: '#6a0810' },
	2: { light: '#ec5a40', mid: '#ae161a', shade: '#4a040c' },
	3: { light: '#c8402e', mid: '#7c1418', shade: '#2c0408' }
};

/** The body's pose and the face's mood for each mode (as the current boss). */
function pose(st: BossState, t: number) {
	const [dx] = VEC[st.dir];
	const m = st.mode;
	const k = st.k;
	const breath = Math.sin(t * 2.5) * 0.025;
	const p = {
		sx: 1 - breath,
		sy: 1 + breath,
		ox: 0,
		oy: Math.sin(t * 5) * 0.015,
		lean: dx * 0.08,
		drag: dx === 0 ? 0 : -dx * 0.4,
		mood: 'hunt' as Mood,
		open: 0,
		wave: 7
	};
	if (m === 'windup') Object.assign(p, { sx: 1 + 0.18 * k, sy: 1 - 0.2 * k, mood: 'wind', open: 0.35 * k, lean: -dx * 0.12 * k });
	else if (m === 'dash') Object.assign(p, { sx: dx !== 0 ? 1.3 : 0.8, sy: dx !== 0 ? 0.8 : 1.3, mood: 'roar', open: 0.8, drag: -dx * 1.2, wave: 18, lean: dx * 0.15 });
	else if (m === 'charge') Object.assign(p, { sx: 1 + 0.12 * k, sy: 1 + 0.12 * k, mood: 'wind', open: 0.25 + 0.3 * k });
	else if (m === 'cast') Object.assign(p, { sx: 1.12 - 0.12 * k, sy: 1.12 - 0.12 * k, mood: 'roar', open: 1 - 0.4 * k });
	else if (m === 'recover') Object.assign(p, { sy: 0.95 + Math.sin(t * 7) * 0.025, sx: 1.04, mood: 'tired', open: 0.3 + 0.15 * Math.sin(t * 7) });
	else if (m === 'hit') {
		const q = Math.sin(Math.min(1, k * 2) * Math.PI);
		Object.assign(p, { sx: 1 + 0.12 * q, sy: 1 - 0.14 * q, ox: -dx * 0.08 * q, mood: 'hurt', open: 0.5 * q });
	} else if (m === 'stunned') Object.assign(p, { sy: 0.9, sx: 1.08, oy: 0.04, lean: Math.sin(t * 2) * 0.08, mood: 'dazed', open: 0.25 });
	else if (m === 'gloat') Object.assign(p, { sy: 1 + 0.04 * Math.abs(Math.sin(t * 9)), mood: 'gloat', open: 0.55 });
	else if (m === 'omen') Object.assign(p, { ox: Math.sin(t * 70) * 0.035 * (0.4 + 0.6 * k), sx: 1 + 0.06 * k, sy: 1 + 0.06 * k, mood: 'roar', open: 0.6 });
	return p;
}

/** The lit mask the face sits on. */
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

/** The cracks: down his sides and over the skirt, never across the face. */
function cracks(c: Ctx, S: number, t: number, phase: number, glow: number): void {
	const lava = phase === 3;
	c.strokeStyle = lava ? `rgba(255,${160 + 50 * Math.sin(t * 3)},70,${Math.min(1, glow + 0.3)})` : `rgba(255,170,70,${glow})`;
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

/** Phase 3's brows: ridges of bone with a short spike at the outer end. */
function boneBrows(c: Ctx, eyes: readonly EyeSpec[], S: number, mood: Mood): void {
	const angle = ({ hunt: 0.35, wind: 0.6, roar: 0.75, gloat: 0.25, hurt: 0.5, dazed: -0.45, tired: -0.2 } as Record<string, number>)[mood] ?? 0.3;
	eyes.forEach((e, i) => {
		const side = i === 0 ? -1 : 1;
		c.save();
		// low over the eye, so the glare reads as anger
		c.translate(e.x, e.y - e.ry * 0.82);
		c.rotate(angle * -side);
		const w = S * 0.085;
		const path = (): void => {
			c.beginPath();
			c.moveTo(-side * e.rx * 1.1, w * 0.4);
			c.quadraticCurveTo(0, -w * 1.1, side * e.rx * 1.05, -w * 0.5);
			// the spike, up and out
			c.lineTo(side * e.rx * 1.55, -w * 1.9);
			c.lineTo(side * e.rx * 1.2, w * 0.45);
			c.quadraticCurveTo(0, -w * 0.1, -side * e.rx * 1.1, w * 0.4);
			c.closePath();
		};
		cel(c, path, BONE_TONES, 0, -w * 0.3, e.rx, S, 0.55);
		c.restore();
	});
}

/** Two tusks at the mouth's corners, curving up and out. */
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
			BONE_TONES,
			bx,
			y - h * 0.4,
			S * 0.04,
			S,
			0.5
		);
	}
}

export function drawBossNext(c: Ctx, x: number, y: number, S: number, t: number, st: BossState): void {
	const [dx, dy] = VEC[st.dir];
	const m = st.mode;
	const k = st.k;
	const p = pose(st, t);
	const phase = st.phase;
	const foot = y + S * 0.4;
	shadow(c, x, y + S * 0.3, S * 0.36 * p.sx, S * 0.1, 0.5);
	if (m === 'charge' || m === 'cast' || m === 'omen') bloom(c, x, y, S * 0.9, '255,90,40', 0.25 + 0.35 * k);
	c.save();
	c.translate(p.ox * S, p.oy * S);
	squash(c, x, foot, p.sx, p.sy);
	c.translate(x, y);
	c.rotate(p.lean);
	const hornLen = S * (phase === 1 ? 0.26 : phase === 2 ? 0.31 : 0.36);
	bossHorn(c, -1, S, hornLen, phase, t, m === 'hit' ? 1 : 0);
	bossHorn(c, 1, S, hornLen, phase, t, m === 'hit' ? 1 : 0);
	cel(c, () => bossBody(c, S, t, p.drag, p.wave), SKIN[phase], 0, 0, S * 0.36, S, 1.15);
	const fx = dx * S * 0.04;
	const fy = dy * S * 0.03;
	faceMask(c, S, fx, fy - S * 0.02, phase, t);
	if (phase >= 2) {
		c.save();
		bossBody(c, S, t, p.drag, p.wave);
		c.clip();
		cracks(c, S, t, phase, 0.55 + 0.25 * Math.sin(t * 2.5) + (m === 'omen' ? 0.4 * k : 0));
		c.restore();
	}
	const eyes: EyeSpec[] = [
		{ x: -S * 0.13 + fx, y: -S * 0.08 + fy, rx: S * 0.1, ry: S * 0.115 },
		{ x: S * 0.13 + fx, y: -S * 0.08 + fy, rx: S * 0.1, ry: S * 0.115 }
	];
	if (phase === 3 && p.mood !== 'hurt') {
		// dark sockets round the blazing eyes: the shape reads at any size
		for (const e of eyes) {
			c.fillStyle = '#1c0306';
			c.beginPath();
			c.ellipse(e.x, e.y + S * 0.005, e.rx * 1.28, e.ry * 1.22, 0, 0, TAU);
			c.fill();
		}
	}
	eyes.forEach((e, i) => eye(c, e, S, i === 0 ? -1 : 1, p.mood, st.look, t, 0.45, phase === 3));
	if (phase === 3) boneBrows(c, eyes, S, p.mood);
	else brows(c, eyes, S, p.mood, phase === 2 ? 0.06 : 0.05);
	const mx = fx;
	const my = S * 0.14 + dy * S * 0.02;
	const mw = S * 0.13;
	mouth(c, mx, my, mw, S, p.mood, p.open, true);
	if (phase === 3 && p.open > 0.15 && p.mood !== 'scared') {
		// the fire inside him shows through the open mouth
		const h = S * 0.16 * p.open;
		c.save();
		c.beginPath();
		c.ellipse(mx, my + h * 0.3, mw * 0.92, h * 0.6, 0, 0, TAU);
		c.clip();
		c.globalCompositeOperation = 'lighter';
		bloom(c, mx, my + h * 0.55, mw * 1.1, '255,150,50', 0.75);
		c.restore();
	}
	if (phase >= 2) cornerTusks(c, mx, my, mw, S, phase);
	gloss(c, -S * 0.2, -S * 0.26, S * 0.06, S * 0.025, 0.5, -0.6);
	c.restore();
	if (phase === 3) {
		for (let i = 0; i < 4; i += 1) {
			const u = (t * 0.6 + i / 4) % 1;
			const side = i % 2 ? 1 : -1;
			c.fillStyle = `rgba(60,40,40,${0.45 * (1 - u)})`;
			c.beginPath();
			c.arc(x + side * S * (0.42 - 0.04 * u) + Math.sin(u * 6 + i) * S * 0.02, y - S * (0.44 + 0.04 * u), S * (0.025 + 0.03 * u), 0, TAU);
			c.fill();
		}
	}
	void ink;
}
