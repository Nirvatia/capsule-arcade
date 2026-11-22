import type { GridService } from '../maze/GridService';
import type { PlayerService } from '../actors/PlayerService';
import type { GhostService } from '../actors/GhostService';
import type { LevelProgress } from './LevelProgress';
import type { CombatService } from '../rules/CombatService';
import type { FruitService } from '../bonuses/FruitService';
import type { EasterEggService } from '../bonuses/EasterEggService';
import type { HypnosisService } from '../rules/HypnosisService';
import type { BossRewardService } from '../bonuses/BossRewardService';
import type { LairCodeService } from '../rules/LairCodeService';
import type { AbilityService } from '../bonuses/AbilityService';
import type { AbilityKind } from '../../config/abilityConfig';
import type { DoomBossService } from '../doom/DoomBossService';
import type { DoomAbilityService } from '../doom/DoomAbilityService';
import { SECRET_LEVEL_NUMBER, HELL_LEVEL_INTERVAL } from '../../config/gridConfig';
import type { GameProfile } from '../rules/HypnosisService';
import type { PlayerDirection } from '../actors/PlayerModel';
import type { EventBus } from '../../engine/EventBus';
import type {
	PacmanEventMap,
	PacmanHellHud,
	PacmanHellWeapon,
	PacmanHudPayload
} from '../../core/Events';
import { BOSS_HP, PLAYER_MAX_HP } from '../doom/DoomBalance';
import { seasonForLevel, secretSeason, hellSeason, stationSeason } from './SeasonCatalog';
import { bossForLevel } from './BossCatalog';
import type { BossId } from './BossCatalog';
import { ARCADE } from '../../config/arcadeConfig';
import type { SeasonData } from './SeasonCatalog';
import { buildLevelSession, resetForNextLevel, resetLevelSession } from './LevelSession';
import type { LevelSession } from './LevelSession';

/** The level after the current one, as `peekNextLevel()` sees it. */
export interface NextLevel {
	readonly level: number;
	readonly hell: boolean;
	/** The station boss level (DESIGN.md §7a). */
	readonly station: boolean;
	readonly season: SeasonData;
}

const MAZE_SCALE_DEFAULT = 0.8;
const MAZE_SCALE_MIN = 0.3;
const MAZE_SCALE_MAX = 1.5;

/**
 * Owns the run (level number, profile, secret/hell routing, settings) and the current
 * `LevelSession`. Level changes rebuild the session and carry over score and lives.
 */
export class LevelLoader {
	private readonly events: EventBus<PacmanEventMap>;
	private profileValue: GameProfile = 'pacman';
	private levelNumber = 1;
	private pendingStartLevelValue = 1;
	private secretModeValue = false;
	private hellModeValue = false;
	private stationModeValue = false;
	/** Dev: the boss every boss level gets, or null for the run's own pick (`BossCatalog`). */
	private forcedBossValue: BossId | null = null;
	private fireRequestedValue = false;
	private secretReturnLevelValue = 1;
	/** The arcade on the secret level: the round (1..3) and the tries carried between rounds. */
	private arcadeRoundValue = 1;
	private arcadeTriesValue: number = ARCADE.tries;
	private mazeScaleValue = MAZE_SCALE_DEFAULT;
	/** Seeds the order the season mazes come in (`MazeCycle`); new for every game. */
	private mazeSeedValue = 0;
	private mazeSeedLocked = false;
	private godModeValue = false;
	private sessionValue: LevelSession | null = null;

	constructor(events: EventBus<PacmanEventMap>) {
		if (!events) {
			console.error('LevelLoader.constructor', 'missing event bus');
			throw new Error('LevelLoader.constructor: missing event bus');
		}
		this.events = events;
	}

	get profile(): GameProfile {
		return this.profileValue;
	}

	get level(): number {
		return this.levelNumber;
	}

	get pendingStartLevel(): number {
		return this.pendingStartLevelValue;
	}

	get secretMode(): boolean {
		return this.secretModeValue;
	}

	get godMode(): boolean {
		return this.godModeValue;
	}

	/** The arcade round on the secret level (1..3). */
	get arcadeRound(): number {
		return this.arcadeRoundValue;
	}

	/** The round's intermission plays after it is cleared. */
	get arcadeIntermission(): boolean {
		return this.secretModeValue && this.arcadeRoundValue === ARCADE.intermissionAfter;
	}

	/** Clearing this round ends the arcade. */
	get arcadeFinalRound(): boolean {
		return this.secretModeValue && this.arcadeRoundValue >= ARCADE.rounds.length;
	}

	get hellMode(): boolean {
		return this.hellModeValue;
	}

	/** The station boss level (DESIGN.md §7a). */
	get stationMode(): boolean {
		return this.stationModeValue;
	}

	/** The dev panel's boss for every boss level, or null: the run's own pick. */
	get forcedBoss(): BossId | null {
		return this.forcedBossValue;
	}

	/** Dev: makes every boss level `boss` (null: back to the run's own pick). */
	debugForceBoss(boss: BossId | null): void {
		this.forcedBossValue = boss;
	}

	get mazeSeed(): number {
		return this.mazeSeedValue;
	}

	get mazeScale(): number {
		return this.mazeScaleValue;
	}

	/** The current level; null only before the first build. */
	get session(): LevelSession | null {
		return this.sessionValue;
	}

	get season(): SeasonData | null {
		return this.sessionValue?.season ?? null;
	}

	get grid(): GridService | null {
		return this.sessionValue?.grid ?? null;
	}

	get player(): PlayerService | null {
		return this.sessionValue?.player ?? null;
	}

	get ghosts(): GhostService | null {
		return this.sessionValue?.ghosts ?? null;
	}

	get progress(): LevelProgress | null {
		return this.sessionValue?.progress ?? null;
	}

	get combat(): CombatService | null {
		return this.sessionValue?.combat ?? null;
	}

	get fruit(): FruitService | null {
		return this.sessionValue?.fruit ?? null;
	}

	get egg(): EasterEggService | null {
		return this.sessionValue?.egg ?? null;
	}

	get hypnosis(): HypnosisService | null {
		return this.sessionValue?.hypnosis ?? null;
	}

	get abilities(): AbilityService | null {
		return this.sessionValue?.abilities ?? null;
	}

	get doomBoss(): DoomBossService | null {
		return this.sessionValue?.doom?.boss ?? null;
	}

	get doom(): DoomAbilityService | null {
		return this.sessionValue?.doom?.abilities ?? null;
	}

	get bossReward(): BossRewardService | null {
		return this.sessionValue?.bossReward ?? null;
	}

	get lairCode(): LairCodeService | null {
		return this.sessionValue?.lairCode ?? null;
	}

	get score(): number {
		return this.sessionValue ? this.sessionValue.score.score : 0;
	}

	setPendingStartLevel(level: number): void {
		if (!Number.isFinite(level) || level < 1) {
			console.error('LevelLoader.setPendingStartLevel', 'invalid level', level);
			return;
		}
		this.pendingStartLevelValue = Math.floor(level);
	}

	setMazeScale(value: number): void {
		if (!Number.isFinite(value) || value <= 0) {
			console.error('LevelLoader.setMazeScale', 'invalid maze scale', value);
			return;
		}
		this.mazeScaleValue = Math.min(MAZE_SCALE_MAX, Math.max(MAZE_SCALE_MIN, value));
	}

	requestFire(): void {
		this.fireRequestedValue = true;
	}

	consumeFireRequest(): boolean {
		const requested = this.fireRequestedValue;
		this.fireRequestedValue = false;
		return requested;
	}

	toggleProfile(): void {
		this.profileValue = this.profileValue === 'pacman' ? 'ms-pacman' : 'pacman';
		const session = this.sessionValue;
		if (session) {
			session.combat.setProfile(this.profileValue);
			session.hypnosis.reset();
			session.ghosts.setMsOverdrive(false);
		}
		this.emitHud();
	}

	/** Returns the current level, building it first if nothing is built yet. */
	ensure(): LevelSession {
		return this.sessionValue ?? this.buildLevel();
	}

	/** Fixes the maze order (tests, dev); `startNewGame` picks a fresh one unless told not to. */
	setMazeSeed(seed: number): void {
		this.mazeSeedValue = Math.floor(seed) >>> 0;
		this.mazeSeedLocked = true;
	}

	startNewGame(): void {
		if (!this.mazeSeedLocked) {
			this.mazeSeedValue = Math.floor(Math.random() * 0x100000000);
		}
		this.levelNumber = this.pendingStartLevelValue;
		this.pendingStartLevelValue = 1;
		this.secretModeValue = false;
		this.secretReturnLevelValue = 1;
		this.arcadeRoundValue = 1;
		this.buildLevel();
		this.resetGameplay();
		this.emitHud();
	}

	resetGameplay(): void {
		resetLevelSession(this.ensure());
	}

	prepareAfterDeath(): void {
		const session = this.ensure();
		session.combat.finishDeath();
		session.abilities.onDeath();
		if (session.doom) {
			session.doom.boss.reset();
			session.doom.abilities.reset();
		}
		this.emitHud();
	}

	syncLairOpen(): void {
		const session = this.sessionValue;
		if (session) {
			// the lair opens when the Easter egg's gate has slid open, not with the code itself
			session.grid.setLairOpen(session.egg.lairOpen);
		}
	}

	enterSecretLevel(): void {
		if (this.secretModeValue) {
			return;
		}
		this.changeLevel(() => {
			this.secretModeValue = true;
			this.secretReturnLevelValue = this.levelNumber + 1;
			this.levelNumber = SECRET_LEVEL_NUMBER;
			this.arcadeRoundValue = 1;
			this.arcadeTriesValue = ARCADE.tries;
		});
	}

	/** The next level; in the arcade the next round, and after the last one back home. */
	advanceLevel(): void {
		this.changeLevel(() => {
			if (this.secretModeValue && this.arcadeRoundValue < ARCADE.rounds.length) {
				this.arcadeRoundValue += 1;
			} else if (this.secretModeValue) {
				this.leaveSecret();
			} else {
				this.levelNumber += 1;
			}
		});
	}

	/** Every arcade try is lost: back to the main game's next level, nothing taken away. */
	leaveArcade(): void {
		this.changeLevel(() => this.leaveSecret());
	}

	/** The pause screen's RESTART: this level (or arcade round) again. */
	restartLevel(): void {
		this.changeLevel(() => undefined);
	}

	private leaveSecret(): void {
		this.secretModeValue = false;
		this.levelNumber = this.secretReturnLevel();
		this.arcadeRoundValue = 1;
	}

	/** Dev: puts `kind` in the hero's ability slot now (season levels). */
	debugGrantAbility(kind: AbilityKind): void {
		const session = this.sessionValue;
		if (session && !this.hellModeValue && !this.secretModeValue) {
			session.abilities.debugGrant(kind);
		}
	}

	debugSpawnBonus(): void {
		const session = this.sessionValue;
		if (!session) {
			return;
		}
		if (this.hellModeValue) {
			session.doom?.abilities.debugSpawn();
			return;
		}
		if (!this.secretModeValue) {
			session.abilities.debugSpawn(session.player, session.ghosts);
		}
	}

	debugEnterHell(): void {
		this.debugEnterBoss('hell');
	}

	/** Dev: the first boss level now, with `boss` forced from here on. */
	debugEnterBoss(boss: BossId): void {
		if (this.secretModeValue) {
			return;
		}
		this.forcedBossValue = boss;
		this.changeLevel(() => {
			this.levelNumber = HELL_LEVEL_INTERVAL;
		});
	}

	/** Dev: moves the run to `level` now (a season or the hell, by its number). */
	debugGotoLevel(level: number): void {
		if (!Number.isFinite(level) || level < 1) {
			return;
		}
		this.changeLevel(() => {
			this.secretModeValue = false;
			this.levelNumber = Math.floor(level);
		});
	}

	debugEnterSecret(): void {
		this.enterSecretLevel();
	}

	setDesiredDirection(direction: PlayerDirection): void {
		this.sessionValue?.player.setDesiredDirection(direction);
	}

	emitHud(): void {
		this.events.emit('ui:hudChanged', this.hudPayload());
	}

	hudPayload(): PacmanHudPayload {
		const session = this.sessionValue;
		return {
			score: session ? session.score.score : 0,
			lives: session ? session.combat.lives : 3,
			dots: session ? session.progress.remainingDots : 0,
			power: this.currentPower(),
			mode: this.profileValue,
			result: session ? session.combat.result : 'none',
			level: this.levelNumber,
			hell: this.hellHud()
		};
	}

	debugToggleGodMode(): boolean {
		this.godModeValue = !this.godModeValue;
		this.sessionValue?.doom?.abilities.setGodMode(this.godModeValue);
		return this.godModeValue;
	}

	debugDamageBoss(): void {
		if (this.hellModeValue) {
			this.sessionValue?.doom?.boss.takeDamage(250);
		}
	}

	/**
	 * The level `advanceLevel()` would build next: the season (world, grid) and whether it
	 * is a boss level. The renderer shows it while the cleared level turns over.
	 */
	peekNextLevel(): NextLevel {
		const level = this.secretModeValue ? this.secretReturnLevel() : this.levelNumber + 1;
		return { level, ...this.worldOf(level, false) };
	}

	/**
	 * The first level of a new run, as `startNewGame()` would build it, or null when the dev
	 * panel starts it elsewhere (the maze order is drawn only then, so no picture is certain).
	 */
	peekNewGame(): NextLevel | null {
		return this.pendingStartLevelValue === 1 ? { level: 1, ...this.worldOf(1, false) } : null;
	}

	/**
	 * Which world a level number is: a boss every HELL_LEVEL_INTERVAL (for both heroes), the
	 * hell or the station as `BossCatalog` picks them for the run, else a season.
	 */
	private worldOf(
		level: number,
		secret: boolean
	): { hell: boolean; station: boolean; season: SeasonData } {
		const boss = secret ? null : bossForLevel(level, this.mazeSeedValue, this.forcedBossValue);
		const hell = boss === 'hell';
		const station = boss === 'station';
		const season = secret
			? secretSeason()
			: hell
				? hellSeason()
				: station
					? stationSeason()
					: seasonForLevel(level, this.mazeSeedValue);
		return { hell, station, season };
	}

	private secretReturnLevel(): number {
		return Number.isFinite(this.secretReturnLevelValue) && this.secretReturnLevelValue >= 1
			? Math.floor(this.secretReturnLevelValue)
			: 1;
	}

	/**
	 * Moves the run to another level: `route` updates the level number and secret routing,
	 * then a fresh session is built with the score, lives and next-life threshold kept.
	 */
	private changeLevel(route: () => void): void {
		const previous = this.ensure();
		const keptScore = previous.score.score;
		const keptLives = previous.combat.lives;
		const keptLifeThreshold = previous.combat.nextLifeThreshold;
		// the arcade's tries carry from round to round
		this.arcadeTriesValue = previous.secret ? previous.combat.tries : this.arcadeTriesValue;
		route();
		const session = this.buildLevel();
		session.score.add(keptScore);
		session.combat.setLives(keptLives);
		session.combat.setNextLifeThreshold(keptLifeThreshold);
		resetForNextLevel(session);
		this.emitHud();
	}

	private hellHud(): PacmanHellHud | null {
		const doom = this.sessionValue?.doom;
		if (!this.hellModeValue || !doom) {
			return null;
		}
		const armed = doom.abilities.armed;
		const weapon: PacmanHellWeapon =
			armed === 'bfg' || armed === 'barrel' || armed === 'berserk' ? armed : '';
		return {
			hp: doom.abilities.playerHp,
			hpMax: PLAYER_MAX_HP,
			bossHp: Math.max(0, Math.round(doom.boss.hp)),
			bossHpMax: BOSS_HP,
			bossPhase: doom.boss.phase,
			weapon,
			berserk: weapon === 'berserk' ? Math.ceil(doom.abilities.berserkTimer * 10) / 10 : 0
		};
	}

	private buildLevel(): LevelSession {
		const { hell, station, season } = this.worldOf(this.levelNumber, this.secretModeValue);
		this.hellModeValue = hell;
		this.stationModeValue = station;
		const session = buildLevelSession({
			events: this.events,
			level: this.levelNumber,
			profile: this.profileValue,
			season,
			hell,
			station,
			secret: this.secretModeValue,
			godMode: this.godModeValue,
			arcadeRound: this.arcadeRoundValue,
			arcadeTries: this.arcadeTriesValue
		});
		this.sessionValue = session;
		return session;
	}

	private currentPower(): number {
		const session = this.sessionValue;
		let timer = 0;
		if (this.profileValue === 'ms-pacman') {
			if (session && session.hypnosis.overdriveActive) {
				timer = session.hypnosis.overdriveTimer;
			}
		} else if (session && session.combat.isPowerActive) {
			timer = session.combat.powerTimer;
		}
		if (!Number.isFinite(timer) || timer <= 0) {
			return 0;
		}
		return Math.ceil(timer * 10) / 10;
	}
}
