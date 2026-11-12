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

const VOLUME_KEY = 'pacman.volume';

/** A volume in 0..1 (anything else falls back to 1, or is clamped). */
function clampVolume(value: number): number {
	return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 1;
}

function loadVolume(): number {
	try {
		const raw = localStorage.getItem(VOLUME_KEY);
		return raw === null ? 1 : clampVolume(Number(raw));
	} catch {
		return 1;
	}
}

const volumeStore = writable<number>(loadVolume());

/**
 * The master volume, 0..1, under the mute switch: the samples and the arcade synth scale by
 * it. Remembered in this browser like the mute.
 */
export const volume = {
	subscribe: volumeStore.subscribe,
	set(value: number): void {
		const v = clampVolume(value);
		try {
			localStorage.setItem(VOLUME_KEY, String(Math.round(v * 100) / 100));
		} catch {
			// storage blocked or full: the choice lasts until the page closes
		}
		volumeStore.set(v);
	}
};
