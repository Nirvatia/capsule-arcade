<script lang="ts">
	/** A life: Pac-Man's sun, or Ms. Pac-Man's pearl star with her raspberry bow. */
	let { ms = false, size = 18 }: { ms?: boolean; size?: number } = $props();
	const rays = Array.from({ length: 8 }, (_, i) => i * 45);
	// the mouth is cut out of the body, so the icon sits on any background
	const uid = $props.id();
	const mouth = `life-mouth-${uid}`;
</script>

<svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
	<defs>
		<mask id={mouth}>
			<rect width="24" height="24" fill="#fff" />
			<path d={ms ? 'M13 13 L24 7.6 L24 18.4 Z' : 'M12.5 12 L24 6.4 L24 17.6 Z'} fill="#000" />
		</mask>
	</defs>
	{#if ms}
		<g mask="url(#{mouth})">
			<circle cx="12" cy="13" r="9.5" fill="#eef4ff" stroke="#66759a" stroke-width="1.4" />
			<path
				d="M12 13 C15 10 18 12 16 15 C14 18 8 17 8 13 C8 9 14 8 17 10"
				fill="none"
				stroke="#b8c8e2"
				stroke-width="1.3"
				stroke-linecap="round"
			/>
			<circle cx="12" cy="13" r="1.2" fill="#fff" />
		</g>
		<path
			d="M7 4 L2.5 1.5 L3 7 Z M7 4 L11.5 1.5 L11 7 Z"
			fill="#f34c83"
			stroke="#2c2242"
			stroke-width="0.6"
		/>
		<circle cx="7" cy="4.2" r="1.3" fill="#fff" />
	{:else}
		<g mask="url(#{mouth})">
			{#each rays as r (r)}
				<path d="M12 1 L13.6 4.6 L10.4 4.6 Z" transform="rotate({r} 12 12)" fill="#ffaa24" />
			{/each}
			<circle cx="12" cy="12" r="8" fill="#fa7e1e" />
			<circle cx="11.5" cy="12" r="5" fill="#ffd25a" />
			<circle cx="11" cy="12" r="2.4" fill="#fffae0" />
		</g>
	{/if}
</svg>
