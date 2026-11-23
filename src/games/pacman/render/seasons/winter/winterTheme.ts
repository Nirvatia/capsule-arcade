// Winter, from the owner's CLAUDE_GRID_WINTER mock-up: snowy meadow, frozen stream,
// snowmen, ice-drop pellets and snowman energizers, a blizzard, a blue night.
import type { MeadowTheme, WeatherParticle } from '../meadow/MeadowTheme';
import { newYearScene } from './winterScene';
import {
	glowTexture,
	lazy,
	radial,
	streakTexture,
	tinted,
	washTexture
} from '../meadow/meadowSprites';
import { bauble, winterPellet } from '../meadow/seasonFood';
import { paintWalls } from '../meadow/meadowBakeWalls';
import { LAIR, T } from '../meadow/MeadowBake';
import { ICE_PALETTE } from '../../transitions/decay/LevelDecay';

const fog = lazy(() =>
	tinted(
		radial([
			[0, 'rgba(235,245,235,.9)'],
			[1, 'rgba(235,245,235,0)']
		]),
		0xdbe8f5
	)
);

export const winterTheme: MeadowTheme = {
	name: 'winter',
	bake: {
		bg: '#c9d8e8',
		groundCenter: '#f2f7fc',
		groundBlobs: ['rgba(255,255,255,.4)', 'rgba(90,120,170,.06)'],
		grass: ['#9aa888aa', '#b8c0a488', '#6f7f66aa', '#ffffff66'],
		curls: 'rgba(150,175,215,.28)',
		stream: ['rgba(70,95,130,.35)', '#dbe9f3', '#b4d6e8', 'rgba(150,200,225,.6)'],
		shadow: '50,70,110',
		bush: ['#ffffff', '#a9bfd6'],
		pond: {
			sand: '#f4f9fd',
			water: ['#eaf6fd', '#8fc3de'],
			rim: 'rgba(60,100,140,.35)',
			highlight: 'rgba(255,255,255,.85)',
			stones: '#ffffff'
		},
		bridge: { caps: '#f4f9fd', middle: 'rgba(255,255,255,.9)' },
		cabin: {
			walls: ['#bb6851', '#a65240', '#87423b', '#6a342f'],
			roofBlobs: 'rgba(248,252,255,.93)',
			ridge: '#f6fafd',
			ridgeShadow: 'rgba(110,130,160,.45)',
			chimneyCap: '#f4f9fd'
		},
		rock: ['#b9c4d0', '#6f7d8d', '#ffffff', '#e8f1f9'],
		// The lair is a frozen crust: muted ice a step lighter than the corridor floor, a
		// glossy sheen, thin cracks, trapped air. Edge cells melt into the corridor slate so
		// there is no hard rim at the opening. The ghosts and the Easter egg must read on
		// it, so no bright spots. `base`/`tiles` stay as the no-hook fallback.
		lair: {
			base: '#66788a',
			tiles: ['#66788a', '#607284', '#6c7e90'],
			paint: (f, { r, c, x, y, k }) => {
				const { S, b, blob } = f;
				// a cell touching the corridor takes the corridor's slate: a soft shoreline
				let edge = false;
				for (const [dr, dc] of [
					[0, -1],
					[0, 1],
					[-1, 0],
					[1, 0]
				] as const) {
					const n = S[r + dr]?.[c + dc];
					if (n && n !== 'WL' && n !== 'ES' && !LAIR.has(n)) {
						edge = true;
					}
				}
				const dim = edge ? 0.55 : 1;
				b.fillStyle = edge ? '#576475' : '#66788a';
				b.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
				blob(
					x + k() * T,
					y + k() * T,
					5 + k() * 4,
					3 + k() * 2.5,
					`rgba(214,232,244,${0.28 * dim})`,
					k()
				);
				blob(
					x + k() * T,
					y + k() * T,
					3.5 + k() * 3,
					2 + k() * 1.5,
					`rgba(232,244,252,${0.2 * dim})`,
					k()
				);
				// the old tile seams, frozen over
				b.strokeStyle = 'rgba(240,248,255,.13)';
				b.lineWidth = 0.8;
				b.beginPath();
				b.moveTo(x, y + T / 2);
				b.lineTo(x + T, y + T / 2);
				b.moveTo(x + T / 2, y);
				b.lineTo(x + T / 2, y + T);
				b.stroke();
				// thin cracks
				if (k() < 0.35) {
					b.strokeStyle = 'rgba(46,66,86,.38)';
					b.lineWidth = 0.9;
					const cx = x + 3 + k() * (T - 6);
					const cy = y + 3 + k() * (T - 6);
					b.beginPath();
					b.moveTo(cx, cy);
					b.lineTo(cx + (k() - 0.5) * 10, cy + 3 + k() * 6);
					b.lineTo(cx + (k() - 0.5) * 14, cy + 8 + k() * 8);
					b.stroke();
				}
				// trapped air bubbles
				for (let i = 0; i < 2; i++) {
					if (k() < 0.5) {
						blob(
							x + k() * T,
							y + k() * T,
							0.7 + k() * 0.6,
							0.6 + k() * 0.5,
							'rgba(238,248,254,.5)',
							0
						);
					}
				}
			}
		},
		floor: {
			tiles: ['#566274', '#515d6f', '#5b6779'],
			specks: ['#6a768a', '#3a4452', '#7a869a'],
			// winter floor: one flat slate (no per-tile shade steps, a corridor reads as one
			// continuous floor), quiet frost: an ice streak along the run, a rare frozen
			// puddle, frost specks at a neighbouring wall base. All below the food.
			paint: (f, { r, c, x, y, k }) => {
				const { P, S, b, blob } = f;
				b.fillStyle = '#525d6e';
				b.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
				for (let i = 0; i < 2; i++) {
					blob(
						x + k() * T,
						y + k() * T,
						0.6 + k() * 1.4,
						0.5 + k(),
						P.floor.specks[(k() * 3) | 0],
						k() * 3
					);
				}
				const open = (rr: number, cc: number) => {
					const t = S[rr]?.[cc];
					return !!t && t !== 'WL' && t !== 'ES';
				};
				if (k() < 0.14) {
					b.strokeStyle = 'rgba(205,228,248,.26)';
					b.lineWidth = 1;
					b.beginPath();
					if (open(r, c - 1) || open(r, c + 1)) {
						const yy = y + 5 + k() * (T - 10);
						b.moveTo(x + 3 + k() * 5, yy);
						b.lineTo(x + T - 3 - k() * 5, yy);
					} else {
						const xx = x + 5 + k() * (T - 10);
						b.moveTo(xx, y + 3 + k() * 5);
						b.lineTo(xx, y + T - 3 - k() * 5);
					}
					b.stroke();
				}
				if (k() < 0.03) {
					blob(
						x + 5 + k() * (T - 10),
						y + 5 + k() * (T - 10),
						5.5 + k() * 3,
						3.5 + k() * 2,
						'rgba(188,218,240,.16)',
						k()
					);
				}
				for (const [dr, dc] of [
					[0, -1],
					[0, 1],
					[-1, 0],
					[1, 0]
				] as const) {
					if (S[r + dr]?.[c + dc] !== 'WL' || k() >= 0.65) {
						continue;
					}
					for (let i = 0; i < 2; i++) {
						const t = k();
						blob(
							dc ? x + (dc > 0 ? T - 2 - k() * 1.5 : 2 + k() * 1.5) : x + 3 + t * (T - 6),
							dr ? y + (dr > 0 ? T - 2 - k() * 1.5 : 2 + k() * 1.5) : y + 3 + t * (T - 6),
							0.8 + k() * 0.7,
							0.6 + k() * 0.5,
							'rgba(228,240,250,.5)',
							0
						);
					}
				}
			}
		},
		portal: {
			trail: (a) => `rgba(86,98,116,${a * 0.55})`,
			grass: ['#b9c4a6', '#8a9a7a', '#e8eef2'],
			plate: ['#aeb9c6', '#6c7a8c'],
			core: ['#d8f4ff', '#4f9fd8', '#1b2d52'],
			ring: '#9fe3ff',
			corners: '#f4f9fd'
		},
		wall: {
			base: '#5d6a62',
			moss: ['#4f7f66', '#2f5a4a'],
			top: ['#a3afbf', '#a9b0bd', '#9aa8b8'],
			bottom: ['#7a8799', '#838c9a', '#74869a'],
			mossSpecks: ['#8fb8a2', '#2a4f40', '#e8f2f8'],
			specks: ['rgba(255,255,255,.4)', 'rgba(40,55,48,.3)'],
			crack: 'rgba(50,65,58,.22)',
			joints: 'rgba(45,60,72,.17)',
			drifts: ['#f4f9fd', '#ffffff'],
			light: 'rgba(255,255,240,.4)',
			dark: 'rgba(30,45,38,.32)',
			flowers: ['#d9333a', '#ff6b6b', '#ffffff'],
			shadow: 'rgba(30,40,70,.45)',
			// winter walls: same stone, the snow lies on the rims and caps, not across the
			// face; a deeper soft shadow under the blocks for depth
			paint: (f) => paintWalls(f, { snow: 'caps', shadow: [11, 2.5, 4.5] })
		},
		edgeGrass: ['#b9c4a6', '#8a9a7a', '#e8eef2'],
		trees: {
			accent: ['#ffffff', '#9fbfae', '#3b6a58'],
			plain: ['#f4f9fd', '#b4c8d8', '#5a7a8e'],
			accentDots: ['rgba(255,255,255,.85)', 'rgba(40,90,70,.5)'],
			plainDots: ['rgba(255,255,255,.8)', 'rgba(70,95,115,.45)'],
			drifts: 'rgba(255,255,255,.55)'
		},
		scene: newYearScene,
		landmark: {
			ex: [1.8, 1.6],
			// a snowman with a red scarf, seen from above
			draw: ({ b, blob, sph, shade }, o) => {
				const r = o.r ?? 0;
				blob(o.x + r * 0.5, o.y + r * 0.6, r * 1.15, r * 0.8, shade(0.32), 0);
				b.strokeStyle = '#5a4028';
				b.lineWidth = 1.6;
				b.beginPath();
				b.moveTo(o.x - r * 0.9, o.y - r * 0.1);
				b.lineTo(o.x + r * 0.9, o.y + r * 0.1);
				b.stroke();
				sph(o.x, o.y + r * 0.2, r, '#ffffff', '#b4c9de');
				sph(o.x - r * 0.1, o.y - r * 0.55, r * 0.62, '#ffffff', '#bfd2e4');
				b.strokeStyle = '#d9333a';
				b.lineWidth = 2.4;
				b.beginPath();
				b.arc(o.x - r * 0.1, o.y - r * 0.55, r * 0.58, 0.3, 2.9);
				b.stroke();
				blob(o.x - r * 0.1, o.y - r * 0.55, r * 0.34, r * 0.34, '#2b3340', 0);
				blob(o.x - r * 0.1, o.y - r * 0.58, r * 0.2, r * 0.2, '#4a5566', 0);
			}
		},
		flowerPatch: ({ rr, pick, fl5 }, o) => {
			const c = o.c ?? 0;
			const cl =
				c < 0.3
					? ['#ffffff', '#e8f2fb']
					: c < 0.55
						? ['#c9dcef', '#e8f2fb']
						: c < 0.8
							? ['#d9333a', '#ff6b6b']
							: ['#f4d4d8', '#ffffff'];
			for (let i = 0; i < (o.n ?? 0); i++) {
				fl5(o.x + rr(-16, 16), o.y + rr(-12, 12), rr(2, 3), pick(cl), '#ffcf4d');
			}
		}
	},
	live: {
		pellet: { texture: winterPellet, size: 10 },
		energizer: {
			texture: bauble,
			size: 19.5,
			glow: 0x9fd8ff,
			glowSize: ((64 * 0.95) / 3) * 0.75,
			motion: 'sway'
		},
		portal: { glow: 0xa8d8ff, deep: 0x0a2a58 },
		glints: 0xffffff,
		fog,
		mistAlpha: (s) => 0.1 + 0.22 * s,
		mistSpeed: (s) => 1 + 6 * s,
		rays: () => 0,
		lit: lazy(() =>
			radial([
				[0, 'rgba(205,228,255,.4)'],
				[1, 'rgba(255,205,130,0)']
			])
		),
		litAlpha: () => 1,
		drift: {
			texture: () => glowTexture(0xffffff),
			size: (sc, rand) => {
				const s = 64 * sc * (0.035 + rand * 0.05);
				return [s, s];
			},
			direction: 1,
			speed: 16,
			spin: false
		},
		wash: lazy(() => washTexture('rgba(255,236,200,.14)', 'rgba(70,90,150,.16)')),
		stormTint: '#e4edf6',
		stormAlpha: 0.24,
		weather: {
			count: 220,
			make: (i, vw, vh): WeatherParticle => {
				const st = i % 2 === 0;
				const s = st ? 0.8 + Math.random() : 0.14 + Math.random() * 0.2;
				return {
					st,
					im: st ? streakTexture(i % 4 === 0 ? 0xffffff : 0xa9bdd6) : glowTexture(0xffffff),
					w: st ? 16 * s : (64 * s) / 3,
					h: st ? 2 * s : (64 * s) / 3,
					px: Math.random() * vw,
					py: Math.random() * vh,
					vx: st ? 12 + Math.random() * 8 : 3 + Math.random() * 3,
					vy: st ? 4 + Math.random() * 3 : 2 + Math.random() * 2,
					ph: Math.random() * 6,
					rot: st ? 0.3 : 0,
					add: false
				};
			},
			step: (p, d, t, s, vw, vh) => {
				p.px += p.vx * d * s;
				p.py += p.vy * d * s + (p.st ? 0 : Math.sin(t * 2 + p.ph) * 0.3);
				if (p.px > vw + 30) {
					p.px = -30;
					p.py = Math.random() * vh;
				}
				if (p.py > vh + 30) {
					p.py = -30;
					p.px = Math.random() * vw;
				}
			},
			alpha: (p, s) => s * (p.st ? 0.7 : 0.9)
		},
		nightTint: '#5a6ea6',
		nightAlpha: 0.55,
		vignette: lazy(() =>
			radial([
				[0.5, 'rgba(12,22,44,0)'],
				[1, 'rgba(12,22,44,.5)']
			])
		),
		lights: { energizer: 0x7fd8ff, portal: 0x9fd8ff },
		chimneySmoke: true
	},
	decay: ICE_PALETTE
};
