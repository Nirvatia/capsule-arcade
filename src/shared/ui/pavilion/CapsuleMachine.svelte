<script lang="ts">
	import { tick } from 'svelte';
	import { resolve } from '$app/paths';
	import GameIcon from '$shared/ui/GameIcon.svelte';
	import { isPlayable, type GameConfig } from '$shared/config/games';
	import { menuSound } from './menuSound';

	interface Props {
		games: GameConfig[];
		records: Record<string, number>;
		onToast: (text: string) => void;
	}

	let { games, records, onToast }: Props = $props();

	const ROWS = [1, 2, 3, 4, 5];
	const PER_PAGE = 15;
	const MIN_ROWS = 3;

	let page = $state(1);
	let selected = $state<number | null>(null);
	let hovered = $state<number | null>(null);
	let busy = $state(false);
	let gone = $state<number | null>(null);
	let trayIndex = $state<number | null>(null);
	let trayFull = $state(false);
	let trayOpen = $state(false);

	let dome = $state<HTMLDivElement>();
	let crankIcon = $state<SVGSVGElement>();
	let trayCap = $state<HTMLDivElement>();

	const pages = $derived(Math.max(1, Math.ceil(games.length / PER_PAGE)));
	const rows = $derived.by(() => {
		const start = (page - 1) * PER_PAGE;
		const counts = ROWS.map(() => 0);
		let left = Math.min(PER_PAGE, games.length - start);
		for (let r = ROWS.length - 1; r >= 0 && left > 0; r--) {
			counts[r] = Math.min(ROWS[r], left);
			left -= counts[r];
		}
		const first = counts.findIndex((c) => c > 0);
		const used =
			pages > 1 ? counts : counts.slice(Math.max(0, Math.min(first, ROWS.length - MIN_ROWS)));
		let next = start;
		return used.map((c) => Array.from({ length: c }, () => next++));
	});
	const maxRecord = $derived(Math.max(1, ...games.map((g) => records[g.id] ?? 0)));
	const shown = $derived(hovered ?? selected);
	const shownGame = $derived(shown === null ? null : games[shown]);
	const needle = $derived(
		shownGame ? -110 + ((records[shownGame.id] ?? 0) / maxRecord) * 220 : -110
	);
	const trayGame = $derived(trayIndex === null ? null : games[trayIndex]);

	const pad = (n: number) => String(n).padStart(2, '0');
	const noise = (i: number) => {
		const x = Math.sin(i * 12.9898 + 1) * 43758.5453;
		return x - Math.floor(x);
	};
	const tilt = (i: number) => Math.round((noise(i) - 0.5) * 40);
	const shift = (i: number) => Math.round((noise(i + 40) - 0.5) * 8);
	const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	function tagFor(game: GameConfig): string {
		if (game.status === 'dev') {
			return `Сборка ${game.progress ?? 0}%`;
		}
		return game.status === 'soon' ? 'Скоро' : game.genre;
	}

	function digits(game: GameConfig): string[] {
		const value = isPlayable(game) ? String(records[game.id] ?? 0).padStart(6, '0') : '------';
		return value.split('');
	}

	function select(i: number) {
		if (busy) {
			return;
		}
		selected = i;
		menuSound.tick();
	}

	function hover(i: number | null) {
		if (!busy) {
			hovered = i;
		}
	}

	function turnPage(next: number) {
		page = Math.min(Math.max(next, 1), pages);
		selected = null;
		hovered = null;
	}

	function fly(ball: HTMLElement, from: DOMRect, to: DOMRect, game: GameConfig, index: number) {
		const clone = ball.cloneNode(true) as HTMLElement;
		const r = `rotate(${tilt(index)}deg)`;
		const s = to.width / from.width;
		const dx = to.left + to.width / 2 - (from.left + from.width / 2);
		const dy = to.top + to.height / 2 - (from.top + from.height / 2);
		const at = (x: number, y: number) => `translate(${x}px, ${y}px) scale(${s}) ${r}`;
		clone.classList.add('fly');
		clone.style.cssText = `--p1:${game.light};--p2:${game.deep};--cap:${from.width}px;left:${from.left}px;top:${from.top}px;width:${from.width}px;height:${from.height}px`;
		document.body.append(clone);
		return clone
			.animate(
				[
					{ transform: `translate(0, 0) scale(1) ${r}`, easing: 'cubic-bezier(.5,0,.9,.55)' },
					{ transform: at(dx, dy), offset: 0.78, easing: 'ease-out' },
					{ transform: at(dx, dy - 16), offset: 0.89, easing: 'ease-in' },
					{ transform: at(dx, dy) }
				],
				{ duration: 850, fill: 'forwards' }
			)
			.finished.then(() => clone.remove());
	}

	async function dispense() {
		if (busy || selected === null) {
			return;
		}

		const index = selected;
		const game = games[index];

		if (!isPlayable(game)) {
			menuSound.tick();
			onToast(`Капсула «${game.title}» ещё в пути. Загляните позже.`);
			return;
		}

		busy = true;
		menuSound.crank();
		const reduce = prefersReduced();

		if (!reduce && crankIcon) {
			await crankIcon.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(720deg)' }], {
				duration: 650,
				easing: 'ease-in-out'
			}).finished;
		}

		const ball = dome?.querySelector<HTMLElement>(`[data-i="${index}"] .ball`) ?? null;
		const from = ball?.getBoundingClientRect();
		trayFull = false;
		trayOpen = false;
		trayIndex = index;
		gone = index;
		selected = null;
		hovered = null;
		await tick();

		if (!reduce && ball && from && trayCap) {
			await fly(ball, from, trayCap.getBoundingClientRect(), game, index);
		}

		trayFull = true;
		menuSound.thunk();

		if (!reduce && trayCap) {
			await trayCap.animate(
				[
					{ transform: 'translateY(0)' },
					{ transform: 'translateY(-5px)' },
					{ transform: 'translateY(0)' }
				],
				{ duration: 280, easing: 'ease-out' }
			).finished;
		}

		trayOpen = true;
		menuSound.pop();
		busy = false;
	}
</script>

<div class="unit">
	<section class="machine" aria-label="Автомат с капсулами">
		<i class="tube l"></i><i class="tube r"></i>

		<div class="sign">
			<div class="logo">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
					<ellipse cx="12" cy="12" rx="10" ry="4" />
					<ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
					<ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
					<circle cx="12" cy="12" r="2" fill="currentColor" />
				</svg>
			</div>
			<div>
				<h1>Досуг</h1>
				<small>Автомат капсул · модель ДЦ-5</small>
			</div>
			<div class="lamps"><i></i><i></i><i></i></div>
		</div>

		<div class="dome">
			<div bind:this={dome}>
				{#each rows as row, r (r)}
					<div class="row">
						{#each row as i (i)}
							{@const game = games[i]}
							<button
								class="cap"
								class:sel={selected === i}
								class:gone={gone === i}
								class:soon={!isPlayable(game)}
								style:--p1={game.light}
								style:--p2={game.deep}
								style:--r="{tilt(i)}deg"
								style:--dx="{shift(i)}px"
								data-i={i}
								aria-pressed={selected === i}
								aria-label="Капсула {pad(i + 1)}: {game.title}"
								onpointerenter={() => hover(i)}
								onpointerleave={() => hovered === i && hover(null)}
								onfocus={() => hover(i)}
								onblur={() => hover(null)}
								onclick={() => select(i)}
							>
								<span class="ball">
									<GameIcon name={game.icon} class="ico" />
									<span class="n">{pad(i + 1)}</span>
								</span>
							</button>
						{/each}
					</div>
				{/each}
			</div>
		</div>
		<div class="ring"></div>

		<div class="panel">
			<div class="screen" aria-live="polite">
				{#key shown}<div class="scan"></div>{/key}
				{#if shownGame && shown !== null}
					<div class="p-head">
						<span>Капсула {pad(shown + 1)}</span><span class="tag">{tagFor(shownGame)}</span>
					</div>
					<div class="p-title">
						<GameIcon name={shownGame.icon} class="p-ico" />
						<div class="p-name">{shownGame.title}</div>
					</div>
					<div class="p-desc">{shownGame.description}</div>
					<div class="p-grid">
						<div>
							<small>Сложность</small>
							<div class="pips">
								{#each [1, 2, 3, 4, 5] as x (x)}<i class:on={x <= shownGame.difficulty}></i>{/each}
							</div>
						</div>
						<div><small>Игроков</small><b>{shownGame.players}</b></div>
						<div class="wide">
							<small>Рекорд</small>
							<div class="digits">
								{#each digits(shownGame) as c, k (k)}<i>{c}</i>{/each}
							</div>
						</div>
					</div>
				{:else}
					<div class="idle">
						<b>Выберите капсулу</b>
						<span>В куполе капсул: {games.length}</span>
						<span>Полимер в норме</span>
					</div>
				{/if}
			</div>

			<div class="gauge" aria-hidden="true">
				<svg viewBox="0 0 100 100">
					<circle cx="50" cy="50" r="47" fill="#f7faf8" stroke="#0e4a4f" stroke-width="3" />
					<circle
						cx="50"
						cy="50"
						r="37"
						fill="none"
						stroke="#0e4a4f"
						stroke-width="6"
						stroke-dasharray="1.6 8.4"
						transform="rotate(-90 50 50)"
					/>
					<path d="M71 79A34 34 0 0 0 84 62" fill="none" stroke="#ff3a1d" stroke-width="5" />
					<text x="50" y="72" text-anchor="middle">ПОЛИМЕР</text>
				</svg>
				<div class="needle" style:transform="rotate({needle}deg)">
					<div class="tremble">
						<svg viewBox="0 0 100 100"><path d="M50 50L47 22L50 12L53 22Z" fill="#ff3a1d" /></svg>
					</div>
				</div>
				<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="6" fill="#0e4a4f" /></svg>
			</div>

			<ol class="steps">
				<li>Выбери</li>
				<li>Выдай</li>
				<li>Играй</li>
			</ol>

			<button
				class="go"
				disabled={selected === null}
				aria-label="Выдать капсулу"
				onclick={dispense}
			>
				<svg
					bind:this={crankIcon}
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.6"
					stroke-linecap="round"
				>
					<circle cx="12" cy="12" r="3" />
					<path d="M12 9V3M12 3h4M12 15v6M12 21H8" />
				</svg>
				Выдать
			</button>
			<div class="note">Жать до щелчка!</div>
		</div>

		<div class="tray" class:full={trayFull}>
			<span class="tray-empty">Лоток пуст</span>
			<div
				class="tc"
				class:open={trayOpen}
				bind:this={trayCap}
				style:--p1={trayGame?.light}
				style:--p2={trayGame?.deep}
			>
				{#if trayGame}<span class="toy"><GameIcon name={trayGame.icon} /></span>{/if}
				<i class="t"></i><i class="b"></i>
			</div>
			<div class="tray-info">
				<div class="k">Выдано: капсула {trayIndex === null ? '' : pad(trayIndex + 1)}</div>
				<div class="gn">{trayGame?.title ?? ''}</div>
				<a class="launch" href={resolve(trayGame?.route ?? '/')}>Запустить ▶</a>
			</div>
		</div>
		<div class="feet"><i></i><i></i></div>
	</section>

	{#if pages > 1}
		<nav class="batch" aria-label="Партии">
			<button
				disabled={page === 1}
				aria-label="Предыдущая партия"
				onclick={() => turnPage(page - 1)}>&lsaquo;</button
			>
			Партия {page} из {pages}
			<button
				disabled={page === pages}
				aria-label="Следующая партия"
				onclick={() => turnPage(page + 1)}>&rsaquo;</button
			>
		</nav>
	{/if}
</div>

<style>
	.unit {
		position: relative;
		z-index: 2;
		min-width: 0;
	}

	.machine {
		position: relative;
		padding: 16px 52px 24px;
		border-radius: 48px 48px 20px 20px;
		background: linear-gradient(90deg, #d0dbd7 0, #fff 10%, #eef3f0 50%, #fff 90%, #cbd6d2 100%);
		box-shadow:
			inset 0 3px 0 #fff,
			inset 0 -6px 0 rgba(14, 74, 79, 0.15),
			0 0 0 3px var(--pv-teal),
			0 34px 50px rgba(0, 0, 0, 0.6);
	}

	.machine::after {
		content: '';
		position: absolute;
		left: -5%;
		right: -5%;
		bottom: -44px;
		height: 40px;
		z-index: -2;
		background: radial-gradient(ellipse, rgba(0, 0, 0, 0.7), transparent 70%);
	}

	.feet {
		position: absolute;
		left: 0;
		right: 0;
		bottom: -26px;
		z-index: -1;
		display: flex;
		justify-content: space-between;
		padding: 0 44px;
	}

	.feet i {
		width: 72px;
		height: 28px;
		border-radius: 0 0 10px 10px;
		background: linear-gradient(#b8c9c4, #5f7571);
	}

	.tube {
		position: absolute;
		top: 108px;
		bottom: 170px;
		width: 22px;
		border-radius: 11px;
		overflow: hidden;
		background:
			linear-gradient(
				90deg,
				rgba(255, 255, 255, 0.7),
				rgba(255, 255, 255, 0.08) 38%,
				rgba(0, 0, 0, 0.3)
			),
			linear-gradient(180deg, #ff6a4d, #c4180a);
		box-shadow:
			0 0 0 3px #b6c6c1,
			0 0 0 5px var(--pv-teal),
			0 0 16px rgba(255, 58, 29, 0.55);
	}

	.tube.l {
		left: 15px;
	}

	.tube.r {
		right: 15px;
	}

	.tube::before,
	.tube::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		height: calc(100% + 260px);
		will-change: transform;
	}

	.tube::after {
		background: radial-gradient(circle, rgba(255, 255, 255, 0.8) 0 2px, transparent 3px) 0 0 / 22px
			38px;
		animation: bubbles-a 5s linear infinite;
	}

	.tube::before {
		background: radial-gradient(circle, rgba(255, 255, 255, 0.5) 0 1.5px, transparent 2.5px) 8px
			14px / 22px 52px;
		animation: bubbles-b 5s linear infinite;
	}

	@keyframes bubbles-a {
		to {
			transform: translateY(-190px);
		}
	}

	@keyframes bubbles-b {
		to {
			transform: translateY(-260px);
		}
	}

	.sign {
		display: flex;
		align-items: center;
		gap: 14px;
		margin: 0 0 16px;
		padding: 10px 16px 10px 12px;
		border-radius: 24px;
		background: linear-gradient(180deg, #fff, #f2f8f5 55%, #dcebe5);
		box-shadow:
			inset 0 0 0 3px #b9c8c3,
			inset 0 0 26px rgba(255, 205, 140, 0.65),
			0 0 0 3px var(--pv-teal),
			0 0 30px rgba(255, 200, 140, 0.25);
	}

	.logo {
		flex: none;
		width: 54px;
		height: 54px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		background: radial-gradient(circle at 35% 28%, #ff8a6e, var(--pv-red) 55%, #a81808);
		box-shadow:
			0 0 0 3px #fff,
			0 0 0 5px var(--pv-teal),
			0 0 18px rgba(255, 58, 29, 0.6);
	}

	.logo svg {
		width: 36px;
		height: 36px;
		color: #fff;
	}

	.sign h1 {
		font: 900 clamp(28px, 7.4vw, 46px) / 0.95 var(--f-head);
		letter-spacing: -0.03em;
		color: var(--pv-red);
		text-transform: uppercase;
		text-shadow: 0 0 14px rgba(255, 58, 29, 0.3);
	}

	.sign small {
		display: block;
		margin-top: 4px;
		font: 700 11px var(--f-hud);
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--pv-teal);
	}

	.lamps {
		margin-left: auto;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.lamps i {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--pv-red);
		box-shadow: 0 0 8px 2px rgba(255, 58, 29, 0.8);
	}

	.lamps i:nth-child(2) {
		background: #ffb02e;
		box-shadow: 0 0 8px 2px rgba(255, 176, 46, 0.8);
		animation: blink 3.2s infinite;
	}

	.lamps i:nth-child(3) {
		background: #35e0cf;
		box-shadow: 0 0 8px 2px rgba(53, 224, 207, 0.8);
	}

	@keyframes blink {
		0%,
		88%,
		100% {
			opacity: 1;
		}
		92% {
			opacity: 0.2;
		}
	}

	.dome {
		--cap: min(84px, calc((min(100vw - 40px, 560px) - 104px - 40px) / 5));
		position: relative;
		padding: 46px 18px 16px;
		border-radius: 50% 50% 16px 16px / 44% 44% 16px 16px;
		background:
			radial-gradient(ellipse at 50% 100%, rgba(255, 90, 50, 0.45), rgba(255, 58, 29, 0.06) 62%),
			linear-gradient(180deg, #0d1719, #071012);
		box-shadow:
			inset 0 0 0 5px rgba(255, 255, 255, 0.28),
			inset 0 0 40px rgba(0, 0, 0, 0.85),
			0 0 0 5px #b6c6c1,
			0 0 0 8px var(--pv-teal);
	}

	.dome::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		pointer-events: none;
		background:
			linear-gradient(115deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0) 28%),
			radial-gradient(ellipse at 22% 10%, rgba(255, 255, 255, 0.18), transparent 30%);
	}

	.ring {
		height: 12px;
		margin: 10px -4px 0;
		border-radius: 6px;
		background: linear-gradient(180deg, #fff, #9fb2ac);
		box-shadow: 0 2px 0 var(--pv-teal);
	}

	.row {
		display: flex;
		justify-content: center;
		min-height: calc(var(--cap) * 0.9);
	}

	.row + .row {
		margin-top: calc(var(--cap) * -0.1);
	}

	.row:last-child {
		min-height: var(--cap);
	}

	.cap {
		position: relative;
		z-index: 1;
		width: var(--cap);
		height: var(--cap);
		margin: 0 calc(var(--cap) * -0.02);
		padding: 0;
		border: 0;
		background: none;
		cursor: pointer;
		transform: translateX(var(--dx, 0));
		transition: transform 0.15s;
	}

	.cap:hover,
	.cap.sel {
		z-index: 5;
		transform: translate(var(--dx, 0), -8px) scale(1.08);
	}

	.cap.gone {
		visibility: hidden;
	}

	.cap:focus-visible {
		outline: 3px solid #fff;
		outline-offset: -2px;
		border-radius: 50%;
	}

	.cap.soon .ball {
		filter: saturate(0.3) brightness(0.8);
	}

	.cap::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 50%;
		pointer-events: none;
		background:
			radial-gradient(circle at 30% 22%, rgba(255, 255, 255, 0.85) 0, rgba(255, 255, 255, 0) 18%),
			radial-gradient(circle at 72% 86%, rgba(255, 255, 255, 0.22), transparent 26%);
	}

	.ball {
		position: absolute;
		inset: 0;
		overflow: hidden;
		border-radius: 50%;
		transform: rotate(var(--r, 0deg));
		background:
			radial-gradient(circle at 50% 80%, var(--p1), var(--p2) 75%) top / 100% 50% no-repeat,
			linear-gradient(180deg, #fff, #cbd8d4) bottom / 100% 50% no-repeat;
		box-shadow:
			inset -7px -10px 18px rgba(0, 0, 0, 0.32),
			inset 5px 5px 10px rgba(255, 255, 255, 0.4),
			0 10px 16px rgba(0, 0, 0, 0.55);
	}

	.ball:global(.fly) {
		position: fixed;
		z-index: 60;
		pointer-events: none;
	}

	.ball::before {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		top: 46%;
		height: 8%;
		background: linear-gradient(180deg, #8aa09a, #e9f0ed 45%, #6d837d);
	}

	.ball :global(.ico) {
		position: absolute;
		left: 50%;
		top: 9%;
		width: 38%;
		height: 38%;
		transform: translateX(-50%);
		color: #fff;
		filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.35));
	}

	.n {
		position: absolute;
		left: 0;
		right: 0;
		top: 58%;
		text-align: center;
		font: 700 calc(var(--cap) * 0.18) / 1 var(--f-hud);
		color: var(--p2);
		letter-spacing: 0.02em;
	}

	.cap.sel .ball {
		box-shadow:
			inset -7px -10px 18px rgba(0, 0, 0, 0.32),
			inset 5px 5px 10px rgba(255, 255, 255, 0.4),
			0 0 0 3px #fff,
			0 0 28px 8px var(--p1);
	}

	.panel {
		position: relative;
		margin-top: 18px;
		padding: 14px;
		border-radius: 22px;
		display: grid;
		gap: 14px;
		align-items: center;
		grid-template-columns: 92px 1fr 100px;
		grid-template-areas: 's s s' 'g i b';
		background: linear-gradient(180deg, #dce7e3, #c8d8d3);
		box-shadow:
			inset 0 3px 8px rgba(14, 74, 79, 0.25),
			inset 0 -2px 0 #fff;
	}

	.gauge {
		grid-area: g;
		position: relative;
		width: 100%;
		aspect-ratio: 1;
	}

	.gauge > svg,
	.needle,
	.tremble,
	.tremble svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.gauge text {
		font: 700 9px var(--f-hud);
		letter-spacing: 0.1em;
		fill: var(--pv-teal);
	}

	.needle {
		will-change: transform;
		transition: transform 0.7s cubic-bezier(0.3, 1.7, 0.5, 1);
	}

	.tremble {
		will-change: transform;
		animation: tremble 0.25s infinite alternate;
	}

	@keyframes tremble {
		to {
			transform: rotate(2.2deg);
		}
	}

	.steps {
		grid-area: i;
		counter-reset: s;
		list-style: none;
		margin: 0;
		padding: 8px 6px;
		display: flex;
		justify-content: space-around;
		border-radius: 12px;
		background: var(--pv-enamel);
		box-shadow: inset 0 2px 6px rgba(14, 74, 79, 0.2);
	}

	.steps li {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		font: 700 11px var(--f-hud);
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.steps li::before {
		counter-increment: s;
		content: counter(s);
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: var(--pv-teal);
		color: #fff;
		font-size: 13px;
	}

	.screen {
		grid-area: s;
		position: relative;
		overflow: hidden;
		height: 248px;
		padding: 14px 16px;
		border-radius: 14px;
		background: var(--pv-glass);
		color: #ff6b52;
		box-shadow:
			inset 0 0 22px rgba(255, 58, 29, 0.25),
			inset 0 3px 8px #000;
		text-shadow: 0 0 8px rgba(255, 58, 29, 0.55);
	}

	.screen::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 2;
		pointer-events: none;
		background: repeating-linear-gradient(180deg, rgba(0, 0, 0, 0.25) 0 1px, transparent 1px 3px);
	}

	.scan {
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		height: 35%;
		z-index: 2;
		pointer-events: none;
		transform: translateY(-100%);
		background: linear-gradient(180deg, transparent, rgba(255, 100, 70, 0.3), transparent);
		animation: sweep 0.7s ease-out forwards;
	}

	@keyframes sweep {
		to {
			transform: translateY(300%);
		}
	}

	.p-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
		height: 26px;
		border-bottom: 1px dashed #5a2a24;
		font: 500 11px var(--f-hud);
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: #b4503f;
	}

	.p-head span:first-child {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.p-head span:first-child::before {
		content: '';
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--pv-red);
		box-shadow: 0 0 8px 2px rgba(255, 58, 29, 0.8);
	}

	.tag {
		padding: 1px 10px;
		border: 1px solid #b4503f;
		border-radius: 999px;
	}

	.p-title {
		display: flex;
		align-items: center;
		gap: 10px;
		height: 40px;
		margin-top: 6px;
	}

	.p-title :global(.p-ico) {
		flex: none;
		width: 30px;
		height: 30px;
		color: #ff5a40;
		filter: drop-shadow(0 0 6px rgba(255, 58, 29, 0.6));
	}

	.p-name {
		min-width: 0;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
		font: 700 clamp(20px, 5.2vw, 30px) / 1.1 var(--f-head);
		letter-spacing: -0.02em;
		text-transform: uppercase;
		color: #ff5a40;
	}

	.p-desc {
		height: 2.5em;
		margin: 2px 0 8px;
		overflow: hidden;
		display: -webkit-box;
		line-clamp: 2;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		font-size: 16px;
		line-height: 1.25;
	}

	.p-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px 16px;
	}

	.p-grid small {
		display: block;
		margin-bottom: 4px;
		font: 500 10px var(--f-hud);
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: #b4503f;
	}

	.p-grid b {
		font: 700 20px/1 var(--f-hud);
		color: #ff5a40;
	}

	.pips {
		display: flex;
		gap: 4px;
		padding-top: 4px;
	}

	.pips i {
		width: 20px;
		height: 9px;
		background: #3a1a16;
	}

	.pips i.on {
		background: #ff5a40;
		box-shadow: 0 0 8px rgba(255, 90, 60, 0.9);
	}

	.wide {
		grid-column: 1 / 3;
	}

	.digits {
		display: flex;
		gap: 3px;
	}

	.digits i {
		min-width: 24px;
		padding: 0 3px;
		text-align: center;
		font: normal 700 22px/30px var(--f-hud);
		color: #ff5a40;
		background: #170908;
		border: 1px solid #3a1a16;
		border-radius: 3px;
	}

	.idle {
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 10px;
	}

	.idle b {
		font: 700 24px var(--f-head);
		letter-spacing: -0.01em;
		text-transform: uppercase;
	}

	.idle b::after {
		content: '';
		display: inline-block;
		width: 12px;
		height: 22px;
		margin-left: 8px;
		vertical-align: -3px;
		background: #ff5a40;
		animation: cursor 1s steps(1) infinite;
	}

	.idle span {
		font: 500 13px var(--f-hud);
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #b4503f;
	}

	@keyframes cursor {
		50% {
			opacity: 0;
		}
	}

	.go {
		grid-area: b;
		justify-self: end;
		width: 100px;
		height: 100px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		border: 0;
		border-radius: 50%;
		cursor: pointer;
		color: #fff;
		background: radial-gradient(circle at 35% 28%, #ff9a82, var(--pv-red) 50%, #a81808);
		box-shadow:
			inset 0 2px 0 rgba(255, 255, 255, 0.5),
			0 0 0 5px #fff,
			0 0 0 8px var(--pv-teal),
			0 7px 0 8px #09353a;
		font: 700 12px var(--f-hud);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		transition:
			transform 0.1s,
			box-shadow 0.1s;
	}

	.go svg {
		width: 34px;
		height: 34px;
	}

	.go:hover:not(:disabled) {
		box-shadow:
			inset 0 2px 0 rgba(255, 255, 255, 0.5),
			0 0 0 5px #fff,
			0 0 0 8px var(--pv-teal),
			0 7px 0 8px #09353a,
			0 0 28px 8px rgba(255, 58, 29, 0.7);
	}

	.go:active:not(:disabled) {
		transform: translateY(5px);
		box-shadow:
			inset 0 2px 0 rgba(255, 255, 255, 0.5),
			0 0 0 5px #fff,
			0 0 0 8px var(--pv-teal),
			0 2px 0 8px #09353a;
	}

	.go:disabled {
		filter: grayscale(0.85) brightness(0.85);
		cursor: default;
	}

	.go:focus-visible {
		outline: 3px solid #fff;
		outline-offset: 10px;
	}

	.note {
		position: absolute;
		right: 16px;
		bottom: -24px;
		z-index: 3;
		padding: 6px 14px 8px;
		transform: rotate(-4deg);
		background: #f4e9a6;
		color: #3a3320;
		font: 600 21px/1 var(--f-hand);
		box-shadow: 2px 4px 0 rgba(0, 0, 0, 0.2);
	}

	.note::before {
		content: '';
		position: absolute;
		top: -9px;
		left: 50%;
		width: 46px;
		height: 16px;
		margin-left: -23px;
		transform: rotate(3deg);
		background: rgba(255, 255, 255, 0.55);
	}

	.tray {
		position: relative;
		height: 140px;
		display: grid;
		grid-template-columns: 84px minmax(0, 1fr);
		align-items: center;
		gap: 20px;
		margin: 34px 6px 0;
		padding: 22px 24px 10px;
		overflow: hidden;
		border-radius: 16px 16px 38px 38px / 16px 16px 26px 26px;
		background: #0a1011;
		box-shadow:
			inset 0 8px 18px #000,
			0 0 0 4px #b9c8c3,
			0 0 0 7px var(--pv-teal);
	}

	.tray::before {
		content: 'Выдача';
		position: absolute;
		top: 7px;
		left: 50%;
		transform: translateX(-50%);
		font: 700 10px var(--f-hud);
		letter-spacing: 0.3em;
		text-transform: uppercase;
		color: #3f6b6e;
	}

	.tray-empty {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		color: #6b3a33;
		font: 700 13px var(--f-hud);
		letter-spacing: 0.18em;
		text-transform: uppercase;
	}

	.tray-info {
		min-width: 0;
		visibility: hidden;
	}

	.tray.full .tray-empty {
		visibility: hidden;
	}

	.tray.full .tray-info {
		visibility: visible;
	}

	.tc {
		position: relative;
		width: 84px;
		height: 84px;
		opacity: 0;
	}

	.tray.full .tc {
		opacity: 1;
	}

	.tc::before {
		content: '';
		position: absolute;
		left: 50%;
		top: 50%;
		width: 170px;
		height: 170px;
		margin: -85px;
		border-radius: 50%;
		opacity: 0;
		transition: opacity 0.5s;
		background: radial-gradient(circle, var(--p1), transparent 65%);
	}

	.tc.open::before {
		opacity: 0.6;
	}

	.tc i {
		position: absolute;
		left: 0;
		right: 0;
		z-index: 1;
		transition: transform 0.55s cubic-bezier(0.3, 1.6, 0.5, 1);
	}

	.tc .t {
		top: 0;
		height: 50%;
		z-index: 2;
		border-radius: 84px 84px 0 0;
		background: radial-gradient(circle at 50% 120%, var(--p1), var(--p2) 70%);
		box-shadow: inset 3px 3px 8px rgba(255, 255, 255, 0.4);
	}

	.tc .b {
		bottom: 0;
		height: 50%;
		border-radius: 0 0 84px 84px;
		background: linear-gradient(180deg, #fff, #cbd8d4);
		box-shadow: inset -4px -4px 8px rgba(0, 0, 0, 0.25);
	}

	.tc.open .t {
		transform: translate(-8px, -30px) rotate(-24deg);
	}

	.toy {
		position: absolute;
		left: 50%;
		top: 50%;
		z-index: 1;
		width: 44px;
		height: 44px;
		margin: -36px 0 0 -22px;
		color: #fff;
		opacity: 0;
		transform: scale(0.3);
		transition:
			transform 0.45s 0.15s cubic-bezier(0.3, 1.8, 0.5, 1),
			opacity 0.2s 0.15s;
		filter: drop-shadow(0 0 6px var(--p1));
	}

	.toy :global(svg) {
		display: block;
		width: 100%;
		height: 100%;
	}

	.tc.open .toy {
		opacity: 1;
		transform: none;
	}

	.tray-info .k {
		font: 500 11px var(--f-hud);
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: #b4503f;
	}

	.tray-info .gn {
		min-height: 1.1em;
		margin: 4px 0 10px;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
		font: 700 22px/1.1 var(--f-head);
		text-transform: uppercase;
		color: #ff5a40;
		text-shadow: 0 0 8px rgba(255, 58, 29, 0.6);
	}

	.launch {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		height: 42px;
		padding: 0 22px;
		border-radius: 21px;
		color: #fff;
		text-decoration: none;
		background: var(--pv-redgloss);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.55),
			0 0 0 2px #7a1608,
			0 0 16px rgba(255, 58, 29, 0.6);
		font: 700 15px var(--f-hud);
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.launch:focus-visible {
		outline: 3px solid #fff;
		outline-offset: 3px;
	}

	.batch {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 10px;
		margin-top: 52px;
		color: #cfe4de;
		font: 700 13px var(--f-hud);
		letter-spacing: 0.16em;
		text-transform: uppercase;
	}

	.batch button {
		width: 40px;
		height: 40px;
		border: 0;
		border-radius: 50%;
		cursor: pointer;
		color: var(--pv-teal);
		background: linear-gradient(180deg, #fff, #cfdbd7);
		font: 700 18px var(--f-hud);
		box-shadow: 0 0 0 2px var(--pv-teal);
	}

	.batch button:disabled {
		opacity: 0.35;
		cursor: default;
	}

	@media (max-width: 640px) {
		.machine {
			padding: 12px 10px 20px;
			border-radius: 34px 34px 16px 16px;
		}

		.tube {
			display: none;
		}

		.sign {
			padding: 8px 12px 8px 8px;
			gap: 10px;
		}

		.logo {
			width: 44px;
			height: 44px;
		}

		.logo svg {
			width: 30px;
			height: 30px;
		}

		.dome {
			--cap: calc((100vw - 20px - 20px - 20px - 14px) / 5);
			padding: 38px 10px 14px;
		}

		.panel {
			grid-template-columns: 78px 1fr 88px;
			padding: 12px;
			gap: 10px;
		}

		.screen {
			height: 240px;
			padding: 12px 14px;
		}

		.p-desc {
			font-size: 15px;
		}

		.steps li {
			font-size: 9px;
			letter-spacing: 0.06em;
		}

		.steps li::before {
			width: 20px;
			height: 20px;
			font-size: 11px;
		}

		.go {
			width: 86px;
			height: 86px;
		}

		.go svg {
			width: 28px;
			height: 28px;
		}

		.note {
			right: 8px;
			bottom: -26px;
			font-size: 19px;
		}

		.tray {
			margin: 36px 2px 0;
			height: 128px;
			grid-template-columns: 64px minmax(0, 1fr);
			gap: 16px;
			padding: 22px 16px 8px;
		}

		.tc {
			width: 64px;
			height: 64px;
		}

		.toy {
			width: 34px;
			height: 34px;
			margin: -28px 0 0 -17px;
		}

		.tray-info .gn {
			font-size: 19px;
			margin-bottom: 8px;
		}

		.launch {
			height: 38px;
			padding: 0 18px;
			font-size: 14px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.tube::before,
		.tube::after,
		.tremble,
		.idle b::after,
		.lamps i {
			animation: none;
		}

		.scan {
			display: none;
		}

		.needle,
		.cap,
		.tc i,
		.toy {
			transition: none;
		}
	}
</style>
