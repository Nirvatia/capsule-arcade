<script lang="ts">
	interface Props {
		touch: boolean;
	}

	let { touch }: Props = $props();
</script>

{#if touch}
	<dl class="t-kbd-list">
		<dt>ТАП</dt>
		<dd>поворот фигуры</dd>
		<dt>ВЕДИ ПАЛЬЦЕМ</dt>
		<dd>двигать по участку и вниз</dd>
		<dt>СМАХНИ ВНИЗ</dt>
		<dd>жёсткий сброс</dd>
		<dt>СМАХНИ ВВЕРХ</dt>
		<dd>на склад (или тап по «Складу»)</dd>
		<dt>КНОПКИ</dt>
		<dd>то же самое, для точности</dd>
	</dl>
{:else}
	<dl class="t-kbd-list">
		<dt>← →</dt>
		<dd>движение (зажми — побежит)</dd>
		<dt>↓</dt>
		<dd>мягкий сброс, +1 за клетку</dd>
		<dt>ПРОБЕЛ</dt>
		<dd>жёсткий сброс, +2 за клетку</dd>
		<dt>↑ · X / Z</dt>
		<dd>поворот вправо / влево</dd>
		<dt>C · SHIFT</dt>
		<dd>отложить на склад</dd>
		<dt>P · ESC</dt>
		<dd>перерыв</dd>
		<dt>M</dt>
		<dd>звук</dd>
	</dl>
{/if}
