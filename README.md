# ImageMagick for Obsidian

Optimize images inside your vault. Resize, crop, rotate, compress and convert formats, without leaving Obsidian and without uploading anything anywhere.

Powered by [magick-wasm](https://github.com/dlemstra/magick-wasm), the WebAssembly build of ImageMagick 7. This is the Obsidian port of the [VS Code extension](https://github.com/Abdulkader-Safi/vscode-extensions-ImageMagick).

By [Abdulkader Safi](https://abdulkadersafi.com).

![Plugin screenshot](screenshot.png)

## Features

- **Resize**: width and height inputs, lock aspect ratio, quick percentage presets.
- **Crop**: drag a region on the preview, or type exact coordinates.
- **Rotate and flip**: 90° presets, a free-angle slider, horizontal and vertical flip.
- **Compress**: quality slider (1-100) for lossy formats.
- **Change format**: JPEG, PNG, WebP, GIF, TIFF, BMP, and AVIF where the bundled binary supports it.
- **Live preview** with an output size estimate.
- **Save** to any vault path, with a smart default (`photo.optimized.webp`) that never overwrites your source.
- **Presets**: right-click an image (or a multi-selection) and pick **Optimize with preset** to write optimized output straight into the vault, no editor. A preset holds a format, quality, max size, and metadata-strip choice. Edit them in the plugin settings, or use **Save as preset** in the editor.
- **Bulk edit**: select several images, tune the pipeline on one, and **Save all** applies it to every file.

## Usage

1. **From the file explorer**: right-click any image, then **Optimize with ImageMagick** or **Optimize with preset**.
2. **From the command palette**: **ImageMagick: Open image**, then pick a file.
3. **Drag and drop**: open the view, then drag an image in from outside Obsidian.

## Supported formats

Reads anything ImageMagick can read. Writes whatever the bundled wasm can encode, typically JPEG, PNG, WebP, GIF, TIFF and BMP. The plugin probes the available encoders on first use and only offers formats it can actually produce.

## Development

```bash
npm install
npm run dev     # rebuild main.js on save
npm run build   # typecheck, then production bundle
npm test        # encodes a real image through the wasm
npm run lint
```

The UI is Svelte 5 mounted into an Obsidian `ItemView`. Styling is plain CSS in `styles.css`, written against Obsidian's own CSS variables, so the editor follows the active theme and light/dark mode with no rebuild. There is no CSS build step.

### Why main.js is large

Obsidian only downloads `main.js`, `manifest.json` and `styles.css` when installing a plugin, so the 14 MB ImageMagick wasm has to live inside `main.js`. The build gzips it and inlines it as base64 (about 6.8 MB), and the renderer expands it with the platform's own `DecompressionStream` the first time you open an image. Nothing is fetched at runtime, and no image ever leaves your machine.

## License

MIT
