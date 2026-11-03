<script lang="ts">
	import type { GameIconName } from '$shared/config/games';

	interface Props {
		name: GameIconName;
		class?: string;
	}

	let { name, class: className = '' }: Props = $props();
</script>

<svg
	class={className}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2.3"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{#if name === 'snake'}
		<path d="M4 18c3 0 3-6 6-6s3 6 6 6 4-5 4-9" />
		<circle cx="20" cy="6" r="1.8" fill="currentColor" stroke="none" />
	{:else if name === 'maze'}
		<path d="M3 3h18v18H3zM7 3v10h4M15 7v14M11 7h4M7 17h4" />
	{:else if name === 'blocks'}
		<path d="M3 14h6v6H3zM9 14h6v6H9zM9 8h6v6H9zM15 14h6v6h-6z" />
	{:else}
		<circle cx="12" cy="12" r="9" />
		<path d="M12 3v18M3 12h18" />
		<path d="M12 3a9 9 0 0 1 9 9h-9z" fill="currentColor" />
	{/if}
</svg>
