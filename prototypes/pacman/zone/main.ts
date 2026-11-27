// Prototype: the Zone, playable on placeholder art. Every rule is the game's own code
// (`logic/zone/ZoneService`); this page reads its state and draws it with plain shapes.
// Arrows / WASD to move, Space throws a bolt, R restarts. Buttons: the helpers for trying things.
import { ARTIFACTS, ZoneService } from '../../../src/games/pacman/logic/zone/ZoneService';
import { NO_MODIFIERS } from '../../../src/games/pacman/logic/zone/ZoneWishes';
import type { Modifiers } from '../../../src/games/pacman/logic/zone/ZoneWishes';
import type { PlayerDirection } from '../../../src/games/pacman/logic/actors/PlayerModel';
import { ZONE } from '../../../src/games/pacman/config/zoneConfig';
import { GRID_ZONE } from '../../../src/games/pacman/config/mazes/grid_zone';
import { ZoneView } from '../../../src/games/pacman/render/zone/ZoneView';
import { ARTIFACT_GLOW } from '../../../src/games/pacman/render/zone/zoneSprites';
import { HeroView } from '../../../src/games/pacman/render/actors/HeroView';
import { OrangeHero } from '../../../src/games/pacman/render/actors/hero/FruitHero';
import { chargePainter } from '../../../src/games/pacman/render/actors/hero/heroCharge';

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const view = $<HTMLCanvasElement>('view');
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);
const GEM = ARTIFACT_GLOW;

let seed = 1;
let mods: Modifiers = NO_MODIFIERS;
let z = new ZoneService(seed, mods);
let heroView = new HeroView(new OrangeHero(), chargePainter);
heroView.setSeason('summer');
let immortal = false;
let flash = 0;
let vw = 0;
let vh = 0;
let S = 24;
let ox = 0;
let oy = 0;
let zoneView = new ZoneView(z.grid, GRID_ZONE);

function restart(next: Modifiers): void {
	mods = next;
	seed += 1;
	z = new ZoneService(seed, mods);
	heroView = new HeroView(new OrangeHero(), chargePainter);
	heroView.setSeason('summer');
	flash = 0;
	zoneView = new ZoneView(z.grid, GRID_ZONE);
	$('modal').style.display = 'none';
}

function layout(): void {
	vw = view.clientWidth;
	vh = view.clientHeight;
	view.width = Math.round(vw * D);
	view.height = Math.round(vh * D);
	const top = 52;
	S = Math.floor(Math.min((vw - 16) / z.grid.width, (vh - top - 8) / z.grid.height));
	ox = Math.round((vw - S * z.grid.width) / 2);
	oy = top + Math.round((vh - top - S * z.grid.height) / 2);
}
window.addEventListener('resize', layout);
layout();

function hud(): void {
	const e = z.emission;
	const phase =
		mods.noEmission
			? 'выбросов нет'
			: e.phase === 'calm'
				? `выброс через <b>${Math.ceil(e.left)}</b> с`
				: e.phase === 'siren'
					? `<b style="color:#ff6a4a">СИРЕНА ${Math.ceil(e.left)}</b>: в люк!`
					: '<b style="color:#ff6a4a">ВОЛНА</b>';
	const hearts = '♥'.repeat(z.hp) + '♡'.repeat(Math.max(0, z.hpMax - z.hp));
	const gems = ARTIFACTS.map((a, i) => `<span title="${a.title}" style="color:${z.taken[i] ? GEM[i] : '#555'}">◆</span>`).join('');
	$('hud').innerHTML =
		`<span style="color:#ff6a6a">${hearts}</span><span>болты <b>${z.bolts}</b>/${z.boltMax}</span><span>артефакты ${gems}</span>` +
		`<span>гайки <b>${Math.round(z.nutShare * 100)}%</b>/${Math.round(ZONE.dotsNeeded * 100)}%</span><span>${phase}</span>` +
		`<span>${z.monolithOpen ? '<b style="color:#9bffc8">Монолит открыт: иди в центр</b>' : 'Монолит закрыт'}</span>` +
		(z.speedLeft > 0 ? '<span>Колобок</span>' : '') +
		(z.medusaLeft > 0 ? '<span>Медуза</span>' : '');
	$('news').innerHTML = z.news.map((n) => `<div>${n}</div>`).join('');
}

function modal(): void {
	const m = $('modal');
	const card = $('card');
	if (z.state === 'play') {
		m.style.display = 'none';
		return;
	}
	m.style.display = 'flex';
	if (z.state === 'wish' && card.dataset.k !== 'wish') {
		card.dataset.k = 'wish';
		card.innerHTML =
			'<h2>Исполнитель желаний</h2><p>Выбери одно. Каждое желание что-то стоит.</p><div class="wishes">' +
			z.offered
				.map((w) => `<button class="wish" data-id="${w.id}"><b>${w.title}</b><div class="boon">+ ${w.boon}</div><div class="price">− ${w.price}</div></button>`)
				.join('') +
			'</div>';
		card.querySelectorAll<HTMLButtonElement>('.wish').forEach((b) => b.addEventListener('click', () => z.chooseWish(b.dataset.id ?? '')));
	} else if (z.state === 'cleared' && card.dataset.k !== 'cleared') {
		card.dataset.k = 'cleared';
		card.innerHTML = `<h2>Уровень пройден</h2><p>${z.chosen ? `Желание: ${z.chosen.title}. Цена: ${z.chosen.price}.` : ''}</p><button id="next">Следующий уровень с этой ценой</button>`;
		$('next').addEventListener('click', () => restart(z.nextModifiers()));
	} else if (z.state === 'dead' && card.dataset.k !== 'dead') {
		card.dataset.k = 'dead';
		card.innerHTML = '<h2>Зона забрала тебя</h2><p>R или кнопка: начать заново.</p><button id="again">Заново</button>';
		$('again').addEventListener('click', () => restart(NO_MODIFIERS));
	}
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
		z.throwBolt();
		e.preventDefault();
	} else if (e.key.toLowerCase() === 'r' || e.key.toLowerCase() === 'к') {
		restart(NO_MODIFIERS);
	}
});

const bar = $('bar');
function button(label: string, click: () => void, on?: () => boolean): void {
	const b = document.createElement('button');
	b.type = 'button';
	b.textContent = label;
	b.addEventListener('click', () => {
		click();
		b.blur();
		if (on) {
			b.setAttribute('aria-pressed', String(on()));
		}
	});
	if (on) {
		b.setAttribute('aria-pressed', 'false');
	}
	bar.append(b);
}
button('Выброс сейчас', () => z.emission.skipCalm());
button('+3 болта', () => (z.bolts = z.boltMax));
button('Открыть Монолит', () => z.cheatOpen());
button('Бессмертие', () => (immortal = !immortal), () => immortal);
button('Заново', () => restart(NO_MODIFIERS));

let time = 0;
let last = performance.now();
function frame(now: number): void {
	const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
	last = now;
	time += dt;
	if (immortal && z.state === 'play') {
		z.player.grantInvulnerability(1);
	}
	z.update(dt, want);
	if (z.hurt) {
		flash = 0.35;
	}
	flash = Math.max(0, flash - dt);
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.fillStyle = '#4a5a35';
	ctx.fillRect(0, 0, vw, vh);
	const L = { tileSize: S, offsetX: ox, offsetY: oy };
	zoneView.draw(ctx, z, L, time, () =>
		heroView.draw(ctx, z.player, L, time, { look: 'normal', charge: 0, dying: false })
	);
	zoneView.drawOverlay(ctx, z, L, vw, vh, time);
	if (flash > 0) {
		ctx.fillStyle = `rgba(255,40,30,${flash * 0.9})`;
		ctx.fillRect(0, 0, vw, vh);
	}
	hud();
	modal();
	requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
