import { writable } from 'svelte/store';

const STORAGE_KEY = 'pacman.muted';

function load(): boolean {
	try {
		return localStorage.getItem(STORAGE_KEY) === '1';
	} catch {
		return false;
	}
}

function save(muted: boolean): void {
	try {
		localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
	} catch {
		// storage blocked or full: the choice lasts until the page closes
	}
}

const store = writable<boolean>(load());

/** Is the sound switched off. Remembered in this browser; read by the audio player and the UI. */
export const muted = {
	subscribe: store.subscribe,
	set(value: boolean): void {
		save(value);
		store.set(value);
	},
	toggle(): void {
		store.update((value) => {
			save(!value);
			return !value;
		});
	}
};
