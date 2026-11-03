import { saveScore } from '$shared/utils/scoreStore';
import type { GameSummary } from './engine/EventBus';

export interface RecordEntry {
	score: number;
	lines: number;
	level: number;
	date: number;
}

const KEY = 'neo_arcade_tetris_records';
const LIMIT = 5;

function isEntry(value: unknown): value is RecordEntry {
	if (typeof value !== 'object' || value === null) return false;
	const v = value as Record<string, unknown>;
	return ['score', 'lines', 'level', 'date'].every(
		(k) => typeof v[k] === 'number' && Number.isFinite(v[k])
	);
}

export function loadRecords(): RecordEntry[] {
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return [];
		const parsed: unknown = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed.filter(isEntry).slice(0, LIMIT) : [];
	} catch (error) {
		console.warn('[Tetris/records] Failed to read records', error);
		return [];
	}
}

export function submitRecord(summary: GameSummary): { list: RecordEntry[]; rank: number } {
	const list = loadRecords();
	if (summary.score <= 0) return { list, rank: -1 };
	const entry: RecordEntry = {
		score: summary.score,
		lines: summary.lines,
		level: summary.level,
		date: Date.now()
	};
	const next = [...list, entry].sort((a, b) => b.score - a.score).slice(0, LIMIT);
	const rank = next.indexOf(entry);
	try {
		localStorage.setItem(KEY, JSON.stringify(next));
	} catch (error) {
		console.warn('[Tetris/records] Failed to save records', error);
	}
	saveScore('tetris', summary.score);
	return { list: next, rank };
}

export function bestScore(list: readonly RecordEntry[]): number {
	return list.reduce((best, r) => Math.max(best, r.score), 0);
}
