import type { ModeId } from '../core/modes';
import type { ClearResult, EndReason, Phase, PieceType } from '../core/types';

export interface CellPos {
	x: number;
	y: number;
}

export interface GameSummary {
	mode: ModeId;
	reason: EndReason;
	seed: number;
	timeMs: number;
	holes: number;
	score: number;
	lines: number;
	level: number;
	pieces: number;
	tetrises: number;
	spins: number;
	maxCombo: number;
}

export interface GameEvents {
	reset: { mode: ModeId; seed: number };
	phase: { phase: Phase };
	countdown: { step: number };
	spawn: { type: PieceType };
	move: { dx: number };
	rotate: { kicked: boolean };
	hold: { type: PieceType };
	hardDrop: { cells: CellPos[]; distance: number; type: PieceType };
	lock: { cells: CellPos[]; type: PieceType };
	clear: ClearResult;
	levelUp: { level: number };
	gameOver: GameSummary;
}

export type GameEventName = keyof GameEvents;

type Handler<K extends GameEventName> = (payload: GameEvents[K]) => void;

export class EventBus {
	private readonly handlers = new Map<GameEventName, Set<(payload: never) => void>>();

	on<K extends GameEventName>(event: K, handler: Handler<K>): () => void {
		let set = this.handlers.get(event);
		if (!set) {
			set = new Set();
			this.handlers.set(event, set);
		}
		set.add(handler);
		return () => {
			set.delete(handler);
		};
	}

	emit<K extends GameEventName>(event: K, payload: GameEvents[K]): void {
		const set = this.handlers.get(event);
		if (!set) return;
		for (const handler of set) {
			try {
				(handler as Handler<K>)(payload);
			} catch (error) {
				console.error(`[Tetris/EventBus] Handler for "${event}" failed`, error);
			}
		}
	}

	clear(): void {
		this.handlers.clear();
	}
}
