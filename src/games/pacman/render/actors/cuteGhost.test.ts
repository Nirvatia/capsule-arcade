import { describe, expect, it } from 'vitest';
import { GHOST_SHAPES, cuteStateFor, footLift } from './cuteGhost';

describe('cuteStateFor', () => {
	const base = { hypnosis: null, overdrive: false } as const;

	it('maps the game states to the drop looks', () => {
		expect(cuteStateFor({ ...base, state: 'active' })).toBe('normal');
		expect(cuteStateFor({ ...base, state: 'lair' })).toBe('normal');
		expect(cuteStateFor({ ...base, state: 'exiting' })).toBe('normal');
		expect(cuteStateFor({ ...base, state: 'eyes' })).toBe('eyes');
		expect(cuteStateFor({ ...base, state: 'enraged' })).toBe('rage');
		expect(cuteStateFor({ ...base, state: 'frightened' })).toBe('scared');
	});

	it('shows the overdrive on a frightened ghost', () => {
		expect(cuteStateFor({ ...base, overdrive: true, state: 'frightened' })).toBe('overdrive');
	});

	it('tells the hypnosis modes apart by the look', () => {
		expect(cuteStateFor({ ...base, hypnosis: 'hunter', state: 'hypnotized' })).toBe('hunter');
		expect(cuteStateFor({ ...base, hypnosis: 'feeder', state: 'hypnotized' })).toBe('feeder');
		expect(cuteStateFor({ ...base, hypnosis: null, state: 'hypnotized' })).toBe('feeder');
	});
});

describe('footLift', () => {
	it('lifts one foot at a time and never both', () => {
		for (let step = 0; step < 20; step += 0.1) {
			const { left, right } = footLift(step);
			expect(left).toBeGreaterThanOrEqual(0);
			expect(right).toBeGreaterThanOrEqual(0);
			expect(left * right).toBe(0);
		}
	});

	it('keeps both feet down when the ghost has not moved', () => {
		expect(footLift(0)).toEqual({ left: 0, right: 0 });
	});
});

describe('GHOST_SHAPES', () => {
	it('gives every shape a body and a face that sits inside it', () => {
		for (const shape of Object.values(GHOST_SHAPES)) {
			expect(shape.paths.length).toBeGreaterThan(0);
			expect(shape.scale).toBeGreaterThan(0);
			expect(shape.scale).toBeLessThanOrEqual(1);
			// both eyes and the mouth stay within the body's ~10-unit radius
			expect(shape.ex + shape.rx).toBeLessThan(10);
			expect(shape.ey + shape.my).toBeLessThan(11);
		}
	});
});
