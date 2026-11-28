import type { GridService } from '../maze/GridService';
import type { PlayerService } from '../actors/PlayerService';
import { DoomWeaponModel } from './DoomWeaponModel';
import type { DoomSlotItem } from './DoomWeaponModel';
import { STING_RATE, STING_SPEED } from './DoomBalance';

const BFG_BALL_SPEED = 14;
const BFG_SHOT_LIFETIME = 2.0;
const BFG_TRACER_VISIBLE = 0.25;
const BOLT_LIFETIME = 2.0;

/** A projectile along a corridor: the Maw's orb or a Sting bolt (tile units). */
export interface DoomBfgShot {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
}

/** Something the renderer should show an effect for (tile-center coordinates). */
export interface DoomFxEvent {
	readonly kind:
		| 'bfg-fire'
		| 'bfg-impact'
		| 'split-burst'
		| 'rush'
		| 'bite'
		| 'pickup'
		| 'boss-hit'
		| 'player-hit'
		/** The weapon in hand is spent and tossed away behind him (`detail`: the weapon; dx, dy: his heading). */
		| 'spent'
		/** A Sting bolt landed (`detail`: 'boss', 'wall' or 'imp'). */
		| 'sting-hit'
		/** The rush struck the boss (`detail`: 'counter' for the ×3). */
		| 'rush-hit'
		/** The Maw's orb struck the boss (`detail`: 'full' when he was stunned, else 'glance'). */
		| 'maw-hit'
		/** A ghost of the split eaten (`detail`: its points). */
		| 'ghost-eaten'
		/** The split is over: he forms on the core. */
		| 'split-form';
	readonly x: number;
	readonly y: number;
	readonly dx?: number;
	readonly dy?: number;
	readonly detail?: string;
}

export interface DoomBfgTracer {
	x: number;
	y: number;
	dx: number;
	dy: number;
	length: number;
	timer: number;
}

const STEP: Record<string, readonly [number, number]> = {
	UP: [0, -1],
	DOWN: [0, 1],
	LEFT: [-1, 0],
	RIGHT: [1, 0]
};

/** The hell's weapons in the world: the Maw's orbs and tracers, the Sting's bolts, the meter. */
export class DoomWeaponService {
	private readonly model: DoomWeaponModel;
	private readonly grid: GridService;
	private readonly bfgShots: DoomBfgShot[] = [];
	private readonly stingBolts: DoomBfgShot[] = [];
	private readonly tracers: DoomBfgTracer[] = [];
	private readonly fxQueue: DoomFxEvent[] = [];
	private stingClock = 0;

	constructor(grid: GridService) {
		if (!grid) {
			console.error('DoomWeaponService.constructor', 'missing grid service');
			throw new Error('DoomWeaponService.constructor: missing grid service');
		}
		this.model = new DoomWeaponModel();
		this.grid = grid;
	}

	get slot(): DoomSlotItem {
		return this.model.slot;
	}

	get berserkActive(): boolean {
		return this.model.berserkActive;
	}

	get rushCooldown(): number {
		return this.model.rushCooldown;
	}

	get rushReady(): boolean {
		return this.model.rushReady;
	}

	get food(): number {
		return this.model.food;
	}

	get bfgReady(): boolean {
		return this.model.bfgReady;
	}

	get bfgCharging(): boolean {
		return this.model.bfgCharging;
	}

	get bfgChargeProgress(): number {
		return this.model.bfgChargeState.progress;
	}

	get shots(): readonly DoomBfgShot[] {
		return this.bfgShots;
	}

	get bolts(): readonly DoomBfgShot[] {
		return this.stingBolts;
	}

	get tracerList(): readonly DoomBfgTracer[] {
		return this.tracers;
	}

	pushFx(event: DoomFxEvent): void {
		this.fxQueue.push(event);
	}

	consumeFx(): DoomFxEvent[] {
		const events = this.fxQueue.slice();
		this.fxQueue.length = 0;
		return events;
	}

	take(item: Exclude<DoomSlotItem, null>): boolean {
		return this.model.take(item);
	}

	addFood(count: number): void {
		this.model.addFood(count);
	}

	/** Pays the rush (a segment) and starts its cooldown; false if it cannot go. */
	spendRush(): boolean {
		return this.model.spendRush();
	}

	/** What is left of the weapon's meter, charged or not (pieces of food). */
	get capacity(): number {
		return this.model.capacity;
	}

	/** The berserk's speed still lasts. */
	get hasted(): boolean {
		return this.model.haste > 0;
	}

	/** Puts `item` in hand with its whole meter charged. */
	giveCharged(item: Exclude<DoomSlotItem, null>): void {
		this.model.giveCharged(item);
	}

	/** The meter cannot pay the weapon in hand. */
	get starved(): boolean {
		return this.model.starved;
	}

	/** The weapon just spent (once), for its effect. */
	consumeSpent(): DoomSlotItem {
		return this.model.consumeSpent();
	}

	startBfgCharge(): boolean {
		return this.model.startBfgCharge();
	}

	cancelBfgCharge(): void {
		this.model.cancelBfgCharge();
	}

	consumeChargeCompleted(): boolean {
		return this.model.consumeChargeCompleted();
	}

	fireBfg(player: PlayerService): void {
		this.launch(player, this.bfgShots, BFG_BALL_SPEED, BFG_SHOT_LIFETIME, true);
	}

	/** The Sting, held down: burns the meter and lets a bolt go every `STING_RATE`. */
	fireSting(player: PlayerService, dt: number): void {
		if (!this.model.spendSting(dt)) {
			return;
		}
		this.stingClock -= dt;
		if (this.stingClock <= 0) {
			this.stingClock += STING_RATE;
			this.launch(player, this.stingBolts, STING_SPEED, BOLT_LIFETIME, false);
		}
	}

	/** The Sting's trigger is let go: the next press fires at once. */
	releaseSting(): void {
		this.stingClock = 0;
	}

	detonateShot(index: number): void {
		if (index < 0 || index >= this.bfgShots.length) {
			return;
		}
		const shot = this.bfgShots[index];
		this.spawnTracers(shot.x, shot.y);
		this.bfgShots.splice(index, 1);
	}

	removeBolt(index: number): void {
		if (index >= 0 && index < this.stingBolts.length) {
			this.stingBolts.splice(index, 1);
		}
	}

	update(dt: number): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('DoomWeaponService.update', 'invalid delta time', dt);
			return;
		}
		this.model.update(dt);
		for (let i = this.bfgShots.length - 1; i >= 0; i -= 1) {
			if (!this.advance(this.bfgShots[i], dt)) {
				this.detonateShot(i);
			}
		}
		for (let i = this.stingBolts.length - 1; i >= 0; i -= 1) {
			const bolt = this.stingBolts[i];
			if (!this.advance(bolt, dt)) {
				if (bolt.life > 0) {
					// it met a wall: the splat sits on the wall's face
					const sp = Math.hypot(bolt.vx, bolt.vy) || 1;
					this.pushFx({
						kind: 'sting-hit',
						x: bolt.x + (bolt.vx / sp) * 0.3,
						y: bolt.y + (bolt.vy / sp) * 0.3,
						detail: 'wall'
					});
				}
				this.stingBolts.splice(i, 1);
			}
		}
		for (let i = this.tracers.length - 1; i >= 0; i -= 1) {
			this.tracers[i].timer -= dt;
			if (this.tracers[i].timer <= 0) {
				this.tracers.splice(i, 1);
			}
		}
	}

	/** The split: what flies is gone, the meter and the hand are kept. */
	clearShots(): void {
		this.model.cancelBfgCharge();
		this.bfgShots.length = 0;
		this.stingBolts.length = 0;
		this.tracers.length = 0;
	}

	reset(): void {
		this.model.reset();
		this.bfgShots.length = 0;
		this.stingBolts.length = 0;
		this.tracers.length = 0;
		this.fxQueue.length = 0;
		this.stingClock = 0;
	}

	private launch(
		player: PlayerService,
		into: DoomBfgShot[],
		speed: number,
		life: number,
		orb: boolean
	): void {
		const facing = player.facing;
		if (!facing) {
			console.error('DoomWeaponService.launch', 'player has no facing direction');
			return;
		}
		const [dx, dy] = STEP[facing];
		const pos = player.position;
		into.push({ x: pos.x, y: pos.y, vx: dx * speed, vy: dy * speed, life });
		if (orb) {
			this.pushFx({ kind: 'bfg-fire', x: pos.x, y: pos.y, dx, dy });
		}
	}

	/** Moves a projectile; false when it is spent or would enter a wall. */
	private advance(shot: DoomBfgShot, dt: number): boolean {
		shot.life -= dt;
		if (shot.life <= 0) {
			return false;
		}
		const nextX = shot.x + shot.vx * dt;
		const nextY = shot.y + shot.vy * dt;
		if (this.hitWall(nextX, nextY)) {
			return false;
		}
		shot.x = nextX;
		shot.y = nextY;
		return true;
	}

	private hitWall(x: number, y: number): boolean {
		const tileX = Math.floor(x);
		const tileY = Math.floor(y);
		if (!this.grid.isInside(tileX, tileY)) {
			return true;
		}
		return !this.grid.isWalkable(tileX, tileY);
	}

	private spawnTracers(x: number, y: number): void {
		this.pushFx({ kind: 'bfg-impact', x, y });
		const directions = [
			{ dx: 1, dy: 0 },
			{ dx: -1, dy: 0 },
			{ dx: 0, dy: 1 },
			{ dx: 0, dy: -1 }
		];
		for (const dir of directions) {
			let length = 0;
			let testX = Math.floor(x);
			let testY = Math.floor(y);
			while (this.grid.isInside(testX, testY) && this.grid.isWalkable(testX, testY)) {
				length += 1;
				testX += dir.dx;
				testY += dir.dy;
			}
			if (length > 0) {
				this.tracers.push({ x, y, dx: dir.dx, dy: dir.dy, length, timer: BFG_TRACER_VISIBLE });
			}
		}
	}
}
