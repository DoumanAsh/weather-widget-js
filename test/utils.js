'use strict';
const assert = require('assert');
const path = require('path');

global.__root_dir = path.join(__dirname, '..');
global.__from_root = function(...args){
    return path.join(global.__root_dir, ...args);
};

describe('logger:', function() {
    const old_console_info = console.info;
    const custom_utils = './../src/utils/logger.js';

    beforeEach(function() {
        process.env.LAZY_LOG = "false";
    });

    afterEach(function() {
        console.info = old_console_info;
        delete require.cache[require.resolve(custom_utils)];
    });

    it("Try to log when disabled", function() {
        console.info = function() {
            assert(false, "Console log SHOULD not be called");
        };

        require(custom_utils)("try to log");
    });

    it("Try to log when enabled", function() {
        var is_console_call = false;
        const expected = "Log var[1]=var1 | var[2]=var2";

        console.info = function(...args) {
            const actual = args.pop();

            is_console_call = true;

            assert.strictEqual(actual, expected, "Unexpected trace message");
        };

        process.env.LAZY_LOG = "true";
        require(custom_utils)("Log var[%d]=%s | var[%d]=%s", 1, 'var1', 2, 'var2');

        assert(is_console_call, "Console info hasn't been called");
    });
});
