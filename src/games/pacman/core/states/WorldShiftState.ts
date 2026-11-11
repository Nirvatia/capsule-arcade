import type { GameState, GameStateContext } from '../flow/GameState';
import { StateClock } from '../flow/StateClock';
import type { FlowTiming } from '../flow/StateClock';
import type { PacmanStateName } from '../Events';
import { FLOW } from '../../config/flowConfig';

/** The way into the arcade (`enter`) or out of it (`leave`). */
export type WorldShiftKind = 'enter' | 'leave';

/** Where the shift starts, tile-centre coordinates: the Easter egg (the hero stands on it). */
export interface WorldShiftSnapshot {
	readonly kind: WorldShiftKind;
	readonly x: number;
	readonly y: number;
}

/**
 * The level is left for another world behind the arcade shift (drawn by the pipeline's
 * `ArcadeShift`): the egg into the arcade, the arcade back to the main game. The game is
 * frozen while it runs; at the end `route` builds the next level and a short READY opens it
 * in place, since the new world is already on screen.
 */
export class WorldShiftState implements GameState {
	readonly name: PacmanStateName = 'world-shift';
	readonly pausable = true;
	private readonly clock: StateClock<'shift'>;
	private origin = { x: 0, y: 0 };
	private resolved = false;

	constructor(
		readonly kind: WorldShiftKind,
		private readonly route: () => void
	) {
		this.clock = new StateClock([{ name: 'shift', duration: FLOW.worldShift[kind] }]);
	}

	get shift(): WorldShiftSnapshot {
		return { kind: this.kind, ...this.origin };
	}

	enter(ctx: GameStateContext): void {
		const session = ctx.level.ensure();
		const p = session.player.position;
		this.origin =
			Number.isFinite(p.x) && Number.isFinite(p.y)
				? { x: p.x, y: p.y }
				: { x: session.grid.width / 2, y: session.grid.height / 2 };
		ctx.level.emitHud();
	}

	update(ctx: GameStateContext, dt: number): void {
		if (this.resolved || !this.clock.advance(dt)) {
			return;
		}
		this.resolved = true;
		ctx.director.startLevelInPlace(this.route);
	}

	exit(): void {}

	timing(): FlowTiming {
		return this.clock.timing;
	}
}
