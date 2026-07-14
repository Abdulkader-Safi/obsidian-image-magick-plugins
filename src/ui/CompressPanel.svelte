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
		<span class="im-hint">Quality {quality}</span>
	</header>

	<input type="range" min="1" max="100" bind:value={quality} disabled={lossless} />

	<p class="im-hint">
		{#if lossless}
			{format.toUpperCase()} is lossless, so quality has no effect.
		{:else}
			Lower values give smaller files at the cost of detail.
		{/if}
	</p>
</section>
