/**
 * @fileoverview This file contains the logic to "translate" each CSV record from input file
 * into Cloudinary Upload API payload.
 */


// Loading plugin manager. 
// Consult readme/plugins.md for more details
const pluginManager = require('./lib/plugins/plugin-manager');


// Timeout for the network operations performed by the Cloudinary SDK. (Think "how long do I wait for Upload API response?")
// Applied via the `timeout` parameter in upload options (see the input2ApiPayload_Async implementation)
// Intended to prevent false positive "Request Timeout" errors for migrated assets.
// You can set it to a higher value (for example when migrating large files that take longer to process on upload) 
const SDK_NETWORK_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Converts a CSV record from migration input file to a Cloudinary API payload.
 * 
 * 💡Customize this function to suit your needs as per the Cloudinary Upload API specs:
 * https://cloudinary.com/documentation/image_upload_api_reference#upload
 * 
 * Consider below implementation as a "starter".
 * 
 * Typically you'd customize this module to:
 *  - Define which field from the input CSV record to use for the asset URL
 *  - Define how to pass the input CSV record fields with Cloudinary Upload API as the asset's taxonomy (tags, metadata, DAM folder etc.)
 * 
 * @async (allows to perform async operations such as pulling data from external API sources)
 * @param {Object} csvRec - CSV record from the migration input file
 * @returns {Object} - parameters for Cloudinary API call
 *  - file: the URL to obtain the asset from
 *  - options: options for the Cloudinary Upload API call
 */
exports.input2ApiPayload_Async = async function(csvRec) {
    // Where to load the asset from 
    // Any source supported by Cloudinary Upload API: https://cloudinary.com/documentation/upload_parameters#required_file_parameter
    const file = csvRec['File Path or URL CSV Column Name'];
    
    // Optional parameters for the Cloudinary API
    const options = {                       
        public_id:       csvRec['Asset Public_ID CSV Column Name'], // Pass value to be used as public_id (addressed by column name from the input CSV file)
        unique_filename: false,                                     // Do not add random suffix to the public_id
        resource_type:   'auto',                                    // Let Cloudinary determine the resource type
        overwrite:       false,                                     // Do not overwrite the asset with same public_id if it already exists (good idea if migrating to an account with existing assets)
        type:            'upload',                                  // Explicitly set delivery type
        tags:            csvRec['Asset Tags CSV Column Name'],      // Pass value to be set as tags on the uploaded asset (addressed by column name from the input CSV file)


        timeout: SDK_NETWORK_TIMEOUT_MS,                            // See `timeout` parameter in Upload API docs: https://cloudinary.com/documentation/image_upload_api_reference#upload


        // Example: Assigning contextual metadata
        // See specs at https://cloudinary.com/documentation/contextual_metadata
        context: {
            caption: csvRec['Asset Description CSV Column Name'],   // Pass value to be set as caption field in contextual metadata (addressed by column name from the input CSV file)
        },
        
        // Example: Assigning structured metadata
        // See specs at https://cloudinary.com/documentation/structured_metadata
        metadata: {
            'smd_field_external_id_a': csvRec['SMD Field A CSV Column Name'],   // Structured metadata can be assigned explicitly using values from CSV file
                                                                    // This approach will work for straight-forward cases (few values to map)
                                                                    // For involved scenarios (hundreds/thousands of options for single- or multi-select fields
                                                                    // that need to be mapped to Cloudinary external_id values for API operations)
                                                                    // it is recommended to use cld-structured-metadata-mapper plugin (example below) 
                                                                    // to map values from CSV file to Cloudinary API values
        }
    };

    // Applying plugins and collecting their output in order they are applied
    const plugins_trace = [];
    const smdPluginTrace = await applyStructuredMetadataMapperPlugin_Async(options, csvRec);
    plugins_trace.push(smdPluginTrace);

    // Returning the payload and the trace of the plugins applied. They will also be included in the migration log.
    return {
        "payload"       : { file, options }, // Payload for Cloudinary API call
        "plugins_trace" : plugins_trace      // Output produced by plugins to include in the log. Return empty object if no plugins are used.
    };
}


/**
 * Applies the structured metadata mapper plugin to the Upload API options.
 * 
 * @param {Object} options - The options for the Cloudinary Upload API call
 * @param {Object} csvRec - The CSV record from the migration input file
 * @returns {Object} - The trace of the plugin applied
 */
async function applyStructuredMetadataMapperPlugin_Async(options, csvRec) {
    // Example: Using plugin to map "business" values from CSV file to external_id values for Cloudinary API
    //          Plugin fetches SMD field definitions to automatically 
    //          - map values (labels) from CSV file to the matching external_id values
    //          - apply supported formatting for the date values (e.g. YYYY-MM-DD)
    //          - ... etc (consult the plugin implementation for details)
    const smdPluginName = 'cld-structured-metadata-mapper';
    const CloudinaryStructuredMetadataMapper = pluginManager.getPlugin(smdPluginName);
    const smdMappingTrace = await CloudinaryStructuredMetadataMapper.process_Async(options, csvRec, {
        mapping : {
            'SMD Text CSV Column Name': 'smd_text_field_external_id', // Map text values from CSV file to 'smd_text_field_external_id' SMD field
            'SMD Num CSV Column Name' : 'smd_num_field_external_id',  // Map numeric values from CSV file to 'smd_num_field_external_id' SMD field
            'SMD Date CSV Column Name': 'smd_date_field_external_id', // Map date values from CSV file to 'smd_date_field_external_id' SMD field
            'SMD SSL CSV Column Name' : 'smd_ssl_field_external_id',  // Map single-select values (assumed to be labels) from CSV file to 'smd_ssl_field_external_id' SMD field
            'SMD MSL CSV Column Name' : 'smd_msl_field_external_id'   // Map multi-select values (assumed to be labels) from CSV file to 'smd_msl_field_external_id' SMD field
        },
        separator: ','  // Optional separator to use for multi-select value parsing (default is comma)
     });

    // Storing output of the plugin to include in the combined log record
    return { name: smdPluginName, trace: smdMappingTrace };
}
