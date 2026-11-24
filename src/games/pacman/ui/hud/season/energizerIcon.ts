// The HUD's energizer is the one on the board: the season's own energizer painter
// (`MeadowTheme.live.energizer.texture`) baked into a data URL, so the badge always matches the
// maze, a new season included. Browser only (the pacman route is ssr=false).
import { meadowThemeFor } from '../../../render/seasons/meadow/meadowThemes';

const cache = new Map<string, string>();

/** The season's energizer as a data URL; '' for a world without one (the hell, the arcade). */
export function energizerIcon(world: string): string {
	const hit = cache.get(world);
	if (hit !== undefined) return hit;
	const theme = meadowThemeFor(world);
	let url = '';
	if (theme && typeof document !== 'undefined') {
		try {
			url = theme.live.energizer.texture().toDataURL();
		} catch (error) {
			console.error('energizerIcon', 'cannot bake the energizer', world, error);
		}
	}
	cache.set(world, url);
	return url;
}
