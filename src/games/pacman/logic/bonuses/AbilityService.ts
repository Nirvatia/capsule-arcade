import type { GridService } from '../maze/GridService';
import type { LevelProgress } from '../level/LevelProgress';
import type { SpawnLocator } from '../maze/SpawnLocator';
import type { PlayerService } from '../actors/PlayerService';
import type { GhostService } from '../actors/GhostService';
import type { GhostKind, GhostModel } from '../actors/GhostModel';
import type { FruitService } from './FruitService';
import type { GridPoint } from '../maze/GridModel';
import type { EventBus } from '../../engine/EventBus';
import type { PacmanEventMap } from '../../core/Events';
import { ACTOR_CONTACT_DISTANCE_SQ } from '../../config/actorConfig';
import { ABILITY, ABILITY_KINDS } from '../../config/abilityConfig';
import type { AbilityKind } from '../../config/abilityConfig';
import { EchoCloneService } from './EchoCloneService';

/**
 * waiting (no token yet, or none this level), token (on the board), carried (in the hero's
 * slot), active (spent and running), spent (gone for the level).
 */
export type AbilityPhase = 'waiting' | 'token' | 'carried' | 'active' | 'spent';

/** What a press of the ability key did. */
export type AbilityUse = 'used' | 'refused' | 'empty';

/** What the abilities read and act on each frame. */
export interface AbilityWorld {
	readonly player: PlayerService;
	readonly ghosts: GhostService;
	readonly fruit: FruitService;
	/** An energizer (Pac-Man) or an overdrive (Ms. Pac-Man) runs. */
	readonly powered: boolean;
}

/** One ghost the shock struck, and where the discharge came from (-1: the hero). */
export interface ShockLink {
	readonly ghost: GhostKind;
	readonly x: number;
	readonly y: number;
	readonly from: number;
}

/** The shock's discharge, as it struck: the hero's place and the ghosts in strike order. */
export interface ShockStrike {
	readonly x: number;
	readonly y: number;
	readonly links: readonly ShockLink[];
}

interface Point {
	readonly x: number;
	readonly y: number;
}

function distanceSq(a: Point, b: Point): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	return dx * dx + dy * dy;
}

/** A ghost the abilities count as a threat: it hunts and kills on touch. */
function hunting(ghost: GhostModel): boolean {
	return ghost.state === 'active' || ghost.state === 'enraged';
}

/**
 * The abilities of the season levels (`DESIGN.md` §5, Abilities). A level rolls once whether
 * it has a token and of which kind; the token appears once a share of the dots is eaten, on
 * a tile the hero can reach in a few steps without passing a ghost, and waits a few seconds.
 * Taken, the ability sits in the hero's slot until the player spends it (`use`, the F key)
 * or the level ends. Echo: a riot of clones that eat. Mask: the hero turns into a ghost, the
 * ghosts neither touch nor hunt him. Shock: a discharge chains through the ghosts near the
 * hero and holds them still. None can be spent during an energizer or an overdrive, and an
 * energizer eaten while the mask or the shock runs ends it.
 */
export class AbilityService {
	readonly echo: EchoCloneService;
	private readonly progress: LevelProgress;
	private readonly locator: SpawnLocator;
	private readonly events: EventBus<PacmanEventMap>;
	private readonly random: () => number;
	private phaseValue: AbilityPhase = 'waiting';
	/** This level's roll: whether the token comes, which kind, at which share of the dots. */
	private comes = false;
	private kindValue: AbilityKind = 'echo';
	private threshold = 0.5;
	private retryTimer = 0;
	private tokenTileValue: GridPoint | null = null;
	private tokenTimerValue = 0;
	/** Seconds the running mask or shock has left. */
	private activeTimer = 0;
	private activeDuration = 0;
	/** Seconds the hero stays untouchable after a mask that ended inside a ghost. */
	private graceTimer = 0;
	private strikeValue: ShockStrike | null = null;
	private strikeAgeValue = 0;

	constructor(
		grid: GridService,
		progress: LevelProgress,
		locator: SpawnLocator,
		events: EventBus<PacmanEventMap>,
		random: () => number = Math.random
	) {
		if (!grid || !progress || !locator || !events) {
			console.error('AbilityService.constructor', 'missing dependency');
			throw new Error('AbilityService.constructor: missing dependency');
		}
		this.progress = progress;
		this.locator = locator;
		this.events = events;
		this.random = random;
		this.echo = new EchoCloneService(grid, progress, events, random);
		this.roll();
	}

	get phase(): AbilityPhase {
		return this.phaseValue;
	}

	/** This level's kind (the roll), the one in the slot or the one running. */
	get kind(): AbilityKind {
		return this.kindValue;
	}

	/** Whether this level has a token at all (the roll). */
	get willCome(): boolean {
		return this.comes;
	}

	get tokenPosition(): Point | null {
		const tile = this.tokenTileValue;
		return tile ? { x: tile.x + 0.5, y: tile.y + 0.5 } : null;
	}

	/** Seconds the token has left on the board. */
	get tokenTimer(): number {
		return this.phaseValue === 'token' ? this.tokenTimerValue : 0;
	}

	/** Seconds the running ability has left (the HUD's bar). */
	get timer(): number {
		if (this.phaseValue !== 'active') {
			return 0;
		}
		return this.kindValue === 'echo' ? this.echo.timer : this.activeTimer;
	}

	/** How long the running ability lasts in all. */
	get duration(): number {
		if (this.phaseValue !== 'active') {
			return 0;
		}
		return this.kindValue === 'echo' ? this.echo.duration : this.activeDuration;
	}

	/** The hero wears the mask. */
	get masked(): boolean {
		return this.phaseValue === 'active' && this.kindValue === 'mask';
	}

	/** No ghost may touch the hero: the mask, or the moment of grace after it. */
	get shieldsHero(): boolean {
		return this.masked || this.graceTimer > 0;
	}

	/** The last shock's discharge (for the view), and the seconds since it struck. */
	get strike(): ShockStrike | null {
		return this.strikeValue;
	}

	get strikeAge(): number {
		return this.strikeAgeValue;
	}

	/** A new level or a restart: nothing out, the slot empty, the level's dice rolled again. */
	reset(): void {
		this.phaseValue = 'waiting';
		this.tokenTileValue = null;
		this.tokenTimerValue = 0;
		this.retryTimer = 0;
		this.clearRunning();
		this.echo.reset();
		this.roll();
	}

	/**
	 * The hero died: a running ability is over (the ghosts are reset with him); one in the slot
	 * stays, and so does a token on the board or still to come.
	 */
	onDeath(): void {
		if (this.phaseValue === 'active') {
			this.phaseValue = 'spent';
		}
		this.clearRunning();
		this.echo.reset();
	}

	/** Dev: puts `kind` in the slot now (whatever this level rolled or spent). */
	debugGrant(kind: AbilityKind): void {
		if (this.phaseValue === 'active') {
			return;
		}
		this.kindValue = kind;
		this.tokenTileValue = null;
		this.tokenTimerValue = 0;
		this.phaseValue = 'carried';
	}

	/** Dev: puts a token of `kind` (or this level's) on a reachable tile now. */
	debugSpawn(player: PlayerService, ghosts: GhostService, kind?: AbilityKind): void {
		if (this.phaseValue === 'active') {
			return;
		}
		if (kind) {
			this.kindValue = kind;
		}
		const tile = this.findTokenTile(player, ghosts) ?? this.findTokenTile(player, ghosts, true);
		if (!tile) {
			console.error('AbilityService.debugSpawn', 'no spawn tile available');
			return;
		}
		this.placeToken(tile);
	}

	update(dt: number, world: AbilityWorld): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('AbilityService.update', 'invalid delta time', dt);
			return;
		}
		if (!world?.player || !world.ghosts) {
			console.error('AbilityService.update', 'missing world');
			return;
		}
		this.graceTimer = Math.max(0, this.graceTimer - dt);
		this.strikeAgeValue += dt;
		switch (this.phaseValue) {
			case 'waiting':
				this.wait(dt, world);
				return;
			case 'token':
				this.offer(dt, world);
				return;
			case 'active':
				this.run(dt, world);
				return;
			default:
				return;
		}
	}

	/** The ability key: spends what the slot holds, or refuses with a fizzle. */
	use(world: AbilityWorld): AbilityUse {
		if (this.phaseValue !== 'carried') {
			return 'empty';
		}
		const at = world.player.position;
		if (world.powered) {
			return this.refuse(at);
		}
		switch (this.kindValue) {
			case 'echo':
				this.echo.start(world.player.tile);
				if (this.echo.phase !== 'riot') {
					return this.refuse(at);
				}
				break;
			case 'mask':
				this.activeDuration = ABILITY.mask.seconds;
				this.activeTimer = this.activeDuration;
				world.ghosts.setHeroHidden(true);
				this.events.emit('fx:event', { kind: 'mask', x: at.x, y: at.y, on: true });
				break;
			case 'shock': {
				const links = this.chain(at, world.ghosts.list);
				if (links.length === 0) {
					return this.refuse(at);
				}
				for (const link of links) {
					world.ghosts.freeze(link.ghost, ABILITY.shock.seconds);
				}
				this.strikeValue = { x: at.x, y: at.y, links };
				this.strikeAgeValue = 0;
				this.activeDuration = ABILITY.shock.seconds;
				this.activeTimer = this.activeDuration;
				this.events.emit('fx:event', {
					kind: 'shock',
					x: at.x,
					y: at.y,
					links: links.map((l) => {
						const from = l.from < 0 ? at : (links[l.from] as ShockLink);
						return { x0: from.x, y0: from.y, x1: l.x, y1: l.y };
					})
				});
				break;
			}
		}
		this.phaseValue = 'active';
		this.events.emit('audio:cue', { cue: 'ability-use' });
		return 'used';
	}

	private roll(): void {
		this.comes = this.random() < ABILITY.chance;
		const pick = Math.floor(this.random() * ABILITY_KINDS.length);
		this.kindValue = ABILITY_KINDS[Math.min(pick, ABILITY_KINDS.length - 1)] as AbilityKind;
		this.threshold = ABILITY.window[0] + this.random() * (ABILITY.window[1] - ABILITY.window[0]);
	}

	private wait(dt: number, world: AbilityWorld): void {
		if (
			!this.comes ||
			this.progress.collectionRatio < this.threshold ||
			this.progress.remainingDots <= 0
		) {
			return;
		}
		this.retryTimer -= dt;
		if (this.retryTimer > 0) {
			return;
		}
		const tile = this.findTokenTile(world.player, world.ghosts);
		if (tile) {
			this.placeToken(tile);
		} else {
			this.retryTimer = ABILITY.retrySeconds;
		}
	}

	private offer(dt: number, world: AbilityWorld): void {
		this.tokenTimerValue = Math.max(0, this.tokenTimerValue - dt);
		if (this.touchesToken(world.player)) {
			const at = this.tokenPosition as Point;
			this.tokenTileValue = null;
			this.tokenTimerValue = 0;
			this.phaseValue = 'carried';
			this.events.emit('audio:cue', { cue: 'ability-take' });
			this.events.emit('fx:event', { kind: 'ability-take', x: at.x, y: at.y });
			return;
		}
		if (this.tokenTimerValue <= 0) {
			this.phaseValue = 'spent';
			this.tokenTileValue = null;
			this.events.emit('audio:cue', { cue: 'fruit-expire' });
		}
	}

	private run(dt: number, world: AbilityWorld): void {
		const kind = this.kindValue;
		if (kind === 'echo') {
			this.echo.update(dt, world);
			if (this.echo.phase !== 'riot') {
				this.phaseValue = 'spent';
			}
			return;
		}
		if (world.powered) {
			// an energizer ends the mask and the shock at once
			this.finish(world, false);
			return;
		}
		this.activeTimer = Math.max(0, this.activeTimer - dt);
		const held =
			kind !== 'shock' || world.ghosts.list.some((g) => world.ghosts.frozenFor(g.kind) > 0);
		if (this.activeTimer <= 0 || !held) {
			this.finish(world, kind === 'mask');
		}
	}

	/** The mask or the shock is over; `grace` when a mask that ends inside a ghost earns it. */
	private finish(world: AbilityWorld, grace: boolean): void {
		const kind = this.kindValue;
		this.phaseValue = 'spent';
		this.activeTimer = 0;
		if (kind === 'mask') {
			world.ghosts.setHeroHidden(false);
			const at = world.player.position;
			if (
				grace &&
				world.ghosts.list.some(
					(g) => hunting(g) && distanceSq(g.position, at) <= ACTOR_CONTACT_DISTANCE_SQ
				)
			) {
				this.graceTimer = ABILITY.mask.graceSeconds;
			}
			this.events.emit('fx:event', { kind: 'mask', x: at.x, y: at.y, on: false });
		} else if (kind === 'shock') {
			world.ghosts.thawAll();
		}
	}

	private clearRunning(): void {
		this.activeTimer = 0;
		this.activeDuration = 0;
		this.graceTimer = 0;
		this.strikeValue = null;
	}

	private refuse(at: Point): AbilityUse {
		this.events.emit('audio:cue', { cue: 'ability-fizzle' });
		this.events.emit('fx:event', { kind: 'ability-fizzle', x: at.x, y: at.y });
		return 'refused';
	}

	/**
	 * The shock's chain: the nearest hunting ghost within reach of the hero, then, again and
	 * again, the nearest one left within reach of a ghost already struck.
	 */
	private chain(at: Point, ghosts: readonly GhostModel[]): ShockLink[] {
		const reachSq = ABILITY.shock.reach * ABILITY.shock.reach;
		const left = ghosts.filter((g) => hunting(g));
		const links: ShockLink[] = [];
		const sources: Point[] = [at];
		while (left.length > 0) {
			let best = -1;
			let bestFrom = -1;
			let bestD = Infinity;
			for (let i = 0; i < left.length; i += 1) {
				const p = (left[i] as GhostModel).position;
				for (let s = 0; s < sources.length; s += 1) {
					const d = distanceSq(p, sources[s] as Point);
					if (d <= reachSq && d < bestD) {
						bestD = d;
						best = i;
						bestFrom = s - 1;
					}
				}
			}
			if (best < 0) {
				break;
			}
			const ghost = left.splice(best, 1)[0] as GhostModel;
			const p = ghost.position;
			links.push({ ghost: ghost.kind, x: p.x, y: p.y, from: bestFrom });
			sources.push(p);
		}
		return links;
	}

	/**
	 * An eaten dot tile in the token's step window, on a way that passes no hunting ghost (any
	 * dot tile with `anyDot`: the dev spawn on a board nobody has eaten from yet).
	 */
	private findTokenTile(
		player: PlayerService,
		ghosts: GhostService,
		anyDot = false
	): GridPoint | null {
		const blocked: GridPoint[] = [];
		const c = ABILITY.ghostClearance;
		for (const ghost of ghosts.list) {
			if (!hunting(ghost)) {
				continue;
			}
			for (const t of ghost.target ? [ghost.tile, ghost.target] : [ghost.tile]) {
				for (let dy = -c; dy <= c; dy += 1) {
					for (let dx = -c; dx <= c; dx += 1) {
						if (Math.abs(dx) + Math.abs(dy) <= c) {
							blocked.push({ x: t.x + dx, y: t.y + dy });
						}
					}
				}
			}
		}
		return this.locator.findReachableTile(
			player.tile,
			[ABILITY.steps[0], ABILITY.steps[1]],
			blocked,
			this.random(),
			anyDot
		);
	}

	private placeToken(tile: GridPoint): void {
		this.tokenTileValue = tile;
		this.tokenTimerValue = ABILITY.tokenSeconds;
		this.phaseValue = 'token';
		this.events.emit('audio:cue', { cue: 'fruit-spawn' });
	}

	private touchesToken(player: PlayerService): boolean {
		const center = this.tokenPosition;
		if (!center) {
			return false;
		}
		if (distanceSq(player.position, center) <= ACTOR_CONTACT_DISTANCE_SQ) {
			return true;
		}
		const tile = player.tile;
		return tile.x === center.x - 0.5 && tile.y === center.y - 0.5;
	}
}
