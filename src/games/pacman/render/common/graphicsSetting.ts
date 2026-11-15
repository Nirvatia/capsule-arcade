// The player's graphics setting: Auto (the game finds the tier this machine holds) or a tier
// picked by hand. Remembered in this browser, like the sound.

import { writable } from 'svelte/store';
import type { AutoQualityState } from './autoQuality';
import { isRenderQuality } from './renderQuality';
import type { RenderQuality } from './renderQuality';

export type GraphicsChoice = 'auto' | RenderQuality;

/** The order the menu's button goes through. */
export const GRAPHICS_CHOICES: readonly GraphicsChoice[] = ['auto', 'high', 'medium', 'low'];

const CHOICE_KEY = 'pacman.graphics';
const AUTO_KEY = 'pacman.graphics.auto';

export function isGraphicsChoice(value: unknown): value is GraphicsChoice {
	return value === 'auto' || isRenderQuality(value);
}

/** The choice after `choice` in the menu's order, round and round. */
export function nextGraphicsChoice(choice: GraphicsChoice): GraphicsChoice {
	const at = GRAPHICS_CHOICES.indexOf(choice);
	return GRAPHICS_CHOICES[(at + 1) % GRAPHICS_CHOICES.length]!;
}

/** What Auto found last time, from its stored text; a fresh start for anything else. */
export function parseAutoQuality(raw: string | null): AutoQualityState {
	const fresh: AutoQualityState = { quality: 'high', settled: false };
	if (!raw) {
		return fresh;
	}
	try {
		const value: unknown = JSON.parse(raw);
		if (typeof value !== 'object' || value === null) {
			return fresh;
		}
		const { quality, settled } = value as { quality?: unknown; settled?: unknown };
		return isRenderQuality(quality) ? { quality, settled: settled === true } : fresh;
	} catch {
		return fresh;
	}
}

function load(): GraphicsChoice {
	try {
		const raw = localStorage.getItem(CHOICE_KEY);
		return isGraphicsChoice(raw) ? raw : 'auto';
	} catch {
		return 'auto';
	}
}

const store = writable<GraphicsChoice>(load());

/** The graphics setting; read by the game (which applies it) and the screens (which show it). */
export const graphics = {
	subscribe: store.subscribe,
	set(value: GraphicsChoice): void {
		try {
			localStorage.setItem(CHOICE_KEY, value);
			// picking Auto again makes it look from the top
			if (value === 'auto') {
				localStorage.removeItem(AUTO_KEY);
			}
		} catch {
			// storage blocked or full: the choice lasts until the page closes
		}
		store.set(value);
	},
	/** The menu's button: the next choice in its order. */
	cycle(): void {
		let current: GraphicsChoice = 'auto';
		store.subscribe((value) => (current = value))();
		graphics.set(nextGraphicsChoice(current));
	}
};

/** The tier Auto found in an earlier game on this machine. */
export function loadAutoQuality(): AutoQualityState {
	try {
		return parseAutoQuality(localStorage.getItem(AUTO_KEY));
	} catch {
		return parseAutoQuality(null);
	}
}

export function saveAutoQuality(state: AutoQualityState): void {
	try {
		localStorage.setItem(AUTO_KEY, JSON.stringify(state));
	} catch {
		// storage blocked or full: Auto looks again next time
	}
}
