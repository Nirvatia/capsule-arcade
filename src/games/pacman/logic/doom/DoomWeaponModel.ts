import { BERSERK_DURATION, FOOD_PER_SHOT, PLASMA_AMMO } from './DoomBalance';

/** What the hero holds: the button spends it; with empty hands it fires the BFG when charged. */
export type DoomSlotItem = 'berserk' | 'snare' | 'plasma' | null;

export interface DoomBfgChargeState {
	readonly charging: boolean;
	readonly progress: number;
}

const BFG_CHARGE_TIME = 0.8;
const BFG_RECOIL_LOCK = 0.3;

/**
 * The hell's weapon state (DESIGN §7 "The fight, redesigned"): the item in hand, the berserk's
 * time, the plasma's ammo, and the BFG, charged by the food eaten (one shot stored).
 */
export class DoomWeaponModel {
	public slot: DoomSlotItem = null;
	public berserkTimer = 0;
	public plasmaLeft = 0;
	/** Food eaten toward the BFG's shot, 0..`FOOD_PER_SHOT`. */
	public food = 0;
	public bfgCharging = false;
	public bfgChargeTimer = 0;
	public bfgRecoilTimer = 0;
	private chargeCompletedValue = false;

	get berserkActive(): boolean {
		return this.slot === 'berserk';
	}

	get bfgReady(): boolean {
		return this.food >= FOOD_PER_SHOT;
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
		this.food = Math.min(FOOD_PER_SHOT, this.food + count);
	}

	/** Puts `item` in the empty hand; false when the hand is full or the BFG is charging. */
	take(item: Exclude<DoomSlotItem, null>): boolean {
		if (this.slot !== null || this.bfgCharging) {
			return false;
		}
		this.slot = item;
		if (item === 'berserk') {
			this.berserkTimer = BERSERK_DURATION;
		} else if (item === 'plasma') {
			this.plasmaLeft = PLASMA_AMMO;
		}
		return true;
	}

	/** The berserk is spent (its rush is over) or has run out. */
	endBerserk(): void {
		if (this.slot === 'berserk') {
			this.slot = null;
		}
		this.berserkTimer = 0;
	}

	consumeSnare(): boolean {
		if (this.slot !== 'snare') {
			return false;
		}
		this.slot = null;
		return true;
	}

	/** Burns `dt` of plasma; the hand empties when it is out. */
	spendPlasma(dt: number): void {
		if (this.slot !== 'plasma') {
			return;
		}
		this.plasmaLeft = Math.max(0, this.plasmaLeft - dt);
		if (this.plasmaLeft <= 0) {
			this.slot = null;
		}
	}

	startBfgCharge(): boolean {
		if (this.slot !== null || !this.bfgReady || this.bfgCharging || this.bfgRecoilTimer > 0) {
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

	/** `rushing`: the berserk's clock stops while its rush runs. */
	update(dt: number, rushing = false): void {
		if (!Number.isFinite(dt) || dt < 0) {
			return;
		}
		if (this.slot === 'berserk' && !rushing) {
			this.berserkTimer = Math.max(0, this.berserkTimer - dt);
			if (this.berserkTimer <= 0) {
				this.endBerserk();
			}
		}
		if (this.bfgCharging) {
			this.bfgChargeTimer = Math.min(BFG_CHARGE_TIME, this.bfgChargeTimer + dt);
			if (this.bfgChargeTimer >= BFG_CHARGE_TIME) {
				this.bfgCharging = false;
				this.bfgChargeTimer = 0;
				this.bfgRecoilTimer = BFG_RECOIL_LOCK;
				this.food = 0;
				this.chargeCompletedValue = true;
			}
		}
		if (this.bfgRecoilTimer > 0) {
			this.bfgRecoilTimer = Math.max(0, this.bfgRecoilTimer - dt);
		}
	}

	reset(): void {
		this.slot = null;
		this.berserkTimer = 0;
		this.plasmaLeft = 0;
		this.food = 0;
		this.bfgCharging = false;
		this.bfgChargeTimer = 0;
		this.bfgRecoilTimer = 0;
		this.chargeCompletedValue = false;
	}
}
