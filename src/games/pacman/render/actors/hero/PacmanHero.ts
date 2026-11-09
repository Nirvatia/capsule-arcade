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
import { stellarGold } from './cgShading';
import { SEASON_LOOKS } from './heroSeasons';

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

const DUST: readonly [number, number, number] = [255, 246, 226];
const DUST_EDGE: readonly [number, number, number] = [196, 158, 126];

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
	cel: true,
	hinge: 0.08,
	inside: INSIDE,
	// wide jaws (the owner's review): fully open the mouth spans about 92 degrees
	mouthSpan: 0.76,
	grinRest: 0.2,
	grinRun: 0.08,
	chompRate: 4.2,
	spill: null,
	aura: null,
	flare: [255, 232, 170],
	trailCalm: [],
	trailAwoken: [],
	death: 'open'
};

/** The CG style: the same hero rendered as stellar gold, without ink (goes with the CG style). */
const CG_DESIGN: HeroDesign = {
	...DESIGN,
	id: 'pacman-cg',
	cel: false,
	inside: undefined,
	shade: stellarGold,
	ink: false
};

export class PacmanHero extends Hero {
	protected readonly designs = { painted: DESIGN, cg: CG_DESIGN };

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
		const t = this.time;
		const N = 9;
		ctx.lineJoin = 'round';
		ctx.lineCap = 'round';
		for (const pass of [0, 1]) {
			for (let i = 0; i < N; i++) {
				const f = i / (N - 1);
				const a = Math.PI + (f - 0.5) * 2.5;
				const flick = 0.5 + 0.5 * Math.sin(t * 11 + i * 2.3);
				const edge = 1 - Math.abs(f - 0.5) * 1.3;
				const len = R * (0.28 + 0.92 * flick) * k * edge * (pass === 0 ? 1 : 0.58);
				if (len < 1) continue;
				const bx = Math.cos(a) * R * 0.93;
				const by = Math.sin(a) * R * 0.93;
				// outwards, blown back (away from the heading), swaying a little
				let dx = Math.cos(a) - 0.7;
				let dy = Math.sin(a) * 0.8 + 0.12 * Math.sin(t * 7 + i);
				const n = Math.hypot(dx, dy) || 1;
				dx /= n;
				dy /= n;
				const px = -dy;
				const py = dx;
				const w = R * (pass === 0 ? 0.17 : 0.09);
				ctx.beginPath();
				ctx.moveTo(bx + px * w, by + py * w);
				ctx.quadraticCurveTo(
					bx + dx * len * 0.55 + px * w * 0.9,
					by + dy * len * 0.55 + py * w * 0.9,
					bx + dx * len,
					by + dy * len
				);
				ctx.quadraticCurveTo(
					bx + dx * len * 0.5 - px * w * 0.5,
					by + dy * len * 0.5 - py * w * 0.5,
					bx - px * w,
					by - py * w
				);
				ctx.closePath();
				if (pass === 0) {
					ctx.fillStyle = css([255, 132, 28], Math.min(1, k * 1.4));
					ctx.fill();
					ctx.strokeStyle = css(CALM.ink, Math.min(1, k * 1.4));
					ctx.lineWidth = Math.max(1, R * 0.035);
					ctx.stroke();
				} else {
					ctx.fillStyle = css([255, 228, 98], Math.min(1, k * 1.4));
					ctx.fill();
				}
			}
		}
	}

	/** A small four-point star on the highlight while he is powered. */
	protected drawWorn(
		ctx: CanvasRenderingContext2D,
		R: number,
		p: number,
		lx: number,
		ly: number
	): void {
		if (p < 0.3) return;
		const cx = lx * R * 0.4 - ly * R * 0.12;
		const cy = ly * R * 0.4 + lx * R * 0.12;
		const big = R * 0.1 * p;
		const small = big * 0.28;
		ctx.fillStyle = css([255, 255, 255], p);
		ctx.beginPath();
		for (let i = 0; i < 8; i++) {
			const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
			const r = i % 2 === 0 ? big : small;
			ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
		}
		ctx.closePath();
		ctx.fill();
	}

	/** Dust puffs and the season's own little things off the back; the season's on bursts. */
	protected particleFor(moment: 'trail' | 'burst' | 'death'): ParticleKind {
		const own = SEASON_LOOKS[this.season].particle;
		if (moment === 'trail') return this.random() < 0.5 ? 'dust' : own;
		return own;
	}

	protected sizeFor(kind: ParticleKind): number {
		switch (kind) {
			case 'dust':
				return 2;
			case 'petal':
			case 'leaf':
			case 'flake':
				return 1.9;
			default:
				return 1.2;
		}
	}

	/** Petals and dust hang about, leaves and flakes sink, sparks and embers rise. */
	protected liftFor(kind: ParticleKind): number {
		switch (kind) {
			case 'dust':
				return 0.1;
			case 'petal':
				return 0.25;
			case 'leaf':
				return -0.3;
			case 'flake':
				return -0.18;
			default:
				return 0.6;
		}
	}

	protected drawParticle(ctx: CanvasRenderingContext2D, e: Particle, a: number, s: number): void {
		const look = SEASON_LOOKS[this.season];
		const rot = e.spin * (e.max - e.life) + e.spin * 2;
		ctx.save();
		ctx.translate(e.x, e.y);
		ctx.rotate(rot);
		ctx.globalAlpha = a;
		ctx.lineJoin = 'round';
		ctx.lineCap = 'round';
		switch (e.kind) {
			case 'dust':
				ctx.fillStyle = css(DUST);
				ctx.strokeStyle = css(DUST_EDGE, 0.8);
				ctx.lineWidth = Math.max(0.8, s * 0.16);
				ctx.beginPath();
				ctx.arc(0, 0, s, 0, Math.PI * 2);
				ctx.fill();
				ctx.stroke();
				break;
			case 'petal':
				ctx.fillStyle = css(look.particleFill);
				ctx.strokeStyle = css(look.particleEdge);
				ctx.lineWidth = Math.max(0.8, s * 0.18);
				ctx.beginPath();
				ctx.ellipse(0, 0, s, s * 0.62, 0, 0, Math.PI * 2);
				ctx.fill();
				ctx.stroke();
				break;
			case 'leaf':
				ctx.fillStyle = css(look.particleFill);
				ctx.strokeStyle = css(look.particleEdge);
				ctx.lineWidth = Math.max(0.8, s * 0.2);
				ctx.beginPath();
				for (let i = 0; i < 10; i++) {
					const an = (i / 10) * Math.PI * 2 - Math.PI / 2;
					const r = i % 2 === 0 ? s : s * 0.42;
					ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r);
				}
				ctx.closePath();
				ctx.fill();
				ctx.stroke();
				break;
			case 'flake':
				ctx.strokeStyle = css(look.particleEdge);
				ctx.lineWidth = Math.max(0.8, s * 0.2);
				ctx.beginPath();
				for (let i = 0; i < 3; i++) {
					const an = (i / 3) * Math.PI;
					ctx.moveTo(Math.cos(an) * s, Math.sin(an) * s);
					ctx.lineTo(-Math.cos(an) * s, -Math.sin(an) * s);
				}
				ctx.stroke();
				ctx.fillStyle = css(look.particleFill);
				ctx.beginPath();
				ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
				ctx.fill();
				break;
			case 'spark':
				ctx.fillStyle = css(look.particleFill);
				ctx.strokeStyle = css(look.particleEdge, 0.9);
				ctx.lineWidth = Math.max(0.8, s * 0.2);
				ctx.beginPath();
				ctx.arc(0, 0, s * 0.8, 0, Math.PI * 2);
				ctx.fill();
				ctx.stroke();
				ctx.fillStyle = 'rgba(255,252,230,0.9)';
				ctx.beginPath();
				ctx.arc(-s * 0.2, -s * 0.2, s * 0.25, 0, Math.PI * 2);
				ctx.fill();
				break;
			default: {
				// an ember (the hell)
				ctx.fillStyle = css(look.particleFill);
				ctx.strokeStyle = css(look.particleEdge);
				ctx.lineWidth = Math.max(0.8, s * 0.2);
				ctx.beginPath();
				ctx.arc(0, 0, s * 0.8, 0, Math.PI * 2);
				ctx.fill();
				ctx.stroke();
			}
		}
		ctx.restore();
		ctx.globalAlpha = 1;
	}
}
