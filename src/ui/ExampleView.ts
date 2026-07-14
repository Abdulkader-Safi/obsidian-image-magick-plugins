import { ItemView, WorkspaceLeaf } from 'obsidian';
import { mount, unmount } from 'svelte';
import App from './App.svelte';

export const EXAMPLE_VIEW_TYPE = 'svelte-template-view';

export class ExampleView extends ItemView {
	private component: ReturnType<typeof mount> | undefined;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return EXAMPLE_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Svelte plugin template';
	}

	getIcon(): string {
		return 'layout-template';
	}

	async onOpen(): Promise<void> {
		this.component = mount(App, { target: this.contentEl });
	}

	async onClose(): Promise<void> {
		if (this.component) {
			void unmount(this.component);
			this.component = undefined;
		}
	}
}
