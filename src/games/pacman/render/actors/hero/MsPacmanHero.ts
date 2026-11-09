// Ms. Pac-Man, the heroine: the owner's "Maho-shoujo" mock-up (anime direction). A pink
// cartoon heroine, cel-shaded like Pac-Man (hard tone bands, ink heavier in the shadow): a big
// glossy eye with a gradient iris, an ink wing on the lid, lashes and a brow; blush strokes,
// red lipstick on the ends of the lips and a little fang; a big scarlet polka-dot bow on a
// spring, with a flower on its knot that carries the season. Behind her: two outlined ribbons
// (the season's and a pink one), petals, dust and manga twinkles. Powered, the bow glows, rose-
// gold ki flames open behind her, the brow lifts and the highlight turns to a star. The
// machinery (acting, bites, spring, energizer beat) is the shared Hero.
import type { HeroDesign, MouthInside, Palette, Particle, ParticleKind } from './Hero';
import { Hero, Spring, css, glow, mix } from './Hero';
import { SEASON_LOOKS } from './heroSeasons';
import type { HeroSeason, RGB } from './heroSeasons';
import {
	drawKiFlames,
	drawSeasonParticle,
	drawStarGlint,
	particleLift,
	particleSize,
	starPath
} from './heroFx';

const CALM: Palette = {
	light: [238, 156, 206],
	mid: [226, 86, 162],
	shadow: [174, 38, 110],
	deep: [110, 20, 70],
	bounce: [224, 144, 198],
	ink: [46, 6, 26],
	highlight: [255, 255, 255],
	rim: [255, 222, 242]
};
const AWOKEN: Palette = {
	light: [238, 228, 238],
	mid: [234, 128, 198],
	shadow: [214, 40, 140],
	deep: [140, 20, 96],
	bounce: [228, 152, 208],
	ink: [46, 6, 26],
	highlight: [255, 255, 255],
	rim: [255, 226, 200]
};

const INSIDE: MouthInside = {
	mid: [104, 12, 48],
	deep: [66, 6, 34],
	tongue: [255, 132, 172],
	tongueLight: [255, 190, 208]
};

const INK: RGB = [46, 6, 26];
const LIPSTICK: RGB = [232, 28, 72];

/** Her bow: on top of the head, a little behind, on the head's outline. */
const BOW_ANGLE = -0.63 * Math.PI;
const BOW_DISTANCE = 0.95;

const bowCache = new Map<string, HTMLCanvasElement>();
const BOW_SPAN = 1.1;

/** The flower on the bow's knot, which carries the season (all around (0, 0)). */
function paintBadge(ctx: CanvasRenderingContext2D, R: number, season: HeroSeason): void {
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';
	const edge: RGB = [120, 30, 60];
	if (season === 'summer') {
		ctx.strokeStyle = css([226, 130, 20]);
		ctx.lineWidth = R * 0.05;
		ctx.beginPath();
		for (let i = 0; i < 8; i++) {
			const a = (i / 8) * Math.PI * 2;
			ctx.moveTo(Math.cos(a) * R * 0.11, Math.sin(a) * R * 0.11);
			ctx.lineTo(Math.cos(a) * R * 0.19, Math.sin(a) * R * 0.19);
		}
		ctx.stroke();
		ctx.fillStyle = css([255, 212, 50]);
		ctx.strokeStyle = css([190, 100, 10]);
		ctx.lineWidth = R * 0.03;
		ctx.beginPath();
		ctx.arc(0, 0, R * 0.12, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();
	} else if (season === 'autumn' || season === 'hell') {
		ctx.fillStyle = css(season === 'hell' ? [255, 150, 60] : [244, 124, 40]);
		ctx.strokeStyle = css([130, 52, 14]);
		ctx.lineWidth = R * 0.035;
		ctx.beginPath();
		for (let i = 0; i < 10; i++) {
			const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
			const r = i % 2 === 0 ? R * 0.2 : R * 0.09;
			ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
		}
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
	} else if (season === 'winter') {
		ctx.strokeStyle = css([120, 176, 232]);
		ctx.lineWidth = R * 0.05;
		ctx.beginPath();
		for (let i = 0; i < 3; i++) {
			const a = (i / 3) * Math.PI;
			ctx.moveTo(Math.cos(a) * R * 0.2, Math.sin(a) * R * 0.2);
			ctx.lineTo(-Math.cos(a) * R * 0.2, -Math.sin(a) * R * 0.2);
		}
		ctx.stroke();
		ctx.fillStyle = css([240, 248, 255]);
		ctx.beginPath();
		ctx.arc(0, 0, R * 0.07, 0, Math.PI * 2);
		ctx.fill();
	} else {
		// spring: a five-petal blossom with a yellow heart
		ctx.fillStyle = css([255, 238, 244]);
		ctx.strokeStyle = css(edge, 0.9);
		ctx.lineWidth = R * 0.025;
		for (let i = 0; i < 5; i++) {
			const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
			ctx.beginPath();
			ctx.ellipse(
				Math.cos(a) * R * 0.11,
				Math.sin(a) * R * 0.11,
				R * 0.085,
				R * 0.075,
				a,
				0,
				Math.PI * 2
			);
			ctx.fill();
			ctx.stroke();
		}
		ctx.fillStyle = css([255, 208, 40]);
		ctx.beginPath();
		ctx.arc(0, 0, R * 0.05, 0, Math.PI * 2);
		ctx.fill();
	}
}

/**
 * The bow painted once per size and season: two rounded loops and two tails round a knot,
 * ink round everything (heavier away from the light), a crisp darker shape away from the
 * light, a pale highlight along each loop, white polka dots, a fold mark on each loop and
 * the season's flower on the knot. Its own frame: the knot at the centre, up (-y) pointing
 * away from her head.
 */
function paintedBow(deviceR: number, season: HeroSeason): HTMLCanvasElement {
	const R = Math.max(4, Math.round(deviceR));
	const key = `${R}:${season}`;
	let c = bowCache.get(key);
	if (c) return c;
	if (bowCache.size > 60) bowCache.clear();
	const lx = -0.45;
	const ly = -0.85;
	c = document.createElement('canvas');
	c.width = c.height = Math.ceil(R * BOW_SPAN * 2);
	const ctx = c.getContext('2d') as CanvasRenderingContext2D;
	ctx.translate(c.width / 2, c.height / 2);
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';
	const base: RGB = [236, 28, 70];
	const shade: RGB = [164, 8, 48];
	const tailC: RGB = [214, 20, 60];
	const loop = (side: number) => {
		// a rounded teardrop from the knot, out to the side and a little up
		const ux = Math.cos(-0.22 * side) * side;
		const uy = Math.sin(-0.22 * side) * side * side;
		const px = -uy;
		const py = ux;
		const len = R * 0.62;
		const wid = R * 0.3;
		const ex = ux * len;
		const ey = uy * len - R * 0.06;
		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.bezierCurveTo(
			ux * len * 0.25 + px * wid * 1.1,
			uy * len * 0.25 + py * wid * 1.1,
			ex + px * wid * 1.05,
			ey + py * wid * 1.05,
			ex + ux * R * 0.06,
			ey + uy * R * 0.06
		);
		ctx.bezierCurveTo(
			ex - px * wid * 1.05,
			ey - py * wid * 1.05,
			ux * len * 0.25 - px * wid * 1.1,
			uy * len * 0.25 - py * wid * 1.1,
			0,
			0
		);
		ctx.closePath();
	};
	const tail = (side: number) => {
		ctx.beginPath();
		ctx.moveTo(-R * 0.05 * side, R * 0.04);
		ctx.lineTo(R * 0.24 * side, R * 0.52);
		ctx.lineTo(R * 0.14 * side, R * 0.46);
		ctx.lineTo(R * 0.05 * side, R * 0.54);
		ctx.lineTo(R * 0.05 * side, R * 0.04);
		ctx.closePath();
	};
	const parts = [() => tail(-1), () => tail(1), () => loop(-1), () => loop(1)];
	// ink, heavier on the side away from the light
	ctx.save();
	ctx.translate(-lx * R * 0.03, -ly * R * 0.03);
	ctx.fillStyle = css(INK);
	ctx.strokeStyle = css(INK);
	for (const [i, part] of parts.entries()) {
		ctx.lineWidth = i < 2 ? R * 0.05 : R * 0.1;
		part();
		ctx.fill();
		ctx.stroke();
	}
	ctx.restore();
	for (const [i, part] of parts.entries()) {
		part();
		ctx.fillStyle = css(i < 2 ? tailC : base);
		ctx.fill();
		// the darker shape: the part shifted towards the light, cut out of a shaded copy
		ctx.save();
		part();
		ctx.clip();
		ctx.beginPath();
		ctx.rect(-R * 2, -R * 2, R * 4, R * 4);
		ctx.save();
		ctx.translate(lx * R * 0.1, ly * R * 0.1);
		part();
		ctx.restore();
		ctx.fillStyle = css(shade, 0.85);
		ctx.fill('evenodd');
		ctx.restore();
	}
	// a pale highlight along the top of each loop
	ctx.strokeStyle = 'rgba(255,170,190,0.9)';
	ctx.lineWidth = R * 0.05;
	for (const side of [-1, 1]) {
		ctx.beginPath();
		ctx.moveTo(side * R * 0.2 + lx * R * 0.05, -R * 0.2 + ly * R * 0.05);
		ctx.quadraticCurveTo(side * R * 0.42, -R * 0.34, side * R * 0.58, -R * 0.2);
		ctx.stroke();
	}
	// polka dots
	ctx.fillStyle = 'rgba(255,255,255,0.95)';
	for (const side of [-1, 1]) {
		for (const [dx, dy, r] of [
			[0.36, -0.18, 0.05],
			[0.54, 0.0, 0.04],
			[0.3, 0.1, 0.03]
		] as const) {
			ctx.beginPath();
			ctx.arc(side * R * dx, R * dy, R * r, 0, Math.PI * 2);
			ctx.fill();
		}
	}
	// a fold mark on each loop: a short ink stroke ending in a dot
	ctx.strokeStyle = css(INK);
	ctx.fillStyle = css(INK);
	ctx.lineWidth = R * 0.035;
	for (const side of [-1, 1]) {
		ctx.beginPath();
		ctx.moveTo(side * R * 0.18, R * 0.02);
		ctx.lineTo(side * R * 0.32, -R * 0.02);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(side * R * 0.32, -R * 0.02, R * 0.03, 0, Math.PI * 2);
		ctx.fill();
	}
	paintBadge(ctx, R, season);
	bowCache.set(key, c);
	return c;
}

const DESIGN: HeroDesign = {
	id: 'ms-pacman',
	calm: CALM,
	awoken: AWOKEN,
	hinge: 0.08,
	inside: INSIDE,
	// a wide mouth like his, a little less: fully open about 80 degrees
	mouthSpan: 0.7,
	grinRest: 0.1,
	grinRun: 0.04,
	chompRate: 4.8,
	flare: [255, 214, 236],
	death: 'spin'
};

/** The pink ribbon behind her, calm and powered. */
const RIBBON_PINK: RGB = [255, 174, 210];
const RIBBON_PINK_HOT: RGB = [255, 150, 190];
const RIBBON_GOLD: RGB = [255, 206, 64];

export class MsPacmanHero extends Hero {
	protected readonly design = DESIGN;
	/** The bow's sway, radians, on a soft spring. */
	private readonly bow = new Spring(0);
	/** Seconds into a blink, or -1; the next blink is due at `nextBlink`. */
	private blink = -1;
	private nextBlink = 1.8;
	private blinks = 0;
	/** A happy squint after a bite, 1 → 0. */
	private squint = 0;

	protected resetLooks(): void {
		this.bow.value = 0;
		this.bow.velocity = 0;
	}

	protected onBite(): void {
		this.bow.velocity += 3.2;
		this.squint = 1;
	}

	protected onTurn(): void {
		this.bow.velocity += this.random() < 0.5 ? 4.5 : -4.5;
	}

	protected afterUpdate(dt: number): void {
		this.bow.step(0.07 * Math.sin(this.time * 2.1), dt, 90, 7);
		this.squint = Math.max(0, this.squint - dt / 0.35);
		if (this.blink >= 0) {
			this.blink += dt;
			if (this.blink > 0.14) this.blink = -1;
		} else if (this.time > this.nextBlink) {
			this.blink = 0;
			this.blinks += 1;
			// irregular, like a living thing; now and then a double blink
			this.nextBlink = this.time + (this.blinks % 4 === 0 ? 0.3 : 2.2 + (this.blinks % 3) * 1.1);
		}
	}

	/** Two outlined ribbons from the nape, the season's and a pink one, swaying and streaming. */
	protected drawStreaks(ctx: CanvasRenderingContext2D, R: number, run: number, p: number): void {
		if (run < 0.02) return;
		const look = SEASON_LOOKS[this.season];
		const t = this.time;
		const ribbon = (
			y0: number,
			len: number,
			w0: number,
			amp: number,
			phase: number,
			lift: number,
			fill: RGB
		) => {
			const n = 16;
			const x0 = -Math.sqrt(Math.max(0, 1 - y0 * y0)) * R * 0.85;
			const top: Array<[number, number]> = [];
			const bottom: Array<[number, number]> = [];
			for (let i = 0; i <= n; i++) {
				const s = i / n;
				const x = x0 - s * len * R * run;
				const y = y0 * R + lift * s * s * R + amp * R * Math.sin(t * 5 - s * 5 + phase) * s;
				const w = w0 * R * Math.pow(1 - s, 0.9) * 0.5;
				top.push([x, y - w]);
				bottom.push([x, y + w]);
			}
			ctx.beginPath();
			top.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
			for (let i = n; i >= 0; i--) ctx.lineTo(bottom[i][0], bottom[i][1]);
			ctx.closePath();
			ctx.fillStyle = css(fill, 0.97);
			ctx.fill();
			ctx.strokeStyle = css(INK, 0.9);
			ctx.lineWidth = Math.max(1, R * 0.03);
			ctx.lineJoin = 'round';
			ctx.stroke();
		};
		ribbon(-0.38, 3.0, 0.32, 0.22, 0, -0.5, mix(look.line, RIBBON_GOLD, p));
		ribbon(0.12, 2.5, 0.22, 0.2, 2.2, 0.35, mix(RIBBON_PINK, RIBBON_PINK_HOT, p));
	}

	/** Rose-gold ink-outlined ki flames round the back of the body while she is powered. */
	protected drawBehind(ctx: CanvasRenderingContext2D, R: number, k: number): void {
		drawKiFlames(ctx, R, k, this.time, {
			outer: [255, 140, 176],
			inner: [255, 224, 120],
			ink: INK
		});
	}

	/** Blush: three short slanted strokes on the cheek. */
	private drawBlush(ctx: CanvasRenderingContext2D, R: number, ex: number, ey: number): void {
		ctx.strokeStyle = css([232, 64, 112], 0.9);
		ctx.lineWidth = Math.max(0.8, R * 0.026);
		ctx.lineCap = 'round';
		ctx.beginPath();
		for (let i = -1; i <= 1; i++) {
			const x = ex - R * 0.3 + i * R * 0.055;
			const y = ey + R * 0.3;
			ctx.moveTo(x - R * 0.03, y + R * 0.04);
			ctx.lineTo(x + R * 0.03, y - R * 0.04);
		}
		ctx.stroke();
	}

	/**
	 * Her eye, in profile above the mouth, drawn the anime way: a white with a big gradient
	 * iris, a dark pupil with two glints, a thick ink lid that flares into a wing, a lash and
	 * a brow above. It blinks, squints happily after a bite, lifts the brow and puts a star in
	 * its glint when she is powered, and stays shut while she dies.
	 */
	private drawEye(ctx: CanvasRenderingContext2D, R: number, p: number): void {
		// above the upper lip even with the mouth wide open, clear of the bow; at tile size
		// (a small radius) the eye grows a little so it still reads
		const lod = R < 20 ? 1.25 : 1;
		const ex = R * 0.28;
		const ey = -R * (0.43 + (lod - 1) * 0.12);
		const rx = R * 0.17 * lod;
		const ry = R * 0.235 * lod;
		const ink = css(INK);
		const raise = R * 0.05 * p;
		const blinkShut = this.blink >= 0 ? Math.sin((this.blink / 0.14) * Math.PI) : 0;
		const shut = this.dying >= 0 ? 1 : Math.max(blinkShut, this.squint > 0.05 ? 1 : 0);
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		this.drawBlush(ctx, R, ex, ey);
		// the brow: an arc with a little flick, lifted when she is powered
		ctx.strokeStyle = ink;
		ctx.lineWidth = R * 0.05;
		ctx.beginPath();
		ctx.moveTo(ex - rx * 0.9, ey - ry * 1.3 - raise);
		ctx.quadraticCurveTo(
			ex + rx * 0.1,
			ey - ry * 1.62 - raise,
			ex + rx * 1.05,
			ey - ry * 1.3 - raise * 1.5
		);
		ctx.stroke();
		if (shut > 0.85) {
			// closed: a happy arc (squint) or a soft smiling line (blink, dying)
			const happy = this.squint > 0.05 && this.dying < 0;
			ctx.strokeStyle = ink;
			ctx.lineWidth = R * 0.075;
			ctx.beginPath();
			if (happy) ctx.arc(ex, ey + ry * 0.4, rx * 1.15, Math.PI * 1.12, Math.PI * 1.88);
			else ctx.arc(ex, ey - ry * 0.4, rx * 1.15, Math.PI * 0.2, Math.PI * 0.8);
			ctx.stroke();
			this.lashes(ctx, ex - rx * 0.95, happy ? ey - ry * 0.2 : ey + ry * 0.35, rx, R);
			return;
		}
		const open = Math.max(0.12, 1 - shut);
		ctx.save();
		ctx.translate(ex, ey);
		ctx.scale(1, open);
		// the white, then the iris and the pupil inside it
		ctx.fillStyle = css([255, 250, 252]);
		ctx.beginPath();
		ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.save();
		ctx.beginPath();
		ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
		ctx.clip();
		const g = ctx.createLinearGradient(0, -ry, 0, ry);
		g.addColorStop(0, css([56, 18, 98]));
		g.addColorStop(0.55, css([128, 48, 168]));
		g.addColorStop(1, css([214, 96, 206]));
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.ellipse(rx * 0.2, ry * 0.04, rx * 0.8, ry * 0.95, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = css([34, 8, 44]);
		ctx.beginPath();
		ctx.ellipse(rx * 0.26, ry * 0.02, rx * 0.4, ry * 0.5, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
		// glints: a big one (a star when powered) and a small one
		ctx.fillStyle = 'rgba(255,255,255,1)';
		if (p > 0.3) {
			starPath(ctx, rx * 0.14, -ry * 0.3, rx * 0.5, rx * 0.12);
		} else {
			ctx.beginPath();
			ctx.arc(rx * 0.14, -ry * 0.3, rx * 0.28, 0, Math.PI * 2);
		}
		ctx.fill();
		ctx.beginPath();
		ctx.arc(rx * 0.5, ry * 0.36, rx * 0.13, 0, Math.PI * 2);
		ctx.fill();
		// the eye's outline
		ctx.strokeStyle = ink;
		ctx.lineWidth = R * 0.035;
		ctx.beginPath();
		ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
		ctx.stroke();
		ctx.restore();
		// the thick upper lid, flaring into a wing towards the front
		ctx.strokeStyle = ink;
		ctx.lineWidth = R * 0.07;
		ctx.beginPath();
		ctx.ellipse(ex, ey, rx * 1.02, ry * open * 1.02, 0, Math.PI * 1.02, Math.PI * 1.98);
		ctx.stroke();
		ctx.fillStyle = ink;
		const top = ey - ry * open * 0.9;
		ctx.beginPath();
		ctx.moveTo(ex + rx * 0.3, top);
		ctx.quadraticCurveTo(ex + rx * 1.2, top - ry * 0.05, ex + rx * 1.95, ey - ry * 0.4);
		ctx.quadraticCurveTo(ex + rx * 1.35, ey - ry * 0.5 * open, ex + rx * 1.0, ey - ry * 0.12);
		ctx.closePath();
		ctx.fill();
		this.lashes(ctx, ex - rx * 0.95, ey - ry * open * 0.35, rx, R);
	}

	/** A lash curling out at the back corner of the eye, and a second shorter one. */
	private lashes(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, R: number): void {
		ctx.strokeStyle = css(INK);
		ctx.lineWidth = R * 0.05;
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.quadraticCurveTo(x - rx * 0.5, y - rx * 0.1, x - rx * 0.8, y - rx * 0.6);
		ctx.moveTo(x + rx * 0.15, y - rx * 0.35);
		ctx.quadraticCurveTo(x - rx * 0.2, y - rx * 0.6, x - rx * 0.3, y - rx * 1.05);
		ctx.stroke();
	}

	/**
	 * Red lipstick on the ends of the lips and a little fang on the upper one; the lips
	 * themselves are a thin ink line.
	 */
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
		const hot = this.power;
		ctx.strokeStyle = css(mix(LIPSTICK, [244, 52, 120], hot));
		ctx.lineWidth = R * 0.1;
		ctx.lineCap = 'butt';
		const bar = (to: { x: number; y: number }) => {
			const fx = ends.A.x + (to.x - ends.A.x) * 0.72;
			const fy = ends.A.y + (to.y - ends.A.y) * 0.72;
			ctx.beginPath();
			ctx.moveTo(fx, fy);
			ctx.lineTo(ends.A.x + (to.x - ends.A.x) * 0.99, ends.A.y + (to.y - ends.A.y) * 0.99);
			ctx.stroke();
		};
		if (ends.U.y < -R * 0.15) bar(ends.U);
		if (ends.Dn.y > R * 0.15) bar(ends.Dn);
		// the fang, under the upper lip near its end
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
		ctx.lineCap = 'round';
	}

	/** The bow swaying on its spring (glowing when powered), her eye, a star on the highlight. */
	protected drawWorn(
		ctx: CanvasRenderingContext2D,
		R: number,
		p: number,
		lx: number,
		ly: number
	): void {
		const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
		const turn = BOW_ANGLE + Math.PI / 2 + this.bow.value;
		const scale = 1 + 0.1 * p;
		ctx.save();
		ctx.translate(Math.cos(BOW_ANGLE) * R * BOW_DISTANCE, Math.sin(BOW_ANGLE) * R * BOW_DISTANCE);
		if (p > 0.01) {
			// the bow glows: a soft golden halo behind it
			ctx.globalCompositeOperation = 'lighter';
			ctx.globalAlpha = 0.5 * p;
			ctx.drawImage(glow([255, 214, 120]), -R * 1.1, -R * 1.1, R * 2.2, R * 2.2);
			ctx.globalAlpha = 1;
			ctx.globalCompositeOperation = 'source-over';
		}
		ctx.rotate(turn);
		ctx.scale(scale, scale);
		const half = R * BOW_SPAN;
		ctx.drawImage(paintedBow(R * dpr, this.season), -half, -half, half * 2, half * 2);
		ctx.restore();
		// the eye last: on her face, in front of the bow
		this.drawEye(ctx, R, p);
		drawStarGlint(ctx, R, p, lx, ly);
	}

	/** Dust, the season's own things and manga twinkles off the back; hearts and stars on bursts. */
	protected particleFor(moment: 'trail' | 'burst' | 'death'): ParticleKind {
		if (moment === 'trail') {
			const r = this.random();
			return r < 0.3 ? 'dust' : r < 0.65 ? SEASON_LOOKS[this.season].particle : 'star';
		}
		return this.random() < 0.45 ? 'heart' : 'star';
	}

	protected sizeFor(kind: ParticleKind): number {
		return particleSize(kind);
	}

	protected liftFor(kind: ParticleKind): number {
		return particleLift(kind);
	}

	protected drawParticle(ctx: CanvasRenderingContext2D, e: Particle, a: number, s: number): void {
		if (drawSeasonParticle(ctx, e, a, s, this.season)) return;
		ctx.save();
		ctx.translate(e.x, e.y);
		ctx.globalAlpha = a;
		ctx.lineJoin = 'round';
		if (e.kind === 'heart') {
			const h = s * 1.6;
			ctx.fillStyle = 'rgba(255,72,130,1)';
			ctx.strokeStyle = css([120, 20, 60], 0.9);
			ctx.lineWidth = Math.max(0.8, h * 0.18);
			ctx.beginPath();
			ctx.moveTo(0, h * 0.9);
			ctx.bezierCurveTo(-h * 1.3, h * 0.1, -h * 0.9, -h * 1.1, 0, -h * 0.4);
			ctx.bezierCurveTo(h * 0.9, -h * 1.1, h * 1.3, h * 0.1, 0, h * 0.9);
			ctx.fill();
			ctx.stroke();
		} else {
			// a manga twinkle: white (gold when she is powered), thinly outlined
			ctx.rotate(e.spin * (e.max - e.life));
			ctx.fillStyle = this.power > 0.5 ? css([255, 226, 110]) : 'rgba(255,252,255,1)';
			ctx.strokeStyle = css([110, 26, 76], 0.85);
			ctx.lineWidth = Math.max(0.8, s * 0.14);
			starPath(ctx, 0, 0, s * 1.7, s * 0.4);
			ctx.fill();
			ctx.stroke();
		}
		ctx.restore();
		ctx.globalAlpha = 1;
	}
}
