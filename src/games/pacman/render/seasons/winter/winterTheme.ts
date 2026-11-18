// Winter as a full New Year place (the owner's pick over the palette-swap meadow): snow-capped
// walls, composed roof snow, lit cabins and garlands, snow-laden firs, frozen water; ice-drop
// pellets and snowman energizers, a blizzard, a blue night. The static setting lives in winterBake.
import type { MeadowTheme, WeatherParticle } from '../meadow/MeadowTheme';
import {
	drawWinterLandmark,
	paintIceExtras,
	paintSnowPatch,
	paintSnowWalls,
	paintWinterAfter
} from './winterBake';
import {
	glowTexture,
	lazy,
	radial,
	streakTexture,
	tinted,
	washTexture
} from '../meadow/meadowSprites';
import { snowman, winterPellet } from '../meadow/seasonFood';
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
		groundCenter: '#f7fbfe',
		groundBlobs: ['rgba(255,255,255,.5)', 'rgba(120,150,200,.08)'],
		grass: ['#ffffff88', '#dfe9f488', '#c9d6e688', '#ffffff66'],
		curls: 'rgba(160,185,225,.3)',
		stream: ['rgba(90,120,160,.35)', '#e8f2fa', '#cfe4f2', 'rgba(220,240,252,.8)'],
		shadow: '50,70,110',
		bush: ['#ffffff', '#a9bfd6'],
		pond: {
			sand: '#f6fafd',
			water: ['#f2fafe', '#bcd8ea'],
			rim: 'rgba(90,130,170,.4)',
			highlight: 'rgba(255,255,255,.9)',
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
		// muted (owner's review): the ghosts and the Easter egg must read on the lair floor
		lair: { base: '#2f3846', tiles: ['#56637a', '#515e73', '#5b6880'] },
		floor: {
			tiles: ['#566274', '#515d6f', '#5b6779'],
			specks: ['#6a768a', '#3a4452', '#7a869a']
		},
		portal: {
			trail: (a) => `rgba(140,160,190,${a * 0.4})`,
			grass: ['#e6eef6', '#c9d6e6', '#ffffff'],
			plate: ['#aeb9c6', '#6c7a8c'],
			core: ['#d8f4ff', '#4f9fd8', '#1b2d52'],
			ring: '#9fe3ff',
			corners: '#f4f9fd'
		},
		wall: {
			base: '#6a7684',
			moss: ['#4f7f66', '#2f5a4a'],
			top: ['#cfd9e4', '#d6dde6', '#c4d0dd'],
			bottom: ['#93a1b3', '#9aa6b6', '#8b99ac'],
			mossSpecks: ['#8fb8a2', '#2a4f40', '#e8f2f8'],
			specks: ['rgba(255,255,255,.5)', 'rgba(60,75,95,.3)'],
			crack: 'rgba(70,85,100,.15)',
			joints: 'rgba(70,85,105,.12)',
			drifts: ['#f4f9fd', '#ffffff'],
			light: 'rgba(255,255,255,.5)',
			dark: 'rgba(40,55,80,.3)',
			flowers: ['#bfe0f5', '#ffffff', '#9fd0ea'],
			shadow: 'rgba(30,40,70,.45)',
			paint: paintSnowWalls
		},
		edgeGrass: ['#b9c4a6', '#8a9a7a', '#e8eef2'],
		trees: {
			accent: ['#ffffff', '#dcebe2', '#3f6f5b'],
			plain: ['#f4f9fd', '#b4c8d8', '#5a7a8e'],
			accentDots: ['rgba(255,255,255,.9)', 'rgba(47,90,72,.5)'],
			plainDots: ['rgba(255,255,255,.8)', 'rgba(70,95,115,.45)'],
			drifts: 'rgba(255,255,255,.55)'
		},
		landmark: {
			ex: [1.8, 1.6],
			draw: drawWinterLandmark
		},
		flowerPatch: paintSnowPatch,
		pondExtras: paintIceExtras,
		after: paintWinterAfter
	},
	live: {
		pellet: { texture: winterPellet, size: 10 },
		energizer: {
			texture: snowman,
			size: 26,
			glow: 0x9fd8ff,
			glowSize: (64 * 0.95) / 3,
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
