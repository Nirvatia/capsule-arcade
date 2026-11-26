// The heroes' icons on the HUD's lives and the menu's coins: a simplified version of their real
// art (`heroIcon`: the cinnabar and the jade vessels, her bow), not the in-game painters
// themselves (their stream, flicks and aura shrink to noise at an icon's size). Browser only —
// the pacman route is ssr=false, so a DOM canvas is always available when the screens render.
import type { HeroSeason } from '../../../render/actors/hero/heroSeasons';
import { heroIcon } from './heroIcon';

const cache = new Map<string, string>();

/**
 * The hero's icon baked crisp into a data URL. `season` stays in the signature (the callers
 * pass their world's season); the icon is the same in every world.
 */
export function heroPortrait(ms: boolean, world: HeroSeason | 'station'): string {
	void world;
	const key = ms ? 'ms' : 'pac';
	const hit = cache.get(key);
	if (hit) return hit;
	const url = heroIcon(ms);
	cache.set(key, url);
	return url;
}

/** The baked hero as an SVG image centred at the origin, `size` units across. */
export function heroImageArt(ms: boolean, season: HeroSeason | 'station', size = 75): string {
	const url = heroPortrait(ms, season);
	return `<image href="${url}" x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}"/>`;
}
