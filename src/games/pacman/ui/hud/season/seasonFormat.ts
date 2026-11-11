export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/** A score with thin spaces between the thousands. */
export const fmt = (n: number): string =>
	Math.max(0, Math.floor(n)).toLocaleString('en-US').replace(/,/g, ' ');
