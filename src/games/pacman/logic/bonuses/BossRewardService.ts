import type { PlayerService } from '../actors/PlayerService';
import type { GridService } from '../maze/GridService';
import type { GridPoint } from '../maze/GridModel';
import type { EventBus } from '../../engine/EventBus';
import type { PacmanEventMap } from '../../core/Events';
import { bfsDistanceFrom, doomTileKey } from '../doom/DoomGraph';
import { ACTOR_CONTACT_DISTANCE_SQ } from '../../config/actorConfig';
import { debugLog } from '../debug/debugLog';

/** How the player left a boss level: with the bonus life, or through the exit without it. */
export type BossRewardChoice = 'life' | 'exit';

/**
 * The end of a boss level. When the boss dies a bonus life appears at the far end of the
 * maze from the player (it has to be run for) and an exit opens far from both. Taking either
 * one ends the level; only the heart gives a life. Nothing ends the level before the player
 * picks.
 */
export class BossRewardService {
	private readonly grid: GridService;
	private readonly events: EventBus<PacmanEventMap>;
	private heartTile: GridPoint | null = null;
	private exitTile: GridPoint | null = null;
	private choiceValue: BossRewardChoice | null = null;
	private pendingChoice: BossRewardChoice | null = null;

	constructor(grid: GridService, events: EventBus<PacmanEventMap>) {
		this.grid = grid;
		this.events = events;
	}

	/** Both are on the board, waiting for the player. */
	get offered(): boolean {
		return this.heartTile !== null && this.choiceValue === null;
	}

	get choice(): BossRewardChoice | null {
		return this.choiceValue;
	}

	/** Tile-centre positions, as `PlayerService.position`. */
	get heart(): { x: number; y: number } | null {
		return this.heartTile ? centre(this.heartTile) : null;
	}

	get exit(): { x: number; y: number } | null {
		return this.exitTile ? centre(this.exitTile) : null;
	}

	reset(): void {
		this.heartTile = null;
		this.exitTile = null;
		this.choiceValue = null;
		this.pendingChoice = null;
	}

	/**
	 * Places the heart as far from the player as the maze allows and the exit far from both
	 * (where the boss fell no longer matters). Once.
	 */
	offer(playerTile: GridPoint): void {
		if (this.heartTile || this.choiceValue) {
			return;
		}
		const fromPlayer = this.freeDistances(playerTile);
		const heart = this.best(fromPlayer, (d) => d);
		if (!heart) {
			console.error('BossRewardService.offer', 'no free tile to place the heart', playerTile);
			return;
		}
		this.heartTile = heart;
		const fromHeart = this.freeDistances(heart);
		const exit = this.best(fromPlayer, (d, key) =>
			key === doomTileKey(heart) ? -1 : Math.min(d, fromHeart.get(key) ?? 0)
		);
		this.exitTile = exit ?? heart;
		this.events.emit('audio:cue', { cue: 'exit-open' });
		debugLog(this.events, 'spawn', 'boss reward: heart + exit');
	}

	update(player: PlayerService): void {
		if (!this.offered) {
			return;
		}
		const p = player.position;
		const touches = (t: { x: number; y: number } | null) =>
			t !== null && (p.x - t.x) ** 2 + (p.y - t.y) ** 2 <= ACTOR_CONTACT_DISTANCE_SQ;
		if (touches(this.heart)) {
			this.choose('life');
		} else if (touches(this.exit)) {
			this.choose('exit');
		}
	}

	/** The player's pick, handed out once to end the level. */
	consumeChoice(): BossRewardChoice | null {
		const choice = this.pendingChoice;
		this.pendingChoice = null;
		return choice;
	}

	private choose(choice: BossRewardChoice): void {
		this.choiceValue = choice;
		this.pendingChoice = choice;
		this.events.emit('audio:cue', { cue: choice === 'life' ? 'bonus-life' : 'exit-enter' });
		debugLog(
			this.events,
			'spawn',
			choice === 'life' ? 'boss reward: heart taken' : 'boss reward: exit'
		);
	}

	/** A tile the player can stand on: walkable, not a teleport. */
	private isFree(x: number, y: number): boolean {
		return this.grid.isPlayerWalkable(x, y) && !this.grid.isTeleport(x, y);
	}

	/** Steps from `from` to every free tile it reaches, by tile key. */
	private freeDistances(from: GridPoint): Map<string, number> {
		const out = new Map<string, number>();
		for (const [key, distance] of bfsDistanceFrom(this.grid, from)) {
			const tile = parseKey(key);
			if (this.isFree(tile.x, tile.y)) {
				out.set(key, distance);
			}
		}
		return out;
	}

	/** The tile of `tiles` with the highest score (ties: the first found). */
	private best(
		tiles: ReadonlyMap<string, number>,
		score: (distance: number, key: string) => number
	): GridPoint | null {
		let best: string | null = null;
		let bestScore = -Infinity;
		for (const [key, distance] of tiles) {
			const value = score(distance, key);
			if (value > bestScore) {
				best = key;
				bestScore = value;
			}
		}
		return best ? parseKey(best) : null;
	}
}

function centre(tile: GridPoint): { x: number; y: number } {
	return { x: tile.x + 0.5, y: tile.y + 0.5 };
}

function parseKey(key: string): GridPoint {
	const [x, y] = key.split(',').map(Number);
	return { x, y };
}
