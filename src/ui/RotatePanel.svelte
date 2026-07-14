<script lang="ts">
	interface Props {
		rotate: number;
		flipH: boolean;
		flipV: boolean;
	}

	let {
		rotate = $bindable(),
		flipH = $bindable(),
		flipV = $bindable(),
	}: Props = $props();

	function bumpRotate(delta: number) {
		rotate = (((rotate + delta) % 360) + 360) % 360;
	}
</script>

<section class="im-panel">
	<header class="im-panel-head">
		<h2>Rotate &amp; flip</h2>
		<span class="im-hint">{rotate}°</span>
	</header>

	<div class="im-chips im-chips-fill">
		<button type="button" onclick={() => bumpRotate(-90)}>−90°</button>
		<button type="button" onclick={() => bumpRotate(90)}>+90°</button>
		<button type="button" onclick={() => bumpRotate(180)}>180°</button>
	</div>

	<input type="range" min="-180" max="180" step="1" bind:value={rotate} />

	<div class="im-check-row">
		<label class="im-check">
			<input type="checkbox" bind:checked={flipH} />
			<span>Flip H</span>
		</label>
		<label class="im-check">
			<input type="checkbox" bind:checked={flipV} />
			<span>Flip V</span>
		</label>
	</div>
</section>
