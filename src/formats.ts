import { MagickFormat } from '@imagemagick/magick-wasm';

export type ImageFormat =
	| 'jpg'
	| 'png'
	| 'webp'
	| 'avif'
	| 'gif'
	| 'tiff'
	| 'bmp';

/** Every ImageFormat value is also its file extension, so there is no map for that. */
export const FORMAT_TO_MAGICK: Record<ImageFormat, MagickFormat> = {
	jpg: MagickFormat.Jpeg,
	png: MagickFormat.Png,
	webp: MagickFormat.WebP,
	avif: MagickFormat.Avif,
	gif: MagickFormat.Gif,
	tiff: MagickFormat.Tiff,
	bmp: MagickFormat.Bmp,
};

/** Formats that ignore the quality setting. */
export const LOSSLESS_FORMATS: ReadonlySet<ImageFormat> = new Set<ImageFormat>([
	'png',
	'gif',
	'bmp',
	'tiff',
]);

/** Vault extensions the plugin offers to open. Superset of what it can write. */
export const IMAGE_EXTENSIONS = [
	'png',
	'jpg',
	'jpeg',
	'webp',
	'gif',
	'bmp',
	'tiff',
	'tif',
	'avif',
	'heic',
	'heif',
];

export function clampQuality(q: unknown): number {
	const n = typeof q === 'number' && Number.isFinite(q) ? q : 85;
	return Math.max(1, Math.min(100, Math.round(n)));
}

/** Maps a source file extension or ImageMagick format name onto an ImageFormat. */
export function guessFormat(raw: string): ImageFormat {
	switch (raw.toLowerCase()) {
		case 'jpeg':
		case 'jpg':
			return 'jpg';
		case 'webp':
			return 'webp';
		case 'avif':
			return 'avif';
		case 'gif':
			return 'gif';
		case 'tiff':
		case 'tif':
			return 'tiff';
		case 'bmp':
			return 'bmp';
		default:
			return 'png';
	}
}
