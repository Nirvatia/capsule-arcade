/**
 * The station's sound effects (DESIGN.md §7a, OST.md), synthesised with WebAudio, placeholders
 * until real samples: a sting for each play's tell (the fence's rising hum, the ambush's wet
 * clicks, the vent's hiss), the lurker's fold and its grab, a hit, the power cell's charge and
 * crack, the hatch charged, the alarm (a klaxon over a falling bass), the lure's sonar ping, the
 * way out, and the food: a soft wet pop on two pitches by turns (the station's own chomp). The AudioContext is created on the
 * first sound, after the player has pressed a key.
 */
export type StationSound =
	| 'tell-fence'
	| 'tell-ambush'
	| 'tell-vent'
	| 'fold'
	| 'grab'
	| 'hit'
	| 'power'
	| 'armed'
	| 'alarm'
	| 'lure'
	| 'out'
	| 'eat';

export class StationSynth {
	private ac: AudioContext | null = null;
	private master: GainNode | null = null;
	private noiseBuf: AudioBuffer | null = null;
	private muted = false;
	private volume = 1;
	private readonly available = typeof window !== 'undefined' && 'AudioContext' in window;
	/** The food's two pitches, by turns. */
	private eatTurn = false;

	play(sound: StationSound): void {
		const ac = this.context();
		if (!ac) return;
		const t = ac.currentTime + 0.01;
		switch (sound) {
			case 'tell-fence':
				// a hum rising as the emitters charge
				this.tone('sawtooth', 110, 230, t, 1.2, 0.09, 700);
				this.tone('sine', 220, 460, t, 1.2, 0.06);
				break;
			case 'tell-ambush':
				// wet clicks
				[0, 0.11, 0.19].forEach((d, i) =>
					this.noise(t + d, 0.05, 'bandpass', 2400 - i * 300, 1600, 0.2)
				);
				break;
			case 'tell-vent':
				// a hiss in the shafts, rising
				this.noise(t, 1.1, 'highpass', 900, 3800, 0.12);
				break;
			case 'fold':
				// a soft squelch falling
				this.noise(t, 0.35, 'bandpass', 1400, 300, 0.18);
				this.tone('sine', 180, 70, t, 0.35, 0.12);
				break;
			case 'grab':
				this.tone('sine', 90, 40, t, 0.3, 0.35);
				this.noise(t, 0.2, 'lowpass', 900, 300, 0.25);
				break;
			case 'hit':
				// a heavy thud and a crunch
				this.tone('sine', 120, 35, t, 0.45, 0.5);
				this.tone('square', 70, 50, t, 0.25, 0.08, 500);
				this.noise(t, 0.25, 'lowpass', 2200, 400, 0.3);
				break;
			case 'power':
				// the cell: an electric charge whining up, a crack, a low thump under it
				this.tone('sawtooth', 180, 1400, t, 0.32, 0.07, 3200);
				this.tone('sine', 360, 2200, t, 0.32, 0.06);
				this.noise(t + 0.3, 0.18, 'highpass', 2500, 7000, 0.22);
				this.tone('sine', 110, 40, t + 0.3, 0.4, 0.4);
				break;
			case 'armed':
				[0, 0.14, 0.28].forEach((d, i) =>
					this.tone('triangle', [523, 659, 784][i], [523, 659, 784][i], t + d, 0.35, 0.12)
				);
				break;
			case 'alarm':
				// the escape: a klaxon twice over a bass falling away under it
				[0, 0.55].forEach((d) => {
					this.tone('sawtooth', 420, 380, t + d, 0.5, 0.09, 1600);
					this.tone('sawtooth', 560, 510, t + d, 0.5, 0.06, 1600);
				});
				this.tone('sine', 130, 34, t, 1.2, 0.45);
				this.noise(t, 0.9, 'lowpass', 1200, 150, 0.12);
				break;
			case 'lure':
				// a sonar ping and its echo
				this.tone('sine', 1250, 1150, t, 0.9, 0.18);
				this.tone('sine', 1250, 1150, t + 0.32, 0.7, 0.06);
				break;
			case 'eat': {
				// a soft wet pop: a short falling blip and a breath of noise, two pitches by turns
				this.eatTurn = !this.eatTurn;
				const f = this.eatTurn ? 520 : 400;
				this.tone('sine', f, f * 0.55, t, 0.09, 0.16);
				this.noise(t, 0.05, 'bandpass', 1800, 900, 0.05);
				break;
			}
			case 'out':
				this.noise(t, 0.8, 'highpass', 600, 2400, 0.12);
				[392, 494, 587].forEach((f) => this.tone('triangle', f, f, t + 0.2, 1.4, 0.08));
				break;
		}
	}

	setMuted(muted: boolean): void {
		this.muted = muted;
		if (this.ac && this.master) this.master.gain.setValueAtTime(this.level(), this.ac.currentTime);
	}

	setVolume(volume: number): void {
		this.volume = Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 1;
		if (this.ac && this.master) this.master.gain.setValueAtTime(this.level(), this.ac.currentTime);
	}

	/** A touch screen's first touch: the context may only start inside a gesture. */
	unlock(): void {
		this.context();
	}

	destroy(): void {
		void this.ac?.close().catch(() => undefined);
		this.ac = null;
		this.master = null;
	}

	private level(): number {
		return this.muted ? 0 : 0.6 * this.volume;
	}

	private context(): AudioContext | null {
		if (!this.available) return null;
		if (!this.ac) {
			this.ac = new AudioContext();
			this.master = this.ac.createGain();
			this.master.gain.value = this.level();
			this.master.connect(this.ac.destination);
		}
		if (this.ac.state === 'suspended') void this.ac.resume().catch(() => undefined);
		return this.ac;
	}

	/** A voice from `f0` to `f1` Hz over `len` s, a fast attack and an exponential fall. */
	private tone(
		type: OscillatorType,
		f0: number,
		f1: number,
		t: number,
		len: number,
		gain: number,
		lowpass = 0
	): void {
		const ac = this.ac;
		const master = this.master;
		if (!ac || !master) return;
		const osc = ac.createOscillator();
		osc.type = type;
		osc.frequency.setValueAtTime(f0, t);
		osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + len);
		const g = ac.createGain();
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
		g.gain.exponentialRampToValueAtTime(0.0001, t + len);
		let node: AudioNode = osc;
		if (lowpass > 0) {
			const f = ac.createBiquadFilter();
			f.type = 'lowpass';
			f.frequency.value = lowpass;
			osc.connect(f);
			node = f;
		}
		node.connect(g);
		g.connect(master);
		osc.start(t);
		osc.stop(t + len + 0.05);
	}

	/** Filtered noise, its cut sweeping from `f0` to `f1`. */
	private noise(
		t: number,
		len: number,
		type: BiquadFilterType,
		f0: number,
		f1: number,
		gain: number
	): void {
		const ac = this.ac;
		const master = this.master;
		if (!ac || !master) return;
		if (!this.noiseBuf) {
			this.noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
			const d = this.noiseBuf.getChannelData(0);
			for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
		}
		const src = ac.createBufferSource();
		src.buffer = this.noiseBuf;
		src.loop = true;
		const f = ac.createBiquadFilter();
		f.type = type;
		f.Q.value = type === 'bandpass' ? 3 : 0.7;
		f.frequency.setValueAtTime(f0, t);
		f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + len);
		const g = ac.createGain();
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
		g.gain.exponentialRampToValueAtTime(0.0001, t + len);
		src.connect(f);
		f.connect(g);
		g.connect(master);
		src.start(t);
		src.stop(t + len + 0.05);
	}
}
