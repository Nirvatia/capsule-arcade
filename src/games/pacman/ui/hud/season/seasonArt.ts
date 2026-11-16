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
	if (t.key === 'hell') {
		for (let v = 0; v < 4; v += 1) {
			const vx = x + 18 + q() * (w - 36);
			const vy = y + 6 + q() * (h - 12);
			s += `<path d="M${vx} ${vy} q18 ${q() * 16 - 8} 36 ${q() * 20 - 10} t34 ${q() * 12 - 6}" fill="none" stroke="#c0282a" stroke-width="2" opacity=".6"/>`;
		}
		return s;
	}
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
	if (t.edge) {
		s += `<path d="${d}" fill="none" stroke="${t.ink}" stroke-width="13" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${t.edge}" stroke-width="8" stroke-linejoin="round"/>`;
	}
	s += `<path d="${d}" fill="${t.mid}"/>`;
	s += `<clipPath id="${cid}"><path d="${d}"/></clipPath><g clip-path="url(#${cid})">`;
	s += `<ellipse cx="${x + w * 0.3}" cy="${y + h * 0.12}" rx="${w * 0.62}" ry="${h * 0.4}" fill="${t.light}" opacity=".85"/>`;
	s += `<rect x="${x}" y="${y + h * 0.74}" width="${w}" height="${h * 0.3}" fill="${t.shade}" opacity=".9"/>`;
	s += material(t, x, y, w, h, seed);
	s += '</g>';
	s += `<path d="${d}" fill="none" stroke="${t.ink}" stroke-width="4.5" stroke-linejoin="round"/>`;
	s += `<path d="M${x + 14} ${y + 7} H${x + w * 0.55}" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".5"/>`;
	if (!t.edge) {
		for (const nx of [x + 12, x + w - 12]) {
			s += `<circle cx="${nx}" cy="${y + 13}" r="3.2" fill="${t.ink}" opacity=".75"/>`;
		}
	}
	return s;
}

/** Two ropes from the score board's lower edge down to the record tag. */
export function ropesArt(t: SeasonTheme, d = 'M74 132 L82 160 M192 132 L184 160'): string {
	return `<path d="${d}" stroke="${t.rope}" stroke-width="3.4" stroke-linecap="round"/><path d="${d}" stroke="${t.ink}" stroke-width="1.2" opacity=".6"/>`;
}

export interface BannerBox {
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
}

/** The cloth banner hung under the level board, on two short ropes. */
export function bannerArt(
	t: SeasonTheme,
	b: BannerBox = { x: 1076, y: 146, w: 142, h: 28 }
): string {
	const { x, y, w, h } = b;
	const nx = Math.min(8, w * 0.06);
	let s = `<path d="M${x + 8} ${y - 14} L${x + 14} ${y + 2} M${x + w - 8} ${y - 14} L${x + w - 14} ${y + 2}" stroke="${t.rope}" stroke-width="3.2" stroke-linecap="round"/>`;
	s += `<path d="M${x} ${y} H${x + w} L${x + w - nx} ${y + h / 2} L${x + w} ${y + h} H${x} L${x + nx} ${y + h / 2}Z" fill="${t.cloth}" stroke="${t.ink}" stroke-width="3.4" stroke-linejoin="round"/>`;
	s += `<path d="M${x} ${y} H${x + w} L${x + w - 4} ${y + 6} H${x + 4}Z" fill="#fff" opacity=".25"/><path d="M${x} ${y + h - 6} H${x + w} V${y + h} H${x}Z" fill="${t.clothShade}" opacity=".8"/>`;
	return s;
}

export interface TrailBox {
	readonly x0: number;
	readonly x1: number;
	readonly y: number;
	/** How far the trail wanders up and down. */
	readonly amp: number;
}

/** The eaten and the uneaten pellets of the food trail; `eaten` of `n` are holes. */
export function trailArt(
	t: SeasonTheme,
	eaten: number,
	n = 14,
	g: TrailBox = { x0: 1056, x1: 1244, y: 308, amp: 8 }
): string {
	const mid = (g.x0 + g.x1) / 2;
	let s = `<path d="M${g.x0} ${g.y} Q${(g.x0 + mid) / 2} ${g.y - g.amp * 1.75} ${mid} ${g.y} T${g.x1} ${g.y}" fill="none" stroke="${t.ink}" stroke-width="10" stroke-linecap="round" opacity=".35"/>`;
	for (let i = 0; i < n; i += 1) {
		const u = i / (n - 1);
		const x = g.x0 + (g.x1 - g.x0) * u;
		const y = g.y - g.amp * Math.sin(u * Math.PI * 2);
		if (i < eaten) {
			s += `<circle cx="${x}" cy="${y}" r="4.6" fill="#241a10" opacity=".45"/>`;
		} else {
			s += `<circle cx="${x}" cy="${y}" r="6" fill="${t.pellet}" stroke="${t.pelletInk}" stroke-width="2.2"/><circle cx="${x - 1.6}" cy="${y - 1.6}" r="1.7" fill="#fff" opacity=".7"/>`;
		}
	}
	return s;
}

/** The dial the energizer sits in: a stone ring in the ground with a dark well. */
export interface Dial {
	readonly cx: number;
	readonly cy: number;
	readonly r: number;
}

export const DIAL: Dial = { cx: 1196, cy: 410, r: 34 };

export function dialArt(t: SeasonTheme, d: Dial = DIAL): string {
	const { cx, cy, r } = d;
	let s = shadow(cx + 4, cy + r + 14, r + 20, 8, 0.3);
	s += `<circle cx="${cx}" cy="${cy}" r="${r + 11}" fill="${t.shade}" stroke="${t.ink}" stroke-width="4"/><circle cx="${cx}" cy="${cy}" r="${r + 5}" fill="${t.mid}"/>`;
	s += `<path d="M${cx - r - 3} ${cy - 12} A${r + 3} ${r + 3} 0 0 1 ${cx + 12} ${cy - r - 3}" fill="none" stroke="${t.light}" stroke-width="5" stroke-linecap="round" opacity=".8"/>`;
	s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#10140f" opacity=".72" stroke="${t.ink}" stroke-width="2.6"/>`;
	s += `<circle cx="${cx}" cy="${cy}" r="${r - 5}" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="6"/>`;
	return s;
}

/** The circumference of the timer ring of a dial. */
export function ringLength(d: Dial = DIAL): number {
	return 2 * Math.PI * (d.r - 5);
}

/** The pause knob, drawn at the origin. */
export function knobArt(t: SeasonTheme): string {
	return `<circle r="23" fill="${t.mid}" stroke="${t.ink}" stroke-width="4"/><path d="M-17 -8 A19 19 0 0 1 8 -17" fill="none" stroke="${t.light}" stroke-width="4" stroke-linecap="round" opacity=".85"/>`;
}

/** Twelve rays of a sun in splendour round the origin: straight and short in turn, two tones, ink. */
function sunRays(r: number, long: number, short: number, ink: string, w: number): string {
	let s = '';
	for (let i = 0; i < 12; i += 1) {
		const a = (i / 12) * Math.PI * 2;
		const h = (Math.PI / 12) * (i % 2 === 0 ? 0.92 : 0.8);
		const len = i % 2 === 0 ? long : short;
		const p = (ang: number, rr: number) =>
			`${(Math.cos(ang) * rr).toFixed(2)} ${(Math.sin(ang) * rr).toFixed(2)}`;
		s += `<path d="M${p(a - h, r)} L${p(a, r + len)} L${p(a + h, r)}Z" fill="#ffaa24" stroke="${ink}" stroke-width="${w}" stroke-linejoin="round"/>`;
		s += `<path d="M${p(a - h * 0.5, r)} L${p(a, r + len * 0.55)} L${p(a + h * 0.5, r)}Z" fill="#ffea82"/>`;
	}
	return s;
}

/** Icons drawn at the origin, roughly 40 units across: the sun (Pac-Man), the galaxy (Ms. Pac-Man). */
export function heroArt(ms: boolean): string {
	if (!ms) {
		return (
			sunRays(15, 8, 6, '#601808', 2.4) +
			'<circle r="16" fill="#de4816" stroke="#601808" stroke-width="3"/><circle r="13.6" fill="#fa7e1e"/><circle r="10.6" fill="#ffb836"/><circle r="7" cx="-1" fill="#ffe278"/><circle r="3.6" cx="-1" fill="#fffae0"/>' +
			'<path d="M1 0 L17 -8 L17 8 Z" fill="#8c220c" stroke="#601808" stroke-width="2.2" stroke-linejoin="round"/>' +
			'<path d="M-1 -12 L5 -10" stroke="#601808" stroke-width="2" stroke-linecap="round"/><circle cx="2.4" cy="-7.4" r="1.7" fill="#601808"/>'
		);
	}
	const lobe = (sx: number, fill: string) =>
		`<path d="M0 0 Q${sx * 4.4} -7.4 ${sx * 11.2} -6.8 Q${sx * 15.3} -0.7 ${sx * 11.5} 4.9 Q${sx * 4.6} 4.6 0 0Z" fill="${fill}" stroke="#220a3a" stroke-width="1.6" stroke-linejoin="round"/>`;
	return (
		'<circle r="18" fill="#2c1462" stroke="#16062c" stroke-width="3.2"/>' +
		'<circle r="15.6" fill="none" stroke="#c8a8ff" stroke-width="2.6" opacity=".75"/>' +
		'<ellipse cx="2" cy="-7" rx="7" ry="5" fill="#ffb0e8" opacity=".45"/>' +
		'<g transform="translate(-4 3) rotate(-20)"><path d="M0 0 C4 -2 8 0 9 4" fill="none" stroke="#ff7ad6" stroke-width="3" stroke-linecap="round"/><path d="M0 0 C-4 2 -8 0 -9 -4" fill="none" stroke="#7aa2ff" stroke-width="3" stroke-linecap="round"/><circle r="3" fill="#fff6e8"/></g>' +
		'<circle cx="-11" cy="-4" r="0.9" fill="#fff"/><circle cx="-7" cy="11" r="0.8" fill="#fff"/><circle cx="6" cy="10" r="0.9" fill="#fff"/>' +
		'<path d="M1 0 L18 -8 L18 8 Z" fill="#10041e" stroke="#16062c" stroke-width="2.2" stroke-linejoin="round"/>' +
		'<ellipse cx="4" cy="-8" rx="2.6" ry="3.4" fill="#fff"/><ellipse cx="4.8" cy="-7.8" rx="1.5" ry="2.1" fill="#3a1060"/><path d="M1 -11.5 Q4 -13 7 -11" fill="none" stroke="#16062c" stroke-width="1.4" stroke-linecap="round"/>' +
		`<g transform="translate(-6 -16) rotate(-25)">${lobe(-1, '#c25ae8')}${lobe(1, '#8a7cff')}<path d="M0 -4.2 L1 -1 L4.2 0 L1 1 L0 4.2 L-1 1 L-4.2 0 L-1 -1Z" fill="#fff" stroke="#220a3a" stroke-width=".8"/></g>`
	);
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
	skull:
		'<path d="M-20 -4 C-24 -26 24 -26 20 -4 C20 4 14 8 12 12 V22 H-12 V12 C-14 8 -20 4 -20 -4Z" fill="#e8d9bd" stroke="#16060a" stroke-width="3.4" stroke-linejoin="round"/><ellipse cx="-8" cy="-2" rx="5" ry="6" fill="#16060a"/><ellipse cx="8" cy="-2" rx="5" ry="6" fill="#16060a"/><path d="M-4 8 H4 M-5 22 V14 M0 22 V14 M5 22 V14" stroke="#16060a" stroke-width="2.4" stroke-linecap="round"/><ellipse cx="-8" cy="-2" rx="2" ry="2.4" fill="#ff5a2a"/><ellipse cx="8" cy="-2" rx="2" ry="2.4" fill="#ff5a2a"/>',
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
