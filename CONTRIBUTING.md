# Contributing

Bug reports, feature requests and pull requests are all welcome.

## Reporting a bug

Open an issue with the Obsidian version, your platform (desktop or mobile), and what the image was: its format and rough dimensions. Image bugs are usually specific to one of those, so that detail saves a round trip. If the console printed anything (Ctrl/Cmd+Shift+I), include it.

## Suggesting a feature

Open an issue and describe the problem you are trying to solve rather than the solution you have in mind. The README lists what is already planned.

## Development

```bash
npm install
npm run dev     # rebuild main.js on save
npm run build   # typecheck, then production bundle
npm test        # encodes a real image through the wasm
npm run lint
```

To try your build, point the repo at a real vault: clone it into `<vault>/.obsidian/plugins/image-magick/`, run `npm run dev`, and reload Obsidian. The plugin needs `main.js`, `manifest.json` and `styles.css` in that folder.

## Before you open a pull request

Run all three, and say in the PR that you did:

```bash
npm run build
npm run lint
npm test
```

`npm run lint` includes `eslint-plugin-obsidianmd`, which enforces Obsidian's own plugin rules. Do not silence one of its rules with an inline `eslint-disable`. Obsidian's automated review rejects disabled rules, so a disable comment that passes locally will fail the plugin scorecard. Change the code instead.

## Things worth knowing about this codebase

- The ImageMagick engine is WebAssembly, gzipped and inlined into `main.js` at build time by `scripts/prepare-wasm.mjs`. Obsidian only ever downloads `main.js`, `manifest.json` and `styles.css`, so the engine cannot ship as a separate file.
- ImageMagick runs synchronously on the renderer's only thread, so anything it does during a drag freezes the UI. Rotate and flip are therefore done in CSS, and the expensive full-resolution size measurement is debounced. Keep new work off the interactive path.
- Styling is plain CSS in `styles.css`, written against Obsidian's own CSS variables so the plugin follows the user's theme. There is no CSS build step, and no Tailwind.
