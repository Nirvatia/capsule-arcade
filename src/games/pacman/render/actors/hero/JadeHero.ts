// Ms. Pac-Man's look: the jade squall vessel with the red bow (the owner's mock-up, `vesselHero`).
import type { HeroDesign, Palette, Particle, ParticleKind } from './Hero';
import { Spring, clamp01, css, easeOut, glow, mix } from './Hero';
import type { RGB } from './heroSeasons';
import { clamp } from '../../common/math';
import {
	CJ_AURA_MAX,
	CJ_CINN_INK,
	CJ_JADE_INK,
	CJ_TAU,
	VESSEL_STREAM_STEP,
	VesselHero,
	cjDiamond,
	cjLight,
	drawGlowWedgeEye
} from './vesselHero';
const JADE_CALM: Palette = {
	light: [244, 255, 250],
	mid: [42, 212, 162],
	shadow: [14, 138, 108],
	deep: [8, 66, 56],
	bounce: [152, 255, 224],
	ink: CJ_JADE_INK,
	highlight: [255, 255, 255],
	rim: [218, 255, 242]
};
const JADE_AWOKEN: Palette = {
	light: [255, 255, 255],
	mid: [72, 244, 192],
	shadow: [18, 176, 138],
	deep: [10, 92, 76],
	bounce: [212, 255, 238],
	ink: [8, 36, 34],
	highlight: [255, 255, 255],
	rim: [232, 255, 248]
};
const JADE_DESIGN: HeroDesign = {
	id: 'ms-pacman-jade-studio-v2',
	calm: JADE_CALM,
	awoken: JADE_AWOKEN,
	hinge: 0.08,
	inside: { mid: [18, 136, 106], deep: [8, 44, 38] },
	mouthSpan: 0.7,
	grinRest: 0.12,
	grinRun: 0.04,
	chompRate: 4.8,
	flare: [86, 252, 206],
	death: 'spin',
	bands: [0.1, 0.32, 0.74]
};

export class JadeHero extends VesselHero {
	protected readonly design: HeroDesign = JADE_DESIGN;
	private vortexPhase = 0;
	private readonly vortexBoost = new Spring(0);
	private readonly slosh = new Spring(0);
	private readonly loopSway = new Spring(0);
	private blink = -1;
	private nextBlink = 2.2;
	private blinks = 0;

	protected phaseGlowRgb(): RGB {
		return [224, 255, 246];
	}
	protected phaseHotRgb(): RGB {
		return [48, 246, 192];
	}

	protected override resetLooks(): void {
		super.resetLooks();
		this.vortexBoost.value = 0;
		this.vortexBoost.velocity = 0;
		this.slosh.value = 0;
		this.slosh.velocity = 0;
		this.loopSway.value = 0;
		this.loopSway.velocity = 0;
	}
	protected override onBite(): void {
		super.onBite();
		this.vortexBoost.velocity += 10.5;
		this.slosh.velocity += 5.4;
		this.loopSway.velocity += 5.0;
	}
	protected override onTurn(): void {
		super.onTurn();
		const dir = this.random() < 0.5 ? 1 : -1;
		this.vortexBoost.velocity += 14.0;
		this.slosh.velocity += dir * 8.6;
		this.loopSway.velocity += dir * 6.0;
	}
	protected override afterUpdate(dt: number): void {
		super.afterUpdate(dt);
		this.vortexBoost.step(0, dt, 34, 5.2);
		this.slosh.step(0.06 * Math.sin(this.time * 3.1) - 0.09 * this.windK, dt, 86, 5.0);
		this.loopSway.step(0.045 * Math.sin(this.time * 3.0) - 0.06 * this.windK, dt, 125, 8.2);
		const spinRate =
			3.2 + 2.8 * this.windK + 3.4 * this.power + Math.max(0, this.vortexBoost.value) * 3.2;
		this.vortexPhase = (this.vortexPhase + dt * spinRate) % (CJ_TAU * 100);

		if (this.blink >= 0) {
			this.blink += dt;
			if (this.blink > 0.13) this.blink = -1;
		} else if (this.time > this.nextBlink) {
			this.blink = 0;
			this.blinks += 1;
			this.nextBlink = this.time + (this.blinks % 4 === 0 ? 0.32 : 2.4 + (this.blinks % 3) * 1.1);
		}
	}
	override draw(ctx: CanvasRenderingContext2D): void {
		this.drawStream(ctx);
		super.draw(ctx);
	}
	/**
	 * The jade squall stream:
	 * - calm: a clean mint-jade ribbon of wind and white air cuts;
	 * - in the power it mirrors the inverted body: a glowing white-mint shell
	 *   at the edges, a deep obsidian-jade core and a double braid
	 *   of light threads of wind.
	 */
	private drawStream(ctx: CanvasRenderingContext2D): void {
		const R = this.r;
		const p = this.power;
		const long = 1 + 0.48 * p;
		const swayFn = (u: number) =>
			-Math.sin(u * 8.5 - this.time * 8.2) * R * 0.13 * Math.min(1, u * 3);

		// 1. the outer layer: a pine-jade edge, in the power a glowing white-mint shell
		if (p > 0.05) {
			// a thin dark underlay under the glowing edge, for contrast on the day's sand
			this.wake.draw(ctx, this.time, {
				step: VESSEL_STREAM_STEP,
				life: 0.47 * long,
				width: R * (0.72 + 0.12 * p),
				capHead: R * 0.42,
				capTail: R * 2.55,
				add: false,
				shift: swayFn,
				widen: (u: number) => 1 - u * 0.62,
				color: (u: number, a: number) => css([6, 32, 30], 0.72 * p * a * (1 - u * 0.86))
			});
		}

		this.wake.draw(ctx, this.time, {
			step: VESSEL_STREAM_STEP,
			life: 0.45 * long,
			width: R * (0.58 + 0.17 * p),
			capHead: R * 0.4,
			capTail: R * 2.45,
			add: false,
			shift: swayFn,
			widen: (u: number) => 1 - u * 0.64,
			color: (u: number, a: number) => {
				const calmCol = mix([14, 134, 102], [10, 84, 72], u);
				const invCol = mix([218, 255, 244], [42, 232, 182], u);
				return css(mix(calmCol, invCol, p), (0.86 + 0.12 * p) * a * (1 - u * 0.84));
			}
		});

		// 2. the core: light jade, in the power deep obsidian-jade
		this.wake.draw(ctx, this.time, {
			step: VESSEL_STREAM_STEP,
			life: 0.41 * long,
			width: R * (0.38 + 0.12 * p),
			capHead: R * 0.35,
			capTail: R * 2.15,
			add: false,
			shift: swayFn,
			widen: (u: number) => 1 - u * 0.7,
			color: (u: number, a: number) => {
				const calmCol = mix([146, 255, 222], [46, 218, 168], u);
				const invCol = mix([4, 28, 26], [10, 74, 62], u);
				return css(mix(calmCol, invCol, p), (0.94 + 0.06 * p) * a * (1 - u * 0.82));
			}
		});

		// 3. the threads of wind: one white thread, in the power a double braid
		this.wake.draw(ctx, this.time, {
			step: VESSEL_STREAM_STEP,
			life: 0.38 * long,
			width: R * (0.12 + 0.07 * p),
			capHead: R * 0.3,
			capTail: R * 1.95,
			add: true,
			shift: (u: number) =>
				Math.sin(u * (11 + 3 * p) - this.time * (10.6 + 2.4 * p)) *
				R *
				(0.11 + 0.16 * p) *
				Math.min(1, u * 3),
			widen: (u: number) => 1 - u * 0.74,
			color: (u: number, a: number) =>
				css(mix([255, 255, 255], [142, 255, 226], u), (0.88 + 0.12 * p) * a * (1 - u))
		});

		if (p > 0.15) {
			// the braid's second thread, in counter-phase, in the power
			this.wake.draw(ctx, this.time, {
				step: VESSEL_STREAM_STEP,
				life: 0.38 * long,
				width: R * (0.14 * p),
				capHead: R * 0.3,
				capTail: R * 1.95,
				add: true,
				shift: (u: number) => -Math.sin(u * 14 - this.time * 13.0) * R * 0.27 * Math.min(1, u * 3),
				widen: (u: number) => 1 - u * 0.74,
				color: (u: number, a: number) =>
					css(mix([226, 255, 248], [62, 246, 198], u), 0.9 * p * a * (1 - u))
			});
		}

		// 4. sharp arcs of wind cut (on a dark underlay in the power, to ring over the glow)
		if (this.flicks.length) {
			ctx.save();
			ctx.lineCap = 'round';
			for (const fl of this.flicks) {
				const u = clamp01(fl.life / fl.max);
				const a = Math.sin(u * Math.PI) * (fl.hot ? 0.94 : 0.8);
				if (a <= 0.02) continue;
				const sz = Math.max(2.0, fl.size * (0.6 + 0.5 * u));
				ctx.save();
				ctx.globalAlpha = a;
				ctx.translate(fl.x, fl.y);
				ctx.rotate(fl.ang);
				if (p > 0.4 && fl.hot) {
					ctx.strokeStyle = css(CJ_JADE_INK, 0.86);
					ctx.lineWidth = Math.max(2.2, sz * 0.58);
					ctx.beginPath();
					ctx.arc(0, sz * 0.8, sz * 1.45, -Math.PI * 0.74, -Math.PI * 0.26);
					ctx.stroke();

					ctx.strokeStyle = '#e6fff8';
					ctx.lineWidth = Math.max(1.15, sz * 0.3);
					ctx.stroke();
				} else {
					ctx.strokeStyle = fl.hot ? '#ffffff' : '#9effe0';
					ctx.lineWidth = Math.max(1.1, sz * 0.32);
					ctx.beginPath();
					ctx.arc(0, sz * 0.8, sz * 1.4, -Math.PI * 0.72, -Math.PI * 0.28);
					ctx.stroke();
				}
				ctx.restore();
			}
			ctx.restore();
		}
	}
	/** A light curl of jade wind on the nape (at most 1.30R = 0.384 tile). */
	private drawNape(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		const phaseOn = p > 0.2;
		const wv = Math.sin(this.time * 6.8) * R * 0.06;
		ctx.save();
		ctx.beginPath();
		ctx.moveTo(-R * 0.58, -R * 0.68);
		ctx.bezierCurveTo(
			-R * 1.14,
			-R * 0.56 + wv,
			-R * 1.3,
			-R * 0.04 + wv,
			-R * 1.12,
			R * 0.42 - wv
		);
		ctx.quadraticCurveTo(-R * 0.98, R * 0.58 - wv, -R * 0.84, R * 0.46);
		ctx.quadraticCurveTo(-R * 0.98, R * 0.12, -R * 0.88, -R * 0.24);
		ctx.closePath();

		const wg = ctx.createLinearGradient(-R * 1.28, -R * 0.55, -R * 0.82, R * 0.55);
		wg.addColorStop(0, '#ffffff');
		wg.addColorStop(0.48, p > 0.35 ? '#9affde' : '#4ee8b8');
		wg.addColorStop(1, '#0e9474');
		ctx.fillStyle = wg;
		ctx.fill();
		ctx.strokeStyle = phaseOn ? '#e6fff8' : css(CJ_JADE_INK, 0.86);
		ctx.lineWidth = Math.max(0.85, R * 0.048);
		ctx.lineJoin = 'round';
		ctx.stroke();
		ctx.restore();
	}
	protected override drawAura(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		const g = ctx.createRadialGradient(0, 0, R * 0.76, 0, 0, R * CJ_AURA_MAX);
		g.addColorStop(0, css(mix([158, 255, 224], [198, 255, 242], p), 0.22 + 0.36 * p));
		g.addColorStop(0.55, css([26, 206, 158], 0.08 + 0.2 * p));
		g.addColorStop(1, 'rgba(18,176,136,0)');
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(0, 0, R * CJ_AURA_MAX, 0, CJ_TAU);
		ctx.fill();
		ctx.restore();

		if (!this.ball) this.drawNape(ctx, R, p);
	}
	/** The jade vessel, 85% full, with a rolling bubble. */
	protected override decorate(sc: CanvasRenderingContext2D, R: number, p: number): void {
		const { lx, ly } = cjLight(this.angle, this.flip);
		const t = this.time;
		const ph = this.vortexPhase;
		const tilt = clamp(this.slosh.value, -0.36, 0.36);
		const phaseOn = p > 0.08;

		// 1. the whole vessel, saturated jade (85% full)
		const bodyG = sc.createRadialGradient(
			lx * R * 0.25,
			ly * R * 0.25,
			R * 0.06,
			0,
			R * 0.1,
			R * 1.12
		);
		if (phaseOn) {
			bodyG.addColorStop(0, '#0c5a4c');
			bodyG.addColorStop(0.58, '#062c28');
			bodyG.addColorStop(1, '#031614');
		} else {
			bodyG.addColorStop(0, p > 0.4 ? '#6affd2' : '#44e2b2');
			bodyG.addColorStop(0.52, p > 0.4 ? '#14b48a' : '#129c7c');
			bodyG.addColorStop(1, '#08483c');
		}
		sc.fillStyle = bodyG;
		sc.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);

		// a soft inner jet of jade flow and three sparks of wind
		sc.save();
		sc.rotate(tilt * 0.7);
		sc.strokeStyle = phaseOn
			? `rgba(182,255,232,${(0.85 * p).toFixed(2)})`
			: 'rgba(182,255,232,.58)';
		sc.lineWidth = Math.max(0.9, R * 0.05);
		sc.lineCap = 'round';
		sc.beginPath();
		sc.moveTo(-R * 0.58, R * 0.46);
		sc.quadraticCurveTo(-R * 0.1, R * 0.32 + Math.sin(t * 4.2) * R * 0.06, R * 0.44, R * 0.5);
		sc.stroke();

		if (R >= 11) {
			for (let i = 0; i < 3; i++) {
				const a = ph * 0.55 + (i * CJ_TAU) / 3;
				const rad = R * (0.34 + i * 0.12);
				sc.fillStyle = '#e8fff8';
				sc.beginPath();
				sc.arc(
					-R * 0.1 + Math.cos(a) * rad,
					R * 0.16 + Math.sin(a) * rad * 0.72,
					Math.max(0.8, R * 0.048),
					0,
					CJ_TAU
				);
				sc.fill();
			}
		}

		// a glossy air bubble rolling along the top of the glass
		const bubAng = -Math.PI * 0.56 - tilt * 1.35 + Math.sin(t * 3.1) * 0.06;
		const bubR = R * 0.74;
		const bx = Math.cos(bubAng) * bubR;
		const by = Math.sin(bubAng) * bubR;
		const bRx = R * (0.37 - 0.04 * p);
		const bRy = R * 0.17;

		sc.save();
		sc.translate(bx, by);
		sc.rotate(bubAng + Math.PI / 2);
		const bubG = sc.createRadialGradient(0, -bRy * 0.35, 0, 0, 0, bRx * 1.08);
		bubG.addColorStop(0, 'rgba(255,255,255,0.96)');
		bubG.addColorStop(0.58, 'rgba(214,255,244,0.82)');
		bubG.addColorStop(1, 'rgba(88,236,196,0.28)');
		sc.fillStyle = bubG;
		sc.beginPath();
		sc.ellipse(0, 0, bRx, bRy, 0, 0, CJ_TAU);
		sc.fill();
		sc.strokeStyle = 'rgba(232,255,248,.92)';
		sc.lineWidth = Math.max(0.9, R * 0.044);
		sc.beginPath();
		sc.ellipse(0, 0, bRx * 0.94, bRy * 0.88, 0, 0.15, Math.PI - 0.15);
		sc.stroke();
		sc.restore();
		sc.restore();

		if (phaseOn) {
			sc.strokeStyle = `rgba(218,255,244,${(0.95 * p).toFixed(2)})`;
			sc.lineWidth = Math.max(1.25, R * 0.078);
			sc.beginPath();
			sc.arc(0, 0, R * 0.95, 0, CJ_TAU);
			sc.stroke();
		} else {
			sc.strokeStyle = 'rgba(196,255,238,.52)';
			sc.lineWidth = Math.max(1.0, R * 0.05);
			sc.beginPath();
			sc.arc(0, 0, R * 0.952, 0, CJ_TAU);
			sc.stroke();
		}

		// a crisp window highlight of the glass, upper left
		sc.fillStyle = 'rgba(255,255,255,.92)';
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
		ctx.strokeStyle = phaseOn ? '#e6fff8' : css(CJ_JADE_INK);
		ctx.lineWidth = Math.max(1.05, R * 0.058);
		lips();
		ctx.stroke();
	}
	/**
	 * Ms. Pac-Man's sculpted cinnabar-red silk bow with a gold knot and tails:
	 * - a crisp waist (5:1 to the wings' span) and two short swallow tails with V cuts;
	 * - a contact shadow on the jade and a full crisp outline round each wing;
	 * - a compact gold knot instead of a big bead: the wings stay open;
	 * - at most 1.42R = 0.418 tile (0.460 with the bite pulse of x1.1: inside the tile).
	 */
	private drawBow(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		const phaseOn = p > 0.2;
		const ba = -0.65 * Math.PI;
		const dist = R * 0.88;
		const sway = clamp(this.loopSway.value, -0.18, 0.18);
		const scale = 1 + 0.04 * p;
		const ink = phaseOn ? '#e6fff8' : css(CJ_CINN_INK);
		const inkW = Math.max(1.25, R * (phaseOn ? 0.068 : 0.082));
		const outerDarkW = Math.max(2.15, R * 0.135);

		const bw = R * 0.78;
		const bh = R * 0.44;

		const strokeWithMode = () => {
			if (phaseOn) {
				ctx.strokeStyle = css(CJ_JADE_INK, 0.9);
				ctx.lineWidth = outerDarkW;
				ctx.stroke();
			}
			ctx.strokeStyle = ink;
			ctx.lineWidth = inkW;
			ctx.stroke();
		};

		const tailPath = (side: number) => {
			const s = side;
			ctx.beginPath();
			ctx.moveTo(s * bw * 0.06, bh * 0.1);
			ctx.quadraticCurveTo(s * bw * 0.32, bh * 0.42, s * bw * 0.48, bh * 0.86);
			ctx.lineTo(s * bw * 0.27, bh * 0.73);
			ctx.lineTo(s * bw * 0.14, bh * 0.94);
			ctx.quadraticCurveTo(s * bw * 0.1, bh * 0.54, 0, bh * 0.22);
			ctx.closePath();
		};

		const wingPath = (side: number) => {
			const s = side;
			ctx.beginPath();
			ctx.moveTo(0, -bh * 0.12);
			ctx.bezierCurveTo(
				s * bw * 0.32,
				-bh * 1.04,
				s * bw * 0.98,
				-bh * 0.88,
				s * bw * 1.0,
				-bh * 0.06
			);
			ctx.bezierCurveTo(s * bw * 0.96, bh * 0.62, s * bw * 0.42, bh * 0.68, 0, bh * 0.2);
			ctx.closePath();
		};

		ctx.save();
		ctx.translate(Math.cos(ba) * dist, Math.sin(ba) * dist);
		ctx.rotate(ba + Math.PI / 2 + sway);
		ctx.scale(scale, scale);
		ctx.lineJoin = 'round';
		ctx.lineCap = 'round';

		// 0. a soft contact shadow on the jade sphere: lifts the bow off it
		ctx.save();
		ctx.fillStyle = phaseOn ? 'rgba(2,14,12,.52)' : 'rgba(8,34,30,.42)';
		ctx.beginPath();
		ctx.ellipse(0, bh * 0.24, bw * 0.86, bh * 0.44, 0, 0, CJ_TAU);
		ctx.fill();
		ctx.restore();

		// in the power a delicate warm light (calm, it would blur the contour)
		if (p > 0.2) {
			ctx.save();
			ctx.globalCompositeOperation = 'lighter';
			const bg = ctx.createRadialGradient(0, 0, 0, 0, 0, bw * 1.0);
			bg.addColorStop(0, `rgba(255,94,108,${(0.36 * p).toFixed(2)})`);
			bg.addColorStop(1, 'rgba(255,48,76,0)');
			ctx.fillStyle = bg;
			ctx.beginPath();
			ctx.arc(0, 0, bw * 1.0, 0, CJ_TAU);
			ctx.fill();
			ctx.restore();
		}

		// 1. two short ribbon tails with a V cut (the silhouette of a real bow)
		for (const side of [-1, 1]) {
			tailPath(side);
			const tg = ctx.createLinearGradient(0, bh * 0.1, side * bw * 0.45, bh * 0.92);
			if (p > 0.4) {
				tg.addColorStop(0, '#ff4a64');
				tg.addColorStop(1, '#9a0824');
			} else {
				tg.addColorStop(0, '#df1636');
				tg.addColorStop(1, '#7c061c');
			}
			ctx.fillStyle = tg;
			ctx.fill();
			strokeWithMode();
		}

		// 2. two sculpted flared wings, folds clipped inside, a full outline
		for (const side of [-1, 1]) {
			wingPath(side);
			const lg = ctx.createLinearGradient(0, -bh * 0.95, side * bw * 0.75, bh * 0.65);
			if (p > 0.4) {
				lg.addColorStop(0, '#ffe4cc');
				lg.addColorStop(0.32, '#ff3c5a');
				lg.addColorStop(1, '#9e0826');
			} else {
				lg.addColorStop(0, '#ff787c');
				lg.addColorStop(0.42, '#ec1638');
				lg.addColorStop(1, '#920822');
			}
			ctx.fillStyle = lg;
			ctx.fill();

			// the silk's details inside the clip: they do not wipe the outline
			ctx.save();
			wingPath(side);
			ctx.clip();

			// a clean cel highlight along the crest of the wing
			ctx.fillStyle = p > 0.4 ? 'rgba(255,244,232,.75)' : 'rgba(255,222,214,.68)';
			ctx.beginPath();
			ctx.ellipse(side * bw * 0.52, -bh * 0.44, bw * 0.38, bh * 0.16, side * 0.22, 0, CJ_TAU);
			ctx.fill();

			// the deep fold from the knot into the wing
			if (R >= 10) {
				ctx.strokeStyle = 'rgba(74,4,18,.62)';
				ctx.lineWidth = Math.max(1.0, R * 0.055);
				ctx.beginPath();
				ctx.moveTo(side * bw * 0.08, bh * 0.03);
				ctx.quadraticCurveTo(side * bw * 0.34, -bh * 0.06, side * bw * 0.52, bh * 0.02);
				ctx.stroke();

				// a thin warm reflected edge underneath
				ctx.strokeStyle = 'rgba(255,204,148,.42)';
				ctx.lineWidth = Math.max(0.75, R * 0.036);
				ctx.beginPath();
				ctx.moveTo(side * bw * 0.22, bh * 0.34);
				ctx.quadraticCurveTo(side * bw * 0.62, bh * 0.48, side * bw * 0.82, bh * 0.14);
				ctx.stroke();
			}
			ctx.restore();

			// the full crisp outline of the wing
			wingPath(side);
			strokeWithMode();
		}

		// 3. a compact gold knot at the waist (the wings 80% open)
		const kw = Math.max(1.9, R * 0.145);
		const kh = Math.max(2.4, R * 0.205);
		ctx.beginPath();
		ctx.roundRect(-kw, -kh + bh * 0.04, kw * 2, kh * 2, Math.min(kw, kh) * 0.72);
		const kg = ctx.createLinearGradient(-kw, -kh, kw, kh);
		kg.addColorStop(0, '#fff8cc');
		kg.addColorStop(0.48, '#ffd04c');
		kg.addColorStop(1, '#bd7214');
		ctx.fillStyle = kg;
		ctx.fill();
		strokeWithMode();

		// one small clean highlight on the gold knot
		ctx.fillStyle = '#ffffff';
		ctx.beginPath();
		ctx.arc(-kw * 0.32, -kh * 0.32 + bh * 0.04, Math.max(0.7, kw * 0.28), 0, CJ_TAU);
		ctx.fill();

		ctx.restore();
	}
	protected override drawWorn(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		this.drawBow(ctx, R, p);
		const blink = this.blink >= 0 ? Math.sin((this.blink / 0.13) * Math.PI) : 0;
		const squint = Math.max(blink, this.bitePulse * 0.76);
		drawGlowWedgeEye(ctx, R, p, {
			gazeX: this.gazeX,
			gazeY: this.gazeY,
			squint,
			inkRgb: CJ_JADE_INK,
			glowCoreRgb: [224, 255, 246],
			glowHaloRgb: [72, 252, 202],
			isMs: true
		});
	}
	protected override paintBallPattern(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		ctx.fillStyle = p > 0.4 ? '#18a882' : '#0e6e58';
		ctx.beginPath();
		ctx.arc(0, 0, R * 0.92, 0, CJ_TAU);
		ctx.fill();

		ctx.strokeStyle = p > 0.4 ? '#ffffff' : '#98ffe0';
		ctx.lineWidth = Math.max(1.4, R * 0.15);
		ctx.lineCap = 'round';
		for (let k = 0; k < 3; k++) {
			ctx.save();
			ctx.rotate((k * CJ_TAU) / 3);
			ctx.beginPath();
			for (let i = 0; i <= 14; i++) {
				const f = i / 14;
				const a = f * 2.1;
				const rad = R * (0.14 + 0.62 * f);
				if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
				else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
			}
			ctx.stroke();
			ctx.restore();
		}
		ctx.fillStyle = '#ffffff';
		ctx.beginPath();
		ctx.arc(0, 0, R * 0.18, 0, CJ_TAU);
		ctx.fill();
	}
	protected override particleFor(): ParticleKind {
		return 'jadeMote';
	}
	protected override swirlFor(): number {
		return 0.34;
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
		const isArc = (e.lane ?? 0) > Math.PI * 1.1;
		const ang = Math.atan2(e.vy, e.vx);
		const sz = Math.max(1.7, s * (e.hot ? 1.28 : 1.04));
		ctx.save();
		ctx.globalAlpha = a;
		ctx.translate(e.x, e.y);
		if (isArc) {
			ctx.rotate(ang);
			ctx.lineCap = 'round';
			if (e.hot) {
				ctx.strokeStyle = css(CJ_JADE_INK, 0.84);
				ctx.lineWidth = Math.max(2.0, sz * 0.58);
				ctx.beginPath();
				ctx.arc(0, sz * 0.65, sz * 1.3, -Math.PI * 0.74, -Math.PI * 0.26);
				ctx.stroke();
			}
			ctx.strokeStyle = e.hot ? '#e6fff8' : '#8effdc';
			ctx.lineWidth = Math.max(1.0, sz * 0.32);
			ctx.beginPath();
			ctx.arc(0, sz * 0.65, sz * 1.28, -Math.PI * 0.72, -Math.PI * 0.28);
			ctx.stroke();
		} else if (e.hot) {
			// an inverted obsidian-jade diamond in a glowing white-mint setting
			cjDiamond(ctx, 0, 0, sz * 0.65, sz * 1.08, e.spin * 0.32 * (e.max - e.life));
			ctx.fillStyle = '#04221e';
			ctx.fill();
			ctx.strokeStyle = '#d4fff4';
			ctx.lineWidth = Math.max(0.85, sz * 0.2);
			ctx.stroke();
		} else {
			ctx.globalCompositeOperation = 'lighter';
			const g = glow([96, 252, 206]);
			ctx.drawImage(g, -sz * 1.9, -sz * 1.9, sz * 3.8, sz * 3.8);
			ctx.globalCompositeOperation = 'source-over';
			cjDiamond(ctx, 0, 0, sz * 0.6, sz * 1.02, e.spin * 0.32 * (e.max - e.life));
			ctx.fillStyle = '#a8ffe4';
			ctx.fill();
			ctx.strokeStyle = 'rgba(10,42,38,.74)';
			ctx.lineWidth = Math.max(0.55, sz * 0.14);
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
			ctx.strokeStyle = `rgba(18,162,126,${(0.86 * a).toFixed(3)})`;
			ctx.lineWidth = R * 0.32 * a;
			ctx.beginPath();
			ctx.arc(0, 0, rad, 0, CJ_TAU);
			ctx.stroke();

			ctx.globalCompositeOperation = 'lighter';
			ctx.strokeStyle = `rgba(218,255,244,${(0.96 * a).toFixed(3)})`;
			ctx.lineWidth = Math.max(1.3, R * 0.14 * a);
			ctx.beginPath();
			ctx.arc(0, 0, rad * 0.94, 0, CJ_TAU);
			ctx.stroke();
			ctx.restore();
		}
	}
}
