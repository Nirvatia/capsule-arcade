import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class FakeStorage {
	private readonly data = new Map<string, string>();
	getItem(key: string): string | null {
		return this.data.get(key) ?? null;
	}
	setItem(key: string, value: string): void {
		this.data.set(key, value);
	}
}

describe('world music', () => {
	beforeEach(() => {
		vi.resetModules();
	});
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("plays the hell's track in place of the siren, pauses it for the fright and resumes it", async () => {
		vi.stubGlobal('localStorage', new FakeStorage());
		const made: FakeAudio[] = [];
		class FakeAudio {
			muted = false;
			loop = false;
			volume = 1;
			currentTime = 0;
			preload = '';
			paused = true;
			constructor(public src: string) {
				made.push(this);
			}
			pause(): void {
				this.paused = true;
			}
			play(): Promise<void> {
				this.paused = false;
				return Promise.resolve();
			}
		}
		vi.stubGlobal('Audio', FakeAudio);
		vi.stubGlobal('window', {});
		const { EventBus } = await import('../engine/EventBus');
		const { PacmanAudioPlayer } = await import('./PacmanAudioPlayer');
		let world: string | null = 'hell';
		const events = new EventBus<import('../core/Events').PacmanEventMap>();
		const player = new PacmanAudioPlayer(events, undefined, () => world);
		const playing = () => made.filter((a) => !a.paused).map((a) => a.src.split('/').pop());
		const state = (s: import('../core/Events').PacmanStateName) =>
			events.emit('ui:stateChanged', { state: s } as never);

		state('playing');
		expect(playing()).toEqual(['hell.ogg']);
		const track = made.find((a) => a.src.endsWith('hell.ogg'))!;
		expect(track.loop).toBe(true);
		track.currentTime = 12;

		events.emit('audio:cue', { cue: 'power-start' });
		expect(playing()).toEqual(['fright.wav']);
		events.emit('audio:cue', { cue: 'power-end' });
		expect(playing()).toEqual(['hell.ogg']);
		expect(track.currentTime).toBe(12);

		// a season world keeps the siren
		state('ready');
		world = 'summer';
		state('playing');
		expect(playing()).toEqual(['siren0.wav']);
		expect(track.paused).toBe(true);
		player.destroy();
	});

	it("plays the station's calm with the dread layer as loud as the infection, then the escape's track", async () => {
		vi.stubGlobal('localStorage', new FakeStorage());
		const made: FakeAudio[] = [];
		class FakeAudio {
			muted = false;
			loop = false;
			volume = 1;
			currentTime = 0;
			preload = '';
			paused = true;
			constructor(public src: string) {
				made.push(this);
			}
			pause(): void {
				this.paused = true;
			}
			play(): Promise<void> {
				this.paused = false;
				return Promise.resolve();
			}
		}
		vi.stubGlobal('Audio', FakeAudio);
		vi.stubGlobal('window', {});
		const { EventBus } = await import('../engine/EventBus');
		const { PacmanAudioPlayer } = await import('./PacmanAudioPlayer');
		let world: string | null = 'station';
		let infection = 0.1;
		const events = new EventBus<import('../core/Events').PacmanEventMap>();
		const player = new PacmanAudioPlayer(
			events,
			undefined,
			() => world,
			() => ({ infection })
		);
		const playing = () =>
			made
				.filter((a) => !a.paused && a.src.endsWith('.ogg'))
				.map((a) => a.src.split('/').pop())
				.sort();
		events.emit('ui:stateChanged', { state: 'playing' } as never);
		expect(playing()).toEqual(['station-calm.ogg', 'station-dread.ogg']);
		const dread = made.find((a) => a.src.endsWith('station-dread.ogg'))!;
		const quiet = dread.volume;
		infection = 0.9;
		events.emit('audio:cue', { cue: 'dot' });
		expect(dread.volume).toBeGreaterThan(quiet);
		// the alarm: the escape's track, no calm, no dread
		world = 'station-escape';
		events.emit('audio:station', { sound: 'alarm' });
		expect(playing()).toEqual(['station-escape.ogg']);
		player.destroy();
	});
});
