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

	it('remembers the volume, clamped to 0..1, starting at full', async () => {
		const storage = new FakeStorage();
		vi.stubGlobal('localStorage', storage);
		const first = await import('./audioSettings');
		expect(get(first.volume)).toBe(1);
		first.volume.set(0.4);
		expect(storage.getItem('pacman.volume')).toBe('0.4');
		first.volume.set(7);
		expect(get(first.volume)).toBe(1);
		first.volume.set(0.25);

		vi.resetModules();
		const second = await import('./audioSettings');
		expect(get(second.volume)).toBe(0.25);
	});

	it('scales every sample by the volume, a loop that is playing too', async () => {
		vi.stubGlobal('localStorage', new FakeStorage());
		const made: Array<{ volume: number; src: string }> = [];
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
		const events = new EventBus<import('../core/Events').PacmanEventMap>();
		const player = new PacmanAudioPlayer(events);
		events.emit('ui:stateChanged', { state: 'playing' });
		const siren = made.find((a) => a.src.includes('siren0'))!;
		const full = siren.volume;
		expect(full).toBeGreaterThan(0);
		settings.volume.set(0.5);
		expect(siren.volume).toBeCloseTo(full * 0.5, 6);
		events.emit('audio:cue', { cue: 'dot' });
		const dot = made.find((a) => a.src.includes('eat_dot_'))!;
		expect(dot.volume).toBeCloseTo(0.55 * 0.5, 6);
		settings.volume.set(0);
		expect(siren.volume).toBe(0);
		player.destroy();
	});
});
