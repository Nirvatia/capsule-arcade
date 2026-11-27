import { describe, expect, it } from 'vitest';
import type { GhostKind } from '../../logic/actors/GhostModel';
import { drawStepper, drawStepperEyes } from './stepper';

/** A recording 2D context: every method is a no-op that counts, gradients are stubs. */
function recorder() {
	const calls = { save: 0, restore: 0, paths: 0 };
	const target: Record<string, unknown> = {};
	const ctx = new Proxy(target, {
		get(_t, key: string) {
			if (key === 'save') return () => void (calls.save += 1);
			if (key === 'restore') return () => void (calls.restore += 1);
			if (key === 'beginPath') return () => void (calls.paths += 1);
			if (key === 'createRadialGradient' || key === 'createLinearGradient')
				return () => ({ addColorStop: () => undefined });
			if (key in target) return target[key];
			return () => undefined;
		},
		set(_t, key: string, value) {
			target[key] = value;
			return true;
		}
	}) as unknown as CanvasRenderingContext2D;
	return { ctx, calls };
}

const KINDS: GhostKind[] = ['BLINKY', 'PINKY', 'INKY', 'CLYDE'];
const DIRS: Array<[number, number]> = [
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1]
];

describe('the stepper', () => {
	it('draws every kind, heading and look without throwing, saves and restores balanced', () => {
		for (const kind of KINDS)
			for (const [lx, ly] of DIRS)
				for (const look of [
					{ heat: 0 },
					{ heat: 0.5 },
					{ heat: 1 },
					{ heat: 0, tell: 1 },
					{ heat: 0, fright: 1 },
					{ heat: 0, fright: 1, white: true }
				]) {
					const { ctx, calls } = recorder();
					drawStepper(ctx, 10, 10, 34, kind, {
						lookX: lx,
						lookY: ly,
						faceX: lx,
						faceY: ly,
						time: 1.3,
						step: 4.2,
						...look
					});
					expect(calls.save).toBe(calls.restore);
					expect(calls.paths).toBeGreaterThan(10);
				}
	});

	it('draws the eaten one as eyes only, balanced', () => {
		const { ctx, calls } = recorder();
		drawStepperEyes(ctx, 0, 0, 34, { lookX: 1, lookY: 0, faceX: 1, faceY: 0, time: 0.4 });
		expect(calls.save).toBe(calls.restore);
		expect(calls.paths).toBeGreaterThan(2);
	});
});
