// The heroes: Pac-Man and Ms. Pac-Man share one machinery, in the owner's anime look (cel
// shading, ink); each gives its own design (palettes, jaws, rhythm, the mouth's inside, death)
// and hooks for what is only theirs (his ki flames; her eye, bow, lipstick and twinkles). The
// shared machinery:
// - a cel body baked per light direction, look and season (hard tone bands, a pale zone and a
//   hard highlight, a bounce light, the season's rim light on the nape) under a key light
//   fixed in the world; a thin ink line, heavier on the shadow side; the mouth cut in a small
//   scratch canvas, a painted cavity with a tongue behind it;
// - acting: curved lips with a grin, a fast open and a biting close, breathing and the odd
//   snap at rest; the body stays round, its size on a spring (a punch on every bite, a
//   crouch before the burst and an overshoot after it);
// - the energizer as a beat: wind-up, burst (a white flash of the silhouette, a ring and
//   impact rays), the new look, cooling down slowly as the power ends;
// - the trail: a stream of the season's own particles shed along his path (fire when
//   powered), each one lying where it was dropped, so a turn bends it; a death of its own.
// Frame space: the hero faces +x, the top is -y, units are body radii.
import { SEASON_LOOKS } from './heroSeasons';
import type { HeroSeason, RGB } from './heroSeasons';

interface Pt {
	readonly x: number;
	readonly y: number;
}

export interface HeroState {
	/** Centre, css px. */
	readonly x: number;
	readonly y: number;
	/** Heading, radians (0 = right). */
	readonly angle: number;
	readonly moving: boolean;
	readonly power: boolean;
	/** The power is running out. */
	readonly ending: boolean;
	/** He was caught: the death plays once, from when this turns true. */
	readonly dying?: boolean;
	/** The world he is in: its colour touches his rim light, trail and particles. */
	readonly season?: HeroSeason;
}

export interface Palette {
	readonly light: RGB;
	readonly mid: RGB;
	readonly shadow: RGB;
	readonly deep: RGB;
	readonly bounce: RGB;
	readonly ink: RGB;
	readonly highlight: RGB;
	readonly rim: RGB;
}

export const mix = (a: RGB, b: RGB, k: number): RGB => [
	a[0] + (b[0] - a[0]) * k,
	a[1] + (b[1] - a[1]) * k,
	a[2] + (b[2] - a[2]) * k
];
export const css = (c: RGB, a = 1): string =>
	`rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
export const easeOut = (t: number): number => 1 - Math.pow(1 - clamp01(t), 3);
export const easeIn = (t: number): number => Math.pow(clamp01(t), 3);

/** The key light, fixed in the world: from the upper left. */
const LIGHT = (() => {
	const n = Math.hypot(-0.55, -0.83);
	return { x: -0.55 / n, y: -0.83 / n };
})();

/** Longest integration step of a Spring, seconds (stable for its stiffness). */
const SPRING_STEP = 1 / 120;

/** A damped spring towards a target: overshoot and settle. */
export class Spring {
	value: number;
	velocity = 0;
	constructor(value: number) {
		this.value = value;
	}
	/**
	 * Semi-implicit Euler in sub-steps of at most SPRING_STEP: one long frame (a hitch, or
	 * the first frame after the hero was not drawn for a while) must not blow it up.
	 */
	step(target: number, dt: number, stiffness = 260, damping = 16): void {
		const n = Math.max(1, Math.ceil(dt / SPRING_STEP));
		const h = dt / n;
		for (let i = 0; i < n; i++) {
			const a = (target - this.value) * stiffness - this.velocity * damping;
			this.velocity += a * h;
			this.value += this.velocity * h;
		}
	}
}

const glowCache = new Map<string, HTMLCanvasElement>();
export function glow(c: RGB): HTMLCanvasElement {
	const key = c.join(',');
	let g = glowCache.get(key);
	if (!g) {
		g = document.createElement('canvas');
		g.width = g.height = 64;
		const x = g.getContext('2d') as CanvasRenderingContext2D;
		const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
		gr.addColorStop(0, css(c, 1));
		gr.addColorStop(0.3, css(c, 0.5));
		gr.addColorStop(1, css(c, 0));
		x.fillStyle = gr;
		x.fillRect(0, 0, 64, 64);
		glowCache.set(key, g);
	}
	return g;
}

/** The painted disc spans ±DISC_SPAN body radii (room for the ink-free soft edge). */
const DISC_SPAN = 1.15;
const LIGHT_STEPS = 32;
const POWER_STEPS = 6;
const discCache = new Map<string, HTMLCanvasElement>();

/**
 * The body's painting for a body radius in device px, the light's angle in his frame, the
 * look and the season, cached by quantised light, look and season: drawn once, reused
 * every frame.
 */
function bodyDisc(
	design: HeroDesign,
	deviceR: number,
	lightAngle: number,
	power: number,
	season: HeroSeason
): HTMLCanvasElement {
	const R = Math.max(4, Math.round(deviceR));
	const step = Math.round((((lightAngle / (Math.PI * 2)) % 1) + 1) * LIGHT_STEPS) % LIGHT_STEPS;
	const look = Math.round(clamp01(power) * POWER_STEPS);
	const key = `${design.id}:${R}:${step}:${look}:${season}`;
	let c = discCache.get(key);
	if (c) return c;
	if (discCache.size > 600) discCache.clear();
	const a = (step / LIGHT_STEPS) * Math.PI * 2;
	const lx = Math.cos(a);
	const ly = Math.sin(a);
	c = celDisc(design, R, lx, ly, a, look / POWER_STEPS, season);
	discCache.set(key, c);
	return c;
}

/**
 * The cel body (the owner's anime mock-ups): hard tone bands that are crescents away from the
 * light (the lit tone, the mid tone, the shadow, a warm bounce light along the far edge), a pale
 * zone and a hard white highlight where the light hits, and a rim light on the nape in the
 * season's colour. Painted once per light, look and season, like the other discs.
 */
function celDisc(
	design: HeroDesign,
	R: number,
	lx: number,
	ly: number,
	lightAngle: number,
	p: number,
	season: HeroSeason
): HTMLCanvasElement {
	const pal = mixPal(design.calm, design.awoken, p);
	const c = document.createElement('canvas');
	c.width = c.height = Math.ceil(R * DISC_SPAN * 2);
	const ctx = c.getContext('2d') as CanvasRenderingContext2D;
	ctx.translate(c.width / 2, c.height / 2);
	ctx.beginPath();
	ctx.arc(0, 0, R, 0, Math.PI * 2);
	ctx.clip();
	// bands: the lit tone is the biggest; each darker tone is what a disc shifted towards the
	// light leaves uncovered on the far side
	const band = (colour: RGB, d: number) => {
		ctx.fillStyle = css(colour);
		ctx.beginPath();
		ctx.arc(lx * R * d, ly * R * d, R * 1.02, 0, Math.PI * 2);
		ctx.fill();
	};
	ctx.fillStyle = css(pal.bounce);
	ctx.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);
	band(pal.shadow, 0.12);
	band(pal.mid, 0.42);
	band(pal.light, 0.92);
	// the pale zone and the hard highlight
	const hx = lx * R * 0.56;
	const hy = ly * R * 0.56;
	const tangent = lightAngle + Math.PI / 2;
	ctx.fillStyle = css(mix(pal.light, pal.highlight, 0.55), 0.8);
	ctx.beginPath();
	ctx.ellipse(hx, hy, R * 0.46, R * 0.3, tangent, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = css(pal.highlight);
	ctx.beginPath();
	ctx.ellipse(hx + lx * R * 0.06, hy + ly * R * 0.06, R * 0.2, R * 0.09, tangent, 0, Math.PI * 2);
	ctx.fill();
	ctx.beginPath();
	ctx.arc(
		hx + lx * R * 0.08 - ly * R * 0.26,
		hy + ly * R * 0.08 + lx * R * 0.26,
		R * 0.045,
		0,
		Math.PI * 2
	);
	ctx.fill();
	// the season's rim light along the nape (the frame's -x)
	ctx.fillStyle = css(SEASON_LOOKS[season].rim, 0.95);
	ctx.beginPath();
	ctx.arc(0, 0, R * 1.05, 0, Math.PI * 2);
	ctx.arc(R * 0.075, 0, R * 1.0, 0, Math.PI * 2);
	ctx.fill('evenodd');
	return c;
}

/** The painted inside of the mouth. */
export interface MouthInside {
	readonly mid: RGB;
	readonly deep: RGB;
	readonly tongue: RGB;
	readonly tongueLight: RGB;
}

/** What each hero brings: looks, jaws, rhythm, the light in the mouth, trail and death. */
export interface HeroDesign {
	/** Key of the baked discs. */
	readonly id: string;
	readonly calm: Palette;
	readonly awoken: Palette;
	/** Mouth half-angle, radians, per unit of opening. */
	readonly mouthSpan: number;
	/** The jaw drops more than the lid: at rest and running. */
	readonly grinRest: number;
	readonly grinRun: number;
	/** Chomps per second. */
	readonly chompRate: number;
	/** The inside of the mouth, painted: a dark cavity and a tongue. */
	readonly inside: MouthInside;
	/** Where the mouth's hinge sits on the body's axis, body radii (default -0.1). */
	readonly hinge?: number;
	/** The colour of the burst's ring and the last flare of a death. */
	readonly flare: RGB;
	/** 'open': the mouth opens all the way round; 'spin': she spins away. */
	readonly death: 'open' | 'spin';
}

export type ParticleKind =
	'ember' | 'star' | 'heart' | 'dust' | 'petal' | 'spark' | 'leaf' | 'flake' | 'flame' | 'none';

export interface Particle {
	kind: ParticleKind;
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	max: number;
	size: number;
	hot: boolean;
	spin: number;
	/** A trail piece: its direction (it stays where it was born), its size and its variant. */
	len?: number;
	ang?: number;
	lane?: number;
}

interface Burst {
	t: number;
	x: number;
	y: number;
	angle: number;
}

/** Death: a hit (0..0.3), the dying move (to 1.3), then a burst of particles and a flare. */
const DEATH_OPEN = 0.3;
const DEATH_POP = 1.3;
const DEATH_END = 1.75;
const CHARGE = 0.18;

export abstract class Hero {
	/** What this hero brings: looks, jaws, rhythm, the mouth's inside, death. */
	protected abstract readonly design: HeroDesign;
	protected r = 20;
	protected x = 0;
	protected y = 0;
	protected angle = 0;
	protected flip = 1;
	private lastH = 1;
	protected moving = false;
	/** Distance run since the last flame and the last trail particle were dropped. */
	private flameDist = 0;
	private stormDist = 0;
	protected time = 0;
	protected season: HeroSeason = 'summer';
	/** The awoken look, 0..1. */
	protected power = 0;
	private powerOn = false;
	private ending = false;
	/** Seconds since the energizer was taken (the wind-up and burst), or -1. */
	private transform = -1;
	/** Seconds into the death, or -1. */
	protected dying = -1;
	private chomp = 0;
	private bite = -1;
	private snap = -1;
	private nextSnap = 2.4;
	private snaps = 0;
	/**
	 * His size on a spring: he always stays round (a stretched ellipse looks inorganic in
	 * motion, the owner's review); bites, the wind-up and the burst pulse the whole body.
	 */
	protected readonly size = new Spring(1);
	private flash = 0;
	/** Curled up into a rolling ball (at a tunnel), and how far the ball has rolled, radians. */
	private ballOn = false;
	private roll = 0;
	private mouthFlash = 0;
	private embers: Particle[] = [];
	private bursts: Burst[] = [];
	private seed = 11;

	setRadius(r: number): void {
		this.r = r;
	}

	/** The particles alive now (the trail, bursts): for the dev tools and the tests. */
	get particles(): readonly Particle[] {
		return this.embers;
	}

	reset(): void {
		this.embers = [];
		this.flameDist = 0;
		this.stormDist = 0;
		this.bursts = [];
		this.power = 0;
		this.powerOn = false;
		this.transform = -1;
		this.resetLooks?.();
	}

	/** mulberry32: a small seeded generator whose consecutive draws are not correlated. */
	protected random(): number {
		this.seed = (this.seed + 0x6d2b79f5) >>> 0;
		let t = this.seed;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	}

	/**
	 * Curls him into a ball that rolls, or opens him back up (a flash and a pop of the spring
	 * hide the change). The ball is each hero's own (`paintBallPattern`, `paintBallOrbit`).
	 */
	setBall(on: boolean): void {
		if (on === this.ballOn) return;
		this.ballOn = on;
		this.flash = 0.8;
		this.size.value = 0.82;
		this.size.velocity += on ? 4 : 7;
		for (let i = 0; i < 10; i++) {
			this.spawn(
				this.particleFor?.('burst') ?? 'ember',
				true,
				(i / 10) * Math.PI * 2,
				4 + this.random() * 5
			);
		}
	}

	get ball(): boolean {
		return this.ballOn;
	}

	/** A dot: just a small glow at the lips (the run's chomp already bites). */
	gulp(): void {
		this.mouthFlash = Math.max(this.mouthFlash, 0.3);
	}

	/** Something worth a real bite: a quick wind-up, a snapping close, a punch of the body. */
	eat(): void {
		this.bite = 0;
		this.onBite?.();
	}

	update(dt: number, s: HeroState): void {
		if (!Number.isFinite(dt) || dt < 0) dt = 0;
		this.time += dt;
		if (s.season) this.season = s.season;
		if (s.dying) {
			this.ballOn = false;
			if (this.dying < 0) {
				this.dying = 0;
				this.flash = 0.8;
				this.bite = -1;
			}
			const before = this.dying;
			this.dying += dt;
			if (before < DEATH_POP && this.dying >= DEATH_POP) {
				for (let i = 0; i < 26; i++) {
					this.spawn(
						this.particleFor?.('death') ?? 'ember',
						this.power > 0.5,
						(i / 26) * Math.PI * 2,
						4 + this.random() * 7
					);
				}
			}
			this.size.step(1, dt);
			this.flash = Math.max(0, this.flash - dt / 0.3);
			this.tick(dt);
			return;
		}
		if (this.dying >= 0) {
			this.reset();
			this.dying = -1;
		}
		const dx = s.x - this.x;
		const dy = s.y - this.y;
		const step = Math.hypot(dx, dy);
		this.x = s.x;
		this.y = s.y;
		// a ball rolls by what it travels: right and down turn it one way, left and up the other
		if (step < this.r * 3) {
			const sign = Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) : Math.sign(dy);
			this.roll += (step / Math.max(1, this.r)) * sign;
		}
		let turn = Math.abs(s.angle - this.angle) % (Math.PI * 2);
		if (turn > Math.PI) turn = Math.PI * 2 - turn;
		if (turn > 0.6) this.onTurn?.();
		this.angle = s.angle;
		this.moving = s.moving;
		this.ending = s.ending;
		if (Math.abs(Math.cos(s.angle)) > 0.5) this.lastH = Math.cos(s.angle) > 0 ? 1 : -1;
		const vertical = Math.abs(Math.sin(s.angle)) > 0.5;
		this.flip = (vertical ? this.lastH : Math.cos(s.angle) > 0 ? 1 : -1) < 0 ? -1 : 1;

		// the energizer: wind-up, burst, then the look eases in; easing out slowly at the end
		if (s.power && !this.powerOn) this.transform = 0;
		this.powerOn = s.power;
		// at rest he breathes; running he keeps his size
		let sizeTarget = this.moving ? 1 : 1 + 0.015 * Math.sin(this.time * 2.3);
		if (this.transform >= 0) {
			const before = this.transform;
			this.transform += dt;
			if (this.transform < CHARGE) {
				sizeTarget = 0.88;
			} else if (before < CHARGE) {
				this.flash = 1;
				this.size.velocity += 5;
				this.bursts.push({ t: 0, x: this.x, y: this.y, angle: this.angle });
				for (let i = 0; i < 18; i++)
					this.spawn(
						this.particleFor?.('burst') ?? 'ember',
						true,
						(i / 18) * Math.PI * 2,
						7 + this.random() * 6
					);
			}
			if (this.transform > 1.2) this.transform = -1;
		}
		const awake = this.powerOn && (this.transform < 0 || this.transform >= CHARGE);
		const rate = awake ? 1 / 0.3 : 1 / 0.7;
		this.power +=
			Math.sign((awake ? 1 : 0) - this.power) *
			Math.min(Math.abs((awake ? 1 : 0) - this.power), dt * rate);

		// the jaws
		if (this.moving) {
			const before = this.chomp % 1;
			this.chomp += dt * this.design.chompRate * (1 + 0.25 * this.power);
			const after = this.chomp % 1;
			// the bite closes at 0.75 of the cycle: a little punch, felt more than seen
			if (before < 0.75 && after >= 0.75) {
				this.size.velocity -= 0.5;
			}
		} else if (this.snap < 0 && this.bite < 0 && this.time > this.nextSnap) {
			this.snap = 0;
			this.snaps += 1;
			this.nextSnap = this.time + 2.2 + (this.snaps % 3) * 0.9;
		}
		if (this.snap >= 0) {
			this.snap += dt;
			if (this.snap > 0.34) this.snap = -1;
		}
		if (this.bite >= 0) {
			const before = this.bite;
			this.bite += dt;
			if (before < 0.12 && this.bite >= 0.12) {
				this.size.velocity -= 2.2;
				this.mouthFlash = 1;
			}
			if (this.bite > 0.26) this.bite = -1;
		}
		this.size.step(sizeTarget, dt);
		this.flash = Math.max(0, this.flash - dt / 0.16);
		this.mouthFlash = Math.max(0, this.mouthFlash - dt / 0.2);

		const r = this.r;
		this.afterUpdate?.(dt);
		// the trail: a stream of the season's own particles shed along his path (they flutter,
		// tumble and sparkle where they were dropped, so a turn bends the trail), and drops of
		// fire while he is powered
		if (step < r * 3 && step > r * 0.01) {
			const hot = this.power > 0.5;
			const ux = dx / step;
			const uy = dy / step;
			this.stormDist += step;
			const gap = r * (this.ballOn ? 0.14 : hot ? 0.2 : 0.3);
			while (this.stormDist >= gap) {
				this.stormDist -= gap;
				this.spawnStorm(ux, uy, hot || this.ballOn);
			}
			if (hot) {
				this.flameDist += step;
				while (this.flameDist >= r * 0.5) {
					this.flameDist -= r * 0.5;
					this.spawnFlame(ux, uy);
				}
			}
		}
		this.tick(dt);
	}

	/** Embers drift up and fade; bursts run their course. */
	private tick(dt: number): void {
		const r = this.r;
		for (const e of this.embers) {
			e.life -= dt;
			e.x += e.vx * dt;
			e.y += e.vy * dt;
			// the trail's particles flutter: a sideways push that swings with their age
			const swirl =
				e.ang !== undefined && e.lane !== undefined ? (this.swirlFor?.(e.kind) ?? 0) : 0;
			if (swirl > 0) {
				const push = Math.sin((e.max - e.life) * 9 + (e.lane ?? 0)) * swirl * r;
				e.vx += -Math.sin(e.ang ?? 0) * push * dt;
				e.vy += Math.cos(e.ang ?? 0) * push * dt;
			}
			const drag = Math.pow(0.9, dt * 60);
			e.vx *= drag;
			e.vy = e.vy * drag - r * (this.liftFor?.(e.kind) ?? 0.8) * dt;
		}
		this.embers = this.embers.filter((e) => e.life > 0);
		for (const b of this.bursts) b.t += dt;
		this.bursts = this.bursts.filter((b) => b.t < 0.5);
	}

	/** One particle of the trail: dropped behind him with a kick back, then it flutters on. */
	private spawnStorm(ux: number, uy: number, hot: boolean): void {
		const kind = this.particleFor?.('trail') ?? 'ember';
		if (kind === 'none') return;
		const r = this.r;
		const lateral = (this.random() - 0.5) * r;
		const back = (1 + this.random() * 2) * r;
		const side = (this.random() - 0.5) * 1.6 * r;
		const life = (0.5 + this.random() * 0.3) * (hot ? 0.9 : 1);
		this.embers.push({
			kind,
			x: this.x - ux * r * 0.7 - uy * lateral,
			y: this.y - uy * r * 0.7 + ux * lateral,
			vx: -ux * back - uy * side,
			vy: -uy * back + ux * side,
			life,
			max: life,
			size: r * (0.07 + this.random() * 0.05) * (this.sizeFor?.(kind) ?? 1),
			hot,
			spin: (this.random() - 0.5) * 8,
			ang: Math.atan2(uy, ux),
			lane: this.random() * Math.PI * 2
		});
	}

	/** A drop of fire off his back while powered: a pointed teardrop streaming backwards. */
	private spawnFlame(ux: number, uy: number): void {
		const r = this.r;
		const spread = (this.random() - 0.5) * 1.0 * r;
		const life = 0.24 + this.random() * 0.1;
		this.embers.push({
			kind: 'flame',
			x: this.x - ux * r * 0.8 - uy * spread,
			y: this.y - uy * r * 0.8 + ux * spread,
			vx: -ux * r * 1.4,
			vy: -uy * r * 1.4,
			life,
			max: life,
			size: r * (0.3 + this.random() * 0.16),
			hot: true,
			spin: 0,
			len: r * (0.85 + this.random() * 0.4),
			ang: Math.atan2(uy, ux)
		});
	}

	private spawn(
		kind: ParticleKind,
		hot: boolean,
		angle: number,
		speed: number,
		fromBack = false
	): void {
		if (kind === 'none') return;
		const r = this.r;
		const ox = fromBack ? -Math.cos(this.angle) * r * 0.8 : Math.cos(angle) * r * 0.7;
		const oy = fromBack ? -Math.sin(this.angle) * r * 0.8 : Math.sin(angle) * r * 0.7;
		const life = 0.4 + this.random() * 0.45;
		this.embers.push({
			kind,
			spin: (this.random() - 0.5) * 6,
			x: this.x + ox + (this.random() - 0.5) * r * 0.5,
			y: this.y + oy + (this.random() - 0.5) * r * 0.5,
			vx: Math.cos(angle) * speed * r,
			vy: Math.sin(angle) * speed * r,
			life,
			max: life,
			size: r * (0.06 + this.random() * 0.06) * (this.sizeFor?.(kind) ?? 1),
			hot
		});
	}

	/** How open the jaws are, 0..1.15. */
	private openness(): number {
		if (this.bite >= 0) {
			const t = this.bite;
			if (t < 0.08) return 0.3 + 0.85 * easeOut(t / 0.08);
			if (t < 0.12) return 1.15 * (1 - easeIn((t - 0.08) / 0.04));
			return 0.25 * easeOut((t - 0.12) / 0.14);
		}
		if (this.moving) {
			const f = this.chomp % 1;
			if (f < 0.3) return 0.05 + 0.95 * easeOut(f / 0.3);
			if (f < 0.4) return 1;
			if (f < 0.75) return 0.05 + 0.95 * (1 - easeIn((f - 0.4) / 0.35));
			return 0.05;
		}
		const rest = 0.2 + 0.035 * Math.sin(this.time * 2.3);
		if (this.snap >= 0) {
			const t = this.snap;
			if (t < 0.09) return rest + (0.75 - rest) * easeOut(t / 0.09);
			if (t < 0.15) return 0.75 * (1 - easeIn((t - 0.09) / 0.06));
			return rest * easeOut((t - 0.15) / 0.19);
		}
		return rest;
	}

	draw(ctx: CanvasRenderingContext2D): void {
		const r = this.r;
		const p = this.power;
		const D = this.design;
		const pal = mixPal(D.calm, D.awoken, p);
		const pulse = this.ending && p > 0.5 ? 0.62 + 0.38 * (0.5 + 0.5 * Math.cos(this.time * 5)) : 1;

		const d = this.dying;
		if (d >= DEATH_POP) {
			this.drawEmbers(ctx);
			// the last of him: a fading flare where he was
			const k = clamp01((d - DEATH_POP) / (DEATH_END - DEATH_POP));
			if (k < 1) {
				const gs = r * (1.2 + 2.2 * easeOut(k));
				ctx.globalCompositeOperation = 'lighter';
				ctx.globalAlpha = (1 - k) * 0.5;
				ctx.drawImage(glow(D.flare), this.x - gs, this.y - gs, gs * 2, gs * 2);
				ctx.globalAlpha = 1;
				ctx.globalCompositeOperation = 'source-over';
			}
			return;
		}
		this.drawEmbers(ctx);

		const open = this.openness();
		let m = 0.04 + Math.min(1.15, open) * D.mouthSpan;
		let grin = this.moving ? D.grinRun : D.grinRest;
		let S = 1;
		let spin = 0;
		// the mouth's cavity goes first when he is caught, before the body opens round it
		let insideK = 1;
		if (d >= 0) {
			const k = clamp01((d - DEATH_OPEN) / (DEATH_POP - DEATH_OPEN));
			const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
			grin = 0;
			insideK = clamp01(1 - k * 2.5);
			if (D.death === 'open') {
				// the mouth opens all the way round as he shrinks
				m = 0.3 + (Math.PI - 0.3) * e;
				S *= 1 - 0.25 * e;
			} else {
				// she spins away, faster and smaller, her mouth closing
				m = Math.max(0.05, m * (1 - e));
				spin = Math.pow(k, 2) * Math.PI * 6;
				S *= 1 - 0.55 * e;
			}
		}
		const mu = Math.min(Math.PI - 0.01, m * (1 - grin));
		const md = Math.min(Math.PI - 0.01, m * (1 + grin));
		// the light, in the frame (it stays put in the world while he turns)
		const ca = Math.cos(this.angle);
		const sa = Math.sin(this.angle);
		const lx = LIGHT.x * ca + LIGHT.y * sa;
		const ly = (-LIGHT.x * sa + LIGHT.y * ca) * this.flip;

		ctx.save();
		ctx.translate(this.x, this.y);
		ctx.rotate(this.angle + spin);
		ctx.scale(this.size.value * S, this.size.value * S * this.flip);
		const R = r;

		// behind: what the powered look carries behind it
		if (p > 0.01) this.drawBehind?.(ctx, R, p * pulse);
		if (this.ballOn) {
			this.paintBall(ctx, R, lx, ly, p, pal);
			ctx.restore();
			this.drawFront?.(ctx);
			this.drawBursts(ctx);
			return;
		}

		// inside the mouth, behind the body, seen through the open mouth: a painted cavity
		// with a tongue
		this.drawInside(ctx, R, D.inside, mu, md, R * 0.09 * clamp01(m * 2.5), open, insideK);

		// the body: ink (one path), then the painted disc with the mouth cut out
		const A = { x: (D.hinge ?? -0.1) * R, y: 0 };
		const U = { x: Math.cos(mu) * R, y: -Math.sin(mu) * R };
		const Dn = { x: Math.cos(md) * R, y: Math.sin(md) * R };
		const bend = R * 0.09 * clamp01(m * 2.5);
		{
			ctx.save();
			// a thin ink line, heavier on the shadow side
			ctx.translate(-lx * R * 0.026, -ly * R * 0.026);
			ctx.scale(1.046, 1.046);
			ctx.beginPath();
			ctx.moveTo(U.x, U.y);
			ctx.arc(0, 0, R, -mu, md, true);
			ctx.quadraticCurveTo((Dn.x + A.x) / 2, (Dn.y + A.y) / 2 - bend, A.x, A.y);
			ctx.quadraticCurveTo((U.x + A.x) / 2, (U.y + A.y) / 2 + bend, U.x, U.y);
			ctx.closePath();
			ctx.fillStyle = css(pal.ink);
			ctx.fill();
			ctx.restore();
		}
		const body = this.composeBody(R, lx, ly, p, pulse, mu, md, bend);
		ctx.drawImage(body.canvas, -body.half, -body.half, body.half * 2, body.half * 2);

		// lips along the cut, then what the hero wears
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		const lips = () => {
			ctx.beginPath();
			ctx.moveTo(Dn.x * 0.97, Dn.y * 0.97);
			ctx.quadraticCurveTo((Dn.x + A.x) / 2, (Dn.y + A.y) / 2 - bend, A.x, A.y);
			ctx.quadraticCurveTo((U.x + A.x) / 2, (U.y + A.y) / 2 + bend, U.x * 0.97, U.y * 0.97);
		};
		this.drawLips(ctx, lips, R, pal, { A, U, Dn });
		this.drawWorn?.(ctx, R, p, lx, ly);
		ctx.restore();

		this.drawFront?.(ctx);
		this.drawBursts(ctx);
	}

	// ── hooks: what each hero adds ──
	/** How big and how fast-rising a particle kind is (1 and 0.8 if not given). */
	protected sizeFor?(kind: ParticleKind): number;
	protected liftFor?(kind: ParticleKind): number;
	/** How hard a particle kind flutters sideways, body radii per second squared (0 if not given). */
	protected swirlFor?(kind: ParticleKind): number;
	/** Frame space, behind the body, while powered (k = look × the end-of-power pulse). */
	protected drawBehind?(ctx: CanvasRenderingContext2D, R: number, k: number): void;
	/** Inside the body (the scratch canvas, source-atop): veins, blush, marks. */
	protected decorate?(sc: CanvasRenderingContext2D, R: number, p: number, k: number): void;
	/** The rolling ball's pattern (clipped to the ball, turning with the roll `p`): his own. */
	protected paintBallPattern?(ctx: CanvasRenderingContext2D, R: number, p: number): void;
	/** What circles the rolling ball, in the frame turned with the roll. */
	protected paintBallOrbit?(ctx: CanvasRenderingContext2D, R: number, p: number): void;
	/** Frame space, over the body: what the hero wears (her bow); (lx, ly) is the light. */
	protected drawWorn?(
		ctx: CanvasRenderingContext2D,
		R: number,
		p: number,
		lx: number,
		ly: number
	): void;
	/** World space, last: what circles the hero. */
	protected drawFront?(ctx: CanvasRenderingContext2D): void;
	/** Which particle a moment sheds (embers if not given). */
	protected particleFor?(moment: 'trail' | 'burst' | 'death'): ParticleKind;
	/** Secondary motion. */
	protected onBite?(): void;
	protected onTurn?(): void;
	protected afterUpdate?(dt: number): void;
	protected resetLooks?(): void;

	/**
	 * The lips along the mouth's cut: a thin ink line. `ends` are the hinge and the two lip
	 * ends, for a hero that wears something on them (her lipstick).
	 */
	protected drawLips(
		ctx: CanvasRenderingContext2D,
		lips: () => void,
		R: number,
		pal: Palette,
		ends: { A: Pt; U: Pt; Dn: Pt }
	): void {
		void ends;
		ctx.strokeStyle = css(pal.ink);
		ctx.lineWidth = R * 0.05;
		lips();
		ctx.stroke();
	}

	private scratch: HTMLCanvasElement | null = null;

	/**
	 * The body this frame: the cached painted disc for this light and look, with the mouth
	 * cut out, molten veins and the flash added, in a small scratch canvas. Only plain
	 * image draws and Porter-Duff operations: no clipping, no blend modes, no gradients.
	 */
	private composeBody(
		R: number,
		lx: number,
		ly: number,
		p: number,
		pulse: number,
		mu: number,
		md: number,
		bend: number
	): { canvas: HTMLCanvasElement; half: number } {
		const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
		const disc = bodyDisc(this.design, R * dpr, Math.atan2(ly, lx), p, this.season);
		const size = disc.width;
		if (!this.scratch || this.scratch.width !== size) {
			this.scratch = document.createElement('canvas');
			this.scratch.width = this.scratch.height = size;
		}
		const sc = this.scratch.getContext('2d') as CanvasRenderingContext2D;
		const k = size / 2 / (R * DISC_SPAN);
		sc.setTransform(1, 0, 0, 1, 0, 0);
		sc.globalCompositeOperation = 'source-over';
		sc.globalAlpha = 1;
		sc.clearRect(0, 0, size, size);
		sc.drawImage(disc, 0, 0);
		sc.setTransform(k, 0, 0, k, size / 2, size / 2);
		// the mouth: everything past the lips goes
		const A = { x: (this.design.hinge ?? -0.1) * R, y: 0 };
		const U = { x: Math.cos(mu) * R, y: -Math.sin(mu) * R };
		const Dn = { x: Math.cos(md) * R, y: Math.sin(md) * R };
		sc.globalCompositeOperation = 'destination-out';
		// opaque: a flash leaves a faint fillStyle behind, which would cut the mouth only partly
		sc.fillStyle = '#000';
		sc.beginPath();
		sc.moveTo(A.x, A.y);
		sc.quadraticCurveTo((U.x + A.x) / 2, (U.y + A.y) / 2 + bend, U.x, U.y);
		sc.lineTo(Math.cos(mu) * R * 1.3, -Math.sin(mu) * R * 1.3);
		sc.arc(0, 0, R * 1.3, -mu, md, false);
		sc.lineTo(Dn.x, Dn.y);
		sc.quadraticCurveTo((Dn.x + A.x) / 2, (Dn.y + A.y) / 2 - bend, A.x, A.y);
		sc.closePath();
		sc.fill();
		sc.globalCompositeOperation = 'source-atop';
		this.decorate?.(sc, R, p, p * pulse);
		if (this.flash > 0) {
			sc.fillStyle = `rgba(255,255,250,${this.flash})`;
			sc.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);
		}
		sc.globalCompositeOperation = 'source-over';
		return { canvas: this.scratch, half: R * DISC_SPAN };
	}

	/**
	 * The mouth's cavity (frame space, under the body): the wedge between the lips, a dark
	 * red that deepens towards the hinge, and a tongue lying on the lower jaw.
	 */
	private drawInside(
		ctx: CanvasRenderingContext2D,
		R: number,
		look: MouthInside,
		mu: number,
		md: number,
		bend: number,
		open: number,
		alpha: number
	): void {
		if (mu + md < 0.12 || alpha <= 0.01) return;
		const A = { x: (this.design.hinge ?? -0.1) * R, y: 0 };
		const U = { x: Math.cos(mu) * R, y: -Math.sin(mu) * R };
		const Dn = { x: Math.cos(md) * R, y: Math.sin(md) * R };
		ctx.save();
		ctx.globalAlpha = alpha;
		// the cavity is a rounded pocket behind the hinge; the rest of the wedge is open
		ctx.beginPath();
		ctx.arc(A.x + R * 0.36, 0, R * 0.5, 0, Math.PI * 2);
		ctx.clip();
		ctx.beginPath();
		ctx.moveTo(A.x, A.y);
		ctx.quadraticCurveTo((U.x + A.x) / 2, (U.y + A.y) / 2 + bend, U.x, U.y);
		ctx.arc(0, 0, R, -mu, md, false);
		ctx.quadraticCurveTo((Dn.x + A.x) / 2, (Dn.y + A.y) / 2 - bend, A.x, A.y);
		ctx.closePath();
		ctx.clip();
		// the cavity: dark, deepening towards the hinge
		const g = ctx.createRadialGradient(A.x + R * 0.5, 0, 0, A.x + R * 0.5, 0, R * 0.7);
		g.addColorStop(0, css(look.mid));
		g.addColorStop(1, css(look.deep));
		ctx.fillStyle = g;
		ctx.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);
		// the tongue on the lower jaw
		const t = md * 0.6;
		const grow = clamp01(open * 1.5);
		ctx.translate(A.x + Math.cos(t) * R * 0.42, Math.sin(t) * R * 0.5);
		ctx.rotate(t);
		ctx.fillStyle = css(look.tongue);
		ctx.beginPath();
		ctx.ellipse(0, 0, R * 0.27 * grow, R * 0.1 * grow, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = css(look.tongueLight, 0.8);
		ctx.beginPath();
		ctx.ellipse(R * 0.03, -R * 0.025 * grow, R * 0.15 * grow, R * 0.035 * grow, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}

	/** The rolling ball: the body's own cel disc (no mouth) with the hero's pattern turning on it. */
	private paintBall(
		ctx: CanvasRenderingContext2D,
		R: number,
		lx: number,
		ly: number,
		p: number,
		pal: Palette
	): void {
		const rb = R * 0.94;
		const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
		ctx.fillStyle = css(pal.ink);
		ctx.beginPath();
		ctx.arc(-lx * rb * 0.026, -ly * rb * 0.026, rb * 1.046, 0, Math.PI * 2);
		ctx.fill();
		const disc = bodyDisc(this.design, rb * dpr, Math.atan2(ly, lx), p, this.season);
		const half = rb * DISC_SPAN;
		ctx.drawImage(disc, -half, -half, half * 2, half * 2);
		// the pattern turns with the roll, whatever way he faces (the frame is turned and may be
		// flipped, so the turn is taken back out of it)
		const turn = this.flip * (this.roll - this.angle);
		ctx.save();
		ctx.beginPath();
		ctx.arc(0, 0, rb, 0, Math.PI * 2);
		ctx.clip();
		ctx.rotate(turn);
		this.paintBallPattern?.(ctx, rb, p);
		ctx.restore();
		// the light stays where it is while the ball turns
		ctx.fillStyle = css(pal.highlight, 0.95);
		ctx.beginPath();
		ctx.ellipse(
			lx * rb * 0.5,
			ly * rb * 0.5,
			rb * 0.2,
			rb * 0.1,
			Math.atan2(ly, lx) + Math.PI / 2,
			0,
			Math.PI * 2
		);
		ctx.fill();
		ctx.save();
		ctx.rotate(turn);
		this.paintBallOrbit?.(ctx, rb, p);
		ctx.restore();
		if (this.flash > 0) {
			ctx.fillStyle = `rgba(255,255,250,${this.flash})`;
			ctx.beginPath();
			ctx.arc(0, 0, rb * 1.05, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	private drawEmbers(ctx: CanvasRenderingContext2D): void {
		for (const e of this.embers) {
			const u = e.life / e.max;
			const a = Math.min(1, (1 - u) * 5) * u;
			const s = e.size * (0.5 + 0.5 * u);
			this.drawParticle(ctx, e, a, s);
		}
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
	}

	/** One particle at alpha `a` and size `s`: an ember by default. */
	protected drawParticle(ctx: CanvasRenderingContext2D, e: Particle, a: number, s: number): void {
		ctx.globalCompositeOperation = 'lighter';
		ctx.globalAlpha = a * 0.8;
		const g = glow(e.hot ? [255, 190, 80] : [255, 170, 60]);
		ctx.drawImage(g, e.x - s * 3, e.y - s * 3, s * 6, s * 6);
		ctx.globalCompositeOperation = 'source-over';
		ctx.globalAlpha = a;
		ctx.fillStyle = e.hot ? 'rgba(255,250,225,1)' : 'rgba(255,230,160,1)';
		ctx.beginPath();
		ctx.arc(e.x, e.y, s * 0.6, 0, Math.PI * 2);
		ctx.fill();
	}

	/** The burst of the awakening: a painted ring and impact rays. */
	private drawBursts(ctx: CanvasRenderingContext2D): void {
		const R = this.r;
		for (const b of this.bursts) {
			const k = b.t / 0.5;
			const ease = easeOut(k);
			const a = 1 - k;
			ctx.save();
			ctx.translate(b.x, b.y);
			ctx.globalCompositeOperation = 'lighter';
			ctx.strokeStyle = css(this.design.flare, 0.35 * a);
			ctx.lineWidth = R * 0.32 * a;
			ctx.beginPath();
			ctx.arc(0, 0, R * (1 + 2.6 * ease), 0, Math.PI * 2);
			ctx.stroke();
			ctx.globalCompositeOperation = 'source-over';
			ctx.strokeStyle = `rgba(255,252,235,${0.95 * a})`;
			ctx.lineWidth = Math.max(1, R * 0.1 * a);
			ctx.stroke();
			// impact rays: quick, tapered
			const ra = clamp01(1 - b.t / 0.25);
			if (ra > 0) {
				ctx.fillStyle = `rgba(255,248,220,${ra})`;
				for (let i = 0; i < 10; i++) {
					const an = b.angle + (i / 10) * Math.PI * 2 + 0.3;
					const r0 = R * (1.15 + ease * 0.6);
					const r1 = R * (1.9 + ease * 1.6) * (i % 2 ? 0.8 : 1);
					const w = R * 0.07;
					const cx = Math.cos(an);
					const cy = Math.sin(an);
					ctx.beginPath();
					ctx.moveTo(cx * r0 - cy * w, cy * r0 + cx * w);
					ctx.lineTo(cx * r1, cy * r1);
					ctx.lineTo(cx * r0 + cy * w, cy * r0 - cx * w);
					ctx.closePath();
					ctx.fill();
				}
			}
			ctx.restore();
		}
	}
}

export function mixPal(a: Palette, b: Palette, k: number): Palette {
	return {
		light: mix(a.light, b.light, k),
		mid: mix(a.mid, b.mid, k),
		shadow: mix(a.shadow, b.shadow, k),
		deep: mix(a.deep, b.deep, k),
		bounce: mix(a.bounce, b.bounce, k),
		ink: mix(a.ink, b.ink, k),
		highlight: mix(a.highlight, b.highlight, k),
		rim: mix(a.rim, b.rim, k)
	};
}
