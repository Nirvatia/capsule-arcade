import type { GridService } from '../maze/GridService';
import type { PlayerService } from '../actors/PlayerService';
import { DoomWeaponModel } from './DoomWeaponModel';
import type { DoomSlotItem } from './DoomWeaponModel';
import { PLASMA_RATE, PLASMA_SPEED, SNARE_HOLD, SNARE_LIFETIME } from './DoomBalance';

const BFG_BALL_SPEED = 14;
const BFG_SHOT_LIFETIME = 2.0;
const BFG_TRACER_VISIBLE = 0.25;
const BOLT_LIFETIME = 2.0;

/** A projectile along a corridor: the BFG's orb or a plasma bolt (tile units). */
export interface DoomBfgShot {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
}

/** The snare on its tile: open while `snapped` is -1, then the seconds since it shut. */
export interface DoomSnare {
	readonly x: number;
	readonly y: number;
	timer: number;
	snapped: number;
}

/** Something the renderer should show an effect for (tile-center coordinates). */
export interface DoomFxEvent {
	readonly kind:
		| 'bfg-fire'
		| 'bfg-impact'
		| 'snare-place'
		| 'snare-snap'
		| 'snare-fizzle'
		| 'split-burst'
		| 'bite'
		| 'pickup'
		| 'boss-hit'
		| 'player-hit';
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

/** The hell's weapons in the world: the BFG's orbs and tracers, the plasma's bolts, the snare. */
export class DoomWeaponService {
	private readonly model: DoomWeaponModel;
	private readonly grid: GridService;
	private readonly bfgShots: DoomBfgShot[] = [];
	private readonly plasmaBolts: DoomBfgShot[] = [];
	private readonly tracers: DoomBfgTracer[] = [];
	private readonly fxQueue: DoomFxEvent[] = [];
	private snareValue: DoomSnare | null = null;
	private plasmaClock = 0;

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

	get berserkTimer(): number {
		return this.model.berserkTimer;
	}

	get plasmaLeft(): number {
		return this.model.plasmaLeft;
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
		return this.plasmaBolts;
	}

	get snare(): Readonly<DoomSnare> | null {
		return this.snareValue;
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

	endBerserk(): void {
		this.model.endBerserk();
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

	/** Sets the snare on the hero's tile (one at a time). */
	placeSnare(player: PlayerService): boolean {
		if (this.snareValue || !this.model.consumeSnare()) {
			return false;
		}
		const tile = player.tile;
		this.snareValue = { x: tile.x, y: tile.y, timer: SNARE_LIFETIME, snapped: -1 };
		this.pushFx({ kind: 'snare-place', x: tile.x + 0.5, y: tile.y + 0.5 });
		return true;
	}

	/** The snare shuts on the boss: it holds for `SNARE_HOLD`, then it is gone. */
	snapSnare(): void {
		const snare = this.snareValue;
		if (!snare || snare.snapped >= 0) {
			return;
		}
		snare.snapped = 0;
		this.pushFx({ kind: 'snare-snap', x: snare.x + 0.5, y: snare.y + 0.5 });
	}

	fireBfg(player: PlayerService): void {
		this.launch(player, this.bfgShots, BFG_BALL_SPEED, BFG_SHOT_LIFETIME, true);
	}

	/** The plasma, held down: burns its ammo and lets a bolt go every `PLASMA_RATE`. */
	firePlasma(player: PlayerService, dt: number): void {
		if (this.model.slot !== 'plasma') {
			return;
		}
		this.model.spendPlasma(dt);
		this.plasmaClock -= dt;
		if (this.plasmaClock <= 0) {
			this.plasmaClock += PLASMA_RATE;
			this.launch(player, this.plasmaBolts, PLASMA_SPEED, BOLT_LIFETIME, false);
		}
	}

	/** The plasma's trigger is let go: the next press fires at once. */
	releasePlasma(): void {
		this.plasmaClock = 0;
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
		if (index >= 0 && index < this.plasmaBolts.length) {
			this.plasmaBolts.splice(index, 1);
		}
	}

	update(dt: number, rushing = false): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('DoomWeaponService.update', 'invalid delta time', dt);
			return;
		}
		this.model.update(dt, rushing);
		for (let i = this.bfgShots.length - 1; i >= 0; i -= 1) {
			if (!this.advance(this.bfgShots[i], dt)) {
				this.detonateShot(i);
			}
		}
		for (let i = this.plasmaBolts.length - 1; i >= 0; i -= 1) {
			if (!this.advance(this.plasmaBolts[i], dt)) {
				this.plasmaBolts.splice(i, 1);
			}
		}
		const snare = this.snareValue;
		if (snare) {
			if (snare.snapped >= 0) {
				snare.snapped += dt;
				if (snare.snapped >= SNARE_HOLD) {
					this.snareValue = null;
				}
			} else {
				snare.timer -= dt;
				if (snare.timer <= 0) {
					this.pushFx({ kind: 'snare-fizzle', x: snare.x + 0.5, y: snare.y + 0.5 });
					this.snareValue = null;
				}
			}
		}
		for (let i = this.tracers.length - 1; i >= 0; i -= 1) {
			this.tracers[i].timer -= dt;
			if (this.tracers[i].timer <= 0) {
				this.tracers.splice(i, 1);
			}
		}
	}

	/** The split: what flies is gone, the charge and the hand are kept. */
	clearShots(): void {
		this.model.cancelBfgCharge();
		this.bfgShots.length = 0;
		this.plasmaBolts.length = 0;
		this.tracers.length = 0;
	}

	reset(): void {
		this.model.reset();
		this.bfgShots.length = 0;
		this.plasmaBolts.length = 0;
		this.tracers.length = 0;
		this.fxQueue.length = 0;
		this.snareValue = null;
		this.plasmaClock = 0;
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
