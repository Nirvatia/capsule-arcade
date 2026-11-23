// Генеративный пентатонический эмбиент на WebAudio, без файлов.
// Пэд звучит в тональности рисунка; обводка играет гамму, клетка за клеткой.

const SCALE = [0, 2, 4, 7, 9];

interface ToneOpts {
	dur?: number;
	type?: OscillatorType;
	vol?: number;
	delay?: number;
	attack?: number;
}

export class Sound {
	private ac: AudioContext | null = null;
	private master: GainNode | null = null;
	private bus: GainNode | null = null;
	private noise: AudioBuffer | null = null;
	private readonly pad: { o: OscillatorNode; m: number }[] = [];
	private rootSemi = 0;
	muted = false;
	private readonly level = 0.42;

	/** Браузер разрешает звук только после жеста пользователя. */
	unlock(): void {
		if (this.ac) {
			if (this.ac.state === 'suspended') void this.ac.resume();
			return;
		}
		const Ctor =
			window.AudioContext ??
			(window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
		if (!Ctor) return;
		const ac = (this.ac = new Ctor());
		const master = (this.master = ac.createGain());
		master.gain.value = this.muted ? 0 : this.level;
		const comp = ac.createDynamicsCompressor();
		master.connect(comp);
		comp.connect(ac.destination);
		const bus = (this.bus = ac.createGain());
		const delay = ac.createDelay(1.5);
		delay.delayTime.value = 0.38;
		const fb = ac.createGain();
		fb.gain.value = 0.42;
		const lp = ac.createBiquadFilter();
		lp.type = 'lowpass';
		lp.frequency.value = 1900;
		const wet = ac.createGain();
		wet.gain.value = 0.5;
		bus.connect(master);
		bus.connect(delay);
		delay.connect(lp);
		lp.connect(fb);
		fb.connect(delay);
		lp.connect(wet);
		wet.connect(master);
		const nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
		const d = nb.getChannelData(0);
		for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
		this.noise = nb;
		const lfo = ac.createOscillator();
		lfo.frequency.value = 0.06;
		const lg = ac.createGain();
		lg.gain.value = 0.01;
		lfo.connect(lg);
		lfo.start();
		[0.5, 0.75, 1.002].forEach((m, i) => {
			const o = ac.createOscillator();
			o.type = i === 2 ? 'triangle' : 'sine';
			o.frequency.value = this.root() * m;
			const g = ac.createGain();
			g.gain.value = 0;
			g.gain.linearRampToValueAtTime(0.026, ac.currentTime + 5);
			lg.connect(g.gain);
			o.connect(g);
			g.connect(bus);
			o.start();
			this.pad.push({ o, m });
		});
	}

	destroy(): void {
		void this.ac?.close();
		this.ac = null;
	}

	setMuted(m: boolean): void {
		this.muted = m;
		if (this.ac && this.master)
			this.master.gain.setTargetAtTime(m ? 0 : this.level, this.ac.currentTime, 0.1);
	}

	/** Тональность рисунка: полутоны от A3. */
	setRoot(semi: number): void {
		this.rootSemi = semi;
		if (!this.ac) return;
		const r = this.root();
		for (const p of this.pad) p.o.frequency.setTargetAtTime(r * p.m, this.ac.currentTime, 1.6);
	}

	private root(): number {
		return 220 * Math.pow(2, this.rootSemi / 12);
	}

	private hz(deg: number): number {
		const oc = Math.floor(deg / 5);
		const i = ((deg % 5) + 5) % 5;
		return this.root() * Math.pow(2, (SCALE[i] + 12 * oc) / 12);
	}

	private tone(
		f: number,
		{ dur = 1.3, type = 'sine', vol = 0.1, delay = 0, attack = 0.012 }: ToneOpts = {}
	): void {
		if (!this.ac || !this.bus || this.muted) return;
		const ac = this.ac;
		const t = ac.currentTime + delay;
		const o = ac.createOscillator();
		const g = ac.createGain();
		o.type = type;
		o.frequency.value = f;
		g.gain.setValueAtTime(0, t);
		g.gain.linearRampToValueAtTime(vol, t + attack);
		g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
		o.connect(g);
		g.connect(this.bus);
		o.start(t);
		o.stop(t + dur + 0.05);
	}

	private note(deg: number, o: ToneOpts = {}): void {
		this.tone(this.hz(deg), o);
	}

	whoosh(vol = 0.16, dur = 0.6, f0 = 280, f1 = 2200): void {
		if (!this.ac || !this.bus || !this.noise || this.muted) return;
		const ac = this.ac;
		const t = ac.currentTime;
		const s = ac.createBufferSource();
		s.buffer = this.noise;
		s.loop = true;
		const bp = ac.createBiquadFilter();
		bp.type = 'bandpass';
		bp.Q.value = 3;
		bp.frequency.setValueAtTime(f0, t);
		bp.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6);
		bp.frequency.exponentialRampToValueAtTime(f0 * 0.6, t + dur);
		const g = ac.createGain();
		g.gain.setValueAtTime(0, t);
		g.gain.linearRampToValueAtTime(vol, t + dur * 0.28);
		g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
		s.connect(bp);
		bp.connect(g);
		g.connect(this.bus);
		s.start(t);
		s.stop(t + dur + 0.1);
	}

	spark(big: boolean): void {
		const d = Math.floor(Math.random() * 5) + 5 + (big ? 3 : 0);
		this.note(d, { vol: big ? 0.12 : 0.08, dur: 1.8, type: 'triangle' });
		this.note(d + 2, { vol: 0.04, dur: 2.2, delay: 0.08 });
	}

	call(): void {
		this.note(4, { vol: 0.06, dur: 1.6 });
		this.note(7, { vol: 0.045, dur: 1.8, delay: 0.12 });
	}

	gateOpen(): void {
		[0, 2, 4, 7].forEach((d, i) =>
			this.note(d + 5, {
				vol: 0.07,
				dur: 3,
				attack: 0.3,
				delay: i * 0.16,
				type: i % 2 ? 'sine' : 'triangle'
			})
		);
	}

	/** Обводка: каждая клетка — следующая нота гаммы. */
	trace(n: number): void {
		this.note(n + 2, { vol: 0.06, dur: 0.9, type: 'triangle' });
	}

	lost(): void {
		this.note(-2, { vol: 0.05, dur: 0.9 });
	}

	lit(len: number): void {
		const n = Math.min(Math.max(len, 2), 8);
		for (let i = 0; i < n; i++)
			this.note(i + 4, { vol: 0.08, dur: 2.2, delay: i * 0.07, type: i % 2 ? 'sine' : 'triangle' });
	}

	clear(): void {
		[0, 2, 4, 7, 9, 11].forEach((d, i) =>
			this.note(d + 2, {
				vol: 0.07,
				dur: 4,
				attack: 0.5,
				delay: i * 0.2,
				type: i % 2 ? 'sine' : 'triangle'
			})
		);
	}

	reveal(): void {
		this.whoosh(0.18, 1.6, 120, 1400);
		this.tone(this.root() / 2, { dur: 3, vol: 0.1, attack: 0.8 });
		[0, 4, 7, 9, 12, 14, 16].forEach((d, i) =>
			this.note(d, {
				vol: 0.07,
				dur: 5,
				attack: 0.6,
				delay: 0.8 + i * 0.28,
				type: i % 2 ? 'sine' : 'triangle'
			})
		);
	}

	dive(): void {
		this.whoosh(0.2, 1.3, 120, 1500);
		this.tone(this.root() / 2, { dur: 2, vol: 0.08, attack: 0.5 });
	}
}
