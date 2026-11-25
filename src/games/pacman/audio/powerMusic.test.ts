import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../engine/EventBus';
import type { PacmanAudioCue, PacmanEventMap, PacmanProfile } from '../core/Events';
import { buildLevelSession, resetLevelSession } from '../logic/level/LevelSession';
import { seasonForLevel } from '../logic/level/SeasonCatalog';

class FakeStorage {
	private readonly data = new Map<string, string>();
	getItem(key: string): string | null {
		return this.data.get(key) ?? null;
	}
	setItem(key: string, value: string): void {
		this.data.set(key, value);
	}
}

function poweredSession(profile: PacmanProfile) {
	const events = new EventBus<PacmanEventMap>();
	const cues: PacmanAudioCue[] = [];
	events.on('audio:cue', ({ cue }) => {
		if (cue === 'power-start' || cue === 'power-end') cues.push(cue);
	});
	const session = buildLevelSession({
		events,
		level: 1,
		profile,
		season: seasonForLevel(1),
		hell: false,
		secret: false,
		godMode: false
	});
	resetLevelSession(session);
	session.combat.setProfile(profile);
	// nobody dies: only the power's own clock may end it
	session.combat.setShield({ shieldsHero: true });
	const { grid, progress, combat } = session;
	outer: for (let y = 0; y < grid.height; y += 1) {
		for (let x = 0; x < grid.width; x += 1) {
			if (grid.tileAt(x, y) === 'EU') {
				progress.collectAt(x, y);
				break outer;
			}
		}
	}
	combat.update(1 / 60);
	return { session, cues };
}

describe('the power music ends with the power', () => {
	it.each(['pacman', 'ms-pacman'] as const)('when it runs out (%s)', (profile) => {
		const { session, cues } = poweredSession(profile);
		expect(cues).toEqual(['power-start']);
		for (let t = 0; t < 30; t += 1 / 60) session.combat.update(1 / 60);
		expect(cues).toEqual(['power-start', 'power-end']);
	});

	it.each(['pacman', 'ms-pacman'] as const)('when the level ends in it (%s)', (profile) => {
		const { session, cues } = poweredSession(profile);
		session.combat.debugComplete();
		expect(cues).toEqual(['power-start', 'power-end']);
	});
});

describe('the fright loop', () => {
	beforeEach(() => {
		vi.resetModules();
	});
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('is not carried into the next level or life, even if no power-end came', async () => {
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
		const { EventBus: Bus } = await import('../engine/EventBus');
		const { PacmanAudioPlayer } = await import('./PacmanAudioPlayer');
		const events = new Bus<PacmanEventMap>();
		const player = new PacmanAudioPlayer(events);
		const playing = () => made.filter((a) => !a.paused).map((a) => a.src.split('/').pop());
		const state = (s: import('../core/Events').PacmanStateName) =>
			events.emit('ui:stateChanged', { state: s } as never);

		state('playing');
		events.emit('audio:cue', { cue: 'power-start' });
		expect(playing()).toEqual(['fright.wav']);
		// a pause keeps it
		state('paused');
		state('playing');
		expect(playing()).toEqual(['fright.wav']);
		// the level is left in the power without a power-end (a jump, a muted moment)
		state('ready');
		state('playing');
		expect(playing()).toEqual(['siren0.wav']);
		player.destroy();
	});
});
