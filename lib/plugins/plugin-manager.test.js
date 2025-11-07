/**
 * @fileoverview Unit tests for the plugin manager module.
 */

const path = require('node:path');

// Mock fs module
jest.mock('node:fs', () => ({
    readdirSync: jest.fn(),
}));

// Mock logging module
jest.mock('../output/logging', () => ({
    plugins: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    },
    createPluginLogger: jest.fn(),
}));


beforeEach(() => {
    // Reset singleton state by clearing the module cache
    jest.resetModules();
    
    // Reset mocks
    jest.clearAllMocks();

    // Reload the modules mocked for the test. Order is important here.
    fs = require('node:fs');
    logging = require('../output/logging');
    pluginManager = require('./plugin-manager'); // uses 'node:fs'
});

describe('loadPlugins_Async', () => {
    const testPluginsDir = '/test/plugins';

    it('should throw error if called more than once', async () => {
        fs.readdirSync.mockReturnValue([]);

        // First call should succeed
        await pluginManager.loadPlugins_Async(testPluginsDir);
        
        // Second call should throw
        await expect(pluginManager.loadPlugins_Async(testPluginsDir))
            .rejects
            .toThrow('Plugin manager has already been initialized');
    });

    it('should skip non-js and test files', async () => {
        fs.readdirSync.mockReturnValue([
            'not-a-plugin.txt',
            'test-plugin.test.js',
            'valid-plugin.js'
        ]);

        // Mock require to return a valid plugin
        jest.mock(path.join(testPluginsDir, 'valid-plugin.js'), () => ({
            plugin: {
                init_Async: jest.fn().mockResolvedValue(undefined),
                process_Async: jest.fn().mockResolvedValue(undefined)
            }
        }), { virtual: true });

        await pluginManager.loadPlugins_Async(testPluginsDir);

        expect(logging.plugins.warn).toHaveBeenCalledWith(
            expect.stringContaining("Skipping non-plugin file: 'not-a-plugin.txt'")
        );
        expect(logging.plugins.warn).toHaveBeenCalledWith(
            expect.stringContaining("Skipping non-plugin file: 'test-plugin.test.js'")
        );
    });

    it('should load and initialize valid plugins', async () => {
        const mockPlugin = {
            init_Async: jest.fn().mockResolvedValue(undefined),
            process_Async: jest.fn().mockResolvedValue(undefined)
        };

        fs.readdirSync.mockReturnValue(['valid-plugin.js']);
        jest.mock(path.join(testPluginsDir, 'valid-plugin.js'), () => ({
            plugin: mockPlugin
        }), { virtual: true });

        const result = await pluginManager.loadPlugins_Async(testPluginsDir);

        expect(mockPlugin.init_Async).toHaveBeenCalled();
        expect(result).toHaveProperty('valid-plugin', mockPlugin);
        expect(logging.plugins.info).toHaveBeenCalledWith(
            expect.stringContaining('Successfully loaded plugin: valid-plugin')
        );
    });

    it('should throw error for invalid plugins', async () => {
        fs.readdirSync.mockReturnValue(['invalid-plugin.js']);
        jest.mock(path.join(testPluginsDir, 'invalid-plugin.js'), () => ({
            // Missing plugin property
        }), { virtual: true });

        await expect(pluginManager.loadPlugins_Async(testPluginsDir))
            .rejects
            .toThrow('Plugin invalid-plugin.js does not export a valid plugin object with init_Async function');
    });

    it('should throw error for plugins without process_Async function before initialization', async () => {
        const mockPlugin = {
            init_Async: jest.fn().mockResolvedValue(undefined),
            // Missing process_Async property
        };

        fs.readdirSync.mockReturnValue(['invalid-plugin.js']);
        jest.mock(path.join(testPluginsDir, 'invalid-plugin.js'), () => ({
            plugin: mockPlugin
        }), { virtual: true });

        await expect(pluginManager.loadPlugins_Async(testPluginsDir))
            .rejects
            .toThrow('Plugin invalid-plugin.js does not export a valid plugin object with process_Async function');

        expect(logging.plugins.error).toHaveBeenCalledWith(
            expect.objectContaining({ error: expect.any(Error) }),
            'Failed to load plugin: invalid-plugin.js'
        );
        expect(mockPlugin.init_Async).not.toHaveBeenCalled();
    });

    it('should handle plugin initialization errors', async () => {
        const mockPlugin = {
            init_Async: jest.fn(() => { throw new Error('Module mock init failed') }),
            process_Async: jest.fn().mockResolvedValue(undefined)
        };

        fs.readdirSync.mockReturnValue(['error-plugin.js']);
        jest.mock(path.join(testPluginsDir, 'error-plugin.js'), () => ({
            plugin: mockPlugin
        }), { virtual: true });

        await expect(pluginManager.loadPlugins_Async(testPluginsDir))
            .rejects
            .toThrow('Module mock init failed');

        expect(logging.plugins.error).toHaveBeenCalledWith(
            expect.objectContaining({ error: expect.any(Error) }),
            'Failed to load plugin: error-plugin.js'
        );
    });
});

describe('getPlugin', () => {
    beforeEach(() => {
        // Setup initial state with some plugins
        fs.readdirSync.mockReturnValue(['test-plugin.js']);
        jest.mock(path.join('/test/plugins', 'test-plugin.js'), () => ({
            plugin: {
                init_Async: jest.fn().mockResolvedValue(undefined),
                process_Async: jest.fn().mockResolvedValue(undefined)
            }
        }), { virtual: true });
    });

    it('should return plugin instance if found', async () => {
        await pluginManager.loadPlugins_Async('/test/plugins');
        const plugin = pluginManager.getPlugin('test-plugin');
        expect(plugin).toBeDefined();
        expect(plugin.init_Async).toBeDefined();
        expect(plugin.process_Async).toBeDefined();
    });

    it('should throw error if plugin not found', async () => {
        await pluginManager.loadPlugins_Async('/test/plugins');
        expect(() => pluginManager.getPlugin('non-existent-plugin'))
            .toThrow("Plugin 'non-existent-plugin' not found");
    });
}); 