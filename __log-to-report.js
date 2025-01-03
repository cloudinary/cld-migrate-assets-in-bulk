/**
 * Yields migration report (CSV) from the migration log file.
 * Uses stream processing to avoid loading the entire log file into memory.
 */
const fs = require('node:fs');
const split2 = require('split2');
const path = require('node:path');
const {stringify} = require('csv-stringify');
const logging = require('./lib/output/logging');

/**
 * 💡Customize this function to suit your needs (e.g. add more fields to the report).
 * 
 * Converts a log line (assumed to be JSONL) to a "flat" JS object.
 * The produced JS object is to be serialized to the output (CSV text)
 * 
 * Ignores all log lines that are not part of the 'migration' flow.
 *
 * Default implementation always includes the input record (from the CSV file) that
 * was used as input for migration operation. This allows to filter the report file
 * and re-use it as input for a subsequent "retry" migration operation for previously
 * failed assets.
 * 
 * @param {*} logLine 
 * @returns {Object} - JS object that represets a CSV row in the migration report
 */
function extractMigrationFlowRecord(logLine) {
    try {
        const logRec = JSON.parse(logLine);

        if (logRec.flow !== 'payload') { return undefined; }

        const inputRec = logRec.input;
        const status = logRec.summary.status;
        let migrationSummaryRec = {
            Cld_Status    : status,
            Cld_Operation : null,
            Cld_Error     : null,
            Cld_PublicId  : null,
            Cld_Etag      : null,
        };
        if (status !== 'MIGRATED') {
            let errInfo = logRec.summary.err;
            if (logRec.summary.err.message) {
                errInfo = logRec.summary.err.message;
            }
            migrationSummaryRec.Cld_Error = errInfo;
        } else {
            // Resolving operation
            let resolvedMigrationOp = 'Uploaded';
            if (logRec.response.existing    === true) { resolvedMigrationOp = 'SkippedAlreadyExists' }
            if (logRec.response.overwritten === true) { resolvedMigrationOp = 'Overwritten' }
 
            migrationSummaryRec.Cld_Operation = resolvedMigrationOp;
            migrationSummaryRec.Cld_PublicId = logRec.response.public_id;
            migrationSummaryRec.Cld_Etag = logRec.response.etag;
        }
        return {...inputRec, ...migrationSummaryRec};
    } catch (err) {
        console.error(err);
    }
}

/**
 * Processes the migration log file (JSONL) and produces the migration report file (CSV).
 */
function log2Report(outputFolder) {
    const logFilePath = logging.getLogFilePath(outputFolder);
    const reportFilePath = path.join(outputFolder, 'report.csv');

    const csvStringifier = stringify({
        header: true
    });

    fs.createReadStream(logFilePath)
        .pipe(split2(extractMigrationFlowRecord))
        .pipe(csvStringifier)
        .pipe(fs.createWriteStream(reportFilePath));

    return reportFilePath;
}

module.exports = {log2Report};