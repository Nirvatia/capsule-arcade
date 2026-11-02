<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { getSavedScore, saveScore } from '$shared/utils/scoreStore';
	import { SimonAudio } from '../audio';
	import { ORDERS_PER_LEVEL, MAX_LIVES } from '../logic/orders';
	import type { Mode, Pad } from '../logic/types';
	import { SimonGame, type Fx } from '../SimonGame.svelte';
	import SimonMascot from './SimonMascot.svelte';
	import SimonOffice from './SimonOffice.svelte';
	import SimonPads from './SimonPads.svelte';

	interface Pop {
		id: number;
		text: string;
		tone: 'good' | 'crit' | 'life';
	}

	interface Particle {
		id: number;
		x: number;
		y: number;
		dx: number;
		dy: number;
		rot: number;
		color: string;
	}

	interface Puff {
		id: number;
		left: number;
	}

	const SCORE_KEYS: Record<Mode, string> = { classic: 'simon', orders: 'simon_orders' };
	const PAD_COLORS = ['#2ed573', '#3f8cff', '#ff4757', '#ffc61f'];
	const HEART = 'M12 21s-8-5.3-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.7-8 11-8 11z';
	const clock = new Intl.DateTimeFormat('ru', { hour: '2-digit', minute: '2-digit' });

	const game = new SimonGame({
		load: (mode) => Number.parseInt(getSavedScore(SCORE_KEYS[mode], 0), 10) || 0,
		save: (mode, score) => void saveScore(SCORE_KEYS[mode], score)
	});
	const audio = new SimonAudio();

	let root: HTMLDivElement | undefined = $state();
	let muted = $state(audio.muted);
	let shake = $state(false);
	let flash = $state(false);
	let glitch = $state(false);
	let pops = $state<Pop[]>([]);
	let particles = $state<Particle[]>([]);
	let puffs = $state<Puff[]>([]);
	let crit = $state(0);
	let levelBanner = $state<number | null>(null);
	let lostHeart = $state(-1);
	let bests = $state<Record<Mode, number>>({ classic: 0, orders: 0 });
	let menuTab = $state<'shifts' | 'rules'>('shifts');
	let endTime = $state('');

	let timers: ReturnType<typeof setTimeout>[] = [];
	let fxId = 0;

	function later(fn: () => void, ms: number): void {
		const id = setTimeout(() => {
			timers = timers.filter((t) => t !== id);
			fn();
		}, ms);
		timers.push(id);
	}

	function pop(text: string, tone: Pop['tone']): void {
		const id = ++fxId;
		pops = [...pops, { id, text, tone }];
		later(() => (pops = pops.filter((p) => p.id !== id)), 1000);
	}

	/** Конфетти из центра кнопки (или из центра пульта, если кнопки нет). */
	function burst(pad: Pad | null, count: number): void {
		if (!root || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const selector = pad === null ? '.simon' : `[data-pad="${pad}"]`;
		const target = root.querySelector(selector)?.getBoundingClientRect();
		const base = root.getBoundingClientRect();
		if (!target) return;

		const x = target.left - base.left + target.width / 2;
		const y = target.top - base.top + target.height / 2;
		const fresh: Particle[] = Array.from({ length: count }, () => {
			const angle = Math.random() * Math.PI * 2;
			const dist = 80 + Math.random() * 140;
			return {
				id: ++fxId,
				x,
				y,
				dx: Math.cos(angle) * dist,
				dy: Math.sin(angle) * dist - 40,
				rot: Math.random() * 720,
				color: pad === null || Math.random() < 0.3 ? '#ffd21f' : PAD_COLORS[pad]!
			};
		});
		const first = fresh[0]!.id;
		particles = [...particles, ...fresh];
		later(() => (particles = particles.filter((p) => p.id < first || p.id > first + count)), 950);
	}

	function handleFx(fx: Fx): void {
		audio.play(fx);

		switch (fx.type) {
			case 'success':
				if (game.mode === 'orders') {
					pop(`+${fx.points}`, fx.crit ? 'crit' : 'good');
					if (fx.lottery === 'life') pop('+1 ❤', 'life');
				}
				burst(game.pressedPad, fx.crit ? 34 : game.mode === 'classic' ? 26 : 18);
				if (fx.crit) {
					crit = ++fxId;
					later(() => (crit = 0), 950);
				}
				break;
			case 'fail':
				lostHeart = game.mode === 'orders' ? game.lives : -1;
				shake = flash = glitch = true;
				later(() => (flash = false), 160);
				later(() => (shake = glitch = false), 720);
				later(() => (lostHeart = -1), 600);
				break;
			case 'levelUp':
				levelBanner = fx.level;
				later(() => (levelBanner = null), 1450);
				break;
			case 'gameOver':
				endTime = clock.format(Date.now());
				refreshBests();
				break;
		}
	}

	function refreshBests(): void {
		bests = {
			classic: Number.parseInt(getSavedScore(SCORE_KEYS.classic, 0), 10) || 0,
			orders: Number.parseInt(getSavedScore(SCORE_KEYS.orders, 0), 10) || 0
		};
	}

	onMount(() => {
		refreshBests();
		const offFx = game.onFx(handleFx);

		let last = performance.now();
		let raf = requestAnimationFrame(function loop(now) {
			game.tick(now - last);
			last = now;
			raf = requestAnimationFrame(loop);
		});

		return () => {
			cancelAnimationFrame(raf);
			offFx();
			for (const id of timers) clearTimeout(id);
			audio.destroy();
		};
	});

	const onBreak = $derived(game.phase === 'order' && game.order?.kind === 'break' && !game.paused);

	// Перекур: снизу поднимается пар.
	$effect(() => {
		if (!onBreak) return;
		const puff = () => {
			const id = ++fxId;
			puffs = [...puffs, { id, left: 10 + Math.random() * 80 }];
			later(() => (puffs = puffs.filter((p) => p.id !== id)), 2500);
		};
		puff();
		const interval = setInterval(puff, 350);
		return () => clearInterval(interval);
	});

	function start(mode: Mode): void {
		audio.unlock();
		game.start(mode);
	}

	function toggleMute(): void {
		audio.setMuted(!audio.muted);
		muted = audio.muted;
	}

	function press(pad: Pad): void {
		audio.unlock();
		game.press(pad);
	}

	function onKeydown(event: KeyboardEvent): void {
		if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
		const target = event.target;
		if (
			target instanceof HTMLInputElement ||
			target instanceof HTMLTextAreaElement ||
			target instanceof HTMLSelectElement
		) {
			return;
		}
		// На кнопке/ссылке Enter и Пробел оставляем браузеру — пусть сработает сам элемент.
		const onControl = target instanceof HTMLButtonElement || target instanceof HTMLAnchorElement;

		audio.unlock();
		let handled = true;

		if (event.key >= '1' && event.key <= '4') {
			game.press((Number(event.key) - 1) as Pad);
		} else if (event.code === 'KeyM') {
			toggleMute();
		} else if (event.key === 'Escape') {
			game.togglePause();
		} else if (event.key === ' ' && !onControl) {
			if (game.paused) game.resume();
			else game.skip();
		} else if (event.key === 'Enter' && !onControl) {
			if (game.paused) game.resume();
			else if (game.phase === 'menu' || game.phase === 'gameover') start(game.mode);
			else handled = false;
		} else {
			handled = false;
		}

		if (handled) event.preventDefault();
	}

	function onVisibility(): void {
		if (document.hidden) game.pause();
	}

	const isOrders = $derived(game.mode === 'orders');
	const inGame = $derived(game.phase !== 'menu' && game.phase !== 'gameover');
	const bubbleTone = $derived(
		game.phase === 'fail'
			? 'bad'
			: game.phase === 'feedback' || game.phase === 'cleared'
				? 'good'
				: onBreak
					? 'break'
					: ''
	);
	const timerPct = $derived(Math.round(game.timer * 100));

	const rank = $derived.by(() => {
		const s = game.score;
		const tiers: [number, string, string][] = isOrders
			? [
					[15000, 'Гуру 1С', 'О тебе слагают легенды в курилке.'],
					[9000, 'Архитектор хаоса', 'Конфигурация боится тебя.'],
					[5000, 'Ведущий программист', 'Главбух смотрит с уважением.'],
					[2000, 'Программист 1С', 'База жива. Пока.'],
					[0, 'Стажёр', 'Тебе доверили только скрепки.']
				]
			: [
					[25, 'Гуру 1С', 'Помнишь все проводки с 2007 года.'],
					[18, 'Архитектор', 'Память как у регистра накопления.'],
					[12, 'Программист 1С', 'Пакеты проводишь не глядя.'],
					[6, 'Оператор', 'Неплохо, но кофе нужен.'],
					[0, 'Стажёр', 'Зато честно.']
				];
		const [, name, quip] = tiers.find(([min]) => s >= min) ?? tiers[tiers.length - 1]!;
		return { name, quip };
	});
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Russo+One&family=Rubik:wght@400;600;800&family=Caveat:wght@700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<svelte:window onkeydown={onKeydown} onblur={() => game.pause()} />
<svelte:document onvisibilitychange={onVisibility} />

<div class="simon-root" class:coffee={onBreak} bind:this={root}>
	<SimonOffice />

	<div class="layer" class:shake>
		<header class="top">
			<a class="home" href={resolve('/')} aria-label="В игровой зал">←</a>
			<h1>1С: <em>ПОГРОМИСТ</em></h1>
			<span class="mode-tag">{isOrders ? 'Приказы 1С' : 'Классика'}</span>
			<div class="top-actions">
				{#if inGame}
					<button
						type="button"
						class="icon-btn"
						onclick={() => game.pause()}
						aria-label="Пауза (Esc)"
					>
						⏸
					</button>
				{/if}
				<button
					type="button"
					class="icon-btn"
					onclick={toggleMute}
					aria-pressed={muted}
					aria-label="Звук (M)"
				>
					{muted ? '🔇' : '🔊'}
				</button>
			</div>
		</header>

		<section class="hud" aria-label="Показатели">
			{#if isOrders}
				<div class="chip">
					<span>Очки</span>
					{#key game.score}<b class="bump">{game.score}</b>{/key}
				</div>
				<div class="chip" class:hot={game.combo >= 5}>
					<span>Комбо</span>
					<b>×{game.combo}{game.combo >= 5 ? ' 🔥' : ''}</b>
				</div>
				<div class="chip">
					<span>Уровень {game.level}</span>
					<div class="pips" aria-label="Прогресс уровня">
						{#each { length: ORDERS_PER_LEVEL }, i (i)}
							<i class:on={i < game.ordersInLevel}></i>
						{/each}
					</div>
				</div>
				<div class="chip">
					<span>Жизни</span>
					<div class="hearts">
						{#each { length: MAX_LIVES }, i (i)}
							<svg
								viewBox="0 0 24 24"
								class:lost={i >= game.lives}
								class:burst={i === lostHeart}
								aria-hidden="true"
							>
								<path d={HEART} />
							</svg>
						{/each}
					</div>
				</div>
			{:else}
				<div class="chip">
					<span>Раунд</span>
					{#key game.round}<b class="bump">{game.round}</b>{/key}
				</div>
			{/if}
			<div class="chip">
				<span>Рекорд</span>
				<b>{game.best}</b>
			</div>
		</section>

		<main class="play">
			<div class="speech-row">
				<SimonMascot mood={game.mood} lookAt={game.pressedPad ?? game.litPad} />
				<div class="bubble {bubbleTone}" class:glitch aria-live="polite">
					<p class="headline">{game.headline}</p>
					<div class="timer" aria-hidden="true">
						<i class:low={timerPct <= 30} style="width: {timerPct}%"></i>
					</div>
				</div>
			</div>

			<div class="pad-area">
				<div class="pad-box">
					<SimonPads
						litPad={game.litPad}
						pressedPad={game.pressedPad}
						pressCount={game.pressCount}
						locked={!game.acceptsPads}
						dimmed={onBreak}
						onPress={press}
					>
						{#if isOrders}
							<button
								type="button"
								class="skip"
								tabindex="-1"
								disabled={!game.canSkip}
								onpointerdown={(event) => {
									event.preventDefault();
									game.skip();
								}}
							>
								<b>Пропуск</b>
								<small>пробел</small>
							</button>
						{:else}
							<div class="round">
								<b>{game.phase === 'menu' ? '—' : game.round}</b>
								<small>{game.phase === 'input' ? `${game.step}/${game.round}` : 'раунд'}</small>
							</div>
						{/if}
					</SimonPads>

					{#each pops as p (p.id)}
						<div class="pop {p.tone}">{p.text}</div>
					{/each}
				</div>
			</div>
		</main>

		<footer class="statusbar">
			<span class="dot" class:bad={game.phase === 'fail' || game.phase === 'gameover'}></span>
			{game.status}
		</footer>
	</div>

	<!-- Эффекты -->
	<div class="fx" aria-hidden="true">
		{#each particles as p (p.id)}
			<i
				class="part"
				style="left: {p.x}px; top: {p.y}px; background: {p.color}; --dx: {p.dx}px; --dy: {p.dy}px; --r: {p.rot}deg"
			></i>
		{/each}

		{#each puffs as p (p.id)}
			<i class="puff" style="left: {p.left}%"></i>
		{/each}

		{#if crit}
			{#key crit}
				<div class="crit-fx">
					<div class="white"></div>
					<div class="rays"></div>
					<div class="word">КРИТ!</div>
				</div>
			{/key}
		{/if}

		{#if levelBanner !== null}
			<div class="levelup">
				<div class="stripe"></div>
				<div class="level-text">
					Уровень {levelBanner}
					<small>приказы становятся бодрее</small>
				</div>
			</div>
		{/if}
	</div>

	<div class="flash" class:on={flash} aria-hidden="true"></div>

	<!-- Экраны -->
	{#if game.phase === 'menu'}
		<div class="overlay">
			<div class="win">
				<div class="win-bar">
					<span class="win-logo">1С</span>
					<span class="win-title">Погромист: Предприятие 8.3 — Конфигуратор смены</span>
					<span class="win-btns" aria-hidden="true"><i></i><i></i><i></i></span>
				</div>
				<div class="win-body">
					<nav class="win-nav">
						<button
							type="button"
							class:on={menuTab === 'shifts'}
							onclick={() => (menuTab = 'shifts')}
						>
							📋 Смены
						</button>
						<button
							type="button"
							class:on={menuTab === 'rules'}
							onclick={() => (menuTab = 'rules')}
						>
							📖 Регламент
						</button>
						<span class="nav-dead">❓ Справка (нет)</span>
						<a class="nav-link" href={resolve('/')}>🚪 В игровой зал</a>
					</nav>

					<div class="win-content">
						{#if menuTab === 'shifts'}
							<h2>Выберите <span>смену</span></h2>
							<div class="docs">
								<div class="doc-row head">
									<span></span><span>Документ</span><span>Рекорд</span><span></span>
								</div>
								<div class="doc-row">
									<span>🧠</span>
									<span>
										<b>Классика</b>
										<small>Повтори растущую последовательность. Одна ошибка — конец.</small>
									</span>
									<span>{bests.classic} р.</span>
									<button type="button" class="btn blue" onclick={() => start('classic')}>
										Провести
									</button>
								</div>
								<div class="doc-row">
									<span>📢</span>
									<span>
										<b>Приказы 1С</b>
										<small>Только «1С говорит:», остальное — мимо.</small>
									</span>
									<span>{bests.orders}</span>
									<button type="button" class="btn green" onclick={() => start('orders')}>
										Провести
									</button>
								</div>
							</div>
						{:else}
							<h2>Регламент <span>смены</span></h2>
							<h3>🧠 Классика</h3>
							<p>
								1С показывает последовательность — повтори её. Каждый раунд добавляется шаг, после
								5, 9 и 13 шагов показ ускоряется. На каждое нажатие — 3 секунды.
							</p>
							<h3>📢 Приказы 1С</h3>
							<ul>
								<li>Жми, только если приказ начинается с <q>1С говорит:</q></li>
								<li>
									Главбух, директор, «1С говорила», «1С гаварит» — не начальство: жми
									<b>Пропуск</b> или жди
								</li>
								<li>☕ Перекур — ничего не трогай до конца таймера</li>
								<li>Подсветка кнопок иногда врёт. «Ещё…» — лотерея: жизнь или премия</li>
								<li>Быстрый ответ — КРИТ, серия без ошибок — множитель до ×5</li>
							</ul>
						{/if}
						<p class="keys">
							<kbd>1</kbd>–<kbd>4</kbd> кнопки · <kbd>Пробел</kbd> пропуск · <kbd>Esc</kbd> пауза ·
							<kbd>M</kbd> звук · <kbd>Enter</kbd> «Провести»
						</p>
					</div>
				</div>
			</div>
		</div>
	{:else if game.phase === 'gameover'}
		<div class="overlay">
			<article class="paper">
				<div class="paper-hdr">ООО «РОГА И КОПЫТА» · ПРИКАЗ № {game.score}-К</div>
				<h2>Об окончании смены</h2>
				<p>
					Сотрудник <b>Погромист</b> (должность: <b>{rank.name}</b>) провёл смену и
					{isOrders ? 'набрал' : 'прошёл'}
				</p>
				<div class="paper-score">
					{game.score}
					<small>{isOrders ? 'очков' : 'раундов'}</small>
				</div>
				<p>
					{#if isOrders}
						Уровень: <b>{game.level}</b> · Лучшее комбо: <b>×{game.bestCombo}</b> ·
					{/if}
					Рекорд: <b>{game.best}</b>
				</p>
				<p class="quip"><i>Основание: база упала. {rank.quip}</i></p>
				<div class="sign">
					<span>Главбух: <u>&nbsp;Иванова&nbsp;</u></span>
					<span>{endTime}</span>
				</div>
				<div class="stamp" class:good={game.newRecord}>
					{game.newRecord ? 'ПРЕМИЯ' : 'УВОЛЕН'}
				</div>
				<div class="actions">
					<button type="button" class="btn green" onclick={() => start(game.mode)}>
						↻ Выйти на смену
					</button>
					<button type="button" class="btn ghost" onclick={() => game.toMenu()}>В меню</button>
				</div>
			</article>
		</div>
	{:else if game.paused}
		<div class="overlay">
			<div class="card">
				<h2>Пауза</h2>
				<p class="sub">1С перезагружается… подождите</p>
				<div class="actions">
					<button type="button" class="btn green" onclick={() => game.resume()}>▶ Продолжить</button
					>
					<button type="button" class="btn ghost" onclick={() => game.toMenu()}>Меню</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.simon-root {
		--s-bg: #140d2e;
		--s-panel: #221850;
		--s-line: #0a0620;
		--s-text: #fff;
		--s-muted: #b6acdf;
		--s-gold: #ffd21f;
		--s-green: #2ed573;
		--s-red: #ff4757;
		--s-orange: #ff7b1f;
		--s-display: 'Russo One', 'Arial Black', sans-serif;
		--s-body: 'Rubik', system-ui, sans-serif;

		position: fixed;
		inset: 0;
		z-index: 10;
		overflow: hidden;
		isolation: isolate;
		color: var(--s-text);
		font-family: var(--s-body);
		user-select: none;
		background: var(--s-bg);
	}

	.layer {
		position: absolute;
		inset: 0;
		z-index: 1;
		display: grid;
		grid-template-rows: auto auto minmax(0, 1fr) auto;
		grid-template-columns: minmax(0, 1fr);
		gap: 10px;
		padding: max(10px, env(safe-area-inset-top)) 16px max(10px, env(safe-area-inset-bottom));
	}

	.layer > * {
		width: 100%;
		max-width: 920px;
		justify-self: center;
	}

	.shake {
		animation: shake 0.4s;
	}

	@keyframes shake {
		20% {
			translate: -8px 2px;
		}
		40% {
			translate: 7px -3px;
		}
		60% {
			translate: -5px 1px;
		}
		80% {
			translate: 3px 0;
		}
	}

	/* Перекур: экран лениво покачивается, снизу тёплый оттенок. */
	.coffee .layer {
		animation: sway 2.6s ease-in-out infinite;
	}

	.coffee::after {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 2;
		pointer-events: none;
		background: radial-gradient(ellipse at 50% 120%, rgba(120, 70, 30, 0.35), transparent 60%);
	}

	@keyframes sway {
		25% {
			transform: rotate(-0.6deg) translateX(-3px);
		}
		75% {
			transform: rotate(0.6deg) translateX(3px);
		}
	}

	/* ---------- Верхняя панель ---------- */

	.top {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.home,
	.icon-btn {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		flex: none;
		border: 3px solid var(--s-line);
		border-radius: 12px;
		background: var(--s-panel);
		color: var(--s-text);
		font-size: 18px;
		text-decoration: none;
		cursor: pointer;
		box-shadow: 0 4px 0 var(--s-line);
	}

	.home:active,
	.icon-btn:active {
		translate: 0 3px;
		box-shadow: 0 1px 0 var(--s-line);
	}

	h1 {
		margin: 0;
		font: 400 clamp(18px, 3vw, 28px) / 1 var(--s-display);
		color: var(--s-gold);
		text-shadow: 0 3px 0 #b3361b;
		white-space: nowrap;
	}

	h1 em {
		font-style: normal;
		color: var(--s-text);
		text-shadow: 0 3px 0 var(--s-line);
	}

	.mode-tag {
		padding: 4px 10px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.08);
		color: var(--s-muted);
		font-size: 13px;
		font-weight: 600;
		white-space: nowrap;
	}

	.top-actions {
		display: flex;
		gap: 8px;
		margin-left: auto;
	}

	/* ---------- HUD ---------- */

	.hud {
		display: flex;
		justify-content: center;
		gap: 8px;
	}

	.chip {
		position: relative;
		flex: 1 1 0;
		min-width: 0;
		max-width: 150px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		padding: 6px 8px;
		border: 3px solid var(--s-line);
		border-radius: 12px;
		background: var(--s-panel);
		box-shadow: 0 4px 0 var(--s-line);
	}

	.chip span {
		color: var(--s-muted);
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		white-space: nowrap;
	}

	.chip b {
		font: 400 26px / 1.1 var(--s-display);
		color: var(--s-gold);
		white-space: nowrap;
	}

	.chip b.bump {
		animation: bump 0.35s;
	}

	@keyframes bump {
		40% {
			transform: scale(1.35);
			color: #fff;
		}
	}

	.chip.hot {
		border-color: var(--s-orange);
		box-shadow:
			0 4px 0 var(--s-line),
			0 0 22px rgba(255, 123, 31, 0.55);
	}

	.chip.hot::after {
		content: '';
		position: absolute;
		inset: -14px 10% auto;
		z-index: -1;
		height: 22px;
		background: radial-gradient(ellipse at 50% 100%, rgba(255, 140, 30, 0.9), transparent 70%);
		filter: blur(4px);
		animation: flame 0.25s infinite alternate;
	}

	@keyframes flame {
		to {
			transform: scaleY(1.35) translateY(-3px);
			opacity: 0.7;
		}
	}

	.pips {
		display: flex;
		gap: 3px;
		padding: 6px 0 5px;
	}

	.pips i {
		width: 9px;
		height: 9px;
		border-radius: 2px;
		background: rgba(255, 255, 255, 0.14);
	}

	.pips i.on {
		background: var(--s-gold);
		box-shadow: 0 0 6px var(--s-gold);
		animation: pip 0.4s;
	}

	@keyframes pip {
		50% {
			transform: scale(1.8);
		}
	}

	.hearts {
		display: flex;
		gap: 3px;
		padding-top: 2px;
	}

	.hearts svg {
		width: 24px;
		height: 24px;
		fill: var(--s-red);
		filter: drop-shadow(0 2px 0 var(--s-line));
		transition: opacity 0.2s;
	}

	.hearts svg.lost {
		opacity: 0.18;
		filter: grayscale(1);
	}

	.hearts svg.burst {
		animation: heart 0.6s;
	}

	@keyframes heart {
		40% {
			transform: scale(1.8) rotate(-12deg);
			opacity: 1;
			filter: none;
		}
	}

	/* ---------- Игровая зона ---------- */

	.play {
		min-height: 0;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.speech-row {
		--mascot-size: clamp(70px, 12dvh, 110px);
		flex: none;
		display: flex;
		align-items: center;
		gap: 16px;
		width: 100%;
		max-width: 720px;
		margin: 0 auto;
	}

	.bubble {
		position: relative;
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 10px;
		min-height: clamp(76px, 12dvh, 108px);
		padding: 12px 16px;
		border: 4px solid var(--s-line);
		border-radius: 18px;
		background: #fff8e6;
		color: #1a1130;
		box-shadow: 0 6px 0 var(--s-line);
		transition:
			background 0.15s,
			border-color 0.15s;
	}

	.bubble::before {
		content: '';
		position: absolute;
		left: -14px;
		top: 50%;
		translate: 0 -50%;
		border: 10px solid transparent;
		border-right: 12px solid var(--s-line);
		border-left: 0;
	}

	.bubble.good {
		background: #e3ffe9;
	}

	.bubble.bad {
		background: #ffe3e6;
		border-color: #7c1220;
	}

	.bubble.break {
		background: #e8f4ff;
	}

	.bubble.glitch {
		animation: glitch 0.35s steps(2) 2;
	}

	@keyframes glitch {
		0% {
			clip-path: inset(10% 0 60% 0);
			translate: -6px 0;
			filter: hue-rotate(90deg);
		}
		50% {
			clip-path: inset(50% 0 20% 0);
			translate: 6px 0;
		}
		100% {
			clip-path: none;
			translate: 0;
			filter: none;
		}
	}

	.headline {
		margin: 0;
		font: 400 clamp(16px, 2.4vw + 6px, 26px) / 1.2 var(--s-display);
		overflow-wrap: anywhere;
	}

	.timer {
		height: 12px;
		border-radius: 999px;
		background: rgba(26, 17, 48, 0.15);
		overflow: hidden;
	}

	.timer i {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: repeating-linear-gradient(
				-45deg,
				rgba(255, 255, 255, 0.25) 0 8px,
				transparent 8px 16px
			)
			var(--s-green);
		box-shadow: 0 0 10px var(--s-green);
	}

	.timer i.low {
		background-color: var(--s-red);
		box-shadow: 0 0 10px var(--s-red);
	}

	.pad-area {
		flex: 1;
		min-height: 0;
		container-type: size;
		display: grid;
		place-items: center;
	}

	.pad-box {
		position: relative;
		/* запас под тень и обводку круга */
		width: min(calc(100cqw - 24px), calc(100cqh - 30px), 520px);
	}

	.skip,
	.round {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		border-radius: 50%;
		color: var(--s-text);
		text-align: center;
	}

	.skip {
		border: 0;
		background: transparent;
		font: inherit;
		cursor: pointer;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}

	.skip:not(:disabled):hover,
	.skip:not(:disabled):active {
		background: rgba(255, 255, 255, 0.08);
	}

	.skip:disabled {
		cursor: default;
		opacity: 0.45;
	}

	.skip b,
	.round b {
		font: 400 11cqi / 1 var(--s-display);
		color: var(--s-gold);
		text-transform: uppercase;
	}

	.round b {
		font-size: 30cqi;
	}

	.skip small,
	.round small {
		margin-top: 4cqi;
		font-size: max(10px, 9cqi);
		color: var(--s-muted);
		font-weight: 600;
	}

	.pop {
		position: absolute;
		left: 50%;
		top: 30%;
		translate: -50% 0;
		z-index: 5;
		pointer-events: none;
		font: 400 clamp(22px, 5cqmin, 40px) / 1 var(--s-display);
		color: var(--s-gold);
		text-shadow:
			0 3px 0 var(--s-line),
			0 0 16px rgba(255, 210, 31, 0.6);
		white-space: nowrap;
		animation: pop-rise 1s ease-out forwards;
	}

	.pop.crit {
		color: var(--s-orange);
		scale: 1.25;
	}

	.pop.life {
		top: 45%;
		color: var(--s-red);
	}

	@keyframes pop-rise {
		from {
			opacity: 0;
			transform: translateY(20px) scale(0.7);
		}
		20% {
			opacity: 1;
			transform: translateY(0) scale(1.1);
		}
		to {
			opacity: 0;
			transform: translateY(-60px) scale(1);
		}
	}

	/* ---------- Строка состояния ---------- */

	.statusbar {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
		padding: 6px 12px;
		border-radius: 10px;
		background: rgba(10, 6, 32, 0.75);
		color: var(--s-muted);
		font-size: 13px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.dot {
		width: 8px;
		height: 8px;
		flex: none;
		border-radius: 50%;
		background: var(--s-green);
		box-shadow: 0 0 6px var(--s-green);
	}

	.dot.bad {
		background: var(--s-red);
		box-shadow: 0 0 6px var(--s-red);
	}

	/* ---------- Эффекты ---------- */

	.fx {
		position: absolute;
		inset: 0;
		z-index: 22;
		pointer-events: none;
		overflow: hidden;
		container-type: size;
	}

	.part {
		position: absolute;
		width: 10px;
		height: 10px;
		border-radius: 2px;
		animation: part 0.9s cubic-bezier(0.2, 0.7, 0.4, 1) forwards;
	}

	@keyframes part {
		to {
			transform: translate(var(--dx), var(--dy)) rotate(var(--r));
			opacity: 0;
		}
	}

	.puff {
		position: absolute;
		bottom: 8%;
		width: 18px;
		height: 70px;
		border-radius: 50%;
		background: radial-gradient(ellipse, rgba(255, 255, 255, 0.35), transparent 70%);
		filter: blur(5px);
		animation: puff 2.4s ease-in forwards;
	}

	@keyframes puff {
		from {
			transform: translateY(0) scaleX(1);
			opacity: 0;
		}
		30% {
			opacity: 1;
		}
		to {
			transform: translateY(-260px) scaleX(2.6);
			opacity: 0;
		}
	}

	.crit-fx {
		position: absolute;
		inset: 0;
	}

	.crit-fx .white {
		position: absolute;
		inset: 0;
		background: radial-gradient(circle at 50% 55%, rgba(255, 240, 180, 0.75), transparent 60%);
		animation: fade 0.35s forwards;
	}

	.crit-fx .rays {
		position: absolute;
		left: 50%;
		top: 55%;
		width: 140cqmax;
		aspect-ratio: 1;
		translate: -50% -50%;
		border-radius: 50%;
		background: repeating-conic-gradient(rgba(255, 210, 31, 0.35) 0 8deg, transparent 8deg 22deg);
		mask: radial-gradient(circle, #000 10%, transparent 60%);
		animation: rays 0.9s ease-out forwards;
	}

	.crit-fx .word {
		position: absolute;
		left: 50%;
		top: 40%;
		translate: -50% -50%;
		font: 400 clamp(48px, 10cqmin, 84px) / 1 var(--s-display);
		color: var(--s-orange);
		-webkit-text-stroke: 3px #1a1130;
		text-shadow:
			0 6px 0 #1a1130,
			0 0 30px rgba(255, 123, 31, 0.8);
		animation: crit-word 0.9s cubic-bezier(0.2, 1.6, 0.4, 1) forwards;
	}

	@keyframes fade {
		to {
			opacity: 0;
		}
	}

	@keyframes rays {
		from {
			opacity: 0;
			transform: rotate(0) scale(0.4);
		}
		25% {
			opacity: 1;
		}
		to {
			opacity: 0;
			transform: rotate(40deg) scale(1);
		}
	}

	@keyframes crit-word {
		from {
			scale: 3;
			opacity: 0;
			rotate: -10deg;
		}
		25% {
			scale: 1;
			opacity: 1;
			rotate: -4deg;
		}
		80% {
			opacity: 1;
		}
		to {
			opacity: 0;
			scale: 1.1;
		}
	}

	.levelup {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
	}

	.stripe {
		position: absolute;
		left: -10%;
		right: -10%;
		top: calc(42% - 60px);
		height: 120px;
		opacity: 0.95;
		background: repeating-linear-gradient(-45deg, var(--s-gold) 0 26px, #1a1130 26px 52px);
		transform: skewY(-4deg);
		animation: stripe 1.4s ease-in-out forwards;
	}

	@keyframes stripe {
		from {
			clip-path: inset(0 100% 0 0);
		}
		25%,
		75% {
			clip-path: inset(0 0 0 0);
		}
		to {
			clip-path: inset(0 0 0 100%);
		}
	}

	.level-text {
		position: absolute;
		top: 42%;
		translate: 0 -50%;
		padding: 10px 28px;
		border: 4px solid var(--s-gold);
		border-radius: 14px;
		background: #1a1130;
		color: var(--s-gold);
		font: 400 clamp(30px, 7cqmin, 48px) / 1.1 var(--s-display);
		text-align: center;
		text-transform: uppercase;
		animation: banner 1.4s ease-out forwards;
	}

	.level-text small {
		display: block;
		color: #fff;
		font: 600 14px var(--s-body);
		text-transform: none;
	}

	@keyframes banner {
		from {
			opacity: 0;
			scale: 0.5;
		}
		15% {
			opacity: 1;
			scale: 1.08;
		}
		25%,
		80% {
			opacity: 1;
			scale: 1;
		}
		to {
			opacity: 0;
		}
	}

	.flash {
		position: absolute;
		inset: 0;
		z-index: 21;
		pointer-events: none;
		opacity: 0;
		transition: opacity 0.35s;
		background: radial-gradient(circle, rgba(255, 60, 60, 0.5), rgba(255, 0, 60, 0.2) 70%);
	}

	.flash.on {
		opacity: 1;
		transition: none;
	}

	/* ---------- Оверлеи ---------- */

	.overlay {
		position: absolute;
		inset: 0;
		z-index: 30;
		display: grid;
		place-items: center;
		padding: 16px;
		overflow-y: auto;
		background: rgba(8, 4, 24, 0.78);
		backdrop-filter: blur(4px);
	}

	.btn {
		padding: 12px 22px;
		border: 3px solid var(--s-line);
		border-radius: 14px;
		color: #fff;
		font: 400 17px / 1 var(--s-display);
		cursor: pointer;
		box-shadow: 0 5px 0 var(--s-line);
		transition: filter 0.12s;
	}

	.btn:hover {
		filter: brightness(1.1);
	}

	.btn:active {
		translate: 0 3px;
		box-shadow: 0 2px 0 var(--s-line);
	}

	.btn:focus-visible,
	.icon-btn:focus-visible,
	.home:focus-visible,
	.win-nav button:focus-visible,
	.nav-link:focus-visible {
		outline: 3px solid var(--s-gold);
		outline-offset: 2px;
	}

	.btn.green {
		background: linear-gradient(180deg, #3be37f, #1fa856);
	}

	.btn.blue {
		background: linear-gradient(180deg, #5b9dff, #2f6ad8);
	}

	.btn.ghost {
		background: var(--s-panel);
	}

	.actions {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 18px;
	}

	kbd {
		padding: 1px 6px;
		border-radius: 5px;
		background: rgba(26, 17, 48, 0.12);
		font: 600 12px var(--s-body);
	}

	/* Пауза */
	.card {
		width: min(440px, 100%);
		padding: 22px;
		border: 4px solid var(--s-line);
		border-radius: 22px;
		background: linear-gradient(180deg, #2b2063, #1c1445);
		box-shadow: 0 10px 0 var(--s-line);
		text-align: center;
	}

	.card h2 {
		margin: 0;
		font: 400 clamp(26px, 5vw, 40px) / 1.1 var(--s-display);
		color: var(--s-gold);
		text-shadow: 0 4px 0 #b3361b;
	}

	.sub {
		margin: 6px 0 0;
		color: var(--s-muted);
		font-weight: 600;
	}

	/* Меню: окно «Конфигуратора» */
	.win {
		width: min(780px, 100%);
		overflow: hidden;
		border: 3px solid #1a1130;
		border-radius: 10px;
		background: #f2efe6;
		color: #1a1130;
		box-shadow: 0 14px 0 rgba(0, 0, 0, 0.4);
		animation: win-pop 0.4s cubic-bezier(0.2, 1.4, 0.4, 1);
	}

	@keyframes win-pop {
		from {
			transform: scale(0.85);
			opacity: 0;
		}
	}

	.win-bar {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 12px;
		border-bottom: 3px solid #1a1130;
		background: linear-gradient(180deg, #ffd84a, #f2b400);
		font: 700 14px var(--s-body);
	}

	.win-title {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.win-logo {
		padding: 1px 7px;
		border-radius: 4px;
		background: #e8352b;
		color: #fff;
		font: 400 14px var(--s-display);
	}

	.win-btns {
		display: flex;
		gap: 5px;
		margin-left: auto;
	}

	.win-btns i {
		width: 14px;
		height: 14px;
		border-radius: 3px;
		background: #1a1130;
		opacity: 0.25;
	}

	.win-btns i:last-child {
		background: #e8352b;
		opacity: 1;
	}

	.win-body {
		display: grid;
		grid-template-columns: 180px minmax(0, 1fr);
		min-height: 320px;
	}

	.win-nav {
		display: flex;
		flex-direction: column;
		padding: 10px 0;
		border-right: 2px solid #c9c1aa;
		background: #e2dccb;
		font-size: 14px;
	}

	.win-nav button,
	.nav-dead,
	.nav-link {
		padding: 8px 14px;
		border: 0;
		border-left: 4px solid transparent;
		background: none;
		color: inherit;
		font: inherit;
		text-align: left;
		text-decoration: none;
	}

	.win-nav button,
	.nav-link {
		cursor: pointer;
	}

	.win-nav button:hover,
	.nav-link:hover {
		background: rgba(255, 255, 255, 0.5);
	}

	.win-nav button.on {
		border-left-color: #e8352b;
		background: #fff;
		font-weight: 800;
	}

	.nav-dead {
		color: #9a907a;
	}

	.nav-link {
		margin-top: auto;
	}

	.win-content {
		padding: 18px 20px;
	}

	.win-content h2 {
		margin: 0;
		font: 400 30px var(--s-display);
	}

	.win-content h2 span {
		color: #e8352b;
	}

	.win-content h3 {
		margin: 14px 0 4px;
		font: 400 18px var(--s-display);
	}

	.win-content p,
	.win-content ul {
		margin: 0;
		font-size: 14px;
		line-height: 1.5;
	}

	.win-content ul {
		padding-left: 18px;
	}

	.win-content q {
		color: #e8352b;
		font-weight: 800;
		quotes: '«' '»';
	}

	.docs {
		margin-top: 14px;
		overflow: hidden;
		border: 2px solid #c9c1aa;
		border-radius: 6px;
		font-size: 14px;
	}

	.doc-row {
		display: grid;
		grid-template-columns: 26px minmax(0, 1fr) 90px auto;
		align-items: center;
		gap: 10px;
		padding: 10px;
		border-top: 1px solid #ddd5c0;
		background: #fff;
	}

	.doc-row:hover {
		background: #fff6cf;
	}

	.doc-row.head {
		border-top: 0;
		background: #ece6d6;
		color: #6b6150;
		font-size: 12px;
		font-weight: 800;
		text-transform: uppercase;
	}

	.doc-row small {
		display: block;
		color: #6b6150;
	}

	.doc-row .btn {
		padding: 8px 14px;
		border-width: 2px;
		font-size: 14px;
		box-shadow: 0 3px 0 var(--s-line);
	}

	.win-content .keys {
		margin-top: 14px;
		color: #6b6150;
		font-size: 13px;
		line-height: 1.8;
	}

	/* Конец смены: приказ на бумаге */
	.paper {
		position: relative;
		width: min(460px, 100%);
		padding: 28px 30px 22px;
		border-radius: 4px;
		color: #1a1130;
		background: repeating-linear-gradient(transparent 0 27px, #e9e4d4 27px 28px) #fffdf5;
		box-shadow:
			0 0 0 1px #d9d2bd,
			10px 14px 0 rgba(0, 0, 0, 0.35);
		transform: rotate(-1.5deg);
		animation: paper-in 0.5s cubic-bezier(0.2, 1.2, 0.4, 1);
	}

	@keyframes paper-in {
		from {
			transform: translateY(80px) rotate(6deg);
			opacity: 0;
		}
	}

	.paper-hdr {
		color: #6b6150;
		font: 800 12px var(--s-body);
		letter-spacing: 0.12em;
		text-align: center;
	}

	.paper h2 {
		margin: 6px 0 14px;
		font: 400 26px var(--s-display);
		text-align: center;
	}

	.paper p {
		margin: 0 0 8px;
		font-size: 15px;
		line-height: 1.6;
	}

	.paper-score {
		font: 400 54px / 1.1 var(--s-display);
		color: #e8352b;
	}

	.paper-score small {
		color: #1a1130;
		font-size: 18px;
	}

	.paper .quip {
		color: #6b6150;
	}

	.sign {
		display: flex;
		justify-content: space-between;
		align-items: end;
		margin-top: 12px;
		color: #2f3e9e;
		font:
			700 22px 'Caveat',
			cursive;
	}

	.stamp {
		position: absolute;
		right: 18px;
		top: 40%;
		padding: 6px 14px;
		border: 5px solid #e8352b;
		border-radius: 10px;
		color: #e8352b;
		font: 400 30px var(--s-display);
		opacity: 0.85;
		mix-blend-mode: multiply;
		transform: rotate(-14deg);
		animation: stamp 0.45s 0.5s cubic-bezier(0.2, 1.8, 0.4, 1) both;
	}

	.stamp.good {
		border-color: #1f9d55;
		color: #1f9d55;
	}

	@keyframes stamp {
		from {
			transform: rotate(-14deg) scale(3);
			opacity: 0;
		}
	}

	/* ---------- Адаптив ---------- */

	@media (max-width: 640px) {
		.layer {
			gap: 8px;
			padding-inline: 10px;
		}

		.mode-tag {
			display: none;
		}

		.chip {
			padding: 4px 2px;
		}

		.chip span {
			font-size: 9px;
		}

		.chip b {
			font-size: 17px;
		}

		.hearts svg {
			width: 15px;
			height: 15px;
		}

		.pips i {
			width: 5px;
			height: 5px;
		}

		.win-body {
			grid-template-columns: 1fr;
		}

		.win-nav {
			flex-direction: row;
			flex-wrap: wrap;
			padding: 0;
			border-right: 0;
			border-bottom: 2px solid #c9c1aa;
		}

		.nav-dead {
			display: none;
		}

		.nav-link {
			margin: 0 0 0 auto;
		}

		.win-title {
			font-size: 12px;
		}

		.doc-row {
			grid-template-columns: 22px minmax(0, 1fr) auto;
		}

		.doc-row > :nth-child(3) {
			display: none;
		}

		.paper {
			padding: 22px 18px 18px;
		}

		.stamp {
			top: 30%;
			font-size: 24px;
		}
	}

	/* На тач-экранах подсказки про клавиатуру не нужны. */
	@media (pointer: coarse) {
		.skip small,
		.win-content .keys {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.shake,
		.coffee .layer,
		.pop,
		.levelup *,
		.bubble.glitch,
		.chip b.bump,
		.chip.hot::after,
		.hearts svg.burst,
		.pips i.on,
		.win,
		.paper,
		.stamp {
			animation: none !important;
		}

		.crit-fx,
		.puff,
		.stripe {
			display: none;
		}
	}
</style>
