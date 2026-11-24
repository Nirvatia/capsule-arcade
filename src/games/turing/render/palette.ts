// The shared look of «Каретка»: one palette and three fonts for the canvas and the UI.
export const C = {
	night: '#0a0d16',
	night2: '#0e121c',
	wall: '#151a27',
	wall2: '#1b2131',
	steel: '#2f3648',
	steelHi: '#4a536a',
	steelLo: '#1c212e',
	rail: '#a3abbf',
	glow: '#4fe3ff',
	mint: '#45f0ad',
	pink: '#ff4f93',
	sun: '#ffd24a',
	violet: '#a690ff',
	coral: '#ff6a4d',
	coralHi: '#ffa27a',
	coralLo: '#c63f2d',
	paper: '#f6efdf',
	paperHi: '#fffaf0',
	paperLo: '#d6c9ae',
	paperEdge: '#a8987a',
	ink: '#1a2140',
	screen: '#0a1226'
} as const;

/** Interface tokens: neutral panels, one accent (the carriage), yellow = «сейчас», green/red only for results. */
export const U = {
	panel: '#161b27',
	panelHi: '#1d2332',
	socket: '#10141d',
	line: 'rgba(255,255,255,.07)',
	lineHi: 'rgba(255,255,255,.16)',
	text: '#e9edf5',
	muted: '#7f889b',
	dim: '#454c5e',
	accent: '#ff6a4d',
	now: '#ffd24a',
	ok: '#45d98f',
	bad: '#ff5a6e'
} as const;

export const FONT_MONO = "'JetBrains Mono', ui-monospace, monospace";
export const FONT_HEAD = "'Unbounded', system-ui, sans-serif";
export const FONT_HUD = "'Tektur', system-ui, sans-serif";

/** Deterministic 0..1 noise for scenery that must not flicker between frames. */
export function hash(n: number): number {
	const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
	return s - Math.floor(s);
}
