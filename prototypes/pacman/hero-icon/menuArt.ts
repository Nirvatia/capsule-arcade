import { boardArt as paintBoard } from '../../../src/games/pacman/ui/hud/season/seasonArt';
import {
	coinArt as paintCoin,
	plankArt as paintPlank,
	ropesArt as paintRopes
} from '../../../src/games/pacman/ui/screens/screenArt';
import { SEASON_THEMES } from '../../../src/games/pacman/ui/hud/season/seasonThemes';

const theme = SEASON_THEMES.summer;

export function boardArt(id: string, x: number, y: number, w: number, h: number, seed: number): string {
	return paintBoard(theme, id, x, y, w, h, { seed, posts: id === 'title' });
}

export function coinArt(ms: boolean, selected: boolean): string {
	return paintCoin(theme, ms, selected);
}

export function plankArt(id: string, x: number, y: number, w: number, h: number, seed: number): string {
	return paintPlank(theme, id, x, y, w, h, { seed, primary: true });
}

export function ropesArt(
	left: number,
	right: number,
	y: number,
	toLeft: number,
	toRight: number,
	toY: number
): string {
	return paintRopes(theme, { left, right, y }, { left: toLeft, right: toRight, y: toY });
}
