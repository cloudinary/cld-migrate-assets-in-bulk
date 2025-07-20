/*
    Yields the migration records for the E2E tests
*/
const testResources = require('../resources');

//
// Persisted to CSV file used as input for the end-to-end test
// Keys are to be used as asset public_ids
// Values will be expanded into CSV columns 
//
// Split into positive / negative to allow referencing separately in the tests
//

const _TEST_ASSET_REFS_POSITIVE = {
    test_asset_ref_remote_small         : 'https://res.cloudinary.com/cld-sol-demo/image/upload/sample.jpg',
    test_asset_ref_local_small_relpath  : testResources.getAssetPathRelativeToAppRoot('sample.jpg'),
    test_asset_ref_local_small_fullpath : testResources.getAssetFullPath('sample.jpg'),
    test_asset_ref_local_large          : testResources.LARGE_VIDEO_FILE_FULLPATH,
}

const _TEST_INPUT_POSITIVE = {
    test_http_remote_asset_small    : {Ref: _TEST_ASSET_REFS_POSITIVE.test_asset_ref_remote_small},
    test_local_asset_small_relpath  : {Ref: _TEST_ASSET_REFS_POSITIVE.test_asset_ref_local_small_relpath},
    test_local_asset_small_fullpath : {Ref: _TEST_ASSET_REFS_POSITIVE.test_asset_ref_local_small_fullpath},
    test_local_asset_large          : {Ref: _TEST_ASSET_REFS_POSITIVE.test_asset_ref_local_large},
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
const _TEST_CASE_BULK_SIZE = 100; // Number of records to generate for each test case

const _BULK_TEST_CASES_POSITIVE_REMOTE = new Object();
for (let i = 0; i < _TEST_CASE_BULK_SIZE; i++) {
    _BULK_TEST_CASES_POSITIVE_REMOTE[`test_http_remote_asset_small_${i}`] = {Ref: 'https://res.cloudinary.com/cld-sol-demo/image/upload/sample.jpg'};
}

const _BULK_TEST_CASES_POSITIVE_LOCAL = new Object();
for (let i = 0; i < _TEST_CASE_BULK_SIZE; i++) {
    _BULK_TEST_CASES_POSITIVE_LOCAL[`test_local_asset_small_relpath_${i}`] = {Ref: testResources.getAssetPathRelativeToAppRoot('sample.jpg')};
}

const _BULK_TEST_CASES_NEGATIVE_REMOTE = new Object();
for (let i = 0; i < _TEST_CASE_BULK_SIZE; i++) {
    _BULK_TEST_CASES_NEGATIVE_REMOTE[`remote_test_asset_does_not_exist_${i}`] = {Ref: 'https://res.cloudinary.com/cld-sol-demo/image/upload/this-asset-does-not-exist.png'};
}

const _BULK_TEST_CASES_NEGATIVE_LOCAL = new Object();
for (let i = 0; i < _TEST_CASE_BULK_SIZE; i++) {
    _BULK_TEST_CASES_NEGATIVE_LOCAL[`local_test_asset_does_not_exist_${i}`] = {Ref: testResources.getAssetFullPath('this-asset-does-not-exist.jpg')};
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


module.exports = {
    ALL_RECORDS     : TEST_INPUT,
    POSITIVE_ONLY: _TEST_INPUT_POSITIVE_CASES,
    NEGATIVE_ONLY: _TEST_INPUT_NEGATIVE_CASES,
    reduceTestRecords: reduceTestRecords,
};