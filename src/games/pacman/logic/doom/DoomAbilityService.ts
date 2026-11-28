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
import type { DoomBfgShot, DoomBfgTracer, DoomFxEvent } from './DoomWeaponService';
import type { DoomSlotItem } from './DoomWeaponModel';
import type { DoomBossService } from './DoomBossService';
import { DoomSplitService } from './DoomSplitService';
import { minionPosition } from './DoomMinions';
import { assertDoomMap } from './DoomMapValidation';
import {
	PLAYER_MAX_HP,
	PLAYER_IFRAMES,
	BFG_ORB_DAMAGE,
	BFG_ORB_GLANCE_DAMAGE,
	BFG_ORB_STUN,
	BFG_TRACER_DAMAGE,
	FOOD_REGROW_EVERY,
	FOOD_REGROW_MIN_DIST,
	BERSERK_SPEED_MUL,
	FOOD_PER_SEGMENT,
	FOOD_SEGMENTS,
	MAW_COST,
	RUSH_COUNTER_MUL,
	SPLIT_WINDOW_MUL,
	RUSH_DAMAGE,
	RUSH_STUN,
	RUSH_TILES,
	STING_DAMAGE
} from './DoomBalance';
import type { DebugSink } from '../debug/debugLog';
import { NO_DEBUG } from '../debug/debugLog';

const BOSS_SHOT_HIT_RADIUS_SQ = 0.25;
const MINION_SHOT_HIT_RADIUS_SQ = 0.25;
const BOLT_HIT_RADIUS_SQ = 0.3;
const RUSH_REACH_SQ = 0.9;
const RECOIL_LOCK = 0.3;
/** The counter rush's cover: `PlayerService`'s dash runs 10 tiles a second. */
const RUSH_COVER = RUSH_TILES / 10 + 0.15;
/** A plain rush that strikes the boss is not hurt by touching him in the same moment. */
const RUSH_HIT_GRACE = 0.6;
const FOOD_MAX = FOOD_SEGMENTS * FOOD_PER_SEGMENT;

/** What the HUD shows in the hand. */
export type DoomArmed = Exclude<DoomSlotItem, null> | '';

/**
 * The hell's hero side of the fight (DESIGN §7 "The fight, redesigned"): health, the food meter
 * that feeds the guns, the weapon in hand (the berserk's rush, the Sting held down, the Maw charged
 * standing still), the pickups, and the split (`DoomSplitService`), during which the boss is not
 * updated and the weapons are off.
 */
export class DoomAbilityService {
	private readonly grid: GridService;
	private readonly boss: DoomBossService;
	private readonly progress: LevelProgress;
	private readonly pickups: DoomPickupService;
	private readonly events: EventBus<PacmanEventMap>;
	private readonly weapons: DoomWeaponService;
	private readonly splitValue: DoomSplitService;
	private debug: DebugSink = NO_DEBUG;
	private playerHpValue = PLAYER_MAX_HP;
	private playerDeadValue = false;
	private godModeValue = false;
	private moveLockTimer = 0;
	private ballHitBossValue = false;
	private rushing = false;
	private rushCounter = false;
	private rushHit = false;
	private foodSeen = 0;
	private regrowClock = 0;
	private splitWindowValue = false;
	private readonly rng: () => number = Math.random;
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
		this.events = events;
		this.weapons = new DoomWeaponService(grid);
		this.pickups = new DoomPickupService(pickupTiles, this.needs());
		this.splitValue = new DoomSplitService(grid, progress, score, events);
		this.boss.setProtectedTiles(this.buildProtectedTiles());
		// the energizers light only during the split
		this.progress.clearEnergizers();
		this.foodSeen = progress.collectedDots;
	}

	get armed(): DoomArmed {
		return this.weapons.slot ?? '';
	}

	get playerHp(): number {
		return this.playerHpValue;
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

	/** The food meter, 0..1 (`FOOD_SEGMENTS` segments). */
	get food(): number {
		return this.weapons.food / FOOD_MAX;
	}

	/** The boss stands stunned after a split with all four eaten: the rush and the Sting hit ×3. */
	get splitWindow(): boolean {
		return this.splitWindowValue;
	}

	/** What is left of the weapon's load in hand (shots, seconds of fire or rushes) and its whole. */
	get load(): { readonly left: number; readonly max: number } {
		return { left: this.weapons.load, max: this.weapons.loadMax };
	}

	/** The Maw has its whole meter. */
	get bfgReady(): boolean {
		return this.weapons.bfgReady;
	}

	get bfgChargeProgress(): number {
		return this.weapons.bfgChargeProgress;
	}

	get rushCooldown(): number {
		return this.weapons.rushCooldown;
	}

	get shots(): readonly DoomBfgShot[] {
		return this.weapons.shots;
	}

	get bolts(): readonly DoomBfgShot[] {
		return this.weapons.bolts;
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

	/** The boss's attack is live now: a rush made in it is a counter (more damage, unhurt). */
	get counterWindow(): boolean {
		if (this.boss.defeated || this.splitValue.active) {
			return false;
		}
		return (
			this.boss.state === 'ACTIVE' ||
			this.boss.hazardList.some((hazard) => hazard.warn <= 0 && hazard.active > 0)
		);
	}

	consumeFx(): DoomFxEvent[] {
		return this.weapons.consumeFx();
	}

	/** `fireHeld`: the button is down (the Sting fires while it is). */
	update(dt: number, player: PlayerService, fireHeld = false): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('DoomAbilityService.update', 'invalid delta time', dt);
			return;
		}
		const split = this.splitValue;
		player.setSpeedModifier(
			split.active
				? 1
				: (this.weapons.hasted ? BERSERK_SPEED_MUL : 1) * this.boss.playerSpeedFactor(player)
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
			this.pickups.fillEmpty(this.needs(), player);
			// all four eaten: he formed stunned, the window for the rush's and the Sting's triple hit
			this.splitWindowValue = this.boss.isStunned;
		}
		if (!this.boss.isStunned) {
			this.splitWindowValue = false;
		}
		this.regrowFood(dt, player);
		this.ballHitBossValue = false;
		this.weapons.update(dt);
		if (this.weapons.consumeChargeCompleted()) {
			this.weapons.fireBfg(player);
			this.moveLockTimer = RECOIL_LOCK;
		}
		let struck = false;
		if (this.rushing) {
			struck = this.rushStrike(player);
			if (!player.isDashing) {
				this.rushing = false;
			}
		}
		if (fireHeld && this.weapons.slot === 'plasma' && player.facing) {
			this.weapons.fireSting(player, dt);
		} else {
			this.weapons.releaseSting();
		}
		const spent = this.weapons.consumeSpent();
		if (spent) {
			const p = player.position;
			this.weapons.pushFx({ kind: 'spent', x: p.x, y: p.y, detail: spent });
		}
		const collected = this.pickups.update(dt, player, this.needs());
		if (collected) {
			this.debug('spawn', `picked ${collected}`);
			this.applyPickup(collected);
			const p = player.position;
			this.weapons.pushFx({ kind: 'pickup', x: p.x, y: p.y, detail: collected });
		}
		if (this.boss.consumeBossContactHit() && !struck) {
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
		this.moveLockTimer = Math.max(0, this.moveLockTimer - dt);
		player.setMovementLocked(this.weapons.bfgCharging || this.moveLockTimer > 0);
	}

	/**
	 * The button pressed: the berserk rushes (unhurt and stronger in the boss's live attack), the
	 * Maw starts its charge once the meter is full; the Sting fires while the button is held.
	 */
	fire(player: PlayerService): 'rush' | 'plasma' | 'bfg' | null {
		if (this.playerDeadValue || this.splitValue.active || this.rushing) {
			return null;
		}
		const slot = this.weapons.slot;
		if (slot && this.weapons.starved) {
			// the meter cannot pay it: a dull click, nothing goes
			this.events.emit('audio:cue', { cue: 'ability-fizzle' });
			return null;
		}
		if (slot === 'berserk') {
			if (!player.facing || !this.weapons.spendRush()) {
				return null;
			}
			this.rushing = true;
			this.rushHit = false;
			this.rushCounter = this.counterWindow;
			player.startDash(RUSH_TILES, this.rushCounter ? RUSH_COVER : 0);
			const p = player.position;
			this.weapons.pushFx({
				kind: 'rush',
				x: p.x,
				y: p.y,
				detail: this.rushCounter ? 'counter' : ''
			});
			this.rushStrike(player);
			return 'rush';
		}
		if (slot === 'plasma') {
			return 'plasma';
		}
		if (slot === 'bfg' && player.facing && this.weapons.startBfgCharge()) {
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
		this.playerDeadValue = false;
		this.moveLockTimer = 0;
		this.ballHitBossValue = false;
		this.rushing = false;
		this.splitWasActive = false;
		this.processedTracers.clear();
		this.progress.clearEnergizers();
		this.foodSeen = this.progress.collectedDots;
		this.regrowClock = 0;
		this.splitWindowValue = false;
		this.pickups.reset(this.needs());
	}

	/** Dev: as if the player had walked over a pickup of `kind`; `food` fills the meter. */
	debugGiveWeapon(kind: DoomPickupKind | 'food'): void {
		if (kind === 'food') {
			this.weapons.addFood(MAW_COST);
			return;
		}
		this.applyPickup(kind);
	}

	debugSpawn(): void {
		this.pickups.fillEmpty(this.needs());
	}

	private needs(): DoomPickupNeeds {
		return {
			hp: this.playerHpValue,
			held: this.weapons.slot,
			handFree: !this.weapons.bfgCharging,
			phase: this.boss.phase
		};
	}

	/** Every `FOOD_REGROW_EVERY` s an eaten tile away from the hero fills again: the fight never runs dry. */
	private regrowFood(dt: number, player: PlayerService): void {
		this.regrowClock += dt;
		if (this.regrowClock < FOOD_REGROW_EVERY) {
			return;
		}
		this.regrowClock -= FOOD_REGROW_EVERY;
		const hero = player.tile;
		const far: GridPoint[] = [];
		for (let y = 0; y < this.grid.height; y += 1) {
			for (let x = 0; x < this.grid.width; x += 1) {
				if (
					this.grid.isDot(x, y) &&
					this.progress.isCollected(x, y) &&
					Math.abs(x - hero.x) + Math.abs(y - hero.y) >= FOOD_REGROW_MIN_DIST
				) {
					far.push({ x, y });
				}
			}
		}
		if (far.length === 0) {
			return;
		}
		const at = far[Math.floor(this.rng() * far.length)];
		this.progress.restoreDot(at.x, at.y);
		// the meter counts only what is eaten: a tile growing back is not food in hand
		this.foodSeen = this.progress.collectedDots;
	}

	/** The food eaten since the last look fills the meter (the split's refill starts the count again). */
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

	private applyPickup(kind: DoomPickupKind): void {
		if (kind === 'medkit') {
			this.playerHpValue = Math.min(PLAYER_MAX_HP, this.playerHpValue + 1);
		} else {
			this.weapons.take(kind);
		}
	}

	/** The rush: the boss within reach takes it once (more in a counter); the imps on the way die. */
	private rushStrike(player: PlayerService): boolean {
		const p = player.position;
		const b = this.boss.position;
		const dx = b.x - p.x;
		const dy = b.y - p.y;
		let struck = false;
		if (!this.rushHit && dx * dx + dy * dy < RUSH_REACH_SQ && !this.boss.defeated) {
			this.rushHit = true;
			struck = true;
			const mul = Math.max(
				this.rushCounter ? RUSH_COUNTER_MUL : 1,
				this.splitWindowValue ? SPLIT_WINDOW_MUL : 1
			);
			this.boss.takeDamage(RUSH_DAMAGE * mul, this.rushCounter ? 'counter rush' : 'rush');
			this.boss.applyStun(RUSH_STUN);
			if (!player.isInvulnerable) {
				player.grantInvulnerability(RUSH_HIT_GRACE);
			}
			this.weapons.pushFx({ kind: 'bite', x: b.x, y: b.y });
			this.weapons.pushFx({ kind: 'boss-hit', x: b.x, y: b.y });
		}
		this.boss.killMinionsWhere((minion) => {
			const pos = minionPosition(minion);
			const mx = pos.x - p.x;
			const my = pos.y - p.y;
			return mx * mx + my * my < RUSH_REACH_SQ;
		});
		return struck;
	}

	private resolveShotCollisions(): void {
		const shots = this.weapons.shots;
		const bossPos = this.boss.position;
		for (let i = shots.length - 1; i >= 0; i -= 1) {
			const shot = shots[i];
			const bdx = shot.x - bossPos.x;
			const bdy = shot.y - bossPos.y;
			if (bdx * bdx + bdy * bdy < BOSS_SHOT_HIT_RADIUS_SQ) {
				// the real hit only on a stunned boss (the split's window); a glance otherwise
				const stunned = this.boss.isStunned;
				this.boss.takeDamage(
					stunned ? BFG_ORB_DAMAGE : BFG_ORB_GLANCE_DAMAGE,
					stunned ? 'Maw orb, stunned' : 'Maw orb, glance'
				);
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
				const mul = this.splitWindowValue ? SPLIT_WINDOW_MUL : 1;
				this.boss.takeDamage(STING_DAMAGE * mul, mul > 1 ? 'Sting, split window' : 'Sting');
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
				this.boss.takeDamage(BFG_TRACER_DAMAGE, 'Maw tracer');
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
