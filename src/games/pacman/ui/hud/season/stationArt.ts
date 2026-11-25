/**
 * The station's own shapes for its HUD (the same cel style as `seasonArt`, in steel): the shelf
 * the hero's hearts sit on, and the lure in the dial.
 */
import type { SeasonTheme } from './seasonThemes';

/** A steel shelf with two rivets. */
export function stationRailArt(t: SeasonTheme, x: number, y: number, w: number): string {
	let s = `<rect x="${x}" y="${y}" width="${w}" height="14" rx="3" fill="${t.ink}"/>`;
	s += `<rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="10" rx="2" fill="${t.light}"/>`;
	s += `<rect x="${x + 2}" y="${y + 7}" width="${w - 4}" height="5" rx="1.5" fill="${t.shade}" opacity=".6"/>`;
	for (const kx of [x + 7, x + w - 7]) {
		s += `<circle cx="${kx}" cy="${y + 7}" r="2.4" fill="${t.shade}" stroke="${t.ink}" stroke-width="1.2"/>`;
	}
	return s;
}

/** The lure: a beacon with its rings, about 60 units across. */
export const LURE_ART =
	'<circle r="24" fill="none" stroke="#96e6ff" stroke-width="3" opacity=".45"/><circle r="15" fill="none" stroke="#96e6ff" stroke-width="3.4" opacity=".8"/><circle r="8" fill="#e6faff" stroke="#0b1110" stroke-width="3"/>';
