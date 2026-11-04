<!-- Фон страницы — зал храма: базальтовая кладка, пояса рун, тёплый отсвет арены.
     Табличка «Зал игр» видна только на экранах меню: во время охоты её легко задеть свайпом. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { lang, tr } from '../i18n';
	import { carveRune } from '../view/arena';
	import { circle, hs } from '../view/paint';
	import { screenStore } from './stores';

	let canvas = $state<HTMLCanvasElement | undefined>(undefined);
	const l = $derived($lang);
	const showExit = $derived($screenStore.screen !== null);

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
		b.fillStyle = '#0c0f0f';
		b.fillRect(0, 0, W, H);

		const course = Math.max(48, Math.min(72, H / 12));
		const rows = Math.ceil(H / course) + 1;
		for (let r = 0; r < rows; r++) {
			const y = r * course;
			const frieze = r % 5 === 2;
			let x = -((r * 53) % 97);
			let i = 0;
			while (x < W) {
				const k = r * 131 + i * 17;
				const w = frieze ? W + 200 : course * (1.6 + hs(k) * 1.4);
				const L = Math.round((frieze ? 30 : 24) + hs(k * 3) * 8);
				const g = b.createLinearGradient(0, y, 0, y + course);
				g.addColorStop(0, `rgb(${L + 4},${L + 10},${L + 9})`);
				g.addColorStop(1, `rgb(${L - 6},${L - 1},${L - 2})`);
				b.fillStyle = g;
				b.fillRect(x, y, w, course);
				b.fillStyle = 'rgba(0,0,0,0.6)';
				b.fillRect(x, y, 1.5, course);
				b.fillRect(x, y + course - 1.5, w, 1.5);
				b.fillStyle = 'rgba(220,235,230,0.06)';
				b.fillRect(x + 1.5, y, w - 1.5, 1);
				for (let s = 0; s < 10; s++) {
					b.fillStyle = `rgba(${s % 2 ? '0,0,0' : '190,210,205'},${0.04 + hs(k + s) * 0.05})`;
					circle(b, x + hs(k + s * 3) * w, y + hs(k + s * 7) * course, 0.6 + hs(k + s) * 1.2);
				}
				if (!frieze && hs(k * 5) > 0.75) {
					b.fillStyle = 'rgba(63,209,189,0.045)';
					b.beginPath();
					b.ellipse(
						x + w * hs(k * 7),
						y + course * 0.7,
						w * 0.35,
						course * 0.25,
						0,
						0,
						Math.PI * 2
					);
					b.fill();
				}
				if (frieze) {
					const gh = course * 0.42;
					const gw = gh * 0.55;
					for (let j = 0, rx = 12; rx < W - gw; j++, rx += gw * 1.7) {
						if (hs(j * 3.3 + r) > 0.87) {
							b.fillStyle = 'rgba(9,12,12,0.7)';
							circle(b, rx + gw * 0.5, y + course * 0.5, gw * 0.14);
							continue;
						}
						carveRune(b, Math.floor(hs(j * 7.1 + r) * 12), rx, y + course * 0.29, gw, gh, 0.9);
					}
				}
				x += w;
				i++;
			}
		}

		// Тёплый отсвет от арены и глубокая виньетка по краям зала.
		const glow = b.createRadialGradient(W / 2, H * 0.55, 0, W / 2, H * 0.55, Math.max(W, H) * 0.55);
		glow.addColorStop(0, 'rgba(255,140,60,0.10)');
		glow.addColorStop(1, 'rgba(255,140,60,0)');
		b.fillStyle = glow;
		b.fillRect(0, 0, W, H);
		const vig = b.createRadialGradient(
			W / 2,
			H / 2,
			Math.min(W, H) * 0.3,
			W / 2,
			H / 2,
			Math.hypot(W, H) * 0.6
		);
		vig.addColorStop(0, 'rgba(0,0,0,0.15)');
		vig.addColorStop(1, 'rgba(0,0,0,0.85)');
		b.fillStyle = vig;
		b.fillRect(0, 0, W, H);
	}

	onMount(() => {
		paint();
		let timer = 0;
		const onResize = (): void => {
			clearTimeout(timer);
			timer = window.setTimeout(paint, 120);
		};
		window.addEventListener('resize', onResize);
		return () => {
			clearTimeout(timer);
			window.removeEventListener('resize', onResize);
		};
	});
</script>

<canvas bind:this={canvas} class="backdrop" aria-hidden="true"></canvas>

{#if showExit}
	<a class="exit" href={resolve('/')}>
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
		--cut: 8px;
		position: fixed;
		top: calc(12px + env(safe-area-inset-top, 0px));
		left: calc(12px + env(safe-area-inset-left, 0px));
		z-index: 40;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 9px 16px 9px 14px;
		background: radial-gradient(120% 120% at 50% 0%, #56605d, #3a4240 60%, #2b3231);
		clip-path: polygon(
			var(--cut) 0,
			calc(100% - var(--cut)) 0,
			100% var(--cut),
			100% calc(100% - var(--cut)),
			calc(100% - var(--cut)) 100%,
			var(--cut) 100%,
			0 calc(100% - var(--cut)),
			0 var(--cut)
		);
		box-shadow:
			inset 0 2px 0 rgba(235, 245, 240, 0.14),
			inset 0 -3px 0 rgba(0, 0, 0, 0.35);
		font:
			700 15px 'Alegreya Sans SC',
			'Alegreya Sans',
			system-ui,
			sans-serif;
		letter-spacing: 0.12em;
		color: #e2dccb;
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
			inset 0 -3px 0 rgba(0, 0, 0, 0.35);
	}
	.arrow {
		width: 10px;
		height: 12px;
		background: #3fd1bd;
		clip-path: polygon(100% 0, 0 50%, 100% 100%);
	}
</style>
