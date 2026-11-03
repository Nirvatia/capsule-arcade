import { Phase, type PieceType } from '../core/types';
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

const MUTE_KEY = 'neo_arcade_tetris_muted';

function readMuted(): boolean {
	try {
		return localStorage.getItem(MUTE_KEY) === '1';
	} catch {
		return false;
	}
}

export function persistMuted(muted: boolean): void {
	try {
		localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
	} catch (error) {
		console.warn('[Tetris/store] Failed to save mute flag', error);
	}
}

export const ui = $state({
	phase: Phase.IDLE as Phase,
	score: 0,
	lines: 0,
	level: 1,
	best: 0,
	hold: null as PieceType | null,
	holdUsed: false,
	next: [] as PieceType[],
	combo: 0,
	backToBack: false,
	muted: readMuted(),
	callout: null as Callout | null,
	levelUp: null as { key: number; level: number } | null,
	countdown: null as { key: number; step: number } | null,
	result: null as GameResult | null,
	records: [] as RecordEntry[]
});
