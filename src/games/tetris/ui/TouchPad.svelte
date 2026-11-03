<script lang="ts">
	import { Action } from '../core/types';
	import type { GameMain } from '../GameMain';

	interface Props {
		game: GameMain;
		side: 'left' | 'right';
	}

	let { game, side }: Props = $props();

	interface PadButton {
		action: Action;
		label: string;
		icon: string;
		wide?: boolean;
		accent?: boolean;
	}

	const LEFT: PadButton[] = [
		{ action: Action.LEFT, label: 'Влево', icon: 'M15 4l-8 8 8 8' },
		{ action: Action.RIGHT, label: 'Вправо', icon: 'M9 4l8 8-8 8' },
		{ action: Action.SOFT_DROP, label: 'Вниз', icon: 'M4 8l8 8 8-8', wide: true }
	];

	const RIGHT: PadButton[] = [
		{
			action: Action.ROTATE_CCW,
			label: 'Повернуть влево',
			icon: 'M3 12a9 9 0 1 0 9-9c-2.5 0-4.9 1-6.7 2.7L3 8M3 3v5h5'
		},
		{
			action: Action.ROTATE_CW,
			label: 'Повернуть вправо',
			icon: 'M21 12a9 9 0 1 1-9-9c2.5 0 4.9 1 6.7 2.7L21 8M21 3v5h-5',
			accent: true
		},
		{ action: Action.HARD_DROP, label: 'Сбросить', icon: 'M5 4l7 6 7-6M5 12l7 6 7-6', wide: true }
	];

	const buttons = $derived(side === 'left' ? LEFT : RIGHT);
	const active: Record<number, Action> = {};

	function down(e: PointerEvent, action: Action): void {
		e.preventDefault();
		if (e.currentTarget instanceof HTMLElement) e.currentTarget.setPointerCapture(e.pointerId);
		active[e.pointerId] = action;
		game.press(action);
		navigator.vibrate?.(8);
	}

	function up(e: PointerEvent): void {
		const action = active[e.pointerId];
		if (action === undefined) return;
		delete active[e.pointerId];
		game.release(action);
	}

	$effect(() => () => {
		for (const [id, action] of Object.entries(active)) {
			game.release(action);
			delete active[Number(id)];
		}
	});
</script>

<div class="pad pad--{side}" role="group" aria-label="Сенсорное управление">
	{#each buttons as btn (btn.action)}
		<button
			type="button"
			class="pad__btn"
			class:pad__btn--wide={btn.wide}
			class:pad__btn--accent={btn.accent}
			aria-label={btn.label}
			onpointerdown={(e) => down(e, btn.action)}
			onpointerup={up}
			onpointercancel={up}
			onlostpointercapture={up}
			oncontextmenu={(e) => e.preventDefault()}
		>
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path
					d={btn.icon}
					fill="none"
					stroke="currentColor"
					stroke-width="2.8"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</button>
	{/each}
</div>

<style>
	.pad {
		--size: clamp(52px, 16vw, 68px);
		display: grid;
		grid-template-columns: repeat(2, var(--size));
		gap: 10px;
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
	}

	.pad__btn {
		display: grid;
		place-items: center;
		height: var(--size);
		padding: 0;
		color: var(--t-ink);
		background: var(--t-paper);
		border: 3px solid var(--t-ink);
		border-radius: 0;
		box-shadow: 4px 4px 0 var(--t-ink);
		cursor: pointer;
		touch-action: none;
		-webkit-tap-highlight-color: transparent;
		-webkit-touch-callout: none;
		transition:
			transform 0.05s,
			box-shadow 0.05s;
	}

	.pad__btn svg {
		width: 46%;
		height: 46%;
	}

	.pad__btn--wide {
		grid-column: 1 / -1;
		height: calc(var(--size) * 0.78);
	}

	.pad__btn--accent {
		color: var(--t-paper);
		background: var(--t-red);
	}

	.pad__btn:active {
		transform: translate(3px, 3px);
		box-shadow: 1px 1px 0 var(--t-ink);
	}

	@media (max-height: 640px) and (orientation: portrait) {
		.pad {
			--size: clamp(46px, 14vw, 56px);
			gap: 8px;
		}
	}
</style>
