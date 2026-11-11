<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { loadDev, saveDev } from './devStorage';
	import './devUi.css';

	/** A floating dev window: drag it by its title, fold it to the title bar. */
	let {
		id,
		title,
		x = 8,
		y = 48,
		width = 30,
		children
	}: {
		id: string;
		title: string;
		x?: number;
		y?: number;
		/** In em of the window's own font size, which grows with the screen. */
		width?: number;
		children: Snippet;
	} = $props();

	// the props only seed the first position; after that the window remembers its own
	const saved = untrack(() => loadDev(`window.${id}`, { x, y, folded: false }));
	let left = $state(saved.x);
	let top = $state(saved.y);
	let folded = $state(saved.folded);
	let drag: { dx: number; dy: number } | null = null;

	function keepOnScreen(): void {
		left = Math.min(Math.max(0, left), Math.max(0, window.innerWidth - 60));
		top = Math.min(Math.max(0, top), Math.max(0, window.innerHeight - 24));
	}

	function down(event: PointerEvent): void {
		if ((event.target as HTMLElement).closest('button')) {
			return;
		}
		drag = { dx: event.clientX - left, dy: event.clientY - top };
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	function move(event: PointerEvent): void {
		if (!drag) {
			return;
		}
		left = event.clientX - drag.dx;
		top = event.clientY - drag.dy;
		keepOnScreen();
	}

	function up(): void {
		if (drag) {
			drag = null;
			saveDev(`window.${id}`, { x: left, y: top, folded });
		}
	}

	function fold(): void {
		folded = !folded;
		saveDev(`window.${id}`, { x: left, y: top, folded });
	}

	$effect(() => {
		keepOnScreen();
	});
</script>

<section class="dev-win" style:left="{left}px" style:top="{top}px" style:width="{width}em">
	<div
		class="dev-head"
		role="group"
		aria-label={title}
		onpointerdown={down}
		onpointermove={move}
		onpointerup={up}
		onpointercancel={up}
	>
		<b>{title}</b>
		<button type="button" tabindex={-1} onclick={fold} aria-label={folded ? 'Unfold' : 'Fold'}>
			{folded ? '▸' : '▾'}
		</button>
	</div>
	{#if !folded}
		<div class="dev-body">{@render children()}</div>
	{/if}
</section>
