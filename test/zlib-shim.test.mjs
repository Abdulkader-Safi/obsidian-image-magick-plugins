/*
 * The shim that lets safi-image's PNG codec run without node:zlib.
 *
 * Worth its own test because every failure here is silent: fflate's
 * `deflateSync` is raw DEFLATE, node's is zlib-wrapped, and swapping one for
 * the other writes PNGs that no decoder will open. Each case below checks the
 * shim against node's real zlib rather than against itself.
 *
 * Run with: npm test
 */
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { test } from 'node:test';
import { crc32, deflateSync, inflateSync } from '../src/zlib-shim.ts';

const sample = Buffer.from('PNG scanline data '.repeat(200));

test('deflateSync output is zlib-wrapped and node can inflate it', () => {
	const out = deflateSync(sample, { level: 9 });
	// 0x78 is the zlib CMF byte. Raw DEFLATE would not start with it.
	assert.equal(out[0], 0x78);
	assert.deepEqual(Buffer.from(zlib.inflateSync(out)), sample);
});

test('inflateSync reads what node deflated', () => {
	const out = inflateSync(zlib.deflateSync(sample, { level: 9 }));
	assert.deepEqual(Buffer.from(out), sample);
});

test('round-trips through the shim alone', () => {
	assert.deepEqual(Buffer.from(inflateSync(deflateSync(sample))), sample);
});

test('crc32 matches node for the values PNG actually checksums', () => {
	for (const input of [
		sample,
		Buffer.alloc(0),
		Buffer.from([0]),
		Buffer.from('IHDR'),
		// Bytes above 0x7f, where a signed-vs-unsigned table bug would show up.
		Buffer.from([0xff, 0xfe, 0x80, 0x00, 0x7f]),
	]) {
		assert.equal(crc32(input), zlib.crc32(input), `crc32 of ${input.length}B`);
	}
});
