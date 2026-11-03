// Процедурные звуки на WebAudio (без файлов) и фоновая музыка.

import { MUSIC_SRC } from '../config';
import type { SimEvent } from '../sim/types';

export class Sound {
	private ctx: AudioContext | null = null;
	private master: GainNode | null = null;
	private noise: AudioBuffer | null = null;
	private readonly music: HTMLAudioElement | null;
	private musicWanted = false;
	muted = false;

	constructor() {
		this.music = typeof Audio !== 'undefined' ? new Audio(MUSIC_SRC) : null;
		if (this.music) {
			this.music.loop = true;
			this.music.volume = 0.32;
		}
	}

	/** Браузер разрешает звук только после жеста пользователя. */
	unlock(): void {
		if (!this.ctx) {
			const Ctor =
				window.AudioContext ??
				(window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
			if (!Ctor) return;
			this.ctx = new Ctor();
			this.master = this.ctx.createGain();
			this.master.gain.value = this.muted ? 0 : 0.55;
			this.master.connect(this.ctx.destination);
			const len = this.ctx.sampleRate;
			this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
			const d = this.noise.getChannelData(0);
			for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
		}
		if (this.ctx.state === 'suspended') void this.ctx.resume();
		this.syncMusic();
	}

	setMuted(m: boolean): void {
		this.muted = m;
		if (this.master) this.master.gain.value = m ? 0 : 0.55;
		if (this.music) this.music.muted = m;
	}

	setMusic(on: boolean): void {
		this.musicWanted = on;
		this.syncMusic();
	}

	private syncMusic(): void {
		if (!this.music) return;
		if (this.musicWanted && this.ctx) {
			void this.music.play().catch(() => {});
		} else {
			this.music.pause();
		}
	}

	destroy(): void {
		if (this.music) {
			this.music.pause();
			this.music.src = '';
		}
		void this.ctx?.close();
		this.ctx = null;
	}

	play(e: SimEvent): void {
		switch (e.type) {
			case 'eat':
				return this.tone(e.bit ? 740 : 520, e.bit ? 1100 : 380, 0.09, 'triangle', 0.35);
			case 'strike':
				if (e.ok) {
					[196, 294, 392, 587].forEach((f, i) =>
						this.tone(f, f * 0.995, 1.4 - i * 0.2, 'sine', 0.28 - i * 0.05, i * 0.012)
					);
					this.hit(0.25, 180, 0.5);
				} else {
					this.tone(110, 55, 0.35, 'sawtooth', 0.25);
					this.hit(0.35, 900, 0.45);
				}
				return;
			case 'not':
				return this.tone(300, 1300, 0.45, 'square', 0.12);
			case 'death':
				this.tone(220, 40, 1.1, 'sawtooth', 0.22);
				return this.hit(1.0, 400, 0.4);
			case 'act':
				this.tone(392, 392, 0.5, 'sine', 0.25);
				return this.tone(587, 587, 0.8, 'sine', 0.22, 0.18);
			case 'alphaSpawn':
				return this.hit(0.25, 300, 0.2);
			case 'runeSpawn':
				return this.tone(880, 1320, 0.25, 'sine', 0.12);
		}
	}

	private tone(
		f0: number,
		f1: number,
		dur: number,
		type: OscillatorType,
		vol: number,
		delay = 0
	): void {
		const ctx = this.ctx;
		if (!ctx || !this.master || this.muted) return;
		const t = ctx.currentTime + delay;
		const o = ctx.createOscillator();
		const g = ctx.createGain();
		o.type = type;
		o.frequency.setValueAtTime(f0, t);
		o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
		g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
		o.connect(g).connect(this.master);
		o.start(t);
		o.stop(t + dur + 0.05);
	}

	private hit(dur: number, cutoff: number, vol: number): void {
		const ctx = this.ctx;
		if (!ctx || !this.master || !this.noise || this.muted) return;
		const t = ctx.currentTime;
		const src = ctx.createBufferSource();
		src.buffer = this.noise;
		const f = ctx.createBiquadFilter();
		f.type = 'lowpass';
		f.frequency.value = cutoff;
		const g = ctx.createGain();
		g.gain.setValueAtTime(vol, t);
		g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
		src.connect(f).connect(g).connect(this.master);
		src.start(t);
		src.stop(t + dur + 0.05);
	}
}
