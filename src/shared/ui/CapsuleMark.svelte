<script lang="ts">
	// The brand mark: a two-colour capsule, optionally on the pavilion-teal tile.
	// Same drawing as static/favicon.svg.
	interface Props {
		tile?: boolean;
		class?: string;
	}

	let { tile = false, class: className = '' }: Props = $props();
</script>

<svg class={className} viewBox="0 0 64 64" aria-hidden="true">
	{#if tile}
		<rect width="64" height="64" rx="15" fill="#0e4a4f" />
	{/if}
	<path d="M10 32a22 22 0 0 1 44 0Z" fill="#ff3a1d" />
	<path d="M10 32a22 22 0 0 0 44 0Z" fill="#e6ddc4" />
	<rect x="9" y="29.5" width="46" height="5" fill="#0b2e31" />
	<circle cx="32" cy="32" r="22" fill="none" stroke="#0b2e31" stroke-width="3.5" />
	<path
		d="M20 24a13 13 0 0 1 9-7"
		fill="none"
		stroke="#fff"
		stroke-width="3.6"
		stroke-linecap="round"
		opacity=".9"
	/>
</svg>
