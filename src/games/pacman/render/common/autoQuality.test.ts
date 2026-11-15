import { describe, expect, it } from 'vitest';
import { AutoQuality, AUTO_SETTLE_MS, AUTO_SLOW_FRAME_MS, AUTO_WINDOW_MS } from './autoQuality';
import type { RenderQuality } from './renderQuality';

/** Feeds `ms` of play at `frameMs` a frame; returns every tier change on the way. */
function play(auto: AutoQuality, frameMs: number, ms: number): RenderQuality[] {
	const changes: RenderQuality[] = [];
	for (let t = 0; t < ms; t += frameMs) {
		const next = auto.sample(frameMs);
		if (next) {
			changes.push(next);
		}
	}
	return changes;
}

const FAST = 1000 / 60;
const SLOW = 40;
const WINDOW = AUTO_WINDOW_MS + AUTO_SETTLE_MS + 500;

describe('auto quality', () => {
	it('keeps the tier while the frames are fast enough', () => {
		const auto = new AutoQuality();
		expect(play(auto, FAST, 20000)).toEqual([]);
		expect(play(auto, AUTO_SLOW_FRAME_MS - 0.5, 20000)).toEqual([]);
		expect(auto.state).toEqual({ quality: 'high', settled: false });
	});

	it('steps down when a window of play is slow and keeps the tier that is faster', () => {
		const auto = new AutoQuality();
		expect(play(auto, SLOW, WINDOW)).toEqual(['medium']);
		// Medium holds the frame rate: Auto stays there and keeps watching
		expect(play(auto, FAST, 20000)).toEqual([]);
		expect(auto.state).toEqual({ quality: 'medium', settled: false });
	});

	it('goes on to Low when Medium is faster but still slow, and stops there', () => {
		const auto = new AutoQuality();
		expect(play(auto, 60, WINDOW)).toEqual(['medium']);
		expect(play(auto, 40, WINDOW)).toEqual(['low']);
		expect(play(auto, 30, 20000)).toEqual([]);
		expect(auto.state).toEqual({ quality: 'low', settled: true });
	});

	it('goes back up and stops when the lower tier is no faster (a 30 Hz screen)', () => {
		const auto = new AutoQuality();
		const frame = 1000 / 30;
		expect(play(auto, frame, WINDOW)).toEqual(['medium']);
		expect(play(auto, frame, WINDOW)).toEqual(['high']);
		expect(auto.state).toEqual({ quality: 'high', settled: true });
		expect(play(auto, frame, 20000)).toEqual([]);
	});

	it('does not judge a tier by the frames right after a change or by a stall', () => {
		const auto = new AutoQuality();
		expect(play(auto, SLOW, AUTO_WINDOW_MS + SLOW)).toEqual(['medium']);
		// the world is baked again at the new size: these slow frames are not Medium's pace
		expect(play(auto, 200, AUTO_SETTLE_MS)).toEqual([]);
		expect(play(auto, FAST, 20000)).toEqual([]);
		expect(auto.quality).toBe('medium');
		// a tab coming back delivers one huge frame
		expect(auto.sample(5000)).toBeNull();
		expect(auto.sample(Number.NaN)).toBeNull();
		expect(auto.quality).toBe('medium');
	});

	it('starts from what it found before, and a settled Auto does not look again', () => {
		const found = new AutoQuality({ quality: 'medium', settled: false });
		expect(found.quality).toBe('medium');
		expect(play(found, SLOW, WINDOW)).toEqual(['low']);

		const settled = new AutoQuality({ quality: 'medium', settled: true });
		expect(play(settled, SLOW, 20000)).toEqual([]);
		expect(settled.quality).toBe('medium');
	});
});
