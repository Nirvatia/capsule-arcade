import type { GridLayout } from '../../../src/games/pacman/render/maze/GridView';
import { canvasContext, glowTexture, makeCanvas } from '../../../src/games/pacman/render/common/textures';
import type { WeatherParticle } from '../../../src/games/pacman/render/seasons/meadow/MeadowTheme';
import type { MeadowTheme } from '../../../src/games/pacman/render/seasons/meadow/MeadowTheme';
import { streakTexture } from '../../../src/games/pacman/render/seasons/meadow/meadowSprites';
import { winterTheme } from '../../../src/games/pacman/render/seasons/winter/winterTheme';
import { drawWinterFestiveLights, drawWinterTree, paintWinterEnvironment, WINTER_LANDMARK_EX } from './winterDecor';
import { winterSceneBauble } from './winterFood';
import { paintWinterFloor, paintWinterLair, paintWinterWalls } from './winterSurfaces';

export interface WinterSceneLayers {
	walls: boolean;
	floor: boolean;
	lair: boolean;
	decor: boolean;
	frost: boolean;
	lights: boolean;
	weather: boolean;
}

export const winterSceneLayers: WinterSceneLayers = {
	walls: true,
	floor: true,
	lair: true,
	decor: true,
	frost: true,
	lights: true,
	weather: true
};

let vignetteCanvas: HTMLCanvasElement | null = null;
let playableMask: { x: number; y: number; w: number; h: number } | null = null;

function randomStream(seed: number): () => number {
	let s = seed;
	return () => {
		s = (s * 16807) % 2147483647;
		return s / 2147483647;
	};
}

export function updateWinterFrost(vw: number, vh: number, grid: readonly string[][], layout: GridLayout): void {
	const scale = Math.min(1, 512 / Math.max(vw, vh));
	const w = Math.max(1, Math.ceil(vw * scale));
	const h = Math.max(1, Math.ceil(vh * scale));
	const cv = makeCanvas(w, h);
	const c = canvasContext(cv);
	c.drawImage(winterTheme.live.vignette(), 0, 0, w, h);
	const pad = layout.tileSize * 0.65;
	const board = {
		x: layout.offsetX - pad,
		y: layout.offsetY - pad,
		w: grid[0].length * layout.tileSize + pad * 2,
		h: grid.length * layout.tileSize + pad * 2
	};
	playableMask = board;
	if (!winterSceneLayers.frost) {
		vignetteCanvas = cv;
		return;
	}
	const marginX = Math.max(0, (vw - board.w) / 2);
	const marginY = Math.max(0, (vh - board.h) / 2);
	const strength = Math.min(1, Math.max(marginX / 75, marginY / 115));
	if (strength <= 0.04) {
		vignetteCanvas = cv;
		return;
	}
	c.save();
	c.beginPath();
	c.rect(0, 0, w, h);
	c.rect(board.x * scale, board.y * scale, board.w * scale, board.h * scale);
	c.clip('evenodd');
	const edge = Math.max(12, 34 * strength);
	for (const [x0, y0, x1, y1] of [
		[0, 0, edge, 0],
		[w, 0, w - edge, 0],
		[0, h, edge, h],
		[w, h, w - edge, h]
	] as const) {
		const g = c.createLinearGradient(x0, y0, x1, y1);
		g.addColorStop(0, `rgba(224,239,250,${0.12 * strength})`);
		g.addColorStop(1, 'rgba(224,239,250,0)');
		c.fillStyle = g;
		c.fillRect(Math.min(x0, x1), 0, Math.abs(x1 - x0), h);
	}
	const rnd = randomStream(193);
	c.lineCap = 'round';
	for (let corner = 0; corner < 4; corner++) {
		const left = corner === 0 || corner === 2;
		const top = corner < 2;
		const sx = left ? 1 : -1;
		const sy = top ? 1 : -1;
		const ox = left ? 0 : w;
		const oy = top ? 0 : h;
		for (let i = 0; i < 12; i++) {
			const along = rnd() * Math.min(w, h) * 0.22;
			const vertical = rnd() > 0.5;
			const x = ox + (vertical ? sx * rnd() * 8 : sx * along);
			const y = oy + (vertical ? sy * along : sy * rnd() * 8);
			const length = 9 + rnd() * 24;
			const dx = sx * (0.35 + rnd() * 0.65);
			const dy = sy * (0.35 + rnd() * 0.65);
			c.strokeStyle = `rgba(224,240,251,${(0.1 + rnd() * 0.12) * strength})`;
			c.lineWidth = 0.45 + rnd() * 0.45;
			c.beginPath();
			c.moveTo(x, y);
			c.lineTo(x + dx * length, y + dy * length);
			for (let j = 1; j <= 3; j++) {
				const u = j / 4;
				const px = x + dx * length * u;
				const py = y + dy * length * u;
				const branch = length * (0.2 + rnd() * 0.16);
				c.moveTo(px, py);
				c.lineTo(px + dy * branch * sx, py - dx * branch * sy);
				c.moveTo(px, py);
				c.lineTo(px - dy * branch * 0.65 * sx, py + dx * branch * 0.65 * sy);
			}
			c.stroke();
		}
	}
	c.restore();
	vignetteCanvas = cv;
}

function weatherMake(i: number, vw: number, vh: number): WeatherParticle {
	const rnd = randomStream(71 + i * 977);
	const st = i % 2 === 0;
	const s = st ? 0.75 + rnd() * 0.7 : 0.14 + rnd() * 0.18;
	return {
		st,
		im: st ? streakTexture(i % 4 === 0 ? 0xffffff : 0xa9bdd6) : glowTexture(0xffffff),
		w: st ? 13 * s : (64 * s) / 3,
		h: st ? 1.6 * s : (64 * s) / 3,
		px: rnd() * vw,
		py: rnd() * vh,
		vx: st ? 12 + rnd() * 8 : 3 + rnd() * 3,
		vy: st ? 4 + rnd() * 3 : 2 + rnd() * 2,
		ph: rnd() * 6,
		rot: st ? 0.3 : 0,
		add: false
	};
}

export const winterSceneTheme: MeadowTheme = {
	...winterTheme,
	bake: {
		...winterTheme.bake,
		wall: {
			...winterTheme.bake.wall,
			drifts: ['rgba(0,0,0,0)', 'rgba(0,0,0,0)'],
			flowers: ['#9f343d', '#bd4b51', '#dcebf4'],
			paint: (f) => {
				if (winterSceneLayers.walls) {
					paintWinterWalls(f);
				} else {
					winterTheme.bake.wall.paint?.(f);
				}
				if (winterSceneLayers.decor) {
					paintWinterEnvironment(f);
				}
			}
		},
		floor: {
			...winterTheme.bake.floor,
			tiles: ['rgba(0,0,0,0)', '#525d6e', '#525d6e'],
			paint: (f, cell) => {
				if (winterSceneLayers.floor) paintWinterFloor(f, cell);
				else winterTheme.bake.floor.paint?.(f, cell);
			}
		},
		lair: {
			...winterTheme.bake.lair,
			base: 'rgba(0,0,0,0)',
			paint: (f, cell) => {
				if (winterSceneLayers.lair) paintWinterLair(f, cell);
				else winterTheme.bake.lair.paint?.(f, cell);
			}
		},
		landmark: {
			ex: WINTER_LANDMARK_EX,
			draw: (k, o) => {
				if (winterSceneLayers.decor && o.x < 0) drawWinterTree(k, o);
				winterTheme.bake.landmark.draw(k, o);
			}
		}
	},
	live: {
		...winterTheme.live,
		energizer: {
			...winterTheme.live.energizer,
			texture: winterSceneBauble
		},
		vignette: () => vignetteCanvas ?? winterTheme.live.vignette(),
		weather: {
			count: 190,
			make: weatherMake,
			step: (p, d, t, s, vw, vh) => {
				p.px += p.vx * d * s;
				p.py += p.vy * d * s + (p.st ? 0 : Math.sin(t * 2 + p.ph) * 0.3);
				if (p.px > vw + 30) {
					p.px = -30;
					p.py = ((Math.sin(p.ph * 91 + Math.floor(t)) + 1) / 2) * vh;
				}
				if (p.py > vh + 30) {
					p.py = -30;
					p.px = ((Math.sin(p.ph * 47 + Math.floor(t)) + 1) / 2) * vw;
				}
			},
			alpha: (p, storm) => {
				const m = playableMask;
				const onBoard = m && p.px >= m.x && p.px <= m.x + m.w && p.py >= m.y && p.py <= m.y + m.h;
				return storm * (p.st ? 0.52 : 0.72) * (onBoard ? 0.3 : 1);
			}
		}
	},
	decay: winterTheme.decay
};

export { drawWinterFestiveLights };
