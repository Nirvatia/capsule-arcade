// Синтезированные 8-битные звуки (Web Audio, без файлов).

import type { Fx } from './SimonGame.svelte';
import type { Pad } from './logic/types';

const MUTE_KEY = 'simon1c_muted';
const MASTER_GAIN = 0.5;

// Ноты соль–до–ми–соль: любые сочетания нажатий звучат гармонично.
const PAD_HZ: Readonly<Record<Pad, number>> = { 0: 392, 1: 523.25, 2: 659.25, 3: 783.99 };

interface Tone {
	wave: OscillatorType;
	from: number;
	to?: number;
	ms: number;
	gain: number;
	at?: number;
}

export class SimonAudio {
	muted: boolean;
	private context: AudioContext | null = null;
	private master: GainNode | null = null;

	constructor() {
		this.muted = readMuted();
	}

	setMuted(value: boolean): void {
		this.muted = value;
		try {
			localStorage.setItem(MUTE_KEY, value ? '1' : '0');
		} catch {
			// хранилище недоступно — настройка просто не запомнится
		}
	}

	/** Вызывать из обработчика жеста пользователя, чтобы браузер разрешил звук. */
	unlock(): void {
		this.ensureContext();
	}

	destroy(): void {
		void this.context?.close().catch(() => undefined);
		this.context = null;
		this.master = null;
	}

	play(fx: Fx): void {
		switch (fx.type) {
			case 'start':
				return this.seq('square', [987.77, 1318.51], 90, 0.16);
			case 'pad':
				return this.pad(fx.pad, fx.playback ? 0.8 : 1);
			case 'order':
				if (fx.kind === 'break') {
					this.tone({ wave: 'sine', from: 523.25, ms: 160, gain: 0.12 });
					this.tone({ wave: 'sine', from: 392, ms: 220, gain: 0.12, at: 130 });
				} else {
					this.tone({ wave: 'square', from: 660, ms: 60, gain: 0.1 });
				}
				return;
			case 'success':
				if (fx.rest) return this.seq('sine', [392, 293.66], 260, 0.15);
				if (fx.lottery) return this.seq('triangle', [392, 523.25, 659.25, 880, 1174.66], 80, 0.16);
				if (fx.crit) return this.seq('square', [523.25, 783.99, 1046.5, 1567.98], 55, 0.14);
				return this.seq('square', [523.25, 659.25, 783.99], 70, 0.14);
			case 'fail':
				this.tone({ wave: 'sawtooth', from: 110, to: 55, ms: 520, gain: 0.26 });
				this.tone({ wave: 'square', from: 82, to: 41, ms: 520, gain: 0.14 });
				return;
			case 'levelUp':
				return this.seq('square', [523.25, 587.33, 659.25, 783.99, 1046.5], 85, 0.15);
			case 'gameOver':
				this.tone({ wave: 'sawtooth', from: 392, to: 98, ms: 900, gain: 0.2 });
				this.tone({ wave: 'triangle', from: 196, to: 49, ms: 1100, gain: 0.16, at: 120 });
				return;
		}
	}

	private pad(pad: Pad, scale: number): void {
		const hz = PAD_HZ[pad];
		this.tone({ wave: 'triangle', from: hz, ms: 260, gain: 0.24 * scale });
		this.tone({ wave: 'square', from: hz * 2, ms: 110, gain: 0.04 * scale });
	}

	private seq(wave: OscillatorType, notes: readonly number[], stepMs: number, gain: number): void {
		notes.forEach((from, index) => {
			this.tone({ wave, from, ms: stepMs * 1.5, gain, at: index * stepMs });
		});
	}

	private tone(spec: Tone): void {
		if (this.muted) return;
		const context = this.ensureContext();
		if (!context || !this.master) return;

		const start = context.currentTime + (spec.at ?? 0) / 1000;
		const duration = Math.max(0.03, spec.ms / 1000);
		const osc = context.createOscillator();
		const gain = context.createGain();

		osc.type = spec.wave;
		osc.frequency.setValueAtTime(spec.from, start);
		if (spec.to) osc.frequency.exponentialRampToValueAtTime(spec.to, start + duration);

		gain.gain.setValueAtTime(0.0001, start);
		gain.gain.exponentialRampToValueAtTime(spec.gain, start + Math.min(0.02, duration / 4));
		gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

		osc.connect(gain).connect(this.master);
		osc.start(start);
		osc.stop(start + duration + 0.02);
	}

	private ensureContext(): AudioContext | null {
		if (typeof window === 'undefined' || !('AudioContext' in window)) return null;

		if (!this.context) {
			this.context = new AudioContext();
			this.master = this.context.createGain();
			this.master.gain.value = MASTER_GAIN;
			this.master.connect(this.context.destination);
		}
		if (this.context.state === 'suspended') {
			void this.context.resume().catch(() => undefined);
		}
		return this.context;
	}
}

function readMuted(): boolean {
	try {
		return localStorage.getItem(MUTE_KEY) === '1';
	} catch {
		return false;
	}
}
