/**
 * @fileoverview
 *
 * A module to parse application log files [assumed to be in JSONL (JSON Lines) format] 
 * Given the path to a log file, it loads file content into memory and provides functionality to:
 *   - Access log records by zero-based index.
 *   - Access log records by the value of `payload.options.public_id` property of the log record
 *     (specifically for records where the `flow` property is set to "payload").
 */

const fs = require('fs');
const readline = require('readline');

/**
 * 
 * Parses the provided log file and returns an object with methods to access 
 * the parsed log records either by index or by public_id.
 *
 * @param {string} filePath - Path to the log file in JSONL format.
 * 
 * @return {object} An object containing:
 *   - getLength: A function that returns the total number of log records.
 *   - getEntryByIndex: A function that takes an index and returns the log record at that index.
 *   - getEntriesByPublicId: A function that takes a public_id and returns an array of log records 
 *                            associated with that public_id.
 * 
 * Assumptions:
 *   - Log records of interest are structured in a way that they contain the properties:
 *     `flow`, `payload`, `payload.options`, and `payload.options.public_id`.
 *   - There can be multiple log records associated with a single public_id.
 *
 * @throws Will throw an error if a line in the log file cannot be parsed to a JSON object.
 */
async function parseLogFile_Async(filePath) {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const logs = [];
    const pubId2LogsIndex = {};

    for await (const line of rl) {
        try {
            const logObj = JSON.parse(line);
            
            // Add parsed log record to logs array, persist the index at which it was added
            const currentLogIndex = logs.push(logObj) - 1;

            // Check if the log has the required structure and add it to the logsByPublicId object
            if (logObj.flow === 'payload' && logObj.payload && logObj.payload.options && logObj.payload.options.public_id) {
                const publicId = logObj.payload.options.public_id;
                if (! pubId2LogsIndex[publicId]) {
                    pubId2LogsIndex[publicId] = [];
                }
                pubId2LogsIndex[publicId].push(currentLogIndex);
            }
        } catch (error) {
            throw `Failed to parse line: '${line}'`;
        }
    }

    return {
        getAll: () => logs,
        getPath: () => filePath,
        getLength: () => logs.length,
        getEntryByIndex: (index) => logs[index], // There can be only one log entry per index
        getEntriesByPublicId: (publicId) => {    // But there can be multiple log entries per public_id
            return pubId2LogsIndex[publicId] ?
                pubId2LogsIndex[publicId].map((index) => logs[index]) 
                : [];
        }
    };
}

module.exports = {
    parseLogFile_Async
}
