import { describe, expect, it } from 'vitest';
import type { HeroState } from './Hero';
import { CinnabarHero } from './CinnabarHero';
import { JadeHero } from './JadeHero';
import type { Wake } from './heroWake';

const R = 20;
const DT = 1 / 60;
const SPEC = { life: 0.5, width: R * 0.6, capHead: R * 0.4, capTail: R * 2.4, color: () => '#fff' };

class CinnabarProbe extends CinnabarHero {
	get stream(): Wake {
		return this.wake;
	}
}
class JadeProbe extends JadeHero {
	get stream(): Wake {
		return this.wake;
	}
}

const state = (x: number): HeroState => ({
	x,
	y: 0,
	angle: 0,
	moving: true,
	power: false,
	ending: false
});

describe('the vessels’ stream', () => {
	it.each([
		['Pac-Man', () => new CinnabarProbe()],
		['Ms. Pac-Man', () => new JadeProbe()]
	] as const)('is not drawn across a tunnel jump (%s)', (_, make) => {
		const hero = make();
		hero.setRadius(R);
		let t = 0;
		let x = 0;
		for (let i = 0; i < 20; i += 1) {
			x += 5;
			t += DT;
			hero.update(DT, state(x));
		}
		// through the side tunnel: out at the far end of the maze
		x += 1000;
		for (let i = 0; i < 6; i += 1) {
			x += 5;
			t += DT;
			hero.update(DT, state(x));
		}
		const pieces = hero.stream.points(t, SPEC).filter((p) => p.length >= 2);
		expect(pieces).toHaveLength(2);
		for (const piece of pieces) {
			const xs = piece.map((p) => p.x);
			expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(500);
		}
	});
});
