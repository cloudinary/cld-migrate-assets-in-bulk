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

jest.spyOn(metadata_mapper, 'init').mockImplementation(async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    // Mocking the private #metadata_structure class property
    Object.defineProperty(metadata_mapper, 'metadata_structure', {
        get: () => MOCK_SMD_STRUCTURE
    });
});

beforeAll(async () => {
    await metadata_mapper.init();
})

describe("Passing in metadata", () => {
    it('should update a Enum value', async () => {
        const uploadOptions = {};
        const inputFields = {
            "SMD SSL": "SSL Option B"
        }

        metadata_mapper.process(uploadOptions,inputFields);

        expect(uploadOptions.metadata.smd_ssl).toEqual('ssl_option_b');
        expect(Object.keys(inputFields).length).toEqual(0);
    });

    it('should update Set values', async () => {
        const uploadOptions = {};
        const inputFields = {
            "SMD MSL": "MSL Option C, MSL Option A",
        }

        metadata_mapper.process(uploadOptions,inputFields);

        console.log(uploadOptions);
        console.log(inputFields);

        expect(uploadOptions.metadata.smd_msl).toEqual(['msl_option_c', 'msl_option_a']);
        expect(Object.keys(inputFields).length).toEqual(0);
    });

    it('should ignore an unknown value', async () => {
        const uploadOptions = {};
        const inputFields = {
            "SMD SSL": "SSL Option C",
            "Does Not Exist": "This"
        }

        metadata_mapper.process(uploadOptions,inputFields);

        expect(uploadOptions.metadata.smd_ssl).toEqual('ssl_option_c');
        expect(Object.keys(inputFields).length).toEqual(1);
        expect(inputFields['Does Not Exist']).toEqual('This');
    });

    it('should ignore empty values', async () => {
        const uploadOptions = {};
        const inputFields = {
            "Show hidden": ""
        }

        metadata_mapper.process(uploadOptions,inputFields);

        expect(uploadOptions.metadata).not.toBeDefined();
    });
    


})