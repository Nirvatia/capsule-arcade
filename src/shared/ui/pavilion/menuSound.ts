class MenuSound {
	enabled = true;
	private ctx: AudioContext | null = null;

	private tone(
		from: number,
		to: number,
		duration: number,
		wave: OscillatorType,
		volume: number,
		delay = 0
	) {
		if (!this.enabled) {
			return;
		}

		this.ctx ??= new AudioContext();
		const t = this.ctx.currentTime + delay;
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();
		osc.type = wave;
		osc.frequency.setValueAtTime(from, t);
		osc.frequency.exponentialRampToValueAtTime(to, t + duration);
		gain.gain.setValueAtTime(volume, t);
		gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
		osc.connect(gain).connect(this.ctx.destination);
		osc.start(t);
		osc.stop(t + duration);
	}

	tick() {
		this.tone(1100, 800, 0.04, 'square', 0.04);
	}

	crank() {
		for (let k = 0; k < 6; k++) {
			this.tone(320 + k * 25, 180, 0.035, 'square', 0.05, k * 0.1);
		}
	}

	thunk() {
		this.tone(190, 50, 0.2, 'sine', 0.3);
	}

	pop() {
		this.tone(420, 1000, 0.1, 'triangle', 0.14);
	}
}

export const menuSound = new MenuSound();
