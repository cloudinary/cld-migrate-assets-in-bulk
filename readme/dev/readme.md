# Things to know about 

## Layout

### App Components
All of the app components (and tests for them) are expected to be under the `lib` folder.

This is important because tests are explicitly invoked from under the folder

### App Tests
jest test framework is used. Use `npm test` to run all tests (unit tests and end-to-end tests).

Custom configuration is used - see the `scripts.test` in `package.json`.

Test modules are maintained under the `test` folder.

### Dev Tests
The [__input-to-api-payload.js](../../__input-to-api-payload.js) module is intended to be customized when the tool is used.

BUT if you are modifying core implementation (while keeping default `__input-to-api-payload.js`) - you can use `npm run test-dev`. This runs additional test as part of end-to-end tests (with synthetic data file that matches identifiers from the default module implementation) allowing to identify potential issues that impact functionality of the tool.

This test is intentionally excluded from `npm test` as it is guaranteed to fail once `__input-to-api-payload.js` implementation changes.

## Customizations

### Confirmation Prompt

If you need to run the tool in scenarios when the confirmation user prompt becomes a blocker - you may find [modification suggested in this pull request](https://github.com/cloudinary/cld-migrate-assets-in-bulk/pull/13) to be of help.

### Plugins

You can execute custom logic as part of the migration loop when calculating parameters for each migration operation.

The concept is explained in more details [here](../plugins.md).

## End2End Tests
End to end tests require to be executed in certain order (see the `test/jest.run-all-tests.js` file).

- a temporary cloud is provisioned when running tests
- if you want to use a different cloud (for debugging purposes, for example) - place `.env` file with Cloudinary credentials under the `test/end2end` folder
    * then the test migration operations will be performed against that cloud

### Dev End2End tests

Because the `__input-to-api-payload.js` module is intended to be modified - the end-to-end test for it is not executed with `npm test`.

But you may want to test the default payload for example, when making change to another module of the app. 
Use `npm run test-dev`. It runs all the same tests as `npm test` but then also executes end-to-end test for the default payload.
The test setup assumes the `__input-to-api-payload.js` was not modified.
