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

const metadata_mapper = require('./cld-structured-metadata-mapper').plugin;


// Must be the first test to ensure that the metadata_structure is not mocked
describe('CloudinaryMetadataMapper', () => {
    describe('Not initialized', () => {
        it('should throw NotInitializedError when invoking process before initialization', () => {
            const uploadOptions = {};
            const inputFields = { "SMD MSL": "MSL Option A" };

            try {
                metadata_mapper.process(uploadOptions, inputFields, { fieldsToMap: ['SMD MSL'] });
                fail('Expected an error to be thrown')
            } catch (error) {
                expect(error.name).toEqual('NotInitializedError');
            }
        });

    });

    describe('initialized', () => {
        beforeAll(async () => {
            jest.spyOn(metadata_mapper, 'init').mockImplementation(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
                // Mocking the private #metadata_structure class property
                Object.defineProperty(metadata_mapper, 'metadata_structure', {
                    get: () => MOCK_SMD_STRUCTURE
                });
            });

            await metadata_mapper.init();
        });

        afterAll(() => {
            jest.restoreAllMocks();
        });

        it('should update a Enum value', async () => {
            const uploadOptions = {};
            const inputFields = {
                "SMD SSL": "SSL Option B"
            }

            metadata_mapper.process(uploadOptions,inputFields, { fieldsToMap: ['SMD SSL'] });

            expect(uploadOptions.metadata.smd_ssl).toEqual('ssl_option_b');
        });

        it('should update Set values', async () => {
            const uploadOptions = {};
            const inputFields = {
                "SMD MSL": "MSL Option C, MSL Option A",
            }

            metadata_mapper.process(uploadOptions,inputFields, { fieldsToMap: ['SMD MSL'] });

            console.log(uploadOptions);
            console.log(inputFields);

            expect(uploadOptions.metadata.smd_msl).toEqual(['msl_option_c', 'msl_option_a']);
        });

        it('should correctly format and store a Date value', async () => {
            const uploadOptions = {};
            const inputFields = {
                "SMD Date": "2024-12-25"
            };
        
            metadata_mapper.process(uploadOptions, inputFields, { fieldsToMap: ['SMD Date'] });
        
            expect(uploadOptions.metadata.smd_date).toEqual("2024-12-25");
        });

        it('should correctly process a Number value', async () => {
            const uploadOptions = {};
            const inputFields = {
                "SMD Number": "42"
            };
        
            metadata_mapper.process(uploadOptions, inputFields, { fieldsToMap: ['SMD Number'] });
        
            expect(uploadOptions.metadata.smd_number).toEqual("42"); // still a string since no coercion is done
        });

        it('should correctly process a Text value', async () => {
            const uploadOptions = {};
            const inputFields = {
                "SMD Text": "  Hello world  "
            };
        
            metadata_mapper.process(uploadOptions, inputFields, { fieldsToMap: ['SMD Text'] });
        
            expect(uploadOptions.metadata.smd_text).toEqual("Hello world");
        });

        it('should ignore an unknown value', async () => {
            const uploadOptions = {};
            const inputFields = {
                "SMD SSL": "SSL Option C",
                "Does Not Exist": "This"
            }

            metadata_mapper.process(uploadOptions,inputFields, { fieldsToMap: ['SMD SSL', 'Does Not Exist'] });

            expect(uploadOptions.metadata.smd_ssl).toEqual('ssl_option_c');
            expect(Object.keys(uploadOptions.metadata).length).toEqual(1);
        });

        it('should ignore empty values', async () => {
            const uploadOptions = {};
            const inputFields = {
                "Show hidden": ""
            }

            metadata_mapper.process(uploadOptions,inputFields, { fieldsToMap: ['Show hidden'] });

            expect(uploadOptions).not.toHaveProperty('metadata');
        });
        

        it('should throw an error if a field is missing in the input', async () => {
            const uploadOptions = {};
            const inputFields = {
                "SMD MSL": "MSL Option A"
            };

            // expect to throw error with name set to `MissingFieldError`
            try {
                metadata_mapper.process(uploadOptions, inputFields, { fieldsToMap: ['Another Field'] });
                fail('Expected an error to be thrown');
            } catch (error) {
                expect(error.name).toEqual('MissingFieldError');
            }
        });
    });

});
