<script lang="ts">
	import { LOSSLESS_FORMATS } from '../formats';
	import type { ImageFormat } from '../formats';

	interface Props {
		quality: number;
		format: ImageFormat;
	}

	let { quality = $bindable(), format }: Props = $props();

	const lossless = $derived(LOSSLESS_FORMATS.has(format));
</script>

<section class="im-panel">
	<header class="im-panel-head">
		<h2>Compression</h2>
		<span class="im-badge">{lossless ? '—' : quality}</span>
	</header>

	<div class="im-panel-body" class:im-off={lossless}>
		<input
			type="range"
			min="1"
			max="100"
			aria-label="Quality"
			bind:value={quality}
			disabled={lossless}
		/>
		<div class="im-scale">
			<span>Smaller</span>
			<span>Sharper</span>
		</div>
	</div>

	{#if lossless}
		<p class="im-hint im-panel-note">
			{format.toUpperCase()} is lossless, so quality has no effect.
		</p>
	{/if}
</section>
