/**
 * @fileoverview A plugin for mapping and transforming metadata fields for Cloudinary uploads.
 * @module cld-structured-metadata-mapper
 */

'use strict';

const cloudinary = require('cloudinary').v2;

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
        this.name = 'NotInitializedError';
    }
}

/**
 * Custom error for invalid mapping configuration
 */
class InvalidMappingError extends Error {
    constructor(message) {
        super(message);
        this.name = 'InvalidMappingError';
    }
}

/**
 * Custom error for invalid datasource option
 */
class InvalidDataSourceOptionError extends Error {
    constructor(message) {
        super(message);
        this.name = 'InvalidDataSourceOptionError';
    }
}

/**
 * Class for mapping and transforming metadata fields for Cloudinary uploads.
 * Handles different field types and ensures proper formatting of metadata values.
 */
class CloudinaryMetadataMapper {
    /** @private */
    #metadata_structure

    constructor() {
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
     * @throws {InvalidMappingError} If mapping configuration is invalid
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

            metadata[externalId] = this.#processMetadataValue(schema, value);
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
     * @throws {Error} If field type is not supported
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
                throw new Error(`[${this.className}:processMetadataValue] Field type not found (${fieldSchema.type}) for ${fieldSchema.external_id}`);
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