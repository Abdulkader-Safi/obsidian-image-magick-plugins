<script lang="ts">
	import type { TFile } from 'obsidian';

	interface Props {
		files: TFile[];
		activeIndex: number;
		disabled: boolean;
		onSelect: (index: number) => void;
	}

	let { files, activeIndex, disabled, onSelect }: Props = $props();
</script>

<section class="im-panel">
	<h2>Files ({files.length})</h2>
	<p class="im-hint">
		Tune the pipeline on any file. Save all applies it to every file in this list.
	</p>
	<ul class="im-files">
		{#each files as f, i (f.path)}
			<li>
				<button
					type="button"
					{disabled}
					title={f.path}
					class:im-selected={i === activeIndex}
					onclick={() => onSelect(i)}
				>
					{f.name}
				</button>
			</li>
		{/each}
	</ul>
</section>
