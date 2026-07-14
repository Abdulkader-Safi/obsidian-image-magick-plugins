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
	<header class="im-panel-head">
		<h2>Files</h2>
		<span class="im-badge">{files.length}</span>
	</header>

	<div class="im-panel-body">
		<ul class="im-files">
			{#each files as f, i (f.path)}
				<li>
					<button
						type="button"
						{disabled}
						title={f.path}
						class:is-active={i === activeIndex}
						onclick={() => onSelect(i)}
					>
						{f.name}
					</button>
				</li>
			{/each}
		</ul>
		<p class="im-hint">Tune the pipeline on any file. Save all applies it to every one.</p>
	</div>
</section>
