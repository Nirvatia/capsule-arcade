/**
 * The hell's pickups (DESIGN §7): three weapons for the hand, light to heavy (the berserk, the Sting
 * `plasma`, the Maw `bfg`), and the medkit.
 */
export type DoomPickupKind = 'berserk' | 'plasma' | 'bfg' | 'medkit';

export interface DoomPickupTile {
	readonly x: number;
	readonly y: number;
}

/** One pickup spot: what lies on it. `DoomPickupService` decides what comes and when. */
export class DoomPickupModel {
	private kindValue: DoomPickupKind | null = null;
	private readonly tileValue: DoomPickupTile;

	constructor(tile: DoomPickupTile) {
		if (!tile || !Number.isFinite(tile.x) || !Number.isFinite(tile.y)) {
			console.error('DoomPickupModel.constructor', 'invalid tile', tile);
			throw new Error('DoomPickupModel.constructor: invalid tile');
		}
		this.tileValue = tile;
	}

	get tile(): DoomPickupTile {
		return this.tileValue;
	}

	get kind(): DoomPickupKind | null {
		return this.kindValue;
	}

	get visible(): boolean {
		return this.kindValue !== null;
	}

	spawn(kind: DoomPickupKind): void {
		this.kindValue = kind;
	}

	/** Taken, or cleared: the spot is empty. */
	reset(): void {
		this.kindValue = null;
	}
}
