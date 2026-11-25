// The station's placeholder music, synthesised offline (no dependencies), three seamless loops:
//   calm   48 s: the station's hum (mains and its harmonics), the ventilation's air, a low pad in
//               E minor, sparse metallic pings in a cold reverb: an abandoned lab, still working;
//   dread  48 s: the layer the infection brings up: an irregular heartbeat, a minor-second cluster,
//               scrapes rising through a band pass, creaks: played over the calm, louder as it grows;
//   escape 32 s: the alarm: a two-tone siren, a driving bass in eighths at 140 bpm, a kick, hats,
//               stabs.
// Renders two loops and keeps the second, so the reverb's tail runs into the loop's start.
// Writes a WAV; ffmpeg makes the game's OGG (see OST.md).
//   node prototypes/pacman/music/station.mjs calm|dread|escape out.wav
import { writeFileSync } from 'node:fs';

const KIND = process.argv[2] ?? 'calm';
const SR = 44100;
const LOOP = KIND === 'escape' ? 32 : 48;
const N = Math.round(LOOP * SR);
const L = new Float32Array(N * 2);
const R = new Float32Array(N * 2);
const TAU = Math.PI * 2;

let seed = KIND === 'calm' ? 11 : KIND === 'dread' ? 23 : 37;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
/** A pitch whose cycles fit the loop exactly: continuous tones meet at the seam. */
const fit = (f) => Math.round(f * LOOP) / LOOP;
const hz = (midi) => fit(440 * 2 ** ((midi - 69) / 12));
const add = (i, l, r) => {
	if (i >= 0 && i < N * 2) {
		L[i] += l;
		R[i] += r;
	}
};
const lp = (cut) => {
	const a = Math.exp((-TAU * cut) / SR);
	let y = 0;
	return (x) => (y = (1 - a) * x + a * y);
};
const bp = (f, q) => {
	let low = 0;
	let band = 0;
	return (x, fNow = f) => {
		const F = 2 * Math.sin((Math.PI * fNow) / SR);
		low += F * band;
		const high = x - low - band / q;
		band += F * high;
		return band;
	};
};
/** A metallic ping: two inharmonic partials (1 : 2.76), a fast attack, a long ring. */
function ping(t0, f, gain, pan, len = 2.4) {
	const s0 = Math.round(t0 * SR);
	for (let k = 0; k < len * SR; k++) {
		const t = k / SR;
		const env = Math.min(1, t * 400) * Math.exp(-t * (3.2 / len));
		const v = (Math.sin(TAU * f * t) + 0.45 * Math.sin(TAU * f * 2.76 * t) * Math.exp(-t * 3)) * env * gain;
		for (const loop of [0, N]) add(s0 + k + loop, v * (1 - pan), v * (1 + pan));
	}
}
/** A thump (a heartbeat, a kick): a falling sine. */
function thump(t0, gain, f0, f1, len) {
	const s0 = Math.round(t0 * SR);
	let ph = 0;
	for (let k = 0; k < len * SR; k++) {
		const t = k / SR;
		const f = f1 + (f0 - f1) * Math.exp(-t * 30);
		ph += (TAU * f) / SR;
		const v = Math.sin(ph) * Math.exp(-t * (5 / len)) * gain;
		for (const loop of [0, N]) add(s0 + k + loop, v, v);
	}
}
function noiseHit(t0, gain, cut, len, pan = 0) {
	const s0 = Math.round(t0 * SR);
	const f = bp(cut, 1.2);
	for (let k = 0; k < len * SR; k++) {
		const v = f(rnd() * 2 - 1) * Math.exp((-k / SR) * (6 / len)) * gain;
		for (const loop of [0, N]) add(s0 + k + loop, v * (1 - pan), v * (1 + pan));
	}
}

if (KIND === 'calm') {
	// the hum: mains at A1 and its odd harmonics, breathing slowly
	const f = lp(400);
	for (let i = 0; i < N * 2; i++) {
		const t = i / SR;
		const breath = 0.8 + 0.2 * Math.sin((TAU * 3 * t) / LOOP);
		const s = Math.sin(TAU * hz(33) * t) + 0.35 * Math.sin(TAU * hz(52) * t) + 0.15 * Math.sin(TAU * hz(61) * t);
		const v = f(s) * 0.22 * breath;
		add(i, v, v);
	}
	// the ventilation's air: band-passed noise drifting
	const air = bp(700, 0.7);
	for (let i = 0; i < N * 2; i++) {
		const t = i / SR;
		const v = air(rnd() * 2 - 1, 500 + 300 * Math.sin((TAU * 2 * t) / LOOP)) * 0.05;
		add(i, v * (0.8 + 0.2 * Math.sin(t)), v * (0.8 - 0.2 * Math.sin(t)));
	}
	// a low pad, E minor (E2 B2 G3), slowly opening and closing
	const pad = lp(900);
	for (let i = 0; i < N * 2; i++) {
		const t = i / SR;
		const s = [40, 47, 55, 62].reduce((a, m, j) => a + Math.sin(TAU * hz(m) * t + j) * (j === 3 ? 0.3 : 1), 0);
		const v = pad(s) * 0.05 * (0.6 + 0.4 * Math.sin((TAU * 2 * t) / LOOP - 1));
		add(i, v, v);
	}
	// sparse pings, E minor pentatonic high up
	const notes = [76, 79, 81, 83, 86, 88];
	for (let t = 1.5; t < LOOP; t += 2.5 + rnd() * 3.5) ping(t, hz(notes[Math.floor(rnd() * notes.length)]), 0.07, rnd() * 1.2 - 0.6);
}

if (KIND === 'dread') {
	// an irregular heartbeat: a double beat, the gap wavering
	for (let t = 0.4, n = 0; t < LOOP - 1; n += 1) {
		thump(t, 0.5, 90, 42, 0.32);
		thump(t + 0.26, 0.32, 80, 40, 0.28);
		t += 1.15 + (n % 3 === 2 ? 0.45 : 0) + rnd() * 0.12;
	}
	// a minor-second cluster, swelling
	const c = lp(1200);
	for (let i = 0; i < N * 2; i++) {
		const t = i / SR;
		const s = Math.sin(TAU * hz(52) * t) + Math.sin(TAU * hz(53) * t + 1) + 0.5 * Math.sin(TAU * hz(64) * t);
		const v = c(s) * 0.06 * (0.5 + 0.5 * Math.sin((TAU * 3 * t) / LOOP));
		add(i, v * 0.9, v);
	}
	// scrapes: noise through a band pass sweeping up
	for (let t = 3; t < LOOP - 4; t += 6 + rnd() * 5) {
		const s0 = Math.round(t * SR);
		const f = bp(400, 6);
		const len = 1.8 + rnd();
		const pan = rnd() * 1.4 - 0.7;
		for (let k = 0; k < len * SR; k++) {
			const u = k / (len * SR);
			const v = f(rnd() * 2 - 1, 300 + 2200 * u) * Math.sin(Math.PI * u) * 0.12;
			for (const loop of [0, N]) add(s0 + k + loop, v * (1 - pan), v * (1 + pan));
		}
	}
	// creaks: low metal groans
	for (let t = 5; t < LOOP - 2; t += 7 + rnd() * 6) ping(t, hz(40 + Math.floor(rnd() * 5)), 0.08, rnd() - 0.5, 3.5);
}

if (KIND === 'escape') {
	const BEAT = 60 / 140;
	// the siren: two tones, half a second each, a soft square through a low pass
	const s = lp(1800);
	for (let i = 0; i < N * 2; i++) {
		const t = i / SR;
		const f = Math.floor(t / 0.5) % 2 === 0 ? fit(660) : fit(880);
		const sq = Math.sign(Math.sin(TAU * f * t)) * 0.6 + Math.sin(TAU * f * t) * 0.4;
		const v = s(sq) * 0.05;
		add(i, v, v * 0.85);
	}
	// the bass: eighths on E1 / G1 / D1
	const roots = [28, 28, 31, 26];
	const b = lp(500);
	for (let i = 0; i < N * 2; i++) {
		const t = i / SR;
		const bar = Math.floor(t / (BEAT * 4)) % roots.length;
		const e = (t % (BEAT / 2)) / (BEAT / 2);
		const f = hz(roots[bar]);
		const saw = 2 * ((f * t) % 1) - 1;
		const v = b(saw) * 0.22 * Math.exp(-e * 3);
		add(i, v, v);
	}
	for (let t = 0; t < LOOP; t += BEAT) {
		thump(t, 0.6, 140, 45, 0.25);
		noiseHit(t + BEAT / 2, 0.08, 7000, 0.06, 0.2);
	}
	// stabs every two bars
	for (let t = BEAT * 7; t < LOOP; t += BEAT * 8) ping(t, hz(64), 0.12, 0, 1.2);
}

// reverb (Schroeder)
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
			const bb = buf[p];
			const y = -out[i] + bb;
			buf[p] = out[i] + bb * 0.5;
			out[i] = y;
			p = (p + 1) % d;
		}
	}
	return out;
}
const wet = KIND === 'escape' ? 0.06 : 0.16;
const wetL = reverb(L, [[1557, 0.85], [1617, 0.84], [1491, 0.85], [1422, 0.84]]);
const wetR = reverb(R, [[1580, 0.85], [1640, 0.84], [1514, 0.85], [1445, 0.84]]);
let peak = 0;
const out = new Float32Array(N * 2);
for (let i = 0; i < N; i++) {
	const j = i + N;
	const l = L[j] * 0.8 + wetL[j] * wet;
	const r = R[j] * 0.8 + wetR[j] * wet;
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
writeFileSync(process.argv[3] ?? `station-${KIND}.wav`, Buffer.concat([head, data]));
console.log(`station ${KIND}: ${LOOP} s loop, peak ${peak.toFixed(3)}`);
