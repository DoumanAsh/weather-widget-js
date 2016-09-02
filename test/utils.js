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
    const mock = require('mock-require');

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
                  .then(function(result) {
                      assert(false, 'Promise SHOULD not be resolved');
                  })
                  .catch(function(error) {
                      assert.equal(error.message, 'Bad google api result');
                  });
    });

    it("Get valid geo info with HTTP response", function() {
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
                  .then(function(result) {
                      assert(false, 'Promise SHOULD not be resolved');
                  })
                  .catch(function(error) {
                      assert.equal(error.message, 'Bad HTTP response');
                  });
    });
});
