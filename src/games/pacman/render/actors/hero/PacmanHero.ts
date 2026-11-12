// Pac-Man, the hero: the owner's "Shonen" mock-up (anime direction). A fighting-game hero in the
// maze: cel-shaded gold in hard tone bands with a white highlight, a thick ink outline that is
// heavier in the shadow, a minimal eye (a dot under a frowning brow), a wide mouth with a dark
// cavity (no tongue). Behind him:
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
	deep: [70, 8, 28]
};

export const PACMAN_DESIGN: HeroDesign = {
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
	protected readonly design: HeroDesign = PACMAN_DESIGN;

	/** Ink-outlined ki flames around the back of the body: orange, a yellow core, at most 1.2 R. */
	protected drawBehind(ctx: CanvasRenderingContext2D, R: number, k: number): void {
		drawKiFlames(ctx, R, k, this.time, { outer: [255, 132, 28], inner: [255, 228, 98], ink: INK });
	}

	/** Three fire swirls on the gold ball (white-hot when powered), turning with the roll. */
	protected paintBallPattern(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		for (let k = 0; k < 3; k++) {
			const a0 = (k * Math.PI * 2) / 3;
			const swirl = () => {
				ctx.beginPath();
				for (let i = 0; i <= 24; i++) {
					const t = i / 24;
					const r = R * (0.1 + 1.0 * t);
					const a = a0 + t * 2.3;
					if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
					else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
				}
			};
			swirl();
			ctx.strokeStyle = css(INK, 0.9);
			ctx.lineWidth = R * 0.3;
			ctx.stroke();
			swirl();
			ctx.strokeStyle = css(mix([236, 96, 28], [255, 244, 200], p));
			ctx.lineWidth = R * 0.2;
			ctx.stroke();
			swirl();
			ctx.strokeStyle = css(mix([255, 210, 80], [255, 255, 255], p));
			ctx.lineWidth = R * 0.07;
			ctx.stroke();
		}
	}

	/** Three drops of fire circling the ball. */
	protected paintBallOrbit(ctx: CanvasRenderingContext2D, R: number): void {
		for (let k = 0; k < 3; k++) {
			const a = this.time * 7 + (k * Math.PI * 2) / 3;
			const rr = R * 1.3;
			drawFlameDrop(
				ctx,
				{
					kind: 'flame',
					x: Math.cos(a) * rr,
					y: Math.sin(a) * rr,
					vx: 0,
					vy: 0,
					life: 0.7,
					max: 1,
					size: R * 0.3,
					hot: true,
					spin: 0,
					len: R * 0.95,
					ang: a + Math.PI / 2
				},
				[255, 132, 28],
				[255, 228, 98]
			);
		}
	}

	/** A small four-point star on the highlight while he is powered; his minimal eye if on. */
	protected drawWorn(
		ctx: CanvasRenderingContext2D,
		R: number,
		p: number,
		lx: number,
		ly: number
	): void {
		drawStarGlint(ctx, R, p, lx, ly);
		if (this.feel.eye) this.drawEye(ctx, R);
	}

	/**
	 * His eye, the minimum (the owner: a dot under a frowning brow): a dark dot that follows the
	 * gaze and a short thick brow slanting down to the front. Never under 1.4 px, so it still
	 * reads at a tile.
	 */
	private drawEye(ctx: CanvasRenderingContext2D, R: number): void {
		const ex = R * 0.16;
		const ey = -R * 0.5;
		const ink = css(PACMAN_DESIGN.calm.ink);
		ctx.strokeStyle = ink;
		ctx.lineCap = 'round';
		// the brow: short, slanting down to the front, clear of the dot so the two never merge
		ctx.lineWidth = Math.max(1.2, R * 0.075);
		ctx.beginPath();
		ctx.moveTo(ex - R * 0.16, ey - R * 0.3);
		ctx.lineTo(ex + R * 0.15, ey - R * 0.19);
		ctx.stroke();
		ctx.fillStyle = ink;
		ctx.beginPath();
		ctx.arc(
			ex + this.gazeX * R * 0.04,
			ey + R * 0.04 + this.gazeY * R * 0.05,
			Math.max(1.3, R * 0.085),
			0,
			Math.PI * 2
		);
		ctx.fill();
	}

	/** The season's own little things off the back and on bursts (no dust: it read as gas). */
	protected particleFor(moment: 'trail' | 'burst' | 'death'): ParticleKind {
		const own = SEASON_LOOKS[this.season].particle;
		// powered or rolled into a ball, the trail is fire; otherwise the season's own things
		return moment === 'trail' && (this.power > 0.5 || this.ball) ? 'ember' : own;
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
