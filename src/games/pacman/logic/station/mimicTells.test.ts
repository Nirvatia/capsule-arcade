import { describe, expect, it } from 'vitest';
import { TELL_TUNE, mimicTell } from './MimicTells';

// a corridor along y = 5 with walls above and below
const wall = (_x: number, y: number) => y !== 5;
const far = { x: 50, y: 50 };

describe('a lurker lying as food', () => {
	it('sits off the centre towards a wall, with a shadow the food does not have', () => {
		const t = mimicTell(4, 5, far, 0.3, 0, 0, wall);
		expect(Math.hypot(t.dx, t.dy)).toBeGreaterThanOrEqual(0.1);
		expect(t.dy).toBeLessThan(0); // the wall above
		expect(t.shadow).toBeGreaterThan(0);
		expect(t.breath).toBe(TELL_TUNE.breath);
	});

	it('opens its eyes for a moment now and then, not all the time', () => {
		let open = 0;
		const n = 600;
		for (let i = 0; i < n; i += 1) if (mimicTell(4, 5, far, i / 60, 0, 1, wall).eyes > 0) open += 1;
		expect(open).toBeGreaterThan(0);
		expect(open / n).toBeLessThan(0.1);
	});

	it('trembles only when the hero is near', () => {
		expect(mimicTell(4, 5, far, 1, 0, 0, wall).tremble).toBe(0);
		expect(mimicTell(4, 5, { x: 5.5, y: 5.5 }, 1, 0, 0, wall).tremble).toBeGreaterThan(0);
	});

	it('shows itself more while it teaches', () => {
		const plain = mimicTell(4, 5, { x: 5.5, y: 5.5 }, 1, 0, 0, wall);
		const lesson = mimicTell(4, 5, { x: 5.5, y: 5.5 }, 1, 1, 0, wall);
		expect(lesson.shadow).toBeGreaterThan(plain.shadow);
		expect(Math.hypot(lesson.dx, lesson.dy)).toBeGreaterThan(Math.hypot(plain.dx, plain.dy));
		expect(lesson.tremble).toBeGreaterThan(plain.tremble);
	});
});
