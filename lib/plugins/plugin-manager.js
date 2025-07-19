/**
 * @fileoverview Manages loading and initialization of plugins from a specified folder.
 * Provides access to loaded plugins and logging functionality.
 */

const fs = require('node:fs');
const path = require('node:path');
const logging = require('../output/logging');

// Singleton pattern: only one instance of the plugin manager is allowed
let _IS_INITIALIZED = false;
let _LOADED_PLUGINS = {};

/**
 * Loads and initializes plugins from the specified folder.
 * Can only be called once during the application lifecycle.
 * 
 * @param {string} pluginsFolderPath - Path to the folder containing plugin files
 * @throws {Error} If the function is called more than once
 * @returns {Promise<Object>} Dictionary of loaded plugins
 */
async function loadPlugins_Async(pluginsFolderPath) {
    if (_IS_INITIALIZED) {
        throw new Error('Plugin manager has already been initialized');
    }
    _IS_INITIALIZED = true;

    logging.plugins.info(`Loading plugins from folder: ${pluginsFolderPath}`);

    // Scanning plugins folder for valid plugin files (skipped files are logged)
    const resolvedPluginFiles = [];
    try {
        const pluginFiles = getValidPluginFiles(pluginsFolderPath);
        resolvedPluginFiles.push(...pluginFiles);
    } catch (error) {
        logging.plugins.error({ error }, 'Failed to read plugins directory');
        throw error;
    }

    // Attempting to load plugins from resolved file paths
    for (const pluginFilePath of resolvedPluginFiles) {
        const pluginFileName = path.basename(pluginFilePath);
        const pluginName = path.basename(pluginFilePath, '.js');

        try {
            // Loaading module from the file
            const module = require(pluginFilePath);
            
            // Ensuring the imported plugin object has init_Async and using it for initialization
            if (module.plugin && module.plugin.init_Async && typeof module.plugin.init_Async === 'function') {
                await module.plugin.init_Async();
                _LOADED_PLUGINS[pluginName] = module.plugin;
                logging.plugins.info(`Successfully loaded plugin: ${pluginName} from "${pluginFileName}"`);
            } else {
                throw new Error(`Plugin ${pluginFileName} does not export a valid plugin object with init_Async function`);
            }
        } catch (error) {
            logging.plugins.error({ error }, `Failed to load plugin: ${pluginFileName}`);
            throw error;
        }
    }

    return _LOADED_PLUGINS;
}

function getValidPluginFiles(pluginsFolderPath) {
    const files = fs.readdirSync(pluginsFolderPath);
    const pluginFiles = [];
    for (const file of files) {
        const pluginFileLower = file.toLowerCase();
        if (!pluginFileLower.endsWith('.js') || pluginFileLower.endsWith('.test.js')) {
            logging.plugins.warn(`Skipping non-plugin file: '${file}'`);
            continue;
        }
        pluginFiles.push(path.join(pluginsFolderPath, file));
    }
    return pluginFiles;
}

/**
 * Retrieves a plugin instance by its name.
 * 
 * @param {string} pluginName - Name of the plugin to retrieve
 * @throws {Error} If plugin is not found
 * @returns {Object} The plugin instance
 */
function getPlugin(pluginName) {
    if (!(pluginName in _LOADED_PLUGINS)) {
        throw new Error(`Plugin '${pluginName}' not found`);
    }
    return _LOADED_PLUGINS[pluginName];
}

module.exports = {
    loadPlugins_Async,
    getPlugin
};
