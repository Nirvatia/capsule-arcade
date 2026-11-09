// Pac-Man, the hero: the owner's "Shonen" mock-up (anime direction). A fighting-game hero in the
// maze: cel-shaded gold in hard tone bands with a white highlight, a thick ink outline that is
// heavier in the shadow, no eye, a wide mouth with a dark cavity and a tongue. The energizer
// splits the palette (cream, gold, orange-red). The machinery (acting, bites, spring, energizer
// beat, trail) is the shared Hero; the trail and the energizer's flames follow in the next step.
import type { HeroDesign, MouthInside, Palette } from './Hero';
import { Hero } from './Hero';
import { stellarGold } from './cgShading';

const CALM: Palette = {
	light: [236, 213, 58],
	mid: [230, 160, 34],
	shadow: [186, 88, 24],
	deep: [120, 50, 16],
	bounce: [234, 142, 66],
	ink: [38, 14, 12],
	highlight: [255, 255, 255],
	rim: [255, 238, 176]
};
const AWOKEN: Palette = {
	light: [236, 232, 198],
	mid: [236, 186, 58],
	shadow: [226, 72, 34],
	deep: [150, 40, 20],
	bounce: [234, 134, 76],
	ink: [38, 14, 12],
	highlight: [255, 255, 255],
	rim: [255, 238, 176]
};

const INSIDE: MouthInside = {
	mid: [112, 18, 40],
	deep: [70, 8, 28],
	tongue: [255, 98, 128],
	tongueLight: [255, 160, 176]
};

const DESIGN: HeroDesign = {
	id: 'pacman',
	calm: CALM,
	awoken: AWOKEN,
	cel: true,
	hinge: 0.08,
	inside: INSIDE,
	// wide jaws (the owner's review): fully open the mouth spans about 92 degrees
	mouthSpan: 0.76,
	grinRest: 0.2,
	grinRun: 0.08,
	chompRate: 4.2,
	spill: null,
	aura: [255, 170, 60],
	flare: [255, 214, 120],
	trailCalm: [],
	trailAwoken: [],
	death: 'open'
};

/** The CG style: the same hero rendered as stellar gold, without ink (goes with the CG style). */
const CG_DESIGN: HeroDesign = {
	...DESIGN,
	id: 'pacman-cg',
	cel: false,
	inside: undefined,
	shade: stellarGold,
	ink: false
};

export class PacmanHero extends Hero {
	protected readonly designs = { painted: DESIGN, cg: CG_DESIGN };

	/** No particles until the trail's own (next step). */
	protected particleFor(): 'none' {
		return 'none';
	}
}
