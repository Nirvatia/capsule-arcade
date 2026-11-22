// Ms. Pac-Man as a white comet "of her own": the game's disc, wedge mouth, lash, blush and little
// fang stay; she becomes an icy nucleus in a coma with two tails.
//   Nucleus: her pearl-white body turned to ice: frost facets on the shaded side, a cold limb.
//   Coma: a cool glow round her that ends at the game's reach (1.45 radii), brighter in front
//   (the hood a comet's head has), thinning behind into the tails.
//   Two tails, both made of where she has been, so they bend with a turn and never end in a cut
//   (`wake.ts` on the pure ribbon): a warm, wide dust tail that curves away from the key light
//   (it is pushed to the lower right, as real dust tails are pushed off the sun), and a narrow,
//   straight-edged blue ion tail, longer, that keeps to her path. When she stops they draw back
//   into her and fade. Ice crystals (small turning plates that catch the light slowly) are shed
//   into the dust tail; no stars.
//   Rage (her overdrive): an outburst: soft shells of coma swell out to the reach and the tails
//   run long, pink-white and bright.
//   A  classic:  her raspberry bow with the pearl, a beauty mark, a pearl earring
//   B  crystal:  the bow turned to pink ice facets, a pink glint on the ice, a curl under the bow
//   C  ribbon:   the bow rethought: its knot is where the tails leave her, the two tails are its
//               ribbons streaming back (at rest they fall back into two short loops); a curl and
//               a beauty mark
import type { Particle, ParticleKind } from '../../../src/games/pacman/render/actors/hero/Hero';
import { Spring, css, mix } from '../../../src/games/pacman/render/actors/hero/Hero';
import { BOW_ANGLE, BOW_DISTANCE, MsPacmanHero, drawPearlBow } from '../../../src/games/pacman/render/actors/hero/MsPacmanHero';
import type { RGB } from '../../../src/games/pacman/render/actors/hero/heroSeasons';
import { REACH } from './sun';
import { Wake } from './wake';

const TAU = Math.PI * 2;
export type CometKind = 'classic' | 'crystal' | 'ribbon';
const INK: RGB = [44, 34, 66];
/** Away from the key light (upper left): where the dust tail is pushed. */
const AWAY = { x: 0.55, y: 0.83 };

export class CometMs extends MsPacmanHero {
	private readonly dust = new Wake();
	private readonly ion = new Wake();
	private readonly myBow = new Spring(0);
	private windK = 0;
	bare = false;

	constructor(readonly kind: CometKind) {
		super();
	}

	/** Where the tails leave her, in the world: her centre, or the bow's knot (C). */
	private root(): { x: number; y: number } {
		if (this.kind !== 'ribbon') return { x: this.x, y: this.y };
		const R = this.r;
		const fx = Math.cos(BOW_ANGLE) * R * BOW_DISTANCE;
		const fy = Math.sin(BOW_ANGLE) * R * BOW_DISTANCE * this.flip;
		const ca = Math.cos(this.angle);
		const sa = Math.sin(this.angle);
		return { x: this.x + fx * ca - fy * sa, y: this.y + fx * sa + fy * ca };
	}

	protected afterUpdate(dt: number): void {
		super.afterUpdate(dt);
		this.windK += ((this.moving ? 1 : 0) - this.windK) * Math.min(1, dt * 5);
		this.myBow.step(0.07 * Math.sin(this.time * 2.1), dt, 90, 7);
		const o = this.root();
		const emit = this.moving ? 1 : 0;
		this.dust.push(o.x, o.y, this.time, emit);
		this.ion.push(o.x, o.y, this.time, emit);
	}

	protected onTurn(): void {
		super.onTurn();
		this.myBow.velocity += this.random() < 0.5 ? 4.5 : -4.5;
	}

	protected onBite(): void {
		super.onBite();
		this.myBow.velocity += 3.2;
	}

	/** The tails first (world space, under her), then the game's hero. */
	draw(ctx: CanvasRenderingContext2D): void {
		if (!this.bare) this.tails(ctx);
		super.draw(ctx);
	}

	private tails(ctx: CanvasRenderingContext2D): void {
		const R = this.r;
		const p = this.power;
		const long = 1 + 0.35 * p;
		// the dust tail: warm, wide, curving away from the light
		const dustCol = (u: number): RGB => mix(mix([255, 238, 205], [236, 170, 110], u), [255, 190, 225], p * 0.7);
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
		if (this.kind === 'crystal') {
			// striae: fine streaks in the dust fan
			for (const k of [-0.5, 0.45]) {
				this.dust.draw(ctx, this.time, {
					life: 0.3 * long,
					width: R * 0.05,
					capHead: R * 0.9,
					capTail: R * 1.4,
					shift: (u, q) => {
						const side = q.nx * AWAY.x + q.ny * AWAY.y > 0 ? 1 : -1;
						return side * Math.pow(u, 1.3) * R * 0.62 + k * R * 0.42 * (0.6 + 1.1 * u) * Math.min(1, u * 3);
					},
					color: (u, a) => css(dustCol(u * 0.6), 0.45 * a * (1 - u))
				});
			}
		}
		// the ion tail: narrow, blue, on her path, longer
		const ionCol = (u: number): RGB => mix(mix([150, 210, 255], [70, 130, 250], u), [255, 200, 235], p * 0.5 * (1 - u));
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
		if (this.kind === 'crystal') {
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
		const g = ctx.createRadialGradient(back, 0, R * 0.7, back * 0.5, 0, R * REACH);
		g.addColorStop(0, `rgba(196,226,255,${0.5 + 0.2 * p})`);
		g.addColorStop(0.45, `rgba(170,205,255,${0.2 + 0.12 * p})`);
		g.addColorStop(1, 'rgba(170,205,255,0)');
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(0, 0, R * REACH, 0, TAU);
		ctx.fill();
		// the hood: the coma is brighter on her front while she flies (a soft lobe, no line)
		if (this.windK > 0.02) {
			const h = ctx.createRadialGradient(R * 0.55, 0, 0, R * 0.55, 0, R * 0.9);
			h.addColorStop(0, `rgba(225,240,255,${0.3 * this.windK})`);
			h.addColorStop(1, 'rgba(225,240,255,0)');
			ctx.fillStyle = h;
			ctx.beginPath();
			ctx.arc(0, 0, R * REACH, 0, TAU);
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
			const r = R * (1.0 + (REACH - 1.1) * q);
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

	/** The nucleus: her pearl-white, then ice: facets on the shaded side and a cold limb. */
	protected decorate(sc: CanvasRenderingContext2D, R: number, p: number): void {
		super.decorate(sc, R, p);
		sc.save();
		sc.lineJoin = 'round';
		sc.strokeStyle = `rgba(130,166,222,${0.3 - 0.1 * p})`;
		sc.lineWidth = R * 0.025;
		const facets: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
			[[0.1, 0.98], [0.32, 0.56], [0.92, 0.36]],
			[[0.32, 0.56], [-0.28, 0.7], [-0.6, 0.78]]
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
		if (this.kind === 'crystal') {
			// the pink glint
			const g = sc.createRadialGradient(-R * 0.36, -R * 0.4, 0, -R * 0.36, -R * 0.4, R * 0.5);
			g.addColorStop(0, `rgba(255,170,215,${0.65 + 0.2 * p})`);
			g.addColorStop(1, 'rgba(255,170,215,0)');
			sc.fillStyle = g;
			sc.fillRect(-R, -R, R * 2, R * 2);
		}
		sc.restore();
	}

	protected drawWorn(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		const bx = Math.cos(BOW_ANGLE) * R * BOW_DISTANCE;
		const by = Math.sin(BOW_ANGLE) * R * BOW_DISTANCE;
		if (this.kind === 'classic') {
			ctx.save();
			ctx.translate(bx, by);
			ctx.rotate(BOW_ANGLE + Math.PI / 2 + this.myBow.value);
			drawPearlBow(ctx, R, this.time, p);
			ctx.restore();
			this.mark(ctx, R);
			this.earring(ctx, R);
		} else if (this.kind === 'crystal') {
			ctx.save();
			ctx.translate(bx, by);
			ctx.rotate(BOW_ANGLE + Math.PI / 2 + this.myBow.value);
			this.iceBow(ctx, R, p);
			ctx.restore();
			this.curl(ctx, R);
		} else {
			this.curl(ctx, R);
			this.ribbonKnot(ctx, R, bx, by, p);
			this.mark(ctx, R);
		}
		this.drawLashes(ctx, R, p);
	}

	/**
	 * A beauty mark by the lower lip, clear of the mouth's widest opening (above the lip, under
	 * her lash, a dot reads as a pupil).
	 */
	private mark(ctx: CanvasRenderingContext2D, R: number): void {
		ctx.fillStyle = css(INK);
		ctx.beginPath();
		ctx.arc(R * 0.44, R * 0.52, Math.max(1, R * 0.055), 0, TAU);
		ctx.fill();
	}

	private earring(ctx: CanvasRenderingContext2D, R: number): void {
		// on her rim, back and low (inside the face it reads as a second eye)
		const x = -R * 0.8;
		const y = R * 0.62;
		ctx.strokeStyle = css(INK, 0.8);
		ctx.lineWidth = Math.max(0.7, R * 0.025);
		ctx.beginPath();
		ctx.moveTo(x, y - R * 0.12);
		ctx.lineTo(x, y - R * 0.04);
		ctx.stroke();
		const g = ctx.createRadialGradient(x - R * 0.03, y - R * 0.03, 0, x, y, R * 0.1);
		g.addColorStop(0, '#ffffff');
		g.addColorStop(0.6, '#f1e8f6');
		g.addColorStop(1, '#bfb2d6');
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(x, y, R * 0.1, 0, TAU);
		ctx.fill();
		ctx.lineWidth = Math.max(0.7, R * 0.025);
		ctx.stroke();
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

	/** B: the bow in pink ice: faceted lobes, white edges, a crystal knot. */
	private iceBow(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		const s = 0.75 * (1 + 0.08 * p);
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

	/**
	 * C: the bow's knot, a pearl, where the tails leave her. At rest two short ribbon loops hang
	 * from it; as she runs they straighten into the tails (the loops shrink as the tails grow).
	 */
	private ribbonKnot(ctx: CanvasRenderingContext2D, R: number, bx: number, by: number, p: number): void {
		const rest = 1 - this.windK;
		ctx.save();
		ctx.translate(bx, by);
		ctx.rotate(BOW_ANGLE + Math.PI / 2 + this.myBow.value);
		if (rest > 0.02) {
			ctx.lineJoin = 'round';
			for (const [side, col] of [
				[-1, 'rgba(255,226,190,0.95)'],
				[1, 'rgba(170,214,255,0.95)']
			] as const) {
				const k = rest * 0.7;
				ctx.beginPath();
				ctx.moveTo(0, 0);
				ctx.quadraticCurveTo(side * R * 0.5 * k, -R * 0.6 * k, side * R * 0.85 * k, -R * 0.2 * k);
				ctx.quadraticCurveTo(side * R * 0.7 * k, R * 0.3 * k, 0, 0);
				ctx.closePath();
				ctx.fillStyle = col;
				ctx.fill();
				ctx.strokeStyle = css(INK);
				ctx.lineWidth = R * 0.055;
				ctx.stroke();
			}
		}
		const r = R * (0.17 + 0.03 * p);
		const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, 0, 0, 0, r);
		g.addColorStop(0, '#ffffff');
		g.addColorStop(0.6, '#f3ecfa');
		g.addColorStop(1, '#c4b6dc');
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(0, 0, r, 0, TAU);
		ctx.fill();
		ctx.strokeStyle = css(INK);
		ctx.lineWidth = R * 0.05;
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
	protected drawParticle(ctx: CanvasRenderingContext2D, e: Particle, a: number, s: number): void {
		if (this.bare) return;
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
