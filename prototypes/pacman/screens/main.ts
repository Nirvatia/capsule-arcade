// Mock-up of the screens, built from the game's own art modules: the season HUD's boards, banners
// and pellet trail (`ui/hud/season/seasonArt`) and the screens' planks, ropes, coins, chalk
// board and ribbon (`ui/screens/screenArt`). Only the layout and the controls are local.
import { boardArt, heroArt, trailArt } from '../../../src/games/pacman/ui/hud/season/seasonArt';
import {
	bannerSpanArt,
	chalkArt,
	coinArt,
	cracksArt,
	knobFaceArt,
	plankArt,
	ribbonArt,
	ropesArt
} from '../../../src/games/pacman/ui/screens/screenArt';
import { SEASON_THEMES } from '../../../src/games/pacman/ui/hud/season/seasonThemes';
import type { SeasonKey, SeasonTheme } from '../../../src/games/pacman/ui/hud/season/seasonThemes';

type Screen = 'menu' | 'ready' | 'pause' | 'death' | 'over';
type Orient = 'land' | 'port';

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const BG: Record<string, string> =
	(window as unknown as { __BG?: Record<string, string> }).__BG ?? {};

const FRAME: Record<Orient, { w: number; h: number }> = {
	land: { w: 1280, h: 720 },
	port: { w: 400, h: 800 }
};
const WORLD: Record<Screen, SeasonKey> = {
	menu: 'summer',
	ready: 'autumn',
	pause: 'winter',
	death: 'summer',
	over: 'spring'
};
const SCREENS: Array<[Screen, string]> = [
	['menu', 'Меню'],
	['ready', 'READY'],
	['pause', 'Пауза'],
	['death', 'Смерть'],
	['over', 'Game over']
];

const state = { screen: 'menu' as Screen, orient: 'land' as Orient, ms: false, record: true, last: false };

// the drawn texts
const lab = (s: string, x: number, y: number, size: number, anchor = 'start') =>
	`<text class="lab" x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}">${s}</text>`;
const num = (s: string, x: number, y: number, size: number, anchor = 'middle', cls = '') =>
	`<text class="num ${cls}" x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}">${s}</text>`;
const chalk = (s: string, x: number, y: number, size: number) =>
	`<text class="chalk" x="${x}" y="${y}" font-size="${size}">${s}</text>`;
const sway = (inner: string, rot: number, cls = '') =>
	`<g class="sway ${cls}" style="--rot:${rot}deg">${inner}</g>`;
const hit = (id: string, inner: string) => `<g class="hit" data-act="${id}">${inner}</g>`;

interface Built {
	readonly w: number;
	readonly h: number;
	readonly body: string;
	/** The veil over the frame, 0..1. */
	readonly veil: number;
}

function knob(t: SeasonTheme, x: number, y: number, label: string, act: string, size = 20): string {
	return hit(act, `<g transform="translate(${x} ${y})">${knobFaceArt(t)}${num(label, 0, size * 0.36, size)}</g>`);
}

function menu(t: SeasonTheme): Built {
	const ms = state.ms;
	let s = sway(
		boardArt(t, 'title', 30, 16, 460, 148, { seed: 5, drop: 44 }) +
			`<g transform="translate(${ms ? 84 : 80} 96) scale(2)">${heroArt(ms)}</g>` +
			num(ms ? 'MS. PAC-MAN' : 'PAC-MAN', ms ? 296 : 290, 118, ms ? 62 : 78),
		-1
	);
	s += sway(
		ropesArt(t, { left: 190, right: 330, y: 160 }, { left: 196, right: 324, y: 196 }) +
			boardArt(t, 'high', 150, 196, 220, 44, { seed: 11, posts: false, r: 10, j: 3 }) +
			lab('HIGH', 168, 224, 12) +
			num('48 900', 352, 230, 26, 'end'),
		1,
		'hang b'
	);
	s += ropesArt(t, { left: 62, right: 458, y: 168 }, { left: 118, right: 402, y: 392 });
	// the heroes' coins on a log
	s += `<rect x="140" y="326" width="240" height="26" rx="13" fill="${t.mid}" stroke="${t.ink}" stroke-width="4"/><rect x="148" y="330" width="224" height="8" rx="4" fill="${t.light}" opacity=".8"/><rect x="148" y="342" width="224" height="6" rx="3" fill="${t.shade}" opacity=".8"/><ellipse cx="260" cy="356" rx="130" ry="6" fill="#000" opacity=".2"/>`;
	for (const [i, isMs] of [false, true].entries()) {
		const cx = i === 0 ? 205 : 315;
		const sel = ms === isMs;
		s += `<g class="coin" data-act="hero-${isMs ? 'ms' : 'pac'}" transform="translate(${cx} ${sel ? 282 : 292})">${coinArt(t, isMs, sel)}</g>`;
		s += lab(isMs ? 'MS. PAC-MAN' : 'PAC-MAN', cx, 380, 11, 'middle');
	}
	s += hit(
		'start',
		sway(plankArt(t, 'start', 110, 396, 300, 76, { primary: true }) + num('START', 260, 452, 46), 0.4, 'b')
	);
	s += knob(t, 468, 434, 'РУ', 'lang', 18);
	s += ropesArt(t, { left: 140, right: 380, y: 474 }, { left: 140, right: 380, y: 500 });
	s +=
		chalkArt(t, 70, 500, 380, 92) +
		chalk('Enter — старт · стрелки / WASD — ход', 92, 538, 24) +
		chalk('Пробел — пауза · F / Shift — огонь (ад)', 92, 572, 24);
	return { w: 520, h: 612, body: s, veil: 0.4 };
}

function ready(t: SeasonTheme): Built {
	const eaten = 9;
	let s = sway(bannerSpanArt(t, 30, 56, 480, 110) + num('READY!', 270, 140, 90), 0, '');
	s += ropesArt(t, { left: 200, right: 340, y: 176 }, { left: 206, right: 334, y: 204 });
	s += sway(
		boardArt(t, 'where', 150, 204, 240, 50, { seed: 11, posts: false, r: 11, j: 3 }) +
			lab('LEVEL 2 · AUTUMN', 270, 236, 16, 'middle'),
		0.8,
		'hang b'
	);
	s += trailArt(t, eaten, 24, { x0: 60, x1: 430, y: 300, amp: 6 });
	s += knob(t, 488, 300, '⏎', 'skip', 22);
	s += lab('SKIP', 488, 346, 10, 'middle');
	return { w: 540, h: 356, body: s, veil: 0.18 };
}

function pause(t: SeasonTheme): Built {
	let s = sway(
		boardArt(t, 'paused', 30, 16, 400, 100, { seed: 5, drop: 36 }) + num('PAUSED', 230, 92, 58),
		-1
	);
	s += ropesArt(t, { left: 76, right: 384, y: 114 }, { left: 106, right: 354, y: 164 });
	s += hit('resume', sway(plankArt(t, 'resume', 80, 164, 300, 64, { primary: true }) + num('RESUME', 230, 214, 40), 0.5, 'b'));
	s += ropesArt(t, { left: 124, right: 336, y: 228 }, { left: 130, right: 330, y: 250 });
	s += hit('restart', sway(plankArt(t, 'restart', 100, 250, 260, 56, { seed: 8 }) + num('RESTART', 230, 291, 32), -0.4, 'hang'));
	s += ropesArt(t, { left: 130, right: 330, y: 306 }, { left: 130, right: 330, y: 328 });
	s += hit('menu', sway(plankArt(t, 'menu', 100, 328, 260, 56, { seed: 9 }) + num('MENU', 230, 369, 32), 0.4, 'hang b'));
	s += knob(t, 408, 362, 'РУ', 'lang', 18);
	return { w: 460, h: 408, body: s, veil: 0.5 };
}

function death(t: SeasonTheme): Built {
	const last = state.last;
	let s = sway(boardArt(t, 'death', 20, 8, 280, 62, { seed: 5, drop: 14 }), -0.8);
	s += `<g transform="translate(${last ? 54 : 56} 40) scale(.85)">${heroArt(state.ms)}</g>`;
	s += last ? num('LAST LIFE', 188, 56, 34, 'middle', 'red') : num('2', 112, 58, 38, 'middle') + lab('LIVES LEFT', 134, 54, 15);
	return { w: 320, h: 104, body: s, veil: 0 };
}

function over(t: SeasonTheme): Built {
	let s = `<g style="filter:grayscale(.5) brightness(.82)">${sway(
		boardArt(t, 'over', 30, 16, 420, 112, { seed: 6, drop: 36 }) + cracksArt(t, 30, 16, 420, 112),
		-1
	)}</g>`;
	s += num('GAME OVER', 240, 96, 56, 'middle', 'red');
	s += ropesArt(t, { left: 150, right: 330, y: 126 }, { left: 156, right: 324, y: 158 });
	s += sway(
		boardArt(t, 'score', 110, 158, 260, 104, { seed: 12, posts: false, r: 12, j: 3 }) +
			lab('SCORE', 132, 188, 14) +
			num('12 450', 350, 246, 60, 'end'),
		0.7,
		'hang b'
	);
	if (state.record) {
		s += `<g transform="rotate(-7 400 160)">${ribbonArt(300, 138, 164, 30)}${lab('NEW RECORD', 382, 159, 12, 'middle').replace('class="lab"', 'class="lab" style="fill:#fff6d8"')}</g>`;
	}
	s += ropesArt(t, { left: 146, right: 334, y: 262 }, { left: 136, right: 344, y: 306 });
	s += hit('again', sway(plankArt(t, 'again', 90, 306, 300, 66, { primary: true }) + num('PLAY AGAIN', 240, 358, 38), 0.5, 'b'));
	s += ropesArt(t, { left: 136, right: 344, y: 372 }, { left: 140, right: 340, y: 394 });
	const other = state.ms ? 'PAC-MAN' : 'MS. PAC-MAN';
	s += hit(
		'swap',
		sway(
			plankArt(t, 'swap', 100, 394, 280, 58, { seed: 8 }) +
				`<g transform="translate(138 423) scale(.7)">${heroArt(!state.ms)}</g>` +
				num(other, 262, 434, 26),
			-0.4,
			'hang'
		)
	);
	s += ropesArt(t, { left: 140, right: 340, y: 452 }, { left: 140, right: 340, y: 474 });
	s += hit('menu', sway(plankArt(t, 'menu2', 100, 474, 280, 56, { seed: 9 }) + num('MENU', 240, 515, 32), 0.4, 'hang b'));
	return { w: 480, h: 552, body: s, veil: 0.55 };
}

function build(): Built {
	const t = SEASON_THEMES[WORLD[state.screen]];
	switch (state.screen) {
		case 'menu':
			return menu(t);
		case 'ready':
			return ready(t);
		case 'pause':
			return pause(t);
		case 'death':
			return death(t);
		default:
			return over(t);
	}
}

let natural = { w: 1280, h: 720 };
function fit(): void {
	const vp = $('viewport');
	const stage = $('stage');
	const k = Math.min(1, (vp.clientWidth - 2) / natural.w);
	stage.style.transform = `scale(${k})`;
	vp.style.height = `${natural.h * k + 2}px`;
	vp.style.alignItems = 'flex-start';
	stage.style.marginRight = `${-(natural.w * (1 - k))}px`;
}

function render(): void {
	const t = SEASON_THEMES[WORLD[state.screen]];
	const b = build();
	const f = FRAME[state.orient];
	natural = f;
	const stage = $('stage');
	stage.style.width = `${f.w}px`;
	stage.style.height = `${f.h}px`;
	const img = BG[`${state.orient}-${state.screen}`];
	stage.style.backgroundImage = img ? `url(data:image/jpeg;base64,${img})` : '';
	// the screen: centred, as large as the frame allows
	const cap = state.screen === 'ready' ? 1.5 : 2.2;
	const k = Math.min((f.w * (state.orient === 'land' ? 0.8 : 0.94)) / b.w, (f.h * 0.9) / b.h, cap);
	const sw = b.w * k;
	const sh = b.h * k;
	const top = state.screen === 'death' ? f.h * 0.5 - sh / 2 : (f.h - sh) / 2;
	const vars = `--label:${t.label};--ink-line:${t.ink};--num-ink:${t.numInk}`;
	stage.innerHTML =
		`<div class="veil" style="background:rgba(6,8,14,${b.veil})"></div>` +
		`<svg class="screen" viewBox="0 0 ${b.w} ${b.h}" width="${sw}" height="${sh}" style="left:${(f.w - sw) / 2}px;top:${top}px;${vars}">` +
		`<defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.numTop}"/><stop offset="1" stop-color="${t.num}"/></linearGradient>` +
		`<linearGradient id="grad-red" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc7a0"/><stop offset="1" stop-color="#ff6a3a"/></linearGradient></defs>` +
		`${b.body}</svg>`;
	fit();
	for (const [id, label] of SCREENS) {
		const btn = document.querySelector<HTMLButtonElement>(`#screens [data-s="${id}"]`);
		if (btn) btn.setAttribute('aria-pressed', String(state.screen === id));
		void label;
	}
	for (const o of ['land', 'port'] as const) {
		document.querySelector(`#orient [data-o="${o}"]`)?.setAttribute('aria-pressed', String(state.orient === o));
	}
	document.querySelector('#opts [data-opt="ms"]')?.setAttribute('aria-pressed', String(state.ms));
	document.querySelector('#opts [data-opt="record"]')?.setAttribute('aria-pressed', String(state.record));
	document.querySelector('#opts [data-opt="last"]')?.setAttribute('aria-pressed', String(state.last));
	const opts = $('opts');
	opts.querySelector<HTMLElement>('[data-opt="record"]')!.hidden = state.screen !== 'over';
	opts.querySelector<HTMLElement>('[data-opt="last"]')!.hidden = state.screen !== 'death';
}

function chip(parent: HTMLElement, attr: string, key: string, text: string): HTMLButtonElement {
	const b = document.createElement('button');
	b.type = 'button';
	b.dataset[attr] = key;
	b.textContent = text;
	parent.appendChild(b);
	return b;
}
for (const [id, label] of SCREENS) {
	chip($('screens'), 's', id, label).addEventListener('click', () => {
		state.screen = id;
		render();
	});
}
chip($('orient'), 'o', 'land', 'Горизонтально 16:9').addEventListener('click', () => {
	state.orient = 'land';
	render();
});
chip($('orient'), 'o', 'port', 'Вертикально 400×800').addEventListener('click', () => {
	state.orient = 'port';
	render();
});
const optMs = chip($('opts'), 'opt', 'ms', 'Ms. Pac-Man');
optMs.className = 'opt';
optMs.addEventListener('click', () => {
	state.ms = !state.ms;
	render();
});
const optRec = chip($('opts'), 'opt', 'record', 'Новый рекорд');
optRec.className = 'opt';
optRec.addEventListener('click', () => {
	state.record = !state.record;
	render();
});
const optLast = chip($('opts'), 'opt', 'last', 'Последняя жизнь');
optLast.className = 'opt';
optLast.addEventListener('click', () => {
	state.last = !state.last;
	render();
});

$('stage').addEventListener('click', (event) => {
	const el = (event.target as Element).closest<HTMLElement | SVGElement>('[data-act]');
	const act = el?.getAttribute('data-act');
	if (act === 'hero-ms') state.ms = true;
	else if (act === 'hero-pac') state.ms = false;
	else if (act === 'swap') state.ms = !state.ms;
	else return;
	render();
});
window.addEventListener('resize', fit);
render();
