<script lang="ts">
	import { LOSSLESS_FORMATS } from '../formats';
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
	<header class="im-panel-head">
		<h2>Format</h2>
		<span class="im-badge">
			{LOSSLESS_FORMATS.has(format) ? 'lossless' : 'lossy'}
		</span>
	</header>

	<div class="im-panel-body">
		<div class="im-seg im-seg-4">
			{#each formats as f (f.value)}
				<button
					type="button"
					class:is-active={format === f.value}
					aria-pressed={format === f.value}
					onclick={() => (format = f.value)}
				>
					{f.label}
				</button>
			{/each}
		</div>
	</div>
</section>
