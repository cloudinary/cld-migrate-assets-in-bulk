/**
 * @fileoverview Integration/sequence test for the logging module.
 */

const fs = require('fs');
const path = require('path');
const bunyan = require('bunyan');

// Importing the logging module only once, so it can be tested across the entire sequence.
const logging = require('../../../lib/output/logging');

describe('Logging Module - End-to-End Sequence', () => {
  // Mocking the console so we can capture fallback logs before initialization.
  let originalConsoleLog;
  let originalConsoleWarn;
  let originalConsoleError;
  let consoleOutput = [];

  // Paths for test logs
  const TEST_TMP_DIR = path.resolve(__dirname, '.tmp');
  const LOG_DIR = path.join(TEST_TMP_DIR, 'logging');
  const LOG_FILE = path.join(LOG_DIR, 'log.jsonl');

  beforeAll(() => {
    // Mocking the console so we can capture fallback logs before initialization.
    originalConsoleLog = console.log;
    originalConsoleWarn = console.warn;
    originalConsoleError = console.error;

    console.log = jest.fn((...args) => consoleOutput.push({ method: 'log', args }));
    console.warn = jest.fn((...args) => consoleOutput.push({ method: 'warn', args }));
    console.error = jest.fn((...args) => consoleOutput.push({ method: 'error', args }));

    // Deleting the log directory and all contents
    if (fs.existsSync(LOG_DIR)) {
      fs.rmSync(LOG_DIR, { recursive: true, force: true });
    }
    // Re-creating the log directory
    fs.mkdirSync(LOG_DIR, {recursive: true});
  });

  afterAll(() => {
    // Restoring the original console methods
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;

    // Removing the test directory and all contents
    if (fs.existsSync(TEST_TMP_DIR)) {
       fs.rmSync(TEST_TMP_DIR, { recursive: true, force: true });
    }
  });

  test('full logging sequence', async () => {
    // confirm fallback logging
    logging.script.info('fallback log - script');
    logging.payload.warn('fallback log - payload');
    logging.plugins.error('fallback log - plugins');

    expect(consoleOutput.length).toBe(3);
    expect(consoleOutput[0].method).toBe('log');
    expect(consoleOutput[0].args).toContain('[script] ');
    expect(consoleOutput[0].args).toContain('fallback log - script');

    expect(consoleOutput[1].method).toBe('warn');
    expect(consoleOutput[1].args).toContain('[payload] ');
    expect(consoleOutput[1].args).toContain('fallback log - payload');

    expect(consoleOutput[2].method).toBe('error');
    expect(consoleOutput[2].args).toContain('[plugins] ');
    expect(consoleOutput[2].args).toContain('fallback log - plugins');

    // Confirm the plugin logger can be created before initialization
    const beforeInitiPluginLogger = logging.createPluginLogger('test-plugin-berfore-init');
    beforeInitiPluginLogger.info('plugin info msg');
    beforeInitiPluginLogger.warn('plugin warn msg');
    beforeInitiPluginLogger.error('plugin error msg');

    expect(consoleOutput.length).toBe(6);  // 3 fallback logs previously + 3 plugin logs now
    expect(consoleOutput[3].method).toBe('log');
    expect(consoleOutput[3].args).toContain('[plugins:test-plugin-berfore-init] ');
    expect(consoleOutput[3].args).toContain('plugin info msg');

    expect(consoleOutput[4].method).toBe('warn');
    expect(consoleOutput[4].args).toContain('[plugins:test-plugin-berfore-init] ');
    expect(consoleOutput[4].args).toContain('plugin warn msg');

    expect(consoleOutput[5].method).toBe('error');
    expect(consoleOutput[5].args).toContain('[plugins:test-plugin-berfore-init] ');
    expect(consoleOutput[5].args).toContain('plugin error msg');

    // Initialize logging to log file
    const { logFile } = logging.setupLogInFolder(LOG_DIR);
    expect(logFile).toBe(LOG_FILE);

    // Clear consoleOutput so we can detect any fallback console calls after initialization
    consoleOutput = [];

    // Produce messages and confirm they are in the log file
    logging.script.info('script info after init');
    logging.payload.warn('payload warn after init');
    logging.plugins.error('plugins error after init');

    const testAfterInitPluginName = 'test-plugin-after-init';
    const afterInitPluginLogger = logging.createPluginLogger(testAfterInitPluginName);
    // Only the log message
    afterInitPluginLogger.info('plugin info msg');
    afterInitPluginLogger.warn('plugin warn msg');
    afterInitPluginLogger.error('plugin error msg');
    // Log message and object
    afterInitPluginLogger.info({ object: { a: 'a', b: 'b' } }, 'plugin info msg with object');
    afterInitPluginLogger.warn({ object: { a: 'a', b: 'b' } }, 'plugin warn msg with object');
    afterInitPluginLogger.error({ object: { a: 'a', b: 'b' } }, 'plugin error msg with object');
    
    // The logger, once initialized, should no longer log to console (fallback is replaced)
    expect(consoleOutput.length).toBe(0);

    // Wait 500ms so Bunyan can write to disk
    await new Promise((r) => setTimeout(r, 500));

    // Confirm the log file exists
    expect(fs.existsSync(LOG_FILE)).toBe(true);

    // Read contents of the log file
    let logContents = fs.readFileSync(LOG_FILE, 'utf8');

    // Each line is a separate JSON object
    let lines = logContents.split('\n').filter((line) => line.trim().length > 0);
    let parsed = lines.map((l) => JSON.parse(l));

    // Confirm the log file contains the expected messages
    expect(parsed.length).toBe(9); // 3 log messages + 6 plugin logs
    expect(parsed[0].msg).toBe('script info after init');
    expect(parsed[0].level).toBe(30);

    expect(parsed[1].msg).toBe('payload warn after init');
    expect(parsed[1].level).toBe(40);

    expect(parsed[2].msg).toBe('plugins error after init');
    expect(parsed[2].level).toBe(50);

    expect(parsed[3].msg).toBe('plugin info msg');
    expect(parsed[3].plugin).toBe(testAfterInitPluginName);

    expect(parsed[4].msg).toBe('plugin warn msg');
    expect(parsed[4].plugin).toBe(testAfterInitPluginName);

    expect(parsed[5].msg).toBe('plugin error msg');
    expect(parsed[5].plugin).toBe(testAfterInitPluginName);

    expect(parsed[6].msg).toBe('plugin info msg with object');
    expect(parsed[6].plugin).toBe(testAfterInitPluginName);
    expect(parsed[6]).toHaveProperty('object');

    expect(parsed[7].msg).toBe('plugin warn msg with object');
    expect(parsed[7].plugin).toBe(testAfterInitPluginName);
    expect(parsed[7]).toHaveProperty('object');

    expect(parsed[8].msg).toBe('plugin error msg with object');
    expect(parsed[8].plugin).toBe(testAfterInitPluginName);
    expect(parsed[8]).toHaveProperty('object');

    // Confirm Error.prototype has toJSON. Then log a custom error and confirm it's logged.
    expect(typeof Error.prototype.toJSON).toBe('function');

    const customError = new Error('custom error');
    logging.script.error(customError, 'Logging custom error');

    // Wait 500ms so Bunyan writes to disk
    await new Promise((r) => setTimeout(r, 500));

    // Re-read contents of the file
    logContents = fs.readFileSync(LOG_FILE, 'utf8');
    lines = logContents.split('\n').filter((line) => line.trim().length > 0);
    parsed = lines.map((l) => JSON.parse(l));

    const errorLog = parsed[parsed.length - 1];
    expect(errorLog.msg).toBe('Logging custom error');
    expect(errorLog.level).toBe(50);
    expect(errorLog.err).toHaveProperty('stack');
    expect(errorLog.err.message).toBe('custom error');

    // Attempt repeated initialization
    expect(() => {
      logging.setupLogInFolder(LOG_DIR);
    }).toThrow('Log already setup');
  });
});
