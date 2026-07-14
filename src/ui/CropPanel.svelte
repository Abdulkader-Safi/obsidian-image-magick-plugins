<script lang="ts">
	import type { CropRect } from '../engine';

	interface Props {
		crop: CropRect | null;
		sourceWidth: number;
		sourceHeight: number;
	}

	let { crop = $bindable(), sourceWidth, sourceHeight }: Props = $props();

	function center(percent: number) {
		const w = Math.max(1, Math.round((sourceWidth * percent) / 100));
		const h = Math.max(1, Math.round((sourceHeight * percent) / 100));
		crop = {
			x: Math.round((sourceWidth - w) / 2),
			y: Math.round((sourceHeight - h) / 2),
			w,
			h,
		};
	}

	function update(field: 'x' | 'y' | 'w' | 'h', value: number) {
		if (!crop) {
			return;
		}
		const max = field === 'x' || field === 'w' ? sourceWidth : sourceHeight;
		const isPos = field === 'x' || field === 'y';
		crop = {
			...crop,
			[field]: isPos ? clampPos(value, max) : clampSize(value, max),
		};
	}

	function clampPos(n: number, max: number): number {
		if (!Number.isFinite(n)) {
			return 0;
		}
		return Math.max(0, Math.min(max - 1, Math.round(n)));
	}

	function clampSize(n: number, max: number): number {
		if (!Number.isFinite(n)) {
			return 1;
		}
		return Math.max(1, Math.min(max, Math.round(n)));
	}
</script>

<section class="im-panel">
	<header class="im-panel-head">
		<h2>Crop</h2>
		{#if crop}
			<button type="button" class="im-link" onclick={() => (crop = null)}>
				Clear
			</button>
		{/if}
	</header>

	<div class="im-panel-body">
		{#if crop}
			<div class="im-grid-2">
				<label class="im-field">
					<span>X</span>
					<input
						type="number"
						min="0"
						value={crop.x}
						oninput={(e) => update('x', Number(e.currentTarget.value))}
					/>
				</label>
				<label class="im-field">
					<span>Y</span>
					<input
						type="number"
						min="0"
						value={crop.y}
						oninput={(e) => update('y', Number(e.currentTarget.value))}
					/>
				</label>
				<label class="im-field">
					<span>Width</span>
					<input
						type="number"
						min="1"
						value={crop.w}
						oninput={(e) => update('w', Number(e.currentTarget.value))}
					/>
				</label>
				<label class="im-field">
					<span>Height</span>
					<input
						type="number"
						min="1"
						value={crop.h}
						oninput={(e) => update('h', Number(e.currentTarget.value))}
					/>
				</label>
			</div>
		{:else}
			<p class="im-hint">Drag a region on the preview, or start from a preset below.</p>
		{/if}

		<div class="im-seg im-seg-4">
			{#each [25, 50, 75, 90] as p (p)}
				<button type="button" onclick={() => center(p)}>{p}%</button>
			{/each}
		</div>
		<p class="im-hint">Centered crop, as a share of the source.</p>
	</div>
</section>
