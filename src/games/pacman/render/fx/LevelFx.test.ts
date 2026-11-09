import { describe, expect, it } from 'vitest';
import type { PacmanFx } from '../../core/Events';
import { LevelFx } from './LevelFx';
import { GOLD, recipeFor } from './fxPresets';

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
