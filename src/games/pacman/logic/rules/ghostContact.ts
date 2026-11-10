import type { GhostKind, GhostModel } from '../actors/GhostModel';
import type { PacmanEventMap } from '../../core/Events';
import type { EventBus } from '../../engine/EventBus';
import { ACTOR_CONTACT_DISTANCE_SQ } from '../../config/actorConfig';

/** What touching a ghost means this frame. */
export type GhostContact =
	| { readonly kind: 'eat'; readonly ghost: GhostModel }
	| { readonly kind: 'death'; readonly ghost: GhostModel; readonly enraged: boolean }
	/** Ms. Pac-Man's overdrive: the hypnosis service decides. */
	| { readonly kind: 'overdrive'; readonly ghost: GhostModel }
	| null;

interface Point {
	readonly x: number;
	readonly y: number;
}

function finite(p: Point): boolean {
	return Number.isFinite(p.x) && Number.isFinite(p.y);
}

function distanceSq(a: Point, b: Point): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	return dx * dx + dy * dy;
}

/**
 * Pac-Man rules: the first active or frightened ghost within contact distance either is
 * eaten (frightened) or kills. `onPass` sees every active ghost that is not touching,
 * with its squared distance (near-miss tracking).
 */
export function classicContact(
	player: Point,
	invulnerable: boolean,
	ghosts: readonly GhostModel[],
	onPass: (ghost: GhostModel, distanceSq: number) => void
): GhostContact {
	if (invulnerable) {
		return null;
	}
	if (!finite(player)) {
		console.error('ghostContact.classicContact', 'invalid player position', player);
		return null;
	}
	for (const ghost of ghosts) {
		if (ghost.state !== 'active' && ghost.state !== 'frightened') {
			continue;
		}
		const at = ghost.position;
		if (!finite(at)) {
			console.error('ghostContact.classicContact', 'invalid ghost position', {
				kind: ghost.kind,
				position: at
			});
			continue;
		}
		const d2 = distanceSq(player, at);
		if (d2 > ACTOR_CONTACT_DISTANCE_SQ) {
			if (ghost.state === 'active') {
				onPass(ghost, d2);
			}
			continue;
		}
		return ghost.state === 'frightened'
			? { kind: 'eat', ghost }
			: { kind: 'death', ghost, enraged: false };
	}
	return null;
}

/**
 * Ms. Pac-Man rules: ghosts in the lair, leaving it, as eyes or hypnotised never touch.
 * During the overdrive any touch goes to the hypnosis; otherwise an enraged, active or
 * frightened ghost kills (unless Pac-Man is invulnerable).
 */
export function msContact(
	player: Point,
	invulnerable: boolean,
	overdrive: boolean,
	ghosts: readonly GhostModel[]
): GhostContact {
	if (!finite(player)) {
		console.error('ghostContact.msContact', 'invalid player position', player);
		return null;
	}
	for (const ghost of ghosts) {
		const state = ghost.state;
		if (state === 'lair' || state === 'exiting' || state === 'eyes' || state === 'hypnotized') {
			continue;
		}
		const at = ghost.position;
		if (!finite(at)) {
			console.error('ghostContact.msContact', 'invalid ghost position', {
				kind: ghost.kind,
				position: at
			});
			continue;
		}
		if (distanceSq(player, at) > ACTOR_CONTACT_DISTANCE_SQ) {
			continue;
		}
		if (overdrive) {
			return { kind: 'overdrive', ghost };
		}
		if (invulnerable) {
			continue;
		}
		if (state === 'enraged') {
			return { kind: 'death', ghost, enraged: true };
		}
		if (state === 'active' || state === 'frightened') {
			return { kind: 'death', ghost, enraged: false };
		}
	}
	return null;
}

/** A ghost this close (tiles²) without touching, then this far again, is a near miss. */
const NEAR_MISS_SQ = 0.95 * 0.95;
const NEAR_MISS_CLEAR_SQ = 1.6 * 1.6;
/** One near miss per ghost per this many seconds. */
const NEAR_MISS_COOLDOWN = 3;

/** A ghost came within a whisker and Pac-Man got away: one `near-miss` effect. */
export class NearMissTracker {
	private readonly events: EventBus<PacmanEventMap>;
	private readonly close = new Set<GhostKind>();
	private readonly cooldown = new Map<GhostKind, number>();

	constructor(events: EventBus<PacmanEventMap>) {
		this.events = events;
	}

	tick(dt: number): void {
		for (const [kind, left] of this.cooldown) {
			this.cooldown.set(kind, Math.max(0, left - dt));
		}
	}

	clear(): void {
		this.close.clear();
	}

	observe(ghost: GhostModel, distanceSq: number, player: Point): void {
		if (distanceSq <= NEAR_MISS_SQ) {
			this.close.add(ghost.kind);
			return;
		}
		if (distanceSq < NEAR_MISS_CLEAR_SQ || !this.close.delete(ghost.kind)) {
			return;
		}
		if ((this.cooldown.get(ghost.kind) ?? 0) > 0) {
			return;
		}
		this.cooldown.set(ghost.kind, NEAR_MISS_COOLDOWN);
		const g = ghost.position;
		this.events.emit('fx:event', {
			kind: 'near-miss',
			x: player.x,
			y: player.y,
			gx: g.x,
			gy: g.y,
			ghost: ghost.kind
		});
	}
}
