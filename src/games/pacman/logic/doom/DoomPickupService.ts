import type { PlayerService } from '../actors/PlayerService';
import { DoomPickupModel } from './DoomPickupModel';
import type { DoomPickupKind, DoomPickupTile } from './DoomPickupModel';
import { PLAYER_MAX_HP } from './DoomBalance';

const RESPAWN_MIN = 15;
const RESPAWN_MAX = 20;
/** Nothing could come (all kinds lie or are held): look again after this. */
const RETRY = 3;
const HAND_KINDS: readonly DoomPickupKind[] = ['berserk', 'snare', 'plasma'];
const PICKUP_CONTACT_RADIUS_SQ = 0.49;

/** What the pickups need to know of the hero. */
export interface DoomPickupNeeds {
	readonly hp: number;
	readonly armour: boolean;
	/** The kind in his hand (it does not lie on the map at the same time). */
	readonly held: DoomPickupKind | null;
	/** His hand is free for a hand kind. */
	readonly handFree: boolean;
}

/**
 * The four pickup spots. One of each kind at most on the map (and none of the kind in the hero's
 * hand); the medkit comes only for a hurt hero, the armour only for a whole one without armour.
 */
export class DoomPickupService {
	private readonly pickups: DoomPickupModel[] = [];

	constructor(tiles: ReadonlyArray<DoomPickupTile>, needs: DoomPickupNeeds) {
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
		for (const pickup of this.pickups) {
			pickup.update(dt);
			if (pickup.due) {
				this.bring(pickup, needs);
			}
		}
		for (const pickup of this.pickups) {
			const kind = pickup.kind;
			if (!kind || !this.touchesPlayer(pickup.tile, player) || !this.isCollectible(kind, needs)) {
				continue;
			}
			pickup.startRespawn(RESPAWN_MIN + Math.random() * (RESPAWN_MAX - RESPAWN_MIN));
			return kind;
		}
		return null;
	}

	/** Every empty spot gets something now (the start, and after a split). */
	fillEmpty(needs: DoomPickupNeeds): void {
		for (const pickup of this.pickups) {
			if (!pickup.visible) {
				this.bring(pickup, needs);
			}
		}
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
		if (kind === 'armour') {
			return !needs.armour;
		}
		return needs.handFree;
	}

	/** The kinds that may come now, for these needs. */
	choices(needs: DoomPickupNeeds): DoomPickupKind[] {
		const lying = new Set(this.pickups.map((p) => p.kind));
		const out = HAND_KINDS.filter((k) => !lying.has(k) && needs.held !== k);
		if (needs.hp < PLAYER_MAX_HP && !lying.has('medkit')) {
			out.push('medkit');
		}
		if (
			needs.hp >= PLAYER_MAX_HP &&
			!needs.armour &&
			!lying.has('armour') &&
			!lying.has('medkit')
		) {
			out.push('armour');
		}
		return out;
	}

	private bring(pickup: DoomPickupModel, needs: DoomPickupNeeds): void {
		const choices = this.choices(needs);
		if (choices.length === 0) {
			pickup.startRespawn(RETRY);
			return;
		}
		pickup.spawn(choices[Math.floor(Math.random() * choices.length)]);
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
