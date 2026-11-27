// Which look the heroes wear (the owner, 2026-11-27): the fruits (an orange, a watermelon) or the
// glass vessels they replaced (the cinnabar and the jade vessel; the vessels stay in the code as
// the other choice). Kept in the browser's storage; read when the game's views are built, so a
// change takes effect on the next load (the dev panel's button reloads).
export type HeroSkin = 'fruit' | 'vessel';

const KEY = 'pacman:hero-skin';

export function readHeroSkin(): HeroSkin {
	try {
		return localStorage.getItem(KEY) === 'vessel' ? 'vessel' : 'fruit';
	} catch {
		return 'fruit';
	}
}

export function writeHeroSkin(skin: HeroSkin): void {
	try {
		localStorage.setItem(KEY, skin);
	} catch {
		// storage blocked: the choice lasts until the page is closed, by the caller
	}
}
