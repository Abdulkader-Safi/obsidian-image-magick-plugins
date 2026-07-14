<script lang="ts">
	import type { ImageFormat } from '../formats';

	interface Props {
		format: ImageFormat;
		available: ImageFormat[];
	}

	let { format = $bindable(), available }: Props = $props();

	const ALL_FORMATS: { value: ImageFormat; label: string }[] = [
		{ value: 'jpg', label: 'JPEG' },
		{ value: 'png', label: 'PNG' },
		{ value: 'webp', label: 'WebP' },
		{ value: 'avif', label: 'AVIF' },
		{ value: 'gif', label: 'GIF' },
		{ value: 'tiff', label: 'TIFF' },
		{ value: 'bmp', label: 'BMP' },
	];

	const formats = $derived(ALL_FORMATS.filter((f) => available.includes(f.value)));
</script>

<section class="im-panel">
	<h2>Format</h2>
	<div class="im-grid im-grid-3">
		{#each formats as f (f.value)}
			<button
				type="button"
				class:im-selected={format === f.value}
				onclick={() => (format = f.value)}
			>
				{f.label}
			</button>
		{/each}
	</div>
</section>
