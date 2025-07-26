/**
 * Test for default implementation of the input2ApiPayload_Async function
 * that uses the structured metadata mapper plugin
 * 
 * Logic of the test:
 *   - Template CSV (can be edited externally in spreadsheet software to simplify maintenance)
 *       + Mimics CSV structure assumed by the default imput2ApiPayload_Async
 *       + Contains additional columns to represent expected end state of SMD values
 *   - Used to produce input CSV file (by replacing "asset_ref" entries with actual URLs / paths )
 *   - Then the input CSV file is used to produce test scenarios
 *       + Additional columns are used when constructing test scenarios
 *   - Test scenarios are validated against the log file records as test cases
 */
'use strict';

const fs = require('fs');
const path = require('path');

const { parse } = require('csv-parse/sync');

const cloudinary = require('cloudinary').v2;

const testAppInput = require('../app-input');
const testAppFlow = require('../test-invoke-app-flow');
const migrationPayload = require('../../../lib/payload/migrate');
const testMigrationRecords = require('../yield-e2e-migration-records');

const INPUT_CSV_FILE = path.join(__dirname, 'input.csv');
const TEST_OUTPUT_FOLDER = path.join(__dirname, 'test-output');

// SMD definitions required for the test data file
const SMD_DEFINITIONS = [
    {
      "type": "string",
      "external_id": "smd_field_external_id_a",
      "label": "SMD Field A",
      "mandatory": false,
      "default_value": null,
      "validation": null,
      "default_disabled": false,
      "restrictions": {
        "readonly_ui": false
      }
    },
    {
      "type": "string",
      "external_id": "smd_text_field_external_id",
      "label": "SMD Text Field",
      "mandatory": false,
      "default_value": null,
      "validation": null,
      "default_disabled": false,
      "restrictions": {
        "readonly_ui": false
      }
    },
    {
      "type": "integer",
      "external_id": "smd_num_field_external_id",
      "label": "SMD Numeric Field",
      "mandatory": false,
      "default_value": null,
      "validation": null,
      "default_disabled": false,
      "restrictions": {
        "readonly_ui": false
      }
    },
    {
      "type": "date",
      "external_id": "smd_date_field_external_id",
      "label": "SMD Date Field",
      "mandatory": false,
      "default_value": null,
      "validation": null,
      "default_disabled": false,
      "restrictions": {
        "readonly_ui": false
      }
    },
    {
      "type": "enum",
      "external_id": "smd_ssl_field_external_id",
      "label": "SMD Single Select Field",
      "mandatory": false,
      "default_value": null,
      "validation": null,
      "default_disabled": false,
      "restrictions": {
        "readonly_ui": false
      },
      "datasource": {
        "values": [
          {
            "external_id": "ssl_option_a",
            "value": "SSL Option A",
            "state": "active"
          },
          {
            "external_id": "ssl_option_b",
            "value": "SSL Option B",
            "state": "active"
          },
          {
            "external_id": "ssl_option_c",
            "value": "SSL Option C",
            "state": "active"
          }
        ]
      },
      "lazy_datasource_update": false,
      "allow_dynamic_list_values": false
    },
    {
      "type": "set",
      "external_id": "smd_msl_field_external_id",
      "label": "SMD Multi Select Field",
      "mandatory": false,
      "default_value": null,
      "validation": null,
      "default_disabled": false,
      "restrictions": {
        "readonly_ui": false
      },
      "datasource": {
        "values": [
          {
            "external_id": "msl_option_a",
            "value": "MSL Option A",
            "state": "active"
          },
          {
            "external_id": "msl_option_b",
            "value": "MSL Option B",
            "state": "active"
          },
          {
            "external_id": "msl_option_c",
            "value": "MSL Option C",
            "state": "active"
          },
          {
            "external_id": "msl_option_d",
            "value": "MSL Option D",
            "state": "active"
          },
          {
            "external_id": "msl_option_e",
            "value": "MSL Option E",
            "state": "active"
          },
          {
            "external_id": "msl_option_f",
            "value": "MSL Option F",
            "state": "active"
          }
        ]
      },
      "lazy_datasource_update": false,
      "allow_dynamic_list_values": false
    }
  ]

async function cleanup() {
    /*await testAppFlow.testCleanup_Async({
        input_csv_file: INPUT_CSV_FILE,
        test_output_folder: TEST_OUTPUT_FOLDER,
    });*/
}

// Variables to reference records from the parsed migration log and report files
let __TEST_LOG = null;
let __TEST_REPORT = null;
// Test scenarios to be calculated from the input CSV file
let __TEST_SCENARIOS = [];

/**
 * Calculates test scenarios from the input CSV file by parsing each record
 * and creating scenario objects that define expected outcomes for migration testing.
 * 
 * Each test scenario represents a single asset migration case with expected
 * success/failure status and structured metadata values to validate against.
 * 
 * @param {string} inputCSVFile - Path to the input CSV file containing test data
 * @returns {Array} Array of test scenario objects with public_id, expected_to_succeed, and expected_smd_values
 */
function calculateTestScenariosFromInputCSVFile(inputCSVFile) {    
    const csvContent = fs.readFileSync(inputCSVFile, 'utf8');
    const records = parse(csvContent, { columns: true, skip_empty_lines: true });
    
    return records.map(record => {
        const expected_to_succeed = record['Expected To Succeed'] === 'TRUE';
        
        const scenario = {
            public_id: record['Asset Public_ID CSV Column Name'],
            expected_to_succeed: expected_to_succeed,
            expected_smd_values: null
        };
        
        if (expected_to_succeed) {
            scenario.expected_smd_values = {};
            
            // Map CSV columns to SMD field external IDs
            const smdMappings = {
                'SMD Text CSV Column Name': 'smd_text_field_external_id',
                'SMD Num CSV Column Name': 'smd_num_field_external_id',
                'SMD Date Expected Value': 'smd_date_field_external_id',
                'SMD SSL Expected Value': 'smd_ssl_field_external_id',
                'SMD MSL Expected Value': 'smd_msl_field_external_id',
                'SMD Field A CSV Column Name': 'smd_field_external_id_a'
            };
            
            // Only add properties that have values
            for (const [csvColumn, smdFieldId] of Object.entries(smdMappings)) {
                if (record[csvColumn]) {
                    scenario.expected_smd_values[smdFieldId] = record[csvColumn];
                }
            }
        }
        
        return scenario;
    });
}


describe('Default payload with SMD plugin', () => {
    beforeAll(async () => {
        console.log('Preparing test environment');
        // Ensuring there are no artifacts from prior test run that could interfere
        await cleanup();

        console.log('Producing tests input CSV file from template...');
        testMigrationRecords.fromTemplateCSVFile(
            path.join(__dirname, '004-default-payload-with-smd-plugin.template.csv'),
            'File Path or URL CSV Column Name',
            INPUT_CSV_FILE
        );

        console.log('Calculating test scenarios from produced input CSV file...');
        __TEST_SCENARIOS = calculateTestScenariosFromInputCSVFile(INPUT_CSV_FILE);

        console.log('Creating SMD Definitions...');
        for (const smd_field_definition of SMD_DEFINITIONS) {
            await cloudinary.api.add_metadata_field(smd_field_definition);
            console.log(`    DONE: ${smd_field_definition.external_id}`)
        }

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

    it('Dummy test', async() => {
        expect(true).toBe(true);
    });
});