// Throwaway: candidate season animals for the ghosts, in cuteGhost's own terms (a body of
// unioned paths in the ghost's colour, details over it, the shared face): spring instead of the
// tulip (frog, chick, ladybug), winter instead of the bunny (penguin, owlet, fox kit).
import type { GhostShape, Palette } from '../../../src/games/pacman/render/actors/cuteGhost';

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const INK = '#241418';

function ellipse(c: Ctx, x: number, y: number, rx: number, ry: number, fill: string, rot = 0): void {
	c.beginPath();
	c.ellipse(x, y, rx, ry, rot, 0, TAU);
	c.fillStyle = fill;
	c.fill();
}
function line(c: Ctx, x0: number, y0: number, x1: number, y1: number, color: string, w: number): void {
	c.beginPath();
	c.moveTo(x0, y0);
	c.lineTo(x1, y1);
	c.strokeStyle = color;
	c.lineWidth = w;
	c.lineCap = 'round';
	c.stroke();
}
function polygon(c: Ctx, pts: ReadonlyArray<readonly [number, number]>): void {
	c.beginPath();
	pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
	c.closePath();
}
function lighten(hex: string, k: number): string {
	const n = parseInt(hex.slice(1), 16);
	const ch = (s: number) => Math.round(((n >> s) & 255) + (255 - ((n >> s) & 255)) * k);
	return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
function beak(c: Ctx, x: number, y: number, w: number, h: number): void {
	polygon(c, [
		[x - w, y],
		[x + w, y],
		[x, y + h]
	]);
	c.fillStyle = '#ffa526';
	c.fill();
	c.strokeStyle = INK;
	c.lineWidth = 0.8;
	c.lineJoin = 'round';
	c.stroke();
}

const base = { ring: 15.4, nose: false } as const;

/** Spring: a frog, eyes up on two bumps, a pale belly, rosy cheeks. */
export const FROG: GhostShape = {
	...base,
	paths: [
		(c) => {
			c.beginPath();
			c.ellipse(0, 3, 10.6, 8.4, 0, 0, TAU);
		},
		(c) => {
			c.beginPath();
			c.arc(-5.2, -4.6, 4.4, 0, TAU);
		},
		(c) => {
			c.beginPath();
			c.arc(5.2, -4.6, 4.4, 0, TAU);
		}
	],
	over: (c, pal: Palette) => {
		ellipse(c, 0, 7.4, 6.4, 3, lighten(pal.b, 0.45));
		ellipse(c, -7.2, 3.6, 1.8, 1.1, 'rgba(255,120,150,.55)');
		ellipse(c, 7.2, 3.6, 1.8, 1.1, 'rgba(255,120,150,.55)');
	},
	lid: (pal) => pal.b,
	dy: 2,
	scale: 0.9,
	highlight: [-6.4, 1],
	ey: -4.6,
	ex: 5.2,
	rx: 2.8,
	ry: 3.1,
	my: 3.6
};

/** Spring: a chick, an egg of a body, a tuft, wing stubs, a beak, orange feet. */
export const CHICK: GhostShape = {
	...base,
	paths: [
		(c) => {
			c.beginPath();
			c.ellipse(0, 2, 9.4, 10, 0, 0, TAU);
		},
		(c) => {
			c.beginPath();
			c.ellipse(-1.8, -9.2, 1.4, 3, -0.45, 0, TAU);
		},
		(c) => {
			c.beginPath();
			c.ellipse(0, -10, 1.5, 3.4, 0, 0, TAU);
		},
		(c) => {
			c.beginPath();
			c.ellipse(1.8, -9.2, 1.4, 3, 0.45, 0, TAU);
		},
		(c) => {
			c.beginPath();
			c.ellipse(-9.4, 3.4, 2.4, 4.4, 0.55, 0, TAU);
		},
		(c) => {
			c.beginPath();
			c.ellipse(9.4, 3.4, 2.4, 4.4, -0.55, 0, TAU);
		}
	],
	over: (c) => {
		beak(c, 0, 2.2, 1.9, 2.2);
	},
	lid: (pal) => pal.b,
	foot: () => '#ffa526',
	dy: 1.4,
	scale: 0.9,
	highlight: [-4.6, -2],
	ey: -0.4,
	ex: 3.9,
	rx: 2.9,
	ry: 3.3,
	my: 6.4
};

/** Spring: a ladybug, a round shell in the ghost's colour with spots, antennae. */
export const LADYBUG: GhostShape = {
	...base,
	paths: [
		(c) => {
			c.beginPath();
			c.ellipse(0, 2.4, 10.4, 9.4, 0, 0, TAU);
		}
	],
	back: (c) => {
		for (const s of [-1, 1]) {
			line(c, s * 2.6, -5.6, s * 5.4, -11.4, INK, 1.1);
			ellipse(c, s * 5.6, -11.8, 1.5, 1.5, INK);
		}
	},
	over: (c) => {
		line(c, 0, -6.8, 0, -1.4, 'rgba(36,20,24,.55)', 0.9);
		for (const [x, y, r] of [
			[-6.4, -3, 1.7],
			[6.4, -3, 1.7],
			[-8, 3.2, 1.3],
			[8, 3.2, 1.3],
			[-3.4, -5.8, 1.1],
			[3.4, -5.8, 1.1]
		]) {
			ellipse(c, x, y, r, r, 'rgba(36,20,24,.8)');
		}
	},
	lid: (pal) => pal.b,
	foot: () => '#3a2630',
	dy: 2,
	scale: 0.92,
	highlight: [-5.4, -1.6],
	ey: 1.8,
	ex: 3.9,
	rx: 3,
	ry: 3.4,
	my: 6.2
};

/** Winter: a penguin, the ghost's colour for the coat, a white face and belly, flippers. */
export const PENGUIN: GhostShape = {
	...base,
	paths: [
		(c) => {
			c.beginPath();
			c.ellipse(0, 2, 9.6, 10.4, 0, 0, TAU);
		},
		(c) => {
			c.beginPath();
			c.ellipse(-9.6, 4.4, 2.1, 5, 0.4, 0, TAU);
		},
		(c) => {
			c.beginPath();
			c.ellipse(9.6, 4.4, 2.1, 5, -0.4, 0, TAU);
		}
	],
	over: (c) => {
		ellipse(c, -3.2, 0, 4.4, 4.6, '#f4f7ff');
		ellipse(c, 3.2, 0, 4.4, 4.6, '#f4f7ff');
		ellipse(c, 0, 5.6, 6.6, 6.2, '#f4f7ff');
		beak(c, 0, 2.8, 1.8, 2);
	},
	lid: () => '#f4f7ff',
	foot: () => '#ffa526',
	dy: 1.4,
	scale: 0.9,
	highlight: [-6.6, -3.4],
	ey: 0,
	ex: 3.3,
	rx: 2.7,
	ry: 3.1,
	my: 6.6
};

/** Winter: an owlet, ear tufts, big pale discs round the eyes, a little beak, a feathered belly. */
export const OWL: GhostShape = {
	...base,
	paths: [
		(c) => {
			c.beginPath();
			c.ellipse(0, 2.4, 10, 9.6, 0, 0, TAU);
		},
		(c) =>
			polygon(c, [
				[-9.2, -3],
				[-8.2, -12],
				[-3.2, -6.4]
			]),
		(c) =>
			polygon(c, [
				[9.2, -3],
				[8.2, -12],
				[3.2, -6.4]
			])
	],
	over: (c, pal: Palette) => {
		const disc = lighten(pal.b, 0.62);
		ellipse(c, -4.3, 0.4, 4.7, 4.7, disc);
		ellipse(c, 4.3, 0.4, 4.7, 4.7, disc);
		for (const [x, y] of [
			[-3, 7.2],
			[0, 8.6],
			[3, 7.2]
		]) {
			c.beginPath();
			c.moveTo(x - 1.2, y - 0.8);
			c.quadraticCurveTo(x, y + 0.6, x + 1.2, y - 0.8);
			c.strokeStyle = 'rgba(36,20,24,.45)';
			c.lineWidth = 0.7;
			c.stroke();
		}
		beak(c, 0, 3.2, 1.3, 2);
	},
	lid: (pal) => lighten(pal.b, 0.62),
	dy: 2,
	scale: 0.92,
	highlight: [-6.6, -2],
	ey: 0.4,
	ex: 4.3,
	rx: 3,
	ry: 3.3,
	my: 7
};

/** Winter: a fox kit, pointed ears with dark insides, a white muzzle and cheeks, a nose. */
export const FOX: GhostShape = {
	...base,
	nose: true,
	paths: [
		(c) => {
			c.beginPath();
			c.ellipse(0, 2.8, 10.6, 8.6, 0, 0, TAU);
		},
		(c) =>
			polygon(c, [
				[-9.8, -1],
				[-7.6, -12.4],
				[-2.4, -5.4]
			]),
		(c) =>
			polygon(c, [
				[9.8, -1],
				[7.6, -12.4],
				[2.4, -5.4]
			])
	],
	over: (c) => {
		for (const s of [-1, 1]) {
			polygon(c, [
				[s * 8.4, -3],
				[s * 7.6, -9.8],
				[s * 4.2, -5.4]
			]);
			c.fillStyle = 'rgba(58,26,16,.6)';
			c.fill();
			ellipse(c, s * 6.8, 5.2, 3.8, 3, '#fff6ee');
		}
		ellipse(c, 0, 6.4, 5, 3.6, '#fff6ee');
	},
	lid: (pal) => pal.b,
	foot: () => '#3a2018',
	dy: 2,
	scale: 0.9,
	highlight: [-6, -0.6],
	ey: 1.2,
	ex: 4.1,
	rx: 2.9,
	ry: 3.2,
	my: 6.6
};

export const CANDIDATES = {
	spring: { now: 'tulip', frog: FROG, chick: CHICK, ladybug: LADYBUG },
	winter: { now: 'bunny', penguin: PENGUIN, owl: OWL, fox: FOX }
} as const;
