import type { GridService } from '../maze/GridService';
import type { GridPoint } from '../maze/GridModel';
import type { PlayerService } from '../actors/PlayerService';
import type { DoomDirection } from './DoomGraph';
import { adjacentTile } from './DoomGraph';
import { chooseChaseDirection } from './DoomMovement';
import { DoomBossModel } from './DoomBossModel';
import type { DoomAttackKind } from './DoomAttackCore';
import { DOOM_ATTACK_KINDS, tileDistance } from './DoomAttackCore';
import type { DoomHazard, DoomSegment } from './DoomHazards';
import {
	bossChaseSpeed,
	bossDashSpeed,
	phaseIndex,
	DASH_TELEGRAPH,
	DASH_RECOVER,
	DASH_MAX_TILES,
	CROSS_TELEGRAPH,
	CROSS_ACTIVE,
	CROSS_RECOVER,
	CROSS_COOLDOWN,
	VOID_TELEGRAPH,
	VOID_DURATION,
	VOID_COOLDOWN,
	BLINK_TELEGRAPH,
	BLINK_VANISH,
	BLINK_RECOVER,
	BLINK_COOLDOWN,
	BROOD_TELEGRAPH,
	BROOD_RECOVER,
	BROOD_COOLDOWN,
	RECOVER_DAMAGE_MUL,
	ATTACK_RETRY_INTERVAL,
	PHASE_THRESHOLDS,
	CONTACT_DISTANCE,
	RIFT_TELEGRAPH,
	RIFT_ACTIVE,
	RIFT_RECOVER,
	RIFT_COOLDOWN,
	SEAL_TELEGRAPH,
	SEAL_COOLDOWN,
	PULL_TELEGRAPH,
	PULL_DURATION,
	PULL_COOLDOWN,
	SPLIT_TELEGRAPH,
	SPLIT_RECOVER,
	SPLIT_COOLDOWN,
	ERUPTION_TELEGRAPH,
	ERUPTION_WAVE_GAP,
	ERUPTION_ACTIVE,
	ERUPTION_COOLDOWN,
	SHAKE_TRANSITION,
	SHAKE_SPLIT
} from './DoomBalance';
import type { DoomMinion } from './DoomMinions';
import type { DoomRenderState, DoomStateName } from './DoomBossModel';
import type { DebugSink } from '../debug/debugLog';
import { NO_DEBUG } from '../debug/debugLog';
import { DoomArena } from './DoomArena';
import type { DoomEcho, PendingSeal, VoidCell } from './DoomArena';
import { DoomMinionSwarm } from './DoomMinionSwarm';
import { planAttack } from './DoomAttackPlanner';
import { chaseTargetTile, playerTileOf } from './DoomTargeting';

export type { DoomEcho, PendingSeal, VoidCell } from './DoomArena';

function noCooldowns(): Record<DoomAttackKind, number> {
	const result = {} as Record<DoomAttackKind, number>;
	for (const kind of DOOM_ATTACK_KINDS) {
		result[kind] = 0;
	}
	return result;
}

/**
 * The hell's boss: its state machine (chase, telegraph, active, recover, stun, phase
 * transitions) and its attacks. What the attacks leave on the maze lives in `DoomArena`,
 * the brood in `DoomMinionSwarm`, the choice of attack in `planAttack`, and the tile
 * picks in `DoomTargeting`.
 */
export class DoomBossService {
	private readonly model: DoomBossModel;
	private readonly grid: GridService;
	private readonly arena: DoomArena;
	private readonly swarm: DoomMinionSwarm;
	private forcedAttack: DoomAttackKind | null = null;
	private debug: DebugSink = NO_DEBUG;
	private attackRetryTimer = 0;
	private personalCooldowns: Record<DoomAttackKind, number> = noCooldowns();
	private splitSegment: DoomSegment | null = null;
	private lastAttackKind: DoomAttackKind | null = null;
	private playerBaseSpeed = 6;
	private bossContactHitValue = false;
	private minionContactHitValue = false;
	private phaseTransitionValue = false;

	constructor(grid: GridService, spawn: GridPoint) {
		if (!grid) {
			console.error('DoomBossService.constructor', 'missing grid service');
			throw new Error('DoomBossService.constructor: missing grid service');
		}
		if (!spawn) {
			console.error('DoomBossService.constructor', 'missing spawn');
			throw new Error('DoomBossService.constructor: missing spawn');
		}
		this.grid = grid;
		this.model = new DoomBossModel(spawn);
		this.arena = new DoomArena(grid);
		this.swarm = new DoomMinionSwarm(grid);
	}

	get hp(): number {
		return this.model.hp;
	}

	get phase(): number {
		return this.model.phase;
	}

	get state(): DoomStateName {
		return this.model.state;
	}

	get introProgress(): number {
		return this.model.introProgress;
	}

	get hazardList(): readonly DoomHazard[] {
		return this.arena.hazardList;
	}

	get pendingSealList(): readonly PendingSeal[] {
		return this.arena.pendingSealList;
	}

	/** Seconds until each attack may come again (dev watch table). */
	get debugCooldowns(): Readonly<Record<DoomAttackKind, number>> {
		return this.personalCooldowns;
	}

	get pullRemaining(): number {
		return this.arena.pullRemaining;
	}

	/** 0..CORRUPTION_MAX, grows during phase 3. */
	get corruption(): number {
		return this.arena.corruption;
	}

	get echo(): Readonly<DoomEcho> | null {
		return this.arena.echo;
	}

	/** Camera shake strength 0..1, decays by itself. */
	get shake(): number {
		return this.arena.shake;
	}

	echoPosition(): { x: number; y: number } | null {
		return this.arena.echoPosition();
	}

	/** Outer corridors decay in phase 3; protected (pickup) tiles never do. */
	isCorrupted(x: number, y: number): boolean {
		return this.arena.isCorrupted(x, y);
	}

	/** Speed multiplier for the player from pull and corruption. */
	playerSpeedFactor(player: PlayerService): number {
		return this.arena.playerSpeedFactor(player, this.model.position);
	}

	get tile(): GridPoint {
		return this.model.tile;
	}

	get facing(): DoomDirection | null {
		return this.model.facing;
	}

	get isMoving(): boolean {
		return this.model.isMoving;
	}

	get defeated(): boolean {
		return this.model.defeated;
	}

	get position(): { x: number; y: number } {
		return this.model.position;
	}

	get renderState(): DoomRenderState {
		return this.model.renderState;
	}

	get minionList(): readonly DoomMinion[] {
		return this.swarm.list;
	}

	get voidCellList(): readonly VoidCell[] {
		return this.arena.voidCellList;
	}

	get isStunned(): boolean {
		return this.model.state === 'STUNNED';
	}

	get isStunImmune(): boolean {
		return this.model.stunImmunityTimer > 0;
	}

	consumeBossContactHit(): boolean {
		const hit = this.bossContactHitValue;
		this.bossContactHitValue = false;
		return hit;
	}

	consumeMinionContactHit(): boolean {
		const hit = this.minionContactHitValue;
		this.minionContactHitValue = false;
		return hit;
	}

	/** Cross blast, rift, eruption, a seal or the echo caught the player. */
	consumeHazardHit(): boolean {
		return this.arena.consumeHit();
	}

	consumePhaseTransition(): boolean {
		const value = this.phaseTransitionValue;
		this.phaseTransitionValue = false;
		return value;
	}

	setProtectedTiles(tiles: ReadonlyArray<GridPoint>): void {
		if (!tiles) {
			console.error('DoomBossService.setProtectedTiles', 'missing tiles');
			return;
		}
		this.arena.setProtectedTiles(tiles);
	}

	setBarrelLocator(locator: () => GridPoint | null): void {
		if (typeof locator !== 'function') {
			console.error('DoomBossService.setBarrelLocator', 'missing locator');
			return;
		}
		this.arena.setBarrelLocator(locator);
	}

	killMinionsWhere(shouldKill: (minion: DoomMinion) => boolean): number {
		if (typeof shouldKill !== 'function') {
			console.error('DoomBossService.killMinionsWhere', 'missing predicate');
			return 0;
		}
		return this.swarm.killWhere(shouldKill);
	}

	update(dt: number, player: PlayerService): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('DoomBossService.update', 'invalid delta time', dt);
			return;
		}
		this.playerBaseSpeed = player.baseSpeed;
		this.model.update(dt);
		this.updateCooldowns(dt);
		this.arena.tick(dt);
		if (this.model.defeated) {
			this.clearArena();
			return;
		}
		this.arena.update(dt, player, {
			phase: this.model.phase,
			transitioning: this.model.state === 'TRANSITION',
			position: this.model.position,
			echoSpeed: bossDashSpeed(this.playerBaseSpeed, this.model.phase)
		});
		this.updateBoss(dt, player);
		if (this.swarm.update(dt, player, this.model.tile, this.playerBaseSpeed)) {
			this.minionContactHitValue = true;
		}
	}

	private updateBoss(dt: number, player: PlayerService): void {
		if (
			this.model.state === 'INTRO' ||
			this.model.state === 'TRANSITION' ||
			this.model.state === 'STUNNED'
		) {
			return;
		}
		if (this.model.state === 'TELEGRAPH') {
			if (this.model.stateTimer >= this.model.telegraphDuration) {
				this.enterActivePhase();
			} else {
				this.checkPlayerContact(player);
			}
			return;
		}
		if (this.model.state === 'ACTIVE') {
			this.updateActivePhase(dt, player);
			return;
		}
		if (this.model.state === 'RECOVER') {
			this.checkPlayerContact(player);
			return;
		}
		if (this.model.state === 'CHASE') {
			this.attackRetryTimer -= dt;
			if (this.model.voidTrailActive) {
				this.model.voidTrailTimer -= dt;
				if (this.model.voidTrailTimer <= 0) {
					this.model.voidTrailActive = false;
				} else if (!this.model.isMoving) {
					this.arena.placeTrailVoid(this.model.tile, player, this.model.phase);
				}
			}
			if (!this.model.isMoving) {
				if (
					this.model.attackCooldown <= 0 &&
					this.attackRetryTimer <= 0 &&
					!player.isInvulnerable &&
					!this.model.voidTrailActive
				) {
					this.attackRetryTimer = ATTACK_RETRY_INTERVAL;
					if (this.tryStartAttack(player)) {
						return;
					}
				}
				const target = chaseTargetTile(this.grid, this.model.tile, player);
				const direction = chooseChaseDirection(
					this.grid,
					this.model.tile,
					this.model.facing,
					target,
					this.model.reverseLocked
				);
				if (direction) {
					this.model.beginMove(direction);
					this.model.reverseLocked = true;
				}
			}
			this.model.updateMovement(dt, bossChaseSpeed(this.playerBaseSpeed, this.model.phase));
			if (this.model.voidTrailActive && !this.model.isMoving) {
				this.arena.placeTrailVoid(this.model.tile, player, this.model.phase);
			}
			this.checkPlayerContact(player);
		}
	}

	/** Dev log lines (damage, stuns, attacks, phases) go here. */
	setDebugSink(sink: DebugSink): void {
		this.debug = sink;
		this.arena.setDebugSink(sink);
	}

	takeDamage(amount: number, source = 'hit'): void {
		if (!Number.isFinite(amount) || amount <= 0) {
			return;
		}
		const before = this.model.hp;
		const phaseBefore = this.model.phase;
		this.model.takeDamage(amount);
		const dealt = before - this.model.hp;
		if (dealt > 0) {
			this.debug('damage', `boss −${Math.round(dealt)} (${source})`, Math.round(this.model.hp));
		} else {
			this.debug('damage', `boss ignores ${source} (${this.model.state})`);
		}
		if (this.model.defeated) {
			this.debug('boss', 'boss defeated');
		}
		if (this.model.hp <= PHASE_THRESHOLDS[0] && this.model.phase === 1) {
			this.model.startTransition();
			this.clearVoidAndMinions();
			this.phaseTransitionValue = true;
			this.arena.addShake(SHAKE_TRANSITION);
		}
		if (this.model.hp <= PHASE_THRESHOLDS[1] && this.model.phase === 2) {
			this.model.startTransition();
			this.clearVoidAndMinions();
			this.phaseTransitionValue = true;
			this.arena.addShake(SHAKE_TRANSITION);
		}
		if (this.model.phase !== phaseBefore) {
			this.debug('boss', `phase ${this.model.phase}`);
		}
	}

	/** Dev: jumps to phase 1–3 (see `DoomBossModel.debugSetPhase`). */
	debugSetPhase(phase: number): void {
		this.model.debugSetPhase(phase);
		this.debug('boss', `phase ${this.model.phase} (dev)`);
		this.clearVoidAndMinions();
		this.phaseTransitionValue = this.model.state === 'TRANSITION';
	}

	/**
	 * Dev: the next attack is `kind` as soon as the boss can make it here (phase, range and
	 * fairness rules still apply; the request waits until they do). Its cooldown is cleared.
	 */
	debugForceAttack(kind: DoomAttackKind): void {
		this.forcedAttack = kind;
		this.personalCooldowns[kind] = 0;
		this.attackRetryTimer = 0;
	}

	get debugForcedAttack(): DoomAttackKind | null {
		return this.forcedAttack;
	}

	debugKill(): void {
		this.model.debugKill();
		this.debug('boss', 'boss defeated (dev)');
	}

	applyStun(duration: number): void {
		this.model.applyStun(duration);
		if (this.model.state === 'STUNNED') {
			this.debug('debuff', `boss stunned ${duration}s`, duration);
		}
	}

	reset(): void {
		this.forcedAttack = null;
		this.model.reset();
		this.swarm.clear();
		this.arena.reset();
		this.splitSegment = null;
		this.attackRetryTimer = 0;
		this.lastAttackKind = null;
		this.bossContactHitValue = false;
		this.minionContactHitValue = false;
		this.phaseTransitionValue = false;
		this.personalCooldowns = noCooldowns();
	}

	private clearArena(): void {
		this.arena.clearEffects();
		this.splitSegment = null;
	}

	private clearVoidAndMinions(): void {
		this.clearArena();
		this.arena.clearAll();
		this.swarm.clear();
	}

	private updateCooldowns(dt: number): void {
		for (const key of DOOM_ATTACK_KINDS) {
			if (this.personalCooldowns[key] > 0) {
				this.personalCooldowns[key] = Math.max(0, this.personalCooldowns[key] - dt);
			}
		}
	}

	private enterActivePhase(): void {
		const kind = this.model.attackKind;
		const pi = phaseIndex(this.model.phase);
		if (kind === 'dash') {
			this.model.beginActive(999);
			this.model.dashDirection = this.model.facing;
			this.model.dashTilesRemaining = DASH_MAX_TILES;
			this.model.dashCompleted = false;
		} else if (kind === 'cross') {
			this.model.beginActive(CROSS_ACTIVE);
		} else if (kind === 'voidTrail') {
			this.model.beginActive(0.1);
			this.model.voidTrailActive = true;
			this.model.voidTrailTimer = VOID_DURATION[pi];
		} else if (kind === 'blink') {
			this.model.beginActive(BLINK_VANISH);
		} else if (kind === 'brood') {
			this.model.beginActive(0.1);
			this.swarm.spawn(this.model.tile, this.model.hp);
		} else if (kind === 'split') {
			const segment = this.splitSegment;
			this.model.beginActive(999);
			this.model.dashDirection = this.model.facing;
			this.model.dashTilesRemaining = segment ? segment.tiles.length : DASH_MAX_TILES;
			this.model.dashCompleted = false;
			this.arena.runEcho();
			this.arena.addShake(SHAKE_SPLIT);
		} else {
			// spells: rift, seal and eruption were queued at cast time; pull starts now
			this.model.beginActive(0.1);
			if (kind === 'pull') {
				this.arena.startPull(PULL_DURATION[pi]);
				this.debug('debuff', `player pulled ${PULL_DURATION[pi]}s`, PULL_DURATION[pi]);
			}
		}
	}

	private updateActivePhase(dt: number, player: PlayerService): void {
		const kind = this.model.attackKind;
		const pi = phaseIndex(this.model.phase);
		if (kind !== 'dash' && kind !== 'blink') {
			this.checkPlayerContact(player);
		}
		if (kind === 'dash' || kind === 'split') {
			const recover = kind === 'split' ? SPLIT_RECOVER : DASH_RECOVER[pi];
			const direction = this.model.dashDirection;
			if (!direction) {
				this.finishAttack(recover, RECOVER_DAMAGE_MUL);
				return;
			}
			if (!this.model.isMoving) {
				const next = adjacentTile(this.model.tile, direction);
				if (
					!this.grid.isInside(next.x, next.y) ||
					!this.grid.isWalkable(next.x, next.y) ||
					this.model.dashTilesRemaining <= 0
				) {
					this.finishAttack(recover, RECOVER_DAMAGE_MUL);
					return;
				}
				this.model.beginMove(direction);
			}
			this.model.updateMovement(dt, bossDashSpeed(this.playerBaseSpeed, this.model.phase));
			this.checkPlayerContact(player);
			if (this.model.consumeDashCompleted()) {
				this.finishAttack(recover, RECOVER_DAMAGE_MUL);
			}
		} else if (kind === 'cross') {
			if (this.model.stateTimer >= this.model.activeDuration) {
				this.applyCrossDamage(player);
				this.finishAttack(CROSS_RECOVER, RECOVER_DAMAGE_MUL);
			}
		} else if (kind === 'voidTrail') {
			if (this.model.stateTimer >= this.model.activeDuration) {
				this.model.state = 'CHASE';
				this.model.shape = 'normal';
				this.model.attackKind = null;
			}
		} else if (kind === 'blink') {
			if (this.model.stateTimer >= this.model.activeDuration) {
				if (this.model.blinkTarget) {
					this.model.teleportTo(this.model.blinkTarget);
					this.model.blinkTarget = null;
				}
				this.model.beginRecover(BLINK_RECOVER, 1.0);
				this.model.unlockReverse();
			}
		} else if (kind === 'brood') {
			if (this.model.stateTimer >= this.model.activeDuration) {
				this.finishAttack(BROOD_RECOVER, 1.0);
			}
		} else if (this.model.stateTimer >= this.model.activeDuration) {
			this.finishAttack(RIFT_RECOVER, RECOVER_DAMAGE_MUL);
		}
	}

	private finishAttack(recoverDuration: number, damageMultiplier: number): void {
		if (this.model.attackKind === 'split') {
			this.splitSegment = null;
		}
		this.model.beginRecover(recoverDuration, damageMultiplier);
		if (this.model.attackKind) {
			this.lastAttackKind = this.model.attackKind;
			this.setPersonalCooldown(this.model.attackKind);
		}
	}

	private setPersonalCooldown(kind: DoomAttackKind): void {
		if (kind === 'cross') {
			this.personalCooldowns.cross = CROSS_COOLDOWN;
		} else if (kind === 'voidTrail') {
			this.personalCooldowns.voidTrail = VOID_COOLDOWN;
		} else if (kind === 'blink') {
			this.personalCooldowns.blink = BLINK_COOLDOWN;
		} else if (kind === 'brood') {
			this.personalCooldowns.brood = BROOD_COOLDOWN;
		} else if (kind === 'rift') {
			this.personalCooldowns.rift = RIFT_COOLDOWN;
		} else if (kind === 'seal') {
			this.personalCooldowns.seal = SEAL_COOLDOWN;
		} else if (kind === 'pull') {
			this.personalCooldowns.pull = PULL_COOLDOWN;
		} else if (kind === 'split') {
			this.personalCooldowns.split = SPLIT_COOLDOWN;
		} else if (kind === 'eruption') {
			this.personalCooldowns.eruption = ERUPTION_COOLDOWN;
		}
	}

	private tryStartAttack(player: PlayerService): boolean {
		const playerTile = playerTileOf(player);
		const pi = phaseIndex(this.model.phase);
		const plan = planAttack({
			grid: this.grid,
			bossTile: this.model.tile,
			phase: this.model.phase,
			player,
			playerTile,
			playerSpeed: this.playerBaseSpeed,
			cooldowns: this.personalCooldowns,
			broodHasRoom: this.swarm.hasRoom,
			protectedTileKeys: this.arena.protectedKeys,
			barrel: () => this.arena.barrel(),
			forced: this.forcedAttack,
			lastAttack: this.lastAttackKind
		});
		if (plan.dashAim) {
			this.model.aim(plan.dashAim);
		}
		if (plan.blinkTarget) {
			this.model.blinkTarget = plan.blinkTarget;
		}
		if (plan.forcedTaken) {
			this.forcedAttack = null;
		}
		const chosen = plan.chosen;
		if (!chosen) {
			return false;
		}
		this.debug('boss', `attack: ${chosen}`);
		if (chosen === 'rift' && plan.rift) {
			this.arena.hazards.add(
				'rift',
				plan.rift.tiles,
				RIFT_TELEGRAPH[pi],
				RIFT_ACTIVE,
				plan.rift.axis
			);
			this.model.beginTelegraph('rift', RIFT_TELEGRAPH[pi]);
			return true;
		}
		if (chosen === 'seal') {
			this.arena.queueSeals(plan.seals);
			this.model.beginTelegraph('seal', SEAL_TELEGRAPH);
			return true;
		}
		if (chosen === 'pull') {
			this.model.beginTelegraph('pull', PULL_TELEGRAPH);
			return true;
		}
		if (chosen === 'split' && plan.split) {
			this.beginSplit(plan.split);
			return true;
		}
		if (chosen === 'eruption' && plan.eruption) {
			const { disc, ring } = plan.eruption;
			this.arena.hazards.add('eruption', disc, ERUPTION_TELEGRAPH, ERUPTION_ACTIVE);
			this.arena.hazards.add(
				'eruption',
				ring,
				ERUPTION_TELEGRAPH + ERUPTION_WAVE_GAP,
				ERUPTION_ACTIVE
			);
			this.model.beginTelegraph('eruption', ERUPTION_TELEGRAPH);
			return true;
		}
		if (chosen === 'dash') {
			this.model.beginTelegraph('dash', DASH_TELEGRAPH[pi]);
		} else if (chosen === 'cross') {
			this.model.beginTelegraph('cross', CROSS_TELEGRAPH[pi]);
		} else if (chosen === 'voidTrail') {
			this.model.beginTelegraph('voidTrail', VOID_TELEGRAPH);
		} else if (chosen === 'blink') {
			this.model.beginTelegraph('blink', BLINK_TELEGRAPH);
		} else if (chosen === 'brood') {
			this.model.beginTelegraph('brood', BROOD_TELEGRAPH);
		}
		return true;
	}

	private beginSplit(segment: DoomSegment): void {
		const tiles = segment.tiles;
		const a = tiles[0];
		const b = tiles[tiles.length - 1];
		// the boss takes the end it is closer to, the echo the other one
		const bossAtA = tileDistance(this.model.tile, a) <= tileDistance(this.model.tile, b);
		const bossEnd = bossAtA ? a : b;
		const echoEnd = bossAtA ? b : a;
		const towardEcho: DoomDirection =
			segment.axis === 'x' ? (bossAtA ? 'RIGHT' : 'LEFT') : bossAtA ? 'DOWN' : 'UP';
		const towardBoss: DoomDirection =
			segment.axis === 'x' ? (bossAtA ? 'LEFT' : 'RIGHT') : bossAtA ? 'UP' : 'DOWN';
		this.model.teleportTo(bossEnd);
		this.model.aim(towardEcho);
		this.splitSegment = segment;
		this.arena.startEcho({
			tile: { x: echoEnd.x, y: echoEnd.y },
			target: null,
			progress: 0,
			dir: towardBoss,
			remaining: tiles.length - 1,
			presence: 0,
			running: false,
			done: false
		});
		this.model.beginTelegraph('split', SPLIT_TELEGRAPH);
	}

	private checkPlayerContact(player: PlayerService): void {
		if (player.isInvulnerable) {
			return;
		}
		if (
			this.model.state === 'INTRO' ||
			this.model.state === 'TRANSITION' ||
			this.model.state === 'DEAD'
		) {
			return;
		}
		if (this.model.state === 'STUNNED') {
			return;
		}
		const bossPos = this.model.position;
		const playerPos = player.position;
		const dx = playerPos.x - bossPos.x;
		const dy = playerPos.y - bossPos.y;
		if (dx * dx + dy * dy < CONTACT_DISTANCE * CONTACT_DISTANCE) {
			this.bossContactHitValue = true;
		}
	}

	private applyCrossDamage(player: PlayerService): void {
		if (player.isInvulnerable) {
			return;
		}
		const playerTile = playerTileOf(player);
		const bossTile = this.model.tile;
		if (playerTile.x === bossTile.x || playerTile.y === bossTile.y) {
			this.arena.markHit();
		}
	}
}
