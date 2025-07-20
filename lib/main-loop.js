/**
 * @fileoverview This module implements the processing of input CSV file and translating each record
 * into parameters for the Cloudinary API operation provided via payloadModule.
 * 
 * It uses the async library to limit the number of concurrent operations to the Cloudinary API,
 * logs operations performed by the script and produces report file on completion.
 */

require('dotenv').config(); // Load environment variables from .env file
const path = require('path')
const async = require('async');
const progress = require('./output/progress');
const logging = require('./output/logging');
const pluginManager = require('./plugins/plugin-manager')
const csvReader = require('./input/csv-file-reader');
const cloudinary = require('cloudinary').v2;

/* ℹ️ 👇 Modules intended to be customized */
// Logic to convert each CSV record into parameters for the Cloudinary Upload API
const {input2ApiPayload_Async} = require('../__input-to-api-payload');
// Logic to convert migration log file into migration report
const {log2Report} = require('../__log-to-report');


/**
 * Implements the main loop for bulk-uploading or bulk-applying changes driven by input CSV file.
 * 
 * @param {Object} cliArgs - The arguments provided via command line interface.
 *                             Parameters are parsed by the 'commander' library.
 * @param {Object} cliCommand - The commmand object resolved from the command line arguments by `commander` module.
 * @param {Object} payloadModule - The module that performs the migration operation.
 *                                  It must export a function named 'payloadFunc_Async'
 * @param {Object} confirmationRoutinesModule - The module that contains functions to obtain user confirmation.
 */
async function loopOverCsvInput_Async (cliArgs, cliCommand, payloadModule, confirmationRoutinesModule) {
    // Retrieving required command line parameters passed for the invocation
    const inputCsvFilePath = cliArgs.fromCsvFile;
    const maxConcurrentUploads = cliArgs.maxConcurrentUploads;
    const outputFolder = cliArgs.outputFolder;


    // Set up logging for the loop
    const log = logging.setupLogInFolder(outputFolder);

    await ensureCloudinaryConfigOrExit_Async();

    // Attempt to load plugins
    const pluginsDir = path.resolve(__dirname, '../__plugins')
    await pluginManager.loadPlugins_Async(pluginsDir);

    const operationOptions = {
        operation      : cliCommand.name(),
        dest_cloud     : cloudinary.config().cloud_name,
        parameters     : cliArgs,
        loaded_plugins : pluginManager.listLoadedPlugins(),
    }

    try {
        await confirmationRoutinesModule.confirmOperationOptionsOrExit_Async(operationOptions);
    } catch (err) {
        const msg = 'Migration parameters not confirmed. Terminating';
        console.error(`🛑 ${msg}`);
        logging.script.fatal(operationOptions, msg);
        // Allowing bunyan to "catch up" on writing the log file: https://github.com/trentm/node-bunyan/issues/37
        await new Promise(resolve => setTimeout(resolve, 500));
        process.exit(1);
    }

    logging.script.info(operationOptions, 'Migration parameters confirmed. Starting migration routine');
    const stats = {
        concurrent: 0,
        attempted: 0,
        succeeded: 0,
        failed: 0
    }

    console.log('\n\n ~~~~~~~ 🚚  Processing the CSV input ... ~~~~~~~');

    // Initializing visual progress bar
    await progress.init_Async(inputCsvFilePath);

    // Using async generator to avoid loading the entire input file into memory
    const inputRecordGeneratorAsync = csvReader.getRecordGenerator_Async(inputCsvFilePath);

    // Using async.mapLimit to limit the number of concurrent operations
    await async.mapLimit(inputRecordGeneratorAsync, maxConcurrentUploads, async (input) => {
        let payload = null;
        let plugins_trace = null;
        let response = null;
        let summary = {
            status: 'MIGRATED',
            err: null
        }
        try {
            stats.concurrent += 1;
            stats.attempted += 1;
            ({ payload, plugins_trace } = await input2ApiPayload_Async(input));
            response = await payloadModule.payloadFunc_Async(payload);
            stats.succeeded += 1;
        } catch (err) {
            stats.failed += 1;
            summary.status = 'FAILED';
            summary.err = err;
        } finally {
            logging.payload.info({input, payload, response, summary, plugins_trace});
            progress.update(stats.concurrent, stats.attempted, stats.succeeded, stats.failed);
            stats.concurrent -= 1;
        }
    });
    logging.script.info({stats}, 'Routine complete');
    progress.stop();
    
    console.log(`🏁 Bulk routine complete. Summary: ${JSON.stringify(stats)}}`);
    console.log(`🪵  Log persisted to the file: '${log.logFile}'`);

    await produceMigrationReport_Async(outputFolder);
}


/**
 * Ensures Cloudinary config is set.
 * Reports error and exits process otherwise. 
 */
async function ensureCloudinaryConfigOrExit_Async() {
    if (!cloudinary.config().cloud_name) {
        const message = 'Cloudinary config is not initialized. Please set CLOUDINARY_URL environment variable (explicitly or via .env file).'
        console.error(`🛑 ${message}`);
        logging.script.info(message);
        // Allowing bunyan to "catch up" on writing the log file: https://github.com/trentm/node-bunyan/issues/37
        await new Promise(resolve => setTimeout(resolve, 500));
        process.exit(1);
    }
}


/**
 * Locates report file in the provided output folder.
 * Produces a migration report from the migration log file into the same output folder.
 * @param {string} outputFolder - The script output folder.
 */
async function produceMigrationReport_Async(outputFolder) {
    console.log(`\n\n ~~~~~~~ 📋 Producing migration report ... ~~~~~~~`);
    console.log('⏳ This may take some time for large migration batches');
    // Allowing bunyan to "catch up" on writing the log file: https://github.com/trentm/node-bunyan/issues/37
    await new Promise(resolve => setTimeout(resolve, 1500));
    const reportFile = log2Report(outputFolder);
    console.log(`🏁 Migration report persisted to the file: '${reportFile}'`);
}

module.exports = {
    loopOverCsvInput_Async
}