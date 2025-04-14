/**
 * @fileoverview A plugin for mapping and transforming metadata fields for Cloudinary uploads.
 * @module cld-structured-metadata-mapper
 * 
 * @description
 * 
 * 💡 CONCEPT:
 *  
 * Performs typical data transformation required for Cloudinary Structured Metadata Values.
 * Examples: 
 *  - resolve external_id values for single- or multi-select fields from labels
 *  - format date values
 * 
 * This allows migration data files to provide "business" values.
 * The module translates "business" values to "Cloudinary API" values as per SMD field configuration.
 * 
 * ⚙️ IMPLEMENTATION:
 *  - Structured metadata field definitions are obtained via Cloudinary API during plugin initialization
 *  - The `process` method is invoked from the `__input-to-api-payload` module
 *      - It receives reference to `upload_options` (represents options for upload API request to be made for the migrated asset)
 *      - It receives reference to `input_fields` (represents CSV record from migration data file)
 *      - It receives options with list of {<CSV column> : <smd_field_external_id>} mappings
 *  - The `process` method then uses the input to
 *      - Find definition for each target SMD field from the options.mapping
 *      - Resolve the value to be passed to upload API call
 *      - Updates `upload_options.metadata` accordingly
 */

'use strict';

const path = require('path');
const cloudinary = require('cloudinary').v2;

const PLUGIN_NAME = path.parse(__filename).name;

/**
 * Maps Cloudinary structured metadata field types
 * from DAM UI to the corresponding API value
 * @readonly
 * @enum {string}
 */
const CLOUDINARY_FIELD = {
    Text                 : 'string',
    Number               : 'integer',
    Date                 : 'date',
    SingleSelectionList  : 'enum',
    MultipleSelectionList: 'set'
}

/**
 * Custom error for when the mapper hasn't been initialized
 */
class NotInitializedError extends Error {
    constructor() {
        super('CloudinaryMetadataMapper needs to be initialized before use');
        this.name = `${PLUGIN_NAME}:NotInitializedError`;
    }
}

/**
 * Custom error for invalid mapping configuration
 */
class InvalidMappingError extends Error {
    constructor(message) {
        super(message);
        this.name = `${PLUGIN_NAME}:InvalidMappingError`;
    }
}

/**
 * Custom error for invalid datasource option
 */
class InvalidDataSourceOptionError extends Error {
    constructor(message) {
        super(message);
        this.name = `${PLUGIN_NAME}:InvalidDataSourceOptionError`;
    }
}

/**
 * Custom error to indicate that a metadata value failed to be processed
 */
class FailedToProcessMetadataValueError extends Error {
    constructor(message, cause) {
        super(message);
        this.name = `${PLUGIN_NAME}:FailedToProcessMetadataValueError`;
        if (cause) {
            this.cause = cause;
        }
    }
}

/**
 * Class for mapping and transforming metadata fields for Cloudinary uploads.
 * Handles different field types and ensures proper formatting of metadata values.
 */
class CloudinaryMetadataMapper {
    /** @private */
    #metadata_structure

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
     * Validates the mapping configuration
     * @param {Object} mapping - Mapping from CSV column names to external IDs
     * @param {Object} input_fields - Input fields to validate against
     * @throws {InvalidMappingError} If mapping configuration is invalid
     */
    #validateMapping(mapping, input_fields) {
        if (!mapping || typeof mapping !== 'object') {
            throw new InvalidMappingError('Mapping must be an object');
        }

        // Check for duplicate external IDs
        const externalIds = new Set();
        for (const [csvColumn, externalId] of Object.entries(mapping)) {
            if (externalIds.has(externalId)) {
                throw new InvalidMappingError(`Duplicate external_id found: '${externalId}'`);
            }
            externalIds.add(externalId);
        }

        // Check if all CSV columns exist in input_fields
        for (const csvColumn of Object.keys(mapping)) {
            if (!(csvColumn in input_fields)) {
                throw new InvalidMappingError(`CSV column '${csvColumn}' not found in input fields`);
            }
        }

        // Check if all external IDs exist in metadata structure
        const validExternalIds = new Set(this.metadata_structure.map(field => field.external_id));
        for (const externalId of Object.values(mapping)) {
            if (!validExternalIds.has(externalId)) {
                throw new InvalidMappingError(`External ID '${externalId}' not found in metadata structure`);
            }
        }
    }

    /**
     * Processes input fields according to options and maps them to Cloudinary metadata format
     * @param {Object} upload_options - Cloudinary upload options
     * @param {Object} input_fields - Fields to be processed
     * @param {Object} options - Processing options
     * @param {Object} options.mapping - Mapping from CSV column names to external IDs
     * @throws {NotInitializedError} If init() hasn't been called
     * @throws {InvalidMappingError} If mapping configuration is invalid
     * @throws {InvalidDataSourceOptionError} If a value is not found in the datasource
     * @throws {FailedToProcessMetadataValueError} If a value fails to be processed
     * @returns {Object} The updated upload options with processed metadata
     */
    process(upload_options, input_fields, options) {
        if (!options || !options.mapping) {
            throw new InvalidMappingError('Mapping configuration is required');
        }

        this.#validateMapping(options.mapping, input_fields);

        const metadata = { ...upload_options.metadata };

        for (const [csvColumn, externalId] of Object.entries(options.mapping)) {
            const value = input_fields[csvColumn]?.trim();
            if (!value) continue;

            const schema = this.#lookupFieldSchema(externalId);

            try {
                metadata[externalId] = this.#processMetadataValue(schema, value);
            } catch (error) {
                if (error instanceof InvalidDataSourceOptionError) {
                    throw error;
                } else {
                    // If the error is not one of the expected - "wrap" it in a FailedToProcessMetadataValueError
                    throw new FailedToProcessMetadataValueError(`Failed to process '${value}' value for the field '${externalId}'`, error);
                }
            }
        }

        if (Object.keys(metadata).length > 0) {
            upload_options.metadata = metadata;
        }
    }

    /**
     * Loads the metadata structure from Cloudinary and caches it
     * @returns {Object[]} Array of metadata field definitions
     * @throws {NotInitializedError} If init() hasn't been called
     */
    get metadata_structure() {        
        if(this.#metadata_structure) {
            return this.#metadata_structure;
        } else {
            throw new NotInitializedError();
        }
    }

    /**
     * Looks up a field schema by external ID
     * @private
     * @param {string} externalId - External ID of the field to look up
     * @returns {Object|undefined} Field schema if found, undefined otherwise
     */
    #lookupFieldSchema(externalId) {
        return this.metadata_structure.find(
            field => field.external_id === externalId
        );
    }

    /**
     * Processes a metadata value based on its field type
     * @private
     * @param {Object} fieldSchema - Field schema from Cloudinary
     * @param {string} value - Value to process
     * @returns {string|string[]|number} Processed value
     * @throws {Error} If field type is not supported or value cannot be processed
     */
    #processMetadataValue(fieldSchema, value) {
        let sanitizedFieldValue;

        switch (fieldSchema.type) {
            case CLOUDINARY_FIELD.MultipleSelectionList:
                sanitizedFieldValue = value.split(',').map((item) => this.#lookupMetadataValueExternalId(fieldSchema, item));
                break;
            case CLOUDINARY_FIELD.Date:
                let date = new Date(value);
                sanitizedFieldValue = date.toISOString().split('T')[0];
                break;
            case CLOUDINARY_FIELD.SingleSelectionList:
                sanitizedFieldValue = this.#lookupMetadataValueExternalId(fieldSchema, value);
                break;
            case CLOUDINARY_FIELD.Number:
            case CLOUDINARY_FIELD.Text:
                sanitizedFieldValue = value;
                break;
            default:
                throw new Error(`Field type not found (${fieldSchema.type}) for ${fieldSchema.external_id}`);
        }
        return sanitizedFieldValue;
    }

    /**
     * Looks up the external_id for a given value in a field's datasource
     * @private
     * @param {Object} fieldSchema - Field schema from Cloudinary
     * @param {string} option - Value to look up
     * @returns {string} External ID of the value
     * @throws {InvalidDataSourceOptionError} If value is not found in the datasource
     */
    #lookupMetadataValueExternalId(fieldSchema, option) {    
        // Check external_id first
        for (let value of fieldSchema.datasource.values) {
            if (value.state === 'active' && value.external_id.toLowerCase() === option.trim().toLowerCase()) {
                return value.external_id;
            }
        }
        // Check label if no matches
        for (let value of fieldSchema.datasource.values) {
            if (value.state === 'active' && value.value.toLowerCase() === option.trim().toLowerCase()) {
                return value.external_id;
            }
        }
        throw new InvalidDataSourceOptionError(`Option '${option.trim()}' not found in datasource for the SMD field '${fieldSchema.external_id}'`);
    }
}

/**
 * Exports the CloudinaryMetadataMapper instance as a plugin
 * @type {CloudinaryMetadataMapper}
 */
module.exports.plugin = new CloudinaryMetadataMapper();