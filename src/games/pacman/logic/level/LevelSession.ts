import { GridModel } from '../maze/GridModel';
import { GridService } from '../maze/GridService';
import { PlayerService } from '../actors/PlayerService';
import { GhostService } from '../actors/GhostService';
import { ScoreModel } from './ScoreModel';
import { LevelProgress } from './LevelProgress';
import { CombatService } from '../rules/CombatService';
import { FruitService } from '../bonuses/FruitService';
import { EasterEggService } from '../bonuses/EasterEggService';
import { HypnosisService } from '../rules/HypnosisService';
import { SpawnLocator } from '../maze/SpawnLocator';
import { LairCodeService } from '../rules/LairCodeService';
import { AbilityService } from '../bonuses/AbilityService';
import { DoomBossService } from '../doom/DoomBossService';
import { DoomAbilityService } from '../doom/DoomAbilityService';
import { BossRewardService } from '../bonuses/BossRewardService';
import { RUN_TUNE, StationGrid, StationRun } from '../station/StationRun';
import { NightwoodRun } from '../nightwood/NightwoodRun';
import type { NightSound } from '../nightwood/NightwoodRun';
import type { GameProfile } from '../rules/HypnosisService';
import type { EventBus } from '../../engine/EventBus';
import type { PacmanEventMap } from '../../core/Events';
import { seasonLevelOf, seasonModifiers } from './SeasonCatalog';
import type { SeasonData } from './SeasonCatalog';
import { busSink } from '../debug/debugLog';
import { ARCADE, arcadeRound } from '../../config/arcadeConfig';
import { levelTuning, powerSeconds } from '../../config/difficultyConfig';

/** The cues the forest's sounds borrow (null: the classic rules already play one). */
const NIGHT_CUES: Record<NightSound, 'fruit-expire' | 'fruit-collect' | 'ability-use' | null> = {
	'lamp-out': 'fruit-expire',
	'lamp-lit': 'fruit-collect',
	flash: 'ability-use',
	banish: null,
	dawn: null,
	flare: null
};

/** Boss and weapons of the hell level. */
export interface DoomSession {
	readonly boss: DoomBossService;
	readonly abilities: DoomAbilityService;
}

/**
 * Everything one level runs on, built together and never partially: the maze, the actors
 * and every rule service. A new session is built for every level; nothing in it survives
 * to the next one except what `LevelLoader` carries over explicitly (score, lives).
 */
export interface LevelSession {
	readonly season: SeasonData;
	readonly hell: boolean;
	/** The station boss level: until its own rules land, the season rules with unkillable ghosts. */
	readonly station: boolean;
	readonly secret: boolean;
	readonly grid: GridService;
	readonly score: ScoreModel;
	readonly progress: LevelProgress;
	readonly player: PlayerService;
	readonly ghosts: GhostService;
	readonly combat: CombatService;
	readonly fruit: FruitService;
	readonly egg: EasterEggService;
	readonly hypnosis: HypnosisService;
	/** The season levels' abilities: the token, the slot, echo, mask and shock. */
	readonly abilities: AbilityService;
	readonly lairCode: LairCodeService;
	/** Present on the hell level only. */
	readonly doom: DoomSession | null;
	/** The station's rules (the squad, the escape), on the station level only. */
	readonly stationRun: StationRun | null;
	/** The night forest boss level (DESIGN.md §7b). */
	readonly nightwood: boolean;
	/** The night forest's rules (the shrouds, the light, the Presence), on that level only. */
	readonly nightwoodRun: NightwoodRun | null;
	/** Boss levels only: the bonus life and the exit offered when the boss dies. */
	readonly bossReward: BossRewardService | null;
}

export interface LevelSessionRequest {
	readonly events: EventBus<PacmanEventMap>;
	readonly level: number;
	readonly profile: GameProfile;
	readonly season: SeasonData;
	readonly hell: boolean;
	readonly station?: boolean;
	readonly nightwood?: boolean;
	readonly secret: boolean;
	readonly godMode: boolean;
	/** Secret level only: the arcade round (1..3) and the tries left. */
	readonly arcadeRound?: number;
	readonly arcadeTries?: number;
}

export function buildLevelSession(request: LevelSessionRequest): LevelSession {
	const { events, level, profile, season, hell, secret } = request;
	const station = Boolean(request.station);
	const nightwood = Boolean(request.nightwood);
	const grid = station
		? new StationGrid(new GridModel(season.grid))
		: new GridService(new GridModel(season.grid));
	if (hell) {
		grid.setLairOpen(true);
	}
	const score = new ScoreModel();
	const progress = new LevelProgress(grid, score, events);
	const locator = new SpawnLocator(grid, progress);
	const player = new PlayerService(grid, progress, events);
	const ghosts = new GhostService(grid, player, progress);
	const lairCode = new LairCodeService(level, events);
	const hypnosis = new HypnosisService(score, lairCode, events);
	hypnosis.attach(ghosts);
	const combat = new CombatService(player, ghosts, progress, score, events, hypnosis, lairCode);
	const fruit = new FruitService(profile, level, grid, locator, progress, score, events);
	const egg = new EasterEggService(level, grid, ghosts, lairCode, progress, events, score);
	const abilities = new AbilityService(grid, progress, locator, events);
	combat.setShield(abilities);
	let doom: DoomSession | null = null;
	if (hell) {
		const bossSpawn = grid.bossSpawn();
		if (!bossSpawn) {
			console.error('buildLevelSession', 'boss spawn tile DB is not found');
			throw new Error('buildLevelSession: boss spawn tile DB is not found');
		}
		const boss = new DoomBossService(grid, bossSpawn);
		const abilities = new DoomAbilityService(grid, boss);
		abilities.setGodMode(request.godMode);
		if (import.meta.env.DEV) {
			boss.setDebugSink(busSink(events));
			abilities.setDebugSink(busSink(events));
		}
		doom = { boss, abilities };
	}
	combat.setProfile(profile);
	combat.setHellMode(hell);
	combat.setStationMode(station);
	let stationRun: StationRun | null = null;
	if (station && grid instanceof StationGrid) {
		// the station's own kit only: no fruit, no abilities, no egg; its rules take the touches
		fruit.setEnabled(false);
		stationRun = new StationRun(grid, ghosts, player, progress, score, season.grid);
		stationRun.sound = (sound) => events.emit('audio:station', { sound });
		combat.setStationHit(null);
	}
	let nightwoodRun: NightwoodRun | null = null;
	if (nightwood) {
		// the forest plays by the classic rules: the Presence must fall, the last dot does not end it
		fruit.setEnabled(false);
		combat.setBossRules(true);
		nightwoodRun = new NightwoodRun(season.grid, ghosts, player, progress, level);
		nightwoodRun.powered = () => combat.isPowerActive;
		nightwoodRun.sound = (sound) => {
			// the forest borrows the game's cues; the banishing and the flare already have their own
			const cue = NIGHT_CUES[sound];
			if (cue) {
				events.emit('audio:cue', { cue });
			}
		};
	}
	const mods = seasonModifiers(season.name);
	fruit.setFruitDuration(mods.fruitDuration);
	if (secret) {
		// the arcade: the round's own speeds, energizer time, waves and fruit
		const round = request.arcadeRound ?? 1;
		const tuning = arcadeRound(round);
		combat.setSecretMode(true, request.arcadeTries ?? ARCADE.tries, round >= ARCADE.rounds.length);
		combat.setPowerDuration(tuning.power);
		ghosts.setArcade(tuning);
		ghosts.setSpeedModifier(tuning.ghostSpeed);
		player.setSpeedModifier(tuning.playerSpeed);
		fruit.setKind(tuning.fruit);
	} else {
		// the season levels get harder with the level (boss levels do not count)
		const tuning = levelTuning(seasonLevelOf(level));
		combat.setPowerDuration(powerSeconds(mods.powerDuration, tuning));
		// the ghosts never outrun the hero (the season's own modifiers included)
		const ceiling = (player.baseSpeed * mods.playerSpeedModifier) / ghosts.baseSpeed;
		ghosts.setSpeedModifier(
			Math.min(
				mods.ghostSpeedModifier * tuning.ghostSpeed,
				Math.max(mods.ghostSpeedModifier, ceiling)
			)
		);
		ghosts.setTuning(tuning.scatter, tuning.chase, tuning.exitScale);
		hypnosis.setOverdriveSeconds(tuning.overdrive);
		player.setSpeedModifier(mods.playerSpeedModifier);
	}
	if (stationRun) {
		// the squad is out of its containment at once: it plays as four
		ghosts.setTuning(ghosts.waves.scatter, ghosts.waves.chase, RUN_TUNE.exitScale);
		ghosts.setFleeFactor(RUN_TUNE.flee);
		ghosts.setRageEyesFactors(RUN_TUNE.rage, RUN_TUNE.eyes);
	}
	return {
		season,
		hell,
		station,
		nightwood,
		secret,
		grid,
		score,
		progress,
		player,
		ghosts,
		combat,
		fruit,
		egg,
		hypnosis,
		abilities,
		lairCode,
		doom,
		stationRun,
		nightwoodRun,
		bossReward: hell || station || nightwood ? new BossRewardService(grid, events) : null
	};
}

/** Full reset at the start of a game or a fresh attempt. */
export function resetLevelSession(session: LevelSession): void {
	session.player.reset();
	session.progress.reset();
	session.ghosts.reset();
	session.combat.reset();
	session.fruit.reset();
	session.egg.reset();
	session.hypnosis.reset();
	session.abilities.reset();
	session.doom?.boss.reset();
	session.doom?.abilities.reset();
	session.bossReward?.reset();
	session.stationRun?.reset();
	session.nightwoodRun?.reset();
	session.lairCode.reset();
}

/** Reset after a level change: score and lives were carried over and must stay. */
export function resetForNextLevel(session: LevelSession): void {
	session.player.reset();
	session.progress.resetDots();
	session.ghosts.reset();
	session.fruit.reset();
	session.egg.reset();
	session.hypnosis.reset();
	session.abilities.reset();
	session.doom?.boss.reset();
	session.doom?.abilities.reset();
	session.bossReward?.reset();
	session.stationRun?.reset();
	session.nightwoodRun?.reset();
	session.combat.nextLevel();
}
