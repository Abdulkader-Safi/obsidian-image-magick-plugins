/**
 * Stands in for `node:fs/promises`, which safi-image imports for its
 * `fromFile`/`toFile` helpers. The plugin never calls them (Obsidian reads and
 * writes through the vault API, see src/vault.ts), so tree-shaking drops this
 * whole module from the bundle. It exists only to give esbuild something to
 * resolve, and throws rather than returning junk if that assumption ever breaks.
 */
function unavailable(name: string): never {
	throw new Error(
		`safi-image called ${name}, but this plugin has no filesystem: ` +
			`image bytes come from the Obsidian vault API.`,
	);
}

export function readFile(): never {
	unavailable('readFile');
}

export function writeFile(): never {
	unavailable('writeFile');
}
