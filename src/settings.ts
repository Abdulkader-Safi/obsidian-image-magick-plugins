import { App, PluginSettingTab, Setting } from 'obsidian';
import { DEFAULT_PRESETS, NEW_PRESET, describePreset } from './presets';
import { LOSSLESS_FORMATS } from './formats';
import type { ImageFormat } from './formats';
import type { OptimizePreset } from './engine';
import type ImageMagickPlugin from './main';

const FORMAT_OPTIONS: Record<string, string> = {
	jpg: 'JPEG',
	png: 'PNG',
	webp: 'WebP',
	avif: 'AVIF',
	gif: 'GIF',
	tiff: 'TIFF',
	bmp: 'BMP',
};

export class ImageMagickSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private plugin: ImageMagickPlugin,
	) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		const presets = this.plugin.settings.presets;

		new Setting(containerEl)
			.setName('Presets')
			.setDesc(
				presets.length === 0
					? `No saved presets, so the built-in ones are offered: ${DEFAULT_PRESETS.map((p) => p.name).join(', ')}.`
					: 'Offered by "Optimize with preset".',
			)
			.addButton((btn) =>
				btn
					.setButtonText('Add preset')
					.setCta()
					.onClick(async () => {
						presets.push({ ...NEW_PRESET });
						await this.plugin.saveSettings();
						this.display();
					}),
			);

		presets.forEach((preset, index) => {
			this.renderPreset(containerEl, preset, index);
		});
	}

	private renderPreset(
		containerEl: HTMLElement,
		preset: OptimizePreset,
		index: number,
	): void {
		const box = containerEl.createDiv({ cls: 'im-preset' });

		new Setting(box)
			.setName(preset.name)
			.setDesc(describePreset(preset))
			.setHeading()
			.addExtraButton((btn) =>
				btn
					.setIcon('trash')
					.setTooltip('Delete preset')
					.onClick(async () => {
						this.plugin.settings.presets.splice(index, 1);
						await this.plugin.saveSettings();
						this.display();
					}),
			);

		new Setting(box).setName('Name').addText((text) =>
			text.setValue(preset.name).onChange(async (value) => {
				preset.name = value;
				await this.plugin.saveSettings();
			}),
		);

		new Setting(box).setName('Format').addDropdown((drop) =>
			drop
				.addOptions(FORMAT_OPTIONS)
				.setValue(preset.format)
				.onChange(async (value) => {
					preset.format = value as ImageFormat;
					await this.plugin.saveSettings();
					// The quality row only exists for lossy formats.
					this.display();
				}),
		);

		if (!LOSSLESS_FORMATS.has(preset.format)) {
			new Setting(box)
				.setName('Quality')
				.setDesc('1-100. Lower is smaller and lossier.')
				.addSlider((slider) =>
					slider
						.setLimits(1, 100, 1)
						.setValue(preset.quality)
						.onChange(async (value) => {
							preset.quality = value;
							await this.plugin.saveSettings();
						}),
				);
		}

		new Setting(box)
			.setName('Max long edge')
			.setDesc(
				'Shrink the longest edge to this many pixels. Empty keeps the source size.',
			)
			.addText((text) =>
				text
					.setPlaceholder('1600')
					.setValue(preset.maxLongEdge ? String(preset.maxLongEdge) : '')
					.onChange(async (value) => {
						const n = Number(value);
						preset.maxLongEdge =
							value.trim() !== '' && Number.isFinite(n) && n > 0
								? Math.round(n)
								: null;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(box)
			.setName('Strip metadata')
			.setDesc('Drop camera, location, and colour profile data.')
			.addToggle((toggle) =>
				toggle.setValue(preset.stripMetadata).onChange(async (value) => {
					preset.stripMetadata = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(box)
			.setName('Output')
			.setDesc('Where the optimized file lands.')
			.addDropdown((drop) =>
				drop
					.addOptions({
						suffix: 'Save a copy',
						overwrite: 'Use the source name',
					})
					.setValue(preset.output)
					.onChange(async (value) => {
						preset.output = value === 'overwrite' ? 'overwrite' : 'suffix';
						await this.plugin.saveSettings();
						this.display();
					}),
			);

		if (preset.output === 'suffix') {
			new Setting(box)
				.setName('Suffix')
				.setDesc('Added before the extension, e.g. photo.optimized.webp')
				.addText((text) =>
					text
						.setPlaceholder('.optimized')
						.setValue(preset.suffix)
						.onChange(async (value) => {
							preset.suffix = value || '.optimized';
							await this.plugin.saveSettings();
						}),
				);
		}
	}
}
