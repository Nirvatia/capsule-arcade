import { afterEach, describe, expect, it, vi } from 'vitest';
import { FRUIT_BODY_RATIO, MelonHero, OrangeHero } from './FruitHero';
import type { HeroState } from './Hero';
import type { Wake } from './heroWake';
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

const RIBBON_R = 20;
const RIBBON_DT = 1 / 60;
const RIBBON_SPEC = {
	life: 0.5,
	width: RIBBON_R * 0.6,
	capHead: RIBBON_R * 0.4,
	capTail: RIBBON_R * 2.4,
	color: () => '#fff'
};

class OrangeProbe extends OrangeHero {
	get stream(): Wake {
		return this.wake;
	}
}
class MelonProbe extends MelonHero {
	get stream(): Wake {
		return this.wake;
	}
}

const runningAt = (x: number): HeroState => ({
	x,
	y: 0,
	angle: 0,
	moving: true,
	power: false,
	ending: false
});

describe('the fruit heroes’ ribbon', () => {
	it.each([
		['the orange', () => new OrangeProbe()],
		['the watermelon', () => new MelonProbe()]
	] as const)('is not drawn across a tunnel jump (%s)', (_, make) => {
		const hero = make();
		hero.setRadius(RIBBON_R);
		let t = 0;
		let x = 0;
		for (let i = 0; i < 20; i += 1) {
			x += 5;
			t += RIBBON_DT;
			hero.update(RIBBON_DT, runningAt(x));
		}
		// through the side tunnel: out at the far end of the maze
		x += 1000;
		for (let i = 0; i < 6; i += 1) {
			x += 5;
			t += RIBBON_DT;
			hero.update(RIBBON_DT, runningAt(x));
		}
		const pieces = hero.stream.points(t, RIBBON_SPEC).filter((p) => p.length >= 2);
		expect(pieces).toHaveLength(2);
		for (const piece of pieces) {
			const xs = piece.map((p) => p.x);
			expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(500);
		}
	});

	it.each([
		['the orange', () => new OrangeProbe()],
		['the watermelon', () => new MelonProbe()]
	] as const)('is cut after a stretch he was not drawn, not left behind (%s)', (_, make) => {
		const hero = make();
		hero.setRadius(RIBBON_R);
		let t = 0;
		let x = 0;
		for (let i = 0; i < 20; i += 1) {
			x += 5;
			t += RIBBON_DT;
			hero.update(RIBBON_DT, runningAt(x));
		}
		// the hell's rush: he is the fang saw for half a second, not drawn, and comes back five tiles on
		const start = x;
		x += RIBBON_R * 10;
		hero.cutTrail();
		for (let i = 0; i < 6; i += 1) {
			x += 5;
			t += RIBBON_DT;
			hero.update(RIBBON_DT, runningAt(x));
		}
		const pieces = hero.stream.points(t, RIBBON_SPEC).filter((p) => p.length >= 2);
		expect(pieces).toHaveLength(1);
		for (const p of pieces[0]) {
			expect(p.x).toBeGreaterThan(start + RIBBON_R * 5);
		}
	});
});
