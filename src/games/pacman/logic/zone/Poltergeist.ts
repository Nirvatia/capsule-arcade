import { ZONE } from '../../config/zoneConfig';
import type { GridPoint } from '../maze/GridModel';
import type { GridService } from '../maze/GridService';
import type { ZoneRng } from './zoneRng';
import { spread } from './zoneRng';

export type PoltergeistState = 'away' | 'appear' | 'aim' | 'throw' | 'stunned';

export interface Barrel {
	x: number;
	y: number;
	dx: number;
	dy: number;
}

/**
 * The poltergeist: it shows itself in a straight corridor with the hero, marks the line (a stripe,
 * the telegraph) and throws a barrel down it. Leave the line, or sit in a side turn, and the barrel
 * flies by (it also kills tushkans). A bolt at it while it shows scares it off for a while.
 */
export class Poltergeist {
	state: PoltergeistState = 'away';
	timer: number = ZONE.poltergeist.first;
	at: GridPoint = { x: 0, y: 0 };
	dx = 1;
	dy = 0;
	/** The tiles of the marked line, from the poltergeist to the wall. */
	line: GridPoint[] = [];
	barrel: Barrel | null = null;

	constructor(
		private readonly grid: GridService,
		private readonly rng: ZoneRng,
		/** A wish's price may make it throw more often (a smaller number). */
		private readonly pause = 1
	) {}

	update(dt: number): void {
		const c = ZONE.poltergeist;
		if (this.state === 'throw' && this.barrel) {
			const b = this.barrel;
			b.x += b.dx * c.barrel * dt;
			b.y += b.dy * c.barrel * dt;
			if (!this.grid.isGhostWalkable(Math.floor(b.x), Math.floor(b.y), false)) {
				this.barrel = null;
				this.rest();
			}
			return;
		}
		this.timer -= dt;
		if (this.timer > 0) {
			return;
		}
		if (this.state === 'appear') {
			this.state = 'aim';
			this.timer = c.telegraph;
		} else if (this.state === 'aim') {
			this.state = 'throw';
			this.barrel = { x: this.at.x + 0.5, y: this.at.y + 0.5, dx: this.dx, dy: this.dy };
		} else if (this.state === 'stunned') {
			this.rest();
		}
		// away: the pause is over and it waits for `tryAppear` to find a straight corridor
	}

	/** Tries to show itself on a straight, clear corridor with the hero. Called when `state` is away and the timer is up. */
	tryAppear(hero: GridPoint): void {
		if (this.state !== 'away' || this.timer > 0) {
			return;
		}
		const c = ZONE.poltergeist;
		const options: Array<{ p: GridPoint; dx: number; dy: number }> = [];
		for (const [sx, sy] of [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1]
		]) {
			for (let d = 1; d <= c.range[1]; d += 1) {
				const p = { x: hero.x + sx * d, y: hero.y + sy * d };
				if (!this.grid.isGhostWalkable(p.x, p.y, false)) {
					break;
				}
				if (d >= c.range[0]) {
					options.push({ p, dx: -sx, dy: -sy });
				}
			}
		}
		if (options.length === 0) {
			this.timer = 1;
			return;
		}
		const o = options[Math.floor(this.rng() * options.length)];
		this.at = o.p;
		this.dx = o.dx;
		this.dy = o.dy;
		this.line = [];
		for (
			let p = { x: o.p.x + o.dx, y: o.p.y + o.dy };
			this.grid.isGhostWalkable(p.x, p.y, false);
			p = { x: p.x + o.dx, y: p.y + o.dy }
		) {
			this.line.push(p);
		}
		this.state = 'appear';
		this.timer = c.appear;
	}

	/** A bolt: it flees if it was showing and not yet throwing. */
	scare(): boolean {
		if (this.state !== 'appear' && this.state !== 'aim') {
			return false;
		}
		this.state = 'stunned';
		this.timer = ZONE.poltergeist.stun;
		this.line = [];
		return true;
	}

	/** Gone for now (after a wave too). */
	hide(): void {
		this.barrel = null;
		this.line = [];
		this.rest();
	}

	private rest(): void {
		this.state = 'away';
		this.line = [];
		this.timer =
			spread(this.rng, ZONE.poltergeist.interval[0], ZONE.poltergeist.interval[1]) * this.pause;
	}
}
