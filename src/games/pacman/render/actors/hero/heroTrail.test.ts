import { describe, expect, it } from 'vitest';
import type { Hero, HeroState } from './Hero';
import { PacmanHero } from './PacmanHero';
import { MsPacmanHero } from './MsPacmanHero';
import { SEASON_LOOKS, heroSeasonOf } from './heroSeasons';
import type { HeroSeason } from './heroSeasons';

const R = 20;
const DT = 1 / 60;
const SEASONS: readonly HeroSeason[] = ['spring', 'summer', 'autumn', 'winter', 'hell'];

function newHero(ms = false): Hero {
	const hero = ms ? new MsPacmanHero() : new PacmanHero();
	hero.setRadius(R);
	return hero;
}

/** Runs the hero along (dx, dy) per frame for `seconds`, from (x, y). */
function run(
	hero: Hero,
	from: { x: number; y: number },
	step: { x: number; y: number },
	seconds: number,
	extra: Partial<HeroState> = {}
): { x: number; y: number } {
	let { x, y } = from;
	const angle = Math.atan2(step.y, step.x);
	for (let i = 0; i < Math.round(seconds / DT); i++) {
		x += step.x;
		y += step.y;
		hero.update(DT, {
			x,
			y,
			angle,
			moving: true,
			power: false,
			ending: false,
			...extra
		});
	}
	return { x, y };
}

describe('the heroes in a season', () => {
	it('have a look for every season and the hell, with real colours', () => {
		for (const season of SEASONS) {
			const look = SEASON_LOOKS[season];
			for (const c of [look.rim, look.line, look.lineHot, look.particleFill, look.particleEdge]) {
				expect(c).toHaveLength(3);
				for (const v of c) {
					expect(v).toBeGreaterThanOrEqual(0);
					expect(v).toBeLessThanOrEqual(255);
				}
			}
		}
	});

	it('take the hell look in the hell and the season otherwise', () => {
		expect(heroSeasonOf('winter', true)).toBe('hell');
		for (const season of ['spring', 'summer', 'autumn', 'winter'] as const) {
			expect(heroSeasonOf(season, false)).toBe(season);
		}
	});
});

describe('the trail', () => {
	it('is shed while he runs and not while he stands', () => {
		const still = newHero();
		for (let i = 0; i < 60; i++) {
			still.update(DT, { x: 100, y: 100, angle: 0, moving: false, power: false, ending: false });
		}
		expect(still.particles).toHaveLength(0);

		const running = newHero();
		run(running, { x: 0, y: 0 }, { x: 5, y: 0 }, 0.5);
		expect(running.particles.length).toBeGreaterThan(8);
	});

	it('bends with a turn: pieces dropped before it keep their direction', () => {
		const hero = newHero();
		const mid = run(hero, { x: 0, y: 0 }, { x: 5, y: 0 }, 0.3);
		run(hero, mid, { x: 0, y: -5 }, 0.2);
		const angles = hero.particles.map((p) => p.ang ?? 0);
		expect(angles.some((a) => Math.abs(a) < 0.01)).toBe(true);
		expect(angles.some((a) => Math.abs(a + Math.PI / 2) < 0.01)).toBe(true);
	});

	it('is not dropped across a teleport jump', () => {
		const hero = newHero();
		const end = run(hero, { x: 0, y: 0 }, { x: 5, y: 0 }, 0.3);
		const before = hero.particles.length;
		hero.update(0.0001, {
			x: end.x + 1000,
			y: end.y,
			angle: 0,
			moving: true,
			power: false,
			ending: false
		});
		expect(hero.particles.length).toBe(before);
	});

	it.each([
		['spring', 'petal'],
		['summer', 'spark'],
		['autumn', 'leaf'],
		['winter', 'flake']
	] as const)('is %s particles (%s) for Pac-Man', (season, kind) => {
		const hero = newHero();
		run(hero, { x: 0, y: 0 }, { x: 5, y: 0 }, 0.6, { season });
		const kinds = new Set(hero.particles.map((p) => p.kind));
		expect(kinds).toEqual(new Set([kind]));
	});

	it('gets twinkles with the season for Ms. Pac-Man', () => {
		const hero = newHero(true);
		run(hero, { x: 0, y: 0 }, { x: 5, y: 0 }, 0.8, { season: 'spring' });
		const kinds = new Set(hero.particles.map((p) => p.kind));
		expect(kinds.has('petal')).toBe(true);
		expect(kinds.has('star')).toBe(true);
	});

	it.each([false, true])('turns to fire when powered (Ms. Pac-Man: %s)', (ms) => {
		const hero = newHero(ms);
		run(hero, { x: 0, y: 0 }, { x: 5, y: 0 }, 1.2, { power: true, season: 'summer' });
		const kinds = new Set(hero.particles.map((p) => p.kind));
		expect(kinds.has('flame')).toBe(true);
		expect(kinds.has('ember')).toBe(true);
		expect(kinds.has('spark')).toBe(false);
	});

	it('dies down after he stops', () => {
		const hero = newHero();
		const end = run(hero, { x: 0, y: 0 }, { x: 5, y: 0 }, 0.5);
		for (let i = 0; i < 90; i++) {
			hero.update(DT, { x: end.x, y: end.y, angle: 0, moving: false, power: false, ending: false });
		}
		expect(hero.particles).toHaveLength(0);
	});
});
