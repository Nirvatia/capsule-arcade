// Three candidate icons for the berserk, drawn at the origin, about 64 units across, bold enough
// to read at 30 px: A a fist in flame, B a horned rage mask, C the spiked gauntlet of the pickup.
export type BerserkVariant = 'a' | 'b' | 'c';

const INK = '#2a0c06';

export const BERSERK_ART: Record<BerserkVariant, string> = {
	a: `<path d="M-26 22 C-34 4 -22 -6 -20 -22 C-14 -12 -10 -16 -8 -30 C-2 -20 2 -22 4 -34 C8 -22 14 -18 14 -8 C20 -14 22 -6 24 -2 C34 8 30 20 26 24 C16 32 -16 32 -26 22Z" fill="#ff5a1a" stroke="${INK}" stroke-width="3.6" stroke-linejoin="round"/>
<path d="M-17 22 C-21 10 -13 4 -11 -8 C-7 -2 -3 -6 -1 -18 C3 -8 10 -4 10 4 C16 0 18 10 14 20 C8 28 -10 28 -17 22Z" fill="#ffb040"/>
<rect x="-18" y="-4" width="36" height="27" rx="9" fill="#fbe6c4" stroke="${INK}" stroke-width="3.6"/>
<circle cx="-13.5" cy="-4" r="6.2" fill="#fbe6c4" stroke="${INK}" stroke-width="3.2"/><circle cx="-4.5" cy="-5" r="6.2" fill="#fbe6c4" stroke="${INK}" stroke-width="3.2"/><circle cx="4.5" cy="-5" r="6.2" fill="#fbe6c4" stroke="${INK}" stroke-width="3.2"/><circle cx="13.5" cy="-4" r="6.2" fill="#fbe6c4" stroke="${INK}" stroke-width="3.2"/>
<rect x="-17" y="-3" width="34" height="25" rx="8" fill="#fbe6c4"/>
<path d="M-9 -2 V9 M0 -3 V9 M9 -2 V9" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>
<path d="M-18 11 Q-6 7 7 13 Q11 17 5 21 Q-8 25 -18 21Z" fill="#f0cf9c" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
<path d="M-14 -9 q6 -4 11 -2" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".8"/>`,
	b: `<path d="M-14 -14 C-27 -18 -31 -31 -24 -39 C-24 -28 -16 -24 -8 -22Z" fill="#efe3c8" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/>
<path d="M14 -14 C27 -18 31 -31 24 -39 C24 -28 16 -24 8 -22Z" fill="#efe3c8" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/>
<path d="M0 -24 C-18 -24 -24 -12 -22 0 C-21 8 -16 10 -14 14 L-14 25 L14 25 L14 14 C16 10 21 8 22 0 C24 -12 18 -24 0 -24Z" fill="#efe3c8" stroke="${INK}" stroke-width="3.6" stroke-linejoin="round"/>
<path d="M-18 -14 q4 -6 12 -8" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>
<path d="M-18 -7 L-4 -2 L-6 7 L-17 3Z" fill="#ff4a1a" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
<path d="M18 -7 L4 -2 L6 7 L17 3Z" fill="#ff4a1a" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
<circle cx="-9" cy="0" r="2.6" fill="#fff6d0"/><circle cx="9" cy="0" r="2.6" fill="#fff6d0"/>
<path d="M0 7 L-3.5 15 H3.5Z" fill="${INK}"/>
<path d="M-12 19 H12" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
<path d="M-8 25 V19 M-4 25 V19 M0 25 V19 M4 25 V19 M8 25 V19" stroke="${INK}" stroke-width="2.4"/>`,
	c: `<circle r="30" fill="rgba(255,90,40,.4)"/>
<path d="M-17 -12 L-27 -36 L-9 -16Z M-4 -14 L0 -42 L6 -14Z M9 -16 L27 -36 L17 -12Z" fill="#f2f4f6" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
<path d="M-24 -33 L-20 -26 M0 -38 L1 -28 M24 -33 L20 -26" stroke="#ff7a2a" stroke-width="3.4" stroke-linecap="round"/>
<path d="M-22 15 V-4 Q-22 -14 -12 -14 H14 Q24 -14 24 -4 V15Z" fill="#a39aa0" stroke="${INK}" stroke-width="3.6" stroke-linejoin="round"/>
<path d="M-18 -9 H19" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/>
<path d="M-8 -6 V8 M2 -7 V8 M12 -6 V8" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" opacity=".6"/>
<rect x="-23" y="14" width="46" height="15" rx="4" fill="#5a4a4e" stroke="${INK}" stroke-width="3.6"/>
<circle cx="-15" cy="21.5" r="2.3" fill="#e8dcd6" stroke="${INK}" stroke-width="1.4"/><circle cx="15" cy="21.5" r="2.3" fill="#e8dcd6" stroke="${INK}" stroke-width="1.4"/>`
};

/** The ring and the dial's glow while the berserk runs, per candidate. */
export const BERSERK_RING: Record<BerserkVariant, string> = {
	a: '#ffe08a',
	b: '#ff5a4a',
	c: '#ffb86a'
};
