// The shared look of «Каретка»: one palette and three fonts for the canvas and the UI.
export const C = {
	night: '#080c1b',
	night2: '#0e1530',
	wall: '#141d3c',
	wall2: '#1b2652',
	steel: '#2b3763',
	steelHi: '#46558c',
	steelLo: '#1a2245',
	rail: '#9aa6d1',
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

export const FONT_MONO = "'JetBrains Mono', ui-monospace, monospace";
export const FONT_HEAD = "'Unbounded', system-ui, sans-serif";
export const FONT_HUD = "'Tektur', system-ui, sans-serif";

/** Deterministic 0..1 noise for scenery that must not flicker between frames. */
export function hash(n: number): number {
	const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
	return s - Math.floor(s);
}
