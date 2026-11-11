<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { loadDev, saveDev } from './devStorage';

	/** A foldable group of controls inside a dev window; remembers whether it is open. */
	let {
		id,
		title,
		summary = '',
		open: initial = false,
		children
	}: { id: string; title: string; summary?: string; open?: boolean; children: Snippet } = $props();

	let open = $state(untrack(() => loadDev(`group.${id}`, initial)));

	function toggle(): void {
		open = !open;
		saveDev(`group.${id}`, open);
	}
</script>

<div class="dev-group">
	<button type="button" class="dev-gh" tabindex={-1} aria-expanded={open} onclick={toggle}>
		<span class="chev">{open ? '▾' : '▸'}</span>
		{title}
		{#if !open && summary}<span class="sum">{summary}</span>{/if}
	</button>
	{#if open}
		<div class="dev-gb">{@render children()}</div>
	{/if}
</div>
