// Candidates for the station's squad as the parasites of the black hive (the owner, 2026-11-26:
// alien organics are black and parasitic; the hive turned black with a lime life in it). Each is
// black glossy organics with lime in its seams, wearing the Pretender's ivory mask (the cute face
// it fakes), the mask painted in its kind's colour; no feet (they rocked). The rage is its own
// for each: the mask bursts into shards and the lime breaks out of that body (the acid overheat
// as the parasite's blood).
//   a the host mask  the Pretender remade: a black body, lime seams, the mask slipping off its
//                    heading so a lime slit eye peeks; a fringe of short tendrils for feet; a
//                    growth of its own per kind (mandibles, a collar of tendrils, feelers, spines)
//   b the larva      three black rings, lime glowing between them, moving by a wave along them;
//                    the mask on its head ring; a tail of its own per kind
//   c the clutch     a sac of black membrane with lime larvae curled inside pushing at it, the
//                    mask stuck on its front; the kinds differ in their larvae
import type { GhostKind } from '../../../src/games/pacman/logic/actors/GhostModel';
import {
	INK,
	IVORY,
	PHASE,
	SCALE,
	drawPretender,
	ellipse,
	glow,
	paintMask,
	traceBody,
	type PretenderOpts
} from '../../../src/games/pacman/render/station/pretender';

type Ctx = CanvasRenderingContext2D;
export type Look = 'a' | 'b' | 'c';
export type CandState = 'hunt' | 'tell' | 'fright' | 'eyes' | 'mimic' | 'rage';

const TAU = Math.PI * 2;
const CALM = 1.075;
const LIME = '170, 255, 70';
const LIME_HOT = '226, 255, 160';
const KIND_RGB: Record<GhostKind, string> = {
	BLINKY: '238, 92, 84',
	PINKY: '236, 130, 205',
	INKY: '80, 200, 232',
	CLYDE: '243, 160, 70'
};
const FRIGHT_RGB = '96, 120, 255';
const hash = (a: number, b: number) => {
	const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
	return v - Math.floor(v);
};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (e0: number, e1: number, x: number) => {
	const k = clamp((x - e0) / (e1 - e0), 0, 1);
	return k * k * (3 - 2 * k);
};

function stroke(c: Ctx, color: string, w: number): void {
	c.strokeStyle = color;
	c.lineWidth = w;
	c.lineCap = 'round';
	c.lineJoin = 'round';
	c.stroke();
}

/** Black gloss lit from the upper left; blue in the fright, white in its flash. */
function gloss(c: Ctx, x: number, y: number, r: number, scared: boolean, white: boolean): CanvasGradient {
	const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r * 1.1);
	if (scared) {
		g.addColorStop(0, white ? '#ffffff' : '#8d9fff');
		g.addColorStop(0.5, white ? '#dfe6ff' : '#3a4fd0');
		g.addColorStop(1, white ? '#aebde0' : '#141c60');
	} else {
		g.addColorStop(0, '#4a5260');
		g.addColorStop(0.4, '#171a20');
		g.addColorStop(1, '#040506');
	}
	return g;
}

/** The mask, painted in its kind's colour, hanging back and slipping off the heading. */
function wearMask(c: Ctx, kind: GhostKind, st: 'hunt' | 'tell' | 'fright', o: PretenderOpts, white: boolean, scale = 1): void {
	const tell = st === 'tell';
	const lx = o.faceX;
	const ly = o.faceY;
	const amt = tell ? 2.9 : st === 'hunt' ? 2.0 : 0;
	c.save();
	c.translate(lx * 1.4 - lx * (amt + 1.0), ly * 1.1 - ly * (amt + 0.7) * 0.95);
	c.rotate(-0.085 * (1 - Math.abs(lx)) - lx * (tell ? 0.22 : 0.12) + (st === 'fright' ? Math.sin(o.time * 36) * 0.05 : 0));
	c.scale(scale, scale);
	paintMask(c, st, white, o);
	if (st !== 'fright') {
		// its kind's paint on the mask
		const rgb = KIND_RGB[kind];
		c.save();
		if (kind === 'BLINKY') {
			for (const side of [-1, 1]) {
				c.beginPath();
				c.moveTo(side * 6.6, 1.0);
				c.lineTo(side * 4.8, 5.4);
				stroke(c, `rgba(${rgb}, 0.9)`, 1.1);
				c.beginPath();
				c.moveTo(side * 7.2, 2.4);
				c.lineTo(side * 5.6, 6.2);
				stroke(c, `rgba(${rgb}, 0.9)`, 1.1);
			}
		} else if (kind === 'PINKY') {
			c.fillStyle = `rgba(${rgb}, 0.9)`;
			c.beginPath();
			c.moveTo(0, -1.6);
			c.bezierCurveTo(-1.6, -3.4, -3.2, -1.6, 0, 0.6);
			c.bezierCurveTo(3.2, -1.6, 1.6, -3.4, 0, -1.6);
			c.fill();
			ellipse(c, -5.4, 3.6, 1.9, 1.2, `rgba(${rgb}, 0.6)`);
			ellipse(c, 5.5, 4.2, 1.8, 1.1, `rgba(${rgb}, 0.6)`);
		} else if (kind === 'INKY') {
			for (const [x, y] of [
				[-3.6, 3.2],
				[3.7, 4.0]
			]) {
				c.beginPath();
				c.moveTo(x, y);
				c.quadraticCurveTo(x - 0.4, y + 2, x + 0.2, y + 3.6);
				stroke(c, `rgba(${rgb}, 0.95)`, 1.0);
			}
		} else {
			c.fillStyle = `rgba(${rgb}, 0.9)`;
			c.beginPath();
			c.moveTo(-6.4, -3.0);
			c.quadraticCurveTo(0, -5.2, 6.4, -3.0);
			c.lineTo(6.8, -1.6);
			c.quadraticCurveTo(0, -3.8, -6.8, -1.6);
			c.closePath();
			c.fill();
		}
		c.restore();
	}
	c.restore();
}

/** The lime slit eye peeking on the heading's side, behind the mask. */
function slitEye(c: Ctx, o: PretenderOpts, tell: boolean, y0 = 0.6): void {
	const ex = o.faceX * 6.4;
	const ey = y0 + o.faceY * (o.faceY < 0 ? 5.1 : 6.6);
	const p = tell ? 0.75 + 0.25 * Math.sin((o.time / 1.3) * TAU) : 0.65;
	glow(c, ex, ey, 4.4, `rgba(${LIME_HOT}, ${0.95 * p})`, `rgba(${LIME}, ${0.45 * p})`);
	ellipse(c, ex, ey, tell ? 2.6 : 2.2, tell ? 2.3 : 1.9, `rgb(${LIME})`, 0.7);
	ellipse(c, ex + o.lookX * 0.5, ey + o.lookY * 0.4, 0.5, tell ? 1.8 : 1.5, INK);
}

/** Ivory shards of a burst mask circling the head, behind or before it. */
function shards(c: Ctx, o: PretenderOpts, front: boolean, y0 = -3): void {
	for (let i = 0; i < 5; i++) {
		const a = o.time * 1.6 + (i * TAU) / 5;
		if (Math.sin(a) >= 0 !== front) continue;
		const r = 12.5 + Math.sin(o.time * 3 + i) * 1.2;
		c.save();
		c.translate(Math.cos(a) * r, y0 + Math.sin(a) * r * 0.45);
		c.rotate(o.time * 3 + i * 1.3);
		const z = 1.8 + hash(i, 1) * 1.2;
		c.beginPath();
		c.moveTo(-z, -z * 0.6);
		c.lineTo(z * 0.9, -z * 0.8);
		c.lineTo(z * 0.3, z);
		c.closePath();
		c.fillStyle = IVORY;
		c.fill();
		stroke(c, INK, 0.7);
		c.restore();
	}
}

/** The rage's face of lime: hollow burning sockets and a grin across it, a mouth of bone teeth. */
function limeFace(c: Ctx, o: PretenderOpts, y = -1.0, wide = 9): void {
	c.save();
	c.translate(o.faceX * 1.4, o.faceY * 1.2);
	for (const side of [-1, 1]) {
		c.save();
		c.translate(o.lookX * 0.9, o.lookY * 0.8);
		glow(c, side * 4.2, y - 0.6, 5.2, `rgba(${LIME_HOT}, 0.9)`, `rgba(${LIME}, 0.45)`);
		c.beginPath();
		c.moveTo(side * 1.2, y - 0.2);
		c.lineTo(side * 7.2, y - 3.6);
		c.lineTo(side * 6.4, y + 1.2);
		c.lineTo(side * 1.8, y + 1.6);
		c.closePath();
		c.fillStyle = '#f4ffd8';
		c.fill();
		stroke(c, INK, 1.1);
		ellipse(c, side * 4.4 + o.lookX * 1.2, y + o.lookY * 0.6, 0.5, 1.4, '#1f4a0a');
		c.restore();
	}
	c.restore();
	const chomp = 0.5 + 0.5 * Math.sin(o.time * 10);
	c.save();
	c.translate(o.faceX * 1.2, o.faceY * 1.0);
	const top = y + 4;
	const trace = () => {
		c.beginPath();
		c.moveTo(-wide, top);
		c.quadraticCurveTo(0, top + 2, wide, top);
		c.quadraticCurveTo(0, top + 7.4 + 2.2 * chomp, -wide, top);
		c.closePath();
	};
	trace();
	c.fillStyle = '#0d1a05';
	c.fill();
	c.save();
	trace();
	c.clip();
	glow(c, 0, top + 4.4, 6.5, `rgba(${LIME_HOT}, 0.95)`, `rgba(${LIME}, 0.5)`);
	c.fillStyle = IVORY;
	c.strokeStyle = INK;
	c.lineWidth = 0.5;
	for (let i = 0, x = -wide + 0.6; x <= wide - 0.4; i += 1, x += 1.9) {
		const ty = top + (1 - (x / wide) ** 2) * 1.0;
		c.beginPath();
		c.moveTo(x - 0.95, ty - 0.4);
		c.lineTo(x + 0.1, ty + 2.1 + ((i * 0.618) % 1) * 0.8);
		c.lineTo(x + 0.95, ty - 0.4);
		c.fill();
		c.stroke();
	}
	c.restore();
	trace();
	stroke(c, INK, 1.3);
	c.restore();
}

/** Lime cracks across a black body, burning in the rage, faint seams otherwise. */
function cracks(c: Ctx, o: PretenderOpts, hot: boolean, ph: number): void {
	const paths: ReadonlyArray<ReadonlyArray<[number, number]>> = [
		[
			[-9.4, -1],
			[-6.4, 0.4],
			[-5.6, 3.4],
			[-7.6, 6]
		],
		[
			[9.6, 3.2],
			[6.8, 4.4],
			[6.2, 7.6]
		],
		[
			[1.4, -7.6],
			[0.6, -5.4],
			[2.6, -3.8]
		]
	];
	const p = hot ? 0.8 + 0.2 * Math.sin(o.time * 9 + ph) : 0.35 + 0.25 * Math.sin(o.time * 1.4 + ph);
	for (const path of paths) {
		c.beginPath();
		path.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
		stroke(c, `rgba(${LIME}, ${(hot ? 0.7 : 0.4) * p})`, hot ? 2.8 : 1.6);
		stroke(c, `rgba(${LIME_HOT}, ${p})`, hot ? 1.0 : 0.6);
	}
}

/** Acid dripping off it in the rage. */
function acid(c: Ctx, o: PretenderOpts, ph: number, y0: number): void {
	for (let i = 0; i < 3; i++) {
		const u = (o.time * 1.2 + i / 3 + ph) % 1;
		c.save();
		c.globalAlpha *= 1 - u;
		ellipse(c, (i - 1) * 4.6 + Math.sin(i * 2.3 + ph), y0 + u * 6, 0.9, 1.2, `rgb(${LIME})`);
		c.restore();
	}
}

/** Afterimages along the way it came (the rage's speed). */
function afterimages(c: Ctx, o: PretenderOpts, trace: () => void): void {
	const d = Math.hypot(o.lookX, o.lookY) || 1;
	const bx = -o.lookX / d;
	const by = -o.lookY / d;
	for (let i = 3; i >= 1; i--) {
		c.save();
		c.translate(bx * i * 5.5, by * i * 5.5);
		c.globalAlpha *= 0.26 - i * 0.06;
		trace();
		c.fillStyle = `rgb(${LIME})`;
		c.fill();
		c.restore();
	}
}

// ----------------------------------------------------------------------------- a the host mask

function growthA(c: Ctx, kind: GhostKind, o: PretenderOpts, ext: number, scared: boolean): void {
	const t = o.time;
	const ink = scared ? '#1d2a8a' : '#0a0c10';
	const hi = scared ? 'rgba(200, 210, 255, 0.6)' : 'rgba(200, 215, 235, 0.55)';
	if (kind === 'BLINKY') {
		// mandibles at the sides of the face
		for (const side of [-1, 1]) {
			const open = Math.sin(t * (ext > 1 ? 14 : 2.2)) * 0.12 * ext;
			c.save();
			c.translate(side * 8.2, 4.4);
			c.rotate(side * (0.25 + open));
			c.beginPath();
			c.moveTo(0, -2);
			c.quadraticCurveTo(side * 3.6 * ext, 1.2, side * 0.4, 5.4 * ext);
			c.quadraticCurveTo(side * 1.8, 1.6, 0, 1.4);
			c.closePath();
			c.fillStyle = ink;
			c.fill();
			stroke(c, INK, 0.8);
			c.beginPath();
			c.moveTo(side * 0.8, -1.2);
			c.quadraticCurveTo(side * 3, 1.2, side * 0.6, 4.6 * ext);
			stroke(c, hi, 0.5);
			c.restore();
		}
	} else if (kind === 'PINKY') {
		// a collar of short tendrils round the face
		for (let i = 0; i < 9; i++) {
			const a = Math.PI * (0.95 + (i / 8) * 1.1);
			const w = Math.sin(t * (ext > 1 ? 9 : 3) + i * 1.1) * 0.5;
			const bx = Math.cos(a) * 8.6;
			const by = Math.sin(a) * 8.0 + 2;
			const len = 3.6 * ext;
			c.beginPath();
			c.moveTo(bx, by);
			c.quadraticCurveTo(bx + Math.cos(a + w) * len * 0.7, by + Math.sin(a + w) * len * 0.7, bx + Math.cos(a - w) * len, by + Math.sin(a - w) * len);
			stroke(c, INK, 2.4);
			stroke(c, ink, 1.4);
		}
	} else if (kind === 'INKY') {
		// long feelers trailing back against the heading
		for (const side of [-1, 1]) {
			const back = -o.lookX * 4;
			const w = Math.sin(t * (ext > 1 ? 10 : 2.6) + side) * 1.5;
			const ex = side * 6 + back + w;
			const ey = -14 * Math.min(1.3, ext);
			c.beginPath();
			c.moveTo(side * 3, -7.4);
			c.bezierCurveTo(side * 4, -11, ex - side * 2, ey + 3, ex, ey);
			stroke(c, INK, 1.8);
			stroke(c, ink, 0.9);
			if (!scared) {
				glow(c, ex, ey, 2.4, `rgba(${LIME_HOT}, 0.9)`, `rgba(${LIME}, 0.35)`);
				ellipse(c, ex, ey, 0.8, 0.8, `rgb(${LIME_HOT})`);
			}
		}
	} else {
		// a row of spines along its back
		for (let i = 0; i < 5; i++) {
			const a = Math.PI * (1.18 + i * 0.16);
			const bx = Math.cos(a) * 9.2;
			const by = Math.sin(a) * 8.6 + 1.6;
			const len = (4.2 + (i % 2) * 1.2) * (scared ? 0.5 : ext);
			const tx = bx + Math.cos(a) * len;
			const ty = by + Math.sin(a) * len;
			const ex = -Math.sin(a) * 1.5;
			const ey = Math.cos(a) * 1.5;
			c.beginPath();
			c.moveTo(bx + ex, by + ey);
			c.lineTo(tx, ty);
			c.lineTo(bx - ex, by - ey);
			c.closePath();
			c.fillStyle = ink;
			c.fill();
			stroke(c, INK, 0.7);
		}
	}
}

function fringe(c: Ctx, o: PretenderOpts, scared: boolean, ph: number, k: number): void {
	for (let i = 0; i < 7; i++) {
		const x = -7.2 + i * 2.4;
		const w = Math.sin(o.step * 1.6 + o.time * 2 + i * 0.9 + ph) * 1.2 * (1 - k);
		c.beginPath();
		c.moveTo(x, 7.4);
		c.quadraticCurveTo(x + w, 10, x - w * 0.6, 12.2 - Math.abs(w) * 0.4 - k * 3);
		stroke(c, INK, 2.2);
		stroke(c, scared ? '#2a3cb8' : '#0e1014', 1.3);
	}
}

function bodyA(c: Ctx, kind: GhostKind, st: CandState, o: PretenderOpts, scared: boolean, white: boolean, k: number): void {
	const ph = PHASE[kind];
	const rage = st === 'rage';
	const tell = st === 'tell';
	if (rage) {
		afterimages(c, o, () => traceBody(c));
		shards(c, o, false);
	}
	fringe(c, o, scared, ph, k);
	growthA(c, kind, o, rage ? 1.5 : tell ? 1.25 : 1, scared);
	traceBody(c);
	stroke(c, INK, 3.0);
	c.fillStyle = gloss(c, 0, 1.6, 10, scared, white);
	traceBody(c);
	c.fill();
	c.save();
	traceBody(c);
	c.clip();
	if (!scared) cracks(c, o, rage, ph);
	c.restore();
	c.beginPath();
	c.ellipse(0, 1.6, 8.8, 8.0, 0, Math.PI * 1.05, Math.PI * 1.5);
	stroke(c, scared ? 'rgba(220, 230, 255, 0.6)' : 'rgba(210, 225, 245, 0.6)', 1.0);
	ellipse(c, -5.2, -3.4, 1.6, 0.9, 'rgba(235, 240, 255, 0.7)');
	if (rage) {
		limeFace(c, o);
		acid(c, o, ph, 10);
		shards(c, o, true);
		return;
	}
	if (!scared && k < 0.999) slitEye(c, o, tell);
	wearMask(c, kind, scared ? 'fright' : tell ? 'tell' : 'hunt', o, white);
}

// ---------------------------------------------------------------------------------- b the larva

/** The larva's rings, bottom to top: their centres, radii and a wave running up them. */
function rings(o: PretenderOpts, ph: number, swell: number, k: number) {
	const base = [
		{ y: 6.6, rx: 9.6, ry: 4.4 },
		{ y: 1.6, rx: 9.2, ry: 4.4 },
		{ y: -3.8, rx: 8.4, ry: 5.2 }
	];
	return base.map((r, i) => {
		const w = Math.sin(o.step * 1.7 + o.time * 1.5 - i * 1.3 + ph) * (1 - k);
		return { y: r.y - w * 0.5 - (swell - 1) * (1 - i) * 1.5, rx: r.rx * (1 + w * 0.04) * swell, ry: r.ry * (1 - w * 0.05) * swell };
	});
}

function tailB(c: Ctx, kind: GhostKind, o: PretenderOpts, scared: boolean): void {
	const ink = scared ? '#1d2a8a' : '#0a0c10';
	const t = o.time;
	if (kind === 'BLINKY') {
		for (const side of [-1, 1]) {
			c.beginPath();
			c.moveTo(side * 7, 8.4);
			c.quadraticCurveTo(side * 11, 10, side * 10.6, 13.4);
			c.quadraticCurveTo(side * 8.8, 11, side * 5, 10.4);
			c.closePath();
			c.fillStyle = ink;
			c.fill();
			stroke(c, INK, 0.8);
		}
	} else if (kind === 'PINKY') {
		for (let i = -2; i <= 2; i++) {
			const w = Math.sin(t * 3 + i) * 0.4;
			c.beginPath();
			c.moveTo(i * 2.2, 10.2);
			c.quadraticCurveTo(i * 3 + w, 13, i * 3.6 + w * 2, 14.4);
			stroke(c, INK, 2.2);
			stroke(c, ink, 1.2);
		}
	} else if (kind === 'INKY') {
		const side = o.faceX > 0.1 ? -1 : 1;
		const w = Math.sin(t * 2.4) * 1.5;
		c.beginPath();
		c.moveTo(side * 4, 9.6);
		c.bezierCurveTo(side * 10, 12 + w, side * 13, 6, side * 12 + w, 2);
		stroke(c, INK, 2.4);
		stroke(c, ink, 1.4);
	} else {
		for (const x of [-5, 0, 5]) {
			ellipse(c, x, 10.4, 2.0, 1.6, ink, 0.8);
		}
	}
}

function bodyB(c: Ctx, kind: GhostKind, st: CandState, o: PretenderOpts, scared: boolean, white: boolean, k: number): void {
	const ph = PHASE[kind];
	const rage = st === 'rage';
	const tell = st === 'tell';
	const rs = rings(o, ph, rage ? 1.06 + 0.03 * Math.sin(o.time * 9 + ph) : 1, k);
	const silhouette = () => {
		c.beginPath();
		for (const r of rs) {
			c.moveTo(r.rx, r.y);
			c.ellipse(0, r.y, r.rx, r.ry, 0, 0, TAU);
		}
	};
	if (rage) {
		afterimages(c, o, silhouette);
		shards(c, o, false, -5);
	}
	tailB(c, kind, o, scared);
	// the rings, bottom first; the lime between them
	rs.forEach((r, i) => {
		c.beginPath();
		c.ellipse(0, r.y, r.rx, r.ry, 0, 0, TAU);
		stroke(c, INK, 2.6);
		c.fillStyle = gloss(c, 0, r.y, Math.max(r.rx, r.ry), scared, white);
		c.fill();
		c.beginPath();
		c.ellipse(0, r.y, r.rx * 0.86, r.ry * 0.7, 0, Math.PI * 1.08, Math.PI * 1.55);
		stroke(c, 'rgba(210, 225, 245, 0.55)', 0.9);
		if (i < rs.length - 1 && !scared) {
			// the seam over this ring's top, glowing
			const p = rage ? 0.95 : tell ? 0.7 + 0.3 * Math.sin((o.time / 1.3) * TAU) : 0.45 + 0.25 * Math.sin(o.time * 2 - i + ph);
			c.beginPath();
			c.ellipse(0, r.y - r.ry * 0.55, r.rx * 0.82, r.ry * 0.36, 0, Math.PI * 1.08, Math.PI * 1.92);
			stroke(c, `rgba(${LIME}, ${0.55 * p})`, rage ? 2.8 : 1.8);
			stroke(c, `rgba(${LIME_HOT}, ${p})`, rage ? 1.1 : 0.7);
		}
	});
	const head = rs[2];
	c.save();
	c.translate(0, head.y + 0.6);
	if (rage) {
		limeFace(c, o, -1.2, 8);
		c.restore();
		acid(c, o, ph, 11);
		shards(c, o, true, -5);
		return;
	}
	if (!scared && k < 0.999) slitEye(c, o, tell, 0.2);
	wearMask(c, kind, scared ? 'fright' : tell ? 'tell' : 'hunt', o, white, 0.64);
	c.restore();
}

// -------------------------------------------------------------------------------- c the clutch

const LARVAE: Record<GhostKind, { n: number; size: number }> = {
	BLINKY: { n: 2, size: 1.35 },
	PINKY: { n: 4, size: 0.95 },
	INKY: { n: 5, size: 0.8 },
	CLYDE: { n: 3, size: 1.15 }
};

function traceSac(c: Ctx, o: PretenderOpts, ph: number, torn: number): void {
	c.beginPath();
	for (let i = 0; i <= 40; i++) {
		const a = (i / 40) * TAU;
		const bump = Math.max(0, Math.sin(a * 3 + o.time * 1.7 + ph)) ** 3 * 0.9 + Math.sin(a * 5 - o.time * 2.3) * 0.25;
		let r = 9.8 + bump;
		// the rage tears its top open
		if (torn > 0) {
			const top = Math.max(0, -Math.sin(a));
			r -= top ** 3 * 4.5 * torn;
		}
		const x = Math.cos(a) * r;
		const y = Math.sin(a) * r * 0.95 + 1.4;
		if (i === 0) c.moveTo(x, y);
		else c.lineTo(x, y);
	}
	c.closePath();
}

function larva(c: Ctx, x: number, y: number, s: number, a: number, rage: boolean): void {
	c.save();
	c.translate(x, y);
	c.rotate(a);
	c.scale(s, s);
	glow(c, 0, 0, 4.2, `rgba(${LIME}, ${rage ? 0.8 : 0.5})`, `rgba(${LIME}, 0.15)`);
	c.beginPath();
	c.arc(0, 0, 2.1, -0.4, Math.PI * 1.4);
	stroke(c, `rgb(${rage ? LIME_HOT : LIME})`, 1.7);
	ellipse(c, Math.cos(-0.4) * 2.1, Math.sin(-0.4) * 2.1, 1.2, 1.1, `rgb(${LIME_HOT})`);
	ellipse(c, Math.cos(-0.4) * 2.1 + 0.3, Math.sin(-0.4) * 2.1 - 0.2, 0.3, 0.3, INK);
	c.restore();
}

function bodyC(c: Ctx, kind: GhostKind, st: CandState, o: PretenderOpts, scared: boolean, white: boolean, k: number): void {
	const ph = PHASE[kind];
	const rage = st === 'rage';
	const tell = st === 'tell';
	const torn = rage ? 1 : 0;
	if (rage) {
		afterimages(c, o, () => traceSac(c, o, ph, 1));
		shards(c, o, false);
	}
	traceSac(c, o, ph, torn);
	stroke(c, INK, 3.0);
	c.fillStyle = gloss(c, 0, 1.4, 10.5, scared, white);
	traceSac(c, o, ph, torn);
	c.fill();
	c.save();
	traceSac(c, o, ph, torn);
	c.clip();
	// the larvae inside, pushing at the membrane
	const L = LARVAE[kind];
	if (!scared) {
		for (let i = 0; i < L.n; i++) {
			const a0 = (i / L.n) * TAU + o.time * (rage ? 1.6 : tell ? 1.2 : 0.35) + ph;
			const rr = 4.4 + Math.sin(o.time * 0.9 + i) * 0.8;
			larva(
				c,
				Math.cos(a0) * rr,
				4.2 + Math.sin(a0) * rr * 0.55,
				L.size * (rage ? 1.15 : 1),
				a0 + o.time * (tell || rage ? 3 : 0.6),
				rage
			);
		}
	}
	// the membrane's black veins over them
	for (let i = 0; i < 4; i++) {
		const a = i * 1.6 + ph;
		c.beginPath();
		c.moveTo(Math.cos(a) * 10, Math.sin(a) * 10 + 1.4);
		c.quadraticCurveTo(Math.cos(a + 0.4) * 5, Math.sin(a + 0.4) * 5, Math.cos(a + 0.9) * 2, Math.sin(a + 0.9) * 2 + 1.4);
		stroke(c, scared ? 'rgba(20, 30, 120, 0.7)' : 'rgba(2, 3, 4, 0.75)', 1.0);
	}
	c.restore();
	c.beginPath();
	c.ellipse(0, 1.4, 8.6, 8.2, 0, Math.PI * 1.05, Math.PI * 1.5);
	stroke(c, 'rgba(210, 225, 245, 0.6)', 1.0);
	ellipse(c, -5.4, -3.6, 1.5, 0.8, 'rgba(235, 240, 255, 0.7)');
	if (rage) {
		// out of the tear at its top the larvae writhe, the lime pours
		for (let i = 0; i < 3; i++) {
			const w = Math.sin(o.time * 8 + i * 2) * 0.6;
			larva(c, (i - 1) * 3.4, -7.4 + Math.abs(i - 1) * 1.2, 1.1, -Math.PI / 2 + w, true);
		}
		limeFace(c, o, 0.4, 7.5);
		acid(c, o, ph, 11);
		shards(c, o, true);
		return;
	}
	// the mask stuck high on its front, the larvae showing below it
	c.save();
	c.translate(0, -3.2);
	if (!scared && k < 0.999) slitEye(c, o, tell, -0.6);
	wearMask(c, kind, scared ? 'fright' : tell ? 'tell' : 'hunt', o, white, 0.62);
	c.restore();
}

// ---------------------------------------------------------------------------------- the walker

function walker(c: Ctx, kind: GhostKind, v: Look, st: CandState, o: PretenderOpts, unit: number, k: number): void {
	const ph = PHASE[kind];
	c.scale(unit * SCALE * (st === 'rage' ? 0.97 : CALM), unit * SCALE * (st === 'rage' ? 0.97 : CALM));
	const scared = st === 'fright';
	const white = scared && Boolean(o.white);
	if (scared && !o.flashing) c.translate(Math.sin(o.time * 38 + ph) * 0.4, 0);
	if (st === 'rage') c.translate(Math.sin(o.time * 47 + ph) * 0.3, 0);
	// no feet: a slow hover and a soft breath (the larva walks by its rings)
	c.translate(0, Math.sin(o.time * 2.4 + ph) * 0.4 * (1 - k) - 0.6);
	const breath = Math.sin(o.time * 2.2 + ph);
	c.scale(1 + 0.02 * breath, 1 - 0.02 * breath);
	if (v === 'a') bodyA(c, kind, st, o, scared, white, k);
	else if (v === 'b') bodyB(c, kind, st, o, scared, white, k);
	else bodyC(c, kind, st, o, scared, white, k);
}

function halo(c: Ctx, x: number, y: number, tile: number, rgb: string, a: number): void {
	if (a <= 0.01) return;
	const r = tile * 0.8;
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

/** A parasite candidate at (x, y), `tile` the tile's size in px. */
export function drawParasite(
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
		halo(c, x, y, tile, KIND_RGB[kind], 0.3 * (1 - k));
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
	const rgb = st === 'fright' ? FRIGHT_RGB : st === 'rage' ? LIME : KIND_RGB[kind];
	halo(c, x, y, tile, rgb, st === 'rage' ? 0.42 : 0.34);
	c.save();
	c.translate(x, y);
	walker(c, kind, v, st, o, unit, 0);
	c.restore();
}
