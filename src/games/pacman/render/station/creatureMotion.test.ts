import { describe, expect, it } from 'vitest';
import { CreatureMotion, MOTION_TUNE } from './creatureMotion';

const DT = 1 / 60;

describe('a creature drawn moving', () => {
	it('rounds a corner: it never trails the real point by more than the lag', () => {
		const m = new CreatureMotion();
		let x = 0;
		let y = 0;
		m.update(DT, x, y, 0);
		let most = 0;
		let offLine = 0;
		for (let i = 0; i < 120; i += 1) {
			if (i < 60) x += 0.1;
			else y += 0.1;
			m.update(DT, x, y, i < 60 ? 0 : Math.PI / 2);
			most = Math.max(most, Math.hypot(x - m.x, y - m.y));
			// off both legs of the L: the drawn point cut the corner
			if (i > 60 && i < 66) offLine = Math.max(offLine, Math.min(Math.abs(m.y), Math.abs(m.x - 6)));
		}
		expect(most).toBeLessThanOrEqual(MOTION_TUNE.lag + 1e-9);
		expect(offLine).toBeGreaterThan(0.01);
	});

	it('turns its head at a limited rate, not at once', () => {
		const m = new CreatureMotion();
		m.update(DT, 0, 0, 0);
		m.update(DT, 0, 0.1, Math.PI / 2);
		expect(m.heading).toBeGreaterThan(0);
		expect(m.heading).toBeLessThanOrEqual(MOTION_TUNE.turn * DT + 1e-9);
	});

	it('takes a jump at once', () => {
		const m = new CreatureMotion();
		m.update(DT, 1, 13, Math.PI);
		m.update(DT, 23, 13, Math.PI);
		expect(m.x).toBe(23);
	});

	it('swims slowly at rest and faster on the run', () => {
		const still = new CreatureMotion();
		const running = new CreatureMotion();
		still.update(DT, 0, 0, 0);
		running.update(DT, 0, 0, 0);
		for (let i = 1; i <= 60; i += 1) {
			still.update(DT, 0, 0, 0);
			running.update(DT, i * 0.1, 0, 0);
		}
		expect(running.clock).toBeGreaterThan(still.clock * 2);
	});
});
