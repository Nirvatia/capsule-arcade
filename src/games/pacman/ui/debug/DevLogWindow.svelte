<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import type { DebugController, DebugWatch } from '../../core/debug/DebugController';
	import type { PacmanDebugChannel } from '../../core/Events';
	import DevWindow from './DevWindow.svelte';
	import DevGroup from './DevGroup.svelte';
	import { clearDevLog, DEV_CHANNELS, devLog, devLogText, type DevLogLine } from './devLog';
	import { loadDev, saveDev } from './devStorage';

	/** The dev log: live timers on top, the event stream below, filtered by channel. */
	let { dev }: { dev: DebugController } = $props();

	const COLORS: Record<PacmanDebugChannel, string> = {
		damage: '#ff7a7a',
		debuff: '#d59bff',
		boss: '#ffb454',
		state: '#56d9ff',
		spawn: '#79ff6f',
		input: '#9aa7c2'
	};

	let all = $state<readonly DevLogLine[]>([]);
	let shown = $state<readonly DevLogLine[]>([]);
	let watches = $state<DebugWatch[]>([]);
	let enabled = $state<Record<PacmanDebugChannel, boolean>>(
		loadDev('log.channels', {
			damage: true,
			debuff: true,
			boss: true,
			state: true,
			spawn: true,
			input: false
		})
	);
	let query = $state('');
	let paused = $state(false);
	let list: HTMLDivElement | undefined = $state();
	let frame = 0;

	/** The window's width in em, and where it first opens: against the right edge, whole. */
	const LOG_WIDTH = 33;
	const startX = Math.max(
		8,
		window.innerWidth - LOG_WIDTH * Math.min(16, Math.max(12, 0.0055 * window.innerWidth + 5)) - 12
	);

	const unsub = devLog.subscribe((value) => (all = value));

	function poll(): void {
		watches = dev.watches();
		frame = requestAnimationFrame(poll);
	}
	frame = requestAnimationFrame(poll);

	onDestroy(() => {
		unsub();
		cancelAnimationFrame(frame);
	});

	// the visible lines: frozen while paused, filtered by channel and text
	$effect(() => {
		if (paused) {
			return;
		}
		const q = query.trim().toLowerCase();
		shown = all.filter(
			(l) =>
				enabled[l.channel] && (!q || l.text.toLowerCase().includes(q) || l.gameState.includes(q))
		);
		tick().then(() => list?.scrollTo({ top: list.scrollHeight }));
	});

	function toggle(channel: PacmanDebugChannel): void {
		enabled = { ...enabled, [channel]: !enabled[channel] };
		saveDev('log.channels', enabled);
	}

	function copy(): void {
		navigator.clipboard?.writeText(devLogText(shown)).catch(() => {});
	}

	const fmt = (w: DebugWatch) =>
		w.unit === '%'
			? `${w.value.toFixed(0)} %`
			: w.unit === 's'
				? `${w.value.toFixed(2)} s`
				: `${w.value}`;
</script>

<DevWindow id="log" title="DEV · log" x={startX} y={52} width={LOG_WIDTH}>
	<DevGroup id="watch" title="WATCH" open>
		<div class="dev-watch">
			{#each watches as w (w.group + w.label)}
				<div class="w" class:idle={w.value <= 0}>
					<span title="{w.group} · {w.label}">{w.label}</span>
					<span class="t"
						>{#if w.unit === '%'}<i style:width="{Math.min(100, w.value)}%"></i>{/if}</span
					>
					<output>{fmt(w)}</output>
				</div>
			{/each}
		</div>
	</DevGroup>

	<DevGroup id="stream" title="LOG" open>
		<div class="dev-chans" role="group" aria-label="Каналы">
			{#each DEV_CHANNELS as channel (channel)}
				<button
					type="button"
					tabindex={-1}
					class:off={!enabled[channel]}
					style:--c={COLORS[channel]}
					onclick={() => toggle(channel)}>{channel}</button
				>
			{/each}
		</div>
		<div class="dev-filter">
			<input type="search" placeholder="filter…" aria-label="Фильтр" bind:value={query} />
			<button
				type="button"
				class="dev-btn"
				class:on={paused}
				tabindex={-1}
				onclick={() => (paused = !paused)}>{paused ? 'Resume' : 'Hold'}</button
			>
			<button type="button" class="dev-btn" tabindex={-1} onclick={clearDevLog}>Clear</button>
			<button type="button" class="dev-btn" tabindex={-1} onclick={copy}>Copy</button>
		</div>
		<div class="dev-lines" bind:this={list}>
			{#each shown as line (line.id)}
				<div class="line">
					<span class="t">{line.at.toFixed(2)}</span>
					<span class="c" style:color={COLORS[line.channel]}>{line.channel}</span>
					<span class="x">{line.text}</span>
					{#if line.value !== undefined}<span class="n">{line.value}</span>{/if}
				</div>
			{:else}
				<div class="empty">nothing yet</div>
			{/each}
		</div>
		<div class="dev-foot">{shown.length} / {all.length} lines</div>
	</DevGroup>
</DevWindow>
