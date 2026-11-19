// The coins carry the heroes' classic sprites (the owner's pick): a plain yellow ball with a
// mouth wedge; hers adds a red bow and an eyelash — the old arcade icons, drawn with care
// (`heroIcon`). Not the in-game heroes themselves: on a coin the sun's corona and her pearl
// shading shrink to noise, the sprite reads by its silhouette. Browser only — the pacman route is
// ssr=false, so a DOM canvas is always available when the screens render.
import type { HeroSeason } from '../../../render/actors/hero/heroSeasons';
import { classicIcon } from './heroIcon';

const cache = new Map<string, string>();

/**
 * The hero's icon baked crisp into a data URL. `season` stays in the signature (the callers
 * pass their world's season); the classic sprite is the same in every world.
 */
export function heroPortrait(ms: boolean, season: HeroSeason): string {
	void season;
	const key = ms ? 'ms' : 'pac';
	const hit = cache.get(key);
	if (hit) return hit;
	const url = classicIcon(ms);
	cache.set(key, url);
	return url;
}

/** The baked hero as an SVG image centred at the origin, `size` units across. */
export function heroImageArt(ms: boolean, season: HeroSeason, size = 75): string {
	const url = heroPortrait(ms, season);
	return `<image href="${url}" x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}"/>`;
}
