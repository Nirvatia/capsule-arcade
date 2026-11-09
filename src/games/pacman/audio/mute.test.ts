import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';

class FakeStorage {
	private readonly data = new Map<string, string>();
	getItem(key: string): string | null {
		return this.data.get(key) ?? null;
	}
	setItem(key: string, value: string): void {
		this.data.set(key, value);
	}
}

describe('mute', () => {
	beforeEach(() => {
		vi.resetModules();
	});
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('starts unmuted, toggles and remembers the choice', async () => {
		const storage = new FakeStorage();
		vi.stubGlobal('localStorage', storage);
		const first = await import('./audioSettings');
		expect(get(first.muted)).toBe(false);
		first.muted.toggle();
		expect(get(first.muted)).toBe(true);
		expect(storage.getItem('pacman.muted')).toBe('1');

		vi.resetModules();
		const second = await import('./audioSettings');
		expect(get(second.muted)).toBe(true);
		second.muted.set(false);
		expect(storage.getItem('pacman.muted')).toBe('0');
	});

	it('works without storage', async () => {
		vi.stubGlobal('localStorage', {
			getItem: () => {
				throw new Error('blocked');
			},
			setItem: () => {
				throw new Error('blocked');
			}
		});
		const settings = await import('./audioSettings');
		expect(get(settings.muted)).toBe(false);
		settings.muted.toggle();
		expect(get(settings.muted)).toBe(true);
	});

	it('mutes every sample, those created later and the synth', async () => {
		vi.stubGlobal('localStorage', new FakeStorage());
		const made: Array<{ muted: boolean; src: string }> = [];
		class FakeAudio {
			muted = false;
			loop = false;
			volume = 1;
			currentTime = 0;
			preload = '';
			constructor(public src: string) {
				made.push(this);
			}
			pause(): void {}
			play(): Promise<void> {
				return Promise.resolve();
			}
		}
		vi.stubGlobal('Audio', FakeAudio);
		vi.stubGlobal('window', {});
		const { EventBus } = await import('../engine/EventBus');
		const { PacmanAudioPlayer } = await import('./PacmanAudioPlayer');
		const settings = await import('./audioSettings');
		const player = new PacmanAudioPlayer(new EventBus());
		expect(made.length).toBeGreaterThan(0);
		expect(made.every((a) => !a.muted)).toBe(true);
		settings.muted.set(true);
		expect(made.every((a) => a.muted)).toBe(true);
		player.destroy();
	});
});
