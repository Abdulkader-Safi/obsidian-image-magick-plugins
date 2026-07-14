<script lang="ts">
	import { icon } from './icon';

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
		<span class="im-badge">{rotate}°</span>
	</header>

	<div class="im-panel-body">
		<div class="im-seg im-seg-3">
			<button type="button" onclick={() => bumpRotate(-90)}>−90°</button>
			<button type="button" onclick={() => bumpRotate(90)}>+90°</button>
			<button type="button" onclick={() => bumpRotate(180)}>180°</button>
		</div>

		<input
			type="range"
			min="-180"
			max="180"
			step="1"
			aria-label="Rotation angle"
			bind:value={rotate}
		/>

		<div class="im-seg im-seg-2">
			<button
				type="button"
				class:is-active={flipH}
				aria-pressed={flipH}
				onclick={() => (flipH = !flipH)}
			>
				<span use:icon={'flip-horizontal'}></span>
				Flip H
			</button>
			<button
				type="button"
				class:is-active={flipV}
				aria-pressed={flipV}
				onclick={() => (flipV = !flipV)}
			>
				<span use:icon={'flip-vertical'}></span>
				Flip V
			</button>
		</div>
	</div>
</section>
