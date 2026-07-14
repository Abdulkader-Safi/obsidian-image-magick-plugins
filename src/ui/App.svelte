<script lang="ts">
	import { Notice } from 'obsidian';
	import { Button } from './lib/components/ui/button';

	function handleClick() {
		new Notice('Button clicked. Svelte + Tailwind + shadcn is working.');
	}
</script>

<div class="app-root p-6">
	<h1 class="text-foreground mb-2 text-lg font-semibold">Svelte plugin template</h1>
	<p class="text-muted-foreground mb-4 text-sm">
		Main view, styled with shadcn-svelte and following your Obsidian theme.
	</p>
	<Button onclick={handleClick}>Click me</Button>
</div>
