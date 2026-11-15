// The Auto graphics setting: it watches how long the frames of play take and steps the render
// quality down while a lower tier really is faster. It never steps up on its own, so the
// picture does not flip back and forth.

import type { RenderQuality } from './renderQuality';

/** A window slower than this is too slow for its tier: under 48 frames a second. */
export const AUTO_SLOW_FRAME_MS = 1000 / 48;
/** A window is this much play, ms, and at least `AUTO_MIN_FRAMES` frames. */
export const AUTO_WINDOW_MS = 2000;
export const AUTO_MIN_FRAMES = 12;
/** Play ignored after a tier change, ms: the world is baked again at its new size. */
export const AUTO_SETTLE_MS = 1500;
/** A lower tier is kept when its frames take at most this share of the tier above's. */
export const AUTO_GAIN = 0.85;
/** A frame longer than this is a stall (a tab coming back, a bake), not the tier's pace. */
const STALL_MS = 1000;

const LOWER: Readonly<Record<RenderQuality, RenderQuality | null>> = {
	high: 'medium',
	medium: 'low',
	low: null
};

/** What Auto has found: the tier, and whether it has stopped looking. */
export interface AutoQualityState {
	readonly quality: RenderQuality;
	readonly settled: boolean;
}

function median(values: readonly number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	const mid = sorted.length >> 1;
	return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export class AutoQuality {
	private tier: RenderQuality;
	private done: boolean;
	private frames: number[] = [];
	private windowMs = 0;
	private skipMs = 0;
	/** The tier just left and its pace: the next window tells whether leaving it helped. */
	private probe: { readonly from: RenderQuality; readonly frameMs: number } | null = null;

	constructor(state: AutoQualityState = { quality: 'high', settled: false }) {
		this.tier = state.quality;
		this.done = state.settled;
	}

	get quality(): RenderQuality {
		return this.tier;
	}

	/** True once Auto has stopped looking: on the lowest tier, or where a lower one is no faster. */
	get settled(): boolean {
		return this.done;
	}

	get state(): AutoQualityState {
		return { quality: this.tier, settled: this.done };
	}

	/**
	 * One frame of play took `frameMs`. Returns the tier to switch to, or null to stay.
	 * A slow window steps one tier down; if the next window is no faster, the fill rate is not
	 * what holds the frames back (a 30 Hz screen, a busy processor): back up, and stop looking.
	 */
	sample(frameMs: number): RenderQuality | null {
		if (this.done || !Number.isFinite(frameMs) || frameMs <= 0 || frameMs > STALL_MS) {
			return null;
		}
		if (this.skipMs > 0) {
			this.skipMs -= frameMs;
			return null;
		}
		this.frames.push(frameMs);
		this.windowMs += frameMs;
		if (this.windowMs < AUTO_WINDOW_MS || this.frames.length < AUTO_MIN_FRAMES) {
			return null;
		}
		const pace = median(this.frames);
		this.frames = [];
		this.windowMs = 0;
		const probe = this.probe;
		this.probe = null;
		if (probe && pace > probe.frameMs * AUTO_GAIN) {
			this.done = true;
			return this.change(probe.from);
		}
		if (pace <= AUTO_SLOW_FRAME_MS) {
			return null;
		}
		const lower = LOWER[this.tier];
		if (!lower) {
			this.done = true;
			return null;
		}
		this.probe = { from: this.tier, frameMs: pace };
		return this.change(lower);
	}

	private change(tier: RenderQuality): RenderQuality {
		this.tier = tier;
		this.skipMs = AUTO_SETTLE_MS;
		return tier;
	}
}
