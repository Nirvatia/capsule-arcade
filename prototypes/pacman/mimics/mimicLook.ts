// The anti-hero (prototype): a mimic built from the hero's own painters, with everything a little
// wrong. The same body, mouth and chomp (it copies him), but inside out: a black-violet sun with an
// acid-teal rim, jaws that open too wide on too many teeth, three eyes with slit pupils where
// he has one, a dark halo instead of the corona, an oil-slick sheen sliding over the body.
import type { HeroDesign, MouthInside, OverPainter, Palette, ParticleKind } from '../../../src/games/pacman/render/actors/hero/Hero';
import { css, mix } from '../../../src/games/pacman/render/actors/hero/Hero';
import { MS_DESIGN, MsPacmanHero } from '../../../src/games/pacman/render/actors/hero/MsPacmanHero';
import { PACMAN_DESIGN, PacmanHero } from '../../../src/games/pacman/render/actors/hero/PacmanHero';
import { SEASON_LOOKS } from '../../../src/games/pacman/render/actors/hero/heroSeasons';
import type { HeroSeason, RGB, SeasonLook } from '../../../src/games/pacman/render/actors/hero/heroSeasons';

const TAU = Math.PI * 2;

const PAL: Palette = {
	light: [170, 130, 255],
	mid: [70, 40, 130],
	shadow: [34, 18, 70],
	deep: [12, 6, 28],
	bounce: [110, 60, 190],
	ink: [5, 2, 12],
	highlight: [220, 200, 255],
	rim: [110, 255, 225]
};
const INSIDE: MouthInside = { mid: [150, 10, 50], deep: [52, 2, 18] };

const wrong = (d: HeroDesign, id: string): HeroDesign => ({
	...d,
	id,
	calm: PAL,
	awoken: PAL,
	inside: INSIDE,
	mouthSpan: d.mouthSpan * 1.3,
	grinRest: 0.5,
	grinRun: 0.34,
	chompRate: d.chompRate * 0.66
});

/** The mimic's own look for the hero's trail and rim: dust of a dark glow. */
export const MIMIC = 'mimic' as HeroSeason;
(SEASON_LOOKS as unknown as Record<string, SeasonLook>).mimic = {
	rim: [110, 255, 225],
	line: [150, 90, 230],
	lineHot: [200, 255, 244],
	particle: 'dust',
	particleFill: [120, 70, 200],
	particleEdge: [20, 8, 40]
};

/** A dark halo with a slow acid ring, instead of the sun's corona. */
function halo(ctx: CanvasRenderingContext2D, R: number, t: number): void {
	ctx.save();
	const g = ctx.createRadialGradient(0, 0, R * 0.8, 0, 0, R * 1.9);
	g.addColorStop(0, 'rgba(12,4,28,.6)');
	g.addColorStop(1, 'rgba(12,4,28,0)');
	ctx.fillStyle = g;
	ctx.fillRect(-R * 2, -R * 2, R * 4, R * 4);
	ctx.globalCompositeOperation = 'lighter';
	ctx.lineCap = 'round';
	for (let i = 0; i < 7; i += 1) {
		const a = t * 0.5 + (i / 7) * TAU;
		const k = 0.5 + 0.5 * Math.sin(t * 1.3 + i * 1.9);
		ctx.strokeStyle = `rgba(110,255,225,${0.15 + 0.3 * k})`;
		ctx.lineWidth = R * 0.07;
		ctx.beginPath();
		ctx.arc(0, 0, R * (1.15 + 0.08 * k), a, a + 0.34);
		ctx.stroke();
	}
	ctx.restore();
}

/** The wrong face: an oil sheen, a mouth of teeth, three slit eyes. Frame space, facing +x. */
export const mimicPainter: OverPainter = (ctx, R, cut) => {
	const t = cut.time;
	ctx.save();
	cut.outline(ctx);
	ctx.clip();
	// an oil-slick sheen crawling over the body
	ctx.globalCompositeOperation = 'lighter';
	const sx = Math.sin(t * 0.7) * R;
	const g = ctx.createLinearGradient(sx - R, -R, sx + R, R);
	g.addColorStop(0, 'rgba(255,60,200,0)');
	g.addColorStop(0.35, 'rgba(255,60,200,.08)');
	g.addColorStop(0.5, 'rgba(60,255,220,.14)');
	g.addColorStop(0.65, 'rgba(120,90,255,.08)');
	g.addColorStop(1, 'rgba(120,90,255,0)');
	ctx.fillStyle = g;
	ctx.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);
	ctx.restore();
	// teeth along both lips, pointing into the mouth
	const { hinge: A, upper: U, lower: Dn } = cut;
	ctx.fillStyle = '#f2ecff';
	ctx.strokeStyle = 'rgba(20,6,30,.8)';
	ctx.lineWidth = Math.max(0.6, R * 0.018);
	const teeth = (to: { x: number; y: number }, up: boolean): void => {
		const vx = to.x - A.x;
		const vy = to.y - A.y;
		const len = Math.hypot(vx, vy);
		const ux = vx / len;
		const uy = vy / len;
		const nx = up ? -uy : uy;
		const ny = up ? ux : -ux;
		const n = 6;
		for (let i = 0; i < n; i += 1) {
			const f0 = (i + 0.15) / n;
			const f1 = (i + 0.85) / n;
			const fm = (f0 + f1) / 2;
			const hgt = R * (0.2 + 0.1 * Math.sin(i * 2.3 + 1));
			ctx.beginPath();
			ctx.moveTo(A.x + vx * f0, A.y + vy * f0);
			ctx.lineTo(A.x + vx * fm + nx * hgt, A.y + vy * fm + ny * hgt);
			ctx.lineTo(A.x + vx * f1, A.y + vy * f1);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();
		}
	};
	teeth(U, true);
	teeth(Dn, false);
	// three eyes where he has one: glowing, slit pupils that wander
	ctx.save();
	for (const [ex, ey, er] of [
		[0.12, -0.46, 0.2],
		[-0.36, -0.34, 0.13],
		[0.4, -0.3, 0.11]
	] as const) {
		ctx.globalCompositeOperation = 'lighter';
		const eg = ctx.createRadialGradient(ex * R, ey * R, 0, ex * R, ey * R, er * R * 2.6);
		eg.addColorStop(0, 'rgba(110,255,225,.7)');
		eg.addColorStop(1, 'rgba(110,255,225,0)');
		ctx.fillStyle = eg;
		ctx.fillRect((ex - er * 3) * R, (ey - er * 3) * R, er * 6 * R, er * 6 * R);
		ctx.globalCompositeOperation = 'source-over';
		ctx.fillStyle = '#d8fff6';
		ctx.beginPath();
		ctx.ellipse(ex * R, ey * R, er * R, er * R * 0.85, 0, 0, TAU);
		ctx.fill();
		ctx.fillStyle = '#05010c';
		ctx.beginPath();
		ctx.ellipse(ex * R + Math.sin(t * 0.9 + ex * 9) * er * R * 0.3, ey * R, er * R * 0.2, er * R * 0.8, 0, 0, TAU);
		ctx.fill();
	}
	ctx.restore();
};

/** Ms. Pac-Man's pearl is painted by her own brush, so her double gets a dark veil first. */
export const mimicPainterMs: OverPainter = (ctx, R, cut) => {
	ctx.save();
	cut.outline(ctx);
	ctx.clip();
	const g = ctx.createRadialGradient(-R * 0.2, -R * 0.2, R * 0.1, 0, 0, R * 1.1);
	g.addColorStop(0, 'rgba(60,30,110,.78)');
	g.addColorStop(1, 'rgba(8,3,20,.92)');
	ctx.fillStyle = g;
	ctx.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);
	ctx.restore();
	mimicPainter(ctx, R, cut);
};

const darkBands: ReadonlyArray<readonly [number, RGB, RGB]> = [
	[1.2, [4, 2, 10], [10, 4, 22]],
	[0.9, [14, 6, 32], [26, 12, 54]],
	[0.7, [26, 12, 54], [44, 20, 86]],
	[0.47, [46, 22, 90], [70, 36, 130]],
	[0.24, [96, 60, 160], [150, 110, 220]]
];

const dust = (): ParticleKind => 'dust';

/** Pac-Man's double: his sun turned inside out. */
export class MimicPacman extends PacmanHero {
	protected readonly design: HeroDesign = wrong(PACMAN_DESIGN, 'mimic-pac');
	protected particleFor = dust;
	protected drawAura(ctx: CanvasRenderingContext2D, R: number): void {
		halo(ctx, R, this.time);
	}
	protected decorate(sc: CanvasRenderingContext2D, R: number): void {
		const t = this.time;
		darkBands.forEach(([r, calm, hot], i) => {
			sc.fillStyle = css(mix(calm, hot, 0.5 + 0.5 * Math.sin(t * 0.6 + i)));
			sc.beginPath();
			for (let j = 0; j <= 48; j += 1) {
				const a = (j / 48) * TAU;
				const rr = R * r * (1 + 0.045 * Math.sin(5 * a + t * 1.4 + i) + 0.03 * Math.sin(9 * a - t * 2 + i * 2));
				const x = Math.cos(a) * rr - R * 0.04;
				const y = Math.sin(a) * rr;
				if (j === 0) sc.moveTo(x, y);
				else sc.lineTo(x, y);
			}
			sc.closePath();
			sc.fill();
		});
	}
}

/** Ms. Pac-Man's double: her pearl gone black, her bow left as it was. */
export class MimicMs extends MsPacmanHero {
	protected readonly design: HeroDesign = wrong(MS_DESIGN, 'mimic-ms');
	protected particleFor = dust;
	protected drawAura(ctx: CanvasRenderingContext2D, R: number): void {
		halo(ctx, R, this.time);
	}
}
