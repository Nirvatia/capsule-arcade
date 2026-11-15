/** Clamps `value` into [min, max]; a non-finite value falls back to `min`. */
export function clamp(value: number, min: number, max: number): number {
	if (!Number.isFinite(value)) {
		return min;
	}
	return Math.min(max, Math.max(min, value));
}

/**
 * Eases `value` towards `target` by the share `ease` and lands on the target once it is within
 * `near` of it: plain easing only ever gets closer, and what waits for the end waits for ever.
 */
export function settle(value: number, target: number, ease: number, near: number): number {
	const next = value + (target - value) * ease;
	return Math.abs(target - next) < near ? target : next;
}
