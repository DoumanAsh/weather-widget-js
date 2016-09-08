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
const data_class = './../src/data.js';
const server_path = './../src/server.js';

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
    var mock_hget_data = {
        expected_hash: undefined,
        expected_key: undefined,
        err: null,
        reply: null
    };
    var redis_mock_hget = function(hash, key, callback) {
        if (mock_hget_data.expected_hash !== undefined) {
            assert.strictEqual(mock_hget_data.expected_hash,
                               hash);
        }
        if (mock_hget_data.expected_key !== undefined) {
            assert.strictEqual(mock_hget_data.expected_key,
                               key);
        }
        callback(mock_hget_data.err, mock_hget_data.reply);
    };
    var mock_hset_data = {
        expected_hash: undefined,
        expected_key: undefined,
        expected_value: undefined,
        err: null,
        result: null
    };
    var redis_mock_hset = function(hash, key, value, callback) {
        if (mock_hset_data.expected_hash !== undefined) {
            assert.strictEqual(mock_hset_data.expected_hash,
                               hash);
        }
        if (mock_hset_data.expected_key !== undefined) {
            assert.strictEqual(mock_hset_data.expected_key,
                               key);
        }
        if (mock_hset_data.expected_value !== undefined) {
            assert.strictEqual(mock_hset_data.expected_value,
                               value);
        }
        callback(mock_hset_data.err, mock_hset_data.result);
    };

    mock('redis', {createClient: () => {
        return {
            get: redis_mock_get,
            set: redis_mock_set,
            hget: redis_mock_hget,
            hset: redis_mock_hset,
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
        mock_hget_data = {
            expected_hash: undefined,
            expected_key: undefined,
            err: null,
            reply: null
        };
        mock_hset_data = {
            expected_hash: undefined,
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

    it("DB hash get obj OK", function() {
        const hash = "again_hash";
        const key = "lolka";
        const value = {1:2, "lolka":true};

        mock_hget_data = {
            expected_hash: hash,
            expected_key: key,
            err: null,
            reply: JSON.stringify(value)
        };

        return db.hash_get_obj(hash, key)
                 .then((result) => {
                     assert.deepEqual(value, result);
                 })
                 .catch((error) => {
                     assert(false, "Unexpected error " + error);
                 });
    });

    it("DB get hash OK", function() {
        const hash = "some_hash";
        const key = "lolka";
        const value = "val";

        mock_hget_data = {
            expected_hash: hash,
            expected_key: key,
            err: null,
            reply: value
        };

        return db.hash_get(hash, key)
                 .then((result) => {
                     assert.strictEqual(value, result);
                 })
                 .catch((error) => {
                     assert(false, "Unexpected error " + error);
                 });
    });

    it("DB get hash NOT_OK", function() {
        const hash = "some_hash";
        const key = "lolka";

        mock_hget_data = {
            expected_hash: hash,
            expected_key: key,
            err: new Error("Fail"),
            reply: null
        };

        return db.hash_get(hash, key)
                 .then((result) => {
                     assert(false, "Unexpected OK result " + result);
                 })
                 .catch((error) => {
                     assert.strictEqual(error, mock_hget_data.err);
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

    it("DB set hash OK", function() {
        const hash = "again some hash";
        const key = "lolka";
        const value = "val";

        mock_hset_data = {
            expected_hash: hash,
            expected_key: key,
            expected_value: value,
            err: null,
            result: "OK"
        };

        return db.hash_set(hash, key, value)
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
            expected_key: key,
            expected_value: value,
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

    it("DB set hash NOT_OK", function() {
        const hash = "again some hash";
        const key = "lolka";
        const value = "val";
        const expected_err = new Error("Fail to set");

        mock_hset_data = {
            expected_hash: hash,
            expected_key: key,
            expected_value: value,
            err: expected_err,
            result: "NOT_OK"
        };

        return db.hash_set(hash, key, value)
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

    it("DB hash set obj OK", function() {
        const hash = "some_hash";
        const key = "lolka";
        const value = {1: 2, 2: 3};

        mock_hset_data = {
            expected_hash: hash,
            expected_key: key,
            expected_value: JSON.stringify(value),
            err: null,
            result: "OK"
        };

        return db.hash_set_obj(hash, key, value)
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
        },
        hash_get: {
            is_called: false,
            expected_hash: undefined,
            expected_key: undefined,
            result: undefined,
            error: undefined
        },
        hash_set: {
            is_called: false,
            expected_hash: undefined,
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
            hash_get: function(hash, key) {
                db_mock_data.hash_get.is_called = true;
                if (db_mock_data.hash_get.expected_key) {
                    assert.strictEqual(key, db_mock_data.hash_get.expected_key);
                }

                if (db_mock_data.hash_get.expected_hash) {
                    assert.strictEqual(hash, db_mock_data.hash_get.expected_hash);
                }

                return new Promise(function(resolve, reject) {
                    if (db_mock_data.hash_get.result) {
                        resolve(db_mock_data.hash_get.result);
                    }
                    else {
                        reject(db_mock_data.hash_get.error);
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
                        reject(db_mock_data.set.error);
                    }
                    else {
                        resolve();
                    }
                });
            },
            hash_set: function(hash, key, value) {
                db_mock_data.hash_set.is_called = true;
                if (db_mock_data.hash_set.expected_key) {
                    assert.strictEqual(key, db_mock_data.hash_set.expected_key);
                }
                if (db_mock_data.hash_set.expected_value) {
                    assert.deepEqual(value, db_mock_data.hash_set.expected_value);
                }
                if (db_mock_data.hash_set.expected_hash) {
                    assert.strictEqual(hash, db_mock_data.hash_set.expected_hash);
                }

                return new Promise(function(resolve, reject) {
                    if (db_mock_data.hash_set.error) {
                        reject(db_mock_data.hash_set.error);
                    }
                    else {
                        resolve();
                    }
                });
            }
        };

        result.get_obj = result.get;
        result.set_obj = result.set;
        result.hash_get_obj = result.hash_get;
        result.hash_set_obj = result.hash_set;

        return result;
    };
    mock(db_path, db_mock);

    var forecast_mock_data = {
        is_called: false,
        result: undefined,
        error: undefined
    };
    const forecast_mock = function(key) {
        assert.notEqual(key, undefined, 'ForecastIO API cannot be undefined!');

        this.latitude = function(value) {
            assert.notEqual(value, undefined, "Latitude cannot be undefined!");
            return this;
        };

        this.longitude = function(value) {
            assert.notEqual(value, undefined, "Longitude cannot be undefined!");
            return this;
        };

        this.units = function(value) {
            assert.notEqual(value, undefined, "Units cannot be undefined!");
            return this;
        };

        this.get = function() {
            forecast_mock_data.is_called = true;
            return new Promise((resolve, reject) => {
                if (forecast_mock_data.result) {
                    resolve(forecast_mock_data.result);
                }
                else {
                    reject(forecast_mock_data.error);
                }
            });
        };

    };
    mock('forecast-io', forecast_mock);

    beforeEach(function() {
    });

    afterEach(function() {
        forecast_mock_data = {
            is_called: false,
            result: undefined,
            error: undefined
        };
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
            },
            hash_get: {
                is_called: false,
                expected_hash: undefined,
                expected_key: undefined,
                result: undefined,
                error: undefined
            },
            hash_set: {
                is_called: false,
                expected_hash: undefined,
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

    function default_forecast_data() {
        return {
            currently: {
                time: 666,
                summary: "Some summary",
                temperature: 15,
                windSpeed: 2,
                humidity: 0.80
            },
            daily: {
                data: [
                {
                    time: (new Date()).getTime() / 1000,
                    summary: "Today summary",
                    temperatureMin: 13,
                    temperatureMax: 20,
                    humidity: 0.80,
                    windSpeed: 2
                },
                {
                    time: ((new Date()).getTime() / 1000) + 86400,
                    summary: "Tommorrow summary",
                    temperatureMin: 14,
                    temperatureMax: 21,
                    humidity: 0.85,
                    windSpeed: 3

                }]
            }
        };
    }


    function assert_w_default_forecast_data() {
    }

    function get_expected_result_forecast(default_data) {
        var result = {
            current: {
                time: default_data.currently.time,
                summary: default_data.currently.summary,
                temperature: default_data.currently.temperature,
                windSpeed: default_data.currently.windSpeed,
                humidity: default_data.currently.humidity,
            },
            week: [
            ]
        };

        var time_now = new Date();
        time_now.setHours(0, 0, 0, 0);
        time_now = time_now.getTime() / 1000; //Unix time.

        for (var idx = 0; idx < default_data.daily.data.length; idx++) {
            if (default_data.daily.data[idx].time >= time_now) {
                result.week.push({
                    time: default_data.daily.data[idx].time,
                    summary: default_data.daily.data[idx].summary,
                    temperature: {
                        min: default_data.daily.data[idx].temperatureMin,
                        max: default_data.daily.data[idx].temperatureMax,
                    },
                    humidity: default_data.daily.data[idx].humidity,
                    windSpeed: default_data.daily.data[idx].windSpeed,
                });
            }
        }

        return result;
    }

    const Data = require(data_class);
    it('Initializes Data from google API OK', function(done) {
        const forecast_data = default_forecast_data();

        forecast_mock_data = {
            result: JSON.stringify(forecast_data)
        };

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

        db_mock_data.hash_set = {
            expected_hash: 'forecast',
            expected_value: get_expected_result_forecast(forecast_data)
        };

        var data;
        function set_data() {
            data = new Data();
        }
        assert.doesNotThrow(set_data);

        function assert_test() {
            assert(geo_mock_data.is_called, "Geo mock is not called!");
            assert(db_mock_data.set.is_called, "DB set mock is not called!");
            assert(forecast_mock_data.is_called, "ForecastIO mock is not called!");
            assert(db_mock_data.hash_set.is_called, "DB hash set mock is not called!");

            geo_mock_data.expected_cities.forEach((city) => {
                assert(city in data.inner, "City '" + city + "' is not in Data");
                assert(data.get_city(city), "City '" + city + "' is not in Data");

                var coords = data.get_city_coords(city);
                assert(coords, "Couldn't get city '" + city + "' coordinates");

                assert.deepEqual(coords, geo_mock_data.result[city]);

                var forecast = data.get_city_forecast(city);
                assert(forecast, "Couldn't get city '" + city + "' forecast");
            });

            done();
        }

        setTimeout(assert_test, 1);
    });

    it('Initializes Data from google API OK and fetch some old forecast data', function(done) {
        const forecast_data = default_forecast_data();
        forecast_data.daily.data[0].time = 1;
        forecast_data.daily.data[1].time = 1;

        forecast_mock_data = {
            result: JSON.stringify(forecast_data)
        };

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

        db_mock_data.hash_set = {
            expected_hash: 'forecast',
            expected_value: get_expected_result_forecast(forecast_data)
        };

        var data;
        function set_data() {
            data = new Data();
        }
        assert.doesNotThrow(set_data);

        function assert_test() {
            assert(geo_mock_data.is_called, "Geo mock is not called!");
            assert(db_mock_data.set.is_called, "DB set mock is not called!");
            assert(forecast_mock_data.is_called, "ForecastIO mock is not called!");
            assert(db_mock_data.hash_set.is_called, "DB hash set mock is not called!");

            geo_mock_data.expected_cities.forEach((city) => {
                assert(city in data.inner, "City '" + city + "' is not in Data");
                assert(data.get_city(city), "City '" + city + "' is not in Data");

                var coords = data.get_city_coords(city);
                assert(coords, "Couldn't get city '" + city + "' coordinates");

                assert.deepEqual(coords, geo_mock_data.result[city]);

                var forecast = data.get_city_forecast(city);
                assert(forecast, "Couldn't get city '" + city + "' forecast");
            });

            done();
        }

        setTimeout(assert_test, 1);
    });

    it('Initializes Data from google API OK but fail to fetch forecast', function(done) {
        forecast_mock_data = {
            error: 'Fail to fetch forecast data'
        };

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
            assert(forecast_mock_data.is_called, "ForecastIO mock is not called!");
            assert(!db_mock_data.hash_set.is_called, "DB hash set mock SHOULD not called!");

            geo_mock_data.expected_cities.forEach((city) => {
                assert(city in data.inner, "City '" + city + "' is not in Data");
                assert(data.get_city(city), "City '" + city + "' is not in Data");

                var coords = data.get_city_coords(city);
                assert(coords, "Couldn't get city '" + city + "' coordinates");

                assert.deepEqual(coords, geo_mock_data.result[city]);

                var forecast = data.get_city_forecast(city);
                assert.equal(forecast, undefined);
            });

            done();
        }

        setTimeout(assert_test, 1);
    });

    it('Initializes Data from google API OK but fail to save in DB', function(done) {
        const forecast_data = default_forecast_data();

        forecast_mock_data = {
            result: JSON.stringify(forecast_data)
        };
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

        db_mock_data.hash_set = {
            expected_hash: 'forecast',
            expected_value: get_expected_result_forecast(forecast_data)
        };

        var data;
        function set_data() {
            data = new Data();
        }
        assert.doesNotThrow(set_data);

        function assert_test() {
            assert(geo_mock_data.is_called, "Geo mock is not called!");
            assert(db_mock_data.set.is_called, "DB set mock is not called!");
            assert(forecast_mock_data.is_called, "ForecastIO mock is not called!");
            assert(db_mock_data.hash_set.is_called, "DB hash set mock is not called!");

            /* Even if we fail to set, coordinates should be in Data */
            geo_mock_data.expected_cities.forEach((city) => {
                assert(city in data.inner, "City '" + city + "' is not in Data");
                assert(data.get_city(city), "City '" + city + "' is not in Data");

                var coords = data.get_city_coords(city);
                assert(coords, "Couldn't get city '" + city + "' coordinates");

                assert.deepEqual(coords, geo_mock_data.result[city]);

                var forecast = data.get_city_forecast(city);
                assert(forecast, "Couldn't get city '" + city + "' forecast");
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
            assert(!forecast_mock_data.is_called, "ForecastIO mock should not called!");

            geo_mock_data.expected_cities.forEach((city) => {
                assert(city in data.inner, "City '" + city + "' is not in Data");
                assert.strictEqual(data.get_city(city), undefined);
                assert.strictEqual(data.get_city_coords(city), undefined);
                assert.strictEqual(data.get_city_forecast(city), undefined);
            });
            done();
        }

        setTimeout(assert_test, 1);
    });

    it('Initializes Data from DB OK', function(done) {
        const forecast_data = default_forecast_data();

        forecast_mock_data = {
            result: JSON.stringify(forecast_data)
        };
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
            assert(forecast_mock_data.is_called, "ForecastIO mock is not called!");

            Object.keys(expected_cities_coords).forEach((city) => {
                assert(city in data.inner, "City '" + city + "' is not in Data");
                assert(data.get_city(city), "City '" + city + "' is not in Data");

                var coords = data.get_city_coords(city);
                assert(coords, "Couldn't get city '" + city + "' coordinates");

                assert.deepEqual(coords, expected_cities_coords[city]);

                var forecast = data.get_city_forecast(city);
                assert(forecast, "Couldn't get city '" + city + "' forecast");
                assert_w_default_forecast_data(forecast_data, forecast);
            });
            done();
        }

        setTimeout(assert_test, 1);
    });

    it('Initializes Data from DB OK and reset coordinates', function(done) {
        const forecast_data = default_forecast_data();

        forecast_mock_data = {
            result: JSON.stringify(forecast_data)
        };
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
            assert(forecast_mock_data.is_called, "ForecastIO mock is not called!");

            data.set_coordinates(expected_cities_coords);
            Object.keys(expected_cities_coords).forEach((city) => {
                assert(city in data.inner, "City '" + city + "' is not in Data");
                assert(data.get_city(city), "City '" + city + "' is not in Data");

                var coords = data.get_city_coords(city);
                assert(coords, "Couldn't get city '" + city + "' coordinates");

                assert.deepEqual(coords, expected_cities_coords[city]);

                var forecast = data.get_city_forecast(city);
                assert(forecast, "Couldn't get city '" + city + "' forecast");
                assert_w_default_forecast_data(forecast_data, forecast);
            });
            done();
        }

        setTimeout(assert_test, 1);
    });

    it('Initializes Data from DB OK and try to get non-existing city', function(done) {
        const forecast_data = default_forecast_data();

        forecast_mock_data = {
            result: JSON.stringify(forecast_data)
        };
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
            assert(forecast_mock_data.is_called, "ForecastIO mock is not called!");

            assert.throws(function() { data.get_city('non-existing'); }, 'Should not get non-existing city!');
            assert.throws(function() { data.get_city_coords('non-existing'); }, 'Should not get non-existing city!');
            assert.throws(function() { data.get_city_forecast('non-existing'); }, 'Should not get non-existing city!');
            done();
        }

        setTimeout(assert_test, 1);
    });
});

/*TODO: cannot mock data class :( */
/*
describe('server:', function() {
    const request = require('supertest');

    var data_mock_inner = {
    };

    function data_mock() {
        console.log('mock');
        return {
            inner: data_mock_inner,
            get_cities: function() { Object.keys(this.inner); }
        };
    }

    mock(data_class, data_mock);
    var temp = require(data_class);
    assert.equal(temp, data_mock);

    after(function() {
        mock.stopAll();
    });

    afterEach(function() {
        data_mock_inner = {};
    });

    it("Get widget configurator with cities", function(done) {
        data_mock_inner = {
            'Moscow': undefined,
            'Bor': undefined
        };

        const app = mock.reRequire(server_path);

        request(app).get('/')
                    .expect(200)
                    .expect(function(res) {
                        console.log('%j', res);
                    }, done);
    });
});
*/
