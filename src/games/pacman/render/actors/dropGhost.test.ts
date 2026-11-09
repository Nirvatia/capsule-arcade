import { describe, expect, it } from 'vitest';
import { dropStateFor, footLift } from './dropGhost';

describe('dropStateFor', () => {
	const base = { hypnosis: null, overdrive: false } as const;

	it('maps the game states to the drop looks', () => {
		expect(dropStateFor({ ...base, state: 'active' })).toBe('normal');
		expect(dropStateFor({ ...base, state: 'lair' })).toBe('normal');
		expect(dropStateFor({ ...base, state: 'exiting' })).toBe('normal');
		expect(dropStateFor({ ...base, state: 'eyes' })).toBe('eyes');
		expect(dropStateFor({ ...base, state: 'enraged' })).toBe('rage');
		expect(dropStateFor({ ...base, state: 'frightened' })).toBe('scared');
	});

	it('shows the overdrive on a frightened ghost', () => {
		expect(dropStateFor({ ...base, overdrive: true, state: 'frightened' })).toBe('overdrive');
	});

	it('tells the hypnosis modes apart by the look', () => {
		expect(dropStateFor({ ...base, hypnosis: 'hunter', state: 'hypnotized' })).toBe('hunter');
		expect(dropStateFor({ ...base, hypnosis: 'feeder', state: 'hypnotized' })).toBe('feeder');
		expect(dropStateFor({ ...base, hypnosis: null, state: 'hypnotized' })).toBe('feeder');
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
