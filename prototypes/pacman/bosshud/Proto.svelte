<script lang="ts">
	import { onMount } from 'svelte';
	import BossHud from '../../../src/games/pacman/ui/hud/season/BossHud.svelte';
	import BossHudNext from './BossHudNext.svelte';
	import BossBar from './BossBar.svelte';
	import DialSample from './DialSample.svelte';
	import { BERSERK_ART, BERSERK_RING } from './berserkArt';
	import type { BerserkVariant } from './berserkArt';
	import { WEAPON_ART } from '../../../src/games/pacman/ui/hud/season/hellArt';
	import { bossHudLayoutFor } from '../../../src/games/pacman/config/hudLayout';
	import { BOSS_HP, PHASE_THRESHOLDS } from '../../../src/games/pacman/logic/doom/DoomBalance';
	import { GRID_DOOM } from '../../../src/games/pacman/config/mazes';
	import { DoomWorld } from '../../../src/games/pacman/render/doom/DoomWorld';
	import { lang } from '../../../src/games/pacman/ui/i18n';
	import type { HudSnapshot } from '../../../src/games/pacman/ui/hud/hudSnapshot';

	lang.set('ru');

	type Weapon = 'bfg' | 'barrel' | 'berserk' | '';
	let design = $state<'now' | 'new'>('new');
	let variant = $state<BerserkVariant>('a');
	let weapon = $state<Weapon>('berserk');
	let hp = $state(1180);
	let berserk = $state(6.4);
	let reward = $state(false);
	let flash = $state(false);

	const phase = $derived(hp > PHASE_THRESHOLDS[0] ? 1 : hp > PHASE_THRESHOLDS[1] ? 2 : 3);
	const marks = [PHASE_THRESHOLDS[0] / BOSS_HP, PHASE_THRESHOLDS[1] / BOSS_HP];

	const snap = $derived<HudSnapshot>({
		state: 'playing',
		underPause: 'playing',
		paused: false,
		fade: 0,
		phase: '',
		afterDeath: false,
		remaining: 0,
		duration: 0,
		profile: 'pacman',
		world: 'hell',
		level: 5,
		score: 12840,
		highScore: 52000,
		lives: 3,
		dots: 0,
		timer: null,
		fruits: [],
		boss: {
			name: 'hell',
			phase: reward ? 3 : phase,
			hp: reward ? 0 : hp,
			hpMax: BOSS_HP,
			marks,
			playerHp: 2,
			playerHpMax: 3,
			weapon,
			berserk,
			charge: weapon === 'bfg' ? 0.6 : 0,
			defeated: reward,
			rewardOffered: reward
		}
	});

	const STAGE_W = 1280;
	const STAGE_H = 720;
	let avail = $state(1280);
	const k = $derived(Math.min(1, (avail - 32) / STAGE_W));
	const layout = bossHudLayoutFor(STAGE_W, STAGE_H);
	let canvas: HTMLCanvasElement;

	onMount(() => {
		const world = new DoomWorld(GRID_DOOM, []);
		const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
		const dpr = 1.5;
		canvas.width = STAGE_W * dpr;
		canvas.height = STAGE_H * dpr;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		world.resize(STAGE_W, STAGE_H, dpr);
		world.setMood(false, false);
		world.update(0.016);
		world.drawWorld(ctx);
		world.drawMood(ctx, []);
	});

	const phaseOf = (v: number) => (v > PHASE_THRESHOLDS[0] ? 1 : v > PHASE_THRESHOLDS[1] ? 2 : 3);
	const BAR_STATES: ReadonlyArray<{ name: string; hp: number; flash?: boolean }> = [
		{ name: 'Фаза I, полное здоровье', hp: 1500 },
		{ name: 'Фаза I, ранен', hp: 1180 },
		{ name: 'Фаза II, на середине', hp: 760 },
		{ name: 'Фаза III, на исходе', hp: 210 },
		{ name: 'Удар (вспышка)', hp: 900, flash: true }
	];
	const VARIANTS: ReadonlyArray<{ id: BerserkVariant | 'now'; name: string }> = [
		{ id: 'now', name: 'Сейчас: оранжевый кулак' },
		{ id: 'a', name: 'A · Кулак в пламени' },
		{ id: 'b', name: 'B · Маска ярости' },
		{ id: 'c', name: 'C · Шипастая перчатка' }
	];
	const iconOf = (v: BerserkVariant | 'now') => (v === 'now' ? WEAPON_ART.berserk : BERSERK_ART[v]);
	const ringOf = (v: BerserkVariant | 'now') => (v === 'now' ? '#ff8a2a' : BERSERK_RING[v]);
</script>

<svelte:window bind:innerWidth={avail} />

<main>
	<h1>HUD босса: полоса здоровья и иконка берсерка</h1>
	<p>
		Макет на настоящем лабиринте ада и настоящем HUD. Новая полоса сделана из того же железа, что
		стены: клёпаная плита, три отсека по фазам, раскалённый край заливки, выгоревшие отсеки
		трескаются. Для берсерка три иконки; во всех трёх диск в этот момент краснеет, чтобы иконка не
		сливалась с оранжевым кольцом.
	</p>

	<section>
		<h2>В сцене</h2>
		<div class="bar">
			<button aria-pressed={design === 'now'} onclick={() => (design = 'now')}>Сейчас</button>
			<button aria-pressed={design === 'new'} onclick={() => (design = 'new')}>Новое</button>
			<span class="sep"></span>
			{#each ['a', 'b', 'c'] as v (v)}
				<button
					aria-pressed={variant === v}
					disabled={design === 'now'}
					onclick={() => (variant = v as BerserkVariant)}>Иконка {v.toUpperCase()}</button
				>
			{/each}
			<span class="sep"></span>
			{#each [['', 'Без оружия'], ['bfg', 'BFG'], ['barrel', 'Бочка'], ['berserk', 'Берсерк']] as [w, n] (w)}
				<button aria-pressed={weapon === w} onclick={() => (weapon = w as Weapon)}>{n}</button>
			{/each}
			<button aria-pressed={reward} onclick={() => (reward = !reward)}>Победа</button>
		</div>
		<label class="slide"
			>Здоровье босса <input type="range" min="0" max="1500" step="10" bind:value={hp} />
			<b>{hp}</b></label
		>
		<label class="slide"
			>Берсерк, секунд осталось <input type="range" min="0" max="10" step="0.1" bind:value={berserk} />
			<b>{berserk.toFixed(1)}</b></label
		>
		<div class="frame" style:height="{STAGE_H * k}px">
			<div class="stage" style:transform="scale({k})">
				<canvas bind:this={canvas} width={STAGE_W} height={STAGE_H}></canvas>
				{#if design === 'now'}
					<BossHud {snap} scale={layout.scale} mode={layout.mode} onpause={() => {}} />
				{:else}
					<BossHudNext
						{snap}
						scale={layout.scale}
						mode={layout.mode}
						onpause={() => {}}
						{variant}
						{flash}
					/>
				{/if}
			</div>
		</div>
	</section>

	<section>
		<h2>Новая полоса: состояния</h2>
		<div class="bars">
			{#each BAR_STATES as st (st.name)}
				<figure>
					<div class="chip">
						<BossBar
							w={600}
							hp={st.hp}
							hpMax={BOSS_HP}
							{marks}
							phase={phaseOf(st.hp)}
							name="BLINKY"
							phaseLabel="ФАЗА"
							flash={st.flash}
							uid="s{st.hp}{st.flash ? 'f' : ''}"
						/>
					</div>
					<figcaption>{st.name}</figcaption>
				</figure>
			{/each}
			<figure>
				<div class="chip narrow">
					<BossBar
						w={400}
						hp={760}
						hpMax={BOSS_HP}
						{marks}
						phase={2}
						name="BLINKY"
						phaseLabel="ФАЗА"
						uid="stack"
					/>
				</div>
				<figcaption>Узкий экран (вертикальная раскладка)</figcaption>
			</figure>
		</div>
	</section>

	<section>
		<h2>Иконка берсерка: три варианта</h2>
		<p>
			В ряду слева направо: BFG (для сравнения с другим оружием), берсерк полный, берсерк на исходе.
			Крайний справа циферблат в натуральную величину HUD.
		</p>
		<div class="icons">
			{#each VARIANTS as v (v.id)}
				<div class="row">
					<h3>{v.name}</h3>
					<div class="cells">
						<DialSample icon={WEAPON_ART.bfg} ring="#7dff5a" ratio={0.6} size={150} label="BFG" />
						<DialSample
							icon={iconOf(v.id)}
							ring={ringOf(v.id)}
							ratio={1}
							rage={v.id !== 'now'}
							big={v.id !== 'now'}
							size={150}
							label="берсерк полный"
						/>
						<DialSample
							icon={iconOf(v.id)}
							ring={ringOf(v.id)}
							ratio={0.25}
							rage={v.id !== 'now'}
							big={v.id !== 'now'}
							size={150}
							label="берсерк на исходе"
						/>
						<DialSample
							icon={iconOf(v.id)}
							ring={ringOf(v.id)}
							ratio={0.7}
							rage={v.id !== 'now'}
							big={v.id !== 'now'}
							size={108}
							label="натуральная величина"
						/>
					</div>
				</div>
			{/each}
		</div>
	</section>
</main>

<style>
	:global(html, body) {
		margin: 0;
		background: #0b0507;
		color: #f0dcd4;
	}
	main {
		max-width: 1312px;
		margin: 0 auto;
		display: grid;
		gap: 22px;
		padding-block: 20px 48px;
		padding-left: max(16px, env(safe-area-inset-left, 0px));
		padding-right: max(16px, env(safe-area-inset-right, 0px));
		font:
			15px/1.5 'Inter',
			'Segoe UI',
			system-ui,
			sans-serif;
	}
	h1 {
		margin: 0;
		font: 700 24px/1.2 'Space Grotesk', 'Inter', system-ui, sans-serif;
		text-wrap: balance;
	}
	h2 {
		margin: 0 0 8px;
		font: 700 18px/1.2 'Space Grotesk', 'Inter', system-ui, sans-serif;
	}
	h3 {
		margin: 0 0 6px;
		font: 600 13px 'Space Grotesk', 'Inter', system-ui, sans-serif;
		letter-spacing: 0.04em;
	}
	p {
		margin: 0 0 10px;
		color: #b79a92;
		max-width: 76ch;
	}
	section {
		display: grid;
		gap: 10px;
		min-width: 0;
	}
	.bar {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
	}
	.sep {
		width: 1px;
		height: 22px;
		background: #4a2a2e;
	}
	button {
		font: 600 13px 'Inter', system-ui, sans-serif;
		color: #f0dcd4;
		background: #241014;
		border: 1px solid #3a1c20;
		border-radius: 6px;
		padding: 8px 12px;
		cursor: pointer;
	}
	button[aria-pressed='true'] {
		background: #a3241a;
		border-color: #a3241a;
		color: #fff;
	}
	button:disabled {
		opacity: 0.45;
		cursor: default;
	}
	button:focus-visible {
		outline: 2px solid #ffb06a;
		outline-offset: 2px;
	}
	.slide {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 13px;
		color: #b79a92;
		flex-wrap: wrap;
	}
	.slide input {
		width: min(100%, 320px);
		accent-color: #e0402a;
	}
	.slide b {
		color: #f0dcd4;
		font-variant-numeric: tabular-nums;
	}
	.frame {
		width: 100%;
		max-width: 1280px;
		overflow: hidden;
		border: 1px solid #3a1c20;
		border-radius: 4px;
	}
	.stage {
		position: relative;
		width: 1280px;
		height: 720px;
		transform-origin: 0 0;
		/* a transformed ancestor makes the HUD's `position: fixed` stick to the stage */
		isolation: isolate;
		background: #0a0204;
	}
	.stage canvas {
		position: absolute;
		inset: 0;
		width: 1280px;
		height: 720px;
	}
	.bars {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 440px), 1fr));
		gap: 14px;
	}
	figure {
		margin: 0;
		display: grid;
		gap: 6px;
		min-width: 0;
	}
	.chip {
		background: #120508;
		border: 1px solid #3a1c20;
		border-radius: 4px;
		padding: 10px;
	}
	.chip.narrow {
		max-width: 400px;
	}
	figcaption {
		font-size: 13px;
		color: #b79a92;
	}
	.icons {
		display: grid;
		gap: 14px;
	}
	.row {
		background: #120508;
		border: 1px solid #3a1c20;
		border-radius: 4px;
		padding: 12px;
	}
	.cells {
		display: flex;
		flex-wrap: wrap;
		gap: 18px;
		align-items: flex-end;
	}
</style>
