# What it is
🚚 A script that can be used to migrate assets to Cloudinary from sources supported by [Cloudinary Upload API](https://cloudinary.com/documentation/image_upload_api_reference#upload_required_parameters) in scenarios when gradual migration with [Cloudinary auto-upload feature](https://cloudinary.com/documentation/fetch_remote_images#auto_upload_remote_files) cannot be leveraged.

**⚠️ Disclaimer**: This tool is provided "as is" under MIT license. You are solely responsible for how you use it and the results it produces. Please review the source code and test the tool thoroughly before applying it to production environments.

It is assumed that the migration problem is addressed in stages:

- **Stage #1** 🛠️ Prepare input CSV file for the asset migration (with the tools of your choice)
- **Stage #2** 🚚 Run the migration for the assets detailed in CSV file (using this tool)
- **Stage #3** Iterate to identify assets that failed to migrate and re-attempt migration
  * 🛠️ Filter the output of the migration script (with the tools of your choice)
  * 🚚 Use the filtered output as input for the re-try migration batch (using this tool)

This script provides the following features:
- Customizable mapping of CSV records to Cloudinary API parameters
- Concurrent invocation of Cloudinary API
- Memory-efficient handling of large input CSV files
- Visual progress reporting during migration
- Detailed logging (JSONL) to track/troubleshoot each migration operation
- Migration report (CSV) produced from the migration log file

# What it is NOT
❗ This script is not a one-size-fits-all solution for migrating to Cloudinary. It serves as a foundational tool for IT and software engineers who need to migrate large volumes of assets when other options are impractical or unavailable.

# How to Use It
Follow these steps to successfully migrate your assets:

1. [📋 Prepare Your CSV Data](./readme/data-for-the-migration.md) - Ready the data for asset migration.
2. [💻 Provision Runtime](./readme/provision-runtime.md) - Set up the environment where the script will run.
3. [⚙️ Configure the Script](./readme/configure.md) - Customize the script's settings for your specific migration needs.
4. [🚚 Run the Script and Obtain the Report](./readme/run-migration-obtain-report.md) - Execute the script and review the migration report.
5. [🔄 Iterate for Failed Migrations](./readme/identify-reattempt-failed.md) - Identify failed asset migrations and rerun the script to fix them.

# How to Tweak It
Things to know are covered in the [🧑‍💻 dev readme](./readme/dev/readme.md).

# License
Released under the MIT license.