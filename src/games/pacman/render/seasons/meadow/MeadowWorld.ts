// Live part of the meadow mock-ups: camera, the baked world, animated maze objects (food,
// portal swirls, stream glints, chimney smoke) and the screen-space atmosphere (mist, sun
// rays, drifting particles, weather, night with lamp and cabin lights). The season's theme
// supplies every colour, sprite and particle behaviour.
//
// Fill rate: the atmosphere that holds still is baked into a copy of the background once the
// mood has settled, so a frame blends fewer full-screen layers. Below High everything holds
// still (the mist and the rays too) and the frame is the baked background alone. On High the
// mist drifts and the rays flicker: the covering layers and the night are baked, and the mist's
// cover and the whole stack's light stay two live passes over them, which is the same picture.
// While the mood moves (the weather rises, the night falls) the same maps go over the raw
// background every frame, and the copy is baked again, a strip a frame, from the maps the
// screen has just shown.
import { boardPlacement } from '../../common/boardScale';
import { hudLayoutFor } from '../../../config/hudLayout';
import type { GridMatrix } from '../../../config/gridConfig';
import { isTeleportToken } from '../../../config/gridConfig';
import type { GridLayout } from '../../maze/GridView';
import { bakeMeadow, MEADOW_TILE } from './MeadowBake';
import { streamY, tunnelRowOf, worldDecor } from '../../common/worldDecor';
import type { MeadowTheme, WeatherParticle } from './MeadowTheme';
import { glowTexture, rayTexture } from './meadowSprites';
import { drawRipplePad, PAD_RADIUS } from './ripplePad';
import { MoodBuffer } from '../../common/moodBuffer';
import { hexChannels } from '../../common/textures';
import { settle } from '../../common/math';
import type { RenderQuality } from '../../common/renderQuality';
import type { DebugRenderFlags } from '../../debug/DebugOverlayView';

const T = MEADOW_TILE;
const REBAKE_DELAY_MS = 160;
/** The settled atmosphere is baked into the background over this many frames, a strip each. */
const BAKE_STRIPS = 6;
/** The mood counts as settled this close to its target (it eases towards it for ever). */
const MOOD_SETTLED = 0.004;
/** Where the still mist stands, in screen widths: the first bank, and the step to the next. */
const STILL_MIST_AT = 0.25;
const STILL_MIST_STEP = 0.07;
/** Side of the vignette's lookup table, cells. */
const VIGNETTE_CELLS = 48;
/** How far ahead of the mouth (tiles) the dots feel his pull, when `attract` is given. */
const SUCK_REACH = 0.9;

interface Point {
	readonly x: number;
	readonly y: number;
}

interface Light extends Point {
	readonly r: number;
	readonly tint: number;
	readonly a: number;
	readonly flicker: boolean;
}

/** A world object that moves under the atmosphere, and the world rectangle it stays in. */
interface LiveObject {
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
	readonly draw: (ctx: CanvasRenderingContext2D) => void;
}

interface Drift {
	readonly im: HTMLCanvasElement;
	readonly a: number;
	readonly v: number;
	readonly ph: number;
	readonly rand: number;
	px: number;
	py: number;
	w: number;
	h: number;
}

/** Centred sprite; size in the current transform's units. */
function sprite(
	ctx: CanvasRenderingContext2D,
	im: HTMLCanvasElement,
	x: number,
	y: number,
	w: number,
	h: number,
	a = 1,
	rot = 0,
	add = false
): void {
	if (a <= 0.003 || w <= 0 || h <= 0) {
		return;
	}
	ctx.globalAlpha = a > 1 ? 1 : a;
	ctx.globalCompositeOperation = add ? 'lighter' : 'source-over';
	if (rot) {
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(rot);
		ctx.drawImage(im, -w / 2, -h / 2, w, h);
		ctx.restore();
	} else {
		ctx.drawImage(im, x - w / 2, y - h / 2, w, h);
	}
}

export class MeadowWorld {
	private readonly S: GridMatrix;
	private readonly theme: MeadowTheme;
	private readonly R: number;
	private readonly C: number;
	private readonly pellets: Array<Point & { r: number; c: number }> = [];
	private readonly energizers: Array<Point & { r: number; c: number; ph: number }> = [];
	private readonly portals: Array<Point & { i: number; ph: number }> = [];
	/** Lair gates: runs of LE tiles, world units from x0 to x1 at height y. */
	private readonly gates: Array<{ x0: number; x1: number; y: number }> = [];
	private gateOpen = 0;
	private readonly glints: Array<Point & { ph: number }> = [];
	private readonly smoke: Array<{ cx: number; cy: number; u: number; ph: number }> = [];
	private readonly liveObjects: LiveObject[] = [];
	private readonly lights: Light[] = [];
	private readonly mist: Array<{ x: number; y: number; w: number; h: number; v: number }>;
	private readonly drift: Drift[];
	private weather: WeatherParticle[] = [];
	private readonly motion: number;
	private vw = 0;
	private vh = 0;
	private dpr = 1;
	private sc = 1;
	private wx = 0;
	private wy = 0;
	private t = 0;
	private stormV = 0;
	private stormT = 0;
	private nightV = 0;
	private nightT = 0;
	private bg: HTMLCanvasElement | null = null;
	private bgX = 0;
	private bgY = 0;
	private bgRS = 1;
	private rebakeAt = 0;
	/** The atmosphere that holds still: what is baked into the background. */
	private readonly mood = new MoodBuffer();
	/** High only: the drifting mist's cover and the light of the whole stack, every frame. */
	private readonly liveMood = new MoodBuffer();
	/** How bright the night leaves a thing, 0..1 (the mean of its tint). */
	private readonly nightLum: number;
	/** The background with the settled atmosphere baked in, and what it holds. */
	private lit: HTMLCanvasElement | null = null;
	private litCtx: CanvasRenderingContext2D | null = null;
	private litKey = '';
	private bakeKey = '';
	private bakeStrip = 0;
	/** True while this frame draws the baked background (set by `drawWorld`). */
	private baked = false;
	/** The vignette's alpha over the screen, row by row (it darkens the lights and the weather). */
	private vignetteAlpha: Uint8ClampedArray | null = null;
	private lastDrawAt = 0;
	private quality: RenderQuality = 'high';
	private debugFlags: DebugRenderFlags | null = null;

	constructor(S: GridMatrix, theme: MeadowTheme) {
		this.S = S;
		this.theme = theme;
		this.R = S.length;
		this.C = S[0].length;
		const live = theme.live;
		const reduce =
			typeof window !== 'undefined' &&
			typeof window.matchMedia === 'function' &&
			window.matchMedia('(prefers-reduced-motion:reduce)').matches;
		this.motion = reduce ? 0.2 : 1;

		const ctr = (r: number, c: number): Point => ({ x: (c + 0.5) * T, y: (r + 0.5) * T });
		S.forEach((row, r) =>
			row.forEach((tt, c) => {
				const p = ctr(r, c);
				if (tt === 'DT') {
					this.pellets.push({ ...p, r, c });
				} else if (tt === 'EU') {
					this.energizers.push({ ...p, r, c, ph: Math.random() * 6 });
					this.lights.push({
						...p,
						r: 1.7 * T,
						tint: live.lights.energizer,
						a: 0.8,
						flicker: false
					});
				} else if (isTeleportToken(tt)) {
					this.portals.push({ ...p, i: this.portals.length, ph: r + c });
					this.lights.push({ ...p, r: 1.6 * T, tint: live.lights.portal, a: 0.7, flicker: false });
				}
			})
		);
		S.forEach((row, r) => {
			let start = -1;
			row.forEach((tt, c) => {
				if (tt === 'LE' && start < 0) {
					start = c;
				}
				if (start >= 0 && (tt !== 'LE' || c === row.length - 1)) {
					const end = tt === 'LE' ? c + 1 : c;
					this.gates.push({ x0: start * T, x1: end * T, y: (r + 0.5) * T });
					start = -1;
				}
			});
		});
		const lair = ctr(Math.floor((this.R - 1) / 2), Math.floor((this.C - 1) / 2));
		this.lights.push({ ...lair, r: 3.4 * T, tint: 0xffd9a0, a: 0.4, flicker: false });
		for (let i = 0; i < 22; i++) {
			const x = (-18 + (i * (this.C + 36)) / 22) * T + Math.random() * T * 2;
			this.glints.push({
				x,
				y: streamY(this.R, x) + (Math.random() - 0.5) * 10,
				ph: Math.random() * 6
			});
		}
		for (const o of worldDecor(this.R, this.C, theme.bake.landmark.ex, tunnelRowOf(this.S))) {
			if (o.k === 'lamp') {
				this.lights.push({ x: o.x, y: o.y, r: 4 * T, tint: 0xffd890, a: 0.85, flicker: true });
			} else if (o.k === 'cabin') {
				const w = o.w ?? 0;
				const h = o.h ?? 0;
				this.lights.push({ x: o.x, y: o.y, r: 5 * T, tint: 0xffc77a, a: 0.5, flicker: false });
				if (live.chimneySmoke) {
					for (let i = 0; i < 5; i++) {
						this.smoke.push({ cx: o.x + w * 0.25, cy: o.y - h * 0.22, u: i / 5, ph: i });
					}
				}
			}
		}
		this.mist = [0, 1, 2, 3].map((i) => ({ x: 0, y: 0, w: 0, h: 0, v: 0.15 + i * 0.04 }));
		const [nr, ng, nb] = hexChannels(parseInt(live.nightTint.slice(1), 16));
		this.nightLum = (nr + ng + nb) / (3 * 255);
		this.collectLiveObjects();
		this.mood.setLight(this.quality !== 'high');
		this.drift = Array.from({ length: 80 }, (_, i) => ({
			im: live.drift.texture(i),
			a: 0.55 + Math.random() * 0.35,
			px: Math.random(),
			py: Math.random(),
			v: 0.0004 + Math.random() * 0.0004,
			ph: Math.random() * 6,
			rand: Math.random(),
			w: 0,
			h: 0
		}));
	}

	/** Board placement for the actors: one tile = MEADOW_TILE world units. */
	get layout(): GridLayout {
		return { tileSize: T * this.sc, offsetX: this.wx, offsetY: this.wy };
	}

	/** How far the lair gate is open, 0 (shut) .. 1 (slid into its posts). */
	setLairGate(open: number): void {
		this.gateOpen = Number.isFinite(open) ? Math.max(0, Math.min(1, open)) : 0;
	}

	/** Weather and night targets, 0..1; both ease in and out like the mock-up toggles. */
	setMood(storm: number, night: number): void {
		this.stormT = storm;
		this.nightT = night;
	}

	/** The render quality tier: High keeps the mist and the rays moving; it also sets the maps' repaint rate. */
	setQuality(quality: RenderQuality): void {
		this.quality = quality;
		this.mood.setQuality(quality);
		// on High the baked stack only covers: the light is the live stack's
		this.mood.setLight(quality !== 'high');
		this.placeStillMist();
	}

	/**
	 * Below High the mist holds still: it stands where it drifts to by the middle of a level,
	 * over the board, not at the screen's left edge where a level starts it.
	 */
	private placeStillMist(): void {
		if (this.quality === 'high') {
			return;
		}
		this.mist.forEach((f, i) => {
			f.x = this.vw * (STILL_MIST_AT + i * STILL_MIST_STEP);
		});
	}

	/** Dev build: the layer switches of the render group (read every frame, never copied). */
	setDebugFlags(flags: DebugRenderFlags): void {
		this.debugFlags = flags;
	}

	resize(vw: number, vh: number, dpr: number): void {
		if (vw === this.vw && vh === this.vh && dpr === this.dpr) {
			return;
		}
		const first = this.vw === 0;
		this.vw = vw;
		this.vh = vh;
		this.dpr = dpr;
		const hud = hudLayoutFor(vw, vh);
		const board = boardPlacement(vw, vh, this.C, this.R, T, hud.top, hud.bottom);
		this.sc = board.scale;
		this.wx = board.x;
		this.wy = board.y;
		const W = Math.max(vw, vh);
		this.mist.forEach((f, i) => {
			f.w = W * 0.8;
			f.h = W * 0.5;
			f.y = vh * (0.15 + i * 0.22);
		});
		this.placeStillMist();
		for (const p of this.drift) {
			[p.w, p.h] = this.theme.live.drift.size(this.sc, p.rand);
		}
		if (first) {
			const weather = this.theme.live.weather;
			this.weather = Array.from({ length: weather.count }, (_, i) => weather.make(i, vw, vh));
			this.rebake();
		} else {
			this.rebakeAt = performance.now() + REBAKE_DELAY_MS;
		}
	}

	update(dt: number): void {
		const live = this.theme.live;
		const ms = Math.min(Math.max(dt * 1000, 0), 100);
		const k = this.motion;
		this.t += (ms / 1000) * k;
		const d = ms * 0.06 * k;
		const t = this.t;
		const ez = Math.min(1, 0.04 * d);
		this.stormV = settle(this.stormV, this.stormT, ez, MOOD_SETTLED);
		this.nightV = settle(this.nightV, this.nightT, ez, MOOD_SETTLED);
		// below High the mist holds still, so it can be baked with the rest
		if (this.quality === 'high') {
			for (const f of this.mist) {
				f.x += f.v * d * live.mistSpeed(this.stormV);
				if (f.x > this.vw + f.w / 2) {
					f.x = -f.w / 2;
				}
			}
		}
		const dir = live.drift.direction;
		for (const p of this.drift) {
			p.py += dir * p.v * d * live.drift.speed;
			p.px += Math.sin(t * 0.9 + p.ph) * 0.0004;
			if (dir > 0 && p.py > 1.03) {
				p.py = -0.03;
				p.px = Math.random();
			} else if (dir < 0 && p.py < -0.03) {
				p.py = 1.03;
				p.px = Math.random();
			}
		}
		if (this.stormV > 0.02) {
			for (const p of this.weather) {
				live.weather.step(p, d, t, this.stormV, this.vw, this.vh);
			}
		}
		for (const q of this.smoke) {
			q.u = (q.u + 0.0025 * d) % 1;
		}
	}

	/**
	 * Background, maze, the lair gate and the animated world objects, the drift and the
	 * atmosphere that holds still, baked into the background or laid over it while the mood
	 * moves; the food is drawn apart (`drawFood`), over the mood. Leaves the context
	 * untransformed.
	 */
	drawWorld(ctx: CanvasRenderingContext2D): void {
		const now = performance.now();
		this.lastDrawAt = now;
		if (this.rebakeAt > 0 && now >= this.rebakeAt) {
			this.rebake();
		}
		const live = this.theme.live;
		const t = this.t;
		const vw = this.vw;
		const vh = this.vh;
		const flags = this.debugFlags;
		const atmosphere = !flags || flags.atmosphere;
		const showNight = (!flags || flags.night) && this.nightV > 0.002;
		const key = atmosphere ? this.moodKey() : null;
		const lit = key !== null && key === this.litKey ? this.lit : null;
		this.baked = lit !== null;
		// what the baked storm tint and night would have done to the small things drawn over them
		const dim = lit
			? (1 - live.stormAlpha * this.stormV) *
				(showNight ? 1 - live.nightAlpha * this.nightV * (1 - this.nightLum) : 1)
			: 1;
		ctx.save();
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
		// the baked background covers the screen with a margin: the plain fill is for before it exists
		if (!this.bg) {
			ctx.fillStyle = this.theme.bake.bg;
			ctx.fillRect(0, 0, vw, vh);
		}
		if (lit) {
			this.drawLiveObjectsBaked(ctx, lit);
		}
		ctx.translate(this.wx, this.wy);
		ctx.scale(this.sc, this.sc);
		if (!lit) {
			if (this.bg) {
				this.drawBackground(ctx, this.bg);
			}
			for (const o of this.liveObjects) {
				o.draw(ctx);
			}
		}
		const glint = glowTexture(live.glints);
		for (const g of this.glints) {
			const a = Math.pow(Math.max(0, Math.sin(t * 2 + g.ph)), 3) * 0.8;
			sprite(ctx, glint, g.x, g.y, 6.4, 6.4, a * dim, 0, true);
		}
		ctx.restore();

		ctx.save();
		if (!flags || flags.drift) {
			const spin = live.drift.spin;
			for (const p of this.drift) {
				const x = p.px * vw;
				const y = p.py * vh;
				const a = p.a * (lit ? dim * (1 - this.vignetteAt(x, y)) : 1);
				sprite(ctx, p.im, x, y, p.w, p.h, a, spin ? t + p.ph : 0);
			}
		}
		if (!lit) {
			if (atmosphere) {
				const night = showNight ? this.paintNightShade : null;
				this.mood.draw(ctx, vw, vh, this.paintStill, night);
				if (key !== null) {
					this.bakeStep(key, night);
				}
			} else if (showNight) {
				// the diagnostic switch turned the atmosphere off: keep Night independently readable
				ctx.globalAlpha = live.nightAlpha * this.nightV;
				ctx.globalCompositeOperation = 'multiply';
				ctx.fillStyle = live.nightTint;
				ctx.fillRect(0, 0, vw, vh);
			}
		}
		ctx.restore();
	}

	/** Frees the baked copy of the background (a world that is not on the screen any more). */
	releaseBake(): void {
		this.lit = null;
		this.litCtx = null;
		this.litKey = '';
		this.bakeKey = '';
	}

	/** Milliseconds since this world was last drawn. */
	idleFor(now: number): number {
		return now - this.lastDrawAt;
	}

	/** `image` is the raw or the baked background; the context is in world units. */
	private drawBackground(ctx: CanvasRenderingContext2D, image: HTMLCanvasElement): void {
		ctx.drawImage(image, this.bgX, this.bgY, image.width / this.bgRS, image.height / this.bgRS);
	}

	/**
	 * What the baked background holds, or null while it cannot be baked: the mood is still
	 * moving. The key names everything the baked atmosphere depends on.
	 */
	private moodKey(): string | null {
		if (this.stormV !== this.stormT || this.nightV !== this.nightT) {
			return null;
		}
		const flags = this.debugFlags;
		return [
			this.stormV,
			this.nightV,
			this.quality === 'high' ? 'live-mist' : 'still-mist',
			!flags || flags.night ? 'night' : '',
			!flags || flags.vignette ? 'vignette' : ''
		].join('|');
	}

	/**
	 * One strip of the baked background: the raw background under the maps the screen has just
	 * shown. The last strip makes the copy the frame's background.
	 */
	private bakeStep(key: string, night: ((ctx: CanvasRenderingContext2D) => void) | null): void {
		const bg = this.bg;
		if (!bg) {
			return;
		}
		if (this.bakeKey !== key || !this.lit || !this.litCtx) {
			if (!this.lit || !this.litCtx) {
				const cv = document.createElement('canvas');
				const c = cv.getContext('2d', { alpha: false });
				if (!c) {
					return;
				}
				this.lit = cv;
				this.litCtx = c;
			}
			if (this.lit.width !== bg.width || this.lit.height !== bg.height) {
				this.lit.width = bg.width;
				this.lit.height = bg.height;
			}
			this.bakeKey = key;
			this.bakeStrip = 0;
			this.litKey = '';
			// every strip must see the same maps: paint them for this state now
			this.mood.paint(this.vw, this.vh, this.paintStill, night, true);
		}
		const c = this.litCtx;
		const y0 = Math.floor((this.bakeStrip * bg.height) / BAKE_STRIPS);
		const y1 = Math.floor(((this.bakeStrip + 1) * bg.height) / BAKE_STRIPS);
		// the screen inside the bake, px: the bake reaches a margin beyond it on every side
		const k = this.bgRS / this.sc;
		const x = Math.round((-this.wx / this.sc - this.bgX) * this.bgRS);
		const y = Math.round((-this.wy / this.sc - this.bgY) * this.bgRS);
		const w = Math.round(this.vw * k);
		const h = Math.round(this.vh * k);
		c.save();
		c.setTransform(1, 0, 0, 1, 0, 0);
		c.beginPath();
		c.rect(0, y0, bg.width, y1 - y0);
		c.clip();
		c.globalAlpha = 1;
		c.globalCompositeOperation = 'source-over';
		c.drawImage(bg, 0, 0);
		this.mood.compositeWithMargins(c, x, y, w, h, x, y, bg.width - x - w, bg.height - y - h);
		c.restore();
		this.bakeStrip += 1;
		if (this.bakeStrip >= BAKE_STRIPS) {
			this.litKey = key;
		}
	}

	/**
	 * The baked background, then the moving world objects with the atmosphere over them: each
	 * one's rectangle gets the raw background, the object and that part of the maps, on whole
	 * device pixels, so it meets the baked background around it without a seam.
	 */
	private drawLiveObjectsBaked(ctx: CanvasRenderingContext2D, lit: HTMLCanvasElement): void {
		const bg = this.bg;
		// css px to device px: the render scale and any shake
		const base = ctx.getTransform();
		ctx.save();
		ctx.translate(this.wx, this.wy);
		ctx.scale(this.sc, this.sc);
		this.drawBackground(ctx, lit);
		ctx.restore();
		if (!bg || base.b !== 0 || base.c !== 0 || base.a <= 0 || base.d <= 0) {
			return;
		}
		const world = this.bgRS / this.sc;
		for (const o of this.liveObjects) {
			const x0 = Math.floor(base.a * (this.wx + o.x * this.sc) + base.e);
			const y0 = Math.floor(base.d * (this.wy + o.y * this.sc) + base.f);
			const x1 = Math.ceil(base.a * (this.wx + (o.x + o.w) * this.sc) + base.e);
			const y1 = Math.ceil(base.d * (this.wy + (o.y + o.h) * this.sc) + base.f);
			const w = x1 - x0;
			const h = y1 - y0;
			if (w <= 0 || h <= 0 || x1 <= 0 || y1 <= 0) {
				continue;
			}
			if (x0 >= ctx.canvas.width || y0 >= ctx.canvas.height) {
				continue;
			}
			// the same rectangle in css px
			const cx = (x0 - base.e) / base.a;
			const cy = (y0 - base.f) / base.d;
			const cw = w / base.a;
			const ch = h / base.d;
			ctx.save();
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.beginPath();
			ctx.rect(x0, y0, w, h);
			ctx.clip();
			ctx.drawImage(
				bg,
				((cx - this.wx) / this.sc - this.bgX) * this.bgRS,
				((cy - this.wy) / this.sc - this.bgY) * this.bgRS,
				cw * world,
				ch * world,
				x0,
				y0,
				w,
				h
			);
			ctx.setTransform(base);
			ctx.translate(this.wx, this.wy);
			ctx.scale(this.sc, this.sc);
			ctx.globalAlpha = 1;
			ctx.globalCompositeOperation = 'source-over';
			o.draw(ctx);
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			this.mood.compositeRect(ctx, cx, cy, cw, ch, x0, y0, w, h);
			ctx.restore();
		}
	}

	/** The lair gates, the portals and the chimney smoke, each with the rectangle it stays in. */
	private collectLiveObjects(): void {
		const live = this.theme.live;
		for (const g of this.gates) {
			this.liveObjects.push({
				x: g.x0 - 1,
				y: g.y - 10,
				w: g.x1 - g.x0 + 2,
				h: 18,
				draw: (ctx) => this.drawGate(ctx, g)
			});
		}
		const reach = PAD_RADIUS * 1.75;
		for (const o of this.portals) {
			this.liveObjects.push({
				x: o.x - reach,
				y: o.y - reach,
				w: 2 * reach,
				h: 2 * reach,
				draw: (ctx) =>
					drawRipplePad(ctx, o.x, o.y, this.t, o.ph, live.portal.glow, live.portal.deep)
			});
		}
		// the puffs of one chimney rise together: one rectangle a chimney
		const chimneys = new Map<string, Array<{ cx: number; cy: number; u: number; ph: number }>>();
		for (const q of this.smoke) {
			const id = `${q.cx}|${q.cy}`;
			const puffs = chimneys.get(id) ?? [];
			puffs.push(q);
			chimneys.set(id, puffs);
		}
		for (const puffs of chimneys.values()) {
			const { cx, cy } = puffs[0]!;
			this.liveObjects.push({
				x: cx - 20,
				y: cy - 50,
				w: 66,
				h: 66,
				draw: (ctx) => this.drawSmoke(ctx, puffs)
			});
		}
	}

	private drawSmoke(
		ctx: CanvasRenderingContext2D,
		puffs: ReadonlyArray<{ cx: number; cy: number; u: number; ph: number }>
	): void {
		const t = this.t;
		const puff = glowTexture(0xf2f6fa);
		for (const q of puffs) {
			const s = 8 + q.u * 22;
			sprite(
				ctx,
				puff,
				q.cx + q.u * 26 + Math.sin(t * 1.5 + q.ph) * 4,
				q.cy - q.u * 34,
				s,
				s,
				(1 - q.u) * 0.5 * Math.min(1, q.u * 8)
			);
		}
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
	}

	/**
	 * The food still on the board: pellets and energizers. Drawn after `drawMood`, like the
	 * actors, so neither the night nor the weather dims it. `collected(x, y)` tells which
	 * food was eaten. Leaves the context untransformed.
	 */
	drawFood(
		ctx: CanvasRenderingContext2D,
		collected: (x: number, y: number) => boolean,
		attract: { readonly x: number; readonly y: number; readonly angle: number } | null = null
	): void {
		const live = this.theme.live;
		const t = this.t;
		ctx.save();
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
		ctx.translate(this.wx, this.wy);
		ctx.scale(this.sc, this.sc);
		const pellet = live.pellet.texture();
		const ps = live.pellet.size;
		// `attract` (the hero's mouth, tiles): the dots just ahead lean into it and shrink
		const ax = attract ? attract.x * T : 0;
		const ay = attract ? attract.y * T : 0;
		const ux = attract ? Math.cos(attract.angle) : 0;
		const uy = attract ? Math.sin(attract.angle) : 0;
		for (const p of this.pellets) {
			if (collected(p.c, p.r)) {
				continue;
			}
			let x = p.x;
			let y = p.y;
			let s = ps;
			if (attract) {
				const dx = p.x - ax;
				const dy = p.y - ay;
				const ahead = (dx * ux + dy * uy) / T;
				const side = Math.abs(dx * uy - dy * ux) / T;
				if (ahead > -0.2 && ahead < SUCK_REACH && side < 0.45) {
					const k = 1 - Math.max(0, ahead) / SUCK_REACH;
					const pull = 0.45 * k * k;
					x -= dx * pull;
					y -= dy * pull;
					s *= 1 - 0.35 * k * k;
				}
			}
			ctx.drawImage(pellet, x - s / 2, y - s / 2, s, s);
		}
		const en = live.energizer;
		const enGlow = glowTexture(en.glow);
		const enIm = en.texture();
		for (const o of this.energizers) {
			if (collected(o.c, o.r)) {
				continue;
			}
			const s = 1 + 0.05 * Math.sin(t * 2.6 + o.ph);
			const rot = en.motion === 'spin' ? t * 0.4 : Math.sin(t * 2 + o.ph) * 0.12;
			sprite(ctx, enGlow, o.x, o.y, en.glowSize * s, en.glowSize * s, 0.7, 0, true);
			sprite(ctx, enIm, o.x, o.y, en.size * s, en.size * s, 1, rot);
		}
		ctx.restore();
	}

	/**
	 * The lair gate, as the bake used to paint it: a plank bar between two dark posts with a
	 * flower in the middle. Opening, each half slides into its post and the flower fades.
	 */
	private drawGate(
		ctx: CanvasRenderingContext2D,
		g: { readonly x0: number; readonly x1: number; readonly y: number }
	): void {
		const o = this.gateOpen;
		const mid = (g.x0 + g.x1) / 2;
		const half = (mid - g.x0) * (1 - o);
		for (const [from, dir] of [
			[g.x0, 1],
			[g.x1, -1]
		] as const) {
			const left = dir > 0 ? from : from - half;
			if (half > 0.01) {
				ctx.fillStyle = '#7a5636';
				ctx.fillRect(left, g.y - 5, half, 10);
				ctx.fillStyle = '#a07848';
				for (let i = 0; i < 3; i++) {
					ctx.fillRect(left, g.y - 4 + i * 3.3, half, 1.2);
				}
			}
			ctx.fillStyle = '#4f3622';
			ctx.fillRect(dir > 0 ? from : from - 4, g.y - 6, 4, 12);
		}
		if (o < 1) {
			ctx.save();
			ctx.globalAlpha *= 1 - o;
			const r = 2.6;
			ctx.fillStyle = '#d9333a';
			for (let k = 0; k < 5; k++) {
				const a = k * 1.2566 + 0.3;
				ctx.beginPath();
				ctx.arc(mid + Math.cos(a) * r * 0.7, g.y - 5 + Math.sin(a) * r * 0.7, r * 0.6, 0, 7);
				ctx.fill();
			}
			ctx.fillStyle = '#ffffff';
			ctx.beginPath();
			ctx.arc(mid, g.y - 5, r * 0.38, 0, 7);
			ctx.fill();
			ctx.restore();
		}
	}

	/**
	 * What stays live over the baked world, under the actors: on High the drifting mist and
	 * the stack's light (two small maps); at night the local lights.
	 */
	drawMood(ctx: CanvasRenderingContext2D): void {
		const t = this.t;
		ctx.save();
		const flags = this.debugFlags;
		const showNight = (!flags || flags.night) && this.nightV > 0.002;
		if ((!flags || flags.atmosphere) && this.quality === 'high') {
			this.liveMood.draw(ctx, this.vw, this.vh, this.paintLive);
		}
		if (showNight) {
			ctx.globalAlpha = 1;
			ctx.globalCompositeOperation = 'source-over';
			ctx.save();
			ctx.translate(this.wx, this.wy);
			ctx.scale(this.sc, this.sc);
			for (const g of this.lights) {
				const a =
					this.nightV *
					g.a *
					(g.flicker ? 0.88 + 0.12 * Math.sin(t * 7 + g.x) : 1) *
					(1 - this.vignetteAt(this.wx + g.x * this.sc, this.wy + g.y * this.sc));
				sprite(ctx, glowTexture(g.tint), g.x, g.y, 2 * g.r, 2 * g.r, a, 0, true);
			}
			ctx.restore();
		}
		ctx.restore();
	}

	/**
	 * How much the vignette darkens the screen point (x, y), 0..1. The vignette lies in the
	 * baked background, under the lights and the weather it used to cover: they take its
	 * darkening from here.
	 */
	private vignetteAt(x: number, y: number): number {
		const flags = this.debugFlags;
		if ((flags && !flags.vignette) || this.vw <= 0 || this.vh <= 0) {
			return 0;
		}
		const n = VIGNETTE_CELLS;
		if (!this.vignetteAlpha) {
			const cv = document.createElement('canvas');
			cv.width = n;
			cv.height = n;
			const c = cv.getContext('2d', { willReadFrequently: true });
			if (!c) {
				return 0;
			}
			c.drawImage(this.theme.live.vignette(), 0, 0, n, n);
			const px = c.getImageData(0, 0, n, n).data;
			const alpha = new Uint8ClampedArray(n * n);
			for (let i = 0; i < alpha.length; i++) {
				alpha[i] = px[i * 4 + 3]!;
			}
			this.vignetteAlpha = alpha;
		}
		const col = Math.min(n - 1, Math.max(0, Math.floor((x / this.vw) * n)));
		const row = Math.min(n - 1, Math.max(0, Math.floor((y / this.vh) * n)));
		return this.vignetteAlpha[row * n + col]! / 255;
	}

	/** The night tint multiplied into the atmosphere's shade map (no screen pass of its own). */
	private readonly paintNightShade = (ctx: CanvasRenderingContext2D): void => {
		const live = this.theme.live;
		if (this.nightV <= 0.002) {
			return;
		}
		ctx.save();
		ctx.globalAlpha = live.nightAlpha * this.nightV;
		ctx.globalCompositeOperation = 'multiply';
		ctx.fillStyle = live.nightTint;
		ctx.fillRect(0, 0, this.vw, this.vh);
		ctx.restore();
	};

	/**
	 * The atmosphere that holds still, the one baked into the background. Below High it is the
	 * whole stack, with the mist and the rays standing where they are. On High it is only what
	 * covers (wash, storm tint, vignette): the mist and all the light are `paintLive`'s.
	 */
	private readonly paintStill = (ctx: CanvasRenderingContext2D, additive: boolean): void => {
		if (this.quality === 'high') {
			this.paintLayers(ctx, false, false, true, 0);
		} else {
			this.paintLayers(ctx, additive, true, true, 0);
		}
	};

	/** High's live stack: the mist's cover, or (`additive`) the light of every layer. */
	private readonly paintLive = (ctx: CanvasRenderingContext2D, additive: boolean): void => {
		this.paintLayers(ctx, additive, true, additive, this.t);
	};

	/**
	 * The atmosphere's layers in screen space, bottom to top: the mist and (`additive`) the sun
	 * rays when `moving`, the light when `additive`, then the wash, the storm tint and the
	 * vignette when `cover`.
	 */
	private paintLayers(
		ctx: CanvasRenderingContext2D,
		additive: boolean,
		moving: boolean,
		cover: boolean,
		rayTime: number
	): void {
		const live = this.theme.live;
		const vw = this.vw;
		const vh = this.vh;
		if (moving) {
			const fog = live.fog();
			const mistA = live.mistAlpha(this.stormV);
			for (const f of this.mist) {
				sprite(ctx, fog, f.x, f.y, f.w, f.h, mistA);
			}
		}
		if (additive) {
			if (moving) {
				for (let i = 0; i < 2; i++) {
					const a = live.rays(rayTime, i, this.stormV, this.nightV);
					if (a > 0.003) {
						const w = 70 * (1.6 + i);
						const h = vh * 1.6;
						ctx.save();
						ctx.translate(vw * (0.1 + i * 0.22), -20);
						ctx.rotate(-0.5);
						ctx.globalAlpha = Math.min(1, a);
						ctx.globalCompositeOperation = 'lighter';
						ctx.drawImage(rayTexture(), -w / 2, 0, w, h);
						ctx.restore();
					}
				}
			}
			const W = Math.max(vw, vh) * 1.5;
			ctx.globalAlpha = Math.min(1, live.litAlpha(this.stormV, this.nightV));
			ctx.globalCompositeOperation = 'lighter';
			ctx.drawImage(live.lit(), 0, 0, W, W);
		}
		if (!cover) {
			return;
		}
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
		ctx.drawImage(live.wash(), 0, 0, vw, vh);
		if (this.stormV > 0.002) {
			ctx.globalAlpha = live.stormAlpha * this.stormV;
			ctx.fillStyle = live.stormTint;
			ctx.fillRect(0, 0, vw, vh);
			ctx.globalAlpha = 1;
		}
		const flags = this.debugFlags;
		if (!flags || flags.vignette) {
			ctx.drawImage(live.vignette(), 0, 0, vw, vh);
		}
	}

	/** Screen-space layer over the actors: the weather particles. */
	drawOverlay(ctx: CanvasRenderingContext2D): void {
		const live = this.theme.live;
		ctx.save();
		const flags = this.debugFlags;
		if ((!flags || flags.weather) && this.stormV > 0.02) {
			for (const p of this.weather) {
				const a = live.weather.alpha(p, this.stormV) * (1 - this.vignetteAt(p.px, p.py));
				sprite(ctx, p.im, p.px, p.py, p.w, p.h, a, p.rot, p.add);
			}
		}
		ctx.restore();
	}

	private rebake(): void {
		this.rebakeAt = 0;
		// the baked copy was made from the old background
		this.litKey = '';
		this.bakeKey = '';
		const m = 2 * T;
		const bx = -this.wx / this.sc - m;
		const by = -this.wy / this.sc - m;
		const bw = this.vw / this.sc + 2 * m;
		const bh = this.vh / this.sc + 2 * m;
		let RS = this.sc * this.dpr;
		while (RS * RS * bw * bh > 1.3e7) {
			RS *= 0.92;
		}
		this.bg = bakeMeadow(this.S, this.theme.bake, bx, by, bw, bh, RS);
		this.bgX = bx;
		this.bgY = by;
		this.bgRS = RS;
	}
}
