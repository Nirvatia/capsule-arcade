// Pac-Man's look: the crimson cinnabar vessel (the owner's mock-up, `vesselHero`).
import type { HeroDesign, Palette, Particle, ParticleKind } from './Hero';
import { Spring, clamp01, css, easeOut, glow, mix } from './Hero';
import type { RGB } from './heroSeasons';
import { clamp } from '../../common/math';
import {
	CJ_AURA_MAX,
	CJ_CINN_INK,
	CJ_TAU,
	VESSEL_STREAM_STEP,
	VesselHero,
	cjDropShape,
	cjLight,
	cjStar4,
	drawGlowWedgeEye
} from './vesselHero';
const CINNABAR_CALM: Palette = {
	light: [255, 244, 232],
	mid: [236, 44, 62],
	shadow: [176, 14, 38],
	deep: [86, 6, 20],
	bounce: [255, 206, 118],
	ink: CJ_CINN_INK,
	highlight: [255, 255, 250],
	rim: [255, 218, 152]
};
const CINNABAR_AWOKEN: Palette = {
	light: [255, 255, 238],
	mid: [255, 76, 72],
	shadow: [204, 16, 42],
	deep: [108, 6, 24],
	bounce: [255, 238, 128],
	ink: CJ_CINN_INK,
	highlight: [255, 255, 255],
	rim: [255, 246, 178]
};
const CINNABAR_DESIGN: HeroDesign = {
	id: 'pacman-cinnabar-studio-v2',
	calm: CINNABAR_CALM,
	awoken: CINNABAR_AWOKEN,
	hinge: 0.06,
	inside: { mid: [204, 24, 48], deep: [54, 8, 18] },
	mouthSpan: 0.74,
	grinRest: 0.14,
	grinRun: 0.06,
	chompRate: 4.5,
	flare: [255, 198, 78],
	death: 'open',
	bands: [0.1, 0.34, 0.74]
};

export class CinnabarHero extends VesselHero {
	protected readonly design: HeroDesign = CINNABAR_DESIGN;
	private readonly slosh = new Spring(0);
	private readonly surge = new Spring(0);
	private blink = -1;
	private nextBlink = 2.9;
	private blinks = 0;

	protected phaseGlowRgb(): RGB {
		return [255, 240, 146];
	}
	protected phaseHotRgb(): RGB {
		return [255, 72, 68];
	}

	protected override resetLooks(): void {
		super.resetLooks();
		this.slosh.value = 0;
		this.slosh.velocity = 0;
		this.surge.value = 0;
		this.surge.velocity = 0;
	}
	protected override onBite(): void {
		super.onBite();
		this.slosh.velocity += 5.2;
		this.surge.velocity += 6.2;
	}
	protected override onTurn(): void {
		super.onTurn();
		const dir = this.random() < 0.5 ? 1 : -1;
		this.slosh.velocity += dir * 9.0;
		this.surge.velocity += 4.2;
	}
	protected override afterUpdate(dt: number): void {
		super.afterUpdate(dt);
		this.slosh.step(0.07 * Math.sin(this.time * 2.5) - 0.11 * this.windK, dt, 66, 4.3);
		this.surge.step(0, dt, 95, 6.2);

		if (this.blink >= 0) {
			this.blink += dt;
			if (this.blink > 0.13) this.blink = -1;
		} else if (this.time > this.nextBlink) {
			this.blink = 0;
			this.blinks += 1;
			this.nextBlink = this.time + 2.9 + (this.blinks % 3) * 1.1;
		}
	}
	override draw(ctx: CanvasRenderingContext2D): void {
		this.drawStream(ctx);
		super.draw(ctx);
	}
	/**
	 * The cinnabar stream:
	 * - calm: a clean crimson stroke with a gold thread and glossy drops;
	 * - in the power it mirrors the inverted body: a glowing gold shell at the edges,
	 *   a deep obsidian-ruby core and a bright vein of molten gold.
	 */
	private drawStream(ctx: CanvasRenderingContext2D): void {
		const R = this.r;
		const p = this.power;
		const long = 1 + 0.48 * p;
		const swayFn = (u: number) =>
			Math.sin(u * 6.5 - this.time * 5.8) * R * 0.1 * Math.min(1, u * 3);

		// 1. the outer layer: a ruby edge, in the power a glowing gold shell
		if (p > 0.05) {
			// a thin dark underlay so the glowing edge holds on the day's sand
			this.wake.draw(ctx, this.time, {
				step: VESSEL_STREAM_STEP,
				life: 0.48 * long,
				width: R * (0.74 + 0.12 * p),
				capHead: R * 0.42,
				capTail: R * 2.55,
				add: false,
				shift: swayFn,
				widen: (u: number) => 1 - u * 0.62,
				color: (u: number, a: number) => css([34, 6, 14], 0.72 * p * a * (1 - u * 0.86))
			});
		}

		this.wake.draw(ctx, this.time, {
			step: VESSEL_STREAM_STEP,
			life: 0.46 * long,
			width: R * (0.62 + 0.16 * p),
			capHead: R * 0.4,
			capTail: R * 2.45,
			add: false,
			shift: swayFn,
			widen: (u: number) => 1 - u * 0.64,
			color: (u: number, a: number) => {
				const calmCol = mix([152, 12, 34], [92, 8, 24], u);
				const invCol = mix([255, 240, 142], [255, 142, 42], u);
				return css(mix(calmCol, invCol, p), (0.88 + 0.1 * p) * a * (1 - u * 0.84));
			}
		});

		// 2. the core: bright scarlet, in the power deep obsidian-ruby
		this.wake.draw(ctx, this.time, {
			step: VESSEL_STREAM_STEP,
			life: 0.42 * long,
			width: R * (0.42 + 0.12 * p),
			capHead: R * 0.35,
			capTail: R * 2.2,
			add: false,
			shift: swayFn,
			widen: (u: number) => 1 - u * 0.7,
			color: (u: number, a: number) => {
				const calmCol = mix([252, 42, 62], [220, 18, 44], u);
				const invCol = mix([42, 4, 14], [108, 10, 28], u);
				return css(mix(calmCol, invCol, p), (0.94 + 0.06 * p) * a * (1 - u * 0.82));
			}
		});

		// 3. the inner vein of molten gold (brighter on the dark core in the power)
		this.wake.draw(ctx, this.time, {
			step: VESSEL_STREAM_STEP,
			life: 0.38 * long,
			width: R * (0.12 + 0.1 * p),
			capHead: R * 0.3,
			capTail: R * 1.95,
			add: true,
			shift: (u: number) =>
				-Math.sin(u * 9.5 - this.time * 8.4) * R * (0.12 + 0.04 * p) * Math.min(1, u * 3),
			widen: (u: number) => 1 - u * 0.74,
			color: (u: number, a: number) =>
				css(mix([255, 252, 204], [255, 198, 62], u), (0.84 + 0.16 * p) * a * (1 - u))
		});

		// 4. the drops, and gold star sparks in the power
		if (this.flicks.length) {
			ctx.save();
			for (const fl of this.flicks) {
				const u = clamp01(fl.life / fl.max);
				const a = Math.min(1, (1 - u) * 6) * u;
				if (a <= 0.02) continue;
				const sz = Math.max(1.7, fl.size * (0.48 + 0.52 * u));
				ctx.save();
				ctx.globalAlpha = a;
				ctx.translate(fl.x, fl.y);
				if (p > 0.4 && fl.hot) {
					if (fl.alt) {
						// a dark ruby drop in a glowing gold rim
						ctx.rotate(fl.ang);
						cjDropShape(ctx, sz * 1.3, sz * 0.7);
						ctx.fillStyle = '#2e040e';
						ctx.fill();
						ctx.strokeStyle = '#fff098';
						ctx.lineWidth = Math.max(0.9, sz * 0.22);
						ctx.stroke();
					} else {
						// a crisp gold four-point star with a dark edge
						cjStar4(ctx, 0, 0, sz * 1.25, sz * 0.36, fl.ang + u * 3);
						ctx.fillStyle = '#fff4a8';
						ctx.fill();
						ctx.strokeStyle = css(CJ_CINN_INK, 0.86);
						ctx.lineWidth = Math.max(0.65, sz * 0.16);
						ctx.stroke();
					}
				} else {
					ctx.rotate(fl.ang);
					cjDropShape(ctx, sz * 1.25, sz * 0.68);
					ctx.fillStyle = fl.alt ? '#ffe478' : fl.hot ? '#ff5262' : '#df1634';
					ctx.fill();
					ctx.strokeStyle = css(CJ_CINN_INK, 0.78);
					ctx.lineWidth = Math.max(0.6, sz * 0.16);
					ctx.stroke();
				}
				ctx.restore();
			}
			ctx.restore();
		}
	}
	/** A smooth cinnabar curl on the nape (at most 1.30R = 0.384 tile). */
	private drawNape(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		const phaseOn = p > 0.2;
		const wave =
			Math.sin(this.time * 4.4) * R * 0.055 + clamp(this.slosh.value, -0.25, 0.25) * R * 0.18;
		ctx.save();
		ctx.beginPath();
		ctx.moveTo(-R * 0.58, -R * 0.7);
		ctx.bezierCurveTo(
			-R * 1.14,
			-R * 0.58 + wave,
			-R * 1.3,
			-R * 0.04 + wave,
			-R * 1.14,
			R * 0.44 - wave * 0.6
		);
		ctx.quadraticCurveTo(-R * 1.0, R * 0.64 - wave * 0.4, -R * 0.82, R * 0.5);
		ctx.quadraticCurveTo(-R * 0.96, R * 0.18, -R * 0.88, -R * 0.22);
		ctx.closePath();

		const sg = ctx.createLinearGradient(-R * 1.28, -R * 0.55, -R * 0.8, R * 0.58);
		sg.addColorStop(0, p > 0.35 ? '#ffea88' : '#ff626e');
		sg.addColorStop(0.52, p > 0.35 ? '#ff384e' : '#dd1432');
		sg.addColorStop(1, '#72081c');
		ctx.fillStyle = sg;
		ctx.fill();
		ctx.strokeStyle = phaseOn ? '#fff098' : css(CJ_CINN_INK, 0.9);
		ctx.lineWidth = Math.max(0.9, R * 0.05);
		ctx.lineJoin = 'round';
		ctx.stroke();
		ctx.restore();
	}
	protected override drawAura(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		const g = ctx.createRadialGradient(0, 0, R * 0.76, 0, 0, R * CJ_AURA_MAX);
		g.addColorStop(0, css(mix([255, 112, 118], [255, 224, 108], p), 0.22 + 0.36 * p));
		g.addColorStop(0.55, css([226, 26, 54], 0.08 + 0.2 * p));
		g.addColorStop(1, 'rgba(202,16,42,0)');
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(0, 0, R * CJ_AURA_MAX, 0, CJ_TAU);
		ctx.fill();
		ctx.restore();

		if (!this.ball) this.drawNape(ctx, R, p);
	}
	/** The cinnabar vessel, 85% full, with a rolling bubble. */
	protected override decorate(sc: CanvasRenderingContext2D, R: number, p: number): void {
		const { lx, ly } = cjLight(this.angle, this.flip);
		const t = this.time;
		const tilt = clamp(this.slosh.value, -0.36, 0.36);
		const rise = clamp(this.surge.value, -0.14, 0.22);
		const phaseOn = p > 0.08;

		// 1. the whole vessel, saturated crimson (85% full)
		const bodyG = sc.createRadialGradient(
			lx * R * 0.25,
			ly * R * 0.25,
			R * 0.06,
			0,
			R * 0.1,
			R * 1.12
		);
		if (phaseOn) {
			bodyG.addColorStop(0, '#7c0a1e');
			bodyG.addColorStop(0.58, '#3e0512');
			bodyG.addColorStop(1, '#1e0208');
		} else {
			bodyG.addColorStop(0, p > 0.4 ? '#ff6852' : '#ff4256');
			bodyG.addColorStop(0.52, p > 0.4 ? '#d81634' : '#c81030');
			bodyG.addColorStop(1, '#5c0416');
		}
		sc.fillStyle = bodyG;
		sc.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);

		// inside: a soft gold caustic and three slowly drifting gold grains
		sc.save();
		sc.rotate(tilt * 0.7);
		sc.strokeStyle = phaseOn
			? `rgba(255,232,120,${(0.85 * p).toFixed(2)})`
			: 'rgba(255,212,102,.52)';
		sc.lineWidth = Math.max(0.9, R * 0.05);
		sc.lineCap = 'round';
		sc.beginPath();
		sc.moveTo(-R * 0.58, R * 0.48);
		sc.quadraticCurveTo(-R * 0.08, R * 0.34 + Math.sin(t * 3.2) * R * 0.06, R * 0.46, R * 0.5);
		sc.stroke();

		if (R >= 11) {
			for (let i = 0; i < 3; i++) {
				const u = (t * 0.34 + i * 0.33) % 1;
				const gx = -R * 0.42 + i * R * 0.32 + Math.sin(t * 2.5 + i * 2) * R * 0.06;
				const gy = R * (0.76 - u * 0.66);
				sc.fillStyle = p > 0.35 ? '#ffffff' : '#ffe678';
				sc.beginPath();
				sc.arc(gx, gy, Math.max(0.85, R * (0.056 - i * 0.008)), 0, CJ_TAU);
				sc.fill();
			}
		}

		// the 85% mark: a glossy air bubble rolling along the top of the glass
		const bubAng = -Math.PI * 0.58 - tilt * 1.35 + Math.sin(t * 2.6) * 0.06;
		const bubR = R * 0.74;
		const bx = Math.cos(bubAng) * bubR;
		const by = Math.sin(bubAng) * bubR - rise * R * 0.12;
		const bRx = R * (0.38 - 0.04 * p);
		const bRy = R * (0.17 + 0.04 * Math.abs(rise));

		sc.save();
		sc.translate(bx, by);
		sc.rotate(bubAng + Math.PI / 2);
		const bubG = sc.createRadialGradient(0, -bRy * 0.35, 0, 0, 0, bRx * 1.08);
		bubG.addColorStop(0, 'rgba(255,255,252,0.96)');
		bubG.addColorStop(0.58, 'rgba(255,232,222,0.82)');
		bubG.addColorStop(1, 'rgba(255,148,142,0.28)');
		sc.fillStyle = bubG;
		sc.beginPath();
		sc.ellipse(0, 0, bRx, bRy, 0, 0, CJ_TAU);
		sc.fill();
		// a crisp meniscus under the bubble
		sc.strokeStyle = p > 0.35 ? 'rgba(255,244,158,.95)' : 'rgba(255,214,186,.86)';
		sc.lineWidth = Math.max(0.9, R * 0.044);
		sc.beginPath();
		sc.ellipse(0, 0, bRx * 0.94, bRy * 0.88, 0, 0.15, Math.PI - 0.15);
		sc.stroke();
		sc.restore();
		sc.restore();

		// a bright gold rim in the power; calm, the refraction of the crystal wall
		if (phaseOn) {
			sc.strokeStyle = `rgba(255,244,162,${(0.95 * p).toFixed(2)})`;
			sc.lineWidth = Math.max(1.25, R * 0.078);
			sc.beginPath();
			sc.arc(0, 0, R * 0.95, 0, CJ_TAU);
			sc.stroke();
		} else {
			sc.strokeStyle = 'rgba(255,216,158,.46)';
			sc.lineWidth = Math.max(1.0, R * 0.05);
			sc.beginPath();
			sc.arc(0, 0, R * 0.952, 0, CJ_TAU);
			sc.stroke();
		}

		// a crisp curved window highlight of thick glass, upper left
		sc.fillStyle = 'rgba(255,255,255,.9)';
		sc.beginPath();
		sc.ellipse(
			lx * R * 0.51,
			ly * R * 0.51,
			R * 0.26,
			R * 0.1,
			Math.atan2(ly, lx) + Math.PI / 2,
			0,
			CJ_TAU
		);
		sc.fill();
	}
	protected override drawLips(ctx: CanvasRenderingContext2D, lips: () => void, R: number): void {
		const phaseOn = this.power > 0.2;
		ctx.strokeStyle = phaseOn ? '#fff098' : css(CJ_CINN_INK);
		ctx.lineWidth = Math.max(1.15, R * 0.06);
		lips();
		ctx.stroke();
	}
	protected override drawWorn(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		const blink = this.blink >= 0 ? Math.sin((this.blink / 0.13) * Math.PI) : 0;
		const squint = Math.max(blink, this.bitePulse * 0.76);
		drawGlowWedgeEye(ctx, R, p, {
			gazeX: this.gazeX,
			gazeY: this.gazeY,
			squint,
			inkRgb: CJ_CINN_INK,
			glowCoreRgb: [255, 232, 114],
			glowHaloRgb: [255, 198, 68],
			isMs: false
		});
	}
	protected override paintBallPattern(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		ctx.fillStyle = p > 0.4 ? '#d81836' : '#a80c28';
		ctx.beginPath();
		ctx.arc(0, 0, R * 0.92, 0, CJ_TAU);
		ctx.fill();

		ctx.strokeStyle = p > 0.4 ? '#fff6b0' : '#ffd858';
		ctx.lineWidth = Math.max(1.5, R * 0.17);
		ctx.lineCap = 'round';
		for (let k = 0; k < 2; k++) {
			ctx.save();
			ctx.rotate(k * Math.PI);
			ctx.beginPath();
			for (let i = 0; i <= 18; i++) {
				const f = i / 18;
				const a = f * 2.9;
				const rad = R * (0.14 + 0.62 * f);
				if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
				else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
			}
			ctx.stroke();
			ctx.restore();
		}
		ctx.fillStyle = '#fff8cc';
		ctx.beginPath();
		ctx.arc(0, 0, R * 0.2, 0, CJ_TAU);
		ctx.fill();
	}
	protected override particleFor(): ParticleKind {
		return 'cinnabarDrop';
	}
	protected override swirlFor(): number {
		return 0.26;
	}
	protected override sizeFor(): number {
		return 1.22;
	}
	protected override drawParticle(
		ctx: CanvasRenderingContext2D,
		e: Particle,
		a: number,
		s: number
	): void {
		const isGold = (e.lane ?? 0) > Math.PI * 1.15;
		const ang = Math.atan2(e.vy, e.vx);
		const sz = Math.max(1.6, s * (e.hot ? 1.24 : 1.0));
		ctx.save();
		ctx.globalAlpha = a;
		ctx.translate(e.x, e.y);
		if (e.hot) {
			if (isGold) {
				cjStar4(ctx, 0, 0, sz * 1.2, sz * 0.36, e.spin * 0.35 * (e.max - e.life));
				ctx.fillStyle = '#fff4a8';
				ctx.fill();
				ctx.strokeStyle = 'rgba(42,10,18,.84)';
				ctx.lineWidth = Math.max(0.55, sz * 0.15);
				ctx.stroke();
			} else {
				// an inverted obsidian-ruby drop in a glowing gold rim
				ctx.rotate(ang);
				cjDropShape(ctx, sz * 1.22, sz * 0.64);
				ctx.fillStyle = '#320410';
				ctx.fill();
				ctx.strokeStyle = '#fff098';
				ctx.lineWidth = Math.max(0.85, sz * 0.2);
				ctx.stroke();
			}
		} else if (isGold) {
			ctx.globalCompositeOperation = 'lighter';
			const g = glow([255, 214, 78]);
			ctx.drawImage(g, -sz * 2.0, -sz * 2.0, sz * 4.0, sz * 4.0);
			ctx.globalCompositeOperation = 'source-over';
			ctx.fillStyle = '#fff4a8';
			ctx.strokeStyle = 'rgba(42,10,18,.72)';
			ctx.lineWidth = Math.max(0.5, sz * 0.14);
			ctx.beginPath();
			ctx.arc(0, 0, Math.max(1.0, sz * 0.62), 0, CJ_TAU);
			ctx.fill();
			ctx.stroke();
		} else {
			ctx.rotate(ang);
			cjDropShape(ctx, sz * 1.18, sz * 0.62);
			ctx.fillStyle = '#d81230';
			ctx.fill();
			ctx.strokeStyle = 'rgba(42,10,18,.76)';
			ctx.lineWidth = Math.max(0.55, sz * 0.15);
			ctx.stroke();
		}
		ctx.restore();
	}
	protected override drawBursts(ctx: CanvasRenderingContext2D): void {
		const R = this.r;
		for (const b of this.bursts) {
			const k = b.t / 0.5;
			const ease = easeOut(k);
			const a = 1 - k;
			const rad = R * (0.95 + 2.35 * ease);
			ctx.save();
			ctx.translate(b.x, b.y);
			ctx.strokeStyle = `rgba(216,18,46,${(0.88 * a).toFixed(3)})`;
			ctx.lineWidth = R * 0.34 * a;
			ctx.beginPath();
			ctx.arc(0, 0, rad, 0, CJ_TAU);
			ctx.stroke();

			ctx.globalCompositeOperation = 'lighter';
			ctx.strokeStyle = `rgba(255,232,126,${(0.96 * a).toFixed(3)})`;
			ctx.lineWidth = Math.max(1.3, R * 0.14 * a);
			ctx.beginPath();
			ctx.arc(0, 0, rad * 0.94, 0, CJ_TAU);
			ctx.stroke();
			ctx.restore();
		}
	}
}
