/*
    Yields the migration records for the E2E tests
*/
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const testResources = require('../resources');


const _TEST_ASSET_REFS_POSITIVE = {
    test_asset_ref_remote_small         : 'https://res.cloudinary.com/cld-sol-demo/image/upload/sample.jpg',
    test_asset_ref_local_small_relpath  : testResources.getAssetPathRelativeToAppRoot('sample.jpg'),
    test_asset_ref_local_small_fullpath : testResources.getAssetFullPath('sample.jpg'),
    test_asset_ref_local_large          : testResources.LARGE_VIDEO_FILE_FULLPATH,
    test_asset_ref_remote_large         : 'https://res.cloudinary.com/cld-sol-demo/video/upload/waterfall-video-107mb.mp4',
}

const _TEST_INPUT_POSITIVE = {
    test_http_remote_asset_small    : {Ref: _TEST_ASSET_REFS_POSITIVE.test_asset_ref_remote_small},
    test_local_asset_small_relpath  : {Ref: _TEST_ASSET_REFS_POSITIVE.test_asset_ref_local_small_relpath},
    test_local_asset_small_fullpath : {Ref: _TEST_ASSET_REFS_POSITIVE.test_asset_ref_local_small_fullpath},
    test_local_asset_large          : {Ref: _TEST_ASSET_REFS_POSITIVE.test_asset_ref_local_large},
    test_http_remote_asset_large    : {Ref: _TEST_ASSET_REFS_POSITIVE.test_asset_ref_remote_large},
}

const _TEST_ASSET_REFS_NEGATIVE = {
    test_asset_ref_remote_does_not_exist : 'https://res.cloudinary.com/cld-sol-demo/image/upload/this-asset-does-not-exist.png',
    test_asset_ref_local_does_not_exist  : testResources.getAssetFullPath('this-asset-does-not-exist.jpg'),
}

const _TEST_INPUT_NEGATIVE = {
    remote_test_asset_does_not_exist : {Ref: _TEST_ASSET_REFS_NEGATIVE.test_asset_ref_remote_does_not_exist},
    local_test_asset_does_not_exist  : {Ref: _TEST_ASSET_REFS_NEGATIVE.test_asset_ref_local_does_not_exist},
}

// Adding bulk tests
//
// Persisted to CSV file used as input for the end-to-end test
// Keys are to be used as asset public_ids
// Values will be expanded into CSV columns 
//
// Split into positive / negative to allow referencing separately in the tests
//
const _TEST_CASE_BULK_SIZE = 100; // Number of records to generate for each test case

const _BULK_TEST_CASES_POSITIVE_REMOTE = new Object();
for (let i = 0; i < _TEST_CASE_BULK_SIZE; i++) {
    _BULK_TEST_CASES_POSITIVE_REMOTE[`test_http_remote_asset_small_${i}`] = {Ref: _TEST_ASSET_REFS_POSITIVE.test_asset_ref_remote_small};
}

const _BULK_TEST_CASES_POSITIVE_LOCAL = new Object();
for (let i = 0; i < _TEST_CASE_BULK_SIZE; i++) {
    _BULK_TEST_CASES_POSITIVE_LOCAL[`test_local_asset_small_relpath_${i}`] = {Ref: _TEST_ASSET_REFS_POSITIVE.test_asset_ref_local_small_relpath};
}

const _BULK_TEST_CASES_NEGATIVE_REMOTE = new Object();
for (let i = 0; i < _TEST_CASE_BULK_SIZE; i++) {
    _BULK_TEST_CASES_NEGATIVE_REMOTE[`remote_test_asset_does_not_exist_${i}`] = {Ref: _TEST_ASSET_REFS_NEGATIVE.test_asset_ref_remote_does_not_exist};
}

const _BULK_TEST_CASES_NEGATIVE_LOCAL = new Object();
for (let i = 0; i < _TEST_CASE_BULK_SIZE; i++) {
    _BULK_TEST_CASES_NEGATIVE_LOCAL[`local_test_asset_does_not_exist_${i}`] = {Ref: _TEST_ASSET_REFS_NEGATIVE.test_asset_ref_local_does_not_exist};
}

const TEST_INPUT = {
    ..._TEST_INPUT_POSITIVE,
    ..._TEST_INPUT_NEGATIVE,
    ..._BULK_TEST_CASES_POSITIVE_REMOTE,
    ..._BULK_TEST_CASES_POSITIVE_LOCAL,
    ..._BULK_TEST_CASES_NEGATIVE_REMOTE,
    ..._BULK_TEST_CASES_NEGATIVE_LOCAL,
};

const _TEST_INPUT_POSITIVE_CASES = {
    ..._TEST_INPUT_POSITIVE,
    ..._BULK_TEST_CASES_POSITIVE_REMOTE,
    ..._BULK_TEST_CASES_POSITIVE_LOCAL,
};

const _TEST_INPUT_NEGATIVE_CASES = {
    ..._TEST_INPUT_NEGATIVE,
    ..._BULK_TEST_CASES_NEGATIVE_REMOTE,
    ..._BULK_TEST_CASES_NEGATIVE_LOCAL,
};

// Helper function to reduce the number of test records 
// when a smaller batch is needed for testing
function reduceTestRecords(toNoOfRecords, fromTestDataObj) {
    reducedBatchSize = Math.min(toNoOfRecords, Object.keys(fromTestDataObj).length);
    let reducedTestData = {};
    let keys = Object.keys(fromTestDataObj);
    for (let i = 0; i < reducedBatchSize; i++) {
        testDataKey = keys[i];
        reducedTestData[testDataKey] = fromTestDataObj[testDataKey];
    }
    return reducedTestData;
}

/**
 * Template CSV file is a CSV file with asset records where one column (asset references)
 * has keys from the `_TEST_ASSET_REFS_POSITIVE` or `_TEST_ASSET_REFS_NEGATIVE` objects to avoid duplication.
 * 
 * This function creates actual CSV asset data file from the template file by replacing the reference column 
 * with the actual values corresponding to the keys.
 * 
 * @param {string} templateCSVFilePath - Path to the template CSV file
 * @param {string} refColName - Name of the column to replace with the provided values
 * @param {string} outputCSVFilePath - Path to the output CSV file
 * @param {Object} values - Object with keys as the column names and values as the values to replace the reference column with
 * @returns {string} - Path to the output CSV file
 */
function fromTemplateCSVFile(templateCSVFilePath, refColName, outputCSVFilePath) {
    // Load template CSV
    const csvRaw = fs.readFileSync(templateCSVFilePath, 'utf8');

    // Parse into objects using header row for column names
    const records = parse(csvRaw, { columns: true, skip_empty_lines: true });

    // Build lookup table for ref replacements
    const refLookup = {
        ..._TEST_ASSET_REFS_POSITIVE,
        ..._TEST_ASSET_REFS_NEGATIVE,
    };

    // Replace reference column values
    records.forEach((row) => {
        if (row.hasOwnProperty(refColName) && refLookup[row[refColName]]) {
            row[refColName] = refLookup[row[refColName]];
        }
    });

    // Stringify back to CSV with header row
    const outputCsv = stringify(records, { header: true });

    // Ensure output directory exists
    fs.mkdirSync(path.dirname(outputCSVFilePath), { recursive: true });
    fs.writeFileSync(outputCSVFilePath, outputCsv, 'utf8');

    return outputCSVFilePath;
}


module.exports = {
    ALL_RECORDS     : TEST_INPUT,
    POSITIVE_ONLY: _TEST_INPUT_POSITIVE_CASES,
    NEGATIVE_ONLY: _TEST_INPUT_NEGATIVE_CASES,
    reduceTestRecords: reduceTestRecords,
    fromTemplateCSVFile: fromTemplateCSVFile,
};