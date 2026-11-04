<!-- Фон страницы — тихая стена зала: тёмный камень, отсвет арены, виньетка.
     Поле вместе с карнизом обрамлено каменной рамкой — ниша в стене, а не наклейка.
     Кнопка «Зал игр» стоит на рамке над карнизом (или в углу арены, если сверху нет места)
     и видна только на экранах меню: во время охоты её легко задеть свайпом. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { COLS } from '../config';
	import { lang, tr } from '../i18n';
	import { screenStore } from './stores';

	let canvas = $state<HTMLCanvasElement | undefined>(undefined);
	let exitPos = $state<{ x: number; y: number; scale: number } | null>(null);
	const l = $derived($lang);
	const showExit = $derived($screenStore.screen !== null && exitPos !== null);

	interface Frame {
		left: number;
		top: number;
		right: number;
		bottom: number;
		bandBottom: number;
		arenaLeft: number;
		scale: number;
	}

	function measure(): Frame | null {
		const els = Array.from(document.querySelectorAll<HTMLElement>('[data-snake-frame]'));
		let left = Infinity;
		let top = Infinity;
		let right = -Infinity;
		let bottom = -Infinity;
		let bandBottom = -Infinity;
		let arenaLeft = Infinity;
		let width = 0;
		for (const el of els) {
			const r = el.getBoundingClientRect();
			if (r.width < 2) continue;
			left = Math.min(left, r.left);
			top = Math.min(top, r.top);
			right = Math.max(right, r.right);
			bottom = Math.max(bottom, r.bottom);
			if (el.tagName === 'CANVAS') {
				arenaLeft = r.left;
				width = r.width;
			} else {
				bandBottom = r.bottom;
			}
		}
		if (!Number.isFinite(left) || width === 0) return null;
		if (!Number.isFinite(bandBottom)) bandBottom = top;
		return { left, top, right, bottom, bandBottom, arenaLeft, scale: width / (COLS * 40) };
	}

	function paint(): void {
		if (!canvas) return;
		const W = window.innerWidth;
		const H = window.innerHeight;
		const dpr = Math.min(1.5, window.devicePixelRatio || 1);
		canvas.width = Math.round(W * dpr);
		canvas.height = Math.round(H * dpr);
		const b = canvas.getContext('2d');
		if (!b) return;
		b.setTransform(dpr, 0, 0, dpr, 0, 0);

		// Холодная почти чёрная стена в тон базальту, без пятен и тёплых оттенков.
		const base = b.createLinearGradient(0, 0, 0, H);
		base.addColorStop(0, '#121616');
		base.addColorStop(1, '#0a0c0c');
		b.fillStyle = base;
		b.fillRect(0, 0, W, H);

		const f = measure();
		if (f) {
			const s = f.scale;
			const fw = Math.max(8, 16 * s);
			const x0 = f.left - fw;
			const y0 = f.top - fw;
			const w = f.right - f.left + fw * 2;
			const h = f.bottom - f.top + fw * 2;

			// Глубокая тень: ниша в стене.
			b.save();
			b.shadowColor = 'rgba(0,0,0,0.9)';
			b.shadowBlur = 22 * s;
			b.shadowOffsetY = 8 * s;
			b.fillStyle = '#1d2221';
			b.fillRect(x0, y0, w, h);
			b.restore();

			// Каменная рамка с фаской и резной канавкой.
			const g = b.createLinearGradient(0, y0, 0, y0 + h);
			g.addColorStop(0, '#5b6562');
			g.addColorStop(0.5, '#3e4745');
			g.addColorStop(1, '#2a3130');
			b.fillStyle = g;
			b.fillRect(x0, y0, w, h);
			b.fillStyle = 'rgba(240,248,245,0.22)';
			b.fillRect(x0, y0, w, 1.5);
			b.fillStyle = 'rgba(0,0,0,0.5)';
			b.fillRect(x0, y0 + h - 2, w, 2);
			const gi = fw * 0.45;
			b.strokeStyle = 'rgba(8,11,11,0.6)';
			b.lineWidth = Math.max(1, 1.5 * s);
			b.strokeRect(x0 + gi, y0 + gi, w - gi * 2, h - gi * 2);
			b.strokeStyle = 'rgba(230,240,235,0.1)';
			b.lineWidth = 1;
			b.strokeRect(x0 + gi + 1, y0 + gi + 1, w - gi * 2, h - gi * 2);
			b.fillStyle = 'rgba(0,0,0,0.7)';
			b.fillRect(f.left - 2, f.top - 2, f.right - f.left + 4, 2);
			b.fillRect(f.left - 2, f.top, 2, f.bottom - f.top);

			const scale = Math.max(0.8, s);
			const btnH = 34 * scale;
			exitPos =
				y0 - btnH - 12 >= 4
					? { x: x0, y: y0 - btnH - 12, scale }
					: { x: f.arenaLeft + 10 * s, y: f.bandBottom + 10 * s, scale: Math.max(0.75, s) };
		} else {
			exitPos = null;
		}

		const vig = b.createRadialGradient(
			W / 2,
			H / 2,
			Math.min(W, H) * 0.35,
			W / 2,
			H / 2,
			Math.hypot(W, H) * 0.6
		);
		vig.addColorStop(0, 'rgba(0,0,0,0)');
		vig.addColorStop(1, 'rgba(0,0,0,0.55)');
		b.fillStyle = vig;
		b.fillRect(0, 0, W, H);

		// Зерно ±2 уровня: убирает ступеньки градиента на тёмных тонах.
		const img = b.getImageData(0, 0, canvas.width, canvas.height);
		const d = img.data;
		for (let i = 0; i < d.length; i += 4) {
			const n = (Math.random() - 0.5) * 4;
			d[i] += n;
			d[i + 1] += n;
			d[i + 2] += n;
		}
		b.putImageData(img, 0, 0);
	}

	// Смена экрана может сдвинуть раскладку GameStage — перемеряем рамку.
	$effect(() => {
		void $screenStore.screen;
		const id = window.setTimeout(paint, 60);
		return () => clearTimeout(id);
	});

	onMount(() => {
		// GameStage подбирает масштаб асинхронно — несколько замеров после монтирования.
		const timers = [0, 150, 400, 1000, 2000].map((ms) => window.setTimeout(paint, ms));
		let resizeTimer = 0;
		const onResize = (): void => {
			clearTimeout(resizeTimer);
			resizeTimer = window.setTimeout(paint, 180);
		};
		window.addEventListener('resize', onResize);
		window.addEventListener('orientationchange', onResize);
		return () => {
			timers.forEach(clearTimeout);
			clearTimeout(resizeTimer);
			window.removeEventListener('resize', onResize);
			window.removeEventListener('orientationchange', onResize);
		};
	});
</script>

<canvas bind:this={canvas} class="backdrop" aria-hidden="true"></canvas>

{#if showExit && exitPos}
	<a
		class="exit"
		href={resolve('/')}
		style:left="{exitPos.x}px"
		style:top="{exitPos.y}px"
		style:font-size="{15 * exitPos.scale}px"
	>
		<span class="arrow" aria-hidden="true"></span>
		{tr('hall', l)}
	</a>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
		z-index: 0;
		pointer-events: none;
	}
	.exit {
		position: fixed;
		z-index: 40;
		display: flex;
		align-items: center;
		gap: 0.65em;
		padding: 0.55em 1.05em 0.55em 0.9em;
		background: radial-gradient(120% 120% at 50% 0%, #5b6562, #3e4745 60%, #2c3331);
		box-shadow:
			inset 0 2px 0 rgba(235, 245, 240, 0.16),
			inset 0 -3px 0 rgba(0, 0, 0, 0.35),
			0 3px 8px rgba(0, 0, 0, 0.5);
		font-family: 'Alegreya Sans SC', 'Alegreya Sans', system-ui, sans-serif;
		font-weight: 700;
		letter-spacing: 0.12em;
		color: #ece6d6;
		text-decoration: none;
		text-shadow: 0 1px 0 rgba(0, 0, 0, 0.7);
		touch-action: manipulation;
	}
	.exit:hover,
	.exit:focus-visible {
		color: #f0c766;
		outline: none;
	}
	.exit:focus-visible {
		box-shadow:
			inset 0 0 0 2px #3fd1bd,
			0 3px 8px rgba(0, 0, 0, 0.5);
	}
	.arrow {
		width: 0.65em;
		height: 0.8em;
		background: #3fd1bd;
		clip-path: polygon(100% 0, 0 50%, 100% 100%);
	}
</style>
