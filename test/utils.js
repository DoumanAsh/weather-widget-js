'use strict';
const assert = require('assert');
const path = require('path');
const mock = require('mock-require');

global.__root_dir = path.join(__dirname, '..');
global.__from_root = function(...args) {
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
        const expected_msg = "Log var[1]=var1 | var[2]=var2";
        const expected_file = path.relative(__root_dir, __filename);

        console.info = function(...args) {
            is_console_call = true;

            const expected_line = (new Error()).stack
                                               .split('\n')[3]
                                               .match(/([0-9]+):[0-9]+\)$/)[1];
            // msg
            assert.strictEqual(args.pop(), expected_msg, "Unexpected trace message.");
            //line number
            assert.equal(args.pop(), expected_line, "Unexpected line number.");
            //file name(relatieve to root)
            assert.strictEqual(args.pop(), expected_file, "Unexpected file name.");
        };

        process.env.LAZY_LOG = "true";
        require(custom_utils)("Log var[%d]=%s | var[%d]=%s", 1, 'var1', 2, 'var2');

        assert(is_console_call, "Console info hasn't been called");
    });
});

describe('geo:', function() {
    const geo_path = '../src/utils/geo.js';

    var stub_data = {
        error: null,
        response: {statusCode: 200},
        body: "{}"
    };

    var request_stub = function(url, callback) {
        callback(stub_data.error, stub_data.response, stub_data.body);
    };

    mock('request', request_stub);

    after(function() {
        mock.stopAll();
    });

    beforeEach(function() {

    });

    afterEach(function() {
        stub_data = {
            error: null,
            response: {statusCode: 200},
            body: ""
        };
    });

    const geo = require(geo_path);
    /* NOTE: return promise for mocha */
    it("Get valid geo info", function() {
        const test_city = 'Moscow';

        const data = {'status': 'OK',
                      'results': [
                      {
                          'geometry': {
                              'location': {
                                  'lat': '666',
                                  'lng': '13'
                              }
                          }
                      }
                      ]};

        stub_data.body = JSON.stringify(data);

        return geo.get_coords_city(test_city)
                  .then(function(result) {
                      assert.ok(test_city in result, 'Cannot find city=' + test_city);
                      assert.equal(result[test_city].lat, data.results[0].geometry.location.lat);
                      assert.equal(result[test_city].lng, data.results[0].geometry.location.lng);
                  })
                  .catch(function(error) {
                      assert(false, 'Unexpected error=' + error);
                  });
    });

    it("Get valid geo info for multiple cities", function() {
        const test_city1 = 'Moscow';
        const test_city2 = 'Moscow2';

        const data = {'status': 'OK',
                      'results': [
                      {
                          'geometry': {
                              'location': {
                                  'lat': '666',
                                  'lng': '13'
                              }
                          }
                      }
                      ]};

        stub_data.body = JSON.stringify(data);

        return geo.get_coords_city(test_city1, test_city2)
                  .then(function(result) {
                      assert.ok(test_city1 in result, 'Cannot find city=' + test_city1);
                      assert.equal(result[test_city1].lat, data.results[0].geometry.location.lat);
                      assert.equal(result[test_city1].lng, data.results[0].geometry.location.lng);

                      assert.ok(test_city2 in result, 'Cannot find city=' + test_city2);
                      assert.equal(result[test_city2].lat, data.results[0].geometry.location.lat);
                      assert.equal(result[test_city2].lng, data.results[0].geometry.location.lng);
                  })
                  .catch(function(error) {
                      assert(false, 'Unexpected error=' + error);
                  });
    });

    it("Get valid geo info with bad status", function() {
        const test_city = 'Moscow';

        const data = {'status': 'BAD',
                      'results': [
                      {
                          'geometry': {
                              'location': {
                                  'lat': '666',
                                  'lng': '13'
                              }
                          }
                      }
                      ]};

        stub_data.body = JSON.stringify(data);

        return geo.get_coords_city(test_city)
                  .then(function() {
                      assert(false, 'Promise SHOULD not be resolved');
                  })
                  .catch(function(error) {
                      assert.equal(error.message, 'Bad google api result');
                  });
    });

    it("Get valid geo info with bad HTTP response", function() {
        const test_city = 'Moscow';

        const data = {'status': 'BAD',
                      'results': [
                      {
                          'geometry': {
                              'location': {
                                  'lat': '666',
                                  'lng': '13'
                              }
                          }
                      }
                      ]};

        stub_data.body = JSON.stringify(data);

        stub_data.error = new Error('Bad HTTP response');

        return geo.get_coords_city(test_city)
                  .then(function() {
                      assert(false, 'Promise SHOULD not be resolved');
                  })
                  .catch(function(error) {
                      assert.equal(error.message, 'Bad HTTP response');
                  });
    });
});

describe('db:', function() {
    const db_path = '../src/utils/db.js';

    var mock_get_data = {
        expected_key: undefined,
        err: null,
        reply: null
    };
    var redis_mock_get = function(key, callback) {
        if (mock_get_data.expected_key !== undefined) {
            assert.strictEqual(mock_get_data.expected_key,
                               key);
        }
        callback(mock_get_data.err, mock_get_data.reply);
    };
    var mock_set_data = {
        expected_key: undefined,
        expected_value: undefined,
        err: null,
        result: null
    };
    var redis_mock_set = function(key, value, callback) {
        if (mock_set_data.expected_key !== undefined) {
            assert.strictEqual(mock_set_data.expected_key,
                               key);
        }
        if (mock_set_data.expected_value !== undefined) {
            assert.strictEqual(mock_set_data.expected_value,
                               value);
        }
        callback(mock_set_data.err, mock_set_data.result);
    };

    mock('redis', {createClient: () => {
        return {
            get: redis_mock_get,
            set: redis_mock_set,
            on: () => {}
        };
    }});

    after(function() {
        mock.stopAll();
    });

    beforeEach(function() {

    });

    afterEach(function() {
        mock_get_data = {
            expected_key: undefined,
            err: null,
            reply: null
        };
        mock_set_data = {
            expected_key: undefined,
            expected_value: undefined,
            err: null,
            result: null
        };
    });

    const db = new (require(db_path))();

    it("DB get string OK", function() {
        const key = "lolka";
        const value = "val";

        mock_get_data = {
            expected_key: key,
            err: null,
            reply: value
        };

        return db.get(key)
                 .then((result) => {
                     assert.strictEqual(value, result);
                 })
                 .catch((error) => {
                     assert(false, "Unexpected error " + error);
                 });
    });

    it("DB get string NOT_OK", function() {
        const key = "lolka";

        mock_get_data = {
            expected_key: key,
            err: new Error("Fail"),
            reply: null
        };

        return db.get(key)
                 .then((result) => {
                     assert(false, "Unexpected OK result " + result);
                 })
                 .catch((error) => {
                     assert.strictEqual(error, mock_get_data.err);
                 });
    });

    it("DB get obj OK", function() {
        const key = "lolka";
        const value = {1:2, "lolka":true};

        mock_get_data = {
            expected_key: key,
            err: null,
            reply: JSON.stringify(value)
        };

        return db.get_obj(key)
                 .then((result) => {
                     assert.deepEqual(value, result);
                 })
                 .catch((error) => {
                     assert(false, "Unexpected error " + error);
                 });
    });

    it("DB set string OK", function() {
        const key = "lolka";
        const value = "val";

        mock_set_data = {
            expected_key: key,
            expected_value: value,
            err: null,
            result: "OK"
        };

        return db.set(key, value)
                 .then(() => {
                     //We're good.
                 })
                 .catch((error) => {
                     assert(false, "Unexpected error " + error);
                 });
    });

    it("DB set string NOT_OK", function() {
        const key = "lolka";
        const value = "val";
        const expected_err = new Error("Fail to set");

        mock_set_data = {
            err: expected_err,
            result: "NOT_OK"
        };

        return db.set(key, value)
                 .then(() => {
                     assert(false, "Unexpected success");
                 })
                 .catch((error) => {
                     assert.strictEqual(error, expected_err);
                 });
    });

    it("DB set obj OK", function() {
        const key = "lolka";
        const value = {1: 2, 2: 3};

        mock_set_data = {
            expected_key: key,
            expected_value: JSON.stringify(value),
            err: null,
            result: "OK"
        };

        return db.set_obj(key, value)
                 .then(() => {
                     //We're good.
                 })
                 .catch((error) => {
                     assert(false, "Unexpected error " + error);
                 });
    });
});
