// Pac-Man, the hero: the owner's "Shonen" mock-up (anime direction). A fighting-game hero in the
// maze: cel-shaded gold in hard tone bands with a white highlight, a thick ink outline that is
// heavier in the shadow, no eye, a wide mouth with a dark cavity and a tongue. Behind him:
// tapered speed lines in the season's colour, cream dust puffs and the season's own little
// things (petals, sparks, leaves, snowflakes). The energizer splits the palette (cream, gold,
// orange-red), cracks open ink-outlined "ki" flames behind him (never longer than 1.2 body
// radii, their length trembling) and puts a star on the highlight. The machinery (acting,
// bites, spring, energizer beat) is the shared Hero.
import type { HeroDesign, MouthInside, Palette, Particle, ParticleKind } from './Hero';
import { Hero, css, mix } from './Hero';
import { SEASON_LOOKS } from './heroSeasons';
import {
	INK,
	drawKiFlames,
	drawSeasonParticle,
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

/** Speed lines: height off the axis and length in body radii, base width in body radii. */
interface Streak {
	readonly y: number;
	readonly len: number;
	readonly w: number;
}
const STREAKS: readonly Streak[] = [
	{ y: -0.52, len: 2.2, w: 0.075 },
	{ y: -0.2, len: 3.1, w: 0.065 },
	{ y: 0.04, len: 1.9, w: 0.055 },
	{ y: 0.22, len: 2.7, w: 0.07 },
	{ y: 0.46, len: 1.6, w: 0.055 }
];
/** The powered look adds two more, higher and lower. */
const STREAKS_HOT: readonly Streak[] = [
	...STREAKS,
	{ y: -0.7, len: 2.0, w: 0.05 },
	{ y: 0.64, len: 2.2, w: 0.05 }
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
	death: 'open'
};

export class PacmanHero extends Hero {
	protected readonly design = DESIGN;

	/** Tapered speed lines behind him, in the season's colour (cream when powered). */
	protected drawStreaks(ctx: CanvasRenderingContext2D, R: number, run: number, p: number): void {
		if (run < 0.02) return;
		const look = SEASON_LOOKS[this.season];
		ctx.fillStyle = css(mix(look.line, look.lineHot, p), 0.95 * Math.min(1, run * 1.5));
		const t = this.time;
		const lines = p > 0.5 ? STREAKS_HOT : STREAKS;
		lines.forEach((l, i) => {
			const edge = Math.sqrt(Math.max(0, 1 - l.y * l.y));
			const x0 = -edge * R * 0.8;
			const len = l.len * R * (0.82 + 0.18 * Math.sin(t * 9 + i * 1.7)) * run * (1 + 0.3 * p);
			const w = l.w * R;
			ctx.beginPath();
			ctx.moveTo(x0, l.y * R - w / 2);
			ctx.lineTo(x0 - len, l.y * R);
			ctx.lineTo(x0, l.y * R + w / 2);
			ctx.closePath();
			ctx.fill();
		});
	}

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
		drawSeasonParticle(ctx, e, a, s, this.season);
	}
}
