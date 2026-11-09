import { describe, expect, it, vi } from 'vitest';
import type { PacmanFx } from '../../core/Events';
import type { GridLayout } from '../maze/GridView';
import { LevelFx } from './LevelFx';
import { GOLD, recipeFor } from './fxPresets';

vi.mock('../common/textures', () => ({ glowTexture: () => ({}) }));

const particle = (i: number) => ({ id: i }) as unknown as HTMLCanvasElement;
const style = { accent: 0x88ff44, particle };

const EVERY_EVENT: PacmanFx[] = [
	{ kind: 'ghost-eaten', x: 3.5, y: 4.5, points: 200, ghost: 'PINKY' },
	{ kind: 'energizer', x: 1.5, y: 2.5 },
	{ kind: 'fruit', x: 5.5, y: 6.5, points: 500 },
	{ kind: 'egg', x: 7.5, y: 8.5, points: 1000 },
	{ kind: 'extra-life', x: 2.5, y: 2.5 },
	{ kind: 'teleport', x: 0.5, y: 9.5, tx: 24.5, ty: 9.5 },
	{ kind: 'echo-pop', x: 4.5, y: 4.5 },
	{ kind: 'near-miss', x: 6.5, y: 6.5, gx: 8.5, gy: 6.5, ghost: 'INKY' }
];

describe('recipeFor', () => {
	it('gives every event at least one visible effect', () => {
		for (const fx of EVERY_EVENT) {
			const r = recipeFor(fx, style);
			const parts = r.rings.length + r.flashes.length + r.bursts.length + r.streaks.length;
			expect(parts, fx.kind).toBeGreaterThan(0);
		}
	});

	it('shows the points of a ghost, a fruit and an egg, and 1UP for a life', () => {
		const text = (fx: PacmanFx) => recipeFor(fx, style).popups.map((p) => p.text);
		expect(text(EVERY_EVENT[0])).toEqual(['200']);
		expect(text(EVERY_EVENT[2])).toEqual(['500']);
		expect(text(EVERY_EVENT[3])).toEqual(['1000']);
		expect(text(EVERY_EVENT[4])).toEqual(['1UP']);
		expect(text(EVERY_EVENT[1])).toEqual([]);
	});

	it('colours by the season, except the gold egg and life', () => {
		expect(recipeFor(EVERY_EVENT[1], style).rings[0].tint).toBe(style.accent);
		expect(recipeFor(EVERY_EVENT[3], style).rings[0].tint).toBe(GOLD);
		expect(recipeFor(EVERY_EVENT[4], style).rings[0].tint).toBe(GOLD);
	});

	it('gathers at the tunnel mouth and bursts out of the far one', () => {
		const r = recipeFor(EVERY_EVENT[5], style);
		expect(r.gathers[0]).toMatchObject({ x: 0.5, y: 9.5 });
		expect(r.bursts[0]).toMatchObject({ x: 24.5, y: 9.5 });
	});
});

describe('shockwaves', () => {
	it('make the second ring of a hit weak and the first one main', () => {
		for (const fx of [EVERY_EVENT[0], EVERY_EVENT[1]]) {
			const [main, second] = recipeFor(fx, style).rings;
			expect(main.weak, fx.kind).toBeFalsy();
			expect(second.weak, fx.kind).toBe(true);
		}
	});

	it('last 15 % longer than the plain ring', () => {
		expect(recipeFor(EVERY_EVENT[1], style).rings[0].life).toBeCloseTo(0.5 * 1.15);
	});
});

describe('LevelFx drawing', () => {
	const layout = { tileSize: 24, offsetX: 10, offsetY: 5 } as GridLayout;

	/** A context that counts calls instead of drawing. */
	function counting() {
		const calls: Record<string, number> = {};
		const gradient = { addColorStop: () => {} };
		const ctx = new Proxy({} as Record<string, unknown>, {
			get: (target, key: string) =>
				key in target
					? target[key]
					: () => {
							calls[key] = (calls[key] ?? 0) + 1;
							return key.startsWith('create') ? gradient : undefined;
						},
			set: (target, key: string, value) => {
				target[key] = value;
				return true;
			}
		}) as unknown as CanvasRenderingContext2D;
		return { ctx, calls };
	}

	it('draws a wave with its pressure disc while it lives and nothing after', () => {
		const fx = new LevelFx();
		fx.spawn(EVERY_EVENT[1], style);
		fx.update(0.1);
		const alive = counting();
		fx.drawUnder(alive.ctx, layout);
		expect(alive.calls.createRadialGradient).toBeGreaterThan(0);
		expect(alive.calls.arc).toBeGreaterThan(0);
		for (let i = 0; i < 200; i += 1) {
			fx.update(1 / 60);
		}
		const gone = counting();
		fx.drawUnder(gone.ctx, layout);
		expect(gone.calls.arc ?? 0).toBe(0);
	});

	it('waits for a delayed ring before drawing it', () => {
		const fx = new LevelFx();
		fx.spawn(EVERY_EVENT[1], style);
		fx.update(0.01);
		const early = counting();
		fx.drawUnder(early.ctx, layout);
		const arcsEarly = early.calls.arc ?? 0;
		fx.update(0.2);
		const later = counting();
		fx.drawUnder(later.ctx, layout);
		expect(later.calls.arc ?? 0).toBeGreaterThan(arcsEarly);
	});
});

describe('LevelFx', () => {
	it('plays an event and lets it die out', () => {
		const fx = new LevelFx();
		fx.spawn(EVERY_EVENT[0], style);
		expect(fx.active).toBeGreaterThan(0);
		expect(fx.shake).toBeGreaterThan(0);
		for (let i = 0; i < 200; i += 1) {
			fx.update(1 / 60);
		}
		expect(fx.active).toBe(0);
		expect(fx.shake).toBe(0);
	});

	it('ignores a stalled or negative frame', () => {
		const fx = new LevelFx();
		fx.spawn(EVERY_EVENT[1], style);
		const before = fx.active;
		fx.update(0);
		fx.update(-1);
		fx.update(Number.NaN);
		expect(fx.active).toBe(before);
	});

	it('keeps the strongest shake of overlapping events', () => {
		const fx = new LevelFx();
		fx.spawn(EVERY_EVENT[0], style);
		const strong = fx.shake;
		fx.spawn(EVERY_EVENT[7], style);
		expect(fx.shake).toBe(strong);
	});

	it('reset clears everything', () => {
		const fx = new LevelFx();
		for (const e of EVERY_EVENT) {
			fx.spawn(e, style);
		}
		fx.reset();
		expect(fx.active).toBe(0);
		expect(fx.shake).toBe(0);
	});
});
