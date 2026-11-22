// The boss's dash as a transformation (the owner's brief): not a trail behind the body, the body
// itself becomes something else for the run and comes back at the stop.
//   A  fire tornado, seen from above: the body twists into a turning spiral with arms; his face
//      stays in the calm eye of the storm, so the eyes still show where he goes
//      A1 flame arms: three thick arms of flame and soot; behind, a smoke wake with a hot core,
//         embers thrown off the arms that cool to ash, soot on the floor
//      A2 ash hurricane: six thin bands of ash lit from inside round an eye wall of fire; behind,
//         a street of smoke curls shed left and right, like a real vortex street
//   B  meteor / lava ball: the body shrinks into a red-hot ball that rolls (its cracks roll with
//      it), and lays a lava track that cools white, orange, red, a dark crust, and is gone
//      B1 lava ball: crust with a net of glowing cracks; a wide lava track, the crust cracking
//      B2 meteor: obsidian with a few deep seams and a fire bow on the front; a molten groove whose
//         edges set first, spatter thrown aside
// The rounds go: crouch (the game's telegraph), the turn (its last 0.25 s), the run, the return
// at the stop (0.28 s), steam that spreads flat over the floor (seen from above, nothing rises).
// Every trail is `ribbon` (trail.ts): width and alpha go to 0 at both ends, and it fades on its
// own after the stop. The phases' iron stays: A wears it on the face in the eye; B as the ball's
// axle studs (bone, then iron) and, from phase 2, an iron hoop round the ball like a tyre.
// Hell rules: nothing flashes (turns under ~1 rev/s, arms pass a point under 3 times a second),
// nothing bright jumps forward (the hot parts are small, additive light is low), few bold parts.
import { HellBlinkyView } from '../../../src/games/pacman/render/doom/HellBlinkyView';
import type { BossSnapshot } from '../../../src/games/pacman/render/doom/HellBlinkyView';
import { INK, drawEyes, drawHorns, lightGlow } from '../../../src/games/pacman/render/doom/hellGhost';
import type { GhostShape, HornStyle } from '../../../src/games/pacman/render/doom/hellGhost';
import { IRON_HORN, drawHelm } from '../../../src/games/pacman/render/doom/bossArmor';
import type { GridLayout } from '../../../src/games/pacman/render/maze/GridView';
import type { Beat, Round } from './script';
import { beat, timing } from './script';
import type { RibbonPoint, Sample, TrailSpec } from '../common/trail';
import { hash, motes, ribbon, sampleGrid, smoothstep } from '../common/trail';

export type Variant = 'now' | 'A1' | 'A2' | 'B1' | 'B2';
export const VARIANTS: ReadonlyArray<{ id: Variant; name: string }> = [
	{ id: 'now', name: 'сейчас' },
	{ id: 'A1', name: 'A1 огненный смерч' },
	{ id: 'A2', name: 'A2 пепельный ураган' },
	{ id: 'B1', name: 'B1 лавовый шар' },
	{ id: 'B2', name: 'B2 метеор' }
];

const TAU = Math.PI * 2;
type RGB = readonly [number, number, number];
const BONE: readonly [string, string] = ['#f1e4cc', '#9c8a72'];
const HORNS: readonly HornStyle[] = [
	{ length: 0.4, curl: 0, bone: BONE, ember: null },
	{ length: 0.5, curl: 0.15, bone: BONE, ember: null },
	{ length: 0.85, curl: 0.4, bone: IRON_HORN, ember: null }
];
const RED = { light: '#f4604e', mid: '#d0261f', shade: '#7a0c14', rim: '#ffc9a8' };

const rgba = (c: RGB, a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
function ramp(stops: ReadonlyArray<readonly [number, RGB]>, k: number): RGB {
	if (k <= stops[0][0]) return stops[0][1];
	for (let i = 1; i < stops.length; i += 1) {
		const [k1, c1] = stops[i];
		const [k0, c0] = stops[i - 1];
		if (k <= k1) {
			const f = (k - k0) / (k1 - k0);
			return [c0[0] + (c1[0] - c0[0]) * f, c0[1] + (c1[1] - c0[1]) * f, c0[2] + (c1[2] - c0[2]) * f];
		}
	}
	return stops[stops.length - 1][1];
}

/**
 * Fills a ribbon: the outline at ±w, the colour and alpha from `color` at each point laid along
 * the trail as a gradient (the dash is a straight line, so a linear gradient follows it exactly).
 */
function fillRibbon(c: CanvasRenderingContext2D, pts: readonly RibbonPoint[], color: (p: RibbonPoint) => string, wk = 1, wob?: (p: RibbonPoint) => number): void {
	if (pts.length < 2) return;
	const w = (p: RibbonPoint) => p.w * wk * (wob ? wob(p) : 1);
	c.beginPath();
	c.moveTo(pts[0].x + pts[0].nx * w(pts[0]), pts[0].y + pts[0].ny * w(pts[0]));
	for (const p of pts) c.lineTo(p.x + p.nx * w(p), p.y + p.ny * w(p));
	for (let i = pts.length - 1; i >= 0; i -= 1) {
		const p = pts[i];
		c.lineTo(p.x - p.nx * w(p), p.y - p.ny * w(p));
	}
	c.closePath();
	const a = pts[0];
	const b = pts[pts.length - 1];
	if (Math.hypot(b.x - a.x, b.y - a.y) < 0.5) return;
	const g = c.createLinearGradient(a.x, a.y, b.x, b.y);
	const step = Math.max(1, Math.floor(pts.length / 40));
	let last = -1;
	for (let i = 0; i < pts.length; i += step) {
		if (pts[i].u <= last) continue;
		g.addColorStop(pts[i].u, color(pts[i]));
		last = pts[i].u;
	}
	g.addColorStop(1, color(b));
	c.fillStyle = g;
	c.fill();
}

// ---------------------------------------------------------------------------- the body

const spriteView = new HellBlinkyView();
let sprite: HTMLCanvasElement | null = null;

/** The game's own body (no effects), drawn into a 3-tile sprite at the context's scale. */
function bodySprite(c: CanvasRenderingContext2D, snap: BossSnapshot, S: number, time: number): { img: HTMLCanvasElement; half: number } {
	const k = Math.max(1, c.getTransform().a);
	const half = S * 1.5;
	const px = Math.ceil(half * 2 * k);
	sprite ??= document.createElement('canvas');
	if (sprite.width !== px) {
		sprite.width = px;
		sprite.height = px;
	}
	const g = sprite.getContext('2d') as CanvasRenderingContext2D;
	g.setTransform(1, 0, 0, 1, 0, 0);
	g.clearRect(0, 0, px, px);
	g.setTransform(k, 0, 0, k, 0, 0);
	spriteView.draw(g, { ...snap, x: 1.5, y: 1.5 }, { tileSize: S, offsetX: 0, offsetY: 0 }, time, true);
	return { img: sprite, half };
}

/** The body twisting into the whirl: rings of the sprite turned more the nearer the centre. */
function twistedBody(c: CanvasRenderingContext2D, img: HTMLCanvasElement, half: number, x: number, y: number, m: number, S: number): void {
	const K = 9;
	const Rm = S * 0.62;
	const shrink = 1 - 0.35 * m;
	c.save();
	c.globalAlpha *= Math.pow(1 - m, 0.8);
	for (let i = 0; i < K; i += 1) {
		const r0 = (i / K) * Rm;
		const r1 = i === K - 1 ? half * 2 : ((i + 1) / K) * Rm;
		c.save();
		c.beginPath();
		c.arc(x, y, r1, 0, TAU);
		if (r0 > 0) c.arc(x, y, r0, TAU, 0, true);
		c.clip();
		c.translate(x, y);
		c.rotate(-m * 2.6 * (1 - i / K));
		c.scale(shrink, shrink);
		c.drawImage(img, -half, -half, half * 2, half * 2);
		c.restore();
	}
	c.restore();
}

/** The body shrinking into the ball: smaller, darker, hotter in the middle. */
function shrunkBody(c: CanvasRenderingContext2D, img: HTMLCanvasElement, half: number, x: number, y: number, m: number): void {
	c.save();
	c.globalAlpha *= Math.pow(1 - m, 0.7);
	c.translate(x, y);
	const k = 1 - 0.4 * m;
	c.scale(k, k);
	c.drawImage(img, -half, -half, half * 2, half * 2);
	c.globalCompositeOperation = 'source-atop';
	c.fillStyle = `rgba(40,6,4,${0.7 * m})`;
	c.fillRect(-half, -half, half * 2, half * 2);
	c.restore();
}

/** The face that rides in the eye of the storm: a small red head with his eyes and his phase's iron. */
function stormFace(c: CanvasRenderingContext2D, x: number, y: number, S: number, phase: number, look: number, k: number, time: number): void {
	const w = S * 0.2;
	const shape: GhostShape = { w, domeY: 0, hem: w, feet: 4, torn: 0, seed: 7 };
	c.save();
	c.globalAlpha *= k;
	c.translate(x, y);
	const h = HORNS[phase - 1];
	drawHorns(c, 0, 0, shape, 0.6, { ...h, length: h.length * 0.72, ember: '255,110,40' }, 0.5);
	const g = c.createRadialGradient(-w * 0.3, -w * 0.35, w * 0.1, 0, 0, w);
	g.addColorStop(0, RED.light);
	g.addColorStop(0.55, RED.mid);
	g.addColorStop(1, RED.shade);
	c.fillStyle = g;
	c.beginPath();
	c.arc(0, 0, w, 0, TAU);
	c.fill();
	if (phase >= 2) {
		c.save();
		c.beginPath();
		c.arc(0, 0, w, 0, TAU);
		c.clip();
		drawHelm(c, { ...shape, domeY: -w * 0.05 });
		c.restore();
	}
	c.lineWidth = Math.max(1.4, w * 0.16);
	c.strokeStyle = INK;
	c.beginPath();
	c.arc(0, 0, w, 0, TAU);
	c.stroke();
	drawEyes(c, 0, w * 0.22, w * 1.05, look, { sclera: '#ffffff', glow: '255,110,40' }, 1, false, time);
	c.restore();
}

// ------------------------------------------------------------------------ A: the tornado

interface Arm {
	readonly n: number;
	readonly sweep: number;
	readonly width: number;
	readonly inner: number;
	readonly spin: number;
}
const A1_ARMS: Arm = { n: 3, sweep: 2.1, width: 0.27, inner: 0.36, spin: -4.6 };
const A2_ARMS: Arm = { n: 5, sweep: 2.9, width: 0.13, inner: 0.5, spin: -3.3 };

/** One spiral arm as a closed path: wide at its root by the eye, tapering to nothing at its tip. */
function armPath(c: CanvasRenderingContext2D, x: number, y: number, R: number, a0: number, arm: Arm, wk: number, lean: { x: number; y: number }, s1 = 1): void {
	const N = 22;
	const left: Array<[number, number]> = [];
	const right: Array<[number, number]> = [];
	for (let j = 0; j <= N; j += 1) {
		const s = (j / N) * s1;
		const r = R * (arm.inner + (1 - arm.inner) * s);
		const a = a0 + arm.sweep * s;
		const px = x + Math.cos(a) * r + lean.x * s * s;
		const py = y + Math.sin(a) * r + lean.y * s * s;
		// tangent of the spiral, roughly: the normal is the radius
		const w = R * arm.width * wk * Math.pow(1 - s / s1, 0.9) * smoothstep(0, 0.12, s);
		left.push([px + Math.cos(a) * w, py + Math.sin(a) * w]);
		right.push([px - Math.cos(a) * w, py - Math.sin(a) * w]);
	}
	c.beginPath();
	c.moveTo(left[0][0], left[0][1]);
	for (const p of left) c.lineTo(p[0], p[1]);
	for (let j = right.length - 1; j >= 0; j -= 1) c.lineTo(right[j][0], right[j][1]);
	c.closePath();
}

function tornado(c: CanvasRenderingContext2D, v: 'A1' | 'A2', x: number, y: number, S: number, m: number, heading: number, moving: number, phase: number, time: number): void {
	const arm = v === 'A1' ? A1_ARMS : A2_ARMS;
	const R = S * 0.47 * (0.55 + 0.45 * m);
	// running, the outer turns are dragged back: the whirl leans into a drop behind him
	const lean = { x: -Math.cos(heading) * S * 0.22 * moving, y: -Math.sin(heading) * S * 0.22 * moving };
	const spin = time * arm.spin;
	c.save();
	c.globalAlpha *= smoothstep(0, 0.6, m);
	// the whirl's dark body (soot), not a bright disc
	const g = c.createRadialGradient(x, y, R * 0.15, x + lean.x * 0.4, y + lean.y * 0.4, R * 1.08);
	g.addColorStop(0, 'rgba(20,6,6,0.75)');
	g.addColorStop(0.7, 'rgba(34,14,12,0.55)');
	g.addColorStop(1, 'rgba(34,14,12,0)');
	c.fillStyle = g;
	c.beginPath();
	c.arc(x + lean.x * 0.4, y + lean.y * 0.4, R * 1.08, 0, TAU);
	c.fill();
	const wk = 0.4 + 0.6 * m;
	const angles = Array.from({ length: arm.n }, (_, i) => spin + (i / arm.n) * TAU);
	if (v === 'A1') {
		// soot under every arm first (the ink of the cel look), then the flame, then the hot core
		for (const a0 of angles) {
			armPath(c, x, y, R * 1.04, a0 - 0.04, arm, wk * 1.45, lean);
			c.fillStyle = 'rgba(26,6,6,0.92)';
			c.fill();
		}
		for (const a0 of angles) {
			armPath(c, x, y, R, a0, arm, wk, lean, 0.94);
			c.fillStyle = 'rgb(200,58,20)';
			c.fill();
			armPath(c, x, y, R * 0.98, a0 + 0.06, arm, wk * 0.55, lean, 0.7);
			c.fillStyle = 'rgb(250,140,50)';
			c.fill();
			armPath(c, x, y, R * 0.96, a0 + 0.1, arm, wk * 0.2, lean, 0.42);
			c.fillStyle = 'rgb(255,224,160)';
			c.fill();
		}
	} else {
		for (const a0 of angles) {
			armPath(c, x, y, R * 1.04, a0 - 0.05, arm, wk * 1.5, lean);
			c.fillStyle = 'rgba(22,10,10,0.85)';
			c.fill();
		}
		angles.forEach((a0, i) => {
			// ash bands lit from inside: grey ash, an ember edge on the inner side
			armPath(c, x, y, R * 1.02, a0, arm, wk * 1.15, lean);
			c.fillStyle = i % 2 ? 'rgb(112,96,90)' : 'rgb(84,70,66)';
			c.fill();
			armPath(c, x, y, R * 0.96, a0 - 0.08, arm, wk * 0.42, lean, 0.75);
			c.fillStyle = 'rgb(236,104,36)';
			c.fill();
		});
	}
	if (v === 'A2') {
		// the eye wall: a ring of fire round the calm eye
		c.lineWidth = S * 0.075;
		c.strokeStyle = 'rgb(206,62,20)';
		c.beginPath();
		c.arc(x, y, S * 0.27, 0, TAU);
		c.stroke();
		c.lineWidth = S * 0.025;
		c.strokeStyle = 'rgb(255,214,140)';
		c.beginPath();
		c.arc(x, y, S * 0.27, 0, TAU);
		c.stroke();
	}
	// motes spun off the arms: embers that cool to ash on the way out, fading in and out
	const nm = v === 'A1' ? 10 : 7;
	for (let i = 0; i < nm; i += 1) {
		const q = (time * 0.9 + hash(i, 3)) % 1;
		const a = spin * 0.8 + hash(i, 4) * TAU + q * 1.6;
		const r = R * (0.35 + 0.75 * q);
		const px = x + Math.cos(a) * r + lean.x * q * q * 1.6;
		const py = y + Math.sin(a) * r + lean.y * q * q * 1.6;
		const al = Math.sin(Math.PI * q);
		const col = ramp([[0, [255, 220, 140]], [0.45, [240, 110, 40]], [1, [120, 104, 98]]], q);
		c.fillStyle = rgba(col, al * 0.9);
		const s = S * (0.05 - 0.02 * q);
		c.fillRect(px - s / 2, py - s / 2, s, s);
	}
	c.restore();
	// the face in the eye, steady (it does not turn with the storm)
	stormFace(c, x, y, S, phase, heading, smoothstep(0.35, 0.9, m), time);
}

// ------------------------------------------------------------------------ B: the ball

/** The crack net: points on a sphere, each tied to its two nearest, as arcs of 6 steps. */
function crackNet(n: number, seed: number): Array<Array<[number, number, number]>> {
	const pts: Array<[number, number, number]> = [];
	for (let i = 0; i < n; i += 1) {
		const z = 1 - (2 * (i + 0.5)) / n;
		const r = Math.sqrt(1 - z * z);
		const a = i * 2.39996 + hash(i, seed) * 0.9;
		pts.push([Math.cos(a) * r, Math.sin(a) * r, z]);
	}
	const seen = new Set<string>();
	const arcs: Array<Array<[number, number, number]>> = [];
	pts.forEach((p, i) => {
		const near = pts
			.map((q, j) => ({ j, d: (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2 }))
			.filter((e) => e.j !== i)
			.sort((a, b) => a.d - b.d)
			.slice(0, 2);
		for (const { j } of near) {
			const key = i < j ? `${i}-${j}` : `${j}-${i}`;
			if (seen.has(key)) continue;
			seen.add(key);
			const q = pts[j];
			const arc: Array<[number, number, number]> = [];
			for (let s = 0; s <= 6; s += 1) {
				const f = s / 6;
				// a jag across the arc, then back on the sphere
				const jag = (hash(i * 31 + j, s) - 0.5) * 0.12 * Math.sin(Math.PI * f);
				const x = p[0] + (q[0] - p[0]) * f + jag;
				const y = p[1] + (q[1] - p[1]) * f - jag;
				const z = p[2] + (q[2] - p[2]) * f + jag * 0.5;
				const l = Math.hypot(x, y, z);
				arc.push([x / l, y / l, z / l]);
			}
			arcs.push(arc);
		}
	});
	return arcs;
}
const NET_B1 = crackNet(30, 1);
const NET_B2 = crackNet(11, 4);

/** Rolls a point of the ball: about the ground axis across the heading, by `roll` radians. */
function rollPt(p: readonly [number, number, number], heading: number, roll: number): [number, number, number] {
	const kx = -Math.sin(heading);
	const ky = Math.cos(heading);
	const cs = Math.cos(roll);
	const sn = Math.sin(roll);
	const [x, y, z] = p;
	// Rodrigues, k = (kx, ky, 0)
	const kxv = [ky * z, -kx * z, kx * y - ky * x];
	const kd = kx * x + ky * y;
	return [x * cs + kxv[0] * sn + kx * kd * (1 - cs), y * cs + kxv[1] * sn + ky * kd * (1 - cs), z * cs + kxv[2] * sn];
}

function lavaBall(c: CanvasRenderingContext2D, v: 'B1' | 'B2', x: number, y: number, S: number, m: number, heading: number, roll: number, moving: number, phase: number, time: number): void {
	const r = S * (v === 'B1' ? 0.32 : 0.3) * (0.6 + 0.4 * m);
	const hx = Math.cos(heading);
	const hy = Math.sin(heading);
	c.save();
	c.globalAlpha *= smoothstep(0, 0.55, m);
	// B2's fire bow: a flame cap on the front, swept back round the ball (within the corridor)
	if (v === 'B2') {
		const k = 0.35 + 0.65 * moving;
		for (const [wd, col] of [
			[1.0, 'rgba(190,46,14,0.75)'],
			[0.72, 'rgba(255,128,40,0.85)'],
			[0.42, 'rgba(255,226,150,0.9)']
		] as const) {
			c.beginPath();
			const rr = r * (1.08 + 0.32 * wd * k);
			for (let j = 0; j <= 24; j += 1) {
				const a = heading - Math.PI * 0.62 + (j / 24) * Math.PI * 1.24;
				const sway = 1 + 0.06 * Math.sin(time * 5 + j * 0.9);
				c.lineTo(x + Math.cos(a) * rr * sway - hx * r * 0.25 * (1 - Math.cos(a - heading)) * k, y + Math.sin(a) * rr * sway - hy * r * 0.25 * (1 - Math.cos(a - heading)) * k);
			}
			c.lineTo(x - hx * r * 0.2, y - hy * r * 0.2);
			c.closePath();
			c.fillStyle = col;
			c.fill();
		}
	}
	// the crust: dark, warmer on the front where it heats
	const g = c.createRadialGradient(x + hx * r * 0.35, y + hy * r * 0.35, r * 0.1, x, y, r);
	if (v === 'B1') {
		g.addColorStop(0, '#8a2a10');
		g.addColorStop(0.6, '#4a160c');
		g.addColorStop(1, '#260806');
	} else {
		g.addColorStop(0, '#4a2a30');
		g.addColorStop(0.6, '#1e1418');
		g.addColorStop(1, '#0c080a');
	}
	c.fillStyle = g;
	c.beginPath();
	c.arc(x, y, r, 0, TAU);
	c.fill();
	// the cracks roll with the ball; the near half only, fading out towards the limb
	const net = v === 'B1' ? NET_B1 : NET_B2;
	c.save();
	c.beginPath();
	c.arc(x, y, r * 0.98, 0, TAU);
	c.clip();
	c.lineCap = 'round';
	c.lineJoin = 'round';
	const passes: ReadonlyArray<readonly [number, string]> =
		v === 'B1'
			? [
					[0.1, 'rgba(255,90,24,0.55)'],
					[0.045, 'rgba(255,176,70,0.95)'],
					[0.018, 'rgba(255,240,200,0.95)']
				]
			: [
					[0.14, 'rgba(255,80,20,0.5)'],
					[0.06, 'rgba(255,170,60,0.95)'],
					[0.024, 'rgba(255,244,210,1)']
				];
	for (const [wd, col] of passes) {
		c.strokeStyle = col;
		c.lineWidth = Math.max(0.8, S * wd * (0.5 + 0.5 * m));
		for (const arc of net) {
			for (let s = 1; s < arc.length; s += 1) {
				const p = rollPt(arc[s - 1], heading, roll);
				const q = rollPt(arc[s], heading, roll);
				const z = (p[2] + q[2]) / 2;
				if (z <= 0) continue;
				// brighter where the front heats it
				const front = 0.65 + 0.35 * Math.max(0, ((p[0] + q[0]) / 2) * hx + ((p[1] + q[1]) / 2) * hy);
				c.globalAlpha = smoothstep(0, 0.35, z) * front;
				c.beginPath();
				c.moveTo(x + p[0] * r, y + p[1] * r);
				c.lineTo(x + q[0] * r, y + q[1] * r);
				c.stroke();
			}
		}
	}
	c.restore();
	c.globalAlpha = smoothstep(0, 0.55, m);
	// the iron: phase 2+ an iron hoop round the ball along its roll, rivets running on it
	if (phase >= 2) {
		c.save();
		c.beginPath();
		c.arc(x, y, r, 0, TAU);
		c.clip();
		c.translate(x, y);
		c.rotate(heading);
		const hw = r * 0.2;
		const ig = c.createLinearGradient(0, -hw, 0, hw);
		ig.addColorStop(0, '#9a8f94');
		ig.addColorStop(1, '#3a3236');
		c.fillStyle = ig;
		c.fillRect(-r, -hw, r * 2, hw * 2);
		c.strokeStyle = INK;
		c.lineWidth = Math.max(1, S * 0.03);
		c.strokeRect(-r * 1.2, -hw, r * 2.4, hw * 2);
		for (let k = 0; k < 6; k += 1) {
			const a = roll + (k / 6) * TAU;
			const z = Math.cos(a);
			if (z <= 0.05) continue;
			c.globalAlpha = smoothstep(0.05, 0.4, z);
			c.fillStyle = INK;
			c.beginPath();
			c.arc(Math.sin(a) * r, 0, S * 0.03, 0, TAU);
			c.fill();
			c.fillStyle = 'rgba(255,235,215,.75)';
			c.beginPath();
			c.arc(Math.sin(a) * r - S * 0.01, -S * 0.01, S * 0.012, 0, TAU);
			c.fill();
		}
		c.restore();
		c.globalAlpha = smoothstep(0, 0.55, m);
	}
	// the outline, thick and dark: the ball must part from the red floor
	c.strokeStyle = INK;
	c.lineWidth = Math.max(1.6, S * 0.06);
	c.beginPath();
	c.arc(x, y, r, 0, TAU);
	c.stroke();
	// the axle studs: bone horns (phases 1-2) or long iron ones (3), at the ends of the roll axis
	const h = HORNS[phase - 1];
	for (const side of [-1, 1]) {
		const ax = -Math.sin(heading) * side;
		const ay = Math.cos(heading) * side;
		const len = S * [0.1, 0.12, 0.17][phase - 1];
		const bx = x + ax * r * 0.92;
		const by = y + ay * r * 0.92;
		const tx = bx + ax * len - hx * len * 0.5;
		const ty = by + ay * len - hy * len * 0.5;
		const th = S * (phase === 3 ? 0.06 : 0.05);
		c.beginPath();
		c.moveTo(bx - hx * th, by - hy * th);
		c.quadraticCurveTo(bx + ax * len * 0.6 + hx * th * 0.3, by + ay * len * 0.6 + hy * th * 0.3, tx, ty);
		c.quadraticCurveTo(bx + ax * len * 0.4 - hx * th * 0.6, by + ay * len * 0.4 - hy * th * 0.6, bx + hx * th, by + hy * th);
		c.closePath();
		c.fillStyle = h.bone[0];
		c.fill();
		c.lineWidth = Math.max(1, S * 0.03);
		c.strokeStyle = INK;
		c.stroke();
	}
	// the eyes: the ball's face, on its front, upright, looking where it rolls
	drawEyes(c, x + hx * r * 0.18, y + hy * r * 0.18 - r * 0.02, r * 0.78, heading, { sclera: '#fff4d8', glow: '255,110,40' }, 0.9, false, time);
	c.restore();
}

// ----------------------------------------------------------------------- the trails

const A1_SMOKE: TrailSpec = { life: 0.95, width: 0.42, capHead: 0.45, capTail: 0.9 };
const A1_CORE: TrailSpec = { life: 0.38, width: 0.17, capHead: 0.4, capTail: 0.7 };
const A_SOOT: TrailSpec = { life: 1.9, width: 0.3, capHead: 0.5, capTail: 1.1, ageBias: 0.7 };
const B1_LAVA: TrailSpec = { life: 2.7, width: 0.22, capHead: 0.35, capTail: 0.9, ageBias: 0.45 };
const B2_CRUST: TrailSpec = { life: 2.5, width: 0.3, capHead: 0.35, capTail: 1.0, ageBias: 0.5 };
const B2_MELT: TrailSpec = { life: 1.3, width: 0.12, capHead: 0.3, capTail: 0.8, ageBias: 0.8 };

const inPx = (s: TrailSpec, S: number): TrailSpec => ({ ...s, width: s.width * S, capHead: s.capHead * S, capTail: s.capTail * S });

// white only at the very head, orange within a tile or two, then a long red and the dark crust
const LAVA: ReadonlyArray<readonly [number, RGB]> = [
	[0, [255, 236, 180]],
	[0.05, [246, 150, 56]],
	[0.16, [214, 76, 22]],
	[0.55, [140, 32, 14]],
	[1.0, [86, 26, 16]],
	[1.6, [46, 20, 16]],
	[3, [36, 16, 14]]
];
/** A molten edge: the width wobbles with the place on the floor, not with time. */
const melt = (p: RibbonPoint) => 1 + 0.12 * Math.sin(p.x * 0.29 + p.y * 0.29) + 0.07 * Math.sin(p.x * 0.71 + p.y * 0.53 + 1.3);

function floorTrail(c: CanvasRenderingContext2D, v: Variant, samples: Sample[], now: number, S: number): void {
	if (v === 'A1' || v === 'A2') {
		const soot = ribbon(samples, now, inPx(A_SOOT, S));
		fillRibbon(c, soot, (p) => `rgba(10,3,3,${(0.55 * p.a).toFixed(3)})`);
		return;
	}
	if (v === 'B1') {
		const lava = ribbon(samples, now, inPx(B1_LAVA, S));
		// it spreads a little as it cools
		fillRibbon(c, lava, (p) => rgba(ramp(LAVA, p.age), p.a), 1, (p) => melt(p) * (0.85 + 0.25 * smoothstep(0, 1.2, p.age)));
		c.save();
		c.globalCompositeOperation = 'lighter';
		fillRibbon(c, lava, (p) => rgba([255, 100, 30], 0.2 * p.a * (1 - smoothstep(0.05, 0.6, p.age))), 1.6);
		c.restore();
		crustCracks(c, lava, S, 1);
		return;
	}
	if (v === 'B2') {
		const crust = ribbon(samples, now, inPx(B2_CRUST, S));
		fillRibbon(c, crust, (p) => rgba(ramp([[0, [120, 30, 14]], [0.5, [70, 22, 16]], [1.2, [36, 16, 14]]], p.age), 0.9 * p.a), 1, melt);
		const core = ribbon(samples, now, inPx(B2_MELT, S));
		fillRibbon(c, core, (p) => rgba(ramp(LAVA, p.age * 1.3), p.a), 1, melt);
		c.save();
		c.globalCompositeOperation = 'lighter';
		fillRibbon(c, core, (p) => rgba([255, 100, 30], 0.2 * p.a * (1 - smoothstep(0.05, 0.6, p.age))), 2.2);
		c.restore();
		crustCracks(c, crust, S, 2, 0.5, 0.6);
	}
}

/**
 * Seams in the setting crust: an irregular net of plates (never even strokes: hatching is the
 * language of the boss's warnings). Knots sit at seeded places on the floor, two across the track
 * per step along it, and are tied to their neighbours and now and then to the rim, so the crust
 * breaks into uneven plates. The seams glow while the crust is young, then go dark, and their
 * reach follows the track's width, so they vanish with its tapered ends.
 */
function crustCracks(c: CanvasRenderingContext2D, pts: readonly RibbonPoint[], S: number, seed: number, gapTiles = 0.26, heat = 1): void {
	if (pts.length < 3) return;
	const along = (p: { x: number; y: number }, n: RibbonPoint) => -n.ny * p.x + n.nx * p.y;
	const n0 = pts[0];
	const sv = pts.map((p) => along(p, n0));
	const lo = Math.min(...sv);
	const hi = Math.max(...sv);
	/** The track at floor position s: centre, half-width, alpha, age (null outside it). */
	const at = (s: number) => {
		for (let i = 1; i < pts.length; i += 1) {
			const a = sv[i - 1];
			const b = sv[i];
			if ((s - a) * (s - b) > 0) continue;
			const f = b === a ? 0 : (s - a) / (b - a);
			const p = pts[i - 1];
			const q = pts[i];
			const m = (u: number, v: number) => u + (v - u) * f;
			return { x: m(p.x, q.x), y: m(p.y, q.y), w: m(p.w, q.w), a: m(p.a, q.a), age: m(p.age, q.age), nx: q.nx, ny: q.ny };
		}
		return null;
	};
	const gap = S * gapTiles;
	const knot = (k: number, j: number) => {
		const s = (k + 0.5 + (hash(k * 2 + j, seed) - 0.5) * 0.8) * gap;
		const t = at(s);
		if (!t) return null;
		const off = (j ? 1 : -1) * (0.15 + 0.4 * hash(k * 2 + j, seed + 1));
		return { ...t, x: t.x + t.nx * off * t.w, y: t.y + t.ny * off * t.w, off };
	};
	c.save();
	c.lineCap = 'round';
	c.lineJoin = 'round';
	const seam = (p: NonNullable<ReturnType<typeof knot>>, qx: number, qy: number, qa: number, qage: number) => {
		const age = (p.age + qage) / 2;
		const a = Math.min(p.a, qa) * smoothstep(0.35, 0.8, age);
		if (a < 0.02) return;
		const glow = 1 - smoothstep(0.7, 1.7, age);
		const col: RGB = glow > 0.02 ? ramp([[0, [255, 140, 46]], [1, [26, 8, 8]]], 1 - glow * heat) : [20, 8, 8];
		c.strokeStyle = rgba(col, a * (0.55 + 0.45 * glow * heat));
		c.lineWidth = Math.max(0.7, S * (0.018 + 0.012 * glow));
		c.beginPath();
		c.moveTo(p.x, p.y);
		c.lineTo(qx, qy);
		c.stroke();
	};
	for (let k = Math.floor(lo / gap) - 1; k <= Math.ceil(hi / gap); k += 1) {
		const A = knot(k, 0);
		const B = knot(k, 1);
		const A2 = knot(k + 1, 0);
		const B2 = knot(k + 1, 1);
		if (A && B) seam(A, B.x, B.y, B.a, B.age);
		if (A && A2 && hash(k, seed + 2) < 0.65) seam(A, A2.x, A2.y, A2.a, A2.age);
		if (B && B2 && hash(k, seed + 3) < 0.65) seam(B, B2.x, B2.y, B2.a, B2.age);
		if (A && B2 && hash(k, seed + 4) < 0.3) seam(A, B2.x, B2.y, B2.a, B2.age);
		for (const P of [A, B]) {
			if (!P || hash(k * 2 + (P === A ? 0 : 1), seed + 5) > 0.5) continue;
			const sgn = P.off < 0 ? -1 : 1;
			seam(P, P.x + P.nx * sgn * P.w * 0.55, P.y + P.ny * sgn * P.w * 0.55, P.a, P.age);
		}
	}
	c.restore();
}

function airTrail(c: CanvasRenderingContext2D, v: Variant, samples: Sample[], now: number, S: number, time: number): void {
	const step = 1 / 60;
	if (v === 'A1') {
		const smoke = ribbon(samples, now, inPx(A1_SMOKE, S));
		fillRibbon(c, smoke, (p) => rgba(ramp([[0, [70, 30, 22]], [0.6, [60, 48, 44]]], p.age), 0.62 * p.a), 1, (p) => 1 + 0.16 * Math.sin((p.x + p.y) / (S * 0.35) - time * 5));
		const core = ribbon(samples, now, inPx(A1_CORE, S));
		c.save();
		c.globalCompositeOperation = 'lighter';
		fillRibbon(c, core, (p) => rgba(ramp([[0, [255, 190, 90]], [0.3, [220, 70, 20]]], p.age), 0.55 * p.a));
		c.restore();
		emberMotes(c, samples, now, S, 11, 1.0);
		smokePuffs(c, samples, now, S, 21, 1.3, 0.28);
		return;
	}
	if (v === 'A2') {
		const smoke = ribbon(samples, now, inPx({ ...A1_SMOKE, width: 0.2, life: 0.8 }, S));
		fillRibbon(c, smoke, (p) => rgba([66, 52, 48], 0.5 * p.a));
		vortexStreet(c, samples, now, S, step);
		emberMotes(c, samples, now, S, 12, 0.6);
		return;
	}
	if (v === 'B1' || v === 'B2') {
		emberMotes(c, samples, now, S, v === 'B1' ? 13 : 14, v === 'B1' ? 0.6 : 1.1, v === 'B2');
		smokePuffs(c, samples, now, S, 23, 1.6, 0.22);
	}
}

/** Embers thrown off the dash: hot, cooling to ash, fading in and out. */
function emberMotes(c: CanvasRenderingContext2D, samples: Sample[], now: number, S: number, seed: number, amount: number, spatter = false): void {
	const ms = motes(samples, now, { life: spatter ? 1.4 : 0.95, per: Math.round(2 * amount), speed: S * (spatter ? 2.2 : 1.6), drag: spatter ? 4 : 2.2, spread: spatter ? 1.25 : 0.95, seed, step: 1 / 60, every: 2, back: S * 0.3, across: S * 0.42 });
	c.save();
	for (const m of ms) {
		const col = ramp(spatter ? [[0, [255, 214, 120]], [0.3, [240, 90, 30]], [0.6, [90, 26, 16]], [1, [40, 16, 14]]] : [[0, [255, 226, 150]], [0.35, [242, 104, 34]], [1, [110, 98, 92]]], m.k);
		const s = S * (spatter ? 0.07 - 0.02 * m.k : 0.055 - 0.025 * m.k);
		c.fillStyle = rgba(col, m.a * 0.9);
		c.beginPath();
		c.arc(m.x, m.y, s / 2, 0, TAU);
		c.fill();
	}
	c.restore();
}

/** Smoke that spreads flat and thins out (seen from above it grows, it does not rise). */
function smokePuffs(c: CanvasRenderingContext2D, samples: Sample[], now: number, S: number, seed: number, life: number, alpha: number): void {
	const ms = motes(samples, now, { life, per: 1, speed: S * 0.5, drag: 1.5, spread: 1.4, seed, step: 1 / 60, every: 4, back: S * 0.35, across: S * 0.3 });
	c.save();
	for (const m of ms) {
		const r = S * (0.1 + 0.2 * m.k);
		const g = c.createRadialGradient(m.x, m.y, 0, m.x, m.y, r);
		g.addColorStop(0, `rgba(58,48,46,${(alpha * m.a).toFixed(3)})`);
		g.addColorStop(1, 'rgba(58,48,46,0)');
		c.fillStyle = g;
		c.fillRect(m.x - r, m.y - r, r * 2, r * 2);
	}
	c.restore();
}

/** A2's wake: smoke curls shed left and right in turn, each turning its own way, growing, fading. */
function vortexStreet(c: CanvasRenderingContext2D, samples: Sample[], now: number, S: number, step: number): void {
	const sorted = [...samples].sort((p, q) => q.t - p.t);
	c.save();
	c.lineCap = 'round';
	for (let i = 0; i < sorted.length - 1; i += 1) {
		const s = sorted[i];
		const tick = Math.round(s.t / step);
		if (tick % 6 !== 0 || s.emit < 0.05) continue;
		const o = sorted[i + 1];
		const dl = Math.hypot(s.x - o.x, s.y - o.y);
		if (dl < 0.01) continue;
		const age = now - s.t;
		const life = 1.5;
		if (age > life) continue;
		const k = age / life;
		const side = (tick / 6) % 2 ? 1 : -1;
		const nx = -(s.y - o.y) / dl;
		const ny = (s.x - o.x) / dl;
		const cx = s.x + nx * side * S * 0.13;
		const cy = s.y + ny * side * S * 0.13;
		const R = S * (0.1 + 0.17 * smoothstep(0, 1, k));
		const a = s.emit * smoothstep(0, 0.12, k) * (1 - smoothstep(0.35, 1, k));
		const turn = side * (age * 3 + tick * 0.7);
		for (const [lw, col] of [
			[S * 0.11, `rgba(54,42,40,${(0.55 * a).toFixed(3)})`],
			[S * 0.035, `rgba(230,96,36,${(0.6 * a * (1 - smoothstep(0, 0.45, k))).toFixed(3)})`]
		] as const) {
			c.lineWidth = lw * (1 - 0.4 * k);
			c.strokeStyle = col;
			c.beginPath();
			for (let j = 0; j <= 20; j += 1) {
				const f = j / 20;
				const ang = turn + side * f * 1.6 * Math.PI;
				const rr = R * (0.25 + 0.75 * f);
				const px = cx + Math.cos(ang) * rr;
				const py = cy + Math.sin(ang) * rr;
				if (j === 0) c.moveTo(px, py);
				else c.lineTo(px, py);
			}
			c.stroke();
		}
	}
	c.restore();
}

/** Steam the spent body pants out, spreading flat over the floor round him and thinning. */
function steam(c: CanvasRenderingContext2D, x: number, y: number, S: number, since: number, recDur: number, hot: boolean): void {
	if (since < 0) return;
	c.save();
	const N = 16;
	for (let i = 0; i < N; i += 1) {
		const born = (i / N) * recDur * 0.9;
		const age = since - born;
		const life = 0.9 + 0.3 * hash(i, 2);
		if (age < 0 || age > life) continue;
		const k = age / life;
		const ang = hash(i, 1) * TAU;
		const d = S * (0.18 + 0.28 * Math.sqrt(k));
		const px = x + Math.cos(ang) * d + S * 0.12 * k;
		const py = y + Math.sin(ang) * d - S * 0.06 * k;
		const r = S * (0.08 + 0.16 * k);
		const a = smoothstep(0, 0.15, k) * (1 - smoothstep(0.4, 1, k)) * (hot ? 0.5 : 0.42);
		const g = c.createRadialGradient(px, py, 0, px, py, r);
		g.addColorStop(0, `rgba(236,226,216,${a.toFixed(3)})`);
		g.addColorStop(1, 'rgba(236,226,216,0)');
		c.fillStyle = g;
		c.fillRect(px - r, py - r, r * 2, r * 2);
	}
	c.restore();
}

/** The crouch's floor: A an ash swirl starting under him, B the floor glowing and cracking. */
function crouchFloor(c: CanvasRenderingContext2D, v: Variant, x: number, y: number, S: number, k: number, time: number): void {
	if (k <= 0) return;
	c.save();
	if (v === 'A1' || v === 'A2') {
		c.lineCap = 'round';
		for (let i = 0; i < 2; i += 1) {
			c.strokeStyle = `rgba(14,4,4,${(0.5 * k).toFixed(3)})`;
			c.lineWidth = S * 0.07;
			c.beginPath();
			for (let j = 0; j <= 16; j += 1) {
				const f = j / 16;
				const a = -time * 3 + i * Math.PI + f * 2.6;
				const r = S * (0.18 + 0.4 * f) * (0.6 + 0.4 * k);
				if (j === 0) c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
				else c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
			}
			c.stroke();
		}
		// ash drawn in towards him
		for (let i = 0; i < 10; i += 1) {
			const q = (time * 1.2 + hash(i, 1)) % 1;
			const a = hash(i, 2) * TAU - q * 1.4;
			const r = S * (0.62 - 0.45 * q);
			c.fillStyle = `rgba(170,140,126,${(0.75 * k * Math.sin(Math.PI * q)).toFixed(3)})`;
			c.fillRect(x + Math.cos(a) * r - 1.2, y + Math.sin(a) * r - 1.2, 2.4, 2.4);
		}
	} else {
		lightGlow(c, x, y, S * 0.55, '255,90,30', 0.28 * k);
		c.lineCap = 'round';
		for (let i = 0; i < 5; i += 1) {
			const a = hash(i, 5) * TAU;
			const len = S * (0.22 + 0.22 * hash(i, 6)) * smoothstep(0, 0.8, k);
			c.strokeStyle = `rgba(255,150,60,${(0.75 * k).toFixed(3)})`;
			c.lineWidth = Math.max(0.8, S * 0.03);
			c.beginPath();
			c.moveTo(x + Math.cos(a) * S * 0.15, y + Math.sin(a) * S * 0.15);
			c.lineTo(x + Math.cos(a + 0.2) * (S * 0.15 + len * 0.6), y + Math.sin(a + 0.2) * (S * 0.15 + len * 0.6));
			c.lineTo(x + Math.cos(a - 0.05) * (S * 0.15 + len), y + Math.sin(a - 0.05) * (S * 0.15 + len));
			c.stroke();
		}
	}
	c.restore();
}

// -------------------------------------------------------------------------- the frame

export interface Scene {
	readonly layout: GridLayout;
	readonly round: Round;
	readonly variant: Variant;
	readonly phase: number;
	/** Which layers to draw: the body/form, the trails. */
	readonly layers?: { body?: boolean; trail?: boolean; sprite?: boolean };
}

const nowViews = new Map<string, { view: HellBlinkyView; t: number }>();
let dummy: CanvasRenderingContext2D | null = null;

function snapOf(b: Beat, r: Round, phase: number): BossSnapshot {
	const L = r.lane;
	const dir = L.dx > 0 ? 'RIGHT' : L.dx < 0 ? 'LEFT' : L.dy > 0 ? 'DOWN' : 'UP';
	return {
		x: b.x,
		y: b.y,
		phase,
		state: b.state,
		shape: b.shape,
		dir,
		progress: b.progress,
		alpha: 1,
		intro: 1,
		look: Math.atan2(L.dy, L.dx),
		hit: 0,
		echo: false
	};
}

/**
 * The boss and his dash at `time` (the round's own clock). `key` names the slot that keeps the
 * game's current view's state (its skid mark lives in the view), so a contact sheet can jump in
 * time: it is replayed from the round's start.
 */
export function drawScene(c: CanvasRenderingContext2D, sc: Scene, time: number, key = 'live'): void {
	const { layout, round, variant: v, phase } = sc;
	const S = layout.tileSize;
	const px = (x: number) => layout.offsetX + x * S;
	const py = (y: number) => layout.offsetY + y * S;
	const b = beat(round, time);
	const T = timing(round);
	const heading = Math.atan2(round.lane.dy, round.lane.dx);
	const bx = px(b.x);
	const by = py(b.y);
	const showBody = sc.layers?.body ?? true;
	const showTrail = sc.layers?.trail ?? true;
	if (v === 'now') {
		// the game's view as it is (stateful): replay it from the round's start when time jumps
		let slot = nowViews.get(key);
		const tc = ((time % T.cycle) + T.cycle) % T.cycle;
		const t0 = time - tc;
		if (!slot || slot.t > time || time - slot.t > 0.5) {
			slot = { view: new HellBlinkyView(), t: t0 };
			nowViews.set(key, slot);
			dummy ??= document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D;
		}
		while (slot.t < time - 1 / 60) {
			slot.t += 1 / 60;
			slot.view.draw(dummy as CanvasRenderingContext2D, snapOf(beat(round, slot.t), round, phase), layout, slot.t);
		}
		slot.t = time;
		if (showBody) slot.view.draw(c, snapOf(b, round, phase), layout, time);
		return;
	}
	const A = v === 'A1' || v === 'A2';
	const samples = sampleGrid(time, 3.2, 1 / 60, (t) => {
		const q = beat(round, t);
		return { x: px(q.x), y: py(q.y), emit: q.morph };
	});
	if (showTrail) floorTrail(c, v, samples, time, S);
	if (showBody) crouchFloor(c, v, bx, by, S, b.crouch * (1 - b.morph), time);
	if (showTrail) airTrail(c, v, samples, time, S, time);
	if (!showBody) return;
	const showSprite = sc.layers?.sprite ?? true;
	const moving = b.state === 'ACTIVE' ? 1 : 0;
	// a dark pool under him, as the game draws it
	const pool = c.createRadialGradient(bx, by + S * 0.1, S * 0.1, bx, by + S * 0.1, S * 0.5);
	pool.addColorStop(0, 'rgba(0,0,0,0.5)');
	pool.addColorStop(1, 'rgba(0,0,0,0)');
	c.fillStyle = pool;
	if (showSprite) c.fillRect(bx - S * 0.5, by - S * 0.4, S, S);
	if (b.morph < 0.999 && showSprite) {
		const snap = snapOf(b, round, phase);
		const { img, half } = bodySprite(c, snap, S, time);
		if (b.morph <= 0.001) c.drawImage(img, bx - half, by - half, half * 2, half * 2);
		else if (A) twistedBody(c, img, half, bx, by, b.morph, S);
		else shrunkBody(c, img, half, bx, by, b.morph);
	}
	if (b.morph > 0.001) {
		if (A) tornado(c, v as 'A1' | 'A2', bx, by, S, b.morph, heading, moving, phase, time);
		else {
			const along = Math.hypot(b.x - round.lane.x0, b.y - round.lane.y0) * S;
			const r = S * (v === 'B1' ? 0.32 : 0.3);
			// the crouch's last moment winds it up a little before it rolls
			lavaBall(c, v as 'B1' | 'B2', bx, by, S, b.morph, heading, along / r + b.morph * 0.6, moving, phase, time);
		}
	}
	if (b.sinceStop >= 0) steam(c, bx, by, S, b.sinceStop, T.rec, !A);
}
