# Overview

Each migration process is unique, both in terms of the systems involved and the taxonomy requirements. Because of this, there isn't a "one-size-fits-all" solution. The best approach to prepare for migration is to use the tools you're already familiar with to consolidate the asset data you wish to migrate into a single CSV file.

# Purpose

The CSV file you create will serve as the input for the migration script. Before you can start the migration, you'll need to customize a [dedicated script module](../__input-to-api-payload.js) to map column values from the CSV file to Cloudinary's Upload API parameters. For more details on how to do this, please refer to the [script configuration section](./configure.md).

# Recommendations

## Think Through the Taxonomy 🤔

- Consider preparing a document that maps the taxonomy from your current workflow to the one in Cloudinary. 
    - This document will not only help clarify the migration process but can also serve as future documentation for your team.

### Prepare date field values for parsing

If you need to assign [Date structured metadata values](https://cloudinary.com/documentation/admin_api#metadata_field_structure) - make sure the stringified values in the asset data file use:

- (Preferred) [Date Time String Format supported by Ecma Standard specifications](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#date_time_string_format)
- `MM/DD/YYYY` order in date representation for it to be correctly parsed by legacy date parsing implementation

Then you will be able to leverage default Structured Metadata Mapper plugin for automated date parsing.
See `applyStructuredMetadataMapperPlugin_Async` starter implementation in the [__input-to-api-payload](../__input-to-api-payload.js) module.

Alternatively, if neither option is feasible and you must have stringified date values in format such as `DD/MM/YYYY` - you can add your own method in the [__input-to-api-payload](../__input-to-api-payload.js) module to accurately parse date values and convert to the [representation demanded by Cloudinary `date` field specification](https://cloudinary.com/documentation/admin_api#metadata_field_structure).

## Migrate High-Quality Assets 🔗

- When building CSV input file and referencing assets via URLs or file paths:
    - Make sure to reference the assets in the largest available dimensions (to allow for highest quality transformations).
    - Make sure the referenced assets have had the least aggressive compression algorithms applied prior to being migrated (to avoid visual artifacts).
