// Candidates for the station's squad (the owner's mock-up STATION_MIMIC.html, 2026-11-26), for his
// approval. All keep the season ghosts' grammar (`render/actors/cuteGhost`): upright, never turned,
// two bean feet stepping with the distance, the bob, the lean to the heading, and eyes that tell
// the way, because on the maze's rails a gliding or crawling body reads clumsy, worst on a 180.
//   orig       the mock-up's Pretender (`smileMimic`) as drawn
//   pretender  the Pretender for B-7: the same body and mask, the mask the spore's ivory, a strap;
//              it slips continuously away from the heading (also up and down) and the real gold
//              eye peeks on the heading side in every hunting state; the painted face does not look
//              anywhere; lab colours with the station's cold rim light; it folds into its spore
//   hermit     Claude's own: the spore hermit, a small creature wearing a big spore's shell; its
//              eyes look out from under the brim, the shell rises in the tell, cracks in the rage,
//              is pulled down over the eyes in fright and shuts into the spore for the disguise
import { footLift } from '../../../src/games/pacman/render/actors/cuteGhost';
import type { SquadKind } from '../../../src/games/pacman/render/station/albino';

export type Look = 'orig' | 'pretender' | 'hermit';
export type MState = 'hunt' | 'tell' | 'rage' | 'fright' | 'flash' | 'mimic' | 'eyes';

export interface MOpts {
	/** The heading as a unit vector, instant (the eyes). */
	readonly lookX: number;
	readonly lookY: number;
	/** The heading eased (the mask, the shell): a 180 swings across instead of jumping. */
	readonly faceX: number;
	readonly faceY: number;
	readonly time: number;
	/** Distance travelled as a stride phase (radians). */
	readonly step: number;
	/** The mimicry: 0 the creature .. 1 the spore. */
	readonly fold: number;
	/** The B-7 Pretender's rage: 0 the mask still on (the hunt's slip) .. 1 pushed up on its head. */
	readonly reveal?: number;
	/** The candy colours of the mock-up instead of the lab ones (the B-7 looks only). */
	readonly candy?: boolean;
	/** Paints the level's spore at the creature's point (origin), with alpha and scale. */
	readonly spore: (c: CanvasRenderingContext2D, alpha: number, scale: number) => void;
}

type Ctx = CanvasRenderingContext2D;
type Pal = { b: string; s: string };

const TAU = Math.PI * 2;
const INK = '#241418';
const CANDY: Record<SquadKind, Pal> = {
	BLINKY: { b: '#ff5a5a', s: '#d93445' },
	PINKY: { b: '#ff9de2', s: '#e676c4' },
	INKY: { b: '#59f0ff', s: '#2ec3d6' },
	CLYDE: { b: '#ffb14d', s: '#e8861f' }
};
/** The squad's hues a little cooler and deeper: bred in a lab, lit by its cold lamps. */
const LAB: Record<SquadKind, Pal> = {
	BLINKY: { b: '#ee6b60', s: '#b03c40' },
	PINKY: { b: '#ec95d2', s: '#b0609e' },
	INKY: { b: '#62d8ea', s: '#2c90a8' },
	CLYDE: { b: '#f3ab55', s: '#b8732a' }
};
const SCARED: Pal = { b: '#4f68ff', s: '#3346d0' };
const WHITE: Pal = { b: '#f4f7ff', s: '#c3cfea' };
const RAGE: Pal = { b: '#ff4a4a', s: '#a81622' };
const PHASE: Record<SquadKind, number> = { BLINKY: 0, PINKY: 0.8, INKY: 1.6, CLYDE: 2.4 };
const FLASH_HZ = 2.2;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (e0: number, e1: number, x: number) => {
	const k = clamp((x - e0) / (e1 - e0), 0, 1);
	return k * k * (3 - 2 * k);
};

function ellipse(c: Ctx, x: number, y: number, rx: number, ry: number, fill: string, ink = 0): void {
	c.beginPath();
	c.ellipse(x, y, Math.max(0.05, rx), Math.max(0.05, ry), 0, 0, TAU);
	c.fillStyle = fill;
	c.fill();
	if (ink > 0) {
		c.strokeStyle = INK;
		c.lineWidth = ink;
		c.stroke();
	}
}

function line(c: Ctx, x1: number, y1: number, x2: number, y2: number, color: string, width: number): void {
	c.beginPath();
	c.moveTo(x1, y1);
	c.lineTo(x2, y2);
	c.strokeStyle = color;
	c.lineWidth = width;
	c.lineCap = 'round';
	c.stroke();
}

function zigzag(c: Ctx, y: number, color: string, width: number): void {
	c.beginPath();
	c.moveTo(-3.4, y + 1.4);
	for (let i = 1; i <= 6; i++) c.lineTo(-3.4 + i * 1.13, y + (i % 2 ? 0 : 1.4));
	c.strokeStyle = color;
	c.lineWidth = width;
	c.lineJoin = 'round';
	c.stroke();
}

function sweat(c: Ctx, ex: number, ey: number): void {
	c.beginPath();
	c.moveTo(ex + 3.6, ey - 5.6);
	c.bezierCurveTo(ex + 5.6, ey - 3, ex + 5.4, ey - 1.6, ex + 3.6, ey - 1.4);
	c.bezierCurveTo(ex + 1.8, ey - 1.6, ex + 1.6, ey - 3, ex + 3.6, ey - 5.6);
	c.fillStyle = '#bfe9ff';
	c.fill();
	c.strokeStyle = INK;
	c.lineWidth = 0.6;
	c.stroke();
}

function celShadow(c: Ctx, trace: () => void, pal: Pal): void {
	c.save();
	trace();
	c.clip();
	ellipse(c, 3.4, 12.4, 14, 7.4, pal.s);
	c.restore();
}

/** The station's cold lamp along the upper-left rim (the B-7 looks). */
function rimLight(c: Ctx, cx: number, cy: number, rx: number, ry: number): void {
	c.beginPath();
	c.ellipse(cx, cy, rx - 1.1, ry - 1.1, 0, Math.PI * 1.05, Math.PI * 1.55);
	c.strokeStyle = 'rgba(206, 236, 255, 0.55)';
	c.lineWidth = 1.0;
	c.lineCap = 'round';
	c.stroke();
}

function glow(c: Ctx, x: number, y: number, r: number, inner: string, mid: string): void {
	const g = c.createRadialGradient(x, y, 0.2, x, y, r);
	g.addColorStop(0, inner);
	g.addColorStop(0.5, mid);
	g.addColorStop(1, 'rgba(255, 60, 40, 0)');
	c.fillStyle = g;
	c.beginPath();
	c.arc(x, y, r, 0, TAU);
	c.fill();
}

function floatingEyes(c: Ctx, o: MOpts, phase: number, iris: string | null): void {
	c.translate(0, Math.sin(o.time * 4 + phase) * 0.6 - 1);
	for (const side of [-1, 1]) {
		const ex = side * 4.6;
		ellipse(c, ex, 0, 3.7, 4.2, '#ffffff', 1.2);
		const px = ex + o.lookX * 1.6;
		const py = o.lookY * 1.7;
		if (iris) {
			ellipse(c, px, py, 2.2, 2.2, iris);
			ellipse(c, px, py, 0.7, 1.6, INK);
		} else {
			ellipse(c, px, py, 2.2, 2.2, INK);
		}
		c.fillStyle = '#ffffff';
		c.beginPath();
		c.arc(px - 0.8, py - 0.9, 0.7, 0, TAU);
		c.fill();
	}
}

// ---------------------------------------------------------------------------------------------
// The Pretender: the mock-up's (`b7` false, as drawn) and the B-7 one
// ---------------------------------------------------------------------------------------------

function paintPretender(c: Ctx, pal: Pal, st: MState, white: boolean, o: MOpts, b7: boolean): void {
	const scared = st === 'fright' || st === 'flash';
	const rage = st === 'rage';
	const chasing = st === 'hunt' || st === 'tell';
	const tell = st === 'tell';
	const k = o.fold;
	const lx = b7 ? o.faceX : o.lookX;
	const ly = b7 ? o.faceY : o.lookY;

	const traceBody = () => {
		c.beginPath();
		c.ellipse(0, 1.6, 10.0, 9.2, 0, 0, TAU);
	};
	traceBody();
	c.lineJoin = 'round';
	c.lineWidth = 3.2;
	c.strokeStyle = INK;
	c.stroke();
	c.fillStyle = pal.b;
	c.fill();
	celShadow(c, traceBody, pal);
	c.fillStyle = 'rgba(255,255,255,0.6)';
	c.beginPath();
	c.ellipse(-5.0, -3.2, 2.5, 1.5, -0.6, 0, TAU);
	c.fill();
	if (b7 && !white) rimLight(c, 0, 1.6, 10, 9.2);
	if (b7 && rage) {
		paintTrueFace(c, pal, o);
		// the mask goes up from the hunt's slip onto the top of its head, seen from below
		const r = o.reveal ?? 1;
		c.save();
		c.translate(lerp(lx * 1.4, 0, r), lerp(ly * 1.1, 0, r));
		c.translate(
			lerp(-lx * 3.1, -lx * 1.6, r),
			lerp(-ly * 2.66, -8.6 + Math.sin(o.step + 0.9) * 0.35, r)
		);
		c.rotate(lerp(-0.085 * (1 - Math.abs(lx)) - lx * 0.12, -0.16 - lx * 0.14, r));
		c.scale(1, lerp(1, 0.5, r));
		paintMask();
		c.restore();
		return;
	}

	// the strap that holds the mask on, across the body (the B-7 one)
	if (b7) {
		c.save();
		traceBody();
		c.clip();
		c.fillStyle = 'rgba(36, 20, 24, 0.5)';
		c.fillRect(-11, 1.3, 22, 1.5);
		c.restore();
	}

	c.save();
	c.translate(lx * 1.4, ly * (b7 ? 1.1 : 0.9));
	// the B-7 mask does not ride the face's lean toward the heading: it hangs back, so the eye shows
	const back = b7 ? 1 : 0;

	// the slip: the mock-up's flips side at lookX -0.2 and knows only left/right; the B-7 one
	// follows the eased heading in both axes and slips in every hunting state
	let mdx: number;
	let mdy: number;
	let mrot: number;
	let slipSide = 1;
	if (b7) {
		const amt = (rage ? 3.8 : tell ? 2.9 : st === 'hunt' ? 2.1 : 0) * (1 - k);
		mdx = -lx * (amt + 1.0 * back);
		mdy = -ly * (amt + 0.7 * back) * 0.95 + (rage ? 1.4 : 0);
		mrot =
			-0.085 * (1 - Math.abs(lx)) -
			lx * (rage ? 0.36 : tell ? 0.22 : st === 'hunt' ? 0.12 : 0) +
			(scared ? Math.sin(o.time * 36) * 0.05 : 0);
	} else {
		slipSide = o.lookX < -0.2 ? -1 : 1;
		mdx = rage ? -slipSide * 3.8 : chasing ? -slipSide * 1.35 : 0;
		mdy = rage ? 1.4 : chasing ? 0.35 : 0;
		mrot = rage
			? -slipSide * 0.36
			: chasing
				? -slipSide * 0.19
				: scared
					? -0.08 + Math.sin(o.time * 36) * 0.05
					: -0.085;
	}

	// the void behind the mask and the real eye(s) in it
	if ((chasing || rage) && k < 0.999) {
		c.save();
		c.beginPath();
		c.ellipse(-lx * 1.4, 1.6 - ly * (b7 ? 1.1 : 0.9), 9.5, 8.7, 0, 0, TAU);
		c.clip();
		c.beginPath();
		if (rage) {
			c.moveTo(-6.2, -4.4);
			c.lineTo(1.2, -5.6);
			c.lineTo(7.4, -3.2);
			c.lineTo(8.2, 3.6);
			c.lineTo(3.4, 7.6);
			c.lineTo(-4.8, 6.2);
			c.lineTo(-7.2, 1.0);
			c.closePath();
		} else if (b7) {
			const ay = Math.abs(ly);
			c.ellipse(lx * 4.2, 1.0 + ly * (ly < 0 ? 4.6 : 5.8), lerp(4.4, 6.4, ay), lerp(6.6, 3.8, ay), 0, 0, TAU);
		} else {
			c.ellipse(slipSide * 3.8, 0.8, 4.4, 6.6, 0, 0, TAU);
		}
		c.fillStyle = '#12060b';
		c.fill();
		c.strokeStyle = INK;
		c.lineWidth = 1.2;
		c.stroke();

		if (rage) {
			const side = b7 ? (lx < 0 ? -1 : 1) : slipSide;
			for (const [rx, ry] of [
				[side * 2.2 - 2.4, -0.4],
				[side * 2.2 + 2.8, 0.2]
			]) {
				glow(c, rx, ry, 3.4, 'rgba(255, 224, 110, 0.95)', 'rgba(255, 68, 46, 0.7)');
				ellipse(c, rx, ry, 2.0, 1.45, '#ff4834', 0.7);
				ellipse(c, rx + o.lookX * 0.5, ry + o.lookY * 0.4, 0.85, 1.15, '#fff4b8');
			}
		} else if (b7) {
			// one gold eye on the heading side, peeking past the mask's edge (over it, under it)
			const ex = lx * 6.6;
			const ey = 0.6 + ly * (ly < 0 ? 5.1 : 7.0);
			const pulse = tell ? 0.75 + 0.25 * Math.sin((o.time / 1.3) * TAU) : 0.6;
			const r = tell ? 2.7 : 2.3;
			glow(c, ex, ey, r * 1.9, `rgba(255, 214, 120, ${0.95 * pulse})`, `rgba(255, 120, 60, ${0.5 * pulse})`);
			ellipse(c, ex, ey, r, r * 0.86, '#ffc847', 0.7);
			ellipse(c, ex + o.lookX * 0.55, ey + o.lookY * 0.45, tell ? 0.45 : 0.6, r * 0.62, INK);
		} else {
			const rx = slipSide * 5.2 + o.lookX * 0.4;
			const ry = -0.2 + o.lookY * 0.5;
			glow(c, rx, ry, 3.2, 'rgba(255, 226, 120, 0.95)', 'rgba(255, 86, 62, 0.55)');
			ellipse(c, rx, ry, 1.85, 1.4, '#ffe27a', 0.65);
			ellipse(c, rx + o.lookX * 0.45, ry + o.lookY * 0.35, 0.65, 1.05, INK);
		}
		c.restore();
	}

	// the mask
	c.save();
	c.translate(mdx, mdy);
	c.rotate(mrot);
	paintMask();
	c.restore();
	c.restore();

	/** The mask in its own frame (the cute face, its crack, its stitched smile). */
	function paintMask(): void {
		const traceMask = () => {
			c.beginPath();
			c.moveTo(0, -5.6);
			c.bezierCurveTo(6.4, -5.8, 8.2, -1.0, 7.6, 4.4);
			c.bezierCurveTo(6.8, 8.2, 3.4, 9.2, 0, 9.0);
			c.bezierCurveTo(-3.6, 9.2, -7.0, 8.0, -7.8, 4.0);
			c.bezierCurveTo(-8.4, -1.2, -6.2, -5.4, 0, -5.6);
			c.closePath();
		};
		const ivory = b7 ? '#f1e7cf' : '#f2ede4';
		traceMask();
		c.fillStyle = scared ? (white ? '#ffffff' : '#dce6ff') : ivory;
		c.fill();
		c.save();
		traceMask();
		c.clip();
		ellipse(c, 2.2, 9.6, 8.6, 3.8, scared ? 'rgba(79,104,255,0.2)' : b7 ? '#d9c194' : '#d6cec1');
		if (chasing || rage) {
			// the crack starts on the side the eye is (the B-7 one: the heading's side)
			const cs = b7 ? (lx < 0 ? -1 : 1) : slipSide;
			c.strokeStyle = INK;
			c.lineWidth = rage ? 1.15 : 0.9;
			c.lineCap = 'round';
			c.beginPath();
			c.moveTo(cs * 7.4, -1.4);
			c.lineTo(cs * 4.2, -0.2);
			c.lineTo(cs * 2.6, 2.2);
			c.moveTo(cs * 4.2, -0.2);
			c.lineTo(cs * 2.8, -2.6);
			c.stroke();
		}
		c.restore();
		traceMask();
		c.strokeStyle = INK;
		c.lineWidth = 1.7;
		c.lineJoin = 'round';
		c.stroke();

		// the button eyes: the mock-up's glints follow the heading; the B-7 painted face looks nowhere
		const gx = b7 ? 0 : o.lookX * 0.45;
		const gy = b7 ? 0 : o.lookY * 0.45;
		for (const be of [
			{ x: -3.6, y: 0.7, r: 2.35 },
			{ x: 3.7, y: 1.6, r: 1.95 }
		]) {
			if (scared) {
				ellipse(c, be.x, be.y, be.r + 0.3, be.r + 0.3, '#ffffff', 1.1);
				ellipse(c, be.x + o.lookX * 0.7, be.y + o.lookY * 0.7, 0.95, 0.95, white ? '#ff6a3a' : INK);
			} else {
				ellipse(c, be.x, be.y, be.r, be.r * 1.05, INK);
				c.fillStyle = '#ffffff';
				c.beginPath();
				c.arc(be.x - be.r * 0.32 + gx, be.y - be.r * 0.3 + gy, 0.58, 0, TAU);
				c.arc(be.x + be.r * 0.25 + gx, be.y + be.r * 0.22 + gy, 0.32, 0, TAU);
				c.fill();
			}
		}
		c.fillStyle = scared ? 'rgba(120,150,255,0.4)' : b7 ? 'rgba(226,112,104,0.36)' : 'rgba(245,96,128,0.48)';
		c.beginPath();
		c.ellipse(-5.4, 3.6, 1.5, 0.95, 0, 0, TAU);
		c.ellipse(5.5, 4.2, 1.4, 0.9, 0, 0, TAU);
		c.fill();
		if (scared) {
			zigzag(c, 5.4, white ? '#ff4d4d' : INK, 0.95);
			if (!white) sweat(c, 3.8, 0.8);
		} else {
			const wide = (b7 && tell) || rage;
			const w = wide ? 5.0 : chasing && !b7 ? 4.8 : 4.0;
			const dip = wide ? 8.2 : chasing && !b7 ? 7.8 : 6.9;
			c.beginPath();
			c.moveTo(-w, 4.4);
			c.quadraticCurveTo(0, dip, w, 4.9);
			c.strokeStyle = INK;
			c.lineWidth = 1.05;
			c.lineCap = 'round';
			c.stroke();
			for (const sx of [-2.4, 0, 2.5]) {
				const sy = 5.4 + (1 - (sx * sx) / (w * w)) * (dip - 5.2) * 0.55;
				line(c, sx, sy - 0.85, sx + 0.15, sy + 0.85, INK, 0.72);
			}
		}
	}
}

/** Under the mask (the B-7 Pretender's rage): two gold slit eyes under angry lids, a mouth across
 *  the face with the mask's bone for teeth, a coral glow in the throat; the body throbs. */
function paintTrueFace(c: Ctx, pal: Pal, o: MOpts): void {
	const lx = o.faceX;
	const ly = o.faceY;
	const p = 0.8 + 0.2 * Math.sin(o.time * 9);
	c.save();
	c.translate(lx * 1.6, ly * 1.3);
	// where the mask sat, the skin is raw
	ellipse(c, 0, 2.2, 8.0, 7.4, 'rgba(110, 8, 20, 0.32)');
	const ey = -0.6;
	for (const side of [-1, 1]) {
		const ex = side * 4.1;
		glow(c, ex, ey, 5.4, `rgba(255, 214, 110, ${0.55 * p})`, `rgba(255, 70, 40, ${0.35 * p})`);
		ellipse(c, ex, ey, 3.0, 2.6, '#ffd04a', 1.1);
		ellipse(c, ex + o.lookX * 0.9, ey + o.lookY * 0.8, 0.62, 2.0, INK);
		c.fillStyle = '#ffffff';
		c.beginPath();
		c.arc(ex - 1.1, ey - 0.9, 0.55, 0, TAU);
		c.fill();
		// angry lids, low over the inner corners
		c.beginPath();
		c.moveTo(side * 7.6, ey - 3.0);
		c.lineTo(side * 0.7, ey - 0.1);
		c.lineTo(side * 0.7, ey - 4.4);
		c.lineTo(side * 7.6, ey - 4.4);
		c.closePath();
		c.fillStyle = pal.b;
		c.fill();
		line(c, side * 7.6, ey - 3.0, side * 0.7, ey - 0.1, INK, 1.5);
	}
	// the mouth, chomping
	const chomp = 0.5 + 0.5 * Math.sin(o.time * 9);
	const top = (x: number) => 3.6 - (1 - (x / 7) ** 2) * 0.5;
	const bottom = (x: number) => 3.6 + (1 - (x / 7) ** 2) * (2.6 + 1.0 * chomp);
	c.beginPath();
	c.moveTo(-7, 3.6);
	c.quadraticCurveTo(0, 2.6, 7, 3.6);
	c.quadraticCurveTo(0, 8.8 + 2 * chomp, -7, 3.6);
	c.closePath();
	c.fillStyle = '#12060b';
	c.fill();
	c.save();
	c.clip();
	glow(c, 0, 6.6, 5.5, 'rgba(255, 140, 80, 0.75)', 'rgba(255, 70, 50, 0.4)');
	c.fillStyle = '#f1e7cf';
	c.strokeStyle = INK;
	c.lineWidth = 0.5;
	for (let x = -5.6; x <= 5.7; x += 1.87) {
		c.beginPath();
		c.moveTo(x - 0.85, top(x) - 0.2);
		c.lineTo(x, top(x) + 1.9);
		c.lineTo(x + 0.85, top(x) - 0.2);
		c.fill();
		c.stroke();
	}
	for (let x = -4.6; x <= 4.7; x += 2.3) {
		c.beginPath();
		c.moveTo(x - 0.8, bottom(x) + 0.2);
		c.lineTo(x, bottom(x) - 1.6);
		c.lineTo(x + 0.8, bottom(x) + 0.2);
		c.fill();
		c.stroke();
	}
	c.restore();
	c.beginPath();
	c.moveTo(-7, 3.6);
	c.quadraticCurveTo(0, 2.6, 7, 3.6);
	c.quadraticCurveTo(0, 8.8 + 2 * chomp, -7, 3.6);
	c.closePath();
	c.strokeStyle = INK;
	c.lineWidth = 1.3;
	c.lineJoin = 'round';
	c.stroke();
	c.restore();
}

// ---------------------------------------------------------------------------------------------
// The spore hermit (Claude's own)
// ---------------------------------------------------------------------------------------------

function traceShell(c: Ctx): void {
	c.beginPath();
	c.moveTo(-11, 1.2);
	c.bezierCurveTo(-11, -7.4, -6.2, -11.2, 0, -11.2);
	c.bezierCurveTo(6.2, -11.2, 11, -7.4, 11, 1.2);
	c.quadraticCurveTo(0, 3.4, -11, 1.2);
	c.closePath();
}

function paintShell(c: Ctx, rage: boolean, time: number): void {
	traceShell(c);
	const g = c.createRadialGradient(-3.6, -6.6, 0.6, -1, -3, 15);
	g.addColorStop(0, '#fff9e0');
	g.addColorStop(0.55, '#e5a63e');
	g.addColorStop(1, '#8f5214');
	c.fillStyle = g;
	c.fill();
	c.save();
	traceShell(c);
	c.clip();
	// the pearl's lower cel shade and its socket's dark rim as the brim
	ellipse(c, 4.2, 2.4, 12.5, 7.2, 'rgba(150, 82, 18, 0.45)');
	c.beginPath();
	c.moveTo(-11, 1.2);
	c.quadraticCurveTo(0, 3.4, 11, 1.2);
	c.strokeStyle = '#15110c';
	c.lineWidth = 3.0;
	c.stroke();
	if (rage) {
		const flick = 0.75 + 0.25 * Math.sin(time * 23);
		glow(c, 3.8, -5, 6, `rgba(255, 196, 140, ${0.9 * flick})`, `rgba(255, 96, 60, ${0.55 * flick})`);
		c.beginPath();
		c.moveTo(1.6, -11.4);
		c.lineTo(3.4, -7.6);
		c.lineTo(2.2, -5.4);
		c.lineTo(5.2, -2.2);
		c.lineTo(4.0, 1.4);
		c.strokeStyle = '#ff7a4a';
		c.lineWidth = 1.7;
		c.lineJoin = 'round';
		c.stroke();
		c.strokeStyle = INK;
		c.lineWidth = 0.6;
		c.stroke();
	}
	c.restore();
	traceShell(c);
	c.strokeStyle = INK;
	c.lineWidth = 1.8;
	c.lineJoin = 'round';
	c.stroke();
	// the wet specular of the level's spores, large
	c.fillStyle = '#ffffff';
	c.beginPath();
	c.ellipse(-4.6, -6.6, 2.6, 1.6, -0.6, 0, TAU);
	c.fill();
	c.fillStyle = 'rgba(255, 255, 255, 0.55)';
	c.beginPath();
	c.arc(-1.2, -9.2, 0.75, 0, TAU);
	c.fill();
}

function paintHermit(c: Ctx, pal: Pal, st: MState, white: boolean, o: MOpts): void {
	const scared = st === 'fright' || st === 'flash';
	const rage = st === 'rage';
	const tell = st === 'tell';
	const k = o.fold;

	// the soft body under the shell
	const traceBody = () => {
		c.beginPath();
		c.ellipse(0, 3.0, 9.6, 7.8, 0, 0, TAU);
	};
	c.save();
	c.translate(0, 10);
	c.scale(1, 1 - 0.55 * k);
	c.translate(0, -10);
	traceBody();
	c.lineJoin = 'round';
	c.lineWidth = 3.2;
	c.strokeStyle = INK;
	c.stroke();
	c.fillStyle = pal.b;
	c.fill();
	celShadow(c, traceBody, pal);
	if (!white) rimLight(c, 0, 3.0, 9.6, 7.8);

	// the light inside the shell spills on the face (the tell, the rage)
	if (tell || rage) {
		const p = tell ? 0.7 + 0.3 * Math.sin((o.time / 1.3) * TAU) : 0.9;
		c.save();
		traceBody();
		c.clip();
		const g = c.createRadialGradient(0, 0, 0.5, 0, 1, 9);
		g.addColorStop(0, `rgba(255, 206, 110, ${0.55 * p})`);
		g.addColorStop(1, 'rgba(255, 150, 60, 0)');
		c.fillStyle = g;
		c.fillRect(-11, -6, 22, 14);
		c.restore();
	}

	// the eyes: the cute ghosts' (white, a pupil on the heading), from under the brim
	const ey = scared ? 5.0 : 3.6;
	for (const side of [-1, 1]) {
		const ex = side * 3.9;
		ellipse(c, ex, ey, 2.9, 3.3, '#ffffff', 1.1);
		const px = ex + o.lookX * 1.3;
		const py = ey + o.lookY * 1.5;
		if (scared) {
			ellipse(c, px, py, 1.05, 1.05, white ? '#ff6a3a' : INK);
		} else if (tell) {
			ellipse(c, px, py, 1.9, 1.9, '#ffc847', 0.5);
			ellipse(c, px, py, 0.55, 1.45, INK);
		} else {
			ellipse(c, px, py, 1.95, 1.95, rage ? '#c8141e' : INK);
			c.fillStyle = '#ffffff';
			c.beginPath();
			c.arc(px - 0.68, py - 0.74, 0.6, 0, TAU);
			c.fill();
		}
	}
	if (rage) {
		// slanted lids
		for (const side of [-1, 1]) {
			c.beginPath();
			c.moveTo(side * 7.4, ey - 3.6);
			c.lineTo(side * 0.6, ey - 0.4);
			c.lineTo(side * 0.6, ey - 4.6);
			c.lineTo(side * 7.4, ey - 4.6);
			c.closePath();
			c.fillStyle = pal.s;
			c.fill();
			line(c, side * 7.4, ey - 3.6, side * 0.6, ey - 0.4, INK, 1.4);
		}
	}

	// the mouth
	const my = 8.3;
	if (scared) {
		zigzag(c, my - 1.2, white ? '#ff4d4d' : INK, 0.95);
		if (!white) sweat(c, 4.4, 1.6);
	} else if (rage) {
		c.beginPath();
		c.moveTo(-3.8, my - 0.6);
		c.quadraticCurveTo(0, my + 2.4, 3.8, my - 0.6);
		c.closePath();
		c.fillStyle = '#12060b';
		c.fill();
		c.fillStyle = '#ffffff';
		for (const fx of [-2.2, -0.7, 0.8, 2.3]) {
			c.beginPath();
			c.moveTo(fx - 0.55, my - 0.3);
			c.lineTo(fx, my + 0.9);
			c.lineTo(fx + 0.55, my - 0.3);
			c.fill();
		}
	} else if (tell) {
		ellipse(c, 0, my, 1.9, 1.35, '#12060b', 0.8);
	} else {
		c.beginPath();
		c.moveTo(-2.4, my - 0.3);
		c.quadraticCurveTo(0, my + 1.3, 2.4, my - 0.3);
		c.strokeStyle = INK;
		c.lineWidth = 1.05;
		c.lineCap = 'round';
		c.stroke();
		c.fillStyle = '#ffffff';
		for (const fx of [-1.1, 1.1]) {
			c.beginPath();
			c.moveTo(fx - 0.45, my + 0.25);
			c.lineTo(fx, my + 1.25);
			c.lineTo(fx + 0.45, my + 0.25);
			c.fill();
		}
	}
	c.restore();

	// the shell: down over the eyes in fright, up in the tell, shut in the fold; it tips away from
	// the heading (eased) and sits a step behind the bob
	let lift = rage ? -1.3 : tell ? -2.6 : scared ? 1.3 : 0;
	lift = lerp(lift, 5.2, k);
	c.save();
	c.translate(o.faceX * 0.7, lift + Math.abs(Math.sin(o.step + 0.6)) * 0.35);
	c.rotate(-o.faceX * 0.1 + (rage ? Math.sin(o.time * 31) * 0.035 : 0));
	paintShell(c, rage, o.time);
	c.restore();
}

// ---------------------------------------------------------------------------------------------
// The shared walk (the cuteGhost grammar)
// ---------------------------------------------------------------------------------------------

const META: Record<Look, { scale: number; dy: number; ring: number }> = {
	orig: { scale: 0.96, dy: 1.2, ring: 14.8 },
	pretender: { scale: 0.96, dy: 1.2, ring: 14.8 },
	hermit: { scale: 0.95, dy: 1.6, ring: 15.2 }
};

/** One squad creature centred at (x, y), `tile` css px. */
export function drawMimic(
	c: Ctx,
	x: number,
	y: number,
	tile: number,
	kind: SquadKind,
	look: Look,
	state: MState,
	o: MOpts
): void {
	const meta = META[look];
	const phase = PHASE[kind];
	const unit = (tile / 25) * 0.78;

	if (state === 'mimic') {
		const k = o.fold;
		if (look === 'orig') {
			// the mock-up's: the creature shrinks and fades as the spore grows in
			if (k > 0.08) {
				c.save();
				c.translate(x, y);
				o.spore(c, smooth(0.22, 0.9, k), lerp(0.55, 1, k));
				c.restore();
			}
			if (k > 0.96) return;
			c.save();
			c.globalAlpha *= 1 - smooth(0.55, 0.96, k);
			c.translate(x, y);
			c.scale(lerp(1, 0.42, k), lerp(1, 0.38, k));
			drawMimic(c, 0, 0, tile, kind, look, 'hunt', { ...o, fold: 0 });
			c.restore();
			return;
		}
		// the B-7 looks fold themselves (the mask slips home, the shell shuts), shrink toward the
		// spore's socket and only then hand over to it
		if (k > 0.55) {
			c.save();
			c.translate(x, y);
			o.spore(c, smooth(0.6, 0.95, k), lerp(0.8, 1, k));
			c.restore();
		}
		if (k > 0.97) return;
		c.save();
		c.globalAlpha *= 1 - smooth(0.72, 0.97, k);
		c.translate(x, y + k * tile * 0.06);
		c.scale(lerp(1, 0.4, k), lerp(1, 0.4, k));
		drawWalker(c, tile, kind, look, 'hunt', o, meta, phase, unit, k);
		c.restore();
		return;
	}
	c.save();
	c.translate(x, y);
	drawWalker(c, tile, kind, look, state, o, meta, phase, unit, 0);
	c.restore();
}

function drawWalker(
	c: Ctx,
	_tile: number,
	kind: SquadKind,
	look: Look,
	state: MState,
	o: MOpts,
	meta: { scale: number; dy: number; ring: number },
	phase: number,
	unit: number,
	k: number
): void {
	c.scale(unit * meta.scale, unit * meta.scale);
	const op: MOpts = { ...o, fold: k };
	if (state === 'eyes') {
		if (look === 'hermit') {
			// the eyes run home under the empty shell
			c.save();
			c.translate(0, Math.sin(o.time * 4 + phase) * 0.6 - 7.6);
			c.scale(0.62, 0.62);
			paintShell(c, false, o.time);
			c.restore();
		}
		floatingEyes(c, o, phase, look === 'pretender' ? '#ffc847' : null);
		return;
	}
	const fright = state === 'fright';
	const flash = state === 'flash';
	const white = flash && Math.sin(o.time * FLASH_HZ * TAU) > 0;
	if (fright) c.translate(Math.sin(o.time * 38 + phase) * 0.45, 0);
	// the fold stops the walk
	const step = o.step * (1 - k);
	const lift = footLift(step);
	c.translate(0, meta.dy - 1.2 - Math.abs(Math.sin(step)) * 0.7 * (1 - k));
	c.translate(0, 10);
	c.rotate((Math.sin(step) * 0.08 + o.lookX * 0.1) * (1 - k));
	c.translate(0, -10);
	const base = look === 'orig' || o.candy ? CANDY : LAB;
	let pal = base[kind];
	if (fright || flash) pal = white ? WHITE : SCARED;
	else if (state === 'rage') pal = RAGE;
	if (state === 'rage' && look === 'pretender') {
		// no ring: it shakes and throbs
		c.translate(Math.sin(o.time * 47 + phase) * 0.3, 0);
	}
	if (state === 'rage' && look !== 'pretender') {
		c.beginPath();
		c.arc(0, 0.5, meta.ring, 0, TAU);
		c.strokeStyle = 'rgba(255,77,77,0.78)';
		c.lineWidth = 1.3;
		c.stroke();
	}
	// the feet tuck in as it folds
	for (const [side, up] of [
		[-1, lift.left],
		[1, lift.right]
	] as const) {
		c.beginPath();
		c.ellipse(side * 4.2 * (1 - 0.3 * k), 11 - up - 3.4 * k, 3.3, 2.5 * (1 - 0.5 * k), 0, 0, TAU);
		c.fillStyle = pal.s;
		c.fill();
		c.strokeStyle = INK;
		c.lineWidth = 1.5;
		c.stroke();
	}
	const squash = Math.sin(o.time * 5 + phase);
	c.translate(0, 10);
	c.scale(1 - 0.04 * squash, 1 + 0.05 * squash);
	if (state === 'rage' && look === 'pretender') {
		const throb = Math.max(0, Math.sin(o.time * 9 + phase));
		c.scale(1 + 0.035 * throb, 1 + 0.035 * throb);
	}
	c.translate(0, -10);
	if (look === 'hermit') paintHermit(c, pal, state, white, op);
	else paintPretender(c, pal, state, white, op, look === 'pretender');
}
