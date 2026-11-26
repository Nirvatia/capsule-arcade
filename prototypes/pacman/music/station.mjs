// The station's placeholder music, synthesised offline (no dependencies), three seamless loops
// (the owner, 2026-11-26: dynamic, not ambient):
//   calm   24 bars at 124 bpm: a four-on-the-floor kick, offbeat hats, claps on 2 and 4, a rolling
//          E-minor bass arpeggio in sixteenths whose filter opens and closes, a low pad, metallic
//          stabs: the station still working, the squad on the hunt;
//   dread  the same 24 bars, played over the calm as loud as the infection is far: sixteenth hats,
//          a hard saw bass an octave up a minor second against the calm's, toms, rising scrapes;
//   escape 16 bars at 150 bpm: a broken beat, the two-tone siren, a fast bass, stabs.
// Renders two loops and keeps the second, so the reverb's tail runs into the loop's start.
// Writes a WAV; ffmpeg makes the game's OGG (see OST.md).
//   node prototypes/pacman/music/station.mjs calm|dread|escape out.wav
import { writeFileSync } from 'node:fs';

const KIND = process.argv[2] ?? 'calm';
const SR = 44100;
const BPM = KIND === 'escape' ? 150 : 124;
const BEAT = 60 / BPM;
const LOOP = (KIND === 'escape' ? 16 : 24) * 4 * BEAT;
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

/** A bass line: `notes` (midi, null a rest) on sixteenths, a saw through a moving low pass. */
function bassLine(notes, gain, cut0, cut1, octave = 0, detune = 0) {
	let y = 0;
	const step = BEAT / 4;
	for (let i = 0; i < N * 2; i++) {
		const t = (i % N) / SR;
		const n = notes[Math.floor(t / step) % notes.length];
		if (n === null) {
			add(i, 0, 0);
			continue;
		}
		const e = (t % step) / step;
		// fitted to the loop, so the saw meets itself at the seam
		const hzN = fit(440 * 2 ** ((n + octave * 12 - 69) / 12) * (1 + detune));
		const saw = 2 * ((hzN * (i / SR)) % 1) - 1;
		// the filter breathes over the loop
		const open = cut0 + (cut1 - cut0) * (0.5 + 0.5 * Math.sin((TAU * 2 * t) / LOOP));
		const a = Math.exp((-TAU * open) / SR);
		y = (1 - a) * saw + a * y;
		const v = y * gain * Math.exp(-e * 2.2);
		add(i, v, v);
	}
}
function clap(t0, gain) {
	for (const d of [0, 0.011, 0.023]) noiseHit(t0 + d, gain, 1500, 0.14);
}

if (KIND === 'calm' || KIND === 'dread') {
	const bars = Math.round(LOOP / (BEAT * 4));
	// E minor, a bar each: Em, Em, C, D (the roots' arpeggio: root, octave, fifth, octave)
	const roots = [28, 28, 24, 26];
	const arp = [];
	for (let bar = 0; bar < 4; bar++) {
		const r = roots[bar];
		for (const o of [0, 12, 7, 12, 0, 12, 7, 10, 0, 12, 7, 12, 0, 15, 12, 7]) arp.push(r + o);
	}
	if (KIND === 'calm') {
		bassLine(arp, 0.2, 260, 1400);
		for (let i = 0; i < bars * 4; i++) {
			const t = i * BEAT;
			thump(t, 0.62, 150, 46, 0.3);
			noiseHit(t + BEAT / 2, 0.07, 8000, 0.05, 0.25);
			if (i % 2 === 1) clap(t, 0.12);
		}
		// a low pad under it, E minor
		const pad = lp(700);
		for (let i = 0; i < N * 2; i++) {
			const t = i / SR;
			const s2 = [40, 47, 55].reduce((acc, m, j) => acc + Math.sin(TAU * hz(m) * t + j), 0);
			add(i, pad(s2) * 0.035, pad(s2) * 0.035);
		}
		// metallic stabs: the last beat of every second bar
		for (let bar = 1; bar < bars; bar += 2) ping(bar * 4 * BEAT + 3 * BEAT, hz([76, 79, 83, 81][bar % 4]), 0.1, bar % 4 < 2 ? -0.4 : 0.4, 1.1);
	} else {
		// the hard bass an octave up, a minor second against the calm's, on the off sixteenths
		bassLine(
			arp.map((n, i) => (i % 2 ? n + 1 : null)),
			0.12,
			900,
			2600,
			1
		);
		for (let i = 0; i < bars * 16; i++) noiseHit(i * (BEAT / 4), i % 4 === 2 ? 0.06 : 0.035, 9000, 0.035, i % 2 ? 0.3 : -0.3);
		// toms down the last bar of every four
		for (let bar = 3; bar < bars; bar += 4)
			[0, 0.5, 1, 1.5, 2, 2.5].forEach((d, k) => thump(bar * 4 * BEAT + (2 + d * 0.66) * BEAT, 0.35, 220 - k * 22, 90 - k * 8, 0.22));
		// scrapes rising through a band pass, every four bars
		for (let bar = 0; bar < bars; bar += 4) {
			const s0 = Math.round(bar * 4 * BEAT * SR);
			const f = bp(400, 6);
			const len = BEAT * 4;
			for (let k = 0; k < len * SR; k++) {
				const u = k / (len * SR);
				const v = f(rnd() * 2 - 1, 300 + 2600 * u) * Math.sin(Math.PI * u) * 0.1;
				for (const loop of [0, N]) add(s0 + k + loop, v * 0.8, v);
			}
		}
	}
}

if (KIND === 'escape') {
	const bars = Math.round(LOOP / (BEAT * 4));
	// the siren: two tones, half a bar each, a soft square through a low pass
	const s2 = lp(1800);
	for (let i = 0; i < N * 2; i++) {
		const t = i / SR;
		const f = Math.floor(t / (BEAT * 2)) % 2 === 0 ? fit(660) : fit(880);
		const sq = Math.sign(Math.sin(TAU * f * t)) * 0.6 + Math.sin(TAU * f * t) * 0.4;
		add(i, s2(sq) * 0.04, s2(sq) * 0.034);
	}
	// the fast bass: sixteenths on E1 / G1 / D1 / C1
	const roots = [28, 31, 26, 24];
	const line = [];
	for (const r of roots) for (const o of [0, 0, 12, 0, 0, 12, 0, 7, 0, 0, 12, 0, 10, 0, 12, 7]) line.push(r + o);
	bassLine(line, 0.22, 400, 1800);
	// the broken beat: kick on 1 and the and of 2, snare on 2 and 4, hats in sixteenths
	for (let bar = 0; bar < bars; bar++) {
		const t0 = bar * 4 * BEAT;
		for (const k of [0, 1.5, 2.75]) thump(t0 + k * BEAT, 0.66, 160, 45, 0.24);
		for (const sn of [1, 3]) {
			noiseHit(t0 + sn * BEAT, 0.2, 2200, 0.16);
			thump(t0 + sn * BEAT, 0.25, 240, 180, 0.08);
		}
		for (let h = 0; h < 16; h++) noiseHit(t0 + (h * BEAT) / 4, h % 2 ? 0.035 : 0.055, 9000, 0.03, 0.2);
		if (bar % 2 === 1) ping(t0 + 3.5 * BEAT, hz(76), 0.12, 0, 0.9);
	}
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
const wet = KIND === 'escape' ? 0.05 : 0.08;
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
