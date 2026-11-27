// The Zone's actors and props as cached sprites (drawn once, in code, at 96 px unless noted; the view
// scales them). Bold silhouettes with a dark outline so every kind reads at once on the asphalt:
// the tushkan's colour is its collar (its role), its fear is blue, its rage red-eyed.
import { makeCanvas, context } from '../doom/fleshNoise';

type Cv = HTMLCanvasElement;
type Ctx = CanvasRenderingContext2D;

const INK = '#15110d';
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

const outline = (g: Ctx, w = 3): void => {
	g.lineWidth = w;
	g.strokeStyle = INK;
	g.lineJoin = 'round';
	g.stroke();
};

export const TUSHKAN_COLLARS = ['#e04a3c', '#f06fa6', '#3cc0e8', '#f2a63a'] as const;
export type TushkanMood = 'calm' | 'rush' | 'scared' | 'flash';

/** A tushkan facing right (+x): a stocky rodent with big round ears and a long bare tail. */
export function tushkanSprite(role: number, mood: TushkanMood): Cv {
	return made(`tushkan${role % 4}${mood}`, 96, 96, (g) => {
		const scared = mood === 'scared';
		const flash = mood === 'flash';
		const fur = scared ? '#86aef0' : flash ? '#f3f7ff' : '#9c8f7e';
		const back = scared ? '#4a68b0' : flash ? '#c9d4ee' : '#5a4d3e';
		g.strokeStyle = '#c99a9c';
		g.lineWidth = 3.4;
		g.lineCap = 'round';
		g.beginPath();
		g.moveTo(24, 48);
		g.bezierCurveTo(10, 62, 2, 44, 6, 34);
		g.stroke();
		for (const y of [33, 63]) {
			g.fillStyle = fur;
			g.beginPath();
			g.ellipse(30, y, 8, 4.5, 0, 0, 7);
			g.fill();
			outline(g, 2.2);
		}
		g.fillStyle = fur;
		g.beginPath();
		g.ellipse(41, 48, 25, 18, 0, 0, 7);
		g.fill();
		outline(g);
		g.fillStyle = back;
		g.globalAlpha = 0.55;
		g.beginPath();
		g.ellipse(39, 48, 19, 5.5, 0, 0, 7);
		g.fill();
		g.globalAlpha = 1;
		g.fillStyle = TUSHKAN_COLLARS[role % 4];
		g.beginPath();
		g.ellipse(54, 48, 6, 17, 0, 0, 7);
		g.fill();
		outline(g, 2);
		g.fillStyle = fur;
		g.beginPath();
		g.moveTo(60, 38);
		g.quadraticCurveTo(80, 38, 90, 48);
		g.quadraticCurveTo(80, 58, 60, 58);
		g.quadraticCurveTo(56, 48, 60, 38);
		g.fill();
		outline(g);
		for (const y of [30, 66]) {
			g.fillStyle = fur;
			g.beginPath();
			g.arc(62, y, 11, 0, 7);
			g.fill();
			outline(g, 2.6);
			g.fillStyle = scared ? '#cfe0ff' : '#e9a9b3';
			g.beginPath();
			g.arc(62, y, 6.4, 0, 7);
			g.fill();
		}
		g.fillStyle = '#e07888';
		g.beginPath();
		g.arc(89, 48, 3.2, 0, 7);
		g.fill();
		g.strokeStyle = 'rgba(21,17,13,.7)';
		g.lineWidth = 1.2;
		for (const s of [-1, 1]) {
			for (const k of [-5, 0, 5]) {
				g.beginPath();
				g.moveTo(84, 48 + s * 3);
				g.lineTo(94, 48 + s * 9 + k);
				g.stroke();
			}
		}
		for (const s of [-1, 1]) {
			const ex = 74;
			const ey = 48 + s * 7;
			g.fillStyle = '#fff';
			g.beginPath();
			g.arc(ex, ey, scared ? 5.6 : 4.6, 0, 7);
			g.fill();
			outline(g, 1.6);
			g.fillStyle = mood === 'rush' ? '#ff2a1a' : INK;
			g.beginPath();
			g.arc(ex + 1, ey, scared ? 2 : mood === 'rush' ? 3.2 : 2.5, 0, 7);
			g.fill();
			if (mood === 'rush') {
				g.strokeStyle = INK;
				g.lineWidth = 2.2;
				g.beginPath();
				g.moveTo(ex - 5, ey - s * 7);
				g.lineTo(ex + 4, ey - s * 2);
				g.stroke();
			}
		}
		if (mood === 'rush') {
			g.fillStyle = '#fff';
			g.beginPath();
			g.moveTo(84, 46);
			g.lineTo(87, 51);
			g.lineTo(90, 46);
			g.closePath();
			g.fill();
		}
	});
}

/** The poltergeist: a pale ghost with hollow eyes (the debris that circles it is drawn live). */
export function poltergeistSprite(angry: boolean): Cv {
	return made(`polter${angry}`, 96, 96, (g) => {
		g.shadowColor = angry ? '#ff6a5a' : '#a8c8ff';
		g.shadowBlur = 14;
		const grad = g.createLinearGradient(0, 14, 0, 86);
		grad.addColorStop(0, '#f4f8ff');
		grad.addColorStop(1, '#b4c4e4');
		g.fillStyle = grad;
		g.beginPath();
		g.moveTo(22, 84);
		g.quadraticCurveTo(14, 20, 48, 14);
		g.quadraticCurveTo(82, 20, 74, 84);
		g.lineTo(64, 74);
		g.lineTo(56, 86);
		g.lineTo(48, 74);
		g.lineTo(40, 86);
		g.lineTo(32, 74);
		g.closePath();
		g.fill();
		g.shadowBlur = 0;
		outline(g, 2.6);
		g.fillStyle = '#0a0d14';
		for (const x of [38, 58]) {
			g.beginPath();
			g.ellipse(x, 42, 6, 9, 0, 0, 7);
			g.fill();
		}
		if (angry) {
			g.fillStyle = '#ff4a3a';
			for (const x of [38, 58]) {
				g.beginPath();
				g.arc(x, 44, 2.6, 0, 7);
				g.fill();
			}
		}
		g.beginPath();
		g.ellipse(48, 62, 9, angry ? 7 : 5, 0, 0, 7);
		g.fillStyle = '#0a0d14';
		g.fill();
	});
}

/** A bunker hatch: steel disc, hazard ring, handle. */
export function hatchSprite(): Cv {
	return made('hatch', 96, 96, (g) => {
		g.fillStyle = '#1d2125';
		g.beginPath();
		g.arc(48, 48, 45, 0, 7);
		g.fill();
		for (let k = 0; k < 16; k += 1) {
			g.fillStyle = k % 2 ? '#1d2125' : '#4ccf62';
			g.beginPath();
			g.moveTo(48, 48);
			g.arc(48, 48, 43, (k / 16) * 6.2832, ((k + 1) / 16) * 6.2832);
			g.closePath();
			g.fill();
		}
		const grad = g.createRadialGradient(40, 38, 4, 48, 48, 34);
		grad.addColorStop(0, '#8a9298');
		grad.addColorStop(1, '#4f565b');
		g.fillStyle = grad;
		g.beginPath();
		g.arc(48, 48, 33, 0, 7);
		g.fill();
		outline(g, 3);
		g.fillStyle = '#23282c';
		g.beginPath();
		g.roundRect(26, 44, 44, 9, 4);
		g.fill();
		g.fillStyle = '#c9d0d4';
		for (const [x, y] of [
			[30, 28],
			[66, 28],
			[30, 68],
			[66, 68]
		]) {
			g.beginPath();
			g.arc(x, y, 2.6, 0, 7);
			g.fill();
		}
	});
}

/** A nut (the dots) or a golden nut (inside an anomaly field). */
export function nutSprite(golden: boolean): Cv {
	return made(`nut${golden}`, 48, 48, (g) => {
		if (golden) {
			const halo = g.createRadialGradient(24, 24, 2, 24, 24, 24);
			halo.addColorStop(0, 'rgba(255,214,70,.6)');
			halo.addColorStop(1, 'rgba(255,214,70,0)');
			g.fillStyle = halo;
			g.fillRect(0, 0, 48, 48);
		}
		const grad = g.createLinearGradient(8, 8, 40, 40);
		grad.addColorStop(0, golden ? '#ffe27a' : '#eeeadb');
		grad.addColorStop(1, golden ? '#c8860f' : '#8f8a74');
		g.fillStyle = grad;
		g.beginPath();
		for (let k = 0; k < 6; k += 1) {
			const a = (k / 6) * 6.2832 + 0.5236;
			g[k === 0 ? 'moveTo' : 'lineTo'](24 + Math.cos(a) * 15, 24 + Math.sin(a) * 15);
		}
		g.closePath();
		g.fill();
		outline(g, 2.4);
		g.fillStyle = INK;
		g.beginPath();
		g.arc(24, 24, 6, 0, 7);
		g.fill();
		g.fillStyle = 'rgba(255,255,255,.75)';
		g.beginPath();
		g.arc(18, 17, 2.4, 0, 7);
		g.fill();
	});
}

export const ARTIFACT_GLOW = ['#7fe9ff', '#ffc933', '#ff5a4a', '#74f06a'] as const;

/** The artifacts: 0 Medusa (a cyan jellyfish), 1 Kolobok (a bumpy gold ball), 2 Stone Blood (a red crystal), 3 Battery (a green cell). */
export function artifactSprite(i: number): Cv {
	return made(`artifact${i % 4}`, 96, 96, (g) => {
		g.shadowColor = ARTIFACT_GLOW[i % 4];
		g.shadowBlur = 12;
		if (i % 4 === 0) {
			g.strokeStyle = '#9ff3ff';
			g.lineWidth = 3;
			g.lineCap = 'round';
			for (let k = 0; k < 6; k += 1) {
				const x = 28 + k * 8.5;
				g.beginPath();
				g.moveTo(x, 50);
				g.bezierCurveTo(x - 6, 62, x + 6, 70, x - 2, 84);
				g.stroke();
			}
			const grad = g.createRadialGradient(44, 34, 4, 48, 42, 30);
			grad.addColorStop(0, '#f2fdff');
			grad.addColorStop(1, '#2cb8d8');
			g.fillStyle = grad;
			g.beginPath();
			g.moveTo(18, 52);
			g.quadraticCurveTo(18, 12, 48, 12);
			g.quadraticCurveTo(78, 12, 78, 52);
			g.closePath();
			g.fill();
			g.shadowBlur = 0;
			outline(g, 2.6);
			g.fillStyle = 'rgba(255,255,255,.85)';
			for (const [x, y] of [
				[38, 32],
				[56, 28],
				[62, 42]
			]) {
				g.beginPath();
				g.arc(x, y, 3, 0, 7);
				g.fill();
			}
		} else if (i % 4 === 1) {
			const grad = g.createRadialGradient(40, 38, 4, 48, 48, 32);
			grad.addColorStop(0, '#fff0a0');
			grad.addColorStop(1, '#e0851a');
			g.fillStyle = grad;
			for (let k = 0; k < 11; k += 1) {
				const a = (k / 11) * 6.2832;
				g.beginPath();
				g.arc(48 + Math.cos(a) * 28, 48 + Math.sin(a) * 28, 8.5, 0, 7);
				g.fill();
			}
			g.beginPath();
			g.arc(48, 48, 28, 0, 7);
			g.fill();
			g.shadowBlur = 0;
			outline(g, 2.6);
			g.fillStyle = 'rgba(255,255,255,.75)';
			g.beginPath();
			g.ellipse(38, 36, 8, 5, -0.6, 0, 7);
			g.fill();
		} else if (i % 4 === 2) {
			g.fillStyle = '#c4302b';
			g.beginPath();
			g.moveTo(48, 12);
			g.lineTo(76, 30);
			g.lineTo(76, 64);
			g.lineTo(48, 84);
			g.lineTo(20, 64);
			g.lineTo(20, 30);
			g.closePath();
			g.fill();
			g.shadowBlur = 0;
			outline(g, 2.8);
			g.fillStyle = '#ff7a6a';
			g.beginPath();
			g.moveTo(48, 12);
			g.lineTo(76, 30);
			g.lineTo(48, 46);
			g.lineTo(20, 30);
			g.closePath();
			g.fill();
			g.fillStyle = '#8c1d1c';
			g.beginPath();
			g.moveTo(48, 46);
			g.lineTo(76, 30);
			g.lineTo(76, 64);
			g.lineTo(48, 84);
			g.closePath();
			g.fill();
			g.strokeStyle = INK;
			g.lineWidth = 1.6;
			g.beginPath();
			g.moveTo(48, 46);
			g.lineTo(48, 84);
			g.moveTo(20, 30);
			g.lineTo(48, 46);
			g.lineTo(76, 30);
			g.stroke();
		} else {
			g.fillStyle = '#7e8a8c';
			g.beginPath();
			g.roundRect(36, 10, 24, 10, 3);
			g.fill();
			const grad = g.createLinearGradient(26, 0, 70, 0);
			grad.addColorStop(0, '#aef7a4');
			grad.addColorStop(1, '#2d9a3a');
			g.fillStyle = grad;
			g.beginPath();
			g.roundRect(26, 18, 44, 68, 9);
			g.fill();
			g.shadowBlur = 0;
			outline(g, 2.8);
			g.fillStyle = '#fff';
			g.beginPath();
			g.moveTo(54, 28);
			g.lineTo(38, 54);
			g.lineTo(48, 54);
			g.lineTo(42, 76);
			g.lineTo(60, 46);
			g.lineTo(50, 46);
			g.closePath();
			g.fill();
		}
	});
}

const CABINS = [
	'#c0392b',
	'#e6b422',
	'#2e86de',
	'#2eaf6a',
	'#c0392b',
	'#e6b422',
	'#2e86de',
	'#2eaf6a',
	'#d6d2c2',
	'#c0392b'
] as const;

/** The Ferris wheel (Pripyat's), 288 px: a rusty ring, spokes, ten cabins; it turns slowly in the view. */
export function wheelSprite(): Cv {
	return made('wheel', 288, 288, (g) => {
		const c = 144;
		g.lineCap = 'round';
		for (const [r, w, col] of [
			[120, 9, INK],
			[120, 5, '#93503a'],
			[74, 6, INK],
			[74, 3, '#7a5a48']
		] as const) {
			g.strokeStyle = col;
			g.lineWidth = w;
			g.beginPath();
			g.arc(c, c, r, 0, 7);
			g.stroke();
		}
		for (let k = 0; k < 10; k += 1) {
			const a = (k / 10) * 6.2832;
			g.strokeStyle = INK;
			g.lineWidth = 6;
			g.beginPath();
			g.moveTo(c, c);
			g.lineTo(c + Math.cos(a) * 120, c + Math.sin(a) * 120);
			g.stroke();
			g.strokeStyle = '#8b6a56';
			g.lineWidth = 3;
			g.stroke();
		}
		for (let k = 0; k < 10; k += 1) {
			const a = ((k + 0.5) / 10) * 6.2832;
			const x = c + Math.cos(a) * 120;
			const y = c + Math.sin(a) * 120;
			g.save();
			g.translate(x, y);
			g.rotate(a + Math.PI / 2);
			g.fillStyle = CABINS[k];
			g.beginPath();
			g.roundRect(-15, -11, 30, 22, 5);
			g.fill();
			outline(g, 2.6);
			g.fillStyle = 'rgba(255,255,255,.5)';
			g.fillRect(-12, -8, 24, 4);
			g.restore();
		}
	});
}

/** A rusty barrel facing right (the poltergeist's throw). */
export function barrelSprite(): Cv {
	return made('barrel', 96, 64, (g) => {
		const grad = g.createLinearGradient(0, 10, 0, 54);
		grad.addColorStop(0, '#d0583a');
		grad.addColorStop(1, '#8a2c1a');
		g.fillStyle = grad;
		g.beginPath();
		g.roundRect(8, 10, 80, 44, 9);
		g.fill();
		outline(g, 3);
		g.fillStyle = 'rgba(20,10,6,.6)';
		for (const x of [24, 46, 68]) {
			g.fillRect(x, 10, 5, 44);
		}
		g.fillStyle = '#f2c230';
		g.fillRect(8, 28, 80, 8);
		g.fillStyle = INK;
		for (let k = 0; k < 8; k += 1) {
			g.beginPath();
			g.moveTo(10 + k * 10, 28);
			g.lineTo(18 + k * 10, 28);
			g.lineTo(13 + k * 10, 36);
			g.lineTo(5 + k * 10, 36);
			g.closePath();
			g.fill();
		}
		g.fillStyle = 'rgba(255,255,255,.35)';
		g.fillRect(14, 14, 66, 3);
	});
}
