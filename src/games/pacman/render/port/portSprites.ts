// The Port's actors and props as cached sprites, drawn once in code (96 px unless noted) with the game's
// finish: a dark outline, a body shaded from the top left, a rim light, a few bold details. Each reads
// at once on the wet concrete: the Broker is a big loader with a screen for a face, the drones carry a
// siren and a lens, the terminals are lit consoles, the power cells glow green, the nuts are brass.
import { context, makeCanvas, mixHex } from '../doom/fleshNoise';

type Cv = HTMLCanvasElement;
type Ctx = CanvasRenderingContext2D;

const INK = '#090c12';
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

function rim(g: Ctx, w = 3): void {
	g.lineWidth = w;
	g.strokeStyle = INK;
	g.lineJoin = 'round';
	g.stroke();
}

/** The drones' colours, as the four ghosts: red, pink, cyan, orange. */
export const DRONE_COLORS = ['#ff4040', '#ff8fd0', '#3be3ff', '#ffa83b'] as const;
export type DroneMood = 'hunt' | 'fright' | 'flash';

/** A security drone facing right: a shaded hull, four rotor arms with blurred rotors, a siren, one big lens. */
export function droneSprite(role: number, mood: DroneMood, siren: boolean): Cv {
	return made(`drone${role % 4}${mood}${siren}`, 96, 96, (g) => {
		const col =
			mood === 'hunt' ? DRONE_COLORS[role % 4] : mood === 'fright' ? '#4f7bff' : '#ffffff';
		for (const [sx, sy] of [
			[-1, -1],
			[1, -1],
			[1, 1],
			[-1, 1]
		]) {
			g.strokeStyle = INK;
			g.lineWidth = 6;
			g.lineCap = 'round';
			g.beginPath();
			g.moveTo(48, 48);
			g.lineTo(48 + sx * 29, 48 + sy * 29);
			g.stroke();
			g.strokeStyle = '#4a5360';
			g.lineWidth = 3;
			g.stroke();
			const rg = g.createRadialGradient(
				48 + sx * 29,
				48 + sy * 29,
				2,
				48 + sx * 29,
				48 + sy * 29,
				15
			);
			rg.addColorStop(0, 'rgba(235,245,255,.55)');
			rg.addColorStop(1, 'rgba(235,245,255,.08)');
			g.fillStyle = rg;
			g.beginPath();
			g.arc(48 + sx * 29, 48 + sy * 29, 15, 0, 7);
			g.fill();
			g.strokeStyle = 'rgba(9,12,18,.7)';
			g.lineWidth = 1.5;
			g.stroke();
		}
		g.shadowColor = col;
		g.shadowBlur = 10;
		const hull = g.createRadialGradient(40, 38, 4, 48, 48, 27);
		hull.addColorStop(0, mood === 'flash' ? '#ffffff' : '#7a8696');
		hull.addColorStop(1, mood === 'flash' ? '#c9d4ee' : '#232b36');
		g.fillStyle = hull;
		g.beginPath();
		g.arc(48, 48, 25, 0, 7);
		g.fill();
		g.shadowBlur = 0;
		rim(g, 3.4);
		g.strokeStyle = col;
		g.lineWidth = 3;
		g.beginPath();
		g.arc(48, 48, 20, 0, 7);
		g.stroke();
		// the lens, looking the way the drone heads (+x)
		g.fillStyle = '#05070b';
		g.beginPath();
		g.arc(58, 48, 11, 0, 7);
		g.fill();
		const lens = g.createRadialGradient(56, 45, 1, 58, 48, 9);
		lens.addColorStop(0, '#ffffff');
		lens.addColorStop(0.35, mood === 'fright' ? '#9ab4ff' : col);
		lens.addColorStop(1, '#10151c');
		g.fillStyle = lens;
		g.beginPath();
		g.arc(58, 48, 8.5, 0, 7);
		g.fill();
		// the siren on top, red or blue by turns
		g.fillStyle = siren ? '#ff3a3a' : '#3a7aff';
		g.shadowColor = siren ? '#ff3a3a' : '#3a7aff';
		g.shadowBlur = 12;
		g.beginPath();
		g.arc(38, 48, 6.5, 0, 7);
		g.fill();
		g.shadowBlur = 0;
		g.strokeStyle = INK;
		g.lineWidth = 1.5;
		g.stroke();
	});
}

/** A crane terminal: a hex pad with hazard stripes and a lit console, 96 px. */
export function terminalSprite(): Cv {
	return made('terminal', 96, 96, (g) => {
		g.fillStyle = INK;
		g.beginPath();
		for (let k = 0; k < 6; k += 1) {
			const a = (k / 6) * 6.2832 + 0.5236;
			g[k === 0 ? 'moveTo' : 'lineTo'](48 + Math.cos(a) * 40, 48 + Math.sin(a) * 40);
		}
		g.closePath();
		g.fill();
		for (let k = 0; k < 12; k += 1) {
			g.fillStyle = k % 2 ? '#14181e' : '#f0c23a';
			g.beginPath();
			g.moveTo(48, 48);
			g.arc(48, 48, 37, (k / 12) * 6.2832, ((k + 1) / 12) * 6.2832);
			g.closePath();
			g.fill();
		}
		const pad = g.createRadialGradient(40, 38, 3, 48, 48, 30);
		pad.addColorStop(0, '#5a6472');
		pad.addColorStop(1, '#262d37');
		g.fillStyle = pad;
		g.beginPath();
		g.arc(48, 48, 28, 0, 7);
		g.fill();
		rim(g, 2.6);
		// the console: a slab with a lit screen and keys
		g.fillStyle = '#10151c';
		g.beginPath();
		g.roundRect(26, 30, 44, 30, 4);
		g.fill();
		rim(g, 2.2);
		g.shadowColor = '#34e7ff';
		g.shadowBlur = 10;
		g.fillStyle = '#34e7ff';
		g.fillRect(31, 34, 34, 14);
		g.shadowBlur = 0;
		g.fillStyle = 'rgba(255,255,255,.55)';
		g.fillRect(33, 36, 18, 3);
		g.fillStyle = '#c9d2da';
		for (let k = 0; k < 5; k += 1) {
			g.fillRect(31 + k * 7, 52, 5, 4);
		}
		g.strokeStyle = '#c9d2da';
		g.lineWidth = 2;
		g.beginPath();
		g.moveTo(48, 30);
		g.lineTo(48, 18);
		g.stroke();
		g.fillStyle = '#ff3a3a';
		g.beginPath();
		g.arc(48, 17, 3.2, 0, 7);
		g.fill();
	});
}

/** A power cell (an energizer): a green cell seen from above, rings and a bolt, 96 px. */
export function cellSprite(): Cv {
	return made('cell', 96, 96, (g) => {
		g.shadowColor = '#54ff8a';
		g.shadowBlur = 16;
		const body = g.createRadialGradient(40, 38, 3, 48, 48, 36);
		body.addColorStop(0, '#d9ffe6');
		body.addColorStop(0.5, '#3fd16f');
		body.addColorStop(1, '#136b34');
		g.fillStyle = body;
		g.beginPath();
		g.arc(48, 48, 34, 0, 7);
		g.fill();
		g.shadowBlur = 0;
		rim(g, 3.6);
		g.strokeStyle = 'rgba(6,40,20,.8)';
		g.lineWidth = 2.4;
		g.beginPath();
		g.arc(48, 48, 25, 0, 7);
		g.stroke();
		g.fillStyle = '#ffffff';
		g.beginPath();
		g.moveTo(54, 20);
		g.lineTo(34, 52);
		g.lineTo(45, 52);
		g.lineTo(40, 76);
		g.lineTo(62, 42);
		g.lineTo(50, 42);
		g.closePath();
		g.fill();
		g.strokeStyle = '#0c3a1d';
		g.lineWidth = 1.6;
		g.stroke();
	});
}

/** A nut (the dots): a small brass hexagon with a hole, lit from the top left, 48 px. */
export function nutSprite(): Cv {
	return made('nut', 48, 48, (g) => {
		const grad = g.createLinearGradient(8, 8, 40, 40);
		grad.addColorStop(0, '#ffe9a8');
		grad.addColorStop(0.5, '#d9a93a');
		grad.addColorStop(1, '#8a5f14');
		g.fillStyle = grad;
		g.beginPath();
		for (let k = 0; k < 6; k += 1) {
			const a = (k / 6) * 6.2832 + 0.5236;
			g[k === 0 ? 'moveTo' : 'lineTo'](24 + Math.cos(a) * 17, 24 + Math.sin(a) * 17);
		}
		g.closePath();
		g.fill();
		rim(g, 2.6);
		g.fillStyle = INK;
		g.beginPath();
		g.arc(24, 24, 6.5, 0, 7);
		g.fill();
		g.fillStyle = 'rgba(255,255,255,.8)';
		g.beginPath();
		g.arc(16, 15, 2.6, 0, 7);
		g.fill();
	});
}

export type BrokerMood = 'calm' | 'hack' | 'panic' | 'stunned' | 'slow';

/**
 * The Broker facing right, 192 px: a loader with a heavy chassis, two tracks, two claw arms holding a
 * lit case, and a screen for a face (a ghost's, cyan; red when he sprints, X-eyed when stunned).
 */
export function brokerSprite(mood: BrokerMood): Cv {
	return made(`broker${mood}`, 192, 192, (g) => {
		const face =
			mood === 'panic'
				? '#ff4a4a'
				: mood === 'slow'
					? '#7fa8ff'
					: mood === 'stunned'
						? '#ffe36a'
						: '#34e7ff';
		// the tracks
		for (const y of [34, 134]) {
			g.fillStyle = '#10151c';
			g.beginPath();
			g.roundRect(26, y, 112, 28, 10);
			g.fill();
			rim(g, 4);
			g.strokeStyle = 'rgba(160,172,186,.35)';
			g.lineWidth = 2;
			for (let x = 36; x < 130; x += 9) {
				g.beginPath();
				g.moveTo(x, y + 4);
				g.lineTo(x, y + 24);
				g.stroke();
			}
			g.fillStyle = '#3b4552';
			for (const rx of [40, 70, 100, 126]) {
				g.beginPath();
				g.arc(rx, y + 14, 7, 0, 7);
				g.fill();
				rim(g, 1.6);
			}
		}
		// the claw arms and the lit case between them
		for (const y of [60, 118]) {
			g.fillStyle = '#6a737f';
			g.beginPath();
			g.roundRect(112, y, 54, 14, 5);
			g.fill();
			rim(g, 3);
			g.fillStyle = '#e0a21e';
			g.beginPath();
			g.moveTo(160, y - 4);
			g.lineTo(180, y + 5);
			g.lineTo(160, y + 8);
			g.closePath();
			g.fill();
			rim(g, 2.4);
		}
		g.shadowColor = '#ff3fd8';
		g.shadowBlur = 14;
		g.fillStyle = '#1b1226';
		g.beginPath();
		g.roundRect(150, 80, 28, 32, 4);
		g.fill();
		g.shadowBlur = 0;
		rim(g, 2.6);
		g.fillStyle = '#ff3fd8';
		g.fillRect(156, 90, 16, 5);
		g.fillRect(156, 100, 16, 5);
		// the chassis: a rounded slab shaded from the top left, an orange hazard band round it
		const body = g.createLinearGradient(40, 50, 120, 140);
		body.addColorStop(0, '#5d6977');
		body.addColorStop(0.5, '#323b47');
		body.addColorStop(1, '#1b2129');
		g.fillStyle = body;
		g.beginPath();
		g.roundRect(34, 48, 104, 96, 16);
		g.fill();
		rim(g, 4.4);
		for (let k = 0; k < 11; k += 1) {
			g.fillStyle = k % 2 ? '#14181e' : '#f0b81e';
			g.fillRect(38 + k * 9, 52, 9, 6);
			g.fillRect(38 + k * 9, 134, 9, 6);
		}
		g.strokeStyle = 'rgba(0,0,0,.45)';
		g.lineWidth = 2;
		for (const x of [64, 96]) {
			g.beginPath();
			g.moveTo(x, 62);
			g.lineTo(x, 130);
			g.stroke();
		}
		g.fillStyle = 'rgba(255,255,255,.22)';
		g.fillRect(40, 60, 96, 2.4);
		g.fillStyle = '#c9d2da';
		for (const [x, y] of [
			[46, 70],
			[46, 122],
			[126, 70],
			[126, 122]
		]) {
			g.beginPath();
			g.arc(x, y, 2.8, 0, 7);
			g.fill();
		}
		// the exhaust slits at the back, glowing
		g.shadowColor = '#ff7a2a';
		g.shadowBlur = 10;
		g.fillStyle = '#ff7a2a';
		for (const y of [78, 92, 106]) {
			g.fillRect(36, y, 16, 4);
		}
		g.shadowBlur = 0;
		// the head: a monitor with the face
		g.fillStyle = '#0a0d12';
		g.beginPath();
		g.roundRect(78, 68, 50, 56, 10);
		g.fill();
		rim(g, 3.4);
		g.shadowColor = face;
		g.shadowBlur = 14;
		g.fillStyle = mixHex(face, '#000000', 0.55);
		g.beginPath();
		g.roundRect(83, 73, 40, 46, 7);
		g.fill();
		g.shadowBlur = 0;
		g.strokeStyle = face;
		g.fillStyle = face;
		g.lineWidth = 3;
		if (mood === 'hack') {
			for (let k = 0; k < 5; k += 1) {
				g.fillRect(88, 79 + k * 8, 14 + ((k * 7) % 14), 4);
			}
		} else {
			for (const y of [88, 104]) {
				if (mood === 'stunned') {
					g.beginPath();
					g.moveTo(93, y - 6);
					g.lineTo(103, y + 4);
					g.moveTo(103, y - 6);
					g.lineTo(93, y + 4);
					g.stroke();
				} else {
					g.beginPath();
					g.ellipse(100, y, mood === 'panic' ? 7 : 5, mood === 'panic' ? 8 : 6, 0, 0, 7);
					g.fill();
				}
			}
			g.beginPath();
			if (mood === 'panic') {
				g.ellipse(112, 96, 3, 6, 0, 0, 7);
				g.fill();
			} else {
				g.moveTo(112, 88);
				g.quadraticCurveTo(116, 96, 112, 104);
				g.stroke();
			}
		}
		g.fillStyle = 'rgba(255,255,255,.18)';
		g.fillRect(85, 75, 36, 3);
		// the shoulder lamps
		g.shadowColor = '#ffb02e';
		g.shadowBlur = 10;
		g.fillStyle = '#ffb02e';
		for (const y of [58, 134]) {
			g.beginPath();
			g.arc(126, y, 4, 0, 7);
			g.fill();
		}
		g.shadowBlur = 0;
		if (mood === 'stunned') {
			g.strokeStyle = '#ffe36a';
			g.lineWidth = 3;
			for (const [x, y] of [
				[60, 40],
				[110, 36],
				[70, 154],
				[118, 152]
			]) {
				g.beginPath();
				g.moveTo(x, y);
				g.lineTo(x + 10, y + 8);
				g.lineTo(x + 2, y + 10);
				g.lineTo(x + 12, y + 20);
				g.stroke();
			}
		}
	});
}
