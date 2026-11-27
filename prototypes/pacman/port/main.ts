// Prototype: the Port (hunt the Broker), playable. Every rule is the game's own code
// (`logic/port/PortService`), the picture is `render/port/PortView`; this page reads the state, draws
// it and handles the keys. Arrows / WASD to move, Space dashes, R restarts. Buttons: helpers.
import { GRID_PORT } from '../../../src/games/pacman/config/mazes/grid_port';
import { PORT } from '../../../src/games/pacman/config/portConfig';
import type { PlayerDirection } from '../../../src/games/pacman/logic/actors/PlayerModel';
import { PortService } from '../../../src/games/pacman/logic/port/PortService';
import { HeroView } from '../../../src/games/pacman/render/actors/HeroView';
import { OrangeHero } from '../../../src/games/pacman/render/actors/hero/FruitHero';
import { chargePainter } from '../../../src/games/pacman/render/actors/hero/heroCharge';
import { PortView } from '../../../src/games/pacman/render/port/PortView';

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const view = $<HTMLCanvasElement>('view');
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);

let seed = 1;
let n = new PortService(seed);
let portView = new PortView(n.grid, GRID_PORT);
let heroView = makeHero();
let immortal = false;
let flash = 0;
let vw = 0;
let vh = 0;
let S = 24;
let ox = 0;
let oy = 0;

function makeHero(): HeroView {
	const h = new HeroView(new OrangeHero(), chargePainter);
	h.setSeason('summer');
	return h;
}

function restart(): void {
	seed += 1;
	n = new PortService(seed);
	portView = new PortView(n.grid, GRID_PORT);
	heroView = makeHero();
	flash = 0;
	$('modal').style.display = 'none';
	$('card').dataset.k = '';
}

function layout(): void {
	vw = view.clientWidth;
	vh = view.clientHeight;
	view.width = Math.round(vw * D);
	view.height = Math.round(vh * D);
	// the whole scene stays in view, as in the seasons: some ground above the yard for the sea and the
	// ship, some below for the road, and the maze about three quarters of the height
	const top = 52;
	S = Math.floor(Math.min((vw - 16) / (n.grid.width + 16), (vh - top) / (n.grid.height + 10)));
	ox = Math.round((vw - S * n.grid.width) / 2);
	oy = top + Math.round(S * 5.5);
}
window.addEventListener('resize', layout);
layout();

function hud(): void {
	const hearts = '♥'.repeat(n.hp) + '♡'.repeat(Math.max(0, PORT.hp - n.hp));
	const boss = '⬢'.repeat(n.boss.hp) + '⬡'.repeat(Math.max(0, PORT.boss.hp - n.boss.hp));
	const hacks = n.terminals.map((_, i) => `<span style="color:${n.boss.hacked[i] ? '#ff3a4a' : '#5a6472'}">■</span>`).join('');
	const dash = '▮'.repeat(n.dashCharges) + '▯'.repeat(Math.max(0, PORT.dash.max - n.dashCharges));
	const state = n.boss.state === 'hack' ? 'взламывает' : n.boss.state === 'stunned' ? 'оглушён' : 'бежит';
	$('hud').innerHTML =
		`<span style="color:#ff6a8a">${hearts}</span><span style="color:#ff3fd8">Брокер ${boss}</span><span>терминалы ${hacks}</span>` +
		`<span>рывок <b>${dash}</b> [пробел]</span><span>очки <b>${n.score}</b></span><span style="color:#aab6c8">${state}</span>`;
	$('news').innerHTML = n.news.map((t) => `<div>${t}</div>`).join('');
}

function modal(): void {
	const m = $('modal');
	const card = $('card');
	if (n.state === 'play') {
		m.style.display = 'none';
		return;
	}
	m.style.display = 'flex';
	if (card.dataset.k === n.state) {
		return;
	}
	card.dataset.k = n.state;
	const text: Record<string, string> = {
		won: '<h2>Брокер уничтожен</h2><p>Порт спасён.</p>',
		escaped: '<h2>Брокер сбежал</h2><p>Он взломал все четыре терминала.</p>',
		dead: '<h2>Охрана порта поймала тебя</h2><p>R или кнопка: начать заново.</p>'
	};
	card.innerHTML = `${text[n.state] ?? ''}<p>Очки: ${n.score}</p><button id="again">Ещё раз</button>`;
	$('again').addEventListener('click', restart);
}

const KEYS: Record<string, PlayerDirection> = {
	ArrowUp: 'UP',
	ArrowDown: 'DOWN',
	ArrowLeft: 'LEFT',
	ArrowRight: 'RIGHT',
	w: 'UP',
	s: 'DOWN',
	a: 'LEFT',
	d: 'RIGHT',
	ц: 'UP',
	ы: 'DOWN',
	ф: 'LEFT',
	в: 'RIGHT'
};
let want: PlayerDirection | null = null;
window.addEventListener('keydown', (e) => {
	const d = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
	if (d) {
		want = d;
		e.preventDefault();
	} else if (e.key === ' ') {
		n.dash();
		e.preventDefault();
	} else if (e.key.toLowerCase() === 'r' || e.key.toLowerCase() === 'к') {
		restart();
	}
});

const bar = $('bar');
function button(label: string, click: () => void, on?: () => boolean): void {
	const b = document.createElement('button');
	b.type = 'button';
	b.textContent = label;
	if (on) {
		b.setAttribute('aria-pressed', 'false');
	}
	b.addEventListener('click', () => {
		click();
		b.blur();
		if (on) {
			b.setAttribute('aria-pressed', String(on()));
		}
	});
	bar.append(b);
}
button('+3 рывка', () => (n.dashCharges = PORT.dash.max));
button('Энергоячейка', () => n.cheatCell());
button('Захлопнуть все двери', () => n.cheatSlam());
button('Бессмертие', () => (immortal = !immortal), () => immortal);
button('Заново', restart);

let time = 0;
let last = performance.now();
function frame(now: number): void {
	const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
	last = now;
	time += dt;
	if (immortal && n.state === 'play') {
		n.player.grantInvulnerability(1);
	}
	n.update(dt, want);
	if (n.hurt) {
		flash = 0.35;
	}
	flash = Math.max(0, flash - dt);
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.fillStyle = '#0d141c';
	ctx.fillRect(0, 0, vw, vh);
	const L = { tileSize: S, offsetX: ox, offsetY: oy };
	portView.draw(ctx, n, L, time, () => heroView.draw(ctx, n.player, L, time, { look: 'normal', charge: 0, dying: false }));
	portView.drawOverlay(ctx, n, L, vw, vh, time);
	if (flash > 0) {
		ctx.fillStyle = `rgba(255,40,70,${flash * 0.9})`;
		ctx.fillRect(0, 0, vw, vh);
	}
	hud();
	modal();
	requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
