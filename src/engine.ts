import {
	initializeImageMagick,
	Magick,
	MagickFormat,
	MagickGeometry,
	MagickImage,
	MagickImageInfo,
	type IMagickImage,
} from '@imagemagick/magick-wasm';
// Base64 of the gzipped engine, inlined by esbuild's `.gz` loader at build time.
import MAGICK_WASM_GZ from '../build/magick.wasm.gz';
import {
	FORMAT_TO_MAGICK,
	LOSSLESS_FORMATS,
	clampQuality,
	guessFormat,
} from './formats';
import type { ImageFormat } from './formats';

const PREVIEW_LONG_EDGE = 1600;

export interface CropRect {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface ResizeSpec {
	width: number;
	height: number;
	lockAspect: boolean;
}

export interface SourceInfo {
	/** Vault-relative path, or null for a buffer-only (drag-dropped) source. */
	path: string | null;
	name: string;
	width: number;
	height: number;
	format: string;
}

/** Applied in this order: crop → rotate → flip → resize → format/quality. */
export interface EditorState {
	crop: CropRect | null;
	rotate: number;
	flipH: boolean;
	flipV: boolean;
	resize: ResizeSpec | null;
	format: ImageFormat;
	quality: number;
}

/** A saved, reusable optimization pipeline, applied without opening the editor. */
export interface OptimizePreset {
	name: string;
	/** 1-100. Ignored for lossless formats. */
	quality: number;
	format: ImageFormat;
	/** Downscale the longest edge to this. null keeps the source size. Never upscales. */
	maxLongEdge: number | null;
	/** Drop EXIF, GPS, and colour profiles before encoding. */
	stripMetadata: boolean;
	output: 'suffix' | 'overwrite';
	/** Filename suffix when output is "suffix", e.g. ".optimized". */
	suffix: string;
}

let initPromise: Promise<void> | null = null;

/**
 * Unpacks the gzipped wasm that esbuild inlined as base64. Obsidian only ships
 * main.js, manifest.json and styles.css to users, so the engine has to live
 * inside the bundle; gzip keeps that at ~6.8 MB instead of ~19.5 MB, and the
 * renderer's own DecompressionStream expands it.
 */
async function inflateWasm(): Promise<Uint8Array> {
	const binary = atob(MAGICK_WASM_GZ);
	const gz = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		gz[i] = binary.charCodeAt(i);
	}
	const stream = new Blob([gz])
		.stream()
		.pipeThrough(new DecompressionStream('gzip'));
	return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Initializes ImageMagick once, lazily: nothing is decoded until an image is opened. */
function ensureInitialized(): Promise<void> {
	if (!initPromise) {
		initPromise = (async () => {
			await initializeImageMagick(await inflateWasm());
		})();
	}
	return initPromise;
}

let cachedWritableFormats: Set<ImageFormat> | null = null;

/**
 * The subset of ImageFormat this build can actually encode, so the UI can hide
 * formats that would only fail at save time. AVIF is the one that varies.
 */
export async function getWritableFormats(): Promise<Set<ImageFormat>> {
	if (cachedWritableFormats) {
		return cachedWritableFormats;
	}
	let set = new Set<ImageFormat>();
	try {
		await ensureInitialized();
		for (const info of Magick.supportedFormats) {
			if (!info.supportsWriting) {
				continue;
			}
			const raw = String(info.format).toLowerCase();
			// guessFormat() falls back to png, so only take names it truly knows.
			if (raw === 'png' || guessFormat(raw) !== 'png') {
				set.add(guessFormat(raw));
			}
		}
	} catch {
		// Probing failed; the fallback below covers it.
	}
	if (set.size === 0) {
		set = new Set<ImageFormat>(['jpg', 'png', 'webp', 'gif', 'tiff', 'bmp']);
	}
	cachedWritableFormats = set;
	return set;
}

/** What a save would actually produce. */
export interface PreviewResult {
	width: number;
	height: number;
	sizeKb: number;
}

function bytesToBase64(bytes: Uint8Array): string {
	let binary = '';
	const chunk = 0x8000;
	for (let i = 0; i < bytes.length; i += chunk) {
		binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
	}
	return btoa(binary);
}

/**
 * Decodes `bytes` into a fresh image, runs `fn`, and always disposes the native
 * handle. Re-decoding per call keeps the pipeline non-destructive without
 * juggling clone lifetimes; decode is cheap next to encode, and previews are
 * debounced.
 */
function withImage<T>(bytes: Uint8Array, fn: (image: IMagickImage) => T): T {
	const image = MagickImage.create(bytes);
	try {
		return fn(image);
	} finally {
		image.dispose();
	}
}

function applyPipeline(
	image: IMagickImage,
	state: EditorState,
	opts: { skipCrop?: boolean },
): void {
	if (state.crop && !opts.skipCrop) {
		const w = Math.max(1, Math.round(state.crop.w));
		const h = Math.max(1, Math.round(state.crop.h));
		const x = Math.max(0, Math.round(state.crop.x));
		const y = Math.max(0, Math.round(state.crop.y));
		image.crop(new MagickGeometry(`${w}x${h}+${x}+${y}`));
		// Crop sets a virtual canvas offset; reset it so the output isn't padded.
		image.resetPage();
	}
	if (state.rotate !== 0) {
		image.rotate(state.rotate);
	}
	// ImageMagick: flip = vertical (top-bottom), flop = horizontal (left-right).
	if (state.flipV) {
		image.flip();
	}
	if (state.flipH) {
		image.flop();
	}
	if (state.resize) {
		const w = Math.max(1, Math.round(state.resize.width));
		const h = Math.max(1, Math.round(state.resize.height));
		// `!` forces exact dimensions (ignore aspect ratio).
		image.resize(new MagickGeometry(`${w}x${h}!`));
	}
}

function encodeFrom(bytes: Uint8Array, state: EditorState): Uint8Array {
	return withImage(bytes, (image) => {
		applyPipeline(image, state, {});
		if (!LOSSLESS_FORMATS.has(state.format)) {
			image.quality = clampQuality(state.quality);
		}
		return image.write(FORMAT_TO_MAGICK[state.format], (d) =>
			Uint8Array.from(d),
		);
	});
}

/** Stateless one-shot encode, used for bulk saves. */
export async function encodeBytes(
	bytes: Uint8Array,
	state: EditorState,
): Promise<Uint8Array> {
	await ensureInitialized();
	return encodeFrom(bytes, state);
}

/** Applies a preset's pipeline (resize, strip, quality, format) to `bytes`. */
export async function encodePreset(
	bytes: Uint8Array,
	preset: OptimizePreset,
): Promise<Uint8Array> {
	await ensureInitialized();
	return withImage(bytes, (image) => {
		if (preset.maxLongEdge) {
			const edge = preset.maxLongEdge;
			// `>` shrinks only if larger, preserving aspect ratio.
			image.resize(new MagickGeometry(`${edge}x${edge}>`));
		}
		if (preset.stripMetadata) {
			image.strip();
		}
		if (!LOSSLESS_FORMATS.has(preset.format)) {
			image.quality = preset.quality;
		}
		return image.write(FORMAT_TO_MAGICK[preset.format], (d) =>
			Uint8Array.from(d),
		);
	});
}

/**
 * Wraps ImageMagick for a single edit session: holds the source bytes and
 * re-applies the declarative EditorState for each preview and encode.
 *
 * ImageMagick runs synchronously on the renderer's only thread, so anything it
 * does during a slider drag freezes the UI. That is why previews never touch
 * the full-resolution source: `previewBytes` holds a downscaled copy, decoded
 * once per file, and every interactive render works off that. Measuring the
 * real output size is the expensive part and is deliberately a separate call
 * (see `measure`), so callers can run it only once the user stops moving.
 */
export class ImageService {
	private bytes: Uint8Array | null = null;
	/** Downscaled PNG of the source, the basis for every interactive preview. */
	private previewBytes: Uint8Array | null = null;
	private sourceInfo: SourceInfo | null = null;

	async loadFromBytes(
		bytes: Uint8Array,
		path: string | null,
		displayName: string,
	): Promise<SourceInfo> {
		await ensureInitialized();
		// Own a stable copy — the incoming view may be backed by transferred memory.
		this.bytes = bytes.slice();
		const info = MagickImageInfo.create(this.bytes);
		this.sourceInfo = {
			path,
			name: displayName,
			width: info.width,
			height: info.height,
			format: String(info.format),
		};

		// Pay the full-resolution decode once, here, instead of on every keystroke.
		this.previewBytes = withImage(this.bytes, (image) => {
			// `>` shrinks only if larger than the box, preserving aspect ratio.
			image.resize(
				new MagickGeometry(`${PREVIEW_LONG_EDGE}x${PREVIEW_LONG_EDGE}>`),
			);
			return image.write(MagickFormat.Png, (d) => Uint8Array.from(d));
		});

		return this.sourceInfo;
	}

	/**
	 * Renders the visual preview. Depends on `resize` and nothing else.
	 *
	 * Four of the seven pipeline steps deliberately do NOT belong here:
	 *
	 *  - rotate and flip are pure visual transforms, so the preview element does
	 *    them in CSS for free. Asking ImageMagick to rotate a 1600px image costs
	 *    ~260 ms, which is what made dragging the angle slider stutter.
	 *  - format and quality never affected this image anyway: the preview is
	 *    always written as PNG so its colours are exact. They only change the
	 *    output size, which `measure` reports.
	 *  - crop is skipped so the user can see the whole frame and drag the crop
	 *    box around on it.
	 *
	 * What is left runs against the downscaled copy, never the full-size source.
	 */
	async renderPreview(resize: ResizeSpec | null): Promise<string> {
		await ensureInitialized();
		if (!this.previewBytes) {
			throw new Error('No image loaded');
		}
		return withImage(this.previewBytes, (image) => {
			if (resize) {
				// Scale the target into preview space: same shape, a fraction of the
				// pixels. Upscaling the small copy back to the real target would undo
				// the whole point of having it.
				const longest = Math.max(resize.width, resize.height);
				const scale = Math.min(1, PREVIEW_LONG_EDGE / Math.max(1, longest));
				const w = Math.max(1, Math.round(resize.width * scale));
				const h = Math.max(1, Math.round(resize.height * scale));
				image.resize(new MagickGeometry(`${w}x${h}!`));
			}
			image.resize(
				new MagickGeometry(`${PREVIEW_LONG_EDGE}x${PREVIEW_LONG_EDGE}>`),
			);
			const base64 = image.write(MagickFormat.Png, (d) => bytesToBase64(d));
			return `data:image/png;base64,${base64}`;
		});
	}

	/**
	 * The dimensions and byte size a save would really produce, crop included.
	 *
	 * This encodes the full-resolution image, which is the slowest thing the
	 * plugin does. Call it when the user pauses, never mid-drag.
	 */
	async measure(state: EditorState): Promise<PreviewResult> {
		await ensureInitialized();
		if (!this.bytes) {
			throw new Error('No image loaded');
		}
		return withImage(this.bytes, (image) => {
			applyPipeline(image, state, {});
			const width = image.width;
			const height = image.height;
			if (!LOSSLESS_FORMATS.has(state.format)) {
				image.quality = clampQuality(state.quality);
			}
			const len = image.write(
				FORMAT_TO_MAGICK[state.format],
				(d) => d.byteLength,
			);
			return { width, height, sizeKb: Math.round(len / 1024) };
		});
	}

	async encode(state: EditorState): Promise<Uint8Array> {
		await ensureInitialized();
		if (!this.bytes) {
			throw new Error('No image loaded');
		}
		return encodeFrom(this.bytes, state);
	}
}
