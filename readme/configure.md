# Overview

Each migration is unique in terms of taxonomy (tags, metadata, destination folders etc.) for the migrated assets.

To accommodate for that the script comes with a customizable module that allows you to define with a few lines of JS code how the values from the input CSV file should be passed to Cloudinary API payload. 

Additionally, you will need to supply Cloudinary API credentials to allow the script to perform operations against the target Cloudinary sub-account (environment). 

The method detailed below (using `.env` file) prevents Cloudinary credentials from being accidentally checked into version control system.

# How to Configure the Script for Migration

## Map CSV Data to Cloudinary API Payload 🗺️

1. Open the [`__input-to-api-payload`](../__input-to-api-payload.js) module.
2. Follow the instructions to map the columns in your CSV input file to the parameters required by the Cloudinary API.

### Translate Structured Metadata Values 🔄

In your CSV data file you may have "Status" column with value "Work In Progress". To represent it you introduce a single-selection list structured metadata field "Status" in Cloudinary and create "Work In Progress" option.

BUT the Upload API expects not the "Work In Progress" label for the option but the corresponding `external_id` value `work_in_progress`.

If you only have a few such fields with handful options each you can simply translate option labels from CSV file to `external_id` values using a dictionary. 

In case of dozens of fields / hundreds of options that approach quickly becomes cumbersome.

This is where the built‑in Structured Metadata Mapper plugin comes helpful to automatically convert business labels from your CSV file into `external_id` values expected by Cloudinary Upload API payload (and more).

The plugin:
- Uses SMD definitions to translate single‑ and multi‑select labels to their `external_id`(s)
- Normalizes date values to `YYYY-MM-DD`

Use of the plugin is provided with the starter implementation of `__input-to-api-payload` module.

### Create Your Own Plugin 🧩

If your migration logic requires additional processing to finalize payload values for each asset migration (for example, make API request to an external system) - you can implement your own plugin.

Reference the [plugins documentation](./plugins.md) for details.

## Supply Cloudinary API Credentials *️⃣

1. Create a `.env` file in the root folder of the script (where the `package.json` file is located).
2. Locate the API Environment variable from the target Cloudinary sub-account.
    - You can find this by logging into the target sub-account and [navigating to the Programmable Media Dashboard](https://cloudinary.com/documentation/solution_overview#cloudinary_console).
3. Copy the entire API Environment variable, including the `CLOUDINARY_URL=` part, and paste it into the `.env` file.
