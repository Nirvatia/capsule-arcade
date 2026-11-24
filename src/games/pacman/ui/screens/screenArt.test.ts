import { describe, expect, it, vi } from 'vitest';
import { coinArt } from './screenArt';
import { SEASON_THEMES } from '../hud/season/seasonThemes';

// Baking needs a DOM canvas; the coin test only checks that the portrait is wired in.
vi.mock('../hud/season/heroPortrait', () => ({
	heroImageArt: (ms: boolean, season: string, size = 75) =>
		`<image href="data:image/png;base64,TEST" data-ms="${ms}" data-season="${season}" width="${size}" height="${size}"/>`
}));

describe('the menu coins', () => {
	it('carry the baked hero himself, not the old hand copy', () => {
		const s = coinArt(SEASON_THEMES.summer, false, true);
		expect(s).toContain('<image href="data:image/png;base64,TEST"');
		expect(s).toContain('data-ms="false"');
		expect(s).toContain('data-season="summer"');
		expect(s).toContain('width="52"');
		expect(s).not.toContain('#ffaa24');
	});

	it('carry the baked heroine too', () => {
		const s = coinArt(SEASON_THEMES.winter, true, false);
		expect(s).toContain('<image href="data:image/png;base64,TEST"');
		expect(s).toContain('data-ms="true"');
		expect(s).toContain('data-season="winter"');
		expect(s).not.toContain('#2c1462');
	});
});
