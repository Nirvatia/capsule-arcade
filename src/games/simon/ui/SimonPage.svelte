<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { getSavedScore, saveScore } from '$shared/utils/scoreStore';
	import { SimonAudio } from '../audio';
	import { ORDERS_PER_LEVEL, MAX_LIVES } from '../logic/orders';
	import type { Mode, Pad } from '../logic/types';
	import { SimonGame, type Fx } from '../SimonGame.svelte';
	import SimonMascot from './SimonMascot.svelte';
	import SimonPads from './SimonPads.svelte';

	interface Pop {
		id: number;
		text: string;
		tone: 'good' | 'crit' | 'bad' | 'life';
	}

	const SCORE_KEYS: Record<Mode, string> = { classic: 'simon', orders: 'simon_orders' };

	const game = new SimonGame({
		load: (mode) => Number.parseInt(getSavedScore(SCORE_KEYS[mode], 0), 10) || 0,
		save: (mode, score) => void saveScore(SCORE_KEYS[mode], score)
	});
	const audio = new SimonAudio();

	let muted = $state(audio.muted);
	let shake = $state(false);
	let flash = $state(false);
	let pops = $state<Pop[]>([]);
	let banner = $state<string | null>(null);
	let lostHeart = $state(-1);
	let bests = $state<Record<Mode, number>>({ classic: 0, orders: 0 });

	let timers: ReturnType<typeof setTimeout>[] = [];
	let popId = 0;

	function later(fn: () => void, ms: number): void {
		const id = setTimeout(() => {
			timers = timers.filter((t) => t !== id);
			fn();
		}, ms);
		timers.push(id);
	}

	function pop(text: string, tone: Pop['tone']): void {
		const id = ++popId;
		pops = [...pops, { id, text, tone }];
		later(() => (pops = pops.filter((p) => p.id !== id)), 1000);
	}

	function handleFx(fx: Fx): void {
		audio.play(fx);

		switch (fx.type) {
			case 'success':
				if (game.mode === 'orders') {
					pop(`+${fx.points}`, fx.crit ? 'crit' : 'good');
					if (fx.lottery === 'life') pop('+1 ❤', 'life');
				}
				break;
			case 'fail':
				lostHeart = game.mode === 'orders' ? game.lives : -1;
				shake = flash = true;
				later(() => (flash = false), 160);
				later(() => (shake = false), 420);
				later(() => (lostHeart = -1), 600);
				break;
			case 'levelUp':
				banner = `Уровень ${fx.level}`;
				later(() => (banner = null), 1300);
				break;
			case 'gameOver':
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
				: game.order?.kind === 'break' && game.phase === 'order'
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
		href="https://fonts.googleapis.com/css2?family=Russo+One&family=Rubik:wght@400;600;800&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<svelte:window onkeydown={onKeydown} onblur={() => game.pause()} />
<svelte:document onvisibilitychange={onVisibility} />

<div class="simon-root" class:shake>
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
				<b>{game.score}</b>
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
				<b class="hearts">
					{#each { length: MAX_LIVES }, i (i)}
						<span class:lost={i >= game.lives} class:burst={i === lostHeart}>❤</span>
					{/each}
				</b>
			</div>
		{:else}
			<div class="chip">
				<span>Раунд</span>
				<b>{game.round}</b>
			</div>
		{/if}
		<div class="chip">
			<span>Рекорд</span>
			<b>{game.best}</b>
		</div>
	</section>

	<main class="play">
		<div class="speech-row">
			<SimonMascot mood={game.mood} />
			<div class="bubble {bubbleTone}" aria-live="polite">
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
					locked={!game.acceptsPads}
					dimmed={game.order?.kind === 'break' && game.phase === 'order'}
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
		<span
			class="dot"
			class:bad={game.phase === 'fail' || game.phase === 'gameover'}
			aria-hidden="true"
		></span>
		{game.status}
	</footer>

	<div class="flash" class:on={flash} aria-hidden="true"></div>

	{#if banner}
		<div class="banner" aria-hidden="true">{banner}</div>
	{/if}

	{#if game.phase === 'menu'}
		<div class="overlay">
			<div class="card menu">
				<h2>1С: ПОГРОМИСТ</h2>
				<p class="sub">Симон говорит — а 1С приказывает</p>

				<div class="modes">
					<article class="mode" class:selected={game.mode === 'classic'}>
						<h3>🧠 Классика</h3>
						<p>
							Настоящий Simon: 1С показывает последовательность, ты повторяешь. Каждый раунд — на
							шаг длиннее и быстрее. Одна ошибка — конец смены.
						</p>
						<div class="mode-foot">
							<span>Рекорд: <b>{bests.classic}</b></span>
							<button type="button" class="btn blue" onclick={() => start('classic')}>Играть</button
							>
						</div>
					</article>

					<article class="mode" class:selected={game.mode === 'orders'}>
						<h3>📢 Приказы 1С</h3>
						<ul>
							<li>Жми, только если приказ начинается с <q>1С говорит:</q></li>
							<li>Главбух, директор, «1С говорила» — не начальство: жми <b>Пропуск</b> или жди</li>
							<li>☕ Перекур — ничего не трогай до конца таймера</li>
							<li>Подсветка кнопок иногда врёт. «Ещё…» — лотерея</li>
						</ul>
						<div class="mode-foot">
							<span>Рекорд: <b>{bests.orders}</b></span>
							<button type="button" class="btn green" onclick={() => start('orders')}>Играть</button
							>
						</div>
					</article>
				</div>

				<p class="keys">
					<kbd>1</kbd>–<kbd>4</kbd> кнопки · <kbd>Пробел</kbd> пропуск · <kbd>Esc</kbd> пауза ·
					<kbd>M</kbd> звук · <kbd>Enter</kbd> старт
				</p>
			</div>
		</div>
	{:else if game.phase === 'gameover'}
		<div class="overlay">
			<div class="card">
				<h2 class="bad-title">База упала 💥</h2>
				{#if game.newRecord}
					<p class="record">★ Новый рекорд! ★</p>
				{/if}
				<div class="final">{game.score}</div>
				<p class="sub">{isOrders ? 'очков' : 'раундов пройдено'}</p>

				<div class="stats">
					{#if isOrders}
						<div><span>Уровень</span><b>{game.level}</b></div>
						<div><span>Лучшее комбо</span><b>×{game.bestCombo}</b></div>
					{/if}
					<div><span>Рекорд</span><b>{game.best}</b></div>
				</div>

				<p class="rank">{rank.name}</p>
				<p class="quip">{rank.quip}</p>

				<div class="actions">
					<button type="button" class="btn green" onclick={() => start(game.mode)}>↻ Ещё раз</button
					>
					<button type="button" class="btn ghost" onclick={() => game.toMenu()}>Меню</button>
				</div>
			</div>
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
		--s-blue: #3f8cff;
		--s-display: 'Russo One', 'Arial Black', sans-serif;
		--s-body: 'Rubik', system-ui, sans-serif;

		position: fixed;
		inset: 0;
		z-index: 10;
		display: grid;
		grid-template-rows: auto auto minmax(0, 1fr) auto;
		gap: 10px;
		padding: max(10px, env(safe-area-inset-top)) 16px max(10px, env(safe-area-inset-bottom));
		overflow: hidden;
		color: var(--s-text);
		font-family: var(--s-body);
		user-select: none;
		background:
			radial-gradient(ellipse at 50% 0%, rgba(255, 210, 31, 0.1), transparent 60%),
			linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px) 0 0 / 32px 32px,
			linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px) 0 0 / 32px 32px,
			var(--s-bg);
	}

	.top,
	.hud,
	.play,
	.statusbar {
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
		flex: 1 1 0;
		max-width: 150px;
		min-width: 0;
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
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		white-space: nowrap;
	}

	.chip b {
		font: 400 20px / 1.1 var(--s-display);
		color: var(--s-gold);
		white-space: nowrap;
	}

	.chip.hot {
		border-color: #ff7b1f;
		box-shadow:
			0 4px 0 var(--s-line),
			0 0 18px rgba(255, 123, 31, 0.45);
	}

	.pips {
		display: flex;
		gap: 3px;
		padding: 5px 0 4px;
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
	}

	.hearts span {
		display: inline-block;
		color: var(--s-red);
		transition: opacity 0.2s;
	}

	.hearts span.lost {
		opacity: 0.18;
		filter: grayscale(1);
	}

	.hearts span.burst {
		animation: heart-burst 0.6s;
	}

	@keyframes heart-burst {
		40% {
			scale: 1.8;
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
		--mascot-size: clamp(64px, 11dvh, 110px);
		flex: none;
		display: flex;
		align-items: center;
		gap: 14px;
		max-width: 720px;
		width: 100%;
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

	.headline {
		margin: 0;
		font: 400 clamp(16px, 2.4vw + 6px, 26px) / 1.2 var(--s-display);
		overflow-wrap: anywhere;
	}

	.timer {
		height: 10px;
		border-radius: 999px;
		background: rgba(26, 17, 48, 0.15);
		overflow: hidden;
	}

	.timer i {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: var(--s-green);
	}

	.timer i.low {
		background: var(--s-red);
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
		font: 400 13cqi / 1 var(--s-display);
		color: var(--s-gold);
	}

	.skip b {
		font-size: 11cqi;
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
		color: #ff7b1f;
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
		background: rgba(0, 0, 0, 0.3);
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

	.flash {
		position: absolute;
		inset: 0;
		z-index: 20;
		pointer-events: none;
		opacity: 0;
		transition: opacity 0.35s;
		background: radial-gradient(circle, rgba(255, 60, 60, 0.35), rgba(255, 0, 60, 0.12) 70%);
	}

	.flash.on {
		opacity: 1;
		transition: none;
	}

	.banner {
		position: absolute;
		left: 50%;
		top: 40%;
		z-index: 25;
		translate: -50% -50%;
		padding: 14px 30px;
		border: 4px solid var(--s-line);
		border-radius: 16px;
		background: var(--s-gold);
		color: #1a1130;
		font: 400 clamp(26px, 6vw, 48px) / 1 var(--s-display);
		box-shadow: 0 8px 0 var(--s-line);
		pointer-events: none;
		animation: banner 1.3s ease-out forwards;
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
			scale: 1;
			opacity: 1;
		}
		to {
			opacity: 0;
		}
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

	.card {
		width: min(440px, 100%);
		padding: 22px;
		border: 4px solid var(--s-line);
		border-radius: 22px;
		background: linear-gradient(180deg, #2b2063, #1c1445);
		box-shadow: 0 10px 0 var(--s-line);
		text-align: center;
	}

	.card.menu {
		width: min(760px, 100%);
	}

	.card h2 {
		margin: 0;
		font: 400 clamp(26px, 5vw, 40px) / 1.1 var(--s-display);
		color: var(--s-gold);
		text-shadow: 0 4px 0 #b3361b;
	}

	.card h2.bad-title {
		color: var(--s-red);
		text-shadow: 0 4px 0 var(--s-line);
	}

	.sub {
		margin: 6px 0 0;
		color: var(--s-muted);
		font-weight: 600;
	}

	.modes {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 14px;
		margin-top: 18px;
		text-align: left;
	}

	.mode {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 16px;
		border: 3px solid var(--s-line);
		border-radius: 16px;
		background: rgba(0, 0, 0, 0.22);
	}

	.mode.selected {
		border-color: rgba(255, 210, 31, 0.5);
	}

	.mode h3 {
		margin: 0;
		font: 400 20px / 1.2 var(--s-display);
	}

	.mode p,
	.mode ul {
		margin: 0;
		font-size: 14px;
		line-height: 1.45;
		color: #ddd6ff;
	}

	.mode ul {
		padding-left: 18px;
	}

	.mode li + li {
		margin-top: 4px;
	}

	.mode q {
		color: var(--s-gold);
		font-weight: 800;
		quotes: '«' '»';
	}

	.mode-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		margin-top: auto;
		padding-top: 6px;
		color: var(--s-muted);
		font-size: 14px;
	}

	.mode-foot b {
		color: var(--s-gold);
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
	.home:focus-visible {
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

	.keys {
		margin: 16px 0 0;
		color: var(--s-muted);
		font-size: 13px;
		line-height: 1.8;
	}

	kbd {
		padding: 1px 6px;
		border-radius: 5px;
		background: rgba(255, 255, 255, 0.12);
		color: #fff;
		font: 600 12px var(--s-body);
	}

	.record {
		margin: 8px 0 0;
		color: var(--s-gold);
		font: 400 18px var(--s-display);
		animation: blink 0.8s steps(2) infinite;
	}

	@keyframes blink {
		50% {
			opacity: 0.35;
		}
	}

	.final {
		margin-top: 8px;
		font: 400 clamp(48px, 12vw, 72px) / 1 var(--s-display);
		color: var(--s-gold);
		text-shadow: 0 5px 0 var(--s-line);
	}

	.stats {
		display: flex;
		justify-content: center;
		gap: 10px;
		margin-top: 16px;
	}

	.stats div {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 8px;
		border-radius: 12px;
		background: rgba(0, 0, 0, 0.25);
	}

	.stats span {
		color: var(--s-muted);
		font-size: 12px;
	}

	.stats b {
		font: 400 20px var(--s-display);
	}

	.rank {
		margin: 16px 0 0;
		font: 400 22px var(--s-display);
		color: var(--s-gold);
	}

	.quip {
		margin: 4px 0 0;
		color: var(--s-muted);
		font-style: italic;
	}

	.actions {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 20px;
	}

	/* ---------- Адаптив ---------- */

	@media (max-width: 640px) {
		.simon-root {
			gap: 8px;
		}

		.mode-tag {
			display: none;
		}

		.chip {
			padding: 4px 4px;
		}

		.chip span {
			font-size: 9px;
		}

		.chip b {
			font-size: 16px;
		}

		.pips i {
			width: 6px;
			height: 6px;
		}

		.modes {
			grid-template-columns: 1fr;
		}

		.card {
			padding: 18px 14px;
		}
	}

	/* На тач-экранах подсказки про клавиатуру не нужны. */
	@media (pointer: coarse) {
		.skip small,
		.keys {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.shake,
		.pop,
		.banner,
		.record,
		.hearts span.burst {
			animation: none;
		}
	}
</style>
