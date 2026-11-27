import { PORT } from '../../config/portConfig';
import { GRID_PORT } from '../../config/mazes/grid_port';
import { NET } from '../../config/netConfig';
import type { PacmanEventMap } from '../../core/Events';
import { EventBus } from '../../engine/EventBus';
import { PlayerService } from '../actors/PlayerService';
import type { PlayerDirection } from '../actors/PlayerModel';
import { LevelProgress } from '../level/LevelProgress';
import { ScoreModel } from '../level/ScoreModel';
import { GridModel } from '../maze/GridModel';
import type { GridPoint } from '../maze/GridModel';
import { GridService } from '../maze/GridService';
import { DronePack } from '../net/DronePack';
import { NetDoors } from '../net/NetDoors';
import { readZoneMap } from '../zone/ZoneMap';
import { zoneRng } from '../zone/zoneRng';
import { BrokerBoss } from './BrokerBoss';

export type PortState = 'play' | 'won' | 'dead' | 'escaped';

/**
 * One level of the Port (a boss world candidate): the hero hunts the Broker. The Broker hacks the four
 * crane terminals one after another and runs between them; the hero must reach him, bite him (three
 * bites end him, each heals the hero and sends him to the farthest terminal), while the port's
 * security drones hunt the hero (the only thing that costs a hit) and a new drone wakes with every
 * terminal hacked. The hero never waits: he dashes (charged by nuts), slams the yard doors shut behind
 * him for the drones and for the Broker's way, and a power cell makes the drones flee and slows the
 * Broker. If the Broker hacks all four, he gets away and the level is lost.
 */
export class PortService {
	readonly grid = new GridService(new GridModel(GRID_PORT));
	readonly events = new EventBus<PacmanEventMap>();
	readonly progress: LevelProgress;
	readonly player: PlayerService;
	readonly doors: NetDoors;
	readonly drones: DronePack;
	readonly boss: BrokerBoss;
	readonly terminals: readonly GridPoint[] = PORT.terminals;
	readonly cells: readonly GridPoint[];
	readonly cellTaken: boolean[];
	state: PortState = 'play';
	hp: number = PORT.hp;
	dashCharges = 0;
	bonus = 0;
	hurt = false;
	/** The Broker was bitten this frame, for a flash. */
	bit = false;
	readonly news: string[] = [];
	readonly popups: Array<{ x: number; y: number; text: string; age: number }> = [];
	slammed: { id: number; age: number } | null = null;
	private chain = 0;
	private prev: GridPoint;
	private nutCount = 0;
	private lastDots = 0;

	constructor(seed = 1) {
		const rng = zoneRng(seed);
		this.progress = new LevelProgress(this.grid, new ScoreModel(), this.events);
		this.player = new PlayerService(this.grid, this.progress, this.events);
		this.player.reset();
		const map = readZoneMap(this.grid);
		this.cells = map.artifacts;
		this.cellTaken = this.cells.map(() => false);
		this.doors = new NetDoors(this.grid);
		this.drones = new DronePack(this.grid, map.burrows, rng, PORT.drones.count, PORT.drones.active);
		const spawn = this.grid.playerSpawn;
		let far = 0;
		this.terminals.forEach((t, i) => {
			if (
				Math.abs(t.x - spawn.x) + Math.abs(t.y - spawn.y) >
				Math.abs(this.terminals[far].x - spawn.x) + Math.abs(this.terminals[far].y - spawn.y)
			) {
				far = i;
			}
		});
		this.boss = new BrokerBoss(this.grid, this.terminals, far);
		this.prev = this.heroTile;
		this.say('Брокер взламывает терминалы. Догони и укуси его!');
	}

	get score(): number {
		return this.progress.score + this.bonus;
	}

	get heroTile(): GridPoint {
		return { x: Math.floor(this.player.position.x), y: Math.floor(this.player.position.y) };
	}

	update(dt: number, want: PlayerDirection | null): void {
		this.hurt = false;
		this.bit = false;
		for (const p of this.popups) {
			p.age += dt;
		}
		while (this.popups.length > 0 && this.popups[0].age > 1.1) {
			this.popups.shift();
		}
		if (this.slammed) {
			this.slammed.age += dt;
			if (this.slammed.age > 0.4) {
				this.slammed = null;
			}
		}
		if (this.state !== 'play') {
			return;
		}
		if (want) {
			this.player.setDesiredDirection(want);
		}
		this.player.update(dt);
		this.doors.update(dt);
		const hero = this.heroTile;
		if (hero.x !== this.prev.x || hero.y !== this.prev.y) {
			if (Math.abs(hero.x - this.prev.x) + Math.abs(hero.y - this.prev.y) === 1) {
				const d = this.doors.passed(this.prev, hero);
				if (d) {
					this.slammed = { id: d.id, age: 0 };
				}
			}
			this.prev = hero;
		}
		this.collect();
		const shut = (ax: number, ay: number, bx: number, by: number): boolean =>
			this.doors.blocks(ax, ay, bx, by);
		for (const e of this.boss.update(dt, { hero, shut })) {
			if (e === 'hacked') {
				const woke = this.drones.callExtra();
				this.say(
					`Терминал ${this.boss.hacks} из ${this.terminals.length} взломан!${woke ? ' Тревога: ещё дрон.' : ''}`
				);
				if (this.boss.hacks >= this.terminals.length) {
					this.state = 'escaped';
					this.say('Брокер сбежал.');
					return;
				}
			}
		}
		this.drones.update(dt, {
			hero,
			ahead2: this.ahead(hero, 2),
			ahead4: this.ahead(hero, 4),
			speedMul: 1,
			shut
		});
		this.touchBoss();
		if (this.state === 'play') {
			this.touchDrones();
		}
	}

	/** The dash: charged by nuts, four tiles along the heading, safe while it lasts. */
	dash(): boolean {
		if (
			this.state !== 'play' ||
			this.dashCharges <= 0 ||
			this.player.isDashing ||
			!this.player.facing
		) {
			return false;
		}
		this.dashCharges -= 1;
		this.player.startDash(PORT.dash.tiles);
		return true;
	}

	/** For the prototype's button: a power cell now. */
	cheatCell(): void {
		this.takeCell();
	}

	/** For the prototype's button: every door shut at once. */
	cheatSlam(): void {
		for (const d of this.doors.list) {
			this.doors.closeNow(d);
		}
	}

	private say(text: string): void {
		this.news.push(text);
		if (this.news.length > 3) {
			this.news.shift();
		}
	}

	private takeCell(): void {
		this.drones.hack(PORT.cell.fear);
		this.boss.slow();
		this.chain = 0;
		this.say('Энергоячейка! Дроны бегут, Брокер замедлен.');
	}

	private collect(): void {
		const dots = this.progress.collectedDots;
		this.nutCount += dots - this.lastDots;
		this.lastDots = dots;
		while (this.nutCount >= PORT.dash.nuts) {
			this.nutCount -= PORT.dash.nuts;
			this.dashCharges = Math.min(PORT.dash.max, this.dashCharges + 1);
		}
		this.cells.forEach((c, i) => {
			if (!this.cellTaken[i] && this.progress.isCollected(c.x, c.y)) {
				this.cellTaken[i] = true;
				this.takeCell();
			}
		});
	}

	private ahead(hero: GridPoint, n: number): GridPoint {
		const f = this.player.facing ?? this.player.desired;
		const [dx, dy] = f ? { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0] }[f] : [0, 0];
		let at = hero;
		for (let i = 1; i <= n; i += 1) {
			const p = { x: hero.x + dx * i, y: hero.y + dy * i };
			if (!this.grid.isGhostWalkable(p.x, p.y, false)) {
				break;
			}
			at = p;
		}
		return at;
	}

	/** Touching the Broker is a bite (he does not hurt the hero). */
	private touchBoss(): void {
		const b = this.boss;
		if (
			!b.bitable ||
			Math.hypot(b.x - this.player.position.x, b.y - this.player.position.y) >= PORT.boss.bite
		) {
			return;
		}
		this.bit = true;
		this.bonus += PORT.score.bite;
		this.popups.push({ x: b.x, y: b.y, text: `+${PORT.score.bite}`, age: 0 });
		this.hp = Math.min(PORT.hp, this.hp + 1);
		this.drones.dismissExtras(PORT.drones.active);
		if (b.bitten()) {
			this.state = 'won';
			this.say('Брокер уничтожен!');
		} else {
			this.say(`Укус! Брокеру осталось ${b.hp}. Он телепортируется на дальний терминал.`);
		}
	}

	private touchDrones(): void {
		if (this.drones.fear <= 0) {
			this.chain = 0;
		}
		for (const d of this.drones.list) {
			if (d.state === 'wait' || d.state === 'dead') {
				continue;
			}
			if (
				Math.hypot(d.x - this.player.position.x, d.y - this.player.position.y) >= NET.drone.bite
			) {
				continue;
			}
			if (d.state === 'fright') {
				const worth = PORT.cell.eat * 2 ** this.chain;
				this.bonus += worth;
				this.chain = Math.min(3, this.chain + 1);
				this.popups.push({ x: d.x, y: d.y, text: `+${worth}`, age: 0 });
				this.drones.eat(d);
			} else if (!this.player.isInvulnerable) {
				this.hp -= 1;
				this.hurt = true;
				this.drones.bitten(d);
				if (this.hp <= 0) {
					this.hp = 0;
					this.state = 'dead';
					this.say('Охрана порта тебя поймала.');
					return;
				}
				this.player.grantInvulnerability(PORT.hitInvulnerable);
			}
		}
	}
}
