import {
	FuzzySuggestModal,
	Modal,
	Setting,
	SuggestModal,
	TFile,
	type App,
} from 'obsidian';
import { describePreset } from './presets';
import type { OptimizePreset } from './engine';
import { listImages } from './vault';

/** Pick an image out of the vault. */
export class ImagePickerModal extends FuzzySuggestModal<TFile> {
	constructor(
		app: App,
		private onPick: (file: TFile) => void,
	) {
		super(app);
		this.setPlaceholder('Select an image to optimize');
	}

	getItems(): TFile[] {
		return listImages(this.app);
	}

	getItemText(file: TFile): string {
		return file.path;
	}

	onChooseItem(file: TFile): void {
		this.onPick(file);
	}
}

/**
 * Pick a preset. Always shown, even when there is only one, because running a
 * preset writes to the vault and the user must see which one is about to run.
 */
export class PresetPickerModal extends SuggestModal<OptimizePreset> {
	constructor(
		app: App,
		private presets: OptimizePreset[],
		private count: number,
		private onPick: (preset: OptimizePreset) => void,
	) {
		super(app);
		this.setPlaceholder(
			`Optimize ${count} image${count === 1 ? '' : 's'} with which preset?`,
		);
	}

	getSuggestions(query: string): OptimizePreset[] {
		const q = query.toLowerCase();
		return this.presets.filter((p) => p.name.toLowerCase().includes(q));
	}

	renderSuggestion(preset: OptimizePreset, el: HTMLElement): void {
		el.createDiv({ text: preset.name });
		el.createDiv({ text: describePreset(preset), cls: 'im-suggest-desc' });
	}

	onChooseSuggestion(preset: OptimizePreset): void {
		this.onPick(preset);
	}
}

/**
 * Names the output file. The folder is never asked for: output always lands
 * beside the source, so only the name is editable. Seeded with
 * `photo.optimized.webp`.
 */
export class SaveNameModal extends Modal {
	private name: string;

	constructor(
		app: App,
		private folder: string,
		defaultName: string,
		private onSubmit: (name: string) => void,
	) {
		super(app);
		this.name = defaultName;
	}

	onOpen(): void {
		const { contentEl } = this;
		this.setTitle('Save optimized image');

		contentEl.createDiv({
			cls: 'im-suggest-desc',
			text: `Saving into ${this.folder || 'the vault root'}`,
		});

		const warning = contentEl.createDiv({ cls: 'im-warning' });
		const updateWarning = () => {
			const path = this.folder ? `${this.folder}/${this.name}` : this.name;
			const exists = this.app.vault.getAbstractFileByPath(path) instanceof TFile;
			warning.setText(exists ? `${this.name} exists and will be replaced.` : '');
		};

		new Setting(contentEl).setName('File name').addText((text) => {
			text.setValue(this.name).onChange((value) => {
				this.name = value.trim();
				updateWarning();
			});
			text.inputEl.addEventListener('keydown', (e) => {
				if (e.key === 'Enter') {
					this.submit();
				}
			});
			// Preselect the stem so typing replaces the name but keeps the extension.
			const dot = this.name.lastIndexOf('.');
			text.inputEl.setSelectionRange(0, dot === -1 ? this.name.length : dot);
			window.setTimeout(() => text.inputEl.focus(), 0);
		});
		updateWarning();

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText('Save')
				.setCta()
				.onClick(() => this.submit()),
		);
	}

	private submit(): void {
		if (!this.name) {
			return;
		}
		this.close();
		this.onSubmit(this.name);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

/** Name a new preset built from the editor's current settings. */
export class PresetNameModal extends Modal {
	private name = '';

	constructor(
		app: App,
		private summary: string,
		private onSubmit: (name: string) => void,
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		this.setTitle('Save as preset');
		contentEl.createDiv({ text: this.summary, cls: 'im-suggest-desc' });

		new Setting(contentEl).setName('Name').addText((text) => {
			text.setPlaceholder('My preset').onChange((value) => {
				this.name = value.trim();
			});
			text.inputEl.addEventListener('keydown', (e) => {
				if (e.key === 'Enter') {
					this.submit();
				}
			});
		});

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText('Save preset')
				.setCta()
				.onClick(() => this.submit()),
		);
	}

	private submit(): void {
		if (!this.name) {
			return;
		}
		this.close();
		this.onSubmit(this.name);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
