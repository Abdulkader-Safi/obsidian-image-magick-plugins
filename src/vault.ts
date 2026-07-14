import { TFile, TFolder, normalizePath, type App } from 'obsidian';
import { IMAGE_EXTENSIONS } from './formats';

const IMAGE_EXTS = new Set(IMAGE_EXTENSIONS);

export function isImageFile(file: TFile): boolean {
	return IMAGE_EXTS.has(file.extension.toLowerCase());
}

export function listImages(app: App): TFile[] {
	return app.vault.getFiles().filter(isImageFile);
}

export async function readBytes(app: App, file: TFile): Promise<Uint8Array> {
	return new Uint8Array(await app.vault.readBinary(file));
}

/** The folder holding `path`, or '' for a file at the vault root. */
export function parentPath(path: string): string {
	const slash = path.lastIndexOf('/');
	return slash === -1 ? '' : path.slice(0, slash);
}

export function joinPath(folder: string, name: string): string {
	return folder ? `${folder}/${name}` : name;
}

/**
 * Writes `bytes` to a vault path, creating missing parent folders and replacing
 * an existing file. Returns the written file.
 */
export async function writeBytes(
	app: App,
	path: string,
	bytes: Uint8Array,
): Promise<TFile> {
	const target = normalizePath(path);
	const slash = target.lastIndexOf('/');
	if (slash > 0) {
		const dir = target.slice(0, slash);
		if (!(app.vault.getAbstractFileByPath(dir) instanceof TFolder)) {
			await app.vault.createFolder(dir);
		}
	}
	// Uint8Array views can be windows onto a larger buffer, so copy out the
	// exact bytes rather than handing over the whole backing store.
	const data = bytes.buffer.slice(
		bytes.byteOffset,
		bytes.byteOffset + bytes.byteLength,
	) as ArrayBuffer;

	const existing = app.vault.getAbstractFileByPath(target);
	if (existing instanceof TFile) {
		await app.vault.modifyBinary(existing, data);
		return existing;
	}
	return app.vault.createBinary(target, data);
}
