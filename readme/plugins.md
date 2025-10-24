# Plugins

This application supports an **opt-in plugin mechanism** that lets you inject custom logic into the migration flow **without touching the core codebase**. Typical use-cases are:

* mapping “business” values coming from a CSV to Cloudinary-compliant values
* pulling additional data from external APIs
* enforcing organisation-specific validation rules
* adding extra logging / reporting information

The mechanism is intentionally simple: every plugin is just a JavaScript module that exports a `plugin` object implementing two well-defined asynchronous hooks.

Use the [cld-structured-metadata-mapper](../__plugins/cld-structured-metadata-mapper.js) implementation as a reference / starter.

## Concept
1. **Discovery & loading**  
   At startup the application resolves the folder `__plugins/` and asks the *Plugin Manager* (`lib/plugins/plugin-manager.js`) to load everything that:
   * is a `.js` file **not** ending with `.test.js`  
   * exports `plugin.init_Async()` **and** `plugin.process_Async()`

   Each module is loaded **once** and its `init_Async()` method is awaited (for example, to make API call to load necessary definitions)

2. **Runtime execution**  
   Modules are intended to be invoked from the [__input-to-api-payload.js module](../__input-to-api-payload.js)
   * Initialized plugin instance is obtained via `pluginManager.getPlugin(name)` where `name` is the plugin file name with no extension 
   * The `process_Async()` method of the plugin instance is invoked by you according to the implementation requirements
      + The method is intended to be used as part of "pipeline" (when multiple plugins are used) 
      + It receives **reference** to Cloudinary upload options object to apply changes according to your logic

3. **Logging**  
   * The `init_Async` method receives an instance of a logger
      + This logger is ONLY intended to be used on plugin initialization
      + If you use this logger in the `process_Async` - you'll have to "stitch" contest from different log records 

   * To simplify troubleshooting, have the `process_Async()` method of a plugin produce some sort of a "trace record"
      + When persisted to `plugins_trace` (in the [__input-to-api-payload.js](../__input-to-api-payload.js) module), this approach retains plugin's "trace" as part of a single migration record for each asset simplifying troubleshooting of each individual operation

## Implementation
Below is everything you need to author a new plugin.

### 1. Create a file in `__plugins/`
File name becomes the plugin’s **identifier** (e.g. `my-plugin.js` ➝ `my-plugin`).

### 2. Export the mandatory hooks
```js
// __plugins/my-plugin.js
module.exports.plugin = {
  /** One-time boot-strap – e.g. fetch schemas, set up caches */
  async init_Async (log) {
    // use provided per-plugin logger; throw if something is mis-configured
    log.info('my-plugin initialized');
  },

  /** Called once per CSV record */
  async process_Async (upload_options, csv_record, options) {
    // mutate upload_options, read from csv_record, use options provided by caller
    return { /* anything useful to be written to the log */ };
  }
};
```

Keep `process_Async` side-effect-free outside of the supplied objects – it will be executed for each migrated asset (potentially, many thousands of times).

### 3. Use the plugin from the payload module
```js
const pluginManager = require('./lib/plugins/plugin-manager');
...
const myPlugin = pluginManager.getPlugin('my-plugin');
const trace = await myPlugin.process_Async(options, csvRec, {/* custom opts */});
...
// Returning the payload and the trace of the plugins applied. They will also be included in the migration log.
return {
    "payload"       : { file, options }, 
    "plugins_trace" : { 'my-plugin': trace }      
};
```
Whatever you return can be passed via `plugins_trace` property to be included into a single log record for the current operation.

### 4. Handle errors deliberately
Throwing inside `process_Async` marks the current record as **FAILED** and logs the error.  Prefer custom error classes so they can be recognised in the calling code.

### 5. Test it
You can write unit tests under `*.test.js` name – the Plugin Manager automatically skips them.