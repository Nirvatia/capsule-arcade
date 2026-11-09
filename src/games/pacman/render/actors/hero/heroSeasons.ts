// What the season (or the hell) gives the heroes: the rim light on the nape, the colour of the
// speed lines and of the little things the hero throws up. Colours are sampled from the owner's
// hero mock-ups ("Pac-Man · Shonen", "Ms. Pac-Man · Maho-shoujo", the four season rows).
import type { RGB } from './RibbonTrail';

export type HeroSeason = 'spring' | 'summer' | 'autumn' | 'winter' | 'hell';

/** The kind of thing a season's hero throws up. */
export type SeasonParticle = 'petal' | 'spark' | 'leaf' | 'flake' | 'ember';

export interface SeasonLook {
	/** The rim light along the nape. */
	readonly rim: RGB;
	/** Speed lines, calm and powered. */
	readonly line: RGB;
	readonly lineHot: RGB;
	readonly particle: SeasonParticle;
	readonly particleFill: RGB;
	readonly particleEdge: RGB;
}

export const SEASON_LOOKS: Readonly<Record<HeroSeason, SeasonLook>> = {
	spring: {
		rim: [226, 241, 214],
		line: [255, 196, 218],
		lineHot: [255, 240, 196],
		particle: 'petal',
		particleFill: [255, 202, 224],
		particleEdge: [226, 96, 150]
	},
	summer: {
		rim: [255, 238, 170],
		line: [255, 218, 128],
		lineHot: [255, 244, 190],
		particle: 'spark',
		particleFill: [255, 214, 96],
		particleEdge: [214, 132, 20]
	},
	autumn: {
		rim: [255, 200, 146],
		line: [255, 164, 74],
		lineHot: [255, 232, 170],
		particle: 'leaf',
		particleFill: [244, 124, 40],
		particleEdge: [140, 58, 16]
	},
	winter: {
		rim: [214, 236, 255],
		line: [172, 214, 255],
		lineHot: [244, 250, 255],
		particle: 'flake',
		particleFill: [236, 246, 255],
		particleEdge: [120, 176, 232]
	},
	hell: {
		rim: [255, 128, 86],
		line: [255, 110, 60],
		lineHot: [255, 214, 140],
		particle: 'ember',
		particleFill: [255, 170, 70],
		particleEdge: [150, 30, 10]
	}
};

/** The look for a level: the hell has its own, a season level its season's. */
export function heroSeasonOf(
	season: 'spring' | 'summer' | 'autumn' | 'winter',
	hell: boolean
): HeroSeason {
	return hell ? 'hell' : season;
}
