import { SpinKind } from '../core/types';
import type { EventBus } from '../engine/EventBus';

interface ToneOptions {
	freq: number;
	to?: number;
	duration: number;
	type?: OscillatorType;
	volume?: number;
	delay?: number;
}

const CLEAR_NOTES = [523.25, 659.25, 783.99, 1046.5];
const FANFARE = [392, 523.25, 659.25, 783.99, 1046.5];

export class Sfx {
	private ctx: AudioContext | null = null;
	private master: GainNode | null = null;
	private noiseBuffer: AudioBuffer | null = null;
	private readonly abort = new AbortController();
	private readonly unsubscribe: (() => void)[];

	constructor(
		bus: EventBus,
		private muted: boolean
	) {
		this.unsubscribe = [
			bus.on('move', () =>
				this.tone({ freq: 210, duration: 0.025, type: 'square', volume: 0.025 })
			),
			bus.on('rotate', (e) =>
				this.tone({
					freq: e.kicked ? 600 : 520,
					to: 700,
					duration: 0.05,
					type: 'triangle',
					volume: 0.06
				})
			),
			bus.on('hold', () =>
				this.tone({ freq: 330, to: 495, duration: 0.09, type: 'triangle', volume: 0.07 })
			),
			bus.on('hardDrop', () => {
				this.noise(0.09, 0.16, 700);
				this.tone({ freq: 110, to: 45, duration: 0.14, type: 'sine', volume: 0.22 });
			}),
			bus.on('lock', () =>
				this.tone({ freq: 150, to: 110, duration: 0.05, type: 'sine', volume: 0.08 })
			),
			bus.on('clear', (e) => {
				const notes = e.count === 0 ? 2 : Math.min(4, e.count);
				for (let i = 0; i < notes; i++) {
					this.tone({
						freq: CLEAR_NOTES[i] * (e.spin !== SpinKind.NONE ? 1.26 : 1),
						duration: 0.12,
						type: 'square',
						volume: 0.06,
						delay: i * 0.065
					});
				}
				if (e.count >= 4 || e.perfect) {
					this.tone({
						freq: 1046.5,
						to: 1568,
						duration: 0.35,
						type: 'triangle',
						volume: 0.09,
						delay: 0.28
					});
				}
			}),
			bus.on('levelUp', () =>
				FANFARE.forEach((f, i) =>
					this.tone({
						freq: f,
						duration: 0.14,
						type: 'square',
						volume: 0.06,
						delay: 0.45 + i * 0.09
					})
				)
			),
			bus.on('countdown', (e) =>
				this.tone({
					freq: e.step === 0 ? 880 : 440,
					duration: e.step === 0 ? 0.28 : 0.1,
					type: 'square',
					volume: 0.06
				})
			),
			bus.on('gameOver', () => {
				this.tone({ freq: 392, to: 70, duration: 1.1, type: 'sawtooth', volume: 0.09 });
				this.noise(0.6, 0.08, 400);
			})
		];
	}

	attach(): void {
		const signal = this.abort.signal;
		const unlock = (): void => {
			this.ensureContext();
		};
		window.addEventListener('pointerdown', unlock, { signal });
		window.addEventListener('keydown', unlock, { signal });
	}

	setMuted(muted: boolean): void {
		this.muted = muted;
		if (this.master) this.master.gain.value = muted ? 0 : 1;
	}

	destroy(): void {
		this.abort.abort();
		for (const off of this.unsubscribe) off();
		void this.ctx?.close().catch(() => undefined);
		this.ctx = null;
	}

	private ensureContext(): AudioContext | null {
		if (!this.ctx) {
			try {
				this.ctx = new AudioContext();
				this.master = this.ctx.createGain();
				this.master.gain.value = this.muted ? 0 : 1;
				this.master.connect(this.ctx.destination);
			} catch (error) {
				console.warn('[Tetris/Sfx] Web Audio is unavailable', error);
				return null;
			}
		}
		if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => undefined);
		return this.ctx;
	}

	private ready(): AudioContext | null {
		if (this.muted || !this.ctx || this.ctx.state !== 'running' || !this.master) return null;
		return this.ctx;
	}

	private tone({
		freq,
		to,
		duration,
		type = 'square',
		volume = 0.05,
		delay = 0
	}: ToneOptions): void {
		const ctx = this.ready();
		if (!ctx || !this.master) return;
		const t = ctx.currentTime + delay;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = type;
		osc.frequency.setValueAtTime(freq, t);
		if (to) osc.frequency.exponentialRampToValueAtTime(to, t + duration);
		gain.gain.setValueAtTime(volume, t);
		gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
		osc.connect(gain).connect(this.master);
		osc.start(t);
		osc.stop(t + duration + 0.02);
	}

	private noise(duration: number, volume: number, cutoff: number): void {
		const ctx = this.ready();
		if (!ctx || !this.master) return;
		if (!this.noiseBuffer) {
			this.noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
			const data = this.noiseBuffer.getChannelData(0);
			for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
		}
		const t = ctx.currentTime;
		const src = ctx.createBufferSource();
		src.buffer = this.noiseBuffer;
		const filter = ctx.createBiquadFilter();
		filter.type = 'lowpass';
		filter.frequency.value = cutoff;
		const gain = ctx.createGain();
		gain.gain.setValueAtTime(volume, t);
		gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
		src.connect(filter).connect(gain).connect(this.master);
		src.start(t);
		src.stop(t + duration + 0.02);
	}
}
