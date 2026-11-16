// The heroes' new forms, built on the game's own hero machinery (`Hero`, `PacmanHero`,
// `MsPacmanHero`): the same cel body, light, rim, acting, burst and trail. What changes:
// - the nimble form: a smaller body (the page draws it at 0.33 of a tile, the game's is 0.39)
//   with lighter tone bands (less of the dark "core" that made him read heavy);
// - the rage (the energizer, her overdrive): the body grows to 1.22 (0.40 of a tile), a palette
//   of its own and ONE bold shape that changes the silhouette:
//   1 · shonen × magical girl: his mane of four big flame tongues and a toothed jaw; her bow
//       grown into two wings of light and a star tiara;
//   2 · elements: his molten core (three glowing cracks) and a comet's tail; her crystal facets
//       and a crescent moon behind her.
// Frame space (the hooks): the hero faces +x, the top is -y, units are px (R the body radius).
import { PACMAN_DESIGN, PacmanHero } from '../../../src/games/pacman/render/actors/hero/PacmanHero';
import { MS_DESIGN, MsPacmanHero } from '../../../src/games/pacman/render/actors/hero/MsPacmanHero';
import { css, glow, mix } from '../../../src/games/pacman/render/actors/hero/Hero';
import type { HeroDesign, Palette } from '../../../src/games/pacman/render/actors/hero/Hero';
import type { RGB } from '../../../src/games/pacman/render/actors/hero/heroSeasons';

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;

/** The lighter tone bands of the nimble form (the game's: 0.12, 0.42, 0.92). */
const NIMBLE_BANDS: readonly [number, number, number] = [0.1, 0.3, 0.64];
/** The body in rage against the nimble one: 0.33 → 0.40 of a tile. */
const RAGE_SCALE = 1.22;

const pal = (p: Palette): Palette => p;

// ── palettes ──────────────────────────────────────────────────────────────────────

/** His super form: white gold. */
const SUPER_GOLD = pal({
	light: [255, 252, 226],
	mid: [255, 222, 104],
	shadow: [246, 160, 46],
	deep: [170, 74, 20],
	bounce: [255, 196, 104],
	ink: [44, 16, 8],
	highlight: [255, 255, 255],
	rim: [255, 255, 236]
});
/** Her magical-girl form: pearl rose. */
const PEARL_ROSE = pal({
	light: [255, 242, 250],
	mid: [255, 176, 222],
	shadow: [232, 112, 182],
	deep: [150, 40, 110],
	bounce: [255, 196, 232],
	ink: [52, 8, 32],
	highlight: [255, 255, 255],
	rim: [255, 250, 255]
});
/** His molten core. */
const MOLTEN = pal({
	light: [255, 196, 92],
	mid: [236, 108, 40],
	shadow: [158, 40, 22],
	deep: [78, 16, 10],
	bounce: [255, 124, 44],
	ink: [32, 8, 4],
	highlight: [255, 248, 210],
	rim: [255, 186, 84]
});
/** Her crystal. */
const CRYSTAL = pal({
	light: [255, 236, 248],
	mid: [250, 168, 220],
	shadow: [196, 112, 214],
	deep: [104, 46, 150],
	bounce: [255, 196, 240],
	ink: [46, 12, 56],
	highlight: [255, 255, 255],
	rim: [226, 255, 255]
});

function design(base: HeroDesign, id: string, awoken: Palette, flare: RGB): HeroDesign {
	return { ...base, id, awoken, flare, bands: NIMBLE_BANDS, powerScale: RAGE_SCALE };
}

/** A smooth ink-outlined shape in two tones: the outer colour, an inner tone inset. */
function twoTone(c: Ctx, path: () => void, outer: string, inner: string, ink: string, inkW: number, inset: (c: Ctx) => void): void {
	path();
	c.fillStyle = outer;
	c.fill();
	c.save();
	path();
	c.clip();
	inset(c);
	c.fillStyle = inner;
	c.fill();
	c.restore();
	path();
	c.strokeStyle = ink;
	c.lineWidth = inkW;
	c.lineJoin = 'round';
	c.stroke();
}

// ── 1 · his super form: the flame mane ─────────────────────────────────────────────

/**
 * Four big tongues of flame off his nape and crown, swept back: one bold shape that changes his
 * silhouette (no small parts). Each tongue: an ink-outlined teardrop, gold outside, white-hot
 * inside, its tip swaying. `k` grows them in.
 */
function flameMane(c: Ctx, R: number, k: number, t: number, outer: string, inner: string, ink: string): void {
	if (k <= 0.01) return;
	const tongues: ReadonlyArray<[number, number, number]> = [
		// base angle on the body (frame), length, width (body radii)
		[-1.95, 1.0, 0.62],
		[-2.45, 1.22, 0.7],
		[-2.9, 1.12, 0.66],
		[2.75, 0.82, 0.52]
	];
	const g = glow([255, 190, 60]);
	c.save();
	c.globalCompositeOperation = 'lighter';
	c.globalAlpha = 0.55 * k;
	c.drawImage(g, -R * 2.6, -R * 2.2, R * 3.6, R * 3.6);
	c.restore();
	tongues.forEach(([a, len, wid], i) => {
		const L = R * len * (0.35 + 0.65 * k);
		const W = R * wid * (0.5 + 0.5 * k);
		const sway = Math.sin(t * 9 + i * 1.7) * 0.18 + Math.sin(t * 23 + i) * 0.05;
		// from the body's edge, swept back (towards -x) and a little up
		const bx = Math.cos(a) * R * 0.78;
		const by = Math.sin(a) * R * 0.78;
		// out of the body and swept back: the base direction bent towards -x
		const back = Math.atan2(Math.sin(a) * 0.75, Math.cos(a) - 0.85) + sway;
		const tx = bx + Math.cos(back) * L;
		const ty = by + Math.sin(back) * L;
		const nx = -Math.sin(back);
		const ny = Math.cos(back);
		const path = () => {
			c.beginPath();
			c.moveTo(bx + nx * W * 0.5, by + ny * W * 0.5);
			c.quadraticCurveTo(bx + Math.cos(back) * L * 0.55 + nx * W * 0.62, by + Math.sin(back) * L * 0.55 + ny * W * 0.62, tx, ty);
			c.quadraticCurveTo(bx + Math.cos(back) * L * 0.5 - nx * W * 0.4, by + Math.sin(back) * L * 0.5 - ny * W * 0.4, bx - nx * W * 0.5, by - ny * W * 0.5);
			c.closePath();
		};
		twoTone(c, path, outer, inner, ink, Math.max(1, R * 0.08), (cc) => {
			cc.beginPath();
			cc.moveTo(bx + nx * W * 0.2, by + ny * W * 0.2);
			cc.quadraticCurveTo(bx + Math.cos(back) * L * 0.5 + nx * W * 0.22, by + Math.sin(back) * L * 0.5 + ny * W * 0.22, bx + Math.cos(back) * L * 0.8, by + Math.sin(back) * L * 0.8);
			cc.quadraticCurveTo(bx + Math.cos(back) * L * 0.4 - nx * W * 0.12, by + Math.sin(back) * L * 0.4 - ny * W * 0.12, bx - nx * W * 0.2, by - ny * W * 0.2);
			cc.closePath();
		});
	});
}

/** Big jagged teeth along both lips (in the powered look): the jaw reads as a maw at a tile. */
function teeth(c: Ctx, R: number, A: { x: number; y: number }, U: { x: number; y: number }, Dn: { x: number; y: number }, k: number, ink: string): void {
	if (k < 0.05) return;
	const row = (to: { x: number; y: number }, side: number) => {
		const n = 3;
		for (let i = 0; i < n; i++) {
			const u0 = 0.32 + (i / n) * 0.62;
			const u1 = u0 + 0.62 / n;
			const p0 = { x: A.x + (to.x - A.x) * u0, y: A.y + (to.y - A.y) * u0 };
			const p1 = { x: A.x + (to.x - A.x) * u1, y: A.y + (to.y - A.y) * u1 };
			const len = Math.hypot(to.x - A.x, to.y - A.y) || 1;
			// into the mouth: across the lip, toward the other lip
			const nx = (-(to.y - A.y) / len) * side;
			const ny = ((to.x - A.x) / len) * side;
			const s = R * 0.2 * k;
			c.beginPath();
			c.moveTo(p0.x, p0.y);
			c.lineTo(p1.x, p1.y);
			c.lineTo((p0.x + p1.x) / 2 + nx * s, (p0.y + p1.y) / 2 + ny * s);
			c.closePath();
			c.fillStyle = '#fffbee';
			c.fill();
			c.strokeStyle = ink;
			c.lineWidth = Math.max(0.8, R * 0.035);
			c.lineJoin = 'round';
			c.stroke();
		}
	};
	row(U, -1);
	row(Dn, 1);
}

export class SuperPacman extends PacmanHero {
	protected readonly design: HeroDesign = design(PACMAN_DESIGN, 'pac-super', SUPER_GOLD, [255, 236, 150]);

	protected drawBehind(ctx: Ctx, R: number, k: number): void {
		flameMane(ctx, R, k, this.time, 'rgb(255,168,36)', 'rgb(255,244,170)', css(SUPER_GOLD.ink));
	}

	protected drawLips(ctx: Ctx, lips: () => void, R: number, p: Palette, ends: { A: { x: number; y: number }; U: { x: number; y: number }; Dn: { x: number; y: number } }): void {
		super.drawLips(ctx, lips, R, p, ends);
		teeth(ctx, R, ends.A, ends.U, ends.Dn, Math.max(0, this.power * 2 - 1), css(p.ink));
	}

	/** Electric sparks crawling round him in the powered look. */
	protected drawFront(ctx: Ctx): void {
		const k = Math.max(0, this.power * 2 - 1);
		if (k <= 0) return;
		const R = this.r * this.size.value;
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.lineCap = 'round';
		const frame = Math.floor(this.time * 14);
		for (let i = 0; i < 2; i++) {
			const a0 = ((frame * 0.37 + i * 0.5) % 1) * TAU;
			ctx.beginPath();
			for (let s = 0; s <= 5; s++) {
				const a = a0 + s * 0.16;
				const rr = R * (1.12 + (s % 2 ? 0.12 : 0));
				const x = this.x + Math.cos(a) * rr;
				const y = this.y + Math.sin(a) * rr;
				if (s === 0) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			}
			ctx.strokeStyle = `rgba(255,250,200,${0.9 * k})`;
			ctx.lineWidth = Math.max(1, R * 0.06);
			ctx.stroke();
		}
		ctx.restore();
	}
}

// ── 1 · her magical-girl form: wings of light, a star tiara ───────────────────────

function wings(c: Ctx, R: number, k: number, t: number): void {
	if (k <= 0.01) return;
	const flap = Math.sin(t * 5) * 0.12;
	c.save();
	c.globalCompositeOperation = 'lighter';
	c.globalAlpha = 0.5 * k;
	c.drawImage(glow([255, 170, 230]), -R * 2.8, -R * 2.4, R * 3.6, R * 3.6);
	c.restore();
	// two wings off her back-top: an upper big one and a lower small one, like a butterfly's
	for (const [a, len, wid, ph] of [
		[-2.7, 1.75, 1.2, 0],
		[2.65, 1.2, 0.85, 0.6]
	] as const) {
		const L = R * len * (0.3 + 0.7 * k);
		const W = R * wid * (0.3 + 0.7 * k);
		const ang = a + flap * (ph ? -1 : 1);
		const bx = Math.cos(a) * R * 0.55;
		const by = Math.sin(a) * R * 0.55;
		const ux = Math.cos(ang);
		const uy = Math.sin(ang);
		const nx = -uy;
		const ny = ux;
		const path = () => {
			c.beginPath();
			c.moveTo(bx, by);
			c.bezierCurveTo(bx + ux * L * 0.2 + nx * W, by + uy * L * 0.2 + ny * W, bx + ux * L + nx * W * 0.7, by + uy * L + ny * W * 0.7, bx + ux * L, by + uy * L);
			c.bezierCurveTo(bx + ux * L * 1.05 - nx * W * 0.4, by + uy * L * 1.05 - ny * W * 0.4, bx + ux * L * 0.4 - nx * W * 0.5, by + uy * L * 0.4 - ny * W * 0.5, bx, by);
			c.closePath();
		};
		c.save();
		path();
		const g = c.createLinearGradient(bx, by, bx + ux * L, by + uy * L);
		g.addColorStop(0, `rgba(255,255,255,${k})`);
		g.addColorStop(0.45, `rgba(255,130,214,${k})`);
		g.addColorStop(1, `rgba(170,120,255,${k})`);
		c.fillStyle = g;
		c.fill();
		// one vein of light along the wing
		c.strokeStyle = `rgba(255,255,255,${0.9 * k})`;
		c.lineWidth = Math.max(1, R * 0.06);
		c.beginPath();
		c.moveTo(bx, by);
		c.quadraticCurveTo(bx + ux * L * 0.5 + nx * W * 0.3, by + uy * L * 0.5 + ny * W * 0.3, bx + ux * L * 0.9, by + uy * L * 0.9);
		c.stroke();
		path();
		c.strokeStyle = `rgba(110,20,80,${k})`;
		c.lineWidth = Math.max(1, R * 0.08);
		c.lineJoin = 'round';
		c.stroke();
		c.restore();
	}
}

/** A five-point star, ink-outlined. */
function star(c: Ctx, x: number, y: number, r: number, fill: string, ink: string, inkW: number): void {
	c.beginPath();
	for (let i = 0; i < 10; i++) {
		const a = -Math.PI / 2 + (i * Math.PI) / 5;
		const rr = i % 2 ? r * 0.45 : r;
		if (i === 0) c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
		else c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
	}
	c.closePath();
	c.fillStyle = fill;
	c.fill();
	c.strokeStyle = ink;
	c.lineWidth = inkW;
	c.lineJoin = 'round';
	c.stroke();
}

export class MagicalMs extends MsPacmanHero {
	protected readonly design: HeroDesign = design(MS_DESIGN, 'ms-magical', PEARL_ROSE, [255, 210, 240]);

	protected drawBehind(ctx: Ctx, R: number, k: number): void {
		wings(ctx, R, k, this.time);
	}

	protected drawWorn(ctx: Ctx, R: number, p: number, lx: number, ly: number): void {
		super.drawWorn(ctx, R, p, lx, ly);
		const k = Math.max(0, p * 2 - 1);
		if (k > 0.02) {
			// the tiara: a gold star on her brow, a soft light round it
			const x = R * 0.32;
			const y = -R * 0.86;
			ctx.save();
			ctx.globalCompositeOperation = 'lighter';
			ctx.globalAlpha = 0.7 * k;
			ctx.drawImage(glow([255, 236, 150]), x - R * 0.6, y - R * 0.6, R * 1.2, R * 1.2);
			ctx.restore();
			star(ctx, x, y, R * 0.3 * (0.6 + 0.4 * k), 'rgb(255,226,96)', css(PEARL_ROSE.ink), Math.max(1, R * 0.06));
			star(ctx, x - R * 0.03, y - R * 0.03, R * 0.12 * k, 'rgb(255,255,240)', 'rgba(0,0,0,0)', 0);
		}
	}
}

// ── 2 · his molten core and comet tail ─────────────────────────────────────────────

function cometTail(c: Ctx, R: number, k: number, t: number, hot: [string, string, string]): void {
	if (k <= 0.01) return;
	const L = R * (1.4 + 1.9 * k);
	const W = R * 0.98;
	c.save();
	const path = () => {
		c.beginPath();
		c.moveTo(0, -W);
		const n = 6;
		for (let i = 1; i <= n; i++) {
			const u = i / n;
			const wob = Math.sin(t * 16 + i * 1.3) * R * 0.08 * u;
			c.lineTo(-L * u, -W * (1 - u) * (1 - u * 0.2) + wob - (i % 2 ? R * 0.12 * u : 0));
		}
		for (let i = n; i >= 1; i--) {
			const u = i / n;
			const wob = Math.sin(t * 16 + i * 1.3 + 2) * R * 0.08 * u;
			c.lineTo(-L * u * (i % 2 ? 0.86 : 1), W * (1 - u) * (1 - u * 0.2) + wob);
		}
		c.lineTo(0, W);
		c.closePath();
	};
	path();
	const g = c.createLinearGradient(0, 0, -L, 0);
	g.addColorStop(0, hot[0]);
	g.addColorStop(0.45, hot[1]);
	g.addColorStop(1, hot[2]);
	c.globalAlpha = k;
	c.fillStyle = g;
	c.fill();
	c.strokeStyle = css(MOLTEN.ink, 0.9);
	c.lineWidth = Math.max(1, R * 0.07);
	c.lineJoin = 'round';
	c.stroke();
	c.restore();
}

export class MoltenPacman extends PacmanHero {
	protected readonly design: HeroDesign = design(PACMAN_DESIGN, 'pac-molten', MOLTEN, [255, 180, 80]);

	protected drawBehind(ctx: Ctx, R: number, k: number): void {
		cometTail(ctx, R, k, this.time, ['rgba(255,248,200,1)', 'rgba(255,150,40,.95)', 'rgba(200,40,20,0)']);
	}

	/** Three glowing cracks across the body, pulsing: the core shows through. */
	protected decorate(sc: Ctx, R: number, p: number, k: number): void {
		void k;
		const a = Math.max(0, p * 2 - 1);
		if (a <= 0.01) return;
		const pulse = 0.8 + 0.2 * Math.sin(this.time * 9);
		// two big jagged cracks split the body from the back, and the core shows through them
		const cracks: ReadonlyArray<ReadonlyArray<[number, number]>> = [
			[
				[-1.05, -0.5],
				[-0.78, -0.42],
				[-0.66, -0.62],
				[-0.42, -0.5],
				[-0.3, -0.72],
				[-0.08, -0.6]
			],
			[
				[-1.05, 0.28],
				[-0.8, 0.18],
				[-0.62, 0.36],
				[-0.42, 0.2],
				[-0.24, 0.4]
			]
		];
		sc.lineCap = 'round';
		sc.lineJoin = 'round';
		for (const crack of cracks) {
			const path = () => {
				sc.beginPath();
				crack.forEach(([x, y], i) => (i === 0 ? sc.moveTo(x * R, y * R) : sc.lineTo(x * R, y * R)));
			};
			path();
			sc.strokeStyle = `rgba(255,110,24,${0.45 * a * pulse})`;
			sc.lineWidth = R * 0.42;
			sc.stroke();
			path();
			sc.strokeStyle = `rgba(48,8,4,${a})`;
			sc.lineWidth = R * 0.24;
			sc.lineJoin = 'miter';
			sc.stroke();
			path();
			sc.strokeStyle = `rgba(255,150,40,${a * pulse})`;
			sc.lineWidth = R * 0.15;
			sc.stroke();
			path();
			sc.strokeStyle = `rgba(255,252,220,${a * pulse})`;
			sc.lineWidth = R * 0.065;
			sc.stroke();
			sc.lineJoin = 'round';
		}
	}
}

// ── 2 · her crystal and crescent moon ────────────────────────────────────────────────

function crescent(c: Ctx, R: number, k: number, t: number): void {
	if (k <= 0.01) return;
	const cx = -R * 0.5;
	const cy = -R * 0.42;
	const r = R * (0.75 + 0.3 * k);
	c.save();
	c.rotate(Math.sin(t * 1.5) * 0.05);
	c.globalCompositeOperation = 'lighter';
	c.globalAlpha = 0.45 * k;
	c.drawImage(glow([200, 180, 255]), cx - r * 1.5, cy - r * 1.5, r * 3, r * 3);
	c.globalCompositeOperation = 'source-over';
	c.globalAlpha = k;
	c.beginPath();
	c.arc(cx, cy, r, 0, TAU);
	c.arc(cx + r * 0.5, cy + r * 0.28, r * 0.86, 0, TAU, true);
	const g = c.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
	g.addColorStop(0, '#fffbe6');
	g.addColorStop(0.5, '#ffe28a');
	g.addColorStop(1, '#e8a83a');
	c.fillStyle = g;
	c.fill('evenodd');
	c.strokeStyle = css(CRYSTAL.ink, 0.9);
	c.lineWidth = Math.max(1, R * 0.07);
	c.stroke();
	c.restore();
}

export class CrystalMs extends MsPacmanHero {
	protected readonly design: HeroDesign = design(MS_DESIGN, 'ms-crystal', CRYSTAL, [230, 210, 255]);

	protected drawBehind(ctx: Ctx, R: number, k: number): void {
		crescent(ctx, R, k, this.time);
	}

	/** Big crystal facets over the body: a few straight cuts, alternate faces lit and shaded. */
	protected decorate(sc: Ctx, R: number, p: number, k: number): void {
		super.decorate?.(sc, R, p, k);
		const a = Math.max(0, p * 2 - 1);
		if (a <= 0.01) return;
		const c0 = { x: -R * 0.2, y: -R * 0.15 };
		const rim: ReadonlyArray<number> = [-2.6, -1.6, -0.7, 0.4, 1.5, 2.5];
		for (let i = 0; i < rim.length; i++) {
			const a0 = rim[i] as number;
			const a1 = (rim[(i + 1) % rim.length] as number) + (i === rim.length - 1 ? TAU : 0);
			sc.beginPath();
			sc.moveTo(c0.x, c0.y);
			sc.lineTo(Math.cos(a0) * R * 1.2, Math.sin(a0) * R * 1.2);
			sc.lineTo(Math.cos(a1) * R * 1.2, Math.sin(a1) * R * 1.2);
			sc.closePath();
			sc.fillStyle = i % 2 ? `rgba(255,255,255,${0.22 * a})` : `rgba(90,50,160,${0.16 * a})`;
			sc.fill();
		}
		sc.strokeStyle = `rgba(255,255,255,${0.7 * a})`;
		sc.lineWidth = R * 0.05;
		for (const a0 of rim) {
			sc.beginPath();
			sc.moveTo(c0.x, c0.y);
			sc.lineTo(Math.cos(a0) * R * 1.2, Math.sin(a0) * R * 1.2);
			sc.stroke();
		}
	}
}

/** The nimble form alone (both directions share it): the current heroes, smaller and lighter. */
export class NimblePacman extends PacmanHero {
	protected readonly design: HeroDesign = { ...PACMAN_DESIGN, id: 'pac-nimble', bands: NIMBLE_BANDS, powerScale: RAGE_SCALE };
}
export class NimbleMs extends MsPacmanHero {
	protected readonly design: HeroDesign = { ...MS_DESIGN, id: 'ms-nimble', bands: NIMBLE_BANDS, powerScale: RAGE_SCALE };
}

export { mix };
