import { writable } from 'svelte/store';
import type { TextKey } from '../i18n';

export type Screen = 'title' | 'pause' | 'album' | null;
export type MenuItem =
	'play' | 'resume' | 'album' | 'language' | 'sound' | 'mainmenu' | 'leave' | 'back';

export interface AlbumCard {
	id: string;
	hue: number;
	/** SVG-пути гладкого рисунка в координатах сетки (viewBox 0 0 COLS ROWS). */
	paths: string[];
	dots: { x: number; y: number }[];
	state: 'done' | 'progress' | 'unknown';
	tides: number[];
}

export interface HudState {
	visible: boolean;
	mode: 'current' | 'pond' | 'reveal';
	/** Номер рисунка, с единицы. */
	pic: number;
	/** Состояние штрихов рисунка: горит, ждёт в этом заходе, ещё впереди. */
	strokes: ('lit' | 'now' | 'later')[];
	got: number;
	need: number;
	tide: number;
}

export interface UiState {
	screen: Screen;
	items: MenuItem[];
	sel: number;
	muted: boolean;
	touch: boolean;
	hud: HudState;
	hint: { id: number; key: TextKey | null };
	banner: { id: number; title: string; sub: string } | null;
	album: AlbumCard[];
}

export const ui = writable<UiState>({
	screen: null,
	items: [],
	sel: 0,
	muted: false,
	touch: false,
	hud: { visible: false, mode: 'current', pic: 1, strokes: [], got: 0, need: 0, tide: 0 },
	hint: { id: 0, key: null },
	banner: null,
	album: []
});

export interface Actions {
	select(i: number): void;
	hover(i: number): void;
	pause(): void;
}

export const actions = writable<Actions | null>(null);
