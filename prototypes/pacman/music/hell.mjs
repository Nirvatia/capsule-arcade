// The hell's placeholder music, synthesised offline (no dependencies): a 60 s seamless loop in
// D Phrygian at 96 bpm, one bar per heartbeat of the hell (2.5 s): a sub drone, the double
// heartbeat, a dark choir pad, anvil strikes, low toms and a slow lead (two phrases of three), in
// a simple reverb. Renders two loops and keeps the second, so the reverb's tail runs into the
// loop's start. Writes a WAV; ffmpeg makes the game's OGG (see OST.md).
//   node prototypes/pacman/music/hell.mjs out.wav
import { writeFileSync } from 'node:fs';

const SR = 44100;
const BPM = 96;
const BEAT = 60 / BPM; // 0.625 s
const BAR = BEAT * 4; // 2.5 s: the hell's heartbeat
const BARS = 24; // 60 s
const LOOP = BAR * BARS;
const N = Math.round(LOOP * SR);
const L = new Float32Array(N * 2);
const R = new Float32Array(N * 2);
const TAU = Math.PI * 2;

// a tiny deterministic random
let seed = 7;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

/** A pitch whose cycles fit the loop exactly (a 1/60 Hz grid): continuous tones meet at the seam. */
const fit = (f) => Math.round(f * LOOP) / LOOP;
const hz = (midi) => fit(440 * 2 ** ((midi - 69) / 12));
const add = (i, l, r) => {
	if (i >= 0 && i < N * 2) {
		L[i] += l;
		R[i] += r;
	}
};

/** One-pole low pass state. */
const lp = (cut) => {
	const a = Math.exp((-TAU * cut) / SR);
	let y = 0;
	return (x) => (y = (1 - a) * x + a * y);
};
/** A resonant band pass (state variable filter). */
const bp = (f, q) => {
	let low = 0;
	let band = 0;
	const F = 2 * Math.sin((Math.PI * f) / SR);
	return (x) => {
		low += F * band;
		const high = x - low - band / q;
		band += F * high;
		return band;
	};
};

// ---------------------------------------------------------------- sub drone (D1 + A1)
{
	const f1 = lp(120);
	const f2 = lp(120);
	for (let i = 0; i < N * 2; i++) {
		const t = i / SR;
		const wob = 1 + 0.004 * Math.sin((TAU * 4 * t) / LOOP);
		let s = Math.sin(TAU * hz(26) * t + 0.4 * wob) + 0.5 * Math.sin(TAU * hz(33) * t + 1) + 0.3 * Math.sin(TAU * hz(38) * t);
		s = Math.tanh(s * 1.6) * 0.22;
		const swell = 0.75 + 0.25 * Math.sin((TAU * t) / LOOP);
		add(i, f1(s) * swell, f2(s) * swell);
	}
}

// ---------------------------------------------------------------- the heartbeat (lub-dub per bar)
function thump(t0, gain, f0, f1, len) {
	const i0 = Math.round(t0 * SR);
	let ph = 0;
	for (let k = 0; k < len * SR; k++) {
		const u = k / SR;
		const f = f1 + (f0 - f1) * Math.exp(-u * 18);
		ph += (TAU * f) / SR;
		const env = Math.exp(-u * 7) * Math.min(1, u * 400);
		const s = Math.tanh(Math.sin(ph) * 2.2) * env * gain;
		add(i0 + k, s, s);
	}
}
for (let b = 0; b < BARS * 2; b++) {
	const t = b * BAR;
	thump(t, 0.55, 95, 42, 0.6);
	thump(t + 0.24, 0.38, 80, 38, 0.5);
}

// ---------------------------------------------------------------- the choir pad (D phrygian)
// four chords, six bars each: Dm, Bb, Gm, A (the phrygian dominant's pull back to D)
const CHORDS = [
	[50, 53, 57, 62],
	[46, 50, 53, 58],
	[43, 50, 55, 58],
	[45, 49, 52, 57]
];
{
	const voicesL = [bp(700, 4), bp(1150, 5), bp(2500, 6)];
	const voicesR = [bp(720, 4), bp(1120, 5), bp(2450, 6)];
	const warm = [lp(1800), lp(1800)];
	const ph = new Float64Array(CHORDS[0].length * 3);
	for (let i = 0; i < N * 2; i++) {
		const t = i / SR;
		const bar = Math.floor(t / BAR) % BARS;
		const chord = CHORDS[Math.floor(bar / 6) % CHORDS.length];
		const inChord = (t % (BAR * 6)) / (BAR * 6);
		// a slow swell inside each chord, never fully silent
		const env = 0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, inChord * 1.05));
		let s = 0;
		chord.forEach((m, v) => {
			for (let d = 0; d < 3; d++) {
				const j = v * 3 + d;
				ph[j] += fit(hz(m) * (1 + (d - 1) * 0.006)) / SR;
				s += 2 * (ph[j] % 1) - 1; // saw
			}
		});
		s /= 12;
		const fl = voicesL[0](s) * 1 + voicesL[1](s) * 0.7 + voicesL[2](s) * 0.25;
		const fr = voicesR[0](s) * 1 + voicesR[1](s) * 0.7 + voicesR[2](s) * 0.25;
		add(i, warm[0](fl) * 0.5 * env, warm[1](fr) * 0.5 * env);
	}
}

// ---------------------------------------------------------------- anvils (inharmonic strikes)
function anvil(t0, gain, pan) {
	const i0 = Math.round(t0 * SR);
	const parts = [1, 2.76, 5.4, 8.93, 13.34].map((r, k) => ({ f: 220 * r, a: 1 / (k + 1), d: 3 + k * 2.5 }));
	for (let k = 0; k < 3.5 * SR; k++) {
		const u = k / SR;
		let s = 0;
		for (const p of parts) s += Math.sin(TAU * p.f * u) * p.a * Math.exp(-u * p.d);
		s *= gain * Math.min(1, u * 2000);
		add(i0 + k, s * (1 - pan), s * (1 + pan));
	}
}
for (let b = 0; b < BARS * 2; b++) {
	if (b % 4 === 2) anvil(b * BAR + BEAT * 2, 0.07, b % 8 === 2 ? -0.4 : 0.4);
}

// ---------------------------------------------------------------- low toms (a slow march)
function tom(t0, gain, f) {
	const i0 = Math.round(t0 * SR);
	let ph = 0;
	const n = lp(900);
	for (let k = 0; k < 0.7 * SR; k++) {
		const u = k / SR;
		ph += (TAU * (f * (1 + Math.exp(-u * 25) * 0.6))) / SR;
		const s = (Math.sin(ph) + n(rnd() * 2 - 1) * 0.3) * Math.exp(-u * 6) * gain;
		add(i0 + k, s, s * 0.9);
	}
}
for (let b = 0; b < BARS * 2; b++) {
	if (b % 2 === 1) {
		tom(b * BAR + BEAT * 2.5, 0.22, 70);
		tom(b * BAR + BEAT * 3, 0.26, 62);
		tom(b * BAR + BEAT * 3.5, 0.3, 55);
	}
}

// ---------------------------------------------------------------- the lead
// D phrygian dominant, slow, a distorted reed: [midi, beats]; three phrases a loop, the lead
// in the second and third (the first is the pad's alone)
const PHRASE = [
	[62, 2], [63, 1], [66, 1], [67, 4], [66, 2], [63, 2], [62, 4],
	[69, 2], [70, 1], [69, 1], [67, 2], [66, 2], [63, 4], [62, 4]
];
{
	const tone = lp(2400);
	const tone2 = lp(2400);
	const phraseBeats = PHRASE.reduce((a, [, d]) => a + d, 0); // 32 beats = 8 bars
	for (let rep = 0; rep < (BARS * 2 * 4) / phraseBeats; rep++) {
		if (rep % 3 === 0) continue;
		let beat = rep * phraseBeats;
		for (const [m, d] of PHRASE) {
			const t0 = beat * BEAT;
			const len = d * BEAT;
			const i0 = Math.round(t0 * SR);
			let ph = 0;
			for (let k = 0; k < len * SR; k++) {
				const u = k / SR;
				const vib = 1 + 0.006 * Math.sin(TAU * 5 * u) * Math.min(1, u * 2);
				ph += (TAU * hz(m) * vib) / SR;
				let s = Math.sin(ph) + 0.5 * Math.sin(2 * ph) + 0.3 * Math.sin(3 * ph);
				s = Math.tanh(s * 2.5);
				const env = Math.min(1, u * 8) * Math.min(1, (len - u) * 6) * 0.075;
				add(i0 + k, tone(s) * env * 0.9, tone2(s) * env * 1.1);
			}
			beat += d;
		}
	}
}

// ---------------------------------------------------------------- reverb (Schroeder)
function reverb(x, delays) {
	const out = new Float32Array(x.length);
	for (const [d, g] of delays) {
		const buf = new Float32Array(d);
		let p = 0;
		const damp = lp(3500);
		for (let i = 0; i < x.length; i++) {
			const y = buf[p];
			buf[p] = x[i] + damp(y) * g;
			out[i] += y;
			p = (p + 1) % d;
		}
	}
	for (const d of [556, 441]) {
		const buf = new Float32Array(d);
		let p = 0;
		for (let i = 0; i < x.length; i++) {
			const b = buf[p];
			const y = -out[i] + b;
			buf[p] = out[i] + b * 0.5;
			out[i] = y;
			p = (p + 1) % d;
		}
	}
	return out;
}
const wetL = reverb(L, [[1557, 0.84], [1617, 0.83], [1491, 0.84], [1422, 0.83]]);
const wetR = reverb(R, [[1580, 0.84], [1640, 0.83], [1514, 0.84], [1445, 0.83]]);

// keep the second loop; mix, normalise, write a 16-bit stereo WAV
let peak = 0;
const out = new Float32Array(N * 2);
for (let i = 0; i < N; i++) {
	const j = i + N;
	const l = L[j] * 0.8 + wetL[j] * 0.12;
	const r = R[j] * 0.8 + wetR[j] * 0.12;
	out[i * 2] = l;
	out[i * 2 + 1] = r;
	peak = Math.max(peak, Math.abs(l), Math.abs(r));
}
const gain = 0.89 / peak;
const data = Buffer.alloc(N * 4);
for (let i = 0; i < N * 2; i++) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, out[i] * gain)) * 32767), i * 2);
const head = Buffer.alloc(44);
head.write('RIFF', 0);
head.writeUInt32LE(36 + data.length, 4);
head.write('WAVE', 8);
head.write('fmt ', 12);
head.writeUInt32LE(16, 16);
head.writeUInt16LE(1, 20);
head.writeUInt16LE(2, 22);
head.writeUInt32LE(SR, 24);
head.writeUInt32LE(SR * 4, 28);
head.writeUInt16LE(4, 32);
head.writeUInt16LE(16, 34);
head.write('data', 36);
head.writeUInt32LE(data.length, 40);
writeFileSync(process.argv[2] ?? 'hell.wav', Buffer.concat([head, data]));
console.log(`hell: ${LOOP.toFixed(1)} s loop, peak ${peak.toFixed(3)}`);
