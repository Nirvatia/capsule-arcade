import { describe, expect, it, vi } from 'vitest';
import type { Hero, HeroState, Particle, ParticleKind } from './Hero';
import { PacmanHero } from './PacmanHero';
import { MsPacmanHero } from './MsPacmanHero';
import { SEASON_LOOKS, heroSeasonOf } from './heroSeasons';
import type { HeroSeason } from './heroSeasons';

// The glow sprite needs a DOM canvas; the paint tests only read strokes and points.
vi.mock('./Hero', async (importOriginal) => ({
	...(await importOriginal<typeof import('./Hero')>()),
	glow: () => ({}) as unknown as HTMLCanvasElement
}));

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

	it.each(['spring', 'summer', 'autumn', 'winter'] as const)(
		'is glints of sunlight for Pac-Man, whatever the season (%s)',
		(season) => {
			const hero = newHero();
			run(hero, { x: 0, y: 0 }, { x: 5, y: 0 }, 0.6, { season });
			const kinds = new Set(hero.particles.map((p) => p.kind));
			expect(kinds).toEqual(new Set(['spark']));
		}
	);

	it('is stars for Ms. Pac-Man, whatever the season', () => {
		const hero = newHero(true);
		run(hero, { x: 0, y: 0 }, { x: 5, y: 0 }, 0.8, { season: 'spring' });
		const kinds = new Set(hero.particles.map((p) => p.kind));
		expect(kinds).toEqual(new Set(['star']));
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

describe('the rolling ball', () => {
	function rolled(ms: boolean) {
		const hero = newHero(ms);
		run(hero, { x: 0, y: 0 }, { x: 5, y: 0 }, 0.3);
		hero.setBall(true);
		return hero;
	}

	it('curls up and opens again on request, with a burst each time', () => {
		const hero = newHero();
		expect(hero.ball).toBe(false);
		const before = hero.particles.length;
		hero.setBall(true);
		expect(hero.ball).toBe(true);
		expect(hero.particles.length).toBeGreaterThan(before);
		const mid = hero.particles.length;
		hero.setBall(true);
		expect(hero.particles.length).toBe(mid);
		hero.setBall(false);
		expect(hero.ball).toBe(false);
		expect(hero.particles.length).toBeGreaterThan(mid);
	});

	it('is Pac-Man fire while he rolls, her hearts and twinkles', () => {
		const pac = rolled(false);
		run(pac, { x: 100, y: 0 }, { x: 5, y: 0 }, 0.6, { season: 'winter' });
		const fire = new Set(pac.particles.filter((p) => p.hot).map((p) => p.kind));
		expect(fire.has('ember')).toBe(true);
		expect(fire.has('flake')).toBe(false);

		const ms = rolled(true);
		run(ms, { x: 100, y: 0 }, { x: 5, y: 0 }, 0.6, { season: 'winter' });
		const kinds = new Set(ms.particles.map((p) => p.kind));
		expect(kinds.has('heart')).toBe(true);
		expect(kinds.has('star')).toBe(true);
		expect(kinds.has('flake')).toBe(false);
	});

	it('sheds more while it rolls than while he runs', () => {
		const walker = newHero();
		run(walker, { x: 0, y: 0 }, { x: 5, y: 0 }, 0.4);
		const roller = rolled(false);
		run(roller, { x: 100, y: 0 }, { x: 5, y: 0 }, 0.4);
		expect(roller.particles.length).toBeGreaterThan(walker.particles.length);
	});

	it('is cancelled by a death', () => {
		const hero = rolled(false);
		hero.update(DT, {
			x: 300,
			y: 0,
			angle: 0,
			moving: false,
			power: false,
			ending: false,
			dying: true
		});
		expect(hero.ball).toBe(false);
	});
});

describe('the trail paint (the element language, no beads)', () => {
	/** A context that counts strokes and glow sprites and records star points. */
	function record() {
		const points: Array<[number, number]> = [];
		const state: Record<string, unknown> = {};
		let strokes = 0;
		let images = 0;
		const ctx = new Proxy(state, {
			get: (t, k: string) => {
				if (k in t) return t[k];
				if (k === 'stroke') return () => (strokes += 1);
				if (k === 'drawImage') return () => (images += 1);
				if (k === 'moveTo' || k === 'lineTo') return (x: number, y: number) => points.push([x, y]);
				if (k === 'createRadialGradient' || k === 'createLinearGradient')
					return () => ({ addColorStop: () => {} });
				return () => {};
			},
			set: (t, k: string, v) => {
				t[k] = v;
				return true;
			}
		}) as unknown as CanvasRenderingContext2D;
		return { ctx, points, strokes: () => strokes, images: () => images };
	}

	const piece = (kind: ParticleKind, hot = false): Particle => ({
		kind,
		x: 0,
		y: 0,
		vx: 0,
		vy: 0,
		life: 0.6,
		max: 1,
		size: 3,
		hot,
		spin: 0
	});

	class SunProbe extends PacmanHero {
		paint(ctx: CanvasRenderingContext2D, e: Particle, a: number, s: number): void {
			this.drawParticle(ctx, e, a, s);
		}
	}
	class MsProbe extends MsPacmanHero {
		paint(ctx: CanvasRenderingContext2D, e: Particle, a: number, s: number): void {
			this.drawParticle(ctx, e, a, s);
		}
	}

	it.each([false, true])('embers glow, with one comet streak only for Ms. Pac-Man: %s', (ms) => {
		const rec = record();
		const hero = ms ? new MsProbe() : new SunProbe();
		hero.paint(rec.ctx, piece('ember', true), 1, 3);
		expect(rec.strokes()).toBe(ms ? 1 : 0);
		expect(rec.images()).toBeGreaterThan(0);
	});

	it('his glints are thin four-point flares, not stubby stars', () => {
		const rec = record();
		new SunProbe().paint(rec.ctx, piece('spark'), 1, 3);
		const radii = rec.points.map(([x, y]) => Math.hypot(x, y));
		expect(radii).toHaveLength(8);
		expect(Math.max(...radii) / Math.min(...radii)).toBeGreaterThanOrEqual(8);
	});

	it('her stars are soft twinkles without an ink outline', () => {
		const rec = record();
		new MsProbe().paint(rec.ctx, piece('star'), 1, 3);
		expect(rec.strokes()).toBe(0);
		expect(rec.images()).toBeGreaterThan(0);
	});
});
