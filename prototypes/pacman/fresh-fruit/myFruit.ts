// My own fruit heroes (prototype), drawn from nothing on the game's `Hero` for comparison with the
// owner's: an orange for Pac-Man and a watermelon for Ms. Pac-Man, a cut fruit whose bite is the
// mouth. Drawn the game's way (DESIGN.md §12): cel bands (base, shade crescent away from the light,
// a light band toward it), an ink line heavier on the shadow side, the key light upper left,
// rounded simple shapes that still read at 14 px. The orange: a dimpled peel, a pith ring, eight
// juicy segments with a glint each, a leaf on the nape, a determined brow over a big glossy eye.
// The watermelon: a striped rind, a pale band, ruby flesh with glossy seeds, a cream bow, lashes.
// The buff ("fresh ice"): the flesh keeps its colour; the peel or rind frosts, a dark teal and white
// rim closes the cut fruit, a few frost shards stand on its back, bubbles rise in the flesh, and the
// trail is the fizzy liquid ribbon the owner picked (a fixed length of about a tile and a third).
import {
	Hero,
	LIGHT,
	Spring,
	clamp01,
	css,
	mix,
	type HeroDesign,
	type MouthInside,
	type Palette,
	type ParticleKind
} from '../../../src/games/pacman/render/actors/hero/Hero';
import { Wake } from '../../../src/games/pacman/render/actors/hero/heroWake';

type RGB = [number, number, number];
type Ctx = CanvasRenderingContext2D;
type Shape = (c: Ctx, ox: number, oy: number, k: number) => void;
const TAU = Math.PI * 2;

/** The hero's size against the tile (+10%, the owner, 2026-11-27): a round body, the ice rim and the bow still inside the tile. */
export const MY_BODY_RATIO = 0.33;

const TEAL: RGB = [8, 52, 80];
const ICE_WHITE: RGB = [240, 255, 255];

interface Tones {
	readonly shade: RGB;
	readonly base: RGB;
	readonly light: RGB;
}

// ------------------------------------------------------------------------------- the toolkit

const ell =
	(cx: number, cy: number, rx: number, ry: number, rot = 0): Shape =>
	(c, ox, oy, k) => {
		c.moveTo(cx + ox + Math.cos(rot) * rx * k, cy + oy + Math.sin(rot) * rx * k);
		c.ellipse(cx + ox, cy + oy, Math.max(0.001, rx * k), Math.max(0.001, ry * k), rot, 0, TAU);
	};

/** A shape in cel bands: the base, a shade crescent on the side away from the light, a light band. */
function cel(
	c: Ctx,
	shape: Shape,
	t: Tones,
	L: { lx: number; ly: number },
	o: { sh?: number; lightK?: number; lightOff?: number; ink?: number; px?: number } = {}
): void {
	const sh = o.sh ?? 0.06;
	const lo = o.lightOff ?? 0.05;
	c.save();
	c.beginPath();
	shape(c, 0, 0, 1);
	c.fillStyle = css(t.base);
	c.fill();
	c.clip();
	c.beginPath();
	shape(c, 0, 0, 1);
	shape(c, L.lx * sh, L.ly * sh, 1);
	c.fillStyle = css(t.shade);
	c.fill('evenodd');
	c.beginPath();
	shape(c, L.lx * lo, L.ly * lo, o.lightK ?? 0.62);
	c.fillStyle = css(t.light);
	c.fill();
	c.restore();
	if (o.ink) {
		c.beginPath();
		shape(c, 0, 0, 1);
		c.strokeStyle = css([40, 14, 8]);
		c.lineWidth = Math.max(o.px ?? 0, o.ink);
		c.lineJoin = 'round';
		c.stroke();
	}
}

const pt = (r: number, a: number): [number, number] => [Math.cos(a) * r, Math.sin(a) * r];

/** A wedge of a disc between radii and angles, its outer corners rounded. */
function wedge(c: Ctx, a0: number, a1: number, r0: number, r1: number, cr: number): void {
	const ca = cr / r1;
	c.moveTo(...pt(r0, a0));
	c.lineTo(...pt(r1 - cr, a0));
	c.quadraticCurveTo(...pt(r1, a0), ...pt(r1, a0 + ca));
	c.arc(0, 0, r1, a0 + ca, a1 - ca);
	c.quadraticCurveTo(...pt(r1, a1), ...pt(r1 - cr, a1));
	c.lineTo(...pt(r0, a1));
	c.closePath();
}

function disc(c: Ctx, x: number, y: number, r: number, fill: string): void {
	c.beginPath();
	c.arc(x, y, Math.max(0.001, r), 0, TAU);
	c.fillStyle = fill;
	c.fill();
}

// -------------------------------------------------------------------------------- the base

interface Kit {
	/** The trail's colours: the edge, the core, the ice, the calm sheath, the buff sheath. */
	readonly edgeCalm: RGB;
	readonly sheathCalm: RGB;
	readonly core: RGB;
	readonly core2: RGB;
	readonly ice: RGB;
}

abstract class FruitBase extends Hero {
	protected wake = new Wake();
	protected blink = -1;
	private nextBlink = 2.6;
	private blinks = 0;
	protected squint = 0;
	/** The calm trail's loose juice drops and bubbles (the owner's calm trail, kept). */
	protected fizz: Array<{ x: number; y: number; vx: number; vy: number; ang: number; size: number; life: number; max: number; isBubble: boolean; alt: boolean }> = [];
	private fizzDist = 0;
	/** The hero's ending buff, for the ice rim's blink. */
	protected endingNow = false;
	protected sway = new Spring(0);
	protected abstract readonly kit: Kit;
	/** The owner's calm ribbon: an edge and a bright juice, in two tones each. */
	protected abstract readonly calm: { edge: [RGB, RGB]; core: [RGB, RGB]; drop: [string, string]; bubble: [string, string] };

	constructor() {
		super();
		// the base's embers and flames would crowd the fizzy ribbon (the base's own, private, so by the instance)
		const quiet = this as unknown as Record<string, unknown>;
		quiet.spawnStorm = () => undefined;
		quiet.spawnFlame = () => undefined;
	}
	protected particleFor(moment: 'trail' | 'burst' | 'death'): ParticleKind {
		return moment === 'trail' ? 'none' : 'spark';
	}

	/** The key light in the hero's frame (it stays put in the world as he turns). */
	protected lightLocal(): { lx: number; ly: number } {
		const ca = Math.cos(this.angle);
		const sa = Math.sin(this.angle);
		return { lx: LIGHT.x * ca + LIGHT.y * sa, ly: (-LIGHT.x * sa + LIGHT.y * ca) * this.flip };
	}

	/** No painted cavity: the cut shows the fruit's own wall (the lips). */
	protected drawInside(
		_ctx: Ctx,
		_R: number,
		_look: MouthInside,
		_mu: number,
		_md: number,
		_bend: number,
		_alpha: number
	): void {}

	update(dt: number, s: Parameters<Hero['update']>[1]): void {
		this.endingNow = s.ending;
		super.update(dt, s);
	}

	/** Loose juice: drops and bubbles shaken off the fruit (calm only; the buff's trail is the ribbon). */
	protected emitFizz(count: number, kick: boolean): void {
		if (this.power > 0.35) return;
		const R = this.r;
		const bx = -Math.cos(this.angle);
		const by = -Math.sin(this.angle);
		for (let i = 0; i < count; i++) {
			const lat = (this.random() - 0.5) * R * (kick ? 1.15 : 0.85);
			const spd = R * ((kick ? 2.1 : 1.1) + this.random() * 1.55);
			const life = 0.28 + this.random() * 0.2;
			this.fizz.push({
				x: this.x + bx * R * (0.5 + this.random() * 0.35) - by * lat,
				y: this.y + by * R * (0.5 + this.random() * 0.35) + bx * lat,
				vx: bx * spd - by * (this.random() - 0.5) * R * 0.85,
				vy: by * spd + bx * (this.random() - 0.5) * R * 0.85,
				ang: this.angle + Math.PI + (this.random() - 0.5) * 0.4,
				size: R * (0.19 + this.random() * 0.11),
				life,
				max: life,
				isBubble: this.random() < 0.25,
				alt: this.random() < 0.35
			});
		}
		if (this.fizz.length > 30) this.fizz.splice(0, this.fizz.length - 30);
	}

	protected afterUpdate(dt: number): void {
		this.wake.push(this.x, this.y, this.time, this.moving ? 1 : 0);
		if (this.moving) {
			this.fizzDist += this.r * 3.8 * dt;
			if (this.fizzDist >= this.r * 0.98) {
				this.fizzDist = 0;
				this.emitFizz(1, false);
			}
		}
		const drag = Math.pow(0.89, dt * 60);
		for (const f of this.fizz) {
			f.life -= dt;
			f.x += f.vx * dt;
			f.y += f.vy * dt;
			f.vx *= drag;
			f.vy *= drag;
		}
		this.fizz = this.fizz.filter((f) => f.life > 0);
		this.squint = Math.max(0, this.squint - dt / 0.26);
		this.sway.step(0.05 * Math.sin(this.time * 3) - 0.04 * (this.moving ? 1 : 0), dt, 120, 8.5);
		if (this.blink >= 0) {
			this.blink += dt;
			if (this.blink > 0.13) this.blink = -1;
		} else if (this.time > this.nextBlink) {
			this.blink = 0;
			this.blinks += 1;
			this.nextBlink = this.time + 2.6 + (this.blinks % 3) * 1.1;
		}
	}
	protected resetLooks(): void {
		this.wake.clear();
		this.fizz = [];
		this.sway.value = 0;
		this.sway.velocity = 0;
	}
	protected onBite(): void {
		this.emitFizz(2, true);
		this.squint = 1;
		this.sway.velocity += 4.5;
	}
	protected onTurn(): void {
		this.emitFizz(4, true);
		this.sway.velocity += (Math.random() < 0.5 ? 1 : -1) * 6;
	}

	draw(ctx: Ctx): void {
		this.drawTrail(ctx);
		super.draw(ctx);
	}

	/** A tight, faint glow: warm in calm, cold in the buff, never past 1.35 R. */
	protected drawAura(ctx: Ctx, R: number, p: number): void {
		ctx.save();
		const g = ctx.createRadialGradient(0, 0, R * 0.8, 0, 0, R * 1.35);
		g.addColorStop(0, css(mix([255, 190, 80], [150, 240, 255], p) as RGB, 0.12 + 0.1 * p));
		g.addColorStop(1, css([255, 190, 80], 0));
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(0, 0, R * 1.35, 0, TAU);
		ctx.fill();
		ctx.restore();
	}

	/**
	 * The ink line of the cut fruit, heavier on the shadow side; in the buff a dark teal edge and
	 * a white rim of ice take its place (the dark keeps it apart from a pale path and a green hedge),
	 * with a few frost shards on its back.
	 */
	protected drawSilhouetteOutline(
		ctx: Ctx,
		outline: (c: Ctx) => void,
		R: number,
		p: number,
		lx: number,
		ly: number
	): void {
		const ink: RGB = this.inkColor();
		// the buff running out: the ice rim blinks off and on
		if (this.endingNow && p > 0.4) p *= 0.3 + 0.7 * (0.5 + 0.5 * Math.cos(this.time * 10));
		ctx.save();
		ctx.lineJoin = 'round';
		ctx.lineCap = 'round';
		if (p < 0.98) {
			ctx.globalAlpha *= 1 - p;
			ctx.save();
			ctx.translate(-lx * R * 0.02, -ly * R * 0.02);
			outline(ctx);
			ctx.strokeStyle = css(ink);
			ctx.lineWidth = Math.max(2, R * 0.2);
			ctx.stroke();
			ctx.restore();
			ctx.globalAlpha /= Math.max(0.0001, 1 - p);
		}
		if (p > 0.04) {
			outline(ctx);
			ctx.strokeStyle = css(TEAL, 0.97 * p);
			ctx.lineWidth = Math.max(3.4, R * 0.28);
			ctx.stroke();
			ctx.strokeStyle = css(ICE_WHITE, p);
			ctx.lineWidth = Math.max(1.9, R * 0.12);
			ctx.stroke();
			if (R >= 11) this.frostShards(ctx, R, p);
		}
		ctx.restore();
	}
	protected abstract inkColor(): RGB;

	/** Four ice shards standing off the back of the fruit. */
	private frostShards(ctx: Ctx, R: number, p: number): void {
		const angles = [Math.PI * 0.78, Math.PI * 1.0, Math.PI * 1.22, Math.PI * 1.45];
		angles.forEach((a, i) => {
			const h = R * (0.17 + 0.05 * Math.sin(this.time * 5 + i * 1.7)) * p;
			const base = R * 1.02;
			const w = 0.1;
			ctx.beginPath();
			ctx.moveTo(Math.cos(a - w) * base, Math.sin(a - w) * base);
			ctx.lineTo(Math.cos(a) * (base + h), Math.sin(a) * (base + h));
			ctx.lineTo(Math.cos(a + w) * base, Math.sin(a + w) * base);
			ctx.closePath();
			ctx.fillStyle = i % 2 ? '#9af4ff' : '#ffffff';
			ctx.fill();
			ctx.strokeStyle = css(TEAL, 0.9);
			ctx.lineWidth = Math.max(0.8, R * 0.045);
			ctx.stroke();
		});
	}

	/** The cut's lip: a dark line under a light one (the fruit's wall), cold and white in the buff. */
	protected drawLips(ctx: Ctx, lips: () => void, R: number, pal: Palette): void {
		void pal;
		const p = this.power;
		const wall = this.wallColor();
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.strokeStyle = css(mix(this.inkColor(), TEAL, p) as RGB, 0.9);
		ctx.lineWidth = Math.max(2.1, R * 0.13);
		lips();
		ctx.stroke();
		ctx.strokeStyle = css(mix(wall, ICE_WHITE, p) as RGB, 0.96);
		ctx.lineWidth = Math.max(1.2, R * 0.065);
		lips();
		ctx.stroke();
	}
	protected abstract wallColor(): RGB;

	/** One big glossy eye: white with a shade, a pupil on the gaze, two glints, a lid on blinks. */
	protected paintEye(ctx: Ctx, x: number, y: number, r: number, p: number, lashes: boolean): void {
		const close = Math.max(this.blink >= 0 ? Math.sin((this.blink / 0.13) * Math.PI) : 0, this.squint * 0.75);
		ctx.save();
		ctx.translate(x, y);
		ctx.scale(1, 1 - 0.88 * close);
		const L = { lx: -0.55, ly: -0.83 };
		cel(
			ctx,
			ell(0, 0, r, r),
			{ shade: [206, 198, 186], base: mix([255, 252, 244], ICE_WHITE, p * 0.5) as RGB, light: [255, 255, 255] },
			L,
			{ sh: r * 0.2, lightK: 0.5, lightOff: r * 0.1, ink: Math.max(1.3, r * 0.26), px: 1 }
		);
		const gx = this.gazeX * r * 0.3;
		const gy = this.gazeY * r * 0.3;
		disc(ctx, gx, gy, r * 0.56, '#1c0e0a');
		disc(ctx, gx - r * 0.2, gy - r * 0.24, r * 0.22, '#ffffff');
		disc(ctx, gx + r * 0.2, gy + r * 0.18, r * 0.1, 'rgba(255,255,255,0.7)');
		if (p > 0.3) {
			ctx.beginPath();
			ctx.arc(gx, gy, r * 0.6, 0, TAU);
			ctx.strokeStyle = css([110, 230, 255], 0.8 * p);
			ctx.lineWidth = Math.max(0.8, r * 0.1);
			ctx.stroke();
		}
		if (lashes) {
			ctx.strokeStyle = css(this.inkColor());
			ctx.lineWidth = Math.max(1.1, r * 0.22);
			ctx.lineCap = 'round';
			for (const [a, len] of [
				[-0.45, 0.5],
				[-0.95, 0.55],
				[-1.5, 0.45]
			] as const) {
				ctx.beginPath();
				ctx.moveTo(Math.cos(a) * r * 0.96, Math.sin(a) * r * 0.96);
				ctx.lineTo(Math.cos(a - 0.12) * r * (0.96 + len), Math.sin(a - 0.12) * r * (0.96 + len));
				ctx.stroke();
			}
		}
		ctx.restore();
	}

	// ---------------------------------------------------------------------- the trail

	/**
	 * The owner's calm trail, kept as he drew it: a dark edge and a bright ribbon of juice swaying
	 * behind, and the drops and bubbles it sheds.
	 */
	private drawCalmTrail(ctx: Ctx): void {
		const R = this.r;
		const sway = (u: number) => Math.sin(u * 7 - this.time * 6.6) * R * 0.09 * Math.min(1, u * 3);
		const c = this.calm;
		this.wake.draw(ctx, this.time, {
			life: 0.42,
			width: R * 0.54,
			capHead: R * 0.4,
			capTail: R * 2.3,
			add: false,
			shift: sway,
			widen: (u) => 1 - u * 0.68,
			color: (u, a) => css(mix(c.edge[0], c.edge[1], u) as RGB, 0.84 * a * (1 - u * 0.86))
		});
		this.wake.draw(ctx, this.time, {
			life: 0.38,
			width: R * 0.34,
			capHead: R * 0.34,
			capTail: R * 2.0,
			add: false,
			shift: sway,
			widen: (u) => 1 - u * 0.72,
			color: (u, a) => css(mix(c.core[0], c.core[1], u) as RGB, 0.95 * a * (1 - u * 0.82))
		});
		for (const f of this.fizz) {
			const u = clamp01(f.life / f.max);
			const a = Math.min(1, (1 - u) * 6) * u;
			if (a <= 0.02) continue;
			ctx.save();
			ctx.globalAlpha = a;
			if (f.isBubble) {
				const br = Math.max(1.8, f.size * (0.62 + 0.58 * (1 - u)));
				ctx.beginPath();
				ctx.arc(f.x, f.y, br, 0, TAU);
				ctx.fillStyle = c.bubble[1];
				ctx.fill();
				ctx.strokeStyle = c.bubble[0];
				ctx.lineWidth = Math.max(0.85, br * 0.26);
				ctx.stroke();
				disc(ctx, f.x - br * 0.34, f.y - br * 0.34, Math.max(0.65, br * 0.28), '#ffffff');
			} else {
				const sz = Math.max(1.7, f.size * (0.5 + 0.5 * u));
				ctx.translate(f.x, f.y);
				ctx.rotate(f.ang);
				const len = sz * 1.25;
				const wid = sz * 0.66;
				ctx.beginPath();
				ctx.moveTo(len, 0);
				ctx.quadraticCurveTo(len * 0.16, -wid, -len * 0.52, -wid * 0.56);
				ctx.quadraticCurveTo(-len * 0.95, 0, -len * 0.52, wid * 0.56);
				ctx.quadraticCurveTo(len * 0.16, wid, len, 0);
				ctx.closePath();
				ctx.fillStyle = f.alt ? c.drop[0] : c.drop[1];
				ctx.fill();
				ctx.strokeStyle = css(this.inkColor(), 0.72);
				ctx.lineWidth = Math.max(0.6, sz * 0.15);
				ctx.stroke();
			}
			ctx.restore();
		}
	}

	/**
	 * The trail, one smooth liquid ribbon (the fizzy one, the owner's pick): a dark edge, a sheath,
	 * a warm core, a gloss line and a few fine bubbles rising inside it in the buff. Its length is fixed
	 * in tiles, not in time (a fast hero does not trail a snake) and it tapers to nothing; calm it
	 * is a short, warm ribbon without ice and bubbles.
	 */
	protected drawTrail(ctx: Ctx): void {
		const R = this.r;
		const p = this.power;
		if (!this.moving && p < 0.05) {
			// a stopped hero lets the ribbon shrink on its own (the wake does it)
		}
		const t = this.time;
		if (p < 0.35) {
			this.drawCalmTrail(ctx);
			return;
		}
		const raw = this.wake.points(t, { life: 0.5, width: R, capHead: R * 0.3, capTail: R * 1.5 })[0];
		if (!raw || raw.length < 5) return;
		const maxLen = R * (2.6 + 1.8 * p);
		const cut: Array<{ q: (typeof raw)[number]; s: number }> = [];
		let acc = 0;
		for (let i = 0; i < raw.length; i++) {
			if (i > 0) acc += Math.hypot(raw[i].x - raw[i - 1].x, raw[i].y - raw[i - 1].y);
			if (acc > maxLen) break;
			cut.push({ q: raw[i], s: acc });
		}
		if (cut.length < 5) return;
		const total = Math.max(1, cut[cut.length - 1].s);
		const wmax = R * (0.62 + 0.3 * p);
		const pts = cut.map(({ q, s }) => {
			const u = s / total;
			const ramp = Math.min(1, u * 5);
			const off = Math.sin(u * 6.5 - t * 7.5) * R * 0.09 * Math.min(1, u * 3);
			return {
				x: q.x + q.nx * off,
				y: q.y + q.ny * off,
				nx: q.nx,
				ny: q.ny,
				u,
				w: wmax * ramp * Math.pow(1 - u, 0.85) * (1 + 0.13 * Math.sin(u * 9 - t * 9) * ramp)
			};
		});
		const head = pts[0];
		const tail = pts[pts.length - 1];
		const edge = (f: number, side: number) =>
			pts.map((q) => ({ x: q.x + q.nx * q.w * f * side, y: q.y + q.ny * q.w * f * side }));
		const smoothTo = (list: Array<{ x: number; y: number }>) => {
			for (let i = 1; i < list.length - 1; i++) {
				ctx.quadraticCurveTo(list[i].x, list[i].y, (list[i].x + list[i + 1].x) / 2, (list[i].y + list[i + 1].y) / 2);
			}
			ctx.lineTo(list[list.length - 1].x, list[list.length - 1].y);
		};
		const ribbon = (f: number) => {
			const left = edge(f, 1);
			const right = edge(f, -1).reverse();
			ctx.beginPath();
			ctx.moveTo(left[0].x, left[0].y);
			smoothTo(left);
			ctx.lineTo(right[0].x, right[0].y);
			smoothTo(right);
			ctx.closePath();
		};
		const grad = (stops: Array<[number, RGB, number]>) => {
			const g = ctx.createLinearGradient(head.x, head.y, tail.x, tail.y);
			for (const [at, rgb, a] of stops) g.addColorStop(at, css(rgb, a));
			return g;
		};
		const k = this.kit;
		const edgeC = mix(k.edgeCalm, TEAL, p) as RGB;
		const sheathC = mix(k.sheathCalm, ICE_WHITE, p) as RGB;
		const fade = clamp01(0.35 + this.moving * 1 + p);
		ctx.save();
		ctx.lineJoin = 'round';
		ribbon(1.14);
		ctx.fillStyle = grad([[0, edgeC, 0], [0.1, edgeC, 0.85 * fade], [0.7, edgeC, 0.5 * fade], [1, edgeC, 0]]);
		ctx.fill();
		ribbon(1);
		ctx.fillStyle = grad([
			[0, sheathC, 0],
			[0.1, sheathC, (0.5 + 0.12 * p) * fade],
			[0.6, mix(k.sheathCalm, k.ice, p) as RGB, 0.4 * fade],
			[1, k.ice, 0]
		]);
		ctx.fill();
		ribbon(0.46 + 0.1 * (1 - p));
		ctx.fillStyle = grad([[0, k.core, 0], [0.1, k.core, 1 * fade], [0.6, k.core2, 0.9 * fade], [1, k.core2, 0]]);
		ctx.fill();
		// the gloss, on the side that faces the light
		const lit = pts.reduce((s2, q) => s2 + (q.nx * LIGHT.x + q.ny * LIGHT.y), 0) >= 0 ? 1 : -1;
		const gloss = edge(0.42, lit);
		ctx.beginPath();
		ctx.moveTo(gloss[1].x, gloss[1].y);
		for (let i = 2; i < Math.floor(gloss.length * 0.72); i++) ctx.lineTo(gloss[i].x, gloss[i].y);
		ctx.strokeStyle = css([255, 255, 255], 0.7 * fade);
		ctx.lineWidth = Math.max(1, R * 0.09);
		ctx.stroke();
		if (p > 0.3) {
			// fine bubbles inside the liquid, rising along it: the soda
			for (let n = 0; n < 4; n++) {
				const u = (n * 0.23 + t * 0.35) % 1;
				const q = pts[Math.min(pts.length - 1, Math.round(u * (pts.length - 1)))];
				if (q.w < R * 0.2) continue;
				const o = q.w * 0.5 * Math.sin(n * 2.1 + t * 3);
				ctx.beginPath();
				ctx.arc(q.x + q.nx * o, q.y + q.ny * o, Math.max(0.9, R * 0.1), 0, TAU);
				ctx.fillStyle = css([255, 255, 255], 0.55 * p * (1 - u));
				ctx.fill();
				ctx.strokeStyle = css([255, 255, 255], 0.9 * p * (1 - u));
				ctx.lineWidth = Math.max(0.6, R * 0.035);
				ctx.stroke();
			}
		}
		ctx.restore();
	}
}

// ------------------------------------------------------------------------------ the orange

const ORANGE = {
	peel: { shade: [206, 70, 4], base: [246, 122, 12], light: [255, 172, 46] } as Tones,
	pith: { shade: [234, 200, 146], base: [255, 238, 196], light: [255, 250, 226] } as Tones,
	seg: { shade: [236, 112, 8], base: [255, 154, 22], light: [255, 206, 82] } as Tones,
	leaf: { shade: [40, 104, 22], base: [84, 160, 36], light: [156, 218, 70] } as Tones,
	ink: [58, 20, 6] as RGB
};

const ORANGE_PAL: Palette = {
	light: [255, 206, 82],
	mid: [255, 154, 22],
	shadow: [236, 112, 8],
	deep: [160, 48, 6],
	bounce: [255, 200, 120],
	ink: ORANGE.ink,
	highlight: [255, 255, 255],
	rim: [255, 236, 190]
};
const ORANGE_DESIGN: HeroDesign = {
	id: 'mine-orange-v1',
	calm: ORANGE_PAL,
	awoken: { ...ORANGE_PAL, bounce: [150, 236, 255], rim: [232, 254, 255] },
	mouthSpan: 0.74,
	grinRest: 0.14,
	grinRun: 0.05,
	chompRate: 4.5,
	inside: { mid: [0, 0, 0], deep: [0, 0, 0] },
	hinge: 0.04,
	flare: [255, 196, 70],
	death: 'open',
	bands: [0.1, 0.34, 0.74]
};

export class MyOrange extends FruitBase {
	protected readonly design = ORANGE_DESIGN;
	protected readonly kit: Kit = {
		edgeCalm: [92, 36, 6],
		sheathCalm: [255, 208, 120],
		core: [255, 154, 22],
		core2: [240, 100, 10],
		ice: [70, 214, 248]
	};
	protected readonly calm = {
		edge: [[226, 76, 6], [156, 40, 4]] as [RGB, RGB],
		core: [[255, 212, 58], [255, 132, 14]] as [RGB, RGB],
		drop: ['#ffcf38', '#ff7c0c'] as [string, string],
		bubble: ['#fff4cc', 'rgba(255,214,72,.28)'] as [string, string]
	};
	protected inkColor(): RGB {
		return ORANGE.ink;
	}
	protected wallColor(): RGB {
		return [255, 240, 204];
	}

	/** The cut fruit: peel, pith, eight segments; the buff frosts the peel and bubbles rise in the flesh. */
	protected decorate(sc: Ctx, R: number, p: number): void {
		const L = this.lightLocal();
		const px = 1;
		cel(sc, ell(0, 0, R * 1.3, R * 1.3), ORANGE.peel, L, { sh: R * 0.1, lightK: 0.7, lightOff: R * 0.09 });
		// the dimpled peel: pores, a few lit, a few dark
		for (let i = 0; i < 22; i++) {
			const a = (i / 22) * TAU + Math.sin(i * 3.1) * 0.1;
			const r = R * (0.9 + 0.04 * Math.sin(i * 5.3));
			disc(sc, Math.cos(a) * r, Math.sin(a) * r, R * 0.022, i % 3 ? 'rgba(170,52,2,0.4)' : 'rgba(255,214,120,0.55)');
		}
		cel(sc, ell(0, 0, R * 0.8, R * 0.8), ORANGE.pith, L, { sh: R * 0.05, lightK: 0.8, lightOff: R * 0.04 });
		const rot = 0.2;
		for (let i = 0; i < 8; i++) {
			const mid = rot + (i + 0.5) * (TAU / 8);
			const half = TAU / 16 - 0.035;
			const shape: Shape = (c, ox, oy, k) => {
				c.save();
				c.translate(ox, oy);
				c.scale(k, k);
				wedge(c, mid - half, mid + half, R * 0.13, R * 0.7, R * 0.09);
				c.restore();
			};
			cel(sc, shape, ORANGE.seg, L, { sh: R * 0.05, lightK: 0.78, lightOff: R * 0.04 });
			// a glint on the lit outer rim of the segment, juice beads
			const face = Math.cos(mid) * L.lx + Math.sin(mid) * L.ly;
			if (face > 0.1) {
				sc.beginPath();
				sc.arc(0, 0, R * 0.6, mid - half * 0.7, mid + half * 0.2);
				sc.strokeStyle = `rgba(255,255,255,${(0.45 + 0.4 * face).toFixed(2)})`;
				sc.lineWidth = Math.max(1, R * 0.05);
				sc.lineCap = 'round';
				sc.stroke();
			}
			for (const [rr, da] of [
				[0.32, -0.04],
				[0.44, 0.06],
				[0.54, -0.02]
			] as const) disc(sc, Math.cos(mid + da) * R * rr, Math.sin(mid + da) * R * rr, R * 0.018, 'rgba(255,250,214,0.5)');
		}
		disc(sc, 0, 0, R * 0.1, css(ORANGE.pith.base));
		void px;
		if (p > 0.04) {
			// the buff: the peel frosts (pale, cold, speckled), the flesh keeps its colour
			sc.beginPath();
			sc.arc(0, 0, R * 0.94, 0, TAU);
			sc.strokeStyle = css([190, 246, 255], 0.3 * p);
			sc.lineWidth = R * 0.1;
			sc.stroke();
			for (let i = 0; i < 12; i++) {
				const a = (i / 12) * TAU + 0.3;
				disc(sc, Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9, R * 0.03, css([255, 255, 255], 0.85 * p));
			}
			for (let i = 0; i < 5; i++) {
				const u = (this.time * (0.5 + (i % 3) * 0.12) + i * 0.2) % 1;
				const a = rot + (i * 1.7 + 0.5);
				const rr = R * (0.2 + 0.4 * ((i * 0.37) % 1));
				const br = Math.max(0.9, R * 0.055 * Math.sin(u * Math.PI));
				sc.beginPath();
				sc.arc(Math.cos(a) * rr, Math.sin(a) * rr - u * R * 0.16, br, 0, TAU);
				sc.strokeStyle = css([255, 255, 255], 0.9 * p);
				sc.lineWidth = Math.max(0.6, br * 0.28);
				sc.stroke();
			}
		}
	}

	/** The leaf on the nape, the brow and the eye. */
	protected drawWorn(ctx: Ctx, R: number, p: number, lx: number, ly: number): void {
		const L = { lx, ly };
		// a small leaf and a stem nub on the nape, swaying a little
		ctx.save();
		ctx.translate(-R * 0.66, -R * 0.74);
		ctx.rotate(-2.55 + this.sway.value * 0.8);
		const leaf: Shape = (c, ox, oy, k) => {
			c.save();
			c.translate(ox, oy);
			c.scale(k, k);
			c.moveTo(0, 0);
			c.quadraticCurveTo(R * 0.2, -R * 0.28, R * 0.52, -R * 0.04);
			c.quadraticCurveTo(R * 0.24, R * 0.2, 0, 0);
			c.restore();
		};
		cel(ctx, leaf, ORANGE.leaf, L, { sh: R * 0.04, lightK: 0.6, lightOff: R * 0.03, ink: R < 12 ? Math.max(0.7, R * 0.045) : Math.max(1.2, R * 0.075), px: 0.6 });
		ctx.beginPath();
		ctx.moveTo(R * 0.04, -R * 0.02);
		ctx.quadraticCurveTo(R * 0.24, -R * 0.1, R * 0.44, -R * 0.04);
		ctx.strokeStyle = css(ORANGE.leaf.shade, 0.85);
		ctx.lineWidth = Math.max(0.8, R * 0.035);
		ctx.stroke();
		ctx.restore();
		const ex = R * 0.2;
		const ey = -R * 0.38;
		const er = R * 0.2;
		this.paintEye(ctx, ex, ey, er, p, false);
		// the brow: a determined slash above the eye, the inner end lower
		ctx.beginPath();
		ctx.moveTo(ex - er * 1.0, ey - er * 1.0);
		ctx.lineTo(ex + er * 1.15, ey - er * 1.5);
		ctx.strokeStyle = css(ORANGE.ink);
		ctx.lineWidth = R < 12 ? Math.max(1.1, R * 0.075) : Math.max(1.5, R * 0.1);
		ctx.lineCap = 'round';
		ctx.stroke();
	}

	/** The portal's ball: a whole orange with a leaf, turning with the roll. */
	protected paintBallPattern(ctx: Ctx, R: number, p: number): void {
		const g = ctx.createRadialGradient(-R * 0.3, -R * 0.34, R * 0.05, 0, 0, R);
		g.addColorStop(0, css([255, 190, 60]));
		g.addColorStop(0.55, css([246, 122, 12]));
		g.addColorStop(1, css([196, 62, 4]));
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(0, 0, R * 1.2, 0, TAU);
		ctx.fill();
		for (let i = 0; i < 18; i++) {
			const a = i * 2.4;
			const r = R * (0.2 + 0.7 * ((i * 0.37) % 1));
			disc(ctx, Math.cos(a) * r, Math.sin(a) * r, R * 0.03, 'rgba(160,48,2,0.35)');
		}
		ctx.beginPath();
		ctx.ellipse(R * 0.24, -R * 0.62, R * 0.26, R * 0.12, -0.7, 0, TAU);
		ctx.fillStyle = css(ORANGE.leaf.base);
		ctx.fill();
		ctx.strokeStyle = css(ORANGE.ink);
		ctx.lineWidth = Math.max(1, R * 0.06);
		ctx.stroke();
		if (p > 0.1) {
			ctx.beginPath();
			ctx.arc(0, 0, R * 0.9, 0, TAU);
			ctx.strokeStyle = css([200, 248, 255], 0.6 * p);
			ctx.lineWidth = R * 0.18;
			ctx.stroke();
		}
	}
}

// ---------------------------------------------------------------------------- the watermelon

const BOW_GOLD: Tones = { shade: [226, 140, 12], base: [255, 206, 52], light: [255, 242, 140] };
const BOW_GEM: Tones = { shade: [8, 104, 72], base: [38, 192, 128], light: [160, 255, 212] };

const MELON = {
	rind: { shade: [8, 62, 32], base: [24, 106, 50], light: [62, 160, 80] } as Tones,
	band: { shade: [186, 218, 164], base: [224, 244, 206], light: [246, 255, 236] } as Tones,
	flesh: { shade: [190, 22, 62], base: [238, 58, 94], light: [255, 116, 138] } as Tones,
	bow: { shade: [236, 192, 172], base: [255, 242, 224], light: [255, 255, 246] } as Tones,
	knot: { shade: [176, 30, 50], base: [240, 84, 92], light: [255, 148, 140] } as Tones,
	ink: [10, 44, 22] as RGB
};
const MELON_PAL: Palette = {
	light: [255, 116, 138],
	mid: [238, 58, 94],
	shadow: [190, 22, 62],
	deep: [120, 8, 40],
	bounce: [164, 254, 230],
	ink: MELON.ink,
	highlight: [255, 255, 255],
	rim: [232, 255, 224]
};
const MELON_DESIGN: HeroDesign = {
	id: 'mine-melon-v1',
	calm: MELON_PAL,
	awoken: { ...MELON_PAL, bounce: [164, 254, 255], rim: [212, 254, 255] },
	mouthSpan: 0.72,
	grinRest: 0.13,
	grinRun: 0.05,
	chompRate: 4.8,
	inside: { mid: [0, 0, 0], deep: [0, 0, 0] },
	hinge: 0.06,
	flare: [255, 96, 146],
	death: 'spin',
	bands: [0.1, 0.32, 0.74]
};

export class MyMelon extends FruitBase {
	protected readonly design = MELON_DESIGN;
	protected readonly kit: Kit = {
		edgeCalm: [6, 52, 28],
		sheathCalm: [150, 220, 150],
		core: [244, 70, 108],
		core2: [220, 34, 84],
		ice: [96, 240, 214]
	};
	protected readonly calm = {
		edge: [[24, 136, 56], [14, 78, 34]] as [RGB, RGB],
		core: [[255, 76, 118], [226, 22, 68]] as [RGB, RGB],
		drop: ['#ff9ab4', '#ff4a7c'] as [string, string],
		bubble: ['#ffe4ec', 'rgba(255,120,150,.28)'] as [string, string]
	};
	protected inkColor(): RGB {
		return MELON.ink;
	}
	protected wallColor(): RGB {
		return [236, 252, 220];
	}

	/** The cut fruit: a striped rind, a pale band, ruby flesh, glossy seeds; the buff frosts the rind. */
	protected decorate(sc: Ctx, R: number, p: number): void {
		const L = this.lightLocal();
		cel(sc, ell(0, 0, R * 1.3, R * 1.3), MELON.rind, L, { sh: R * 0.1, lightK: 0.7, lightOff: R * 0.09 });
		// the rind's stripes: pale green slivers running out from the band
		for (let i = 0; i < 15; i++) {
			const a = (i / 15) * TAU + 0.1;
			sc.beginPath();
			sc.moveTo(...pt(R * 0.82, a - 0.05));
			sc.quadraticCurveTo(...pt(R * 1.0, a + 0.05), ...pt(R * 1.3, a - 0.02));
			sc.lineTo(...pt(R * 1.3, a + 0.1));
			sc.quadraticCurveTo(...pt(R * 1.0, a + 0.16), ...pt(R * 0.82, a + 0.09));
			sc.closePath();
			sc.fillStyle = css([92, 176, 96], 0.8);
			sc.fill();
		}
		cel(sc, ell(0, 0, R * 0.84, R * 0.84), MELON.band, L, { sh: R * 0.05, lightK: 0.8, lightOff: R * 0.04 });
		cel(sc, ell(0, 0, R * 0.76, R * 0.76), MELON.flesh, L, { sh: R * 0.07, lightK: 0.6, lightOff: R * 0.08 });
		// a soft wet gloss on the lit side of the flesh
		sc.beginPath();
		sc.arc(0, 0, R * 0.6, Math.atan2(L.ly, L.lx) - 0.5, Math.atan2(L.ly, L.lx) + 0.18);
		sc.strokeStyle = 'rgba(255,255,255,0.45)';
		sc.lineWidth = Math.max(1, R * 0.05);
		sc.lineCap = 'round';
		sc.stroke();
		// the seeds: teardrops pointing to the heart, a glint on each
		const seed = (a: number, r: number, size: number) => {
			sc.save();
			sc.translate(Math.cos(a) * R * r, Math.sin(a) * R * r);
			sc.rotate(a + Math.PI);
			sc.beginPath();
			sc.moveTo(-size * 1.1, 0);
			sc.quadraticCurveTo(-size * 0.1, -size * 0.7, size * 0.9, -size * 0.45);
			sc.quadraticCurveTo(size * 1.25, 0, size * 0.9, size * 0.45);
			sc.quadraticCurveTo(-size * 0.1, size * 0.7, -size * 1.1, 0);
			sc.closePath();
			sc.fillStyle = css([28, 18, 18]);
			sc.fill();
			sc.beginPath();
			sc.arc(size * 0.2, -size * 0.22, size * 0.14, 0, TAU);
			sc.fillStyle = 'rgba(255,255,255,0.8)';
			sc.fill();
			sc.restore();
		};
		for (let i = 0; i < 8; i++) seed((i / 8) * TAU + 0.3, 0.46, R * 0.1);
		for (let i = 0; i < 4; i++) seed((i / 4) * TAU + 0.9, 0.2, R * 0.075);
		if (p > 0.04) {
			sc.beginPath();
			sc.arc(0, 0, R * 0.95, 0, TAU);
			sc.strokeStyle = css([176, 250, 238], 0.32 * p);
			sc.lineWidth = R * 0.11;
			sc.stroke();
			for (let i = 0; i < 12; i++) {
				const a = (i / 12) * TAU + 0.45;
				disc(sc, Math.cos(a) * R * 0.92, Math.sin(a) * R * 0.92, R * 0.03, css([255, 255, 255], 0.85 * p));
			}
			for (let i = 0; i < 5; i++) {
				const u = (this.time * (0.5 + (i % 3) * 0.12) + i * 0.2) % 1;
				const a = i * 1.9 + 0.4;
				const rr = R * (0.18 + 0.38 * ((i * 0.41) % 1));
				const br = Math.max(0.9, R * 0.055 * Math.sin(u * Math.PI));
				sc.beginPath();
				sc.arc(Math.cos(a) * rr, Math.sin(a) * rr - u * R * 0.16, br, 0, TAU);
				sc.strokeStyle = css([255, 255, 255], 0.9 * p);
				sc.lineWidth = Math.max(0.6, br * 0.28);
				sc.stroke();
			}
		}
	}

	/** The bow on the nape (it sways), the lashes and the eye. */
	protected drawWorn(ctx: Ctx, R: number, p: number, lx: number, ly: number): void {
		// the bow: sunny gold ribbon in two teardrop loops and two notched tails, a green gem for a
		// knot, worn on the nape with the loops along the rim (it sways and frosts in the buff)
		const phi = -0.22 + this.sway.value * 0.6;
		const L = {
			lx: lx * Math.cos(-phi) - ly * Math.sin(-phi),
			ly: lx * Math.sin(-phi) + ly * Math.cos(-phi)
		};
		const small = R < 12;
		const ink = small ? Math.max(0.7, R * 0.045) : Math.max(1.2, R * 0.065);
		const frostTo = (t: Tones, k: number): Tones => ({
			shade: mix(t.shade, [96, 150, 196], k) as RGB,
			base: mix(t.base, [206, 236, 255], k) as RGB,
			light: mix(t.light, [255, 255, 255], k) as RGB
		});
		const gold = frostTo(BOW_GOLD, p * 0.3);
		ctx.save();
		ctx.translate(-R * 0.2, -R * 0.88);
		ctx.rotate(phi);
		const f = 1.32;
		const loop = (side: number): Shape => (c, ox, oy, k) => {
			c.save();
			c.translate(ox, oy);
			c.scale(side * k, k);
			c.moveTo(0, 0);
			c.bezierCurveTo(R * 0.08 * f, -R * 0.3 * f, R * 0.52 * f, -R * 0.36 * f, R * 0.58 * f, -R * 0.05 * f);
			c.bezierCurveTo(R * 0.6 * f, R * 0.28 * f, R * 0.16 * f, R * 0.22 * f, 0, 0);
			c.restore();
		};
		// the tails first, falling back along the rim, the V cut in their ends
		const back = Math.PI / 2;
		for (const fan of [-0.32, 0.32]) {
			const tail: Shape = (c, ox, oy, k) => {
				c.save();
				c.translate(ox, oy);
				c.scale(k, k);
				c.rotate(back + fan);
				c.moveTo(0, -R * 0.05);
				c.lineTo(R * 0.4, -R * 0.09);
				c.lineTo(R * 0.32, 0);
				c.lineTo(R * 0.4, R * 0.09);
				c.lineTo(0, R * 0.05);
				c.closePath();
				c.restore();
			};
			cel(ctx, tail, gold, L, { sh: R * 0.03, lightK: 0.6, lightOff: R * 0.02, ink, px: 0.6 });
		}
		for (const side of [-1, 1]) {
			cel(ctx, loop(side), gold, L, { sh: R * 0.05, lightK: 0.62, lightOff: R * 0.04, ink, px: 0.6 });
			// the fold of the ribbon inside the loop, and a glint on its crown
			ctx.beginPath();
			ctx.moveTo(side * R * 0.08, -R * 0.02);
			ctx.quadraticCurveTo(side * R * 0.3 * f, -R * 0.16 * f, side * R * 0.46 * f, -R * 0.06 * f);
			ctx.strokeStyle = css(gold.shade, 0.85);
			ctx.lineWidth = Math.max(0.7, R * 0.035);
			ctx.lineCap = 'round';
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(side * R * 0.3 * f, -R * 0.27 * f);
			ctx.quadraticCurveTo(side * R * 0.44 * f, -R * 0.28 * f, side * R * 0.5 * f, -R * 0.2 * f);
			ctx.strokeStyle = 'rgba(255,255,255,0.8)';
			ctx.lineWidth = Math.max(0.8, R * 0.045);
			ctx.stroke();
		}
		// the gem: a cut diamond, a glint
		const gem: Shape = (c, ox, oy, k) => {
			c.save();
			c.translate(ox, oy);
			c.scale(k, k);
			c.moveTo(0, -R * 0.19);
			c.lineTo(R * 0.16, 0);
			c.lineTo(0, R * 0.19);
			c.lineTo(-R * 0.16, 0);
			c.closePath();
			c.restore();
		};
		cel(ctx, gem, BOW_GEM, L, { sh: R * 0.03, lightK: 0.55, lightOff: R * 0.025, ink, px: 0.6 });
		disc(ctx, -R * 0.04, -R * 0.05, R * 0.03, 'rgba(255,255,255,0.9)');
		ctx.restore();
		const ex = R * 0.2;
		const ey = -R * 0.37;
		this.paintEye(ctx, ex, ey, R * 0.2, p, true);
	}

	/** The portal's ball: a whole striped watermelon, turning with the roll. */
	protected paintBallPattern(ctx: Ctx, R: number, p: number): void {
		const g = ctx.createRadialGradient(-R * 0.3, -R * 0.34, R * 0.05, 0, 0, R);
		g.addColorStop(0, css([92, 176, 96]));
		g.addColorStop(0.55, css([32, 122, 58]));
		g.addColorStop(1, css([10, 62, 30]));
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(0, 0, R * 1.2, 0, TAU);
		ctx.fill();
		ctx.lineCap = 'round';
		for (let i = 0; i < 6; i++) {
			const x = (i - 2.5) * R * 0.36;
			ctx.beginPath();
			ctx.moveTo(x * 0.6, -R * 1.1);
			ctx.quadraticCurveTo(x * 1.5, 0, x * 0.6, R * 1.1);
			ctx.strokeStyle = css([14, 74, 36], 0.7);
			ctx.lineWidth = R * 0.14;
			ctx.stroke();
		}
		if (p > 0.1) {
			ctx.beginPath();
			ctx.arc(0, 0, R * 0.9, 0, TAU);
			ctx.strokeStyle = css([190, 250, 240], 0.6 * p);
			ctx.lineWidth = R * 0.18;
			ctx.stroke();
		}
	}
}
