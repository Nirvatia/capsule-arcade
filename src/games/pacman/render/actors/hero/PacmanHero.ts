// Pac-Man, the hero: the owner's "Shonen" mock-up (anime direction). A fighting-game hero in the
// maze: cel-shaded gold in hard tone bands with a white highlight, a thick ink outline that is
// heavier in the shadow, no eye, a wide mouth with a dark cavity and a tongue. Behind him:
// tapered speed lines in the season's colour, cream dust puffs and the season's own little
// things (petals, sparks, leaves, snowflakes). The energizer splits the palette (cream, gold,
// orange-red), cracks open ink-outlined "ki" flames behind him (never longer than 1.2 body
// radii, their length trembling) and puts a star on the highlight. The machinery (acting,
// bites, spring, energizer beat) is the shared Hero.
import type { HeroDesign, Lane, MouthInside, Palette, Particle, ParticleKind } from './Hero';
import { Hero } from './Hero';
import { SEASON_LOOKS } from './heroSeasons';
import {
	INK,
	drawKiFlames,
	drawSeasonParticle,
	drawStreak,
	drawStarGlint,
	particleLift,
	particleSize
} from './heroFx';

const CALM: Palette = {
	light: [236, 213, 58],
	mid: [230, 160, 34],
	shadow: [186, 88, 24],
	deep: [120, 50, 16],
	bounce: [234, 142, 66],
	ink: [38, 14, 12],
	highlight: [255, 255, 255],
	rim: [255, 238, 176]
};
const AWOKEN: Palette = {
	light: [236, 232, 198],
	mid: [236, 186, 58],
	shadow: [226, 72, 34],
	deep: [150, 40, 20],
	bounce: [234, 134, 76],
	ink: [38, 14, 12],
	highlight: [255, 255, 255],
	rim: [255, 238, 176]
};

const INSIDE: MouthInside = {
	mid: [112, 18, 40],
	deep: [70, 8, 28],
	tongue: [255, 98, 128],
	tongueLight: [255, 160, 176]
};

/** Speed streaks: lanes off the axis (length, head width, spacing in body radii). */
const LANES: readonly Lane[] = [
	{ y: -0.52, len: 1.9, w: 0.098, gap: 1.44 },
	{ y: -0.2, len: 2.6, w: 0.085, gap: 1.76 },
	{ y: 0.04, len: 1.7, w: 0.072, gap: 1.28 },
	{ y: 0.22, len: 2.3, w: 0.091, gap: 1.6 },
	{ y: 0.46, len: 1.5, w: 0.072, gap: 1.36 }
];
/** Powered: longer streaks and two more lanes, higher and lower. */
const LANES_HOT: readonly Lane[] = [
	...LANES.map((l) => ({ ...l, len: l.len * 1.25 })),
	{ y: -0.7, len: 1.8, w: 0.065, gap: 1.44 },
	{ y: 0.64, len: 1.9, w: 0.065, gap: 1.44 }
];

const DESIGN: HeroDesign = {
	id: 'pacman',
	calm: CALM,
	awoken: AWOKEN,
	hinge: 0.08,
	inside: INSIDE,
	// wide jaws (the owner's review): fully open the mouth spans about 92 degrees
	mouthSpan: 0.76,
	grinRest: 0.2,
	grinRun: 0.08,
	chompRate: 4.2,
	flare: [255, 232, 170],
	lanes: LANES,
	lanesHot: LANES_HOT,
	death: 'open'
};

export class PacmanHero extends Hero {
	protected readonly design = DESIGN;

	/** Ink-outlined ki flames around the back of the body: orange, a yellow core, at most 1.2 R. */
	protected drawBehind(ctx: CanvasRenderingContext2D, R: number, k: number): void {
		drawKiFlames(ctx, R, k, this.time, { outer: [255, 132, 28], inner: [255, 228, 98], ink: INK });
	}

	/** A small four-point star on the highlight while he is powered. */
	protected drawWorn(
		ctx: CanvasRenderingContext2D,
		R: number,
		p: number,
		lx: number,
		ly: number
	): void {
		drawStarGlint(ctx, R, p, lx, ly);
	}

	/** Dust puffs and the season's own little things off the back; the season's on bursts. */
	protected particleFor(moment: 'trail' | 'burst' | 'death'): ParticleKind {
		const own = SEASON_LOOKS[this.season].particle;
		if (moment === 'trail') return this.random() < 0.5 ? 'dust' : own;
		return own;
	}

	protected sizeFor(kind: ParticleKind): number {
		return particleSize(kind);
	}

	protected liftFor(kind: ParticleKind): number {
		return particleLift(kind);
	}

	protected drawParticle(ctx: CanvasRenderingContext2D, e: Particle, a: number, s: number): void {
		if (e.kind === 'streak') {
			const look = SEASON_LOOKS[this.season];
			drawStreak(ctx, e, a, e.hot ? look.lineHot : look.line);
			return;
		}
		drawSeasonParticle(ctx, e, a, s, this.season);
	}
}
