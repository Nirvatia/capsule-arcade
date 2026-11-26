// Candidates for the station (throwaway, the owner picks; then the pick moves into the game):
// the enraged Pretender C, the overheat (the owner's pick, 2026-11-26), in four colours: its red
// was lost in the fully infected maze.
import type { GhostKind } from '../../../src/games/pacman/logic/actors/GhostModel';
import { footLift } from '../../../src/games/pacman/render/actors/cuteGhost';
import {
	INK,
	IVORY,
	PHASE,
	SCALE,
	ellipse,
	glow,
	traceBody,
	type PretenderOpts
} from '../../../src/games/pacman/render/station/pretender';

type Ctx = CanvasRenderingContext2D;
export type Heat = 'red' | 'white' | 'acid' | 'violet';

interface HeatLook {
	readonly core: string;
	readonly mid: string;
	readonly rim: string;
	readonly feet: string;
	readonly after: string;
	readonly halo: string;
	readonly socket: string;
	readonly pupil: string;
	readonly throat: string;
}
const HEAT: Record<Heat, HeatLook> = {
	red: {
		core: '#fff2c8',
		mid: '#ff9a3c',
		rim: '#c41a26',
		feet: '#9c1420',
		after: '#ff6a3a',
		halo: '255, 170, 80',
		socket: '#fffbe8',
		pupil: '#7a0c14',
		throat: '255, 200, 90'
	},
	white: {
		core: '#ffffff',
		mid: '#fff4c2',
		rim: '#ffb03a',
		feet: '#d07a22',
		after: '#fff0b0',
		halo: '255, 240, 190',
		socket: '#3a0e08',
		pupil: '#ffd24a',
		throat: '255, 150, 60'
	},
	acid: {
		core: '#fbffe0',
		mid: '#c6ff4a',
		rim: '#3f9a18',
		feet: '#2e7414',
		after: '#b8ff50',
		halo: '190, 255, 90',
		socket: '#fffbe8',
		pupil: '#1f4a0a',
		throat: '220, 255, 120'
	},
	violet: {
		core: '#fff0ff',
		mid: '#d27bff',
		rim: '#5b22b8',
		feet: '#44188c',
		after: '#b56bff',
		halo: '200, 120, 255',
		socket: '#fffbe8',
		pupil: '#3a0d6a',
		throat: '255, 160, 240'
	}
};

const TAU = Math.PI * 2;
const hash = (a: number, b: number) => {
	const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
	return s - Math.floor(s);
};

// ------------------------------------------------------------------------------ the rage looks

function halo(c: Ctx, x: number, y: number, tile: number, rgb: string, a: number): void {
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

/** Where "behind" is: against the heading. */
function back(o: PretenderOpts): [number, number] {
	const d = Math.hypot(o.lookX, o.lookY);
	return d > 0.01 ? [-o.lookX / d, -o.lookY / d] : [0, 1];
}

/** C: the overheat. White-hot inside, the mask shattered into shards circling the head, hollow
 *  glowing sockets, a jagged grin across the whole body, afterimages behind it. */
function shardsC(c: Ctx, o: PretenderOpts, front: boolean): void {
	for (let i = 0; i < 5; i++) {
		const a = o.time * 1.6 + (i * TAU) / 5;
		if (Math.sin(a) >= 0 !== front) continue;
		const r = 12.5 + Math.sin(o.time * 3 + i) * 1.2;
		const x = Math.cos(a) * r;
		const y = -3 + Math.sin(a) * r * 0.45;
		c.save();
		c.translate(x, y);
		c.rotate(o.time * 3 + i * 1.3);
		const z = 1.8 + hash(i, 1) * 1.2;
		c.beginPath();
		c.moveTo(-z, -z * 0.6);
		c.lineTo(z * 0.9, -z * 0.8);
		c.lineTo(z * 0.3, z);
		c.closePath();
		c.fillStyle = IVORY;
		c.fill();
		c.strokeStyle = INK;
		c.lineWidth = 0.7;
		c.stroke();
		c.restore();
	}
}

function bodyC(c: Ctx, o: PretenderOpts, throb: number, h: HeatLook): void {
	traceBody(c);
	c.lineJoin = 'round';
	c.lineWidth = 3.2;
	c.strokeStyle = INK;
	c.stroke();
	const g = c.createRadialGradient(0, 2.4, 0.5, 0, 1.6, 10.5);
	g.addColorStop(0, h.core);
	g.addColorStop(0.35 + 0.1 * throb, h.mid);
	g.addColorStop(1, h.rim);
	c.fillStyle = g;
	c.fill();
	c.save();
	c.translate(o.faceX * 1.4, o.faceY * 1.2);
	// the hollow sockets, white-hot, slanted
	for (const side of [-1, 1]) {
		c.save();
		c.translate(o.lookX * 0.9, o.lookY * 0.8);
		glow(c, side * 4.2, -1.6, 5.2, 'rgba(255, 250, 220, 0.85)', 'rgba(255, 150, 60, 0.45)');
		c.beginPath();
		c.moveTo(side * 1.2, -1.2);
		c.lineTo(side * 7.4, -4.6);
		c.lineTo(side * 6.6, 0.2);
		c.lineTo(side * 1.8, 0.6);
		c.closePath();
		c.fillStyle = h.socket;
		c.fill();
		c.strokeStyle = INK;
		c.lineWidth = 1.2;
		c.stroke();
		ellipse(c, side * 4.4 + o.lookX * 1.2, -1.2 + o.lookY * 0.6, 0.5, 1.4, h.pupil);
		c.restore();
	}
	c.restore();
	// the grin, across the whole body
	const chomp = 0.5 + 0.5 * Math.sin(o.time * 10);
	c.save();
	traceBody(c);
	c.clip();
	c.translate(o.faceX * 1.2, o.faceY * 1.0);
	const trace = () => {
		c.beginPath();
		c.moveTo(-11, 2.6);
		c.quadraticCurveTo(0, 4.6, 11, 2.6);
		c.quadraticCurveTo(0, 10 + 2.2 * chomp, -11, 2.6);
		c.closePath();
	};
	trace();
	c.fillStyle = '#2a0508';
	c.fill();
	c.save();
	trace();
	c.clip();
	glow(c, 0, 7, 6.5, `rgba(${h.throat}, 0.9)`, `rgba(${h.throat}, 0.45)`);
	c.fillStyle = IVORY;
	c.strokeStyle = INK;
	c.lineWidth = 0.5;
	for (let x = -9.5; x <= 9.6; x += 1.9) {
		const y = 2.6 + (1 - (x / 11) ** 2) * 1.9;
		c.beginPath();
		c.moveTo(x - 0.95, y - 0.4);
		c.lineTo(x + 0.1, y + 2.1 + hash(x, 3) * 0.8);
		c.lineTo(x + 0.95, y - 0.4);
		c.fill();
		c.stroke();
	}
	c.restore();
	trace();
	c.strokeStyle = INK;
	c.lineWidth = 1.3;
	c.stroke();
	c.restore();
	// embers off the top
	for (let i = 0; i < 3; i++) {
		const u = (o.time * 1.3 + i / 3) % 1;
		ellipse(
			c,
			(hash(i, 7) - 0.5) * 12 + Math.sin(u * 5 + i) * 1.2,
			-7 - u * 9,
			0.7 * (1 - u) + 0.2,
			0.7 * (1 - u) + 0.2,
			`rgba(255, ${190 - u * 90}, 80, ${1 - u})`
		);
	}
}

/** One enraged Pretender (the overheat) in `heat` centred at (x, y), `tile` the tile's size in px. */
export function drawRageCandidate(
	c: Ctx,
	x: number,
	y: number,
	tile: number,
	kind: GhostKind,
	heat: Heat,
	o: PretenderOpts
): void {
	const unit = (tile / 25) * 0.78;
	const phase = PHASE[kind];
	const h = HEAT[heat];
	const throb = Math.max(0, Math.sin(o.time * 9 + phase));
	halo(c, x, y, tile, h.halo, 0.42);
	c.save();
	c.translate(x, y);
	c.scale(unit * SCALE, unit * SCALE);
	{
		// afterimages along the way it came
		const [bx, by] = back(o);
		for (let i = 3; i >= 1; i--) {
			c.save();
			c.translate(bx * i * 5.5, by * i * 5.5);
			c.globalAlpha *= 0.32 - i * 0.08;
			traceBody(c);
			c.fillStyle = h.after;
			c.fill();
			c.restore();
		}
	}
	c.translate(Math.sin(o.time * 47 + phase) * 0.3, 0);
	const step = o.step;
	const lift = footLift(step);
	c.translate(0, -Math.abs(Math.sin(step)) * 0.7);
	c.translate(0, 10);
	c.rotate(Math.sin(step) * 0.08 + o.lookX * 0.1);
	c.translate(0, -10);
	shardsC(c, o, false);
	for (const [side, up] of [
		[-1, lift.left],
		[1, lift.right]
	] as const) {
		c.beginPath();
		c.ellipse(side * 4.2, 11 - up, 3.3, 2.5, 0, 0, TAU);
		c.fillStyle = h.feet;
		c.fill();
		c.strokeStyle = INK;
		c.lineWidth = 1.5;
		c.stroke();
	}
	const squash = Math.sin(o.time * 5 + phase);
	c.translate(0, 10);
	c.scale(1 - 0.04 * squash + 0.035 * throb, 1 + 0.05 * squash + 0.035 * throb);
	c.translate(0, -10);
	bodyC(c, o, throb, h);
	shardsC(c, o, true);
	c.restore();
}

