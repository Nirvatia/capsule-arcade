import { beforeAll, describe, expect, it } from 'vitest';
import type { QuarantineRing, RingSeal } from '../../logic/station/StationSquad';
import { drawRing, type RingLayout, type RingLook } from './quarantineRing';

/** A recording 2D context: counts save/restore, keeps the widths of the shutter leaves' base fill. */
function recorder() {
	const calls = { save: 0, restore: 0 };
	const leaves: number[] = [];
	const target: Record<string, unknown> = {};
	const ctx = new Proxy(target, {
		get(_t, key: string) {
			if (key === 'save') return () => void (calls.save += 1);
			if (key === 'restore') return () => void (calls.restore += 1);
			if (key === 'fillRect')
				return (_x: number, _y: number, w: number) => {
					if (target.fillStyle === '#3a4742') leaves.push(w);
				};
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
	return { ctx, calls, leaves };
}

const S = 40;
const L: RingLayout = { tileSize: S, offsetX: 0, offsetY: 0 };
const seal = (weak: boolean): RingSeal => ({ x: 5, y: 3, dx: 1, dy: 0, weak });
const ringOf = (seals: RingSeal[], broken = false): QuarantineRing => ({
	zone: new Set([3 * 12 + 2, 3 * 12 + 3, 3 * 12 + 4]),
	width: 12,
	edges: [
		[2, 3, 0, -1],
		[3, 3, 0, -1],
		[4, 3, 0, -1],
		[2, 3, -1, 0]
	],
	posts: [],
	seals,
	lit: true,
	push: 0,
	broken
});
const lit: RingLook = { guide: 0, charge: 1, lit: 1, pressed: null, press: 0 };
const total = (leaves: number[]) => leaves.reduce((a, b) => a + b, 0);

beforeAll(() => {
	// the node test environment has no Path2D: a stand-in that takes the zone's rects
	(globalThis as { Path2D?: unknown }).Path2D = class {
		rect(): void {}
	};
});

describe('the quarantine ring', () => {
	it('draws the warning, the charge and the lit zone with saves and restores balanced', () => {
		for (const ph of [
			{ guide: 1, charge: 0, lit: 0, pressed: null, press: 0 },
			{ guide: 1, charge: 0.5, lit: 0, pressed: null, press: 0 },
			lit
		] as RingLook[]) {
			const { ctx, calls } = recorder();
			drawRing(ctx, L, ringOf([seal(false), seal(true)]), ph, 1.3);
			expect(calls.save).toBe(calls.restore);
		}
	});

	it('closes a whole seal wall to wall with two leaves', () => {
		const { ctx, leaves } = recorder();
		drawRing(ctx, L, ringOf([seal(false)]), lit, 1);
		expect(leaves).toHaveLength(2);
		expect(total(leaves)).toBeCloseTo(S, 5);
	});

	it('grows the leaves from the walls as the projectors charge', () => {
		const half = recorder();
		drawRing(half.ctx, L, ringOf([seal(false)]), { ...lit, lit: 0, charge: 0.5 }, 1);
		expect(total(half.leaves)).toBeCloseTo(S * 0.5, 5);
		const none = recorder();
		drawRing(none.ctx, L, ringOf([seal(false)]), { ...lit, lit: 0, charge: 0 }, 1);
		expect(none.leaves).toHaveLength(0);
	});

	it('keeps a gap in the thin seal, wide once it is torn', () => {
		const whole = recorder();
		drawRing(whole.ctx, L, ringOf([seal(true)]), lit, 1);
		expect(total(whole.leaves)).toBeCloseTo(S * (1 - 2 * 0.07), 5);
		const torn = recorder();
		drawRing(torn.ctx, L, ringOf([seal(true)], true), lit, 1);
		expect(total(torn.leaves)).toBeCloseTo(S * (1 - 2 * 0.3), 5);
	});
});
