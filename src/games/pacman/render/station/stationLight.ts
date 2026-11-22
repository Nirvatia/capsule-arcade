// The station's light map (DESIGN.md §7a, style B): the phase's ambient, the lamps (ceiling lamps
// in power, red emergency lamps in failure, strobes in the nest; most of the ceiling lamps are
// dead), the surround's own light (the tanks, the breach, the dead, the window and its storm),
// the nest's breath, lit flares, and the hero: a halo and the flashlight's cone cast against the
// walls. Painted small every frame and multiplied over the scene by `StationWorld`.
import type { GridLayout } from '../maze/GridView';
import type { Lamp, Phase } from './stationPaint';
import { MX, MY, T } from './stationPaint';
import { VIEWPORT } from './stationProps';

export interface Point {
	readonly x: number;
	readonly y: number;
}

export interface StationLights {
	readonly phase: Phase;
	readonly time: number;
	/** The hero (tile coordinates) and the heading of the flashlight, or null (no hero). */
	readonly hero: { readonly x: number; readonly y: number; readonly angle: number } | null;
	/** Burning flares, tile coordinates. */
	readonly flares: readonly Point[];
	/** A wall or the void at tile (x, y): it stops the flashlight. */
	readonly solid: (x: number, y: number) => boolean;
}

/** The flashlight: half the cone's angle (radians) and its reach (tiles). */
export const FLASHLIGHT = { half: 0.46, reach: 6.5 } as const;

const AMBIENT: Readonly<Record<Phase, string>> = {
	1: 'rgb(38,44,41)',
	2: 'rgb(28,18,18)',
	3: 'rgb(15,12,13)'
};

/** The surround's lights (tile coordinates relative to the maze). */
const TANKS: readonly Point[] = [
	{ x: -9.3, y: 2.9 },
	{ x: -13.3, y: 5.1 }
];
const BREACH: Point = { x: -9.3, y: 23.2 };
const DEAD: readonly Point[] = [
	{ x: 31.6, y: 25.6 },
	{ x: -6, y: 16.4 }
];
const WINDOW: Point = { x: (VIEWPORT.x - MX) / T, y: (VIEWPORT.y - MY) / T };

/** Lightning in the storm below the window: rare double flashes. */
function lightning(t: number): number {
	const k = t % 7.3;
	return k < 0.08 ? 1 : k > 0.16 && k < 0.22 ? 0.6 : 0;
}

function flicker(seed: number, t: number): number {
	const k =
		Math.sin(t * 13 + seed * 50) * Math.sin(t * 7.3 + seed * 20) * Math.sin(t * 2.1 + seed * 9);
	return k > 0.55 ? 0.15 : 1;
}

function light(
	c: CanvasRenderingContext2D,
	x: number,
	y: number,
	r: number,
	rgb: string,
	a: number
): void {
	if (!(a > 0) || !(r > 0)) {
		return;
	}
	const g = c.createRadialGradient(x, y, 0, x, y, r);
	g.addColorStop(0, `rgba(${rgb},${a})`);
	g.addColorStop(0.45, `rgba(${rgb},${a * 0.45})`);
	g.addColorStop(1, `rgba(${rgb},0)`);
	c.fillStyle = g;
	c.fillRect(x - r, y - r, r * 2, r * 2);
}

/** The flashlight's lit area: rays across the cone, stopped by the walls (tile coordinates). */
export function conePolygon(
	x: number,
	y: number,
	angle: number,
	solid: (x: number, y: number) => boolean,
	half: number = FLASHLIGHT.half,
	reach: number = FLASHLIGHT.reach
): Point[] {
	const pts: Point[] = [{ x, y }];
	const n = 64;
	for (let i = 0; i <= n; i += 1) {
		const a = angle - half + (i / n) * half * 2;
		const dx = Math.cos(a);
		const dy = Math.sin(a);
		let d = 0;
		let hit = -1;
		while (d < reach) {
			if (solid(Math.floor(x + dx * d), Math.floor(y + dy * d))) {
				hit = d;
				break;
			}
			d += 0.05;
		}
		// the light bites a little into the wall it meets, so that face reads lit
		const end = hit < 0 ? reach : Math.min(reach, hit + 0.12);
		pts.push({ x: x + dx * end, y: y + dy * end });
	}
	return pts;
}

/**
 * Paints the light map into `c` (its canvas is the screen at `f` device pixels per css px):
 * the ambient, then every light added.
 */
export function buildLightMap(
	c: CanvasRenderingContext2D,
	f: number,
	layout: GridLayout,
	lamps: readonly Lamp[],
	lights: StationLights
): void {
	const { phase: ph, time: t } = lights;
	const S = layout.tileSize;
	const sx = (x: number) => layout.offsetX + x * S;
	const sy = (y: number) => layout.offsetY + y * S;
	c.setTransform(1, 0, 0, 1, 0, 0);
	c.globalCompositeOperation = 'source-over';
	c.fillStyle = AMBIENT[ph];
	c.fillRect(0, 0, c.canvas.width, c.canvas.height);
	c.setTransform(f, 0, 0, f, 0, 0);
	c.globalCompositeOperation = 'lighter';
	for (const l of lamps) {
		const x = sx(l.x);
		const y = sy(l.y);
		if (l.kind === 'ceiling') {
			// most of them are dead; the rest stutter
			if (ph === 1 && l.seed >= 0.45) {
				light(c, x, y, S * 3.1, '200,215,190', 0.75 * flicker(l.seed, t * 1.7));
			}
		} else if (l.kind === 'emergency') {
			if (ph >= 2) {
				const pulse =
					ph === 3
						? (t + l.seed) % 1.3 < 0.18
							? 1
							: 0.08
						: 0.55 + 0.25 * Math.sin(t * 3 + l.seed * 6);
				light(c, x, y, S * 2.4, '255,40,28', 0.6 * pulse);
				if (ph === 2) {
					// the rotating beacon's beam
					const a = t * 2.6 + l.seed * 6;
					const g = c.createRadialGradient(x, y, 0, x, y, S * 3.4);
					g.addColorStop(0, 'rgba(255,50,30,.5)');
					g.addColorStop(1, 'rgba(255,50,30,0)');
					c.fillStyle = g;
					c.beginPath();
					c.moveTo(x, y);
					c.arc(x, y, S * 3.4, a - 0.3, a + 0.3);
					c.closePath();
					c.fill();
				}
			}
		} else {
			const on =
				ph === 1
					? 1
					: ph === 2
						? 0.45 * flicker(l.seed + 3, t)
						: l.seed < 0.3
							? 0.3 * flicker(l.seed, t * 2)
							: 0;
			light(c, x, y, S * 4.2, '255,190,120', 0.6 * on * (l.seed >= 0.5 ? 0.15 : 1));
		}
	}
	// the surround keeps a little light of its own: the window and its storm, the tanks, the
	// breach, the dead
	const dim = ph === 1 ? 1 : ph === 2 ? 0.7 : 0.45;
	const storm = lightning(t);
	if (storm > 0) {
		light(c, sx(WINDOW.x), sy(WINDOW.y), S * 11, '220,200,255', 0.9 * storm);
	}
	light(c, sx(WINDOW.x), sy(WINDOW.y), S * 7.5, '200,120,60', ph === 3 ? 0.3 : 0.45);
	for (const p of TANKS) {
		light(
			c,
			sx(p.x),
			sy(p.y),
			S * 4.2,
			'90,200,110',
			0.42 * dim * (0.85 + 0.15 * Math.sin(t * 1.3 + p.x))
		);
	}
	light(c, sx(BREACH.x), sy(BREACH.y), S * 4.5, '150,175,80', 0.32 * dim);
	light(
		c,
		sx(DEAD[0].x),
		sy(DEAD[0].y),
		S * 3.6,
		'255,205,150',
		0.55 * dim * flicker(0.21, t * 2.6)
	);
	light(
		c,
		sx(DEAD[1].x),
		sy(DEAD[1].y),
		S * 3.2,
		'255,60,40',
		0.4 * dim * (0.6 + 0.4 * Math.sin(t * 2.2))
	);
	// the nest's sickly breath
	if (ph >= 2) {
		light(c, sx(12.5), sy(13), S * (ph === 3 ? 4.5 : 3), '120,190,60', ph === 3 ? 0.35 : 0.22);
	}
	for (const p of lights.flares) {
		const fl = 0.85 + 0.15 * Math.sin(t * 31) * Math.sin(t * 17);
		light(c, sx(p.x), sy(p.y), S * 3.4 * fl, '255,96,110', 0.95);
		light(c, sx(p.x), sy(p.y), S * 1.2, '255,220,225', 0.6);
	}
	const hero = lights.hero;
	if (hero) {
		const hx = sx(hero.x);
		const hy = sy(hero.y);
		light(c, hx, hy, S * 1.3, '230,236,240', 0.5);
		for (const [half, a] of [
			[1, 1],
			[0.75, 0.35]
		] as const) {
			const poly = conePolygon(hero.x, hero.y, hero.angle, lights.solid, FLASHLIGHT.half * half);
			const g = c.createRadialGradient(hx, hy, S * 0.2, hx, hy, S * FLASHLIGHT.reach);
			g.addColorStop(0, `rgba(238,244,255,${a})`);
			g.addColorStop(0.5, `rgba(238,244,255,${a * 0.85})`);
			g.addColorStop(1, 'rgba(238,244,255,0)');
			c.fillStyle = g;
			c.beginPath();
			poly.forEach((p, i) => (i ? c.lineTo(sx(p.x), sy(p.y)) : c.moveTo(sx(p.x), sy(p.y))));
			c.closePath();
			c.fill();
		}
	}
	c.setTransform(1, 0, 0, 1, 0, 0);
	c.globalCompositeOperation = 'source-over';
}
