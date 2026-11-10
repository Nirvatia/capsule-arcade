// Sprites of the CLAUDE_GRID_DOOM_v3 prototype: drawn once at 3x and downscaled on draw.
import type { DoomPickupKind } from '../../logic/doom/DoomPickupModel';
import {
	makeCanvas,
	canvasContext,
	hexChannels,
	makeTexture,
	radialTexture
} from '../common/textures';

import { paintBarrel, paintBfg, paintFist, paintMedkit } from './doomItems';

export { glowTexture } from '../common/textures';

function lazy<V>(make: () => V): () => V {
	let value: V | null = null;
	return () => (value ??= make());
}

export const fogTexture = lazy(() => {
	const [a, b, c] = hexChannels(0x9a7a70);
	const m = (v: number, q: number) => Math.round((v * q) / 255);
	const col = (al: number) => `rgba(${m(200, a)},${m(170, b)},${m(160, c)},${al})`;
	return radialTexture(256, [
		[0, col(0.9)],
		[1, col(0)]
	]);
});

export const litTexture = lazy(() =>
	radialTexture(256, [
		[0, 'rgba(150,200,255,.16)'],
		[1, 'rgba(255,205,130,0)']
	])
);

export const vignetteTexture = lazy(() =>
	radialTexture(256, [
		[0.5, 'rgba(0,0,0,0)'],
		[1, 'rgba(0,0,0,.62)']
	])
);

export const washTexture = lazy(() => {
	const c = makeCanvas(64, 64);
	const x = canvasContext(c);
	const q = x.createLinearGradient(0, 0, 64, 64);
	q.addColorStop(0, 'rgba(160,190,230,.12)');
	q.addColorStop(0.5, 'rgba(255,255,255,0)');
	q.addColorStop(1, 'rgba(150,25,10,.2)');
	x.fillStyle = q;
	x.fillRect(0, 0, 64, 64);
	return c;
});

/** White streak texture tinted 0xffb050 (wind-blown ember). */
export const streakTexture = lazy(() =>
	makeTexture(16, 2, (x) => {
		const q = x.createLinearGradient(0, 0, 16, 0);
		q.addColorStop(0, 'rgba(255,176,80,0)');
		q.addColorStop(1, 'rgba(255,176,80,1)');
		x.fillStyle = q;
		x.fillRect(0, 0, 16, 2);
	})
);

/** The pickup icons: painted in a box of -50..50 (`doomItems`), baked at 3x like the rest. */
const iconTexture = (paint: (ctx: CanvasRenderingContext2D) => void) =>
	lazy(() =>
		makeTexture(26, 26, (x) => {
			x.translate(13, 13);
			x.scale(0.24, 0.24);
			paint(x);
		})
	);
const bfgTexture = iconTexture(paintBfg);
const barrelTexture = iconTexture(paintBarrel);
const medkitTexture = iconTexture(paintMedkit);
const fistTexture = iconTexture(paintFist);

/** Icon and glow tint per pickup kind; berserk is the fist. */
export function pickupSprite(kind: DoomPickupKind): { icon: HTMLCanvasElement; glow: number } {
	if (kind === 'bfg') {
		return { icon: bfgTexture(), glow: 0x40ff50 };
	}
	if (kind === 'barrel') {
		return { icon: barrelTexture(), glow: 0xb8ff30 };
	}
	if (kind === 'medkit') {
		return { icon: medkitTexture(), glow: 0xff3a2a };
	}
	return { icon: fistTexture(), glow: 0xff7a1a };
}

export const barrelSprite = barrelTexture;
