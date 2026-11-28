import {
	FOOD_PER_SEGMENT,
	FOOD_SEGMENTS,
	MAW_COST,
	RUSH_COOLDOWN,
	STING_FOOD_PER_SECOND
} from './DoomBalance';

/**
 * What the hero holds (DESIGN §7 "The fight, redesigned"): one weapon from the pickups, and the
 * button uses it. `bfg` is the Maw (Жерло, the heavy gun), `plasma` the Sting (Жало), `berserk` the
 * light one. A new pickup replaces the weapon in hand.
 */
export type DoomSlotItem = 'berserk' | 'plasma' | 'bfg' | null;

export interface DoomBfgChargeState {
	readonly charging: boolean;
	readonly progress: number;
}

const BFG_CHARGE_TIME = 0.8;
const BFG_RECOIL_LOCK = 0.3;
const FOOD_MAX = FOOD_SEGMENTS * FOOD_PER_SEGMENT;

/**
 * The hell's weapon state: the weapon in hand, the food meter that feeds the guns (the berserk is
 * free), the Maw's charge and the rush's cooldown.
 */
export class DoomWeaponModel {
	public slot: DoomSlotItem = null;
	/** Food in the meter, 0..`FOOD_SEGMENTS * FOOD_PER_SEGMENT`. */
	public food = 0;
	public rushCooldown = 0;
	public bfgCharging = false;
	public bfgChargeTimer = 0;
	public bfgRecoilTimer = 0;
	private chargeCompletedValue = false;

	get berserkActive(): boolean {
		return this.slot === 'berserk';
	}

	/** The Maw has the whole meter to fire. */
	get bfgReady(): boolean {
		return this.food >= MAW_COST;
	}

	get bfgChargeState(): DoomBfgChargeState {
		return {
			charging: this.bfgCharging,
			progress: BFG_CHARGE_TIME > 0 ? Math.min(1, this.bfgChargeTimer / BFG_CHARGE_TIME) : 0
		};
	}

	addFood(count: number): void {
		if (!Number.isFinite(count) || count <= 0) {
			return;
		}
		this.food = Math.min(FOOD_MAX, this.food + count);
	}

	/** Takes `item` in hand, in place of what was there; false while the Maw charges. */
	take(item: Exclude<DoomSlotItem, null>): boolean {
		if (this.bfgCharging || this.slot === item) {
			return false;
		}
		this.slot = item;
		this.rushCooldown = 0;
		return true;
	}

	/** The berserk's rush can go now. */
	get rushReady(): boolean {
		return this.slot === 'berserk' && this.rushCooldown <= 0;
	}

	startRushCooldown(): void {
		this.rushCooldown = RUSH_COOLDOWN;
	}

	/** Burns `dt` of the Sting's fire from the meter; false when the meter is empty. */
	spendSting(dt: number): boolean {
		if (this.slot !== 'plasma' || this.food <= 0) {
			return false;
		}
		this.food = Math.max(0, this.food - STING_FOOD_PER_SECOND * dt);
		return true;
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
		if (this.bfgCharging) {
			this.bfgChargeTimer = Math.min(BFG_CHARGE_TIME, this.bfgChargeTimer + dt);
			if (this.bfgChargeTimer >= BFG_CHARGE_TIME) {
				this.bfgCharging = false;
				this.bfgChargeTimer = 0;
				this.bfgRecoilTimer = BFG_RECOIL_LOCK;
				this.food = Math.max(0, this.food - MAW_COST);
				this.chargeCompletedValue = true;
			}
		}
		if (this.bfgRecoilTimer > 0) {
			this.bfgRecoilTimer = Math.max(0, this.bfgRecoilTimer - dt);
		}
	}

	reset(): void {
		this.slot = null;
		this.food = 0;
		this.rushCooldown = 0;
		this.bfgCharging = false;
		this.bfgChargeTimer = 0;
		this.bfgRecoilTimer = 0;
		this.chargeCompletedValue = false;
	}
}
