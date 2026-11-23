// Ms. Pac-Man: a white comet of her own (the owner's pick of the `hero-art` prototype, "ice bow,
// pink glint, curl"). Her disc, wedge mouth, lash, blush and little fang stay; she is an icy
// nucleus (her pearl-white with frost facets on the shaded side and a pink glint) in a cool
// coma that ends at 1.45 radii, brighter in front while she flies. Two tails made of where she
// has been (`heroWake`, on the pure ribbon: they bend with a turn, never end in a cut, draw back
// into her when she stops): a warm, wide dust tail curving away from the key light (to the
// lower right, as dust tails are pushed off the sun), with fine striae, and a narrow, straight
// blue ion tail, longer, with two thin streamers. Ice crystals, not stars, are shed into them:
// small hexagonal plates turning slowly and catching the light. Her bow is pink ice (faceted
// lobes, a crystal knot) with a curl of her hair falling over her rim behind it. The rage (her
// overdrive) is an outburst: soft shells of coma swell out to the reach, slowly, and the tails
// run long and pink-white. The shared Hero keeps movement, mouth, bite, spring, power, ball and
// death; her teleport stays the pearl spiral.
import type { HeroDesign, MouthInside, Palette, Particle, ParticleKind } from './Hero';
import { Hero, Spring, css, mix } from './Hero';
import type { RGB } from './heroSeasons';
import { starPath } from './heroFx';
import { Wake } from './heroWake';

const TAU = Math.PI * 2;
const INK: RGB = [44, 34, 66];
const BLUSH: RGB = [225, 92, 145];
/** The coma and the outburst never reach past this (body radii), like his corona. */
const COMA_REACH = 1.45;
/** Away from the key light (upper left): where the dust tail is pushed. */
const AWAY = { x: 0.55, y: 0.83 };

const CALM: Palette = {
	light: [255, 255, 255],
	mid: [240, 245, 255],
	shadow: [190, 204, 232],
	deep: [91, 104, 150],
	bounce: [255, 215, 235],
	ink: INK,
	highlight: [255, 255, 255],
	rim: [225, 238, 255]
};
const AWOKEN: Palette = {
	light: [255, 255, 255],
	mid: [255, 246, 255],
	shadow: [211, 190, 240],
	deep: [108, 76, 156],
	bounce: [255, 180, 220],
	ink: INK,
	highlight: [255, 255, 255],
	rim: [255, 225, 248]
};
const INSIDE: MouthInside = {
	mid: [91, 65, 135],
	deep: [36, 26, 62]
};

export const BOW_ANGLE = -0.63 * Math.PI;
export const BOW_DISTANCE = 0.95;
export const BOW_SCALE = 0.75;

/**
 * Her bow in pink ice, drawn at the origin pointing up (the caller places and turns it): faceted
 * lobes under one ink line, a lit top facet, a white edge, a crystal at the knot.
 */
export function drawIceBow(ctx: CanvasRenderingContext2D, R: number, p: number): void {
	const s = BOW_SCALE * (1 + 0.08 * p);
	ctx.save();
	ctx.scale(s, s);
	ctx.translate(0, -R * 0.08);
	ctx.lineJoin = 'round';
	for (const side of [-1, 1]) {
		const lobe: Array<[number, number]> = [
			[0, 0],
			[side * 0.36, -0.56],
			[side * 0.86, -0.48],
			[side * 1.04, -0.02],
			[side * 0.82, 0.38],
			[side * 0.34, 0.32]
		];
		ctx.beginPath();
		lobe.forEach(([x, y], i) => (i ? ctx.lineTo(x * R, y * R) : ctx.moveTo(x * R, y * R)));
		ctx.closePath();
		ctx.fillStyle = 'rgba(255,150,205,0.88)';
		ctx.fill();
		ctx.strokeStyle = css(INK);
		ctx.lineWidth = R * 0.07;
		ctx.stroke();
		// facets: lines from the knot to the corners, the top facet lit
		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.lineTo(side * 0.86 * R, -0.48 * R);
		ctx.lineTo(side * 1.04 * R, -0.02 * R);
		ctx.closePath();
		ctx.fillStyle = 'rgba(255,226,242,0.9)';
		ctx.fill();
		ctx.strokeStyle = 'rgba(255,255,255,0.9)';
		ctx.lineWidth = R * 0.03;
		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.lineTo(side * 0.82 * R, 0.38 * R);
		ctx.stroke();
	}
	// the knot: a crystal
	ctx.beginPath();
	ctx.moveTo(0, -R * 0.24);
	ctx.lineTo(R * 0.18, 0);
	ctx.lineTo(0, R * 0.24);
	ctx.lineTo(-R * 0.18, 0);
	ctx.closePath();
	ctx.fillStyle = '#f4f8ff';
	ctx.fill();
	ctx.strokeStyle = css(INK);
	ctx.lineWidth = R * 0.06;
	ctx.stroke();
	ctx.restore();
}

export const MS_DESIGN: HeroDesign = {
	id: 'ms-pacman-pearl-star',
	calm: CALM,
	awoken: AWOKEN,
	hinge: 0.08,
	inside: INSIDE,
	mouthSpan: 0.7,
	grinRest: 0.1,
	grinRun: 0.04,
	chompRate: 4.8,
	flare: [235, 242, 255],
	death: 'spin',
	bands: [0.1, 0.3, 0.64]
};

export class MsPacmanHero extends Hero {
	protected readonly design: HeroDesign = MS_DESIGN;
	private readonly bow = new Spring(0);
	private blink = -1;
	private nextBlink = 1.8;
	private blinks = 0;
	private squint = 0;
	private readonly dust = new Wake();
	private readonly ion = new Wake();
	/** 0 standing, 1 flying: the coma's hood. */
	private windK = 0;

	protected resetLooks(): void {
		this.bow.value = 0;
		this.bow.velocity = 0;
		this.windK = 0;
	}

	protected onBite(): void {
		this.bow.velocity += 3.2;
		this.squint = 1;
	}

	protected onTurn(): void {
		this.bow.velocity += this.random() < 0.5 ? 4.5 : -4.5;
	}

	protected afterUpdate(dt: number): void {
		this.windK += ((this.moving ? 1 : 0) - this.windK) * Math.min(1, dt * 5);
		const emit = this.moving ? 1 : 0;
		this.dust.push(this.x, this.y, this.time, emit);
		this.ion.push(this.x, this.y, this.time, emit);
		this.bow.step(0.07 * Math.sin(this.time * 2.1), dt, 90, 7);
		this.squint = Math.max(0, this.squint - dt / 0.35);
		if (this.blink >= 0) {
			this.blink += dt;
			if (this.blink > 0.14) this.blink = -1;
		} else if (this.time > this.nextBlink) {
			this.blink = 0;
			this.blinks += 1;
			this.nextBlink = this.time + (this.blinks % 4 === 0 ? 0.3 : 2.2 + (this.blinks % 3) * 1.1);
		}
	}

	/** The tails first (world space, under her), then the game's hero. */
	draw(ctx: CanvasRenderingContext2D): void {
		this.tails(ctx);
		super.draw(ctx);
	}

	private tails(ctx: CanvasRenderingContext2D): void {
		const R = this.r;
		const p = this.power;
		const long = 1 + 0.35 * p;
		// the dust tail: warm, wide, curving away from the light
		const dustCol = (u: number): RGB =>
			mix(mix([255, 238, 205], [236, 170, 110], u), [255, 190, 225], p * 0.7);
		this.dust.draw(ctx, this.time, {
			life: 0.3 * long,
			width: R * 0.42,
			capHead: R * 0.7,
			capTail: R * 1.8,
			widen: (u) => 0.6 + 1.0 * u,
			shift: (u, q) => {
				const side = q.nx * AWAY.x + q.ny * AWAY.y > 0 ? 1 : -1;
				return side * Math.pow(u, 1.3) * R * 0.55;
			},
			// a comet's tail is brightest at the head and thins out along it
			color: (u, a) => css(dustCol(u), (0.36 + 0.16 * p) * a * Math.pow(1 - u, 1.3))
		});
		{
			// striae: fine streaks in the dust fan
			for (const k of [-0.5, 0.45]) {
				this.dust.draw(ctx, this.time, {
					life: 0.3 * long,
					width: R * 0.05,
					capHead: R * 0.9,
					capTail: R * 1.4,
					shift: (u, q) => {
						const side = q.nx * AWAY.x + q.ny * AWAY.y > 0 ? 1 : -1;
						return (
							side * Math.pow(u, 1.3) * R * 0.62 +
							k * R * 0.42 * (0.6 + 1.1 * u) * Math.min(1, u * 3)
						);
					},
					color: (u, a) => css(dustCol(u * 0.6), 0.45 * a * (1 - u))
				});
			}
		}
		// the ion tail: narrow, blue, on her path, longer
		const ionCol = (u: number): RGB =>
			mix(mix([150, 210, 255], [70, 130, 250], u), [255, 200, 235], p * 0.5 * (1 - u));
		this.ion.draw(ctx, this.time, {
			life: 0.42 * long,
			width: R * 0.34,
			capHead: R * 0.6,
			capTail: R * 2.2,
			color: (u, a) => css(ionCol(u), 0.2 * a * (1 - u))
		});
		this.ion.draw(ctx, this.time, {
			life: 0.42 * long,
			width: R * 0.11,
			capHead: R * 0.5,
			capTail: R * 2.2,
			color: (u, a) => css(ionCol(u * 0.7), (0.55 + 0.25 * p) * a * Math.pow(1 - u, 0.7))
		});
		{
			for (const k of [-1, 1]) {
				this.ion.draw(ctx, this.time, {
					life: 0.36 * long,
					width: R * 0.035,
					capHead: R * 0.8,
					capTail: R * 1.6,
					shift: (u) => k * R * 0.2 * Math.min(1, u * 2.5),
					color: (u, a) => css(ionCol(u), 0.5 * a * (1 - u))
				});
			}
		}
	}

	/** The coma: a cool glow ending at the reach, brighter in front. */
	protected drawAura(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		const back = -R * 0.18 * this.windK;
		const g = ctx.createRadialGradient(back, 0, R * 0.7, back * 0.5, 0, R * COMA_REACH);
		g.addColorStop(0, `rgba(196,226,255,${0.5 + 0.2 * p})`);
		g.addColorStop(0.45, `rgba(170,205,255,${0.2 + 0.12 * p})`);
		g.addColorStop(1, 'rgba(170,205,255,0)');
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(0, 0, R * COMA_REACH, 0, TAU);
		ctx.fill();
		// the hood: the coma is brighter on her front while she flies (a soft lobe, no line)
		if (this.windK > 0.02) {
			const h = ctx.createRadialGradient(R * 0.55, 0, 0, R * 0.55, 0, R * 0.9);
			h.addColorStop(0, `rgba(225,240,255,${0.3 * this.windK})`);
			h.addColorStop(1, 'rgba(225,240,255,0)');
			ctx.fillStyle = h;
			ctx.beginPath();
			ctx.arc(0, 0, R * COMA_REACH, 0, TAU);
			ctx.fill();
		}
		ctx.restore();
	}

	/** The outburst (rage): soft shells of coma swelling out to the reach, slowly. */
	protected drawBehind(ctx: CanvasRenderingContext2D, R: number, k: number): void {
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		for (let i = 0; i < 2; i += 1) {
			const q = (this.time * 0.7 + i * 0.5) % 1;
			const r = R * (1.0 + (COMA_REACH - 1.1) * q);
			const a = k * Math.sin(Math.PI * q) * 0.55;
			const w = R * 0.16;
			const g = ctx.createRadialGradient(0, 0, Math.max(0, r - w), 0, 0, r + w * 0.4);
			g.addColorStop(0, 'rgba(255,190,230,0)');
			g.addColorStop(0.7, `rgba(255,190,230,${a.toFixed(3)})`);
			g.addColorStop(1, 'rgba(255,190,230,0)');
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.arc(0, 0, r + w * 0.4, 0, TAU);
			ctx.fill();
		}
		ctx.restore();
	}

	protected decorate(sc: CanvasRenderingContext2D, R: number, p: number): void {
		const base = sc.createRadialGradient(-R * 0.28, -R * 0.32, 0, 0, 0, R * 1.08);
		base.addColorStop(0, '#ffffff');
		base.addColorStop(0.45, p > 0.4 ? '#fff7fd' : '#fafcff');
		base.addColorStop(0.78, p > 0.4 ? '#eadcf5' : '#e4ebf7');
		base.addColorStop(1, p > 0.4 ? '#c2a8d9' : '#b7c6df');
		sc.fillStyle = base;
		sc.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);

		const sheen = sc.createRadialGradient(-R * 0.38, -R * 0.42, 0, -R * 0.38, -R * 0.42, R * 0.62);
		sheen.addColorStop(0, 'rgba(255,255,255,.9)');
		sheen.addColorStop(1, 'rgba(255,255,255,0)');
		sc.fillStyle = sheen;
		sc.fillRect(-R * 1.1, -R * 1.1, R * 2.2, R * 2.2);

		const stars: ReadonlyArray<readonly [number, number, number]> = [
			[-0.43, -0.2, 0.12],
			[-0.3, 0.36, 0.08],
			[0.28, 0.42, 0.055]
		];
		for (const [x, y, size] of stars) {
			const twinkle = 0.45 + 0.35 * Math.sin(this.time * 2.4 + x * 9);
			sc.fillStyle = `rgba(255,255,255,${0.55 + 0.35 * twinkle})`;
			sc.strokeStyle = `rgba(112,139,181,${0.22 + 0.18 * twinkle})`;
			sc.lineWidth = R * 0.015;
			starPath(sc, x * R, y * R, size * R * (0.85 + 0.25 * twinkle), size * R * 0.22);
			sc.fill();
			sc.stroke();
		}

		const limb = sc.createRadialGradient(0, 0, R * 0.68, 0, 0, R);
		limb.addColorStop(0, 'rgba(150,175,225,0)');
		limb.addColorStop(0.78, `rgba(145,170,220,${0.12 + 0.12 * p})`);
		limb.addColorStop(1, `rgba(225,235,255,${0.72 + 0.2 * p})`);
		sc.fillStyle = limb;
		sc.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);
		sc.save();
		sc.lineJoin = 'round';
		sc.strokeStyle = `rgba(130,166,222,${0.3 - 0.1 * p})`;
		sc.lineWidth = R * 0.025;
		const facets: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
			[
				[0.1, 0.98],
				[0.32, 0.56],
				[0.92, 0.36]
			],
			[
				[0.32, 0.56],
				[-0.28, 0.7],
				[-0.6, 0.78]
			]
		];
		for (const f of facets) {
			sc.beginPath();
			f.forEach(([x, y], i) => (i ? sc.lineTo(x * R, y * R) : sc.moveTo(x * R, y * R)));
			sc.stroke();
		}
		// light on the facets' lit edges
		sc.strokeStyle = 'rgba(255,255,255,0.7)';
		sc.lineWidth = R * 0.015;
		sc.beginPath();
		sc.moveTo(0.33 * R, 0.5 * R);
		sc.lineTo(0.68 * R, 0.38 * R);
		sc.stroke();
		{
			// the pink glint
			const g = sc.createRadialGradient(-R * 0.36, -R * 0.4, 0, -R * 0.36, -R * 0.4, R * 0.5);
			g.addColorStop(0, `rgba(255,170,215,${0.65 + 0.2 * p})`);
			g.addColorStop(1, 'rgba(255,170,215,0)');
			sc.fillStyle = g;
			sc.fillRect(-R, -R, R * 2, R * 2);
		}
		sc.restore();
	}

	protected paintBallPattern(ctx: CanvasRenderingContext2D, R: number): void {
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		const spiral = () => {
			ctx.beginPath();
			for (let i = 0; i <= 64; i++) {
				const s = i / 64;
				const r = R * (0.06 + 0.82 * s);
				const a = -1.1 + s * Math.PI * 2.7;
				const x = Math.cos(a) * r;
				const y = Math.sin(a) * r;
				if (i === 0) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			}
		};
		spiral();
		ctx.strokeStyle = 'rgba(80,100,145,.32)';
		ctx.lineWidth = R * 0.2;
		ctx.stroke();
		spiral();
		ctx.strokeStyle = '#f8fcff';
		ctx.lineWidth = R * 0.105;
		ctx.stroke();
		ctx.fillStyle = '#ffffff';
		starPath(ctx, 0, 0, R * 0.18, R * 0.055);
		ctx.fill();
	}

	protected paintBallOrbit(ctx: CanvasRenderingContext2D, R: number): void {
		for (let i = 0; i < 5; i++) {
			const a = this.time * 4 + (i / 5) * TAU;
			ctx.fillStyle = i === 0 ? '#ff9cc3' : '#ffffff';
			ctx.strokeStyle = css(INK, 0.65);
			ctx.lineWidth = R * 0.025;
			starPath(ctx, Math.cos(a) * R * 1.3, Math.sin(a) * R * 1.3, R * 0.17, R * 0.05, a);
			ctx.fill();
			ctx.stroke();
		}
	}

	protected drawLashes(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		const lod = R < 20 ? 1.55 : 1;
		const ex = R * 0.27;
		const ey = -R * (0.45 + (lod - 1) * 0.1);
		const rx = R * 0.18 * lod;
		const ry = R * 0.22 * lod;
		const blink = this.blink >= 0 ? Math.sin((this.blink / 0.14) * Math.PI) : 0;
		const happy = Math.max(this.squint, p * 0.25);
		const curve = this.dying >= 0 ? -ry * 0.2 : ry * (0.7 + 0.35 * happy) * (1 - blink * 0.85);
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';

		ctx.strokeStyle = css(BLUSH, 0.75);
		ctx.lineWidth = Math.max(0.8, R * 0.027);
		ctx.beginPath();
		for (let i = -1; i <= 1; i++) {
			const x = ex - R * 0.24 + i * R * 0.055;
			const y = ey + R * 0.29;
			ctx.moveTo(x - R * 0.025, y + R * 0.035);
			ctx.lineTo(x + R * 0.025, y - R * 0.035);
		}
		ctx.stroke();

		ctx.strokeStyle = css(INK);
		ctx.lineWidth = Math.max(1.1, R * 0.065);
		ctx.beginPath();
		ctx.moveTo(ex - rx, ey);
		ctx.quadraticCurveTo(ex, ey - curve, ex + rx, ey);
		ctx.quadraticCurveTo(ex + rx * 1.35, ey - ry * 0.08, ex + rx * 1.65, ey - ry * 0.35);
		ctx.stroke();
	}

	protected drawLips(
		ctx: CanvasRenderingContext2D,
		lips: () => void,
		R: number,
		pal: Palette,
		ends: { A: { x: number; y: number }; U: { x: number; y: number }; Dn: { x: number; y: number } }
	): void {
		ctx.strokeStyle = css(pal.ink);
		ctx.lineWidth = R * 0.05;
		lips();
		ctx.stroke();
		if (ends.U.y < -R * 0.3) {
			const fx = ends.A.x + (ends.U.x - ends.A.x) * 0.66;
			const fy = ends.A.y + (ends.U.y - ends.A.y) * 0.66;
			ctx.fillStyle = 'rgba(255,255,255,1)';
			ctx.strokeStyle = css(INK, 0.9);
			ctx.lineWidth = R * 0.02;
			ctx.beginPath();
			ctx.moveTo(fx - R * 0.035, fy + R * 0.01);
			ctx.lineTo(fx + R * 0.035, fy + R * 0.03);
			ctx.lineTo(fx + R * 0.005, fy + R * 0.1);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();
		}
	}

	/** Her ice bow (with the spring that rocks it), the curl over her rim, her lash. */
	protected drawWorn(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		ctx.save();
		ctx.translate(Math.cos(BOW_ANGLE) * R * BOW_DISTANCE, Math.sin(BOW_ANGLE) * R * BOW_DISTANCE);
		ctx.rotate(BOW_ANGLE + Math.PI / 2 + this.bow.value);
		drawIceBow(ctx, R, p);
		ctx.restore();
		this.curl(ctx, R);
		this.drawLashes(ctx, R, p);
	}

	/** A curl of her hair that falls over her rim behind the bow (outside the face). */
	private curl(ctx: CanvasRenderingContext2D, R: number): void {
		ctx.save();
		ctx.lineCap = 'round';
		const a0 = BOW_ANGLE - 0.55;
		const bx = Math.cos(a0) * R * 0.92;
		const by = Math.sin(a0) * R * 0.92;
		const ox = Math.cos(a0);
		const oy = Math.sin(a0);
		const path = () => {
			ctx.beginPath();
			for (let i = 0; i <= 26; i += 1) {
				const f = i / 26;
				// out from the rim, then a turn and a half of a tightening spiral
				const reach = R * 0.28 * Math.min(1, f * 2.2);
				const a = a0 + Math.PI + f * 3.6 * -1;
				const r = R * 0.13 * (1 - 0.6 * f);
				const x = bx + ox * reach + Math.cos(a) * r * Math.min(1, f * 3);
				const y = by + oy * reach + Math.sin(a) * r * Math.min(1, f * 3);
				if (i === 0) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			}
		};
		path();
		ctx.strokeStyle = css(INK);
		ctx.lineWidth = Math.max(1.6, R * 0.12);
		ctx.stroke();
		path();
		ctx.strokeStyle = '#7d4a9e';
		ctx.lineWidth = Math.max(0.8, R * 0.06);
		ctx.stroke();
		ctx.restore();
	}

	protected particleFor(moment: 'trail' | 'burst' | 'death'): ParticleKind {
		void moment;
		return 'flake';
	}

	protected liftFor(): number {
		return 0;
	}

	protected swirlFor(): number {
		return 0.4;
	}

	protected sizeFor(): number {
		return 0.85;
	}

	/** An ice crystal: a small hexagonal plate turning slowly, catching the light as it turns. */
	protected drawParticle(
		ctx: CanvasRenderingContext2D,
		e: Particle,
		a: number,
		size: number
	): void {
		// the rage's drops (the shared Hero's 'flame', big by its own measure) are crystals too
		const s = e.kind === 'flame' ? size * 0.45 : size;
		const rot = e.spin * 0.25 * (e.max - e.life);
		const glint = 0.55 + 0.45 * Math.abs(Math.cos(rot * 3));
		ctx.save();
		ctx.translate(e.x, e.y);
		ctx.globalCompositeOperation = 'lighter';
		ctx.globalAlpha = a * 0.35 * glint;
		const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 2.2);
		g.addColorStop(0, 'rgba(200,230,255,1)');
		g.addColorStop(1, 'rgba(200,230,255,0)');
		ctx.fillStyle = g;
		ctx.fillRect(-s * 2.2, -s * 2.2, s * 4.4, s * 4.4);
		ctx.globalCompositeOperation = 'source-over';
		ctx.globalAlpha = a;
		ctx.rotate(rot);
		ctx.beginPath();
		for (let i = 0; i < 6; i += 1) {
			const q = (i / 6) * TAU;
			const x = Math.cos(q) * s * 0.8;
			const y = Math.sin(q) * s * 0.8 * 0.55;
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.closePath();
		ctx.fillStyle = css(mix([170, 205, 245], [255, 255, 255], glint));
		ctx.fill();
		ctx.restore();
	}
}
