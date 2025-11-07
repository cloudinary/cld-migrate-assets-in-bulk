/**
 * @fileoverview Implements application logging with bunyan. 
 *
 * If setupLogInFolder has not been called, logging defaults to console methods. 
 * It extends Error.prototype to ensure that all exception details are serialized when logged.
 */

const fs = require('node:fs');
const path = require('node:path');
const bunyan = require('bunyan');

// Singleton pattern: only one instance of the logger is created
let appLogger = null;


// Concept: each flow is intended for a specific type of information
// this is used to filter log entries when needed
const LOG_FLOW ={
    SCRIPT  : 'script',   // messages related to script execution
    PAYLOAD : 'payload',  // messages related to payload processing (migration/update). Used to produce reports.
    PLUGINS : 'plugins'   // messages related to plugins
}


// Store references to module logger instances
let scriptLog = createFallbackConsoleLogger(LOG_FLOW.SCRIPT);
let payloadLog = createFallbackConsoleLogger(LOG_FLOW.PAYLOAD);
let pluginsLog = createFallbackConsoleLogger(LOG_FLOW.PLUGINS);


/**
 * A fallback logger object that just writes to console.
 * We use this until setupLogInFolder initializes real Bunyan loggers.
 */
function createFallbackConsoleLogger(flow) {
    return {
        info:   (...args) => console.log(`[${flow}] `, ...args),
        warn:   (...args) => console.warn(`[${flow}] `, ...args),
        error:  (...args) => console.error(`[${flow}] `, ...args),
        fatal:  (...args) => console.error(`[${flow}] `, ...args),
        debug:  (...args) => console.debug(`[${flow}] `, ...args),
    };
}


/**
 * Creates a child logger for the pluginsLog configured to include 
 * plugin name as the `plugin` field in the log record.
 * 
 * Intended to be used to issue log records on plugin initialization.
 * 
 * @param {string} pluginName - The name of the plugin.
 * @returns {Object} - A wrapper object with the same method signatures as bunyan.
 */
function createPluginLogger(pluginName) {
    if (typeof pluginsLog.child === 'function') {
        return pluginsLog.child({ plugin: pluginName })
    }
    
    // Fallback for console-based logger if bunyan logging is not yet initialized
    return createFallbackConsoleLogger(`plugins:${pluginName}`);
}


/**
 * Configures log output file in the script output folder.
 * Creates loggers for script execution and payload (migration/update) operations.
 * Extends Error.prototype to make sure all exception details are serialized for logging.
 *
 * @param {string} outputFolderPath - The path to the output folder for logs.
 * @returns {Object} - An object containing script logger, payload logger, and log file path.
 */
function setupLogInFolder(outputFolderPath) {
    if (appLogger) {
        throw new Error('Log already setup');
    }

    const logFilePath = getLogFilePath(outputFolderPath);
    // Creating main bunyan logger and setting up log file as the only stream
    appLogger = bunyan.createLogger({
        name:'main',
        streams: [
            {
                path: logFilePath,
                level: 'info'
            }
        ]
    });

    // Adding child loggers to differentiate different information "flows"
    // and filter them out later on when needed
    scriptLog = appLogger.child({ flow: LOG_FLOW.SCRIPT });
    payloadLog = appLogger.child({ flow: LOG_FLOW.PAYLOAD });
    pluginsLog = appLogger.child({ flow: LOG_FLOW.PLUGINS });

    /**
     * Ensuring all exceptions details are serialized when logging
     * https://stackoverflow.com/questions/18391212/is-it-not-possible-to-stringify-an-error-using-json-stringify
     */
    if (!('toJSON' in Error.prototype)) {
        Object.defineProperty(Error.prototype, 'toJSON', {
            value: function () {
                var alt = {};

                Object.getOwnPropertyNames(this).forEach(function (key) {
                    alt[key] = this[key];
                }, this);

                    return alt;
                },
                configurable: true,
                writable: true
            });
    }

    // Returning the log file path to the caller
    return {
        logFile: logFilePath
    }
};

/**
 * Returns script log file path in the provided output folder.
 *
 * @param {string} outputFolder - The path to the script output folder.
 * @returns {string} - Log file path in the output folder.
 */
function getLogFilePath(outputFolder) {
    return path.join(outputFolder, 'log.jsonl');
}

module.exports = { 
    setupLogInFolder,
    getLogFilePath,
    createPluginLogger,

    get script() { return scriptLog; },
    get payload() { return payloadLog; },
    get plugins() { return pluginsLog; },
}