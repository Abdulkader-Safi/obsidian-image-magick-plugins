/*
 * The edit pipeline, driven through the same engine calls the editor makes.
 *
 * These are dimension checks rather than pixel checks on purpose: the library
 * has its own 567 tests for whether a resample is correct. What is worth
 * pinning here is the wiring this plugin owns — that EditorState reaches
 * safi-image as the stages it names, and that the sizes the editor reports
 * describe the bytes it would really write.
 *
 * Run with: npm test
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test, before } from 'node:test';
import esbuild from 'esbuild';
import { createImage, decode, encode, probe } from 'safi-image';
import { nodeShims } from '../scripts/node-shims.mjs';

let mod;

before(async () => {
	const outfile = path.join(
		await fs.mkdtemp(path.join(os.tmpdir(), 'im-engine-')),
		'entry.mjs',
	);
	await esbuild.build({
		entryPoints: [path.join(import.meta.dirname, 'entry.ts')],
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		mainFields: ['browser', 'module', 'main'],
		conditions: ['browser'],
		plugins: [nodeShims()],
		outfile,
		logLevel: 'silent',
	});
	mod = await import(outfile);
});

const BASE = {
	crop: null,
	rotate: 0,
	flipH: false,
	flipV: false,
	resize: null,
	format: 'png',
	quality: 85,
};

/** Varying pixels, so a lossy encode has something to chew on. */
function noisy(w, h) {
	const img = createImage(w, h);
	for (let i = 0; i < img.data.length; i += 4) {
		const px = i / 4;
		const x = px % w;
		const y = Math.floor(px / w);
		img.data[i] = (x * 3) % 256;
		img.data[i + 1] = (y * 5) % 256;
		img.data[i + 2] = (x ^ y) % 256;
		img.data[i + 3] = 255;
	}
	return img;
}

/**
 * Wraps a JPEG in an APP1 segment declaring `orientation`, the way a phone
 * does. Built by hand because safi-image writes no EXIF, and this is the one
 * input where the header's dimensions and the decoded pixels' disagree.
 */
function withExifOrientation(jpeg, orientation) {
	const tiff = [
		0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, // little-endian, 42, IFD0 at offset 8
		0x01, 0x00, //                                     one entry
		0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, // tag 0x0112 Orientation, SHORT, count 1
		orientation, 0x00, 0x00, 0x00, //                  the value, inline
		0x00, 0x00, 0x00, 0x00, //                         no next IFD
	];
	const payload = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, ...tiff]; // "Exif\0\0"
	const len = payload.length + 2; // the length field counts itself
	return new Uint8Array([
		0xff, 0xd8, //                                      SOI
		0xff, 0xe1, (len >> 8) & 0xff, len & 0xff, ...payload, // APP1, straight after SOI
		...jpeg.subarray(2),
	]);
}

test('every writable format round-trips at the source size', async () => {
	const png = await encode(noisy(400, 200), 'png');
	const formats = await mod.getWritableFormats();
	// The list the UI offers. AVIF and HEIC are deliberately not on it.
	assert.deepEqual(
		[...formats].sort(),
		['bmp', 'gif', 'jpg', 'png', 'tiff', 'webp'],
	);
	for (const format of formats) {
		const out = await mod.encodeBytes(png, { ...BASE, format, quality: 80 });
		assert.deepEqual(probe(out), { width: 400, height: 200 }, `${format} dims`);
	}
});

test('each EditorState stage reaches the pipeline', async () => {
	const png = await encode(noisy(400, 200), 'png');

	assert.deepEqual(
		probe(await mod.encodeBytes(png, { ...BASE, crop: { x: 10, y: 20, w: 100, h: 50 } })),
		{ width: 100, height: 50 },
		'crop',
	);
	assert.deepEqual(
		probe(await mod.encodeBytes(png, { ...BASE, rotate: 90 })),
		{ width: 200, height: 400 },
		'rotate 90 swaps the edges',
	);
	assert.deepEqual(
		probe(await mod.encodeBytes(png, { ...BASE, resize: { width: 123, height: 45, lockAspect: false } })),
		{ width: 123, height: 45 },
		'resize is exact, ignoring aspect ratio',
	);

	// Flip has no effect on dimensions, so the pixels are the only evidence it ran.
	const flipped = await mod.encodeBytes(png, { ...BASE, flipH: true });
	assert.deepEqual(probe(flipped), { width: 400, height: 200 }, 'flip keeps dims');
	assert.notDeepEqual(
		Buffer.from(flipped),
		Buffer.from(await mod.encodeBytes(png, BASE)),
		'flip changed the pixels',
	);
});

test('stages compose in canonical order, not call order', async () => {
	const png = await encode(noisy(400, 200), 'png');
	// crop to 200x100, rotate to 100x200, then resize to exactly 60x30.
	const out = await mod.encodeBytes(png, {
		...BASE,
		crop: { x: 0, y: 0, w: 200, h: 100 },
		rotate: 90,
		flipH: true,
		resize: { width: 60, height: 30, lockAspect: false },
	});
	assert.deepEqual(probe(out), { width: 60, height: 30 });
});

test('measure describes the bytes a save would write', async () => {
	const service = new mod.ImageService();
	await service.loadFromBytes(await encode(noisy(400, 200), 'png'), 'a/b.png', 'b.png');
	const result = await service.measure({
		...BASE,
		format: 'jpg',
		quality: 50,
		crop: { x: 0, y: 0, w: 100, h: 80 },
	});
	assert.deepEqual(
		{ width: result.width, height: result.height },
		{ width: 100, height: 80 },
	);
	assert.ok(result.sizeKb >= 0, 'reports a size');
});

test('loadFromBytes reports the source as the editor sees it', async () => {
	const service = new mod.ImageService();
	const info = await service.loadFromBytes(
		await encode(noisy(400, 200), 'png'),
		'a/b.png',
		'b.png',
	);
	assert.deepEqual(
		{ path: info.path, name: info.name, width: info.width, height: info.height, format: info.format },
		{ path: 'a/b.png', name: 'b.png', width: 400, height: 200, format: 'png' },
	);
});

test('an EXIF-rotated JPEG reports the size its pixels actually have', async () => {
	// The regression this guards: `probe` reads stored dimensions while `decode`
	// bakes in the orientation, so a photo shot upright would report its sides
	// swapped — and every crop rectangle, drawn in the reported space, would
	// land somewhere else in the image.
	const jpeg = await encode(noisy(400, 200), 'jpeg', { quality: 90 });
	const rotated = withExifOrientation(jpeg, 6); // 6 = rotate 90 CW

	// The premise. If safi-image ever stops applying orientation, this fails
	// first and says why, rather than the assertion below looking arbitrary.
	assert.deepEqual(probe(rotated), { width: 400, height: 200 }, 'header is unrotated');
	const decoded = await decode(rotated);
	assert.deepEqual(
		{ w: decoded.width, h: decoded.height },
		{ w: 200, h: 400 },
		'decode applies the orientation',
	);

	const service = new mod.ImageService();
	const info = await service.loadFromBytes(rotated, null, 'rot.jpg');
	assert.deepEqual({ w: info.width, h: info.height }, { w: 200, h: 400 });

	// An unrotated JPEG must not get the swap applied to it.
	const plain = await service.loadFromBytes(jpeg, null, 'plain.jpg');
	assert.deepEqual({ w: plain.width, h: plain.height }, { w: 400, h: 200 });
});

test('preset maxLongEdge shrinks but never grows', async () => {
	const png = await encode(noisy(400, 200), 'png');
	const preset = {
		name: 'p',
		format: 'webp',
		quality: 80,
		maxLongEdge: 100,
		stripMetadata: true,
		output: 'suffix',
		suffix: '.o',
	};
	assert.deepEqual(probe(await mod.encodePreset(png, preset)), { width: 100, height: 50 });
	assert.deepEqual(
		probe(await mod.encodePreset(png, { ...preset, format: 'png', maxLongEdge: 5000 })),
		{ width: 400, height: 200 },
		'never upscales',
	);
});
