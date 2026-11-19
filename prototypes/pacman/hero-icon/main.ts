import { paintClassic } from '../../../src/games/pacman/ui/hud/season/heroIcon';
import { boardArt, coinArt, plankArt, ropesArt } from './menuArt';
import { paintVectorClassic, vectorIcon } from './vectorIcon';

function drawIcon(canvas: HTMLCanvasElement): void {
	const size = Number(canvas.dataset.size);
	const ms = canvas.dataset.ms === 'true';
	const proposed = canvas.dataset.kind === 'new';
	const scale = 6;
	canvas.width = canvas.height = size * scale;
	const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
	ctx.scale(scale, scale);
	ctx.translate(size / 2, size * (proposed && ms ? 0.54 : 0.5));
	const radius = size * (proposed ? (ms ? 0.42 : 0.46) : 0.475);
	if (proposed) paintVectorClassic(ctx, radius, ms);
	else paintClassic(ctx, radius, ms);
}

for (const canvas of document.querySelectorAll<HTMLCanvasElement>('canvas[data-icon]')) {
	drawIcon(canvas);
}

const imageArt = (ms: boolean, size = 75) =>
	`<image href="${vectorIcon(ms)}" x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}"/>`;
const candidateCoin = (ms: boolean, selected: boolean) =>
	coinArt(ms, selected).replace(/<image[^>]*\/>/, imageArt(ms, 62));

const previewMs = new URLSearchParams(window.location.search).has('ms');
const title =
	boardArt('title', 30, 16, 460, 148, 5) +
	`<g transform="translate(98 92) scale(1.25)">${imageArt(previewMs)}</g>` +
	`<text class="num" x="315" y="112" font-size="${previewMs ? 44 : 60}" text-anchor="middle">${previewMs ? 'MS. PAC-MAN' : 'PAC-MAN'}</text>`;
const high =
	ropesArt(190, 330, 160, 196, 324, 196) +
	boardArt('high', 150, 196, 220, 44, 11) +
	'<text class="lab" x="168" y="224" font-size="12">HIGH</text>' +
	'<text class="num" x="352" y="230" font-size="26" text-anchor="end">48 900</text>';
const log =
	'<rect x="140" y="326" width="240" height="26" rx="13" fill="#cf9a58" stroke="#2a1a0c" stroke-width="4"/>' +
	'<rect x="148" y="330" width="224" height="8" rx="4" fill="#f2c98a" opacity=".8"/>' +
	'<rect x="148" y="342" width="224" height="6" rx="3" fill="#8f5f2d" opacity=".8"/>';
const coins =
	`<g transform="translate(205 ${previewMs ? 292 : 282})">${candidateCoin(false, !previewMs)}</g>` +
	`<g transform="translate(315 ${previewMs ? 282 : 292})">${candidateCoin(true, previewMs)}</g>` +
	'<text class="lab" x="205" y="380" font-size="11" text-anchor="middle">PAC-MAN</text>' +
	'<text class="lab" x="315" y="380" font-size="11" text-anchor="middle">MS. PAC-MAN</text>';
const start =
	plankArt('start', 110, 396, 300, 76, 4) +
	'<text class="num" x="260" y="452" font-size="46" text-anchor="middle">START</text>';

document.querySelector('#menu-preview')!.innerHTML =
	'<defs><linearGradient id="menu-num" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff6d8"/></linearGradient></defs>' +
	title +
	high +
	ropesArt(62, 458, 168, 118, 402, 392) +
	log +
	coins +
	start;
