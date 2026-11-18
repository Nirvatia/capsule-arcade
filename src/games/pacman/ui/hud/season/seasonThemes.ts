/** The four season worlds' materials for the side HUD (the owner's mock-up): a wooden or icy
 *  board, painted numerals, a cloth banner, and the world's own energizer and pellets. */
export type SeasonKey = 'spring' | 'summer' | 'autumn' | 'winter';

export interface SeasonTheme {
	readonly key: SeasonKey | 'hell';
	/** The ink line of every shape. */
	readonly ink: string;
	/** A board's lit band, mid tone and shadow band, and its grain. */
	readonly light: string;
	readonly mid: string;
	readonly shade: string;
	readonly grain: string;
	/** Numerals: the fill (top, bottom) and their outline. */
	readonly numTop: string;
	readonly num: string;
	readonly numInk: string;
	readonly label: string;
	/** The banner under the level board. */
	readonly cloth: string;
	readonly clothShade: string;
	/** The ring of the power timer. */
	readonly ring: string;
	/** The food trail's pellet and its outline (the season's own pellet). */
	readonly pellet: string;
	readonly pelletInk: string;
	readonly rope: string;
	readonly post: string;
	readonly emblem: 'sun' | 'leaf' | 'flake' | 'flower' | 'skull';
	/** A bone rim round the boards (the hell's). */
	readonly edge?: string;
	readonly energizer: 'starfish' | 'pumpkin' | 'snowman' | 'blossom';
}

export const SEASON_THEMES: Record<SeasonKey, SeasonTheme> = {
	summer: {
		key: 'summer',
		ink: '#2a1a0c',
		light: '#f2c98a',
		mid: '#cf9a58',
		shade: '#8f5f2d',
		grain: '#7a4a1f',
		numTop: '#ffffff',
		num: '#fff6d8',
		numInk: '#3a230d',
		label: '#fff0c4',
		cloth: '#3fb6c9',
		clothShade: '#23808f',
		ring: '#ffd86a',
		pellet: '#fff7e6',
		pelletInk: '#6b5a3a',
		rope: '#e9d7a5',
		post: '#b88548',
		emblem: 'sun',
		energizer: 'starfish'
	},
	autumn: {
		key: 'autumn',
		ink: '#241008',
		light: '#d28a4a',
		mid: '#9a5a2c',
		shade: '#5a3016',
		grain: '#40200d',
		numTop: '#fff6dc',
		num: '#ffe9bd',
		numInk: '#2a1208',
		label: '#ffd89a',
		cloth: '#c8461f',
		clothShade: '#8a2c12',
		ring: '#ffb24a',
		pellet: '#ffc65a',
		pelletInk: '#5a3410',
		rope: '#c9a463',
		post: '#7a4a24',
		emblem: 'leaf',
		energizer: 'pumpkin'
	},
	winter: {
		key: 'winter',
		ink: '#10202c',
		light: '#e8f4ff',
		mid: '#a9c8e0',
		shade: '#6a8fb0',
		grain: '#ffffff',
		numTop: '#f2fbff',
		num: '#ffffff',
		numInk: '#1d3a52',
		label: '#dff2ff',
		cloth: '#d44a54',
		clothShade: '#8e2a34',
		ring: '#bfeaff',
		pellet: '#cfeeff',
		pelletInk: '#2d5878',
		rope: '#d8e8f2',
		post: '#8fb0cc',
		emblem: 'flake',
		energizer: 'snowman'
	},
	spring: {
		key: 'spring',
		ink: '#2a1520',
		light: '#f6dcc0',
		mid: '#d7a98a',
		shade: '#9a6a52',
		grain: '#8a5a44',
		numTop: '#ffffff',
		num: '#fff4f8',
		numInk: '#4a1d36',
		label: '#ffe3ee',
		cloth: '#ef7fb0',
		clothShade: '#b24a80',
		ring: '#ffc2dc',
		pellet: '#ffe45a',
		pelletInk: '#6a5410',
		rope: '#f2d9a8',
		post: '#c99978',
		emblem: 'flower',
		energizer: 'blossom'
	}
};

/** The hell's boards: flesh in a bone rim, numerals the colour of embers, cords for ropes. */
export const HELL_THEME: SeasonTheme = {
	key: 'hell',
	ink: '#16060a',
	light: '#7a2b2e',
	mid: '#4a1418',
	shade: '#260a0e',
	grain: '#ff5a3a',
	numTop: '#fff2d6',
	num: '#ffd9a0',
	numInk: '#2a0608',
	label: '#e8d9bd',
	cloth: '#8a1a1c',
	clothShade: '#4a0a0e',
	ring: '#ff9a4a',
	pellet: '#ffb070',
	pelletInk: '#3a0a08',
	rope: '#2a0e10',
	post: '#d9c9a8',
	emblem: 'skull',
	// unused: the hell's dial holds a weapon, not an energizer
	energizer: 'starfish',
	edge: '#e8d9bd'
};

export function isSeasonKey(world: string): world is SeasonKey {
	return world in SEASON_THEMES;
}
