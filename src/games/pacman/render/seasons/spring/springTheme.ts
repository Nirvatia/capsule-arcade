// Spring, from the owner's CLAUDE_GRID_SPRING mock-up: fresh green meadow, cherry trees,
// picnic blankets, yellow button pellets and cherry-blossom energizers, a petal-laden wind, a soft night.
import { springRoof, cloverPatch } from '../meadow/seasonDetails';
import { stoneWell } from '../meadow/burrows';
import type { MeadowTheme, WeatherParticle } from '../meadow/MeadowTheme';
import { springFloor, hanamiScene } from './springScene';
import {
	glowTexture,
	lazy,
	makeTexture,
	radial,
	tinted,
	washTexture
} from '../meadow/meadowSprites';
import { temari, springPellet } from '../meadow/seasonFood';
import { paintWalls } from '../meadow/meadowBakeWalls';
import { greenFoot } from '../meadow/wallFlora';
import type { DecayPalette } from '../../transitions/decay/DecayPass';

const PETALS = [0xffc2d9, 0xffffff, 0xffdde8, 0xf7a8c4];

/** A single petal, white: tinted per particle. */
const petal = lazy(() =>
	makeTexture(10, 6, (x) => {
		x.fillStyle = '#fff';
		x.beginPath();
		x.moveTo(0.5, 3);
		x.quadraticCurveTo(3, -1, 9.5, 3);
		x.quadraticCurveTo(3, 7, 0.5, 3);
		x.fill();
	})
);

const fog = lazy(() =>
	tinted(
		radial([
			[0, 'rgba(240,255,240,.9)'],
			[1, 'rgba(240,255,240,0)']
		]),
		0xe8f5e0
	)
);

/** Abyss of a spring night: deep moss, teal wisps, petal-pink glints. */
const SPRING_DECAY: DecayPalette = {
	deep: 0x06140c,
	mid: 0x123a26,
	wisp: 0x58d6a0,
	ice: 0xffd6e8,
	rim: 0xff8fc0,
	warm: 0xfff6d8
};

export const springTheme: MeadowTheme = {
	name: 'spring',
	bake: {
		bg: '#9ad66b',
		groundCenter: '#d2ef9a',
		groundBlobs: ['rgba(255,255,220,.4)', 'rgba(40,110,40,.07)'],
		grass: ['#5fa83acc', '#86c94f99', '#4a9030aa', '#e0f59a88'],
		curls: 'rgba(255,255,200,.25)',
		stream: ['rgba(30,70,60,.3)', '#e8f0d0', '#5ec0e0', 'rgba(200,245,255,.6)'],
		shadow: '30,50,20',
		bush: ['#a8e070', '#3f8f3a'],
		pond: {
			sand: '#d9cf9c',
			water: ['#8fe0f0', '#2a9ac0'],
			rim: 'rgba(20,80,100,.45)',
			highlight: 'rgba(255,255,255,.85)',
			stones: '#c4b890'
		},
		bridge: { caps: '#8fd05a', middle: 'rgba(255,190,215,.8)' },
		cabin: {
			roofDress: springRoof,
			walls: ['#bb6851', '#a65240', '#87423b', '#6a342f'],
			roofBlobs: 'rgba(255,190,215,.3)',
			ridge: '#6a3a2a',
			ridgeShadow: 'rgba(60,30,20,.4)',
			chimneyCap: '#5a4a3a'
		},
		rock: ['#b8b8a8', '#6a6a5a', '#7fbf4a', '#9fd46a'],
		// muted (owner's review): the ghosts and the Easter egg must read on the lair floor
		lair: { base: '#2e3424', tiles: ['#5a6446', '#535d40', '#606a4c'] },
		// the holiday scene's corridor (the owner's pick of `season-dress`): one opaque tone, a
		// contact shadow and grass at the walls' feet; the tiles are that tone, as the wall
		// painter lays `tiles[0]` under the rounded corners
		floor: {
			tiles: ['#7b5a3d', '#7b5a3d', '#7b5a3d'],
			paint: springFloor,
			specks: ['#6e5846', '#3a2c20', '#7a6452']
		},
		portal: {
			burrow: stoneWell,
			trail: (a) => `rgba(60,45,30,${a * 0.55})`,
			grass: ['#5faa3a', '#86c94f', '#b8e07a'],
			plate: ['#d8d6c0', '#8f8c70'],
			core: ['#fffbd0', '#ffd23f', '#a8741a'],
			ring: '#fff3a0',
			corners: '#fffbe0'
		},
		// young moss along the walls' feet, under the stones (`wallFlora`)
		// spring's walls: the shared stone in light sandstone, young moss in the joints (the
		// owner's pick, 2026-11-23: so that spring never reads as summer)
		wall: {
			paint: (f) =>
				paintWalls(f, {
					foot: (g) =>
						greenFoot(g, 'rgba(46,84,30,.45)', ['#5f9a3a', '#7fb84a', '#4d8230', '#8cc456'], 61)
				}),
			base: '#7a6044',
			moss: ['#cdb184', '#b8996a'],
			top: ['#dcc49a', '#e2caa0', '#d6bd92'],
			bottom: ['#b89a6c', '#be9f72', '#b29466'],
			mossSpecks: ['#ffc2d9', '#f58fb5', '#ffffff'],
			specks: ['rgba(255,245,220,.3)', 'rgba(90,70,40,.25)'],
			crack: 'rgba(90,70,40,.25)',
			// young moss in the joints
			joints: 'rgba(92,140,58,.55)',
			drifts: ['#e8d4ac', '#cfb488'],
			light: 'rgba(255,245,220,.35)',
			dark: 'rgba(80,58,30,.35)',
			flowers: ['#ffffff', '#ffc2d9', '#f58fb5'],
			shadow: 'rgba(50,40,20,.45)'
		},
		edgeGrass: ['#5faa3a', '#86c94f', '#b8e07a'],
		trees: {
			accent: ['#ffe6ef', '#f5a6c4', '#c85a88'],
			// the hanami: every tree in blossom, the plain ones white-pink
			plain: ['#fff4f7', '#f8cadb', '#d98aa8'],
			accentDots: ['rgba(255,255,255,.85)', 'rgba(150,50,90,.5)'],
			plainDots: ['rgba(255,255,255,.9)', 'rgba(170,80,110,.4)'],
			drifts: 'rgba(255,200,220,.5)',
			// sakura in bloom and maples in fresh green
			crown: {
				accent: {
					kind: 'broad',
					leaves: ['#ffd3e2', '#f4a6c2', '#c77395'],
					branch: '#4a3236',
					blossom: ['#ffffff', '#ffe6ef']
				},
				plain: { kind: 'broad', leaves: ['#a8d870', '#74ad48', '#477a30'], branch: '#4a3a2c' }
			}
		},
		// clipped azaleas in flower (karikomi)
		// the cabins as homes (the owner's review: a cozy background)
		homestead: { wood: '#7a5a3a' },
		rockSpot: cloverPatch,
		scene: hanamiScene,
		landmark: {
			ex: [2.4, 2.2],
			// a checked picnic blanket with a basket
			draw: ({ b, blob }, o) => {
				const r = o.r ?? 0;
				const U = r * 2.2;
				b.save();
				b.translate(o.x, o.y);
				b.rotate(0.3);
				b.fillStyle = 'rgba(30,60,20,.3)';
				b.fillRect(-U + 3, -U * 0.75 + 4, U * 2, U * 1.5);
				for (let i = 0; i < 6; i++) {
					for (let j = 0; j < 4; j++) {
						b.fillStyle = (i + j) % 2 ? '#fff4e6' : '#e8574a';
						b.fillRect(
							-U + (i * U * 2) / 6,
							-U * 0.75 + (j * U * 1.5) / 4,
							(U * 2) / 6 + 0.5,
							(U * 1.5) / 4 + 0.5
						);
					}
				}
				b.restore();
				blob(o.x + U * 0.2, o.y - U * 0.1, r * 0.8, r * 0.55, '#b8864a', 0);
				blob(o.x + U * 0.2, o.y - U * 0.2, r * 0.6, r * 0.3, '#d9a868', 0);
			}
		},
		flowerPatch: ({ rr, pick, fl5 }, o) => {
			const c = o.c ?? 0;
			const cl =
				c < 0.3
					? ['#ffffff', '#fff0f6']
					: c < 0.55
						? ['#ff9ec4', '#ffc2d9']
						: c < 0.8
							? ['#ffe14d', '#ffd23f']
							: ['#b58cff', '#d9c8ff'];
			const mid = c >= 0.55 && c < 0.8 ? '#d9731a' : '#ffcf4d';
			for (let i = 0; i < (o.n ?? 0); i++) {
				fl5(o.x + rr(-16, 16), o.y + rr(-12, 12), rr(2, 3), pick(cl), mid);
			}
		},
		pondExtras: ({ blob, fl5 }, o) => {
			const rx = o.rx ?? 0;
			const ry = o.ry ?? 0;
			for (let i = 0; i < 4; i++) {
				const a = i * 1.7 + 0.5;
				const px = o.x + Math.cos(a) * rx * 0.45;
				const py = o.y + Math.sin(a) * ry * 0.45;
				blob(px, py, 6, 4.5, '#4fbf4a', 0);
				if (i % 2) {
					fl5(px, py, 2.4, '#ff9ec4', '#ffe14d');
				}
			}
		}
	},
	live: {
		pellet: { texture: springPellet, size: 10 },
		energizer: {
			texture: temari,
			size: 20.8,
			glow: 0xff5fa0,
			glowSize: (64 * 0.95 * 0.8) / 3,
			motion: 'sway'
		},
		portal: { glow: 0xffe060, deep: 0x5a3a00 },
		glints: 0xffffff,
		fog,
		mistAlpha: (s) => 0.1 + 0.22 * s,
		mistSpeed: (s) => 1 + 6 * s,
		rays: (t, i, _s, n) => (0.1 + 0.04 * Math.sin(t * 0.5 + i * 2)) * (1 - 0.8 * n),
		lit: lazy(() =>
			radial([
				[0, 'rgba(255,250,210,.25)'],
				[1, 'rgba(255,205,130,0)']
			])
		),
		litAlpha: () => 1,
		drift: {
			texture: (i) => tinted(petal(), PETALS[i % 4]),
			size: (_sc, rand) => {
				const s = 0.16 + rand * 0.12;
				return [30 * s, 18 * s];
			},
			direction: 1,
			speed: 16,
			spin: true
		},
		wash: lazy(() => washTexture('rgba(255,255,220,.16)', 'rgba(120,200,255,.1)')),
		stormTint: '#eef8e8',
		stormAlpha: 0.14,
		// a soft petal wind (the owner's answers): petals drifting slowly, turning slowly, and
		// pollen motes hanging in the light; no wind streaks
		weather: {
			count: 200,
			make: (i, vw, vh): WeatherParticle => {
				const st = i % 3 === 0;
				const s = st ? 0.6 + Math.random() * 0.7 : 0.9 + Math.random() * 0.8;
				return {
					st,
					im: st ? glowTexture(0xffe98a) : tinted(petal(), PETALS[i % 4]),
					w: st ? 7 * s : 10 * s,
					h: st ? 7 * s : 6 * s,
					px: Math.random() * vw,
					py: Math.random() * vh,
					vx: st ? 0.6 + Math.random() * 1.2 : 4 + Math.random() * 4,
					vy: st ? 0.2 + Math.random() * 0.4 : 1.5 + Math.random() * 1.5,
					ph: Math.random() * 6,
					rot: st ? 0 : Math.random() * 6,
					add: false
				};
			},
			step: (p, d, t, s, vw, vh) => {
				if (!p.st) {
					p.rot += 0.05 * d;
				}
				p.px += p.vx * d * s + (p.st ? Math.sin(t * 0.9 + p.ph) * 0.25 * d : 0);
				p.py += p.vy * d * s + Math.sin(t * (p.st ? 1.3 : 2) + p.ph) * (p.st ? 0.3 : 0.8) * s;
				if (p.px > vw + 40) {
					p.px = -40;
					p.py = Math.random() * vh;
				}
				if (p.py > vh + 30) {
					p.py = -30;
				}
			},
			alpha: (p, s) => s * (p.st ? 0.55 : 0.85)
		},
		nightTint: '#4a5a9a',
		nightAlpha: 0.55,
		vignette: lazy(() =>
			radial([
				[0.5, 'rgba(20,50,20,0)'],
				[1, 'rgba(20,50,20,.3)']
			])
		),
		lights: { energizer: 0xff6fae, portal: 0xffe060 },
		chimneySmoke: true
	},
	decay: SPRING_DECAY
};
