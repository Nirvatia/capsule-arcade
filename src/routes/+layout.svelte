<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import ArcadeLayout from '$shared/ui/ArcadeLayout.svelte';
	import { initLang } from '$shared/i18n/i18n.svelte';

	let { children } = $props();

	onMount(initLang);
</script>

<ArcadeLayout>
	{@render children()}
</ArcadeLayout>
