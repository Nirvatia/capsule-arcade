<script lang="ts">
	const SLOGANS = [
		'СЛАВА ТРУДУ',
		'ПЯТИЛЕТКУ — В ЧЕТЫРЕ ГОДА',
		'ДОГНАТЬ И ПЕРЕГНАТЬ',
		'НЕ ЗЕВАЙ — УКЛАДЫВАЙ',
		'КАЖДЫЙ РЯД — ШАГ К КОММУНИЗМУ',
		'ТЕТРИС — ГИМНАСТИКА УМА',
		'БЕЗ ПЕРЕКУРОВ И БРАКА',
		'ВСЁ ДЛЯ ЧЕЛОВЕКА, ВСЁ ВО ИМЯ ЧЕЛОВЕКА'
	];

	let index = $state(0);
</script>

<footer class="board" aria-hidden="true">
	<span class="board__star">★</span>
	<span class="board__window">
		<span class="board__text" onanimationiteration={() => (index = (index + 1) % SLOGANS.length)}>
			{SLOGANS[index]}
		</span>
	</span>
	<span class="board__star">★</span>
</footer>

<style>
	.board {
		position: relative;
		z-index: 5;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 22px;
		padding: 0 20px;
		height: 42px;
		color: var(--t-paper);
		background: var(--t-ink);
		border-top: 5px double var(--t-gold);
	}

	.board__star {
		color: var(--t-gold);
	}

	.board__window {
		position: relative;
		display: block;
		height: 100%;
		min-width: min(560px, 70vw);
		overflow: hidden;
		text-align: center;
	}

	.board__text {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		font-family: var(--t-font-display);
		font-size: 14px;
		letter-spacing: 0.16em;
		white-space: nowrap;
		animation: slogan 5s cubic-bezier(0.6, 0, 0.4, 1) infinite;
	}

	@keyframes slogan {
		0% {
			opacity: 0;
			transform: translateY(100%);
		}
		7%,
		93% {
			opacity: 1;
			transform: translateY(0);
		}
		100% {
			opacity: 0;
			transform: translateY(-100%);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.board__text {
			animation-name: slogan-fade;
		}

		@keyframes slogan-fade {
			0%,
			100% {
				opacity: 0;
			}
			7%,
			93% {
				opacity: 1;
			}
		}
	}
</style>
