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
        
        for (const pluginFile of files) {
            const pluginFileLower = pluginFile.toLowerCase();
            if (!pluginFileLower.endsWith('.js') || pluginFileLower.endsWith('.test.js')) {
                pluginsLog.warn(`Skipping non-plugin file: '${pluginFile}'`);
                continue;
            }

            const pluginName = path.basename(pluginFile, '.js');
            const pluginPath = path.join(pluginsFolderPath, pluginFile);

            const module = require(pluginPath);
            
            if (module.plugin && typeof module.plugin.init === 'function') {
                await module.plugin.init();
                loadedPlugins[pluginName] = module.plugin;
                pluginsLog.info(`Successfully loaded plugin: ${pluginFile}`);
            } else {
                throw new Error(`Plugin ${pluginFile} does not export a valid plugin object with init function`);
            }
        }

        return loadedPlugins;
    } catch (error) {
        pluginsLog.error({ error }, 'Failed to read plugins directory');
        throw error;
    }
}

/**
 * Retrieves a plugin instance by its name.
 * 
 * @param {string} pluginName - Name of the plugin to retrieve
 * @throws {Error} If plugin is not found
 * @returns {Object} The plugin instance
 */
function getPlugin(pluginName) {
    if (!(pluginName in loadedPlugins)) {
        throw new Error(`Plugin '${pluginName}' not found`);
    }
    return loadedPlugins[pluginName];
}

module.exports = {
    loadPlugins_Async,
    getPlugin,
    get pluginsLog() { return logging.plugins; }
};
