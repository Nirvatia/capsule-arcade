// Candidates for the station's squad creature (prototype, throwaway; `pretender` page with `?cand`).
// The owner (2026-11-27): the amoeba reads as a drifting jelly, with no expression and no feeling
// of a living thing moving along the grid. Asked for: a weak trail, a stronger sign of the way it
// goes, a personality for each of the four (as the season ghosts' animals have). Three ways, all
// still a gel lit from inside in the kind's colour on the black hive, each with a gait tied to the
// distance (`step`) and a face that keeps upright and looks where it goes:
//   A  the inchworm: a slug that stretches ahead and draws its tail up, two eye-stalks forward;
//   B  the slipper: a paramecium, a wave of cilia along its sides, one big eye, a pulsing vacuole;
//   C  the stepper: a blob on four stubby pseudopod feet that hop, two big eyes, a kind's crest.
// The kinds' characters: BLINKY the hunter (angry lids, forward lean), PINKY the sly (half-lidded,
// a smile, sways), INKY the nervous (wide eyes, darting pupils, twitchy), CLYDE the dozy (heavy
// lids, slow, a tongue out).
import type { GhostKind } from '../../../src/games/pacman/logic/actors/GhostModel';

export type Cand = 'A' | 'B' | 'C';

export interface MimicOpts {
	readonly lookX: number;
	readonly lookY: number;
	readonly faceX: number;
	readonly faceY: number;
	readonly time: number;
	/** Distance travelled as a stride phase (radians). */
	readonly step: number;
}

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const INK = '#241418';

interface Gel {
	readonly edge: string;
	readonly mid: string;
	readonly core: string;
	readonly rgb: string;
}
const GEL: Readonly<Record<GhostKind, Gel>> = {
	BLINKY: { edge: '#ff7a68', mid: 'rgba(214, 54, 54, 0.92)', core: 'rgba(52, 6, 10, 0.94)', rgb: '255, 96, 80' },
	PINKY: { edge: '#ff9ae6', mid: 'rgba(196, 70, 160, 0.92)', core: 'rgba(48, 10, 40, 0.94)', rgb: '255, 130, 225' },
	INKY: { edge: '#7df4ff', mid: 'rgba(34, 156, 190, 0.92)', core: 'rgba(6, 36, 48, 0.94)', rgb: '90, 230, 255' },
	CLYDE: { edge: '#ffbe62', mid: 'rgba(206, 116, 30, 0.92)', core: 'rgba(52, 26, 6, 0.94)', rgb: '255, 176, 70' }
};

/** A character per kind: lids (cover 0..1, slant radians, inner end down when positive), the
 *  stride's speed, the lean along the way, and how it carries itself. */
const SOUL: Readonly<
	Record<GhostKind, { cover: number; slant: number; speed: number; lean: number; sway: number }>
> = {
	BLINKY: { cover: 0.38, slant: 0.55, speed: 1.15, lean: 0.07, sway: 0 },
	PINKY: { cover: 0.42, slant: -0.1, speed: 1, lean: 0.03, sway: 0.06 },
	INKY: { cover: 0, slant: 0, speed: 1.3, lean: 0, sway: 0.02 },
	CLYDE: { cover: 0.5, slant: -0.4, speed: 0.75, lean: 0.01, sway: 0.03 }
};
const ORDER: readonly GhostKind[] = ['BLINKY', 'PINKY', 'INKY', 'CLYDE'];

function fillGel(c: Ctx, g: Gel, cx: number, cy: number, r: number): void {
	const grad = c.createRadialGradient(cx - r * 0.15, cy - r * 0.2, r * 0.1, cx, cy, r * 1.15);
	grad.addColorStop(0, g.core);
	grad.addColorStop(0.55, g.mid);
	grad.addColorStop(1, g.edge);
	c.fillStyle = grad;
	c.fill();
}

function outline(c: Ctx, w: number): void {
	c.strokeStyle = INK;
	c.lineWidth = w;
	c.lineJoin = 'round';
	c.lineCap = 'round';
	c.stroke();
}

function disc(c: Ctx, x: number, y: number, r: number, fill: string): void {
	c.beginPath();
	c.arc(x, y, Math.max(0.001, r), 0, TAU);
	c.fillStyle = fill;
	c.fill();
}

/** One eye: white, a pupil looking along the heading, a lid by the kind's mood, a glint. */
function eye(
	c: Ctx,
	g: Gel,
	kind: GhostKind,
	x: number,
	y: number,
	er: number,
	side: number,
	o: MimicOpts,
	px: number
): void {
	const soul = SOUL[kind];
	c.save();
	c.beginPath();
	c.arc(x, y, er, 0, TAU);
	c.fillStyle = '#f6f2e8';
	c.fill();
	c.clip();
	// the pupil looks where it goes (INKY's darts about)
	const jx = kind === 'INKY' ? Math.sin(o.time * 7.3 + side) * er * 0.22 : 0;
	const jy = kind === 'INKY' ? Math.cos(o.time * 9.1 + side) * er * 0.18 : 0;
	disc(c, x + o.faceX * er * 0.42 + jx, y + o.faceY * er * 0.42 + jy, er * 0.58, INK);
	disc(c, x + o.faceX * er * 0.42 + jx - er * 0.18, y + o.faceY * er * 0.42 + jy - er * 0.22, er * 0.17, '#ffffff');
	if (soul.cover > 0) {
		c.translate(x, y);
		c.rotate(-side * soul.slant);
		const edge = -er + 2 * er * soul.cover;
		c.fillStyle = g.mid;
		c.fillRect(-er * 2, -er * 2, er * 4, er * 2 + edge);
		c.beginPath();
		c.moveTo(-er * 2, edge);
		c.lineTo(er * 2, edge);
		c.strokeStyle = INK;
		c.lineWidth = Math.max(px * 1.4, er * 0.28);
		c.stroke();
	}
	c.restore();
	c.beginPath();
	c.arc(x, y, er, 0, TAU);
	outline(c, Math.max(px * 1.2, er * 0.26));
}

/** A weak wake behind it, along -heading, `kind` of it by the candidate. */
function wake(c: Ctx, cand: Cand, g: Gel, o: MimicOpts, dx: number, dy: number): void {
	const px = -dy;
	const py = dx;
	for (let i = 0; i < 4; i++) {
		const back = 0.34 + 0.2 * i + 0.06 * ((o.step / TAU) % 1);
		const a = (0.2 - 0.045 * i) * (1 - 0.15 * ((o.step / TAU) % 1));
		const wob = Math.sin(o.step * 0.5 + i * 1.7) * 0.05;
		const x = -dx * back + px * wob;
		const y = -dy * back + py * wob;
		c.fillStyle = `rgba(${g.rgb}, ${a})`;
		if (cand === 'A') {
			// a slime smear, wider than long
			c.beginPath();
			c.ellipse(x, y, 0.15 - 0.025 * i, 0.07 - 0.01 * i, Math.atan2(dy, dx), 0, TAU);
			c.fill();
		} else if (cand === 'B') {
			// ripples: arcs across the wake
			c.beginPath();
			c.arc(x - dx * 0.05, y - dy * 0.05, 0.16 + 0.05 * i, Math.atan2(dy, dx) + Math.PI - 0.7, Math.atan2(dy, dx) + Math.PI + 0.7);
			c.strokeStyle = `rgba(${g.rgb}, ${a * 1.6})`;
			c.lineWidth = 0.03;
			c.stroke();
		} else if (i < 3) {
			// ichor drops, falling off the feet
			disc(c, x + px * (i - 1) * 0.07, y + py * (i - 1) * 0.07 + i * 0.02, 0.035 - 0.006 * i, `rgba(${g.rgb}, ${a * 1.8})`);
		}
	}
}

/** A: the inchworm. */
function slug(c: Ctx, kind: GhostKind, g: Gel, o: MimicOpts, dx: number, dy: number, px: number): void {
	const u = 0.5 + 0.5 * Math.sin(o.step * SOUL[kind].speed);
	const len = 0.62 + 0.3 * u;
	const wid = 0.215 - 0.04 * u;
	const ang = Math.atan2(dy, dx);
	const reach = 0.04 * u;
	c.save();
	c.translate(dx * reach, dy * reach);
	c.rotate(ang);
	// a capsule, fatter at the head, the tail drawn to a point
	c.beginPath();
	const n = 28;
	for (let i = 0; i <= n; i++) {
		const s = -1 + (2 * i) / n;
		const w = wid * (s < 0 ? 0.35 + 0.65 * Math.sqrt(1 + s) : 0.78 + 0.22 * Math.sqrt(Math.max(0, 1 - s * s * 0.6)));
		const x = (s * len) / 2;
		if (i === 0) c.moveTo(x, -w);
		else c.lineTo(x, -w);
	}
	for (let i = n; i >= 0; i--) {
		const s = -1 + (2 * i) / n;
		const w = wid * (s < 0 ? 0.35 + 0.65 * Math.sqrt(1 + s) : 0.78 + 0.22 * Math.sqrt(Math.max(0, 1 - s * s * 0.6)));
		c.lineTo((s * len) / 2, w);
	}
	c.closePath();
	fillGel(c, g, 0, 0, len * 0.55);
	outline(c, Math.max(px * 1.6, 0.045));
	// the body's rings roll forward with the stretch
	c.strokeStyle = `rgba(${g.rgb}, 0.38)`;
	c.lineWidth = Math.max(px, 0.02);
	for (let k = 0; k < 3; k++) {
		const s = -0.5 + ((k / 3 + o.step * SOUL[kind].speed / TAU) % 1);
		const x = s * len * 0.6;
		const h = wid * 0.8 * (0.5 + 0.5 * (1 - Math.abs(s)));
		c.beginPath();
		c.moveTo(x, -h);
		c.quadraticCurveTo(x + 0.04, 0, x, h);
		c.stroke();
	}
	c.restore();
	// eye-stalks forward, the face upright
	const headX = dx * (len * 0.4 + reach);
	const headY = dy * (len * 0.4 + reach);
	const sx = -dy;
	const sy = dx;
	for (const side of [-1, 1]) {
		const baseX = headX + sx * side * wid * 0.45;
		const baseY = headY + sy * side * wid * 0.45;
		const sway = Math.sin(o.time * 3 + side * 1.3) * 0.02;
		const tipX = baseX + dx * 0.16 + sx * side * (0.06 + sway);
		const tipY = baseY + dy * 0.16 + sy * side * (0.06 + sway);
		c.beginPath();
		c.moveTo(baseX, baseY);
		c.lineTo(tipX, tipY);
		c.strokeStyle = INK;
		c.lineWidth = Math.max(px * 3.4, 0.07);
		c.lineCap = 'round';
		c.stroke();
		c.strokeStyle = g.mid;
		c.lineWidth = Math.max(px * 2, 0.04);
		c.stroke();
		eye(c, g, kind, tipX, tipY, 0.09, side, o, px);
	}
	if (kind === 'PINKY' || kind === 'CLYDE') mouth(c, kind, headX + dx * 0.06, headY + dy * 0.06, dx, dy, 0.07, px);
}

/** A small mouth at the front: PINKY smiles, CLYDE's tongue hangs, the others a grim line. */
function mouth(c: Ctx, kind: GhostKind, x: number, y: number, dx: number, dy: number, w: number, px: number): void {
	c.save();
	c.translate(x, y);
	c.strokeStyle = INK;
	c.lineWidth = Math.max(px * 1.8, 0.035);
	c.lineCap = 'round';
	c.beginPath();
	if (kind === 'PINKY') {
		c.arc(0, -w * 0.3, w, 0.15 * Math.PI, 0.85 * Math.PI);
		c.stroke();
	} else if (kind === 'CLYDE') {
		c.moveTo(-w, 0);
		c.lineTo(w, 0);
		c.stroke();
		c.beginPath();
		c.ellipse(w * 0.3, w * 0.7, w * 0.4, w * 0.6, 0, 0, TAU);
		c.fillStyle = '#ff7a8c';
		c.fill();
		outline(c, Math.max(px * 1.2, 0.025));
	} else {
		c.moveTo(-w, 0);
		c.lineTo(w, 0);
		c.stroke();
	}
	c.restore();
	void dx;
	void dy;
}

/** B: the slipper. */
function slipper(c: Ctx, kind: GhostKind, g: Gel, o: MimicOpts, dx: number, dy: number, px: number): void {
	const ang = Math.atan2(dy, dx);
	const spd = SOUL[kind].speed;
	const rx = 0.46;
	const ry = 0.3;
	c.save();
	c.rotate(ang);
	// cilia: a wave runs back along each side with the stride
	const n = 9;
	c.strokeStyle = g.edge;
	c.lineWidth = Math.max(px * 1.5, 0.025);
	c.lineCap = 'round';
	for (const side of [-1, 1]) {
		for (let i = 0; i < n; i++) {
			const a = ((i + 0.5) / n) * Math.PI * 0.86 + 0.07 * Math.PI; // along the side, tail to head
			const bx = -Math.cos(a) * rx;
			const by = side * Math.sin(a) * ry;
			const beat = Math.sin(o.step * spd * 1.2 - i * 0.75) * 0.75;
			const nx = (bx / rx) * 0.5;
			const ny = (by / ry) * 1.0;
			const tilt = Math.atan2(ny, nx) + beat * side * -0.9 - 0.5 * (side > 0 ? 1 : -1) * 0;
			c.beginPath();
			c.moveTo(bx, by);
			c.lineTo(bx + Math.cos(tilt) * 0.12, by + Math.sin(tilt) * 0.12);
			c.stroke();
		}
	}
	// the slipper: wider at the tail, rounded at the head
	c.beginPath();
	for (let i = 0; i <= 40; i++) {
		const a = (i / 40) * TAU;
		const x = Math.cos(a) * rx;
		const k = 1 + 0.18 * (-Math.cos(a)) - 0.08 * Math.cos(a) ** 2;
		const y = Math.sin(a) * ry * k;
		if (i === 0) c.moveTo(x, y);
		else c.lineTo(x, y);
	}
	c.closePath();
	fillGel(c, g, 0, 0, rx);
	outline(c, Math.max(px * 1.6, 0.045));
	// the oral groove, the nucleus and the vacuole that pulses
	c.beginPath();
	c.moveTo(rx * 0.55, -ry * 0.1);
	c.quadraticCurveTo(rx * 0.1, ry * 0.1, -rx * 0.12, ry * 0.42);
	c.strokeStyle = 'rgba(20, 8, 12, 0.55)';
	c.lineWidth = Math.max(px * 2, 0.04);
	c.stroke();
	disc(c, -rx * 0.35, -ry * 0.08, 0.075, 'rgba(24, 8, 14, 0.7)');
	const pulse = 0.5 + 0.5 * Math.sin(o.time * 2.6 + o.step * 0.3);
	disc(c, -rx * 0.62, ry * 0.2, 0.03 + 0.03 * pulse, `rgba(${g.rgb}, ${0.55 + 0.3 * pulse})`);
	c.restore();
	// one big eye at the front third, upright
	const ex = dx * rx * 0.52;
	const ey = dy * rx * 0.52;
	eye(c, g, kind, ex, ey, 0.125, 1, o, px);
	if (kind === 'PINKY' || kind === 'CLYDE') mouth(c, kind, dx * rx * 0.86 + dy * 0.0, dy * rx * 0.86, dx, dy, 0.06, px);
}

/** Four feet in a diagonal gait: lifted and carried forward in their turn; `dust` puffs where they land. */
function feet(
	c: Ctx,
	g: Gel,
	dx: number,
	dy: number,
	ph: number,
	px: number,
	carry: number,
	rise: number,
	dust: string | null
): void {
	const sx = -dy;
	const sy = dx;
	for (const [fa, ls, fwd] of [
		[0, 1, 1],
		[Math.PI, -1, 1],
		[Math.PI, 1, -1],
		[0, -1, -1]
	] as const) {
		const lift = Math.max(0, Math.sin(ph + fa));
		const fx = dx * (0.17 * fwd + carry * lift) + sx * ls * 0.17;
		const fy = dy * (0.17 * fwd + carry * lift) + sy * ls * 0.17;
		if (dust) {
			// a little cloud where the foot has just come down
			const land = Math.max(0, -Math.sin(ph + fa)) * (1 - lift);
			disc(c, fx - dx * 0.06, fy + 0.1, 0.03 + 0.035 * land, dust.replace('A', String(0.22 * land)));
		}
		c.beginPath();
		c.ellipse(fx, fy + 0.07 - lift * rise, 0.085, 0.065, 0, 0, TAU);
		fillGel(c, g, fx, fy + 0.07, 0.1);
		outline(c, Math.max(px * 1.4, 0.035));
	}
}

/** C: the stepper. */
function stepper(c: Ctx, kind: GhostKind, g: Gel, o: MimicOpts, dx: number, dy: number, px: number): void {
	const soul = SOUL[kind];
	const ph = o.step * soul.speed;
	const sx = -dy;
	const sy = dx;
	const hop = Math.abs(Math.sin(ph)) * 0.045;
	const squash = 1 + 0.07 * Math.cos(ph * 2);
	const sway = Math.sin(ph) * soul.sway;
	feet(c, g, dx, dy, ph, px, 0.07, 0.06, null);
	c.save();
	c.translate(dx * soul.lean + sway * sx, dy * soul.lean + sway * sy - hop);
	c.scale(1 / squash, squash);
	c.beginPath();
	c.ellipse(0, -0.02, 0.34, 0.3, 0, 0, TAU);
	fillGel(c, g, 0, -0.02, 0.34);
	outline(c, Math.max(px * 1.8, 0.05));
	// the gel's bubbles and its glint
	disc(c, -0.12, -0.17, 0.05, 'rgba(255, 255, 255, 0.28)');
	disc(c, 0.1, 0.08, 0.025, `rgba(${g.rgb}, 0.5)`);
	c.restore();
	// the crest of its kind, leaning with the way it goes
	crest(c, kind, g, o, dx, dy, -hop, px);
	// two big eyes toward the heading, the face upright
	const ex = dx * 0.1 + sway * sx;
	const ey = dy * 0.1 + sy * sway - 0.03 - hop;
	for (const side of [-1, 1]) eye(c, g, kind, ex + (side * 0.15) * (Math.abs(dy) > 0.5 ? 1 : 1), ey + dy * 0.02, 0.105, side, o, px);
	mouth(c, kind, ex + dx * 0.04, ey + 0.17 + dy * 0.03, dx, dy, 0.07, px);
}

/** What sets one kind apart on top of its head. */
function crest(c: Ctx, kind: GhostKind, g: Gel, o: MimicOpts, dx: number, dy: number, lift: number, px: number): void {
	c.save();
	c.translate(dx * SOUL[kind].lean, -0.3 + lift + dy * SOUL[kind].lean);
	const lean = dx * 0.08;
	if (kind === 'BLINKY') {
		// three spikes
		for (const k of [-1, 0, 1]) {
			c.beginPath();
			c.moveTo(k * 0.1 - 0.045, 0.04);
			c.lineTo(k * 0.1 + lean * (1 + k * 0.3), -0.1 - (k === 0 ? 0.04 : 0));
			c.lineTo(k * 0.1 + 0.045, 0.04);
			c.closePath();
			c.fillStyle = g.edge;
			c.fill();
			outline(c, Math.max(px * 1.4, 0.035));
		}
	} else if (kind === 'PINKY') {
		// a bulb on a short stalk
		c.beginPath();
		c.moveTo(0.02, 0.05);
		c.quadraticCurveTo(0.04 + lean, -0.06, 0.06 + lean * 1.5, -0.1);
		c.strokeStyle = g.mid;
		c.lineWidth = Math.max(px * 2.4, 0.05);
		c.stroke();
		disc(c, 0.07 + lean * 1.6, -0.12, 0.06, g.edge);
		c.beginPath();
		c.arc(0.07 + lean * 1.6, -0.12, 0.06, 0, TAU);
		outline(c, Math.max(px * 1.2, 0.03));
	} else if (kind === 'INKY') {
		// an antenna that bobs, a lamp at its tip pointing the way
		const bob = Math.sin(o.time * 4) * 0.03;
		c.beginPath();
		c.moveTo(0, 0.05);
		c.quadraticCurveTo(lean * 0.6, -0.1, lean * 1.6 + bob, -0.19);
		c.strokeStyle = INK;
		c.lineWidth = Math.max(px * 2.4, 0.045);
		c.stroke();
		const grad = c.createRadialGradient(lean * 1.6 + bob, -0.19, 0.005, lean * 1.6 + bob, -0.19, 0.12);
		grad.addColorStop(0, '#ffffff');
		grad.addColorStop(0.4, g.edge);
		grad.addColorStop(1, `rgba(${g.rgb}, 0)`);
		c.fillStyle = grad;
		c.beginPath();
		c.arc(lean * 1.6 + bob, -0.19, 0.12, 0, TAU);
		c.fill();
	} else {
		// a droopy lobe hanging to one side
		c.beginPath();
		c.ellipse(-0.12, 0.02, 0.1, 0.07, -0.5, 0, TAU);
		fillGel(c, g, -0.12, 0.02, 0.1);
		outline(c, Math.max(px * 1.4, 0.035));
	}
	c.restore();
}

export function drawMimic(c: Ctx, cand: Cand, x: number, y: number, S: number, kind: GhostKind, o: MimicOpts): void {
	const g = GEL[kind];
	const dx = o.lookX || o.lookY ? o.lookX : 0;
	const dy = o.lookX || o.lookY ? o.lookY : 1;
	const px = 1 / S;
	c.save();
	c.translate(x, y);
	c.scale(S, S);
	// the soft glow of its colour round it (inside the tile)
	const halo = c.createRadialGradient(0, 0, 0.05, 0, 0, 0.72);
	halo.addColorStop(0, `rgba(${g.rgb}, 0.26)`);
	halo.addColorStop(1, `rgba(${g.rgb}, 0)`);
	c.fillStyle = halo;
	c.beginPath();
	c.arc(0, 0, 0.72, 0, TAU);
	c.fill();
	wake(c, cand, g, o, dx, dy);
	if (cand === 'A') slug(c, kind, g, o, dx, dy, px);
	else if (cand === 'B') slipper(c, kind, g, o, dx, dy, px);
	else stepper(c, kind, g, o, dx, dy, px);
	c.restore();
}

/**
 * The sheet: the game's amoeba (`current`) and the three candidates, the four kinds walking right
 * in a row each, then one heading down and one left. `size` fixes the creature's tile in pixels
 * (the game's scale) or, 0, fits the cell.
 */
export function drawCandidates(
	c: Ctx,
	vw: number,
	vh: number,
	t: number,
	size: number,
	current: (x: number, y: number, S: number, kind: GhostKind, dir: readonly [number, number], step: number) => void
): void {
	const rows: Array<Cand | 'now'> = ['now', 'A', 'B', 'C'];
	const head = 30;
	const cols = 6;
	const cw = vw / cols;
	const ch = (vh - head) / rows.length;
	const S = size || Math.min(cw, ch) * 0.82;
	c.fillStyle = '#e8e2d4';
	c.font = '600 14px ui-sans-serif, system-ui, sans-serif';
	c.textBaseline = 'middle';
	c.fillText('МИМИКИ: кандидаты (идут, шлейф, личность)', 14, head / 2);
	const names: Record<string, string> = { now: 'сейчас: амёба', A: 'A червяк', B: 'B туфелька', C: 'C шагатель' };
	rows.forEach((row, r) => {
		for (let i = 0; i < cols; i++) {
			const x0 = i * cw;
			const y0 = head + r * ch;
			c.fillStyle = '#0d1109';
			c.fillRect(x0 + 2, y0 + 2, cw - 4, ch - 4);
			const kind = i < 4 ? ORDER[i] : i === 4 ? 'BLINKY' : 'PINKY';
			const dir: readonly [number, number] = i < 4 ? [1, 0] : i === 4 ? [0, 1] : [-1, 0];
			const step = t * 6 + ORDER.indexOf(kind) * 0.8;
			if (i === 0) {
				c.fillStyle = '#9aa38c';
				c.font = '600 12px ui-sans-serif, system-ui, sans-serif';
				c.fillText(names[row], x0 + 8, y0 + 12);
			}
			c.save();
			c.beginPath();
			c.rect(x0 + 2, y0 + 2, cw - 4, ch - 4);
			c.clip();
			const cx = x0 + cw / 2;
			const cy = y0 + ch / 2 + 4;
			if (row === 'now') current(cx, cy, S, kind, dir, step);
			else
				drawMimic(c, row, cx, cy, S, kind, {
					lookX: dir[0],
					lookY: dir[1],
					faceX: dir[0],
					faceY: dir[1],
					time: t,
					step
				});
			c.restore();
		}
	});
}

/** The rage's gel: the hive's lime, boiling; the kind keeps a rim of its own colour. */
const RAGE: Gel = {
	edge: '#e4ff8a',
	mid: 'rgba(120, 210, 40, 0.94)',
	core: 'rgba(22, 48, 8, 0.95)',
	rgb: '170, 255, 70'
};
export type RageLook = 'R1' | 'R2';

/** A flame that sways on the crest. */
function flame(c: Ctx, x: number, y: number, h: number, t: number, seed: number): void {
	const sway = Math.sin(t * 7 + seed) * 0.03;
	const g = c.createLinearGradient(x, y, x, y - h);
	g.addColorStop(0, 'rgba(255, 247, 160, 0.95)');
	g.addColorStop(1, 'rgba(170, 255, 70, 0)');
	c.beginPath();
	c.moveTo(x - h * 0.28, y);
	c.quadraticCurveTo(x - h * 0.2 + sway, y - h * 0.6, x + sway * 2, y - h);
	c.quadraticCurveTo(x + h * 0.2 + sway, y - h * 0.6, x + h * 0.28, y);
	c.closePath();
	c.fillStyle = g;
	c.fill();
}

/** Steam rising off the head, within the tile. */
function steam(c: Ctx, t: number): void {
	for (let i = 0; i < 3; i++) {
		const k = (t * 0.9 + i / 3) % 1;
		const x = Math.sin(i * 2.1 + t * 1.3) * 0.07 + (i - 1) * 0.08;
		const y = -0.36 - k * 0.2;
		disc(c, x, y, 0.045 + 0.06 * k, `rgba(232, 255, 200, ${0.4 * (1 - k)})`);
	}
}

/** A veined, bulging eye with a pinprick pupil, no lid: the rage. */
function bulge(c: Ctx, x: number, y: number, er: number, o: MimicOpts, px: number, jitter: number): void {
	c.save();
	c.beginPath();
	c.arc(x, y, er, 0, TAU);
	c.fillStyle = '#f4ffd0';
	c.fill();
	c.clip();
	c.strokeStyle = 'rgba(190, 40, 30, 0.75)';
	c.lineWidth = Math.max(px, er * 0.12);
	for (let k = 0; k < 4; k++) {
		const a = k * 1.6 + 0.4;
		c.beginPath();
		c.moveTo(x + Math.cos(a) * er, y + Math.sin(a) * er);
		c.lineTo(x + Math.cos(a) * er * 0.45, y + Math.sin(a) * er * 0.45 + 0.01);
		c.stroke();
	}
	const jx = Math.sin(o.time * 31 + x * 9) * er * jitter;
	const jy = Math.cos(o.time * 27 + y * 9) * er * jitter;
	disc(c, x + o.faceX * er * 0.5 + jx, y + o.faceY * er * 0.5 + jy, er * 0.24, INK);
	c.restore();
	c.beginPath();
	c.arc(x, y, er, 0, TAU);
	outline(c, Math.max(px * 1.4, er * 0.24));
}

/** C in the rage, two ways: R1 bulging eyes and a toothy grin, R2 eyes on springs and a scream. */
export function drawMimicRage(c: Ctx, look: RageLook, x: number, y: number, S: number, kind: GhostKind, o: MimicOpts): void {
	const g = GEL[kind];
	const dx = o.lookX || o.lookY ? o.lookX : 0;
	const dy = o.lookX || o.lookY ? o.lookY : 1;
	const px = 1 / S;
	const soul = SOUL[kind];
	const ph = o.step * soul.speed * 1.7;
	const sx = -dy;
	const sy = dx;
	const hop = Math.abs(Math.sin(ph)) * 0.06;
	const t = o.time;
	c.save();
	c.translate(x, y);
	c.scale(S, S);
	// the lime halo, hotter than the calm one, within the tile
	const halo = c.createRadialGradient(0, 0, 0.05, 0, 0, 0.82);
	halo.addColorStop(0, 'rgba(170, 255, 70, 0.34)');
	halo.addColorStop(1, 'rgba(170, 255, 70, 0)');
	c.fillStyle = halo;
	c.beginPath();
	c.arc(0, 0, 0.82, 0, TAU);
	c.fill();
	// a thin smoke behind, no afterimages
	for (let i = 0; i < 3; i++) {
		const k = (t * 1.4 + i / 3) % 1;
		disc(c, -dx * (0.3 + 0.3 * k), -dy * (0.3 + 0.3 * k) - 0.05 * k, 0.04 + 0.05 * k, `rgba(120, 150, 90, ${0.2 * (1 - k)})`);
	}
	feet(c, RAGE, dx, dy, ph, px, 0.1, 0.1, 'rgba(210, 235, 160, A)');
	const shake = 0.011;
	c.save();
	c.translate(
		dx * (soul.lean + 0.03) + Math.sin(t * 43 + ph) * shake,
		dy * (soul.lean + 0.03) + Math.cos(t * 37) * shake - hop
	);
	const throb = 1 + 0.05 * Math.sin(t * 13);
	c.scale(throb, 2 - throb);
	c.beginPath();
	c.ellipse(0, -0.02, 0.35, 0.31, 0, 0, TAU);
	fillGel(c, RAGE, 0, -0.02, 0.35);
	outline(c, Math.max(px * 1.8, 0.05));
	// the kind's colour as a rim inside the membrane, so the four stay four
	c.beginPath();
	c.ellipse(0, -0.02, 0.32, 0.28, 0, 0, TAU);
	c.strokeStyle = `rgba(${g.rgb}, 0.85)`;
	c.lineWidth = Math.max(px * 1.8, 0.035);
	c.stroke();
	// boils swelling on the skin
	for (let i = 0; i < 3; i++) {
		const k = (t * 0.8 + i / 3) % 1;
		const a = 0.7 + i * 2.2;
		disc(c, Math.cos(a) * 0.2, Math.sin(a) * 0.17 - 0.02, 0.015 + 0.05 * k, `rgba(228, 255, 138, ${0.5 * (1 - k * k)})`);
	}
	c.restore();
	steam(c, t);
	// the crest of its kind, ablaze
	crest(c, kind, g, o, dx, dy, -hop, px);
	c.save();
	c.translate(dx * soul.lean, -0.32 - hop + dy * soul.lean);
	flame(c, -0.07, 0.02, 0.15, t, 1);
	flame(c, 0.02, 0, 0.2, t, 2);
	flame(c, 0.1, 0.02, 0.13, t, 3);
	c.restore();
	const ex = dx * 0.1;
	const ey = dy * 0.1 - 0.03 - hop;
	if (look === 'R1') {
		// bulging eyes, brows driven down, a grin of teeth that chomps
		const er = 0.14;
		const odd = kind === 'INKY' ? 1.25 : 1;
		bulge(c, ex - 0.15, ey, er * (kind === 'INKY' ? 1 : 1), o, px, kind === 'INKY' ? 0.45 : 0.12);
		bulge(c, ex + 0.15, ey, er * odd, o, px, kind === 'INKY' ? 0.45 : 0.12);
		c.strokeStyle = INK;
		c.lineWidth = Math.max(px * 3, 0.06);
		c.lineCap = 'round';
		const brow = { BLINKY: [0.1, 0.03], PINKY: [0.02, 0.1], INKY: [0.06, 0.06], CLYDE: [0.1, 0.0] }[kind];
		for (const side of [-1, 1]) {
			const inner = brow[side < 0 ? 0 : 1];
			c.beginPath();
			c.moveTo(ex + side * 0.03, ey - er - 0.01 + inner * 0.5);
			c.lineTo(ex + side * 0.27, ey - er - 0.04 - inner * 0.1);
			c.stroke();
		}
		const open = 0.05 + 0.065 * (0.5 + 0.5 * Math.sin(t * 9 + ph));
		const my = ey + 0.2;
		c.beginPath();
		c.moveTo(ex - 0.2, my);
		c.quadraticCurveTo(ex, my + open * 2.2, ex + 0.2, my);
		c.quadraticCurveTo(ex, my - open * 0.6, ex - 0.2, my);
		c.closePath();
		c.fillStyle = '#1a0a0e';
		c.fill();
		outline(c, Math.max(px * 1.6, 0.04));
		c.fillStyle = '#fbfff0';
		for (let k = 0; k < 5; k++) {
			const tx = ex - 0.16 + k * 0.08;
			c.beginPath();
			c.moveTo(tx - 0.032, my + 0.005);
			c.lineTo(tx, my + 0.05 + (k % 2) * 0.015);
			c.lineTo(tx + 0.032, my + 0.005);
			c.closePath();
			c.fill();
		}
	} else {
		// eyes on springs that wobble, a round scream, steam jetting from both sides
		const er = 0.115;
		for (const side of [-1, 1]) {
			const bob = Math.abs(Math.sin(t * 11 + side)) * 0.05;
			const ex2 = ex + side * 0.16;
			const ey2 = ey - 0.2 - bob;
			c.beginPath();
			c.moveTo(ex + side * 0.12, ey - 0.06);
			for (let k = 1; k <= 5; k++) c.lineTo(ex2 + (k % 2 ? 0.035 : -0.035), ey - 0.06 + (ey2 - ey + 0.06) * (k / 5));
			c.strokeStyle = INK;
			c.lineWidth = Math.max(px * 2.4, 0.045);
			c.stroke();
			bulge(c, ex2, ey2, er, o, px, 0.2);
		}
		const my = ey + 0.12;
		const sc = 1 + 0.18 * Math.sin(t * 12);
		c.beginPath();
		c.ellipse(ex, my + 0.05, 0.13 * sc, 0.12 * sc, 0, 0, TAU);
		c.fillStyle = '#1a0a0e';
		c.fill();
		outline(c, Math.max(px * 1.6, 0.04));
		c.beginPath();
		c.ellipse(ex, my + 0.1, 0.07, 0.045, 0, 0, TAU);
		c.fillStyle = '#ff7a8c';
		c.fill();
		for (const side of [-1, 1]) {
			c.beginPath();
			c.moveTo(ex + side * 0.07, my - 0.04);
			c.lineTo(ex + side * 0.095, my + 0.02);
			c.lineTo(ex + side * 0.045, my - 0.01);
			c.fillStyle = '#fbfff0';
			c.fill();
		}
		for (const side of [-1, 1]) {
			for (let i = 0; i < 2; i++) {
				const k = (t * 1.6 + i * 0.5) % 1;
				disc(c, side * (0.36 + 0.14 * k), -0.06 - 0.06 * k, 0.03 + 0.04 * k, `rgba(232, 255, 200, ${0.4 * (1 - k)})`);
			}
		}
	}
	c.restore();
}

/** The sheet of the rage: the calm stepper for reference, then R1 and R2, the kinds as before. */
export function drawRageSheet(c: Ctx, vw: number, vh: number, t: number, size: number): void {
	const rows: Array<'calm' | RageLook> = ['calm', 'R1', 'R2'];
	const head = 30;
	const cols = 6;
	const cw = vw / cols;
	const ch = (vh - head) / rows.length;
	const S = size || Math.min(cw, ch) * 0.82;
	c.fillStyle = '#e8e2d4';
	c.font = '600 14px ui-sans-serif, system-ui, sans-serif';
	c.textBaseline = 'middle';
	c.fillText('ШАГАТЕЛЬ: ярость (R1 выпученные глаза и оскал, R2 глаза на пружинах и крик)', 14, head / 2);
	const names = { calm: 'C спокойный', R1: 'R1 оскал', R2: 'R2 крик' };
	rows.forEach((row, r) => {
		for (let i = 0; i < cols; i++) {
			const x0 = i * cw;
			const y0 = head + r * ch;
			c.fillStyle = '#0d1109';
			c.fillRect(x0 + 2, y0 + 2, cw - 4, ch - 4);
			const kind = i < 4 ? ORDER[i] : i === 4 ? 'BLINKY' : 'PINKY';
			const dir: readonly [number, number] = i < 4 ? [1, 0] : i === 4 ? [0, 1] : [-1, 0];
			const o: MimicOpts = {
				lookX: dir[0],
				lookY: dir[1],
				faceX: dir[0],
				faceY: dir[1],
				time: t,
				step: t * 6 + ORDER.indexOf(kind) * 0.8
			};
			if (i === 0) {
				c.fillStyle = '#9aa38c';
				c.font = '600 12px ui-sans-serif, system-ui, sans-serif';
				c.fillText(names[row], x0 + 8, y0 + 12);
			}
			c.save();
			c.beginPath();
			c.rect(x0 + 2, y0 + 2, cw - 4, ch - 4);
			c.clip();
			const cx = x0 + cw / 2;
			const cy = y0 + ch / 2 + 6;
			if (row === 'calm') drawMimic(c, 'C', cx, cy, S, kind, o);
			else drawMimicRage(c, row, cx, cy, S, kind, o);
			c.restore();
		}
	});
}
