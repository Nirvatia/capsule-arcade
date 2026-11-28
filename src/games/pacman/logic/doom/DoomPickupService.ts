import type { PlayerService } from '../actors/PlayerService';
import { DoomPickupModel } from './DoomPickupModel';
import type { DoomPickupKind, DoomPickupTile } from './DoomPickupModel';
import {
	MEDKIT_WAIT_MAX,
	MEDKIT_WAIT_MIN,
	PLAYER_MAX_HP,
	WEAPON_WAIT_MAX,
	WEAPON_WAIT_MIN,
	WEAPON_WEIGHTS
} from './DoomBalance';

const HAND_KINDS = ['berserk', 'plasma', 'bfg'] as const;
const PICKUP_CONTACT_RADIUS_SQ = 0.49;
/** A spot this close to the hero does not get the next pickup (it would be taken unseen). */
const NEAR_HERO_SQ = 4;

/** What the pickups need to know of the hero and the fight. */
export interface DoomPickupNeeds {
	readonly hp: number;
	/** The weapon in his hand: while he holds one, no other comes. */
	readonly held: DoomPickupKind | null;
	/** He can take a weapon now (not while the Maw charges). */
	readonly handFree: boolean;
	/** The boss's phase, 1..3: it weighs which weapon comes. */
	readonly phase: number;
}

/**
 * The four pickup spots (DESIGN §7 "The fight, redesigned"). The weapons come **one at a time**:
 * only while the hand is empty and none lies on the map, after a short wait, its kind drawn by the
 * phase's weights. The medkit comes on its own wait, only to a hurt hero.
 */
export class DoomPickupService {
	private readonly pickups: DoomPickupModel[] = [];
	private weaponWait = 0;
	private medkitWait = 0;

	constructor(
		tiles: ReadonlyArray<DoomPickupTile>,
		needs: DoomPickupNeeds,
		private readonly rng: () => number = Math.random
	) {
		if (!tiles || tiles.length === 0) {
			console.error('DoomPickupService.constructor', 'no pickup tiles');
			throw new Error('DoomPickupService.constructor: no pickup tiles');
		}
		for (const tile of tiles) {
			this.pickups.push(new DoomPickupModel(tile));
		}
		this.fillEmpty(needs);
	}

	get list(): readonly DoomPickupModel[] {
		return this.pickups;
	}

	/** Moves the waits on, brings what is due and returns the kind the hero walked over. */
	update(dt: number, player: PlayerService, needs: DoomPickupNeeds): DoomPickupKind | null {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('DoomPickupService.update', 'invalid delta time', dt);
			return null;
		}
		if (this.weaponWanted(needs)) {
			this.weaponWait -= dt;
			if (this.weaponWait <= 0) {
				this.place(this.drawWeapon(needs.phase), player);
			}
		} else {
			this.weaponWait = this.wait(WEAPON_WAIT_MIN, WEAPON_WAIT_MAX);
		}
		if (this.medkitWanted(needs)) {
			this.medkitWait -= dt;
			if (this.medkitWait <= 0) {
				this.place('medkit', player);
			}
		} else {
			this.medkitWait = this.wait(MEDKIT_WAIT_MIN, MEDKIT_WAIT_MAX);
		}
		for (const pickup of this.pickups) {
			const kind = pickup.kind;
			if (!kind || !this.touchesPlayer(pickup.tile, player) || !this.isCollectible(kind, needs)) {
				continue;
			}
			pickup.reset();
			return kind;
		}
		return null;
	}

	/** The start, after a split and the dev button: a weapon comes at once if one is wanted. */
	fillEmpty(needs: DoomPickupNeeds, player?: PlayerService): void {
		if (this.weaponWanted(needs)) {
			this.place(this.drawWeapon(needs.phase), player);
		}
		this.weaponWait = this.wait(WEAPON_WAIT_MIN, WEAPON_WAIT_MAX);
		this.medkitWait = this.wait(MEDKIT_WAIT_MIN, MEDKIT_WAIT_MAX);
	}

	reset(needs: DoomPickupNeeds): void {
		for (const pickup of this.pickups) {
			pickup.reset();
		}
		this.fillEmpty(needs);
	}

	isCollectible(kind: DoomPickupKind, needs: DoomPickupNeeds): boolean {
		if (kind === 'medkit') {
			return needs.hp < PLAYER_MAX_HP;
		}
		return needs.handFree && needs.held !== kind;
	}

	/** The weapon to come in `phase` (1..3), drawn by its weights. */
	drawWeapon(phase: number): DoomPickupKind {
		const row = WEAPON_WEIGHTS[Math.max(0, Math.min(WEAPON_WEIGHTS.length - 1, phase - 1))];
		const total = row[0] + row[1] + row[2];
		let roll = this.rng() * total;
		for (let i = 0; i < HAND_KINDS.length; i += 1) {
			roll -= row[i];
			if (roll < 0) {
				return HAND_KINDS[i];
			}
		}
		return HAND_KINDS[HAND_KINDS.length - 1];
	}

	private weaponWanted(needs: DoomPickupNeeds): boolean {
		return needs.held === null && !this.pickups.some((p) => p.kind !== null && p.kind !== 'medkit');
	}

	private medkitWanted(needs: DoomPickupNeeds): boolean {
		return needs.hp < PLAYER_MAX_HP && !this.pickups.some((p) => p.kind === 'medkit');
	}

	/** Lays `kind` on a free spot away from the hero (any free spot if all are near him). */
	private place(kind: DoomPickupKind, player?: PlayerService): void {
		const free = this.pickups.filter((p) => !p.visible);
		if (free.length === 0) {
			return;
		}
		const pos = player?.position;
		const far = pos
			? free.filter((p) => {
					const dx = pos.x - (p.tile.x + 0.5);
					const dy = pos.y - (p.tile.y + 0.5);
					return dx * dx + dy * dy >= NEAR_HERO_SQ;
				})
			: free;
		const pool = far.length > 0 ? far : free;
		pool[Math.floor(this.rng() * pool.length)].spawn(kind);
	}

	private wait(min: number, max: number): number {
		return min + this.rng() * (max - min);
	}

	private touchesPlayer(tile: DoomPickupTile, player: PlayerService): boolean {
		const pos = player.position;
		if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) {
			return false;
		}
		const dx = pos.x - (tile.x + 0.5);
		const dy = pos.y - (tile.y + 0.5);
		return dx * dx + dy * dy < PICKUP_CONTACT_RADIUS_SQ;
	}
}
