import type { ScoreModel } from '../level/ScoreModel';
import type { GhostService, HypnosisGuide } from '../actors/GhostService';
import type { GhostDirection, GhostKind, GhostModel, GhostTile } from '../actors/GhostModel';
import type { LairCodeService } from './LairCodeService';
import type { EventBus } from '../../engine/EventBus';
import type { PacmanEventMap } from '../../core/Events';
import { planFeeding, shortestRoute } from '../actors/ghostRoutes';
import { ACTOR_CONTACT_DISTANCE_SQ } from '../../config/actorConfig';
import { HYPNOSIS } from '../../config/hypnosisConfig';
import { SCORE_TABLE } from '../../config/scoreConfig';

export type GameProfile = 'pacman' | 'ms-pacman';

/** What a hypnotised ghost does for its whole hypnosis: eat dots, or hunt the other ghosts. */
export type HypnosisMode = 'feeder' | 'hunter';

/** The ghost states a hunter may eat: anyone out of the lair that is not already eyes. */
const PREY_STATES: ReadonlySet<string> = new Set(['active', 'frightened', 'enraged']);

/**
 * Ms. Pac-Man's overdrive and the hypnosis it brings. A touch in the overdrive hypnotises a
 * ghost for a few seconds (a touch on another moves the hypnosis over and frees the first,
 * scared); one that wakes up on its own is enraged for a moment.
 *
 * The hypnotised ghost plans once, for the time it has (by path length, as a ghost walks):
 * with enough dots it can really eat in that time it is a **feeder** (it follows the greedy
 * route from cluster to cluster); with too few or too far it is a **hunter** (it chases the
 * nearest other ghost by path and eats it on touch, 200 each). The mode holds for the whole
 * hypnosis; a hypnosis that moves to another ghost plans again. It also guides the ghost
 * (`HypnosisGuide`) and makes frightened ghosts near a hunter run from it.
 */
export class HypnosisService implements HypnosisGuide {
	private readonly scoreModel: ScoreModel;
	private readonly lairCode: LairCodeService | null;
	private readonly events: EventBus<PacmanEventMap> | null;
	private world: GhostService | null = null;
	private overdriveSecondsValue: number = HYPNOSIS.overdriveSeconds;
	private overdriveActiveValue = false;
	private overdriveTimerValue = 0;
	private hypnotizedKindValue: GhostKind | null = null;
	private hypnosisTimerValue = 0;
	private modeValue: HypnosisMode | null = null;
	private plannedDotsValue = 0;
	private lastKey = '';
	private lastDirection: GhostDirection | null = null;
	private readonly enragedTimers = new Map<GhostKind, number>();

	constructor(
		scoreModel: ScoreModel,
		lairCode: LairCodeService | null = null,
		events: EventBus<PacmanEventMap> | null = null
	) {
		if (!scoreModel) {
			console.error('HypnosisService.constructor', 'missing score model');
			throw new Error('HypnosisService.constructor: missing score model');
		}
		this.scoreModel = scoreModel;
		this.lairCode = lairCode;
		this.events = events;
	}

	/** Connects the ghosts: this service guides the hypnotised one. */
	attach(ghosts: GhostService): void {
		this.world = ghosts;
		ghosts.setHypnosisGuide(this);
	}

	get overdriveActive(): boolean {
		return this.overdriveActiveValue;
	}

	get overdriveTimer(): number {
		return this.overdriveTimerValue;
	}

	get hypnotizedKind(): GhostKind | null {
		return this.hypnotizedKindValue;
	}

	/** What the hypnotised ghost does for this hypnosis; null when none is hypnotised. */
	get mode(): HypnosisMode | null {
		return this.hypnotizedKindValue ? this.modeValue : null;
	}

	/** How many dots the plan found it could eat in its time (what the mode was chosen by). */
	get plannedDots(): number {
		return this.plannedDotsValue;
	}

	/** How long an energizer's overdrive lasts on this level (the difficulty ramp shortens it). */
	setOverdriveSeconds(value: number): void {
		if (!(value > 0)) {
			console.error('HypnosisService.setOverdriveSeconds', 'invalid duration', value);
			return;
		}
		this.overdriveSecondsValue = value;
	}

	get overdriveSeconds(): number {
		return this.overdriveSecondsValue;
	}

	reset(): void {
		this.overdriveActiveValue = false;
		this.overdriveTimerValue = 0;
		this.hypnotizedKindValue = null;
		this.hypnosisTimerValue = 0;
		this.modeValue = null;
		this.plannedDotsValue = 0;
		this.lastKey = '';
		this.lastDirection = null;
		this.enragedTimers.clear();
	}

	startOverdrive(ghosts: GhostService): void {
		if (!ghosts) {
			console.error('HypnosisService.startOverdrive', 'missing ghost service');
			return;
		}
		this.overdriveActiveValue = true;
		this.overdriveTimerValue = this.overdriveSecondsValue;
		ghosts.setMsOverdrive(true);
	}

	update(dt: number, ghosts: GhostService): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('HypnosisService.update', 'invalid delta time', dt);
			return;
		}
		if (!ghosts) {
			console.error('HypnosisService.update', 'missing ghost service');
			return;
		}
		if (this.overdriveActiveValue) {
			this.overdriveTimerValue = Math.max(0, this.overdriveTimerValue - dt);
			if (this.overdriveTimerValue <= 0) {
				this.overdriveActiveValue = false;
				this.overdriveTimerValue = 0;
				ghosts.setMsOverdrive(false);
			}
		}
		if (this.hypnotizedKindValue) {
			this.hypnosisTimerValue = Math.max(0, this.hypnosisTimerValue - dt);
			if (this.hypnosisTimerValue <= 0) {
				this.wakeHypnotized(ghosts, true);
			} else if (this.modeValue === 'hunter') {
				this.eatTouched(ghosts);
			}
		}
		for (const [kind, timer] of Array.from(this.enragedTimers.entries())) {
			const nextTimer = Math.max(0, timer - dt);
			if (nextTimer <= 0) {
				this.enragedTimers.delete(kind);
				ghosts.setGhostState(kind, 'active');
			} else {
				this.enragedTimers.set(kind, nextTimer);
			}
		}
	}

	handleContact(kind: GhostKind, ghosts: GhostService): void {
		if (!this.overdriveActiveValue) {
			return;
		}
		if (!ghosts) {
			console.error('HypnosisService.handleContact', 'missing ghost service');
			return;
		}
		if (this.hypnotizedKindValue === kind) {
			return;
		}
		if (!this.hypnotizedKindValue) {
			this.hypnotizedKindValue = kind;
			this.hypnosisTimerValue = HYPNOSIS.seconds;
			this.scoreModel.add(SCORE_TABLE.hypnosis);
			ghosts.setGhostState(kind, 'hypnotized');
			this.lairCode?.register(kind);
			this.plan(kind, ghosts);
			return;
		}
		const previous = this.hypnotizedKindValue;
		ghosts.setGhostState(previous, 'frightened');
		this.hypnotizedKindValue = kind;
		this.hypnosisTimerValue = HYPNOSIS.seconds;
		this.scoreModel.add(SCORE_TABLE.hypnosisTransfer);
		ghosts.setGhostState(kind, 'hypnotized');
		this.lairCode?.register(kind);
		this.plan(kind, ghosts);
	}

	/** The ghost's next step while hypnotised (null: the ghost steers by its old rule). */
	direction(ghost: GhostModel): GhostDirection | null {
		const ghosts = this.world;
		if (!ghosts || ghost.kind !== this.hypnotizedKindValue || ghost.state !== 'hypnotized') {
			return null;
		}
		// asked again on the same tile (the move did not start): the same answer
		const key = `${ghost.tile.x},${ghost.tile.y},${ghost.facing ?? '-'}`;
		if (key === this.lastKey) {
			return this.lastDirection;
		}
		const from = { tile: ghost.tile, facing: ghost.facing };
		let next: GhostDirection | null;
		if (this.modeValue === 'hunter') {
			const prey = this.preyTiles(ghost.kind, ghosts);
			next =
				shortestRoute(ghosts.routeWorld(), from, (x, y) => prey.has(`${x},${y}`))?.directions[0] ??
				null;
		} else {
			const steps = Math.max(1, Math.ceil(this.hypnosisTimerValue * ghosts.speedOf(ghost)));
			next =
				planFeeding(ghosts.routeWorld(), from, (x, y) => ghosts.hasDot(x, y), steps)
					.directions[0] ?? null;
		}
		this.lastKey = key;
		this.lastDirection = next;
		return next;
	}

	/** The hypnotised ghost's speed against its own: a hunter is quicker than a feeder. */
	speedFactor(ghost: GhostModel): number {
		return ghost.kind === this.hypnotizedKindValue && this.modeValue === 'hunter'
			? HYPNOSIS.hunterSpeedFactor
			: HYPNOSIS.speedFactor;
	}

	/** A frightened ghost near a hunter runs from it (not from her). */
	threatFor(ghost: GhostModel): GhostTile | null {
		const ghosts = this.world;
		if (!ghosts || this.mode !== 'hunter' || ghost.state !== 'frightened') {
			return null;
		}
		const hunter = ghosts.list.find((g) => g.kind === this.hypnotizedKindValue);
		if (!hunter) {
			return null;
		}
		const dx = hunter.tile.x - ghost.tile.x;
		const dy = hunter.tile.y - ghost.tile.y;
		return dx * dx + dy * dy <= HYPNOSIS.hunterFleeRadius ** 2 ? hunter.tile : null;
	}

	/** Chooses the mode for this hypnosis: once, by what the ghost can eat in its time. */
	private plan(kind: GhostKind, ghosts: GhostService): void {
		// the plan counts what it eats at a feeder's pace, whatever the last hypnosis was
		this.modeValue = null;
		this.lastKey = '';
		this.lastDirection = null;
		const ghost = ghosts.list.find((g) => g.kind === kind);
		if (!ghost) {
			this.modeValue = 'feeder';
			this.plannedDotsValue = 0;
			return;
		}
		const steps = Math.floor(HYPNOSIS.seconds * ghosts.speedOf(ghost));
		const plan = planFeeding(
			ghosts.routeWorld(),
			{ tile: ghost.tile, facing: ghost.facing },
			(x, y) => ghosts.hasDot(x, y),
			steps
		);
		this.plannedDotsValue = plan.dots;
		const hasPrey = this.preyTiles(kind, ghosts).size > 0;
		this.modeValue = plan.dots >= HYPNOSIS.feederMinDots || !hasPrey ? 'feeder' : 'hunter';
	}

	private preyOf(kind: GhostKind, ghosts: GhostService): GhostModel[] {
		return ghosts.list.filter((g) => g.kind !== kind && PREY_STATES.has(g.state));
	}

	private preyTiles(kind: GhostKind, ghosts: GhostService): Set<string> {
		return new Set(this.preyOf(kind, ghosts).map((g) => `${g.tile.x},${g.tile.y}`));
	}

	/** The hunter eats every other ghost it touches: eyes, 200 each. */
	private eatTouched(ghosts: GhostService): void {
		const hunter = ghosts.list.find((g) => g.kind === this.hypnotizedKindValue);
		if (!hunter) {
			return;
		}
		const at = hunter.position;
		for (const prey of this.preyOf(hunter.kind, ghosts)) {
			const p = prey.position;
			const dx = p.x - at.x;
			const dy = p.y - at.y;
			if (dx * dx + dy * dy > ACTOR_CONTACT_DISTANCE_SQ) {
				continue;
			}
			ghosts.setGhostState(prey.kind, 'eyes');
			this.scoreModel.add(SCORE_TABLE.hypnosisEat);
			this.events?.emit('fx:event', {
				kind: 'ghost-eaten',
				x: p.x,
				y: p.y,
				points: SCORE_TABLE.hypnosisEat,
				ghost: prey.kind
			});
			this.events?.emit('audio:cue', { cue: 'ghost-eaten' });
		}
	}

	private wakeHypnotized(ghosts: GhostService, enraged: boolean): void {
		const kind = this.hypnotizedKindValue;
		if (!kind) {
			return;
		}
		this.hypnotizedKindValue = null;
		this.hypnosisTimerValue = 0;
		this.modeValue = null;
		this.lastKey = '';
		this.lastDirection = null;
		if (enraged) {
			ghosts.setGhostState(kind, 'enraged');
			this.enragedTimers.set(kind, HYPNOSIS.enragedSeconds);
			return;
		}
		ghosts.setGhostState(kind, this.overdriveActiveValue ? 'frightened' : 'active');
	}
}
