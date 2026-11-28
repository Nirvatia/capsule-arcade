/**
 * The hell's pickups (DESIGN §7): three weapons for the hand, light to heavy (the berserk, the Sting
 * `plasma`, the Maw `bfg`), and the medkit.
 */
export type DoomPickupKind = 'berserk' | 'plasma' | 'bfg' | 'medkit';

export interface DoomPickupTile {
	readonly x: number;
	readonly y: number;
}

/**
 * One pickup spot: what lies on it, or how long until something comes. The kind is chosen when it
 * comes (`DoomPickupService`), so the medkit comes only to a hurt hero.
 */
export class DoomPickupModel {
	private kindValue: DoomPickupKind | null = null;
	private respawnTimerValue = 0;
	private respawnDelayValue = 0;
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

	/** Empty and its wait is over: something should come now. */
	get due(): boolean {
		return this.kindValue === null && this.respawnTimerValue <= 0;
	}

	get respawnProgress(): number {
		if (this.respawnDelayValue <= 0) {
			return 0;
		}
		return Math.max(0, Math.min(1, 1 - this.respawnTimerValue / this.respawnDelayValue));
	}

	spawn(kind: DoomPickupKind): void {
		this.kindValue = kind;
		this.respawnTimerValue = 0;
		this.respawnDelayValue = 0;
	}

	/** Taken (or nothing could come): empty for `delay` seconds. */
	startRespawn(delay: number): void {
		this.kindValue = null;
		this.respawnTimerValue = Math.max(0, delay);
		this.respawnDelayValue = Math.max(0, delay);
	}

	update(dt: number): void {
		if (!Number.isFinite(dt) || dt < 0) {
			return;
		}
		this.respawnTimerValue = Math.max(0, this.respawnTimerValue - dt);
	}

	reset(): void {
		this.kindValue = null;
		this.respawnTimerValue = 0;
		this.respawnDelayValue = 0;
	}
}
