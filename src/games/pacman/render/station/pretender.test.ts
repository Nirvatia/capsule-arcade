import { describe, expect, it } from 'vitest';
import { GAIT_TUNE, RailGait, pretenderStateFor } from './pretender';

const DT = 1 / 60;

describe('pretenderStateFor', () => {
	const base = { escaping: false, tell: false } as const;

	it('maps the game states to the looks', () => {
		expect(pretenderStateFor({ ...base, state: 'active' })).toBe('hunt');
		expect(pretenderStateFor({ ...base, state: 'active', tell: true })).toBe('tell');
		expect(pretenderStateFor({ ...base, state: 'enraged' })).toBe('rage');
		expect(pretenderStateFor({ ...base, state: 'active', escaping: true })).toBe('rage');
		expect(pretenderStateFor({ ...base, state: 'frightened', escaping: true })).toBe('fright');
		expect(pretenderStateFor({ ...base, state: 'eyes', escaping: true })).toBe('eyes');
	});
});

describe('a Pretender on the rails', () => {
	it('swings its mask across a 180, not at once', () => {
		const g = new RailGait();
		let x = 5;
		g.update(DT, x, 1, 1, 0, false);
		for (let i = 0; i < 30; i += 1) g.update(DT, (x += 0.1), 1, 1, 0, false);
		g.update(DT, (x -= 0.1), 1, -1, 0, false);
		expect(g.faceX).toBeGreaterThan(0.5);
		for (let i = 0; i < 30; i += 1) g.update(DT, (x -= 0.1), 1, -1, 0, false);
		expect(g.faceX).toBeLessThan(-0.9);
	});

	it('steps with the distance travelled, not with a jump or at rest', () => {
		const g = new RailGait();
		g.update(DT, 0, 0, 1, 0, false);
		g.update(DT, 0.5, 0, 1, 0, false);
		expect(g.step).toBeCloseTo(0.5 * GAIT_TUNE.stride);
		g.update(DT, 0.5, 0, 1, 0, false);
		expect(g.step).toBeCloseTo(0.5 * GAIT_TUNE.stride);
		g.update(DT, 20, 0, -1, 0, false);
		expect(g.step).toBeCloseTo(0.5 * GAIT_TUNE.stride);
		expect(g.faceX).toBe(-1);
	});

	it('pushes the mask up in the rage over a moment and brings it back down', () => {
		const g = new RailGait();
		g.update(DT, 0, 0, 1, 0, false);
		g.update(DT, 0, 0, 1, 0, true);
		expect(g.reveal).toBeGreaterThan(0);
		expect(g.reveal).toBeLessThan(1);
		for (let t = 0; t < GAIT_TUNE.reveal; t += DT) g.update(DT, 0, 0, 1, 0, true);
		expect(g.reveal).toBe(1);
		for (let t = 0; t < GAIT_TUNE.reveal + DT; t += DT) g.update(DT, 0, 0, 1, 0, false);
		expect(g.reveal).toBe(0);
	});
});
