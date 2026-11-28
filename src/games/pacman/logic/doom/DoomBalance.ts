export interface DoomPhaseTuning {
	readonly speedRatio: number;
	readonly baseChaos: number;
	readonly attackCooldown: number;
}

const PHASE_TUNING: readonly DoomPhaseTuning[] = [
	{ speedRatio: 0.8, baseChaos: 0.25, attackCooldown: 4.0 },
	{ speedRatio: 6 / 7, baseChaos: 0.45, attackCooldown: 3.0 },
	{ speedRatio: 32 / 35, baseChaos: 0.7, attackCooldown: 2.2 }
];

export const DASH_SPEED_MUL = 2;
export const DASH_MAX_TILES = 14;
export const DASH_MIN_DISTANCE = 3;
export const DASH_MAX_DISTANCE = 12;
export const DASH_TELEGRAPH = [0.7, 0.6, 0.5] as const;
export const DASH_RECOVER = [0.8, 0.7, 0.6] as const;
export const DASH_WEIGHTS = [55, 25, 12] as const;
export const CROSS_TELEGRAPH = [0, 1.0, 0.8] as const;
export const CROSS_ACTIVE = 0.35;
export const CROSS_RECOVER = 0.8;
export const CROSS_MAX_PATH_DIST = 10;
export const CROSS_COOLDOWN = 6;
export const CROSS_WEIGHTS = [0, 20, 10] as const;
export const VOID_TELEGRAPH = 0.6;
export const VOID_DURATION = [0, 6.0, 7.0] as const;
export const VOID_CELL_LIFETIME = [0, 7.0, 8.0] as const;
export const VOID_FLICKER = 1.5;
export const VOID_MAX_CELLS = [0, 10, 14] as const;
export const VOID_NO_SPAWN_NEAR_PLAYER = 2;
export const VOID_COOLDOWN = 10;
export const VOID_WEIGHTS = [0, 6, 4] as const;
export const BLINK_TELEGRAPH = 0.5;
export const BLINK_VANISH = 0.3;
export const BLINK_RECOVER = 0.4;
export const BLINK_DEST_MIN_DIST = 5;
export const BLINK_DEST_MAX_DIST = 9;
export const BLINK_COOLDOWN = 8;
export const BLINK_WEIGHTS = [0, 0, 12] as const;
export const BROOD_TELEGRAPH = 0.8;
export const BROOD_RECOVER = 0.5;
export const BROOD_COUNT = 2;
export const BROOD_COUNT_LOW_HP = 3;
export const BROOD_LOW_HP_THRESHOLD = 250;
export const BROOD_MAX_ALIVE = 3;
export const BROOD_MINION_LIFETIME = 14;
export const BROOD_COOLDOWN = 14;
export const BROOD_WEIGHTS = [0, 0, 10] as const;
// Rift: the corridor the player runs in is marked and then burned end to end.
export const RIFT_TELEGRAPH = [0.9, 0.8, 0.7] as const;
export const RIFT_ACTIVE = 0.35;
export const RIFT_RECOVER = 0.4;
export const RIFT_MIN_LENGTH = 4;
export const RIFT_MAX_RANGE = 14;
export const RIFT_COOLDOWN = 5;
export const RIFT_WEIGHTS = [45, 15, 10] as const;
// Seals: the junctions ahead of the player burn (a hit if standing on one), then stay locked.
export const SEAL_TELEGRAPH = 0.8;
export const SEAL_DURATION = [0, 5, 6] as const;
export const SEAL_COUNT = [0, 3, 3] as const;
export const SEAL_MIN_DIST = 2;
export const SEAL_MAX_DIST = 7;
export const SEAL_COOLDOWN = 9;
export const SEAL_WEIGHTS = [0, 15, 10] as const;
// Pull: running away from the boss is slowed.
export const PULL_TELEGRAPH = 0.6;
export const PULL_DURATION = [0, 4, 4.5] as const;
export const PULL_SLOW = 0.6;
export const PULL_COOLDOWN = 10;
export const PULL_WEIGHTS = [0, 15, 6] as const;
// Split: boss and its echo close in from both ends of the player's corridor.
export const SPLIT_TELEGRAPH = 1.0;
export const SPLIT_RECOVER = 0.7;
export const SPLIT_MIN_LENGTH = 7;
export const SPLIT_MIN_END_DIST = 3;
export const SPLIT_COOLDOWN = 10;
export const SPLIT_WEIGHTS = [0, 0, 15] as const;
// Eruption: the disc around the player bursts, then the ring around the disc.
export const ERUPTION_TELEGRAPH = 1.2;
export const ERUPTION_WAVE_GAP = 0.65;
export const ERUPTION_ACTIVE = 0.3;
export const ERUPTION_INNER = 3;
export const ERUPTION_RADIUS = 6;
export const ERUPTION_COOLDOWN = 9;
export const ERUPTION_WEIGHTS = [0, 0, 15] as const;
// Corruption (phase 3, passive): the outer corridors decay and slow the player.
export const CORRUPTION_RATE = 1 / 40;
export const CORRUPTION_MAX = 0.75;
export const CORRUPTION_SLOW = 0.65;
export const CORRUPTION_BAND = 3;
// Camera shake impulses.
export const SHAKE_HAZARD = 0.35;
export const SHAKE_TRANSITION = 0.8;
export const SHAKE_SPLIT = 0.45;
export const MINION_SPEED_RATIO = 5.2 / 7;
export const CONTACT_DISTANCE = 0.75;
export const RECOVER_DAMAGE_MUL = 1.25;
export const PLAYER_IFRAMES = 1.5;
export const PLAYER_MAX_HP = 3;
export const STUN_IMMUNITY = 0.5;
export const INTRO_DURATION = 3.0;
export const TRANSITION_DURATION = 2.5;
export const ATTACK_RETRY_INTERVAL = 0.25;
export const BOSS_HP = 1500;
export const PHASE_THRESHOLDS = [1000, 500] as const;
/** The Maw's orb on a stunned boss (the split's window, a rush's or an orb's stun): the real hit. */
export const BFG_ORB_DAMAGE = 400;
/** The Maw's orb on a boss who is not stunned: a glance. */
export const BFG_ORB_GLANCE_DAMAGE = 150;
export const BFG_ORB_STUN = 1.0;
export const BFG_TRACER_DAMAGE = 100;
/**
 * The weapons' one resource, the food (DESIGN §7 "The fight, redesigned"): a meter of
 * `FOOD_SEGMENTS` segments of `FOOD_PER_SEGMENT` pieces each.
 */
export const FOOD_PER_SEGMENT = 20;
export const FOOD_SEGMENTS = 3;
/** The Maw (Жерло, the heavy gun): the whole meter for one charged shot, fired standing still. */
export const MAW_COST = FOOD_SEGMENTS * FOOD_PER_SEGMENT;
/** The Sting (Жало, the middle gun): fires while held, burns a segment a second. */
export const STING_FOOD_PER_SECOND = FOOD_PER_SEGMENT;
export const STING_RATE = 0.1;
export const STING_SPEED = 16;
export const STING_DAMAGE = 5;
/** Seconds of fire one Sting carries (a whole meter's worth), then it is spent. */
export const STING_LOAD = 3;
/** The berserk (the light one, no food): faster for a while after it is taken, the button a rush. */
export const BERSERK_SPEED_MUL = 1.15;
/** Seconds of `BERSERK_SPEED_MUL` after the berserk is taken. */
export const BERSERK_HASTE = 5;
export const RUSH_TILES = 5;
/** Rushes one berserk carries, then it is spent. */
export const RUSH_LOAD = 3;
export const RUSH_COOLDOWN = 2.5;
export const RUSH_DAMAGE = 50;
export const RUSH_STUN = 0.5;
/** A rush made while the boss's attack is live: this many times the damage, and unhurt. */
export const RUSH_COUNTER_MUL = 3;
/** The split's window (the boss formed stunned, all four eaten): the rush and the Sting hit this many times harder. */
export const SPLIT_WINDOW_MUL = 3;
/**
 * The weapons come one at a time: only while the hand is empty and none lies on the map, after
 * `WEAPON_WAIT_MIN..MAX` s. Its kind is drawn by the phase's weights (berserk, Sting, Maw): the
 * heavy gun is rare at first and common at the end.
 */
export const WEAPON_WAIT_MIN = 4;
export const WEAPON_WAIT_MAX = 6;
export const WEAPON_WEIGHTS: ReadonlyArray<readonly [berserk: number, sting: number, maw: number]> =
	[
		[60, 30, 10],
		[40, 35, 25],
		[25, 30, 45]
	];
/**
 * The food grows back (the fight never runs dry): every `FOOD_REGROW_EVERY` s one eaten tile at least
 * `FOOD_REGROW_MIN_DIST` tiles from the hero fills again; in an empty maze about a meter in 1.5 min.
 */
export const FOOD_REGROW_EVERY = 1.5;
export const FOOD_REGROW_MIN_DIST = 6;
/** The medkit comes to a hurt hero after this wait (none lies yet). */
export const MEDKIT_WAIT_MIN = 15;
export const MEDKIT_WAIT_MAX = 20;
/** The split (at each phase threshold): the burst, the Pac-Man part, the return to the core. */
export const SPLIT_BURST = 0.6;
export const SPLIT_PACMAN = 18;
export const SPLIT_MERGE = 1.6;
export const SPLIT_FEAR = 7;
/** All four ghosts eaten: the boss forms stunned this long and loses nothing more. */
export const SPLIT_FORM_STUN = 5;
/** Fewer eaten: no stun, this much HP per eaten ghost. */
export const SPLIT_GHOST_DAMAGE = 75;
export const SPLIT_GHOST_SCORE = 200;

export function tuningForPhase(phase: number): DoomPhaseTuning {
	const index = Math.min(2, Math.max(0, Math.floor(phase) - 1));
	return PHASE_TUNING[index];
}

export function bossChaseSpeed(playerBaseSpeed: number, phase: number): number {
	if (!Number.isFinite(playerBaseSpeed) || playerBaseSpeed <= 0) {
		console.error('DoomBalance.bossChaseSpeed', 'invalid player base speed', playerBaseSpeed);
		return 0;
	}
	return playerBaseSpeed * tuningForPhase(phase).speedRatio;
}

export function bossDashSpeed(playerBaseSpeed: number, phase: number): number {
	return bossChaseSpeed(playerBaseSpeed, phase) * DASH_SPEED_MUL;
}

export function minionChaseSpeed(playerBaseSpeed: number): number {
	if (!Number.isFinite(playerBaseSpeed) || playerBaseSpeed <= 0) {
		console.error('DoomBalance.minionChaseSpeed', 'invalid player base speed', playerBaseSpeed);
		return 0;
	}
	return playerBaseSpeed * MINION_SPEED_RATIO;
}

export function baseChaosForPhase(phase: number): number {
	return tuningForPhase(phase).baseChaos;
}

export function attackCooldownForPhase(phase: number): number {
	return tuningForPhase(phase).attackCooldown;
}

export function phaseIndex(phase: number): number {
	return Math.min(2, Math.max(0, Math.floor(phase) - 1));
}
