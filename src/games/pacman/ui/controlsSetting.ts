// Touch screens: whether this is one, and how the player steers on it (swipes on the maze, or
// an on-screen pad as well). Remembered in this browser, like the sound and the graphics.

import { readable, writable } from 'svelte/store';

export type ControlScheme = 'swipe' | 'pad';

/** The order the menu's button goes through. */
export const CONTROL_SCHEMES: readonly ControlScheme[] = ['swipe', 'pad'];

const KEY = 'pacman.controls';

export function isControlScheme(value: unknown): value is ControlScheme {
	return value === 'swipe' || value === 'pad';
}

export function nextControlScheme(scheme: ControlScheme): ControlScheme {
	const at = CONTROL_SCHEMES.indexOf(scheme);
	return CONTROL_SCHEMES[(at + 1) % CONTROL_SCHEMES.length] ?? 'swipe';
}

/** Whether the screen is touched rather than pointed at (a phone or a tablet). */
function detectTouch(): boolean {
	if (typeof window === 'undefined') {
		return false;
	}
	try {
		if (window.matchMedia?.('(pointer: coarse)').matches) {
			return true;
		}
	} catch {
		// an old browser: fall through
	}
	return (navigator.maxTouchPoints ?? 0) > 0 && !window.matchMedia?.('(pointer: fine)').matches;
}

/** True on a touch screen; it follows the primary pointer if that changes (a tablet's keyboard). */
export const touchDevice = readable(detectTouch(), (set) => {
	if (typeof window === 'undefined' || !window.matchMedia) {
		return;
	}
	const query = window.matchMedia('(pointer: coarse)');
	const update = () => set(detectTouch());
	query.addEventListener?.('change', update);
	return () => query.removeEventListener?.('change', update);
});

function load(): ControlScheme {
	try {
		const raw = localStorage.getItem(KEY);
		return isControlScheme(raw) ? raw : 'swipe';
	} catch {
		return 'swipe';
	}
}

const store = writable<ControlScheme>(typeof window === 'undefined' ? 'swipe' : load());

/** How the player steers on a touch screen; the menu cycles it, the pad shows for `pad`. */
export const controls = {
	subscribe: store.subscribe,
	set(value: ControlScheme): void {
		try {
			localStorage.setItem(KEY, value);
		} catch {
			// storage blocked or full: the choice lasts until the page closes
		}
		store.set(value);
	},
	cycle(): void {
		let now: ControlScheme = 'swipe';
		store.subscribe((value) => (now = value))();
		controls.set(nextControlScheme(now));
	}
};
