/**
 * The shapes of the season HUD as SVG markup (the owner's mock-up, in code): signboards on
 * stakes, a rope tag, a cloth banner, a log, a pellet trail, a dial with the world's energizer,
 * a knob. Cel style like the heroes: hard tone bands, a thick ink line, a rim glint, a shadow
 * on the ground. Static per world; the numbers and the ring are drawn by the component.
 */
import type { SeasonTheme } from './seasonThemes';

function mul(seed: number): () => number {
	let s = seed >>> 0;
	return () => {
		s = (s + 0x6d2b79f5) >>> 0;
		let t = s;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** A rounded rectangle with slightly uneven corners, as a path. */
function rr(
	x: number,
	y: number,
	w: number,
	h: number,
	r: number,
	j: number,
	seed: number
): string {
	const q = mul(seed);
	const a = () => (q() - 0.5) * j;
	return [
		'M',
		x + r + a(),
		y + a(),
		'H',
		x + w - r + a(),
		'Q',
		x + w + a(),
		y + a(),
		x + w + a(),
		y + r + a(),
		'V',
		y + h - r + a(),
		'Q',
		x + w + a(),
		y + h + a(),
		x + w - r + a(),
		y + h + a(),
		'H',
		x + r + a(),
		'Q',
		x + a(),
		y + h + a(),
		x + a(),
		y + h - r + a(),
		'V',
		y + r + a(),
		'Q',
		x + a(),
		y + a(),
		x + r + a(),
		y + a(),
		'Z'
	].join(' ');
}

const shadow = (cx: number, cy: number, rx: number, ry: number, o = 0.3): string =>
	`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#000" opacity="${o}"/>`;

function material(
	t: SeasonTheme,
	x: number,
	y: number,
	w: number,
	h: number,
	seed: number
): string {
	const q = mul(seed + 7);
	let s = '';
	if (t.key === 'winter') {
		for (let i = 0; i < 3; i += 1) {
			const fx = x + 30 + q() * (w - 80);
			const fy = y + 10 + q() * (h * 0.5);
			s += `<path d="M${fx} ${fy} l26 -14 l8 6 l-26 14 z" fill="#fff" opacity=".55"/>`;
		}
		return s;
	}
	for (let g = 0; g < 4; g += 1) {
		const gy = y + h * (0.2 + g * 0.2) + q() * 5;
		s += `<path d="M${x + 8} ${gy} q${w * 0.25} ${q() * 7 - 3.5} ${w * 0.5} 0 t${w * 0.5 - 16} ${q() * 5 - 2.5}" fill="none" stroke="${t.grain}" stroke-width="2" opacity=".42"/>`;
	}
	return s;
}

export interface BoardOptions {
	readonly seed?: number;
	/** How far the stakes go below the board. */
	readonly drop?: number;
	readonly posts?: boolean;
	readonly r?: number;
	readonly j?: number;
}

/** A signboard on two stakes: its ground shadow, stakes, cel-banded board, ink line and glint. */
export function boardArt(
	t: SeasonTheme,
	name: string,
	x: number,
	y: number,
	w: number,
	h: number,
	o: BoardOptions = {}
): string {
	const seed = o.seed ?? 3;
	const drop = o.drop ?? 40;
	const d = rr(x, y, w, h, o.r ?? 14, o.j ?? 5, seed);
	const cid = `shud-${t.key}-${name}`;
	let s = '';
	if (o.posts !== false) {
		const py2 = y + h + drop;
		s += shadow(x + w / 2 + 12, py2 + 4, w * 0.5, 9, 0.28);
		for (const px of [x + w * 0.2, x + w * 0.8]) {
			s += `<rect x="${px - 7}" y="${y + h - 8}" width="14" height="${drop + 8}" rx="4" fill="${t.post}" stroke="${t.ink}" stroke-width="3"/>`;
			s += `<rect x="${px - 4}" y="${y + h - 6}" width="4" height="${drop + 4}" fill="#fff" opacity=".22"/>`;
			if (t.key === 'winter') {
				s += `<ellipse cx="${px}" cy="${py2 + 2}" rx="22" ry="8" fill="#fff" stroke="${t.ink}" stroke-width="2.5"/>`;
			}
		}
	}
	s += `<path d="${d}" fill="${t.mid}"/>`;
	s += `<clipPath id="${cid}"><path d="${d}"/></clipPath><g clip-path="url(#${cid})">`;
	s += `<ellipse cx="${x + w * 0.3}" cy="${y + h * 0.12}" rx="${w * 0.62}" ry="${h * 0.4}" fill="${t.light}" opacity=".85"/>`;
	s += `<rect x="${x}" y="${y + h * 0.74}" width="${w}" height="${h * 0.3}" fill="${t.shade}" opacity=".9"/>`;
	s += material(t, x, y, w, h, seed);
	s += '</g>';
	s += `<path d="${d}" fill="none" stroke="${t.ink}" stroke-width="4.5" stroke-linejoin="round"/>`;
	s += `<path d="M${x + 14} ${y + 7} H${x + w * 0.55}" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".5"/>`;
	for (const nx of [x + 12, x + w - 12]) {
		s += `<circle cx="${nx}" cy="${y + 13}" r="3.2" fill="${t.ink}" opacity=".75"/>`;
	}
	return s;
}

/** Two ropes from the score board's lower edge down to the record tag. */
export function ropesArt(t: SeasonTheme): string {
	const d = 'M74 132 L82 160 M192 132 L184 160';
	return `<path d="${d}" stroke="${t.rope}" stroke-width="3.4" stroke-linecap="round"/><path d="${d}" stroke="${t.ink}" stroke-width="1.2" opacity=".6"/>`;
}

/** The cloth banner hung under the level board. */
export function bannerArt(t: SeasonTheme): string {
	let s = `<path d="M1084 132 L1090 148 M1210 132 L1204 148" stroke="${t.rope}" stroke-width="3.2" stroke-linecap="round"/>`;
	s += `<path d="M1076 146 H1218 L1210 160 L1218 174 H1076 L1084 160Z" fill="${t.cloth}" stroke="${t.ink}" stroke-width="3.4" stroke-linejoin="round"/>`;
	s += `<path d="M1076 146 H1218 L1214 152 H1080Z" fill="#fff" opacity=".25"/><path d="M1076 168 H1218 V174 H1076Z" fill="${t.clothShade}" opacity=".8"/>`;
	return s;
}

/** The eaten and the uneaten pellets of the food trail; `eaten` of `n` are holes. */
export function trailArt(t: SeasonTheme, eaten: number, n = 14): string {
	const py = 308;
	let s = `<path d="M1056 ${py} Q1100 ${py - 14} 1150 ${py} T1244 ${py}" fill="none" stroke="${t.ink}" stroke-width="10" stroke-linecap="round" opacity=".35"/>`;
	for (let i = 0; i < n; i += 1) {
		const u = i / (n - 1);
		const x = 1056 + 188 * u;
		const y = py - 8 * Math.sin(u * Math.PI * 2);
		if (i < eaten) {
			s += `<circle cx="${x}" cy="${y}" r="4.6" fill="#241a10" opacity=".45"/>`;
		} else {
			s += `<circle cx="${x}" cy="${y}" r="6" fill="${t.pellet}" stroke="${t.pelletInk}" stroke-width="2.2"/><circle cx="${x - 1.6}" cy="${y - 1.6}" r="1.7" fill="#fff" opacity=".7"/>`;
		}
	}
	return s;
}

/** The dial the energizer sits in: a stone ring in the ground with a dark well. */
export const DIAL = { cx: 1196, cy: 410, r: 34 } as const;

export function dialArt(t: SeasonTheme): string {
	const { cx, cy, r } = DIAL;
	let s = shadow(cx + 4, cy + 48, 54, 8, 0.3);
	s += `<circle cx="${cx}" cy="${cy}" r="${r + 11}" fill="${t.shade}" stroke="${t.ink}" stroke-width="4"/><circle cx="${cx}" cy="${cy}" r="${r + 5}" fill="${t.mid}"/>`;
	s += `<path d="M${cx - r - 3} ${cy - 12} A${r + 3} ${r + 3} 0 0 1 ${cx + 12} ${cy - r - 3}" fill="none" stroke="${t.light}" stroke-width="5" stroke-linecap="round" opacity=".8"/>`;
	s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#10140f" opacity=".72" stroke="${t.ink}" stroke-width="2.6"/>`;
	s += `<circle cx="${cx}" cy="${cy}" r="${r - 5}" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="6"/>`;
	return s;
}

/** The circumference of the timer ring. */
export const RING_LENGTH = 2 * Math.PI * (DIAL.r - 5);

/** The pause knob, drawn at the origin. */
export function knobArt(t: SeasonTheme): string {
	return `<circle r="23" fill="${t.mid}" stroke="${t.ink}" stroke-width="4"/><path d="M-17 -8 A19 19 0 0 1 8 -17" fill="none" stroke="${t.light}" stroke-width="4" stroke-linecap="round" opacity=".85"/>`;
}

/** Icons drawn at the origin, roughly 40 units across. */
export function heroArt(ms: boolean): string {
	let s =
		'<circle r="20" fill="#ffc61a" stroke="#2a1a05" stroke-width="3.4"/><path d="M0 0 L19 -9 A21 21 0 0 1 19 9 Z" fill="#3a1d05" stroke="#2a1a05" stroke-width="2.5" stroke-linejoin="round"/><ellipse cx="-7" cy="-9" rx="8" ry="5" fill="#fff" opacity=".6" transform="rotate(-25 -7 -9)"/>';
	if (ms) {
		s +=
			'<path d="M-3 -19 L-14 -27 L-14 -12Z M-3 -19 L8 -27 L8 -12Z" fill="#e0243c" stroke="#3a0a10" stroke-width="2.4" stroke-linejoin="round"/><circle cx="-3" cy="-19" r="4" fill="#ff6a8a" stroke="#3a0a10" stroke-width="2"/>';
	}
	return s;
}

export const ENERGIZER_ART: Record<SeasonTheme['energizer'], string> = {
	starfish:
		'<path d="M0 -34 L9 -11 L34 -10 L14 5 L21 30 L0 16 L-21 30 L-14 5 L-34 -10 L-9 -11Z" fill="#ff8a2a" stroke="#4a1f08" stroke-width="4" stroke-linejoin="round"/><path d="M0 -26 L6 -9 M-24 -8 L-9 -4 M24 -8 L9 -4 M-15 22 L-8 8 M15 22 L8 8" stroke="#ffd08a" stroke-width="3" stroke-linecap="round" fill="none"/><g fill="#ffe0a8"><circle cx="0" cy="-3" r="3"/><circle cx="-16" cy="-8" r="2"/><circle cx="16" cy="-8" r="2"/></g>',
	pumpkin:
		'<ellipse cx="0" cy="4" rx="34" ry="28" fill="#ff7a1a" stroke="#4a1f08" stroke-width="4"/><path d="M-12 -22 Q-16 4 -10 30 M12 -22 Q16 4 10 30 M0 -24 V32" stroke="#c2480a" stroke-width="3" fill="none"/><rect x="-5" y="-34" width="10" height="12" rx="3" fill="#4a7a22" stroke="#16300f" stroke-width="3"/><path d="M-18 -2 L-8 -2 L-13 -12Z M8 -2 L18 -2 L13 -12Z" fill="#ffe05a" stroke="#4a1f08" stroke-width="2"/><path d="M-16 12 Q0 26 16 12 L12 8 L8 14 L0 8 L-8 14 L-12 8Z" fill="#ffe05a" stroke="#4a1f08" stroke-width="2"/>',
	snowman:
		'<circle cx="0" cy="14" r="22" fill="#fff" stroke="#10202c" stroke-width="4"/><circle cx="0" cy="-12" r="15" fill="#fff" stroke="#10202c" stroke-width="4"/><rect x="-11" y="-36" width="22" height="14" rx="2" fill="#2a3a52" stroke="#10202c" stroke-width="3"/><rect x="-16" y="-24" width="32" height="5" rx="2" fill="#2a3a52" stroke="#10202c" stroke-width="3"/><path d="M0 -12 L16 -9 L0 -6Z" fill="#ff8a2a" stroke="#4a1f08" stroke-width="2" stroke-linejoin="round"/><circle cx="-5" cy="-17" r="2" fill="#10202c"/><circle cx="5" cy="-17" r="2" fill="#10202c"/><g fill="#10202c"><circle cx="0" cy="8" r="2.4"/><circle cx="0" cy="17" r="2.4"/></g><ellipse cx="-9" cy="6" rx="4" ry="7" fill="#cfeaff" opacity=".6"/>',
	blossom: (() => {
		let p = '';
		for (let i = 0; i < 5; i += 1) {
			p += `<ellipse cx="0" cy="-20" rx="14" ry="18" transform="rotate(${i * 72})" fill="#ffb3d2" stroke="#4a1d36" stroke-width="4"/>`;
		}
		return `${p}<circle r="9" fill="#ffe45a" stroke="#4a1d36" stroke-width="3"/><g stroke="#c2487a" stroke-width="2" stroke-linecap="round"><path d="M0 -4 V-12"/><path d="M4 -1 L10 -4"/><path d="M-4 -1 L-10 -4"/></g>`;
	})()
};

export const EMBLEM_ART: Record<SeasonTheme['emblem'], string> = {
	sun: (() => {
		let r = '';
		for (let i = 0; i < 8; i += 1) {
			r += `<path d="M0 -26 L5 -17 H-5Z" transform="rotate(${i * 45})" fill="#ffd34a" stroke="#6a3a05" stroke-width="2.4" stroke-linejoin="round"/>`;
		}
		return `${r}<circle r="15" fill="#ffc22a" stroke="#6a3a05" stroke-width="3.4"/><ellipse cx="-5" cy="-6" rx="5" ry="3" fill="#fff" opacity=".6"/>`;
	})(),
	leaf: '<path d="M0 -26 L6 -14 L18 -18 L14 -4 L26 0 L14 8 L18 20 L4 14 L0 28 L-4 14 L-18 20 L-14 8 L-26 0 L-14 -4 L-18 -18 L-6 -14Z" fill="#f2551a" stroke="#4a1608" stroke-width="3" stroke-linejoin="round"/><path d="M0 -20 V26" stroke="#ffb35a" stroke-width="3" stroke-linecap="round"/>',
	flake: (() => {
		let r = '';
		for (let i = 0; i < 6; i += 1) {
			r += `<g transform="rotate(${i * 60})"><path d="M0 0 V-26 M-7 -18 L0 -12 L7 -18" stroke="#e8f8ff" stroke-width="4" stroke-linecap="round" fill="none"/></g>`;
		}
		return `<circle r="29" fill="#4a7aa8" opacity=".55"/>${r}<circle r="5" fill="#fff"/>`;
	})(),
	flower: (() => {
		let p = '';
		for (let i = 0; i < 5; i += 1) {
			p += `<ellipse cx="0" cy="-15" rx="9" ry="12" transform="rotate(${i * 72})" fill="#ff9ec7" stroke="#4a1d36" stroke-width="3"/>`;
		}
		return `${p}<circle r="7" fill="#ffe45a" stroke="#4a1d36" stroke-width="2.6"/>`;
	})()
};

/** The emblem's medallion for the level board. */
export function emblemArt(t: SeasonTheme): string {
	return `<circle r="33" fill="${t.shade}" stroke="${t.ink}" stroke-width="3.4"/><circle r="28" fill="${t.mid}" opacity=".9"/>${EMBLEM_ART[t.emblem]}`;
}
