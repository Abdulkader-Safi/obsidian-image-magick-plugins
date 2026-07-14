<script lang="ts">
	import type { ResizeSpec } from '../engine';
	import Switch from './Switch.svelte';
	import { icon } from './icon';

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

	// Which percentage chip, if any, the current size corresponds to.
	const activePercent = $derived(
		[25, 50, 75, 150, 200].find(
			(p) => widthInput === Math.max(1, Math.round((sourceWidth * p) / 100)),
		) ?? null,
	);

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
		<Switch bind:checked={enabled} label="Enable resize" />
	</header>

	<div class="im-panel-body" class:im-off={!enabled}>
		<div class="im-dims">
			<label class="im-field">
				<span>Width</span>
				<input
					type="number"
					min="1"
					value={widthInput}
					oninput={(e) => setWidth(Number(e.currentTarget.value))}
					disabled={!enabled}
				/>
			</label>

			<button
				type="button"
				class="im-lock"
				class:is-on={lockAspect}
				disabled={!enabled}
				aria-pressed={lockAspect}
				aria-label="Lock aspect ratio"
				title={lockAspect ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
				onclick={() => (lockAspect = !lockAspect)}
				use:icon={lockAspect ? 'lock' : 'unlock'}
			></button>

			<label class="im-field">
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

		<div class="im-seg im-seg-5">
			{#each [25, 50, 75, 150, 200] as p (p)}
				<button
					type="button"
					class:is-active={activePercent === p}
					onclick={() => setPercent(p)}
					disabled={!enabled}
				>
					{p}%
				</button>
			{/each}
		</div>
	</div>
</section>
