import { App, PluginSettingTab, Setting } from 'obsidian';
import type SveltePluginTemplate from './main';

export interface TemplateSettings {
	mySetting: string;
}

export const DEFAULT_SETTINGS: TemplateSettings = {
	mySetting: 'default',
};

export class TemplateSettingTab extends PluginSettingTab {
	plugin: SveltePluginTemplate;

	constructor(app: App, plugin: SveltePluginTemplate) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('An example setting. Replace it with your own.')
			.addText((text) =>
				text
					.setPlaceholder('Enter a value')
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
