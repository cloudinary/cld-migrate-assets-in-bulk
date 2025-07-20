/**
 * Test for default implementation of the input2ApiPayload_Async function
 * that uses the structured metadata mapper plugin
 */
'use strict';

const fs = require('fs');
const path = require('path');

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