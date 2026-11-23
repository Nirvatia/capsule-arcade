// Winter, from the owner's CLAUDE_GRID_WINTER mock-up: snowy meadow, frozen stream,
// snowmen, ice-drop pellets and snowman energizers, a blizzard, a blue night.
import { iceHole } from '../meadow/burrows';
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
import { freshSnow, icicles, snowBank, winterFloor } from './winterDress';
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

/** A snowflake: white, soft, a faint cool rim so it reads over the snow. */
const flake = lazy(() =>
	radial([
		[0, 'rgba(255,255,255,1)'],
		[0.58, 'rgba(252,254,255,.95)'],
		[0.74, 'rgba(108,134,172,.6)'],
		[1, 'rgba(120,144,180,0)']
	])
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
			// the ridge shows dark where the snow parts along it
			ridge: '#6a4a44',
			ridgeShadow: 'rgba(110,130,160,.45)',
			chimneyCap: '#f4f9fd',
			roofSnow: true
		},
		rock: ['#b9c4d0', '#6f7d8d', '#ffffff', '#e8f1f9'],
		// the shared season base (the owner's answers, 2026-11-23): the lair is the common tile
		// floor in cold tones with snow in its seams; the corridor one dark blue-grey of trodden
		// snow (`winterDress`); the bank, the blanket and the icicles dress the walls
		lair: { base: '#8d9bb0', tiles: ['#4c586b', '#485467', '#505c70'] },
		floor: {
			tiles: ['#465166', '#465166', '#465166'],
			specks: ['#6b7890', '#323a4a', '#5a667c'],
			paint: winterFloor
		},
		portal: {
			burrow: iceHole,
			trail: (a) => `rgba(86,98,116,${a * 0.55})`,
			grass: ['#b9c4a6', '#8a9a7a', '#e8eef2'],
			plate: ['#aeb9c6', '#6c7a8c'],
			core: ['#d8f4ff', '#4f9fd8', '#1b2d52'],
			ring: '#9fe3ff',
			corners: '#f4f9fd'
		},
		wall: {
			base: '#5d6a62',
			moss: ['#7a889b', '#566375'],
			top: ['#a3afbf', '#a9b0bd', '#9aa8b8'],
			bottom: ['#7a8799', '#838c9a', '#74869a'],
			mossSpecks: ['#9aa7b8', '#3e4a5a', '#e8f2f8'],
			specks: ['rgba(255,255,255,.4)', 'rgba(40,55,48,.3)'],
			crack: 'rgba(50,65,58,.22)',
			joints: 'rgba(45,60,72,.17)',
			drifts: ['#f4f9fd', '#ffffff'],
			light: 'rgba(255,255,240,.4)',
			dark: 'rgba(30,45,38,.32)',
			flowers: ['#d9333a', '#ff6b6b', '#ffffff'],
			shadow: 'rgba(30,40,70,.45)',
			// winter walls: the shared stone in cold tones under a snow blanket (the scene's wall
			// dress); the bank at their feet goes under the stones, the icicles over them
			paint: (f) => {
				paintWalls(f, { foot: snowBank });
				icicles(f);
			}
		},
		edgeGrass: ['#b9c4a6', '#8a9a7a', '#e8eef2'],
		trees: {
			accent: ['#ffffff', '#9fbfae', '#3b6a58'],
			plain: ['#f4f9fd', '#b4c8d8', '#5a7a8e'],
			accentDots: ['rgba(255,255,255,.85)', 'rgba(40,90,70,.5)'],
			plainDots: ['rgba(255,255,255,.8)', 'rgba(70,95,115,.45)'],
			drifts: 'rgba(255,255,255,.55)',
			// firs with snow on the lit tips (the owner's review: no bubble crowns)
			crown: {
				accent: {
					kind: 'fir',
					leaves: ['#4f7a62', '#36604c', '#21443a'],
					branch: '#4a3a30',
					snow: '#f4f9fd'
				},
				plain: {
					kind: 'fir',
					leaves: ['#5c7f74', '#3f6358', '#284840'],
					branch: '#4a3a30',
					snow: '#eef4fa'
				}
			}
		},
		// bare shrubs with frost on the twigs' ends
		shrub: {
			kind: 'bare',
			leaves: ['#ffffff', '#ffffff', '#ffffff'],
			twig: '#6a5a52',
			frost: '#f4f9fd'
		},
		// the cabins as homes (the owner's review: a cozy background)
		homestead: { wood: '#7a5034', snow: '#f4f9fd' },
		// fresh snow piles up a little while the blizzard blows (the theme's `wet` layer)
		wet: freshSnow,
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
		// the blizzard without a white veil (the owner's answers): faint mist, a faint tint
		mistAlpha: (s) => 0.04 + 0.06 * s,
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
		stormAlpha: 0.08,
		// a blizzard (the owner's review): dense flakes in three depths, each with a faint cool rim
		// so it reads over the snow, gusts that push the whole field, and thin streaks of drifting
		// snow low and fast; no white veil
		weather: {
			count: 900,
			make: (i, vw, vh): WeatherParticle => {
				const st = i % 6 === 0;
				const z = Math.random();
				const s = st ? 0.8 + Math.random() * 0.6 : 2.8 + z * 6.2;
				return {
					st,
					im: st ? streakTexture(0xffffff) : flake(),
					w: st ? 30 * s : s,
					h: st ? 1.3 : s,
					px: Math.random() * vw,
					py: Math.random() * vh,
					vx: st ? 22 + Math.random() * 8 : 7 + z * 11,
					vy: st ? 1 + Math.random() : 2.5 + z * 4.5,
					ph: Math.random() * 6,
					rot: st ? 0.08 : 0,
					add: false
				};
			},
			step: (p, d, t, s, vw, vh) => {
				const gust = 1 + 0.45 * Math.sin(t * 0.7) + 0.2 * Math.sin(t * 1.9 + 1);
				p.px += p.vx * d * s * gust;
				p.py += p.vy * d * s + (p.st ? 0 : Math.sin(t * 2.2 + p.ph) * 0.35);
				if (p.px > vw + 40) {
					p.px = -40;
					p.py = Math.random() * vh;
				}
				if (p.py > vh + 30) {
					p.py = -30;
					p.px = Math.random() * vw;
				}
			},
			alpha: (p, s) => s * (p.st ? 0.3 : 0.95)
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
