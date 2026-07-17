/**
 * Stands in for `node:zlib`, which safi-image's PNG codec imports for its
 * synchronous inflate/deflate/crc32. Obsidian mobile has no node builtins, and
 * the manifest is not desktop-only, so esbuild aliases `node:zlib` to this.
 *
 * The web platform's own DecompressionStream is not usable here: the codec's
 * calls are synchronous and the streams are not.
 *
 * fflate's `zlibSync`/`unzlibSync` are the zlib-wrapped pair, matching what
 * node's `deflateSync`/`inflateSync` produce. fflate's similarly-named
 * `deflateSync` emits raw DEFLATE with no zlib header, which a PNG decoder
 * cannot read; test/zlib-shim.test.mjs pins the distinction.
 */
import { unzlibSync, zlibSync } from 'fflate';

type Level = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export function inflateSync(data: Uint8Array): Uint8Array {
	return unzlibSync(data);
}

export function deflateSync(
	data: Uint8Array,
	opts?: { level?: number },
): Uint8Array {
	// node defaults to 6; fflate's default differs, so it is passed explicitly.
	return zlibSync(data, { level: (opts?.level ?? 6) as Level });
}

/**
 * CRC-32 (IEEE), the polynomial PNG uses for its chunk checksums. fflate
 * exports no crc32, so the table is built here once on first use.
 */
let table: Uint32Array | null = null;

function crcTable(): Uint32Array {
	if (table) {
		return table;
	}
	const t = new Uint32Array(256);
	for (let i = 0; i < 256; i++) {
		let c = i;
		for (let k = 0; k < 8; k++) {
			c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		}
		t[i] = c >>> 0;
	}
	table = t;
	return t;
}

/** Returns an unsigned 32-bit checksum, as node's `zlib.crc32` does. */
export function crc32(data: Uint8Array): number {
	const t = crcTable();
	let c = 0xffffffff;
	for (const byte of data) {
		// The index is masked to 0-255 and the table is 256 long, so this cannot
		// miss; the assertion is only to satisfy noUncheckedIndexedAccess.
		c = t[(c ^ byte) & 0xff]! ^ (c >>> 8);
	}
	return (c ^ 0xffffffff) >>> 0;
}
