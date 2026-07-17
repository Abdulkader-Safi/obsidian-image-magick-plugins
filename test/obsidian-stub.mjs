// Stands in for the `obsidian` module, which only exists inside the app.
//
// Just enough of PluginSettingTab for settings.ts to extend and run: the base
// class's own getControlValue/setControlValue are overridden by the subclass,
// and `update()` is the app's re-render hook, recorded here so a test can check
// it was called.
export class PluginSettingTab {
	constructor(app, plugin) {
		this.app = app;
		this.plugin = plugin;
		this.updates = 0;
	}

	update() {
		this.updates++;
	}
}
