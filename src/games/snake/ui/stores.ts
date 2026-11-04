import { writable } from 'svelte/store';
import type { Op } from '../sim/types';

export interface HudState {
	visible: boolean;
	width: number;
	score: number;
	act: number;
	streak: number;
	op: Op | null;
	touching: number;
	total: number;
	ok: boolean;
}

export const hudStore = writable<HudState>({
	visible: false,
	width: 0,
	score: 0,
	act: 1,
	streak: 0,
	op: null,
	touching: 0,
	total: 0,
	ok: false
});

export type Screen = 'title' | 'pause' | 'over' | null;
export type MenuItem =
	'begin' | 'language' | 'sound' | 'resume' | 'restart' | 'mainmenu' | 'again' | 'leave';

export interface ScreenState {
	screen: Screen;
	items: MenuItem[];
	sel: number;
	muted: boolean;
	score: number;
	best: number;
	isRecord: boolean;
	alphas: number;
	maxLen: number;
	act: number;
}

export const screenStore = writable<ScreenState>({
	screen: null,
	items: [],
	sel: 0,
	muted: false,
	score: 0,
	best: 0,
	isRecord: false,
	alphas: 0,
	maxLen: 0,
	act: 1
});

export interface SnakeActions {
	select(i: number): void;
	hover(i: number): void;
	pause(): void;
}

export const actionsStore = writable<SnakeActions | null>(null);
