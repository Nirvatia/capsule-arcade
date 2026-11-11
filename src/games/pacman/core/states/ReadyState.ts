import type { GameState, GameStateContext } from '../flow/GameState';
import { StateClock } from '../flow/StateClock';
import type { FlowTiming } from '../flow/StateClock';
import type { PacmanStateName } from '../Events';
import { FLOW } from '../../config/flowConfig';

/** `intro` opens a new game (long, with the jingle); `short` follows a death or level change. */
export type ReadyKind = 'intro' | 'short';

export class ReadyState implements GameState {
	readonly name: PacmanStateName = 'ready';
	readonly pausable = true;
	readonly kind: ReadyKind;
	/** This READY follows a death: the screen then shows the lives left. */
	readonly afterDeath: boolean;
	private readonly clock: StateClock<ReadyKind>;

	constructor(kind: ReadyKind, afterDeath = false) {
		this.kind = kind;
		this.afterDeath = afterDeath;
		this.clock = new StateClock([
			{ name: kind, duration: kind === 'intro' ? FLOW.readyIntro : FLOW.readyShort }
		]);
	}

	enter(ctx: GameStateContext): void {
		ctx.level.ensure();
		ctx.level.emitHud();
		if (this.kind === 'intro') {
			ctx.events.emit('audio:cue', { cue: 'intro' });
		}
	}

	update(ctx: GameStateContext, dt: number): void {
		if (this.clock.advance(dt)) {
			ctx.director.showPlaying();
		}
	}

	exit(): void {}

	timing(): FlowTiming {
		return this.clock.timing;
	}
}
