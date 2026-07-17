/**
 * Resolves the `node:` imports safi-image carries, so the bundle runs on
 * Obsidian mobile as well as desktop (the manifest is not desktop-only, and a
 * bare `require('node:zlib')` throws where there is no node).
 *
 * Two of them exist, and they are handled differently on purpose:
 *
 *  - `node:zlib` is real work the PNG codec depends on, so it maps to a shim
 *    that does the job (src/zlib-shim.ts).
 *  - `node:fs/promises` backs only `fromFile`/`toFile`, which this plugin never
 *    calls: Obsidian reads through the vault API. Tree-shaking should drop it,
 *    but esbuild still has to resolve it first, so it maps to a stub that
 *    throws if it is ever somehow reached.
 *
 * Anything else is a build error rather than a stub, so that a future
 * safi-image release which reaches for a new node builtin fails here, loudly,
 * instead of shipping a plugin that breaks only on mobile.
 */
import path from 'node:path';

const root = path.join(import.meta.dirname, '..');

const SHIMS = {
	'node:zlib': path.join(root, 'src', 'zlib-shim.ts'),
	'node:fs/promises': path.join(root, 'src', 'fs-stub.ts'),
};

export function nodeShims() {
	return {
		name: 'node-shims',
		setup(build) {
			build.onResolve({ filter: /^node:/ }, (args) => {
				const shim = SHIMS[args.path];
				if (shim) {
					return { path: shim };
				}
				return {
					errors: [
						{
							text:
								`No shim for "${args.path}" (imported by ${args.importer}). ` +
								`Obsidian mobile has no node builtins: add a shim in ` +
								`scripts/node-shims.mjs, or make the import unreachable.`,
						},
					],
				};
			});
		},
	};
}
