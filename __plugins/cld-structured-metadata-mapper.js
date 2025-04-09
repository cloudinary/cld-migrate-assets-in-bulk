'use strict';

require('dotenv').config(); 
const cloudinary = require('cloudinary').v2;

const CLOUDINARY_FIELD = {
    String: 'string',
    Integer: 'integer',
    Date: 'date',
    Enum: 'enum',
    Set: 'set'
}

class CloudinaryMetadataMapper {

    #metadata_structure

    constructor() {
        this.name = "metadata_mapper";
        this.className = "CloudinaryMetadataMapper";
    }

    async init() {
        const metadataResult = await cloudinary.api.list_metadata_fields();
        this.#metadata_structure = metadataResult.metadata_fields;
    }

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


    //Loads and caches the metadata structure
    get metadata_structure() {        
        if(this.#metadata_structure) {
            return this.#metadata_structure
        } else {
            throw new Error(`[${this.className}:metadata_structure] init() needs to be called before use`)
        }
    }

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