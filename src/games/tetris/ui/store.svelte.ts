import { ModeId } from '../core/modes';
import { Phase, type PieceType } from '../core/types';
import { loadSettings } from '../settings';
import type { GameSummary } from '../engine/EventBus';
import type { RecordEntry } from '../records';

export const CalloutTone = {
	SMALL: 'small',
	GOOD: 'good',
	GREAT: 'great'
} as const;

export type CalloutTone = (typeof CalloutTone)[keyof typeof CalloutTone];

export interface Callout {
	key: number;
	title: string;
	sub: string;
	points: number;
	tone: CalloutTone;
}

export interface GameResult {
	summary: GameSummary;
	rank: number;
	newBest: boolean;
}

export const ui = $state({
	phase: Phase.IDLE as Phase,
	score: 0,
	lines: 0,
	level: 1,
	hold: null as PieceType | null,
	holdUsed: false,
	next: [] as PieceType[],
	combo: 0,
	backToBack: false,
	mode: ModeId.MARATHON as ModeId,
	elapsedMs: 0,
	settings: loadSettings(),
	callout: null as Callout | null,
	radio: { key: 0, text: '' },
	levelUp: null as { key: number; level: number } | null,
	countdown: null as { key: number; step: number } | null,
	result: null as GameResult | null,
	records: [] as RecordEntry[]
});
