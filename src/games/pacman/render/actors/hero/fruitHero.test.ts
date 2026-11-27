import { afterEach, describe, expect, it, vi } from 'vitest';
import { FRUIT_BODY_RATIO, MelonHero, OrangeHero } from './FruitHero';
import { readHeroSkin, writeHeroSkin } from './heroSkin';

/** A 2D context that only counts: every method is a no-op, gradients are stubs. */
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
			if (key === 'measureText') return () => ({ width: 1 });
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

/** A fake DOM canvas for the base's cached body discs. */
function stubDocument(): void {
	vi.stubGlobal('document', {
		createElement: () => ({ width: 0, height: 0, getContext: () => recorder().ctx })
	});
}

afterEach(() => vi.unstubAllGlobals());

describe('the fruit heroes', () => {
	it('keep the body smaller than a tile with the ice rim and the bow inside it', () => {
		// the rim reaches 1.28 R and the bow 1.5 R at most: half a tile is the limit
		expect(FRUIT_BODY_RATIO * 1.5).toBeLessThan(0.5);
	});

	it('draw calm, buffed, ending, rolling as a ball and dying, in balance, without throwing', () => {
		stubDocument();
		for (const Hero of [OrangeHero, MelonHero]) {
			for (const state of [
				{ power: false, ending: false, ball: false, dying: false },
				{ power: true, ending: false, ball: false, dying: false },
				{ power: true, ending: true, ball: false, dying: false },
				{ power: false, ending: false, ball: true, dying: false },
				{ power: false, ending: false, ball: false, dying: true }
			]) {
				const hero = new Hero();
				hero.setRadius(10);
				hero.setBall(state.ball);
				const { ctx, calls } = recorder();
				for (let i = 0; i < 40; i += 1) {
					hero.update(1 / 60, {
						x: 20 + i,
						y: 20,
						angle: 0,
						moving: true,
						power: state.power,
						ending: state.ending,
						dying: state.dying,
						season: 'summer'
					});
					hero.draw(ctx);
				}
				expect(calls.save).toBe(calls.restore);
				expect(calls.paths).toBeGreaterThan(20);
			}
		}
	});
});

describe('the hero look setting', () => {
	it('is the fruits unless the vessels were chosen, and survives a blocked storage', () => {
		const store = new Map<string, string>();
		vi.stubGlobal('localStorage', {
			getItem: (k: string) => store.get(k) ?? null,
			setItem: (k: string, v: string) => void store.set(k, v)
		});
		expect(readHeroSkin()).toBe('fruit');
		writeHeroSkin('vessel');
		expect(readHeroSkin()).toBe('vessel');
		writeHeroSkin('fruit');
		expect(readHeroSkin()).toBe('fruit');
		vi.stubGlobal('localStorage', {
			getItem: () => {
				throw new Error('blocked');
			},
			setItem: () => {
				throw new Error('blocked');
			}
		});
		expect(readHeroSkin()).toBe('fruit');
		expect(() => writeHeroSkin('vessel')).not.toThrow();
	});
});
