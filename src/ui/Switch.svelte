<script lang="ts">
	interface Props {
		checked: boolean;
		label: string;
		disabled?: boolean;
	}

	let { checked = $bindable(), label, disabled = false }: Props = $props();
</script>

<button
	type="button"
	class="im-switch"
	class:is-on={checked}
	role="switch"
	aria-checked={checked}
	aria-label={label}
	{disabled}
	onclick={() => (checked = !checked)}
>
	<span class="im-switch-thumb"></span>
</button>
