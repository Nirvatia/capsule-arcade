import type { GridService } from '../maze/GridService';
import type { GridPoint } from '../maze/GridModel';
import type { PlayerService } from '../actors/PlayerService';
import type { LevelProgress } from '../level/LevelProgress';
import type { ScoreModel } from '../level/ScoreModel';
import type { EventBus } from '../../engine/EventBus';
import type { PacmanEventMap } from '../../core/Events';
import { DOOM_PICKUP_TILES } from '../../config/mazes/doom';
import { DoomPickupService } from './DoomPickupService';
import type { DoomPickupNeeds } from './DoomPickupService';
import type { DoomPickupKind, DoomPickupModel } from './DoomPickupModel';
import { DoomWeaponService } from './DoomWeaponService';
import type { DoomBfgShot, DoomBfgTracer, DoomFxEvent, DoomSnare } from './DoomWeaponService';
import type { DoomSlotItem } from './DoomWeaponModel';
import type { DoomBossService } from './DoomBossService';
import { DoomSplitService } from './DoomSplitService';
import { minionPosition } from './DoomMinions';
import { assertDoomMap } from './DoomMapValidation';
import {
	PLAYER_MAX_HP,
	PLAYER_IFRAMES,
	BFG_ORB_DAMAGE,
	BFG_ORB_STUN,
	BFG_TRACER_DAMAGE,
	BERSERK_SPEED_MUL,
	FOOD_PER_SHOT,
	PLASMA_DAMAGE,
	RUSH_DAMAGE,
	RUSH_STUN,
	RUSH_TILES,
	SNARE_DAMAGE,
	SNARE_HOLD
} from './DoomBalance';
import type { DebugSink } from '../debug/debugLog';
import { NO_DEBUG } from '../debug/debugLog';

const BOSS_SHOT_HIT_RADIUS_SQ = 0.25;
const MINION_SHOT_HIT_RADIUS_SQ = 0.25;
const BOLT_HIT_RADIUS_SQ = 0.3;
const RUSH_REACH_SQ = 0.9;
const RECOIL_LOCK = 0.3;
/** The rush's own cover: `PlayerService`'s dash runs 10 tiles a second. */
const RUSH_COVER = RUSH_TILES / 10 + 0.15;

/** What the HUD shows in the hand: the item, or the BFG when it is charged. */
export type DoomArmed = Exclude<DoomSlotItem, null> | 'bfg' | '';

/**
 * The hell's hero side of the fight (DESIGN §7 "The fight, redesigned"): health and armour, the food
 * that charges the BFG, the hand (the berserk's rush, the snare, the plasma), the pickups, and the
 * split (`DoomSplitService`), during which the boss is not updated and the weapons are off.
 */
export class DoomAbilityService {
	private readonly grid: GridService;
	private readonly boss: DoomBossService;
	private readonly progress: LevelProgress;
	private readonly pickups: DoomPickupService;
	private readonly weapons: DoomWeaponService;
	private readonly splitValue: DoomSplitService;
	private debug: DebugSink = NO_DEBUG;
	private playerHpValue = PLAYER_MAX_HP;
	private armourValue = false;
	private playerDeadValue = false;
	private godModeValue = false;
	private moveLockTimer = 0;
	private ballHitBossValue = false;
	private rushing = false;
	private rushHit = false;
	private foodSeen = 0;
	private splitWasActive = false;
	private readonly processedTracers = new Set<DoomBfgTracer>();

	constructor(
		grid: GridService,
		boss: DoomBossService,
		progress: LevelProgress,
		score: ScoreModel,
		events: EventBus<PacmanEventMap>,
		pickupTiles: ReadonlyArray<GridPoint> = DOOM_PICKUP_TILES
	) {
		if (!grid) {
			console.error('DoomAbilityService.constructor', 'missing grid service');
			throw new Error('DoomAbilityService.constructor: missing grid service');
		}
		if (!boss) {
			console.error('DoomAbilityService.constructor', 'missing boss service');
			throw new Error('DoomAbilityService.constructor: missing boss service');
		}
		assertDoomMap(grid, pickupTiles);
		this.grid = grid;
		this.boss = boss;
		this.progress = progress;
		this.weapons = new DoomWeaponService(grid);
		this.pickups = new DoomPickupService(pickupTiles, this.needs());
		this.splitValue = new DoomSplitService(grid, progress, score, events);
		this.boss.setProtectedTiles(this.buildProtectedTiles());
		this.boss.setSnareLocator(() => this.locateSnare());
		// the energizers light only during the split
		this.progress.clearEnergizers();
		this.foodSeen = progress.collectedDots;
	}

	get armed(): DoomArmed {
		return this.weapons.slot ?? (this.weapons.bfgReady ? 'bfg' : '');
	}

	get playerHp(): number {
		return this.playerHpValue;
	}

	get armour(): boolean {
		return this.armourValue;
	}

	get split(): DoomSplitService {
		return this.splitValue;
	}

	/** The boss is four ghosts now: do not update him. */
	get bossFrozen(): boolean {
		return this.splitValue.active;
	}

	get pickupList(): readonly DoomPickupModel[] {
		return this.pickups.list;
	}

	/** Pickups lie on the map only outside the split. */
	get pickupsShown(): boolean {
		return !this.splitValue.active;
	}

	canCollect(kind: DoomPickupKind): boolean {
		return this.pickups.isCollectible(kind, this.needs());
	}

	/** Food eaten toward the BFG's shot, 0..1. */
	get bfgCharge(): number {
		return this.weapons.food / FOOD_PER_SHOT;
	}

	get bfgReady(): boolean {
		return this.weapons.bfgReady;
	}

	get bfgChargeProgress(): number {
		return this.weapons.bfgChargeProgress;
	}

	get berserkTimer(): number {
		return this.weapons.berserkTimer;
	}

	get plasmaLeft(): number {
		return this.weapons.plasmaLeft;
	}

	get shots(): readonly DoomBfgShot[] {
		return this.weapons.shots;
	}

	get bolts(): readonly DoomBfgShot[] {
		return this.weapons.bolts;
	}

	get snare(): Readonly<DoomSnare> | null {
		return this.weapons.snare;
	}

	get tracerList(): readonly DoomBfgTracer[] {
		return this.weapons.tracerList;
	}

	get bfgCharging(): boolean {
		return this.weapons.bfgCharging;
	}

	get berserkActive(): boolean {
		return this.weapons.berserkActive;
	}

	get rushActive(): boolean {
		return this.rushing;
	}

	consumeFx(): DoomFxEvent[] {
		return this.weapons.consumeFx();
	}

	/** `fireHeld`: the button is down (the plasma fires while it is). */
	update(dt: number, player: PlayerService, fireHeld = false): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('DoomAbilityService.update', 'invalid delta time', dt);
			return;
		}
		const split = this.splitValue;
		player.setSpeedModifier(
			split.active
				? 1
				: (this.weapons.berserkActive ? BERSERK_SPEED_MUL : 1) * this.boss.playerSpeedFactor(player)
		);
		if (this.playerDeadValue) {
			return;
		}
		this.countFood();
		if (this.boss.consumePhaseTransition()) {
			split.startOmen();
		}
		split.update(dt, player, this.boss, () => this.damagePlayer(1, player, 'ghost'));
		if (split.consumeBurst()) {
			this.weapons.clearShots();
			this.rushing = false;
			const core = split.core;
			if (core) {
				this.weapons.pushFx({ kind: 'split-burst', x: core.x + 0.5, y: core.y + 0.5 });
			}
		}
		if (split.active) {
			this.splitWasActive = true;
			this.moveLockTimer = 0;
			player.setMovementLocked(false);
			return;
		}
		if (this.splitWasActive) {
			this.splitWasActive = false;
			this.pickups.fillEmpty(this.needs());
		}
		this.ballHitBossValue = false;
		this.weapons.update(dt, this.rushing);
		if (this.weapons.consumeChargeCompleted()) {
			this.weapons.fireBfg(player);
			this.moveLockTimer = RECOIL_LOCK;
		}
		if (this.rushing) {
			this.rushStrike(player);
			if (!player.isDashing) {
				this.rushing = false;
				this.weapons.endBerserk();
			}
		}
		if (fireHeld && this.weapons.slot === 'plasma' && player.facing) {
			this.weapons.firePlasma(player, dt);
		} else {
			this.weapons.releasePlasma();
		}
		const collected = this.pickups.update(dt, player, this.needs());
		if (collected) {
			this.debug('spawn', `picked ${collected}`);
			this.applyPickup(collected);
			const p = player.position;
			this.weapons.pushFx({ kind: 'pickup', x: p.x, y: p.y, detail: collected });
		}
		if (this.boss.consumeBossContactHit()) {
			this.damagePlayer(1, player, 'boss contact');
		}
		if (this.boss.consumeMinionContactHit()) {
			this.damagePlayer(1, player, 'minion');
		}
		if (this.boss.consumeHazardHit()) {
			this.damagePlayer(1, player, 'hazard');
		}
		this.resolveShotCollisions();
		this.resolveBoltCollisions();
		this.resolveTracerDamage();
		this.resolveSnare();
		this.moveLockTimer = Math.max(0, this.moveLockTimer - dt);
		player.setMovementLocked(this.weapons.bfgCharging || this.moveLockTimer > 0);
	}

	/** The button pressed: spend what is in hand; with empty hands, the charged BFG. */
	fire(player: PlayerService): 'rush' | 'snare' | 'plasma' | 'bfg' | null {
		if (this.playerDeadValue || this.splitValue.active || this.rushing) {
			return null;
		}
		const slot = this.weapons.slot;
		if (slot === 'berserk') {
			if (!player.facing) {
				return null;
			}
			this.rushing = true;
			this.rushHit = false;
			player.startDash(RUSH_TILES);
			player.grantInvulnerability(RUSH_COVER);
			this.rushStrike(player);
			return 'rush';
		}
		if (slot === 'snare') {
			return this.weapons.placeSnare(player) ? 'snare' : null;
		}
		if (slot === 'plasma') {
			return 'plasma';
		}
		if (player.facing && this.weapons.startBfgCharge()) {
			return 'bfg';
		}
		return null;
	}

	get godMode(): boolean {
		return this.godModeValue;
	}

	/** Debug: the player takes no damage. */
	setGodMode(value: boolean): void {
		this.godModeValue = value;
	}

	/** Dev log lines (player damage, pickups) go here. */
	setDebugSink(sink: DebugSink): void {
		this.debug = sink;
	}

	damagePlayer(amount: number, player: PlayerService, source = 'hit'): void {
		if (this.godModeValue) {
			return;
		}
		if (!Number.isFinite(amount) || amount <= 0) {
			console.error('DoomAbilityService.damagePlayer', 'invalid damage amount', amount);
			return;
		}
		if (this.playerDeadValue || player.isInvulnerable) {
			return;
		}
		this.weapons.pushFx({ kind: 'player-hit', x: player.position.x, y: player.position.y });
		this.weapons.cancelBfgCharge();
		if (this.armourValue) {
			this.armourValue = false;
			this.debug('damage', `armour takes the hit (${source})`, this.playerHpValue);
			player.grantInvulnerability(PLAYER_IFRAMES);
			return;
		}
		this.playerHpValue = Math.max(0, this.playerHpValue - amount);
		this.debug('damage', `player −${amount} (${source})`, this.playerHpValue);
		if (this.playerHpValue <= 0) {
			this.playerDeadValue = true;
		} else {
			player.grantInvulnerability(PLAYER_IFRAMES);
		}
	}

	consumePlayerDeath(): boolean {
		const dead = this.playerDeadValue;
		this.playerDeadValue = false;
		return dead;
	}

	reset(): void {
		this.weapons.reset();
		this.splitValue.reset();
		this.playerHpValue = PLAYER_MAX_HP;
		this.armourValue = false;
		this.playerDeadValue = false;
		this.moveLockTimer = 0;
		this.ballHitBossValue = false;
		this.rushing = false;
		this.splitWasActive = false;
		this.processedTracers.clear();
		this.progress.clearEnergizers();
		this.foodSeen = this.progress.collectedDots;
		this.pickups.reset(this.needs());
	}

	/** Dev: as if the player had walked over a pickup of `kind` (`bfg`: a full charge). */
	debugGiveWeapon(kind: DoomPickupKind | 'bfg'): void {
		if (kind === 'bfg') {
			this.weapons.addFood(FOOD_PER_SHOT);
			return;
		}
		this.applyPickup(kind);
	}

	debugSpawn(): void {
		this.pickups.fillEmpty(this.needs());
	}

	private needs(): DoomPickupNeeds {
		const slot = this.weapons.slot;
		return {
			hp: this.playerHpValue,
			armour: this.armourValue,
			held: slot,
			handFree: slot === null && !this.weapons.bfgCharging
		};
	}

	/** The food eaten since the last look charges the BFG (the split's refill starts the count again). */
	private countFood(): void {
		const now = this.progress.collectedDots;
		if (now > this.foodSeen) {
			this.weapons.addFood(now - this.foodSeen);
		}
		this.foodSeen = now;
	}

	private buildProtectedTiles(): GridPoint[] {
		const keys = new Set<string>();
		const tiles: GridPoint[] = [];
		for (const pickup of this.pickups.list) {
			const candidates: GridPoint[] = [
				pickup.tile,
				...this.grid.walkableNeighbors(pickup.tile.x, pickup.tile.y)
			];
			for (const candidate of candidates) {
				const key = `${candidate.x},${candidate.y}`;
				if (!keys.has(key)) {
					keys.add(key);
					tiles.push({ x: candidate.x, y: candidate.y });
				}
			}
		}
		return tiles;
	}

	/** The open snare's tile: the boss's void and blink keep off it. */
	private locateSnare(): GridPoint | null {
		const snare = this.weapons.snare;
		return snare && snare.snapped < 0 ? { x: snare.x, y: snare.y } : null;
	}

	private applyPickup(kind: DoomPickupKind): void {
		if (kind === 'medkit') {
			this.playerHpValue = Math.min(PLAYER_MAX_HP, this.playerHpValue + 1);
		} else if (kind === 'armour') {
			this.armourValue = true;
		} else {
			this.weapons.take(kind);
		}
	}

	/** The rush: the boss within reach takes it once; the imps on the way die. */
	private rushStrike(player: PlayerService): void {
		const p = player.position;
		const b = this.boss.position;
		const dx = b.x - p.x;
		const dy = b.y - p.y;
		if (!this.rushHit && dx * dx + dy * dy < RUSH_REACH_SQ && !this.boss.defeated) {
			this.rushHit = true;
			this.boss.takeDamage(RUSH_DAMAGE, 'rush');
			this.boss.applyStun(RUSH_STUN);
			this.weapons.pushFx({ kind: 'bite', x: b.x, y: b.y });
			this.weapons.pushFx({ kind: 'boss-hit', x: b.x, y: b.y });
		}
		this.boss.killMinionsWhere((minion) => {
			const pos = minionPosition(minion);
			const mx = pos.x - p.x;
			const my = pos.y - p.y;
			return mx * mx + my * my < RUSH_REACH_SQ;
		});
	}

	private resolveSnare(): void {
		const snare = this.weapons.snare;
		if (!snare || snare.snapped >= 0) {
			return;
		}
		const tile = this.boss.tile;
		const state = this.boss.state;
		if (
			tile.x !== snare.x ||
			tile.y !== snare.y ||
			this.boss.isStunned ||
			this.boss.isStunImmune ||
			state === 'INTRO' ||
			state === 'TRANSITION' ||
			state === 'DEAD'
		) {
			return;
		}
		this.weapons.snapSnare();
		this.boss.takeDamage(SNARE_DAMAGE, 'snare');
		this.boss.applyStun(SNARE_HOLD);
	}

	private resolveShotCollisions(): void {
		const shots = this.weapons.shots;
		const bossPos = this.boss.position;
		for (let i = shots.length - 1; i >= 0; i -= 1) {
			const shot = shots[i];
			const bdx = shot.x - bossPos.x;
			const bdy = shot.y - bossPos.y;
			if (bdx * bdx + bdy * bdy < BOSS_SHOT_HIT_RADIUS_SQ) {
				this.boss.takeDamage(BFG_ORB_DAMAGE, 'BFG orb');
				this.boss.applyStun(BFG_ORB_STUN);
				this.weapons.pushFx({ kind: 'boss-hit', x: bossPos.x, y: bossPos.y });
				this.weapons.detonateShot(i);
				this.ballHitBossValue = true;
				continue;
			}
			this.boss.killMinionsWhere((minion) => {
				const pos = minionPosition(minion);
				const mdx = shot.x - pos.x;
				const mdy = shot.y - pos.y;
				return mdx * mdx + mdy * mdy < MINION_SHOT_HIT_RADIUS_SQ;
			});
		}
	}

	private resolveBoltCollisions(): void {
		const bolts = this.weapons.bolts;
		const bossPos = this.boss.position;
		for (let i = bolts.length - 1; i >= 0; i -= 1) {
			const bolt = bolts[i];
			const bdx = bolt.x - bossPos.x;
			const bdy = bolt.y - bossPos.y;
			if (bdx * bdx + bdy * bdy < BOLT_HIT_RADIUS_SQ && !this.boss.defeated) {
				this.boss.takeDamage(PLASMA_DAMAGE, 'plasma');
				this.weapons.removeBolt(i);
				continue;
			}
			const killed = this.boss.killMinionsWhere((minion) => {
				const pos = minionPosition(minion);
				const mdx = bolt.x - pos.x;
				const mdy = bolt.y - pos.y;
				return mdx * mdx + mdy * mdy < BOLT_HIT_RADIUS_SQ;
			});
			if (killed > 0) {
				this.weapons.removeBolt(i);
			}
		}
	}

	private resolveTracerDamage(): void {
		const tracers = this.weapons.tracerList;
		for (const tracer of tracers) {
			if (this.processedTracers.has(tracer)) {
				continue;
			}
			this.processedTracers.add(tracer);
			if (!this.ballHitBossValue && this.tileInTracer(this.boss.tile.x, this.boss.tile.y, tracer)) {
				this.boss.takeDamage(BFG_TRACER_DAMAGE, 'BFG tracer');
			}
			this.boss.killMinionsWhere((minion) => {
				const pos = minionPosition(minion);
				return this.tileInTracer(Math.floor(pos.x), Math.floor(pos.y), tracer);
			});
		}
		const active = new Set(tracers);
		for (const processed of this.processedTracers) {
			if (!active.has(processed)) {
				this.processedTracers.delete(processed);
			}
		}
	}

	private tileInTracer(tx: number, ty: number, tracer: DoomBfgTracer): boolean {
		if (tracer.dx !== 0) {
			const startX = Math.floor(tracer.x);
			const lineY = Math.floor(tracer.y);
			if (ty !== lineY) {
				return false;
			}
			const endX = startX + tracer.dx * tracer.length;
			return tx >= Math.min(startX, endX) && tx <= Math.max(startX, endX);
		}
		const startY = Math.floor(tracer.y);
		const lineX = Math.floor(tracer.x);
		if (tx !== lineX) {
			return false;
		}
		const endY = startY + tracer.dy * tracer.length;
		return ty >= Math.min(startY, endY) && ty <= Math.max(startY, endY);
	}
}
