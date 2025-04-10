'use strict';

const metadata_mapper = require('./CloudinaryMetadataMapper').plugin;

beforeAll(async () => {
    await metadata_mapper.init();
})

describe("Passing in metadata", () => {
    it('should update a Enum value', async () => {
        const uploadOptions = {};
        const inputFields = {
            "Show hidden": "No"
        }

        metadata_mapper.process(uploadOptions,inputFields);

        expect(uploadOptions.metadata.show_hidden).toEqual('no');
        expect(Object.keys(inputFields).length).toEqual(0);
    });

    it('should update Set values', async () => {
        const uploadOptions = {};
        const inputFields = {
            "Color shades": "Amber, Gold",
        }

        metadata_mapper.process(uploadOptions,inputFields);

        console.log(uploadOptions);
        console.log(inputFields);

        expect(uploadOptions.metadata.color_shades).toEqual(['amber', 'gold']);
        expect(Object.keys(inputFields).length).toEqual(0);
    });

    it('should ignore an unknown value', async () => {
        const uploadOptions = {};
        const inputFields = {
            "Show hidden": "No",
            "doesnt_exist": "This"
        }

        metadata_mapper.process(uploadOptions,inputFields);

        expect(uploadOptions.metadata.show_hidden).toEqual('no');
        expect(Object.keys(inputFields).length).toEqual(1);
        expect(inputFields.doesnt_exist).toEqual('This');
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