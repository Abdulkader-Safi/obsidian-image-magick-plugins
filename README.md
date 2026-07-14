# Svelte plugin template

A starter template for building Obsidian plugins with Svelte 5, Tailwind CSS v4, and shadcn-svelte. Clone it, rename a few fields, and start building.

By [Abdulkader Safi](https://abdulkadersafi.com).

## What you get

- TypeScript plugin entry (`src/main.ts`) with clean lifecycle handling.
- A Svelte 5 app mounted into an Obsidian `ItemView` (`src/ui/`).
- Tailwind CSS v4 wired up, with Preflight disabled so it never fights Obsidian's own styling.
- shadcn-svelte components that inherit your active Obsidian theme and light/dark mode automatically (see `src/ui/lib/`).
- A ribbon icon, a command, and a settings tab as working examples.
- esbuild bundling, ESLint with `eslint-plugin-obsidianmd`, and GitHub Actions for lint and release.

## Use this template

1. Click **Use this template** on GitHub (or clone this repo) and give your plugin a name.
2. Update `manifest.json`: set your own `id`, `name`, `description`, `author`, `authorUrl`, and `fundingUrl`. The `id` is permanent once released, so pick carefully.
3. Update `package.json`: `name`, `description`, `author`, and `repository`.
4. Rename the example pieces to match your plugin:
   - The plugin class in `src/main.ts` (`SveltePluginTemplate`).
   - The view in `src/ui/ExampleView.ts` and its `EXAMPLE_VIEW_TYPE`.
   - The settings interface and tab in `src/settings.ts`.
5. Build your UI in `src/ui/App.svelte` and add more Svelte components.

## Develop

Requires Node.js v18 or newer (`node --version`).

```bash
npm install      # install dependencies
npm run dev      # compile JS and CSS in watch mode
npm run build    # production build
npm run lint     # lint with ESLint
```

`npm run dev` runs two watchers: esbuild compiles `src/main.ts` to `main.js`, and the Tailwind CLI compiles `src/styles.css` to `styles.css`. Reload Obsidian to pick up changes.

For local testing, develop inside your vault at `VaultFolder/.obsidian/plugins/your-plugin-id/`, then enable the plugin in **Settings → Community plugins**.

## How the styling works

Tailwind's Preflight reset is intentionally left out so Tailwind does not override Obsidian's UI. The Svelte app mounts into an `.app-root` element, and shadcn-svelte's tokens (`--primary`, `--background`, and so on) are mapped onto Obsidian's theme variables in `src/styles.css`. Because they resolve at runtime, switching theme or light/dark mode recolors every component with no rebuild.

## Release

- Bump `version` in `manifest.json` (Semantic Versioning) and update `versions.json` to map plugin version to minimum app version. Running `npm version patch` (or `minor` / `major`) does both.
- Push a tag that exactly matches the `manifest.json` version, with no leading `v`. The release workflow builds the plugin and creates a draft GitHub release with `main.js`, `manifest.json`, and `styles.css` attached.
- Publish the draft release.

## Submit to the community catalog

- Read the [plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines).
- Make sure your repo has a `README.md` and a published release.
- Open a pull request at [obsidian-releases](https://github.com/obsidianmd/obsidian-releases) to add your plugin.

## Funding

If this template saves you time, you can support the work at [ko-fi.com/abdulkadersafi](https://ko-fi.com/abdulkadersafi).

## License

Released under the 0BSD license. See [LICENSE](LICENSE).

## References

- [Obsidian API docs](https://docs.obsidian.md)
- [Svelte](https://svelte.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn-svelte](https://shadcn-svelte.com)
