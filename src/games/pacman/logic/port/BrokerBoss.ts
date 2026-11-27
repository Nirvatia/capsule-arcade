import { PORT } from '../../config/portConfig';
import type { GridPoint } from '../maze/GridModel';
import type { GridService } from '../maze/GridService';

export type BrokerState = 'travel' | 'hack' | 'stunned' | 'dead';

export interface BrokerWorld {
	readonly hero: GridPoint;
	readonly shut: (ax: number, ay: number, bx: number, by: number) => boolean;
}

export type BrokerEvent = 'hacked' | 'arrived';

/**
 * The Broker, a smuggler AI in a loader's body. He has a plan: hack the four crane terminals one
 * after another, standing at each for a few seconds, then run to the next one, the farthest from the
 * hero. He plans round the shut doors (a hero running ahead of him through a door can cut his way),
 * sprints when the hero is near, and is slowed by a power cell. A bite stuns him; he then warps to
 * the farthest terminal and the plan starts again.
 */
export class BrokerBoss {
	/** Centre, in tiles. */
	x: number;
	y: number;
	fx: number;
	fy: number;
	tx: number;
	ty: number;
	p = 0;
	dx = 1;
	dy = 0;
	state: BrokerState = 'hack';
	hp: number = PORT.boss.hp;
	/** The terminal he works at or runs to. */
	target = 0;
	/** Hack progress, 0..1 (negative: the warp-in pause). */
	progress = 0;
	/** The terminals he has hacked in this run of the plan. */
	readonly hacked: boolean[];
	/** Seconds the power cell still slows him. */
	slowLeft = 0;
	panic = false;
	private stun = 0;
	private map: Int16Array;
	private refresh = 0;
	private wait = 0;

	constructor(
		private readonly grid: GridService,
		private readonly terminals: readonly GridPoint[],
		start: number
	) {
		this.target = start;
		const t = terminals[start];
		this.x = t.x + 0.5;
		this.y = t.y + 0.5;
		this.fx = this.tx = t.x;
		this.fy = this.ty = t.y;
		this.hacked = terminals.map(() => false);
		this.map = new Int16Array(grid.width * grid.height);
		this.progress = -PORT.boss.warpDelay;
	}

	/** 1, 2 or 3: the phase, from his health. */
	get phase(): number {
		return PORT.boss.hp - this.hp + 1;
	}

	get hacks(): number {
		return this.hacked.filter(Boolean).length;
	}

	/** The speed now, in tiles a second. */
	get speed(): number {
		let v = PORT.boss.speed[this.phase - 1];
		if (this.panic) {
			v *= PORT.boss.panic;
		}
		return this.slowLeft > 0 ? v * PORT.boss.slow : v;
	}

	update(dt: number, w: BrokerWorld): BrokerEvent[] {
		const events: BrokerEvent[] = [];
		this.slowLeft = Math.max(0, this.slowLeft - dt);
		if (this.state === 'dead') {
			return events;
		}
		if (this.state === 'stunned') {
			this.stun -= dt;
			if (this.stun <= 0) {
				this.warp(w.hero);
			}
			return events;
		}
		if (this.state === 'hack') {
			const need = PORT.boss.hack[this.phase - 1];
			this.progress += (dt / need) * (this.slowLeft > 0 ? 0.5 : 1);
			if (this.progress >= 1) {
				this.hacked[this.target] = true;
				events.push('hacked');
				this.progress = 0;
				if (this.hacks < this.terminals.length) {
					this.target = this.farthestFrom(w.hero);
					this.state = 'travel';
					this.refresh = 0;
				}
			}
			return events;
		}
		this.panic =
			Math.hypot(this.x - (w.hero.x + 0.5), this.y - (w.hero.y + 0.5)) < PORT.boss.panicDist;
		this.refresh -= dt;
		if (this.refresh <= 0) {
			this.refresh = 0.15;
			this.fill(this.terminals[this.target], w.shut);
		}
		if (this.wait > 0) {
			this.wait -= dt;
			return events;
		}
		this.p += this.speed * dt;
		while (this.p >= 1) {
			this.p -= 1;
			this.fx = this.tx;
			this.fy = this.ty;
			if (this.fx === this.terminals[this.target].x && this.fy === this.terminals[this.target].y) {
				this.p = 0;
				this.state = 'hack';
				this.progress = 0;
				events.push('arrived');
				break;
			}
			this.aim(w);
		}
		if (this.fx === this.tx && this.fy === this.ty && this.state === 'travel') {
			this.aim(w);
		}
		this.x = this.fx + 0.5 + (this.tx - this.fx) * this.p;
		this.y = this.fy + 0.5 + (this.ty - this.fy) * this.p;
		return events;
	}

	/** A bite: one hit of health, a stun, then a warp. Returns true when it was the last. */
	bitten(): boolean {
		this.hp -= 1;
		if (this.hp <= 0) {
			this.state = 'dead';
			return true;
		}
		this.state = 'stunned';
		this.stun = PORT.boss.stun;
		return false;
	}

	/** A power cell: he slows down for a while. */
	slow(): void {
		this.slowLeft = PORT.boss.slowFor;
	}

	/** Only for the stun and the hack: a bite can land. */
	get bitable(): boolean {
		return this.state === 'travel' || this.state === 'hack';
	}

	private warp(hero: GridPoint): void {
		this.hacked.fill(false);
		this.target = this.farthestFrom(hero);
		const t = this.terminals[this.target];
		this.fx = this.tx = t.x;
		this.fy = this.ty = t.y;
		this.p = 0;
		this.x = t.x + 0.5;
		this.y = t.y + 0.5;
		this.state = 'hack';
		this.progress = -PORT.boss.warpDelay;
	}

	/** The terminal he has not hacked yet that is farthest from the hero. */
	private farthestFrom(hero: GridPoint): number {
		let best = -1;
		let bd = -1;
		this.terminals.forEach((t, i) => {
			if (this.hacked[i]) {
				return;
			}
			const d = Math.abs(t.x - hero.x) + Math.abs(t.y - hero.y);
			if (d > bd) {
				bd = d;
				best = i;
			}
		});
		return Math.max(0, best);
	}

	private aim(w: BrokerWorld): void {
		const here = { x: this.fx, y: this.fy };
		const opts = [
			[0, -1],
			[-1, 0],
			[0, 1],
			[1, 0]
		]
			.map(([dx, dy]) => ({ x: here.x + dx, y: here.y + dy, dx, dy }))
			.filter(
				(o) => this.grid.isGhostWalkable(o.x, o.y, false) && !w.shut(here.x, here.y, o.x, o.y)
			);
		const myD = this.map[here.y * this.grid.width + here.x];
		let best: (typeof opts)[number] | null = null;
		let bd = Infinity;
		for (const o of opts) {
			const v = this.map[o.y * this.grid.width + o.x];
			if (v >= 0 && v < bd && (myD < 0 || v < myD)) {
				bd = v;
				best = o;
			}
		}
		if (!best) {
			// shut in by doors: wait for one to open
			this.tx = this.fx;
			this.ty = this.fy;
			this.p = 0;
			this.wait = 0.25;
			return;
		}
		this.tx = best.x;
		this.ty = best.y;
		this.dx = best.dx;
		this.dy = best.dy;
	}

	/** Steps from `from` over the corridors, round the shut doors; -1 where it cannot be reached. */
	private fill(from: GridPoint, shut: BrokerWorld['shut']): void {
		this.map.fill(-1);
		const W = this.grid.width;
		const q: number[] = [from.y * W + from.x];
		this.map[q[0]] = 0;
		for (let i = 0; i < q.length; i += 1) {
			const x = q[i] % W;
			const y = Math.floor(q[i] / W);
			for (const [dx, dy] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1]
			]) {
				const nx = x + dx;
				const ny = y + dy;
				if (
					this.grid.isGhostWalkable(nx, ny, false) &&
					this.map[ny * W + nx] < 0 &&
					!shut(x, y, nx, ny)
				) {
					this.map[ny * W + nx] = this.map[y * W + x] + 1;
					q.push(ny * W + nx);
				}
			}
		}
	}
}
