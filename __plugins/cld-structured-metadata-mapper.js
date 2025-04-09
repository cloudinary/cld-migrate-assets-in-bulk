/**
 * @fileoverview A plugin for mapping and transforming metadata fields for Cloudinary uploads.
 * @module cld-structured-metadata-mapper
 */

'use strict';

require('dotenv').config(); 
const cloudinary = require('cloudinary').v2;

/**
 * Enum for Cloudinary field types
 * @readonly
 * @enum {string}
 */
const CLOUDINARY_FIELD = {
    String: 'string',
    Integer: 'integer',
    Date: 'date',
    Enum: 'enum',
    Set: 'set'
}

/**
 * Class for mapping and transforming metadata fields for Cloudinary uploads.
 * Handles different field types and ensures proper formatting of metadata values.
 */
class CloudinaryMetadataMapper {
    /** @private */
    #metadata_structure

    constructor() {
        this.name = "metadata_mapper";
        this.className = "CloudinaryMetadataMapper";
    }

    /**
     * Initializes the mapper by fetching metadata field definitions from Cloudinary
     * @async
     * @throws {Error} If Cloudinary API call fails
     */
    async init() {
        const metadataResult = await cloudinary.api.list_metadata_fields();
        this.#metadata_structure = metadataResult.metadata_fields;
    }

    /**
     * Processes input fields and maps them to Cloudinary metadata format
     * @param {Object} upload_options - Cloudinary upload options
     * @param {Object} input_fields - Fields to be processed
     * @param {Object} [options={}] - Additional processing options
     * @param {string[]} [options.fieldsToIgnore=[]] - List of field names to ignore during processing
     */
    process(upload_options, input_fields, options = {}) {
        const { fieldsToIgnore = [] } = options;

        const metadataObject = {
            ...upload_options.metadata
        };
        const remaining_fields = input_fields; //we will update the passed object
        
        for (const key in input_fields) {
            const value = input_fields[key];
            if (!fieldsToIgnore.includes(key)) {
                const fieldSchema = this.#lookupFieldSchema(key);
                if(fieldSchema !== undefined) {
                    if (value.trim() !== '') {
                        metadataObject[fieldSchema.external_id] = this.#processMetadataValue(fieldSchema, value);
                    }
                    delete remaining_fields[key]; //remove the key even if the value isn't set
                }
            }
        }

        if (Object.keys(metadataObject).length > 0) {
            upload_options.metadata = metadataObject;
        }
    }

    /**
     * Loads the metadata structure from Cloudinary and caches it
     * @returns {Object[]} Array of metadata field definitions
     * @throws {Error} If init() hasn't been called
     */
    get metadata_structure() {        
        if(this.#metadata_structure) {
            return this.#metadata_structure
        } else {
            throw new Error(`[${this.className}:metadata_structure] init() needs to be called before use`)
        }
    }

    /**
     * Looks up a field schema by field name (external_id or label)
     * @private
     * @param {string} fieldName - Name of the field to look up
     * @returns {Object|undefined} Field schema if found, undefined otherwise
     */
    #lookupFieldSchema(fieldName) { //checks external id and then label
        //Check external_id first
        for (let field of this.metadata_structure) {
            if (field.external_id.trim().toLowerCase() === fieldName.trim().toLowerCase()) {
                return field;
            }
        }
        for (let field of this.metadata_structure) {
            if (field.label.trim().toLowerCase() === fieldName.trim().toLowerCase()) {
                return field;
            }
        }
    }

    /**
     * Processes a metadata value based on its field type
     * @private
     * @param {Object} fieldSchema - Field schema from Cloudinary
     * @param {string} value - Value to process
     * @returns {string|string[]|number} Processed value
     * @throws {Error} If field type is not supported
     */
    #processMetadataValue(fieldSchema, value) {
        let sanitizedFieldValue;
        switch (fieldSchema.type) {
            case CLOUDINARY_FIELD.Set:
                //Expecting an array
                sanitizedFieldValue = value.split(',').map((item) => this.#lookupMetadataValueExternalId(fieldSchema,item));
                break;
            case CLOUDINARY_FIELD.Date:
                let date = new Date(value);
                sanitizedFieldValue = date.toISOString().split('T')[0];
                break;
            case CLOUDINARY_FIELD.Enum:
                sanitizedFieldValue = this.#lookupMetadataValueExternalId(fieldSchema,value);
                break;
            case CLOUDINARY_FIELD.Integer:
            case CLOUDINARY_FIELD.String:
                sanitizedFieldValue = value;
                break;
            default:
                throw new Error(`[${this.className}:processMetadataValue] Field type not found (${fieldSchema.type}) for ${fieldSchema.external_id}`);
                break;
        }
        return sanitizedFieldValue;
    }

    /**
     * Looks up the external_id for a given value in a field's datasource
     * @private
     * @param {Object} fieldSchema - Field schema from Cloudinary
     * @param {string} option - Value to look up
     * @returns {string} External ID of the value
     * @throws {Error} If value is not found in the datasource
     */
    #lookupMetadataValueExternalId(fieldSchema, option) {    
        //Check external_id first
        for (let value of fieldSchema.datasource.values) {
            if (value.state === 'active' & value.external_id.toLowerCase() === option.trim().toLowerCase()) {
                return value.external_id;
            }
        }
        //Check label if no matches
        for (let value of fieldSchema.datasource.values) {
            if (value.state === 'active' & value.value.toLowerCase() === option.trim().toLowerCase()) {
                return value.external_id;
            }
        }
        throw Error(`[${this.className}:lookupMetadataValueExternalId] Field Value not found: ${option.trim()} for ${fieldSchema.external_id}`);
    }
}

module.exports.plugin = new CloudinaryMetadataMapper();