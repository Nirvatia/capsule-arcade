// Prototype: the Zone, playable on placeholder art. Every rule is the game's own code
// (`logic/zone/ZoneService`); this page reads its state and draws it with plain shapes.
// Arrows / WASD to move, Space throws a bolt, R restarts. Buttons: the helpers for trying things.
import { ARTIFACTS, ZoneService } from '../../../src/games/pacman/logic/zone/ZoneService';
import { NO_MODIFIERS } from '../../../src/games/pacman/logic/zone/ZoneWishes';
import type { Modifiers } from '../../../src/games/pacman/logic/zone/ZoneWishes';
import type { PlayerDirection } from '../../../src/games/pacman/logic/actors/PlayerModel';
import { ZONE } from '../../../src/games/pacman/config/zoneConfig';
import { HeroView } from '../../../src/games/pacman/render/actors/HeroView';
import { OrangeHero } from '../../../src/games/pacman/render/actors/hero/FruitHero';
import { chargePainter } from '../../../src/games/pacman/render/actors/hero/heroCharge';

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const view = $<HTMLCanvasElement>('view');
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);
const GEM = ['#8fe8ff', '#ffd24a', '#e0524a', '#7cf06b'];

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
let still: HTMLCanvasElement | null = null;

function restart(next: Modifiers): void {
	mods = next;
	seed += 1;
	z = new ZoneService(seed, mods);
	heroView = new HeroView(new OrangeHero(), chargePainter);
	heroView.setSeason('summer');
	flash = 0;
	still = null;
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
	still = null;
}
window.addEventListener('resize', layout);
layout();

/** The ground, the walls with their shadows, the lair: drawn once. */
function bakeStill(): HTMLCanvasElement {
	const c = document.createElement('canvas');
	c.width = Math.round(vw * D);
	c.height = Math.round(vh * D);
	const g = c.getContext('2d') as CanvasRenderingContext2D;
	g.scale(D, D);
	g.fillStyle = '#39422b';
	g.fillRect(0, 0, vw, vh);
	const W = z.grid.width;
	const H = z.grid.height;
	const at = (x: number, y: number): string => (z.grid.isInside(x, y) ? z.grid.tileAt(x, y) : 'ES');
	for (let y = 0; y < H; y += 1) {
		for (let x = 0; x < W; x += 1) {
			const t = at(x, y);
			if (t === 'ES' || t === 'WL') {
				continue;
			}
			g.fillStyle = t === 'LT' || t === 'LE' || ['BY', 'PY', 'IY', 'CE'].includes(t) ? '#4a4a43' : (x + y) % 2 ? '#7b7656' : '#767152';
			g.fillRect(ox + x * S, oy + y * S, S, S);
		}
	}
	g.fillStyle = 'rgba(8,10,4,.34)';
	for (let y = 0; y < H; y += 1) {
		for (let x = 0; x < W; x += 1) {
			if (at(x, y) === 'WL') {
				g.fillRect(ox + x * S + S * 0.22, oy + y * S + S * 0.3, S, S);
			}
		}
	}
	for (let y = 0; y < H; y += 1) {
		for (let x = 0; x < W; x += 1) {
			if (at(x, y) !== 'WL') {
				continue;
			}
			const X = ox + x * S;
			const Y = oy + y * S;
			g.fillStyle = '#948f7e';
			g.fillRect(X, Y, S, S);
			g.fillStyle = 'rgba(255,250,230,.22)';
			g.fillRect(X, Y, S, 2);
			g.fillRect(X, Y, 2, S);
			g.fillStyle = 'rgba(20,18,10,.35)';
			g.fillRect(X, Y + S - 2, S, 2);
			g.fillRect(X + S - 2, Y, 2, S);
			g.fillStyle = 'rgba(40,36,20,.18)';
			g.fillRect(X + S * 0.45, Y + S * 0.2, 1, S * 0.6);
		}
	}
	return c;
}

const tx = (x: number): number => ox + x * S;
const ty = (y: number): number => oy + y * S;

function drawNuts(): void {
	for (let y = 0; y < z.grid.height; y += 1) {
		for (let x = 0; x < z.grid.width; x += 1) {
			if (z.grid.isDot(x, y) && !z.progress.isCollected(x, y)) {
				ctx.fillStyle = '#d6cfa8';
				ctx.beginPath();
				ctx.arc(tx(x + 0.5), ty(y + 0.5), S * 0.1, 0, 7);
				ctx.fill();
				ctx.fillStyle = '#6b664a';
				ctx.beginPath();
				ctx.arc(tx(x + 0.5), ty(y + 0.5), S * 0.04, 0, 7);
				ctx.fill();
			}
		}
	}
	z.map.artifacts.forEach((a, i) => {
		if (z.taken[i]) {
			return;
		}
		const cx = tx(a.x + 0.5);
		const cy = ty(a.y + 0.5);
		const r = S * (0.3 + 0.03 * Math.sin(time * 4 + i));
		ctx.fillStyle = GEM[i % 4];
		ctx.globalAlpha = 0.3;
		ctx.beginPath();
		ctx.arc(cx, cy, r * 1.8, 0, 7);
		ctx.fill();
		ctx.globalAlpha = 1;
		ctx.beginPath();
		ctx.moveTo(cx, cy - r);
		ctx.lineTo(cx + r * 0.8, cy);
		ctx.lineTo(cx, cy + r);
		ctx.lineTo(cx - r * 0.8, cy);
		ctx.closePath();
		ctx.fill();
		ctx.strokeStyle = 'rgba(255,255,255,.7)';
		ctx.stroke();
	});
}

function drawShelters(): void {
	const alert = z.emission.dangerous;
	for (const s of z.map.shelters) {
		const X = tx(s.x) + S * 0.12;
		const Y = ty(s.y) + S * 0.12;
		ctx.fillStyle = alert ? `rgba(120,230,110,${0.55 + 0.35 * Math.sin(time * 9)})` : '#4c6a40';
		ctx.fillRect(X, Y, S * 0.76, S * 0.76);
		ctx.strokeStyle = '#1b2614';
		ctx.lineWidth = 2;
		ctx.strokeRect(X, Y, S * 0.76, S * 0.76);
		ctx.fillStyle = '#1b2614';
		ctx.fillRect(X + S * 0.1, Y + S * 0.34, S * 0.56, S * 0.08);
		ctx.fillRect(X + S * 0.1, Y + S * 0.5, S * 0.56, S * 0.08);
	}
}

function drawMonolith(): void {
	const m = z.map.monolith;
	const cx = tx(m.x + 0.5);
	const cy = ty(m.y + 0.5);
	const open = z.monolithOpen;
	if (open) {
		const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 2.4);
		g.addColorStop(0, `rgba(150,255,200,${0.5 + 0.2 * Math.sin(time * 3)})`);
		g.addColorStop(1, 'rgba(150,255,200,0)');
		ctx.fillStyle = g;
		ctx.fillRect(cx - S * 2.4, cy - S * 2.4, S * 4.8, S * 4.8);
	}
	ctx.fillStyle = open ? '#2a3b32' : '#1c1d1b';
	ctx.beginPath();
	ctx.moveTo(cx - S * 0.3, cy + S * 0.45);
	ctx.lineTo(cx - S * 0.22, cy - S * 0.5);
	ctx.lineTo(cx, cy - S * 0.7);
	ctx.lineTo(cx + S * 0.22, cy - S * 0.5);
	ctx.lineTo(cx + S * 0.3, cy + S * 0.45);
	ctx.closePath();
	ctx.fill();
	ctx.strokeStyle = open ? '#9bffc8' : '#555';
	ctx.lineWidth = 1.5;
	ctx.stroke();
}

function drawAnomalies(): void {
	for (const a of z.anomalies.list) {
		const st = z.anomalies.stateOf(a);
		const cx = tx(a.x + 0.5);
		const cy = ty(a.y + 0.5);
		const wob = Math.sin(time * 6 + a.id);
		if (st === 'inert') {
			ctx.strokeStyle = 'rgba(200,200,190,.35)';
			ctx.setLineDash([3, 4]);
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.arc(cx, cy, S * 0.38, 0, 7);
			ctx.stroke();
			ctx.setLineDash([]);
			continue;
		}
		if (a.kind === 'heat') {
			// the halo spills past the tile: the edge is not exact
			const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.8);
			const k = st === 'active' ? 0.9 : st === 'warn' ? 0.35 + 0.25 * wob : 0.14;
			g.addColorStop(0, `rgba(255,140,40,${k})`);
			g.addColorStop(1, 'rgba(255,140,40,0)');
			ctx.fillStyle = g;
			ctx.fillRect(cx - S, cy - S, S * 2, S * 2);
			if (st === 'active') {
				ctx.fillStyle = '#fff2c0';
				ctx.beginPath();
				ctx.arc(cx, cy, S * 0.2, 0, 7);
				ctx.fill();
			}
		} else if (a.kind === 'electra') {
			const zone = z.anomalies.zoneOf(a);
			const k = st === 'active' ? 0.85 : st === 'warn' ? 0.25 + 0.25 * (wob > 0 ? 1 : 0) : 0.1;
			for (const p of zone) {
				ctx.fillStyle = `rgba(170,210,255,${k})`;
				ctx.fillRect(tx(p.x) + 2, ty(p.y) + 2, S - 4, S - 4);
			}
			if (st === 'active') {
				ctx.strokeStyle = '#ffffff';
				ctx.lineWidth = 2;
				for (const p of zone) {
					ctx.beginPath();
					ctx.moveTo(cx, cy);
					ctx.lineTo((cx + tx(p.x + 0.5)) / 2 + (Math.random() - 0.5) * 6, (cy + ty(p.y + 0.5)) / 2 + (Math.random() - 0.5) * 6);
					ctx.lineTo(tx(p.x + 0.5), ty(p.y + 0.5));
					ctx.stroke();
				}
			}
			ctx.fillStyle = '#cfe4ff';
			ctx.beginPath();
			ctx.arc(cx, cy, S * 0.12, 0, 7);
			ctx.fill();
		} else {
			ctx.strokeStyle = '#c8f06a';
			ctx.lineWidth = 2.5;
			ctx.beginPath();
			ctx.arc(cx, cy, S * (0.32 + 0.05 * wob), 0, 7);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(cx - S * 0.12, cy + S * 0.1);
			ctx.lineTo(cx, cy - S * 0.1);
			ctx.lineTo(cx + S * 0.12, cy + S * 0.1);
			ctx.stroke();
		}
	}
}

function drawTushkans(): void {
	for (const t of z.tushkans.list) {
		if (t.state === 'dead') {
			continue;
		}
		const cx = tx(t.x);
		const bob = t.state === 'sniff' ? Math.sin(time * 14 + t.fx) * S * 0.03 : 0;
		const cy = ty(t.y) + bob;
		const a = Math.atan2(t.dy, t.dx);
		ctx.save();
		ctx.translate(cx, cy);
		ctx.rotate(a);
		ctx.fillStyle = '#8a6a44';
		ctx.beginPath();
		ctx.ellipse(0, 0, S * 0.38, S * 0.26, 0, 0, 7);
		ctx.fill();
		ctx.fillStyle = '#6a4f30';
		ctx.beginPath();
		ctx.ellipse(-S * 0.1, -S * 0.22, S * 0.09, S * 0.12, 0, 0, 7);
		ctx.ellipse(-S * 0.1, S * 0.22, S * 0.09, S * 0.12, 0, 0, 7);
		ctx.fill();
		ctx.fillStyle = t.state === 'rush' ? '#ff3b2a' : '#fff1c0';
		ctx.beginPath();
		ctx.arc(S * 0.16, -S * 0.07, S * 0.045, 0, 7);
		ctx.arc(S * 0.16, S * 0.07, S * 0.045, 0, 7);
		ctx.fill();
		ctx.restore();
	}
}

function drawPoltergeist(): void {
	const p = z.poltergeist;
	if (p.state === 'aim' || p.state === 'appear') {
		const k = p.state === 'aim' ? 0.22 + 0.2 * Math.sin(time * 16) : 0.08;
		ctx.fillStyle = `rgba(255,70,50,${k})`;
		for (const l of p.line) {
			ctx.fillRect(tx(l.x) + 2, ty(l.y) + 2, S - 4, S - 4);
		}
	}
	if (p.state === 'appear' || p.state === 'aim' || p.state === 'stunned') {
		const cx = tx(p.at.x + 0.5);
		const cy = ty(p.at.y + 0.5);
		const f = p.state === 'stunned' ? 0.25 : 0.5 + 0.2 * Math.sin(time * 11);
		ctx.fillStyle = `rgba(235,240,255,${f})`;
		ctx.beginPath();
		ctx.moveTo(cx - S * 0.3, cy + S * 0.4);
		ctx.quadraticCurveTo(cx - S * 0.34, cy - S * 0.5, cx, cy - S * 0.5);
		ctx.quadraticCurveTo(cx + S * 0.34, cy - S * 0.5, cx + S * 0.3, cy + S * 0.4);
		ctx.lineTo(cx + S * 0.15, cy + S * 0.3);
		ctx.lineTo(cx, cy + S * 0.42);
		ctx.lineTo(cx - S * 0.15, cy + S * 0.3);
		ctx.closePath();
		ctx.fill();
		ctx.fillStyle = '#10131a';
		ctx.beginPath();
		ctx.arc(cx - S * 0.1, cy - S * 0.15, S * 0.05, 0, 7);
		ctx.arc(cx + S * 0.1, cy - S * 0.15, S * 0.05, 0, 7);
		ctx.fill();
	}
	if (p.barrel) {
		const b = p.barrel;
		ctx.fillStyle = '#a0522d';
		ctx.fillRect(tx(b.x) - S * 0.22, ty(b.y) - S * 0.28, S * 0.44, S * 0.56);
		ctx.fillStyle = '#3a2210';
		ctx.fillRect(tx(b.x) - S * 0.22, ty(b.y) - S * 0.12, S * 0.44, S * 0.06);
		ctx.fillRect(tx(b.x) - S * 0.22, ty(b.y) + S * 0.08, S * 0.44, S * 0.06);
	}
}

function drawBolt(): void {
	if (z.flight) {
		const f = z.flight;
		ctx.strokeStyle = `rgba(255,255,255,${1 - f.age * 4})`;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(tx(f.from.x + 0.5), ty(f.from.y + 0.5));
		ctx.lineTo(tx(f.to.x + 0.5), ty(f.to.y + 0.5));
		ctx.stroke();
	}
	if (z.lure) {
		const r = ((time * 1.6) % 1) * S * 1.6;
		ctx.strokeStyle = 'rgba(255,255,255,.5)';
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.arc(tx(z.lure.tile.x + 0.5), ty(z.lure.tile.y + 0.5), r, 0, 7);
		ctx.stroke();
		ctx.fillStyle = '#d6cfa8';
		ctx.beginPath();
		ctx.arc(tx(z.lure.tile.x + 0.5), ty(z.lure.tile.y + 0.5), S * 0.12, 0, 7);
		ctx.fill();
	}
}

function drawEmission(): void {
	const e = z.emission;
	if (e.phase === 'siren') {
		const k = 0.1 + 0.08 * Math.sin(time * 8);
		const g = ctx.createRadialGradient(vw / 2, vh / 2, vh * 0.3, vw / 2, vh / 2, vh * 0.85);
		g.addColorStop(0, 'rgba(255,60,30,0)');
		g.addColorStop(1, `rgba(255,60,30,${k * 3})`);
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, vw, vh);
	} else if (e.phase === 'wave') {
		const p = e.waveProgress;
		const x = -vw * 0.3 + p * vw * 1.6;
		const g = ctx.createLinearGradient(x - vw * 0.3, 0, x + vw * 0.15, 0);
		g.addColorStop(0, 'rgba(255,200,80,0)');
		g.addColorStop(0.7, 'rgba(255,120,60,.5)');
		g.addColorStop(1, 'rgba(255,255,230,.85)');
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, vw, vh);
	}
}

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
	still ??= bakeStill();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.drawImage(still, 0, 0);
	ctx.setTransform(D, 0, 0, D, 0, 0);
	drawShelters();
	drawMonolith();
	drawNuts();
	drawAnomalies();
	drawBolt();
	drawTushkans();
	drawPoltergeist();
	heroView.draw(ctx, z.player, { tileSize: S, offsetX: ox, offsetY: oy }, time, { look: 'normal', charge: 0, dying: false });
	drawEmission();
	if (flash > 0) {
		ctx.fillStyle = `rgba(255,40,30,${flash * 0.9})`;
		ctx.fillRect(0, 0, vw, vh);
	}
	hud();
	modal();
	requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
