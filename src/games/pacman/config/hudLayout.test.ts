import { describe, expect, it } from 'vitest';
import {
	HUD_BOSS_BAR_SIDE,
	HUD_BOSS_BAR_STACK,
	HUD_STACK_BAND,
	bossHudLayoutFor,
	hudLayoutFor
} from './hudLayout';

describe('hudLayoutFor', () => {
	it('puts the HUD in the margins of a landscape screen', () => {
		for (const [w, h] of [
			[1920, 1080],
			[1280, 720],
			[1024, 768],
			[1600, 1200]
		]) {
			const l = hudLayoutFor(w, h);
			expect(l.mode).toBe('side');
			expect(l.top).toBe(0);
			expect(l.bottom).toBe(0);
		}
	});

	it('stacks it in two bands on a tall or squarish screen', () => {
		for (const [w, h] of [
			[400, 800],
			[390, 844],
			[768, 1024],
			[1000, 900]
		]) {
			const l = hudLayoutFor(w, h);
			expect(l.mode).toBe('stack');
			expect(l.top).toBeCloseTo(HUD_STACK_BAND * l.scale, 8);
			expect(l.bottom).toBeCloseTo(l.top, 8);
		}
	});

	it('scales the side HUD with the height while the margins allow, and shrinks it in tight ones', () => {
		expect(hudLayoutFor(1280, 720).scale).toBe(1);
		expect(hudLayoutFor(1920, 1080).scale).toBeCloseTo(1.5, 5);
		const tight = hudLayoutFor(1024, 768);
		expect(tight.scale).toBeLessThan(768 / 720);
		expect(tight.scale).toBeGreaterThan(0.55);
	});

	it('keeps the stacked bands within the screen', () => {
		for (const [w, h] of [
			[400, 800],
			[360, 640],
			[768, 1024],
			[820, 1180]
		]) {
			const l = hudLayoutFor(w, h);
			expect(l.top + l.bottom).toBeLessThan(h * 0.65);
			expect(400 * l.scale).toBeLessThanOrEqual(w + 1e-9);
		}
	});

	it('survives a bad size', () => {
		expect(hudLayoutFor(0, 0)).toEqual({ mode: 'side', scale: 1, top: 0, bottom: 0 });
		expect(hudLayoutFor(Number.NaN, 100).mode).toBe('side');
	});
});

describe('bossHudLayoutFor', () => {
	it('adds the boss bar to the top band', () => {
		const side = bossHudLayoutFor(1280, 720);
		expect(side.mode).toBe('side');
		expect(side.top).toBeCloseTo(HUD_BOSS_BAR_SIDE * side.scale, 8);
		expect(side.bottom).toBe(0);
		const stack = bossHudLayoutFor(400, 800);
		expect(stack.mode).toBe('stack');
		expect(stack.top).toBeCloseTo((HUD_STACK_BAND + HUD_BOSS_BAR_STACK) * stack.scale, 8);
		expect(stack.bottom).toBeCloseTo(HUD_STACK_BAND * stack.scale, 8);
	});

	it('keeps the season layout otherwise', () => {
		const a = hudLayoutFor(1600, 900);
		const b = bossHudLayoutFor(1600, 900);
		expect(b.mode).toBe(a.mode);
		expect(b.scale).toBe(a.scale);
	});
});
