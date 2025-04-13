/**
 * @fileoverview Manages loading and initialization of plugins from a specified folder.
 * Provides access to loaded plugins and logging functionality.
 */

const fs = require('node:fs');
const path = require('node:path');
const logging = require('../output/logging');

// Singleton pattern: only one instance of the plugin manager is allowed
let isInitialized = false;
let loadedPlugins = {};

/**
 * Loads and initializes plugins from the specified folder.
 * Can only be called once during the application lifecycle.
 * 
 * @param {string} pluginsFolderPath - Path to the folder containing plugin files
 * @throws {Error} If the function is called more than once
 * @returns {Promise<Object>} Dictionary of loaded plugins
 */
async function loadPlugins_Async(pluginsFolderPath) {
    if (isInitialized) {
        throw new Error('Plugin manager has already been initialized');
    }
    isInitialized = true;

    const pluginsLog = logging.plugins;
    pluginsLog.info(`Loading plugins from folder: ${pluginsFolderPath}`);

    try {
        const files = fs.readdirSync(pluginsFolderPath);
        
        for (const file of files) {
            const fileLower = file.toLowerCase();
            if (!fileLower.endsWith('.js') || fileLower.endsWith('.test.js')) {
                pluginsLog.warn(`Skipping non-plugin file: '${file}'`);
                continue;
            }

            const pluginName = path.basename(file, '.js');
            const pluginPath = path.join(pluginsFolderPath, file);

            try {
                const module = require(pluginPath);
                
                if (module.plugin && typeof module.plugin.init === 'function') {
                    await module.plugin.init();
                    loadedPlugins[pluginName] = module.plugin;
                    pluginsLog.info(`Successfully loaded plugin: ${pluginName}`);
                } else {
                    throw new Error(`Plugin ${pluginName} does not export a valid plugin object with init function`);
                }
            } catch (error) {
                pluginsLog.error({ error }, `Failed to load plugin: ${pluginName}`);
            }
        }

        return loadedPlugins;
    } catch (error) {
        pluginsLog.error({ error }, 'Failed to read plugins directory');
        throw error;
    }
}

module.exports = {
    loadPlugins_Async,
    get pluginsLog() { return logging.plugins; }
};
