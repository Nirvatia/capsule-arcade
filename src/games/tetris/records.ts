import { saveScore } from '$shared/utils/scoreStore';
import { isModeId, MODES, type ModeId } from './core/modes';
import { EndReason } from './core/types';
import type { GameSummary } from './engine/EventBus';

export interface RecordEntry {
	score: number;
	lines: number;
	level: number;
	timeMs: number;
	date: number;
}

type RecordBook = Record<ModeId, RecordEntry[]>;

const KEY = 'neo_arcade_tetris_records_v2';
const LEGACY_KEY = 'neo_arcade_tetris_records';
const LIMIT = 5;

function isEntry(value: unknown): value is RecordEntry {
	if (typeof value !== 'object' || value === null) return false;
	const v = value as Record<string, unknown>;
	return ['score', 'lines', 'level', 'date'].every(
		(k) => typeof v[k] === 'number' && Number.isFinite(v[k])
	);
}

function toEntry(value: RecordEntry): RecordEntry {
	return { ...value, timeMs: Number.isFinite(value.timeMs) ? value.timeMs : 0 };
}

function compare(mode: ModeId): (a: RecordEntry, b: RecordEntry) => number {
	return MODES[mode].rankByTime ? (a, b) => a.timeMs - b.timeMs : (a, b) => b.score - a.score;
}

function emptyBook(): RecordBook {
	return { marathon: [], sprint: [], ultra: [] };
}

function readBook(): RecordBook {
	const book = emptyBook();
	try {
		const raw = localStorage.getItem(KEY);
		if (raw) {
			const parsed: unknown = JSON.parse(raw);
			if (typeof parsed === 'object' && parsed !== null) {
				for (const [mode, list] of Object.entries(parsed)) {
					if (isModeId(mode) && Array.isArray(list)) {
						book[mode] = list.filter(isEntry).map(toEntry).sort(compare(mode)).slice(0, LIMIT);
					}
				}
			}
			return book;
		}
		const legacy = localStorage.getItem(LEGACY_KEY);
		if (legacy) {
			const parsed: unknown = JSON.parse(legacy);
			if (Array.isArray(parsed)) {
				book.marathon = parsed.filter(isEntry).map(toEntry).slice(0, LIMIT);
			}
		}
	} catch (error) {
		console.warn('[Tetris/records] Failed to read records', error);
	}
	return book;
}

export function loadRecords(mode: ModeId): RecordEntry[] {
	return readBook()[mode];
}

export function qualifies(summary: GameSummary): boolean {
	if (MODES[summary.mode].rankByTime) return summary.reason === EndReason.GOAL;
	return summary.score > 0;
}

export function submitRecord(summary: GameSummary): { list: RecordEntry[]; rank: number } {
	const book = readBook();
	const list = book[summary.mode];
	if (!qualifies(summary)) return { list, rank: -1 };
	const entry: RecordEntry = {
		score: summary.score,
		lines: summary.lines,
		level: summary.level,
		timeMs: summary.timeMs,
		date: Date.now()
	};
	const next = [...list, entry].sort(compare(summary.mode)).slice(0, LIMIT);
	book[summary.mode] = next;
	try {
		localStorage.setItem(KEY, JSON.stringify(book));
	} catch (error) {
		console.warn('[Tetris/records] Failed to save records', error);
	}
	saveScore('tetris', summary.score);
	return { list: next, rank: next.indexOf(entry) };
}

export function isBetter(mode: ModeId, a: RecordEntry | undefined, summary: GameSummary): boolean {
	if (!a) return false;
	return MODES[mode].rankByTime ? summary.timeMs < a.timeMs : summary.score > a.score;
}
