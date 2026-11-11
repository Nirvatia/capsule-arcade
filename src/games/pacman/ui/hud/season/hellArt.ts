/**
 * The hell's own shapes for the boss-level HUD (the same cel style as `seasonArt`, in bone, flesh
 * and ember): the boss's health bar in a bone frame, the hero's hearts on a bone rail, and the
 * weapons that sit in the dial. Everything is markup; the numbers and fills are the component's.
 */
import type { SeasonTheme } from './seasonThemes';

const BONE = '#e8d9bd';
const BONE_SHADE = '#8c7a5c';

/** A heart drawn at the origin, about 40 units across. */
export function heartArt(full: boolean): string {
	if (!full) {
		return '<path d="M0 18 C-26 2 -20 -18 -8 -16 C-3 -15 0 -10 0 -8 C0 -10 3 -15 8 -16 C20 -18 26 2 0 18 Z" fill="#1a0a0e" stroke="#16060a" stroke-width="3.4" stroke-linejoin="round"/><path d="M0 12 C-18 0 -14 -12 -6 -11 C-2 -10 0 -6 0 -5 C0 -6 2 -10 6 -11 C14 -12 18 0 0 12Z" fill="none" stroke="#5a2a2e" stroke-width="2" opacity=".8"/>';
	}
	return '<path d="M0 18 C-26 2 -20 -18 -8 -16 C-3 -15 0 -10 0 -8 C0 -10 3 -15 8 -16 C20 -18 26 2 0 18 Z" fill="#c8242a" stroke="#16060a" stroke-width="3.4" stroke-linejoin="round"/><path d="M-12 -10 q4 -5 8 -3" fill="none" stroke="#ff9a8a" stroke-width="3" stroke-linecap="round" opacity=".8"/>';
}

/** The weapons, drawn at the origin, roughly 60 units across. */
export const WEAPON_ART = {
	bfg: '<rect x="-34" y="-12" width="52" height="24" rx="6" fill="#3a4a3a" stroke="#0a140a" stroke-width="4"/><rect x="-28" y="-6" width="30" height="5" rx="2" fill="#6a8a6a"/><circle cx="26" cy="0" r="16" fill="#7dff5a" stroke="#0a140a" stroke-width="4"/><circle cx="26" cy="0" r="8" fill="#e8ffd9"/><path d="M-20 12 L-26 28 H-12 L-8 12Z" fill="#3a4a3a" stroke="#0a140a" stroke-width="3" stroke-linejoin="round"/>',
	barrel:
		'<rect x="-20" y="-28" width="40" height="56" rx="8" fill="#b8821a" stroke="#2a1a04" stroke-width="4"/><rect x="-20" y="-14" width="40" height="7" fill="#6a4a0a" stroke="#2a1a04" stroke-width="2.4"/><rect x="-20" y="8" width="40" height="7" fill="#6a4a0a" stroke="#2a1a04" stroke-width="2.4"/><circle cx="0" cy="-1" r="7" fill="#ffe05a" stroke="#2a1a04" stroke-width="2.4"/><path d="M-12 -24 q4 -3 12 -3" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".5"/>',
	berserk:
		'<path d="M-24 -4 L-24 -22 Q-24 -30 -16 -30 L-12 -30 L-12 -34 Q-12 -40 -5 -40 Q2 -40 2 -34 L2 -32 Q10 -36 14 -30 Q16 -24 12 -22 L20 -20 Q28 -14 24 -2 L18 22 Q14 32 4 32 L-10 32 Q-22 32 -24 20Z" fill="#ff8a2a" stroke="#4a1608" stroke-width="4" stroke-linejoin="round"/><path d="M-14 -22 V-8 M-4 -30 V-8 M6 -26 V-8" stroke="#4a1608" stroke-width="3" stroke-linecap="round"/><path d="M-18 -6 q16 -6 34 0" fill="none" stroke="#ffd08a" stroke-width="3" stroke-linecap="round" opacity=".8"/>'
} as const;

export type WeaponArtKey = keyof typeof WEAPON_ART;

/**
 * The boss's bar frame: a bone rail with a dark slot of `slots` equal compartments (the phases)
 * and a bone peg between them. `x, y, w, h` is the slot area; the fills are drawn over it.
 */
export function bossFrameArt(
	t: SeasonTheme,
	x: number,
	y: number,
	w: number,
	h: number,
	slots = 3,
	gap = 5
): string {
	let s = `<rect x="${x - 7}" y="${y - 7}" width="${w + 14}" height="${h + 14}" rx="${(h + 14) / 2}" fill="${t.ink}"/>`;
	s += `<rect x="${x - 4}" y="${y - 4}" width="${w + 8}" height="${h + 8}" rx="${(h + 8) / 2}" fill="${BONE}" stroke="${t.ink}" stroke-width="2"/>`;
	s += `<rect x="${x - 4}" y="${y + h * 0.55}" width="${w + 8}" height="${h * 0.45 + 4}" rx="${(h + 8) / 2}" fill="${BONE_SHADE}" opacity=".5"/>`;
	const cw = (w - gap * (slots - 1)) / slots;
	for (let i = 0; i < slots; i += 1) {
		s += `<rect x="${x + i * (cw + gap)}" y="${y}" width="${cw}" height="${h}" rx="${h / 2.6}" fill="#16060a"/>`;
	}
	for (let i = 1; i < slots; i += 1) {
		const px = x + i * (cw + gap) - gap / 2;
		s += `<rect x="${px - 3}" y="${y - 6}" width="6" height="${h + 12}" rx="3" fill="${BONE}" stroke="${t.ink}" stroke-width="2"/>`;
	}
	return s;
}

/** Where the compartments of `bossFrameArt` lie, for the fills. */
export function bossSlots(
	x: number,
	w: number,
	slots = 3,
	gap = 5
): ReadonlyArray<{ readonly x: number; readonly w: number }> {
	const cw = (w - gap * (slots - 1)) / slots;
	return Array.from({ length: slots }, (_, i) => ({ x: x + i * (cw + gap), w: cw }));
}

/** A short bone rail the hearts rest on. */
export function railArt(t: SeasonTheme, x: number, y: number, w: number): string {
	let s = `<rect x="${x}" y="${y}" width="${w}" height="16" rx="8" fill="${t.ink}"/>`;
	s += `<rect x="${x + 2.5}" y="${y + 2.5}" width="${w - 5}" height="11" rx="5.5" fill="${BONE}"/>`;
	s += `<rect x="${x + 2.5}" y="${y + 8}" width="${w - 5}" height="5.5" rx="2.7" fill="${BONE_SHADE}" opacity=".55"/>`;
	for (const kx of [x + 4, x + w - 4]) {
		s += `<circle cx="${kx}" cy="${y + 8}" r="9" fill="${BONE}" stroke="${t.ink}" stroke-width="3"/>`;
	}
	return s;
}
