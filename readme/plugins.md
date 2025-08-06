# Plugins

This application supports an **opt-in plugin mechanism** that lets you inject custom logic into the migration flow **without touching the core codebase**. Typical use-cases are:

* mapping “business” values coming from a CSV to Cloudinary-compliant values
* pulling additional data from external APIs
* enforcing organisation-specific validation rules
* adding extra logging / reporting information

The mechanism is intentionally simple: every plugin is just a JavaScript module that exports a `plugin` object implementing two well-defined asynchronous hooks.

---
## Concept
1. **Discovery & loading**  
   At startup the main loop resolves the folder `__plugins/` and asks the *Plugin Manager* (`lib/plugins/plugin-manager.js`) to load everything that:
   * is a `.js` file **not** ending with `.test.js`  
   * exports `plugin.init_Async()` **and** `plugin.process_Async()`

   Each module is loaded **once** and its `init_Async()` method is awaited.  Any error aborts the whole startup – so the plugin must fail fast if configuration is not valid.

2. **Runtime execution**  
   For every CSV record the application builds an Upload API payload (see `__input-to-api-payload.js`). Inside that module individual plugins are obtained via `pluginManager.getPlugin(name)` and their `process_Async()` method is awaited.  The method receives **references** to the objects it should enrich – that means a plugin can modify them in-place.

3. **Logging**  
   It is a good practice to have `process_Async()` method of a plugin produce some sort of a "trace record" and persist the record in `plugins_trace` (see `__input-to-api-payload.js`). This approach retains plugin's "trace" in the context of the migration record simplifying troubleshooting of an individual operation.

---
## Implementation
Below is everything you need to author a new plugin.

### 1. Create a file in `__plugins/`
File name becomes the plugin’s **identifier** (e.g. `my-awesome-plugin.js` ➝ `my-awesome-plugin`).

### 2. Export the mandatory hooks
```js
// __plugins/my-awesome-plugin.js
module.exports.plugin = {
  /** One-time boot-strap – e.g. fetch schemas, set up caches */
  async init_Async () {
    // throw if something is mis-configured
  },

  /** Called once per CSV record */
  async process_Async (upload_options, csv_record, options) {
    // mutate upload_options, read from csv_record, use options provided by caller
    return { /* anything useful to be written to the log */ };
  }
};
```
*   Both functions **must** return a `Promise` (use `async` or explicit `Promise.resolve()`)
*   Keep `process_Async` **idempotent** and **side-effect-free** outside of the supplied objects – it will be executed many thousands of times.

### 3. Use the plugin from the payload module
```js
const pluginManager = require('./lib/plugins/plugin-manager');
...
const myPlugin = pluginManager.getPlugin('my-awesome-plugin');
const trace = await myPlugin.process_Async(options, csvRec, {/* custom opts */});
```
Whatever you return will be stored in the migration log and eventually surface in the final report.

### 4. Handle errors deliberately
Throwing inside `process_Async` marks the current record as **FAILED** and logs the error.  Prefer custom error classes so they can be recognised in the calling code (see `cld-structured-metadata-mapper.js` for an example).

### 5. Test it
Plugins live in the same repository, so you can write unit tests under any `*.test.js` name – the Plugin Manager automatically skips them.

---
### Reference example
`__plugins/cld-structured-metadata-mapper.js` demonstrates a fully-fledged plugin that:
* boots by fetching structured-metadata definitions via the Cloudinary API
* validates user-provided mapping configuration
* translates labels to `external_id`s for single- and multi-select fields
* returns a trace that ends up in the migration log

Use it as a template when building your own plugin.