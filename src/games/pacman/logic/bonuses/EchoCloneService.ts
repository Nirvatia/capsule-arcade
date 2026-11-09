import type { GridService } from '../maze/GridService';
import type { LevelProgress } from '../level/LevelProgress';
import type { SpawnLocator } from '../maze/SpawnLocator';
import type { PlayerService } from '../actors/PlayerService';
import type { GhostService } from '../actors/GhostService';
import type { FruitService } from './FruitService';
import type { GridPoint } from '../maze/GridModel';
import type { EventBus } from '../../engine/EventBus';
import type { PacmanEventMap } from '../../core/Events';
import { ACTOR_CONTACT_DISTANCE_SQ } from '../../config/actorConfig';
import { ECHO } from '../../config/echoConfig';

/** waiting (nothing yet), token (on the board), riot (the clones run), spent (done). */
export type EchoClonePhase = 'waiting' | 'token' | 'riot' | 'spent';

export type EchoDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const VECTORS: Record<EchoDirection, { x: number; y: number }> = {
	UP: { x: 0, y: -1 },
	DOWN: { x: 0, y: 1 },
	LEFT: { x: -1, y: 0 },
	RIGHT: { x: 1, y: 0 }
};
const DIRECTIONS: readonly EchoDirection[] = ['UP', 'LEFT', 'DOWN', 'RIGHT'];
const OPPOSITE: Record<EchoDirection, EchoDirection> = {
	UP: 'DOWN',
	DOWN: 'UP',
	LEFT: 'RIGHT',
	RIGHT: 'LEFT'
};
const EPSILON = 1e-6;
/** How far ahead (tiles, in a straight line) a clone smells dots when it picks a way. */
const LOOKAHEAD = 4;

/** One clone of the riot, as the view sees it. */
export interface EchoClone {
	readonly id: number;
	/** Tile-centre coordinates, between tiles while it moves. */
	readonly x: number;
	readonly y: number;
	readonly facing: EchoDirection;
	/** False for a clone a ghost caught (kept for a moment so the view can show it going). */
	readonly alive: boolean;
	/** Whether it is running yet (the clones leave the token one after another). */
	readonly started: boolean;
}

interface Clone {
	id: number;
	tile: GridPoint;
	target: GridPoint | null;
	progress: number;
	facing: EchoDirection;
	alive: boolean;
	delay: number;
	/** Seconds since it was caught. */
	gone: number;
}

/**
 * The echo bonus. Some season levels (a chance, at most one token per level) get a token at a
 * random place once a random share of the dots is eaten. Taking it sets off a riot: 7-9
 * clones of the hero run from the token's tile in every direction for 2-3 seconds, eating the
 * dots and the fruit they meet (not the energizers), and a clone dies on an active ghost
 * (frightened ghosts and eyes are harmless to it). Same for both heroes.
 */
export class EchoCloneService {
	private readonly grid: GridService;
	private readonly progress: LevelProgress;
	private readonly locator: SpawnLocator;
	private readonly events: EventBus<PacmanEventMap>;
	private readonly random: () => number;
	private phaseValue: EchoClonePhase = 'waiting';
	/** This level's roll: whether the token comes, and at which share of the dots. */
	private comes = false;
	private threshold = 0.5;
	private consumed = false;
	private tokenTileValue: GridPoint | null = null;
	private tokenTimerValue = 0;
	private clonesValue: Clone[] = [];
	private riotTimerValue = 0;
	private riotDurationValue = 0;
	private nextId = 1;

	constructor(
		grid: GridService,
		progress: LevelProgress,
		locator: SpawnLocator,
		events: EventBus<PacmanEventMap>,
		random: () => number = Math.random
	) {
		if (!grid || !progress || !locator || !events) {
			console.error('EchoCloneService.constructor', 'missing dependency');
			throw new Error('EchoCloneService.constructor: missing dependency');
		}
		this.grid = grid;
		this.progress = progress;
		this.locator = locator;
		this.events = events;
		this.random = random;
		this.roll();
	}

	get phase(): EchoClonePhase {
		return this.phaseValue;
	}

	/** Seconds the token or the riot has left. */
	get timer(): number {
		if (this.phaseValue === 'riot') {
			return this.riotTimerValue;
		}
		if (this.phaseValue === 'token') {
			return this.tokenTimerValue;
		}
		return 0;
	}

	/** How long this riot lasts in all (for the HUD's bar). */
	get duration(): number {
		return this.riotDurationValue;
	}

	/** Whether this level has an echo token at all (the roll). */
	get willCome(): boolean {
		return this.comes;
	}

	get tokenPosition(): { x: number; y: number } | null {
		const tile = this.tokenTileValue;
		return tile ? { x: tile.x + 0.5, y: tile.y + 0.5 } : null;
	}

	/** The clones of the riot, with positions between tiles. */
	get clones(): readonly EchoClone[] {
		return this.clonesValue.map((clone) => {
			const t = clone.target ? Math.min(1, Math.max(0, clone.progress)) : 0;
			const dx = clone.target ? clone.target.x - clone.tile.x : 0;
			const dy = clone.target ? clone.target.y - clone.tile.y : 0;
			return {
				id: clone.id,
				x: clone.tile.x + 0.5 + dx * t,
				y: clone.tile.y + 0.5 + dy * t,
				facing: clone.facing,
				alive: clone.alive,
				started: clone.delay <= 0
			};
		});
	}

	/** A new level or a restart: nothing out, and the level's chance rolled again. */
	reset(): void {
		this.phaseValue = 'waiting';
		this.consumed = false;
		this.tokenTileValue = null;
		this.tokenTimerValue = 0;
		this.clonesValue = [];
		this.riotTimerValue = 0;
		this.riotDurationValue = 0;
		this.roll();
	}

	/** Dev: puts the token on the board now, whatever the roll said. */
	debugSpawn(): void {
		if (this.phaseValue === 'token' || this.phaseValue === 'riot') {
			return;
		}
		const tile = this.locator.findSafeTile(this.progress.collectedDots) ?? this.findAnyDotTile();
		if (!tile) {
			console.error('EchoCloneService.debugSpawn', 'no spawn tile available');
			return;
		}
		this.placeToken(tile);
	}

	/** Dev: sets off the riot at `tile` now. */
	debugRiot(tile: GridPoint): void {
		if (this.phaseValue === 'riot') {
			return;
		}
		this.startRiot(tile);
	}

	update(
		dt: number,
		player: PlayerService,
		world: { readonly ghosts: GhostService; readonly fruit: FruitService }
	): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('EchoCloneService.update', 'invalid delta time', dt);
			return;
		}
		if (!player) {
			console.error('EchoCloneService.update', 'missing player service');
			return;
		}
		if (this.phaseValue === 'waiting') {
			if (
				this.comes &&
				!this.consumed &&
				this.progress.collectionRatio >= this.threshold &&
				this.progress.remainingDots > 0
			) {
				const tile = this.locator.findSafeTile(this.progress.collectedDots);
				if (tile) {
					this.placeToken(tile);
				}
			}
			return;
		}
		if (this.phaseValue === 'token') {
			this.tokenTimerValue = Math.max(0, this.tokenTimerValue - dt);
			if (this.tokenTimerValue <= 0) {
				this.phaseValue = 'spent';
				this.consumed = true;
				this.tokenTileValue = null;
				this.events.emit('audio:cue', { cue: 'fruit-expire' });
				return;
			}
			if (this.touchesPlayer(player)) {
				const tile = this.tokenTileValue;
				if (tile) {
					this.startRiot(tile);
				}
			}
			return;
		}
		if (this.phaseValue === 'riot') {
			this.runRiot(dt, world);
		}
	}

	private roll(): void {
		this.comes = this.random() < ECHO.chance;
		this.threshold = ECHO.window[0] + this.random() * (ECHO.window[1] - ECHO.window[0]);
	}

	private placeToken(tile: GridPoint): void {
		this.tokenTileValue = tile;
		this.tokenTimerValue = ECHO.tokenSeconds;
		this.phaseValue = 'token';
		this.events.emit('audio:cue', { cue: 'fruit-spawn' });
	}

	private startRiot(tile: GridPoint): void {
		const [minClones, maxClones] = ECHO.clones;
		const count = minClones + Math.floor(this.random() * (maxClones - minClones + 1));
		const [minSeconds, maxSeconds] = ECHO.seconds;
		this.riotDurationValue = minSeconds + this.random() * (maxSeconds - minSeconds);
		this.riotTimerValue = this.riotDurationValue;
		this.tokenTileValue = null;
		this.tokenTimerValue = 0;
		// every clone starts in a way of its own: the open ways are dealt out in turn from a
		// random one, so the clones fan out instead of running in a line
		const open = DIRECTIONS.filter((d) => this.walkable(this.targetFor(tile, d)));
		const first = Math.floor(this.random() * Math.max(1, open.length));
		this.clonesValue = [];
		for (let i = 0; i < count; i += 1) {
			this.clonesValue.push({
				id: this.nextId++,
				tile: { x: tile.x, y: tile.y },
				target: null,
				progress: 0,
				facing: open.length > 0 ? (open[(first + i) % open.length] as EchoDirection) : 'RIGHT',
				alive: true,
				delay: i * ECHO.stagger,
				gone: 0
			});
		}
		this.phaseValue = 'riot';
		this.progress.collectDotOnly(tile.x, tile.y);
		this.events.emit('audio:cue', { cue: 'power-start' });
	}

	private runRiot(dt: number, world: { ghosts: GhostService; fruit: FruitService }): void {
		this.riotTimerValue = Math.max(0, this.riotTimerValue - dt);
		const step = Math.min(0.25, dt);
		for (const clone of this.clonesValue) {
			if (!clone.alive) {
				clone.gone += dt;
				continue;
			}
			if (clone.delay > 0) {
				clone.delay = Math.max(0, clone.delay - dt);
				continue;
			}
			this.moveClone(clone, step);
			this.touch(clone, world);
		}
		this.clonesValue = this.clonesValue.filter((c) => c.alive || c.gone < 0.3);
		if (this.riotTimerValue <= 0 || this.progress.remainingDots <= 0) {
			this.finish();
		}
	}

	/** Eats what is under it and dies on an active ghost. */
	private touch(clone: Clone, world: { ghosts: GhostService; fruit: FruitService }): void {
		const at = this.position(clone);
		world.fruit.eatAt(at.x, at.y);
		for (const ghost of world.ghosts.list) {
			if (ghost.state !== 'active' && ghost.state !== 'enraged') {
				continue;
			}
			const g = ghost.position;
			const dx = g.x - at.x;
			const dy = g.y - at.y;
			if (dx * dx + dy * dy <= ACTOR_CONTACT_DISTANCE_SQ) {
				clone.alive = false;
				clone.gone = 0;
				this.events.emit('fx:event', { kind: 'echo-pop', x: at.x, y: at.y });
				return;
			}
		}
	}

	private position(clone: Clone): { x: number; y: number } {
		const t = clone.target ? Math.min(1, Math.max(0, clone.progress)) : 0;
		const dx = clone.target ? clone.target.x - clone.tile.x : 0;
		const dy = clone.target ? clone.target.y - clone.tile.y : 0;
		return { x: clone.tile.x + 0.5 + dx * t, y: clone.tile.y + 0.5 + dy * t };
	}

	private moveClone(clone: Clone, dt: number): void {
		let remaining = Math.max(0, dt);
		let guard = 0;
		while (remaining > EPSILON && clone.alive && guard < 64) {
			guard += 1;
			if (!clone.target) {
				const direction = this.chooseDirection(clone);
				if (!direction) {
					return;
				}
				clone.facing = direction;
				clone.target = this.targetFor(clone.tile, direction);
				clone.progress = 0;
			}
			const needed = Math.max(0, 1 - clone.progress);
			const step = ECHO.speed * remaining;
			if (step < needed) {
				clone.progress += step;
				return;
			}
			remaining -= needed / ECHO.speed;
			clone.tile = clone.target;
			clone.target = null;
			clone.progress = 0;
			this.arrive(clone);
		}
	}

	/** On a tile: eat its dot, or go through a tunnel to the other end. */
	private arrive(clone: Clone): void {
		this.progress.collectDotOnly(clone.tile.x, clone.tile.y);
		const through = this.grid.teleportDestination(clone.tile.x, clone.tile.y);
		if (through) {
			clone.tile = { x: through.x, y: through.y };
		}
	}

	/** A way at a junction: not back, by chance, leaning to where dots are left. */
	private chooseDirection(clone: Clone): EchoDirection | null {
		const ways = DIRECTIONS.filter((d) => this.walkable(this.targetFor(clone.tile, d)));
		if (ways.length === 0) {
			return null;
		}
		const forward = ways.filter((d) => d !== OPPOSITE[clone.facing]);
		const choices = forward.length > 0 ? forward : ways;
		if (choices.length === 1) {
			return choices[0] as EchoDirection;
		}
		const weights = choices.map((d) => 1 + this.dotsAhead(clone.tile, d));
		let roll = this.random() * weights.reduce((a, b) => a + b, 0);
		for (let i = 0; i < choices.length; i += 1) {
			roll -= weights[i] as number;
			if (roll <= 0) {
				return choices[i] as EchoDirection;
			}
		}
		return choices[choices.length - 1] as EchoDirection;
	}

	/** Dots still on the board in a straight line from `tile`, up to LOOKAHEAD tiles. */
	private dotsAhead(tile: GridPoint, direction: EchoDirection): number {
		let count = 0;
		let at = tile;
		for (let i = 0; i < LOOKAHEAD; i += 1) {
			at = this.targetFor(at, direction);
			if (!this.walkable(at)) {
				break;
			}
			if (this.grid.tileAt(at.x, at.y) === 'DT' && !this.progress.isCollected(at.x, at.y)) {
				count += 1;
			}
		}
		return count;
	}

	private walkable(tile: GridPoint): boolean {
		return this.grid.isPlayerWalkable(tile.x, tile.y);
	}

	private finish(): void {
		if (this.phaseValue !== 'riot') {
			return;
		}
		this.phaseValue = 'spent';
		this.consumed = true;
		this.clonesValue = [];
		this.riotTimerValue = 0;
		this.events.emit('audio:cue', { cue: 'power-end' });
	}

	private findAnyDotTile(): GridPoint | null {
		for (let y = 0; y < this.grid.height; y += 1) {
			for (let x = 0; x < this.grid.width; x += 1) {
				if (this.grid.tileAt(x, y) === 'DT' && !this.progress.isCollected(x, y)) {
					return { x, y };
				}
			}
		}
		return null;
	}

	private touchesPlayer(player: PlayerService): boolean {
		const position = player.position;
		const center = this.tokenPosition;
		if (!center) {
			return false;
		}
		const dx = position.x - center.x;
		const dy = position.y - center.y;
		if (dx * dx + dy * dy <= ACTOR_CONTACT_DISTANCE_SQ) {
			return true;
		}
		const tile = player.tile;
		return tile.x === center.x - 0.5 && tile.y === center.y - 0.5;
	}

	private targetFor(tile: GridPoint, direction: EchoDirection): GridPoint {
		const vector = VECTORS[direction];
		return { x: tile.x + vector.x, y: tile.y + vector.y };
	}
}
