import { NET } from '../../config/netConfig';
import { GRID_ZONE } from '../../config/mazes/grid_zone';
import type { PacmanEventMap } from '../../core/Events';
import { EventBus } from '../../engine/EventBus';
import { PlayerService } from '../actors/PlayerService';
import type { PlayerDirection } from '../actors/PlayerModel';
import { LevelProgress } from '../level/LevelProgress';
import { ScoreModel } from '../level/ScoreModel';
import { GridModel } from '../maze/GridModel';
import type { GridPoint } from '../maze/GridModel';
import { GridService } from '../maze/GridService';
import { readZoneMap } from '../zone/ZoneMap';
import type { ZoneMap } from '../zone/ZoneMap';
import { zoneRng } from '../zone/zoneRng';
import { DronePack } from './DronePack';
import { NetDoors } from './NetDoors';

export type NetState = 'play' | 'won' | 'dead';

/**
 * One level of the Net (a boss world candidate): a cyberpunk server maze on the Lady Bug idea. The
 * hero eats the data (the dots) while four security drones hunt him like Pac-Man's ghosts; the doors
 * in the corridors slam shut behind him for the drones; a hack node (the energizers) makes the drones
 * flee and lets him eat them; when the last data is gone the core (the lair) opens, the drones speed
 * up, and reaching the core ends the level. Three hits end it. No waiting anywhere: the hero passes
 * every door, and only the drones cost him a hit.
 */
export class NetService {
	readonly grid = new GridService(new GridModel(GRID_ZONE));
	readonly events = new EventBus<PacmanEventMap>();
	readonly progress: LevelProgress;
	readonly player: PlayerService;
	readonly map: ZoneMap;
	readonly doors: NetDoors;
	readonly drones: DronePack;
	state: NetState = 'play';
	hp: number = NET.hp;
	bonus = 0;
	coreOpen = false;
	/** The hero was hit this frame, for a flash. */
	hurt = false;
	/** Which hack nodes are taken. */
	readonly taken: boolean[];
	readonly news: string[] = [];
	readonly popups: Array<{ x: number; y: number; text: string; age: number }> = [];
	/** A door just slammed: for a flash on it. */
	slammed: { id: number; age: number } | null = null;
	private chain = 0;
	private prev: GridPoint;
	private readonly totalDots: number;

	constructor(seed = 1) {
		const rng = zoneRng(seed);
		this.progress = new LevelProgress(this.grid, new ScoreModel(), this.events);
		this.player = new PlayerService(this.grid, this.progress, this.events);
		this.player.reset();
		this.map = readZoneMap(this.grid);
		this.doors = new NetDoors(this.grid);
		this.drones = new DronePack(this.grid, this.map.burrows, rng);
		this.taken = this.map.artifacts.map(() => false);
		this.totalDots = this.progress.remainingDots;
		this.prev = this.heroTile;
		this.say('Съешь все данные. Двери захлопываются за тобой: дроны их не пройдут.');
	}

	get score(): number {
		return this.progress.score + this.bonus;
	}

	get heroTile(): GridPoint {
		return { x: Math.floor(this.player.position.x), y: Math.floor(this.player.position.y) };
	}

	get dataShare(): number {
		return this.totalDots === 0 ? 1 : 1 - this.progress.remainingDots / this.totalDots;
	}

	/** 1 normally; the drones speed up on the last data. */
	get surge(): number {
		const left = this.progress.remainingDots;
		if (left <= NET.surge.second) {
			return NET.surge.secondMul;
		}
		return left <= NET.surge.first ? NET.surge.firstMul : 1;
	}

	update(dt: number, want: PlayerDirection | null): void {
		this.hurt = false;
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
		this.nodes();
		this.drones.update(dt, {
			hero,
			ahead2: this.ahead(hero, 2),
			ahead4: this.ahead(hero, 4),
			speedMul: this.surge,
			shut: (ax, ay, bx, by) => this.doors.blocks(ax, ay, bx, by)
		});
		this.touch();
		if (!this.coreOpen && this.progress.remainingDots === 0) {
			this.coreOpen = true;
			this.grid.setLairOpen(true);
			this.say('Данные собраны. Ядро открыто: беги к нему!');
		}
		if (this.coreOpen && hero.x === this.map.monolith.x && hero.y === this.map.monolith.y) {
			this.state = 'won';
			this.say('Ядро взломано.');
		}
	}

	/** For the prototype's button: a hack now. */
	cheatHack(): void {
		this.hack();
	}

	/** For the prototype's button: every door shut at once. */
	cheatSlam(): void {
		for (const d of this.doors.list) {
			this.doors.closeNow(d);
		}
	}

	/** For the prototype's button: all the data but a few. */
	cheatNearlyDone(left = 14): void {
		for (let y = 0; y < this.grid.height && this.progress.remainingDots > left; y += 1) {
			for (let x = 0; x < this.grid.width && this.progress.remainingDots > left; x += 1) {
				if (this.grid.isDot(x, y)) {
					this.progress.collectAt(x, y);
				}
			}
		}
	}

	private say(text: string): void {
		this.news.push(text);
		if (this.news.length > 3) {
			this.news.shift();
		}
	}

	private hack(): void {
		this.drones.hack(NET.hack.fear);
		this.chain = 0;
		this.say('Взлом! Дроны бегут: лови их.');
	}

	private nodes(): void {
		this.map.artifacts.forEach((a, i) => {
			if (!this.taken[i] && this.progress.isCollected(a.x, a.y)) {
				this.taken[i] = true;
				this.hack();
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

	private touch(): void {
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
				const worth = NET.hack.eat * 2 ** this.chain;
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
					this.say('Система тебя поймала.');
					return;
				}
				this.player.grantInvulnerability(NET.hitInvulnerable);
			}
		}
	}
}
