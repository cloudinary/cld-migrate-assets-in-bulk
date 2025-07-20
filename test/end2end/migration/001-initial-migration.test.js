const fs = require('fs');
const path = require('path');
const testAppInput = require('../app-input');
const testAppFlow = require('../test-invoke-app-flow');
const migrationPayload = require('../../../lib/payload/migrate');
const testMigrationRecords = require('../yield-e2e-migration-records');

const INPUT_CSV_FILE = path.join(__dirname, 'input.csv');
const TEST_OUTPUT_FOLDER = path.join(__dirname, 'test-output');

// Mocking the CSV input to API payload conversion logic to match the 
// produced CSV input for the test
jest.mock('../../../__input-to-api-payload', () => {
    return {
        input2ApiPayload_Async: jest.fn(async (csvRec) => {
            return {
                "payload" : {
                    file: csvRec.Ref,
                    options: {
                        public_id: csvRec.public_id,
                        unique_filename: false,
                        resource_type: 'auto',
                        type: 'upload',        
                    }
                },
                "plugins_trace": {}
            };
        })
    };
});


async function cleanup() {
    await testAppFlow.testCleanup_Async({
        input_csv_file: INPUT_CSV_FILE,
        test_output_folder: TEST_OUTPUT_FOLDER,
    });
}

// Variables to reference records from the parsed migration log and report files
let __TEST_LOG = null;
let __TEST_REPORT = null;

describe('Initial asset migration', () => {
    beforeAll(async () => {
        console.log('Preparing test environment');
        // Ensuring there are no artifacts from prior test run that could interfere
        await cleanup();
        
        console.log('Serializing test input to CSV file...');
        testAppInput.testInput2CsvFile({
            test_input: testMigrationRecords.ALL_RECORDS,
            csv_file_path: INPUT_CSV_FILE,
        });

        // Invoking the main loop for E2E testing
        const { testLog, testReport } = await testAppFlow.invokeMainLoopForTest_Async(
            { // Mocking CLI args
                fromCsvFile: INPUT_CSV_FILE,
                maxConcurrentUploads: 20,
                outputFolder: TEST_OUTPUT_FOLDER,
            },
            { // Mocking CLI command
                name: () => 'migrate',
            },
            migrationPayload
        );
        
        __TEST_LOG = testLog;
        __TEST_REPORT = testReport;

        console.log('Done preparing test environment');
    }, 5*60*1000); // Explicitly setting timeout to allow for execution of the migration loop

    afterAll(async () => {
        await cleanup();
    });

    it('Should produce log file', async () => {
        expect(fs.existsSync(__TEST_LOG.getPath())).toBe(true);
    });

    test.each(
        Object.keys(testMigrationRecords.ALL_RECORDS)
    )('Should produce single log record for asset %s', (public_id) => {
        const testLogEntries = __TEST_LOG.getEntriesByPublicId(public_id);
        expect(testLogEntries.length).toEqual(1);
    });

    it('Should produce report file with a record for each input', () => {
        expect(fs.existsSync(__TEST_REPORT.getPath())).toBe(true);
        expect(__TEST_REPORT.getLength()).toEqual(Object.keys(testMigrationRecords.ALL_RECORDS).length);
    });

    test.each(
        Object.keys(testMigrationRecords.POSITIVE_ONLY)
    )('Should successfully migrate valid asset %s', (public_id) => {
        const testLogEntries = __TEST_LOG.getEntriesByPublicId(public_id);
        const testLogEntry = testLogEntries[0];
        expect(testLogEntry).not.toBeNull();
        expect(testLogEntry.summary.status).toEqual('MIGRATED');
    });

    test.each(
        Object.keys(testMigrationRecords.POSITIVE_ONLY)
    )('Should produce report record for migrated asset %s', (public_id) => {
        const testReportEntries = __TEST_REPORT.getEntriesByPublicId(public_id);
        expect(testReportEntries.length).toEqual(1);
        const testReportEntry = testReportEntries[0];
        expect(testReportEntry.Cld_PublicId).toEqual(public_id);
        expect(testReportEntry.Cld_Status).toEqual('MIGRATED');
        expect(testReportEntry.Cld_Operation).toEqual('Uploaded');
    });

    test.each(
        Object.keys(testMigrationRecords.NEGATIVE_ONLY)
    )('Should report errors for invalid asset %s', (public_id) => {
        const testLogEntries = __TEST_LOG.getEntriesByPublicId(public_id);
        const testLogEntry = testLogEntries[0];
        expect(testLogEntry).not.toBeNull();
        expect(testLogEntry.summary.status).toEqual('FAILED');
    });

    test.each(
        Object.keys(testMigrationRecords.NEGATIVE_ONLY)
    )('Should produce report record for failed asset %s', (public_id) => {
        const testReportEntries = __TEST_REPORT.getEntriesByPublicId(public_id);
        expect(testReportEntries.length).toEqual(1);
        const testReportEntry = testReportEntries[0];
        expect(testReportEntry.public_id).toEqual(public_id);
        expect(testReportEntry.Cld_Status).toEqual('FAILED');
    });

});

