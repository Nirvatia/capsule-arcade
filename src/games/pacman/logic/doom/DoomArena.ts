import type { GridService } from '../maze/GridService';
import type { GridPoint } from '../maze/GridModel';
import type { PlayerService } from '../actors/PlayerService';
import type { DoomDirection } from './DoomGraph';
import { adjacentTile } from './DoomGraph';
import { tileDistance } from './DoomAttackCore';
import type { DoomHazard } from './DoomHazards';
import { DoomHazardField } from './DoomHazards';
import {
	CONTACT_DISTANCE,
	CORRUPTION_BAND,
	CORRUPTION_MAX,
	CORRUPTION_RATE,
	CORRUPTION_SLOW,
	PULL_SLOW,
	SEAL_DURATION,
	SEAL_TELEGRAPH,
	SHAKE_HAZARD,
	VOID_CELL_LIFETIME,
	VOID_MAX_CELLS,
	VOID_NO_SPAWN_NEAR_PLAYER,
	phaseIndex
} from './DoomBalance';
import { keepsPlayerGraphConnected, playerTileOf } from './DoomTargeting';
import type { DebugSink } from '../debug/debugLog';
import { NO_DEBUG } from '../debug/debugLog';

export interface VoidCell {
	x: number;
	y: number;
	timer: number;
	/** trail: left behind while moving; seal: an intersection locked on purpose. */
	kind: 'trail' | 'seal';
}

export interface PendingSeal {
	x: number;
	y: number;
	warn: number;
	readonly total: number;
}

/** The phase-3 decoy that closes in from the far end of the player's corridor. */
export interface DoomEcho {
	tile: GridPoint;
	target: GridPoint | null;
	progress: number;
	readonly dir: DoomDirection;
	remaining: number;
	/** 0..1, fades in during the telegraph and out after the run. */
	presence: number;
	running: boolean;
	done: boolean;
}

/** What the arena needs to know about the boss each frame. */
export interface ArenaBossView {
	readonly phase: number;
	readonly transitioning: boolean;
	readonly position: { x: number; y: number };
	/** Tiles per second of the echo's run (the boss's dash speed). */
	readonly echoSpeed: number;
}

function hash01(x: number, y: number): number {
	const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
	return v - Math.floor(v);
}

/**
 * Everything the boss leaves on the maze, independent of its state machine: timed
 * hazards (rift, eruption), seals, void cells, the pull, phase-3 corruption, the echo,
 * and the camera shake those cause. Hits on the player are latched until consumed.
 */
export class DoomArena {
	readonly hazards = new DoomHazardField();
	private readonly grid: GridService;
	private readonly pendingSeals: PendingSeal[] = [];
	private readonly voidCells: VoidCell[] = [];
	private readonly protectedTileKeys = new Set<string>();
	private barrelLocator: (() => GridPoint | null) | null = null;
	private pullTimer = 0;
	private corruptionValue = 0;
	private echoValue: DoomEcho | null = null;
	private shakeValue = 0;
	private hitValue = false;
	private debug: DebugSink = NO_DEBUG;

	constructor(grid: GridService) {
		this.grid = grid;
	}

	get hazardList(): readonly DoomHazard[] {
		return this.hazards.list;
	}

	get pendingSealList(): readonly PendingSeal[] {
		return this.pendingSeals;
	}

	get voidCellList(): readonly VoidCell[] {
		return this.voidCells;
	}

	get pullRemaining(): number {
		return this.pullTimer;
	}

	/** 0..CORRUPTION_MAX, grows during phase 3. */
	get corruption(): number {
		return this.corruptionValue;
	}

	get echo(): Readonly<DoomEcho> | null {
		return this.echoValue;
	}

	/** Camera shake strength 0..1, decays by itself. */
	get shake(): number {
		return this.shakeValue;
	}

	get protectedKeys(): ReadonlySet<string> {
		return this.protectedTileKeys;
	}

	setDebugSink(sink: DebugSink): void {
		this.debug = sink;
	}

	addShake(strength: number): void {
		this.shakeValue = Math.max(this.shakeValue, strength);
	}

	/** A hazard caught the player (latched until `consumeHit`). */
	markHit(): void {
		this.hitValue = true;
	}

	consumeHit(): boolean {
		const hit = this.hitValue;
		this.hitValue = false;
		return hit;
	}

	setProtectedTiles(tiles: ReadonlyArray<GridPoint>): void {
		this.protectedTileKeys.clear();
		for (const tile of tiles) {
			if (!Number.isFinite(tile.x) || !Number.isFinite(tile.y)) {
				console.error('DoomArena.setProtectedTiles', 'invalid tile', tile);
				continue;
			}
			this.protectedTileKeys.add(`${tile.x},${tile.y}`);
		}
	}

	setBarrelLocator(locator: () => GridPoint | null): void {
		this.barrelLocator = locator;
	}

	/** Where the barrel stands now, if there is one. */
	barrel(): GridPoint | null {
		return this.barrelLocator ? this.barrelLocator() : null;
	}

	echoPosition(): { x: number; y: number } | null {
		const echo = this.echoValue;
		if (!echo) {
			return null;
		}
		const t = echo.target ? echo.progress : 0;
		const tx = echo.target ? echo.target.x - echo.tile.x : 0;
		const ty = echo.target ? echo.target.y - echo.tile.y : 0;
		return { x: echo.tile.x + 0.5 + tx * t, y: echo.tile.y + 0.5 + ty * t };
	}

	/** Outer corridors decay in phase 3; protected (pickup) tiles never do. */
	isCorrupted(x: number, y: number): boolean {
		if (this.corruptionValue <= 0 || !this.grid.isWalkable(x, y)) {
			return false;
		}
		const band = CORRUPTION_BAND;
		const outer =
			x <= band || y <= band || x >= this.grid.width - 1 - band || y >= this.grid.height - 1 - band;
		if (!outer || this.protectedTileKeys.has(`${x},${y}`)) {
			return false;
		}
		return hash01(x, y) < this.corruptionValue;
	}

	/** Speed multiplier for the player from pull and corruption. */
	playerSpeedFactor(player: PlayerService, boss: { x: number; y: number }): number {
		let factor = 1;
		const pos = player.position;
		if (this.isCorrupted(Math.floor(pos.x), Math.floor(pos.y))) {
			factor *= CORRUPTION_SLOW;
		}
		if (this.pullTimer > 0 && player.facing) {
			const fx = player.facing === 'LEFT' ? -1 : player.facing === 'RIGHT' ? 1 : 0;
			const fy = player.facing === 'UP' ? -1 : player.facing === 'DOWN' ? 1 : 0;
			if (fx * (boss.x - pos.x) + fy * (boss.y - pos.y) < 0) {
				factor *= PULL_SLOW;
			}
		}
		return factor;
	}

	queueSeals(seals: readonly GridPoint[], warn = SEAL_TELEGRAPH): void {
		for (const seal of seals) {
			this.pendingSeals.push({ x: seal.x, y: seal.y, warn, total: warn });
		}
	}

	startPull(duration: number): void {
		this.pullTimer = duration;
	}

	startEcho(echo: DoomEcho): void {
		this.echoValue = echo;
	}

	runEcho(): void {
		if (this.echoValue) {
			this.echoValue.running = true;
		}
	}

	/** Ages the void cells and the shake (runs even after the boss is defeated). */
	tick(dt: number): void {
		for (let i = this.voidCells.length - 1; i >= 0; i--) {
			this.voidCells[i].timer -= dt;
			if (this.voidCells[i].timer <= 0) {
				this.grid.setVoidBlocked(this.voidCells[i].x, this.voidCells[i].y, false);
				this.voidCells.splice(i, 1);
			}
		}
		this.shakeValue = Math.max(0, this.shakeValue - dt * 2.5);
	}

	/** Timed hazards, seals, pull, corruption and the echo. */
	update(dt: number, player: PlayerService, boss: ArenaBossView): void {
		const playerTile = playerTileOf(player);
		if (this.hazards.update(dt, playerTile, player.isInvulnerable)) {
			this.hitValue = true;
		}
		if (this.hazards.consumeDetonations() > 0) {
			this.addShake(SHAKE_HAZARD);
		}
		const pi = phaseIndex(boss.phase);
		for (let i = this.pendingSeals.length - 1; i >= 0; i -= 1) {
			const seal = this.pendingSeals[i];
			seal.warn -= dt;
			if (seal.warn > 0) {
				continue;
			}
			this.pendingSeals.splice(i, 1);
			const onSeal = playerTile.x === seal.x && playerTile.y === seal.y;
			this.addShake(SHAKE_HAZARD * 0.6);
			if (onSeal && !player.isInvulnerable) {
				// a seal burns whoever stands on it; the tile stays open under the player
				this.hitValue = true;
				this.debug('boss', `seal hit at ${seal.x},${seal.y}`);
			}
			if (
				!onSeal &&
				!this.grid.isVoidBlocked(seal.x, seal.y) &&
				keepsPlayerGraphConnected(this.grid, seal, playerTile)
			) {
				this.grid.setVoidBlocked(seal.x, seal.y, true);
				this.voidCells.push({ x: seal.x, y: seal.y, timer: SEAL_DURATION[pi], kind: 'seal' });
			}
		}
		this.pullTimer = Math.max(0, this.pullTimer - dt);
		if (boss.phase >= 3 && !boss.transitioning) {
			this.corruptionValue = Math.min(CORRUPTION_MAX, this.corruptionValue + CORRUPTION_RATE * dt);
		}
		this.updateEcho(dt, player, boss.echoSpeed);
	}

	/** Leaves a void cell on the boss's tile, unless it would trap or crowd the player. */
	placeTrailVoid(tile: GridPoint, player: PlayerService, phase: number): void {
		const pi = phaseIndex(phase);
		const playerTile = playerTileOf(player);
		if (tileDistance(tile, playerTile) <= VOID_NO_SPAWN_NEAR_PLAYER) {
			return;
		}
		if (this.voidCells.length >= VOID_MAX_CELLS[pi] || this.grid.isVoidBlocked(tile.x, tile.y)) {
			return;
		}
		if (this.protectedTileKeys.has(`${tile.x},${tile.y}`)) {
			return;
		}
		const barrel = this.barrel();
		if (barrel && barrel.x === tile.x && barrel.y === tile.y) {
			return;
		}
		if (!keepsPlayerGraphConnected(this.grid, tile, playerTile)) {
			return;
		}
		this.grid.setVoidBlocked(tile.x, tile.y, true);
		this.voidCells.push({ x: tile.x, y: tile.y, timer: VOID_CELL_LIFETIME[pi], kind: 'trail' });
	}

	/** Stops the timed effects; the echo fades out. Void cells stay. */
	clearEffects(): void {
		this.hazards.clear();
		this.pendingSeals.length = 0;
		this.pullTimer = 0;
		if (this.echoValue) {
			this.echoValue.done = true;
		}
	}

	/** `clearEffects` plus every void cell, open again. */
	clearAll(): void {
		this.clearEffects();
		for (const cell of this.voidCells) {
			this.grid.setVoidBlocked(cell.x, cell.y, false);
		}
		this.voidCells.length = 0;
		this.grid.clearVoidBlocked();
	}

	reset(): void {
		this.clearAll();
		this.hitValue = false;
		this.corruptionValue = 0;
		this.shakeValue = 0;
	}

	private updateEcho(dt: number, player: PlayerService, speed: number): void {
		const echo = this.echoValue;
		if (!echo) {
			return;
		}
		if (echo.done) {
			echo.presence -= dt / 0.3;
			if (echo.presence <= 0) {
				this.echoValue = null;
			}
			return;
		}
		if (!echo.running) {
			echo.presence = Math.min(1, echo.presence + dt / 0.4);
			return;
		}
		let remaining = dt;
		while (remaining > 1e-6 && !echo.done) {
			if (!echo.target) {
				const next = adjacentTile(echo.tile, echo.dir);
				if (echo.remaining <= 0 || !this.grid.isWalkable(next.x, next.y)) {
					echo.done = true;
					break;
				}
				echo.target = next;
				echo.progress = 0;
			}
			const need = (1 - echo.progress) / speed;
			if (need > remaining) {
				echo.progress += remaining * speed;
				remaining = 0;
			} else {
				remaining -= need;
				echo.tile = echo.target;
				echo.target = null;
				echo.progress = 0;
				echo.remaining -= 1;
			}
		}
		const pos = this.echoPosition();
		if (pos && !player.isInvulnerable) {
			const p = player.position;
			const dx = p.x - pos.x;
			const dy = p.y - pos.y;
			if (dx * dx + dy * dy < CONTACT_DISTANCE * CONTACT_DISTANCE) {
				this.hitValue = true;
			}
		}
	}
}
