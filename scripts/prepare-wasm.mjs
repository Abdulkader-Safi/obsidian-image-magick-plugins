import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';

/**
 * Gzips the ImageMagick wasm into build/ so esbuild can inline it into main.js
 * as base64 (see the `.gz` loader in esbuild.config.mjs).
 *
 * Obsidian's plugin installer only ever downloads main.js, manifest.json and
 * styles.css, so a sidecar magick.wasm would never reach anyone installing from
 * the community store. Inlining is the only self-contained option. Gzip keeps
 * the cost at ~6.8 MB of base64 instead of ~19.5 MB, and the renderer unpacks it
 * with the platform's own DecompressionStream.
 *
 * Returns the path to the gzipped wasm.
 */
export function prepareWasm() {
	const require = createRequire(import.meta.url);
	const src = require.resolve('@imagemagick/magick-wasm/magick.wasm');
	const outDir = path.resolve(import.meta.dirname, '..', 'build');
	const out = path.join(outDir, 'magick.wasm.gz');

	fs.mkdirSync(outDir, { recursive: true });
	if (
		fs.existsSync(out) &&
		fs.statSync(out).mtimeMs > fs.statSync(src).mtimeMs
	) {
		return out;
	}

	const gz = zlib.gzipSync(fs.readFileSync(src), { level: 9 });
	fs.writeFileSync(out, gz);
	console.log(`[build] gzipped magick.wasm → ${(gz.length / 1e6).toFixed(1)} MB`);
	return out;
}
