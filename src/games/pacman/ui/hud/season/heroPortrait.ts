// The coins carry the game's own hero, baked once at rest (the owner's pick: the menu icons
// must be the heroes themselves, not a hand copy that drifts). Browser only — the pacman
// route is ssr=false, so a DOM canvas is always available when the screens render.
import { GAME_FEEL } from '../../../render/actors/HeroView';
import { MsPacmanHero } from '../../../render/actors/hero/MsPacmanHero';
import { PacmanHero } from '../../../render/actors/hero/PacmanHero';
import type { HeroSeason } from '../../../render/actors/hero/heroSeasons';

const cache = new Map<string, string>();

/**
 * The hero baked crisp into a data URL, at a tile-scale radius so the eye's small-size boost
 * reads in the coin; the frame spans ±2.2 radii (room for the corona and the bow).
 */
export function heroPortrait(ms: boolean, season: HeroSeason): string {
	const key = `${ms ? 'ms' : 'pac'}:${season}`;
	const hit = cache.get(key);
	if (hit) return hit;
	const R = 18;
	const scale = 6;
	const half = R * 2.2;
	const c = document.createElement('canvas');
	c.width = c.height = Math.ceil(half * 2 * scale);
	const x = c.getContext('2d') as CanvasRenderingContext2D;
	x.scale(scale, scale);
	x.translate(half, half);
	const h = ms ? new MsPacmanHero() : new PacmanHero();
	h.setFeel(GAME_FEEL);
	h.setRadius(R);
	h.reset();
	for (let i = 0; i < 40; i++) {
		h.update(1 / 60, { x: 0, y: 0, angle: 0, moving: false, power: false, ending: false, season });
	}
	h.draw(x);
	const url = c.toDataURL();
	cache.set(key, url);
	return url;
}

/** The baked hero as an SVG image centred at the origin, `size` units across. */
export function heroImageArt(ms: boolean, season: HeroSeason, size = 75): string {
	const url = heroPortrait(ms, season);
	return `<image href="${url}" x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}"/>`;
}
