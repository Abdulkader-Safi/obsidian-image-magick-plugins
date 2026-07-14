// Test entry: re-exports the pure logic plus the engine, so the smoke test can
// bundle the real TypeScript sources instead of a hand-copied stand-in.
export { encodePreset } from '../src/engine';
export { parsePresets, presetOutputPath, resolvePresets } from '../src/presets';
