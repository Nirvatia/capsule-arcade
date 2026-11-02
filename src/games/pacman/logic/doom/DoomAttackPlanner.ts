import type { GridService } from '../maze/GridService';
import type { GridPoint } from '../maze/GridModel';
import type { PlayerService } from '../actors/PlayerService';
import type { DoomDirection } from './DoomGraph';
import { doomTileKey } from './DoomGraph';
import type { DoomAttackKind } from './DoomAttackCore';
import { attackWeightsForPhase, chooseWeightedAttack, tileDistance } from './DoomAttackCore';
import type { DoomSegment } from './DoomHazards';
import { canEscape, canOutlast, eruptionWaves } from './DoomHazards';
import {
	CROSS_MAX_PATH_DIST,
	CROSS_TELEGRAPH,
	DASH_MAX_TILES,
	DASH_TELEGRAPH,
	ERUPTION_ACTIVE,
	ERUPTION_INNER,
	ERUPTION_RADIUS,
	ERUPTION_TELEGRAPH,
	ERUPTION_WAVE_GAP,
	RIFT_MAX_RANGE,
	RIFT_TELEGRAPH,
	SEAL_COUNT,
	SEAL_TELEGRAPH,
	SPLIT_TELEGRAPH,
	phaseIndex
} from './DoomBalance';
import { isCrossFair, isDashFair } from './DoomFairness';
import { canStartDash } from './DoomDash';
import {
	findBlinkTarget,
	pickSeals,
	riftSegment,
	segmentKeys,
	splitSegmentFor
} from './DoomTargeting';

export interface AttackPlanInput {
	readonly grid: GridService;
	readonly bossTile: GridPoint;
	readonly phase: number;
	readonly player: PlayerService;
	readonly playerTile: GridPoint;
	readonly playerSpeed: number;
	readonly cooldowns: Readonly<Record<DoomAttackKind, number>>;
	readonly broodHasRoom: boolean;
	readonly protectedTileKeys: ReadonlySet<string>;
	readonly barrel: () => GridPoint | null;
	/** Dev: only this attack may be chosen. */
	readonly forced: DoomAttackKind | null;
	readonly lastAttack: DoomAttackKind | null;
}

export interface AttackPlan {
	/** Where a dash would go (the boss aims there even when it picks another attack). */
	readonly dashAim: DoomDirection | null;
	/** Where a blink would land (kept on the boss even when it picks another attack). */
	readonly blinkTarget: GridPoint | null;
	/** Null: nothing fair is ready (or the forced attack is not possible yet). */
	readonly chosen: DoomAttackKind | null;
	/** The forced attack was possible and is used up (even if no attack came of it). */
	readonly forcedTaken: boolean;
	readonly rift: DoomSegment | null;
	readonly seals: GridPoint[];
	readonly split: DoomSegment | null;
	readonly eruption: { disc: GridPoint[]; ring: GridPoint[] } | null;
}

/**
 * Picks the boss's next attack: every attack that is off cooldown, allowed in this phase,
 * in range and fair (the player can get out of its way in time) goes into the pool; the
 * last attack is left out when there is a choice; one is drawn by the phase's weights.
 */
export function planAttack(input: AttackPlanInput): AttackPlan {
	const { grid, bossTile, phase, player, playerTile, playerSpeed: speed, cooldowns } = input;
	const pi = phaseIndex(phase);
	const available = new Set<DoomAttackKind>();
	let dashAim: DoomDirection | null = null;
	let blinkTarget: GridPoint | null = null;

	const dashCheck = canStartDash(grid, bossTile, playerTile);
	if (
		dashCheck.canStart &&
		dashCheck.direction &&
		cooldowns.dash <= 0 &&
		isDashFair(
			grid,
			bossTile,
			playerTile,
			dashCheck.direction,
			DASH_TELEGRAPH[pi],
			speed,
			DASH_MAX_TILES
		)
	) {
		available.add('dash');
		dashAim = dashCheck.direction;
	}
	if (phase >= 2 && cooldowns.cross <= 0) {
		const exits = grid.exitsCount(bossTile.x, bossTile.y);
		const dist = tileDistance(bossTile, playerTile);
		if (
			exits >= 3 &&
			dist <= CROSS_MAX_PATH_DIST &&
			isCrossFair(grid, bossTile, playerTile, CROSS_TELEGRAPH[pi], speed)
		) {
			available.add('cross');
		}
	}
	if (phase >= 2 && cooldowns.voidTrail <= 0) {
		available.add('voidTrail');
	}
	if (phase >= 3 && cooldowns.blink <= 0) {
		blinkTarget = findBlinkTarget(grid, bossTile, playerTile, input.barrel());
		if (blinkTarget) {
			available.add('blink');
		}
	}
	if (phase >= 3 && cooldowns.brood <= 0 && input.broodHasRoom) {
		available.add('brood');
	}

	const weights = attackWeightsForPhase(phase);
	const ready = (kind: DoomAttackKind): boolean => weights[kind] > 0 && cooldowns[kind] <= 0;
	let rift: DoomSegment | null = null;
	if (ready('rift') && tileDistance(bossTile, playerTile) <= RIFT_MAX_RANGE) {
		rift = riftSegment(grid, player.facing, playerTile);
		if (rift && canEscape(grid, playerTile, segmentKeys(rift), RIFT_TELEGRAPH[pi], speed)) {
			available.add('rift');
		}
	}
	let seals: GridPoint[] = [];
	if (ready('seal')) {
		seals = pickSeals(
			{
				grid,
				player,
				playerTile,
				bossTile,
				playerSpeed: speed,
				protectedTileKeys: input.protectedTileKeys
			},
			SEAL_COUNT[pi]
		);
		const sealKeys = new Set(seals.map(doomTileKey));
		if (seals.length >= 2 && canEscape(grid, playerTile, sealKeys, SEAL_TELEGRAPH, speed)) {
			available.add('seal');
		}
	}
	if (ready('pull') && tileDistance(bossTile, playerTile) >= 4) {
		available.add('pull');
	}
	let split: DoomSegment | null = null;
	if (ready('split')) {
		split = splitSegmentFor(grid, player.facing, playerTile);
		if (split && canEscape(grid, playerTile, segmentKeys(split), SPLIT_TELEGRAPH, speed)) {
			available.add('split');
		}
	}
	let eruption: { disc: GridPoint[]; ring: GridPoint[] } | null = null;
	if (ready('eruption')) {
		eruption = eruptionWaves(grid, playerTile, ERUPTION_INNER, ERUPTION_RADIUS);
		const ringStart = ERUPTION_TELEGRAPH + ERUPTION_WAVE_GAP;
		const fair = canOutlast(
			grid,
			playerTile,
			[
				{
					keys: new Set(eruption.disc.map(doomTileKey)),
					start: ERUPTION_TELEGRAPH,
					end: ERUPTION_TELEGRAPH + ERUPTION_ACTIVE
				},
				{
					keys: new Set(eruption.ring.map(doomTileKey)),
					start: ringStart,
					end: ringStart + ERUPTION_ACTIVE
				}
			],
			speed
		);
		if (fair) {
			available.add('eruption');
		}
	}

	const plan = { dashAim, blinkTarget, rift, seals, split, eruption, forcedTaken: false };
	if (input.forced) {
		if (!available.has(input.forced)) {
			return { ...plan, chosen: null };
		}
		plan.forcedTaken = true;
		available.clear();
		available.add(input.forced);
	}
	// never the same attack twice in a row, unless it is the only option
	if (available.size > 1 && input.lastAttack) {
		available.delete(input.lastAttack);
	}
	if (available.size === 0) {
		return { ...plan, chosen: null };
	}
	return { ...plan, chosen: chooseWeightedAttack(weights, available, Math.random()) };
}
