import { ZONE } from '../../config/zoneConfig';
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
import { EmissionClock } from './EmissionClock';
import { Poltergeist } from './Poltergeist';
import { TushkanPack } from './TushkanPack';
import { ZoneAnomalies } from './ZoneAnomalies';
import { applyWish, NO_MODIFIERS, offerWishes } from './ZoneWishes';
import type { Modifiers, Wish } from './ZoneWishes';
import { readZoneMap } from './ZoneMap';
import type { ZoneMap } from './ZoneMap';
import { zoneRng } from './zoneRng';

export type ZoneState = 'play' | 'wish' | 'cleared' | 'dead';
export type ZoneSource = 'tushkan' | 'anomaly' | 'barrel' | 'wave';

/** The four artifacts, in the order of the corner energizers (row by row): what each gives. */
export const ARTIFACTS = [
	{ id: 'medusa', title: 'Медуза', note: 'аномалии затихают на 8 с' },
	{ id: 'kolobok', title: 'Колобок', note: 'ты быстрее на 8 с' },
	{ id: 'stone', title: 'Каменная кровь', note: '+1 жизнь' },
	{ id: 'battery', title: 'Батарейка', note: 'болты до полного' }
] as const;

/**
 * One level of the Zone (a boss world candidate): the maze, the hero, the anomaly field, the
 * emission, the tushkans, the poltergeist, the bolts, the artifacts and the Wish Granter. The hero
 * walks by the game's own `PlayerService`; this class is everything the Zone adds.
 */
export class ZoneService {
	readonly grid = new GridService(new GridModel(GRID_ZONE));
	readonly events = new EventBus<PacmanEventMap>();
	readonly progress: LevelProgress;
	readonly player: PlayerService;
	readonly map: ZoneMap;
	readonly anomalies: ZoneAnomalies;
	readonly emission: EmissionClock;
	readonly tushkans: TushkanPack;
	readonly poltergeist: Poltergeist;
	state: ZoneState = 'play';
	hp: number;
	readonly hpMax: number;
	bolts = 0;
	/** The bolt's noise: a tile and the time it ends. */
	lure: { tile: GridPoint; until: number } | null = null;
	/** Where the last bolt flew, for the drawing: from, to, age. */
	flight: { from: GridPoint; to: GridPoint; age: number } | null = null;
	readonly taken: boolean[];
	offered: Wish[] = [];
	chosen: Wish | null = null;
	monolithOpen = false;
	/** Seconds the Colobok / the Medusa still last. */
	speedLeft = 0;
	medusaLeft = 0;
	/** Short messages for the screen: what just happened. */
	readonly news: string[] = [];
	/** The hero was hurt this frame, for a flash: the source. */
	hurt: ZoneSource | null = null;
	score = 0;
	private clock = 0;
	private nutCount = 0;
	private lastDots = 0;
	private readonly rng;
	private readonly totalDots: number;

	constructor(
		seed = 1,
		readonly mods: Modifiers = NO_MODIFIERS
	) {
		this.rng = zoneRng(seed);
		this.progress = new LevelProgress(this.grid, new ScoreModel(), this.events);
		this.player = new PlayerService(this.grid, this.progress, this.events);
		this.player.reset();
		this.player.setSpeedModifier(mods.heroSpeed);
		this.map = readZoneMap(this.grid);
		this.anomalies = new ZoneAnomalies(this.grid, this.map, this.rng, mods.anomalyScale);
		this.emission = new EmissionClock(mods.calmScale, mods.noEmission);
		this.tushkans = new TushkanPack(this.grid, this.map.burrows, this.rng, mods.tushkanSpeed);
		this.poltergeist = new Poltergeist(this.grid, this.rng, mods.poltergeistPause);
		this.hpMax = ZONE.hp + mods.hpBonus;
		this.hp = this.hpMax;
		this.taken = this.map.artifacts.map(() => false);
		this.totalDots = this.progress.remainingDots;
		this.score = mods.score;
		this.say('Собери четыре артефакта и половину гаек: Монолит откроется.');
	}

	get boltMax(): number {
		return this.mods.boltMax;
	}

	get heroTile(): GridPoint {
		return { x: Math.floor(this.player.position.x), y: Math.floor(this.player.position.y) };
	}

	get artifactsTaken(): number {
		return this.taken.filter(Boolean).length;
	}

	get nutShare(): number {
		return this.totalDots === 0 ? 1 : this.progress.collectedDots / this.totalDots;
	}

	/** Is the hero on a bunker hatch? */
	get sheltered(): boolean {
		const t = this.heroTile;
		return this.map.shelters.some((s) => s.x === t.x && s.y === t.y);
	}

	update(dt: number, want: PlayerDirection | null): void {
		this.hurt = null;
		if (this.state === 'dead' || this.state === 'cleared') {
			return;
		}
		if (this.flight) {
			this.flight.age += dt;
			if (this.flight.age > 0.25) {
				this.flight = null;
			}
		}
		if (this.state === 'wish') {
			return;
		}
		this.clock += dt;
		if (want) {
			this.player.setDesiredDirection(want);
		}
		this.speedLeft = Math.max(0, this.speedLeft - dt);
		this.medusaLeft = Math.max(0, this.medusaLeft - dt);
		this.player.setSpeedModifier(
			this.mods.heroSpeed * (this.speedLeft > 0 ? ZONE.artifacts.speedFactor : 1)
		);
		this.player.update(dt);
		this.anomalies.update(dt);
		if (this.medusaLeft > 0) {
			this.anomalies.disarmAll(0.2);
		}
		const hero = this.heroTile;
		this.collect();
		this.tushkansStep(dt, hero);
		this.poltergeistStep(dt, hero);
		this.emissionStep(dt);
		this.anomalyHits(hero);
		if (this.monolithOpen && hero.x === this.map.monolith.x && hero.y === this.map.monolith.y) {
			this.state = 'wish';
			this.offered = offerWishes(this.rng);
			this.say('Исполнитель желаний слушает. Каждое желание чего-то стоит.');
		}
	}

	/** Throws a bolt ahead: the first anomaly it meets goes inert, a poltergeist is scared, a tushkan killed; else it lands as a noise. */
	throwBolt(): boolean {
		const facing = this.player.facing ?? this.player.desired;
		if (this.state !== 'play' || this.bolts <= 0 || !facing) {
			return false;
		}
		this.bolts -= 1;
		const [dx, dy] = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0] }[facing];
		const from = this.heroTile;
		let at = from;
		for (let i = 1; i <= ZONE.bolt.range; i += 1) {
			const p = { x: from.x + dx * i, y: from.y + dy * i };
			if (!this.grid.isGhostWalkable(p.x, p.y, false)) {
				break;
			}
			at = p;
			const a = this.anomalies.liveAt(p.x, p.y);
			if (a) {
				this.anomalies.disarm(a, ZONE.bolt.disarm);
				this.say('Болт сработал: аномалия затихла.');
				this.flight = { from, to: p, age: 0 };
				return true;
			}
			if (this.poltergeistHere(p) && this.poltergeist.scare()) {
				this.say('Полтергейст испугался.');
				this.flight = { from, to: p, age: 0 };
				return true;
			}
			const t = this.tushkans.at(p.x, p.y);
			if (t) {
				this.tushkans.kill(t);
				this.flight = { from, to: p, age: 0 };
				return true;
			}
		}
		this.lure = { tile: at, until: this.clock + ZONE.bolt.lure };
		this.flight = { from, to: at, age: 0 };
		return true;
	}

	chooseWish(id: string): void {
		const w = this.offered.find((o) => o.id === id);
		if (this.state !== 'wish' || !w) {
			return;
		}
		this.chosen = w;
		this.state = 'cleared';
		this.say(`Желание исполнено: ${w.boon}. Цена: ${w.price}.`);
	}

	/** The modifiers of the next level: this level's plus the chosen wish. */
	nextModifiers(): Modifiers {
		return this.chosen ? applyWish(this.mods, this.chosen) : this.mods;
	}

	/** For the prototype's button: all the artifacts and enough nuts at once (the Monolith opens). */
	cheatOpen(): void {
		for (const a of this.map.artifacts) {
			this.progress.collectAt(a.x, a.y);
		}
		for (let y = 0; y < this.grid.height && this.nutShare < ZONE.dotsNeeded; y += 1) {
			for (let x = 0; x < this.grid.width && this.nutShare < ZONE.dotsNeeded; x += 1) {
				if (this.grid.isDot(x, y)) {
					this.progress.collectAt(x, y);
				}
			}
		}
	}

	private say(text: string): void {
		this.news.push(text);
		if (this.news.length > 4) {
			this.news.shift();
		}
	}

	private poltergeistHere(p: GridPoint): boolean {
		return (
			this.poltergeist.state !== 'away' &&
			this.poltergeist.state !== 'stunned' &&
			this.poltergeist.at.x === p.x &&
			this.poltergeist.at.y === p.y
		);
	}

	private hit(n: number, source: ZoneSource): void {
		if (this.player.isInvulnerable || this.state !== 'play') {
			return;
		}
		this.hp -= n;
		this.hurt = source;
		if (this.hp <= 0) {
			this.hp = 0;
			this.state = 'dead';
			this.say('Зона забрала тебя.');
			return;
		}
		this.player.grantInvulnerability(ZONE.hitInvulnerable);
	}

	/** The nuts feed the bolts; the artifacts act; the Monolith opens. */
	private collect(): void {
		const dots = this.progress.collectedDots;
		this.nutCount += dots - this.lastDots;
		this.lastDots = dots;
		while (this.nutCount >= ZONE.bolt.dotsPer) {
			this.nutCount -= ZONE.bolt.dotsPer;
			this.bolts = Math.min(this.boltMax, this.bolts + 1);
		}
		this.bolts = Math.min(this.boltMax, this.bolts);
		this.map.artifacts.forEach((a, i) => {
			if (this.taken[i] || !this.progress.isCollected(a.x, a.y)) {
				return;
			}
			this.taken[i] = true;
			const art = ARTIFACTS[i % ARTIFACTS.length];
			this.say(`${art.title}: ${art.note}.`);
			if (art.id === 'medusa') {
				this.medusaLeft = ZONE.artifacts.medusa;
			} else if (art.id === 'kolobok') {
				this.speedLeft = ZONE.artifacts.speed;
			} else if (art.id === 'stone') {
				this.hp = Math.min(this.hpMax, this.hp + 1);
			} else {
				this.bolts = this.boltMax;
			}
		});
		if (
			!this.monolithOpen &&
			this.artifactsTaken === this.map.artifacts.length &&
			this.nutShare >= ZONE.dotsNeeded
		) {
			this.monolithOpen = true;
			this.grid.setLairOpen(true);
			this.say('Монолит открыт.');
		}
	}

	private tushkansStep(dt: number, hero: GridPoint): void {
		const lure = this.lure && this.lure.until > this.clock ? this.lure.tile : null;
		if (!lure) {
			this.lure = null;
		}
		this.tushkans.update(dt, {
			hero,
			lure,
			deadly: (x, y) => this.anomalies.hazardAt(x, y) !== null
		});
		for (const t of this.tushkans.list) {
			if (
				t.state !== 'dead' &&
				t.state !== 'tired' &&
				Math.hypot(t.x - this.player.position.x, t.y - this.player.position.y) < ZONE.tushkan.bite
			) {
				if (!this.player.isInvulnerable) {
					this.hit(1, 'tushkan');
					this.tushkans.bitten(t);
				}
			}
		}
	}

	private poltergeistStep(dt: number, hero: GridPoint): void {
		const p = this.poltergeist;
		p.update(dt);
		p.tryAppear(hero);
		if (p.barrel) {
			const b = p.barrel;
			if (Math.hypot(b.x - this.player.position.x, b.y - this.player.position.y) < 0.55) {
				this.hit(1, 'barrel');
			}
			const t = this.tushkans.at(Math.floor(b.x), Math.floor(b.y));
			if (t) {
				this.tushkans.kill(t);
			}
		}
	}

	private emissionStep(dt: number): void {
		for (const e of this.emission.update(dt)) {
			if (e === 'siren') {
				this.say('Сирена! Беги в укрытие (люк в полу).');
			} else if (e === 'peak') {
				if (!this.sheltered) {
					this.hit(ZONE.emission.hit, 'wave');
				}
				this.tushkans.killAll();
				this.poltergeist.hide();
			} else if (e === 'over') {
				this.anomalies.reshuffle();
				this.say('Выброс прошёл. Аномалии переместились.');
			}
		}
	}

	private anomalyHits(hero: GridPoint): void {
		const a = this.anomalies.hazardAt(hero.x, hero.y);
		if (a) {
			this.hit(1, 'anomaly');
		}
		const tr = this.anomalies.trampolineAt(hero.x, hero.y);
		if (tr && !this.player.isDashing) {
			tr.cooldownUntil = this.anomalies.now + ZONE.trampoline.cooldown;
			this.player.startDash(ZONE.trampoline.tiles);
		}
	}
}
