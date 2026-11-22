// The station's swarm on screen (DESIGN.md §7a): the density of `SwarmField` drawn as living
// insects. Each tile holds as many bugs as its density; they stream along the swarm's flow,
// wander where it stands still and thin out at the edge of light. Bright on purpose: wet dark
// chitin with a sick glowing abdomen, so the worst thing on screen is the easiest to see. The
// bugs are cached sprites (16 headings, two leg frames per size): thousands a frame stay cheap.
import type { SwarmField } from '../../logic/station/SwarmField';
import type { GridLayout } from '../maze/GridView';

const HEADINGS = 16;
/** Bugs per unit of density, and the most on one tile. */
const PER_DENSITY = 7;
const MOST = 16;

const sprites = new Map<string, HTMLCanvasElement>();
/** The swarm's breath: its density as a tiny map, one pixel a tile, scaled up soft. */
let densityMap: HTMLCanvasElement | null = null;

function densityGlow(field: SwarmField, w: number, h: number): HTMLCanvasElement {
	if (!densityMap || densityMap.width !== w || densityMap.height !== h) {
		densityMap = document.createElement('canvas');
		densityMap.width = w;
		densityMap.height = h;
	}
	const x = densityMap.getContext('2d') as CanvasRenderingContext2D;
	const im = x.createImageData(w, h);
	for (let i = 0; i < w * h; i += 1) {
		const a = Math.min(1, field.at(i % w, Math.floor(i / w)) * 0.35);
		im.data[i * 4] = 168;
		im.data[i * 4 + 1] = 212;
		im.data[i * 4 + 2] = 58;
		im.data[i * 4 + 3] = Math.round(a * 255);
	}
	x.putImageData(im, 0, 0);
	return densityMap;
}

/** At most this many bugs a frame (the densest tiles keep theirs, thin ones lose some). */
const BUDGET = 1400;

function bugSprite(size: number, heading: number, frame: number): HTMLCanvasElement {
	const key = `${size}|${heading}|${frame}`;
	const hit = sprites.get(key);
	if (hit) {
		return hit;
	}
	const D = 2;
	const box = Math.ceil(size * 2.2 * D);
	const c = document.createElement('canvas');
	c.width = box;
	c.height = box;
	const x = c.getContext('2d') as CanvasRenderingContext2D;
	x.scale(D, D);
	x.translate(box / D / 2, box / D / 2);
	x.rotate((heading / HEADINGS) * Math.PI * 2);
	const u = size;
	x.lineCap = 'round';
	// legs, three a side, the frame swings them
	x.strokeStyle = '#0d0907';
	x.lineWidth = Math.max(0.6, u * 0.08);
	for (const side of [-1, 1]) {
		for (let k = -1; k <= 1; k += 1) {
			const swing = (frame === 0 ? 1 : -1) * (k === 0 ? -1 : 1) * 0.25;
			const bx = k * u * 0.22;
			x.beginPath();
			x.moveTo(bx, side * u * 0.1);
			x.lineTo(bx + u * (0.18 * k + swing * 0.3), side * u * 0.42);
			x.lineTo(bx + u * (0.3 * k + swing * 0.5), side * u * 0.58);
			x.stroke();
		}
	}
	// antennae
	x.lineWidth = Math.max(0.5, u * 0.05);
	for (const side of [-1, 1]) {
		x.beginPath();
		x.moveTo(u * 0.42, side * u * 0.06);
		x.quadraticCurveTo(u * 0.7, side * u * 0.1, u * 0.85, side * u * (0.3 + frame * 0.05));
		x.stroke();
	}
	// the abdomen glows a sick yellow-green through its plates
	const ab = x.createRadialGradient(-u * 0.2, 0, 0, -u * 0.2, 0, u * 0.4);
	ab.addColorStop(0, '#f2ff9a');
	ab.addColorStop(0.45, '#a8d43a');
	ab.addColorStop(1, '#3a4a12');
	x.fillStyle = ab;
	x.beginPath();
	x.ellipse(-u * 0.2, 0, u * 0.34, u * 0.22, 0, 0, Math.PI * 2);
	x.fill();
	x.strokeStyle = 'rgba(20,14,6,.7)';
	x.lineWidth = Math.max(0.5, u * 0.04);
	for (let k = 0; k < 3; k += 1) {
		x.beginPath();
		x.ellipse(-u * 0.2 + u * 0.1 * (k - 1), 0, u * 0.05, u * 0.2, 0, 0, Math.PI * 2);
		x.stroke();
	}
	// the head and thorax: wet dark chitin with a hard glint
	const th = x.createLinearGradient(0, -u * 0.2, 0, u * 0.2);
	th.addColorStop(0, '#5a3a24');
	th.addColorStop(0.5, '#24150c');
	th.addColorStop(1, '#0c0705');
	x.fillStyle = th;
	x.beginPath();
	x.ellipse(u * 0.18, 0, u * 0.2, u * 0.17, 0, 0, Math.PI * 2);
	x.fill();
	x.beginPath();
	x.ellipse(u * 0.4, 0, u * 0.1, u * 0.11, 0, 0, Math.PI * 2);
	x.fill();
	x.fillStyle = 'rgba(255,240,210,.75)';
	x.beginPath();
	x.ellipse(u * 0.16, -u * 0.08, u * 0.08, u * 0.03, 0, 0, Math.PI * 2);
	x.fill();
	// eyes
	x.fillStyle = '#ff5a2a';
	for (const side of [-1, 1]) {
		x.beginPath();
		x.arc(u * 0.45, side * u * 0.06, Math.max(0.5, u * 0.035), 0, Math.PI * 2);
		x.fill();
	}
	sprites.set(key, c);
	return c;
}

function hash(a: number, b: number): number {
	const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
	return s - Math.floor(s);
}

/**
 * Draws the swarm over `layout`. `lit(x, y)`, 0..1, thins the bugs at the edge of light (they
 * scatter from it); `time` moves them.
 */
export function drawSwarm(
	ctx: CanvasRenderingContext2D,
	field: SwarmField,
	layout: GridLayout,
	time: number,
	lit: (x: number, y: number) => number
): void {
	const S = layout.tileSize;
	const w = field.width;
	const size = Math.max(3, Math.round(S * 0.3));
	const box = Math.ceil(size * 2.2);
	const h = field.flowX.length / w;
	// first the swarm's own glow, a breath under the bugs: one soft layer over the maze
	ctx.save();
	ctx.globalCompositeOperation = 'lighter';
	ctx.imageSmoothingEnabled = true;
	ctx.globalAlpha = 0.6;
	ctx.drawImage(densityGlow(field, w, h), layout.offsetX, layout.offsetY, w * S, h * S);
	ctx.restore();
	let mass = 0;
	for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) mass += field.at(x, y);
	const thin = Math.min(1, BUDGET / Math.max(1, mass * PER_DENSITY));
	for (let y = 0; y < h; y += 1) {
		for (let x = 0; x < w; x += 1) {
			const d = field.at(x, y);
			if (d < 0.04) {
				continue;
			}
			const i = y * w + x;
			const fx = field.flowX[i];
			const fy = field.flowY[i];
			const speed = Math.hypot(fx, fy);
			const light = lit(x + 0.5, y + 0.5);
			const count = Math.min(MOST, Math.ceil(d * PER_DENSITY * thin * (1 - light * 0.8)));
			const along = speed > 0.02 ? Math.atan2(fy, fx) : null;
			for (let k = 0; k < count; k += 1) {
				const h1 = hash(i, k);
				const h2 = hash(k, i + 7);
				// stream along the flow, wrapping inside the tile; wander where it stands still
				const run = along === null ? 0 : (h1 + time * (0.8 + h2 * 0.8)) % 1;
				let ox = (h1 - 0.5) * 0.8;
				let oy = (h2 - 0.5) * 0.8;
				if (along !== null) {
					ox = ox * 0.5 + Math.cos(along) * (run - 0.5);
					oy = oy * 0.5 + Math.sin(along) * (run - 0.5);
				} else {
					ox += Math.sin(time * (1.3 + h2) + h1 * 9) * 0.08;
					oy += Math.cos(time * (1.1 + h1) + h2 * 9) * 0.08;
				}
				const angle =
					along !== null
						? along + (h2 - 0.5) * 0.8
						: h1 * Math.PI * 2 + Math.sin(time * 0.7 + h2 * 5) * 0.8;
				const heading =
					((Math.round((angle / (Math.PI * 2)) * HEADINGS) % HEADINGS) + HEADINGS) % HEADINGS;
				const frame = Math.floor(time * 14 + h1 * 4) % 2;
				const sprite = bugSprite(size, heading, frame);
				const px = layout.offsetX + (x + 0.5 + ox) * S;
				const py = layout.offsetY + (y + 0.5 + oy) * S;
				ctx.drawImage(sprite, px - box / 2, py - box / 2, box, box);
			}
		}
	}
}
