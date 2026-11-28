import {
	BERSERK_HASTE,
	FOOD_PER_SEGMENT,
	FOOD_SEGMENTS,
	MAW_COST,
	RUSH_COOLDOWN,
	RUSH_COST,
	STING_FOOD_PER_SECOND
} from './DoomBalance';

/**
 * What the hero holds (DESIGN §7 "The fight, redesigned"): one weapon from the pickups, and the
 * button uses it. `bfg` is the Maw (Жерло, the heavy gun), `plasma` the Sting (Жало), `berserk` the
 * light one. A new pickup replaces the weapon in hand.
 *
 * Each weapon has its own meter, which is also its whole load: it comes empty, food charges it, and
 * what is used is gone from the meter for good (a rush burns out one of the berserk's three
 * segments, the Sting's fire shortens its meter, the Maw's shot takes it all). When nothing of the
 * meter is left, the weapon is spent and leaves the hand.
 */
export type DoomSlotItem = 'berserk' | 'plasma' | 'bfg' | null;

export interface DoomBfgChargeState {
	readonly charging: boolean;
	readonly progress: number;
}

const BFG_CHARGE_TIME = 0.8;
const BFG_RECOIL_LOCK = 0.3;
/** A weapon's whole meter, in pieces of food. */
export const WEAPON_METER = FOOD_SEGMENTS * FOOD_PER_SEGMENT;
const EPS = 1e-6;

/** The hell's weapon state: the weapon in hand, its meter, the Maw's charge and the rush's cooldown. */
export class DoomWeaponModel {
	public slot: DoomSlotItem = null;
	/** Food charged in the weapon's meter, 0..`capacity`. */
	public food = 0;
	/** What is left of the weapon's meter (charged or not), 0..`WEAPON_METER`; spent below that. */
	public capacity = 0;
	public rushCooldown = 0;
	/** Seconds the berserk's speed still lasts. */
	public haste = 0;
	public bfgCharging = false;
	public bfgChargeTimer = 0;
	public bfgRecoilTimer = 0;
	private chargeCompletedValue = false;
	private spentValue: DoomSlotItem = null;

	get berserkActive(): boolean {
		return this.slot === 'berserk';
	}

	/** The Maw has its whole meter to fire. */
	get bfgReady(): boolean {
		return this.slot === 'bfg' && this.food >= MAW_COST - EPS;
	}

	get bfgChargeState(): DoomBfgChargeState {
		return {
			charging: this.bfgCharging,
			progress: BFG_CHARGE_TIME > 0 ? Math.min(1, this.bfgChargeTimer / BFG_CHARGE_TIME) : 0
		};
	}

	/** Charges the weapon in hand, up to what is left of its meter. */
	addFood(count: number): void {
		if (!Number.isFinite(count) || count <= 0 || this.slot === null) {
			return;
		}
		this.food = Math.min(this.capacity, this.food + count);
	}

	/** Takes `item` in hand, empty, in place of what was there; false while the Maw charges. */
	take(item: Exclude<DoomSlotItem, null>): boolean {
		if (this.bfgCharging || this.slot === item) {
			return false;
		}
		this.slot = item;
		this.food = 0;
		this.capacity = WEAPON_METER;
		this.rushCooldown = 0;
		this.haste = item === 'berserk' ? BERSERK_HASTE : 0;
		return true;
	}

	/** Puts `item` in hand with its whole meter charged (the split's reward for all four eaten). */
	giveCharged(item: Exclude<DoomSlotItem, null>): void {
		this.cancelBfgCharge();
		this.slot = item;
		this.capacity = WEAPON_METER;
		this.food = WEAPON_METER;
		this.rushCooldown = 0;
		this.haste = item === 'berserk' ? BERSERK_HASTE : 0;
	}

	/** The berserk's rush can go now: its cooldown is over and a segment is charged. */
	get rushReady(): boolean {
		return this.slot === 'berserk' && this.rushCooldown <= 0 && this.food >= RUSH_COST - EPS;
	}

	/** The weapon in hand is not charged enough to use: the press is refused, not merely early. */
	get starved(): boolean {
		if (this.slot === 'berserk') {
			return this.food < RUSH_COST - EPS;
		}
		if (this.slot === 'plasma') {
			return this.food <= EPS;
		}
		return this.slot === 'bfg' && !this.bfgReady;
	}

	/** A rush goes: it burns out a charged segment and starts the cooldown. */
	spendRush(): boolean {
		if (!this.rushReady) {
			return false;
		}
		this.burn(RUSH_COST);
		this.rushCooldown = RUSH_COOLDOWN;
		return true;
	}

	/** Burns `dt` of the Sting's fire out of its meter; false when nothing is charged. */
	spendSting(dt: number): boolean {
		if (this.slot !== 'plasma' || this.food <= EPS) {
			return false;
		}
		this.burn(Math.min(this.food, STING_FOOD_PER_SECOND * dt));
		return true;
	}

	/** The weapon that has just been spent (once), for its effect. */
	consumeSpent(): DoomSlotItem {
		const value = this.spentValue;
		this.spentValue = null;
		return value;
	}

	startBfgCharge(): boolean {
		if (this.slot !== 'bfg' || !this.bfgReady || this.bfgCharging || this.bfgRecoilTimer > 0) {
			return false;
		}
		this.bfgCharging = true;
		this.bfgChargeTimer = 0;
		return true;
	}

	cancelBfgCharge(): void {
		if (!this.bfgCharging) {
			return;
		}
		this.bfgCharging = false;
		this.bfgChargeTimer = 0;
	}

	consumeChargeCompleted(): boolean {
		const value = this.chargeCompletedValue;
		this.chargeCompletedValue = false;
		return value;
	}

	update(dt: number): void {
		if (!Number.isFinite(dt) || dt < 0) {
			return;
		}
		this.rushCooldown = Math.max(0, this.rushCooldown - dt);
		this.haste = Math.max(0, this.haste - dt);
		if (this.bfgCharging) {
			this.bfgChargeTimer = Math.min(BFG_CHARGE_TIME, this.bfgChargeTimer + dt);
			if (this.bfgChargeTimer >= BFG_CHARGE_TIME) {
				this.bfgCharging = false;
				this.bfgChargeTimer = 0;
				this.bfgRecoilTimer = BFG_RECOIL_LOCK;
				this.chargeCompletedValue = true;
				this.burn(this.capacity);
			}
		}
		if (this.bfgRecoilTimer > 0) {
			this.bfgRecoilTimer = Math.max(0, this.bfgRecoilTimer - dt);
		}
	}

	reset(): void {
		this.slot = null;
		this.food = 0;
		this.capacity = 0;
		this.rushCooldown = 0;
		this.haste = 0;
		this.bfgCharging = false;
		this.bfgChargeTimer = 0;
		this.bfgRecoilTimer = 0;
		this.chargeCompletedValue = false;
		this.spentValue = null;
	}

	/** Uses `amount` of the charge: gone from the meter for good; nothing left spends the weapon. */
	private burn(amount: number): void {
		this.food = Math.max(0, this.food - amount);
		this.capacity = Math.max(0, this.capacity - amount);
		if (this.capacity <= EPS) {
			this.spentValue = this.slot;
			this.slot = null;
			this.food = 0;
			this.capacity = 0;
			this.rushCooldown = 0;
		}
	}
}
