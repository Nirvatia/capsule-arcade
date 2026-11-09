// Pac-Man, the hero: the owner's "Shonen" mock-up (anime direction). A fighting-game hero in the
// maze: cel-shaded gold in hard tone bands with a white highlight, a thick ink outline that is
// heavier in the shadow, no eye, a wide mouth with a dark cavity and a tongue. Behind him:
// tapered speed lines in the season's colour, cream dust puffs and the season's own little
// things (petals, sparks, leaves, snowflakes). The energizer splits the palette (cream, gold,
// orange-red), cracks open ink-outlined "ki" flames behind him (never longer than 1.2 body
// radii, their length trembling) and puts a star on the highlight. The machinery (acting,
// bites, spring, energizer beat) is the shared Hero.
import type { HeroDesign, MouthInside, Palette, Particle, ParticleKind } from './Hero';
import { Hero } from './Hero';
import { SEASON_LOOKS } from './heroSeasons';
import {
	INK,
	drawKiFlames,
	drawSeasonParticle,
	drawFireSpark,
	drawFlameDrop,
	drawStarGlint,
	particleLift,
	particleSwirl,
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

	/** The season's own little things off the back and on bursts (no dust: it read as gas). */
	protected particleFor(moment: 'trail' | 'burst' | 'death'): ParticleKind {
		const own = SEASON_LOOKS[this.season].particle;
		// powered, the trail is fire; otherwise the season's own things
		return moment === 'trail' && this.power > 0.5 ? 'ember' : own;
	}

	protected sizeFor(kind: ParticleKind): number {
		return particleSize(kind);
	}

	protected liftFor(kind: ParticleKind): number {
		return particleLift(kind);
	}

	protected swirlFor(kind: ParticleKind): number {
		return particleSwirl(kind);
	}

	protected drawParticle(ctx: CanvasRenderingContext2D, e: Particle, a: number, s: number): void {
		if (e.kind === 'ember' && e.hot) {
			drawFireSpark(ctx, e, s, [255, 132, 28], [255, 228, 98]);
			return;
		}
		if (e.kind === 'flame') {
			drawFlameDrop(ctx, e, [255, 132, 28], [255, 228, 98]);
			return;
		}
		drawSeasonParticle(ctx, e, a, s, this.season);
	}
}
