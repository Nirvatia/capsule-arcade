import type { EventBus } from '../engine/EventBus';
import type { PacmanAudioCue, PacmanEventMap, PacmanStateName } from '../core/Events';
import { ArcadeSynth } from './ArcadeSynth';
import { StationSynth } from './StationSynth';
import { muted, volume } from './audioSettings';

/** Is the arcade (secret level) running, and how far its dots are eaten (0..1). */
export type ArcadeProbe = () => { readonly active: boolean; readonly urgency: number };
/** The world being played ('hell', 'station', a season's name…), or null before a level. */
export type WorldProbe = () => string | null;
/** The station level's state for its music: the infection (0..1) brings up the dread layer. */
export type StationProbe = () => { readonly infection: number } | null;

/** The station's dread layer, over its music, as loud as the infection is far (OST.md). */
const STATION_DREAD = { file: '/assets/pacman/music/station-dread.ogg', volume: 0.55 } as const;

/**
 * A world's own music, looped under the play in place of the siren (OST.md): paused, not lost,
 * while the power's fright plays, a pause, a death; started over on a new game.
 */
export const WORLD_MUSIC: Readonly<
	Record<string, { readonly file: string; readonly volume: number }>
> = {
	hell: { file: '/assets/pacman/music/hell.ogg', volume: 0.5 },
	station: { file: '/assets/pacman/music/station-calm.ogg', volume: 0.45 },
	'station-escape': { file: '/assets/pacman/music/station-escape.ogg', volume: 0.5 }
};

const AUDIO_BASE = '/assets/pacman/sfx/';

const PRELOAD_FILES: readonly string[] = [
	'start.wav',
	'siren0.wav',
	'fright.wav',
	'eat_dot_0.wav',
	'eat_dot_1.wav',
	'eat_fruit.wav',
	'eat_ghost.wav',
	'death_0.wav',
	'death_1.wav',
	'intermission.wav',
	'extend.wav',
	'eyes.wav'
];

/** Every sample the game plays, started once by the first touch (`unlock`). */
const UNLOCK_SOUNDS = [
	'credit.wav',
	'death_0.wav',
	'death_1.wav',
	'eat_dot_0.wav',
	'eat_dot_1.wav',
	'eat_fruit.wav',
	'eat_ghost.wav',
	'extend.wav',
	'eyes.wav',
	'fright.wav',
	'intermission.wav',
	'siren0.wav',
	'start.wav'
] as const;

export class PacmanAudioPlayer {
	private readonly events: EventBus<PacmanEventMap>;
	private readonly available: boolean;
	private readonly sounds = new Map<string, HTMLAudioElement>();
	private background: HTMLAudioElement | null = null;
	private state: PacmanStateName = 'menu';
	private powerActive = false;
	private dotToggle = false;
	private deathToggle = false;
	private readonly unsubscribeState: () => void;
	private readonly unsubscribeCue: () => void;
	private readonly unsubscribeMuted: () => void;
	private readonly unsubscribeVolume: () => void;
	private muted = false;
	/** The master volume, 0..1, and each sample's own level before it. */
	private master = 1;
	private readonly levels = new Map<HTMLAudioElement, number>();
	/** The arcade has its own chiptune sound; the sample sounds stay out of it. */
	private readonly synth = new ArcadeSynth();
	/** The station's own effects. */
	private readonly stationSynth = new StationSynth();
	private readonly station: StationProbe;
	private readonly unsubscribeStation: () => void;
	/** The station's dread layer while it plays. */
	private dread: HTMLAudioElement | null = null;
	private unlocked = false;
	/** Samples the unlock started and has not stopped yet; the game playing one takes it over. */
	private readonly unlocking = new Set<HTMLAudioElement>();
	private readonly arcade: ArcadeProbe;
	private arcadeUrgency = 0;
	private arcadePower = false;
	private readonly world: WorldProbe;
	/** The world music playing or paused now, null when none. */
	private music: HTMLAudioElement | null = null;

	constructor(
		events: EventBus<PacmanEventMap>,
		arcade: ArcadeProbe = () => ({ active: false, urgency: 0 }),
		world: WorldProbe = () => null,
		station: StationProbe = () => null
	) {
		if (!events) {
			console.error('PacmanAudioPlayer.constructor', 'missing event bus');
			throw new Error('PacmanAudioPlayer.constructor: missing event bus');
		}
		this.events = events;
		this.arcade = arcade;
		this.world = world;
		this.station = station;
		this.available = typeof window !== 'undefined' && typeof Audio !== 'undefined';
		this.unsubscribeState = events.on('ui:stateChanged', (payload) => {
			this.handleState(payload.state);
		});
		this.unsubscribeCue = events.on('audio:cue', (payload) => {
			this.handleCue(payload.cue);
			if (payload.cue === 'dot') this.syncDread();
		});
		this.unsubscribeStation = events.on('audio:station', (payload) => {
			this.stationSynth.play(payload.sound);
			// the alarm turns the music to the escape's
			if (payload.sound === 'alarm' || payload.sound === 'out') this.updateBackground();
			else this.syncDread();
		});
		this.preload();
		this.unsubscribeMuted = muted.subscribe((value) => {
			this.applyMuted(value);
		});
		this.unsubscribeVolume = volume.subscribe((value) => {
			this.applyVolume(value);
		});
	}

	destroy(): void {
		this.unsubscribeMuted();
		this.unsubscribeVolume();
		this.unsubscribeState();
		this.unsubscribeCue();
		this.unsubscribeStation();
		this.stopBackground();
		this.dread?.pause();
		this.stationSynth.destroy();
		this.stopMusic();
		this.synth.destroy();
		for (const audio of this.sounds.values()) {
			audio.pause();
		}
		this.sounds.clear();
	}

	/** Mutes the sample sounds (loops keep running, silent) and the synth. */
	private applyMuted(value: boolean): void {
		this.muted = value;
		this.synth.setMuted(value);
		this.stationSynth.setMuted(value);
		for (const audio of this.sounds.values()) {
			audio.muted = value;
		}
	}

	/** Scales every sample (a loop playing now too) and the synth by the master volume. */
	private applyVolume(value: number): void {
		this.master = value;
		this.synth.setVolume(value);
		this.stationSynth.setVolume(value);
		for (const [audio, level] of this.levels) {
			audio.volume = this.scaled(level);
		}
	}

	private scaled(level: number): number {
		return Math.min(1, Math.max(0, level * this.master));
	}

	/** Sets a sample's own level, scaled by the master volume. */
	private setLevel(audio: HTMLAudioElement, level: number): void {
		this.levels.set(audio, level);
		audio.volume = this.scaled(level);
	}

	private preload(): void {
		if (!this.available) {
			return;
		}
		for (const name of PRELOAD_FILES) {
			this.sound(name);
		}
	}

	private handleState(next: PacmanStateName): void {
		if (this.arcade().active) {
			this.stopBackground();
			this.stop('start.wav');
			this.state = next;
			if (next !== 'playing' && next !== 'paused') {
				this.powerActive = false;
			}
			if (next === 'ready') {
				this.arcadePower = false;
				this.synth.play('start');
			}
			this.updateArcadeLoop();
			return;
		}
		this.synth.setLoop(null);
		if (next !== 'ready') {
			this.stop('start.wav');
		}
		if (next !== 'playing' && next !== 'paused') {
			// the power never outlives its life or level: a power-end lost on the way (a level
			// left in the power) must not leave the fright looping for good
			this.powerActive = false;
		}
		if (next === 'menu' || next === 'game-over') {
			this.stopMusic();
		}
		this.state = next;
		this.updateBackground();
	}

	private handleCue(cue: PacmanAudioCue): void {
		if (this.arcade().active) {
			this.handleArcadeCue(cue);
			return;
		}
		if (cue === 'intermission') {
			return;
		}
		if (cue === 'intro') {
			// the new-game jingle; leaving READY stops it (see handleState)
			this.play('start.wav', 0.8);
			return;
		}
		if (cue === 'dot' && this.station()) {
			// the station's own chomp
			this.stationSynth.play('eat');
			return;
		}
		if (cue === 'energizer' && this.station()) {
			// the station run plays the cell's own sound
			return;
		}
		if (cue === 'dot') {
			this.dotToggle = !this.dotToggle;
			this.play(this.dotToggle ? 'eat_dot_0.wav' : 'eat_dot_1.wav', 0.55);
			return;
		}
		if (cue === 'energizer') {
			this.play('eat_fruit.wav', 0.6);
			return;
		}
		if (cue === 'power-start') {
			this.powerActive = true;
			this.updateBackground();
			return;
		}
		if (cue === 'power-end') {
			this.powerActive = false;
			this.updateBackground();
			return;
		}
		if (cue === 'ghost-eaten') {
			this.play('eat_ghost.wav', 0.7);
			return;
		}
		if (cue === 'death') {
			this.deathToggle = !this.deathToggle;
			this.play(this.deathToggle ? 'death_0.wav' : 'death_1.wav', 0.75);
			return;
		}
		if (cue === 'lose') {
			this.play('death_1.wav', 0.8);
			return;
		}
		if (cue === 'win') {
			this.play('intermission.wav', 0.8);
			return;
		}
		if (cue === 'fruit-spawn') {
			return;
		}
		if (cue === 'fruit-collect') {
			this.play('eat_fruit.wav', 0.65);
			return;
		}
		if (cue === 'fruit-expire') {
			return;
		}
		if (cue === 'egg-spawn') {
			this.play('extend.wav', 0.5);
			return;
		}
		if (cue === 'egg-collect') {
			this.play('eat_fruit.wav', 0.65);
			return;
		}
		if (cue === 'exit-open') {
			this.play('extend.wav', 0.65);
			return;
		}
		if (cue === 'exit-enter') {
			this.play('intermission.wav', 0.8);
			return;
		}
		if (cue === 'bonus-life') {
			this.play('extend.wav', 0.8);
			return;
		}
		if (cue === 'teleport') {
			this.play('eyes.wav', 0.55);
			return;
		}
		// the abilities borrow the arcade's sounds until they get their own
		if (cue === 'ability-take') {
			this.play('credit.wav', 0.6);
			return;
		}
		if (cue === 'ability-use') {
			this.play('extend.wav', 0.6);
			return;
		}
		if (cue === 'ability-fizzle') {
			this.play('eat_dot_1.wav', 0.35);
			return;
		}
		console.error('PacmanAudioPlayer.handleCue', 'unknown audio cue', cue);
	}

	/** The arcade's cues on the synth; READY plays the round jingle (see handleState). */
	private handleArcadeCue(cue: PacmanAudioCue): void {
		switch (cue) {
			case 'dot': {
				this.synth.play('chomp');
				// the hum rises in steps as the dots run out
				const urgency = Math.floor(this.arcade().urgency * 4) / 4;
				if (urgency !== this.arcadeUrgency) {
					this.arcadeUrgency = urgency;
					this.synth.setUrgency(urgency);
				}
				return;
			}
			case 'power-start':
				this.synth.play('power');
				this.arcadePower = true;
				this.updateArcadeLoop();
				return;
			case 'power-end':
				this.arcadePower = false;
				this.updateArcadeLoop();
				return;
			case 'ghost-eaten':
				this.synth.play('ghost');
				return;
			case 'fruit-collect':
				this.synth.play('fruit');
				return;
			case 'bonus-life':
				this.synth.play('extra');
				return;
			case 'death':
				this.arcadePower = false;
				this.synth.setLoop(null);
				this.synth.play('death');
				return;
			case 'win':
				this.synth.setLoop(null);
				this.synth.play('clear');
				return;
			case 'intermission':
				this.synth.play('intermission');
				return;
			default:
				return;
		}
	}

	private updateArcadeLoop(): void {
		if (this.state !== 'playing') {
			this.synth.setLoop(null);
			return;
		}
		this.synth.setLoop(this.arcadePower ? 'scared' : 'hum');
	}

	private updateBackground(): void {
		this.syncDread();
		const track = WORLD_MUSIC[this.world() ?? ''] ?? null;
		if (this.state !== 'playing') {
			this.stopBackground();
			this.pauseMusic();
			return;
		}
		if (this.powerActive) {
			this.pauseMusic();
			this.startLoop('fright.wav', 0.3);
			return;
		}
		if (track) {
			this.stopBackground();
			this.playMusic(track.file, track.volume);
			return;
		}
		this.stopMusic();
		this.startLoop('siren0.wav', 0.25);
	}

	/** The station's dread layer: on under its calm music, as loud as the infection is far. */
	private syncDread(): void {
		const probe = this.station();
		const on =
			probe !== null &&
			this.state === 'playing' &&
			!this.powerActive &&
			this.world() === 'station' &&
			this.available;
		if (!on) {
			this.dread?.pause();
			return;
		}
		const audio = this.sound(STATION_DREAD.file);
		if (!audio) return;
		if (this.dread !== audio) {
			audio.currentTime = 0;
			this.dread = audio;
		}
		this.claim(audio);
		audio.loop = true;
		this.setLevel(audio, STATION_DREAD.volume * Math.pow(probe.infection, 1.2));
		if (audio.paused) void audio.play().catch(() => undefined);
	}

	/** The world's track from where it was paused (from the start for another track). */
	private playMusic(file: string, volume: number): void {
		const audio = this.sound(file);
		if (!audio) {
			return;
		}
		if (this.music !== audio) {
			this.stopMusic();
			audio.currentTime = 0;
			this.music = audio;
		}
		this.claim(audio);
		audio.loop = true;
		this.setLevel(audio, volume);
		if (audio.paused) {
			void audio.play().catch(() => undefined);
		}
	}

	private pauseMusic(): void {
		this.music?.pause();
	}

	private stopMusic(): void {
		if (!this.music) {
			return;
		}
		this.music.pause();
		this.music.currentTime = 0;
		this.music = null;
	}

	private startLoop(name: string, volume: number): void {
		if (!this.available) {
			return;
		}
		const audio = this.sound(name);
		if (!audio) {
			return;
		}
		if (this.background === audio) {
			return;
		}
		this.stopBackground();
		this.claim(audio);
		audio.loop = true;
		this.setLevel(audio, Math.max(0, volume));
		audio.currentTime = 0;
		void audio.play().catch(() => undefined);
		this.background = audio;
	}

	private stopBackground(): void {
		if (!this.background) {
			return;
		}
		this.background.pause();
		this.background.loop = false;
		this.background.currentTime = 0;
		this.background = null;
	}

	/**
	 * The first touch on a phone: a browser there plays a sound only after a gesture has started
	 * it, so every sample is started (muted) and stopped once inside that gesture.
	 */
	unlock(): void {
		if (this.unlocked || !this.available) {
			return;
		}
		this.unlocked = true;
		this.synth.unlock();
		this.stationSynth.unlock();
		for (const name of UNLOCK_SOUNDS) {
			const audio = this.sound(name);
			if (!audio || !audio.paused) {
				continue;
			}
			const volume = audio.volume;
			audio.muted = true;
			this.unlocking.add(audio);
			void audio
				.play()
				.then(() => {
					// the game may have started it meanwhile: then it is the game's to stop
					if (this.unlocking.has(audio)) {
						audio.pause();
						audio.currentTime = 0;
					}
				})
				.catch(() => undefined)
				.finally(() => {
					if (this.unlocking.delete(audio)) {
						audio.muted = this.muted;
						audio.volume = volume;
					}
				});
		}
	}

	private play(name: string, volume: number): void {
		if (!this.available) {
			return;
		}
		const audio = this.sound(name);
		if (!audio) {
			return;
		}
		this.claim(audio);
		audio.loop = false;
		this.setLevel(audio, Math.max(0, volume));
		audio.currentTime = 0;
		void audio.play().catch(() => undefined);
	}

	/** The game plays a sample the unlock is still holding: it is heard, at the game's mute. */
	private claim(audio: HTMLAudioElement): void {
		if (this.unlocking.delete(audio)) {
			audio.muted = this.muted;
		}
	}

	private stop(name: string): void {
		const audio = this.sounds.get(name);
		if (!audio) {
			return;
		}
		audio.pause();
		audio.loop = false;
		audio.currentTime = 0;
	}

	private sound(name: string): HTMLAudioElement | null {
		if (!this.available) {
			return null;
		}
		let audio = this.sounds.get(name);
		if (!audio) {
			// a sample's name, or an absolute path (the world music)
			audio = new Audio(name.startsWith('/') ? name : AUDIO_BASE + name);
			audio.preload = 'auto';
			this.sounds.set(name, audio);
		}
		return audio;
	}
}
