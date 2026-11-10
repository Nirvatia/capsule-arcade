import type { GridService } from '../maze/GridService';
import type { GridPoint } from '../maze/GridModel';
import type { PlayerService } from '../actors/PlayerService';
import type { DoomDirection } from './DoomGraph';
import { adjacentTile, bfsDistanceFrom, doomTileKey } from './DoomGraph';
import { tileDistance } from './DoomAttackCore';
import {
	BROOD_COUNT,
	BROOD_COUNT_LOW_HP,
	BROOD_LOW_HP_THRESHOLD,
	BROOD_MAX_ALIVE,
	CONTACT_DISTANCE,
	minionChaseSpeed
} from './DoomBalance';
import type { DoomMinion, DoomMinionKind } from './DoomMinions';
import { createMinion, minionPosition } from './DoomMinions';
import { aheadTile, nearestCorner, playerTileOf } from './DoomTargeting';

const BROOD_KINDS: readonly DoomMinionKind[] = ['pinky', 'inky', 'clyde'];
const DIRECTIONS: readonly DoomDirection[] = ['UP', 'LEFT', 'DOWN', 'RIGHT'];

/**
 * The boss's brood: small ghosts that hunt the player the arcade way (Pinky ahead, Inky
 * mirrored over the boss, Clyde shy up close) and die after their lifetime or on contact.
 */
export class DoomMinionSwarm {
	private readonly grid: GridService;
	private readonly minions: DoomMinion[] = [];

	constructor(grid: GridService) {
		this.grid = grid;
	}

	get list(): readonly DoomMinion[] {
		return this.minions;
	}

	get count(): number {
		return this.minions.length;
	}

	get hasRoom(): boolean {
		return this.minions.length < BROOD_MAX_ALIVE;
	}

	clear(): void {
		this.minions.length = 0;
	}

	killWhere(shouldKill: (minion: DoomMinion) => boolean): number {
		let killed = 0;
		for (let i = this.minions.length - 1; i >= 0; i -= 1) {
			if (shouldKill(this.minions[i])) {
				this.minions.splice(i, 1);
				killed += 1;
			}
		}
		return killed;
	}

	/** A brood at the boss's tile; more of them when the boss is low on HP. */
	spawn(bossTile: GridPoint, bossHp: number): void {
		const count = bossHp < BROOD_LOW_HP_THRESHOLD ? BROOD_COUNT_LOW_HP : BROOD_COUNT;
		for (let i = 0; i < count; i += 1) {
			if (!this.hasRoom) {
				break;
			}
			this.minions.push(createMinion(BROOD_KINDS[i % BROOD_KINDS.length], bossTile));
		}
	}

	/** Moves the brood; true when one of them touched the player this frame. */
	update(dt: number, player: PlayerService, bossTile: GridPoint, playerBaseSpeed: number): boolean {
		const speed = minionChaseSpeed(playerBaseSpeed);
		let hit = false;
		for (let i = this.minions.length - 1; i >= 0; i -= 1) {
			const minion = this.minions[i];
			minion.lifetime = Math.max(0, minion.lifetime - dt);
			if (minion.lifetime <= 0) {
				this.minions.splice(i, 1);
				continue;
			}
			this.move(minion, dt, speed, player, bossTile);
			if (this.touches(minion, player)) {
				minion.lifetime = 0;
				hit = true;
			}
		}
		return hit;
	}

	private move(
		minion: DoomMinion,
		dt: number,
		speed: number,
		player: PlayerService,
		bossTile: GridPoint
	): void {
		if (minion.target) {
			minion.moveProgress = Math.min(1, minion.moveProgress + dt * speed);
			if (minion.moveProgress >= 1) {
				minion.tile = minion.target;
				minion.target = null;
				minion.moveProgress = 0;
			}
		}
		if (minion.target) {
			return;
		}
		const wanted = this.targetTile(minion.kind, player, bossTile);
		const targetTile = this.grid.isWalkable(wanted.x, wanted.y) ? wanted : playerTileOf(player);
		const distances = bfsDistanceFrom(this.grid, targetTile);
		let bestDir: DoomDirection | null = null;
		let bestDist = Number.POSITIVE_INFINITY;
		let bestPriority = Number.POSITIVE_INFINITY;
		for (let i = 0; i < DIRECTIONS.length; i += 1) {
			const dir = DIRECTIONS[i];
			const next = adjacentTile(minion.tile, dir);
			if (!this.grid.isInside(next.x, next.y) || !this.grid.isWalkable(next.x, next.y)) {
				continue;
			}
			const dist = distances.get(doomTileKey(next)) ?? Number.POSITIVE_INFINITY;
			const priority = minion.facing === dir ? 0 : i;
			if (dist < bestDist || (dist === bestDist && priority < bestPriority)) {
				bestDist = dist;
				bestPriority = priority;
				bestDir = dir;
			}
		}
		if (bestDir) {
			minion.facing = bestDir;
			minion.target = adjacentTile(minion.tile, bestDir);
			minion.moveProgress = 0;
		}
	}

	private targetTile(kind: DoomMinionKind, player: PlayerService, bossTile: GridPoint): GridPoint {
		const playerTile = playerTileOf(player);
		const facing = player.facing;
		if (kind === 'pinky') {
			return aheadTile(playerTile, facing, 4);
		}
		if (kind === 'inky') {
			const pivot = aheadTile(playerTile, facing, 2);
			return { x: pivot.x * 2 - bossTile.x, y: pivot.y * 2 - bossTile.y };
		}
		if (tileDistance(playerTile, bossTile) > 8) {
			return playerTile;
		}
		return nearestCorner(this.grid, bossTile);
	}

	private touches(minion: DoomMinion, player: PlayerService): boolean {
		if (player.isInvulnerable) {
			return false;
		}
		const m = minionPosition(minion);
		const p = player.position;
		const dx = p.x - m.x;
		const dy = p.y - m.y;
		return dx * dx + dy * dy < CONTACT_DISTANCE * CONTACT_DISTANCE;
	}
}
