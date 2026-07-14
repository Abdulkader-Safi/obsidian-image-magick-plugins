import { Plugin, WorkspaceLeaf } from 'obsidian';
import { DEFAULT_SETTINGS, TemplateSettingTab } from './settings';
import type { TemplateSettings } from './settings';
import { ExampleView, EXAMPLE_VIEW_TYPE } from './ui/ExampleView';

export default class SveltePluginTemplate extends Plugin {
	settings!: TemplateSettings;

	async onload() {
		await this.loadSettings();

		this.registerView(EXAMPLE_VIEW_TYPE, (leaf) => new ExampleView(leaf));

		// Ribbon icon to open the example view.
		this.addRibbonIcon('layout-template', 'Open Svelte plugin template', () => {
			void this.activateView();
		});

		// Command to open the example view.
		this.addCommand({
			id: 'open-view',
			name: 'Open view',
			callback: () => {
				void this.activateView();
			},
		});

		this.addSettingTab(new TemplateSettingTab(this.app, this));
	}

	onunload() {}

	async activateView(): Promise<void> {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null =
			workspace.getLeavesOfType(EXAMPLE_VIEW_TYPE)[0] ?? null;

		if (!leaf) {
			leaf = workspace.getLeaf('tab');
			await leaf.setViewState({ type: EXAMPLE_VIEW_TYPE, active: true });
		}

		await workspace.revealLeaf(leaf);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<TemplateSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
