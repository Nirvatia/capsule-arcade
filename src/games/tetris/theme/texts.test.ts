import { describe, expect, it } from 'vitest';
import { ModeId } from '../core/modes';
import { EndReason } from '../core/types';
import { fillTemplate, levelName, RADIO, rankFor } from './texts';

describe('theme texts', () => {
	it('names every level and clamps out of range values', () => {
		expect(levelName(1)).toBe('Котлован');
		expect(levelName(7)).toBe('Плотина');
		expect(levelName(20)).toBe('Коммунизм');
		expect(levelName(99)).toBe('Коммунизм');
		expect(levelName(0)).toBe('Котлован');
	});

	it('ranks by score with progress to the next title', () => {
		const r = rankFor({ mode: ModeId.MARATHON, reason: EndReason.TOPOUT, score: 48720, timeMs: 0 });
		expect(r.rank.short).toBe('Ударник');
		expect(r.next?.short).toBe('Стахановец');
		expect(r.toNext).toBe(100000 - 48720);
		expect(r.fraction).toBeGreaterThan(0);
		expect(r.fraction).toBeLessThan(1);
	});

	it('ranks sprint by time only when finished', () => {
		const done = rankFor({ mode: ModeId.SPRINT, reason: EndReason.GOAL, score: 0, timeMs: 85000 });
		expect(done.rank.short).toBe('Стахановец');
		const failed = rankFor({
			mode: ModeId.SPRINT,
			reason: EndReason.TOPOUT,
			score: 0,
			timeMs: 30000
		});
		expect(failed.rank.short).toBe('Стажёр');
	});

	it('fills templates and keeps unknown keys', () => {
		expect(fillTemplate('№{n} «{name}» {x}', { n: 7, name: 'Плотина' })).toBe('№7 «Плотина» {x}');
	});

	it('has phrases for every radio topic', () => {
		for (const lines of Object.values(RADIO)) expect(lines.length).toBeGreaterThan(0);
	});
});
