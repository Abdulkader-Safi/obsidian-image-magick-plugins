<script lang="ts">
	import type { ResizeSpec } from '../engine';

	interface Props {
		resize: ResizeSpec | null;
		sourceWidth: number;
		sourceHeight: number;
	}

	let { resize = $bindable(), sourceWidth, sourceHeight }: Props = $props();

	let enabled = $state(resize !== null);
	let lockAspect = $state(true);
	// Source dimensions are stable for the life of this component (loading a new
	// file remounts it), so seeding $state from props is safe.
	// svelte-ignore state_referenced_locally
	let widthInput = $state(sourceWidth);
	// svelte-ignore state_referenced_locally
	let heightInput = $state(sourceHeight);

	$effect(() => {
		resize = enabled
			? { width: widthInput, height: heightInput, lockAspect }
			: null;
	});

	function setWidth(value: number) {
		widthInput = clamp(value);
		if (lockAspect && sourceWidth > 0) {
			heightInput = Math.max(
				1,
				Math.round((widthInput / sourceWidth) * sourceHeight),
			);
		}
	}

	function setHeight(value: number) {
		heightInput = clamp(value);
		if (lockAspect && sourceHeight > 0) {
			widthInput = Math.max(
				1,
				Math.round((heightInput / sourceHeight) * sourceWidth),
			);
		}
	}

	function setPercent(percent: number) {
		widthInput = Math.max(1, Math.round((sourceWidth * percent) / 100));
		heightInput = Math.max(1, Math.round((sourceHeight * percent) / 100));
	}

	function clamp(n: number): number {
		if (!Number.isFinite(n)) {
			return 1;
		}
		return Math.max(1, Math.min(20000, Math.round(n)));
	}
</script>

<section class="im-panel">
	<header class="im-panel-head">
		<h2>Resize</h2>
		<label class="im-check">
			<input type="checkbox" bind:checked={enabled} />
			<span>Enabled</span>
		</label>
	</header>

	<div class="im-grid im-grid-2" class:im-dimmed={!enabled}>
		<label>
			<span>Width</span>
			<input
				type="number"
				min="1"
				value={widthInput}
				oninput={(e) => setWidth(Number(e.currentTarget.value))}
				disabled={!enabled}
			/>
		</label>
		<label>
			<span>Height</span>
			<input
				type="number"
				min="1"
				value={heightInput}
				oninput={(e) => setHeight(Number(e.currentTarget.value))}
				disabled={!enabled}
			/>
		</label>
	</div>

	<label class="im-check">
		<input type="checkbox" bind:checked={lockAspect} disabled={!enabled} />
		<span>Lock aspect ratio</span>
	</label>

	<div class="im-chips">
		{#each [25, 50, 75, 150, 200] as p (p)}
			<button type="button" onclick={() => setPercent(p)} disabled={!enabled}>
				{p}%
			</button>
		{/each}
	</div>
</section>
