# CHANGELOG

[3.0.0] / 2025-10-08
====================

### Added
- Opt-in plugin mechanism to inject custom logic into migration flow without modifying core codebase
- Plugins documentation [./readme/plugins.md](./readme/plugins.md)
- Structured metadata mapper plugin [./__plugins/cld-structured-metadata-mapper.js](./__plugins/cld-structured-metadata-mapper.js)
- [Dev end-to-end test](./readme/dev/readme.md#dev-end2end-tests) for the default payload and structured metadata mapper plugin

### Changed
- Refactored `__input-to-api-payload.js` to support asynchronous operations for scenarios when plugin needs to make API calls
- Explicit SDK timeout configuration for network operations

### Breaking Changes
- The `__input-to-api-payload.js` module now requires asynchronous processing patterns
- Migration payload structure now includes `plugins_trace` property for passing output from plugin execution to the main routine for logging


[2.1.2] / 2025-06-25
====================

### Changed
- Added an MIT license file to define the tool's open-source licensing terms
- Updated outdated dependencies to latest compatible versions.


[2.1.1] / 2024-12-30
====================

### Added
- Documentation for the `SkippedAlreadyExists` upload operation status

### Changed
- Updated outdated dependencies
- Sample payload in the `__input-to-api-payload.js` for better clarity
- Explanation for "estimated number of records" in progress bar
- Runtime setup instructions per peer review feedback


[2.1.0] / 2024-11-12
====================

### Added
- Scripts to monitor logs for an ongoing bulk operation with instructions in README
- Explicitly reporting API responses with `existing` property as `SkippedAlreadyExists` value for the `Cld_Operation` column in a migration report file

### Changed
- Updated outdated dependencies


[2.0.1] / 2024-02-09
====================

### Changed
- Updated outdated dependencies
- Added hint to the README for monitoring migration errors during execution of the script


[2.0.0] / 2023-09-27
====================

### Added
- Introduced unit tests (with Jest as a dev dependency)
- Implemented end-to-end tests
- Support for uploading local files larger than 100MB (using `upload_large` from Cloudinary SDK)

### Changed
- Renamed the tool to `cld-bulk`
- Introduced concept of sub-commands by using `commander` for parsing CLI arguments
- Extracted the async CSV input processing loop to a re-usable module


[1.0.0] / 2023-08-04
====================

### Added
- Initial release with limited migration flow support (local files only under 100MB supported)
