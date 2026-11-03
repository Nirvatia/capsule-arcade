import type { Pathname } from '$app/types';
import { getSavedScore } from '../utils/scoreStore';

export type GameIconName = 'snake' | 'maze' | 'blocks' | 'simon';

export interface GameConfig {
	id: string;
	title: string;
	description: string;
	genre: string;
	difficulty: number;
	players: string;
	icon: GameIconName;
	light: string;
	deep: string;
	status: 'ready' | 'dev' | 'soon';
	progress?: number;
	route?: Pathname;
}

export const games: GameConfig[] = [
	{
		id: 'snake',
		title: 'Змейка',
		description: 'Расти и не врезайся в себя.',
		genre: 'Аркада',
		difficulty: 2,
		players: '1',
		icon: 'snake',
		light: '#c9ef7a',
		deep: '#4f8a10',
		status: 'ready',
		route: '/games/snake'
	},
	{
		id: 'pacman',
		title: 'Пакман',
		description: 'Съешь всё в лабиринте и не попадись.',
		genre: 'Лабиринт',
		difficulty: 3,
		players: '1',
		icon: 'maze',
		light: '#ffd27a',
		deep: '#c97a00',
		status: 'soon'
	},
	{
		id: 'tetris',
		title: 'Тетрис',
		description: 'Собирай фигуры в сплошные линии.',
		genre: 'Головоломка',
		difficulty: 3,
		players: '1',
		icon: 'blocks',
		light: '#a9b8ff',
		deep: '#3343b0',
		status: 'ready',
		route: '/games/tetris'
	},
	{
		id: 'simon',
		title: 'Саймон 1С',
		description: 'Повтори последовательность и закрой квартал.',
		genre: 'Память',
		difficulty: 2,
		players: '1',
		icon: 'simon',
		light: '#ff8a6a',
		deep: '#c4180a',
		status: 'ready',
		route: '/games/simon'
	}
];

export function isPlayable(game: GameConfig): boolean {
	return game.status === 'ready' && Boolean(game.route);
}

export function getGameRecord(game: GameConfig): number {
	if (!isPlayable(game)) {
		return 0;
	}

	const value = parseInt(getSavedScore(game.id, 0), 10);
	return Number.isFinite(value) ? value : 0;
}
