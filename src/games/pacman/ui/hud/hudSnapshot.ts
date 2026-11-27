import type { Director } from '../../core/Director';
import type { PacmanStateName, PacmanProfile } from '../../core/Events';
import type { LevelLoader } from '../../logic/level/LevelLoader';
import type { FruitKind } from '../../logic/bonuses/fruitCatalog';
import { fruitForLevel } from '../../logic/bonuses/fruitCatalog';
import { BOSS_HP, PHASE_THRESHOLDS, PLAYER_MAX_HP } from '../../logic/doom/DoomBalance';
import { arcadeRound } from '../../config/arcadeConfig';
import type { AbilityKind } from '../../config/abilityConfig';
import { RUN_TUNE } from '../../logic/station/StationRun';
import { escapeGoal } from '../../logic/station/StationEscape';

/** How long a lost heart flashes, s. */
const HURT_FLASH = 0.9;

export type HudWorld = 'spring' | 'summer' | 'autumn' | 'winter' | 'hell' | 'station' | 'secret';

/** A running timer the HUD shows as a draining ring. */
export interface HudTimer<K extends string = 'power' | 'overdrive' | AbilityKind> {
	readonly kind: K;
	readonly remaining: number;
	readonly duration: number;
}

export interface HudBoss {
	readonly name: 'hell';
	readonly phase: number;
	readonly hp: number;
	readonly hpMax: number;
	/** Phase boundaries as fractions of the HP bar. */
	readonly marks: readonly number[];
	readonly playerHp: number;
	readonly playerHpMax: number;
	readonly weapon: 'bfg' | 'barrel' | 'berserk' | '';
	readonly berserk: number;
	/** 0..1 while the BFG charges. */
	readonly charge: number;
	readonly defeated: boolean;
	/** The heart and the exit are on the board. */
	readonly rewardOffered: boolean;
}

/** The station level's own readings (its HUD). */
export interface HudStation {
	readonly hp: number;
	readonly hpMax: number;
	/** 1 just hit, fading to 0 (the lost heart's flash). */
	readonly hurt: number;
	/** The hatch's charge and the infection, 0..1. */
	readonly charge: number;
	readonly infection: number;
	/** The escape is on: the alarm, the lures. */
	readonly escape: boolean;
	/** Where he has to go now: the console once charged, then the hatch (the HUD's goal line). */
	readonly goal: 'console' | 'hatch' | null;
	readonly lures: number;
	readonly luresMax: number;
}

/** Everything the HUD and the screens show, read once per frame. Plain data. */
export interface HudSnapshot {
	readonly state: PacmanStateName;
	/** The state under the pause screen. */
	readonly underPause: PacmanStateName;
	readonly paused: boolean;
	/** Screen fade cover, 0 (clear) to 1 (black). */
	readonly fade: number;
	readonly phase: string;
	/** READY after a death: the screen shows the lives left. */
	readonly afterDeath: boolean;
	readonly remaining: number;
	readonly duration: number;
	readonly profile: PacmanProfile;
	readonly world: HudWorld;
	/** The level number; on the secret level the arcade round. */
	readonly level: number;
	readonly score: number;
	readonly highScore: number;
	/** Lives; on the secret level the arcade's tries. */
	readonly lives: number;
	/** 0..1 of the dots eaten (weather at 0.5, night at 0.75). */
	readonly dots: number;
	/** The ability running now (its dial drains); null when none runs. */
	readonly timer: HudTimer<AbilityKind> | null;
	/** The energizer's power (Ms. Pac-Man: her overdrive), on its own badge; null when off. */
	readonly power: HudTimer<'power' | 'overdrive'> | null;
	/** The ability in the hero's slot, waiting for the F key; null when the slot is empty. */
	readonly ability: AbilityKind | null;
	/** The fruits of the last levels up to this one, oldest first (arcade style). */
	readonly fruits: readonly FruitKind[];
	readonly boss: HudBoss | null;
	readonly station: HudStation | null;
}

const FRUIT_ROW = 7;

/** The snapshot of the running game. */
export function buildHudSnapshot(
	director: Director,
	level: LevelLoader,
	highScore: number
): HudSnapshot {
	const flow = director.flow;
	const combat = level.combat;
	const season = level.season;
	const world: HudWorld = level.secretMode
		? 'secret'
		: level.hellMode
			? 'hell'
			: level.stationMode
				? 'station'
				: ((season?.name ?? 'spring') as HudWorld);
	// the ability and the power run side by side: each has its own dial
	let timer: HudTimer<AbilityKind> | null = null;
	let power: HudTimer<'power' | 'overdrive'> | null = null;
	const abilities = level.abilities;
	const hypnosis = level.hypnosis;
	if (abilities && abilities.phase === 'active') {
		timer = {
			kind: abilities.kind,
			remaining: abilities.timer,
			duration: Math.max(abilities.timer, abilities.duration)
		};
	}
	if (hypnosis?.overdriveActive) {
		power = { kind: 'overdrive', remaining: hypnosis.overdriveTimer, duration: 5 };
	} else if (combat?.isPowerActive) {
		power = { kind: 'power', remaining: combat.powerTimer, duration: combat.powerDuration };
	}
	const doom = level.doom;
	const bossService = level.doomBoss;
	const boss: HudBoss | null =
		doom && bossService
			? {
					name: 'hell',
					phase: bossService.phase,
					hp: bossService.hp,
					hpMax: BOSS_HP,
					marks: PHASE_THRESHOLDS.map((t) => t / BOSS_HP),
					playerHp: doom.playerHp,
					playerHpMax: PLAYER_MAX_HP,
					weapon: (doom.armed as HudBoss['weapon']) || '',
					berserk: doom.berserkTimer,
					charge: doom.bfgCharging ? doom.bfgChargeProgress : 0,
					defeated: bossService.defeated,
					rewardOffered: Boolean(level.bossReward?.offered)
				}
			: null;
	const run = level.stationRun;
	const station: HudStation | null = run
		? {
				hp: Math.max(0, run.hp),
				hpMax: RUN_TUNE.hp,
				hurt: run.hurt >= 0 && run.hurt < HURT_FLASH ? 1 - run.hurt / HURT_FLASH : 0,
				charge: run.escape.charge,
				infection: run.infection,
				escape: run.escape.state === 'running',
				goal: escapeGoal(run.escape.state),
				lures: run.lures,
				luresMax: RUN_TUNE.lures
			}
		: null;
	const secret = level.secretMode;
	const fruits: FruitKind[] = [];
	if (secret) {
		for (let r = 1; r <= level.arcadeRound; r++) {
			fruits.push(arcadeRound(r).fruit);
		}
	} else {
		const n = Math.max(1, level.level);
		for (let i = Math.max(1, n - FRUIT_ROW + 1); i <= n; i++) {
			fruits.push(fruitForLevel(i, level.profile));
		}
	}
	const score = level.score;
	return {
		state: flow.state,
		underPause: flow.state,
		paused: flow.paused,
		fade: flow.fade,
		phase: flow.phase,
		afterDeath: director.readyAfterDeath,
		remaining: flow.remaining,
		duration: flow.duration,
		profile: level.profile,
		world,
		level: secret ? level.arcadeRound : level.level,
		score,
		highScore: Math.max(highScore, score),
		lives: (secret ? combat?.tries : combat?.lives) ?? 0,
		dots: level.progress?.collectionRatio ?? 0,
		timer,
		power,
		ability:
			abilities && abilities.phase === 'carried' && !secret && !level.hellMode
				? abilities.kind
				: null,
		fruits,
		boss,
		station
	};
}
