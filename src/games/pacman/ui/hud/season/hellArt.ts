/**
 * The hell's own shapes for the boss-level HUD (the same cel style as `seasonArt`, in bone, flesh
 * and ember): the hero's hearts on a bone rail, and the
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
	// the «Плоть» kit's guns (`render/doom/fleshKit`): the Maw «Жерло» and the Sting «Жало»
	bfg: '<path d="M-34 -4 L-24 -8 L-24 10 L-33 13Z" fill="#e4d4b0" stroke="#1a0406" stroke-width="3" stroke-linejoin="round"/><path d="M-12 12 L-4 12 L-7 28 L-15 28Z" fill="#3a4048" stroke="#1a0406" stroke-width="3" stroke-linejoin="round"/><rect x="-25" y="-13" width="34" height="26" rx="6" fill="#5c6470" stroke="#1a0406" stroke-width="3.4"/><rect x="-23" y="-11" width="30" height="6" rx="3" fill="#a8b0ba"/><rect x="-19" y="-3" width="3.6" height="9" rx="1.5" fill="#ffb040"/><rect x="-12" y="-3" width="3.6" height="9" rx="1.5" fill="#ffb040"/><rect x="-5" y="-3" width="3.6" height="9" rx="1.5" fill="#ffb040"/><rect x="9" y="-8" width="13" height="16" fill="#5c6470" stroke="#1a0406" stroke-width="3"/><path d="M20 -10 L33 -19 L33 19 L20 10Z" fill="#e4d4b0" stroke="#1a0406" stroke-width="3.2" stroke-linejoin="round"/><ellipse cx="31" cy="0" rx="4" ry="14" fill="#ffb040" stroke="#1a0406" stroke-width="2.4"/><ellipse cx="31" cy="0" rx="2" ry="8" fill="#fff6d0"/>',
	plasma:
		'<path d="M-34 -3 L-23 -6 L-23 5 L-33 8Z" fill="#e4d4b0" stroke="#1a0406" stroke-width="3" stroke-linejoin="round"/><path d="M-13 6 L-7 6 L-9 21 L-15 21Z" fill="#3a4048" stroke="#1a0406" stroke-width="3" stroke-linejoin="round"/><rect x="-24" y="-7" width="25" height="14" rx="4" fill="#5c6470" stroke="#1a0406" stroke-width="3"/><rect x="-20" y="-17" width="15" height="9" rx="4.5" fill="#4ed0f4" stroke="#1a0406" stroke-width="2.6"/><rect x="1" y="-3.5" width="24" height="7" fill="#5c6470" stroke="#1a0406" stroke-width="2.6"/><rect x="6" y="-6" width="3" height="12" rx="1.2" fill="#7fe6ff"/><rect x="13" y="-6" width="3" height="12" rx="1.2" fill="#7fe6ff"/><rect x="20" y="-6" width="3" height="12" rx="1.2" fill="#7fe6ff"/><path d="M24 -6 L34 0 L24 6Z" fill="#e4d4b0" stroke="#1a0406" stroke-width="2.6" stroke-linejoin="round"/>',
	berserk: `<path d="M-26 22 C-34 4 -22 -6 -20 -22 C-14 -12 -10 -16 -8 -30 C-2 -20 2 -22 4 -34 C8 -22 14 -18 14 -8 C20 -14 22 -6 24 -2 C34 8 30 20 26 24 C16 32 -16 32 -26 22Z" fill="#ff5a1a" stroke="#2a0c06" stroke-width="3.6" stroke-linejoin="round"/>
<path d="M-17 22 C-21 10 -13 4 -11 -8 C-7 -2 -3 -6 -1 -18 C3 -8 10 -4 10 4 C16 0 18 10 14 20 C8 28 -10 28 -17 22Z" fill="#ffb040"/>
<rect x="-18" y="-4" width="36" height="27" rx="9" fill="#fbe6c4" stroke="#2a0c06" stroke-width="3.6"/>
<circle cx="-13.5" cy="-4" r="6.2" fill="#fbe6c4" stroke="#2a0c06" stroke-width="3.2"/><circle cx="-4.5" cy="-5" r="6.2" fill="#fbe6c4" stroke="#2a0c06" stroke-width="3.2"/><circle cx="4.5" cy="-5" r="6.2" fill="#fbe6c4" stroke="#2a0c06" stroke-width="3.2"/><circle cx="13.5" cy="-4" r="6.2" fill="#fbe6c4" stroke="#2a0c06" stroke-width="3.2"/>
<rect x="-17" y="-3" width="34" height="25" rx="8" fill="#fbe6c4"/>
<path d="M-9 -2 V9 M0 -3 V9 M9 -2 V9" stroke="#2a0c06" stroke-width="2.4" stroke-linecap="round"/>
<path d="M-18 11 Q-6 7 7 13 Q11 17 5 21 Q-8 25 -18 21Z" fill="#f0cf9c" stroke="#2a0c06" stroke-width="3" stroke-linejoin="round"/>
<path d="M-14 -9 q6 -4 11 -2" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".8"/>`
} as const;

export type WeaponArtKey = keyof typeof WEAPON_ART;

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
