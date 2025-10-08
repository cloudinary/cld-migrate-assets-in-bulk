#!/usr/bin/env node
/**
 * @fileoverview This is the main entry point for the CLI tool.
 * 
 * 💡 Edit the `__input-to-api-payload.js` module to customize how CSV input is "translated" to Cloudinary API payload
 * 
 * Parses command line parameters and invokes the main processing loop.
 * 💡 Should you need to edit processing loop - edit the `./lib/main-loop.js` module
 * 
 * Requires CLOUDINARY_URL environment variable to be set (either explicitly or via a .env file)
 * 
 * Produces log file with two types of records: `script` (flow="script") and `payload` (flow="payload").
 * The `payload` records contain:
 *  - input (row from CSV file)
 *  - payload (parameters for Cloudinary API produced from the input)
 *  - response (Cloudinary API response)
 *  - summary (operation status and error message if it failed)
 * 
 * `payload` records from the log file are then used to produce the operation report.
 */
const { Command } = require('commander');
const mainLoop = require('./lib/main-loop');
const cliHelpers = require('./lib/input/cli-helpers');
const migrateAssetPayload = require('./lib/payload/migrate');
const confirmationRoutines = require('./lib/input/confirmation-routines');

const __program = new Command();

//
// Configure command line arguments shared across all commands
//
function yieldDefaultArgsCommand(program) {
    const defaultArgsCommand = program.createCommand()
        .requiredOption(
            '-f, --from-csv-file <path>', 
            'CSV file detailing assets to import',
            cliHelpers.inputFileMustExist)
        .requiredOption(
            '-o, --output-folder <path>', 
            'Folder name for the migration log and report files',
            cliHelpers.exitIfAlreadyExistsOrCreateNew)
        .requiredOption(
            '-c, --max-concurrent-uploads <number>', 
            'Max number of concurrent uploads',
            cliHelpers.ensureDoesNotExceedMax)
        .helpOption('-h, --help', 'Display help for command');
    return defaultArgsCommand;
}


/**
 * Configures prorgram parameters exposed to the user via CLI
 * 
 * @param {Command} program 
 */
function configureProgram(program) {
    program
        .name('cld-bulk')
        .description('Extensible CLI tool to efficiently translate CSV file records into Cloudinary API operations')
        .version('3.0.0');
}


function configureCommands(program) {
    const migrateCmd = yieldDefaultArgsCommand(program);
    migrateCmd.name('migrate')
        .description('Migrate assets into Cloudinary in bulk')
        .addHelpCommand(false)
        .showHelpAfterError()
        .allowUnknownOption(false)
        .action(async (cliArgs, cliCommand) => {
            await mainLoop.loopOverCsvInput_Async(
                cliArgs,
                cliCommand,
                migrateAssetPayload,
                confirmationRoutines
            );
        });
    program.addCommand(migrateCmd);
}


configureProgram(__program);
configureCommands(__program);
__program.parse(process.argv);