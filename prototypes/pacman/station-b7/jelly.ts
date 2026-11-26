// Candidates for the station's squad as jelly (the owner, 2026-11-26: the parasites suffered from
// small details and a dark body; at a tile's size only a silhouette, a bright patch of colour and
// motion read). Each is a gel lit from inside, brightest at its membrane (a jellyfish against the
// light, not a sweet), in its kind's colour on the black hive; its eyes two dark nuclei inside,
// drifting toward its heading (no face); its form reaches toward the way it goes (the threat); the
// kind told by its colour and the character of its form. The rage boils it lime (the hive's life).
//   a the amoeba    a free form, pseudopods shooting out ahead; spiky, many small lobes, long
//                   thin threads, heavy lumps
//   b the gel ghost the classic ghost's silhouette in gel, a dripping hem, one big lobe on top
//                   per kind (horns, two drops, a fin, a knot)
//   c the devourer  an amoeba whose front opens into a cavity lit lime inside, as it engulfs; the
//                   cavity's rim per kind (teeth, a fringe, a slit, a wide round)
import type { GhostKind } from '../../../src/games/pacman/logic/actors/GhostModel';
import {
	INK,
	PHASE,
	SCALE,
	drawPretender,
	ellipse,
	glow,
	type PretenderOpts
} from '../../../src/games/pacman/render/station/pretender';

type Ctx = CanvasRenderingContext2D;
export type Look = 'a' | 'b' | 'c';
export type CandState = 'hunt' | 'tell' | 'fright' | 'eyes' | 'mimic' | 'rage';
/** Edge (bright), mid, core (dark) of a gel; its glow's rgb. */
type Gel = { edge: string; mid: string; core: string; rgb: string };

const TAU = Math.PI * 2;
const GEL: Record<GhostKind, Gel> = {
	BLINKY: { edge: '#ff7a68', mid: 'rgba(214, 54, 54, 0.9)', core: 'rgba(52, 6, 10, 0.92)', rgb: '255, 96, 80' },
	PINKY: { edge: '#ff9ae6', mid: 'rgba(196, 70, 160, 0.9)', core: 'rgba(48, 10, 40, 0.92)', rgb: '255, 130, 225' },
	INKY: { edge: '#7df4ff', mid: 'rgba(34, 156, 190, 0.9)', core: 'rgba(6, 36, 48, 0.92)', rgb: '90, 230, 255' },
	CLYDE: { edge: '#ffbe62', mid: 'rgba(206, 116, 30, 0.9)', core: 'rgba(52, 26, 6, 0.92)', rgb: '255, 176, 70' }
};
const SCARED: Gel = { edge: '#a9b8ff', mid: 'rgba(58, 80, 214, 0.9)', core: 'rgba(14, 20, 80, 0.92)', rgb: '96, 120, 255' };
const WHITE: Gel = { edge: '#ffffff', mid: 'rgba(214, 222, 246, 0.92)', core: 'rgba(150, 160, 196, 0.92)', rgb: '230, 236, 255' };
const RAGE: Gel = { edge: '#e4ff8a', mid: 'rgba(120, 210, 40, 0.92)', core: 'rgba(22, 48, 8, 0.94)', rgb: '170, 255, 70' };
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (e0: number, e1: number, x: number) => {
	const k = clamp((x - e0) / (e1 - e0), 0, 1);
	return k * k * (3 - 2 * k);
};
/** The angle between two headings, -PI..PI. */
const diff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

function stroke(c: Ctx, color: string, w: number): void {
	c.strokeStyle = color;
	c.lineWidth = w;
	c.lineCap = 'round';
	c.lineJoin = 'round';
	c.stroke();
}

function polar(c: Ctx, r: (a: number) => number, cy = 0, n = 72): void {
	c.beginPath();
	for (let i = 0; i <= n; i++) {
		const a = (i / n) * TAU;
		const rr = r(a);
		if (i === 0) c.moveTo(Math.cos(a) * rr, cy + Math.sin(a) * rr);
		else c.lineTo(Math.cos(a) * rr, cy + Math.sin(a) * rr);
	}
	c.closePath();
}

/** Fill a traced shape as gel: dark inside, bright at the membrane, outlined to part it from the floor. */
function gel(c: Ctx, trace: () => void, g: Gel, cx: number, cy: number, r: number): void {
	trace();
	stroke(c, INK, 2.2);
	const f = c.createRadialGradient(cx, cy, r * 0.1, cx, cy, r * 1.05);
	f.addColorStop(0, g.core);
	f.addColorStop(0.55, g.mid);
	f.addColorStop(0.9, g.edge);
	f.addColorStop(1, g.edge);
	trace();
	c.fillStyle = f;
	c.fill();
	trace();
	stroke(c, g.edge, 0.9);
}

/** Bubbles rising inside, and a specular glint at the upper left. */
function inside(c: Ctx, trace: () => void, o: PretenderOpts, ph: number, boil: boolean): void {
	c.save();
	trace();
	c.clip();
	const n = boil ? 7 : 3;
	for (let i = 0; i < n; i++) {
		const u = (o.time * ((boil ? 1.4 : 0.35) + i * 0.07) + i / n + ph) % 1;
		c.beginPath();
		c.arc(-6 + ((i * 3.7) % 12) + Math.sin(u * 6 + i) * 0.8, 8 - u * 16, (boil ? 0.9 : 0.6) + (i % 2) * 0.4, 0, TAU);
		stroke(c, `rgba(255, 255, 255, ${(boil ? 0.75 : 0.5) * Math.sin(u * Math.PI)})`, 0.5);
	}
	c.restore();
	ellipse(c, -4.6, -5.0, 2.0, 1.1, 'rgba(255, 255, 255, 0.65)');
	ellipse(c, -2.2, -6.6, 0.7, 0.45, 'rgba(255, 255, 255, 0.6)');
}

/** The eyes: two dark nuclei inside, drifting toward the heading, a glint in each; gold in the
 *  tell, shrunk to white rings in the fright, lime-hot in the rage. */
function nuclei(c: Ctx, o: PretenderOpts, st: CandState, x0: number, y0: number, gap: number): void {
	const vertical = Math.abs(o.lookY) > Math.abs(o.lookX);
	const cx = x0 + o.lookX * 2.6;
	const cy = y0 + o.lookY * 2.2;
	for (const side of [-1, 1]) {
		const ex = cx + (vertical ? side * gap : side * gap * 0.95);
		const ey = cy + (vertical ? 0 : side * 0.3);
		if (st === 'fright') {
			const tr = Math.sin(o.time * 40) * 0.25;
			ellipse(c, ex + tr, ey, 1.9, 1.9, '#ffffff', 0.9);
			ellipse(c, ex + tr + o.lookX * 0.6, ey + o.lookY * 0.6, 0.7, 0.7, INK);
			continue;
		}
		const rx = st === 'rage' ? 2.0 : 2.3;
		const ry = st === 'rage' ? 1.4 : 2.6;
		if (st === 'tell' || st === 'rage') {
			const rgb = st === 'rage' ? '226, 255, 160' : '255, 200, 71';
			glow(c, ex, ey, 4.2, `rgba(${rgb}, 0.9)`, `rgba(${rgb}, 0.35)`);
		}
		ellipse(c, ex, ey, rx, ry, st === 'rage' ? '#f4ffd8' : 'rgba(8, 4, 8, 0.92)');
		if (st === 'rage') ellipse(c, ex + o.lookX * 0.6, ey + o.lookY * 0.5, 0.5, 1.1, '#1f4a0a');
		else {
			ellipse(c, ex + o.lookX * 0.8, ey + o.lookY * 0.8, st === 'tell' ? 1.1 : 0.75, st === 'tell' ? 1.1 : 0.75, st === 'tell' ? '#ffc847' : 'rgba(255, 255, 255, 0.85)');
		}
	}
}

/** The way it goes as an angle (down when it does not say). */
const heading = (o: PretenderOpts) => (o.lookX || o.lookY ? Math.atan2(o.lookY, o.lookX) : Math.PI / 2);

// --------------------------------------------------------------------------------- a the amoeba

function amoebaR(kind: GhostKind, o: PretenderOpts, st: CandState, ph: number): (a: number) => number {
	const t = o.time;
	const rage = st === 'rage';
	const tell = st === 'tell';
	const h = heading(o);
	// the lunge: a pseudopod shooting out ahead and drawing back
	const lunge = 0.35 + 0.65 * Math.max(0, Math.sin(t * (rage ? 6 : 2.4) + ph)) ** 2;
	const ahead = (st === 'fright' ? 0.6 : 3.2) * lunge * (tell ? 1.3 : 1);
	const rot = t * (kind === 'CLYDE' ? 0.25 : 0.6) + ph;
	return (a: number) => {
		let r = 8.2;
		if (kind === 'BLINKY') r += Math.max(0, Math.cos(5 * (a - rot))) ** 6 * 3.2;
		else if (kind === 'PINKY') r += (0.5 + 0.5 * Math.cos(8 * (a - rot))) ** 1.5 * 1.5;
		else if (kind === 'INKY') r += Math.max(0, Math.cos(3 * (a - rot))) ** 18 * 5.4;
		else r += (0.5 + 0.5 * Math.cos(3 * (a - rot))) ** 2 * 2.4;
		r += Math.exp(-((diff(a, h) / 0.38) ** 2)) * ahead;
		if (rage) r += Math.sin(a * 7 + t * 12) * 0.9 + Math.max(0, Math.cos(4 * (a + t * 2))) ** 8 * 2.5;
		r += Math.sin(a * 3 + t * 2.2 + ph) * 0.35;
		return r * (st === 'fright' ? 0.92 : 1);
	};
}

// ----------------------------------------------------------------------------- b the gel ghost

function traceGhost(c: Ctx, t: number, ph: number, torn: boolean): void {
	c.beginPath();
	c.moveTo(-9.4, 7.4);
	c.lineTo(-9.4, 0);
	c.arc(0, 0, 9.4, Math.PI, TAU);
	c.lineTo(9.4, 7.4);
	for (let i = 0; i < 4; i++) {
		const x0 = 9.4 - i * 4.7;
		const x1 = x0 - 4.7;
		const w = Math.sin(t * (torn ? 14 : 7) + ph + i * 1.6);
		c.quadraticCurveTo(x0 - 2.35, 11.2 + w * (torn ? 2.2 : 1.3), x1, 7.4 + Math.sin(t * 7 + ph + i * 1.6 + 0.8) * 0.6);
	}
	c.closePath();
}

/** Its kind's one big lobe on top, as a path (drawn in the body's gel, merged with it). */
function crest(c: Ctx, kind: GhostKind, o: PretenderOpts, ext: number): void {
	const t = o.time;
	c.beginPath();
	if (kind === 'BLINKY') {
		for (const side of [-1, 1]) {
			c.moveTo(side * 3.2, -8.4);
			c.quadraticCurveTo(side * 7.6, -11 * ext, side * 8.8, -14.4 * ext);
			c.quadraticCurveTo(side * 9.4, -9, side * 8.6, -4.4);
			c.closePath();
		}
	} else if (kind === 'PINKY') {
		for (const side of [-1, 1]) {
			const sway = Math.sin(t * 2.6 + side) * 0.6;
			c.moveTo(side * 5.6 + 3.4, -8 + sway);
			c.arc(side * 5.6 + sway, -9.6 * ext + sway, 3.4, 0, TAU);
		}
	} else if (kind === 'INKY') {
		const back = -o.lookX * 3.4;
		c.moveTo(-3.4, -8.6);
		c.quadraticCurveTo(-1 + back * 0.5, -14 * ext, 2.4 + back, -15.6 * ext);
		c.quadraticCurveTo(3.6 + back * 0.5, -11, 4.2, -8.4);
		c.closePath();
	} else {
		c.moveTo(5.4, -6.4);
		c.arc(1.8, -8.8 * ext, 4.6, 0, TAU);
	}
}

// ----------------------------------------------------------------------------- c the devourer

/** The cavity's rim per kind, around its opening (in the cavity's frame: x across, y out). */
function rim(c: Ctx, kind: GhostKind, w: number, h: number, g: Gel, t: number): void {
	c.fillStyle = g.edge;
	if (kind === 'BLINKY') {
		for (let i = 0; i < 5; i++) {
			const x = -w + ((i + 0.5) / 5) * w * 2;
			c.beginPath();
			c.moveTo(x - 0.9, -h * 0.3);
			c.lineTo(x, h * 0.35);
			c.lineTo(x + 0.9, -h * 0.3);
			c.closePath();
			c.fill();
			stroke(c, INK, 0.5);
		}
	} else if (kind === 'PINKY') {
		for (let i = 0; i < 7; i++) {
			const a = (i / 7) * TAU + t * 0.8;
			ellipse(c, Math.cos(a) * w * 0.95, Math.sin(a) * h * 0.95, 1.0, 1.0, g.edge, 0.5);
		}
	} else if (kind === 'CLYDE') {
		c.beginPath();
		c.ellipse(0, 0, w + 0.6, h + 0.6, 0, 0, TAU);
		stroke(c, g.edge, 1.6);
	}
}

function bodyDevourer(c: Ctx, kind: GhostKind, st: CandState, o: PretenderOpts, g: Gel, ph: number): void {
	const t = o.time;
	const rage = st === 'rage';
	const h = heading(o);
	const trace = () =>
		polar(c, (a) => {
			let r = 8.6 + Math.sin(a * 3 + t * 2 + ph) * 0.4;
			// the front swells round the opening
			r += Math.exp(-((diff(a, h) / 0.7) ** 2)) * 1.6;
			if (rage) r += Math.sin(a * 6 + t * 11) * 0.8;
			return r;
		});
	gel(c, trace, g, 0, 0, 10);
	inside(c, trace, o, ph, rage);
	if (st === 'fright') {
		nuclei(c, o, st, -o.lookX * 4.2, -1 - o.lookY * 3.6, 2.6);
		return;
	}
	// the cavity on the heading's side, opening and closing as it engulfs
	const open = rage ? 0.85 + 0.15 * Math.sin(t * 12) : 0.45 + 0.4 * Math.max(0, Math.sin(t * 3 + ph));
	const slit = kind === 'INKY';
	const w = (slit ? 5.6 : kind === 'CLYDE' ? 4.8 : 4.0) * (rage ? 1.3 : 1);
	const hh = (slit ? 1.2 : 3.2) * open * (rage ? 1.3 : 1);
	c.save();
	c.translate(Math.cos(h) * 4.6, Math.sin(h) * 4.6);
	c.rotate(h + Math.PI / 2);
	const cav = c.createRadialGradient(0, 0, 0.3, 0, 0, Math.max(w, hh) + 1);
	cav.addColorStop(0, rage ? 'rgba(240, 255, 190, 1)' : 'rgba(200, 255, 110, 0.95)');
	cav.addColorStop(0.55, 'rgba(90, 170, 30, 0.9)');
	cav.addColorStop(1, 'rgba(6, 16, 4, 0.95)');
	c.beginPath();
	c.ellipse(0, 0, w, Math.max(0.4, hh), 0, 0, TAU);
	c.fillStyle = cav;
	c.fill();
	stroke(c, INK, 1.1);
	rim(c, kind, w, Math.max(0.4, hh), g, t);
	c.restore();
	// the nuclei behind the opening
	nuclei(c, o, st, -o.lookX * 3.8, -o.lookY * 3.4 - 1, 2.4);
}

// ---------------------------------------------------------------------------------- the walker

function afterimages(c: Ctx, o: PretenderOpts, trace: () => void): void {
	const d = Math.hypot(o.lookX, o.lookY) || 1;
	for (let i = 3; i >= 1; i--) {
		c.save();
		c.translate((-o.lookX / d) * i * 5.5, (-o.lookY / d) * i * 5.5);
		c.globalAlpha *= 0.26 - i * 0.06;
		trace();
		c.fillStyle = RAGE.mid;
		c.fill();
		c.restore();
	}
}

function body(c: Ctx, kind: GhostKind, v: Look, st: CandState, o: PretenderOpts): void {
	const ph = PHASE[kind];
	const scared = st === 'fright';
	const g = st === 'rage' ? RAGE : scared ? (o.white ? WHITE : SCARED) : GEL[kind];
	if (v === 'a') {
		const r = amoebaR(kind, o, st, ph);
		const trace = () => polar(c, r);
		if (st === 'rage') afterimages(c, o, trace);
		gel(c, trace, g, 0, 0, 10.5);
		inside(c, trace, o, ph, st === 'rage');
		nuclei(c, o, st, 0, -0.4, 2.5);
	} else if (v === 'b') {
		const ext = st === 'rage' ? 1.25 : st === 'tell' ? 1.12 : scared ? 0.85 : 1;
		const torn = st === 'rage';
		const trace = () => traceGhost(c, o.time, ph, torn);
		if (torn) afterimages(c, o, trace);
		// drips off the hem
		for (let i = 0; i < 3; i++) {
			const u = (o.time * (torn ? 1.6 : 0.85) + i / 3 + ph) % 1;
			c.save();
			c.globalAlpha *= 1 - u;
			ellipse(c, (i - 1) * 4.7 - o.lookX * u * 3, 10.6 + u * 5, 1.0, 1.3, g.edge);
			c.restore();
		}
		// the crest's outline behind, the body, then the crest's gel over the body's outline
		crest(c, kind, o, ext);
		stroke(c, INK, 2.2);
		gel(c, trace, g, 0, 0, 10.5);
		crest(c, kind, o, ext);
		const cg = c.createLinearGradient(0, -16, 0, -6);
		cg.addColorStop(0, g.edge);
		cg.addColorStop(1, g.mid);
		c.fillStyle = cg;
		c.fill();
		inside(c, trace, o, ph, torn);
		nuclei(c, o, st, 0, -1.2, 2.6);
	} else bodyDevourer(c, kind, st, o, g, ph);
}

function walker(c: Ctx, kind: GhostKind, v: Look, st: CandState, o: PretenderOpts, unit: number, k: number): void {
	const ph = PHASE[kind];
	c.scale(unit * SCALE * 1.075, unit * SCALE * 1.075);
	if (st === 'fright' && !o.flashing) c.translate(Math.sin(o.time * 38 + ph) * 0.4, 0);
	if (st === 'rage') c.translate(Math.sin(o.time * 47 + ph) * 0.3, 0);
	// jelly: it wobbles, no feet, no rocking
	const w = Math.sin(o.time * 3.1 + ph) * (1 - k);
	c.translate(0, Math.sin(o.time * 2.4 + ph) * 0.4 * (1 - k));
	c.scale(1 + 0.04 * w, 1 - 0.04 * w);
	body(c, kind, v, st, o);
}

function halo(c: Ctx, x: number, y: number, tile: number, rgb: string, a: number): void {
	if (a <= 0.01) return;
	const r = tile * 0.82;
	const g = c.createRadialGradient(x, y, 0, x, y, r);
	g.addColorStop(0, `rgba(${rgb}, ${a})`);
	g.addColorStop(0.55, `rgba(${rgb}, ${a * 0.4})`);
	g.addColorStop(1, `rgba(${rgb}, 0)`);
	c.save();
	c.globalCompositeOperation = 'lighter';
	c.fillStyle = g;
	c.beginPath();
	c.arc(x, y, r, 0, TAU);
	c.fill();
	c.restore();
}

/** A jelly candidate at (x, y), `tile` the tile's size in px. */
export function drawJelly(
	c: Ctx,
	x: number,
	y: number,
	tile: number,
	kind: GhostKind,
	v: Look,
	st: CandState,
	o: PretenderOpts
): void {
	if (st === 'eyes') {
		drawPretender(c, x, y, tile, kind, 'eyes', o);
		return;
	}
	const unit = (tile / 25) * 0.78;
	if (st === 'mimic') {
		const k = clamp(o.fold ?? 0, 0, 1);
		halo(c, x, y, tile, GEL[kind].rgb, 0.36 * (1 - k));
		if (k > 0.55 && o.spore) {
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
		walker(c, kind, v, 'hunt', o, unit, k);
		c.restore();
		return;
	}
	const rgb = st === 'rage' ? RAGE.rgb : st === 'fright' ? SCARED.rgb : GEL[kind].rgb;
	halo(c, x, y, tile, rgb, st === 'rage' ? 0.44 : 0.38);
	c.save();
	c.translate(x, y);
	walker(c, kind, v, st, o, unit, 0);
	c.restore();
}
