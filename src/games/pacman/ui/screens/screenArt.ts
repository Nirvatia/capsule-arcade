/**
 * The shapes of the screens (menu, ready, pause, death, game over) as SVG markup, in the same
 * family as the season HUD (`../hud/season/seasonArt`): signboards on stakes, plank buttons
 * hung from them on ropes, a chalk board for the hints, a cloth banner, coins with the heroes'
 * faces, round knobs. Static per world; the texts are the component's.
 */
import { boardArt, heroArt } from '../hud/season/seasonArt';
import type { SeasonTheme } from '../hud/season/seasonThemes';

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

/** Two ropes from the lower edge of one thing to the upper edge of the next. */
export function ropesArt(
	t: SeasonTheme,
	from: { readonly left: number; readonly right: number; readonly y: number },
	to: { readonly left: number; readonly right: number; readonly y: number }
): string {
	const d = `M${from.left} ${from.y} L${to.left} ${to.y} M${from.right} ${from.y} L${to.right} ${to.y}`;
	return `<path d="${d}" stroke="${t.rope}" stroke-width="3.6" stroke-linecap="round"/><path d="${d}" stroke="${t.ink}" stroke-width="1.2" opacity=".6"/>`;
}

export interface PlankOptions {
	readonly seed?: number;
	/** The button the eye goes to first: a ring of the world's light round it. */
	readonly primary?: boolean;
}

/** A plank button: a board with no stakes, hung by its ropes. */
export function plankArt(
	t: SeasonTheme,
	id: string,
	x: number,
	y: number,
	w: number,
	h: number,
	o: PlankOptions = {}
): string {
	let s = '';
	if (o.primary) {
		s += `<rect x="${x - 6}" y="${y - 6}" width="${w + 12}" height="${h + 12}" rx="${h / 2.4}" fill="none" stroke="${t.ring}" stroke-width="3" opacity=".85"/>`;
		s += `<rect x="${x - 6}" y="${y - 6}" width="${w + 12}" height="${h + 12}" rx="${h / 2.4}" fill="none" stroke="${t.ring}" stroke-width="9" opacity=".18"/>`;
	}
	s += boardArt(t, id, x, y, w, h, {
		seed: o.seed ?? 4,
		posts: false,
		r: Math.min(14, h / 3),
		j: 3
	});
	return s;
}

/** A dark chalk board in a wooden frame, for the hints. */
export function chalkArt(t: SeasonTheme, x: number, y: number, w: number, h: number): string {
	const q = mul(31);
	let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${t.mid}" stroke="${t.ink}" stroke-width="4"/>`;
	s += `<rect x="${x + 7}" y="${y + 7}" width="${w - 14}" height="${h - 14}" rx="6" fill="#26332b" stroke="${t.ink}" stroke-width="2.4"/>`;
	s += `<rect x="${x + 7}" y="${y + 7}" width="${w - 14}" height="${(h - 14) * 0.4}" rx="6" fill="#fff" opacity=".07"/>`;
	for (let i = 0; i < 5; i += 1) {
		s += `<circle cx="${x + 14 + q() * (w - 28)}" cy="${y + 14 + q() * (h - 28)}" r="${1 + q() * 2.4}" fill="#fff" opacity=".07"/>`;
	}
	s += `<path d="M${x + 10} ${y + 8} H${x + w * 0.5}" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".4"/>`;
	return s;
}

/** A coin with a hero's face, drawn at the origin (34 units across); lifted and ringed when chosen. */
export function coinArt(t: SeasonTheme, ms: boolean, selected: boolean): string {
	let s = '';
	if (selected) {
		s += `<circle r="44" fill="${t.ring}" opacity=".22"/>`;
		s += `<circle r="40" fill="none" stroke="${t.ring}" stroke-width="3.4"/>`;
	}
	s += `<circle r="34" fill="${t.shade}" stroke="${t.ink}" stroke-width="4"/>`;
	s += `<circle r="29" fill="${t.mid}"/>`;
	s += `<path d="M-24 -8 A26 26 0 0 1 8 -24" fill="none" stroke="${t.light}" stroke-width="4" stroke-linecap="round" opacity=".85"/>`;
	s += `<g transform="scale(1.15)">${heroArt(ms)}</g>`;
	return s;
}

/** A round knob face (the language and skip buttons), drawn at the origin. */
export function knobFaceArt(t: SeasonTheme): string {
	return `<ellipse cx="2" cy="26" rx="22" ry="5" fill="#000" opacity=".28"/><circle r="26" fill="${t.mid}" stroke="${t.ink}" stroke-width="4"/><path d="M-19 -9 A22 22 0 0 1 9 -20" fill="none" stroke="${t.light}" stroke-width="4" stroke-linecap="round" opacity=".85"/><path d="M-12 -14 A25 25 0 0 0 0 22" fill="none" stroke="${t.shade}" stroke-width="5" opacity=".45"/>`;
}

/** A banner stretched between two posts (the READY screen): the posts, the cloth, its shadow. */
export function bannerSpanArt(t: SeasonTheme, x: number, y: number, w: number, h: number): string {
	let s = '';
	for (const px of [x - 4, x + w + 4]) {
		s += `<rect x="${px - 8}" y="${y - 24}" width="16" height="${h + 124}" rx="5" fill="${t.post}" stroke="${t.ink}" stroke-width="3.4"/><rect x="${px - 4.5}" y="${y - 22}" width="4.5" height="${h + 120}" fill="#fff" opacity=".22"/>`;
		s += `<circle cx="${px}" cy="${y - 24}" r="9" fill="${t.post}" stroke="${t.ink}" stroke-width="3.4"/>`;
	}
	s += `<ellipse cx="${x + w / 2 + 8}" cy="${y + h + 104}" rx="${w / 2 + 20}" ry="9" fill="#000" opacity=".26"/>`;
	const sag = 8;
	const d = `M${x - 4} ${y} Q${x + w / 2} ${y + sag} ${x + w + 4} ${y} L${x + w + 4} ${y + h} Q${x + w / 2} ${y + h + sag} ${x - 4} ${y + h}Z`;
	s += `<path d="${d}" fill="${t.cloth}" stroke="${t.ink}" stroke-width="4" stroke-linejoin="round"/>`;
	s += `<path d="M${x - 4} ${y} Q${x + w / 2} ${y + sag} ${x + w + 4} ${y} L${x + w + 4} ${y + h * 0.3} Q${x + w / 2} ${y + h * 0.3 + sag} ${x - 4} ${y + h * 0.3}Z" fill="#fff" opacity=".22"/>`;
	s += `<path d="M${x - 4} ${y + h * 0.78} Q${x + w / 2} ${y + h * 0.78 + sag} ${x + w + 4} ${y + h * 0.78} L${x + w + 4} ${y + h} Q${x + w / 2} ${y + h + sag} ${x - 4} ${y + h}Z" fill="${t.clothShade}" opacity=".8"/>`;
	return s;
}

/** Cracks over a board (the game over sign). */
export function cracksArt(t: SeasonTheme, x: number, y: number, w: number, h: number): string {
	const d = `M${x + w * 0.62} ${y} l-10 ${h * 0.25} l14 ${h * 0.2} l-12 ${h * 0.25} l8 ${h * 0.3} M${x + w * 0.2} ${y + h} l8 ${-h * 0.3} l-10 ${-h * 0.2}`;
	return `<path d="${d}" fill="none" stroke="${t.ink}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>`;
}

/** A ribbon of gold cloth with swallowtails (the new record), drawn from (x, y) rightward. */
export function ribbonArt(x: number, y: number, w: number, h: number): string {
	const d = `M${x} ${y} H${x + w} L${x + w - 10} ${y + h / 2} L${x + w} ${y + h} H${x} L${x + 10} ${y + h / 2}Z`;
	return `<path d="${d}" fill="#f0b82a" stroke="#4a2c08" stroke-width="3.6" stroke-linejoin="round"/><path d="M${x} ${y} H${x + w} L${x + w - 5} ${y + 7} H${x + 5}Z" fill="#fff" opacity=".35"/><path d="M${x} ${y + h - 7} H${x + w} V${y + h} H${x}Z" fill="#a8741a" opacity=".7"/>`;
}
