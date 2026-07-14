declare module '*.svelte' {
	import type { Component } from 'svelte';
	const component: Component<Record<string, unknown>>;
	export default component;
}

/** esbuild's base64 loader: the gzipped ImageMagick wasm, inlined into main.js. */
declare module '*.gz' {
	const base64: string;
	export default base64;
}
