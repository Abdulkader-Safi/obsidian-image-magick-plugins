import { setIcon } from 'obsidian';

/** Svelte action that renders one of Obsidian's built-in Lucide icons. */
export function icon(node: HTMLElement, name: string) {
	setIcon(node, name);
	return {
		update(next: string) {
			node.empty();
			setIcon(node, next);
		},
	};
}
