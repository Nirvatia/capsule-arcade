// What moves in the flesh hell (the owner's accepted scene): a slow heartbeat (about 2.5 s)
// drives the glow of the wounds in the walls, the lair's heart, the light pouring out of the
// rifts and the swelling of the cysts; blood runs along the veins in time with it and the pools
// ripple. The baked layers come from `fleshBake`; everything here is drawn in the scene's own
// units, so the caller maps the scene onto the screen first.
import type { FleshBake } from './fleshBake';
import { FRAME, SCENE_TILE } from './fleshBake';
import { context, makeCanvas, veinAt } from './fleshNoise';

/** The heartbeat, 0..~1.2: a strong beat and a weaker one after it, 2.5 s apart. */
export function heartbeat(t: number): number {
	const ph = (t * 0.4) % 1;
	return Math.exp(-Math.pow(ph / 0.07, 2)) + 0.65 * Math.exp(-Math.pow((ph - 0.2) / 0.08, 2));
}

const sprites = new Map<string, HTMLCanvasElement>();

/** A soft round glow in one colour, 48 px, cached. */
function glowSprite(color: string): HTMLCanvasElement {
	let c = sprites.get(color);
	if (!c) {
		c = makeCanvas(48, 48);
		const x = context(c);
		const g = x.createRadialGradient(24, 24, 0, 24, 24, 24);
		g.addColorStop(0, `rgba(${color},1)`);
		g.addColorStop(0.3, `rgba(${color},0.45)`);
		g.addColorStop(1, `rgba(${color},0)`);
		x.fillStyle = g;
		x.fillRect(0, 0, 48, 48);
		sprites.set(color, c);
	}
	return c;
}

const GLOW = '255,74,50';
const HOT = '255,176,106';

export class FleshLive {
	constructor(private readonly bake: FleshBake) {}

	/**
	 * Draws the scene, in scene units. `view` is the part of the scene on screen: only that part
	 * of the big ground is drawn.
	 */
	draw(
		ctx: CanvasRenderingContext2D,
		t: number,
		view: { readonly x: number; readonly y: number; readonly w: number; readonly h: number }
	): void {
		const b = this.bake;
		const beat = heartbeat(t);
		const T = SCENE_TILE;
		ctx.save();
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
		const gx0 = Math.max(FRAME.x0, Math.floor(view.x));
		const gy0 = Math.max(FRAME.y0, Math.floor(view.y));
		const gx1 = Math.min(FRAME.x0 + FRAME.w, Math.ceil(view.x + view.w));
		const gy1 = Math.min(FRAME.y0 + FRAME.h, Math.ceil(view.y + view.h));
		if (gx1 > gx0 && gy1 > gy0) {
			ctx.drawImage(
				b.ground,
				gx0 - FRAME.x0,
				gy0 - FRAME.y0,
				gx1 - gx0,
				gy1 - gy0,
				gx0,
				gy0,
				gx1 - gx0,
				gy1 - gy0
			);
		}

		// blood runs along the veins in time with the heart
		ctx.globalCompositeOperation = 'lighter';
		for (const v of b.veins) {
			const d = (t * 14 + v.ph * v.len) % v.len;
			const p = veinAt(v, d);
			const sz = (10 + v.w * 2.4) * (1 + 0.5 * beat);
			ctx.globalAlpha = 0.14 + 0.28 * Math.min(1, beat + 0.25);
			ctx.drawImage(glowSprite(GLOW), p[0] - sz / 2, p[1] - sz / 2, sz, sz);
		}
		ctx.globalCompositeOperation = 'source-over';
		// ripples on the pools of blood
		ctx.strokeStyle = 'rgba(230,110,110,1)';
		ctx.lineWidth = 1.5;
		for (const p of b.pools) {
			const u = (t * 0.1 + p.ph * 0.1) % 1;
			ctx.globalAlpha = 0.35 * (1 - u);
			ctx.beginPath();
			ctx.ellipse(p.x, p.y, p.r * 1.2 * u, p.r * 0.9 * u, 0, 0, 7);
			ctx.stroke();
		}
		ctx.globalAlpha = 1;
		// the cysts breathe, and glow a little with the beat
		for (const c of b.cysts) {
			const k = 1 + 0.02 * beat + 0.005 * Math.sin(t * 0.5 + c.ph);
			const s = c.sprite.width * k;
			ctx.drawImage(c.sprite, c.x - s / 2, c.y - s / 2, s, s);
		}
		ctx.globalCompositeOperation = 'lighter';
		for (const c of b.cysts) {
			const sz = c.r * (1.6 + 0.5 * beat);
			ctx.globalAlpha = 0.16 + 0.28 * Math.min(1, beat);
			ctx.drawImage(glowSprite(GLOW), c.x - sz, c.y - sz, sz * 2, sz * 2);
		}
		ctx.globalCompositeOperation = 'source-over';
		ctx.globalAlpha = 1;

		// the maze: corridors, rifts, walls
		ctx.drawImage(b.maze, b.local.x, b.local.y);

		// the wounds and the lair's heart glow with the beat
		ctx.globalCompositeOperation = 'lighter';
		ctx.globalAlpha = 0.55 + 0.45 * Math.min(1, beat + 0.2);
		ctx.drawImage(b.emis, b.local.x, b.local.y);
		ctx.globalAlpha = 0.4 + 0.4 * Math.min(1, beat);
		ctx.drawImage(b.glow, b.local.x, b.local.y);
		const lr = T * (3.2 + 0.7 * beat);
		const hg = ctx.createRadialGradient(b.lair.x, b.lair.y, 0, b.lair.x, b.lair.y, lr);
		hg.addColorStop(0, 'rgba(255,90,60,.85)');
		hg.addColorStop(0.5, 'rgba(210,40,40,.35)');
		hg.addColorStop(1, 'rgba(160,10,20,0)');
		ctx.globalAlpha = 0.55 + 0.45 * Math.min(1, beat + 0.25);
		ctx.fillStyle = hg;
		ctx.fillRect(b.lair.x - lr, b.lair.y - lr, lr * 2, lr * 2);

		// the rifts: light pours out of the seam and breathes with the heart
		for (const rf of b.rifts) {
			const sz = T * (1.8 + 0.25 * beat);
			ctx.globalAlpha = 0.3 + 0.22 * Math.min(1, beat + 0.3);
			ctx.drawImage(glowSprite(HOT), rf.cx - sz / 2, rf.cy - sz / 2, sz, sz);
			ctx.save();
			ctx.beginPath();
			rf.inner.forEach((q, ii) => (ii ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
			ctx.closePath();
			ctx.clip();
			const gg = ctx.createLinearGradient(rf.cx - T * 0.2, 0, rf.cx + T * 0.2, 0);
			gg.addColorStop(0, 'rgba(200,50,30,.85)');
			gg.addColorStop(0.5, `rgba(255,225,170,${0.75 + 0.2 * Math.min(1, beat + 0.25)})`);
			gg.addColorStop(1, 'rgba(200,50,30,.85)');
			ctx.globalAlpha = 1;
			ctx.fillStyle = gg;
			ctx.fillRect(rf.cx - T * 0.3, rf.cy - rf.h, T * 0.6, rf.h * 2);
			ctx.restore();
		}
		for (const p of b.pads) {
			const sz = T * (1.3 + 0.3 * beat);
			ctx.globalAlpha = 0.28;
			ctx.drawImage(glowSprite(GLOW), p.cx - sz / 2, p.cy - sz / 2, sz, sz);
		}
		ctx.restore();
	}
}
