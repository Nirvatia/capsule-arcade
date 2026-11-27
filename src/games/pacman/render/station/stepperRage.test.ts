import { describe, expect, it } from 'vitest';
import { drawManicFace, type RageFace } from './stepperRage';

/** A recording 2D context: counts save/restore and paths, keeps the first mouth's curve. */
function recorder() {
	const calls = { save: 0, restore: 0, paths: 0 };
	const curves: Array<{ moveY: number; ctlY: number }> = [];
	let moveY = 0;
	const target: Record<string, unknown> = {};
	const ctx = new Proxy(target, {
		get(_t, key: string) {
			if (key === 'save') return () => void (calls.save += 1);
			if (key === 'restore') return () => void (calls.restore += 1);
			if (key === 'beginPath') return () => void (calls.paths += 1);
			if (key === 'moveTo') return (_x: number, y: number) => void (moveY = y);
			if (key === 'quadraticCurveTo')
				return (_cx: number, cy: number) => void curves.push({ moveY, ctlY: cy });
			if (key in target) return target[key];
			return () => undefined;
		},
		set(_t, key: string, value) {
			target[key] = value;
			return true;
		}
	}) as unknown as CanvasRenderingContext2D;
	return { ctx, calls, curves };
}

const face = (over: Partial<RageFace> = {}): RageFace => ({
	x: 0,
	y: 0.025,
	alpha: 1,
	open: 0,
	px: 1 / 34,
	faceX: 1,
	faceY: 0,
	...over
});

describe('the maniac face', () => {
	it('draws nothing while the rage has not come in', () => {
		const { ctx, calls } = recorder();
		drawManicFace(ctx, face({ alpha: 0 }));
		expect(calls.paths).toBe(0);
		expect(calls.save).toBe(0);
	});

	it('draws eyes, brows, a mouth and teeth, saves and restores balanced', () => {
		for (const [faceX, faceY] of [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1]
		]) {
			const { ctx, calls } = recorder();
			drawManicFace(ctx, face({ faceX, faceY, open: 0.5 }));
			expect(calls.save).toBe(calls.restore);
			// two eyes, two brows, the mouth, eleven teeth three times, the mouth's line
			expect(calls.paths).toBeGreaterThan(30);
		}
	});

	it('keeps the jaw inside the body, even on the lowest face with the jaws wide open', () => {
		// the face sits lowest when the creature heads down and is fully hot: y = -0.02 + 0.07 + 0.045
		const { ctx, curves } = recorder();
		drawManicFace(ctx, face({ y: 0.095, open: 1 }));
		// the second curve of the mouth path is the lower lip: its middle is half way to the control
		const lower = curves[1];
		expect((lower.moveY + lower.ctlY) / 2).toBeLessThanOrEqual(0.2351);
	});
});
