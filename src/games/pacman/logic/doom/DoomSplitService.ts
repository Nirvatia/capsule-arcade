import { NET } from '../../config/netConfig';
import type { PacmanEventMap } from '../../core/Events';
import type { EventBus } from '../../engine/EventBus';
import type { PlayerService } from '../actors/PlayerService';
import type { LevelProgress } from '../level/LevelProgress';
import type { ScoreModel } from '../level/ScoreModel';
import type { GridPoint } from '../maze/GridModel';
import type { GhostKind } from '../maze/GridModel';
import type { GridService } from '../maze/GridService';
import type { Drone } from '../net/DronePack';
import { DronePack } from '../net/DronePack';
import { zoneRng } from '../zone/zoneRng';
import type { DoomBossService } from './DoomBossService';
import {
	PHASE_THRESHOLDS,
	SPLIT_BURST,
	SPLIT_FEAR,
	SPLIT_FORM_STUN,
	SPLIT_GHOST_DAMAGE,
	SPLIT_GHOST_SCORE,
	SPLIT_MERGE,
	SPLIT_PACMAN
} from './DoomBalance';

/** `omen`: the old phase transition (he stands and shakes); then the burst, Pac-Man, the return. */
export type DoomSplitStage = 'off' | 'omen' | 'burst' | 'pacman' | 'merge';

/** The omen lasts at least this long, even when the boss's transition is already over. */
const OMEN_MIN = 0.4;
/** The four leave the core one after another. */
const RELEASE_STEP = 0.3;
const GHOSTS: readonly GhostKind[] = ['BLINKY', 'PINKY', 'INKY', 'CLYDE'];
/** Where each of the four hangs about: Blinky by the lair's door, two on the sides, one below. */
const HOMES: readonly GridPoint[] = [
	{ x: 12, y: 10 },
	{ x: 4, y: 8 },
	{ x: 20, y: 8 },
	{ x: 12, y: 18 }
];
const STEP: Record<string, readonly [number, number]> = {
	UP: [0, -1],
	DOWN: [0, 1],
	LEFT: [-1, 0],
	RIGHT: [1, 0]
};

/**
 * The boss's split (DESIGN §7 "The fight, redesigned"): at each phase threshold he bursts where he
 * stands, his flesh refills the food and his core stays on that tile; for `SPLIT_PACMAN` it is plain
 * Pac-Man against four ghosts (the classic chase, `DronePack`) with the corner energizers lit, the
 * weapons off. Then the rest run back to the core and he forms there: all four eaten, he is stunned
 * (the window for a real hit) and loses nothing; fewer, no stun and `SPLIT_GHOST_DAMAGE` per ghost.
 * The boss is not updated while the split is `active`.
 */
export class DoomSplitService {
	private readonly pack: DronePack;
	private stageValue: DoomSplitStage = 'off';
	private stageTime = 0;
	private coreValue: GridPoint | null = null;
	private eatenValue = 0;
	private chain = 0;
	private merging: Array<{ x: number; y: number; ghost: number }> = [];
	private burstValue = false;

	constructor(
		private readonly grid: GridService,
		private readonly progress: LevelProgress,
		private readonly score: ScoreModel,
		private readonly events: EventBus<PacmanEventMap>
	) {
		this.pack = new DronePack(grid, HOMES, zoneRng(5), GHOSTS.length, 0);
		this.sleepAll();
	}

	get stage(): DoomSplitStage {
		return this.stageValue;
	}

	/** The boss is four ghosts: he is not updated, the weapons and the pickups are off. */
	get active(): boolean {
		return (
			this.stageValue === 'burst' || this.stageValue === 'pacman' || this.stageValue === 'merge'
		);
	}

	get stageElapsed(): number {
		return this.stageTime;
	}

	/** Seconds of Pac-Man left (the whole length before it starts, 0 after). */
	get timeLeft(): number {
		if (this.stageValue === 'burst') {
			return SPLIT_PACMAN;
		}
		return this.stageValue === 'pacman' ? Math.max(0, SPLIT_PACMAN - this.stageTime) : 0;
	}

	get core(): GridPoint | null {
		return this.coreValue;
	}

	get eaten(): number {
		return this.eatenValue;
	}

	get fear(): number {
		return this.pack.fear;
	}

	/** The four on the field (index is the ghost: 0 Blinky, 1 Pinky, 2 Inky, 3 Clyde). */
	get ghosts(): ReadonlyArray<{ readonly drone: Readonly<Drone>; readonly index: number }> {
		const out: Array<{ drone: Drone; index: number }> = [];
		this.pack.list.forEach((drone, index) => {
			if (drone.state === 'hunt' || drone.state === 'fright') {
				out.push({ drone, index });
			}
		});
		return out;
	}

	/** On the way back: where each one started from (it eases to the core over `SPLIT_MERGE`). */
	get mergeFrom(): ReadonlyArray<{
		readonly x: number;
		readonly y: number;
		readonly ghost: number;
	}> {
		return this.merging;
	}

	/** The burst happened this frame (for the effect). */
	consumeBurst(): boolean {
		const value = this.burstValue;
		this.burstValue = false;
		return value;
	}

	/** The boss crossed a threshold: his transition is the omen. */
	startOmen(): void {
		if (this.stageValue !== 'off') {
			return;
		}
		this.enter('omen');
	}

	/** `hurt` is called when a ghost touches the hero. */
	update(dt: number, player: PlayerService, boss: DoomBossService, hurt: () => void): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('DoomSplitService.update', 'invalid delta time', dt);
			return;
		}
		if (this.stageValue === 'off') {
			return;
		}
		this.stageTime += dt;
		if (this.stageValue === 'omen') {
			if (this.stageTime >= OMEN_MIN && boss.state !== 'TRANSITION') {
				this.burst(boss.tile);
			}
			return;
		}
		if (this.stageValue === 'merge') {
			if (this.stageTime >= SPLIT_MERGE) {
				this.form(boss);
			}
			return;
		}
		if (this.stageValue === 'burst' && this.stageTime >= SPLIT_BURST) {
			this.enter('pacman');
		}
		if (this.progress.consumePendingEnergizer()) {
			this.pack.hack(SPLIT_FEAR);
			this.chain = 0;
		}
		this.moveGhosts(dt, player);
		this.touches(player, hurt);
		if (
			this.eatenValue >= GHOSTS.length ||
			(this.stageValue === 'pacman' && this.stageTime >= SPLIT_PACMAN)
		) {
			this.merging = [];
			this.pack.list.forEach((d, ghost) => {
				if (d.state !== 'dead') {
					this.merging.push({ x: d.x, y: d.y, ghost });
				}
			});
			this.sleepAll();
			this.enter('merge');
		}
	}

	reset(): void {
		this.stageValue = 'off';
		this.stageTime = 0;
		this.coreValue = null;
		this.eatenValue = 0;
		this.chain = 0;
		this.merging = [];
		this.burstValue = false;
		this.pack.fear = 0;
		this.sleepAll();
	}

	private enter(stage: DoomSplitStage): void {
		this.stageValue = stage;
		this.stageTime = 0;
	}

	private burst(tile: GridPoint): void {
		this.coreValue = { x: tile.x, y: tile.y };
		this.eatenValue = 0;
		this.chain = 0;
		this.burstValue = true;
		// his flesh splatters into new food: every eaten tile fills again, the energizers light up
		this.progress.resetDots();
		this.pack.fear = 0;
		this.pack.list.forEach((d, i) => {
			Object.assign(d, {
				fx: tile.x,
				fy: tile.y,
				tx: tile.x,
				ty: tile.y,
				p: 0,
				x: tile.x + 0.5,
				y: tile.y + 0.5,
				dx: 0,
				dy: 0
			});
			d.state = 'wait';
			d.timer = SPLIT_BURST + i * RELEASE_STEP;
		});
		this.enter('burst');
	}

	private moveGhosts(dt: number, player: PlayerService): void {
		const t = player.tile;
		const facing = player.facing;
		const ahead = (n: number): GridPoint => {
			let at: GridPoint = { x: t.x, y: t.y };
			if (!facing) {
				return at;
			}
			const [dx, dy] = STEP[facing];
			for (let i = 1; i <= n; i += 1) {
				const next = { x: t.x + dx * i, y: t.y + dy * i };
				if (!this.grid.isGhostWalkable(next.x, next.y, false)) {
					break;
				}
				at = next;
			}
			return at;
		};
		this.pack.update(dt, {
			hero: t,
			ahead2: ahead(2),
			ahead4: ahead(4),
			speedMul: 1,
			shut: () => false
		});
		if (this.pack.fear <= 0) {
			this.chain = 0;
		}
	}

	private touches(player: PlayerService, hurt: () => void): void {
		const p = player.position;
		this.pack.list.forEach((d, i) => {
			if (d.state !== 'hunt' && d.state !== 'fright') {
				return;
			}
			if (Math.hypot(d.x - p.x, d.y - p.y) >= NET.drone.bite) {
				return;
			}
			if (d.state === 'fright') {
				const points = SPLIT_GHOST_SCORE * 2 ** this.chain;
				this.chain = Math.min(3, this.chain + 1);
				this.eatenValue += 1;
				this.score.add(points);
				this.events.emit('audio:cue', { cue: 'ghost-eaten' });
				this.events.emit('fx:event', {
					kind: 'ghost-eaten',
					x: d.x,
					y: d.y,
					points,
					ghost: GHOSTS[i]
				});
				this.pack.eat(d);
				this.sleep(d);
			} else {
				hurt();
				this.pack.bitten(d);
			}
		});
	}

	/** The rest are back in the core: the boss forms there. */
	private form(boss: DoomBossService): void {
		this.progress.clearEnergizers();
		const eaten = this.eatenValue;
		if (eaten >= GHOSTS.length) {
			boss.applyStun(SPLIT_FORM_STUN);
		} else if (eaten > 0) {
			// never down to the next threshold: the split's damage does not end a phase
			const floor = boss.phase <= 2 ? PHASE_THRESHOLDS[1] + 1 : 1;
			const damage = Math.min(SPLIT_GHOST_DAMAGE * eaten, Math.max(0, boss.hp - floor));
			if (damage > 0) {
				boss.takeDamage(damage, `split, ${eaten} eaten`);
			}
		}
		this.merging = [];
		this.coreValue = null;
		this.enter('off');
	}

	private sleepAll(): void {
		for (const d of this.pack.list) {
			this.sleep(d);
		}
	}

	private sleep(d: Drone): void {
		d.state = 'dead';
		d.timer = Infinity;
	}
}
