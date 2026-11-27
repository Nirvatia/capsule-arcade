// The Net's actors and props as cached sprites, drawn once in code at 96 px unless noted: a bold
// silhouette, a neon ring and a dark hull, so each kind reads at once on the lit road.
import { context, makeCanvas } from '../doom/fleshNoise';

type Cv = HTMLCanvasElement;
type Ctx = CanvasRenderingContext2D;

const cache = new Map<string, Cv>();

function made(key: string, w: number, h: number, paint: (g: Ctx) => void): Cv {
	const hit = cache.get(key);
	if (hit) {
		return hit;
	}
	const c = makeCanvas(w, h);
	paint(context(c));
	cache.set(key, c);
	return c;
}

/** The four drones' colours, as the four ghosts: red, pink, cyan, orange. */
export const DRONE_COLORS = ['#ff3b3b', '#ff8fd0', '#3be3ff', '#ffa03b'] as const;
export type DroneMood = 'hunt' | 'fright' | 'flash';

/** A security drone facing right: a dark hull, a coloured ring, four rotor arcs, one big lens. */
export function droneSprite(role: number, mood: DroneMood): Cv {
	return made(`drone${role % 4}${mood}`, 96, 96, (g) => {
		const col =
			mood === 'hunt' ? DRONE_COLORS[role % 4] : mood === 'fright' ? '#4f7bff' : '#ffffff';
		g.shadowColor = col;
		g.shadowBlur = 16;
		g.strokeStyle = col;
		g.lineWidth = 4;
		g.globalAlpha = 0.8;
		for (const [sx, sy] of [
			[-1, -1],
			[1, -1],
			[1, 1],
			[-1, 1]
		]) {
			g.beginPath();
			g.arc(48 + sx * 27, 48 + sy * 27, 11, 0, 7);
			g.stroke();
			g.beginPath();
			g.moveTo(48 + sx * 17, 48 + sy * 17);
			g.lineTo(48 + sx * 24, 48 + sy * 24);
			g.stroke();
		}
		g.globalAlpha = 1;
		g.fillStyle = mood === 'flash' ? '#e8eeff' : '#0b0f24';
		g.beginPath();
		g.arc(48, 48, 25, 0, 7);
		g.fill();
		g.lineWidth = 5;
		g.stroke();
		g.shadowBlur = 0;
		g.fillStyle = col;
		g.globalAlpha = 0.35;
		g.beginPath();
		g.arc(48, 48, 19, 0, 7);
		g.fill();
		g.globalAlpha = 1;
		// the lens: looks the way the drone heads (+x)
		g.fillStyle = '#ffffff';
		g.beginPath();
		g.arc(56, 48, 11, 0, 7);
		g.fill();
		g.fillStyle = mood === 'fright' ? '#0b1030' : '#0b0f24';
		g.beginPath();
		g.arc(59, 48, mood === 'hunt' ? 5.4 : 3.6, 0, 7);
		g.fill();
		if (mood === 'hunt') {
			g.strokeStyle = '#0b0f24';
			g.lineWidth = 3;
			g.beginPath();
			g.moveTo(45, 36);
			g.lineTo(64, 42);
			g.stroke();
		}
	});
}

/** A hack node (an energizer): a hexagon of light with a bolt inside. */
export function nodeSprite(): Cv {
	return made('node', 96, 96, (g) => {
		g.shadowColor = '#ff3fd8';
		g.shadowBlur = 18;
		g.fillStyle = '#12082a';
		g.strokeStyle = '#ff3fd8';
		g.lineWidth = 5;
		g.beginPath();
		for (let k = 0; k < 6; k += 1) {
			const a = (k / 6) * 6.2832 + 0.5236;
			g[k === 0 ? 'moveTo' : 'lineTo'](48 + Math.cos(a) * 34, 48 + Math.sin(a) * 34);
		}
		g.closePath();
		g.fill();
		g.stroke();
		g.shadowBlur = 0;
		g.fillStyle = '#ffffff';
		g.beginPath();
		g.moveTo(54, 22);
		g.lineTo(34, 54);
		g.lineTo(46, 54);
		g.lineTo(40, 76);
		g.lineTo(62, 42);
		g.lineTo(50, 42);
		g.closePath();
		g.fill();
	});
}

/** A data packet (a dot): a small bright diamond. */
export function dataSprite(): Cv {
	return made('data', 32, 32, (g) => {
		g.shadowColor = '#7ff6ff';
		g.shadowBlur = 6;
		g.fillStyle = '#c9fbff';
		g.beginPath();
		g.moveTo(16, 5);
		g.lineTo(26, 16);
		g.lineTo(16, 27);
		g.lineTo(6, 16);
		g.closePath();
		g.fill();
	});
}

/** The core in the lair: a hexagonal reactor, locked (red) or open (green), 192 px. */
export function coreSprite(open: boolean): Cv {
	return made(`core${open}`, 192, 192, (g) => {
		const col = open ? '#5cffb0' : '#ff3b5c';
		g.shadowColor = col;
		g.shadowBlur = 22;
		g.strokeStyle = col;
		g.fillStyle = '#080b1c';
		for (const [r, w] of [
			[84, 7],
			[58, 5]
		] as const) {
			g.lineWidth = w;
			g.beginPath();
			for (let k = 0; k < 6; k += 1) {
				const a = (k / 6) * 6.2832;
				g[k === 0 ? 'moveTo' : 'lineTo'](96 + Math.cos(a) * r, 96 + Math.sin(a) * r);
			}
			g.closePath();
			if (r === 84) {
				g.fill();
			}
			g.stroke();
		}
		g.shadowBlur = 0;
		for (let k = 0; k < 6; k += 1) {
			const a = (k / 6) * 6.2832;
			g.fillStyle = col;
			g.beginPath();
			g.arc(96 + Math.cos(a) * 71, 96 + Math.sin(a) * 71, 6, 0, 7);
			g.fill();
		}
		g.fillStyle = open ? '#d6ffee' : '#3a0d18';
		g.beginPath();
		g.arc(96, 96, 28, 0, 7);
		g.fill();
		g.strokeStyle = col;
		g.lineWidth = 4;
		g.stroke();
	});
}
