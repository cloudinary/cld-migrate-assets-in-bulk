'use strict';


const MOCK_SMD_STRUCTURE = [
    {
    type: 'set',
    external_id: 'smd_msl',
    label: 'SMD MSL',
    mandatory: false,
    default_value: null,
    validation: null,
    default_disabled: false,
    restrictions: { readonly_ui: false },
    datasource: {
        values: [
        {
            external_id: 'msl_option_a',
            value: 'MSL Option A',
            state: 'active'
        },
        {
            external_id: 'msl_option_b',
            value: 'MSL Option B',
            state: 'active'
        },
        {
            external_id: 'msl_option_c',
            value: 'MSL Option C',
            state: 'active'
        }
        ]
    },
    lazy_datasource_update: false,
    allow_dynamic_list_values: false
    },
    {
    type: 'enum',
    external_id: 'smd_ssl',
    label: 'SMD SSL',
    mandatory: false,
    default_value: null,
    validation: null,
    default_disabled: false,
    restrictions: { readonly_ui: false },
    datasource: {
        values: [
        {
            external_id: 'ssl_option_a',
            value: 'SSL Option A',
            state: 'active'
        },
        {
            external_id: 'ssl_option_b',
            value: 'SSL Option B',
            state: 'active'
        },
        {
            external_id: 'ssl_option_c',
            value: 'SSL Option C',
            state: 'active'
        }
        ]
    },
    lazy_datasource_update: false,
    allow_dynamic_list_values: false
    },
    {
    type: 'date',
    external_id: 'smd_date',
    label: 'SMD Date',
    mandatory: false,
    default_value: null,
    validation: null,
    default_disabled: false,
    restrictions: { readonly_ui: false }
    },
    {
    type: 'integer',
    external_id: 'smd_number',
    label: 'SMD Number',
    mandatory: false,
    default_value: null,
    validation: null,
    default_disabled: false,
    restrictions: { readonly_ui: false }
    },
    {
    type: 'string',
    external_id: 'smd_text',
    label: 'SMD Text',
    mandatory: false,
    default_value: null,
    validation: null,
    default_disabled: false,
    restrictions: { readonly_ui: false }
    }
]

const MOCK_PLUGIN_NAME = 'cld-structured-metadata-mapper';
const MOCK_ERROR_NAMES = {
    NotInitialized              : `${MOCK_PLUGIN_NAME}:NotInitializedError`,
    InvalidMapping              : `${MOCK_PLUGIN_NAME}:InvalidMappingError`,
    InvalidDataSourceOption     : `${MOCK_PLUGIN_NAME}:InvalidDataSourceOptionError`,
    FailedToProcessMetadataValue: `${MOCK_PLUGIN_NAME}:FailedToProcessMetadataValueError`
}

const metadata_mapper = require('./cld-structured-metadata-mapper').plugin;


// Must be the first test to ensure that the metadata_structure is not mocked
describe('CloudinaryMetadataMapper', () => {
    describe('Not initialized state', () => {
        it('should throw NotInitializedError when invoking process before initialization', async () => {
            const uploadOptions = {};
            const inputFields = { "SMD MSL": "MSL Option A" };
            const options = { mapping:{ 'SMD MSL' : 'smd_msl' } };

            try {
                await metadata_mapper.process_Async(uploadOptions, inputFields, options);
                fail('Expected an error to be thrown')
            } catch (error) {
                expect(error.name).toEqual(MOCK_ERROR_NAMES.NotInitialized);
            }
        });

    });

    describe('process', () => {
        beforeAll(async () => {
            jest.spyOn(metadata_mapper, 'init_Async').mockImplementation(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
                // Mocking the private #metadata_structure class property
                Object.defineProperty(metadata_mapper, 'metadata_structure', {
                    get: () => MOCK_SMD_STRUCTURE
                });
            });

            await metadata_mapper.init_Async();
        });

        afterAll(() => {
            jest.restoreAllMocks();
        });

        it('should raise an error if the options are not provided', async () => {
            const uploadOptions = {};
            const inputFields = {};
            const options = {};
            
            try {
                await metadata_mapper.process_Async(uploadOptions, inputFields, null);
                fail('Expected an error to be thrown');
            } catch (error) {
                expect(error.name).toEqual(MOCK_ERROR_NAMES.InvalidMapping);
                expect(error.message).toEqual("Mapping configuration is required");
            }
        });

        it('should raise an error if the options.mapping is not provided', async () => {
            const uploadOptions = {};
            const inputFields = {};
            const options = {};
            
            try {
                await metadata_mapper.process_Async(uploadOptions, inputFields, options);
                fail('Expected an error to be thrown');
            } catch (error) {
                expect(error.name).toEqual(MOCK_ERROR_NAMES.InvalidMapping);
                expect(error.message).toEqual("Mapping configuration is required");
            }
        });

        it('should raise an error if the options.mapping is not an object', async () => {
            const uploadOptions = {};
            const inputFields = {};
            const options = { mapping: "not an object" };
            
            try {
                await metadata_mapper.process_Async(uploadOptions, inputFields, options);
                fail('Expected an error to be thrown');
            } catch (error) {
                expect(error.name).toEqual(MOCK_ERROR_NAMES.InvalidMapping);
                expect(error.message).toEqual("Mapping must be an object");
            }
        });

        it('should raise an error if mapping has duplicate external_ids (different CSV columns mapped to the same SMD field)', async () => {
            const uploadOptions = {};
            const inputFields = {};
            const options = { mapping: { 'SMD Text' : 'smd_msl', 'SMD SSL' : 'smd_msl' } };
            
            try {
                await metadata_mapper.process_Async(uploadOptions, inputFields, options);
                fail('Expected an error to be thrown');
            } catch (error) {
                expect(error.name).toEqual(MOCK_ERROR_NAMES.InvalidMapping);
                expect(error.message).toEqual("Duplicate external_id found: 'smd_msl'");
            }
        });

        it('should raise an error if a CSV column from the mapping is not found in the input fields', async () => {
            const uploadOptions = {};
            const inputFields = {};
            const options = { mapping: { 'Does Not Exist' : 'does_not_exist' } };
            
            try {
                await metadata_mapper.process_Async(uploadOptions, inputFields, options);
                fail('Expected an error to be thrown');
            } catch (error) {
                expect(error.name).toEqual(MOCK_ERROR_NAMES.InvalidMapping);
                expect(error.message).toEqual("CSV column 'Does Not Exist' not found in input fields");
            }
        });

        it('should raise an error if any external_id from the mapping is not found in the metadata_structure', async () => {
            const uploadOptions = {};
            const inputFields = { 
                "SMD Text" : "Hello world",
                "SMD SSL"  : "SSL Option A"
            };
            const options = { 
                mapping: { 
                    'SMD Text' : 'does_not_exist',
                    'SMD SSL'  : 'smd_ssl'
                } 
            };
            
            try {
                await metadata_mapper.process_Async(uploadOptions, inputFields, options);
                fail('Expected an error to be thrown');
            } catch (error) {
                expect(error.name).toEqual(MOCK_ERROR_NAMES.InvalidMapping);
                expect(error.message).toEqual("External ID 'does_not_exist' not found in metadata structure");
            }
        });

        it('should update a single-select (enum) value', async () => {
            const uploadOptions = {};
            const inputFields = {
                "SMD SSL": "SSL Option B"
            }
            const options = { mapping:{'SMD SSL' : 'smd_ssl'} };

            await metadata_mapper.process_Async(uploadOptions,inputFields, options);

            expect(uploadOptions.metadata.smd_ssl).toEqual('ssl_option_b');
        });

        it('should raise an error if a single-select (enum) value is not in the field datasource', async () => {
            const uploadOptions = {};
            const inputFields = {
                "SMD SSL": "SSL Option D"
            };
            const options = { mapping:{'SMD SSL' : 'smd_ssl'} };

            try {
                await metadata_mapper.process_Async(uploadOptions, inputFields, options);
                fail('Expected an error to be thrown');
            } catch (error) {
                expect(error.name).toEqual(MOCK_ERROR_NAMES.InvalidDataSourceOption);
                expect(error.message).toEqual("Option 'SSL Option D' not found in datasource for the SMD field 'smd_ssl'");
            }
        });

        it('should update multi-select (set) values', async () => {
            const uploadOptions = {};
            const inputFields = {
                "SMD MSL": "MSL Option C, MSL Option A",
            }
            const options = { mapping:{'SMD MSL' : 'smd_msl'} };

            await metadata_mapper.process_Async(uploadOptions,inputFields, options);

            expect(uploadOptions.metadata.smd_msl).toEqual(['msl_option_c', 'msl_option_a']);
        });

        it('should raise an error if a multi-select (set) value is not in the field datasource', async () => {
            const uploadOptions = {};
            const inputFields = {
                "SMD MSL": "MSL Option A, MSL Option B, MSL Option D"
            };
            const options = { mapping:{'SMD MSL' : 'smd_msl'} };

            try {
                await metadata_mapper.process_Async(uploadOptions, inputFields, options);
                fail('Expected an error to be thrown');
            } catch (error) {
                expect(error.name).toEqual(MOCK_ERROR_NAMES.InvalidDataSourceOption);
                expect(error.message).toEqual("Option 'MSL Option D' not found in datasource for the SMD field 'smd_msl'");
            }
        });
        
        it('should correctly format and store a valid Date value', async () => {
            const uploadOptions = {};
            const inputFields = {
                "SMD Date": "2024/12/25 12:30:42"
            };
            const options = { mapping:{'SMD Date' : 'smd_date'} };
        
            await metadata_mapper.process_Async(uploadOptions, inputFields, options);
        
            expect(uploadOptions.metadata.smd_date).toEqual("2024-12-25");
        });

        it('should raise an error if a Date value is not in the correct format', async () => {
            const uploadOptions = {};
            const inputFields = {
                "SMD Date": "20241225-123042"
            };
            const options = { mapping:{'SMD Date' : 'smd_date'} };

            try {
                await metadata_mapper.process_Async(uploadOptions, inputFields, options);
                fail('Expected an error to be thrown');
            } catch (error) {
                expect(error.name).toEqual(MOCK_ERROR_NAMES.FailedToProcessMetadataValue);
                expect(error.message).toEqual("Failed to process '20241225-123042' value for the field 'smd_date'");
                expect(error).toHaveProperty('cause');
                expect(error.cause).toBeInstanceOf(Error);
            }
        });

        it('should correctly process a valid Number value', async () => {
            const uploadOptions = {};
            const inputFields = {
                "SMD Number": "42"
            };
            const options = { mapping:{'SMD Number' : 'smd_number'} };

            await metadata_mapper.process_Async(uploadOptions, inputFields, options);
        
            expect(uploadOptions.metadata.smd_number).toEqual("42"); // still a string since no coercion is done
        });

        it('should correctly process a Text value', async () => {
            const uploadOptions = {};
            const inputFields = {
                "SMD Text": "  Hello world  "
            };
            const options = { mapping:{'SMD Text' : 'smd_text'} };
        
            await metadata_mapper.process_Async(uploadOptions, inputFields, options);
        
            expect(uploadOptions.metadata.smd_text).toEqual("Hello world");
        });

        it('should raise an error for an unknown value', async () => {
            const uploadOptions = {};
            const inputFields = {
                "SMD SSL": "SSL Option C",
                "Does Not Exist": "This"
            }
            const options = { 
                mapping: {
                    'SMD SSL' : 'smd_ssl', 
                    'Does Not Exist' : 'does_not_exist'
                } 
            };

            try {
                await metadata_mapper.process_Async(uploadOptions,inputFields, options);
                fail('Expected an error to be thrown');
            } catch (error) {
                expect(error.name).toEqual(MOCK_ERROR_NAMES.InvalidMapping);
                expect(error.message).toEqual("External ID 'does_not_exist' not found in metadata structure");
            }
        });

        it('should ignore empty values', async () => {
            const uploadOptions = {};
            const inputFields = {
                "SMD SSL": ""
            }
            const options = { mapping:{'SMD SSL' : 'smd_ssl'} };

            await metadata_mapper.process_Async(uploadOptions,inputFields, options);

            expect(uploadOptions).not.toHaveProperty('metadata');
        });
        

        it('should throw an error if a field is missing in the input', async () => {
            const uploadOptions = {};
            const inputFields = {
                "SMD MSL": "MSL Option A"
            };
            const options = { mapping:{'SMD SSL' : 'smd_ssl'} };
            
            try {
                await metadata_mapper.process_Async(uploadOptions, inputFields, options);
                fail('Expected an error to be thrown');
            } catch (error) {
                expect(error.name).toEqual(MOCK_ERROR_NAMES.InvalidMapping);
                expect(error.message).toEqual("CSV column 'SMD SSL' not found in input fields");
            }
        });
    });

});
