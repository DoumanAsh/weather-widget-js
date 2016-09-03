'use strict';
const assert = require('assert');
const path = require('path');
const mock = require('mock-require');

global.__root_dir = path.join(__dirname, '..');
global.__from_root = function(...args) {
    return path.join(global.__root_dir, ...args);
};

const custom_utils = './../src/utils/logger.js';
const geo_path = '../src/utils/geo.js';
const db_path = '../src/utils/db.js';

describe('logger:', function() {
    const old_console_info = console.info;

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
        delete require.cache[require.resolve(geo_path)];
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
        const test_city = ['Moscow'];

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
                      assert.ok(test_city[0] in result, 'Cannot find city=' + test_city[0]);
                      assert.equal(result[test_city[0]].lat, data.results[0].geometry.location.lat);
                      assert.equal(result[test_city[0]].lng, data.results[0].geometry.location.lng);
                  })
                  .catch(function(error) {
                      assert(false, 'Unexpected error=' + error);
                  });
    });

    it("Get valid geo info for multiple cities", function() {
        const test_city = ['Moscow', 'Moscow2'];

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
                      assert.ok(test_city[0] in result, 'Cannot find city=' + test_city[0]);
                      assert.equal(result[test_city[0]].lat, data.results[0].geometry.location.lat);
                      assert.equal(result[test_city[0]].lng, data.results[0].geometry.location.lng);

                      assert.ok(test_city[1] in result, 'Cannot find city=' + test_city[1]);
                      assert.equal(result[test_city[1]].lat, data.results[0].geometry.location.lat);
                      assert.equal(result[test_city[1]].lng, data.results[0].geometry.location.lng);
                  })
                  .catch(function(error) {
                      assert(false, 'Unexpected error=' + error);
                  });
    });

    it("Get valid geo info with bad status", function() {
        const test_city = ['Moscow'];

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
        const test_city = ['Moscow'];

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
        delete require.cache[require.resolve(db_path)];
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

    const db = new (mock.reRequire(db_path))();

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


/* TODO: There is a problem with re-mocking in a different files.
 */
const data_class = './../src/data.js';
describe('data:', function() {
    var geo_mock_data = {
        is_called: false,
        expected_cities: undefined,
        result: undefined,
        error: undefined
    };
    const geo_mock = {
        get_coords_city: function(cities) {
            geo_mock_data.is_called = true;
            if (geo_mock_data.expected_cities) {
                assert.deepEqual(geo_mock_data.expected_cities, cities);
            }

            return new Promise(function(resolve, reject) {
                if (geo_mock_data.error) {
                    reject(geo_mock_data.error);
                }
                else {
                    resolve(geo_mock_data.result);
                }
            });
        }
    };
    mock(geo_path, geo_mock);

    var db_mock_data = {
        get: {
            is_called: false,
            expected_key: undefined,
            result: undefined,
            error: undefined
        },
        set: {
            is_called: false,
            expected_key: undefined,
            expected_value: undefined,
            result: undefined,
            error: undefined
        }
    };
    const db_mock = function() {
        var result = {
            get: function(key) {
                db_mock_data.get.is_called = true;
                if (db_mock_data.get.expected_key) {
                    assert.strictEqual(key, db_mock_data.get.expected_key);
                }

                return new Promise(function(resolve, reject) {
                    if (db_mock_data.get.result) {
                        resolve(db_mock_data.get.result);
                    }
                    else {
                        reject(db_mock_data.get.error);
                    }
                });
            },
            set: function(key, value) {
                db_mock_data.set.is_called = true;
                if (db_mock_data.set.expected_key) {
                    assert.strictEqual(key, db_mock_data.set.expected_key);
                }
                if (db_mock_data.set.expected_value) {
                    assert.strictEqual(value, db_mock_data.set.expected_value);
                }

                return new Promise(function(resolve, reject) {
                    if (db_mock_data.set.error) {
                        reject(db_mock_data.get.error);
                    }
                    else {
                        resolve();
                    }
                });
            }
        };

        result.get_obj = result.get;
        result.set_obj = result.set;

        return result;
    };
    mock(db_path, db_mock);

    const forecast_mock = function(key) {
        assert.notEqual(key, undefined, 'ForecastIO API cannot be undefined!');
    };
    mock('forecast-io', forecast_mock);

    beforeEach(function() {
    });

    afterEach(function() {
        geo_mock_data = {
            is_called: false,
            expected_cities: undefined,
            result: undefined,
            error: undefined
        };
        db_mock_data = {
            get: {
                is_called: false,
                expected_key: undefined,
                result: undefined,
                error: undefined
            },
            set: {
                is_called: false,
                expected_key: undefined,
                expected_value: undefined,
                result: undefined,
                error: undefined
            }
        };
    });

    after(function() {
        mock.stopAll();
        delete require.cache[require.resolve(geo_path)];
        delete require.cache[require.resolve(db_path)];
        delete require.cache[require.resolve(data_class)];
    });

    const Data = require(data_class);
    it('Initializes Data from google API OK', function(done) {
        geo_mock_data = {
            expected_cities: ['Nizhny Novgorod', 'Moscow', 'Saint Petersburg'],
            result: {
                'Nizhny Novgorod': {
                    lat: 2,
                    lng: -2
                },
                'Moscow': {
                    lat: 4,
                    lng: -5
                },
                'Saint Petersburg': {
                    lat: 12,
                    lng: -1
                }
            },
            error: undefined
        };

        db_mock_data.set = {
            expected_key: 'cities',
            expected_value: geo_mock_data.result
        };

        var data;
        function set_data() {
            data = new Data();
        }
        assert.doesNotThrow(set_data);

        function assert_test() {
            assert(geo_mock_data.is_called, "Geo mock is not called!");
            assert(db_mock_data.set.is_called, "DB set mock is not called!");

            geo_mock_data.expected_cities.forEach((city) => {
                assert(city in data.inner, "City '" + city + "' is not in Data");
                assert(data.get_city(city), "City '" + city + "' is not in Data");

                var coords = data.get_city_coords(city);
                assert(coords, "Couldn't get city '" + city + "' coordinates");

                assert.deepEqual(coords, geo_mock_data.result[city]);
            });
            done();
        }

        setTimeout(assert_test, 1);
    });

    it('Initializes Data from google API OK but fail to save in DB', function(done) {
        geo_mock_data = {
            expected_cities: ['Nizhny Novgorod', 'Moscow', 'Saint Petersburg'],
            result: {
                'Nizhny Novgorod': {
                    lat: 2,
                    lng: -2
                },
                'Moscow': {
                    lat: 4,
                    lng: -5
                },
                'Saint Petersburg': {
                    lat: 12,
                    lng: -1
                }
            },
            error: undefined
        };

        db_mock_data.set = {
            expected_key: 'cities',
            expected_value: geo_mock_data.result,
            error: new Error('Fail to set coordinates into DB!')
        };

        var data;
        function set_data() {
            data = new Data();
        }
        assert.doesNotThrow(set_data);

        function assert_test() {
            assert(geo_mock_data.is_called, "Geo mock is not called!");
            assert(db_mock_data.set.is_called, "DB set mock is not called!");

            /* Even if we fail to set, coordinates should be in Data */
            geo_mock_data.expected_cities.forEach((city) => {
                assert(city in data.inner, "City '" + city + "' is not in Data");
                assert(data.get_city(city), "City '" + city + "' is not in Data");

                var coords = data.get_city_coords(city);
                assert(coords, "Couldn't get city '" + city + "' coordinates");

                assert.deepEqual(coords, geo_mock_data.result[city]);
            });
            done();
        }

        setTimeout(assert_test, 1);
    });

    it('Initializes Data from google API NOT_OK', function(done) {
        geo_mock_data = {
            expected_cities: ['Nizhny Novgorod', 'Moscow', 'Saint Petersburg'],
            error: new Error('Should not get data!')
        };

        var data;
        function set_data() {
            data = new Data();
        }
        assert.doesNotThrow(set_data);

        function assert_test() {
            assert(geo_mock_data.is_called, "Geo mock is not called!");
            assert(!db_mock_data.set.is_called, "DB set mock should not called!");

            geo_mock_data.expected_cities.forEach((city) => {
                assert(city in data.inner, "City '" + city + "' is not in Data");
                assert.strictEqual(data.get_city(city), undefined);
                assert.strictEqual(data.get_city_coords(city), undefined);
            });
            done();
        }

        setTimeout(assert_test, 1);
    });

    it('Initializes Data from DB OK', function(done) {
        var expected_cities_coords = {
            'Nizhny Novgorod': {
                lat: 2,
                lng: -2
            },
            'Moscow': {
                lat: 4,
                lng: -5
            },
            'Saint Petersburg': {
                lat: 12,
                lng: -1
            }
        };

        db_mock_data.get = {
            expected_key: 'cities',
            result: expected_cities_coords
        };

        var data;
        function set_data() {
            data = new Data();
        }
        assert.doesNotThrow(set_data);

        function assert_test() {
            assert(db_mock_data.get.is_called, "DB get mock is not called!");
            assert(!geo_mock_data.is_called, "Geo mock should not called!");
            assert(!db_mock_data.set.is_called, "DB set mock should not called!");

            Object.keys(expected_cities_coords).forEach((city) => {
                assert(city in data.inner, "City '" + city + "' is not in Data");
                assert(data.get_city(city), "City '" + city + "' is not in Data");

                var coords = data.get_city_coords(city);
                assert(coords, "Couldn't get city '" + city + "' coordinates");

                assert.deepEqual(coords, expected_cities_coords[city]);
            });
            done();
        }

        setTimeout(assert_test, 1);
    });

    it('Initializes Data from DB OK and reset coordinates', function(done) {
        var expected_cities_coords = {
            'Nizhny Novgorod': {
                lat: 2,
                lng: -2
            },
            'Moscow': {
                lat: 4,
                lng: -5
            },
            'Saint Petersburg': {
                lat: 12,
                lng: -1
            }
        };

        db_mock_data.get = {
            expected_key: 'cities',
            result: expected_cities_coords
        };

        var data;
        function set_data() {
            data = new Data();
        }
        assert.doesNotThrow(set_data);

        function assert_test() {
            assert(db_mock_data.get.is_called, "DB get mock is not called!");
            assert(!geo_mock_data.is_called, "Geo mock should not called!");
            assert(!db_mock_data.set.is_called, "DB set mock should not called!");

            data.set_coordinates(expected_cities_coords);
            Object.keys(expected_cities_coords).forEach((city) => {
                assert(city in data.inner, "City '" + city + "' is not in Data");
                assert(data.get_city(city), "City '" + city + "' is not in Data");

                var coords = data.get_city_coords(city);
                assert(coords, "Couldn't get city '" + city + "' coordinates");

                assert.deepEqual(coords, expected_cities_coords[city]);
            });
            done();
        }

        setTimeout(assert_test, 1);
    });

    it('Initializes Data from DB OK and try to get non-existing city', function(done) {
        var expected_cities_coords = {
            'Nizhny Novgorod': {
                lat: 2,
                lng: -2
            },
            'Moscow': {
                lat: 4,
                lng: -5
            },
            'Saint Petersburg': {
                lat: 12,
                lng: -1
            }
        };

        db_mock_data.get = {
            expected_key: 'cities',
            result: expected_cities_coords
        };

        var data;
        function set_data() {
            data = new Data();
        }
        assert.doesNotThrow(set_data);

        function assert_test() {
            assert(db_mock_data.get.is_called, "DB get mock is not called!");
            assert(!geo_mock_data.is_called, "Geo mock should not called!");
            assert(!db_mock_data.set.is_called, "DB set mock should not called!");

            assert.throws(function() { data.get_city('non-existing') }, 'Should not get non-existing city!');
            done();
        }

        setTimeout(assert_test, 1);
    });


});
