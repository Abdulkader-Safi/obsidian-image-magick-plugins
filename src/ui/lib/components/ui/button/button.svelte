<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { cn } from '../../../utils';
	import { buttonVariants, type ButtonVariant, type ButtonSize } from './variants';

	let {
		class: className,
		variant = 'default',
		size = 'default',
		children,
		...restProps
	}: HTMLButtonAttributes & {
		variant?: ButtonVariant;
		size?: ButtonSize;
		children?: Snippet;
	} = $props();
</script>

<button class={cn(buttonVariants({ variant, size }), className)} {...restProps}>
	{@render children?.()}
</button>
